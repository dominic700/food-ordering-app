import { request } from './auth.js';

// ── Customer ─────────────────────────────────────────────────
// paymentMethod: 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'cash'
export const submitDeposit = (cafeId, amount, paymentMethod, transactionNumber) =>
  request('POST', '/deposits', {
    cafe_id: cafeId,
    amount,
    payment_method: paymentMethod,
    transaction_number: transactionNumber,
  });

export const applyForCredit = (cafeId, requestedLimit) =>
  request('POST', '/deposits/credit/apply', { cafe_id: cafeId, requested_limit: requestedLimit });

// ── Cafe owner ───────────────────────────────────────────────
export const getCreditApplications = () => request('GET', '/deposits/credit/applications');

// status: 'approved' | 'rejected', approvedLimit required if 'approved'
export const reviewCreditApplication = (appId, status, approvedLimit) =>
  request('PATCH', `/deposits/credit/applications/${appId}`, {
    status,
    approved_limit: approvedLimit,
  });
