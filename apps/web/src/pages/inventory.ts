export function renderInventory(): string {
  return `
<div class="page-header">
  <div>
    <h1>Estoque</h1>
    <p class="subtitle">Consulta de itens, niveis de reposicao e registro de consumo assistencial.</p>
  </div>
  <button id="reload-inventory" class="secondary">Atualizar</button>
</div>

<div id="inventory-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Novo consumo</h2>
  <form id="inventory-consumption-form">
    <div class="grid grid-2">
      <label>Encounter <input id="inventory-encounter-id" required placeholder="ID do encounter" /></label>
      <label>Item de estoque <input id="inventory-item-id" required placeholder="ID do item" /></label>
    </div>
    <div class="grid grid-2">
      <label>Quantidade <input id="inventory-quantity" type="number" min="1" step="0.01" required placeholder="1" /></label>
      <label>Origem
        <select id="inventory-source-entity-type" required>
          <option value="encounter">Encounter</option>
          <option value="diagnostic_order">Pedido diagnostico</option>
          <option value="surgery_case">Cirurgia</option>
          <option value="inpatient_stay">Internacao</option>
          <option value="prescription">Prescricao</option>
          <option value="other">Outro</option>
        </select>
      </label>
    </div>
    <label>ID da origem (opcional) <input id="inventory-source-entity-id" placeholder="ID da entidade relacionada" /></label>
    <div class="btn-row">
      <button type="submit">Registrar consumo</button>
      <button type="button" class="secondary" id="inventory-consumption-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="inventory-items-total">0</div><div class="label">Itens</div></div>
  <div class="kpi"><div class="value" id="inventory-low-stock">0</div><div class="label">Reposicao</div></div>
  <div class="kpi"><div class="value" id="inventory-consumptions-total">0</div><div class="label">Consumos</div></div>
  <div class="kpi"><div class="value" id="inventory-encounter-consumptions">0</div><div class="label">Consumos encounter</div></div>
</div>

<div class="search-bar">
  <input id="inventory-search" placeholder="Buscar por SKU, nome, encounter, item ou origem..." />
  <button id="inventory-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Itens de estoque</h2>
    <div id="inventory-items-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Consumos assistenciais</h2>
    <div id="inventory-consumptions-list"><div class="loading">Carregando</div></div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('inventory-alert');
  var itemsEl = document.getElementById('inventory-items-list');
  var consumptionsEl = document.getElementById('inventory-consumptions-list');
  var form = document.getElementById('inventory-consumption-form');
  var searchInput = document.getElementById('inventory-search');
  var searchBtn = document.getElementById('inventory-search-btn');
  var reloadBtn = document.getElementById('reload-inventory');

  function badgeClass(lowStock) {
    return lowStock ? 'badge badge-warning' : 'badge badge-success';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items, consumptions) {
    document.getElementById('inventory-items-total').textContent = String(items.length);
    document.getElementById('inventory-low-stock').textContent = String(items.filter(function(item) { return Number(item.onHandQuantity) <= Number(item.reorderLevel); }).length);
    document.getElementById('inventory-consumptions-total').textContent = String(consumptions.length);
    document.getElementById('inventory-encounter-consumptions').textContent = String(consumptions.filter(function(item) { return item.sourceEntityType === 'encounter'; }).length);
  }

  function renderItems(items) {
    if (!items.length) {
      itemsEl.innerHTML = '<div class="empty">Nenhum item de estoque encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>SKU</th><th>Item</th><th>Saldo</th><th>Reposicao</th><th>Custo</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var lowStock = Number(item.onHandQuantity) <= Number(item.reorderLevel);
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.sku || '—') + '</code></td>' +
        '<td><strong>' + escapeHtml(item.name || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.unit || '—') + '</span></td>' +
        '<td>' + escapeHtml(String(item.onHandQuantity)) + '</td>' +
        '<td><span class="' + badgeClass(lowStock) + '">' + escapeHtml(String(item.reorderLevel)) + '</span></td>' +
        '<td>R$ ' + Number(item.unitCostAmount || 0).toFixed(2) + '</td>' +
        '<td><button class="small secondary" onclick="prefillInventoryItem(\'' + escapeHtml(item.id) + '\')">Usar</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    itemsEl.innerHTML = html;
  }

  function renderConsumptions(items) {
    if (!items.length) {
      consumptionsEl.innerHTML = '<div class="empty">Nenhum consumo registrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Item</th><th>Encounter</th><th>Quantidade</th><th>Origem</th><th>Custo</th><th>Registrado</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.inventoryItemId || '—') + '</code><br><span style="font-size:0.78rem;color:#64748b">Paciente ' + escapeHtml(item.patientId || '—') + '</span></td>' +
        '<td><code>' + escapeHtml(item.encounterId || '—') + '</code></td>' +
        '<td>' + escapeHtml(String(item.quantity)) + ' ' + escapeHtml(item.unit || '') + '</td>' +
        '<td>' + escapeHtml(item.sourceEntityType || '—') + '</td>' +
        '<td>R$ ' + Number(item.costAmount || 0).toFixed(2) + '</td>' +
        '<td>' + formatDate(item.createdAt) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    consumptionsEl.innerHTML = html;
  }

  async function loadInventory(query) {
    itemsEl.innerHTML = '<div class="loading">Carregando</div>';
    consumptionsEl.innerHTML = '<div class="loading">Carregando</div>';
    var itemsRes = await apiRequest('/inventory/items');
    var consumptionsRes = await apiRequest('/inventory/consumptions');
    if (!itemsRes.ok || !consumptionsRes.ok) {
      itemsEl.innerHTML = '<div class="empty">Erro ao carregar estoque.</div>';
      consumptionsEl.innerHTML = '<div class="empty">Erro ao carregar consumos.</div>';
      showMsg('Falha ao ler estoque ou consumos assistenciais.', 'error');
      return;
    }
    var items = Array.isArray(itemsRes.body) ? itemsRes.body : (itemsRes.body && itemsRes.body.items) || [];
    var consumptions = Array.isArray(consumptionsRes.body) ? consumptionsRes.body : (consumptionsRes.body && consumptionsRes.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(item) {
        return [item.id, item.sku, item.name, item.unit].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
      consumptions = consumptions.filter(function(item) {
        return [item.inventoryItemId, item.encounterId, item.sourceEntityType, item.sourceEntityId, item.patientId].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    consumptions.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    updateStats(items, consumptions);
    renderItems(items);
    renderConsumptions(consumptions);
  }

  window.prefillInventoryItem = function(itemId) {
    document.getElementById('inventory-item-id').value = itemId;
  };

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      encounterId: document.getElementById('inventory-encounter-id').value,
      inventoryItemId: document.getElementById('inventory-item-id').value,
      quantity: Number(document.getElementById('inventory-quantity').value),
      sourceEntityType: document.getElementById('inventory-source-entity-type').value,
      sourceEntityId: document.getElementById('inventory-source-entity-id').value || undefined
    };
    var res = await apiRequest('/inventory/consumptions', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar consumo', 'error');
      return;
    }
    showMsg('Consumo registrado com sucesso.', 'success');
    form.reset();
    loadInventory(searchInput.value);
  });

  document.getElementById('inventory-consumption-clear').addEventListener('click', function() { form.reset(); });
  reloadBtn.addEventListener('click', function() { loadInventory(searchInput.value); });
  searchBtn.addEventListener('click', function() { loadInventory(searchInput.value); });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadInventory(searchInput.value); }, 200);
  });

  loadInventory('');
})();
</script>`;
}
