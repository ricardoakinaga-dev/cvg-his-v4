export function renderAccessControl(): string {
  return `
<div class="page-header">
  <div>
    <h1>Permissoes</h1>
    <p class="subtitle">Catalogo de roles e permissoes publicado pelo backend oficial.</p>
  </div>
  <button id="reload-access" class="secondary">Atualizar</button>
</div>

<div id="access-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="roles-total">0</div><div class="label">Roles</div></div>
  <div class="kpi"><div class="value" id="permissions-total">0</div><div class="label">Permissoes</div></div>
  <div class="kpi"><div class="value" id="modules-total">0</div><div class="label">Modulos</div></div>
  <div class="kpi"><div class="value" id="critical-total">0</div><div class="label">Roles criticas</div></div>
</div>

<div class="grid grid-2">
  <div class="card">
    <h2>Roles</h2>
    <div id="roles-list"><div class="loading">Carregando</div></div>
  </div>
  <div class="card">
    <h2>Permissoes</h2>
    <div id="permissions-list"><div class="loading">Carregando</div></div>
  </div>
</div>

<div class="card" style="margin-top:20px;">
  <h2>Detalhe da role</h2>
  <div id="role-detail" class="empty">Selecione uma role para ver os codigos de permissao.</div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('access-alert');
  var rolesEl = document.getElementById('roles-list');
  var permissionsEl = document.getElementById('permissions-list');
  var detailEl = document.getElementById('role-detail');
  var reloadBtn = document.getElementById('reload-access');
  var latestRoles = [];

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 6000);
  }

  function updateStats(roles, permissions) {
    document.getElementById('roles-total').textContent = String(roles.length);
    document.getElementById('permissions-total').textContent = String(permissions.length);
    var modules = {};
    for (var i = 0; i < permissions.length; i++) {
      if (permissions[i].module) modules[permissions[i].module] = true;
    }
    document.getElementById('modules-total').textContent = String(Object.keys(modules).length);
    document.getElementById('critical-total').textContent = String(roles.filter(function(role) { return (role.permissionCodes || []).length >= 4; }).length);
  }

  function renderRoles(roles) {
    if (!roles.length) {
      rolesEl.innerHTML = '<div class="empty">Nenhuma role publicada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Role</th><th>Codigo</th><th>Permissoes</th><th>Acoes</th></tr></thead><tbody>';
    for (var i = 0; i < roles.length; i++) {
      var role = roles[i];
      html += '<tr>' +
        '<td><strong>' + escapeHtml(role.name || '—') + '</strong><br><span style="font-size:0.78rem;color:#64748b">' + escapeHtml(role.description || 'Sem descricao') + '</span></td>' +
        '<td><code>' + escapeHtml(role.code || role.id || '—') + '</code></td>' +
        '<td>' + escapeHtml(String((role.permissionCodes || []).length)) + '</td>' +
        '<td><button class="small secondary" onclick="showRoleDetail(\'' + escapeHtml(role.id) + '\')">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    rolesEl.innerHTML = html;
  }

  function renderPermissions(permissions) {
    if (!permissions.length) {
      permissionsEl.innerHTML = '<div class="empty">Nenhuma permissao publicada.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Codigo</th><th>Modulo</th><th>Descricao</th></tr></thead><tbody>';
    for (var i = 0; i < permissions.length; i++) {
      var permission = permissions[i];
      html += '<tr>' +
        '<td><code>' + escapeHtml(permission.code || permission.id || '—') + '</code></td>' +
        '<td>' + escapeHtml(permission.module || '—') + '</td>' +
        '<td>' + escapeHtml(permission.description || '—') + '</td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    permissionsEl.innerHTML = html;
  }

  function renderRoleDetail(role) {
    var permissionCodes = role.permissionCodes || [];
    var chips = permissionCodes.length
      ? permissionCodes.map(function(code) { return '<span class="badge badge-info" style="margin:0 8px 8px 0">' + escapeHtml(code) + '</span>'; }).join('')
      : '<span class="empty" style="display:block;padding:0;color:#64748b">Sem permissoes vinculadas.</span>';
    detailEl.innerHTML = '' +
      '<div class="grid" style="gap:16px">' +
        '<div><strong style="font-size:1rem">' + escapeHtml(role.name || role.code || role.id) + '</strong><div style="font-size:0.82rem;color:#64748b">' + escapeHtml(role.description || 'Sem descricao') + '</div></div>' +
        '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin:0">' +
          '<dt>ID</dt><dd><code>' + escapeHtml(role.id || '—') + '</code></dd>' +
          '<dt>Codigo</dt><dd><code>' + escapeHtml(role.code || '—') + '</code></dd>' +
          '<dt>Total de permissoes</dt><dd>' + escapeHtml(String(permissionCodes.length)) + '</dd>' +
        '</dl>' +
        '<div><strong style="display:block;margin-bottom:10px">Permissoes vinculadas</strong>' + chips + '</div>' +
      '</div>';
  }

  async function loadAccess() {
    rolesEl.innerHTML = '<div class="loading">Carregando</div>';
    permissionsEl.innerHTML = '<div class="loading">Carregando</div>';
    detailEl.innerHTML = '<div class="empty">Selecione uma role para ver os codigos de permissao.</div>';
    var res = await apiRequest('/access-control');
    if (!res.ok) {
      rolesEl.innerHTML = '<div class="empty">Erro ao carregar roles.</div>';
      permissionsEl.innerHTML = '<div class="empty">Erro ao carregar permissoes.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /access-control', 'error');
      return;
    }
    var roles = (res.body && res.body.roles) || [];
    var permissions = (res.body && res.body.permissions) || [];
    latestRoles = roles;
    updateStats(roles, permissions);
    renderRoles(roles);
    renderPermissions(permissions);
  }

  window.showRoleDetail = function(id) {
    for (var i = 0; i < latestRoles.length; i++) {
      if (String(latestRoles[i].id) === String(id)) {
        renderRoleDetail(latestRoles[i]);
        return;
      }
    }
  };

  reloadBtn.addEventListener('click', loadAccess);
  loadAccess();
})();
</script>`;
}
