export function renderAccessControl(): string {
  return `
<div class="page-header">
  <div>
    <h1>🔐 Governança de Acesso</h1>
    <p class="subtitle">Usuários, equipes, setores e matriz de permissões enterprise</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="ac-reload" class="secondary">Atualizar</button>
  </div>
</div>

<div id="ac-alert"></div>

<div class="card" style="margin-bottom:16px;padding:8px 12px;">
  <div style="display:flex;gap:4px;flex-wrap:wrap;">
    <button class="ac-tab active" data-tab="legacy">Legado</button>
    <button class="ac-tab" data-tab="teams">Equipes</button>
    <button class="ac-tab" data-tab="sectors">Setores</button>
    <button class="ac-tab" data-tab="users">Usuários</button>
    <button class="ac-tab" data-tab="matrix">Matriz</button>
  </div>
</div>

<div id="ac-tab-legacy" class="ac-tab-content">
  <div class="dashboard-grid" style="margin-bottom:16px;">
    <div class="stat-card"><div class="stat-value" id="ac-stat-roles">-</div><div class="stat-label">Roles legadas</div></div>
    <div class="stat-card"><div class="stat-value" id="ac-stat-perms">-</div><div class="stat-label">Permissões</div></div>
    <div class="stat-card"><div class="stat-value" id="ac-stat-teams">-</div><div class="stat-label">Equipes</div></div>
    <div class="stat-card"><div class="stat-value" id="ac-stat-sectors">-</div><div class="stat-label">Setores org.</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h2 style="margin-bottom:16px;">Compatibilidade Legada</h2>
    <div id="ac-legacy-roles"></div>
  </div>
  <div class="card">
    <h2 style="margin-bottom:16px;">Matriz legada por role</h2>
    <div id="ac-legacy-matrix" style="overflow:auto;"></div>
  </div>
</div>

<div id="ac-tab-teams" class="ac-tab-content" style="display:none;">
  <div class="card" style="margin-bottom:16px;">
    <h2 style="margin-bottom:16px;">Nova equipe</h2>
    <div class="grid grid-3">
      <label>Código<input id="ac-team-code" placeholder="ex: equipe_cirurgica" /></label>
      <label>Nome<input id="ac-team-name" placeholder="Equipe Cirúrgica" /></label>
      <label>Descrição<input id="ac-team-description" placeholder="Agrupamento organizacional" /></label>
    </div>
    <div class="btn-row">
      <button id="ac-team-create">Criar equipe</button>
    </div>
  </div>
  <div class="card">
    <h2 style="margin-bottom:16px;">Equipes configuradas</h2>
    <div id="ac-teams-list"></div>
  </div>
</div>

<div id="ac-tab-sectors" class="ac-tab-content" style="display:none;">
  <div class="card" style="margin-bottom:16px;">
    <h2 style="margin-bottom:16px;">Novo setor organizacional</h2>
    <div class="grid grid-3">
      <label>Código<input id="ac-sector-code" placeholder="ex: administrativo" /></label>
      <label>Nome<input id="ac-sector-name" placeholder="Administrativo" /></label>
      <label>Descrição<input id="ac-sector-description" placeholder="Area organizacional" /></label>
    </div>
    <div class="btn-row">
      <button id="ac-sector-create">Criar setor</button>
    </div>
  </div>
  <div class="card">
    <h2 style="margin-bottom:16px;">Setores organizacionais</h2>
    <div id="ac-sectors-list"></div>
  </div>
</div>

<div id="ac-tab-users" class="ac-tab-content" style="display:none;">
  <div class="card">
    <h2 style="margin-bottom:16px;">Vínculos e herança do usuário</h2>
    <div class="grid grid-3" style="margin-bottom:16px;">
      <label>Usuário
        <select id="ac-user-select"></select>
      </label>
    </div>
    <div id="ac-user-detail"></div>
  </div>
</div>

<div id="ac-tab-matrix" class="ac-tab-content" style="display:none;">
  <div class="card" style="margin-bottom:16px;">
    <div class="grid grid-3">
      <label>Modo
        <select id="ac-matrix-mode">
          <option value="team">Matriz por equipe</option>
          <option value="sector">Matriz por setor</option>
          <option value="user">Matriz por usuário</option>
        </select>
      </label>
      <label id="ac-matrix-user-wrap" style="display:none;">Usuário
        <select id="ac-matrix-user"></select>
      </label>
    </div>
  </div>
  <div class="card">
    <div id="ac-matrix-body" style="overflow:auto;"></div>
  </div>
</div>

<script>
(function () {
  var alertBox = document.getElementById('ac-alert');
  var state = {
    roles: [],
    permissions: [],
    teams: [],
    sectors: [],
    users: [],
    assignments: { userPermissions: [], teamPermissions: [], sectorPermissions: [] },
    memberships: { userTeams: [], userSectors: [] },
    legacyRoles: [],
    effective: null
  };

  function showAlert(message, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + escapeHtml(message) + '</div>';
    setTimeout(function () { alertBox.innerHTML = ''; }, 4000);
  }

  function activateTab(tab) {
    document.querySelectorAll('.ac-tab').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
      btn.style.background = btn.dataset.tab === tab ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.7)';
      btn.style.color = btn.dataset.tab === tab ? 'white' : 'var(--ink)';
      btn.style.border = '1px solid var(--line)';
      btn.style.borderRadius = 'var(--radius-sm)';
      btn.style.padding = '8px 16px';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
    });
    document.querySelectorAll('.ac-tab-content').forEach(function(content) {
      content.style.display = 'none';
    });
    document.getElementById('ac-tab-' + tab).style.display = 'block';
  }

  document.querySelectorAll('.ac-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { activateTab(this.dataset.tab); });
  });

  document.getElementById('ac-reload').addEventListener('click', loadData);
  document.getElementById('ac-team-create').addEventListener('click', createTeam);
  document.getElementById('ac-sector-create').addEventListener('click', createSector);
  document.getElementById('ac-matrix-mode').addEventListener('change', renderMatrix);
  document.getElementById('ac-user-select').addEventListener('change', renderSelectedUser);
  document.getElementById('ac-matrix-user').addEventListener('change', renderMatrix);

  function loadData() {
    apiRequest('/access-control').then(function(resp) {
      var data = resp.body || resp;
      state.roles = data.roles || [];
      state.permissions = data.permissions || [];
      state.teams = data.teams || [];
      state.sectors = data.sectors || [];
      state.users = data.users || [];
      state.assignments = data.assignments || state.assignments;
      state.memberships = data.memberships || state.memberships;
      state.legacyRoles = data.legacyRoles || [];
      renderAll();
    }).catch(function(err) {
      showAlert('Falha ao carregar governança de acesso: ' + String(err), 'error');
    });
  }

  function renderAll() {
    document.getElementById('ac-stat-roles').textContent = state.roles.length;
    document.getElementById('ac-stat-perms').textContent = state.permissions.length;
    document.getElementById('ac-stat-teams').textContent = state.teams.length;
    document.getElementById('ac-stat-sectors').textContent = state.sectors.length;
    renderLegacy();
    renderTeams();
    renderSectors();
    renderUsers();
    renderMatrix();
  }

  function renderLegacy() {
    var rolesHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">';
    state.roles.forEach(function(role) {
      rolesHtml += '<div class="card" style="padding:14px;border-left:4px solid var(--primary);">';
      rolesHtml += '<strong>' + escapeHtml(role.name || role.code) + '</strong>';
      rolesHtml += '<div class="muted" style="font-size:0.82rem;margin-top:6px;">' + escapeHtml(role.description || role.code) + '</div>';
      rolesHtml += '<div style="margin-top:10px;font-size:0.75rem;color:var(--ink-muted);">' + role.permissionCodes.length + ' permissões legadas</div>';
      rolesHtml += '</div>';
    });
    rolesHtml += '</div>';
    document.getElementById('ac-legacy-roles').innerHTML = rolesHtml;

    var grouped = groupPermissions();
    var html = '<table style="width:100%;font-size:0.76rem;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid var(--line);">Permissão</th>';
    state.roles.forEach(function(role) {
      html += '<th style="padding:8px;border-bottom:1px solid var(--line);min-width:110px;">' + escapeHtml(role.code) + '</th>';
    });
    html += '</tr></thead><tbody>';
    Object.keys(grouped).forEach(function(moduleName) {
      grouped[moduleName].forEach(function(permission) {
        html += '<tr><td style="padding:8px;border-bottom:1px solid var(--line);"><strong>' + escapeHtml(permission.code) + '</strong><div class="muted" style="font-size:0.72rem;">' + escapeHtml(permission.description || '') + '</div></td>';
        state.roles.forEach(function(role) {
          var has = (role.permissionCodes || []).includes(permission.code);
          html += '<td style="padding:8px;text-align:center;border-bottom:1px solid var(--line);">' + (has ? '✅' : '—') + '</td>';
        });
        html += '</tr>';
      });
    });
    html += '</tbody></table>';
    document.getElementById('ac-legacy-matrix').innerHTML = html;
  }

  function renderTeams() {
    if (!state.teams.length) {
      document.getElementById('ac-teams-list').innerHTML = '<div class="empty-state"><div class="empty-state-text">Nenhuma equipe configurada</div></div>';
      return;
    }
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">';
    state.teams.forEach(function(team) {
      html += cardEntity(team, 'team');
    });
    html += '</div>';
    document.getElementById('ac-teams-list').innerHTML = html;
  }

  function renderSectors() {
    if (!state.sectors.length) {
      document.getElementById('ac-sectors-list').innerHTML = '<div class="empty-state"><div class="empty-state-text">Nenhum setor organizacional configurado</div></div>';
      return;
    }
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">';
    state.sectors.forEach(function(sector) {
      html += cardEntity(sector, 'sector');
    });
    html += '</div>';
    document.getElementById('ac-sectors-list').innerHTML = html;
  }

  function renderUsers() {
    var select = document.getElementById('ac-user-select');
    var matrixUserSelect = document.getElementById('ac-matrix-user');
    var options = '<option value="">Selecione um usuário</option>';
    state.users.forEach(function(user) {
      options += '<option value="' + user.id + '">' + escapeHtml(user.displayName || user.username) + '</option>';
    });
    select.innerHTML = options;
    matrixUserSelect.innerHTML = options;
    if (!select.value && state.users.length) {
      select.value = state.users[0].id;
    }
    if (!matrixUserSelect.value && state.users.length) {
      matrixUserSelect.value = state.users[0].id;
    }
    renderSelectedUser();
  }

  function renderSelectedUser() {
    var userId = document.getElementById('ac-user-select').value;
    var host = document.getElementById('ac-user-detail');
    if (!userId) {
      host.innerHTML = '<div class="empty-state"><div class="empty-state-text">Selecione um usuário para editar vínculos</div></div>';
      return;
    }
    var user = state.users.find(function(item) { return item.id === userId; });
    var memberships = getMemberships(userId);
    var legacy = getLegacyRoles(userId);
    var html = '<div style="display:grid;gap:16px;">';
    html += '<div style="padding:14px;border:1px solid var(--line);border-radius:var(--radius);background:rgba(255,255,255,0.78);">';
    html += '<strong style="font-size:1rem;">' + escapeHtml(user.displayName || user.username) + '</strong>';
    html += '<div class="muted" style="margin-top:6px;">' + escapeHtml(user.email || '') + '</div>';
    html += '</div>';
    html += '<div class="grid grid-3">';
    html += '<div><strong style="display:block;margin-bottom:8px;">Roles legadas</strong>' + renderRoleChecklist(legacy) + '<button class="secondary small" onclick="window.saveLegacyRoles()">Salvar roles</button></div>';
    html += '<div><strong style="display:block;margin-bottom:8px;">Equipes</strong>' + renderMembershipChecklist('team', memberships.teams) + '<button class="secondary small" onclick="window.saveUserTeams()">Salvar equipes</button></div>';
    html += '<div><strong style="display:block;margin-bottom:8px;">Setores org.</strong>' + renderMembershipChecklist('sector', memberships.sectors) + '<button class="secondary small" onclick="window.saveUserSectors()">Salvar setores</button></div>';
    html += '</div>';
    html += '<div id="ac-user-effective-panel"></div>';
    html += '</div>';
    host.innerHTML = html;
    window.saveLegacyRoles = saveLegacyRoles;
    window.saveUserTeams = saveUserTeams;
    window.saveUserSectors = saveUserSectors;
    loadEffectivePermissions(userId, 'ac-user-effective-panel');
  }

  function renderRoleChecklist(selectedRoleCodes) {
    return '<div style="display:grid;gap:6px;margin-bottom:10px;">' + state.roles.map(function(role) {
      var checked = selectedRoleCodes.includes(role.code) ? 'checked' : '';
      return '<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" class="ac-user-role" value="' + role.code + '" ' + checked + ' style="width:auto;" /><span>' + escapeHtml(role.name || role.code) + '</span></label>';
    }).join('') + '</div>';
  }

  function renderMembershipChecklist(kind, selectedIds) {
    var source = kind === 'team' ? state.teams : state.sectors;
    var className = kind === 'team' ? 'ac-user-team' : 'ac-user-sector';
    return '<div style="display:grid;gap:6px;margin-bottom:10px;">' + source.map(function(item) {
      var checked = selectedIds.includes(item.id) ? 'checked' : '';
      return '<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" class="' + className + '" value="' + item.id + '" ' + checked + ' style="width:auto;" /><span>' + escapeHtml(item.name) + '</span></label>';
    }).join('') + '</div>';
  }

  function renderMatrix() {
    var mode = document.getElementById('ac-matrix-mode').value;
    var body = document.getElementById('ac-matrix-body');
    document.getElementById('ac-matrix-user-wrap').style.display = mode === 'user' ? 'block' : 'none';
    if (mode === 'team') {
      body.innerHTML = renderSubjectMatrix('team');
      return;
    }
    if (mode === 'sector') {
      body.innerHTML = renderSubjectMatrix('sector');
      return;
    }
    var userId = document.getElementById('ac-matrix-user').value;
    if (!userId && state.users.length) {
      document.getElementById('ac-matrix-user').value = state.users[0].id;
      userId = state.users[0].id;
    }
    body.innerHTML = '<div id="ac-matrix-user-panel"></div>';
    if (userId) {
      loadEffectivePermissions(userId, 'ac-matrix-user-panel', true);
    }
  }

  function renderSubjectMatrix(kind) {
    var grouped = groupPermissions();
    var subjects = kind === 'team' ? state.teams : state.sectors;
    var subjectType = kind === 'team' ? 'team' : 'sector';
    if (!subjects.length) {
      return '<div class="empty-state"><div class="empty-state-text">Cadastre ' + (kind === 'team' ? 'equipes' : 'setores') + ' para administrar a matriz.</div></div>';
    }
    var html = '<table style="width:100%;font-size:0.75rem;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid var(--line);min-width:220px;">Permissão</th>';
    subjects.forEach(function(subject) {
      html += '<th style="padding:8px;border-bottom:1px solid var(--line);min-width:150px;">' + escapeHtml(subject.name) + '</th>';
    });
    html += '</tr></thead><tbody>';
    Object.keys(grouped).forEach(function(moduleName) {
      html += '<tr><td colspan="' + (subjects.length + 1) + '" style="padding:10px 8px;background:rgba(37,99,235,0.08);font-weight:700;">' + escapeHtml(moduleName) + '</td></tr>';
      grouped[moduleName].forEach(function(permission) {
        html += '<tr><td style="padding:8px;border-bottom:1px solid var(--line);"><strong>' + escapeHtml(permission.code) + '</strong><div class="muted" style="font-size:0.72rem;">' + escapeHtml(permission.description || '') + '</div></td>';
        subjects.forEach(function(subject) {
          var value = getAssignment(subjectType, subject.id, permission.code);
          html += '<td style="padding:8px;border-bottom:1px solid var(--line);">' + renderCellSelect(subjectType, subject.id, permission.code, value) + '</td>';
        });
        html += '</tr>';
      });
    });
    html += '</tbody></table>';
    return html;
  }

  function renderUserMatrix(effectivePermissions, userId) {
    var html = '<table style="width:100%;font-size:0.75rem;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid var(--line);">Permissão</th><th style="padding:8px;border-bottom:1px solid var(--line);">Direto</th><th style="padding:8px;border-bottom:1px solid var(--line);">Efetivo</th><th style="padding:8px;border-bottom:1px solid var(--line);">Origem</th></tr></thead><tbody>';
    effectivePermissions.forEach(function(item) {
      var direct = getAssignment('user', userId, item.permissionCode);
      html += '<tr>';
      html += '<td style="padding:8px;border-bottom:1px solid var(--line);"><strong>' + escapeHtml(item.permissionCode) + '</strong><div class="muted" style="font-size:0.72rem;">' + escapeHtml(item.description || '') + '</div></td>';
      html += '<td style="padding:8px;border-bottom:1px solid var(--line);">' + renderCellSelect('user', userId, item.permissionCode, direct) + '</td>';
      html += '<td style="padding:8px;border-bottom:1px solid var(--line);">' + renderEffectiveBadge(item) + '</td>';
      html += '<td style="padding:8px;border-bottom:1px solid var(--line);">' + renderSources(item.sources) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderCellSelect(subjectType, subjectId, permissionCode, value) {
    return '<select class="ac-cell-select" data-subject-type="' + subjectType + '" data-subject-id="' + subjectId + '" data-permission-code="' + permissionCode + '" style="min-width:100px;">'
      + '<option value="inherit"' + (value === 'inherit' ? ' selected' : '') + '>Herdar</option>'
      + '<option value="allow"' + (value === 'allow' ? ' selected' : '') + '>Conceder</option>'
      + '<option value="deny"' + (value === 'deny' ? ' selected' : '') + '>Negar</option>'
      + '</select>';
  }

  function bindCellEvents() {
    document.querySelectorAll('.ac-cell-select').forEach(function(select) {
      select.addEventListener('change', function() {
        apiRequest('/access-control/grants', {
          method: 'POST',
          body: JSON.stringify({
            subjectType: this.dataset.subjectType,
            subjectId: this.dataset.subjectId,
            permissionCode: this.dataset.permissionCode,
            effect: this.value
          })
        }).then(function(resp) {
          if (!resp.ok) throw new Error('Falha ao salvar grant');
          showAlert('Permissão atualizada', 'success');
          loadData();
        }).catch(function(err) {
          showAlert(String(err), 'error');
        });
      });
    });
  }

  function createTeam() {
    apiRequest('/access-control/teams', {
      method: 'POST',
      body: JSON.stringify({
        code: document.getElementById('ac-team-code').value,
        name: document.getElementById('ac-team-name').value,
        description: document.getElementById('ac-team-description').value
      })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Falha ao criar equipe');
      document.getElementById('ac-team-code').value = '';
      document.getElementById('ac-team-name').value = '';
      document.getElementById('ac-team-description').value = '';
      showAlert('Equipe criada com sucesso', 'success');
      loadData();
    }).catch(function(err) {
      showAlert(String(err), 'error');
    });
  }

  function createSector() {
    apiRequest('/access-control/org-sectors', {
      method: 'POST',
      body: JSON.stringify({
        code: document.getElementById('ac-sector-code').value,
        name: document.getElementById('ac-sector-name').value,
        description: document.getElementById('ac-sector-description').value
      })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Falha ao criar setor');
      document.getElementById('ac-sector-code').value = '';
      document.getElementById('ac-sector-name').value = '';
      document.getElementById('ac-sector-description').value = '';
      showAlert('Setor criado com sucesso', 'success');
      loadData();
    }).catch(function(err) {
      showAlert(String(err), 'error');
    });
  }

  function saveLegacyRoles() {
    var userId = document.getElementById('ac-user-select').value;
    var roleCodes = Array.from(document.querySelectorAll('.ac-user-role:checked')).map(function(input) { return input.value; });
    apiRequest('/access-control/users/' + userId + '/roles', {
      method: 'POST',
      body: JSON.stringify({ roleCodes: roleCodes })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Falha ao salvar roles');
      showAlert('Roles legadas atualizadas', 'success');
      loadData();
    }).catch(function(err) {
      showAlert(String(err), 'error');
    });
  }

  function saveUserTeams() {
    var userId = document.getElementById('ac-user-select').value;
    var teamIds = Array.from(document.querySelectorAll('.ac-user-team:checked')).map(function(input) { return input.value; });
    apiRequest('/access-control/users/' + userId + '/teams', {
      method: 'POST',
      body: JSON.stringify({ teamIds: teamIds })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Falha ao salvar equipes');
      showAlert('Equipes do usuário atualizadas', 'success');
      loadData();
    }).catch(function(err) {
      showAlert(String(err), 'error');
    });
  }

  function saveUserSectors() {
    var userId = document.getElementById('ac-user-select').value;
    var sectorIds = Array.from(document.querySelectorAll('.ac-user-sector:checked')).map(function(input) { return input.value; });
    apiRequest('/access-control/users/' + userId + '/sectors', {
      method: 'POST',
      body: JSON.stringify({ sectorIds: sectorIds })
    }).then(function(resp) {
      if (!resp.ok) throw new Error('Falha ao salvar setores');
      showAlert('Setores do usuário atualizados', 'success');
      loadData();
    }).catch(function(err) {
      showAlert(String(err), 'error');
    });
  }

  function loadEffectivePermissions(userId, hostId, matrixMode) {
    apiRequest('/access-control/users/' + userId + '/effective').then(function(resp) {
      var data = resp.body || resp;
      var host = document.getElementById(hostId);
      var memberships = data.memberships || { teams: [], sectors: [] };
      var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div><strong>Permissão efetiva</strong><div class="muted" style="font-size:0.8rem;">Herança + override + role legada</div></div></div>';
      var chips = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">'
        + memberships.teams.map(function(team) { return '<span class="badge" style="background:var(--primary-glow);color:var(--primary);">' + escapeHtml(team.name) + '</span>'; }).join('')
        + memberships.sectors.map(function(sector) { return '<span class="badge" style="background:rgba(13,148,136,0.12);color:var(--accent);">' + escapeHtml(sector.name) + '</span>'; }).join('')
        + '</div>';
      host.innerHTML = header + chips + renderUserMatrix(data.effectivePermissions || [], userId);
      bindCellEvents();
      if (matrixMode) {
        document.getElementById('ac-matrix-user').value = userId;
      }
    }).catch(function(err) {
      showAlert('Falha ao carregar permissões efetivas: ' + String(err), 'error');
    });
  }

  function cardEntity(entity, kind) {
    var icon = kind === 'team' ? '👥' : '🏢';
    var assignmentCount = (kind === 'team' ? state.assignments.teamPermissions : state.assignments.sectorPermissions)
      .filter(function(item) { return item.subjectId === entity.id; }).length;
    var membershipCount = (kind === 'team' ? state.memberships.userTeams : state.memberships.userSectors)
      .filter(function(item) { return (kind === 'team' ? item.teamId : item.sectorId) === entity.id; }).length;
    return '<div class="card" style="padding:16px;border-left:4px solid var(--primary);">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">'
      + '<div><strong>' + icon + ' ' + escapeHtml(entity.name) + '</strong><div class="muted" style="font-size:0.8rem;margin-top:4px;">' + escapeHtml(entity.code) + '</div></div>'
      + '<span class="badge badge-' + (entity.status === 'active' ? 'success' : 'warning') + '">' + escapeHtml(entity.status) + '</span>'
      + '</div>'
      + '<div class="muted" style="font-size:0.82rem;margin-top:10px;">' + escapeHtml(entity.description || 'Sem descrição') + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:0.76rem;color:var(--ink-muted);">'
      + '<span>' + membershipCount + ' vínculos</span>'
      + '<span>' + assignmentCount + ' grants</span>'
      + '</div>'
      + '</div>';
  }

  function renderEffectiveBadge(item) {
    if (item.resolution.indexOf('deny') !== -1) return '<span class="badge badge-warning">Negado</span>';
    if (item.effective) return '<span class="badge badge-success">Permitido</span>';
    return '<span class="badge">Sem acesso</span>';
  }

  function renderSources(sources) {
    if (!sources || !sources.length) return '<span class="muted">Sem origem explicita</span>';
    return sources.map(function(source) {
      return '<div style="margin-bottom:4px;"><span class="badge" style="font-size:0.68rem;">' + escapeHtml(source.kind) + '</span> '
        + escapeHtml(source.sourceName) + ' <span class="muted">(' + escapeHtml(source.effect) + ')</span></div>';
    }).join('');
  }

  function getMemberships(userId) {
    return {
      teams: (state.memberships.userTeams || []).filter(function(item) { return item.userId === userId; }).map(function(item) { return item.teamId; }),
      sectors: (state.memberships.userSectors || []).filter(function(item) { return item.userId === userId; }).map(function(item) { return item.sectorId; })
    };
  }

  function getLegacyRoles(userId) {
    var found = (state.legacyRoles || []).find(function(item) { return item.userId === userId; });
    return found ? found.roleCodes || [] : [];
  }

  function getAssignment(subjectType, subjectId, permissionCode) {
    var pool = subjectType === 'user' ? state.assignments.userPermissions : subjectType === 'team' ? state.assignments.teamPermissions : state.assignments.sectorPermissions;
    var found = (pool || []).find(function(item) {
      return item.subjectId === subjectId && item.permissionCode === permissionCode;
    });
    return found ? found.effect : 'inherit';
  }

  function groupPermissions() {
    return state.permissions.reduce(function(acc, permission) {
      var moduleName = permission.module || permission.code.split('.')[0] || 'outros';
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(permission);
      return acc;
    }, {});
  }

  document.addEventListener('change', function(event) {
    if (event.target && event.target.classList.contains('ac-cell-select')) {
      bindCellEvents();
    }
  });

  activateTab('legacy');
  loadData();
})();
</script>
`;
}
