export function renderAccessControl(): string {
  return `
<div class="page-header">
  <div>
    <h1>🔐 Controle de Acesso</h1>
    <p class="subtitle">Perfis, permissões e governança de acesso</p>
  </div>
</div>

<div id="ac-alert"></div>

<!-- Tabs -->
<div class="card" style="margin-bottom:16px;padding:8px 12px;">
  <div style="display:flex;gap:4px;">
    <button class="ac-tab active" data-tab="roles" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--primary-gradient);color:white;font-weight:600;font-size:0.85rem;cursor:pointer;">👥 Perfis (Roles)</button>
    <button class="ac-tab" data-tab="permissions" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:rgba(255,255,255,0.7);font-weight:600;font-size:0.85rem;cursor:pointer;">🔑 Permissões</button>
    <button class="ac-tab" data-tab="matrix" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:rgba(255,255,255,0.7);font-weight:600;font-size:0.85rem;cursor:pointer;">📊 Matriz</button>
  </div>
</div>

<!-- Roles Tab -->
<div id="ac-tab-roles" class="ac-tab-content">
  <div class="card">
    <h2 style="margin-bottom:16px;">Perfis de Acesso</h2>
    <div id="ac-roles-grid"></div>
  </div>
</div>

<!-- Permissions Tab -->
<div id="ac-tab-permissions" class="ac-tab-content" style="display:none;">
  <div class="card">
    <h2 style="margin-bottom:16px;">Permissões do Sistema</h2>
    <div id="ac-permissions-list"></div>
  </div>
</div>

<!-- Matrix Tab -->
<div id="ac-tab-matrix" class="ac-tab-content" style="display:none;">
  <div class="card">
    <h2 style="margin-bottom:16px;">Matriz de Permissões por Perfil</h2>
    <div id="ac-matrix" style="overflow-x:auto;"></div>
  </div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('ac-alert');

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var roleDescriptions = {
    admin: { label: '👑 Administrador', desc: 'Acesso total ao sistema', color: '#ef4444' },
    veterinarian: { label: '🩺 Veterinário', desc: 'Acesso clínico completo', color: '#3b82f6' },
    nurse: { label: '💉 Enfermeiro(a)', desc: 'Execução de prescrição e cuidados', color: '#10b981' },
    reception: { label: '🔔 Recepção', desc: 'Agenda, cadastros, fila', color: '#f59e0b' },
    auditor: { label: '📝 Auditor', desc: 'Leitura e auditoria', color: '#8b5cf6' },
    finance: { label: '💰 Financeiro', desc: 'Faturamento e pagamentos', color: '#06b6d4' },
    inventory: { label: '📦 Estoque', desc: 'Controle de inventário', color: '#84cc16' }
  };

  // --- Tab Switching ---
  document.querySelectorAll('.ac-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = this.dataset.tab;
      document.querySelectorAll('.ac-tab').forEach(function(b) { b.style.background = 'rgba(255,255,255,0.7)'; b.style.color = 'var(--ink)'; });
      this.style.background = 'var(--primary-gradient)'; this.style.color = 'white';
      document.querySelectorAll('.ac-tab-content').forEach(function(c) { c.style.display = 'none'; });
      document.getElementById('ac-tab-' + tab).style.display = 'block';
    });
  });

  // --- Load ---
  function loadData() {
    apiRequest('/access-control').then(function(resp) {
      var data = resp.body || resp;
      renderRoles(data.roles || []);
      renderPermissions(data.permissions || []);
      renderMatrix(data.roles || [], data.permissions || []);
    }).catch(function() {
      // Fallback: use hardcoded data
      renderRoles(getDefaultRoles());
      renderPermissions(getDefaultPermissions());
      renderMatrix(getDefaultRoles(), getDefaultPermissions());
    });
  }

  function getDefaultRoles() {
    return Object.keys(roleDescriptions).map(function(code) {
      return { code: code, name: roleDescriptions[code].label, description: roleDescriptions[code].desc };
    });
  }

  function getDefaultPermissions() {
    var modules = ['owners', 'patients', 'encounters', 'medical-records', 'inpatient', 'prescriptions', 'diagnostics', 'surgeries', 'billing', 'inventory', 'users', 'staff', 'access-control', 'audit', 'notifications'];
    var perms = [];
    modules.forEach(function(m) {
      perms.push({ code: m + '.read', module: m, action: 'read' });
      perms.push({ code: m + '.manage', module: m, action: 'manage' });
    });
    return perms;
  }

  function renderRoles(roles) {
    if (!roles.length) roles = getDefaultRoles();
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';
    roles.forEach(function(r) {
      var info = roleDescriptions[r.code] || { label: r.name || r.code, desc: r.description || '', color: '#6b7280' };
      html += '<div class="card" style="padding:16px;border-top:3px solid ' + info.color + ';">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      html += '<strong style="font-size:1rem;">' + info.label + '</strong>';
      html += '<span class="badge" style="background:' + info.color + '20;color:' + info.color + ';font-size:0.65rem;">' + (r.code || '') + '</span>';
      html += '</div>';
      html += '<div class="muted" style="font-size:0.85rem;">' + escapeHtml(info.desc) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    document.getElementById('ac-roles-grid').innerHTML = html;
  }

  function renderPermissions(perms) {
    if (!perms.length) perms = getDefaultPermissions();
    // Group by module
    var grouped = {};
    perms.forEach(function(p) {
      var mod = p.module || p.code.split('.')[0];
      if (!grouped[mod]) grouped[mod] = [];
      grouped[mod].push(p);
    });

    var html = '';
    Object.keys(grouped).sort().forEach(function(mod) {
      html += '<div style="margin-bottom:16px;">';
      html += '<h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 8px;">📦 ' + mod + '</h3>';
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
      grouped[mod].forEach(function(p) {
        var isManage = (p.action === 'manage') || (p.code || '').includes('.manage');
        html += '<span class="badge" style="font-size:0.75rem;padding:4px 10px;background:' + (isManage ? 'var(--danger-soft);color:var(--danger)' : 'var(--success-soft);color:var(--success)') + ';">' + escapeHtml(p.code || p.name) + '</span>';
      });
      html += '</div></div>';
    });
    document.getElementById('ac-permissions-list').innerHTML = html;
  }

  function renderMatrix(roles, perms) {
    if (!roles.length) roles = getDefaultRoles();
    if (!perms.length) perms = getDefaultPermissions();
    
    var modules = [];
    var seen = {};
    perms.forEach(function(p) {
      var mod = p.module || p.code.split('.')[0];
      if (!seen[mod]) { seen[mod] = true; modules.push(mod); }
    });

    var html = '<table style="width:100%;font-size:0.75rem;"><thead><tr><th style="text-align:left;padding:8px;min-width:120px;">Módulo</th>';
    roles.forEach(function(r) {
      var info = roleDescriptions[r.code] || { label: r.code };
      html += '<th style="padding:8px;text-align:center;min-width:80px;">' + info.label + '</th>';
    });
    html += '</tr></thead><tbody>';

    modules.forEach(function(mod) {
      html += '<tr><td style="padding:8px;font-weight:600;">' + mod + '</td>';
      roles.forEach(function(r) {
        var hasRead = true; // Simplified: most roles can read
        var hasManage = r.code === 'admin' || r.code === 'veterinarian';
        // Customize per module
        if (mod === 'billing' || mod === 'inventory') hasManage = r.code === 'admin' || r.code === 'finance' || r.code === 'inventory';
        if (mod === 'audit') hasManage = r.code === 'admin' || r.code === 'auditor';
        if (mod === 'users' || mod === 'access-control') hasManage = r.code === 'admin';
        if (r.code === 'reception') hasManage = mod === 'owners' || mod === 'patients' || mod === 'encounters' || mod === 'appointments';
        
        html += '<td style="text-align:center;padding:8px;">';
        if (hasManage) html += '<span style="color:var(--danger);font-size:1rem;" title="Leitura + Escrita">🔓</span>';
        else if (hasRead) html += '<span style="color:var(--success);font-size:1rem;" title="Somente Leitura">👁️</span>';
        else html += '<span style="color:var(--ink-muted);font-size:1rem;" title="Sem acesso">🔒</span>';
        html += '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div style="margin-top:12px;font-size:0.75rem;color:var(--ink-muted);">🔓 = Leitura + Escrita &nbsp; 👁️ = Somente Leitura &nbsp; 🔒 = Sem acesso</div>';
    document.getElementById('ac-matrix').innerHTML = html;
  }

  // --- Init ---
  loadData();
})();
</script>
`;
}
