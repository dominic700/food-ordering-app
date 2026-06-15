import { request } from './auth.js';

// ── GET /api/menu/:cafeId ──────────────────────────────────────
// Public — customer-facing menu.
// Each item includes: base_price, list_price, price (after item
// discount, used for wallet/credit payment), discount_percent.
export const getMenu = (cafeId) => request('GET', `/menu/${cafeId}`);

// ── GET /api/menu/:cafeId/all ───────────────────────────────────
// Cafe owner — menu editor view (raw base price + discount_percent
// the owner set, plus the cafe's service_fee for preview).
// cafeId comes from the cafe owner's account (store.account.cafe_id).
export const getMenuAll = (cafeId) => request('GET', `/menu/${cafeId}/all`);

// ── Categories ───────────────────────────────────────────────
export const addCategory    = (name, displayOrder = 0) =>
  request('POST', '/menu/categories', { name, display_order: displayOrder });
export const deleteCategory = (id) => request('DELETE', `/menu/categories/${id}`);

// ── Items ────────────────────────────────────────────────────
// data: { category_id, name, description, price, image_url, discount_percent }
// `price` is the BASE price (before the cafe's service fee is added).
// `discount_percent` (0-100, optional) applies to wallet/credit orders.
export const addMenuItem    = (data) => request('POST', '/menu/items', data);
export const updateMenuItem = (itemId, data) => request('PATCH', `/menu/items/${itemId}`, data);
export const deleteMenuItem = (itemId) => request('DELETE', `/menu/items/${itemId}`);
