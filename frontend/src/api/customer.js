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
