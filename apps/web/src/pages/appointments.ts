export function renderAppointments(): string {
  return `
<div class="page-header">
  <div>
    <h1>Agenda</h1>
    <p class="subtitle">Gestao de appointments e visao rapida da agenda operacional.</p>
  </div>
  <button id="reload-appointments" class="secondary">Atualizar</button>
</div>

<div id="appointments-alert"></div>

<div id="appointment-form-card" class="card" style="margin-bottom:20px;">
  <h2>Novo agendamento</h2>
  <form id="appointment-form">
    <div class="grid grid-2">
      <label>Paciente <input id="appointment-patient-id" required placeholder="ID do paciente" /></label>
      <label>Tutor <input id="appointment-owner-id" required placeholder="ID do tutor" /></label>
    </div>
    <div class="grid grid-2">
      <label>Data e hora <input id="appointment-scheduled-at" type="datetime-local" required /></label>
      <label>Tipo da visita
        <select id="appointment-visit-type" required>
          <option value="scheduled">Agendada</option>
          <option value="walk_in">Walk-in</option>
          <option value="return">Retorno</option>
        </select>
      </label>
    </div>
    <label>Motivo <input id="appointment-reason" required placeholder="Ex.: retorno clinico, vacina, exame" /></label>
    <div class="btn-row">
      <button type="submit">Agendar</button>
      <button type="button" class="secondary" id="appointment-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="appointments-total">0</div><div class="label">Appointments</div></div>
  <div class="kpi"><div class="value" id="appointments-scheduled">0</div><div class="label">Agendados</div></div>
  <div class="kpi"><div class="value" id="appointments-checkedin">0</div><div class="label">Check-in</div></div>
  <div class="kpi"><div class="value" id="appointments-completed">0</div><div class="label">Concluidos</div></div>
</div>

<div class="search-bar">
  <input id="appointments-search" placeholder="Buscar por paciente, tutor, motivo ou status..." />
  <button id="appointments-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Agenda publicada</h2>
  <div id="appointments-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('appointments-alert');
  var listEl = document.getElementById('appointments-list');
  var form = document.getElementById('appointment-form');
  var searchInput = document.getElementById('appointments-search');
  var searchBtn = document.getElementById('appointments-search-btn');
  var reloadBtn = document.getElementById('reload-appointments');
  var clearBtn = document.getElementById('appointment-clear');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'scheduled') return 'badge badge-info';
    if (value === 'checked_in') return 'badge badge-warning';
    if (value === 'completed') return 'badge badge-success';
    if (value === 'cancelled') return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('appointments-total').textContent = String(items.length);
    document.getElementById('appointments-scheduled').textContent = String(items.filter(function(item) { return item.status === 'scheduled'; }).length);
    document.getElementById('appointments-checkedin').textContent = String(items.filter(function(item) { return item.status === 'checked_in'; }).length);
    document.getElementById('appointments-completed').textContent = String(items.filter(function(item) { return item.status === 'completed'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum appointment encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Data</th><th>Paciente</th><th>Tutor</th><th>Tipo</th><th>Status</th><th>Motivo</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><strong>' + formatDate(item.scheduledAt) + '</strong><br><span style="font-size:0.78rem;color:#64748b">Criado ' + formatDate(item.createdAt) + '</span></td>' +
        '<td><code>' + escapeHtml(item.patientId || '—') + '</code></td>' +
        '<td><code>' + escapeHtml(item.ownerId || '—') + '</code></td>' +
        '<td>' + escapeHtml(item.visitType || '—') + '</td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.reason || '—') + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadAppointments(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/appointments');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar agenda.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /appointments', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.patientId, item.ownerId, item.reason, item.status, item.visitType].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    items.sort(function(a, b) { return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(); });
    renderList(items);
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      patientId: document.getElementById('appointment-patient-id').value,
      ownerId: document.getElementById('appointment-owner-id').value,
      scheduledAt: document.getElementById('appointment-scheduled-at').value,
      visitType: document.getElementById('appointment-visit-type').value,
      reason: document.getElementById('appointment-reason').value
    };

    var res = await apiRequest('/appointments', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar appointment', 'error');
      return;
    }

    showMsg('Appointment criado com sucesso.', 'success');
    form.reset();
    loadAppointments(searchInput.value);
  });

  clearBtn.addEventListener('click', function() { form.reset(); });
  reloadBtn.addEventListener('click', function() { loadAppointments(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadAppointments(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadAppointments(searchInput.value); }, 200);
  });

  loadAppointments('');
})();
</script>`;
}
