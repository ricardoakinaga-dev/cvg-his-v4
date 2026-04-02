export function renderQuotes(): string {
  return `
<div class="page-header">
  <div>
    <h1>Orcamentos</h1>
    <p class="subtitle">Crie, edite, imprima e converta orcamentos em comanda de balcao.</p>
  </div>
  <button id="reload-qt" class="secondary">Atualizar</button>
</div>

<div id="qt-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="qt-total">0</div><div class="label">Total</div></div>
  <div class="kpi"><div class="value" id="qt-draft">0</div><div class="label">Rascunhos</div></div>
  <div class="kpi"><div class="value" id="qt-approved">0</div><div class="label">Aprovados</div></div>
  <div class="kpi"><div class="value" id="qt-converted">0</div><div class="label">Convertidos</div></div>
</div>

<div class="card" style="margin-bottom:20px;">
  <h2>Novo Orcamento</h2>
  <div class="btn-row">
    <button id="qt-create">Criar Orcamento</button>
  </div>
</div>

<div class="search-bar">
  <input id="qt-search" placeholder="Buscar por numero ou observacoes..." />
  <button id="qt-search-btn" class="secondary">Buscar</button>
  <select id="qt-status-filter" style="margin-left:8px;">
    <option value="">Todos os status</option>
    <option value="draft">Rascunho</option>
    <option value="approved">Aprovado</option>
    <option value="rejected">Rejeitado</option>
    <option value="cancelled">Cancelado</option>
  </select>
</div>

<div class="card">
  <h2>Orcamentos</h2>
  <div id="qt-list"><div class="loading">Carregando</div></div>
</div>

<div id="qt-detail" style="display:none;" class="card" style="margin-top:20px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h2 id="qt-detail-title">Detalhes do Orcamento</h2>
    <div class="btn-row">
      <button id="qt-approve" class="secondary">Aprovar</button>
      <button id="qt-reject" class="secondary">Rejeitar</button>
      <button id="qt-cancel" class="secondary">Cancelar</button>
      <button id="qt-convert" class="secondary">Converter em Comanda</button>
      <button id="qt-print" class="secondary">Imprimir / PDF</button>
      <button id="qt-back-list" class="secondary">Voltar</button>
    </div>
  </div>
  <div id="qt-detail-info" style="margin-bottom:16px;"></div>
  <h3>Itens</h3>
  <div id="qt-items-list" style="margin-bottom:16px;"></div>
  <div class="card" style="background:#f8fafc;" id="qt-add-item-section">
    <h3>Adicionar Item</h3>
    <form id="qt-item-form">
      <div class="grid grid-4">
        <label>Tipo
          <select id="qt-item-type" required>
            <option value="product">Produto</option>
            <option value="service">Servico</option>
          </select>
        </label>
        <label>Nome <input id="qt-item-name" required placeholder="Nome do item" /></label>
        <label>Codigo <input id="qt-item-code" placeholder="SKU/Codigo" /></label>
        <label>Preco Unit. <input id="qt-item-price" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
      </div>
      <div class="grid grid-3">
        <label>Qtd <input id="qt-item-qty" type="number" min="1" value="1" required /></label>
        <label>Desconto <input id="qt-item-discount" type="number" min="0" step="0.01" value="0" /></label>
        <label>Obs <input id="qt-item-notes" placeholder="Observacoes" /></label>
      </div>
      <button type="submit" style="margin-top:8px;">Adicionar Item</button>
    </form>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('qt-alert');
  var listEl = document.getElementById('qt-list');
  var detailEl = document.getElementById('qt-detail');
  var searchInput = document.getElementById('qt-search');
  var statusFilter = document.getElementById('qt-status-filter');
  var reloadBtn = document.getElementById('reload-qt');
  var createBtn = document.getElementById('qt-create');
  var currentQuoteId = null;

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function badgeClass(status) {
    if (status === 'draft') return 'badge badge-neutral';
    if (status === 'approved') return 'badge badge-success';
    if (status === 'rejected') return 'badge badge-error';
    return 'badge badge-neutral';
  }

  function statusLabel(status) {
    var labels = { draft: 'Rascunho', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado', cancelled: 'Cancelado' };
    return labels[status] || status;
  }

  function updateStats(items) {
    document.getElementById('qt-total').textContent = String(items.length);
    document.getElementById('qt-draft').textContent = String(items.filter(function(i) { return i.status === 'draft'; }).length);
    document.getElementById('qt-approved').textContent = String(items.filter(function(i) { return i.status === 'approved'; }).length);
    document.getElementById('qt-converted').textContent = String(items.filter(function(i) { return i.convertedToSaleId; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum orcamento encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Numero</th><th>Status</th><th>Total</th><th>Validade</th><th>Convertido</th><th>Data</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var q = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(q.number) + '</strong></td>' +
        '<td><span class="' + badgeClass(q.status) + '">' + statusLabel(q.status) + '</span></td>' +
        '<td>R$ ' + Number(q.total || 0).toFixed(2) + '</td>' +
        '<td>' + (q.validUntil ? new Date(q.validUntil).toLocaleDateString('pt-BR') : '—') + '</td>' +
        '<td>' + (q.convertedToSaleId ? 'Sim' : '—') + '</td>' +
        '<td>' + new Date(q.createdAt).toLocaleDateString('pt-BR') + '</td>' +
        '<td><button class="small" onclick="viewQuote(\\'' + escapeHtml(q.id) + '\\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadQuotes() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var params = [];
    var search = searchInput.value.trim();
    if (search) params.push('search=' + encodeURIComponent(search));
    var status = statusFilter.value;
    if (status) params.push('status=' + encodeURIComponent(status));
    var url = '/quotes' + (params.length ? '?' + params.join('&') : '');
    var res = await apiRequest(url);
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar orcamentos.</div>';
      showMsg('Falha ao ler /quotes', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    renderList(items);
  }

  window.viewQuote = async function(id) {
    currentQuoteId = id;
    var res = await apiRequest('/quotes/' + id);
    if (!res.ok) { showMsg('Falha ao carregar detalhes', 'error'); return; }
    var quote = res.body;
    detailEl.style.display = 'block';
    listEl.parentElement.style.display = 'none';
    document.getElementById('qt-detail-title').textContent = 'Orcamento ' + quote.number;
    document.getElementById('qt-detail-info').innerHTML =
      '<div class="grid grid-4">' +
      '<div class="kpi"><div class="value">R$ ' + Number(quote.subtotal || 0).toFixed(2) + '</div><div class="label">Subtotal</div></div>' +
      '<div class="kpi"><div class="value">R$ ' + Number(quote.discountAmount || 0).toFixed(2) + '</div><div class="label">Descontos</div></div>' +
      '<div class="kpi"><div class="value">R$ ' + Number(quote.total || 0).toFixed(2) + '</div><div class="label">Total</div></div>' +
      '<div class="kpi"><div class="value">' + (quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '—') + '</div><div class="label">Validade</div></div>' +
      '</div>' +
      '<p>Status: <span class="' + badgeClass(quote.status) + '">' + statusLabel(quote.status) + '</span>' +
      (quote.convertedToSaleId ? ' | Convertido em comanda' : '') + '</p>';

    var itemsHtml = '<table><thead><tr><th>Tipo</th><th>Codigo</th><th>Nome</th><th>Qtd</th><th>Preco</th><th>Desconto</th><th>Total</th></tr></thead><tbody>';
    for (var j = 0; j < (quote.items || []).length; j++) {
      var it = quote.items[j];
      itemsHtml += '<tr><td>' + (it.itemType === 'product' ? 'Produto' : 'Servico') + '</td><td><code>' + escapeHtml(it.codeSnapshot || '—') + '</code></td><td>' + escapeHtml(it.nameSnapshot) + '</td><td>' + it.quantity + '</td><td>R$ ' + Number(it.unitPrice).toFixed(2) + '</td><td>R$ ' + Number(it.discountAmount).toFixed(2) + '</td><td><strong>R$ ' + Number(it.lineTotal).toFixed(2) + '</strong></td></tr>';
    }
    itemsHtml += '</tbody></table>';
    document.getElementById('qt-items-list').innerHTML = itemsHtml || '<div class="empty">Nenhum item.</div>';

    var isDraft = quote.status === 'draft';
    var isApproved = quote.status === 'approved';
    var isConverted = !!quote.convertedToSaleId;

    document.getElementById('qt-approve').style.display = isDraft ? '' : 'none';
    document.getElementById('qt-reject').style.display = (isDraft || isApproved) ? '' : 'none';
    document.getElementById('qt-cancel').style.display = (!isConverted && quote.status !== 'cancelled') ? '' : 'none';
    document.getElementById('qt-convert').style.display = (isApproved && !isConverted) ? '' : 'none';
    document.getElementById('qt-print').style.display = '';
    document.getElementById('qt-add-item-section').style.display = isDraft ? '' : 'none';
  };

  document.getElementById('qt-back-list').addEventListener('click', function() {
    detailEl.style.display = 'none';
    listEl.parentElement.style.display = '';
    currentQuoteId = null;
    loadQuotes();
  });

  createBtn.addEventListener('click', async function() {
    var res = await apiRequest('/quotes', { method: 'POST', body: JSON.stringify({}) });
    if (!res.ok) { showMsg('Falha ao criar orcamento', 'error'); return; }
    showMsg('Orcamento ' + res.body.number + ' criado com sucesso.', 'success');
    loadQuotes();
  });

  document.getElementById('qt-item-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var payload = {
      itemType: document.getElementById('qt-item-type').value,
      nameSnapshot: document.getElementById('qt-item-name').value,
      codeSnapshot: document.getElementById('qt-item-code').value || null,
      unitPrice: parseFloat(document.getElementById('qt-item-price').value),
      quantity: parseInt(document.getElementById('qt-item-qty').value) || 1,
      discountAmount: parseFloat(document.getElementById('qt-item-discount').value) || 0,
      notes: document.getElementById('qt-item-notes').value || null
    };
    var res = await apiRequest('/quotes/' + currentQuoteId + '/items', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg('Falha ao adicionar item', 'error'); return; }
    showMsg('Item adicionado com sucesso.', 'success');
    document.getElementById('qt-item-form').reset();
    document.getElementById('qt-item-qty').value = '1';
    document.getElementById('qt-item-discount').value = '0';
    viewQuote(currentQuoteId);
  });

  document.getElementById('qt-approve').addEventListener('click', async function() {
    var res = await apiRequest('/quotes/' + currentQuoteId + '/approve', { method: 'POST' });
    if (!res.ok) { showMsg('Falha ao aprovar orcamento', 'error'); return; }
    showMsg('Orcamento aprovado.', 'success');
    viewQuote(currentQuoteId);
  });

  document.getElementById('qt-reject').addEventListener('click', async function() {
    var res = await apiRequest('/quotes/' + currentQuoteId + '/reject', { method: 'POST' });
    if (!res.ok) { showMsg('Falha ao rejeitar orcamento', 'error'); return; }
    showMsg('Orcamento rejeitado.', 'success');
    viewQuote(currentQuoteId);
  });

  document.getElementById('qt-cancel').addEventListener('click', async function() {
    if (!confirm('Cancelar este orcamento?')) return;
    var res = await apiRequest('/quotes/' + currentQuoteId + '/cancel', { method: 'POST' });
    if (!res.ok) { showMsg('Falha ao cancelar orcamento', 'error'); return; }
    showMsg('Orcamento cancelado.', 'success');
    viewQuote(currentQuoteId);
  });

  document.getElementById('qt-convert').addEventListener('click', async function() {
    if (!confirm('Converter este orcamento em comanda de balcao?')) return;
    var res = await apiRequest('/quotes/' + currentQuoteId + '/convert-to-sale', { method: 'POST' });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao converter', 'error'); return; }
    showMsg('Orcamento convertido em comanda ' + res.body.counterSaleId + '.', 'success');
    viewQuote(currentQuoteId);
  });

  document.getElementById('qt-print').addEventListener('click', async function() {
    window.open('/api/quotes/' + currentQuoteId + '/pdf', '_blank');
  });

  document.getElementById('qt-search-btn').addEventListener('click', loadQuotes);
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') loadQuotes(); });
  statusFilter.addEventListener('change', loadQuotes);
  reloadBtn.addEventListener('click', loadQuotes);

  loadQuotes();
})();
</script>`;
}
