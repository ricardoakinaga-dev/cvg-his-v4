export function renderTriage(): string {
  return `
<div class="page-header">
  <div>
    <h1>Triagem</h1>
    <p class="subtitle">Registro inicial do caso e decisao de destino clinico com base no encounter oficial.</p>
  </div>
  <button id="reload-triage" class="secondary">Atualizar</button>
</div>

<div id="triage-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Nova triagem</h2>
  <form id="triage-form">
    <div class="grid grid-2">
      <label>Encounter <input id="triage-encounter-id" required placeholder="ID do encounter" /></label>
      <label>Paciente <input id="triage-patient-id" required placeholder="ID do paciente" /></label>
    </div>
    <div class="grid grid-2">
      <label>Prioridade
        <select id="triage-priority" required>
          <option value="medium">Media</option>
          <option value="low">Baixa</option>
          <option value="high">Alta</option>
          <option value="critical">Critica</option>
        </select>
      </label>
      <label>Destino
        <select id="triage-destination" required>
          <option value="in_care">Em atendimento</option>
          <option value="observation">Observacao</option>
        </select>
      </label>
    </div>
    <label>Queixa principal <input id="triage-chief-complaint" required placeholder="Resumo inicial da queixa principal" /></label>
    <label>Notas iniciais <textarea id="triage-initial-notes" placeholder="Notas clinicas iniciais da triagem"></textarea></label>
    <label>Alertas (separados por virgula) <input id="triage-alerts-input" placeholder="Ex.: dor intensa, jejum, alergia" /></label>
    <div class="btn-row">
      <button type="submit">Registrar triagem</button>
      <button type="button" class="secondary" id="triage-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="triage-total">0</div><div class="label">Triagens</div></div>
  <div class="kpi"><div class="value" id="triage-critical">0</div><div class="label">Criticas</div></div>
  <div class="kpi"><div class="value" id="triage-observation">0</div><div class="label">Observacao</div></div>
  <div class="kpi"><div class="value" id="triage-care">0</div><div class="label">Em atendimento</div></div>
</div>

<div class="search-bar">
  <input id="triage-search" placeholder="Buscar por encounter, paciente, prioridade ou queixa..." />
  <button id="triage-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Triagens registradas</h2>
  <div id="triage-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('triage-alert');
  var listEl = document.getElementById('triage-list');
  var form = document.getElementById('triage-form');
  var searchInput = document.getElementById('triage-search');
  var searchBtn = document.getElementById('triage-search-btn');
  var reloadBtn = document.getElementById('reload-triage');
  var clearBtn = document.getElementById('triage-clear');

  function badgeClass(priority) {
    var value = String(priority || '').toLowerCase();
    if (value === 'critical') return 'badge badge-danger';
    if (value === 'high') return 'badge badge-warning';
    if (value === 'medium') return 'badge badge-info';
    return 'badge badge-neutral';
  }

  function destinationLabel(destination) {
    return destination === 'observation' ? 'Observacao' : 'Em atendimento';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('triage-total').textContent = String(items.length);
    document.getElementById('triage-critical').textContent = String(items.filter(function(item) { return item.priority === 'critical'; }).length);
    document.getElementById('triage-observation').textContent = String(items.filter(function(item) { return item.destination === 'observation'; }).length);
    document.getElementById('triage-care').textContent = String(items.filter(function(item) { return item.destination === 'in_care'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhuma triagem encontrada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Encounter</th><th>Paciente</th><th>Queixa</th><th>Prioridade</th><th>Destino</th><th>Alertas</th><th>Registrado em</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var alerts = (item.alerts || []).length ? item.alerts.map(escapeHtml).join(', ') : '—';
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.encounterId || '—') + '</code></td>' +
        '<td><code>' + escapeHtml(item.patientId || '—') + '</code></td>' +
        '<td><strong>' + escapeHtml(item.chiefComplaint || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">Triado por ' + escapeHtml(item.triagedByUserId || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.priority) + '">' + escapeHtml(item.priority || '—') + '</span></td>' +
        '<td>' + escapeHtml(destinationLabel(item.destination)) + '</td>' +
        '<td>' + alerts + '</td>' +
        '<td>' + formatDate(item.createdAt) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadTriage(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/triage');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar triagens.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /triage', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.encounterId, item.patientId, item.priority, item.chiefComplaint, item.destination].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        }) || (item.alerts || []).some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    items.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    renderList(items);
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var alerts = document.getElementById('triage-alerts-input').value
      .split(',')
      .map(function(item) { return item.trim(); })
      .filter(Boolean);

    var payload = {
      encounterId: document.getElementById('triage-encounter-id').value,
      patientId: document.getElementById('triage-patient-id').value,
      priority: document.getElementById('triage-priority').value,
      chiefComplaint: document.getElementById('triage-chief-complaint').value,
      initialNotes: document.getElementById('triage-initial-notes').value || undefined,
      alerts: alerts,
      destination: document.getElementById('triage-destination').value
    };

    var res = await apiRequest('/triage', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar triagem', 'error');
      return;
    }

    showMsg('Triagem registrada com sucesso.', 'success');
    form.reset();
    document.getElementById('triage-priority').value = 'medium';
    document.getElementById('triage-destination').value = 'in_care';
    loadTriage(searchInput.value);
  });

  clearBtn.addEventListener('click', function() {
    form.reset();
    document.getElementById('triage-priority').value = 'medium';
    document.getElementById('triage-destination').value = 'in_care';
  });
  reloadBtn.addEventListener('click', function() { loadTriage(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadTriage(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadTriage(searchInput.value); }, 200);
  });

  loadTriage('');
})();
</script>`;
}
