export function renderDiagnostics(): string {
  return `
<div class="page-header">
  <div>
    <h1>Exames</h1>
    <p class="subtitle">Pedidos diagnósticos, coleta e resultados</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="exam-new-btn" style="white-space:nowrap;">+ Novo Pedido</button>
    <button id="reload-exams" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="exam-alert"></div>

<!-- Encounter Selector -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <label style="flex:1;min-width:200px;margin:0;">
      <span style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">Selecionar Atendimento</span>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <input id="exam-encounter-search" placeholder="Buscar por paciente ou tutor..." style="flex:1;" />
        <button id="exam-encounter-search-btn" class="secondary">Buscar</button>
      </div>
    </label>
  </div>
  <div id="exam-encounter-results" style="max-height:200px;overflow-y:auto;margin-top:8px;"></div>
  <div id="exam-encounter-selected" style="display:none;padding:12px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-top:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div><strong id="exam-enc-label"></strong><div class="muted" style="font-size:0.8rem;" id="exam-enc-info"></div></div>
      <button class="secondary small" id="exam-enc-change">Trocar</button>
    </div>
  </div>
</div>

<!-- Filters -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <select id="exam-filter-status" style="width:auto;min-width:130px;">
      <option value="">Todos status</option>
      <option value="requested">📋 Solicitado</option>
      <option value="collected">🩸 Coletado</option>
      <option value="resulted">📄 Resultado</option>
      <option value="cancelled">✕ Cancelado</option>
    </select>
    <select id="exam-filter-category" style="width:auto;min-width:130px;">
      <option value="">Todas categorias</option>
      <option value="laboratory">🔬 Laboratorial</option>
      <option value="imaging">📷 Imagem</option>
      <option value="other">📋 Outro</option>
    </select>
  </div>
</div>

<!-- Exam Orders List -->
<div class="card">
  <div id="exam-orders-table"></div>
</div>

<!-- Form Modal -->
<div id="exam-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:780px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="exam-form-title" style="margin:0;">Novo Pedido de Exame</h2>
      <button class="secondary small" id="exam-form-close" type="button">✕</button>
    </div>
    
    <form id="exam-form">
      <input type="hidden" id="exam-edit-id" />
      <input type="hidden" id="exam-encounter-id" />
      <input type="hidden" id="exam-patient-id" />
      
      <!-- Bloco 1: Contexto -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">📋 Contexto</h3>
        <div id="exam-context-info" style="padding:10px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-bottom:12px;font-size:0.9rem;"></div>
        <div class="grid grid-2">
          <label>Categoria *
            <select id="exam-category" required>
              <option value="laboratory">🔬 Laboratorial</option>
              <option value="imaging">📷 Imagem</option>
              <option value="other">📋 Outro</option>
            </select>
          </label>
          <label>Prioridade
            <select id="exam-priority">
              <option value="routine">🕐 Rotina</option>
              <option value="urgent">⚡ Urgente</option>
              <option value="stat">🚨 STAT</option>
            </select>
          </label>
        </div>
        <label style="margin-top:12px;">Motivo Clínico *
          <textarea id="exam-reason" required placeholder="Justificativa clínica para o pedido de exame..." style="min-height:60px;"></textarea>
        </label>
      </div>

      <!-- Bloco 2: Catálogo de Exames -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">🔬 Exames Solicitados *</h3>
        <div id="exam-catalog" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:12px;">
          <!-- Pre-defined exams -->
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="HEM" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Hemograma</strong><div class="muted" style="font-size:0.7rem;">HEM</div></div>
          </label>
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="BIO" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Bioquímico</strong><div class="muted" style="font-size:0.7rem;">BIO</div></div>
          </label>
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="URIN" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Urinálise</strong><div class="muted" style="font-size:0.7rem;">URIN</div></div>
          </label>
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="RX" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Raio-X</strong><div class="muted" style="font-size:0.7rem;">RX</div></div>
          </label>
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="US" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Ultrassom</strong><div class="muted" style="font-size:0.7rem;">US</div></div>
          </label>
          <label class="exam-catalog-item" style="padding:10px;border:2px solid var(--line);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="exam-catalog-check" value="ECO" style="width:auto;" />
            <div><strong style="font-size:0.85rem;">Ecocardiograma</strong><div class="muted" style="font-size:0.7rem;">ECO</div></div>
          </label>
        </div>
        <!-- Custom exam -->
        <div style="display:flex;gap:8px;">
          <input id="exam-custom-name" placeholder="Ou digite outro exame..." style="flex:1;" />
          <button type="button" id="exam-add-custom" class="secondary">Adicionar</button>
        </div>
        <div id="exam-custom-list" style="margin-top:8px;"></div>
      </div>

      <!-- Bloco 3: Notas -->
      <div style="margin-bottom:20px;">
        <label>Observações
          <textarea id="exam-notes" placeholder="Instruções especiais, preparo, jejum..." style="min-height:50px;"></textarea>
        </label>
      </div>

      <div class="btn-row">
        <button type="submit" id="exam-submit">Criar Pedido</button>
        <button type="button" class="secondary" id="exam-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Result Modal -->
<div id="exam-result-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:310;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:600px;max-height:90vh;overflow-y:auto;margin:auto;" id="exam-result-content"></div>
</div>

<!-- Detail Modal -->
<div id="exam-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:700px;max-height:90vh;overflow-y:auto;margin:auto;" id="exam-detail-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('exam-alert');
  var formOverlay = document.getElementById('exam-form-overlay');
  var detailOverlay = document.getElementById('exam-detail-overlay');
  var resultOverlay = document.getElementById('exam-result-overlay');
  var customItems = [];
  var selectedEncounter = null;

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var statusLabels = { requested: '📋 Solicitado', collected: '🩸 Coletado', resulted: '📄 Resultado', cancelled: '✕ Cancelado' };
  var categoryLabels = { laboratory: '🔬 Laboratorial', imaging: '📷 Imagem', other: '📋 Outro' };
  var priorityLabels = { routine: '🕐 Rotina', urgent: '⚡ Urgente', stat: '🚨 STAT' };
  var catalogNames = { HEM: 'Hemograma', BIO: 'Bioquímico', URIN: 'Urinálise', RX: 'Raio-X', US: 'Ultrassom', ECO: 'Ecocardiograma' };

  // Highlight selected catalog items
  document.querySelectorAll('.exam-catalog-item').forEach(function(item) {
    var check = item.querySelector('.exam-catalog-check');
    check.addEventListener('change', function() {
      item.style.borderColor = this.checked ? 'var(--primary)' : 'var(--line)';
      item.style.background = this.checked ? 'var(--primary-glow)' : '';
    });
  });

  // Custom items
  document.getElementById('exam-add-custom').addEventListener('click', function() {
    var name = document.getElementById('exam-custom-name').value.trim();
    if (!name) return;
    customItems.push(name);
    document.getElementById('exam-custom-name').value = '';
    renderCustomItems();
  });

  function renderCustomItems() {
    var html = '';
    customItems.forEach(function(name, i) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--info-soft);border-radius:var(--radius-sm);margin-bottom:4px;"><span style="flex:1;font-size:0.85rem;">' + escapeHtml(name) + '</span><button type="button" class="danger small" onclick="removeCustomItem(' + i + ')" style="padding:2px 6px;font-size:0.7rem;">✕</button></div>';
    });
    document.getElementById('exam-custom-list').innerHTML = html;
  }

  window.removeCustomItem = function(i) { customItems.splice(i, 1); renderCustomItems(); };

  function getSelectedExams() {
    var exams = [];
    document.querySelectorAll('.exam-catalog-check:checked').forEach(function(cb) {
      exams.push({ examCode: cb.value, examName: catalogNames[cb.value] || cb.value });
    });
    customItems.forEach(function(name) { exams.push({ examCode: 'CUSTOM', examName: name }); });
    return exams;
  }

  // --- Encounter Search ---
  function searchEncounters(query) {
    var resultsDiv = document.getElementById('exam-encounter-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Digite pelo menos 2 caracteres</div>'; return; }
    resultsDiv.innerHTML = '<div style="padding:8px;"><span class="spinner"></span> Buscando...</div>';
    apiRequest('/encounters?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="muted" style="padding:8px;">Nenhum atendimento encontrado</div>'; return; }
      var html = '';
      items.forEach(function(e) {
        html += '<div style="padding:10px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectEncounter(\\'' + e.id + '\\',\\'' + escapeHtml(e.patientName || '-') + '\\',\\'' + escapeHtml(e.tutorName || e.ownerName || '-') + '\\',\\'' + (e.patientId || '') + '\\',\\'' + (e.ownerId || '') + '\\')">';
        html += '<strong>🩺 ' + escapeHtml(e.patientName || '-') + '</strong><br><span class="muted" style="font-size:0.8rem;">👤 ' + escapeHtml(e.tutorName || e.ownerName || '-') + '</span></div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectEncounter = function(id, patientName, tutorName, patientId, ownerId) {
    selectedEncounter = { id: id, patientName: patientName, tutorName: tutorName, patientId: patientId, ownerId: ownerId };
    document.getElementById('exam-enc-label').textContent = '🩺 ' + patientName;
    document.getElementById('exam-enc-info').textContent = '👤 ' + tutorName;
    document.getElementById('exam-encounter-selected').style.display = 'block';
    document.getElementById('exam-encounter-results').innerHTML = '';
    loadExamOrders();
  };

  document.getElementById('exam-enc-change').addEventListener('click', function() {
    selectedEncounter = null;
    document.getElementById('exam-encounter-selected').style.display = 'none';
  });
  document.getElementById('exam-encounter-search-btn').addEventListener('click', function() { searchEncounters(document.getElementById('exam-encounter-search').value); });
  document.getElementById('exam-encounter-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); searchEncounters(this.value); } });

  // --- Load ---
  function loadExamOrders() {
    var url = '/diagnostics/orders';
    var params = [];
    if (selectedEncounter) params.push('encounterId=' + selectedEncounter.id);
    var status = document.getElementById('exam-filter-status').value;
    var category = document.getElementById('exam-filter-category').value;
    if (status) params.push('status=' + status);
    if (category) params.push('category=' + category);
    if (params.length) url += '?' + params.join('&');

    apiRequest(url).then(function(resp) {
      renderTable(resp.body?.items || resp.body || []);
    }).catch(function(err) {
      showAlert('Erro ao carregar: ' + err.message, 'error');
    });
  }

  function renderTable(items) {
    if (!items.length) {
      document.getElementById('exam-orders-table').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔬</div><div class="empty-state-text">Nenhum pedido de exame encontrado</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Exame</th><th>Paciente</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Solicitado</th><th>Ações</th></tr></thead><tbody>';
    items.forEach(function(o) {
      var statusBadge = o.status === 'resulted' ? 'success' : (o.status === 'cancelled' ? 'danger' : (o.status === 'collected' ? 'info' : 'warning'));
      var date = o.requestedAt || o.createdAt;
      var dateStr = date ? new Date(date).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
      html += '<tr>';
      html += '<td><strong>' + escapeHtml(o.examName || o.examType || '-') + '</strong>' + (o.examCode ? '<br><code style="font-size:0.7rem;">' + o.examCode + '</code>' : '') + '</td>';
      html += '<td>' + escapeHtml(o.patientName || '-') + '</td>';
      html += '<td>' + (categoryLabels[o.category] || o.category || '-') + '</td>';
      html += '<td>' + (priorityLabels[o.priority] || '-') + '</td>';
      html += '<td><span class="badge badge-' + statusBadge + '">' + (statusLabels[o.status] || o.status) + '</span></td>';
      html += '<td>' + dateStr + '</td>';
      html += '<td style="white-space:nowrap;">';
      html += '<button class="small secondary" onclick="showExamDetail(\\'' + o.id + '\\')">Ver</button>';
      if (o.status === 'requested') html += ' <button class="small" onclick="collectExam(\\'' + o.id + '\\')" style="background:var(--accent);color:white;padding:4px 8px;font-size:0.7rem;">🩸 Coletar</button>';
      if (o.status === 'collected') html += ' <button class="small" onclick="showResultForm(\\'' + o.id + '\\',\\'' + escapeHtml(o.examName || o.examType || '') + '\\')" style="background:var(--success);color:white;padding:4px 8px;font-size:0.7rem;">📄 Resultado</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('exam-orders-table').innerHTML = html;
  }

  // --- Collect ---
  window.collectExam = function(id) {
    apiRequest('/diagnostics/orders/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'collected' }) }).then(function(resp) {
      if (resp.ok) { showAlert('Exame coletado!', 'success'); loadExamOrders(); }
      else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  };

  // --- Result Form ---
  window.showResultForm = function(orderId, examName) {
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">📄 Registrar Resultado</h2><button class="secondary small" onclick="document.getElementById(\\'exam-result-overlay\\').style.display=\\'none\\'">✕</button></div>';
    html += '<div style="padding:10px;background:var(--primary-glow);border-radius:var(--radius-sm);margin-bottom:16px;"><strong>' + escapeHtml(examName) + '</strong></div>';
    html += '<form id="exam-result-form">';
    html += '<label>Achados<textarea id="result-findings" required placeholder="Descreva os achados do exame..." style="min-height:80px;"></textarea></label>';
    html += '<label style="margin-top:12px;">Interpretação<textarea id="result-interpretation" placeholder="Interpretação clínica dos resultados..." style="min-height:80px;"></textarea></label>';
    html += '<div class="grid grid-2" style="margin-top:12px;">';
    html += '<label>Valores<textarea id="result-values" placeholder="Valores numéricos ou descritivos" style="min-height:60px;"></textarea></label>';
    html += '<label>Referência<textarea id="result-normal-range" placeholder="Valores de referência" style="min-height:60px;"></textarea></label>';
    html += '</div>';
    html += '<label style="margin-top:12px;">Notas<textarea id="result-notes" placeholder="Observações adicionais..." style="min-height:50px;"></textarea></label>';
    html += '<div class="btn-row" style="margin-top:16px;"><button type="submit">Salvar Resultado</button></div>';
    html += '</form>';
    
    document.getElementById('exam-result-content').innerHTML = html;
    resultOverlay.style.display = 'grid';
    
    document.getElementById('exam-result-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var body = {
        status: 'resulted',
        findings: document.getElementById('result-findings').value,
        interpretation: document.getElementById('result-interpretation').value || undefined,
        resultValues: document.getElementById('result-values').value || undefined,
        normalRange: document.getElementById('result-normal-range').value || undefined,
        notes: document.getElementById('result-notes').value || undefined
      };
      apiRequest('/diagnostics/orders/' + orderId + '/result', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
        if (resp.ok) {
          showAlert('Resultado registrado!', 'success');
          resultOverlay.style.display = 'none';
          loadExamOrders();
        } else {
          showAlert('Erro: ' + (resp.body?.message || ''), 'error');
        }
      });
    });
  };

  // --- Detail ---
  window.showExamDetail = function(id) {
    apiRequest('/diagnostics/orders/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro', 'error'); return; }
      var o = resp.body || resp;
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">🔬 ' + escapeHtml(o.examName || o.examType) + '</h2><button class="secondary small" onclick="document.getElementById(\\'exam-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      html += '<div style="display:grid;gap:14px;">';
      var statusBadge = o.status === 'resulted' ? 'success' : (o.status === 'cancelled' ? 'danger' : 'info');
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;"><span class="badge badge-' + statusBadge + '">' + (statusLabels[o.status] || o.status) + '</span> ' + (categoryLabels[o.category] || '') + ' ' + (priorityLabels[o.priority] || '') + '</div>';
      if (o.reason) html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Motivo</strong><div>' + escapeHtml(o.reason) + '</div></div>';
      if (o.resultSummary || o.findings) html += '<div style="padding:12px;background:var(--success-soft);border-radius:var(--radius-sm);border-left:3px solid var(--success);"><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--success);">📄 Resultado</strong><div style="margin-top:6px;">' + escapeHtml(o.resultSummary || o.findings || '') + '</div>' + (o.interpretation ? '<div class="muted" style="margin-top:6px;font-size:0.85rem;">' + escapeHtml(o.interpretation) + '</div>' : '') + '</div>';
      html += '</div>';
      document.getElementById('exam-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Form ---
  function showForm() {
    if (!selectedEncounter) { showAlert('Selecione um atendimento primeiro.', 'error'); return; }
    formOverlay.style.display = 'grid';
    document.getElementById('exam-form').reset();
    customItems = [];
    document.getElementById('exam-custom-list').innerHTML = '';
    document.querySelectorAll('.exam-catalog-check').forEach(function(cb) { cb.checked = false; cb.closest('.exam-catalog-item').style.borderColor = 'var(--line)'; cb.closest('.exam-catalog-item').style.background = ''; });
    document.getElementById('exam-encounter-id').value = selectedEncounter.id;
    document.getElementById('exam-patient-id').value = selectedEncounter.patientId || '';
    document.getElementById('exam-context-info').innerHTML = '<strong>🩺 ' + escapeHtml(selectedEncounter.patientName) + '</strong> · 👤 ' + escapeHtml(selectedEncounter.tutorName);
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  document.getElementById('exam-new-btn').addEventListener('click', showForm);
  document.getElementById('exam-form-close').addEventListener('click', hideForm);
  document.getElementById('exam-cancel').addEventListener('click', hideForm);

  // --- Submit ---
  document.getElementById('exam-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var exams = getSelectedExams();
    if (!exams.length) { showAlert('Selecione pelo menos um exame.', 'error'); return; }
    var encounterId = document.getElementById('exam-encounter-id').value;

    // Create one order per exam
    var created = 0;
    exams.forEach(function(exam) {
      var body = {
        encounterId: encounterId,
        patientId: document.getElementById('exam-patient-id').value,
        examType: exam.examName,
        examCode: exam.examCode,
        category: document.getElementById('exam-category').value,
        priority: document.getElementById('exam-priority').value,
        reason: document.getElementById('exam-reason').value,
        notes: document.getElementById('exam-notes').value || undefined
      };
      apiRequest('/diagnostics/orders', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
        created++;
        if (created === exams.length) {
          showAlert(exams.length + ' pedido(s) criado(s)!', 'success');
          hideForm();
          loadExamOrders();
        }
      }).catch(function() {
        created++;
        if (created === exams.length) loadExamOrders();
      });
    });
  });

  // --- Filters ---
  document.getElementById('exam-filter-status').addEventListener('change', loadExamOrders);
  document.getElementById('exam-filter-category').addEventListener('change', loadExamOrders);
  document.getElementById('reload-exams').addEventListener('click', loadExamOrders);

  // --- Init ---
  loadExamOrders();
})();
</script>
`;
}
