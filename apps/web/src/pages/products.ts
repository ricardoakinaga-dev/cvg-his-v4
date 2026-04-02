export function renderProducts(): string {
  return `
<div class="page-header">
  <div>
    <h1>Produtos</h1>
    <p class="subtitle">Catalogo de produtos vendaveis. Integre com estoque e balcao.</p>
  </div>
  <button id="reload-products" class="secondary">Atualizar</button>
</div>

<div id="products-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Novo produto</h2>
  <form id="products-form">
    <div class="grid grid-3">
      <label>Nome <input id="product-name" required placeholder="Nome do produto" /></label>
      <label>Codigo (opcional) <input id="product-code" placeholder="SKU ou codigo" /></label>
      <label>Preco base <input id="product-price" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
    </div>
    <label>Descricao <input id="product-description" placeholder="Descricao curta do produto" /></label>
    <div class="btn-row">
      <button type="submit">Criar produto</button>
      <button type="button" class="secondary" id="products-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="products-total">0</div><div class="label">Total</div></div>
  <div class="kpi"><div class="value" id="products-active">0</div><div class="label">Ativos</div></div>
  <div class="kpi"><div class="value" id="products-inactive">0</div><div class="label">Inativos</div></div>
  <div class="kpi"><div class="value" id="products-avg-price">0</div><div class="label">Preco medio</div></div>
</div>

<div class="search-bar">
  <input id="products-search" placeholder="Buscar por nome, codigo..." />
  <button id="products-search-btn" class="secondary">Buscar</button>
  <label style="margin-left:12px;display:inline-flex;align-items:center;gap:4px;">
    <input type="checkbox" id="products-only-active" /> Apenas ativos
  </label>
</div>

<div class="card">
  <h2>Catalogo de produtos</h2>
  <div id="products-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('products-alert');
  var listEl = document.getElementById('products-list');
  var form = document.getElementById('products-form');
  var searchInput = document.getElementById('products-search');
  var searchBtn = document.getElementById('products-search-btn');
  var onlyActiveCb = document.getElementById('products-only-active');
  var reloadBtn = document.getElementById('reload-products');
  var clearBtn = document.getElementById('products-clear');

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function badgeClass(active) {
    return active ? 'badge badge-success' : 'badge badge-neutral';
  }

  function updateStats(items) {
    var active = items.filter(function(i) { return i.active; });
    document.getElementById('products-total').textContent = String(items.length);
    document.getElementById('products-active').textContent = String(active.length);
    document.getElementById('products-inactive').textContent = String(items.length - active.length);
    var avg = items.length ? items.reduce(function(s, i) { return s + Number(i.basePrice || 0); }, 0) / items.length : 0;
    document.getElementById('products-avg-price').textContent = 'R$ ' + avg.toFixed(2);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum produto encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Codigo</th><th>Nome</th><th>Preco</th><th>Status</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(p.code || '—') + '</code></td>' +
        '<td><strong>' + escapeHtml(p.name) + '</strong>' + (p.description ? '<br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(p.description) + '</span>' : '') + '</td>' +
        '<td>R$ ' + Number(p.basePrice || 0).toFixed(2) + '</td>' +
        '<td><span class="' + badgeClass(p.active) + '">' + (p.active ? 'Ativo' : 'Inativo') + '</span></td>' +
        '<td><button class="small secondary" onclick="toggleProduct(\\'' + escapeHtml(p.id) + '\\', ' + (!p.active) + ')">' + (p.active ? 'Inativar' : 'Ativar') + '</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadProducts() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var params = [];
    var search = searchInput.value.trim();
    if (search) params.push('search=' + encodeURIComponent(search));
    if (onlyActiveCb.checked) params.push('active=true');
    var url = '/products' + (params.length ? '?' + params.join('&') : '');
    var res = await apiRequest(url);
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar produtos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /products', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    renderList(items);
  }

  window.toggleProduct = async function(id, active) {
    var res = await apiRequest('/products/' + id, { method: 'PATCH', body: JSON.stringify({ active: active }) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar produto', 'error');
      return;
    }
    showMsg('Produto ' + (active ? 'ativado' : 'inativado') + ' com sucesso.', 'success');
    loadProducts();
  };

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      name: document.getElementById('product-name').value,
      code: document.getElementById('product-code').value || undefined,
      description: document.getElementById('product-description').value || undefined,
      basePrice: parseFloat(document.getElementById('product-price').value)
    };
    var res = await apiRequest('/products', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar produto', 'error');
      return;
    }
    showMsg('Produto criado com sucesso.', 'success');
    form.reset();
    loadProducts();
  });

  clearBtn.addEventListener('click', function() { form.reset(); });
  searchBtn.addEventListener('click', loadProducts);
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') loadProducts(); });
  onlyActiveCb.addEventListener('change', loadProducts);
  reloadBtn.addEventListener('click', loadProducts);

  loadProducts();
})();
</script>`;
}
