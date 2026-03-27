export function renderInpatient(): string {
  return `
<div class="page-header">
  <div>
    <h1>Internacao</h1>
    <p class="subtitle">Admissao, evolucao assistencial e transicoes de status das permanencias.</p>
  </div>
  <button id="reload-inpatient" class="secondary">Atualizar</button>
</div>

<div id="inpatient-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Nova admissao</h2>
    <form id="inpatient-admission-form">
      <div class="grid grid-2">
        <label>Encounter <input id="inpatient-encounter-id" required placeholder="ID do encounter" /></label>
        <label>Paciente <input id="inpatient-patient-id" required placeholder="ID do paciente" /></label>
      </div>
      <div class="grid grid-3">
        <label>Unidade <input id="inpatient-unit" required placeholder="Ex.: Internacao 1" /></label>
        <label>Ala <input id="inpatient-ward" required placeholder="Ex.: Caninos" /></label>
        <label>Leito <input id="inpatient-bed" required placeholder="Ex.: B12" /></label>
      </div>
      <div class="btn-row">
        <button type="submit">Admitir paciente</button>
        <button type="button" class="secondary" id="inpatient-admission-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Evolucao / transicao</h2>
    <form id="inpatient-progress-form" style="margin-bottom:16px;">
      <label>Stay ID <input id="inpatient-progress-stay-id" required placeholder="ID da permanencia" /></label>
      <label>Nota de evolucao <textarea id="inpatient-progress-note" placeholder="Evolucao assistencial da internacao"></textarea></label>
      <div class="btn-row">
        <button type="submit">Registrar evolucao</button>
        <button type="button" class="secondary" id="inpatient-progress-clear">Limpar</button>
      </div>
    </form>
    <form id="inpatient-status-form">
      <div class="grid grid-2">
        <label>Stay ID <input id="inpatient-status-stay-id" required placeholder="ID da permanencia" /></label>
        <label>Status
          <select id="inpatient-status" required>
            <option value="stable">Estavel</option>
            <option value="transferred">Transferido</option>
            <option value="discharged">Alta</option>
          </select>
        </label>
      </div>
      <div class="grid grid-2">
        <label>Transferir para unidade <input id="inpatient-transfer-unit" placeholder="Obrigatorio se transferido" /></label>
        <label>Transferir para ala <input id="inpatient-transfer-ward" placeholder="Obrigatorio se transferido" /></label>
      </div>
      <label>Motivo da alta <input id="inpatient-discharge-reason" placeholder="Obrigatorio se alta" /></label>
      <div class="btn-row">
        <button type="submit">Atualizar status</button>
        <button type="button" class="secondary" id="inpatient-status-clear">Limpar</button>
      </div>
    </form>
  </div>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="inpatient-total">0</div><div class="label">Permanencias</div></div>
  <div class="kpi"><div class="value" id="inpatient-admitted">0</div><div class="label">Admitidos</div></div>
  <div class="kpi"><div class="value" id="inpatient-stable">0</div><div class="label">Estaveis</div></div>
  <div class="kpi"><div class="value" id="inpatient-discharged">0</div><div class="label">Altas</div></div>
</div>

<div class="search-bar">
  <input id="inpatient-search" placeholder="Buscar por encounter, paciente, unidade, ala, leito ou status..." />
  <button id="inpatient-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Internacoes</h2>
    <div id="inpatient-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Evolucoes da permanencia</h2>
    <div id="inpatient-progress-list" class="empty">Selecione uma permanencia para ver as evolucoes.</div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('inpatient-alert');
  var listEl = document.getElementById('inpatient-list');
  var progressListEl = document.getElementById('inpatient-progress-list');
  var admissionForm = document.getElementById('inpatient-admission-form');
  var progressForm = document.getElementById('inpatient-progress-form');
  var statusForm = document.getElementById('inpatient-status-form');
  var searchInput = document.getElementById('inpatient-search');
  var searchBtn = document.getElementById('inpatient-search-btn');
  var reloadBtn = document.getElementById('reload-inpatient');
  var latestItems = [];

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'admitted') return 'badge badge-warning';
    if (value === 'stable') return 'badge badge-success';
    if (value === 'transferred') return 'badge badge-info';
    if (value === 'discharged') return 'badge badge-neutral';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('inpatient-total').textContent = String(items.length);
    document.getElementById('inpatient-admitted').textContent = String(items.filter(function(item) { return item.status === 'admitted'; }).length);
    document.getElementById('inpatient-stable').textContent = String(items.filter(function(item) { return item.status === 'stable'; }).length);
    document.getElementById('inpatient-discharged').textContent = String(items.filter(function(item) { return item.status === 'discharged'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhuma internacao encontrada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Encounter</th><th>Paciente</th><th>Local</th><th>Status</th><th>Atualizado</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.encounterId || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Stay ' + escapeHtml(item.id || '—') + '</span></td>' +
        '<td><code>' + escapeHtml(item.patientId || '—') + '</code></td>' +
        '<td><strong>' + escapeHtml(item.unit || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.ward || '—') + ' / ' + escapeHtml(item.bed || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + formatDate(item.updatedAt) + '</td>' +
        '<td><button class="small secondary" onclick="loadStayProgress(\'' + escapeHtml(item.id) + '\')">Evolucoes</button> <button class="small secondary" onclick="prefillStay(\'' + escapeHtml(item.id) + '\')">Usar</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderProgress(items) {
    if (!items.length) {
      progressListEl.innerHTML = '<div class="empty">Nenhuma evolucao registrada para esta permanencia.</div>';
      return;
    }
    var html = '<div class="timeline">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<div class="timeline-item">' +
        '<div class="time">' + formatDate(item.createdAt) + '</div>' +
        '<div class="type">Autor ' + escapeHtml(item.authoredByUserId || '—') + '</div>' +
        '<div class="detail">' + escapeHtml(item.note || '—') + '</div>' +
        '</div>';
    }
    html += '</div>';
    progressListEl.innerHTML = html;
  }

  async function loadInpatient(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    progressListEl.innerHTML = '<div class="empty">Selecione uma permanencia para ver as evolucoes.</div>';
    var res = await apiRequest('/inpatient');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar internacoes.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /inpatient', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.encounterId, item.patientId, item.unit, item.ward, item.bed, item.status].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    latestItems = items;
    items.sort(function(a, b) { return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); });
    renderList(items);
  }

  window.loadStayProgress = async function(stayId) {
    var res = await apiRequest('/inpatient/' + encodeURIComponent(stayId) + '/progress');
    if (!res.ok) {
      progressListEl.innerHTML = '<div class="empty">Erro ao carregar evolucoes.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler evolucoes', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    items.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    renderProgress(items);
  };

  window.prefillStay = function(stayId) {
    document.getElementById('inpatient-progress-stay-id').value = stayId;
    document.getElementById('inpatient-status-stay-id').value = stayId;
  };

  admissionForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('inpatient-encounter-id').value,
      patientId: document.getElementById('inpatient-patient-id').value,
      unit: document.getElementById('inpatient-unit').value,
      ward: document.getElementById('inpatient-ward').value,
      bed: document.getElementById('inpatient-bed').value
    };
    var res = await apiRequest('/inpatient', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao admitir paciente', 'error');
      return;
    }
    showMsg('Internacao criada com sucesso.', 'success');
    admissionForm.reset();
    loadInpatient(searchInput.value);
  });

  progressForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      stayId: document.getElementById('inpatient-progress-stay-id').value,
      note: document.getElementById('inpatient-progress-note').value
    };
    var res = await apiRequest('/inpatient/progress', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar evolucao', 'error');
      return;
    }
    showMsg('Evolucao registrada com sucesso.', 'success');
    progressForm.reset();
    document.getElementById('inpatient-progress-stay-id').value = payload.stayId;
    window.loadStayProgress(payload.stayId);
    loadInpatient(searchInput.value);
  });

  statusForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      status: document.getElementById('inpatient-status').value,
      dischargeReason: document.getElementById('inpatient-discharge-reason').value || undefined,
      transferToUnit: document.getElementById('inpatient-transfer-unit').value || undefined,
      transferToWard: document.getElementById('inpatient-transfer-ward').value || undefined
    };
    var stayId = document.getElementById('inpatient-status-stay-id').value;
    var res = await apiRequest('/inpatient/' + encodeURIComponent(stayId) + '/status', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar status da internacao', 'error');
      return;
    }
    showMsg('Status da internacao atualizado com sucesso.', 'success');
    window.loadStayProgress(stayId);
    loadInpatient(searchInput.value);
  });

  document.getElementById('inpatient-admission-clear').addEventListener('click', function() { admissionForm.reset(); });
  document.getElementById('inpatient-progress-clear').addEventListener('click', function() { progressForm.reset(); });
  document.getElementById('inpatient-status-clear').addEventListener('click', function() { statusForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadInpatient(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadInpatient(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadInpatient(searchInput.value); }, 200);
  });

  loadInpatient('');
})();
</script>`;
}
