export function renderCounterSales(): string {
  return `
<div class="page-header">
  <div>
    <h1>Comanda de Balcao</h1>
    <p class="subtitle">Venda de produtos e servicos no balcao. Abre comanda, adiciona itens, registra pagamentos e fecha.</p>
  </div>
  <button id="reload-cs" class="secondary">Atualizar</button>
</div>

<div id="cs-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="cs-total">0</div><div class="label">Total</div></div>
  <div class="kpi"><div class="value" id="cs-open">0</div><div class="label">Abertas</div></div>
  <div class="kpi"><div class="value" id="cs-closed">0</div><div class="label">Fechadas</div></div>
  <div class="kpi"><div class="value" id="cs-cancelled">0</div><div class="label">Canceladas</div></div>
</div>

<div class="card" style="margin-bottom:20px;">
  <h2>Nova Comanda</h2>
  <div class="btn-row">
    <button id="cs-open-sale">Abrir Comanda</button>
  </div>
</div>

<div class="search-bar">
  <input id="cs-search" placeholder="Buscar por numero ou observacoes..." />
  <button id="cs-search-btn" class="secondary">Buscar</button>
  <select id="cs-status-filter" style="margin-left:8px;">
    <option value="">Todos os status</option>
    <option value="open">Abertas</option>
    <option value="closed">Fechadas</option>
    <option value="cancelled">Canceladas</option>
  </select>
</div>

<div class="card">
  <h2>Comandas</h2>
  <div id="cs-list"><div class="loading">Carregando</div></div>
</div>

<div id="cs-detail" style="display:none;" class="card" style="margin-top:20px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h2 id="cs-detail-title">Detalhes da Comanda</h2>
    <div class="btn-row">
      <button id="cs-close-sale" class="secondary">Fechar</button>
      <button id="cs-cancel-sale" class="secondary">Cancelar</button>
      <button id="cs-back-list" class="secondary">Voltar</button>
    </div>
  </div>
  <div id="cs-detail-info" style="margin-bottom:16px;"></div>
  <h3>Itens</h3>
  <div id="cs-items-list" style="margin-bottom:16px;"></div>
  <div class="card" style="background:#f8fafc;">
    <h3>Adicionar Item</h3>
    <form id="cs-item-form">
      <div class="grid grid-4">
        <label>Tipo
          <select id="cs-item-type" required>
            <option value="product">Produto</option>
            <option value="service">Servico</option>
          </select>
        </label>
        <label>Nome <input id="cs-item-name" required placeholder="Nome do item" /></label>
        <label>Codigo <input id="cs-item-code" placeholder="SKU/Codigo" /></label>
        <label>Preco Unit. <input id="cs-item-price" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
      </div>
      <div class="grid grid-3">
        <label>Qtd <input id="cs-item-qty" type="number" min="1" value="1" required /></label>
        <label>Desconto <input id="cs-item-discount" type="number" min="0" step="0.01" value="0" /></label>
        <label>Obs <input id="cs-item-notes" placeholder="Observacoes" /></label>
      </div>
      <button type="submit" style="margin-top:8px;">Adicionar Item</button>
    </form>
  </div>
  <h3>Pagamentos</h3>
  <div id="cs-payments-list" style="margin-bottom:16px;"></div>
  <div class="card" style="background:#f8fafc;">
    <h3>Registrar Pagamento</h3>
    <form id="cs-payment-form">
      <div class="grid grid-3">
        <label>Metodo
          <select id="cs-pay-method" required>
            <option value="cash">Dinheiro</option>
            <option value="credit_card">Cartao Credito</option>
            <option value="debit_card">Cartao Debito</option>
            <option value="pix">PIX</option>
            <option value="bank_transfer">Transferencia</option>
            <option value="check">Cheque</option>
            <option value="insurance">Convenio</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label>Valor <input id="cs-pay-amount" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
        <label>Parcelas <input id="cs-pay-installments" type="number" min="1" value="1" /></label>
      </div>
      <label>Referencia <input id="cs-pay-ref" placeholder="NSU, codigo, etc." /></label>
      <button type="submit" style="margin-top:8px;">Registrar Pagamento</button>
    </form>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('cs-alert');
  var listEl = document.getElementById('cs-list');
  var detailEl = document.getElementById('cs-detail');
  var searchInput = document.getElementById('cs-search');
  var statusFilter = document.getElementById('cs-status-filter');
  var reloadBtn = document.getElementById('reload-cs');
  var openBtn = document.getElementById('cs-open-sale');
  var currentSaleId = null;

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function badgeClass(status) {
    if (status === 'open') return 'badge badge-info';
    if (status === 'closed') return 'badge badge-success';
    return 'badge badge-neutral';
  }

  function statusLabel(status) {
    if (status === 'open') return 'Aberta';
    if (status === 'closed') return 'Fechada';
    return 'Cancelada';
  }

  function updateStats(items) {
    document.getElementById('cs-total').textContent = String(items.length);
    document.getElementById('cs-open').textContent = String(items.filter(function(i) { return i.status === 'open'; }).length);
    document.getElementById('cs-closed').textContent = String(items.filter(function(i) { return i.status === 'closed'; }).length);
    document.getElementById('cs-cancelled').textContent = String(items.filter(function(i) { return i.status === 'cancelled'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhuma comanda encontrada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Numero</th><th>Status</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Data</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(s.number) + '</strong></td>' +
        '<td><span class="' + badgeClass(s.status) + '">' + statusLabel(s.status) + '</span></td>' +
        '<td>R$ ' + Number(s.total || 0).toFixed(2) + '</td>' +
        '<td>R$ ' + Number(s.paidAmount || 0).toFixed(2) + '</td>' +
        '<td>R$ ' + Number(s.balanceDue || 0).toFixed(2) + '</td>' +
        '<td>' + new Date(s.createdAt).toLocaleDateString('pt-BR') + '</td>' +
        '<td><button class="small" onclick="viewSale(\\'' + escapeHtml(s.id) + '\\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadSales() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var params = [];
    var search = searchInput.value.trim();
    if (search) params.push('search=' + encodeURIComponent(search));
    var status = statusFilter.value;
    if (status) params.push('status=' + encodeURIComponent(status));
    var url = '/counter-sales' + (params.length ? '?' + params.join('&') : '');
    var res = await apiRequest(url);
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar comandas.</div>';
      showMsg('Falha ao ler /counter-sales', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    renderList(items);
  }

  window.viewSale = async function(id) {
    currentSaleId = id;
    var res = await apiRequest('/counter-sales/' + id);
    if (!res.ok) { showMsg('Falha ao carregar detalhes', 'error'); return; }
    var sale = res.body;
    detailEl.style.display = 'block';
    listEl.parentElement.style.display = 'none';
    document.getElementById('cs-detail-title').textContent = 'Comanda ' + sale.number;
    document.getElementById('cs-detail-info').innerHTML =
      '<div class="grid grid-4">' +
      '<div class="kpi"><div class="value">R$ ' + Number(sale.subtotal || 0).toFixed(2) + '</div><div class="label">Subtotal</div></div>' +
      '<div class="kpi"><div class="value">R$ ' + Number(sale.discountAmount || 0).toFixed(2) + '</div><div class="label">Descontos</div></div>' +
      '<div class="kpi"><div class="value">R$ ' + Number(sale.total || 0).toFixed(2) + '</div><div class="label">Total</div></div>' +
      '<div class="kpi"><div class="value">R$ ' + Number(sale.balanceDue || 0).toFixed(2) + '</div><div class="label">Saldo Devido</div></div>' +
      '</div>' +
      '<p>Status: <span class="' + badgeClass(sale.status) + '">' + statusLabel(sale.status) + '</span></p>';

    var itemsHtml = '<table><thead><tr><th>Tipo</th><th>Codigo</th><th>Nome</th><th>Qtd</th><th>Preco</th><th>Desconto</th><th>Total</th></tr></thead><tbody>';
    for (var j = 0; j < (sale.items || []).length; j++) {
      var it = sale.items[j];
      itemsHtml += '<tr><td>' + (it.itemType === 'product' ? 'Produto' : 'Servico') + '</td><td><code>' + escapeHtml(it.codeSnapshot || '—') + '</code></td><td>' + escapeHtml(it.nameSnapshot) + '</td><td>' + it.quantity + '</td><td>R$ ' + Number(it.unitPrice).toFixed(2) + '</td><td>R$ ' + Number(it.discountAmount).toFixed(2) + '</td><td><strong>R$ ' + Number(it.lineTotal).toFixed(2) + '</strong></td></tr>';
    }
    itemsHtml += '</tbody></table>';
    document.getElementById('cs-items-list').innerHTML = itemsHtml || '<div class="empty">Nenhum item.</div>';

    var payHtml = '<table><thead><tr><th>Metodo</th><th>Valor</th><th>Parcelas</th><th>Referencia</th></tr></thead><tbody>';
    for (var k = 0; k < (sale.payments || []).length; k++) {
      var p = sale.payments[k];
      payHtml += '<tr><td>' + escapeHtml(p.method) + '</td><td>R$ ' + Number(p.amount).toFixed(2) + '</td><td>' + p.installments + '</td><td>' + escapeHtml(p.reference || '—') + '</td></tr>';
    }
    payHtml += '</tbody></table>';
    document.getElementById('cs-payments-list').innerHTML = payHtml || '<div class="empty">Nenhum pagamento.</div>';

    if (sale.status !== 'open') {
      document.getElementById('cs-close-sale').style.display = 'none';
      document.getElementById('cs-cancel-sale').style.display = 'none';
      document.getElementById('cs-item-form').style.display = 'none';
      document.getElementById('cs-payment-form').style.display = 'none';
    } else {
      document.getElementById('cs-close-sale').style.display = '';
      document.getElementById('cs-cancel-sale').style.display = '';
      document.getElementById('cs-item-form').style.display = '';
      document.getElementById('cs-payment-form').style.display = '';
    }
  };

  document.getElementById('cs-back-list').addEventListener('click', function() {
    detailEl.style.display = 'none';
    listEl.parentElement.style.display = '';
    currentSaleId = null;
    loadSales();
  });

  openBtn.addEventListener('click', async function() {
    var res = await apiRequest('/counter-sales', { method: 'POST', body: JSON.stringify({}) });
    if (!res.ok) { showMsg('Falha ao abrir comanda', 'error'); return; }
    showMsg('Comanda ' + res.body.number + ' aberta com sucesso.', 'success');
    loadSales();
  });

  document.getElementById('cs-item-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var payload = {
      itemType: document.getElementById('cs-item-type').value,
      nameSnapshot: document.getElementById('cs-item-name').value,
      codeSnapshot: document.getElementById('cs-item-code').value || null,
      unitPrice: parseFloat(document.getElementById('cs-item-price').value),
      quantity: parseInt(document.getElementById('cs-item-qty').value) || 1,
      discountAmount: parseFloat(document.getElementById('cs-item-discount').value) || 0,
      notes: document.getElementById('cs-item-notes').value || null
    };
    var res = await apiRequest('/counter-sales/' + currentSaleId + '/items', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg('Falha ao adicionar item', 'error'); return; }
    showMsg('Item adicionado com sucesso.', 'success');
    document.getElementById('cs-item-form').reset();
    document.getElementById('cs-item-qty').value = '1';
    document.getElementById('cs-item-discount').value = '0';
    viewSale(currentSaleId);
  });

  document.getElementById('cs-payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var payload = {
      method: document.getElementById('cs-pay-method').value,
      amount: parseFloat(document.getElementById('cs-pay-amount').value),
      installments: parseInt(document.getElementById('cs-pay-installments').value) || 1,
      reference: document.getElementById('cs-pay-ref').value || null
    };
    var res = await apiRequest('/counter-sales/' + currentSaleId + '/payments', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar pagamento', 'error'); return; }
    showMsg('Pagamento registrado com sucesso.', 'success');
    document.getElementById('cs-payment-form').reset();
    document.getElementById('cs-pay-installments').value = '1';
    viewSale(currentSaleId);
  });

  document.getElementById('cs-close-sale').addEventListener('click', async function() {
    if (!confirm('Fechar esta comanda?')) return;
    var res = await apiRequest('/counter-sales/' + currentSaleId + '/close', { method: 'POST' });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao fechar comanda', 'error'); return; }
    showMsg('Comanda fechada com sucesso.', 'success');
    viewSale(currentSaleId);
  });

  document.getElementById('cs-cancel-sale').addEventListener('click', async function() {
    if (!confirm('Cancelar esta comanda?')) return;
    var res = await apiRequest('/counter-sales/' + currentSaleId + '/cancel', { method: 'POST' });
    if (!res.ok) { showMsg('Falha ao cancelar comanda', 'error'); return; }
    showMsg('Comanda cancelada.', 'success');
    viewSale(currentSaleId);
  });

  document.getElementById('cs-search-btn').addEventListener('click', loadSales);
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') loadSales(); });
  statusFilter.addEventListener('change', loadSales);
  reloadBtn.addEventListener('click', loadSales);

  loadSales();
})();
</script>`;
}
