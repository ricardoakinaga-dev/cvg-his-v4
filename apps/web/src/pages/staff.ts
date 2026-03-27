export function renderStaff(): string {
  return `
<div class="page-header">
  <div>
    <h1>Equipe</h1>
    <p class="subtitle">Cadastro operacional de profissionais e identificacao por departamento.</p>
  </div>
  <button id="reload-staff" class="secondary">Atualizar</button>
</div>

<div id="staff-alert"></div>

<div class="grid grid-3" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="staff-total">0</div><div class="label">Colaboradores</div></div>
  <div class="kpi"><div class="value" id="staff-active">0</div><div class="label">Ativos</div></div>
  <div class="kpi"><div class="value" id="staff-departments">0</div><div class="label">Departamentos</div></div>
</div>

<div class="search-bar">
  <input id="staff-search" placeholder="Buscar por nome, matricula, cargo ou setor..." />
  <button id="staff-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Equipe cadastrada</h2>
    <div id="staff-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Detalhe do colaborador</h2>
    <div id="staff-detail" class="empty">Selecione um membro da equipe para ver os detalhes.</div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('staff-alert');
  var listEl = document.getElementById('staff-list');
  var detailEl = document.getElementById('staff-detail');
  var searchInput = document.getElementById('staff-search');
  var searchBtn = document.getElementById('staff-search-btn');
  var reloadBtn = document.getElementById('reload-staff');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'active') return 'badge badge-success';
    if (value === 'inactive') return 'badge badge-warning';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 6000);
  }

  function updateStats(items) {
    document.getElementById('staff-total').textContent = String(items.length);
    document.getElementById('staff-active').textContent = String(items.filter(function(item) { return String(item.status || '').toLowerCase() === 'active'; }).length);
    var departments = {};
    for (var i = 0; i < items.length; i++) {
      if (items[i].department) departments[items[i].department] = true;
    }
    document.getElementById('staff-departments').textContent = String(Object.keys(departments).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum colaborador encontrado.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Matricula</th><th>Profissional</th><th>Departamento</th><th>Status</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var member = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(member.employeeCode || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(member.jobTitle || 'Sem cargo') + '</span></td>' +
        '<td>' + escapeHtml(member.fullName || '—') + '</td>' +
        '<td>' + escapeHtml(member.department || '—') + '</td>' +
        '<td><span class="' + badgeClass(member.status) + '">' + escapeHtml(member.status || '—') + '</span></td>' +
        '<td><button class="small secondary" onclick="showStaffDetail(\'' + escapeHtml(member.id) + '\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderDetail(member) {
    detailEl.innerHTML = '' +
      '<div class="grid" style="gap:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
          '<div><strong style="font-size:1rem">' + escapeHtml(member.fullName || member.employeeCode || member.id) + '</strong><div style="font-size:0.82rem;color:#64748b">' + escapeHtml(member.jobTitle || 'Cargo nao informado') + '</div></div>' +
          '<span class="' + badgeClass(member.status) + '">' + escapeHtml(member.status || '—') + '</span>' +
        '</div>' +
        '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin:0">' +
          '<dt>ID</dt><dd><code>' + escapeHtml(member.id) + '</code></dd>' +
          '<dt>Conta</dt><dd><code>' + escapeHtml(member.accountId || '—') + '</code></dd>' +
          '<dt>Usuario</dt><dd>' + escapeHtml(member.userId || 'Nao vinculado') + '</dd>' +
          '<dt>Matricula</dt><dd>' + escapeHtml(member.employeeCode || '—') + '</dd>' +
          '<dt>Departamento</dt><dd>' + escapeHtml(member.department || '—') + '</dd>' +
          '<dt>Cargo</dt><dd>' + escapeHtml(member.jobTitle || '—') + '</dd>' +
          '<dt>Criado em</dt><dd>' + formatDate(member.createdAt) + '</dd>' +
          '<dt>Atualizado em</dt><dd>' + formatDate(member.updatedAt) + '</dd>' +
        '</dl>' +
      '</div>';
  }

  async function loadStaff(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    detailEl.innerHTML = '<div class="empty">Selecione um membro da equipe para ver os detalhes.</div>';
    var res = await apiRequest('/staff');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar staff.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /staff', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(member) {
        return [member.fullName, member.employeeCode, member.department, member.jobTitle, member.status].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    renderList(items);
  }

  window.showStaffDetail = async function(id) {
    var res = await apiRequest('/staff/' + encodeURIComponent(id));
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler o colaborador.', 'error');
      return;
    }
    renderDetail(res.body);
  };

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadStaff(searchInput.value); }, 200);
  });
  searchBtn.addEventListener('click', function() { loadStaff(searchInput.value); });
  reloadBtn.addEventListener('click', function() { loadStaff(searchInput.value); });

  loadStaff('');
})();
</script>`;
}
