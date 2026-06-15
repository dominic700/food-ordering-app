import { request } from './auth.js';

// All admin routes require a JWT (auth = 'admin')

// ── Cafes ────────────────────────────────────────────────────
export const getCafes      = () => request('GET', '/admin/cafes', null, 'admin');
export const getCafeDetail = (cafeId) => request('GET', `/admin/cafes/${cafeId}`, null, 'admin');
export const createCafe    = (data) => request('POST', '/admin/cafes', data, 'admin');
export const updateCafe    = (cafeId, data) => request('PATCH', `/admin/cafes/${cafeId}`, data, 'admin');
export const toggleCafe    = (cafeId) => request('PATCH', `/admin/cafes/${cafeId}/toggle`, null, 'admin');

// ── Promotions ───────────────────────────────────────────────
export const getPromotions    = () => request('GET', '/admin/promotions', null, 'admin');
export const createPromotion  = (data) => request('POST', '/admin/promotions', data, 'admin');
export const deletePromotion  = (id) => request('DELETE', `/admin/promotions/${id}`, null, 'admin');
