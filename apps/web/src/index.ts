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
import { renderUsers } from './pages/users.js';
import { renderStaff } from './pages/staff.js';
import { renderAccessControl } from './pages/access-control.js';
import { renderAppointments } from './pages/appointments.js';
import { renderQueue } from './pages/queue.js';
import { renderTriage } from './pages/triage.js';
import { renderInpatient } from './pages/inpatient.js';
import { renderDiagnostics } from './pages/diagnostics.js';
import { renderSurgeries } from './pages/surgeries.js';
import { renderInventory } from './pages/inventory.js';
import { renderBilling } from './pages/billing.js';
import { renderNotifications } from './pages/notifications.js';
import { renderAudit } from './pages/audit.js';
import { renderMasterSearch } from './pages/master-search.js';
import { renderSectors } from './pages/sectors.js';
import { renderBeds } from './pages/beds.js';
import { renderBedMap } from './pages/bedmap.js';

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
  },
  '/users': { render: renderUsers, title: 'Usuarios', nav: '/users' },
  '/staff': { render: renderStaff, title: 'Equipe', nav: '/staff' },
  '/access-control': { render: renderAccessControl, title: 'Permissoes', nav: '/access-control' },
  '/appointments': { render: renderAppointments, title: 'Agenda', nav: '/appointments' },
  '/queue': { render: renderQueue, title: 'Recepcao', nav: '/queue' },
  '/triage': { render: renderTriage, title: 'Triagem', nav: '/triage' },
  '/inpatient': { render: renderInpatient, title: 'Internacao', nav: '/inpatient' },
  '/sectors': { render: renderSectors, title: 'Setores', nav: '/sectors' },
  '/beds': { render: renderBeds, title: 'Leitos', nav: '/beds' },
  '/bed-map': { render: renderBedMap, title: 'Mapa de Leitos', nav: '/bed-map' },
  '/diagnostics': { render: renderDiagnostics, title: 'Diagnosticos', nav: '/diagnostics' },
  '/surgeries': { render: renderSurgeries, title: 'Cirurgia', nav: '/surgeries' },
  '/inventory': { render: renderInventory, title: 'Estoque', nav: '/inventory' },
  '/billing': { render: renderBilling, title: 'Billing', nav: '/billing' },
  '/notifications': { render: renderNotifications, title: 'Notificacoes', nav: '/notifications' },
  '/audit': { render: renderAudit, title: 'Auditoria', nav: '/audit' },
  '/master-search': { render: renderMasterSearch, title: 'Busca Mestre', nav: '/master-search' }
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

  const navGroups = showChrome
    ? [
        {
          label: 'Essencial',
          links: [
            { path: '/', label: 'Dashboard' },
            { path: '/owners', label: 'Tutores' },
            { path: '/patients', label: 'Pacientes' },
            { path: '/encounters', label: 'Atendimentos' },
            { path: '/medical-records', label: 'Prontuario' }
          ]
        },
        {
          label: 'Administrativo',
          links: [
            { path: '/users', label: 'Usuarios' },
            { path: '/staff', label: 'Equipe' },
            { path: '/access-control', label: 'Permissoes' }
          ]
        },
        {
          label: 'Operacao',
          links: [
            { path: '/appointments', label: 'Agenda' },
            { path: '/queue', label: 'Recepcao' },
            { path: '/triage', label: 'Triagem' }
          ]
        },
        {
          label: 'Assistencial',
          links: [
            { path: '/inpatient', label: 'Internacao' },
            { path: '/sectors', label: 'Setores' },
            { path: '/beds', label: 'Leitos' },
            { path: '/bed-map', label: 'Mapa de Leitos' },
            { path: '/diagnostics', label: 'Diagnosticos' },
            { path: '/surgeries', label: 'Cirurgia' }
          ]
        },
        {
          label: 'Administrativo+',
          links: [
            { path: '/inventory', label: 'Estoque' },
            { path: '/billing', label: 'Billing' },
            { path: '/notifications', label: 'Notificacoes' }
          ]
        },
        {
          label: 'Governanca',
          links: [
            { path: '/audit', label: 'Auditoria' },
            { path: '/master-search', label: 'Busca Mestre' }
          ]
        }
      ]
    : [];

  const navHtml = navGroups
    .map((group) => {
      const links = group.links
        .map(
          (link) =>
            `<a href="${link.path}" class="${route.nav === link.path ? 'active' : ''}">${link.label}</a>`
        )
        .join('');
      return `<div class="nav-group"><span class="nav-group-label">${group.label}</span><div class="nav-links">${links}</div></div>`;
    })
    .join('');

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
  ${
    showChrome
      ? `<nav>
    <div class="nav-branding">
      <span class="brand">CVG-HIS V2</span>
      <span class="nav-branding-subtitle">Centro Veterinario Guarapiranga</span>
    </div>
    <div class="nav-groups">${navHtml}</div>
    <span class="spacer"></span>
    <span id="nav-user-info" class="nav-user-slot"></span>
  </nav>`
      : ''
  }
  <main id="page-content">
    ${body}
  </main>
  ${
    showChrome
      ? `<div class="status-bar">
    <span>${config.appName} — ${config.apiBaseUrl}</span>
    <span id="status-time"></span>
  </div>`
      : ''
  }
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
