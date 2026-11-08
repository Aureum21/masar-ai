import { apiRequest } from './api.js';
export function normalizeNotifications(items) {
  return (Array.isArray(items) ? items : []).filter(n =>
    n && typeof n.id === 'string' && (n.type === 'daily_promotion' || /^\/trips\/\d+\?/.test(n.deepLink || ''))
  ).slice(0,100);
}
export async function updateNotifications(token, action, id) {
  return apiRequest('/api/v1/passport/notifications/actions', {token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id})});
}
