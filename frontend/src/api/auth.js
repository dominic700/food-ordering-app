import telegram from '../telegram.js';

const BASE = '/api';

// Shared request helper
// All requests use Telegram initData for auth
export async function request(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-telegram-init-data': telegram.getInitData(),
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Called when Mini App opens
// Sends telegram identity → gets back role + account
export const initApp = (phone) =>
  request('POST', '/auth/init', { phone });
