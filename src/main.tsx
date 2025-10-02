import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './app.css';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Failed to find root element #app');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
