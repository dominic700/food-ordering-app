import telegram from '../telegram.js';

// In production, VITE_API_URL points at the Render backend
// (e.g. https://food-ordering-backend.onrender.com). In local dev
// it's left unset and vite.config.js's dev-server proxy forwards
// /api to http://localhost:5000 instead.
export const API_BASE = import.meta.env.VITE_API_URL || '';
const BASE = `${API_BASE}/api`;

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

  // If this ever resolves to an HTML page (e.g. a misconfigured
  // SPA redirect swallowing /api/* in production) res.json() would
  // throw a confusing "Unexpected token '<'" error. Detect that
  // case explicitly so the real problem is obvious instead.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned a non-JSON response (status ${res.status}). Check that VITE_API_URL is set correctly and that /api routes are not being caught by the SPA redirect.`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Called when Mini App opens
// Sends telegram identity → gets back role + account
export const initApp = (phone) =>
  request('POST', '/auth/init', { phone });
