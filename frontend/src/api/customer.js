import { request } from './auth.js';

// All routes here require Telegram auth (customer)

// ── Cafes ────────────────────────────────────────────────────
// Returns { cafes: [...], promotions: [...] }
export const getCafes = () => request('GET', '/customer/cafes');

// ── Per-cafe account ─────────────────────────────────────────
export const getCafeAccount   = (cafeId) => request('GET', `/customer/account/${cafeId}`);
export const registerAtCafe   = (cafeId) => request('POST', `/customer/account/${cafeId}/register`);
export const getAccountHistory = (cafeId) => request('GET', `/customer/account/${cafeId}/history`);
