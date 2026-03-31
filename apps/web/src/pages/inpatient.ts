export function renderInpatient(): string {
  return `
<div class="page-header">
  <div>
    <h1>Internação</h1>
    <p class="subtitle">Admissão, evolução e alta de pacientes hospitalizados</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="inp-new-btn" style="white-space:nowrap;">+ Nova Internação</button>
    <button id="reload-inpatient" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="inp-alert"></div>

<!-- Filters -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <input id="inp-search" placeholder="Buscar por paciente ou tutor..." style="flex:1;min-width:200px;" />
    <select id="inp-filter-status" style="width:auto;min-width:130px;">
      <option value="">Todos status</option>
      <option value="admitted">🏥 Internado</option>
      <option value="stable">✅ Estável</option>
      <option value="transferred">🔄 Transferido</option>
      <option value="discharged">🏠 Alta</option>
    </select>
    <button id="inp-search-btn" class="secondary">Buscar</button>
  </div>
</div>

<!-- Active Stays -->
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <h2 style="margin:0;">🏥 Internações Ativas</h2>
    <span class="badge badge-info" id="inp-active-count">0</span>
  </div>
  <div id="inp-active-list"></div>
</div>

<!-- All Stays Table -->
<div class="card">
  <h2 style="margin-bottom:12px;">Histórico de Internações</h2>
  <div id="inp-table"></div>
</div>

<!-- Admission Form Modal -->
<div id="inp-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:750px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="margin:0;">Nova Internação</h2>
      <button class="secondary small" id="inp-form-close" type="button">✕</button>
    </div>
    
    <form id="inp-form">
      <input type="hidden" id="inp-encounter-id" />
      <input type="hidden" id="inp-patient-id" />
      <input type="hidden" id="inp-owner-id" />
      
      <!-- Bloco 1: Paciente -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🐾 Paciente</h3>
        <div style="display:flex;gap:8px;">
          <input id="inp-patient-search" placeholder="Buscar por paciente ou tutor..." style="flex:1;" />
          <button type="button" id="inp-patient-search-btn" class="secondary">Buscar</button>
        </div>
        <div id="inp-patient-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
        <div id="inp-patient-selected" style="display:none;padding:10px;background:var(--success-soft);border-radius:var(--radius-sm);margin-top:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div><strong id="inp-patient-name"></strong><div class="muted" style="font-size:0.8rem;" id="inp-patient-info"></div></div>
            <button type="button" class="secondary small" id="inp-patient-change">Trocar</button>
          </div>
        </div>
      </div>

      <!-- Bloco 2: Localização -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📍 Localização</h3>
        <div class="grid grid-3">
          <label>Setor *
            <select id="inp-sector" required>
              <option value="">Selecione...</option>
              <option value="internacao_clinica">🏥 Internação Clínica</option>
              <option value="internacao_cirurgica">💉 Internação Cirúrgica</option>
              <option value="uti">🚨 UTI</option>
              <option value="isolamento">🔒 Isolamento</option>
              <option value="observacao">👁 Observação</option>
            </select>
          </label>
          <label>Leito
            <input id="inp-bed" placeholder="Ex: A12" />
          </label>
          <label>Tipo de Admissão
            <select id="inp-admission-type">
              <option value="clinical">🩺 Clínica</option>
              <option value="surgical">💉 Cirúrgica</option>
              <option value="emergency">🚨 Emergência</option>
              <option value="observation">👁 Observação</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Bloco 3: Contexto Clínico -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🩺 Contexto Clínico</h3>
        <label>Motivo da Internação *
          <textarea id="inp-reason" required placeholder="Justificativa clínica para internação..." style="min-height:60px;"></textarea>
        </label>
        <label style="margin-top:12px;">Plano Inicial
          <textarea id="inp-plan" placeholder="Plano terapêutico inicial..." style="min-height:60px;"></textarea>
        </label>
        <div class="grid grid-4" style="margin-top:12px;">
          <label>Peso (kg)
            <input id="inp-weight" type="number" step="0.1" min="0" placeholder="0.0" />
          </label>
          <label>Temperatura (°C)
            <input id="inp-temperature" type="number" step="0.1" placeholder="38.5" />
          </label>
          <label>FC (bpm)
            <input id="inp-heartrate" type="number" min="0" placeholder="120" />
          </label>
          <label>FR (irpm)
            <input id="inp-respiratory" type="number" min="0" placeholder="30" />
          </label>
        </div>
      </div>

      <div class="btn-row">
        <button type="submit">🏥 Internar Paciente</button>
        <button type="button" class="secondary" id="inp-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Detail Modal -->
<div id="inp-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;" id="inp-detail-content"></div>
</div>

<!-- Action Modal -->
<div id="inp-action-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:310;place-items:center;padding:20px;">
  <div class="card" style="width:100%;max-width:450px;margin:auto;" id="inp-action-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('inp-alert');
  var formOverlay = document.getElementById('inp-form-overlay');
  var detailOverlay = document.getElementById('inp-detail-overlay');
  var actionOverlay = document.getElementById('inp-action-overlay');

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var statusLabels = { admitted: '🏥 Internado', stable: '✅ Estável', transferred: '🔄 Transferido', discharged: '🏠 Alta' };
  var sectorLabels = { internacao_clinica: '🏥 Inter. Clínica', internacao_cirurgica: '💉 Inter. Cirúrgica', uti: '🚨 UTI', isolamento: '🔒 Isolamento', observacao: '👁 Observação' };
  var admissionTypeLabels = { clinical: '🩺 Clínica', surgical: '💉 Cirúrgica', emergency: '🚨 Emergência', observation: '👁 Observação' };

  // --- Patient Search ---
  function searchPatients(query) {
    var resultsDiv = document.getElementById('inp-patient-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>'; return; }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando...</div>';
    apiRequest('/patients?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Nenhum paciente encontrado</div>'; return; }
      var html = '';
      items.forEach(function(p) {
        var tutorName = p.tutorName || p.ownerName || '-';
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectPatient(\\'' + p.id + '\\',\\'' + escapeHtml(p.name) + '\\',\\'' + escapeHtml(p.breed || p.species || '') + '\\',\\'' + escapeHtml(tutorName) + '\\',\\'' + (p.primaryOwnerId || '') + '\\')">';
        html += '<strong>🐾 ' + escapeHtml(p.name) + '</strong><br><span class="muted" style="font-size:0.8rem;">👤 ' + escapeHtml(tutorName) + '</span></div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectPatient = function(patientId, name, breed, tutorName, ownerId) {
    document.getElementById('inp-patient-id').value = patientId;
    document.getElementById('inp-owner-id').value = ownerId;
    document.getElementById('inp-patient-name').textContent = '🐾 ' + name;
    document.getElementById('inp-patient-info').textContent = (breed || '') + ' · Tutor: ' + tutorName;
    document.getElementById('inp-patient-selected').style.display = 'block';
    document.getElementById('inp-patient-results').innerHTML = '';
    // Auto-find active encounter for this patient
    apiRequest('/encounters?patientId=' + patientId).then(function(resp) {
      var encounters = (resp.body?.items || resp.body || []);
      var active = encounters.find(function(e) { return e.status === 'open' || e.status === 'in_progress'; });
      if (active) document.getElementById('inp-encounter-id').value = active.id;
    });
  };

  document.getElementById('inp-patient-change').addEventListener('click', function() {
    document.getElementById('inp-patient-id').value = '';
    document.getElementById('inp-patient-selected').style.display = 'none';
  });
  document.getElementById('inp-patient-search-btn').addEventListener('click', function() { searchPatients(document.getElementById('inp-patient-search').value); });
  document.getElementById('inp-patient-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); searchPatients(this.value); } });

  // --- Load ---
  function loadStays() {
    var url = '/inpatient';
    var params = [];
    var q = document.getElementById('inp-search').value;
    var status = document.getElementById('inp-filter-status').value;
    if (status) params.push('status=' + status);
    if (params.length) url += '?' + params.join('&');

    apiRequest(url).then(function(resp) {
      var items = (resp.body?.items || resp.body || resp.body?.stays || []);
      if (!Array.isArray(items)) items = [];
      renderStays(items);
    }).catch(function(err) { showAlert('Erro: ' + err.message, 'error'); });
  }

  function renderStays(items) {
    var active = items.filter(function(s) { return s.status !== 'discharged'; });
    document.getElementById('inp-active-count').textContent = active.length;

    // Active stays cards
    if (active.length) {
      var html = '<div class="dashboard-grid">';
      active.forEach(function(s) {
        var statusBadge = s.status === 'stable' ? 'success' : (s.status === 'admitted' ? 'info' : 'warning');
        html += '<div class="stat-card" style="cursor:pointer;" onclick="showStayDetail(\\'' + s.id + '\\')">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span class="badge badge-' + statusBadge + '">' + (statusLabels[s.status] || s.status) + '</span><span style="font-size:0.75rem;color:var(--ink-muted);">' + (sectorLabels[s.sector] || s.sector || s.unit || '-') + '</span></div>';
        html += '<div style="font-size:1rem;font-weight:700;">🐾 ' + escapeHtml(s.patientName || '-') + '</div>';
        html += '<div class="muted" style="font-size:0.8rem;">👤 ' + escapeHtml(s.tutorName || s.ownerName || '-') + '</div>';
        if (s.bed || s.bedCode) html += '<div style="margin-top:4px;font-size:0.85rem;">🛏 Leito: <strong>' + escapeHtml(s.bed || s.bedCode) + '</strong></div>';
        if (s.reason || s.chiefComplaint) html += '<div class="muted" style="font-size:0.8rem;margin-top:4px;">' + escapeHtml((s.reason || s.chiefComplaint || '').substring(0, 60)) + '</div>';
        html += '</div>';
      });
      html += '</div>';
      document.getElementById('inp-active-list').innerHTML = html;
    } else {
      document.getElementById('inp-active-list').innerHTML = '<div class="empty-state" style="padding:20px;"><div class="empty-state-icon">✅</div><div class="empty-state-text">Nenhuma internação ativa</div></div>';
    }

    // All stays table
    if (!items.length) {
      document.getElementById('inp-table').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏥</div><div class="empty-state-text">Nenhuma internação encontrada</div></div>';
      return;
    }
    var tableHtml = '<table><thead><tr><th>Paciente</th><th>Tutor</th><th>Setor</th><th>Leito</th><th>Tipo</th><th>Status</th><th>Entrada</th><th>Ações</th></tr></thead><tbody>';
    items.forEach(function(s) {
      var statusBadge = s.status === 'discharged' ? 'success' : (s.status === 'stable' ? 'info' : 'warning');
      var admDate = s.admittedAt || s.createdAt;
      var admDateStr = admDate ? new Date(admDate).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
      tableHtml += '<tr>';
      tableHtml += '<td><strong>🐾 ' + escapeHtml(s.patientName || '-') + '</strong></td>';
      tableHtml += '<td>' + escapeHtml(s.tutorName || s.ownerName || '-') + '</td>';
      tableHtml += '<td>' + (sectorLabels[s.sector] || s.sector || s.unit || '-') + '</td>';
      tableHtml += '<td>' + escapeHtml(s.bed || s.bedCode || '-') + '</td>';
      tableHtml += '<td>' + (admissionTypeLabels[s.admissionType] || '-') + '</td>';
      tableHtml += '<td><span class="badge badge-' + statusBadge + '">' + (statusLabels[s.status] || s.status) + '</span></td>';
      tableHtml += '<td>' + admDateStr + '</td>';
      tableHtml += '<td style="white-space:nowrap;"><button class="small secondary" onclick="showStayDetail(\\'' + s.id + '\\')">Ver</button>';
      if (s.status !== 'discharged') tableHtml += ' <button class="small" onclick="showStayActions(\\'' + s.id + '\\',\\'' + s.status + '\\')" style="background:var(--accent);color:white;padding:4px 8px;font-size:0.7rem;">Ações</button>';
      tableHtml += '</td></tr>';
    });
    tableHtml += '</tbody></table>';
    document.getElementById('inp-table').innerHTML = tableHtml;
  }

  // --- Detail ---
  window.showStayDetail = function(id) {
    apiRequest('/inpatient/' + id + '/progress').then(function(resp) {
      var progress = resp.body?.items || resp.body || [];
      // Also get stay info from the list
      apiRequest('/inpatient').then(function(listResp) {
        var stays = listResp.body?.items || listResp.body?.stays || [];
        var stay = stays.find(function(s) { return s.id === id; }) || {};
        
        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">🏥 Internação</h2><button class="secondary small" onclick="document.getElementById(\\'inp-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
        html += '<div style="display:grid;gap:14px;">';
        
        var statusBadge = stay.status === 'discharged' ? 'success' : (stay.status === 'stable' ? 'info' : 'warning');
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;"><span class="badge badge-' + statusBadge + '">' + (statusLabels[stay.status] || stay.status) + '</span> ' + (sectorLabels[stay.sector] || stay.sector || stay.unit || '') + (stay.bed ? ' · 🛏 ' + stay.bed : '') + '</div>';
        
        html += '<div style="padding:12px;background:var(--primary-glow);border-radius:var(--radius-sm);">';
        html += '<strong>🐾 ' + escapeHtml(stay.patientName || '-') + '</strong><br>';
        html += '<span class="muted">👤 ' + escapeHtml(stay.tutorName || stay.ownerName || '-') + '</span>';
        html += '</div>';
        
        if (stay.reason || stay.chiefComplaint) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Motivo</strong><div>' + escapeHtml(stay.reason || stay.chiefComplaint) + '</div></div>';
        if (stay.planSummary || stay.plan) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Plano</strong><div>' + escapeHtml(stay.planSummary || stay.plan) + '</div></div>';
        
        // Progress notes timeline
        if (progress.length) {
          html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">📝 Evoluções (' + progress.length + ')</strong>';
          progress.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
          progress.forEach(function(p) {
            var pDate = p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
            html += '<div style="padding:8px 10px;margin-top:6px;border-left:3px solid var(--accent);background:rgba(13,148,136,0.04);border-radius:0 var(--radius-sm) var(--radius-sm 0);">';
            html += '<div style="font-size:0.75rem;color:var(--ink-muted);">' + pDate + '</div>';
            html += '<div style="font-size:0.85rem;margin-top:2px;">' + escapeHtml(p.note || '-') + '</div>';
            html += '</div>';
          });
          html += '</div>';
        }
        
        // Actions
        if (stay.status !== 'discharged') {
          html += '<div class="btn-row" style="margin-top:12px;">';
          html += '<button onclick="addProgressNote(\\'' + id + '\\')">📝 Nova Evolução</button>';
          html += '<button class="secondary" onclick="showStayActions(\\'' + id + '\\',\\'' + stay.status + '\\')">Alterar Status</button>';
          html += '</div>';
        }
        
        html += '</div>';
        document.getElementById('inp-detail-content').innerHTML = html;
        detailOverlay.style.display = 'grid';
      });
    });
  };

  // --- Progress Note ---
  window.addProgressNote = function(stayId) {
    var note = prompt('Nota de evolução:');
    if (!note) return;
    apiRequest('/inpatient/progress', { method: 'POST', body: JSON.stringify({ stayId: stayId, note: note }) }).then(function(resp) {
      if (resp.ok) { showAlert('Evolução registrada!', 'success'); showStayDetail(stayId); }
      else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  };

  // --- Actions ---
  window.showStayActions = function(id, currentStatus) {
    var transitions = {
      admitted: [{ to: 'stable', label: '✅ Marcar como Estável' }, { to: 'discharged', label: '🏠 Dar Alta' }],
      stable: [{ to: 'admitted', label: '🏥 Retornar para Internado' }, { to: 'discharged', label: '🏠 Dar Alta' }]
    };
    var actions = transitions[currentStatus] || [];
    if (!actions.length) { showAlert('Sem ações para este status', 'info'); return; }
    
    var html = '<h3 style="margin:0 0 12px;">Alterar Status</h3>';
    html += '<div style="display:grid;gap:8px;">';
    actions.forEach(function(a) {
      html += '<button onclick="transitionStay(\\'' + id + '\\',\\'' + a.to + '\\')" style="width:100%;text-align:left;padding:12px 16px;' + (a.to === 'discharged' ? 'background:var(--success);' : '') + '">' + a.label + '</button>';
    });
    html += '</div>';
    html += '<button class="secondary" onclick="document.getElementById(\\'inp-action-overlay\\').style.display=\\'none\\'" style="width:100%;margin-top:12px;">Fechar</button>';
    document.getElementById('inp-action-content').innerHTML = html;
    actionOverlay.style.display = 'grid';
  };

  window.transitionStay = function(id, newStatus) {
    var body = { status: newStatus };
    apiRequest('/inpatient/' + id + '/status', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert('Status atualizado para: ' + (statusLabels[newStatus] || newStatus), 'success');
        actionOverlay.style.display = 'none';
        detailOverlay.style.display = 'none';
        loadStays();
      } else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  };

  // --- Form ---
  function showForm() {
    formOverlay.style.display = 'grid';
    document.getElementById('inp-form').reset();
    document.getElementById('inp-patient-id').value = '';
    document.getElementById('inp-patient-selected').style.display = 'none';
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  document.getElementById('inp-new-btn').addEventListener('click', showForm);
  document.getElementById('inp-form-close').addEventListener('click', hideForm);
  document.getElementById('inp-cancel').addEventListener('click', hideForm);

  // --- Submit ---
  document.getElementById('inp-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var patientId = document.getElementById('inp-patient-id').value;
    if (!patientId) { showAlert('Selecione um paciente.', 'error'); return; }

    var body = {
      encounterId: document.getElementById('inp-encounter-id').value,
      patientId: patientId,
      ownerId: document.getElementById('inp-owner-id').value,
      unit: document.getElementById('inp-sector').value,
      ward: document.getElementById('inp-sector').value,
      bed: document.getElementById('inp-bed').value || undefined,
      reason: document.getElementById('inp-reason').value,
      planSummary: document.getElementById('inp-plan').value || undefined,
      admissionType: document.getElementById('inp-admission-type').value
    };

    apiRequest('/inpatient', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert('Paciente internado!', 'success');
        hideForm();
        loadStays();
      } else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  });

  // --- Search/Filter ---
  document.getElementById('inp-search-btn').addEventListener('click', loadStays);
  document.getElementById('inp-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') loadStays(); });
  document.getElementById('inp-filter-status').addEventListener('change', loadStays);
  document.getElementById('reload-inpatient').addEventListener('click', loadStays);

  // --- Init ---
  loadStays();
})();
</script>
`;
}
