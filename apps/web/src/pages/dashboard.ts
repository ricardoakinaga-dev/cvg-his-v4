export function renderDashboard(): string {
  return `
    <div class="dashboard-welcome">
      <h2>Bem-vindo ao NexusVet HIS</h2>
      <p>Sistema de Informacao Hospitalar Veterinario — Centro Veterinario Guarapiranga</p>
    </div>

    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-value" id="kpi-tutores">--</div>
        <div class="stat-label">Tutores Cadastrados</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="kpi-pacientes">--</div>
        <div class="stat-label">Pacientes Ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="kpi-abertos">--</div>
        <div class="stat-label">Atendimentos Abertos</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="kpi-notificacoes">--</div>
        <div class="stat-label">Notificacoes</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      <div class="card">
        <h2>Acesso Rapido</h2>
        <div class="btn-row">
          <button onclick="window.location.assign('/owners')">Tutores</button>
          <button onclick="window.location.assign('/patients')" class="secondary">Pacientes</button>
          <button onclick="window.location.assign('/encounters')" class="secondary">Atendimentos</button>
          <button onclick="window.location.assign('/appointments')" class="secondary">Agenda</button>
        </div>
        <div class="btn-row">
          <button onclick="window.location.assign('/inpatient')" class="secondary">Internacao</button>
          <button onclick="window.location.assign('/diagnostics')" class="secondary">Exames</button>
          <button onclick="window.location.assign('/discharges')" class="secondary">Altas</button>
          <button onclick="window.location.assign('/prescription-executions')" class="secondary">Exec. Prescricao</button>
        </div>
      </div>

      <div class="card">
        <h2>Administracao</h2>
        <div class="btn-row">
          <button onclick="window.location.assign('/users')" class="secondary">Usuarios</button>
          <button onclick="window.location.assign('/staff')" class="secondary">Equipe</button>
          <button onclick="window.location.assign('/access-control')" class="secondary">Permissoes</button>
        </div>
        <div class="btn-row">
          <button onclick="window.location.assign('/audit')" class="secondary">Auditoria</button>
          <button onclick="window.location.assign('/billing')" class="secondary">Faturamento</button>
          <button onclick="window.location.assign('/inventory')" class="secondary">Estoque</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Status do Sistema</h2>
      <table>
        <thead>
          <tr><th>Componente</th><th>Status</th><th>Versao</th></tr>
        </thead>
        <tbody>
          <tr><td>API Backend</td><td><span class="badge badge-success">Operacional</span></td><td>v2.0.0</td></tr>
          <tr><td>Banco de Dados</td><td><span class="badge badge-success">Conectado</span></td><td>PostgreSQL 16</td></tr>
          <tr><td>Cache</td><td><span class="badge badge-success">Ativo</span></td><td>Redis 7</td></tr>
          <tr><td>Worker</td><td><span class="badge badge-info">Em espera</span></td><td>v2.0.0</td></tr>
        </tbody>
      </table>
    </div>

    <script>
    (function() {
      function loadKpis() {
        apiRequest('/owners').then(function(d) {
          document.getElementById('kpi-tutores').textContent = (d.body?.items || []).length;
        }).catch(function() {
          document.getElementById('kpi-tutores').textContent = '--';
        });
        apiRequest('/patients').then(function(d) {
          document.getElementById('kpi-pacientes').textContent = (d.body?.items || []).length;
        }).catch(function() {
          document.getElementById('kpi-pacientes').textContent = '--';
        });
        apiRequest('/encounters').then(function(d) {
          var open = (d.body?.items || []).filter(function(e) { return e.status === 'open'; });
          document.getElementById('kpi-abertos').textContent = open.length;
        }).catch(function() {
          document.getElementById('kpi-abertos').textContent = '--';
        });
        apiRequest('/notifications').then(function(d) {
          document.getElementById('kpi-notificacoes').textContent = (d.body?.items || []).length;
        }).catch(function() {
          document.getElementById('kpi-notificacoes').textContent = '--';
        });
      }
      loadKpis();
    })();
    </script>
  `;
}
