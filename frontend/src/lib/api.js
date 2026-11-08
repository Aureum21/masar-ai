/** One API origin; API keys and provider credentials never belong here. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export function errorMessage(data, fallback = 'Request failed') {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map(e => e.msg || 'Invalid input').join(' • ');
  return data?.message || fallback;
}

export async function apiRequest(path, {token, ...options} = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(apiUrl(path), {...options, headers});
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(errorMessage(data, `Request failed (${response.status})`));
    error.status = response.status;
    throw error;
  }
  return data;
}
