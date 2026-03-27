export function renderBeds(): string {
  return `
<div class="page-header">
  <div>
    <h1>Leitos</h1>
    <p class="subtitle">Gestao de leitos hospitalares por setor.</p>
  </div>
  <button id="reload-beds" class="secondary">Atualizar</button>
</div>

<div id="beds-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo leito</h2>
    <form id="bed-form">
      <div class="grid grid-2">
        <label>Setor ID <input id="bed-sector-id" required placeholder="ID do setor" /></label>
        <label>Codigo <input id="bed-code" required placeholder="Ex.: B01, LEITO-12" /></label>
      </div>
      <div class="grid grid-2">
        <label>Nome <input id="bed-name" required placeholder="Ex.: Leito 01 - Enf. Caninos" /></label>
        <label>Especie suportada <input id="bed-species" placeholder="Ex.: caninos, felinos" /></label>
      </div>
      <div class="btn-row">
        <button type="submit">Criar leito</button>
        <button type="button" class="secondary" id="bed-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>KPIs</h2>
    <div class="grid grid-4">
      <div class="kpi"><div class="value" id="bed-total">0</div><div class="label">Total</div></div>
      <div class="kpi"><div class="value" id="bed-available">0</div><div class="label">Disponiveis</div></div>
      <div class="kpi"><div class="value" id="bed-occupied">0</div><div class="label">Ocupados</div></div>
      <div class="kpi"><div class="value" id="bed-maintenance">0</div><div class="label">Manutencao</div></div>
    </div>
  </div>
</div>

<div class="card">
  <h2>Leitos cadastrados</h2>
  <div id="bed-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('beds-alert');
  var listEl = document.getElementById('bed-list');
  var form = document.getElementById('bed-form');
  var reloadBtn = document.getElementById('reload-beds');

  function statusBadge(status) {
    var map = { available: 'badge-success', occupied: 'badge-warning', maintenance: 'badge-danger' };
    return map[status] || 'badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('bed-total').textContent = String(items.length);
    document.getElementById('bed-available').textContent = String(items.filter(function(i) { return i.status === 'available'; }).length);
    document.getElementById('bed-occupied').textContent = String(items.filter(function(i) { return i.status === 'occupied'; }).length);
    document.getElementById('bed-maintenance').textContent = String(items.filter(function(i) { return i.status === 'maintenance'; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum leito cadastrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Codigo</th><th>Nome</th><th>Setor</th><th>Status</th><th>Especie</th><th>Ativo</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.code || '—') + '</code></td>' +
        '<td>' + escapeHtml(item.name || '—') + '</td>' +
        '<td><code>' + escapeHtml(item.sectorId || '—') + '</code></td>' +
        '<td><span class="' + statusBadge(item.status) + '">' + escapeHtml(item.status || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.supportsSpecies || '—') + '</td>' +
        '<td>' + (item.active ? 'Sim' : 'Nao') + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadBeds() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/beds');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar leitos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /beds', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    items.sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
    renderList(items);
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      sectorId: document.getElementById('bed-sector-id').value,
      code: document.getElementById('bed-code').value,
      name: document.getElementById('bed-name').value,
      supportsSpecies: document.getElementById('bed-species').value || undefined
    };
    var res = await apiRequest('/beds', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar leito', 'error');
      return;
    }
    showMsg('Leito criado com sucesso.', 'success');
    form.reset();
    loadBeds();
  });

  document.getElementById('bed-clear').addEventListener('click', function() { form.reset(); });
  reloadBtn.addEventListener('click', loadBeds);
  loadBeds();
})();
</script>`;
}
