export function renderServices(): string {
  return `
<div class="page-header">
  <div>
    <h1>Servicos</h1>
    <p class="subtitle">Catalogo de servicos vendaveis. Integre com billing e balcao.</p>
  </div>
  <button id="reload-services" class="secondary">Atualizar</button>
</div>

<div id="services-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Novo servico</h2>
  <form id="services-form">
    <div class="grid grid-3">
      <label>Nome <input id="service-name" required placeholder="Nome do servico" /></label>
      <label>Codigo (opcional) <input id="service-code" placeholder="Codigo do servico" /></label>
      <label>Preco base <input id="service-price" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
    </div>
    <label>Descricao <input id="service-description" placeholder="Descricao curta do servico" /></label>
    <div class="btn-row">
      <button type="submit">Criar servico</button>
      <button type="button" class="secondary" id="services-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="services-total">0</div><div class="label">Total</div></div>
  <div class="kpi"><div class="value" id="services-active">0</div><div class="label">Ativos</div></div>
  <div class="kpi"><div class="value" id="services-inactive">0</div><div class="label">Inativos</div></div>
  <div class="kpi"><div class="value" id="services-avg-price">0</div><div class="label">Preco medio</div></div>
</div>

<div class="search-bar">
  <input id="services-search" placeholder="Buscar por nome, codigo..." />
  <button id="services-search-btn" class="secondary">Buscar</button>
  <label style="margin-left:12px;display:inline-flex;align-items:center;gap:4px;">
    <input type="checkbox" id="services-only-active" /> Apenas ativos
  </label>
</div>

<div class="card">
  <h2>Catalogo de servicos</h2>
  <div id="services-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('services-alert');
  var listEl = document.getElementById('services-list');
  var form = document.getElementById('services-form');
  var searchInput = document.getElementById('services-search');
  var searchBtn = document.getElementById('services-search-btn');
  var onlyActiveCb = document.getElementById('services-only-active');
  var reloadBtn = document.getElementById('reload-services');
  var clearBtn = document.getElementById('services-clear');

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function badgeClass(active) {
    return active ? 'badge badge-success' : 'badge badge-neutral';
  }

  function updateStats(items) {
    var active = items.filter(function(i) { return i.active; });
    document.getElementById('services-total').textContent = String(items.length);
    document.getElementById('services-active').textContent = String(active.length);
    document.getElementById('services-inactive').textContent = String(items.length - active.length);
    var avg = items.length ? items.reduce(function(s, i) { return s + Number(i.basePrice || 0); }, 0) / items.length : 0;
    document.getElementById('services-avg-price').textContent = 'R$ ' + avg.toFixed(2);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum servico encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Codigo</th><th>Nome</th><th>Preco</th><th>Status</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(s.code || '—') + '</code></td>' +
        '<td><strong>' + escapeHtml(s.name) + '</strong>' + (s.description ? '<br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(s.description) + '</span>' : '') + '</td>' +
        '<td>R$ ' + Number(s.basePrice || 0).toFixed(2) + '</td>' +
        '<td><span class="' + badgeClass(s.active) + '">' + (s.active ? 'Ativo' : 'Inativo') + '</span></td>' +
        '<td><button class="small secondary" onclick="toggleService(\\'' + escapeHtml(s.id) + '\\', ' + (!s.active) + ')">' + (s.active ? 'Inativar' : 'Ativar') + '</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadServices() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var params = [];
    var search = searchInput.value.trim();
    if (search) params.push('search=' + encodeURIComponent(search));
    if (onlyActiveCb.checked) params.push('active=true');
    var url = '/services' + (params.length ? '?' + params.join('&') : '');
    var res = await apiRequest(url);
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar servicos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /services', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    renderList(items);
  }

  window.toggleService = async function(id, active) {
    var res = await apiRequest('/services/' + id, { method: 'PATCH', body: JSON.stringify({ active: active }) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar servico', 'error');
      return;
    }
    showMsg('Servico ' + (active ? 'ativado' : 'inativado') + ' com sucesso.', 'success');
    loadServices();
  };

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      name: document.getElementById('service-name').value,
      code: document.getElementById('service-code').value || undefined,
      description: document.getElementById('service-description').value || undefined,
      basePrice: parseFloat(document.getElementById('service-price').value)
    };
    var res = await apiRequest('/services', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar servico', 'error');
      return;
    }
    showMsg('Servico criado com sucesso.', 'success');
    form.reset();
    loadServices();
  });

  clearBtn.addEventListener('click', function() { form.reset(); });
  searchBtn.addEventListener('click', loadServices);
  searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') loadServices(); });
  onlyActiveCb.addEventListener('change', loadServices);
  reloadBtn.addEventListener('click', loadServices);

  loadServices();
})();
</script>`;
}
