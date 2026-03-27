export function renderSurgeries(): string {
  return `
<div class="page-header">
  <div>
    <h1>Cirurgia</h1>
    <p class="subtitle">Solicitacao de caso cirurgico, equipe responsavel e transicoes do lifecycle operatorio.</p>
  </div>
  <button id="reload-surgeries" class="secondary">Atualizar</button>
</div>

<div id="surgeries-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo caso cirurgico</h2>
    <form id="surgeries-create-form">
      <div class="grid grid-2">
        <label>Encounter <input id="surgery-encounter-id" required placeholder="ID do encounter" /></label>
        <label>Paciente <input id="surgery-patient-id" required placeholder="ID do paciente" /></label>
      </div>
      <div class="grid grid-2">
        <label>Procedimento <input id="surgery-procedure-name" required placeholder="Nome do procedimento" /></label>
        <label>Cirurgiao responsavel <input id="surgery-surgeon-user-id" placeholder="ID do usuario" /></label>
      </div>
      <div class="grid grid-2">
        <label>Agendado para <input id="surgery-scheduled-at" type="datetime-local" /></label>
        <label>Equipe (separada por virgula) <input id="surgery-team" placeholder="Usuario 1, Usuario 2" /></label>
      </div>
      <label>Notas de preparo <textarea id="surgery-preparation-notes" placeholder="Preparacao pre-operatoria"></textarea></label>
      <div class="btn-row">
        <button type="submit">Solicitar cirurgia</button>
        <button type="button" class="secondary" id="surgery-create-clear">Limpar</button>
      </div>
    </form>
  </div>
  <div class="card">
    <h2>Atualizar status</h2>
    <form id="surgeries-status-form">
      <label>Caso cirurgico <input id="surgery-case-id" required placeholder="ID do caso" /></label>
      <div class="grid grid-2">
        <label>Status
          <select id="surgery-status" required>
            <option value="pre_op">Pre-op</option>
            <option value="in_progress">Em andamento</option>
            <option value="recovery">Recuperacao</option>
            <option value="completed">Concluida</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <label>Notas operatorias <textarea id="surgery-operative-notes" placeholder="Resumo operatorio ou observacao de status"></textarea></label>
      </div>
      <div class="btn-row">
        <button type="submit">Atualizar cirurgia</button>
        <button type="button" class="secondary" id="surgery-status-clear">Limpar</button>
      </div>
    </form>
  </div>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="surgeries-total">0</div><div class="label">Casos</div></div>
  <div class="kpi"><div class="value" id="surgeries-preop">0</div><div class="label">Pre-op</div></div>
  <div class="kpi"><div class="value" id="surgeries-progress">0</div><div class="label">Em andamento</div></div>
  <div class="kpi"><div class="value" id="surgeries-completed">0</div><div class="label">Concluidas</div></div>
</div>

<div class="search-bar">
  <input id="surgeries-search" placeholder="Buscar por encounter, paciente, procedimento ou status..." />
  <button id="surgeries-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Mapa cirurgico</h2>
  <div id="surgeries-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('surgeries-alert');
  var listEl = document.getElementById('surgeries-list');
  var createForm = document.getElementById('surgeries-create-form');
  var statusForm = document.getElementById('surgeries-status-form');
  var searchInput = document.getElementById('surgeries-search');
  var searchBtn = document.getElementById('surgeries-search-btn');
  var reloadBtn = document.getElementById('reload-surgeries');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'requested') return 'badge badge-warning';
    if (value === 'pre_op' || value === 'recovery') return 'badge badge-info';
    if (value === 'in_progress') return 'badge badge-danger';
    if (value === 'completed') return 'badge badge-success';
    if (value === 'cancelled') return 'badge badge-neutral';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('surgeries-total').textContent = String(items.length);
    document.getElementById('surgeries-preop').textContent = String(items.filter(function(item) { return item.status === 'pre_op'; }).length);
    document.getElementById('surgeries-progress').textContent = String(items.filter(function(item) { return item.status === 'in_progress'; }).length);
    document.getElementById('surgeries-completed').textContent = String(items.filter(function(item) { return item.status === 'completed'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum caso cirurgico encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Caso</th><th>Procedimento</th><th>Equipe</th><th>Status</th><th>Agenda</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var team = (item.surgicalTeam || []).length ? item.surgicalTeam.join(', ') : '—';
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.id || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Enc. ' + escapeHtml(item.encounterId || '—') + '</span></td>' +
        '<td><strong>' + escapeHtml(item.procedureName || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">Paciente ' + escapeHtml(item.patientId || '—') + '</span></td>' +
        '<td>' + escapeHtml(team) + '<br><span style="font-size:0.78rem;color:#64748b">Cirurgiao: ' + escapeHtml(item.surgeonUserId || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + formatDate(item.scheduledAt) + '</td>' +
        '<td><button class="small secondary" onclick="prefillSurgery(\'' + escapeHtml(item.id) + '\')">Usar</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadSurgeries(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/surgeries');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar cirurgias.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /surgeries', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.id, item.encounterId, item.patientId, item.procedureName, item.status, item.surgeonUserId].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        }) || (item.surgicalTeam || []).some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    items.sort(function(a, b) { return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); });
    renderList(items);
  }

  window.prefillSurgery = function(caseId) {
    document.getElementById('surgery-case-id').value = caseId;
  };

  createForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('surgery-encounter-id').value,
      patientId: document.getElementById('surgery-patient-id').value,
      procedureName: document.getElementById('surgery-procedure-name').value,
      surgeonUserId: document.getElementById('surgery-surgeon-user-id').value || undefined,
      surgicalTeam: document.getElementById('surgery-team').value.split(',').map(function(item) { return item.trim(); }).filter(Boolean),
      scheduledAt: document.getElementById('surgery-scheduled-at').value || undefined,
      preparationNotes: document.getElementById('surgery-preparation-notes').value || undefined
    };
    var res = await apiRequest('/surgeries', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao solicitar cirurgia', 'error');
      return;
    }
    showMsg('Caso cirurgico criado com sucesso.', 'success');
    createForm.reset();
    loadSurgeries(searchInput.value);
  });

  statusForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var caseId = document.getElementById('surgery-case-id').value;
    var payload = {
      status: document.getElementById('surgery-status').value,
      operativeNotes: document.getElementById('surgery-operative-notes').value || undefined
    };
    var res = await apiRequest('/surgeries/' + encodeURIComponent(caseId) + '/status', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar cirurgia', 'error');
      return;
    }
    showMsg('Status cirurgico atualizado com sucesso.', 'success');
    statusForm.reset();
    loadSurgeries(searchInput.value);
  });

  document.getElementById('surgery-create-clear').addEventListener('click', function() { createForm.reset(); });
  document.getElementById('surgery-status-clear').addEventListener('click', function() { statusForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadSurgeries(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadSurgeries(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadSurgeries(searchInput.value); }, 200);
  });

  loadSurgeries('');
})();
</script>`;
}
