export interface BybitItem {
  id: string;
  nickName: string;
  price: string;
  priceType: number;
  currencyId: string;
  tokenId: string;
  minAmount: string;
  maxAmount: string;
  payments: string[];
}

interface BybitResponse {
  ret_code: number;
  ret_msg: string;
  result?: {
    count: number;
    items: BybitItem[];
  };
}

const REQUEST_BODY_BASE = {
  userId: '',
  tokenId: 'USDT',
  currencyId: 'RUB',
  payment: ['582'],
  side: '1',
  size: '10',
  page: '1',
  amount: '10000',
  vaMaker: false,
  bulkMaker: false,
  canTrade: false,
  verificationFilter: 0,
  sortType: 'OVERALL_RANKING',
  paymentPeriod: [] as unknown[],
  itemRegion: 1
};

function buildRequestBody(page: number) {
  return {
    ...REQUEST_BODY_BASE,
    page: String(page)
  };
}

export async function fetchBybitPage(page: number, signal?: AbortSignal): Promise<BybitItem[]> {
  const response = await fetch('/api/bybit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      accept: 'application/json'
    },
    body: JSON.stringify(buildRequestBody(page)),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${response.statusText}`);
  }

  const data = (await response.json()) as BybitResponse;

  if (data.ret_code !== 0 || !data.result) {
    throw new Error(data.ret_msg || 'Неожиданный ответ Bybit');
  }

  return Array.isArray(data.result.items) ? data.result.items : [];
}
