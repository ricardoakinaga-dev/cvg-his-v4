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

interface NavLink {
  path: string;
  label: string;
  icon: string;
  keywords?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  links: NavLink[];
}

interface CommandPaletteItem extends NavLink {
  group: string;
  shortcut?: string;
  active?: boolean;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNavGroups(): NavGroup[] {
  return [
    {
      id: 'essencial',
      label: 'Essencial',
      icon: '⚡',
      links: [
        { path: '/', label: 'Dashboard', icon: '📊', keywords: ['inicio', 'home', 'painel'] },
        { path: '/owners', label: 'Tutores', icon: '👥', keywords: ['owners', 'responsaveis'] },
        { path: '/patients', label: 'Pacientes', icon: '🐾', keywords: ['cadastro', 'animais'] },
        { path: '/encounters', label: 'Atendimentos', icon: '🩺', keywords: ['consultas', 'visitas'] },
        {
          path: '/medical-records',
          label: 'Prontuário',
          icon: '📋',
          keywords: ['prontuario', 'historico', 'evolucao']
        }
      ]
    },
    {
      id: 'operacao',
      label: 'Operação',
      icon: '🔄',
      links: [
        { path: '/appointments', label: 'Agenda', icon: '📅', keywords: ['agenda', 'agendamentos'] },
        { path: '/queue', label: 'Recepção', icon: '🔔', keywords: ['fila', 'triagem inicial'] },
        { path: '/triage', label: 'Triagem', icon: '🏷️', keywords: ['acolhimento', 'prioridade'] }
      ]
    },
    {
      id: 'assistencial',
      label: 'Assistencial',
      icon: '🏥',
      links: [
        { path: '/inpatient', label: 'Internação', icon: '🏨', keywords: ['leitos', 'internado'] },
        { path: '/prescriptions', label: 'Prescrições', icon: '💊', keywords: ['prescricao', 'medicacoes'] },
        {
          path: '/prescription-executions',
          label: 'Exec. Prescrição',
          icon: '💉',
          keywords: ['execucao', 'prescricao']
        },
        { path: '/diagnostics', label: 'Exames', icon: '🔬', keywords: ['diagnosticos', 'laboratorio'] },
        { path: '/surgeries', label: 'Cirurgias', icon: '⚕️', keywords: ['cirurgia', 'bloco'] },
        { path: '/sectors', label: 'Setores', icon: '🏢', keywords: ['unidades', 'locais'] },
        { path: '/beds', label: 'Leitos', icon: '🛏️', keywords: ['camas', 'ocupacao'] },
        { path: '/bed-map', label: 'Mapa de Leitos', icon: '🗺️', keywords: ['mapa', 'ocupacao'] },
        { path: '/discharges', label: 'Altas', icon: '🏠', keywords: ['saida', 'alta'] }
      ]
    },
    {
      id: 'administrativo',
      label: 'Administrativo',
      icon: '⚙️',
      links: [
        { path: '/users', label: 'Usuários', icon: '👤', keywords: ['acessos', 'usuarios'] },
        { path: '/staff', label: 'Equipe', icon: '👨‍⚕️', keywords: ['profissionais', 'colaboradores'] },
        { path: '/access-control', label: 'Permissões', icon: '🔐', keywords: ['roles', 'rbac', 'acesso'] }
      ]
    },
    {
      id: 'backoffice',
      label: 'Backoffice',
      icon: '📦',
      links: [
        { path: '/billing', label: 'Faturamento', icon: '💰', keywords: ['billing', 'financeiro'] },
        { path: '/inventory', label: 'Estoque', icon: '📦', keywords: ['inventario', 'materiais'] },
        { path: '/products', label: 'Produtos', icon: '🏷️', keywords: ['cadastro', 'itens'] },
        { path: '/services', label: 'Serviços', icon: '🔧', keywords: ['servicos', 'procedimentos'] },
        { path: '/counter-sales', label: 'Comanda', icon: '🧾', keywords: ['balcao', 'vendas'] },
        { path: '/quotes', label: 'Orçamentos', icon: '📋', keywords: ['propostas', 'orcamentos'] },
        { path: '/commercial-reports', label: 'Relatórios', icon: '📊', keywords: ['indicadores', 'reportes'] },
        { path: '/cash-register', label: 'Caixa', icon: '💵', keywords: ['caixa', 'fluxo'] },
        { path: '/notifications', label: 'Notificações', icon: '🔔', keywords: ['alertas', 'avisos'] }
      ]
    },
    {
      id: 'governanca',
      label: 'Governança',
      icon: '🛡️',
      links: [
        { path: '/audit', label: 'Auditoria', icon: '📝', keywords: ['logs', 'rastreio'] },
        { path: '/master-search', label: 'Busca Global', icon: '🔍', keywords: ['busca', 'search', 'pesquisa'] }
      ]
    }
  ];
}

function buildCommandPaletteItems(groups: NavGroup[], activePath: string): CommandPaletteItem[] {
  return groups.flatMap((group) =>
    group.links.map((link) => ({
      ...link,
      group: group.label,
      active: link.path === activePath,
      shortcut: link.path === '/master-search' ? 'Ctrl+K' : undefined
    }))
  );
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

  const navGroups = showChrome ? getNavGroups() : [];
  const commandPaletteItems = showChrome ? buildCommandPaletteItems(navGroups, route.nav) : [];

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

  const commandPaletteItemsHtml = commandPaletteItems
    .map((item, index) => {
      const searchTerms = [item.label, item.group, item.path, ...(item.keywords ?? [])]
        .join(' ')
        .trim()
        .toLowerCase();
      const shortcutHtml = item.shortcut
        ? `<kbd class="command-palette-item-shortcut">${escapeHtml(item.shortcut)}</kbd>`
        : '';

      return `
        <div
          class="command-palette-item${item.active ? ' is-active' : ''}"
          role="option"
          id="command-palette-item-${index}"
          tabindex="-1"
          data-command-item
          data-command-index="${index}"
          data-command-href="${escapeHtml(item.path)}"
          data-command-search="${escapeHtml(searchTerms)}"
          aria-selected="${item.active ? 'true' : 'false'}"
        >
          <span class="command-palette-item-icon" aria-hidden="true">${item.icon}</span>
          <span class="command-palette-item-body">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.group)}</span>
          </span>
          ${shortcutHtml}
        </div>`;
    })
    .join('');

  const commandPaletteHtml = showChrome
    ? `
      <div class="command-palette" id="command-palette" data-command-palette hidden>
        <button class="command-palette-backdrop" type="button" data-command-palette-close aria-label="Fechar paleta de comandos"></button>
        <section class="command-palette-panel" role="dialog" aria-modal="true" aria-labelledby="command-palette-title" data-command-palette-panel>
          <header class="command-palette-header">
            <div>
              <p class="command-palette-kicker">Acesso rápido</p>
              <h2 id="command-palette-title">Paleta de comandos</h2>
            </div>
            <button class="command-palette-close-btn secondary small" type="button" data-command-palette-close aria-label="Fechar paleta">Esc</button>
          </header>
          <div class="command-palette-search">
            <span class="command-palette-search-icon" aria-hidden="true">⌘</span>
            <input
              type="search"
              id="command-palette-input"
              class="command-palette-input"
              placeholder="Digite um comando, módulo ou destino..."
              aria-label="Paleta de comandos"
              aria-controls="command-palette-results"
              autocomplete="off"
              spellcheck="false"
            />
            <kbd class="command-palette-search-hint">Ctrl K</kbd>
          </div>
          <div class="command-palette-results" id="command-palette-results" role="listbox" aria-label="Comandos disponíveis">
            ${commandPaletteItemsHtml}
          </div>
          <p class="command-palette-empty" data-command-palette-empty hidden>Nenhum comando encontrado.</p>
          <footer class="command-palette-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span><kbd>Enter</kbd> abrir</span>
            <span><kbd>Esc</kbd> fechar</span>
          </footer>
        </section>
      </div>`
    : '';

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
              <button
                class="topbar-command-btn secondary small"
                type="button"
                id="command-palette-trigger"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="command-palette"
                title="Abrir paleta de comandos (Ctrl+K)"
              >
                <span aria-hidden="true">⌘K</span>
                <span class="topbar-command-label">Comandos</span>
              </button>
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
  ${commandPaletteHtml}
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

    (function setupCommandPalette() {
      const palette = document.getElementById('command-palette');
      if (!palette) return;

      const trigger = document.getElementById('command-palette-trigger');
      const input = document.getElementById('command-palette-input');
      const emptyState = document.querySelector('[data-command-palette-empty]');
      const items = Array.from(palette.querySelectorAll('[data-command-item]'));

      let activeItem = items.find(function(item) {
        return item.getAttribute('aria-selected') === 'true';
      }) || null;
      let lastFocusedElement = null;

      function getVisibleItems() {
        return items.filter(function(item) {
          return !item.hasAttribute('hidden');
        });
      }

      function setActiveItem(nextItem) {
        items.forEach(function(item) {
          const isActive = item === nextItem;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-selected', String(isActive));
        });

        activeItem = nextItem;
        if (input && nextItem) {
          input.setAttribute('aria-activedescendant', nextItem.id);
        } else if (input) {
          input.removeAttribute('aria-activedescendant');
        }
      }

      function moveSelection(delta) {
        const visibleItems = getVisibleItems();
        if (!visibleItems.length) {
          setActiveItem(null);
          return;
        }

        const currentIndex = activeItem ? visibleItems.indexOf(activeItem) : -1;
        const startIndex = currentIndex >= 0 ? currentIndex : (delta > 0 ? -1 : 0);
        const boundedIndex = ((startIndex + delta) % visibleItems.length + visibleItems.length) % visibleItems.length;
        setActiveItem(visibleItems[boundedIndex]);
      }

      function filterItems() {
        const query = (input?.value || '').trim().toLowerCase();
        let firstVisible = null;

        items.forEach(function(item) {
          const search = item.getAttribute('data-command-search') || '';
          const match = !query || search.includes(query);
          item.toggleAttribute('hidden', !match);
          if (match && !firstVisible) {
            firstVisible = item;
          }
        });

        const visibleCount = getVisibleItems().length;
        if (emptyState) {
          emptyState.toggleAttribute('hidden', visibleCount > 0);
        }

        const nextActive = activeItem && !activeItem.hasAttribute('hidden') ? activeItem : firstVisible;
        setActiveItem(nextActive);
      }

      function openPalette() {
        lastFocusedElement = document.activeElement;
        palette.hidden = false;
        palette.setAttribute('data-open', 'true');
        document.body.classList.add('command-palette-open');
        trigger?.setAttribute('aria-expanded', 'true');
        filterItems();
        window.setTimeout(function() {
          if (input) {
            input.focus();
            if (!input.value) {
              input.select();
            }
          }
        }, 0);
      }

      function closePalette() {
        palette.hidden = true;
        palette.removeAttribute('data-open');
        document.body.classList.remove('command-palette-open');
        trigger?.setAttribute('aria-expanded', 'false');
        if (input) {
          input.value = '';
        }
        filterItems();
        const focusTarget = lastFocusedElement && typeof lastFocusedElement.focus === 'function' ? lastFocusedElement : trigger;
        focusTarget?.focus();
      }

      function activateSelectedItem() {
        const selectedItem = activeItem;
        if (!selectedItem) return;
        const href = selectedItem.getAttribute('data-command-href');
        if (href) {
          window.location.assign(href);
        }
      }

      trigger?.addEventListener('click', openPalette);

      palette.addEventListener('click', function(event) {
        const target = event.target;
        const item = target instanceof Element ? target.closest('[data-command-item]') : null;
        const closeTarget = target instanceof Element ? target.closest('[data-command-palette-close]') : null;

        if (closeTarget) {
          closePalette();
          return;
        }

        if (item) {
          const href = item.getAttribute('data-command-href');
          if (href) {
            window.location.assign(href);
          }
        }
      });

      input?.addEventListener('input', filterItems);
      input?.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveSelection(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveSelection(-1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          activateSelectedItem();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          closePalette();
        }
      });

      document.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          if (palette.hidden) {
            openPalette();
          } else {
            closePalette();
          }
          return;
        }

        if (event.key === 'Escape' && !palette.hidden) {
          event.preventDefault();
          closePalette();
        }
      });

      filterItems();
      palette.hidden = true;
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
