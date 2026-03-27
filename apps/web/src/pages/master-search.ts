export function renderMasterSearch(): string {
  return `
<div class="page-header">
  <div>
    <h1>Busca mestre</h1>
    <p class="subtitle">Busca transversal de tutores, pacientes e vinculos no cadastro mestre oficial.</p>
  </div>
  <button id="reload-master-search" class="secondary">Atualizar</button>
</div>

<div id="master-search-alert"></div>

<div class="search-bar">
  <input id="master-search-input" placeholder="Buscar por tutor, paciente, documento, especie ou relacionamento..." />
  <button id="master-search-btn">Buscar</button>
</div>

<div class="grid grid-3" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="master-owners-total">0</div><div class="label">Tutores</div></div>
  <div class="kpi"><div class="value" id="master-patients-total">0</div><div class="label">Pacientes</div></div>
  <div class="kpi"><div class="value" id="master-links-total">0</div><div class="label">Vinculos</div></div>
</div>

<div class="grid grid-3">
  <div class="card">
    <h2>Tutores encontrados</h2>
    <div id="master-owners-list" class="empty">Execute uma busca para ver os tutores.</div>
  </div>
  <div class="card">
    <h2>Pacientes encontrados</h2>
    <div id="master-patients-list" class="empty">Execute uma busca para ver os pacientes.</div>
  </div>
  <div class="card">
    <h2>Vinculos encontrados</h2>
    <div id="master-links-list" class="empty">Execute uma busca para ver os vinculos.</div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('master-search-alert');
  var inputEl = document.getElementById('master-search-input');
  var buttonEl = document.getElementById('master-search-btn');
  var reloadBtn = document.getElementById('reload-master-search');
  var ownersEl = document.getElementById('master-owners-list');
  var patientsEl = document.getElementById('master-patients-list');
  var linksEl = document.getElementById('master-links-list');

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function updateStats(result) {
    document.getElementById('master-owners-total').textContent = String((result.owners || []).length);
    document.getElementById('master-patients-total').textContent = String((result.patients || []).length);
    document.getElementById('master-links-total').textContent = String((result.links || []).length);
  }

  function renderOwners(items) {
    if (!items.length) {
      ownersEl.innerHTML = '<div class="empty">Nenhum tutor encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Tutor</th><th>Documento</th><th>Contato</th><th>Atalho</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var contact = (item.contacts || []).length ? item.contacts[0].value : '—';
      html += '<tr>' +
        '<td><strong>' + escapeHtml(item.fullName || '—') + '</strong></td>' +
        '<td>' + escapeHtml(item.documentId || '—') + '</td>' +
        '<td>' + escapeHtml(contact || '—') + '</td>' +
        '<td><a href="/owners">Abrir tutores</a></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    ownersEl.innerHTML = html;
  }

  function renderPatients(items) {
    if (!items.length) {
      patientsEl.innerHTML = '<div class="empty">Nenhum paciente encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Paciente</th><th>Especie</th><th>Sexo</th><th>Atalho</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(item.name || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(item.patientNumber || '—') + '</span></td>' +
        '<td>' + escapeHtml(item.species || '—') + '</td>' +
        '<td>' + escapeHtml(item.sex || '—') + '</td>' +
        '<td><a href="/patients">Abrir pacientes</a></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    patientsEl.innerHTML = html;
  }

  function renderLinks(items) {
    if (!items.length) {
      linksEl.innerHTML = '<div class="empty">Nenhum vinculo encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Tutor</th><th>Paciente</th><th>Relacao</th><th>Financeiro</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(item.ownerId || '—') + '</code></td>' +
        '<td><code>' + escapeHtml(item.patientId || '—') + '</code></td>' +
        '<td>' + escapeHtml(item.relationshipType || '—') + '</td>' +
        '<td>' + escapeHtml(String(!!item.financialResponsible)) + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    linksEl.innerHTML = html;
  }

  async function runSearch() {
    var query = inputEl.value || '';
    ownersEl.innerHTML = '<div class="loading">Carregando</div>';
    patientsEl.innerHTML = '<div class="loading">Carregando</div>';
    linksEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/master-search?q=' + encodeURIComponent(query));
    if (!res.ok) {
      ownersEl.innerHTML = '<div class="empty">Erro ao buscar tutores.</div>';
      patientsEl.innerHTML = '<div class="empty">Erro ao buscar pacientes.</div>';
      linksEl.innerHTML = '<div class="empty">Erro ao buscar vinculos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao executar /master-search', 'error');
      return;
    }
    var result = res.body || {};
    updateStats(result);
    renderOwners(result.owners || []);
    renderPatients(result.patients || []);
    renderLinks(result.links || []);
  }

  buttonEl.addEventListener('click', runSearch);
  reloadBtn.addEventListener('click', runSearch);

  var searchTimeout;
  inputEl.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(runSearch, 250);
  });
})();
</script>`;
}
