export function renderSectors(): string {
  return `
<div class="page-header">
  <div>
    <h1>Setores</h1>
    <p class="subtitle">Gestao de setores hospitalares da estrutura.</p>
  </div>
  <button id="reload-sectors" class="secondary">Atualizar</button>
</div>

<div id="sectors-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Novo setor</h2>
    <form id="sector-form">
      <div class="grid grid-2">
        <label>Codigo <input id="sector-code" required placeholder="Ex.: UTI, ENF-01" /></label>
        <label>Nome <input id="sector-name" required placeholder="Ex.: Unidade de Terapia Intensiva" /></label>
      </div>
      <label>Tipo
        <select id="sector-kind" required>
          <option value="clinic">Clinica</option>
          <option value="surgery">Cirurgia</option>
          <option value="icu">UTI</option>
          <option value="isolation">Isolamento</option>
          <option value="observation">Observacao</option>
          <option value="other">Outro</option>
        </select>
      </label>
      <div class="btn-row">
        <button type="submit">Criar setor</button>
        <button type="button" class="secondary" id="sector-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>KPIs</h2>
    <div class="grid grid-3">
      <div class="kpi"><div class="value" id="sector-total">0</div><div class="label">Setores</div></div>
      <div class="kpi"><div class="value" id="sector-active">0</div><div class="label">Ativos</div></div>
      <div class="kpi"><div class="value" id="sector-inactive">0</div><div class="label">Inativos</div></div>
    </div>
  </div>
</div>

<div class="card">
  <h2>Setores cadastrados</h2>
  <div id="sector-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('sectors-alert');
  var listEl = document.getElementById('sector-list');
  var form = document.getElementById('sector-form');
  var reloadBtn = document.getElementById('reload-sectors');

  function badgeClass(kind) {
    var map = { clinic: 'badge-success', surgery: 'badge-warning', icu: 'badge-danger', isolation: 'badge-info', observation: 'badge-neutral', other: 'badge-neutral' };
    return map[kind] || 'badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(items) {
    document.getElementById('sector-total').textContent = String(items.length);
    document.getElementById('sector-active').textContent = String(items.filter(function(i) { return i.active; }).length);
    document.getElementById('sector-inactive').textContent = String(items.filter(function(i) { return !i.active; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum setor cadastrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Codigo</th><th>Nome</th><th>Tipo</th><th>Ativo</th><th>Criado</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.code || '—') + '</code></td>' +
        '<td>' + escapeHtml(item.name || '—') + '</td>' +
        '<td><span class="' + badgeClass(item.kind) + '">' + escapeHtml(item.kind || '—') + '</span></td>' +
        '<td>' + (item.active ? 'Sim' : 'Nao') + '</td>' +
        '<td>' + formatDate(item.createdAt) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadSectors() {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/sectors');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar setores.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /sectors', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    items.sort(function(a, b) { return String(a.code).localeCompare(String(b.code)); });
    renderList(items);
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var payload = {
      code: document.getElementById('sector-code').value,
      name: document.getElementById('sector-name').value,
      kind: document.getElementById('sector-kind').value
    };
    var res = await apiRequest('/sectors', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar setor', 'error');
      return;
    }
    showMsg('Setor criado com sucesso.', 'success');
    form.reset();
    loadSectors();
  });

  document.getElementById('sector-clear').addEventListener('click', function() { form.reset(); });
  reloadBtn.addEventListener('click', loadSectors);
  loadSectors();
})();
</script>`;
}
