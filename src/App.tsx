import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { fetchBybitPage, type BybitItem } from './lib/bybit';

const REFRESH_INTERVAL_MS = 10_000;

const priceFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const parsePrice = (item: BybitItem): number | null => {
  const value = Number(item.price);
  return Number.isFinite(value) ? value : null;
};

const calculateAverage = (items: BybitItem[]): number | null => {
  const values = items
    .map(parsePrice)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
};

const formatPrice = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `${priceFormatter.format(value)} ₽`;
};

const formatUpdatedAt = (date: Date | null): string => {
  if (!date) {
    return '—';
  }

  return timeFormatter.format(date);
};

const App = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [primaryItems, setPrimaryItems] = useState<BybitItem[]>([]);
  const [secondaryItems, setSecondaryItems] = useState<BybitItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const primaryItemsRef = useRef<BybitItem[]>([]);
  const secondaryItemsRef = useRef<BybitItem[]>([]);

  const loadData = useCallback(async () => {
    if (primaryItemsRef.current.length === 0 && secondaryItemsRef.current.length === 0) {
      setLoading(true);
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const [page1Items, page2Items] = await Promise.all([
        fetchBybitPage(1, controller.signal),
        fetchBybitPage(2, controller.signal)
      ]);

      const lastItemPage1 = page1Items.length > 0 ? page1Items[page1Items.length - 1] : undefined;
      const firstFivePage2 = page2Items.slice(0, 5);
      const fifteenthToTwentiethPage2 = page2Items.slice(4, 10);

      const nextPrimary = [
        ...(lastItemPage1 ? [lastItemPage1] : []),
        ...firstFivePage2
      ];

      const nextSecondary = fifteenthToTwentiethPage2;

      primaryItemsRef.current = nextPrimary;
      secondaryItemsRef.current = nextSecondary;

      setPrimaryItems(nextPrimary);
      setSecondaryItems(nextSecondary);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const intervalId = setInterval(() => {
      void loadData();
    }, REFRESH_INTERVAL_MS);

    return () => {
      abortControllerRef.current?.abort();
      clearInterval(intervalId);
    };
  }, [loadData]);

  const primaryAverage = useMemo(() => calculateAverage(primaryItems), [primaryItems]);
  const secondaryAverage = useMemo(() => calculateAverage(secondaryItems), [secondaryItems]);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl rounded-3xl border border-emerald-500/40 bg-slate-900/70 p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-emerald-400">Курс Bybit</h1>
            <p className="mt-2 text-sm text-slate-300">
              LocalCard (Green) от 10 000 ₽. Данные обновляются каждые 10 секунд.
            </p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-300">
              <span className="animate-pulse">Загружаем актуальные курсы…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-600/40 bg-rose-950/40 p-6 text-center text-rose-200">
              <p className="font-medium">Не удалось получить данные</p>
              <p className="mt-2 text-sm opacity-80">{error}</p>
              <button
                type="button"
                className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
                onClick={() => {
                  void loadData();
                }}
              >
                Повторить запрос
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl border border-emerald-500/30 bg-slate-950/40 p-6 shadow-inner shadow-emerald-500/10">
                  <h2 className="text-lg font-semibold text-emerald-300">
                    Последняя позиция стр. 1 + первые 5 стр. 2
                  </h2>
                  <p className="mt-4 text-3xl font-semibold text-emerald-200">
                    {formatPrice(primaryAverage)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-emerald-400/70">
                    Средний курс по {primaryItems.length} предложениям
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-200">
                    {primaryItems.length === 0 ? (
                      <li className="text-slate-400">Нет данных для расчёта.</li>
                    ) : (
                      primaryItems.map((item, index) => (
                        <li
                          key={item.id ?? `${item.nickName}-${index}`}
                          className="flex items-baseline justify-between rounded-xl bg-slate-900/70 px-3 py-2"
                        >
                          <span className="text-xs uppercase tracking-wide text-emerald-400/70">№ {index + 1}</span>
                          <span className="ml-3 truncate text-sm font-medium text-slate-100">{item.nickName}</span>
                          <span className="ml-3 text-sm font-semibold text-emerald-200">{formatPrice(parsePrice(item))}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section className="rounded-2xl border border-emerald-500/30 bg-slate-950/40 p-6 shadow-inner shadow-emerald-500/10">
                  <h2 className="text-lg font-semibold text-emerald-300">
                    Позиции 15–20 (2-я страница)
                  </h2>
                  <p className="mt-4 text-3xl font-semibold text-emerald-200">
                    {formatPrice(secondaryAverage)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-emerald-400/70">
                    Средний курс по {secondaryItems.length} предложениям
                  </p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-200">
                    {secondaryItems.length === 0 ? (
                      <li className="text-slate-400">Недостаточно предложений на второй странице.</li>
                    ) : (
                      secondaryItems.map((item, index) => (
                        <li
                          key={item.id ?? `${item.nickName}-secondary-${index}`}
                          className="flex items-baseline justify-between rounded-xl bg-slate-900/70 px-3 py-2"
                        >
                          <span className="text-xs uppercase tracking-wide text-emerald-400/70">№ {index + 15}</span>
                          <span className="ml-3 truncate text-sm font-medium text-slate-100">{item.nickName}</span>
                          <span className="ml-3 text-sm font-semibold text-emerald-200">{formatPrice(parsePrice(item))}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </div>

              <footer className="mt-8 flex flex-col items-center gap-2 text-xs text-slate-400">
                <span>Обновление каждые 10 секунд (payload Bybit OTC).</span>
                <span>Последнее обновление: {formatUpdatedAt(lastUpdated)}</span>
              </footer>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default App;
