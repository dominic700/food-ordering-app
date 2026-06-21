import { request } from './auth.js';

// Works identically for all three roles (customer, cafe owner, admin) —
// the backend looks up notifications by telegram_id regardless of role.
export const getNotifications  = () => request('GET', '/notifications');
export const markAsRead        = (id) => request('PATCH', `/notifications/${id}/read`);
export const markAllAsRead     = () => request('PATCH', '/notifications/read-all');
