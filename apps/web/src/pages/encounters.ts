export function renderEncounters(): string {
  return `
<div class="page-header">
  <div>
    <h1>Atendimentos</h1>
    <p class="subtitle">Abertura e controle do episódio clínico</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="encounter-new-btn" style="white-space:nowrap;">+ Abrir Atendimento</button>
    <button id="reload-encounters" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="encounters-alert"></div>

<!-- Search & Filters -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <input id="encounter-search" placeholder="Buscar por paciente, tutor ou motivo..." style="flex:1;min-width:200px;" />
    <select id="encounter-filter-status" style="width:auto;min-width:120px;">
      <option value="">Todos status</option>
      <option value="open">Aberto</option>
      <option value="in_progress">Em andamento</option>
      <option value="waiting">Aguardando</option>
      <option value="completed">Finalizado</option>
      <option value="cancelled">Cancelado</option>
    </select>
    <select id="encounter-filter-priority" style="width:auto;min-width:120px;">
      <option value="">Todas prioridades</option>
      <option value="critical">🔴 Crítica</option>
      <option value="high">🟠 Alta</option>
      <option value="normal">🟢 Normal</option>
      <option value="low">⚪ Baixa</option>
    </select>
    <button id="encounter-search-btn" class="secondary" style="white-space:nowrap;">Buscar</button>
  </div>
</div>

<!-- Form Modal -->
<div id="encounter-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:780px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="encounter-form-title" style="margin:0;">Novo Atendimento</h2>
      <button class="secondary small" id="encounter-form-close" type="button">✕</button>
    </div>
    
    <form id="encounter-form">
      <input type="hidden" id="encounter-edit-id" />
      
      <!-- Bloco 1: Paciente e Tutor -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🐾 Paciente e Tutor</h3>
        
        <div style="margin-bottom:12px;">
          <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">Buscar Paciente *</label>
          <div style="display:flex;gap:8px;">
            <input id="encounter-patient-search" placeholder="Buscar por nome do paciente..." style="flex:1;" />
            <button type="button" id="encounter-patient-search-btn" class="secondary">Buscar</button>
          </div>
          <div id="encounter-patient-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
          <div id="encounter-patient-selected" style="display:none;padding:10px;background:var(--success-soft);border-radius:var(--radius-sm);margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong id="encounter-patient-name"></strong>
                <div class="muted" style="font-size:0.8rem;" id="encounter-patient-info"></div>
              </div>
              <button type="button" class="secondary small" id="encounter-patient-change">Trocar</button>
            </div>
          </div>
          <input type="hidden" id="encounter-patient-id" />
          <input type="hidden" id="encounter-owner-id" />
        </div>
      </div>

      <!-- Bloco 2: Classificação -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📋 Classificação</h3>
        <div class="grid grid-2">
          <label>Tipo de Atendimento *
            <select id="encounter-type" required>
              <option value="">Selecione...</option>
              <option value="consultation">🩺 Consulta</option>
              <option value="emergency">🚨 Emergência</option>
              <option value="return">🔄 Retorno</option>
              <option value="procedure">💉 Procedimento</option>
              <option value="hospitalization_entry">🏥 Entrada Internação</option>
              <option value="teleorientation">📱 Teleorientação</option>
            </select>
          </label>
          <label>Prioridade *
            <select id="encounter-priority" required>
              <option value="">Selecione...</option>
              <option value="normal">🟢 Normal</option>
              <option value="high">🟠 Alta</option>
              <option value="critical">🔴 Crítica</option>
              <option value="low">⚪ Baixa</option>
            </select>
          </label>
        </div>
        <div class="grid grid-2">
          <label>Origem
            <select id="encounter-origin">
              <option value="reception">Recepção</option>
              <option value="walk_in">Walk-in</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Telefone</option>
              <option value="referral">Encaminhamento</option>
              <option value="internal_transfer">Transferência interna</option>
            </select>
          </label>
          <label>Setor Inicial
            <select id="encounter-sector">
              <option value="consultation_room">Sala de Consulta</option>
              <option value="emergency_room">Sala de Emergência</option>
              <option value="triage">Triagem</option>
              <option value="reception">Recepção</option>
              <option value="diagnostic">Diagnóstico</option>
              <option value="hospitalization">Internação</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Bloco 3: Contexto Inicial -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📝 Contexto Inicial</h3>
        <label>Motivo Principal (Queixa) *
          <textarea id="encounter-chief-complaint" required placeholder="Descreva o motivo principal da consulta" style="min-height:60px;"></textarea>
        </label>
        <label style="margin-top:12px;">Notas de Triagem
          <textarea id="encounter-triage-notes" placeholder="Observações da triagem inicial" style="min-height:60px;"></textarea>
        </label>
        <label style="margin-top:12px;">Notas Administrativas
          <textarea id="encounter-admin-notes" placeholder="Notas administrativas" style="min-height:60px;"></textarea>
        </label>
      </div>

      <!-- Bloco 4: Snapshot Clínico Inicial -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🩺 Snapshot Clínico Inicial</h3>
        <div class="grid grid-4">
          <label>Peso (kg)
            <input id="encounter-weight" type="number" step="0.1" min="0" placeholder="0.0" />
          </label>
          <label>Temperatura (°C)
            <input id="encounter-temperature" type="number" step="0.1" min="30" max="45" placeholder="38.5" />
          </label>
          <label>FC (bpm)
            <input id="encounter-heartrate" type="number" min="0" placeholder="120" />
          </label>
          <label>FR (irpm)
            <input id="encounter-respiratory" type="number" min="0" placeholder="30" />
          </label>
        </div>
        <div class="grid grid-2">
          <label>Mucosa
            <select id="encounter-mucosa">
              <option value="">Não avaliado</option>
              <option value="normal">Normal (Rósea)</option>
              <option value="pale">Pálida</option>
              <option value="hyperemic">Hiperêmica</option>
              <option value="cyanotic">Cianótica</option>
              <option value="icteric">Ictérica</option>
            </select>
          </label>
          <label>Hidratação
            <select id="encounter-hydration">
              <option value="">Não avaliado</option>
              <option value="normal">Normal</option>
              <option value="mild_dehydration">Desidratação leve</option>
              <option value="moderate_dehydration">Desidratação moderada</option>
              <option value="severe_dehydration">Desidratação severa</option>
            </select>
          </label>
        </div>
        
        <!-- Clinical Alerts Snapshot -->
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--danger);text-transform:uppercase;">⚠️ Alertas Clínicos do Paciente</label>
            <button type="button" id="encounter-add-alert" class="secondary small">+ Adicionar</button>
          </div>
          <div id="encounter-alerts-container"></div>
        </div>
      </div>

      <div class="btn-row">
        <button type="submit" id="encounter-submit">Abrir Atendimento</button>
        <button type="button" class="secondary" id="encounter-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Table -->
<div class="card">
  <div id="encounters-table"></div>
</div>

<!-- Detail Modal -->
<div id="encounter-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;" id="encounter-detail-content"></div>
</div>

<!-- Action Modal -->
<div id="encounter-action-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:310;place-items:center;padding:20px;">
  <div class="card" style="width:100%;max-width:400px;margin:auto;" id="encounter-action-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('encounters-alert');
  var formOverlay = document.getElementById('encounter-form-overlay');
  var detailOverlay = document.getElementById('encounter-detail-overlay');
  var actionOverlay = document.getElementById('encounter-action-overlay');
  var alertsContainer = document.getElementById('encounter-alerts-container');
  var alertCounter = 0;
  var selectedPatient = null;

  // Check for patient context
  var urlParams = new URLSearchParams(window.location.search);
  var patientContextId = urlParams.get('patientId');

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var typeLabels = { consultation: '🩺 Consulta', emergency: '🚨 Emergência', return: '🔄 Retorno', procedure: '💉 Procedimento', hospitalization_entry: '🏥 Internação', teleorientation: '📱 Teleorientação' };
  var priorityLabels = { low: '⚪ Baixa', normal: '🟢 Normal', high: '🟠 Alta', critical: '🔴 Crítica' };
  var statusLabels = { open: 'Aberto', in_progress: 'Em andamento', waiting: 'Aguardando', completed: 'Finalizado', cancelled: 'Cancelado' };
  var originLabels = { reception: 'Recepção', walk_in: 'Walk-in', whatsapp: 'WhatsApp', phone: 'Telefone', referral: 'Encaminhamento', internal_transfer: 'Transferência' };
  var alertTypes = { allergy: 'Alergia', aggression: 'Agressão', anesthesia_risk: 'Risco Anestésico', chronic_condition: 'Condição Crônica', other: 'Outro' };

  // --- Alert Management ---
  function addAlertRow(data) {
    alertCounter++;
    var id = 'ea' + alertCounter;
    var row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:10px;margin-bottom:6px;background:rgba(239,68,68,0.03);';
    row.id = 'enc-alert-row-' + id;
    row.innerHTML = 
      '<div class="grid grid-3" style="gap:6px;">' +
        '<label style="font-size:0.7rem;">Tipo<select class="enc-alert-type"><option value="allergy"' + (data?.type==='allergy'?' selected':'') + '>Alergia</option><option value="aggression"' + (data?.type==='aggression'?' selected':'') + '>Agressão</option><option value="anesthesia_risk"' + (data?.type==='anesthesia_risk'?' selected':'') + '>Risco Anest.</option><option value="chronic_condition"' + (data?.type==='chronic_condition'?' selected':'') + '>Cond. Crônica</option><option value="other"' + (data?.type==='other'?' selected':'') + '>Outro</option></select></label>' +
        '<label style="font-size:0.7rem;">Descrição<input class="enc-alert-label" placeholder="Descreva" value="' + (data?.label || '') + '" /></label>' +
        '<div style="display:flex;align-items:end;gap:4px;"><label style="font-size:0.7rem;flex:1;">Sev.<select class="enc-alert-severity"><option value="low"' + (data?.severity==='low'?' selected':'') + '>Baixa</option><option value="medium"' + (data?.severity==='medium'?' selected':'') + '>Média</option><option value="high"' + (data?.severity==='high'?' selected':'') + '>Alta</option></select></label><button type="button" class="danger small" onclick="this.closest(\\'.card\\').remove()" style="padding:4px 8px;">✕</button></div>' +
      '</div>';
    alertsContainer.appendChild(row);
  }

  function getAlertsFromForm() {
    var alerts = [];
    alertsContainer.querySelectorAll('[id^="enc-alert-row-"]').forEach(function(row) {
      var label = row.querySelector('.enc-alert-label').value.trim();
      if (!label) return;
      alerts.push({ type: row.querySelector('.enc-alert-type').value, label: label, severity: row.querySelector('.enc-alert-severity').value });
    });
    return alerts;
  }

  document.getElementById('encounter-add-alert').addEventListener('click', function() { addAlertRow(); });

  // --- Patient Search ---
  function searchPatients(query) {
    var resultsDiv = document.getElementById('encounter-patient-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>'; return; }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando...</div>';
    apiRequest('/patients?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="empty-state" style="padding:16px;"><div class="empty-state-icon">🐾</div><div class="empty-state-text">Nenhum paciente encontrado.<br><a href="/patients" style="color:var(--primary);font-weight:700;">Cadastrar paciente →</a></div></div>'; return; }
      var html = '';
      items.forEach(function(p) {
        var tutorName = p.tutorName || p.ownerName || '-';
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectPatient(\\'' + p.id + '\\',\\'' + escapeHtml(p.name) + '\\',\\'' + escapeHtml(p.species || '') + '\\',\\'' + escapeHtml(p.breed || '') + '\\',\\'' + escapeHtml(tutorName) + '\\',\\'' + (p.primaryOwnerId || '') + '\\',\\'' + JSON.stringify(p.alerts || []).replace(/\"/g, '&quot;') + '\\')">';
        html += '<strong>🐾 ' + escapeHtml(p.name) + '</strong>';
        if (p.breed) html += ' <span class="muted">· ' + escapeHtml(p.breed) + '</span>';
        html += '<br><span class="muted" style="font-size:0.8rem;">👤 Tutor: ' + escapeHtml(tutorName) + '</span>';
        html += '</div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectPatient = function(id, name, species, breed, tutorName, ownerId, alertsJson) {
    selectedPatient = { id: id, name: name, species: species, breed: breed, tutorName: tutorName, ownerId: ownerId };
    document.getElementById('encounter-patient-id').value = id;
    document.getElementById('encounter-owner-id').value = ownerId;
    document.getElementById('encounter-patient-name').textContent = '🐾 ' + name;
    document.getElementById('encounter-patient-info').textContent = (breed || species) + ' · Tutor: ' + tutorName;
    document.getElementById('encounter-patient-selected').style.display = 'block';
    document.getElementById('encounter-patient-results').innerHTML = '';
    
    // Auto-fill alerts from patient
    try {
      var alerts = JSON.parse(alertsJson.replace(/&quot;/g, '"'));
      alertsContainer.innerHTML = '';
      alertCounter = 0;
      if (alerts && alerts.length) alerts.forEach(function(a) { addAlertRow(a); });
    } catch(e) {}
  };

  document.getElementById('encounter-patient-change').addEventListener('click', function() {
    selectedPatient = null;
    document.getElementById('encounter-patient-id').value = '';
    document.getElementById('encounter-owner-id').value = '';
    document.getElementById('encounter-patient-selected').style.display = 'none';
    document.getElementById('encounter-patient-search').value = '';
    document.getElementById('encounter-patient-search').focus();
  });

  document.getElementById('encounter-patient-search-btn').addEventListener('click', function() {
    searchPatients(document.getElementById('encounter-patient-search').value);
  });
  document.getElementById('encounter-patient-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); searchPatients(this.value); }
  });

  // --- Form ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('encounter-form-title').textContent = editData ? 'Editar Atendimento' : 'Novo Atendimento';
    document.getElementById('encounter-edit-id').value = editData?.id || '';
    
    if (editData) {
      document.getElementById('encounter-type').value = editData.visitType || editData.attendanceType || editData.encounterType || '';
      document.getElementById('encounter-priority').value = editData.priority || 'normal';
      document.getElementById('encounter-origin').value = editData.origin || 'reception';
      document.getElementById('encounter-sector').value = editData.sector || 'consultation_room';
      document.getElementById('encounter-chief-complaint').value = editData.chiefComplaint || editData.reason || '';
      document.getElementById('encounter-triage-notes').value = editData.triageNotes || '';
      document.getElementById('encounter-admin-notes').value = editData.administrativeNotes || '';
      document.getElementById('encounter-weight').value = editData.weightAtAdmission || '';
      document.getElementById('encounter-temperature').value = editData.temperatureAtAdmission || '';
      document.getElementById('encounter-heartrate').value = editData.heartRateAtAdmission || '';
      document.getElementById('encounter-respiratory').value = editData.respiratoryRateAtAdmission || '';
      document.getElementById('encounter-mucosa').value = editData.mucosaStatus || '';
      document.getElementById('encounter-hydration').value = editData.hydrationStatus || '';
      
      if (editData.patientId) {
        var pName = editData.patientName || 'Paciente';
        var tutorName = editData.tutorName || editData.ownerName || '-';
        selectPatient(editData.patientId, pName, '', '', tutorName, editData.ownerId || '', '[]');
      }
      
      alertsContainer.innerHTML = '';
      alertCounter = 0;
      (editData.clinicalAlertsSnapshot || []).forEach(function(a) { addAlertRow(a); });
    } else {
      document.getElementById('encounter-form').reset();
      alertsContainer.innerHTML = '';
      alertCounter = 0;
      selectedPatient = null;
      document.getElementById('encounter-patient-id').value = '';
      document.getElementById('encounter-owner-id').value = '';
      document.getElementById('encounter-patient-selected').style.display = 'none';
      document.getElementById('encounter-priority').value = 'normal';
      document.getElementById('encounter-origin').value = 'reception';
      document.getElementById('encounter-sector').value = 'consultation_room';
      document.getElementById('encounter-type').value = 'consultation';
      
      // Pre-fill from patient context
      if (patientContextId) {
        apiRequest('/patients/' + patientContextId).then(function(resp) {
          if (resp.ok) {
            var p = resp.body || resp;
            var tutorName = p.tutorName || p.ownerName || '-';
            selectPatient(p.id, p.name, p.species || '', p.breed || '', tutorName, p.primaryOwnerId || '', JSON.stringify(p.alerts || []));
          }
        });
      }
    }
  }

  function hideForm() {
    formOverlay.style.display = 'none';
    if (patientContextId) { window.history.replaceState(null, '', '/encounters'); patientContextId = null; }
  }

  document.getElementById('encounter-new-btn').addEventListener('click', function() { showForm(); });
  document.getElementById('encounter-form-close').addEventListener('click', hideForm);
  document.getElementById('encounter-cancel').addEventListener('click', hideForm);

  // --- Submit ---
  document.getElementById('encounter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('encounter-edit-id').value;
    var patientId = document.getElementById('encounter-patient-id').value;
    var ownerId = document.getElementById('encounter-owner-id').value;
    
    if (!patientId) { showAlert('Selecione um paciente.', 'error'); return; }
    if (!ownerId) { showAlert('Paciente deve ter tutor vinculado.', 'error'); return; }

    var body = {
      patientId: patientId,
      ownerId: ownerId,
      visitType: document.getElementById('encounter-type').value,
      priority: document.getElementById('encounter-priority').value,
      origin: document.getElementById('encounter-origin').value,
      chiefComplaint: document.getElementById('encounter-chief-complaint').value,
      triageNotes: document.getElementById('encounter-triage-notes').value || undefined,
      administrativeNotes: document.getElementById('encounter-admin-notes').value || undefined,
      clinicalAlertsSnapshot: getAlertsFromForm(),
      weightAtAdmission: document.getElementById('encounter-weight').value ? parseFloat(document.getElementById('encounter-weight').value) : undefined,
      temperatureAtAdmission: document.getElementById('encounter-temperature').value ? parseFloat(document.getElementById('encounter-temperature').value) : undefined,
      heartRateAtAdmission: document.getElementById('encounter-heartrate').value ? parseInt(document.getElementById('encounter-heartrate').value) : undefined,
      respiratoryRateAtAdmission: document.getElementById('encounter-respiratory').value ? parseInt(document.getElementById('encounter-respiratory').value) : undefined,
      mucosaStatus: document.getElementById('encounter-mucosa').value || undefined,
      hydrationStatus: document.getElementById('encounter-hydration').value || undefined
    };

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/encounters/' + editId : '/encounters';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert(editId ? 'Atendimento atualizado!' : 'Atendimento aberto!', 'success');
        hideForm();
        loadEncounters();
      } else {
        showAlert('Erro: ' + (resp.body?.message || 'Erro desconhecido'), 'error');
      }
    });
  });

  // --- Load ---
  function loadEncounters() {
    var url = '/encounters';
    var params = [];
    var q = document.getElementById('encounter-search').value;
    var status = document.getElementById('encounter-filter-status').value;
    var priority = document.getElementById('encounter-filter-priority').value;
    if (q) params.push('q=' + encodeURIComponent(q));
    if (status) params.push('status=' + status);
    if (priority) params.push('priority=' + priority);
    if (params.length) url += '?' + params.join('&');
    
    apiRequest(url).then(function(resp) {
      renderTable(resp.body?.items || resp.body || []);
    }).catch(function(err) {
      showAlert('Erro ao carregar: ' + err.message, 'error');
    });
  }

  function renderTable(items) {
    if (!items.length) {
      document.getElementById('encounters-table').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🩺</div><div class="empty-state-text">Nenhum atendimento encontrado</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Paciente</th><th>Tutor</th><th>Tipo</th><th>Queixa</th><th>Prioridade</th><th>Status</th><th>Abertura</th><th>Ações</th></tr></thead><tbody>';
    items.forEach(function(e) {
      var typeLabel = typeLabels[e.visitType || e.attendanceType || e.encounterType] || '-';
      var prioLabel = priorityLabels[e.priority] || e.priority || '-';
      var statusLabel = statusLabels[e.status] || e.status || '-';
      var statusBadge = e.status === 'completed' ? 'success' : (e.status === 'cancelled' ? 'danger' : (e.status === 'in_progress' ? 'info' : 'warning'));
      var complaint = e.chiefComplaint || e.reason || '-';
      if (complaint.length > 40) complaint = complaint.substring(0, 40) + '...';
      
      html += '<tr>';
      html += '<td><strong>🐾 ' + escapeHtml(e.patientName || '-') + '</strong></td>';
      html += '<td>' + escapeHtml(e.tutorName || e.ownerName || '-') + '</td>';
      html += '<td>' + typeLabel + '</td>';
      html += '<td title="' + escapeHtml(e.chiefComplaint || e.reason || '') + '">' + escapeHtml(complaint) + '</td>';
      html += '<td>' + prioLabel + '</td>';
      html += '<td><span class="badge badge-' + statusBadge + '">' + statusLabel + '</span></td>';
      html += '<td>' + (e.openedAt || e.createdAt ? new Date(e.openedAt || e.createdAt).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-') + '</td>';
      html += '<td style="white-space:nowrap;"><button class="small secondary" onclick="showEncounterDetail(\\'' + e.id + '\\')">Ver</button>';
      if (e.status === 'open' || e.status === 'in_progress') {
        html += ' <button class="small" onclick="showEncounterActions(\\'' + e.id + '\\',\\'' + e.status + '\\')" style="background:var(--accent);color:white;padding:4px 8px;font-size:0.7rem;">Ações</button>';
      }
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('encounters-table').innerHTML = html;
  }

  // --- Detail ---
  window.showEncounterDetail = function(id) {
    apiRequest('/encounters/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar', 'error'); return; }
      var e = resp.body || resp;
      var alerts = e.clinicalAlertsSnapshot || [];
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">🩺 Atendimento</h2><button class="secondary small" onclick="document.getElementById(\\'encounter-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      html += '<div style="display:grid;gap:14px;">';
      
      // Status + Priority + Type
      var statusBadge = e.status === 'completed' ? 'success' : (e.status === 'cancelled' ? 'danger' : 'info');
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;"><span class="badge badge-' + statusBadge + '">' + (statusLabels[e.status] || e.status) + '</span> ' + (priorityLabels[e.priority] || '') + ' ' + (typeLabels[e.visitType || e.attendanceType || e.encounterType] || '') + '</div>';
      
      // Patient + Tutor
      html += '<div style="padding:12px;background:var(--primary-glow);border-radius:var(--radius-sm);">';
      html += '<strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Paciente</strong><br><strong>🐾 ' + escapeHtml(e.patientName || '-') + '</strong>';
      html += '<br><span class="muted">👤 Tutor: ' + escapeHtml(e.tutorName || e.ownerName || '-') + '</span>';
      html += '</div>';
      
      // Chief Complaint
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Queixa Principal</strong><br>' + escapeHtml(e.chiefComplaint || e.reason || '-') + '</div>';
      
      // Notes
      if (e.triageNotes) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Notas de Triagem</strong><br>' + escapeHtml(e.triageNotes) + '</div>';
      
      // Vitals
      if (e.weightAtAdmission || e.temperatureAtAdmission || e.heartRateAtAdmission) {
        html += '<div class="grid grid-4" style="gap:8px;">';
        if (e.weightAtAdmission) html += '<div style="text-align:center;padding:8px;background:rgba(99,102,241,0.06);border-radius:var(--radius-sm);"><div style="font-size:1.2rem;font-weight:700;">' + e.weightAtAdmission + '</div><div style="font-size:0.7rem;color:var(--ink-muted);">kg</div></div>';
        if (e.temperatureAtAdmission) html += '<div style="text-align:center;padding:8px;background:rgba(99,102,241,0.06);border-radius:var(--radius-sm);"><div style="font-size:1.2rem;font-weight:700;">' + e.temperatureAtAdmission + '°</div><div style="font-size:0.7rem;color:var(--ink-muted);">Temp</div></div>';
        if (e.heartRateAtAdmission) html += '<div style="text-align:center;padding:8px;background:rgba(99,102,241,0.06);border-radius:var(--radius-sm);"><div style="font-size:1.2rem;font-weight:700;">' + e.heartRateAtAdmission + '</div><div style="font-size:0.7rem;color:var(--ink-muted);">FC bpm</div></div>';
        if (e.respiratoryRateAtAdmission) html += '<div style="text-align:center;padding:8px;background:rgba(99,102,241,0.06);border-radius:var(--radius-sm);"><div style="font-size:1.2rem;font-weight:700;">' + e.respiratoryRateAtAdmission + '</div><div style="font-size:0.7rem;color:var(--ink-muted);">FR irpm</div></div>';
        html += '</div>';
      }
      
      // Alerts
      if (alerts.length) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--danger);">⚠️ Alertas</strong>';
        alerts.forEach(function(a) {
          var sevClass = a.severity === 'high' ? 'danger' : (a.severity === 'medium' ? 'warning' : 'info');
          html += '<div style="padding:4px 8px;margin-top:3px;border-left:3px solid var(--' + sevClass + ');background:var(--' + sevClass + '-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:0.85rem;"><strong>' + (alertTypes[a.type] || a.type) + '</strong>: ' + escapeHtml(a.label) + '</div>';
        });
        html += '</div>';
      }
      
      // Timestamps
      html += '<div style="font-size:0.8rem;color:var(--ink-muted);">Aberto: ' + (e.openedAt ? new Date(e.openedAt).toLocaleString('pt-BR') : '-') + '</div>';
      
      html += '</div>';
      
      document.getElementById('encounter-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Actions (Transition/Close) ---
  window.showEncounterActions = function(id, currentStatus) {
    var transitions = {
      open: [{ to: 'in_progress', label: '▶ Iniciar atendimento', class: '' }, { to: 'waiting', label: '⏳ Aguardando', class: 'secondary' }, { to: 'cancelled', label: '✕ Cancelar', class: 'danger' }],
      in_progress: [{ to: 'completed', label: '✅ Finalizar', class: '' }, { to: 'waiting', label: '⏳ Aguardando', class: 'secondary' }, { to: 'cancelled', label: '✕ Cancelar', class: 'danger' }],
      waiting: [{ to: 'in_progress', label: '▶ Retomar', class: '' }, { to: 'cancelled', label: '✕ Cancelar', class: 'danger' }]
    };
    
    var actions = transitions[currentStatus] || [];
    if (!actions.length) { showAlert('Sem ações disponíveis para este status', 'info'); return; }
    
    var html = '<h3 style="margin:0 0 12px;">Ações do Atendimento</h3>';
    html += '<div style="display:grid;gap:8px;">';
    actions.forEach(function(a) {
      html += '<button class="' + (a.class || '') + '" onclick="transitionEncounter(\\'' + id + '\\',\\'' + a.to + '\\')" style="width:100%;text-align:left;padding:12px 16px;">' + a.label + '</button>';
    });
    html += '</div>';
    html += '<button class="secondary" onclick="document.getElementById(\\'encounter-action-overlay\\').style.display=\\'none\\'" style="width:100%;margin-top:12px;">Fechar</button>';
    
    document.getElementById('encounter-action-content').innerHTML = html;
    actionOverlay.style.display = 'grid';
  };

  window.transitionEncounter = function(id, newStatus) {
    var body = { status: newStatus };
    if (newStatus === 'completed') body.finishedAt = new Date().toISOString();
    if (newStatus === 'cancelled') body.cancelledAt = new Date().toISOString();
    
    apiRequest('/encounters/' + id + '/transition', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert('Status atualizado!', 'success');
        actionOverlay.style.display = 'none';
        loadEncounters();
      } else {
        showAlert('Erro: ' + (resp.body?.message || ''), 'error');
      }
    });
  };

  // --- Edit ---
  window.editEncounter = function(id) {
    apiRequest('/encounters/' + id).then(function(resp) {
      if (resp.ok) showForm(resp.body || resp);
    });
  };

  // --- Search ---
  document.getElementById('encounter-search-btn').addEventListener('click', loadEncounters);
  document.getElementById('encounter-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') loadEncounters(); });
  document.getElementById('encounter-filter-status').addEventListener('change', loadEncounters);
  document.getElementById('encounter-filter-priority').addEventListener('change', loadEncounters);
  document.getElementById('reload-encounters').addEventListener('click', loadEncounters);

  // --- Init ---
  loadEncounters();
  if (patientContextId) { setTimeout(function() { showForm(); }, 500); }
})();
</script>
`;
}
