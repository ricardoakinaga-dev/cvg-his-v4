export function renderPatients(): string {
  return `
<div class="page-header">
  <div>
    <h1>Pacientes</h1>
    <p class="subtitle">Cadastro clinico de animais atendidos</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="patient-new-btn" style="white-space:nowrap;">+ Novo Paciente</button>
    <button id="reload-patients" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="patients-alert"></div>

<!-- Search -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <input id="patient-search" placeholder="Buscar por nome, raça, microchip ou tutor..." style="flex:1;min-width:200px;" />
    <select id="patient-filter-species" style="width:auto;min-width:120px;">
      <option value="">Todas espécies</option>
      <option value="canine">Canino</option>
      <option value="feline">Felino</option>
      <option value="other">Outro</option>
    </select>
    <select id="patient-filter-status" style="width:auto;min-width:120px;">
      <option value="">Todos status</option>
      <option value="active">Ativos</option>
      <option value="inactive">Inativos</option>
      <option value="deceased">Falecidos</option>
    </select>
    <button id="patient-search-btn" class="secondary" style="white-space:nowrap;">Buscar</button>
  </div>
</div>

<!-- Form Modal -->
<div id="patient-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:780px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="patient-form-title" style="margin:0;">Novo Paciente</h2>
      <button class="secondary small" id="patient-form-close" type="button">✕</button>
    </div>
    
    <form id="patient-form">
      <input type="hidden" id="patient-edit-id" />
      
      <!-- Bloco 1: Identificação -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🐾 Identificação</h3>
        <div class="grid grid-2">
          <label>Nome do Paciente *
            <input id="patient-name" required placeholder="Nome do animal" />
          </label>
          <label>Espécie *
            <select id="patient-species" required>
              <option value="">Selecione...</option>
              <option value="canine">🐕 Canino</option>
              <option value="feline">🐈 Felino</option>
              <option value="avian">🐦 Aves</option>
              <option value="rodent">🐹 Roedor</option>
              <option value="reptile">🦎 Réptil</option>
              <option value="other">🐾 Outro</option>
            </select>
          </label>
        </div>
        <div class="grid grid-3">
          <label>Raça
            <input id="patient-breed" placeholder="Ex: Golden Retriever" />
          </label>
          <label>Sexo *
            <select id="patient-sex" required>
              <option value="">Selecione...</option>
              <option value="male">♂ Macho</option>
              <option value="female">♀ Fêmea</option>
              <option value="unknown">❓ Desconhecido</option>
            </select>
          </label>
          <label>Pelagem
            <input id="patient-coat" placeholder="Ex: Dourado curto" />
          </label>
        </div>
        <div class="grid grid-2">
          <label>Status
            <select id="patient-status">
              <option value="active">✅ Ativo</option>
              <option value="inactive">⏸ Inativo</option>
              <option value="deceased">✝ Falecido</option>
            </select>
          </label>
          <label>Microchip
            <input id="patient-microchip" placeholder="Número do microchip" />
          </label>
        </div>
      </div>

      <!-- Bloco 2: Tutor (Obrigatório) -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">👤 Tutor Responsável *</h3>
        <div id="patient-tutor-section">
          <div id="patient-tutor-selected" style="display:none;padding:12px;background:var(--success-soft);border-radius:var(--radius-sm);margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong id="patient-tutor-name"></strong>
                <div class="muted" style="font-size:0.8rem;" id="patient-tutor-info"></div>
              </div>
              <button type="button" class="secondary small" id="patient-tutor-change">Trocar</button>
            </div>
          </div>
          <div id="patient-tutor-search-area">
            <div style="display:flex;gap:8px;">
              <input id="patient-tutor-search" placeholder="Buscar tutor por nome, documento ou telefone..." style="flex:1;" />
              <button type="button" id="patient-tutor-search-btn" class="secondary">Buscar</button>
            </div>
            <div id="patient-tutor-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
          </div>
          <input type="hidden" id="patient-tutor-id" />
        </div>
      </div>

      <!-- Bloco 3: Dados Clínicos -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🩺 Dados Clínicos</h3>
        <div class="grid grid-3">
          <label>Peso (kg)
            <input id="patient-weight" type="number" step="0.1" min="0" placeholder="0.0" />
          </label>
          <label>Castrado
            <select id="patient-neutered">
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </label>
          <label>Tamanho
            <select id="patient-size">
              <option value="">Não informado</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </select>
          </label>
        </div>
        <div class="grid grid-2">
          <label>Data de Nascimento
            <input id="patient-birth-date" type="date" />
          </label>
          <label>Idade Estimada (se não souber data)
            <input id="patient-estimated-age" placeholder="Ex: ~3 anos" />
          </label>
        </div>
        <div class="muted" style="font-size:0.75rem;margin-top:4px;">Preencha apenas um: data de nascimento OU idade estimada.</div>
      </div>

      <!-- Bloco 4: Alertas Clínicos -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--line);">
          <h3 style="font-size:0.85rem;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:0.04em;margin:0;">⚠️ Alertas Clínicos</h3>
          <button type="button" id="patient-add-alert" class="secondary small">+ Adicionar</button>
        </div>
        <div id="patient-alerts-container">
          <!-- Dynamic alert rows -->
        </div>
      </div>

      <!-- Bloco 5: Observações -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📝 Observações</h3>
        <label>Notas Gerais
          <textarea id="patient-notes" placeholder="Observações gerais sobre o paciente"></textarea>
        </label>
        <label style="margin-top:12px;">Notas Comportamentais
          <textarea id="patient-behavioral-notes" placeholder="Comportamento, temperamento, reações"></textarea>
        </label>
      </div>

      <div class="btn-row">
        <button type="submit" id="patient-submit">Salvar Paciente</button>
        <button type="button" class="secondary" id="patient-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Table -->
<div class="card">
  <div id="patients-table"></div>
</div>

<!-- Detail Modal -->
<div id="patient-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:600px;max-height:90vh;overflow-y:auto;margin:auto;" id="patient-detail-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('patients-alert');
  var formOverlay = document.getElementById('patient-form-overlay');
  var detailOverlay = document.getElementById('patient-detail-overlay');
  var alertsContainer = document.getElementById('patient-alerts-container');
  var alertCounter = 0;
  var selectedTutor = null;

  // Check for tutor context from URL
  var urlParams = new URLSearchParams(window.location.search);
  var tutorContextId = urlParams.get('tutorId');

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var speciesLabels = { canine: '🐕 Canino', feline: '🐈 Felino', avian: '🐦 Aves', rodent: '🐹 Roedor', reptile: '🦎 Réptil', other: '🐾 Outro' };
  var sexLabels = { male: '♂ Macho', female: '♀ Fêmea', unknown: '❓ Desconhecido' };
  var alertTypes = { allergy: 'Alergia', aggression: 'Agressão', anesthesia_risk: 'Risco Anestésico', chronic_condition: 'Condição Crônica', other: 'Outro' };
  var alertSeverities = { low: 'Baixa', medium: 'Média', high: 'Alta' };

  // --- Alert Management ---
  function addAlertRow(data) {
    alertCounter++;
    var id = 'a' + alertCounter;
    var row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:12px;margin-bottom:8px;background:rgba(239,68,68,0.03);';
    row.id = 'alert-row-' + id;
    row.innerHTML = 
      '<div class="grid grid-3" style="gap:8px;">' +
        '<label style="font-size:0.7rem;">Tipo<select class="alert-type"><option value="allergy"' + (data?.type==='allergy'?' selected':'') + '>Alergia</option><option value="aggression"' + (data?.type==='aggression'?' selected':'') + '>Agressão</option><option value="anesthesia_risk"' + (data?.type==='anesthesia_risk'?' selected':'') + '>Risco Anestésico</option><option value="chronic_condition"' + (data?.type==='chronic_condition'?' selected':'') + '>Condição Crônica</option><option value="other"' + (data?.type==='other'?' selected':'') + '>Outro</option></select></label>' +
        '<label style="font-size:0.7rem;">Descrição<input class="alert-label" placeholder="Descreva o alerta" value="' + (data?.label || '') + '" /></label>' +
        '<label style="font-size:0.7rem;">Severidade<select class="alert-severity"><option value="low"' + (data?.severity==='low'?' selected':'') + '>Baixa</option><option value="medium"' + (data?.severity==='medium'?' selected':'') + '>Média</option><option value="high"' + (data?.severity==='high'?' selected':'') + '>Alta</option></select></label>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:6px;">' +
        '<button type="button" class="danger small" onclick="this.closest(\\'.card\\').remove()" style="padding:4px 10px;font-size:0.7rem;">Remover</button>' +
      '</div>';
    alertsContainer.appendChild(row);
  }

  function getAlertsFromForm() {
    var alerts = [];
    alertsContainer.querySelectorAll('[id^="alert-row-"]').forEach(function(row) {
      var label = row.querySelector('.alert-label').value.trim();
      if (!label) return;
      alerts.push({
        type: row.querySelector('.alert-type').value,
        label: label,
        severity: row.querySelector('.alert-severity').value
      });
    });
    return alerts;
  }

  document.getElementById('patient-add-alert').addEventListener('click', function() { addAlertRow(); });

  // --- Tutor Search ---
  function searchTutors(query) {
    var resultsDiv = document.getElementById('patient-tutor-results');
    if (!query || query.length < 2) {
      resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>';
      return;
    }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando...</div>';
    apiRequest('/owners?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) {
        resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Nenhum tutor encontrado</div>';
        return;
      }
      var html = '';
      items.forEach(function(t) {
        var doc = t.document || {};
        var contact = (t.contacts || []).find(function(c) { return c.isPrimary; }) || (t.contacts || [])[0];
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectTutor(\\'' + t.id + '\\',\\'' + escapeHtml(t.fullName) + '\\',\\'' + (doc.number || '') + '\\',\\'' + (contact?.value || '') + '\\')">';
        html += '<strong>' + escapeHtml(t.fullName) + '</strong>';
        if (doc.number) html += ' <code style="font-size:0.75rem;">' + escapeHtml(doc.number) + '</code>';
        if (contact) html += ' <span class="muted" style="font-size:0.8rem;">' + escapeHtml(contact.value) + '</span>';
        html += '</div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectTutor = function(id, name, doc, phone) {
    selectedTutor = { id: id, name: name, doc: doc, phone: phone };
    document.getElementById('patient-tutor-id').value = id;
    document.getElementById('patient-tutor-name').textContent = name;
    document.getElementById('patient-tutor-info').textContent = (doc ? doc + ' · ' : '') + (phone || '');
    document.getElementById('patient-tutor-selected').style.display = 'block';
    document.getElementById('patient-tutor-search-area').style.display = 'none';
    document.getElementById('patient-tutor-results').innerHTML = '';
  };

  document.getElementById('patient-tutor-change').addEventListener('click', function() {
    selectedTutor = null;
    document.getElementById('patient-tutor-id').value = '';
    document.getElementById('patient-tutor-selected').style.display = 'none';
    document.getElementById('patient-tutor-search-area').style.display = 'block';
    document.getElementById('patient-tutor-search').value = '';
    document.getElementById('patient-tutor-search').focus();
  });

  document.getElementById('patient-tutor-search-btn').addEventListener('click', function() {
    searchTutors(document.getElementById('patient-tutor-search').value);
  });

  document.getElementById('patient-tutor-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); searchTutors(this.value); }
  });

  // --- birthDate vs estimatedAge ---
  document.getElementById('patient-birth-date').addEventListener('change', function() {
    if (this.value) document.getElementById('patient-estimated-age').value = '';
  });
  document.getElementById('patient-estimated-age').addEventListener('input', function() {
    if (this.value.trim()) document.getElementById('patient-birth-date').value = '';
  });

  // --- Form Management ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('patient-form-title').textContent = editData ? 'Editar Paciente' : 'Novo Paciente';
    document.getElementById('patient-edit-id').value = editData?.id || '';
    
    if (editData) {
      document.getElementById('patient-name').value = editData.name || '';
      document.getElementById('patient-species').value = editData.species || '';
      document.getElementById('patient-breed').value = editData.breed || '';
      document.getElementById('patient-sex').value = editData.sex || '';
      document.getElementById('patient-coat').value = editData.coat || '';
      document.getElementById('patient-status').value = editData.status || 'active';
      document.getElementById('patient-microchip').value = editData.microchip || '';
      document.getElementById('patient-weight').value = editData.baseWeightKg || editData.weightKg || '';
      document.getElementById('patient-neutered').value = editData.neutered === true ? 'true' : (editData.neutered === false ? 'false' : '');
      document.getElementById('patient-size').value = editData.size || '';
      document.getElementById('patient-birth-date').value = editData.birthDateApproximate || '';
      document.getElementById('patient-estimated-age').value = editData.estimatedAge || '';
      document.getElementById('patient-notes').value = editData.notes || '';
      document.getElementById('patient-behavioral-notes').value = editData.behavioralNotes || '';
      
      // Tutor
      if (editData.primaryOwnerId) {
        selectTutor(editData.primaryOwnerId, editData.tutorName || editData.ownerName || 'Tutor', '', '');
      }
      
      // Alerts
      alertsContainer.innerHTML = '';
      alertCounter = 0;
      (editData.alerts || []).forEach(function(a) { addAlertRow(a); });
    } else {
      document.getElementById('patient-form').reset();
      alertsContainer.innerHTML = '';
      alertCounter = 0;
      selectedTutor = null;
      document.getElementById('patient-tutor-id').value = '';
      document.getElementById('patient-tutor-selected').style.display = 'none';
      document.getElementById('patient-tutor-search-area').style.display = 'block';
      document.getElementById('patient-status').value = 'active';
      
      // Pre-fill tutor from context
      if (tutorContextId) {
        apiRequest('/owners/' + tutorContextId).then(function(resp) {
          if (resp.ok && (resp.body || resp).id) {
            var t = resp.body || resp;
            selectTutor(t.id, t.fullName, (t.document||{}).number || '', '');
          }
        });
      }
    }
  }

  function hideForm() {
    formOverlay.style.display = 'none';
    // Clear URL param
    if (tutorContextId) {
      window.history.replaceState(null, '', '/patients');
      tutorContextId = null;
    }
  }

  document.getElementById('patient-new-btn').addEventListener('click', function() { showForm(); });
  document.getElementById('patient-form-close').addEventListener('click', hideForm);
  document.getElementById('patient-cancel').addEventListener('click', hideForm);

  // --- Form Submit ---
  document.getElementById('patient-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('patient-edit-id').value;
    var tutorId = document.getElementById('patient-tutor-id').value;
    
    if (!tutorId) {
      showAlert('Selecione um tutor responsável antes de salvar.', 'error');
      return;
    }

    var birthDate = document.getElementById('patient-birth-date').value;
    var estimatedAge = document.getElementById('patient-estimated-age').value.trim();
    
    if (birthDate && estimatedAge) {
      showAlert('Preencha apenas data de nascimento OU idade estimada, não ambos.', 'error');
      return;
    }

    var weightVal = document.getElementById('patient-weight').value;
    var neuteredVal = document.getElementById('patient-neutered').value;
    
    var body = {
      name: document.getElementById('patient-name').value,
      species: document.getElementById('patient-species').value,
      breed: document.getElementById('patient-breed').value || undefined,
      sex: document.getElementById('patient-sex').value,
      coat: document.getElementById('patient-coat').value || undefined,
      microchip: document.getElementById('patient-microchip').value || undefined,
      baseWeightKg: weightVal ? parseFloat(weightVal) : undefined,
      neutered: neuteredVal === '' ? undefined : (neuteredVal === 'true'),
      size: document.getElementById('patient-size').value || undefined,
      birthDateApproximate: birthDate || undefined,
      estimatedAge: estimatedAge || undefined,
      primaryOwnerId: tutorId,
      status: document.getElementById('patient-status').value,
      alerts: getAlertsFromForm(),
      notes: document.getElementById('patient-notes').value || undefined,
      behavioralNotes: document.getElementById('patient-behavioral-notes').value || undefined
    };

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/patients/' + editId : '/patients';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert(editId ? 'Paciente atualizado!' : 'Paciente cadastrado!', 'success');
        hideForm();
        loadPatients();
      } else {
        showAlert('Erro: ' + (resp.body?.message || 'Erro desconhecido'), 'error');
      }
    }).catch(function(err) {
      showAlert('Erro: ' + err.message, 'error');
    });
  });

  // --- Load Patients ---
  function loadPatients() {
    var q = document.getElementById('patient-search').value;
    var species = document.getElementById('patient-filter-species').value;
    var status = document.getElementById('patient-filter-status').value;
    var url = '/patients';
    var params = [];
    if (q) params.push('q=' + encodeURIComponent(q));
    if (species) params.push('species=' + species);
    if (status) params.push('status=' + status);
    if (params.length) url += '?' + params.join('&');
    
    apiRequest(url).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      renderTable(items);
    }).catch(function(err) {
      showAlert('Erro ao carregar pacientes: ' + err.message, 'error');
    });
  }

  function renderTable(items) {
    if (!items.length) {
      document.getElementById('patients-table').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🐾</div><div class="empty-state-text">Nenhum paciente encontrado</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Nome</th><th>Tutor</th><th>Espécie</th><th>Sexo</th><th>Alertas</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
    items.forEach(function(p) {
      var speciesLabel = speciesLabels[p.species] || p.species || '-';
      var sexLabel = sexLabels[p.sex] || p.sex || '-';
      var alerts = p.alerts || [];
      var statusBadge = p.status === 'active' ? 'success' : (p.status === 'deceased' ? 'danger' : 'warning');
      var tutorName = p.tutorName || p.ownerName || '-';
      
      html += '<tr>';
      html += '<td><strong>' + escapeHtml(p.name) + '</strong>' + (p.breed ? '<br><small class="muted">' + escapeHtml(p.breed) + '</small>' : '') + '</td>';
      html += '<td>' + escapeHtml(tutorName) + '</td>';
      html += '<td>' + speciesLabel + '</td>';
      html += '<td>' + sexLabel + '</td>';
      html += '<td>';
      if (alerts.length) {
        alerts.forEach(function(a) {
          var sevClass = a.severity === 'high' ? 'danger' : (a.severity === 'medium' ? 'warning' : 'info');
          html += '<span class="badge badge-' + sevClass + '" style="margin:1px;" title="' + escapeHtml(a.label) + '">' + alertTypes[a.type] || a.type + '</span> ';
        });
      } else {
        html += '<span class="muted">-</span>';
      }
      html += '</td>';
      html += '<td><span class="badge badge-' + statusBadge + '">' + escapeHtml(p.status) + '</span></td>';
      html += '<td><button class="small secondary" onclick="showPatientDetail(\\'' + p.id + '\\')">Ver</button> <button class="small secondary" onclick="editPatient(\\'' + p.id + '\\')">Editar</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('patients-table').innerHTML = html;
  }

  // --- Detail View ---
  window.showPatientDetail = function(id) {
    apiRequest('/patients/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar paciente', 'error'); return; }
      var p = resp.body || resp;
      var alerts = p.alerts || [];
      var tutor = p.tutor || {};
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">🐾 ' + escapeHtml(p.name) + '</h2><button class="secondary small" onclick="document.getElementById(\\'patient-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      
      html += '<div style="display:grid;gap:16px;">';
      
      // Status
      var statusBadge = p.status === 'active' ? 'success' : (p.status === 'deceased' ? 'danger' : 'warning');
      html += '<div><span class="badge badge-' + statusBadge + '">' + p.status + '</span>';
      if (p.neutered === true) html += ' <span class="badge badge-info">Castrado</span>';
      if (p.microchip) html += ' <span class="badge badge-info">Microchip: ' + escapeHtml(p.microchip) + '</span>';
      html += '</div>';
      
      // Species/Breed/Sex
      html += '<div class="grid grid-3">';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Espécie</strong><br>' + (speciesLabels[p.species] || p.species) + '</div>';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Raça</strong><br>' + escapeHtml(p.breed || '-') + '</div>';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Sexo</strong><br>' + (sexLabels[p.sex] || p.sex) + '</div>';
      html += '</div>';
      
      // Clinical
      html += '<div class="grid grid-3">';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Peso</strong><br>' + (p.baseWeightKg || p.weightKg ? (p.baseWeightKg || p.weightKg) + ' kg' : '-') + '</div>';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Nascimento</strong><br>' + (p.birthDateApproximate || '-') + '</div>';
      html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Pelagem</strong><br>' + escapeHtml(p.coat || '-') + '</div>';
      html += '</div>';
      
      // Tutor
      html += '<div style="padding:12px;background:var(--primary-glow);border-radius:var(--radius-sm);">';
      html += '<strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">👤 Tutor Responsável</strong><br>';
      html += '<strong>' + escapeHtml(tutor.name || p.tutorName || p.ownerName || '-') + '</strong>';
      if (tutor.id) html += ' <a href="/owners" onclick="event.preventDefault();document.getElementById(\\'patient-detail-overlay\\').style.display=\\'none\\';showOwnerDetail(\\'' + tutor.id + '\\')" style="color:var(--primary);font-size:0.8rem;">Ver tutor →</a>';
      html += '</div>';
      
      // Alerts
      if (alerts.length) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--danger);">⚠️ Alertas Clínicos</strong>';
        alerts.forEach(function(a) {
          var sevClass = a.severity === 'high' ? 'danger' : (a.severity === 'medium' ? 'warning' : 'info');
          html += '<div style="padding:6px 10px;margin-top:4px;border-left:3px solid var(--' + sevClass + ');background:var(--' + sevClass + '-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;">';
          html += '<span class="badge badge-' + sevClass + '" style="font-size:0.6rem;">' + alertSeverities[a.severity] + '</span> ';
          html += '<strong>' + (alertTypes[a.type] || a.type) + '</strong>: ' + escapeHtml(a.label);
          html += '</div>';
        });
        html += '</div>';
      }
      
      // Notes
      if (p.notes) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Notas</strong><br>' + escapeHtml(p.notes) + '</div>';
      if (p.behavioralNotes) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Notas Comportamentais</strong><br>' + escapeHtml(p.behavioralNotes) + '</div>';
      
      // Actions
      html += '<div class="btn-row" style="margin-top:12px;">';
      html += '<button class="secondary" onclick="editPatient(\\'' + p.id + '\\');document.getElementById(\\'patient-detail-overlay\\').style.display=\\'none\\'">Editar</button>';
      html += '</div>';
      
      html += '</div>';
      
      document.getElementById('patient-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Edit ---
  window.editPatient = function(id) {
    apiRequest('/patients/' + id).then(function(resp) {
      if (resp.ok) showForm(resp.body || resp);
    });
  };

  // --- Search ---
  document.getElementById('patient-search-btn').addEventListener('click', loadPatients);
  document.getElementById('patient-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadPatients();
  });
  document.getElementById('patient-filter-species').addEventListener('change', loadPatients);
  document.getElementById('patient-filter-status').addEventListener('change', loadPatients);
  document.getElementById('reload-patients').addEventListener('click', loadPatients);

  // --- Init ---
  loadPatients();
  
  // If tutor context exists, auto-open form
  if (tutorContextId) {
    setTimeout(function() { showForm(); }, 500);
  }
})();
</script>
`;
}
