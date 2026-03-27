export function renderUsers(): string {
  return `
<div class="page-header">
  <div>
    <h1>Usuarios</h1>
    <p class="subtitle">Gestao de contas, status operacional e vinculo com a equipe.</p>
  </div>
  <button id="reload-users" class="secondary">Atualizar</button>
</div>

<div id="users-alert"></div>

<div class="grid grid-3" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="users-total">0</div><div class="label">Usuarios</div></div>
  <div class="kpi"><div class="value" id="users-active">0</div><div class="label">Ativos</div></div>
  <div class="kpi"><div class="value" id="users-linked">0</div><div class="label">Vinculados a staff</div></div>
</div>

<div class="search-bar">
  <input id="users-search" placeholder="Buscar por usuario, nome, email ou status..." />
  <button id="users-search-btn" class="secondary">Buscar</button>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Contas cadastradas</h2>
    <div id="users-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Detalhe do usuario</h2>
    <div id="users-detail" class="empty">Selecione um usuario para ver os detalhes.</div>
  </div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('users-alert');
  var listEl = document.getElementById('users-list');
  var detailEl = document.getElementById('users-detail');
  var searchInput = document.getElementById('users-search');
  var searchBtn = document.getElementById('users-search-btn');
  var reloadBtn = document.getElementById('reload-users');

  function badgeClass(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'active') return 'badge badge-success';
    if (value === 'inactive' || value === 'disabled') return 'badge badge-warning';
    if (value === 'blocked' || value === 'suspended') return 'badge badge-danger';
    return 'badge badge-neutral';
  }

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 6000);
  }

  function updateStats(items) {
    document.getElementById('users-total').textContent = String(items.length);
    document.getElementById('users-active').textContent = String(items.filter(function(item) { return String(item.status || '').toLowerCase() === 'active'; }).length);
    document.getElementById('users-linked').textContent = String(items.filter(function(item) { return !!item.staffId; }).length);
  }

  function renderList(items) {
    updateStats(items);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Nenhum usuario encontrado.</div>';
      return;
    }

    var html = '<table><thead><tr><th>Usuario</th><th>Nome</th><th>Status</th><th>Atualizado</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < items.length; i++) {
      var user = items[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(user.username || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(user.email || 'sem email') + '</span></td>' +
        '<td>' + escapeHtml(user.displayName || '—') + '</td>' +
        '<td><span class="' + badgeClass(user.status) + '">' + escapeHtml(user.status || '—') + '</span></td>' +
        '<td>' + formatDate(user.updatedAt) + '</td>' +
        '<td><button class="small secondary" onclick="showUserDetail(\'' + escapeHtml(user.id) + '\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderDetail(user) {
    detailEl.innerHTML = '' +
      '<div class="grid" style="gap:16px">' +
        '<div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
            '<div><strong style="font-size:1rem">' + escapeHtml(user.displayName || user.username || user.id) + '</strong><div style="font-size:0.82rem;color:#64748b">' + escapeHtml(user.email || 'Sem email informado') + '</div></div>' +
            '<span class="' + badgeClass(user.status) + '">' + escapeHtml(user.status || '—') + '</span>' +
          '</div>' +
        '</div>' +
        '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin:0">' +
          '<dt>ID</dt><dd><code>' + escapeHtml(user.id) + '</code></dd>' +
          '<dt>Conta</dt><dd><code>' + escapeHtml(user.accountId || '—') + '</code></dd>' +
          '<dt>Usuario</dt><dd>' + escapeHtml(user.username || '—') + '</dd>' +
          '<dt>Nome</dt><dd>' + escapeHtml(user.displayName || '—') + '</dd>' +
          '<dt>Email</dt><dd>' + escapeHtml(user.email || '—') + '</dd>' +
          '<dt>Staff vinculado</dt><dd>' + escapeHtml(user.staffId || 'Nao vinculado') + '</dd>' +
          '<dt>Criado em</dt><dd>' + formatDate(user.createdAt) + '</dd>' +
          '<dt>Atualizado em</dt><dd>' + formatDate(user.updatedAt) + '</dd>' +
        '</dl>' +
      '</div>';
  }

  async function loadUsers(query) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    detailEl.innerHTML = '<div class="empty">Selecione um usuario para ver os detalhes.</div>';
    var res = await apiRequest('/users');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar usuarios.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /users', 'error');
      return;
    }
    var items = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    if (query) {
      var needle = String(query).toLowerCase();
      items = items.filter(function(user) {
        return [user.username, user.displayName, user.email, user.status].some(function(value) {
          return String(value || '').toLowerCase().indexOf(needle) >= 0;
        });
      });
    }
    renderList(items);
  }

  window.showUserDetail = async function(id) {
    var res = await apiRequest('/users/' + encodeURIComponent(id));
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler o usuario.', 'error');
      return;
    }
    renderDetail(res.body);
  };

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { loadUsers(searchInput.value); }, 200);
  });
  searchBtn.addEventListener('click', function() { loadUsers(searchInput.value); });
  reloadBtn.addEventListener('click', function() { loadUsers(searchInput.value); });

  loadUsers('');
})();
</script>`;
}
