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
function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = atob(padded);
    const utf8 = decodeURIComponent(Array.from(decoded).map(function (char) {
      return '%' + char.charCodeAt(0).toString(16).padStart(2, '0');
    }).join(''));
    return JSON.parse(utf8);
  } catch {
    return null;
  }
}
function getSession() {
  const at = getAccessToken();
  if (!at) return null;
  return decodeJwtPayload(at);
}
function normalizeApiRequestArgs(pathOrMethod, optionsOrPath, maybeBody) {
  if (typeof optionsOrPath === 'string') {
    return {
      path: optionsOrPath,
      options: {
        method: pathOrMethod,
        body: maybeBody == null ? undefined : JSON.stringify(maybeBody)
      }
    };
  }

  return {
    path: pathOrMethod,
    options: optionsOrPath || {}
  };
}
async function apiRequest(pathOrMethod, optionsOrPath, maybeBody) {
  const normalized = normalizeApiRequestArgs(pathOrMethod, optionsOrPath, maybeBody);
  const path = normalized.path;
  const options = normalized.options;
  const headers = new Headers(options.headers || {});
  const at = getAccessToken();
  if (at) headers.set('authorization', 'Bearer ' + at);
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
  const resp = await fetch(apiBaseUrl + path, { ...options, headers });
  if (resp.status === 204) return { ok: true, status: 204, body: null };
  const body = await resp.json().catch(() => null);
  if (resp.status === 401 && path !== '/auth/login') {
    clearTokens();
    window.location.assign('/login');
    return { ok: false, status: 401, body };
  }
  return { ok: resp.ok, status: resp.status, body };
}
function isLoggedIn() {
  const session = getSession();
  if (!session) {
    clearTokens();
    return false;
  }

  if (typeof session.exp === 'number' && session.exp * 1000 <= Date.now()) {
    clearTokens();
    return false;
  }

  return true;
}
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
