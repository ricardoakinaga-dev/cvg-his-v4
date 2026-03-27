export function renderNotifications(): string {
  return `
<div class="page-header">
  <div>
    <h1>Notificacoes</h1>
    <p class="subtitle">Fila operacional, jobs e processamento manual do canal interno.</p>
  </div>
  <button id="reload-notifications" class="secondary">Atualizar</button>
</div>

<div id="notifications-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Nova notificacao</h2>
    <form id="notifications-form">
      <div class="grid grid-2">
        <label>Categoria
          <select id="notification-category" required>
            <option value="operations">Operacoes</option>
            <option value="billing">Billing</option>
            <option value="inventory">Estoque</option>
            <option value="system">Sistema</option>
          </select>
        </label>
        <label>Severidade
          <select id="notification-severity" required>
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
            <option value="high">Alta</option>
          </select>
        </label>
      </div>
      <div class="grid grid-2">
        <label>Encounter (opcional) <input id="notification-encounter-id" placeholder="ID do encounter" /></label>
        <label>Paciente (opcional) <input id="notification-patient-id" placeholder="ID do paciente" /></label>
      </div>
      <label>Role destinataria (opcional) <input id="notification-role-code" placeholder="finance, inventory, operations..." /></label>
      <label>Titulo <input id="notification-title" required placeholder="Titulo da notificacao" /></label>
      <label>Mensagem <textarea id="notification-message" required placeholder="Mensagem operacional da notificacao"></textarea></label>
      <div class="btn-row">
        <button type="submit">Enfileirar notificacao</button>
        <button type="button" class="secondary" id="notification-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Processar fila</h2>
    <form id="notifications-process-form">
      <label>Limite de jobs <input id="notification-process-limit" type="number" min="1" step="1" value="10" /></label>
      <div class="btn-row">
        <button type="submit">Processar pendentes</button>
      </div>
    </form>
    <div id="notifications-process-output" class="empty" style="margin-top:16px;">Nenhum processamento executado nesta sessao.</div>
  </div>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="notifications-total">0</div><div class="label">Notificacoes</div></div>
  <div class="kpi"><div class="value" id="notifications-queued">0</div><div class="label">Queued</div></div>
  <div class="kpi"><div class="value" id="notifications-sent">0</div><div class="label">Sent</div></div>
  <div class="kpi"><div class="value" id="notification-jobs-total">0</div><div class="label">Jobs</div></div>
</div>

<div class="search-bar">
  <input id="notifications-search" placeholder="Buscar por categoria, status, titulo, role ou encounter..." />
  <button id="notifications-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Notificacoes publicadas</h2>
    <div id="notifications-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Jobs de entrega</h2>
    <div id="notification-jobs-list"><div class="loading">Carregando</div></div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('notifications-alert');
  var listEl = document.getElementById('notifications-list');
  var jobsEl = document.getElementById('notification-jobs-list');
  var outputEl = document.getElementById('notifications-process-output');
  var createForm = document.getElementById('notifications-form');
  var processForm = document.getElementById('notifications-process-form');
  var searchInput = document.getElementById('notifications-search');
  var searchBtn = document.getElementById('notifications-search-btn');
  var reloadBtn = document.getElementById('reload-notifications');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'queued') return 'badge badge-warning';
    if (value === 'sent' || value === 'processed') return 'badge badge-success';
    if (value === 'failed') return 'badge badge-danger';
    if (value === 'read') return 'badge badge-info';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(notifications, jobs) {
    document.getElementById('notifications-total').textContent = String(notifications.length);
    document.getElementById('notifications-queued').textContent = String(notifications.filter(function(item) { return item.status === 'queued'; }).length);
    document.getElementById('notifications-sent').textContent = String(notifications.filter(function(item) { return item.status === 'sent'; }).length);
    document.getElementById('notification-jobs-total').textContent = String(jobs.length);
  }

  function renderNotifications(items) {
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhuma notificacao encontrada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Titulo</th><th>Categoria</th><th>Status</th><th>Destino</th><th>Criado</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(item.title || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.message || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.category || '—') + '<br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.severity || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.recipientRoleCode || 'sem role') + '<br><span style="font-size:0.78rem;color:#64748b">Enc. ' + escapeHtml(item.encounterId || '—') + '</span></td>' +
        '<td>' + formatDate(item.createdAt) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderJobs(items) {
    if (!items.length) {
      jobsEl.innerHTML = '<div class="empty">Nenhum job encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Job</th><th>Notification</th><th>Status</th><th>Attempts</th><th>Agendado</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.id || '—') + '</code></td>' +
        '<td><code>' + escapeHtml(item.notificationId || '—') + '</code></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + escapeHtml(String(item.attempts || 0)) + '</td>' +
        '<td>' + formatDate(item.scheduledAt) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    jobsEl.innerHTML = html;
  }

  async function loadNotifications(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    jobsEl.innerHTML = '<div class="loading">Carregando</div>';
    var notificationsRes = await apiRequest('/notifications');
    var jobsRes = await apiRequest('/notifications/jobs');
    if (!notificationsRes.ok || !jobsRes.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar notificacoes.</div>';
      jobsEl.innerHTML = '<div class="empty">Erro ao carregar jobs.</div>';
      showMsg('Falha ao ler notificacoes ou jobs.', 'error');
      return;
    }
    var notifications = Array.isArray(notificationsRes.body) ? notificationsRes.body : (notificationsRes.body && notificationsRes.body.items) || [];
    var jobs = Array.isArray(jobsRes.body) ? jobsRes.body : (jobsRes.body && jobsRes.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      notifications = notifications.filter(function(item) {
        return [item.category, item.status, item.title, item.recipientRoleCode, item.encounterId, item.patientId].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
      jobs = jobs.filter(function(item) {
        return [item.id, item.notificationId, item.status].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    notifications.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    jobs.sort(function(a, b) { return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(); });
    updateStats(notifications, jobs);
    renderNotifications(notifications);
    renderJobs(jobs);
  }

  createForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      category: document.getElementById('notification-category').value,
      severity: document.getElementById('notification-severity').value,
      encounterId: document.getElementById('notification-encounter-id').value || undefined,
      patientId: document.getElementById('notification-patient-id').value || undefined,
      recipientRoleCode: document.getElementById('notification-role-code').value || undefined,
      title: document.getElementById('notification-title').value,
      message: document.getElementById('notification-message').value
    };
    var res = await apiRequest('/notifications', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar notificacao', 'error');
      return;
    }
    showMsg('Notificacao enfileirada com sucesso.', 'success');
    createForm.reset();
    loadNotifications(searchInput.value);
  });

  processForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      limit: Number(document.getElementById('notification-process-limit').value || 10)
    };
    var res = await apiRequest('/notifications/process', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao processar notificacoes', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    outputEl.innerHTML = '<div class="alert alert-success">Processamento concluido com ' + escapeHtml(String(items.length)) + ' job(s).</div>';
    loadNotifications(searchInput.value);
  });

  document.getElementById('notification-clear').addEventListener('click', function() { createForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadNotifications(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadNotifications(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadNotifications(searchInput.value); }, 200);
  });

  loadNotifications('');
})();
</script>`;
}
