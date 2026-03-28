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
          id: 'essencial',
          label: 'Essencial',
          links: [
            { path: '/', label: 'Dashboard', icon: '▣' },
            { path: '/owners', label: 'Tutores', icon: '◫' },
            { path: '/patients', label: 'Pacientes', icon: '◪' },
            { path: '/encounters', label: 'Atendimentos', icon: '◧' },
            { path: '/medical-records', label: 'Prontuario', icon: '◩' }
          ]
        },
        {
          id: 'administrativo',
          label: 'Administrativo',
          links: [
            { path: '/users', label: 'Usuarios', icon: '◉' },
            { path: '/staff', label: 'Equipe', icon: '◎' },
            { path: '/access-control', label: 'Permissoes', icon: '◌' }
          ]
        },
        {
          id: 'operacao',
          label: 'Operacao',
          links: [
            { path: '/appointments', label: 'Agenda', icon: '◐' },
            { path: '/queue', label: 'Recepcao', icon: '◑' },
            { path: '/triage', label: 'Triagem', icon: '◒' }
          ]
        },
        {
          id: 'assistencial',
          label: 'Assistencial',
          links: [
            { path: '/inpatient', label: 'Internacao', icon: '◓' },
            { path: '/sectors', label: 'Setores', icon: '□' },
            { path: '/beds', label: 'Leitos', icon: '▤' },
            { path: '/bed-map', label: 'Mapa de Leitos', icon: '▥' },
            { path: '/diagnostics', label: 'Diagnosticos', icon: '△' },
            { path: '/surgeries', label: 'Cirurgia', icon: '▲' }
          ]
        },
        {
          id: 'backoffice',
          label: 'Backoffice',
          links: [
            { path: '/inventory', label: 'Estoque', icon: '◈' },
            { path: '/billing', label: 'Billing', icon: '◇' },
            { path: '/notifications', label: 'Notificacoes', icon: '✦' }
          ]
        },
        {
          id: 'governanca',
          label: 'Governanca',
          links: [
            { path: '/audit', label: 'Auditoria', icon: '◬' },
            { path: '/master-search', label: 'Busca Mestre', icon: '⌕' }
          ]
        }
      ]
    : [];

  const navHtml = navGroups
    .map((group) => {
      const links = group.links
        .map((link) => {
          const active = route.nav === link.path ? 'active' : '';
          return `<a href="${link.path}" class="sidebar-link ${active}" title="${link.label}" data-sidebar-link><span class="sidebar-link-icon">${link.icon}</span><span class="sidebar-link-label">${link.label}</span></a>`;
        })
        .join('');

      return `
        <details class="sidebar-group" data-sidebar-group data-group-id="${group.id}">
          <summary class="sidebar-group-toggle">
            <span class="sidebar-group-text">
              <span class="sidebar-group-kicker">Modulo</span>
              <span class="sidebar-group-label">${group.label}</span>
            </span>
            <span class="sidebar-group-chevron">▾</span>
          </summary>
          <div class="sidebar-group-links">
            ${links}
          </div>
        </details>`;
    })
    .join('');

  // Links planos para a topbar mobile (sem grupos)
  const flatLinksHtml = navGroups
    .flatMap((group) => group.links)
    .map(
      (link) =>
        `<a href="${link.path}" class="mobile-nav-link ${
          route.nav === link.path ? 'active' : ''
        }" title="${link.label}"><span class="mobile-nav-icon">${link.icon}</span><span class="mobile-nav-label">${link.label}</span></a>`
    )
    .join('');

  const chromeHtml = showChrome
    ? `
      <div class="app-shell" data-sidebar-state="expanded">
        <button class="sidebar-overlay" type="button" id="sidebar-overlay" aria-label="Fechar menu"></button>
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-top">
            <button class="icon-button sidebar-collapse-button" type="button" id="sidebar-pin-button" aria-label="Recolher ou expandir menu" aria-controls="app-sidebar" aria-expanded="true">⇤</button>
          </div>
          <div class="sidebar-nav" id="sidebar-nav">${navHtml}</div>
          <div class="sidebar-footer card-surface">
            <div id="nav-user-info" class="sidebar-user-slot"></div>
          </div>
        </aside>
        <div class="workspace-shell">
          <header class="topbar">
            <div class="topbar-left">
              <button class="icon-button topbar-toggle" type="button" id="sidebar-toggle" aria-label="Mostrar ou esconder menu" aria-controls="app-sidebar" aria-expanded="true">☰</button>
              <div class="topbar-title-wrap">
                <span class="topbar-overline">Painel operacional</span>
                <strong class="topbar-title">${route.title}</strong>
              </div>
            </div>
            <div class="topbar-right">
              <span class="topbar-chip">Ambiente oficial</span>
              <nav class="mobile-top-nav" role="navigation" aria-label="Menu móvel">${flatLinksHtml}</nav>
            </div>
          </header>
          <main id="page-content">
            ${body}
          </main>
          <div class="status-bar">
            <span>${config.appName} — ${config.apiBaseUrl}</span>
            <span id="status-time"></span>
          </div>
        </div>
      </div>`
    : `<main id="page-content">${body}</main>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${route.title} — CVG-HIS V2</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
  <style>${baseStyles}
  body.auth-pending .app-shell,
  body.auth-pending main,
  body.auth-pending .status-bar {
    visibility: hidden;
  }
  </style>
</head>
<body class="${requiresAuth ? 'auth-pending' : ''}">
  <script>
    ${clientApiScript}
    ${authBootstrapScript}
  </script>
  ${chromeHtml}
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
        el.innerHTML = '<a class="sidebar-login-link" href="/login">Entrar</a>';
        return;
      }
      const session = getSession();
      const name = session?.sub || session?.username || 'usuario';
      el.innerHTML = '<div class="sidebar-user-card">' +
        '<div><span class="sidebar-user-label">Usuario conectado</span><strong>' + escapeHtml(name) + '</strong></div>' +
        '<button class="small secondary" onclick="(async()=>{const rt=getRefreshToken();await apiRequest(\'/auth/logout\',{method:\'POST\',body:JSON.stringify(rt?{refreshToken:rt}:{})});clearTokens();window.location.assign(\'/login\')})()">Sair</button>' +
        '</div>';
    })();

    (function setupSidebar() {
      const shell = document.querySelector('.app-shell');
      if (!shell) return;
      const sidebar = document.getElementById('app-sidebar');
      const sidebarNav = document.getElementById('sidebar-nav');
      const overlay = document.getElementById('sidebar-overlay');
      const toggleButtons = [
        document.getElementById('sidebar-toggle'),
        document.getElementById('sidebar-pin-button')
      ].filter(Boolean);
      const stateStorageKey = 'cvg-his-v2.sidebar.state';
      const groupStorageKey = 'cvg-his-v2.sidebar.groups';
      const scrollStorageKey = 'cvg-his-v2.sidebar.scroll';
      const savedSidebarState = localStorage.getItem(stateStorageKey);
      const savedGroupState = localStorage.getItem(groupStorageKey);
      const savedSidebarScroll = localStorage.getItem(scrollStorageKey);

      function setSidebarState(nextState) {
        shell.setAttribute('data-sidebar-state', nextState);
        localStorage.setItem(stateStorageKey, nextState);
        const expanded = nextState !== 'collapsed';
        document.body.classList.toggle('sidebar-open', expanded && window.innerWidth <= 640);
        toggleButtons.forEach(function(button) {
          button.setAttribute('aria-expanded', String(expanded));
        });
      }

      function persistGroupState() {
        const groupState = {};
        document.querySelectorAll('[data-sidebar-group]').forEach(function(group) {
          const groupId = group.getAttribute('data-group-id');
          if (groupId) {
            groupState[groupId] = group.hasAttribute('open');
          }
        });
        localStorage.setItem(groupStorageKey, JSON.stringify(groupState));
      }

      if (savedGroupState) {
        try {
          const parsed = JSON.parse(savedGroupState);
          document.querySelectorAll('[data-sidebar-group]').forEach(function(group) {
            const groupId = group.getAttribute('data-group-id');
            if (!groupId || typeof parsed[groupId] !== 'boolean') return;
            if (parsed[groupId]) {
              group.setAttribute('open', '');
            } else {
              group.removeAttribute('open');
            }
          });
        } catch (_error) {
          localStorage.removeItem(groupStorageKey);
        }
      } else {
        // Se não há estado salvo, abrir automaticamente apenas no desktop (>=1024px) o grupo que contém a rota atual
        if (window.innerWidth >= 1024) {
          const currentPath = window.location.pathname;
          document.querySelectorAll('[data-sidebar-group]').forEach(function(group) {
            const links = group.querySelectorAll('[data-sidebar-link]');
            const hasActive = Array.from(links).some(link => link.getAttribute('href') === currentPath);
            if (hasActive) {
              group.setAttribute('open', '');
            }
          });
        }
        // No mobile (<=640), todos os grupos permanecem fechados
      }

      function toggleSidebar() {
        const nextState = shell.getAttribute('data-sidebar-state') === 'collapsed' ? 'expanded' : 'collapsed';
        setSidebarState(nextState);
      }

      function closeSidebar() {
        setSidebarState('collapsed');
      }

      if (savedSidebarState === 'collapsed') {
        setSidebarState('collapsed');
      } else {
        setSidebarState('expanded');
      }

      if (sidebarNav && savedSidebarScroll) {
        const parsedScroll = Number(savedSidebarScroll);
        if (!Number.isNaN(parsedScroll)) {
          sidebarNav.scrollTop = parsedScroll;
        }
      }

      sidebarNav?.addEventListener('scroll', function() {
        localStorage.setItem(scrollStorageKey, String(sidebarNav.scrollTop));
      });

      document.querySelectorAll('[data-sidebar-group]').forEach(function(group) {
        group.addEventListener('toggle', persistGroupState);
      });

      document.querySelectorAll('[data-sidebar-link]').forEach(function(link) {
        link.addEventListener('click', function() {
          if (sidebarNav) {
            localStorage.setItem(scrollStorageKey, String(sidebarNav.scrollTop));
          }
          persistGroupState();
          if (window.innerWidth <= 640) {
            closeSidebar();
          }
        });
      });

      toggleButtons.forEach(function(button) {
        button.addEventListener('click', toggleSidebar);
      });

      overlay?.addEventListener('click', closeSidebar);

      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
          closeSidebar();
        }
      });
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
