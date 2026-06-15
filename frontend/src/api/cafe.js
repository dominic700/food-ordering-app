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
