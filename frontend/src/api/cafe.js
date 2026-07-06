import { request } from './auth.js';

// All routes here require Telegram auth + the user being a cafe owner
// (enforced by backend's cafeOwnerAuth middleware)

// ── Dashboard ────────────────────────────────────────────────
export const getDashboard = () => request('GET', '/cafe/dashboard');

// ── Customer registrations ──────────────────────────────────
export const getRegistrations    = () => request('GET', '/cafe/registrations');
export const approveRegistration = (pcaId) => request('PATCH', `/cafe/registrations/${pcaId}/approve`);
export const rejectRegistration  = (pcaId) => request('PATCH', `/cafe/registrations/${pcaId}/reject`);

// ── Customers ────────────────────────────────────────────────
export const getCustomers       = () => request('GET', '/cafe/customers');
export const getCustomerDetail  = (pcaId) => request('GET', `/cafe/customers/${pcaId}`);

// Cafe owner sets a customer's credit limit directly from their profile
export const setCustomerCreditLimit = (pcaId, creditLimit) =>
  request('PATCH', `/cafe/customers/${pcaId}/credit-limit`, { credit_limit: creditLimit });

// ── Settings ─────────────────────────────────────────────────
export const getCafeSettings = () => request('GET', '/cafe/settings');

// ── Fee / revenue counters (read-only) ──────────────────────
// Mirrors the admin's fee-stats but scoped to this cafe. There is
// no restart/reset call here on purpose — only the admin can reset
// (via /admin/cafes/:id/fee-restart), and this simply reflects the
// current period since that last reset.
export const getFeeStats = () => request('GET', '/cafe/fee-stats');

// Persists the cafe owner's chosen language server-side, so
// Telegram bot push notifications match it too, not just the
// in-app UI text.
export const setLanguage = (language) => request('PATCH', '/cafe/language', { language });
