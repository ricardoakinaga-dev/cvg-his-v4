export function renderAppointments(): string {
  return `
<div class="page-header">
  <div>
    <h1>📅 Agenda</h1>
    <p class="subtitle">Gestão operacional de agendamentos e fluxo do hospital</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="appt-new-btn" style="white-space:nowrap;">+ Novo Agendamento</button>
    <button id="reload-appt" class="secondary" style="white-space:nowrap;">↻</button>
  </div>
</div>

<div id="appt-alert"></div>

<!-- View Tabs -->
<div class="card" style="margin-bottom:16px;padding:8px 12px;">
  <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
    <button class="appt-view-btn active" data-view="kanban" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--primary-gradient);color:white;font-weight:600;font-size:0.85rem;cursor:pointer;">📋 Kanban</button>
    <button class="appt-view-btn" data-view="month" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:rgba(255,255,255,0.7);font-weight:600;font-size:0.85rem;cursor:pointer;">📅 Mês</button>
    <button class="appt-view-btn" data-view="week" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:rgba(255,255,255,0.7);font-weight:600;font-size:0.85rem;cursor:pointer;">📆 Semana</button>
    <button class="appt-view-btn" data-view="day" style="padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--line);background:rgba(255,255,255,0.7);font-weight:600;font-size:0.85rem;cursor:pointer;">📋 Dia</button>
    <div style="flex:1;"></div>
    <button id="appt-prev" class="secondary small" style="padding:6px 12px;">◀</button>
    <span id="appt-period-label" style="font-weight:700;font-size:0.9rem;min-width:160px;text-align:center;"></span>
    <button id="appt-next" class="secondary small" style="padding:6px 12px;">▶</button>
    <button id="appt-today" class="secondary small" style="padding:6px 12px;">Hoje</button>
  </div>
</div>

<!-- Filters -->
<div class="card" style="margin-bottom:16px;padding:12px 16px;">
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
    <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);margin:0;">Filtros:</label>
    <select id="appt-filter-vet" style="min-width:150px;font-size:0.85rem;">
      <option value="">Todos profissionais</option>
    </select>
    <select id="appt-filter-sector" style="min-width:130px;font-size:0.85rem;">
      <option value="">Todos setores</option>
      <option value="consultation_room">🩺 Consulta</option>
      <option value="emergency_room">🚨 Emergência</option>
      <option value="triage">🏷️ Triagem</option>
      <option value="surgery">💉 Cirurgia</option>
      <option value="diagnostic">🔬 Diagnóstico</option>
    </select>
    <select id="appt-filter-status" style="min-width:120px;font-size:0.85rem;">
      <option value="">Todos status</option>
      <option value="scheduled">📅 Agendado</option>
      <option value="confirmed">✅ Confirmado</option>
      <option value="in_progress">🔄 Em andamento</option>
      <option value="completed">✔ Concluído</option>
      <option value="cancelled">✕ Cancelado</option>
      <option value="no_show">👻 Não compareceu</option>
    </select>
    <input id="appt-filter-search" placeholder="Buscar paciente ou tutor..." style="flex:1;min-width:150px;font-size:0.85rem;" />
  </div>
</div>

<!-- Views Container -->
<div id="appt-kanban-view" class="appt-view active"></div>
<div id="appt-month-view" class="appt-view" style="display:none;"></div>
<div id="appt-week-view" class="appt-view" style="display:none;"></div>
<div id="appt-day-view" class="appt-view" style="display:none;"></div>

<!-- Form Modal -->
<div id="appt-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:650px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="appt-form-title" style="margin:0;">Novo Agendamento</h2>
      <button class="secondary small" id="appt-form-close" type="button">✕</button>
    </div>
    <form id="appt-form">
      <input type="hidden" id="appt-edit-id" />
      <input type="hidden" id="appt-patient-id" />
      <input type="hidden" id="appt-owner-id" />
      
      <div style="margin-bottom:16px;">
        <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">Paciente *</label>
        <div style="display:flex;gap:8px;">
          <input id="appt-patient-search" placeholder="Buscar paciente..." style="flex:1;" />
          <button type="button" id="appt-patient-search-btn" class="secondary">🔍</button>
        </div>
        <div id="appt-patient-results" style="max-height:150px;overflow-y:auto;margin-top:6px;"></div>
        <div id="appt-patient-selected" style="display:none;padding:8px;background:var(--success-soft);border-radius:var(--radius-sm);margin-top:6px;font-size:0.85rem;">
          <span id="appt-patient-label"></span>
          <button type="button" class="secondary small" onclick="document.getElementById('appt-patient-id').value='';document.getElementById('appt-patient-selected').style.display='none';" style="float:right;padding:2px 8px;font-size:0.7rem;">✕</button>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:12px;">
        <label>Data e Hora *<input id="appt-datetime" type="datetime-local" required /></label>
        <label>Duração (min)<select id="appt-duration"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label>
      </div>

      <div class="grid grid-2" style="margin-bottom:12px;">
        <label>Tipo<select id="appt-type"><option value="consultation">🩺 Consulta</option><option value="return">🔄 Retorno</option><option value="vaccination">💉 Vacinação</option><option value="surgery">⚕️ Cirurgia</option><option value="exam">🔬 Exame</option><option value="other">📋 Outro</option></select></label>
        <label>Profissional<select id="appt-vet"><option value="">Selecione...</option><option value="vet_dr_silva">Dr. Silva</option><option value="vet_dr_santos">Dra. Santos</option><option value="vet_dr_costa">Dr. Costa</option></select></label>
      </div>

      <div class="grid grid-2" style="margin-bottom:12px;">
        <label>Setor<select id="appt-sector"><option value="consultation_room">🩺 Consulta</option><option value="emergency_room">🚨 Emergência</option><option value="surgery">💉 Cirurgia</option><option value="diagnostic">🔬 Diagnóstico</option></select></label>
        <label>Prioridade<select id="appt-priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
      </div>

      <label>Motivo<textarea id="appt-reason" placeholder="Descreva o motivo..." style="min-height:50px;"></textarea></label>

      <div class="btn-row" style="margin-top:16px;">
        <button type="submit">Salvar</button>
        <button type="button" class="secondary" id="appt-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('appt-alert');
  var formOverlay = document.getElementById('appt-form-overlay');
  var currentView = 'kanban';
  var currentDate = new Date();
  var allAppointments = [];

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var statusColors = { scheduled: '#3b82f6', confirmed: '#10b981', in_progress: '#f59e0b', completed: '#6b7280', cancelled: '#ef4444', no_show: '#8b5cf6' };
  var statusLabels = { scheduled: '📅 Agendado', confirmed: '✅ Confirmado', in_progress: '🔄 Em andamento', completed: '✔ Concluído', cancelled: '✕ Cancelado', no_show: '👻 Não compareceu' };
  var typeLabels = { consultation: '🩺 Consulta', return: '🔄 Retorno', vaccination: '💉 Vacinação', surgery: '⚕️ Cirurgia', exam: '🔬 Exame', other: '📋 Outro' };

  // --- View Switching ---
  document.querySelectorAll('.appt-view-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentView = this.dataset.view;
      document.querySelectorAll('.appt-view-btn').forEach(function(b) { b.style.background = 'rgba(255,255,255,0.7)'; b.style.color = 'var(--ink)'; });
      this.style.background = 'var(--primary-gradient)'; this.style.color = 'white';
      document.querySelectorAll('.appt-view').forEach(function(v) { v.style.display = 'none'; });
      document.getElementById('appt-' + currentView + '-view').style.display = 'block';
      renderView();
    });
  });

  // --- Navigation ---
  document.getElementById('appt-prev').addEventListener('click', function() { navigate(-1); });
  document.getElementById('appt-next').addEventListener('click', function() { navigate(1); });
  document.getElementById('appt-today').addEventListener('click', function() { currentDate = new Date(); renderView(); });

  function navigate(dir) {
    if (currentView === 'month') currentDate.setMonth(currentDate.getMonth() + dir);
    else if (currentView === 'week') currentDate.setDate(currentDate.getDate() + (dir * 7));
    else if (currentView === 'day') currentDate.setDate(currentDate.getDate() + dir);
    renderView();
  }

  // --- Load Data ---
  function loadAppointments() {
    apiRequest('/appointments').then(function(resp) {
      allAppointments = resp.body?.items || resp.body || [];
      // Apply filters
      var vet = document.getElementById('appt-filter-vet').value;
      var status = document.getElementById('appt-filter-status').value;
      var search = document.getElementById('appt-filter-search').value.toLowerCase();
      var filtered = allAppointments.filter(function(a) {
        if (vet && a.veterinarianId !== vet && a.assignedTo !== vet) return false;
        if (status && a.status !== status) return false;
        if (search && !(a.patientName || '').toLowerCase().includes(search) && !(a.ownerName || a.tutorName || '').toLowerCase().includes(search)) return false;
        return true;
      });
      renderView(filtered);
    });
  }

  function renderView(items) {
    items = items || allAppointments;
    var label = document.getElementById('appt-period-label');
    var months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    if (currentView === 'kanban') {
      label.textContent = 'Visão Kanban';
      renderKanban(items);
    } else if (currentView === 'month') {
      label.textContent = months[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
      renderMonth(items);
    } else if (currentView === 'week') {
      var weekStart = new Date(currentDate); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      var weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
      label.textContent = weekStart.getDate() + '/' + (weekStart.getMonth()+1) + ' — ' + weekEnd.getDate() + '/' + (weekEnd.getMonth()+1);
      renderWeek(items, weekStart);
    } else if (currentView === 'day') {
      label.textContent = currentDate.getDate() + ' de ' + months[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
      renderDay(items);
    }
  }

  // --- Kanban View ---
  function renderKanban(items) {
    var columns = [
      { id: 'scheduled', label: '📅 Agendados', status: 'scheduled' },
      { id: 'confirmed', label: '✅ Confirmados', status: 'confirmed' },
      { id: 'in_progress', label: '🔄 Em Atendimento', status: 'in_progress' },
      { id: 'completed', label: '✔ Concluídos Hoje', status: 'completed' },
      { id: 'cancelled', label: '✕ Cancelados', status: 'cancelled' }
    ];

    var today = new Date().toDateString();
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;overflow-x:auto;">';
    
    columns.forEach(function(col) {
      var colItems = items.filter(function(a) {
        if (col.status === 'completed') return a.status === 'completed' && new Date(a.scheduledAt || a.createdAt).toDateString() === today;
        return a.status === col.status;
      });
      
      html += '<div style="background:rgba(255,255,255,0.5);border:1px solid var(--line);border-radius:var(--radius);min-height:300px;">';
      html += '<div style="padding:10px 12px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">';
      html += '<strong style="font-size:0.85rem;">' + col.label + '</strong>';
      html += '<span class="badge" style="background:var(--primary-glow);color:var(--primary);font-size:0.7rem;">' + colItems.length + '</span>';
      html += '</div>';
      html += '<div style="padding:8px;max-height:500px;overflow-y:auto;">';
      
      if (!colItems.length) {
        html += '<div class="muted" style="padding:16px;text-align:center;font-size:0.8rem;">Vazio</div>';
      }
      
      colItems.sort(function(a, b) { return new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0); });
      colItems.forEach(function(a) {
        var time = a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '';
        var typeLabel = typeLabels[a.visitType || a.type] || '';
        html += '<div style="padding:10px;margin-bottom:6px;background:white;border:1px solid var(--line);border-radius:var(--radius-sm);border-left:3px solid ' + (statusColors[a.status] || '#ccc') + ';cursor:pointer;transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow=\\'var(--shadow-md)\\'" onmouseout="this.style.boxShadow=\\'\\'">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
        html += '<strong style="font-size:0.85rem;">🐾 ' + escapeHtml(a.patientName || '-') + '</strong>';
        if (time) html += '<span style="font-size:0.75rem;color:var(--ink-muted);">' + time + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.75rem;color:var(--ink-muted);">👤 ' + escapeHtml(a.tutorName || a.ownerName || '-') + '</div>';
        if (a.reason) html += '<div style="font-size:0.8rem;margin-top:4px;color:var(--ink-soft);">' + escapeHtml(a.reason.substring(0, 50)) + '</div>';
        html += '<div style="margin-top:6px;display:flex;gap:4px;">';
        if (typeLabel) html += '<span class="badge" style="font-size:0.6rem;background:var(--primary-glow);color:var(--primary);">' + typeLabel + '</span>';
        html += '</div>';
        html += '</div>';
      });
      
      html += '</div></div>';
    });
    
    html += '</div>';
    document.getElementById('appt-kanban-view').innerHTML = html;
  }

  // --- Month View ---
  function renderMonth(items) {
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth();
    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var startDay = firstDay.getDay();
    var days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var today = new Date().toDateString();

    var html = '<table style="width:100%;table-layout:fixed;"><thead><tr>';
    days.forEach(function(d) { html += '<th style="padding:8px;text-align:center;font-size:0.75rem;color:var(--ink-muted);">' + d + '</th>'; });
    html += '</tr></thead><tbody><tr>';

    // Empty cells before first day
    for (var i = 0; i < startDay; i++) html += '<td style="background:rgba(0,0,0,0.02);padding:4px;vertical-align:top;height:90px;"></td>';

    for (var d = 1; d <= lastDay.getDate(); d++) {
      var date = new Date(year, month, d);
      var dateStr = date.toISOString().split('T')[0];
      var dayItems = items.filter(function(a) { return (a.scheduledAt || '').startsWith(dateStr); });
      var isToday = date.toDateString() === today;
      
      html += '<td style="padding:4px;vertical-align:top;height:90px;border:1px solid var(--line);' + (isToday ? 'background:var(--primary-glow);' : '') + 'cursor:pointer;" onclick="window.apptDateClick && window.apptDateClick(\\'' + dateStr + '\\')">';
      html += '<div style="font-size:0.8rem;font-weight:' + (isToday ? '800' : '500') + ';color:' + (isToday ? 'var(--primary)' : 'var(--ink)') + ';margin-bottom:2px;">' + d + '</div>';
      dayItems.slice(0, 3).forEach(function(a) {
        var time = a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '';
        html += '<div style="font-size:0.65rem;padding:2px 4px;margin-bottom:2px;background:' + (statusColors[a.status] || '#ccc') + '20;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + time + ' ' + escapeHtml(a.patientName || '-') + '</div>';
      });
      if (dayItems.length > 3) html += '<div style="font-size:0.6rem;color:var(--ink-muted);">+' + (dayItems.length - 3) + ' mais</div>';
      html += '</td>';
      
      if ((startDay + d) % 7 === 0 && d < lastDay.getDate()) html += '</tr><tr>';
    }

    // Fill remaining cells
    var remaining = 7 - ((startDay + lastDay.getDate()) % 7);
    if (remaining < 7) for (var r = 0; r < remaining; r++) html += '<td style="background:rgba(0,0,0,0.02);padding:4px;"></td>';

    html += '</tr></tbody></table>';
    document.getElementById('appt-month-view').innerHTML = html;
  }

  // --- Week View ---
  function renderWeek(items, weekStart) {
    var hours = [];
    for (var h = 7; h <= 19; h++) hours.push(h);
    var days = [];
    for (var d = 0; d < 7; d++) { var date = new Date(weekStart); date.setDate(date.getDate() + d); days.push(date); }
    var today = new Date().toDateString();

    var html = '<table style="width:100%;table-layout:fixed;"><thead><tr><th style="width:50px;"></th>';
    days.forEach(function(day) {
      var isToday = day.toDateString() === today;
      html += '<th style="padding:8px;text-align:center;' + (isToday ? 'background:var(--primary-glow);' : '') + '"><div style="font-size:0.7rem;color:var(--ink-muted);">' + ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][day.getDay()] + '</div><div style="font-size:1rem;font-weight:700;' + (isToday ? 'color:var(--primary);' : '') + '">' + day.getDate() + '</div></th>';
    });
    html += '</tr></thead><tbody>';

    hours.forEach(function(h) {
      html += '<tr><td style="padding:4px 8px;font-size:0.75rem;color:var(--ink-muted);text-align:right;vertical-align:top;">' + h + ':00</td>';
      days.forEach(function(day) {
        var dateStr = day.toISOString().split('T')[0];
        var hourItems = items.filter(function(a) {
          if (!a.scheduledAt) return false;
          var aDate = new Date(a.scheduledAt);
          return aDate.toISOString().startsWith(dateStr) && aDate.getHours() === h;
        });
        var isToday = day.toDateString() === today;
        html += '<td style="padding:2px;border:1px solid var(--line);vertical-align:top;height:50px;' + (isToday ? 'background:rgba(37,99,235,0.02);' : '') + '">';
        hourItems.forEach(function(a) {
          html += '<div style="font-size:0.7rem;padding:2px 4px;margin-bottom:1px;background:' + (statusColors[a.status] || '#ccc') + '20;border-radius:3px;border-left:2px solid ' + (statusColors[a.status] || '#ccc') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(a.patientName || '-') + '</div>';
        });
        html += '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('appt-week-view').innerHTML = html;
  }

  // --- Day View ---
  function renderDay(items) {
    var dateStr = currentDate.toISOString().split('T')[0];
    var dayItems = items.filter(function(a) { return (a.scheduledAt || '').startsWith(dateStr); });
    dayItems.sort(function(a, b) { return new Date(a.scheduledAt) - new Date(b.scheduledAt); });

    if (!dayItems.length) {
      document.getElementById('appt-day-view').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Nenhum agendamento para este dia</div></div>';
      return;
    }

    var html = '<div style="display:grid;gap:8px;">';
    dayItems.forEach(function(a) {
      var time = new Date(a.scheduledAt).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      html += '<div class="card" style="padding:14px;border-left:4px solid ' + (statusColors[a.status] || '#ccc') + ';">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<div><strong style="font-size:1.1rem;">' + time + '</strong> <span class="badge" style="background:' + (statusColors[a.status] || '#ccc') + '20;color:' + (statusColors[a.status] || '#ccc') + ';">' + (statusLabels[a.status] || a.status) + '</span></div>';
      html += '<span style="font-size:0.8rem;color:var(--ink-muted);">' + (typeLabels[a.visitType || a.type] || '') + '</span>';
      html += '</div>';
      html += '<div style="font-size:1rem;font-weight:700;">🐾 ' + escapeHtml(a.patientName || '-') + '</div>';
      html += '<div style="font-size:0.85rem;color:var(--ink-soft);">👤 ' + escapeHtml(a.tutorName || a.ownerName || '-') + '</div>';
      if (a.reason) html += '<div style="font-size:0.85rem;margin-top:6px;color:var(--ink-muted);">' + escapeHtml(a.reason) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    document.getElementById('appt-day-view').innerHTML = html;
  }

  // --- Patient Search ---
  function searchPatients(query) {
    var resultsDiv = document.getElementById('appt-patient-results');
    if (!query || query.length < 2) { resultsDiv.innerHTML = ''; return; }
    resultsDiv.innerHTML = '<div style="padding:6px;"><span class="spinner"></span></div>';
    apiRequest('/patients?q=' + encodeURIComponent(query)).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (!items.length) { resultsDiv.innerHTML = '<div class="muted" style="padding:6px;">Nenhum paciente</div>'; return; }
      var html = '';
      items.forEach(function(p) {
        html += '<div style="padding:8px;border:1px solid var(--line);border-radius:var(--radius-sm);margin-bottom:4px;cursor:pointer;" onmouseover="this.style.background=\\'var(--primary-glow)\\'" onmouseout="this.style.background=\\'\\'" onclick="selectPatient(\\'' + p.id + '\\',\\'' + escapeHtml(p.name) + '\\',\\'' + escapeHtml(p.tutorName || p.ownerName || '-') + '\\',\\'' + (p.primaryOwnerId || '') + '\\')">';
        html += '🐾 <strong>' + escapeHtml(p.name) + '</strong> <span class="muted" style="font-size:0.8rem;">· ' + escapeHtml(p.tutorName || p.ownerName || '-') + '</span></div>';
      });
      resultsDiv.innerHTML = html;
    });
  }

  window.selectPatient = function(id, name, tutorName, ownerId) {
    document.getElementById('appt-patient-id').value = id;
    document.getElementById('appt-owner-id').value = ownerId;
    document.getElementById('appt-patient-label').textContent = '🐾 ' + name + ' · 👤 ' + tutorName;
    document.getElementById('appt-patient-selected').style.display = 'block';
    document.getElementById('appt-patient-results').innerHTML = '';
  };

  document.getElementById('appt-patient-search-btn').addEventListener('click', function() { searchPatients(document.getElementById('appt-patient-search').value); });
  document.getElementById('appt-patient-search').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); searchPatients(this.value); } });

  // --- Form ---
  function showForm(dateStr) {
    formOverlay.style.display = 'grid';
    document.getElementById('appt-form').reset();
    document.getElementById('appt-patient-id').value = '';
    document.getElementById('appt-patient-selected').style.display = 'none';
    if (dateStr) document.getElementById('appt-datetime').value = dateStr + 'T09:00';
    else document.getElementById('appt-datetime').value = new Date().toISOString().slice(0, 16);
  }

  function hideForm() { formOverlay.style.display = 'none'; }

  window.apptDateClick = function(dateStr) { showForm(dateStr); };
  document.getElementById('appt-new-btn').addEventListener('click', function() { showForm(); });
  document.getElementById('appt-form-close').addEventListener('click', hideForm);
  document.getElementById('appt-cancel').addEventListener('click', hideForm);

  document.getElementById('appt-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var patientId = document.getElementById('appt-patient-id').value;
    if (!patientId) { showAlert('Selecione um paciente.', 'error'); return; }
    var body = {
      patientId: patientId,
      ownerId: document.getElementById('appt-owner-id').value,
      scheduledAt: new Date(document.getElementById('appt-datetime').value).toISOString(),
      visitType: document.getElementById('appt-type').value,
      reason: document.getElementById('appt-reason').value || undefined
    };
    apiRequest('/appointments', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) { showAlert('Agendamento criado!', 'success'); hideForm(); loadAppointments(); }
      else showAlert('Erro: ' + (resp.body?.message || ''), 'error');
    });
  });

  // --- Filters ---
  ['appt-filter-vet','appt-filter-sector','appt-filter-status'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', loadAppointments);
  });
  document.getElementById('appt-filter-search').addEventListener('input', function() { clearTimeout(this._t); this._t = setTimeout(loadAppointments, 300); });
  document.getElementById('reload-appt').addEventListener('click', loadAppointments);

  // --- Init ---
  loadAppointments();
})();
</script>

<style>
.appt-view { animation: fadeInUp 0.25s ease both; }
</style>
`;
}
