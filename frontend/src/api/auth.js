import telegram from '../telegram.js';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
const ADMIN_TOKEN_KEY = 'admin_token';

// ── Admin JWT token storage ─────────────────────────────────────
// The admin portal logs in with email + password and gets a JWT back.
// Stored in localStorage so the admin stays logged in across reloads
// (this is a normal browser app, not a Claude artifact).
export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

// ── Shared request helper ───────────────────────────────────────
// auth:
//   'telegram' (default) -> sends Telegram WebApp initData
//                            (used by customer + cafe_owner routes)
//   'admin'               -> sends Bearer JWT token
//                            (used by admin routes)
//   'none'                -> no auth header (e.g. admin login itself)
export async function request(method, path, body = null, auth = 'telegram') {
  const headers = { 'Content-Type': 'application/json' };

  if (auth === 'telegram') {
    headers['x-telegram-init-data'] = telegram.getInitData();
  } else if (auth === 'admin') {
    const token = getAdminToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── POST /api/auth/init ───────────────────────────────────────
// Called when the Mini App opens. Detects role (admin / cafe_owner /
// customer) and creates a global account on first customer login.
export const initApp = (phone) => request('POST', '/auth/init', { phone });

// ── POST /api/auth/admin/login ──────────────────────────────────
// Admin portal login with email + password -> returns JWT token
export const adminLogin = (email, password) =>
  request('POST', '/auth/admin/login', { email, password }, 'none');
