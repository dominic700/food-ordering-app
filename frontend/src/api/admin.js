import { request, API_BASE } from './auth.js';
import telegram from '../telegram.js';

// ── Cafes ─────────────────────────────────────────────────────
export const getCafes      = () => request('GET', '/admin/cafes');
export const getCafeDetail = (cafeId) => request('GET', `/admin/cafes/${cafeId}`);
export const createCafe    = (data) => request('POST', '/admin/cafes', data);
export const updateCafe    = (cafeId, data) => request('PATCH', `/admin/cafes/${cafeId}`, data);
export const toggleCafe    = (cafeId) => request('PATCH', `/admin/cafes/${cafeId}/toggle`);
export const deleteCafe    = (cafeId) => request('DELETE', `/admin/cafes/${cafeId}`);

// ── Fee collection ────────────────────────────────────────────
export const getFeeStats    = (cafeId) => request('GET', `/admin/cafes/${cafeId}/fee-stats`);
export const restartFeeWeek = (cafeId, collectedBy) =>
  request('POST', `/admin/cafes/${cafeId}/fee-restart`, { collected_by: collectedBy });

// ── Promotions ────────────────────────────────────────────────
export const getPromotions   = () => request('GET', '/admin/promotions');
export const deletePromotion = (id) => request('DELETE', `/admin/promotions/${id}`);

// ── Shared multipart upload helper ──────────────────────────────
// Cannot use the normal request() helper because this is a file
// upload (multipart/form-data, not JSON).
async function uploadFile(path, file, extraFields = {}) {
  const formData = new FormData();
  formData.append('image', file);
  for (const [key, value] of Object.entries(extraFields)) {
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value);
    }
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: {
      'x-telegram-init-data': telegram.getInitData(),
      // Do NOT set Content-Type here — the browser sets it
      // automatically with the correct multipart boundary.
    },
    body: formData,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned a non-JSON response (status ${res.status}). Check VITE_API_URL and that this upload route is registered on the backend.`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// Upload a promo image — creates the promotion row in one request.
export const uploadPromoImage = (file, title = '', cafeId = null) =>
  uploadFile('/admin/promotions/upload', file, { title, cafe_id: cafeId });

// Upload a cafe profile picture — returns { image_url } only.
// The caller then passes that URL as `logo_url` when calling
// createCafe() or updateCafe().
export const uploadCafeLogo = (file) =>
  uploadFile('/admin/cafes/upload-logo', file);
