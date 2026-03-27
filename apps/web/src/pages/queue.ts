export function renderQueue(): string {
  return `
<div class="page-header">
  <div>
    <h1>Recepcao e fila</h1>
    <p class="subtitle">Check-in operacional, chamada de fila e abertura de atendimento a partir da recepcao.</p>
  </div>
  <button id="reload-queue" class="secondary">Atualizar</button>
</div>

<div id="queue-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo check-in</h2>
    <form id="queue-checkin-form">
      <div class="grid grid-2">
        <label>Paciente <input id="queue-patient-id" required placeholder="ID do paciente" /></label>
        <label>Tutor <input id="queue-owner-id" required placeholder="ID do tutor" /></label>
      </div>
      <div class="grid grid-2">
        <label>Appointment (opcional) <input id="queue-appointment-id" placeholder="ID do appointment" /></label>
        <label>Prioridade
          <select id="queue-priority">
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
        </label>
      </div>
      <label>Motivo <input id="queue-reason" required placeholder="Ex.: retorno, urgencia, triagem inicial" /></label>
      <div class="btn-row">
        <button type="submit">Realizar check-in</button>
        <button type="button" class="secondary" id="queue-checkin-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Abrir atendimento manual</h2>
    <form id="queue-encounter-form">
      <div class="grid grid-2">
        <label>Paciente <input id="queue-encounter-patient-id" required placeholder="ID do paciente" /></label>
        <label>Tutor <input id="queue-encounter-owner-id" required placeholder="ID do tutor" /></label>
      </div>
      <div class="grid grid-2">
        <label>Fila (opcional) <input id="queue-entry-id" placeholder="ID da fila" /></label>
        <label>Appointment (opcional) <input id="queue-encounter-appointment-id" placeholder="ID do appointment" /></label>
      </div>
      <div class="grid grid-2">
        <label>Tipo da visita
          <select id="queue-encounter-visit-type">
            <option value="walk_in">Walk-in</option>
            <option value="scheduled">Agendada</option>
            <option value="return">Retorno</option>
          </select>
        </label>
        <label>Origem
          <select id="queue-encounter-origin">
            <option value="reception">Recepcao</option>
            <option value="schedule">Agenda</option>
            <option value="return">Retorno</option>
          </select>
        </label>
      </div>
      <label>Motivo <input id="queue-encounter-reason" required placeholder="Motivo do atendimento" /></label>
      <div class="btn-row">
        <button type="submit">Abrir atendimento</button>
        <button type="button" class="secondary" id="queue-encounter-clear">Limpar</button>
      </div>
    </form>
  </div>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="queue-total">0</div><div class="label">Na fila</div></div>
  <div class="kpi"><div class="value" id="queue-waiting">0</div><div class="label">Aguardando</div></div>
  <div class="kpi"><div class="value" id="queue-called">0</div><div class="label">Chamados</div></div>
  <div class="kpi"><div class="value" id="queue-care">0</div><div class="label">Em triagem/cuidado</div></div>
</div>

<div class="search-bar">
  <input id="queue-search" placeholder="Buscar por paciente, tutor, motivo, status ou prioridade..." />
  <button id="queue-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Fila operacional</h2>
  <div id="queue-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('queue-alert');
  var listEl = document.getElementById('queue-list');
  var searchInput = document.getElementById('queue-search');
  var searchBtn = document.getElementById('queue-search-btn');
  var reloadBtn = document.getElementById('reload-queue');
  var checkinForm = document.getElementById('queue-checkin-form');
  var encounterForm = document.getElementById('queue-encounter-form');
  var latestQueue = [];

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'waiting') return 'badge badge-warning';
    if (value === 'called') return 'badge badge-info';
    if (value === 'in_triage' || value === 'in_care') return 'badge badge-success';
    if (value === 'completed') return 'badge badge-neutral';
    if (value === 'cancelled') return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  function priorityClass(priority) {
    var value = String(priority || '').toLowerCase();
    if (value === 'critical') return 'badge badge-danger';
    if (value === 'high') return 'badge badge-warning';
    if (value === 'medium') return 'badge badge-info';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('queue-total').textContent = String(items.length);
    document.getElementById('queue-waiting').textContent = String(items.filter(function(item) { return item.status === 'waiting'; }).length);
    document.getElementById('queue-called').textContent = String(items.filter(function(item) { return item.status === 'called'; }).length);
    document.getElementById('queue-care').textContent = String(items.filter(function(item) { return item.status === 'in_triage' || item.status === 'in_care'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhuma entrada de fila encontrada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Paciente</th><th>Tutor</th><th>Motivo</th><th>Prioridade</th><th>Status</th><th>Check-in</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var entry = items[i];
      var actions = '';
      if (entry.status === 'waiting') {
        actions += '<button class="small secondary" onclick="callQueueEntry(\'' + escapeHtml(entry.id) + '\')">Chamar</button> ';
      }
      actions += '<button class="small secondary" onclick="prefillEncounter(\'' + escapeHtml(entry.id) + '\')">Abrir atendimento</button>';
      html += '<tr>' +
        '<td><code>' + escapeHtml(entry.patientId || '—') + '</code></td>' +
        '<td><code>' + escapeHtml(entry.ownerId || '—') + '</code></td>' +
        '<td>' + escapeHtml(entry.reason || '—') + '</td>' +
        '<td><span class="' + priorityClass(entry.priority) + '">' + escapeHtml(entry.priority || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(entry.status) + '">' + escapeHtml(entry.status || '—') + '</span></td>' +
        '<td>' + formatDate(entry.checkedInAt) + '</td>' +
        '<td>' + actions + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadQueue(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/queue');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar fila.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /queue', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.patientId, item.ownerId, item.reason, item.status, item.priority].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    latestQueue = items;
    items.sort(function(a, b) { return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime(); });
    renderList(items);
  }

  window.callQueueEntry = async function(id) {
    var res = await apiRequest('/queue/' + encodeURIComponent(id) + '/call', { method: 'POST' });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao chamar da fila', 'error');
      return;
    }
    showMsg('Paciente chamado com sucesso.', 'success');
    loadQueue(searchInput.value);
  };

  window.prefillEncounter = function(id) {
    var entry = latestQueue.find(function(item) { return String(item.id) === String(id); });
    if (!entry) return;
    document.getElementById('queue-entry-id').value = entry.id || '';
    document.getElementById('queue-encounter-patient-id').value = entry.patientId || '';
    document.getElementById('queue-encounter-owner-id').value = entry.ownerId || '';
    document.getElementById('queue-encounter-appointment-id').value = entry.appointmentId || '';
    document.getElementById('queue-encounter-origin').value = entry.appointmentId ? 'schedule' : 'reception';
    document.getElementById('queue-encounter-visit-type').value = entry.appointmentId ? 'scheduled' : 'walk_in';
    document.getElementById('queue-encounter-reason').value = entry.reason || '';
    encounterForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  checkinForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      patientId: document.getElementById('queue-patient-id').value,
      ownerId: document.getElementById('queue-owner-id').value,
      appointmentId: document.getElementById('queue-appointment-id').value || undefined,
      priority: document.getElementById('queue-priority').value || undefined,
      reason: document.getElementById('queue-reason').value
    };
    var res = await apiRequest('/queue/check-in', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao realizar check-in', 'error');
      return;
    }
    showMsg('Check-in realizado com sucesso.', 'success');
    checkinForm.reset();
    loadQueue(searchInput.value);
  });

  encounterForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      patientId: document.getElementById('queue-encounter-patient-id').value,
      ownerId: document.getElementById('queue-encounter-owner-id').value,
      appointmentId: document.getElementById('queue-encounter-appointment-id').value || undefined,
      queueEntryId: document.getElementById('queue-entry-id').value || undefined,
      visitType: document.getElementById('queue-encounter-visit-type').value,
      origin: document.getElementById('queue-encounter-origin').value,
      reason: document.getElementById('queue-encounter-reason').value
    };
    var res = await apiRequest('/encounters', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao abrir atendimento', 'error');
      return;
    }
    showMsg('Atendimento aberto com sucesso.', 'success');
    encounterForm.reset();
    loadQueue(searchInput.value);
  });

  document.getElementById('queue-checkin-clear').addEventListener('click', function() { checkinForm.reset(); });
  document.getElementById('queue-encounter-clear').addEventListener('click', function() { encounterForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadQueue(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadQueue(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadQueue(searchInput.value); }, 200);
  });

  loadQueue('');
})();
</script>`;
}
