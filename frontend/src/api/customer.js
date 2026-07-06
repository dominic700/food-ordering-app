import { request } from './auth.js';

// Returns { cafes: [...], promotions: [...] }
export const getCafes = () => request('GET', '/customer/cafes');

// Get customer's per-cafe account (balance, credit, status)
export const getCafeAccount = (cafeId) =>
  request('GET', `/customer/account/${cafeId}`);

// Register at a cafe — sends name + phone with the request
export const registerAtCafe = (cafeId, name, phone) =>
  request('POST', `/customer/account/${cafeId}/register`, { name, phone });

// Full history — orders + deposits at a cafe
export const getAccountHistory = (cafeId) =>
  request('GET', `/customer/account/${cafeId}/history`);

// Transfer wallet balance to another approved customer at the same cafe
// toPhone: receiver's phone number (as registered in global_accounts)
export const transferBalance = (cafeId, toPhone, amount) =>
  request('POST', `/customer/account/${cafeId}/transfer`, {
    to_phone: toPhone,
    amount,
  });

// Persists the customer's chosen language server-side, so Telegram
// bot push notifications (order approved, deposit verified, etc.)
// match it too, not just the in-app UI text.
export const setLanguage = (language) => request('PATCH', '/customer/language', { language });
