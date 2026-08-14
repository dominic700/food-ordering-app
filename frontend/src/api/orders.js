import { request } from './auth.js';

// ── POST /api/orders ──────────────────────────────────────────
// Customer places an order.
// paymentInfo:
//   { payment_method: 'wallet' }  (default — balance + credit, with
//                                  per-item discounts applied)
//   { payment_method: 'transfer', transfer_provider: 'telebirr' |
//     'cbe_birr' | 'bank_transfer', transaction_number: '...' }
export const verifyTelebirr = (cafeId, receiptInput, expectedAmount) =>
  request('POST', '/orders/verify-telebirr', {
    cafe_id: cafeId,
    receipt_input: receiptInput,
    expected_amount: expectedAmount,
  });

export const placeOrder = (cafeId, items, note, paymentInfo = {}) =>
  request('POST', '/orders', { cafe_id: cafeId, items, note, ...paymentInfo });

// ── Cafe owner ───────────────────────────────────────────────
export const getPendingOrders = () => request('GET', '/orders/cafe/pending');
export const getOrderHistory  = () => request('GET', '/orders/cafe/history');
export const approveOrder     = (orderId) => request('PATCH', `/orders/${orderId}/approve`);
export const cancelOrder      = (orderId) => request('PATCH', `/orders/${orderId}/cancel`);
