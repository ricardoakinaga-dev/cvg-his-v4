export function renderUsers(): string {
  return `
<div class="page-header">
  <div>
    <h1>👤 Usuários</h1>
    <p class="subtitle">Gestão de usuários, perfis e setores</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="user-new-btn" style="white-space:nowrap;">+ Novo Usuário</button>
    <button id="reload-users" class="secondary">Atualizar</button>
  </div>
</div>

<div id="users-alert"></div>

<!-- Stats -->
<div class="dashboard-grid" style="margin-bottom:16px;">
  <div class="stat-card"><div class="stat-value" id="users-total">-</div><div class="stat-label">Total Usuários</div></div>
  <div class="stat-card"><div class="stat-value" id="users-active">-</div><div class="stat-label">Ativos</div></div>
  <div class="stat-card"><div class="stat-value" id="users-admin">-</div><div class="stat-label">Administradores</div></div>
  <div class="stat-card"><div class="stat-value" id="users-sectors">-</div><div class="stat-label">Setores</div></div>
</div>

<!-- Filters -->
<div class="card" style="margin-bottom:16px;padding:12px 16px;">
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
    <input id="user-search" placeholder="Buscar por nome, e-mail..." style="flex:1;min-width:200px;" />
    <select id="user-filter-role" style="min-width:140px;">
      <option value="">Todos perfis</option>
      <option value="admin">👑 Admin</option>
      <option value="veterinarian">🩺 Veterinário</option>
      <option value="nurse">💉 Enfermagem</option>
      <option value="reception">🔔 Recepção</option>
      <option value="auditor">📝 Auditor</option>
    </select>
    <select id="user-filter-status" style="min-width:120px;">
      <option value="">Todos status</option>
      <option value="active">✅ Ativo</option>
      <option value="inactive">⏸ Inativo</option>
    </select>
    <button id="user-search-btn" class="secondary">Buscar</button>
  </div>
</div>

<!-- Users Grid -->
<div class="card">
  <div id="users-grid"></div>
</div>

<!-- Form Modal -->
<div id="user-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="user-form-title" style="margin:0;">Novo Usuário</h2>
      <button class="secondary small" id="user-form-close" type="button">✕</button>
    </div>
    <form id="user-form">
      <input type="hidden" id="user-edit-id" />
      
      <!-- Bloco 1: Dados Pessoais -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">👤 Dados Pessoais</h3>
        <div class="grid grid-2">
          <label>Nome Completo *<input id="user-name" required placeholder="Nome completo" /></label>
          <label>E-mail *<input id="user-email" type="email" required placeholder="email@exemplo.com" /></label>
        </div>
        <div class="grid grid-2">
          <label>Usuário (login) *<input id="user-username" required placeholder="nome.sobrenome" /></label>
          <label>Telefone<input id="user-phone" placeholder="(11) 99999-9999" /></label>
        </div>
      </div>

      <!-- Bloco 2: Setor e Perfil -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🏢 Setor e Perfil</h3>
        <div class="grid grid-2">
          <label>Setor *
            <select id="user-sector" required>
              <option value="">Selecione...</option>
              <option value="clinica_geral">🩺 Clínica Geral</option>
              <option value="centro_cirurgico">💉 Centro Cirúrgico</option>
              <option value="uti_veterinaria">🚨 UTI Veterinária</option>
              <option value="diagnostico_imagem">📷 Diagnóstico por Imagem</option>
              <option value="laboratorio">🔬 Laboratório</option>
              <option value="recepcao">🔔 Recepção</option>
              <option value="administrativo">⚙️ Administrativo</option>
              <option value="farmacia">💊 Farmácia</option>
              <option value="governanca">🛡️ Governança</option>
            </select>
          </label>
          <label>Perfil (Role) *
            <select id="user-role" required>
              <option value="">Selecione...</option>
              <option value="admin">👑 Administrador</option>
              <option value="veterinarian">🩺 Veterinário</option>
              <option value="nurse">💉 Enfermeiro(a)</option>
              <option value="reception">🔔 Recepcionista</option>
              <option value="auditor">📝 Auditor</option>
              <option value="finance">💰 Financeiro</option>
              <option value="inventory">📦 Estoque</option>
            </select>
          </label>
        </div>
        <div class="grid grid-2">
          <label>Cargo/ Função<input id="user-job-title" placeholder="Ex: Médico Veterinário Sênior" /></label>
          <label>Código Funcionário<input id="user-employee-code" placeholder="Ex: VET-001" /></label>
        </div>
      </div>

      <!-- Bloco 3: Segurança -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🔐 Segurança</h3>
        <div class="grid grid-2">
          <label>Senha *<input id="user-password" type="password" required placeholder="Mínimo 8 caracteres" /></label>
          <label>Confirmar Senha *<input id="user-password-confirm" type="password" required placeholder="Repita a senha" /></label>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <input type="checkbox" id="user-active" checked style="width:auto;" />
          <span style="font-size:0.85rem;">Usuário ativo</span>
        </label>
      </div>

      <div class="btn-row">
        <button type="submit" id="user-submit">Salvar Usuário</button>
        <button type="button" class="secondary" id="user-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Profile Modal (self-management) -->
<div id="user-profile-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:500px;margin:auto;" id="user-profile-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('users-alert');
  var formOverlay = document.getElementById('user-form-overlay');
  var profileOverlay = document.getElementById('user-profile-overlay');

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var roleLabels = { admin: '👑 Admin', veterinarian: '🩺 Veterinário', nurse: '💉 Enfermeiro(a)', reception: '🔔 Recepção', auditor: '📝 Auditor', finance: '💰 Financeiro', inventory: '📦 Estoque' };
  var sectorLabels = { clinica_geral: '🩺 Clínica Geral', centro_cirurgico: '💉 Centro Cirúrgico', uti_veterinaria: '🚨 UTI', diagnostico_imagem: '📷 Diagnóstico', laboratorio: '🔬 Laboratório', recepcao: '🔔 Recepção', administrativo: '⚙️ Admin', farmacia: '💊 Farmácia', governanca: '🛡️ Governança' };

  // --- Load ---
  function loadUsers() {
    apiRequest('/users').then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      var search = document.getElementById('user-search').value.toLowerCase();
      var role = document.getElementById('user-filter-role').value;
      var status = document.getElementById('user-filter-status').value;
      
      if (search) items = items.filter(function(u) { return (u.displayName || u.fullName || u.username || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search); });
      if (status) items = items.filter(function(u) { return u.status === status; });
      
      renderStats(items);
      renderGrid(items);
    });
  }

  function renderStats(items) {
    document.getElementById('users-total').textContent = items.length;
    document.getElementById('users-active').textContent = items.filter(function(u) { return u.status === 'active'; }).length;
    var sectors = new Set();
    items.forEach(function(u) { if (u.department || u.sector) sectors.add(u.department || u.sector); });
    document.getElementById('users-sectors').textContent = sectors.size || '-';
  }

  function renderGrid(items) {
    if (!items.length) {
      document.getElementById('users-grid').innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">Nenhum usuário encontrado</div></div>';
      return;
    }

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';
    items.forEach(function(u) {
      var statusBadge = u.status === 'active' ? 'success' : 'warning';
      var roleLabel = roleLabels[u.roleCode] || roleLabels[u.role] || u.role || '-';
      var sectorLabel = sectorLabels[u.department] || sectorLabels[u.sector] || u.department || '-';
      var name = u.displayName || u.fullName || u.username || '-';
      
      html += '<div class="card" style="padding:16px;cursor:pointer;transition:box-shadow 0.15s,transform 0.15s;" onmouseover="this.style.boxShadow=\\'var(--shadow-md)\\';this.style.transform=\\'translateY(-2px)\\'" onmouseout="this.style.boxShadow=\\'\\';this.style.transform=\\'\\'" onclick="showUserProfile(\\'' + u.id + '\\')">';
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">';
      html += '<div style="width:40px;height:40px;background:var(--primary-gradient);border-radius:50%;display:grid;place-items:center;color:white;font-weight:700;font-size:1rem;">' + (name.charAt(0) || '?').toUpperCase() + '</div>';
      html += '<span class="badge badge-' + statusBadge + '" style="font-size:0.65rem;">' + (u.status || 'unknown') + '</span>';
      html += '</div>';
      html += '<strong style="font-size:0.95rem;">' + escapeHtml(name) + '</strong>';
      html += '<div class="muted" style="font-size:0.8rem;margin-top:2px;">@' + escapeHtml(u.username || '-') + '</div>';
      html += '<div style="font-size:0.8rem;margin-top:6px;color:var(--ink-soft);">' + escapeHtml(u.email || '-') + '</div>';
      html += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">';
      html += '<span class="badge" style="font-size:0.65rem;background:var(--primary-glow);color:var(--primary);">' + roleLabel + '</span>';
      if (sectorLabel !== '-') html += '<span class="badge" style="font-size:0.65rem;background:rgba(13,148,136,0.1);color:var(--accent);">' + sectorLabel + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    document.getElementById('users-grid').innerHTML = html;
  }

  // --- User Profile Detail ---
  window.showUserProfile = function(id) {
    apiRequest('/users/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar', 'error'); return; }
      var u = resp.body || resp;
      var name = u.displayName || u.fullName || u.username;
      var roleLabel = roleLabels[u.roleCode] || roleLabels[u.role] || '-';
      var sectorLabel = sectorLabels[u.department] || sectorLabels[u.sector] || '-';
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">Perfil do Usuário</h2><button class="secondary small" onclick="document.getElementById(\\'user-profile-overlay\\').style.display=\\'none\\'">✕</button></div>';
      html += '<div style="display:grid;gap:14px;">';
      
      // Avatar + name
      html += '<div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--primary-glow);border-radius:var(--radius);">';
      html += '<div style="width:56px;height:56px;background:var(--primary-gradient);border-radius:50%;display:grid;place-items:center;color:white;font-weight:700;font-size:1.5rem;">' + (name.charAt(0) || '?').toUpperCase() + '</div>';
      html += '<div><strong style="font-size:1.1rem;">' + escapeHtml(name) + '</strong><div class="muted">@' + escapeHtml(u.username || '-') + '</div></div>';
      html += '</div>';
      
      // Info grid
      html += '<div class="grid grid-2" style="gap:10px;">';
      html += '<div><strong style="font-size:0.7rem;text-transform:uppercase;color:var(--ink-muted);">E-mail</strong><div>' + escapeHtml(u.email || '-') + '</div></div>';
      html += '<div><strong style="font-size:0.7rem;text-transform:uppercase;color:var(--ink-muted);">Perfil</strong><div>' + roleLabel + '</div></div>';
      html += '<div><strong style="font-size:0.7rem;text-transform:uppercase;color:var(--ink-muted);">Setor</strong><div>' + sectorLabel + '</div></div>';
      html += '<div><strong style="font-size:0.7rem;text-transform:uppercase;color:var(--ink-muted);">Status</strong><div><span class="badge badge-' + (u.status === 'active' ? 'success' : 'warning') + '">' + (u.status || '-') + '</span></div></div>';
      html += '</div>';
      
      // Actions
      html += '<div class="btn-row">';
      html += '<button class="secondary" onclick="editUser(\\'' + u.id + '\\');document.getElementById(\\'user-profile-overlay\\').style.display=\\'none\\'">✏️ Editar</button>';
      html += '</div>';
      
      html += '</div>';
      document.getElementById('user-profile-content').innerHTML = html;
      profileOverlay.style.display = 'grid';
    });
  };

  // --- Form ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('user-form-title').textContent = editData ? 'Editar Usuário' : 'Novo Usuário';
    document.getElementById('user-edit-id').value = editData?.id || '';
    
    if (editData) {
      document.getElementById('user-name').value = editData.displayName || editData.fullName || '';
      document.getElementById('user-email').value = editData.email || '';
      document.getElementById('user-username').value = editData.username || '';
      document.getElementById('user-phone').value = editData.phone || '';
      document.getElementById('user-sector').value = editData.department || editData.sector || '';
      document.getElementById('user-role').value = editData.roleCode || editData.role || '';
      document.getElementById('user-job-title').value = editData.jobTitle || '';
      document.getElementById('user-employee-code').value = editData.employeeCode || '';
      document.getElementById('user-active').checked = editData.status === 'active';
      document.getElementById('user-password').required = false;
      document.getElementById('user-password-confirm').required = false;
      document.getElementById('user-password').placeholder = 'Deixe vazio para manter atual';
    } else {
      document.getElementById('user-form').reset();
      document.getElementById('user-active').checked = true;
      document.getElementById('user-password').required = true;
      document.getElementById('user-password-confirm').required = true;
    }
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  document.getElementById('user-new-btn').addEventListener('click', function() { showForm(); });
  document.getElementById('user-form-close').addEventListener('click', hideForm);
  document.getElementById('user-cancel').addEventListener('click', hideForm);

  window.editUser = function(id) {
    apiRequest('/users/' + id).then(function(resp) {
      if (resp.ok) showForm(resp.body || resp);
    });
  };

  // --- Submit ---
  document.getElementById('user-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('user-edit-id').value;
    var pwd = document.getElementById('user-password').value;
    var pwdConfirm = document.getElementById('user-password-confirm').value;
    
    if (pwd && pwd !== pwdConfirm) { showAlert('As senhas não coincidem.', 'error'); return; }
    if (!editId && pwd.length < 8) { showAlert('Senha deve ter pelo menos 8 caracteres.', 'error'); return; }

    var body = {
      displayName: document.getElementById('user-name').value,
      fullName: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      username: document.getElementById('user-username').value,
      department: document.getElementById('user-sector').value,
      roleCode: document.getElementById('user-role').value,
      jobTitle: document.getElementById('user-job-title').value || undefined,
      employeeCode: document.getElementById('user-employee-code').value || undefined,
      status: document.getElementById('user-active').checked ? 'active' : 'inactive'
    };
    if (pwd) body.password = pwd;

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/users/' + editId : '/users';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) { showAlert(editId ? 'Usuário atualizado!' : 'Usuário criado!', 'success'); hideForm(); loadUsers(); }
      else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  });

  // --- Search/Filters ---
  document.getElementById('user-search-btn').addEventListener('click', loadUsers);
  document.getElementById('user-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') loadUsers(); });
  document.getElementById('user-filter-role').addEventListener('change', loadUsers);
  document.getElementById('user-filter-status').addEventListener('change', loadUsers);
  document.getElementById('reload-users').addEventListener('click', loadUsers);

  // --- Init ---
  loadUsers();
})();
</script>
`;
}
