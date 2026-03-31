export function renderDischarges(): string {
  return `
<div class="page-header">
  <div>
    <h1>Altas / Desfechos</h1>
    <p class="subtitle">Encerramento formal de casos clinicos com resumo e orientacoes de continuidade.</p>
  </div>
  <button id="reload-discharges" class="secondary">Atualizar</button>
</div>

<div id="discharges-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Nova Alta</h2>
  <form id="discharge-form">
    <div class="grid grid-2">
      <label>Encounter ID <input id="discharge-encounter-id" required placeholder="ID do atendimento" /></label>
      <label>Tipo de Alta
        <select id="discharge-type" required>
          <option value="ambulatorial">Ambulatorial</option>
          <option value="inpatient">Internacao</option>
          <option value="transfer">Transferencia</option>
          <option value="death">Obito</option>
        </select>
      </label>
    </div>
    <label>Desfecho <input id="discharge-outcome" placeholder="Ex.: Paciente recuperado" /></label>
    <label>Resumo Clinico <textarea id="discharge-summary" placeholder="Resumo do caso clinico e condutas realizadas"></textarea></label>
    <label>Orientacoes de Continuidade <textarea id="discharge-instructions" placeholder="Orientacoes para o tutor apos a alta"></textarea></label>
    <div class="grid grid-2">
      <label>Data de Retorno <input id="discharge-followup-date" type="date" /></label>
      <label>Notas de Retorno <input id="discharge-followup-notes" placeholder="Ex.: Retorno em 7 dias para reavaliacao" /></label>
    </div>
    <div class="btn-row">
      <button type="submit">Registrar Alta</button>
      <button type="button" class="secondary" id="discharge-clear">Limpar</button>
    </div>
  </form>
</div>

<div class="card">
  <h2>Altas Registradas</h2>
  <div style="margin-bottom:12px;">
    <label>Filtrar por Encounter <input id="discharge-filter-encounter" placeholder="Encounter ID (opcional)" /></label>
  </div>
  <div id="discharges-table"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('discharges-alert');
  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  function loadDischarges(encounterId) {
    var url = '/api/discharges';
    if (encounterId) url += '?encounterId=' + encodeURIComponent(encounterId);
    apiRequest(url).then(function(resp) { var data = resp.body || resp {
      var items = data.items || [];
      if (items.length === 0) {
        document.getElementById('discharges-table').innerHTML = '<p class="muted">Nenhuma alta registrada.</p>';
        return;
      }
      var html = '<table><thead><tr><th>ID</th><th>Encounter</th><th>Tipo</th><th>Desfecho</th><th>Data</th><th>Versao</th></tr></thead><tbody>';
      items.forEach(function(d) {
        html += '<tr>';
        html += '<td><code>' + d.id.substring(0, 12) + '...</code></td>';
        html += '<td><code>' + d.encounterId.substring(0, 12) + '...</code></td>';
        html += '<td>' + d.dischargeType + '</td>';
        html += '<td>' + (d.outcome || '-') + '</td>';
        html += '<td>' + new Date(d.dischargedAt).toLocaleDateString('pt-BR') + '</td>';
        html += '<td>v' + d.version + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('discharges-table').innerHTML = html;
    }).catch(function(err) {
      showAlert('Erro ao carregar altas: ' + err.message, 'error');
    });
  }

  document.getElementById('reload-discharges').addEventListener('click', function() {
    var filter = document.getElementById('discharge-filter-encounter').value;
    loadDischarges(filter);
  });

  document.getElementById('discharge-filter-encounter').addEventListener('change', function() {
    loadDischarges(this.value);
  });

  document.getElementById('discharge-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var body = {
      encounterId: document.getElementById('discharge-encounter-id').value,
      dischargeType: document.getElementById('discharge-type').value,
      outcome: document.getElementById('discharge-outcome').value || undefined,
      clinicalSummary: document.getElementById('discharge-summary').value || undefined,
      continuityInstructions: document.getElementById('discharge-instructions').value || undefined,
      followUpDate: document.getElementById('discharge-followup-date').value || undefined,
      followUpNotes: document.getElementById('discharge-followup-notes').value || undefined
    };
    apiRequest('/discharges', { method: 'POST', body: JSON.stringify(body) }).then(function(resp) { var result = resp.body || resp {
      showAlert('Alta registrada com sucesso!', 'success');
      loadDischarges();
    }).catch(function(err) {
      showAlert('Erro ao registrar alta: ' + err.message, 'error');
    });
  });

  document.getElementById('discharge-clear').addEventListener('click', function() {
    document.getElementById('discharge-form').reset();
  });

  loadDischarges();
})();
</script>
`;
}
