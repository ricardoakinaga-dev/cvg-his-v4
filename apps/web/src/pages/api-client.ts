export const apiClientScript = `
const apiBaseUrl = __API_BASE_URL__;
const storageKeys = __STORAGE_KEYS__;

function getAccessToken() {
  return localStorage.getItem(storageKeys.accessToken);
}
function getRefreshToken() {
  return localStorage.getItem(storageKeys.refreshToken);
}
function setTokens(at, rt) {
  localStorage.setItem(storageKeys.accessToken, at);
  localStorage.setItem(storageKeys.refreshToken, rt);
}
function clearTokens() {
  localStorage.removeItem(storageKeys.accessToken);
  localStorage.removeItem(storageKeys.refreshToken);
}
function getSession() {
  const at = getAccessToken();
  if (!at) return null;
  try {
    const payload = JSON.parse(at.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'));
    return payload;
  } catch { return null; }
}
async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const at = getAccessToken();
  if (at) headers.set('authorization', 'Bearer ' + at);
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
  const resp = await fetch(apiBaseUrl + path, { ...options, headers });
  if (resp.status === 204) return { ok: true, status: 204, body: null };
  const body = await resp.json().catch(() => null);
  if (resp.status === 401 && path !== '/auth/login') {
    clearTokens();
    window.location.hash = '#/login';
    return { ok: false, status: 401, body };
  }
  return { ok: resp.ok, status: resp.status, body };
}
function isLoggedIn() { return !!getAccessToken(); }
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('pt-BR'); } catch { return d; }
}
function showOutput(el, data) {
  if (el) el.textContent = JSON.stringify(data, null, 2);
}
`;
