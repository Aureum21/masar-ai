const eventName = 'masar:auth-change';
export function readStored(key) {
  try { return typeof window === 'undefined' ? null : localStorage.getItem(key); }
  catch { return null; }
}
export function subscribeAuth(listener) {
  window.addEventListener('storage', listener);
  window.addEventListener(eventName, listener);
  return () => {window.removeEventListener('storage', listener); window.removeEventListener(eventName, listener);};
}
export function storeAuth(token, email) {
  for (const [key, value] of [['masar_token', token], ['masar_user_email', email]]) {
    if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event(eventName));
}
