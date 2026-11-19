const API_BASE = '';

export function getToken() {
  return localStorage.getItem('hcm_token');
}
// alias used by AuthContext
export const getAuthToken = getToken;

export function setToken(token) {
  if (token) localStorage.setItem('hcm_token', token);
  else localStorage.removeItem('hcm_token');
}
// alias
export const setAuthToken = setToken;

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Network error — please check your connection.');
  }

  // On 401, clear stale token (except during login/status checks)
  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/status')) {
    setToken(null);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = (data && data.error) || (typeof data === 'string' && data.length < 200 ? data : `Request failed (${res.status})`);
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiBlob(path) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    throw new Error((data && data.error) || `Download failed (${res.status})`);
  }
  return res.blob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
