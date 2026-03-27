export function renderAudit(): string {
  return `
<div class="page-header">
  <div>
    <h1>Auditoria</h1>
    <p class="subtitle">Trilha de eventos com foco em risco, modulo, acao e correlacao operacional.</p>
  </div>
  <button id="reload-audit" class="secondary">Atualizar</button>
</div>

<div id="audit-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="audit-total">0</div><div class="label">Eventos</div></div>
  <div class="kpi"><div class="value" id="audit-high">0</div><div class="label">High risk</div></div>
  <div class="kpi"><div class="value" id="audit-modules">0</div><div class="label">Modulos</div></div>
  <div class="kpi"><div class="value" id="audit-actors">0</div><div class="label">Atores</div></div>
</div>

<div class="search-bar">
  <input id="audit-search" placeholder="Buscar por modulo, acao, ator, entidade, correlacao ou resumo..." />
  <button id="audit-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Eventos auditados</h2>
  <div id="audit-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('audit-alert');
  var listEl = document.getElementById('audit-list');
  var searchInput = document.getElementById('audit-search');
  var searchBtn = document.getElementById('audit-search-btn');
  var reloadBtn = document.getElementById('reload-audit');

  function badgeClass(riskLevel) {
    var value = String(riskLevel || '').toLowerCase();
    if (value === 'high') return 'badge badge-danger';
    if (value === 'medium') return 'badge badge-warning';
    return 'badge badge-info';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('audit-total').textContent = String(items.length);
    document.getElementById('audit-high').textContent = String(items.filter(function(item) { return item.riskLevel === 'high'; }).length);
    var modules = {};
    var actors = {};
    for (var i = 0; i < items.length; i++) {
      if (items[i].module) modules[items[i].module] = true;
      if (items[i].actorId) actors[items[i].actorId] = true;
    }
    document.getElementById('audit-modules').textContent = String(Object.keys(modules).length);
    document.getElementById('audit-actors').textContent = String(Object.keys(actors).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum evento de auditoria encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Quando</th><th>Modulo</th><th>Acao</th><th>Entidade</th><th>Risco</th><th>Correlacao</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><strong>' + formatDate(item.occurredAt) + '</strong><br><span style="font-size:0.78rem;color:#64748b">Ator ' + escapeHtml(item.actorId || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.module || '—') + '</td>' +
        '<td>' + escapeHtml(item.action || '—') + '</td>' +
        '<td><code>' + escapeHtml(item.entityType || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.entityId || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.riskLevel) + '">' + escapeHtml(item.riskLevel || '—') + '</span><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.payloadSummary || '—') + '</span></td>' +
        '<td><code>' + escapeHtml(item.correlationId || '—') + '</code></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadAudit(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/audit/events');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar auditoria.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /audit/events', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.module, item.action, item.actorId, item.entityType, item.entityId, item.correlationId, item.payloadSummary, item.riskLevel].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    items.sort(function(a, b) { return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(); });
    renderList(items);
  }

  reloadBtn.addEventListener('click', function() { loadAudit(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadAudit(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadAudit(searchInput.value); }, 200);
  });

  loadAudit('');
})();
</script>`;
}
