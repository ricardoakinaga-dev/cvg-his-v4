export function renderBilling(): string {
  return `
<div class="page-header">
  <div>
    <h1>Billing</h1>
    <p class="subtitle">Estimativas, itens faturaveis e evolucao do billing por encounter.</p>
  </div>
  <button id="reload-billing" class="secondary">Atualizar</button>
</div>

<div id="billing-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo estimate</h2>
    <form id="billing-estimate-form">
      <label>Encounter <input id="billing-estimate-encounter-id" required placeholder="ID do encounter" /></label>
      <label>Notas administrativas <textarea id="billing-estimate-notes" placeholder="Observacoes administrativas opcionais"></textarea></label>
      <div class="btn-row">
        <button type="submit">Criar estimate</button>
        <button type="button" class="secondary" id="billing-estimate-clear">Limpar</button>
      </div>
    </form>
  </div>
  <div class="card">
    <h2>Novo item</h2>
    <form id="billing-item-form">
      <label>Encounter <input id="billing-item-encounter-id" required placeholder="ID do encounter" /></label>
      <div class="grid grid-2">
        <label>Tipo
          <select id="billing-item-type" required>
            <option value="service">Servico</option>
            <option value="supply">Insumo</option>
            <option value="procedure">Procedimento</option>
            <option value="exam">Exame</option>
            <option value="daily_rate">Diaria</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label>Quantidade <input id="billing-item-quantity" type="number" min="1" step="1" required value="1" /></label>
      </div>
      <div class="grid grid-2">
        <label>Descricao <input id="billing-item-description" required placeholder="Descricao do item" /></label>
        <label>Preco unitario <input id="billing-item-unit-price" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
      </div>
      <div class="grid grid-2">
        <label>Origem (opcional)
          <select id="billing-item-source-type">
            <option value="">Sem origem</option>
            <option value="encounter">Encounter</option>
            <option value="diagnostic_order">Diagnostico</option>
            <option value="surgery_case">Cirurgia</option>
            <option value="inpatient_stay">Internacao</option>
            <option value="prescription">Prescricao</option>
          </select>
        </label>
        <label>ID da origem <input id="billing-item-source-id" placeholder="ID da entidade de origem" /></label>
      </div>
      <div class="btn-row">
        <button type="submit">Adicionar item</button>
        <button type="button" class="secondary" id="billing-item-clear">Limpar</button>
      </div>
    </form>
  </div>
</div>

<div class="card" style="margin-bottom:20px;">
  <h2>Atualizar status</h2>
  <form id="billing-status-form">
    <div class="grid grid-2">
      <label>Encounter <input id="billing-status-encounter-id" required placeholder="ID do encounter" /></label>
      <label>Status
        <select id="billing-status" required>
          <option value="draft">Draft</option>
          <option value="estimated">Estimated</option>
          <option value="open">Open</option>
          <option value="settled">Settled</option>
        </select>
      </label>
    </div>
    <label>Notas administrativas <textarea id="billing-status-notes" placeholder="Atualizacao administrativa do billing"></textarea></label>
    <div class="btn-row">
      <button type="submit">Atualizar status</button>
      <button type="button" class="secondary" id="billing-status-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="billing-total">0</div><div class="label">Registros</div></div>
  <div class="kpi"><div class="value" id="billing-estimated">0</div><div class="label">Estimated</div></div>
  <div class="kpi"><div class="value" id="billing-open">0</div><div class="label">Open</div></div>
  <div class="kpi"><div class="value" id="billing-settled">0</div><div class="label">Settled</div></div>
</div>

<div class="search-bar">
  <input id="billing-search" placeholder="Buscar por encounter, paciente, owner, status..." />
  <button id="billing-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Registros de billing</h2>
    <div id="billing-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Itens do encounter</h2>
    <div id="billing-items-list" class="empty">Selecione ou preencha um encounter para ver os itens faturaveis.</div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('billing-alert');
  var listEl = document.getElementById('billing-list');
  var itemsEl = document.getElementById('billing-items-list');
  var estimateForm = document.getElementById('billing-estimate-form');
  var itemForm = document.getElementById('billing-item-form');
  var statusForm = document.getElementById('billing-status-form');
  var searchInput = document.getElementById('billing-search');
  var searchBtn = document.getElementById('billing-search-btn');
  var reloadBtn = document.getElementById('reload-billing');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'draft') return 'badge badge-neutral';
    if (value === 'estimated') return 'badge badge-info';
    if (value === 'open') return 'badge badge-warning';
    if (value === 'settled') return 'badge badge-success';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('billing-total').textContent = String(items.length);
    document.getElementById('billing-estimated').textContent = String(items.filter(function(item) { return item.status === 'estimated'; }).length);
    document.getElementById('billing-open').textContent = String(items.filter(function(item) { return item.status === 'open'; }).length);
    document.getElementById('billing-settled').textContent = String(items.filter(function(item) { return item.status === 'settled'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum registro de billing encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Encounter</th><th>Paciente / tutor</th><th>Status</th><th>Subtotal</th><th>Atualizado</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.encounterId || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Record ' + escapeHtml(item.id || '—') + '</span></td>' +
        '<td><code>' + escapeHtml(item.patientId || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Owner ' + escapeHtml(item.ownerId || '—') + '</span></td>' +
        '<td><span class="' + badgeClass(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>R$ ' + Number(item.subtotalAmount || 0).toFixed(2) + '</td>' +
        '<td>' + formatDate(item.updatedAt) + '</td>' +
        '<td><button class="small secondary" onclick="loadBillingItems(\'' + escapeHtml(item.encounterId) + '\')">Itens</button> <button class="small secondary" onclick="prefillBilling(\'' + escapeHtml(item.encounterId) + '\')">Usar</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderItems(items) {
    if (!items.length) {
      itemsEl.innerHTML = '<div class="empty">Nenhum item faturavel encontrado para este encounter.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Tipo</th><th>Descricao</th><th>Qtd</th><th>Unitario</th><th>Total</th><th>Origem</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td>' + escapeHtml(item.itemType || '—') + '</td>' +
        '<td><strong>' + escapeHtml(item.description || '—') + '</strong></td>' +
        '<td>' + escapeHtml(String(item.quantity || 0)) + '</td>' +
        '<td>R$ ' + Number(item.unitPriceAmount || 0).toFixed(2) + '</td>' +
        '<td>R$ ' + Number(item.totalAmount || 0).toFixed(2) + '</td>' +
        '<td>' + escapeHtml(item.sourceEntityType || '—') + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    itemsEl.innerHTML = html;
  }

  async function loadBilling(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/billing');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar billing.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /billing', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.encounterId, item.patientId, item.ownerId, item.status].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    items.sort(function(a, b) { return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); });
    renderList(items);
  }

  window.loadBillingItems = async function(encounterId) {
    itemsEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/billing/items?encounterId=' + encodeURIComponent(encounterId));
    if (!res.ok) {
      itemsEl.innerHTML = '<div class="empty">Erro ao carregar itens faturaveis.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /billing/items', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    renderItems(items);
  };

  window.prefillBilling = function(encounterId) {
    document.getElementById('billing-estimate-encounter-id').value = encounterId;
    document.getElementById('billing-item-encounter-id').value = encounterId;
    document.getElementById('billing-status-encounter-id').value = encounterId;
    window.loadBillingItems(encounterId);
  };

  estimateForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('billing-estimate-encounter-id').value,
      administrativeNotes: document.getElementById('billing-estimate-notes').value || undefined
    };
    var res = await apiRequest('/billing/estimate', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar estimate', 'error');
      return;
    }
    showMsg('Estimate criado com sucesso.', 'success');
    estimateForm.reset();
    loadBilling(searchInput.value);
  });

  itemForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('billing-item-encounter-id').value,
      itemType: document.getElementById('billing-item-type').value,
      description: document.getElementById('billing-item-description').value,
      quantity: Number(document.getElementById('billing-item-quantity').value),
      unitPriceAmount: Number(document.getElementById('billing-item-unit-price').value),
      sourceEntityType: document.getElementById('billing-item-source-type').value || undefined,
      sourceEntityId: document.getElementById('billing-item-source-id').value || undefined
    };
    var res = await apiRequest('/billing/items', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao adicionar item de billing', 'error');
      return;
    }
    showMsg('Item de billing criado com sucesso.', 'success');
    window.loadBillingItems(payload.encounterId);
    loadBilling(searchInput.value);
  });

  statusForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var encounterId = document.getElementById('billing-status-encounter-id').value;
    var payload = {
      status: document.getElementById('billing-status').value,
      administrativeNotes: document.getElementById('billing-status-notes').value || undefined
    };
    var res = await apiRequest('/billing/' + encodeURIComponent(encounterId) + '/status', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar status do billing', 'error');
      return;
    }
    showMsg('Status do billing atualizado com sucesso.', 'success');
    loadBilling(searchInput.value);
    window.loadBillingItems(encounterId);
  });

  document.getElementById('billing-estimate-clear').addEventListener('click', function() { estimateForm.reset(); });
  document.getElementById('billing-item-clear').addEventListener('click', function() { itemForm.reset(); });
  document.getElementById('billing-status-clear').addEventListener('click', function() { statusForm.reset(); });
  reloadBtn.addEventListener('click', function() { loadBilling(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadBilling(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadBilling(searchInput.value); }, 200);
  });

  loadBilling('');
})();
</script>`;
}
