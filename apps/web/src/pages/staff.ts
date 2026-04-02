export function renderStaff(): string {
  return `
<div class="page-header">
  <div>
    <h1>Equipe</h1>
    <p class="subtitle">CRUD administrativo de profissionais com status operacional e rastreabilidade basica.</p>
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
    <h2>Novo colaborador</h2>
    <form id="staff-create-form" class="grid" style="gap:12px; margin-top:12px;">
      <input name="employeeCode" placeholder="Matricula" required />
      <input name="fullName" placeholder="Nome completo" required />
      <input name="userId" placeholder="User ID vinculado (opcional)" />
      <input name="department" placeholder="Departamento" />
      <input name="jobTitle" placeholder="Cargo" />
      <button type="submit">Cadastrar colaborador</button>
    </form>
  </div>
  <div class="card">
    <h2>Equipe cadastrada</h2>
    <div id="staff-list"><div class="loading">Carregando</div></div>
  </div>
</div>

<div class="card" style="margin-top:20px;">
  <h2>Detalhe e manutencao</h2>
  <div id="staff-detail" class="empty">Selecione um membro da equipe para ver os detalhes.</div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('staff-alert');
  var listEl = document.getElementById('staff-list');
  var detailEl = document.getElementById('staff-detail');
  var searchInput = document.getElementById('staff-search');
  var searchBtn = document.getElementById('staff-search-btn');
  var reloadBtn = document.getElementById('reload-staff');
  var createForm = document.getElementById('staff-create-form');
  var allItems = [];
  var selectedId = null;

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

  function getFilteredItems(query) {
    if (!query) return allItems.slice();
    var needle = String(query).toLowerCase();
    return allItems.filter(function(member) {
      return [member.fullName, member.employeeCode, member.department, member.jobTitle, member.status].some(function(value) {
        return String(value || '').toLowerCase().indexOf(needle) >= 0;
      });
    });
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
        '<td><button class="small secondary" data-staff-detail="' + escapeHtml(member.id) + '">Ver</button></td>' +
        '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  function renderDetail(member) {
    selectedId = member.id;
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
          '<dt>Criado em</dt><dd>' + formatDate(member.createdAt) + '</dd>' +
          '<dt>Atualizado em</dt><dd>' + formatDate(member.updatedAt) + '</dd>' +
        '</dl>' +
        '<form id="staff-edit-form" class="grid" style="gap:12px">' +
          '<input name="fullName" value="' + escapeHtml(member.fullName || '') + '" placeholder="Nome completo" required />' +
          '<input name="department" value="' + escapeHtml(member.department || '') + '" placeholder="Departamento" />' +
          '<input name="jobTitle" value="' + escapeHtml(member.jobTitle || '') + '" placeholder="Cargo" />' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
            '<button type="submit">Salvar alteracoes</button>' +
            '<button type="button" class="secondary" id="staff-toggle-active">' + (member.status === 'active' ? 'Inativar' : 'Ativar') + '</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    var editForm = document.getElementById('staff-edit-form');
    var toggleBtn = document.getElementById('staff-toggle-active');

    editForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      var formData = new FormData(editForm);
      var payload = {
        fullName: String(formData.get('fullName') || '').trim(),
        department: String(formData.get('department') || '').trim() || null,
        jobTitle: String(formData.get('jobTitle') || '').trim() || null
      };
      var res = await apiRequest('/staff/' + encodeURIComponent(member.id), { method: 'PATCH', body: JSON.stringify(payload) });
      if (!res.ok) {
        showMsg(res.body && res.body.message ? res.body.message : 'Falha ao atualizar colaborador.', 'error');
        return;
      }
      showMsg('Colaborador atualizado com sucesso.', 'success');
      await loadStaff(searchInput.value, member.id);
    });

    toggleBtn.addEventListener('click', async function() {
      var nextActive = member.status !== 'active';
      var res = await apiRequest('/staff/' + encodeURIComponent(member.id) + '/toggle-active', {
        method: 'POST',
        body: JSON.stringify({ isActive: nextActive })
      });
      if (!res.ok) {
        showMsg(res.body && res.body.message ? res.body.message : 'Falha ao alterar status.', 'error');
        return;
      }
      showMsg(nextActive ? 'Colaborador ativado.' : 'Colaborador inativado.', 'success');
      await loadStaff(searchInput.value, member.id);
    });
  }

  async function loadStaff(query, focusId) {
    listEl.innerHTML = '<div class="loading">Carregando</div>';
    if (!focusId) {
      detailEl.innerHTML = '<div class="empty">Selecione um membro da equipe para ver os detalhes.</div>';
      selectedId = null;
    }
    var res = await apiRequest('/staff');
    if (!res.ok) {
      listEl.innerHTML = '<div class="empty">Erro ao carregar staff.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /staff', 'error');
      return;
    }
    allItems = Array.isArray(res.body) ? res.body : (res.body && res.body.items) || [];
    allItems.sort(function(a, b) { return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'pt-BR'); });
    renderList(getFilteredItems(query));
    if (focusId) {
      var current = allItems.find(function(item) { return item.id === focusId; });
      if (current) renderDetail(current);
    }
  }

  listEl.addEventListener('click', async function(event) {
    var button = event.target.closest('[data-staff-detail]');
    if (!button) return;
    var id = button.getAttribute('data-staff-detail');
    if (!id) return;
    var res = await apiRequest('/staff/' + encodeURIComponent(id));
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler o colaborador.', 'error');
      return;
    }
    renderDetail(res.body);
  });

  createForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    var formData = new FormData(createForm);
    var payload = {
      employeeCode: String(formData.get('employeeCode') || '').trim(),
      fullName: String(formData.get('fullName') || '').trim(),
      userId: String(formData.get('userId') || '').trim() || null,
      department: String(formData.get('department') || '').trim() || null,
      jobTitle: String(formData.get('jobTitle') || '').trim() || null
    };
    var res = await apiRequest('/staff', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) {
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao criar colaborador.', 'error');
      return;
    }
    createForm.reset();
    showMsg('Colaborador cadastrado com sucesso.', 'success');
    await loadStaff(searchInput.value, res.body && res.body.id);
  });

  var searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { renderList(getFilteredItems(searchInput.value)); }, 200);
  });
  searchBtn.addEventListener('click', function() { renderList(getFilteredItems(searchInput.value)); });
  reloadBtn.addEventListener('click', function() { loadStaff(searchInput.value, selectedId); });

  loadStaff('');
})();
</script>`;
}
