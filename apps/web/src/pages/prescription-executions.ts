export function renderPrescriptionExecutions(): string {
  return `
<div class="page-header">
  <div>
    <h1>Execucao de Prescricao</h1>
    <p class="subtitle">Registro de administracao de medicamentos prescritos — enfermagem.</p>
  </div>
  <button id="reload-pe" class="secondary">Atualizar</button>
</div>

<div id="pe-alert"></div>

<div class="grid grid-2" style="margin-bottom:20px;">
  <div class="card">
    <h2>Nova Execucao</h2>
    <form id="pe-form">
      <div class="grid grid-2">
        <label>Clinical Entry ID <input id="pe-entry-id" required placeholder="ID da entrada clinica" /></label>
        <label>Paciente ID <input id="pe-patient-id" required placeholder="ID do paciente" /></label>
      </div>
      <div class="grid grid-2">
        <label>Encounter ID <input id="pe-encounter-id" required placeholder="ID do atendimento" /></label>
        <label>Horario Agendado <input id="pe-scheduled" type="datetime-local" required /></label>
      </div>
      <div class="grid grid-3">
        <label>Medicamento <input id="pe-medication" required placeholder="Ex.: Amoxicilina" /></label>
        <label>Dosagem <input id="pe-dosage" required placeholder="Ex.: 500mg" /></label>
        <label>Via <input id="pe-route" placeholder="Ex.: oral, IV, IM" /></label>
      </div>
      <label>Frequencia <input id="pe-frequency" placeholder="Ex.: 8/8h" /></label>
      <label>Notas <textarea id="pe-notes" placeholder="Observacoes"></textarea></label>
      <div class="btn-row">
        <button type="submit">Criar Execucao</button>
        <button type="button" class="secondary" id="pe-clear">Limpar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Executar / Suspender</h2>
    <form id="pe-execute-form" style="margin-bottom:16px;">
      <label>Execucao ID <input id="pe-execute-id" required placeholder="ID da execucao" /></label>
      <div class="grid grid-2">
        <label>Acao
          <select id="pe-execute-action">
            <option value="administered">Administrado</option>
            <option value="not-administered">Nao Administrado</option>
          </select>
        </label>
        <label>Notas <input id="pe-execute-notes" placeholder="Observacoes" /></label>
      </div>
      <div class="btn-row">
        <button type="submit">Executar</button>
      </div>
    </form>
    <form id="pe-suspend-form">
      <div class="grid grid-2">
        <label>Execucao ID <input id="pe-suspend-id" required placeholder="ID da execucao" /></label>
        <label>Motivo <input id="pe-suspend-reason" required placeholder="Motivo da suspensao" /></label>
      </div>
      <div class="btn-row">
        <button type="submit" class="danger">Suspender</button>
        <button type="button" class="secondary" id="pe-resume-btn">Retomar</button>
      </div>
    </form>
  </div>
</div>

<div class="card">
  <h2>Execucoes</h2>
  <div style="margin-bottom:12px;">
    <label>Filtrar por Encounter <input id="pe-filter-encounter" placeholder="Encounter ID (opcional)" /></label>
  </div>
  <div id="pe-table"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('pe-alert');
  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  var statusLabels = {
    pending: 'Pendente',
    administered: 'Administrado',
    'not-administered': 'Nao Administrado',
    suspended: 'Suspenso',
    cancelled: 'Cancelado'
  };

  function loadExecutions(encounterId) {
    var url = '/api/prescription-executions';
    if (encounterId) url += '?encounterId=' + encodeURIComponent(encounterId);
    apiRequest(url).then(function(resp) { var data = resp.body || resp {
      var items = data.items || [];
      if (items.length === 0) {
        document.getElementById('pe-table').innerHTML = '<p class="muted">Nenhuma execucao registrada.</p>';
        return;
      }
      var html = '<table><thead><tr><th>ID</th><th>Medicamento</th><th>Dosagem</th><th>Status</th><th>Agendado</th><th>Versao</th></tr></thead><tbody>';
      items.forEach(function(pe) {
        var statusClass = pe.status === 'administered' ? 'success' : (pe.status === 'suspended' ? 'warning' : '');
        html += '<tr>';
        html += '<td><code>' + pe.id.substring(0, 12) + '...</code></td>';
        html += '<td>' + pe.medicationName + '</td>';
        html += '<td>' + pe.dosage + '</td>';
        html += '<td><span class="badge badge-' + statusClass + '">' + (statusLabels[pe.status] || pe.status) + '</span></td>';
        html += '<td>' + new Date(pe.scheduledAt).toLocaleString('pt-BR') + '</td>';
        html += '<td>v' + pe.version + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('pe-table').innerHTML = html;
    }).catch(function(err) {
      showAlert('Erro ao carregar execucoes: ' + err.message, 'error');
    });
  }

  document.getElementById('reload-pe').addEventListener('click', function() {
    var filter = document.getElementById('pe-filter-encounter').value;
    loadExecutions(filter);
  });

  document.getElementById('pe-filter-encounter').addEventListener('change', function() {
    loadExecutions(this.value);
  });

  document.getElementById('pe-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var scheduled = document.getElementById('pe-scheduled').value;
    var body = {
      clinicalEntryId: document.getElementById('pe-entry-id').value,
      patientId: document.getElementById('pe-patient-id').value,
      encounterId: document.getElementById('pe-encounter-id').value,
      medicationName: document.getElementById('pe-medication').value,
      dosage: document.getElementById('pe-dosage').value,
      route: document.getElementById('pe-route').value || undefined,
      frequency: document.getElementById('pe-frequency').value || undefined,
      scheduledAt: scheduled ? new Date(scheduled).toISOString() : undefined,
      notes: document.getElementById('pe-notes').value || undefined
    };
    apiRequest('/prescription-executions', { method: 'POST', body: JSON.stringify(body) }).then(function() {
      showAlert('Execucao criada com sucesso!', 'success');
      loadExecutions();
    }).catch(function(err) {
      showAlert('Erro ao criar execucao: ' + err.message, 'error');
    });
  });

  document.getElementById('pe-execute-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('pe-execute-id').value;
    var body = {
      status: document.getElementById('pe-execute-action').value,
      notes: document.getElementById('pe-execute-notes').value || undefined
    };
    apiRequest('/prescription-executions/' + id + '/execute', { method: 'POST', body: JSON.stringify(body) }).then(function() {
      showAlert('Execucao atualizada!', 'success');
      loadExecutions();
    }).catch(function(err) {
      showAlert('Erro: ' + err.message, 'error');
    });
  });

  document.getElementById('pe-suspend-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('pe-suspend-id').value;
    apiRequest('/prescription-executions/' + id + '/suspend', { method: 'POST', body: JSON.stringify(, {
      reason: document.getElementById('pe-suspend-reason').value
    }).then(function() {
      showAlert('Execucao suspensa.', 'warning');
      loadExecutions();
    }).catch(function(err) {
      showAlert('Erro: ' + err.message, 'error');
    });
  });

  document.getElementById('pe-resume-btn').addEventListener('click', function() {
    var id = document.getElementById('pe-suspend-id').value;
    if (!id) { showAlert('Informe o ID da execucao', 'error'); return; }
    apiRequest('/prescription-executions/' + id + '/resume', { method: 'POST' }).then(function() {
      showAlert('Execucao retomada!', 'success');
      loadExecutions();
    }).catch(function(err) {
      showAlert('Erro: ' + err.message, 'error');
    });
  });

  document.getElementById('pe-clear').addEventListener('click', function() {
    document.getElementById('pe-form').reset();
  });

  loadExecutions();
})();
</script>
`;
}
