export function renderDiagnostics(): string {
  return `
<div class="page-header">
  <div>
    <h1>Diagnosticos</h1>
    <p class="subtitle">Pedidos laboratoriais, coleta e registro de resultado no fluxo oficial.</p>
  </div>
  <button id="reload-diagnostics" class="secondary">Atualizar</button>
</div>

<div id="diagnostics-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo pedido</h2>
    <form id="diagnostics-order-form">
      <div class="grid grid-2">
        <label>Encounter <input id="diagnostics-encounter-id" required placeholder="ID do encounter" /></label>
        <label>Paciente <input id="diagnostics-patient-id" required placeholder="ID do paciente" /></label>
      </div>
      <div class="grid grid-2">
        <label>Tipo de exame <input id="diagnostics-exam-type" required placeholder="Ex.: hemograma, bioquimico" /></label>
        <label>Catalogo (opcional) <input id="diagnostics-exam-catalog-id" placeholder="ID do catalogo" /></label>
      </div>
      <label>Motivo clinico <input id="diagnostics-reason" required placeholder="Motivo do pedido diagnostico" /></label>
      <div class="btn-row">
        <button type="submit">Criar pedido</button>
        <button type="button" class="secondary" id="diagnostics-order-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Coleta / resultado</h2>
    <form id="diagnostics-result-form">
      <label>Pedido <input id="diagnostics-order-id" required placeholder="ID do pedido diagnostico" /></label>
      <div class="grid grid-2">
        <label>Status
          <select id="diagnostics-result-status" required>
            <option value="collected">Coletado</option>
            <option value="resulted">Resultado liberado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>
        <label>Coletado por (opcional) <input id="diagnostics-collected-by-user-id" placeholder="ID do usuario" /></label>
      </div>
      <label>Resumo do resultado <textarea id="diagnostics-result-summary" placeholder="Resumo clinico do resultado"></textarea></label>
      <label>Anexo do resultado (opcional) <input id="diagnostics-result-attachment-id" placeholder="ID do attachment" /></label>
      <div class="btn-row">
        <button type="submit">Registrar evento</button>
        <button type="button" class="secondary" id="diagnostics-result-clear">Limpar</button>
      </div>
    </form>
  </div>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="diagnostics-total">0</div><div class="label">Pedidos</div></div>
  <div class="kpi"><div class="value" id="diagnostics-requested">0</div><div class="label">Solicitados</div></div>
  <div class="kpi"><div class="value" id="diagnostics-collected">0</div><div class="label">Coletados</div></div>
  <div class="kpi"><div class="value" id="diagnostics-resulted">0</div><div class="label">Resultados</div></div>
</div>

<div class="search-bar">
  <input id="diagnostics-search" placeholder="Buscar por encounter, paciente, exame, status ou motivo..." />
  <button id="diagnostics-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <h2>Pedidos diagnosticos</h2>
  <div id="diagnostics-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('diagnostics-alert');
  var listEl = document.getElementById('diagnostics-list');
  var orderForm = document.getElementById('diagnostics-order-form');
  var resultForm = document.getElementById('diagnostics-result-form');
  var searchInput = document.getElementById('diagnostics-search');
  var searchBtn = document.getElementById('diagnostics-search-btn');
  var reloadBtn = document.getElementById('reload-diagnostics');
  var latestItems = [];

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'requested') return 'badge badge-warning';
    if (value === 'collected') return 'badge badge-info';
    if (value === 'resulted') return 'badge badge-success';
    if (value === 'cancelled') return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('diagnostics-total').textContent = String(items.length);
    document.getElementById('diagnostics-requested').textContent = String(items.filter(function(item) { return item.status === 'requested'; }).length);
    document.getElementById('diagnostics-collected').textContent = String(items.filter(function(item) { return item.status === 'collected'; }).length);
    document.getElementById('diagnostics-resulted').textContent = String(items.filter(function(item) { return item.status === 'resulted'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum pedido diagnostico encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Pedido</th><th>Exame</th><th>Status</th><th>Motivo</th><th>Resultado</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.id || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Enc. ' + escapeHtml(item.encounterId || '—') + '</span></td>' +
        '<td><strong>' + escapeHtml(item.examType || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">Paciente ' + escapeHtml(item.patientId || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.reason || '—') + '</td>' +
        '<td>' + escapeHtml(item.resultSummary || '—') + '</td>' +
        '<td><button class="small secondary" onclick="prefillDiagnostic(\'' + escapeHtml(item.id) + '\')">Usar</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadDiagnostics(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/diagnostics/orders');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar pedidos diagnosticos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /diagnostics/orders', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.id, item.encounterId, item.patientId, item.examType, item.examCatalogId, item.reason, item.status, item.resultSummary].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    latestItems = items;
    items.sort(function(a, b) { return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); });
    renderList(items);
  }

  window.prefillDiagnostic = function(orderId) {
    document.getElementById('diagnostics-order-id').value = orderId;
  };

  orderForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('diagnostics-encounter-id').value,
      patientId: document.getElementById('diagnostics-patient-id').value,
      examType: document.getElementById('diagnostics-exam-type').value,
      examCatalogId: document.getElementById('diagnostics-exam-catalog-id').value || undefined,
      reason: document.getElementById('diagnostics-reason').value
    };
    var res = await apiRequest('/diagnostics/orders', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar pedido diagnostico', 'error');
      return;
    }
    showMsg('Pedido diagnostico criado com sucesso.', 'success');
    orderForm.reset();
    loadDiagnostics(searchInput.value);
  });

  resultForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var orderId = document.getElementById('diagnostics-order-id').value;
    var payload = {
      status: document.getElementById('diagnostics-result-status').value,
      resultSummary: document.getElementById('diagnostics-result-summary').value || undefined,
      resultAttachmentId: document.getElementById('diagnostics-result-attachment-id').value || undefined,
      collectedByUserId: document.getElementById('diagnostics-collected-by-user-id').value || undefined
    };
    var res = await apiRequest('/diagnostics/orders/' + encodeURIComponent(orderId) + '/result', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar evento diagnostico', 'error');
      return;
    }
    showMsg('Evento diagnostico registrado com sucesso.', 'success');
    resultForm.reset();
    loadDiagnostics(searchInput.value);
  });

  document.getElementById('diagnostics-order-clear').addEventListener('click', function() { orderForm.reset(); });
  document.getElementById('diagnostics-result-clear').addEventListener('click', function() { resultForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadDiagnostics(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadDiagnostics(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadDiagnostics(searchInput.value); }, 200);
  });

  loadDiagnostics('');
})();
</script>`;
}
