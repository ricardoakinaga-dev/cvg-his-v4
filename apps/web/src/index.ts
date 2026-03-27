import { createServer } from 'node:http';

import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';
import { loadWebConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';

import { baseStyles } from './styles.js';
import { apiClientScript } from './pages/api-client.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderOwners } from './pages/owners.js';
import { renderPatients } from './pages/patients.js';
import { renderEncounters } from './pages/encounters.js';
import { renderMedicalRecords } from './pages/medical-records.js';

const config = loadWebConfig(process.env);
const logger = createLogger(config.appName);

interface PageRenderer {
  (): string;
}

const routes: Record<string, { render: PageRenderer; title: string; nav: string }> = {
  '/login': { render: renderLogin, title: 'Login', nav: '/login' },
  '/': { render: renderDashboard, title: 'Dashboard', nav: '/' },
  '/owners': { render: renderOwners, title: 'Tutores', nav: '/owners' },
  '/patients': { render: renderPatients, title: 'Pacientes', nav: '/patients' },
  '/encounters': { render: renderEncounters, title: 'Atendimentos', nav: '/encounters' },
  '/medical-records': {
    render: renderMedicalRecords,
    title: 'Prontuario',
    nav: '/medical-records'
  }
};

function buildPage(path: string): string {
  const route = routes[path] ?? routes['/'];
  const body = route.render();
  const requiresAuth = path !== '/login';
  const showChrome = path !== '/login';

  const clientApiScript = apiClientScript
    .replace('__API_BASE_URL__', JSON.stringify(config.apiBaseUrl))
    .replace('__STORAGE_KEYS__', JSON.stringify(AUTH_STORAGE_KEYS));

  const navScript = `
    function navigateTo(path) {
      window.location.assign(path);
    }
  `;

  const authBootstrapScript = `
    (function enforceAuth() {
      var protectedPath = ${JSON.stringify(requiresAuth)};
      var currentPath = window.location.pathname + window.location.search;

      if (protectedPath && !isLoggedIn()) {
        window.location.replace('/login?next=' + encodeURIComponent(currentPath));
        return;
      }

      if (!protectedPath && isLoggedIn()) {
        var next = new URLSearchParams(window.location.search).get('next');
        window.location.replace(next || '/');
        return;
      }

      document.body.classList.remove('auth-pending');
    })();
  `;

  const navLinks = showChrome
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/owners', label: 'Tutores' },
        { path: '/patients', label: 'Pacientes' },
        { path: '/encounters', label: 'Atendimentos' },
        { path: '/medical-records', label: 'Prontuario' }
      ]
    : [];

  const navHtml = navLinks
    .map(
      (l) => `<a href="${l.path}" class="${route.nav === l.path ? 'active' : ''}">${l.label}</a>`
    )
    .join('\n            ');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${route.title} — CVG-HIS V2</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
  <style>${baseStyles}
  body.auth-pending nav,
  body.auth-pending main,
  body.auth-pending .status-bar {
    visibility: hidden;
  }
  </style>
</head>
<body class="${requiresAuth ? 'auth-pending' : ''}">
  <script>
    ${clientApiScript}
    ${navScript}
    ${authBootstrapScript}
  </script>
  ${showChrome
    ? `<nav>
    <span class="brand">CVG-HIS V2</span>
    ${navHtml}
    <span class="spacer"></span>
    <span id="nav-user-info"></span>
  </nav>`
    : ''}
  <main id="page-content">
    ${body}
  </main>
  ${showChrome
    ? `<div class="status-bar">
    <span>${config.appName} — ${config.apiBaseUrl}</span>
    <span id="status-time"></span>
  </div>`
    : ''}
  <script>
    const statusTimeEl = document.getElementById('status-time');
    if (statusTimeEl) {
      statusTimeEl.textContent = new Date().toLocaleTimeString('pt-BR');
      setInterval(() => {
        const el = document.getElementById('status-time');
        if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
      }, 1000);
    }

    (function updateNavUser() {
      const el = document.getElementById('nav-user-info');
      if (!el) return;
      const at = getAccessToken();
      if (!at) {
        el.innerHTML = '<a href="/login" style="font-size:0.85rem">Entrar</a>';
        return;
      }
      const session = getSession();
      const name = session?.sub || session?.username || 'usuario';
      el.innerHTML = '<span style="font-size:0.8rem;color:#475569">' + escapeHtml(name) +
        '</span> <button class="small secondary" onclick="(async()=>{const rt=getRefreshToken();await apiRequest(\'/auth/logout\',{method:\'POST\',body:JSON.stringify(rt?{refreshToken:rt}:{})});clearTokens();window.location.assign(\'/login\')})()">Sair</button>';
    })();
  </script>
</body>
</html>`;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  const html = buildPage(path);
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});

server.listen(config.port, config.host, () => {
  logger.info('web listening', {
    service: config.appName,
    host: config.host,
    port: config.port,
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl
  });
});
