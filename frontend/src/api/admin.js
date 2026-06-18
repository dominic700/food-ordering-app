import { request } from './auth.js';
import telegram from '../telegram.js';

const BASE = '/api';

// ── Cafes ─────────────────────────────────────────────────────
export const getCafes      = () => request('GET', '/admin/cafes');
export const getCafeDetail = (cafeId) => request('GET', `/admin/cafes/${cafeId}`);
export const createCafe    = (data) => request('POST', '/admin/cafes', data);
export const updateCafe    = (cafeId, data) => request('PATCH', `/admin/cafes/${cafeId}`, data);
export const toggleCafe    = (cafeId) => request('PATCH', `/admin/cafes/${cafeId}/toggle`);

// ── Promotions ────────────────────────────────────────────────
export const getPromotions   = () => request('GET', '/admin/promotions');
export const deletePromotion = (id) => request('DELETE', `/admin/promotions/${id}`);

// ── Upload promo image (multipart/form-data) ──────────────────
// Cannot use the normal request() helper because this is a file upload
export async function uploadPromoImage(file, title = '', cafeId = null) {
  const formData = new FormData();
  formData.append('image', file);
  if (title) formData.append('title', title);
  if (cafeId) formData.append('cafe_id', cafeId);

  const res = await fetch(`${BASE}/admin/promotions/upload`, {
    method: 'POST',
    headers: {
      'x-telegram-init-data': telegram.getInitData(),
      // Do NOT set Content-Type here — browser sets it automatically
      // with the correct multipart boundary for FormData
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
