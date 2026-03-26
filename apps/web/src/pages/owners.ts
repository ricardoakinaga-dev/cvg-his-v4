export function renderOwners(): string {
  return `
<div class="page-header">
  <div>
    <h1>Tutores</h1>
    <p class="subtitle">Cadastro de tutores (owners)</p>
  </div>
  <button id="toggle-owner-form" class="secondary">Novo Tutor</button>
</div>

<div id="owner-alert"></div>

<div id="owner-form-container" class="card hidden" style="margin-bottom:20px;">
  <h2>Novo Tutor</h2>
  <form id="owner-create-form">
    <label>Nome completo <input id="owner-name" required /></label>
    <label>Documento <input id="owner-doc" required /></label>
    <label>Contato <input id="owner-contact" /></label>
    <label>Observacoes <textarea id="owner-notes"></textarea></label>
    <div class="btn-row">
      <button type="submit">Cadastrar</button>
      <button type="button" class="secondary" id="cancel-owner">Cancelar</button>
    </div>
  </form>
</div>

<div class="search-bar">
  <input id="owner-search" placeholder="Buscar tutor por nome ou documento..." />
  <button id="owner-search-btn" class="secondary">Buscar</button>
</div>

<div class="card">
  <div id="owners-list"><div class="loading">Carregando</div></div>
</div>

<div id="owner-detail" class="card hidden" style="margin-top:20px;">
  <h2 id="owner-detail-name"></h2>
  <div id="owner-detail-content"></div>
</div>

<script>
(function() {
  var toggleBtn = document.getElementById('toggle-owner-form');
  var formContainer = document.getElementById('owner-form-container');
  var cancelBtn = document.getElementById('cancel-owner');
  var form = document.getElementById('owner-create-form');
  var alertEl = document.getElementById('owner-alert');
  var searchInput = document.getElementById('owner-search');
  var searchBtn = document.getElementById('owner-search-btn');
  var listEl = document.getElementById('owners-list');

  toggleBtn.addEventListener('click', function() {
    formContainer.classList.toggle('hidden');
  });
  cancelBtn.addEventListener('click', function() {
    formContainer.classList.add('hidden');
  });

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 8000);
  }

  function renderTable(owners) {
    if (!owners || owners.length === 0) {
      listEl.innerHTML = '<div class="empty">Nenhum tutor encontrado</div>';
      return;
    }
    var html = '<table><thead><tr><th>Nome</th><th>Documento</th><th>Contato</th><th>Criado em</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < owners.length; i++) {
      var o = owners[i];
      var contact = (o.contacts && o.contacts.length > 0) ? o.contacts[0].value : (o.phoneMain || '—');
      html += '<tr>' +
        '<td>' + escapeHtml(o.fullName || o.name || '—') + '</td>' +
        '<td>' + escapeHtml(o.documentId || o.document || '—') + '</td>' +
        '<td>' + escapeHtml(contact) + '</td>' +
        '<td>' + formatDate(o.createdAt) + '</td>' +
        '<td><button class="small secondary" onclick="showOwnerDetail(\\'' + escapeHtml(o.id) + '\\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  async function loadOwners(q) {
    var url = q ? '/owners?q=' + encodeURIComponent(q) : '/owners';
    var res = await apiRequest(url);
    if (res.ok) {
      var owners = Array.isArray(res.body) ? res.body : (res.body && res.body.data) || [];
      renderTable(owners);
    } else {
      listEl.innerHTML = '<div class="empty">Erro ao carregar tutores</div>';
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var data = {
      fullName: document.getElementById('owner-name').value,
      documentId: document.getElementById('owner-doc').value,
      contacts: [{ label: 'Principal', value: document.getElementById('owner-contact').value, type: 'phone', primary: true }],
      financialResponsible: true,
      administrativeNotes: document.getElementById('owner-notes').value
    };
    var res = await apiRequest('/owners', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) {
      showMsg('Tutor cadastrado com sucesso!', 'success');
      form.reset();
      formContainer.classList.add('hidden');
      loadOwners();
    } else {
      showMsg('Erro: ' + (res.body && res.body.message ? res.body.message : 'falha ao cadastrar'), 'error');
    }
  });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadOwners(searchInput.value); }, 300);
  });
  searchBtn.addEventListener('click', function() { loadOwners(searchInput.value); });

  window.showOwnerDetail = async function(id) {
    var res = await apiRequest('/owners/' + encodeURIComponent(id));
    if (!res.ok) return;
    var o = res.body;
    var detail = document.getElementById('owner-detail');
    detail.classList.remove('hidden');
    document.getElementById('owner-detail-name').textContent = o.fullName || o.name || id;
    var content = '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin:0">';
    content += '<dt>Documento</dt><dd>' + escapeHtml(o.documentId || o.document || '—') + '</dd>';
    content += '<dt>ID</dt><dd><code>' + escapeHtml(o.id) + '</code></dd>';
    content += '<dt>Criado em</dt><dd>' + formatDate(o.createdAt) + '</dd>';
    content += '</dl>';
    document.getElementById('owner-detail-content').innerHTML = content;
  };

  loadOwners();
})();
</script>`;
}
