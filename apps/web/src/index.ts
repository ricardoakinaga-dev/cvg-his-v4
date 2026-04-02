import { createServer, request as httpRequest } from 'node:http';
import { pathToFileURL } from 'node:url';

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
import { renderPrescriptions } from './pages/prescriptions.js';
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
import { renderDischarges } from './pages/discharges.js';
import { renderPrescriptionExecutions } from './pages/prescription-executions.js';
import { renderProducts } from './pages/products.js';
import { renderServices } from './pages/services.js';
import { renderCounterSales } from './pages/counter-sales.js';
import { renderQuotes } from './pages/quotes.js';
import { renderCommercialReports } from './pages/commercial-reports.js';
import { renderCashRegister } from './pages/cash-register.js';

const config = loadWebConfig(process.env);
const logger = createLogger(config.appName);

interface PageRenderer {
  (): string;
}

export const routes: Record<string, { render: PageRenderer; title: string; nav: string }> = {
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
  '/master-search': { render: renderMasterSearch, title: 'Busca Mestre', nav: '/master-search' },
  '/discharges': { render: renderDischarges, title: 'Altas', nav: '/discharges' },
  '/prescription-executions': {
    render: renderPrescriptionExecutions,
    title: 'Exec. Prescricao',
    nav: '/prescription-executions'
  },
  '/prescriptions': { render: renderPrescriptions, title: 'Prescricoes', nav: '/prescriptions' },
  '/products': { render: renderProducts, title: 'Produtos', nav: '/products' },
  '/services': { render: renderServices, title: 'Servicos', nav: '/services' },
  '/counter-sales': { render: renderCounterSales, title: 'Comanda', nav: '/counter-sales' },
  '/quotes': { render: renderQuotes, title: 'Orcamentos', nav: '/quotes' },
  '/commercial-reports': {
    render: renderCommercialReports,
    title: 'Relatorios',
    nav: '/commercial-reports'
  },
  '/cash-register': {
    render: renderCashRegister,
    title: 'Caixa',
    nav: '/cash-register'
  }
};

export function buildPage(path: string): string {
  const route = routes[path] ?? routes['/'];
  const body = route.render();
  const requiresAuth = path !== '/login';
  const showChrome = path !== '/login';

  const clientApiScript = apiClientScript
    .replace('__API_BASE_URL__', JSON.stringify('/api'))
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
          icon: '⚡',
          links: [
            { path: '/', label: 'Dashboard', icon: '📊' },
            { path: '/owners', label: 'Tutores', icon: '👥' },
            { path: '/patients', label: 'Pacientes', icon: '🐾' },
            { path: '/encounters', label: 'Atendimentos', icon: '🩺' },
            { path: '/medical-records', label: 'Prontuário', icon: '📋' }
          ]
        },
        {
          id: 'operacao',
          label: 'Operação',
          icon: '🔄',
          links: [
            { path: '/appointments', label: 'Agenda', icon: '📅' },
            { path: '/queue', label: 'Recepção', icon: '🔔' },
            { path: '/triage', label: 'Triagem', icon: '🏷️' }
          ]
        },
        {
          id: 'assistencial',
          label: 'Assistencial',
          icon: '🏥',
          links: [
            { path: '/inpatient', label: 'Internação', icon: '🏨' },
            { path: '/prescriptions', label: 'Prescrições', icon: '💊' },
            { path: '/prescription-executions', label: 'Exec. Prescrição', icon: '💉' },
            { path: '/diagnostics', label: 'Exames', icon: '🔬' },
            { path: '/surgeries', label: 'Cirurgias', icon: '⚕️' },
            { path: '/sectors', label: 'Setores', icon: '🏢' },
            { path: '/beds', label: 'Leitos', icon: '🛏️' },
            { path: '/bed-map', label: 'Mapa de Leitos', icon: '🗺️' },
            { path: '/discharges', label: 'Altas', icon: '🏠' }
          ]
        },
        {
          id: 'administrativo',
          label: 'Administrativo',
          icon: '⚙️',
          links: [
            { path: '/users', label: 'Usuários', icon: '👤' },
            { path: '/staff', label: 'Equipe', icon: '👨‍⚕️' },
            { path: '/access-control', label: 'Permissões', icon: '🔐' }
          ]
        },
        {
          id: 'backoffice',
          label: 'Backoffice',
          icon: '📦',
          links: [
            { path: '/billing', label: 'Faturamento', icon: '💰' },
            { path: '/inventory', label: 'Estoque', icon: '📦' },
            { path: '/products', label: 'Produtos', icon: '🏷️' },
            { path: '/services', label: 'Servicos', icon: '🔧' },
            { path: '/counter-sales', label: 'Comanda', icon: '🧾' },
            { path: '/quotes', label: 'Orcamentos', icon: '📋' },
            { path: '/commercial-reports', label: 'Relatorios', icon: '📊' },
            { path: '/cash-register', label: 'Caixa', icon: '💵' },
            { path: '/notifications', label: 'Notificações', icon: '🔔' }
          ]
        },
        {
          id: 'governanca',
          label: 'Governança',
          icon: '🛡️',
          links: [
            { path: '/audit', label: 'Auditoria', icon: '📝' },
            { path: '/master-search', label: 'Busca Global', icon: '🔍' }
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
        <details class="sidebar-group" data-sidebar-group data-group-id="${group.id}" ${group.id === 'essencial' ? 'open' : ''}>
          <summary class="sidebar-group-toggle">
            <span class="sidebar-group-text">
              <span class="sidebar-group-icon">${group.icon}</span>
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

  // Bottom navigation — 6 items essenciais para mobile
  const bottomNavLinks = [
    { path: '/', label: 'Início', icon: '🏠' },
    { path: '/owners', label: 'Tutores', icon: '👥' },
    { path: '/patients', label: 'Pacientes', icon: '🐾' },
    { path: '/encounters', label: 'Atend.', icon: '🩺' },
    { path: '/medical-records', label: 'Prontuário', icon: '📋' },
    { path: '/appointments', label: 'Agenda', icon: '📅' }
  ];

  const bottomNavHtml = bottomNavLinks
    .map(
      (link) =>
        `<a href="${link.path}" class="bottom-nav-item ${route.nav === link.path ? 'active' : ''}" aria-label="${link.label}">
          <span class="bottom-nav-icon">${link.icon}</span>
          <span class="bottom-nav-label">${link.label}</span>
        </a>`
    )
    .join('');

  const chromeHtml = showChrome
    ? `
      <div class="app-shell" data-sidebar-state="expanded">
        <button class="sidebar-overlay" type="button" id="sidebar-overlay" aria-label="Fechar menu"></button>
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-brand">
            <a href="/" class="sidebar-brand-link" title="Ir para Dashboard">
              <div class="sidebar-brand-logo">🏥</div>
              <div class="sidebar-brand-text">
                <strong>NexusVet</strong>
                <span>HIS v2.0</span>
              </div>
            </a>
            <button class="sidebar-collapse-btn" type="button" id="sidebar-pin-button" aria-label="Recolher menu" title="Recolher/Expandir" onclick="(function(){var s=document.querySelector('.app-shell');if(s){var c=s.getAttribute('data-sidebar-state')==='collapsed'?'expanded':'collapsed';s.setAttribute('data-sidebar-state',c);localStorage.setItem('cvg-his-v2.sidebar.state',c);}})()">⇤</button>
          </div>
          <div class="sidebar-search">
            <input type="text" id="sidebar-search-input" placeholder="🔍 Buscar módulo..." aria-label="Buscar na navegação" />
          </div>
          <div class="sidebar-nav" id="sidebar-nav">${navHtml}</div>
          <div class="sidebar-footer">
            <div id="nav-user-info" class="sidebar-user-slot"></div>
          </div>
        </aside>
        <div class="workspace-shell">
          <header class="topbar">
            <div class="topbar-left">
              <button class="topbar-menu-btn" type="button" id="sidebar-toggle" aria-label="Menu" onclick="(function(){var s=document.querySelector('.app-shell');if(s){var c=s.getAttribute('data-sidebar-state')==='collapsed'?'expanded':'collapsed';s.setAttribute('data-sidebar-state',c);localStorage.setItem('cvg-his-v2.sidebar.state',c);if(window.innerWidth<=768){document.body.classList.toggle('sidebar-open',c==='expanded');}}})()">☰</button>
              <div class="topbar-breadcrumb">
                <span class="topbar-title">${route.title}</span>
              </div>
            </div>
            <div class="topbar-right">
              <span class="topbar-chip">v2.0</span>
              <nav class="mobile-top-nav" role="navigation" aria-label="Menu móvel">${flatLinksHtml}</nav>
            </div>
          </header>
          <main id="page-content">
            ${body}
          </main>
          <div class="status-bar">
            <span>${config.appName}</span>
            <span id="status-time"></span>
          </div>
        </div>
        <nav class="mobile-bottom-nav" role="navigation" aria-label="Menu principal">${bottomNavHtml}</nav>
      </div>`
    : `<main id="page-content">${body}</main>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${route.title} — NexusVet HIS v${Date.now()}</title>
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

    // Auto-responsify tables: add data-label from headers for mobile card view
    (function responsifyTables() {
      if (window.innerWidth > 768) return;
      document.querySelectorAll('table').forEach(function(table) {
        var headers = [];
        table.querySelectorAll('thead th').forEach(function(th) {
          headers.push(th.textContent.trim());
        });
        if (headers.length === 0) return;
        table.querySelectorAll('tbody tr').forEach(function(row) {
          row.querySelectorAll('td').forEach(function(cell, i) {
            if (headers[i] && !cell.getAttribute('data-label')) {
              cell.setAttribute('data-label', headers[i]);
            }
          });
        });
      });
    })();

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

      // Sidebar search filter
      const searchInput = document.getElementById('sidebar-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const query = this.value.trim().toLowerCase();
          document.querySelectorAll('.sidebar-link').forEach(function(link) {
            const label = link.getAttribute('title') || link.textContent;
            const match = !query || label.toLowerCase().includes(query);
            link.style.display = match ? '' : 'none';
          });
          // Show/hide groups based on visible links
          document.querySelectorAll('.sidebar-group').forEach(function(group) {
            const visibleLinks = group.querySelectorAll('.sidebar-link:not([style*="display: none"])');
            group.style.display = visibleLinks.length > 0 ? '' : 'none';
            if (query && visibleLinks.length > 0) group.setAttribute('open', '');
          });
        });
      }

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

      // Swipe-to-close for mobile drawer
      if (sidebar && window.innerWidth <= 768) {
        let touchStartX = 0;
        let touchStartY = 0;
        let isSwiping = false;

        sidebar.addEventListener('touchstart', function(e) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          isSwiping = false;
        }, { passive: true });

        sidebar.addEventListener('touchmove', function(e) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          // Only close on left swipe, not vertical scroll
          if (dx < -30 && Math.abs(dy) < 50) {
            isSwiping = true;
          }
        }, { passive: true });

        sidebar.addEventListener('touchend', function() {
          if (isSwiping) {
            closeSidebar();
          }
        }, { passive: true });
      }
    })();
  </script>
</body>
</html>`;
}

export function createWebServer(runtimeConfig = config) {
  const apiBackend = runtimeConfig.apiBaseUrl || 'http://127.0.0.1:3001';

  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id'
      });
      response.end();
      return;
    }

    if (path.startsWith('/api/')) {
      const backendPath = path.replace('/api', '');
      const proxyReq = httpRequest(
        `${apiBackend}${backendPath}${url.search}`,
        {
          method: request.method,
          headers: {
            ...request.headers,
            host: new URL(apiBackend).host
          }
        },
        (proxyRes) => {
          response.writeHead(proxyRes.statusCode || 500, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*'
          });
          proxyRes.pipe(response);
        }
      );
      proxyReq.on('error', (err) => {
        response.writeHead(502, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'Backend unavailable', message: err.message }));
      });
      request.pipe(proxyReq);
      return;
    }

    const html = buildPage(path);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  const server = createWebServer(config);
  server.listen(config.port, config.host, () => {
    logger.info('web listening', {
      service: config.appName,
      host: config.host,
      port: config.port,
      environment: config.environment,
      apiBaseUrl: config.apiBaseUrl
    });
  });
}
