export function renderMedicalRecords(): string {
  return `
<div class="page-header">
  <div>
    <h1>Prontuário Clínico</h1>
    <p class="subtitle">Registro assistencial progressivo do caso veterinário</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="mr-new-entry-btn" style="white-space:nowrap;">+ Nova Evolução</button>
    <button id="reload-mr" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="mr-alert"></div>

<!-- Encounter Selector -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <label style="flex:1;min-width:200px;margin:0;">
      <span style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">Selecionar Atendimento</span>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <input id="mr-encounter-search" placeholder="Buscar por paciente, tutor ou ID do atendimento..." style="flex:1;" />
        <button id="mr-encounter-search-btn" class="secondary">Buscar</button>
      </div>
    </label>
  </div>
  <div id="mr-encounter-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
  <div id="mr-encounter-selected" style="display:none;padding:12px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-top:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong id="mr-enc-label"></strong>
        <div class="muted" style="font-size:0.8rem;" id="mr-enc-info"></div>
      </div>
      <button class="secondary small" id="mr-enc-change">Trocar</button>
    </div>
  </div>
</div>

<!-- Timeline View -->
<div id="mr-timeline-section" style="display:none;">
  <div class="card" style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="margin:0;">📋 Histórico Clínico</h2>
      <span class="badge badge-info" id="mr-entries-count">0 evoluções</span>
    </div>
    <div id="mr-timeline"></div>
  </div>
</div>

<!-- Form Modal -->
<div id="mr-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:800px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="mr-form-title" style="margin:0;">Nova Evolução Clínica</h2>
      <button class="secondary small" id="mr-form-close" type="button">✕</button>
    </div>
    
    <form id="mr-form">
      <input type="hidden" id="mr-edit-id" />
      <input type="hidden" id="mr-encounter-id" />
      <input type="hidden" id="mr-patient-id" />
      
      <!-- Bloco 1: Contexto -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🩺 Contexto do Caso</h3>
        <div id="mr-context-info" style="padding:10px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-bottom:12px;font-size:0.9rem;"></div>
        <div class="grid grid-2">
          <label>Tipo de Entrada *
            <select id="mr-entry-type" required>
              <option value="initial_assessment">📋 Avaliação Inicial</option>
              <option value="progress_note">📝 Nota de Evolução</option>
              <option value="procedure_note">💉 Nota de Procedimento</option>
              <option value="nursing_note">🩹 Nota de Enfermagem</option>
              <option value="discharge_note">🏠 Nota de Alta</option>
              <option value="administrative_clinical_note">📄 Nota Clínica Admin.</option>
            </select>
          </label>
          <label>Data/Hora do Registro
            <input id="mr-recorded-at" type="datetime-local" />
          </label>
        </div>
      </div>

      <!-- Bloco 2: SOAP -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📝 Registro SOAP</h3>
        
        <label style="margin-bottom:12px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:0.75rem;font-weight:700;color:#b45309;">S</span> Subjetivo — Relato do tutor/queixa</span>
          <textarea id="mr-subjective" placeholder="O que o tutor relata? Sintomas observados, histórico recente..." style="min-height:70px;"></textarea>
        </label>
        
        <label style="margin-bottom:12px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:0.75rem;font-weight:700;color:var(--info);">O</span> Objetivo — Exame físico / achados</span>
          <textarea id="mr-objective" placeholder="Resultados do exame físico, sinais vitais, achados observáveis..." style="min-height:70px;"></textarea>
        </label>
        
        <label style="margin-bottom:12px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:0.75rem;font-weight:700;color:var(--danger);">A</span> Avaliação — Diagnóstico / hipóteses</span>
          <textarea id="mr-assessment" placeholder="Hipóteses diagnósticas, avaliação clínica..." style="min-height:70px;"></textarea>
        </label>
        
        <label>
          <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:0.75rem;font-weight:700;color:var(--success);">P</span> Plano — Conduta / condutas</span>
          <textarea id="mr-plan" placeholder="Conduta, medicação, procedimentos, recomendações, retorno..." style="min-height:70px;"></textarea>
        </label>
      </div>

      <!-- Bloco 3: Registro Geral -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📄 Registro Geral</h3>
        <label>Nota / Evolução Livre
          <textarea id="mr-note" placeholder="Registro clínico geral (se SOAP não se aplicar) ou complemento..." style="min-height:80px;"></textarea>
        </label>
      </div>

      <!-- Bloco 4: Estruturas Auxiliares -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🔬 Informações Complementares</h3>
        <div class="grid grid-2">
          <label>Hipóteses Diagnósticas
            <textarea id="mr-diagnosis" placeholder="Uma por linha" style="min-height:60px;"></textarea>
          </label>
          <label>Achados Clínicos
            <textarea id="mr-findings" placeholder="Um por linha" style="min-height:60px;"></textarea>
          </label>
        </div>
        <div class="grid grid-2">
          <label>Procedimentos Realizados
            <textarea id="mr-procedures" placeholder="Um por linha" style="min-height:60px;"></textarea>
          </label>
          <label>Recomendações
            <textarea id="mr-recommendations" placeholder="Uma por linha" style="min-height:60px;"></textarea>
          </label>
        </div>
      </div>

      <div class="btn-row">
        <button type="submit" id="mr-submit">Salvar Evolução</button>
        <button type="button" class="secondary" id="mr-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Detail Modal -->
<div id="mr-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;" id="mr-detail-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('mr-alert');
  var formOverlay = document.getElementById('mr-form-overlay');
  var detailOverlay = document.getElementById('mr-detail-overlay');
  var selectedEncounter = null;

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var entryTypeLabels = {
    initial_assessment: '📋 Avaliação Inicial',
    progress_note: '📝 Nota de Evolução',
    procedure_note: '💉 Nota de Procedimento',
    nursing_note: '🩹 Nota de Enfermagem',
    discharge_note: '🏠 Nota de Alta',
    administrative_clinical_note: '📄 Nota Clínica Admin.'
  };

  // --- Encounter Search ---
  function searchEncounters(query) {
    var resultsDiv = document.getElementById('mr-encounter-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>'; return; }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando atendimentos...</div>';
    apiRequest('/encounters?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="empty-state" style="padding:16px;"><div class="empty-state-icon">📋</div><div class="empty-state-text">Nenhum atendimento encontrado.<br><a href="/encounters" style="color:var(--primary);font-weight:700;">Criar atendimento →</a></div></div>'; return; }
      var html = '';
      items.forEach(function(e) {
        var statusBadge = e.status === 'completed' ? 'success' : (e.status === 'cancelled' ? 'danger' : 'info');
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectEncounter(\\'' + e.id + '\\',\\'' + escapeHtml(e.patientName || '-') + '\\',\\'' + escapeHtml(e.tutorName || e.ownerName || '-') + '\\',\\'' + escapeHtml(e.chiefComplaint || e.reason || '-') + '\\',\\'' + (e.patientId || '') + '\\',\\'' + e.status + '\\')">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;"><strong>🩺 ' + escapeHtml(e.patientName || '-') + '</strong><span class="badge badge-' + statusBadge + '" style="font-size:0.65rem;">' + e.status + '</span></div>';
        html += '<div class="muted" style="font-size:0.8rem;">👤 ' + escapeHtml(e.tutorName || e.ownerName || '-') + ' · ' + escapeHtml((e.chiefComplaint || e.reason || '-').substring(0, 50)) + '</div>';
        html += '</div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectEncounter = function(id, patientName, tutorName, chiefComplaint, patientId, status) {
    selectedEncounter = { id: id, patientName: patientName, tutorName: tutorName, chiefComplaint: chiefComplaint, patientId: patientId, status: status };
    document.getElementById('mr-enc-label').textContent = '🩺 ' + patientName + ' — ' + chiefComplaint;
    document.getElementById('mr-enc-info').textContent = '👤 Tutor: ' + tutorName + ' · Status: ' + status;
    document.getElementById('mr-encounter-selected').style.display = 'block';
    document.getElementById('mr-encounter-results').innerHTML = '';
    document.getElementById('mr-encounter-search').value = '';
    document.getElementById('mr-timeline-section').style.display = 'block';
    loadEntries(id);
  };

  document.getElementById('mr-enc-change').addEventListener('click', function() {
    selectedEncounter = null;
    document.getElementById('mr-encounter-selected').style.display = 'none';
    document.getElementById('mr-timeline-section').style.display = 'none';
    document.getElementById('mr-encounter-search').focus();
  });

  document.getElementById('mr-encounter-search-btn').addEventListener('click', function() {
    searchEncounters(document.getElementById('mr-encounter-search').value);
  });
  document.getElementById('mr-encounter-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); searchEncounters(this.value); }
  });

  // --- Load Entries (Timeline) ---
  function loadEntries(encounterId) {
    apiRequest('/medical-records/entries?encounterId=' + encounterId).then(function(resp) {
      var entries = resp.body?.items || resp.body || [];
      renderTimeline(entries);
    }).catch(function(err) {
      document.getElementById('mr-timeline').innerHTML = '<div class="muted">Erro ao carregar: ' + err.message + '</div>';
    });
  }

  function renderTimeline(entries) {
    document.getElementById('mr-entries-count').textContent = entries.length + ' evolução' + (entries.length !== 1 ? 's' : '');
    
    if (!entries.length) {
      document.getElementById('mr-timeline').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Nenhuma evolução registrada</div></div>';
      return;
    }

    // Sort by recordedAt descending
    entries.sort(function(a, b) { return new Date(b.recordedAt || b.createdAt) - new Date(a.recordedAt || a.createdAt); });

    var html = '<div style="position:relative;padding-left:24px;">';
    html += '<div style="position:absolute;left:8px;top:0;bottom:0;width:2px;background:var(--line);"></div>';
    
    entries.forEach(function(entry, i) {
      var typeLabel = entryTypeLabels[entry.entryType] || entry.entryType || 'Evolução';
      var date = entry.recordedAt || entry.createdAt;
      var dateStr = date ? new Date(date).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
      var hasSoap = entry.subjective || entry.objective || entry.assessment || entry.plan;
      var note = entry.note || entry.content || '';
      if (note.length > 120) note = note.substring(0, 120) + '...';
      
      html += '<div style="position:relative;margin-bottom:16px;padding:14px;background:rgba(255,255,255,0.6);border:1px solid var(--line);border-radius:var(--radius);cursor:pointer;transition:box-shadow 0.15s,transform 0.15s;" onmouseover="this.style.boxShadow=\\'var(--shadow-md)\\';this.style.transform=\\'translateX(2px)\\'" onmouseout="this.style.boxShadow=\\'\\';this.style.transform=\\'\\'" onclick="showEntryDetail(\\'' + entry.id + '\\')">';
      html += '<div style="position:absolute;left:-24px;top:18px;width:12px;height:12px;background:var(--primary);border-radius:50%;border:2px solid white;box-shadow:var(--shadow-sm);"></div>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<strong style="font-size:0.85rem;">' + typeLabel + '</strong>';
      html += '<span style="font-size:0.75rem;color:var(--ink-muted);">' + dateStr + '</span>';
      html += '</div>';
      
      if (hasSoap) {
        html += '<div style="display:flex;gap:6px;margin-bottom:6px;">';
        if (entry.subjective) html += '<span class="badge" style="background:rgba(180,83,9,0.1);color:#b45309;font-size:0.6rem;">S</span>';
        if (entry.objective) html += '<span class="badge" style="background:var(--info-soft);color:var(--info);font-size:0.6rem;">O</span>';
        if (entry.assessment) html += '<span class="badge" style="background:var(--danger-soft);color:var(--danger);font-size:0.6rem;">A</span>';
        if (entry.plan) html += '<span class="badge" style="background:var(--success-soft);color:var(--success);font-size:0.6rem;">P</span>';
        html += '</div>';
      }
      
      if (note) html += '<div style="font-size:0.85rem;color:var(--ink-soft);line-height:1.4;">' + escapeHtml(note) + '</div>';
      
      if (entry.versionNumber && entry.versionNumber > 1) {
        html += '<div style="margin-top:6px;"><span class="badge badge-warning" style="font-size:0.6rem;">v' + entry.versionNumber + ' (editado)</span></div>';
      }
      
      html += '</div>';
    });
    
    html += '</div>';
    document.getElementById('mr-timeline').innerHTML = html;
  }

  // --- Entry Detail ---
  window.showEntryDetail = function(id) {
    apiRequest('/medical-records/entries/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar entrada', 'error'); return; }
      var e = resp.body || resp;
      var typeLabel = entryTypeLabels[e.entryType] || e.entryType;
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">' + typeLabel + '</h2><button class="secondary small" onclick="document.getElementById(\\'mr-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      html += '<div style="display:grid;gap:14px;">';
      
      // Meta
      html += '<div style="font-size:0.8rem;color:var(--ink-muted);">';
      if (e.recordedAt) html += '📅 ' + new Date(e.recordedAt).toLocaleString('pt-BR');
      if (e.versionNumber) html += ' · v' + e.versionNumber;
      html += '</div>';
      
      // SOAP
      if (e.subjective) html += '<div style="padding:10px;border-left:3px solid #b45309;background:rgba(180,83,9,0.04);border-radius:0 var(--radius-sm) var(--radius-sm) 0;"><strong style="font-size:0.75rem;color:#b45309;">SUBJETIVO</strong><div style="margin-top:4px;">' + escapeHtml(e.subjective) + '</div></div>';
      if (e.objective) html += '<div style="padding:10px;border-left:3px solid var(--info);background:var(--info-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;"><strong style="font-size:0.75rem;color:var(--info);">OBJETIVO</strong><div style="margin-top:4px;">' + escapeHtml(e.objective) + '</div></div>';
      if (e.assessment) html += '<div style="padding:10px;border-left:3px solid var(--danger);background:var(--danger-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;"><strong style="font-size:0.75rem;color:var(--danger);">AVALIAÇÃO</strong><div style="margin-top:4px;">' + escapeHtml(e.assessment) + '</div></div>';
      if (e.plan) html += '<div style="padding:10px;border-left:3px solid var(--success);background:var(--success-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;"><strong style="font-size:0.75rem;color:var(--success);">PLANO</strong><div style="margin-top:4px;">' + escapeHtml(e.plan) + '</div></div>';
      
      // Note
      if (e.note || e.content) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Nota</strong><div style="margin-top:4px;">' + escapeHtml(e.note || e.content) + '</div></div>';
      
      // Aux structures
      if (e.diagnosisHypotheses?.length) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Hipóteses Diagnósticas</strong>';
        e.diagnosisHypotheses.forEach(function(h) { html += '<div>• ' + escapeHtml(h) + '</div>'; });
        html += '</div>';
      }
      
      html += '</div>';
      
      document.getElementById('mr-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Form ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('mr-form-title').textContent = editData ? 'Editar Evolução' : 'Nova Evolução Clínica';
    document.getElementById('mr-edit-id').value = editData?.id || '';
    
    // Set context
    if (selectedEncounter) {
      document.getElementById('mr-encounter-id').value = selectedEncounter.id;
      document.getElementById('mr-patient-id').value = selectedEncounter.patientId || '';
      document.getElementById('mr-context-info').innerHTML = '<strong>🩺 ' + escapeHtml(selectedEncounter.patientName) + '</strong> · 👤 ' + escapeHtml(selectedEncounter.tutorName) + '<br><span class="muted" style="font-size:0.85rem;">Queixa: ' + escapeHtml(selectedEncounter.chiefComplaint) + '</span>';
    }
    
    // Set default datetime
    if (!editData) {
      document.getElementById('mr-recorded-at').value = new Date().toISOString().slice(0, 16);
    }
    
    if (editData) {
      document.getElementById('mr-entry-type').value = editData.entryType || 'progress_note';
      document.getElementById('mr-recorded-at').value = editData.recordedAt ? new Date(editData.recordedAt).toISOString().slice(0, 16) : '';
      document.getElementById('mr-subjective').value = editData.subjective || '';
      document.getElementById('mr-objective').value = editData.objective || '';
      document.getElementById('mr-assessment').value = editData.assessment || '';
      document.getElementById('mr-plan').value = editData.plan || '';
      document.getElementById('mr-note').value = editData.note || editData.content || '';
      document.getElementById('mr-diagnosis').value = (editData.diagnosisHypotheses || []).join('\n');
      document.getElementById('mr-findings').value = (editData.clinicalFindings || []).join('\n');
      document.getElementById('mr-procedures').value = (editData.proceduresPerformed || []).join('\n');
      document.getElementById('mr-recommendations').value = (editData.recommendations || []).join('\n');
    } else {
      document.getElementById('mr-form').reset();
      document.getElementById('mr-entry-type').value = 'initial_assessment';
      document.getElementById('mr-recorded-at').value = new Date().toISOString().slice(0, 16);
      if (selectedEncounter) {
        document.getElementById('mr-encounter-id').value = selectedEncounter.id;
        document.getElementById('mr-patient-id').value = selectedEncounter.patientId || '';
      }
    }
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  document.getElementById('mr-new-entry-btn').addEventListener('click', function() {
    if (!selectedEncounter) {
      showAlert('⚠️ Selecione um atendimento acima antes de criar uma evolução. Se não houver atendimentos, crie um primeiro em <a href="/encounters" style="color:var(--primary);font-weight:700;">Atendimentos →</a>', 'error');
      return;
    }
    showForm();
  });
  document.getElementById('mr-form-close').addEventListener('click', hideForm);
  document.getElementById('mr-cancel').addEventListener('click', hideForm);

  // --- Submit ---
  document.getElementById('mr-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('mr-edit-id').value;
    var encounterId = document.getElementById('mr-encounter-id').value;
    
    if (!encounterId) { showAlert('Selecione um atendimento.', 'error'); return; }

    var diag = document.getElementById('mr-diagnosis').value.trim();
    var findings = document.getElementById('mr-findings').value.trim();
    var procs = document.getElementById('mr-procedures').value.trim();
    var recs = document.getElementById('mr-recommendations').value.trim();

    var body = {
      encounterId: encounterId,
      patientId: document.getElementById('mr-patient-id').value,
      entryType: document.getElementById('mr-entry-type').value,
      recordedAt: document.getElementById('mr-recorded-at').value ? new Date(document.getElementById('mr-recorded-at').value).toISOString() : new Date().toISOString(),
      subjective: document.getElementById('mr-subjective').value || undefined,
      objective: document.getElementById('mr-objective').value || undefined,
      assessment: document.getElementById('mr-assessment').value || undefined,
      plan: document.getElementById('mr-plan').value || undefined,
      note: document.getElementById('mr-note').value || undefined,
      diagnosisHypotheses: diag ? diag.split('\n').filter(function(l) { return l.trim(); }) : undefined,
      clinicalFindings: findings ? findings.split('\n').filter(function(l) { return l.trim(); }) : undefined,
      proceduresPerformed: procs ? procs.split('\n').filter(function(l) { return l.trim(); }) : undefined,
      recommendations: recs ? recs.split('\n').filter(function(l) { return l.trim(); }) : undefined
    };

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/medical-records/entries/' + editId : '/medical-records/entries';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert(editId ? 'Evolução atualizada!' : 'Evolução registrada!', 'success');
        hideForm();
        if (selectedEncounter) loadEntries(selectedEncounter.id);
      } else {
        showAlert('Erro: ' + (resp.body?.message || 'Erro desconhecido'), 'error');
      }
    });
  });

  // --- Init ---
  document.getElementById('reload-mr').addEventListener('click', function() {
    if (selectedEncounter) loadEntries(selectedEncounter.id);
  });
})();
</script>
`;
}
