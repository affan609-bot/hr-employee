import { apiRequest, getAuthToken, setAuthToken, api as apiObj } from '../api.js';

export const getToken = getAuthToken;
export const setToken = setAuthToken;

export async function api(path, options = {}) {
  return apiRequest(path, options);
}

export async function apiBlob(path) {
  return apiRequest(path);
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

export default api;
