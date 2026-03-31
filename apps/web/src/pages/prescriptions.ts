export function renderPrescriptions(): string {
  return `
<div class="page-header">
  <div>
    <h1>Prescrições</h1>
    <p class="subtitle">Plano terapêutico e conduta clínica</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="rx-new-btn" style="white-space:nowrap;">+ Nova Prescrição</button>
    <button id="reload-rx" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="rx-alert"></div>

<!-- Encounter Selector -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <label style="flex:1;min-width:200px;margin:0;">
      <span style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">Selecionar Atendimento</span>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <input id="rx-encounter-search" placeholder="Buscar por paciente, tutor ou ID..." style="flex:1;" />
        <button id="rx-encounter-search-btn" class="secondary">Buscar</button>
      </div>
    </label>
  </div>
  <div id="rx-encounter-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
  <div id="rx-encounter-selected" style="display:none;padding:12px;background:var(--success-soft);border-radius:var(--radius-sm);margin-top:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong id="rx-enc-label"></strong>
        <div class="muted" style="font-size:0.8rem;" id="rx-enc-info"></div>
      </div>
      <button class="secondary small" id="rx-enc-change">Trocar</button>
    </div>
  </div>
</div>

<!-- Prescriptions List -->
<div id="rx-list-section" style="display:none;">
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="margin:0;">💊 Prescrições do Atendimento</h2>
      <span class="badge badge-info" id="rx-count">0 prescrições</span>
    </div>
    <div id="rx-list"></div>
  </div>
</div>

<!-- Form Modal -->
<div id="rx-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:850px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="rx-form-title" style="margin:0;">Nova Prescrição</h2>
      <button class="secondary small" id="rx-form-close" type="button">✕</button>
    </div>
    
    <form id="rx-form">
      <input type="hidden" id="rx-edit-id" />
      <input type="hidden" id="rx-encounter-id" />
      <input type="hidden" id="rx-patient-id" />
      <input type="hidden" id="rx-owner-id" />
      
      <!-- Bloco 1: Contexto -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📋 Contexto</h3>
        <div id="rx-context-info" style="padding:10px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-bottom:12px;font-size:0.9rem;"></div>
        <div class="grid grid-3">
          <label>Tipo de Prescrição *
            <select id="rx-type" required>
              <option value="outpatient_prescription">💊 Receita Ambulatorial</option>
              <option value="inpatient_medication">🏥 Medicação Internação</option>
              <option value="therapeutic_plan">📋 Plano Terapêutico</option>
              <option value="discharge_instructions">🏠 Orientações de Alta</option>
              <option value="procedure_plan">💉 Plano de Procedimento</option>
              <option value="supportive_care_plan">🩹 Cuidados de Suporte</option>
            </select>
          </label>
          <label>Título
            <input id="rx-title" placeholder="Ex: Antibioticoterapia" />
          </label>
          <label>Status
            <select id="rx-status">
              <option value="active">✅ Ativa</option>
              <option value="draft">📝 Rascunho</option>
              <option value="completed">✔ Concluída</option>
              <option value="cancelled">✕ Cancelada</option>
            </select>
          </label>
        </div>
        <label style="margin-top:12px;">Resumo / Objetivos Terapêuticos
          <textarea id="rx-summary" placeholder="Objetivos do tratamento..." style="min-height:50px;"></textarea>
        </label>
      </div>

      <!-- Bloco 2: Itens Prescritos -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--line);">
          <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0;">💊 Itens Prescritos *</h3>
          <button type="button" id="rx-add-item" class="secondary small">+ Adicionar Item</button>
        </div>
        <div id="rx-items-container"></div>
        <div id="rx-items-empty" class="muted" style="padding:16px;text-align:center;">Clique em "Adicionar Item" para incluir medicamentos, procedimentos ou orientações</div>
      </div>

      <!-- Bloco 3: Instruções -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📝 Instruções e Observações</h3>
        <label>Instruções Gerais
          <textarea id="rx-instructions" placeholder="Orientações gerais para o tutor/equipe..." style="min-height:60px;"></textarea>
        </label>
        <label style="margin-top:12px;">Notas / Observações
          <textarea id="rx-notes" placeholder="Observações adicionais..." style="min-height:60px;"></textarea>
        </label>
      </div>

      <div class="btn-row">
        <button type="submit" id="rx-submit">Salvar Prescrição</button>
        <button type="button" class="secondary" id="rx-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Detail Modal -->
<div id="rx-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;" id="rx-detail-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('rx-alert');
  var formOverlay = document.getElementById('rx-form-overlay');
  var detailOverlay = document.getElementById('rx-detail-overlay');
  var itemsContainer = document.getElementById('rx-items-container');
  var itemsEmpty = document.getElementById('rx-items-empty');
  var itemCounter = 0;
  var selectedEncounter = null;

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var typeLabels = {
    outpatient_prescription: '💊 Receita Ambulatorial',
    inpatient_medication: '🏥 Medicação Internação',
    therapeutic_plan: '📋 Plano Terapêutico',
    discharge_instructions: '🏠 Orientações de Alta',
    procedure_plan: '💉 Plano de Procedimento',
    supportive_care_plan: '🩹 Cuidados de Suporte'
  };
  var statusLabels = { draft: '📝 Rascunho', active: '✅ Ativa', amended: '✏ Emendada', superseded: '🔄 Substituída', cancelled: '✕ Cancelada', completed: '✔ Concluída' };
  var itemTypeLabels = { medication: '💊 Medicamento', procedure: '💉 Procedimento', care_instruction: '🩹 Cuidado', diet: '🥗 Dieta', fluid_therapy: '💧 Hidroterapia', monitoring: '📊 Monitoramento', exam_followup: '🔬 Follow-up Exame', restriction: '🚫 Restrição' };
  var routeLabels = { oral: 'Oral', intravenous: 'IV', intramuscular: 'IM', subcutaneous: 'SC', topical: 'Tópico', ophthalmic: 'Oftálmico', otic: 'Ótico', inhaled: 'Inalatória', rectal: 'Retal', other: 'Outro' };

  // --- Item Management ---
  function addItemRow(data) {
    itemCounter++;
    var id = 'ri' + itemCounter;
    itemsEmpty.style.display = 'none';
    var row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:14px;margin-bottom:10px;background:rgba(99,102,241,0.02);border-left:3px solid var(--primary);';
    row.id = 'rx-item-' + id;
    row.innerHTML = 
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><strong style="font-size:0.8rem;color:var(--primary);">Item #' + itemCounter + '</strong><button type="button" class="danger small" onclick="this.closest(\\'.card\\').remove();updateItemsVisibility()" style="padding:3px 8px;font-size:0.7rem;">Remover</button></div>' +
      '<div class="grid grid-3" style="gap:8px;">' +
        '<label style="font-size:0.7rem;">Tipo<select class="rx-item-type"><option value="medication"' + (data?.itemType==='medication'?' selected':'') + '>Medicamento</option><option value="procedure"' + (data?.itemType==='procedure'?' selected':'') + '>Procedimento</option><option value="care_instruction"' + (data?.itemType==='care_instruction'?' selected':'') + '>Cuidado</option><option value="diet"' + (data?.itemType==='diet'?' selected':'') + '>Dieta</option><option value="fluid_therapy"' + (data?.itemType==='fluid_therapy'?' selected':'') + '>Hidroterapia</option><option value="monitoring"' + (data?.itemType==='monitoring'?' selected':'') + '>Monitoramento</option><option value="exam_followup"' + (data?.itemType==='exam_followup'?' selected':'') + '>Follow-up</option><option value="restriction"' + (data?.itemType==='restriction'?' selected':'') + '>Restrição</option></select></label>' +
        '<label style="font-size:0.7rem;">Nome/Item *<input class="rx-item-name" placeholder="Ex: Amoxicilina 500mg" value="' + (data?.itemName || '') + '" required /></label>' +
        '<label style="font-size:0.7rem;">Dosagem *<input class="rx-item-dosage" placeholder="Ex: 1 comp" value="' + (data?.dosage || '') + '" required /></label>' +
      '</div>' +
      '<div class="grid grid-4" style="gap:8px;margin-top:6px;">' +
        '<label style="font-size:0.7rem;">Via<select class="rx-item-route"><option value="oral"' + (data?.route==='oral'?' selected':'') + '>Oral</option><option value="intravenous"' + (data?.route==='intravenous'?' selected':'') + '>IV</option><option value="intramuscular"' + (data?.route==='intramuscular'?' selected':'') + '>IM</option><option value="subcutaneous"' + (data?.route==='subcutaneous'?' selected':'') + '>SC</option><option value="topical"' + (data?.route==='topical'?' selected':'') + '>Tópico</option><option value="ophthalmic"' + (data?.route==='ophthalmic'?' selected':'') + '>Oftálmico</option><option value="otic"' + (data?.route==='otic'?' selected':'') + '>Ótico</option><option value="inhaled"' + (data?.route==='inhaled'?' selected':'') + '>Inalatória</option><option value="other"' + (data?.route==='other'?' selected':'') + '>Outro</option></select></label>' +
        '<label style="font-size:0.7rem;">Frequência<input class="rx-item-frequency" placeholder="Ex: 8/8h" value="' + (data?.frequency || '') + '" /></label>' +
        '<label style="font-size:0.7rem;">Duração<input class="rx-item-duration" placeholder="Ex: 7 dias" value="' + (data?.duration || '') + '" /></label>' +
        '<label style="font-size:0.7rem;">Qtd<input class="rx-item-quantity" type="number" min="1" placeholder="1" value="' + (data?.quantity || '') + '" /></label>' +
      '</div>' +
      '<label style="font-size:0.7rem;margin-top:6px;">Instruções de Administração<input class="rx-item-admin-instructions" placeholder="Ex: Administrar após alimentação" value="' + (data?.administrationInstructions || '') + '" /></label>';
    itemsContainer.appendChild(row);
  }

  function getItemsFromForm() {
    var items = [];
    itemsContainer.querySelectorAll('[id^="rx-item-"]').forEach(function(row) {
      var name = row.querySelector('.rx-item-name').value.trim();
      var dosage = row.querySelector('.rx-item-dosage').value.trim();
      if (!name || !dosage) return;
      items.push({
        itemType: row.querySelector('.rx-item-type').value,
        itemName: name,
        dosage: dosage,
        route: row.querySelector('.rx-item-route').value,
        frequency: row.querySelector('.rx-item-frequency').value.trim() || undefined,
        duration: row.querySelector('.rx-item-duration').value.trim() || undefined,
        quantity: row.querySelector('.rx-item-quantity').value ? parseInt(row.querySelector('.rx-item-quantity').value) : undefined,
        administrationInstructions: row.querySelector('.rx-item-admin-instructions').value.trim() || undefined
      });
    });
    return items;
  }

  window.updateItemsVisibility = function() {
    var hasItems = itemsContainer.querySelectorAll('[id^="rx-item-"]').length > 0;
    itemsEmpty.style.display = hasItems ? 'none' : 'block';
  };

  document.getElementById('rx-add-item').addEventListener('click', function() { addItemRow(); });

  // --- Encounter Search ---
  function searchEncounters(query) {
    var resultsDiv = document.getElementById('rx-encounter-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>'; return; }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando...</div>';
    apiRequest('/encounters?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Nenhum atendimento encontrado</div>'; return; }
      var html = '';
      items.forEach(function(e) {
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectEncounter(\\'' + e.id + '\\',\\'' + escapeHtml(e.patientName || '-') + '\\',\\'' + escapeHtml(e.tutorName || e.ownerName || '-') + '\\',\\'' + escapeHtml(e.chiefComplaint || '-') + '\\',\\'' + (e.patientId || '') + '\\',\\'' + (e.ownerId || '') + '\\')">';
        html += '<strong>🩺 ' + escapeHtml(e.patientName || '-') + '</strong><br>';
        html += '<span class="muted" style="font-size:0.8rem;">👤 ' + escapeHtml(e.tutorName || e.ownerName || '-') + '</span>';
        html += '</div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectEncounter = function(id, patientName, tutorName, chiefComplaint, patientId, ownerId) {
    selectedEncounter = { id: id, patientName: patientName, tutorName: tutorName, chiefComplaint: chiefComplaint, patientId: patientId, ownerId: ownerId };
    document.getElementById('rx-enc-label').textContent = '🩺 ' + patientName;
    document.getElementById('rx-enc-info').textContent = '👤 ' + tutorName + ' — ' + chiefComplaint;
    document.getElementById('rx-encounter-selected').style.display = 'block';
    document.getElementById('rx-encounter-results').innerHTML = '';
    document.getElementById('rx-list-section').style.display = 'block';
    loadPrescriptions(id);
  };

  document.getElementById('rx-enc-change').addEventListener('click', function() {
    selectedEncounter = null;
    document.getElementById('rx-encounter-selected').style.display = 'none';
    document.getElementById('rx-list-section').style.display = 'none';
  });

  document.getElementById('rx-encounter-search-btn').addEventListener('click', function() {
    searchEncounters(document.getElementById('rx-encounter-search').value);
  });
  document.getElementById('rx-encounter-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); searchEncounters(this.value); }
  });

  // --- Load Prescriptions ---
  function loadPrescriptions(encounterId) {
    // Use medical-records entries with type prescription as source
    apiRequest('/medical-records/entries?encounterId=' + encounterId).then(function(resp) {
      var entries = (resp.body?.items || resp.body || []);
      // Filter for prescription-type entries
      var prescriptions = entries.filter(function(e) { return e.entryType === 'prescription' || e.prescriptionType; });
      renderPrescriptionsList(prescriptions);
    }).catch(function() {
      document.getElementById('rx-list').innerHTML = '<div class="muted">Erro ao carregar prescrições</div>';
    });
  }

  function renderPrescriptionsList(items) {
    document.getElementById('rx-count').textContent = items.length + ' prescrição' + (items.length !== 1 ? 'ões' : '');
    if (!items.length) {
      document.getElementById('rx-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">💊</div><div class="empty-state-text">Nenhuma prescrição registrada</div></div>';
      return;
    }
    var html = '';
    items.forEach(function(rx) {
      var typeLabel = typeLabels[rx.prescriptionType || rx.entryType] || rx.entryType;
      var statusLabel = statusLabels[rx.status] || rx.status || 'Ativa';
      var statusBadge = rx.status === 'completed' ? 'success' : (rx.status === 'cancelled' ? 'danger' : (rx.status === 'active' ? 'info' : 'warning'));
      var date = rx.recordedAt || rx.createdAt;
      var dateStr = date ? new Date(date).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
      var itemCount = (rx.items || rx.prescriptionItems || []).length;
      
      html += '<div style="padding:14px;border:1px solid var(--line);border-radius:var(--radius);margin-bottom:10px;cursor:pointer;transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow=\\'var(--shadow-md)\\'" onmouseout="this.style.boxShadow=\\'\\'" onclick="showRxDetail(\\'' + rx.id + '\\')">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<strong>' + typeLabel + '</strong>';
      html += '<div><span class="badge badge-' + statusBadge + '" style="font-size:0.65rem;">' + statusLabel + '</span> <span style="font-size:0.75rem;color:var(--ink-muted);">' + dateStr + '</span></div>';
      html += '</div>';
      if (rx.title || rx.summary) html += '<div style="font-size:0.85rem;margin-bottom:4px;">' + escapeHtml(rx.title || rx.summary || '') + '</div>';
      if (itemCount) html += '<div class="muted" style="font-size:0.8rem;">' + itemCount + ' item' + (itemCount !== 1 ? 'ns' : '') + ' prescrito' + (itemCount !== 1 ? 's' : '') + '</div>';
      html += '</div>';
    });
    document.getElementById('rx-list').innerHTML = html;
  }

  // --- Detail ---
  window.showRxDetail = function(id) {
    apiRequest('/medical-records/entries/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar', 'error'); return; }
      var rx = resp.body || resp;
      var items = rx.items || rx.prescriptionItems || [];
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">💊 ' + (typeLabels[rx.prescriptionType] || 'Prescrição') + '</h2><button class="secondary small" onclick="document.getElementById(\\'rx-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      html += '<div style="display:grid;gap:14px;">';
      
      // Status
      var statusBadge = rx.status === 'completed' ? 'success' : (rx.status === 'cancelled' ? 'danger' : 'info');
      html += '<div><span class="badge badge-' + statusBadge + '">' + (statusLabels[rx.status] || rx.status) + '</span></div>';
      
      // Summary
      if (rx.title) html += '<div><strong style="font-size:1rem;">' + escapeHtml(rx.title) + '</strong></div>';
      if (rx.summary) html += '<div style="font-size:0.9rem;color:var(--ink-soft);">' + escapeHtml(rx.summary) + '</div>';
      
      // Items
      if (items.length) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Itens Prescritos</strong>';
        items.forEach(function(item, i) {
          html += '<div style="padding:10px;margin-top:6px;border:1px solid var(--line);border-radius:var(--radius-sm);border-left:3px solid var(--primary);">';
          html += '<div style="display:flex;justify-content:space-between;"><strong>' + escapeHtml(item.itemName) + '</strong><span class="badge" style="font-size:0.6rem;background:var(--primary-glow);color:var(--primary);">' + (itemTypeLabels[item.itemType] || item.itemType) + '</span></div>';
          html += '<div style="margin-top:4px;font-size:0.85rem;">';
          html += '<strong>' + escapeHtml(item.dosage) + '</strong>';
          if (item.route) html += ' · ' + (routeLabels[item.route] || item.route);
          if (item.frequency) html += ' · ' + escapeHtml(item.frequency);
          if (item.duration) html += ' · ' + escapeHtml(item.duration);
          if (item.quantity) html += ' · Qtd: ' + item.quantity;
          html += '</div>';
          if (item.administrationInstructions) html += '<div class="muted" style="font-size:0.8rem;margin-top:4px;">📝 ' + escapeHtml(item.administrationInstructions) + '</div>';
          html += '</div>';
        });
        html += '</div>';
      }
      
      // Instructions
      if (rx.instructions) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Instruções</strong><div>' + escapeHtml(rx.instructions) + '</div></div>';
      if (rx.notes) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Notas</strong><div>' + escapeHtml(rx.notes) + '</div></div>';
      
      html += '</div>';
      document.getElementById('rx-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Form ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('rx-form-title').textContent = editData ? 'Editar Prescrição' : 'Nova Prescrição';
    document.getElementById('rx-edit-id').value = editData?.id || '';
    
    if (selectedEncounter) {
      document.getElementById('rx-encounter-id').value = selectedEncounter.id;
      document.getElementById('rx-patient-id').value = selectedEncounter.patientId || '';
      document.getElementById('rx-owner-id').value = selectedEncounter.ownerId || '';
      document.getElementById('rx-context-info').innerHTML = '<strong>🩺 ' + escapeHtml(selectedEncounter.patientName) + '</strong> · 👤 ' + escapeHtml(selectedEncounter.tutorName);
    }
    
    if (editData) {
      document.getElementById('rx-type').value = editData.prescriptionType || 'outpatient_prescription';
      document.getElementById('rx-title').value = editData.title || '';
      document.getElementById('rx-status').value = editData.status || 'active';
      document.getElementById('rx-summary').value = editData.summary || '';
      document.getElementById('rx-instructions').value = editData.instructions || '';
      document.getElementById('rx-notes').value = editData.notes || '';
      itemsContainer.innerHTML = '';
      itemCounter = 0;
      (editData.items || editData.prescriptionItems || []).forEach(function(item) { addItemRow(item); });
      updateItemsVisibility();
    } else {
      document.getElementById('rx-form').reset();
      itemsContainer.innerHTML = '';
      itemCounter = 0;
      itemsEmpty.style.display = 'block';
      document.getElementById('rx-type').value = 'outpatient_prescription';
      document.getElementById('rx-status').value = 'active';
      if (selectedEncounter) {
        document.getElementById('rx-encounter-id').value = selectedEncounter.id;
        document.getElementById('rx-patient-id').value = selectedEncounter.patientId || '';
        document.getElementById('rx-owner-id').value = selectedEncounter.ownerId || '';
      }
    }
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  document.getElementById('rx-new-btn').addEventListener('click', function() {
    if (!selectedEncounter) { showAlert('Selecione um atendimento primeiro.', 'error'); return; }
    showForm();
  });
  document.getElementById('rx-form-close').addEventListener('click', hideForm);
  document.getElementById('rx-cancel').addEventListener('click', hideForm);

  // --- Submit ---
  document.getElementById('rx-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('rx-edit-id').value;
    var encounterId = document.getElementById('rx-encounter-id').value;
    var items = getItemsFromForm();
    
    if (!encounterId) { showAlert('Selecione um atendimento.', 'error'); return; }
    if (!items.length) { showAlert('Adicione pelo menos um item prescrito.', 'error'); return; }

    var body = {
      encounterId: encounterId,
      patientId: document.getElementById('rx-patient-id').value,
      entryType: 'prescription',
      prescriptionType: document.getElementById('rx-type').value,
      title: document.getElementById('rx-title').value || undefined,
      summary: document.getElementById('rx-summary').value || undefined,
      status: document.getElementById('rx-status').value,
      instructions: document.getElementById('rx-instructions').value || undefined,
      notes: document.getElementById('rx-notes').value || undefined,
      prescriptionItems: items,
      recordedAt: new Date().toISOString()
    };

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/medical-records/entries/' + editId : '/medical-records/entries';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert(editId ? 'Prescrição atualizada!' : 'Prescrição registrada!', 'success');
        hideForm();
        if (selectedEncounter) loadPrescriptions(selectedEncounter.id);
      } else {
        showAlert('Erro: ' + (resp.body?.message || 'Erro desconhecido'), 'error');
      }
    });
  });

  // --- Init ---
  document.getElementById('reload-rx').addEventListener('click', function() {
    if (selectedEncounter) loadPrescriptions(selectedEncounter.id);
  });
})();
</script>
`;
}
