export function renderDashboard(): string {
  return `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">Visao geral do sistema hospitalar veterinario</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="value" id="kpi-tutores">--</div>
        <div class="label">Tutores</div>
      </div>
      <div class="kpi">
        <div class="value" id="kpi-pacientes">--</div>
        <div class="label">Pacientes</div>
      </div>
      <div class="kpi">
        <div class="value" id="kpi-abertos">--</div>
        <div class="label">Atendimentos Abertos</div>
      </div>
      <div class="kpi">
        <div class="value" id="kpi-notificacoes">--</div>
        <div class="label">Notificacoes</div>
      </div>
    </div>

    <div class="btn-row" style="margin-bottom:24px;">
      <button onclick="window.location.assign('/owners')">Tutores</button>
      <button onclick="window.location.assign('/patients')" class="secondary">Pacientes</button>
      <button onclick="window.location.assign('/encounters')" class="secondary">Atendimentos</button>
      <button onclick="window.location.assign('/medical-records')" class="secondary">Prontuario</button>
    </div>

    <div class="card">
      <h2>Atendimentos Recentes</h2>
      <div id="recent-encounters">
        <div class="loading">Carregando</div>
      </div>
    </div>

    <script>
      (async function loadDashboard() {
        const results = await Promise.all([
          apiRequest('/owners'),
          apiRequest('/patients'),
          apiRequest('/encounters?status=open'),
          apiRequest('/notifications?status=pending'),
          apiRequest('/encounters?limit=5&sort=-createdAt')
        ]);

        const [ownersRes, patientsRes, encountersRes, notificationsRes, recentRes] = results;

        document.getElementById('kpi-tutores').textContent =
          ownersRes.ok && Array.isArray(ownersRes.body) ? ownersRes.body.length : ownersRes.ok && ownersRes.body && ownersRes.body.total != null ? ownersRes.body.total : 0;

        document.getElementById('kpi-pacientes').textContent =
          patientsRes.ok && Array.isArray(patientsRes.body) ? patientsRes.body.length : patientsRes.ok && patientsRes.body && patientsRes.body.total != null ? patientsRes.body.total : 0;

        document.getElementById('kpi-abertos').textContent =
          encountersRes.ok && Array.isArray(encountersRes.body) ? encountersRes.body.length : encountersRes.ok && encountersRes.body && encountersRes.body.total != null ? encountersRes.body.total : 0;

        document.getElementById('kpi-notificacoes').textContent =
          notificationsRes.ok && Array.isArray(notificationsRes.body) ? notificationsRes.body.length : notificationsRes.ok && notificationsRes.body && notificationsRes.body.total != null ? notificationsRes.body.total : 0;

        const container = document.getElementById('recent-encounters');
        let encounters = [];
        if (recentRes.ok) {
          encounters = Array.isArray(recentRes.body) ? recentRes.body : (recentRes.body && recentRes.body.items) || [];
        }

        if (encounters.length === 0) {
          container.innerHTML = '<div class="empty">Nenhum atendimento encontrado</div>';
          return;
        }

        container.innerHTML =
          '<table>' +
          '<thead><tr><th>ID</th><th>Paciente</th><th>Status</th><th>Criado em</th></tr></thead>' +
          '<tbody>' +
          encounters.map(function(e) {
            var statusBadge = e.status === 'open'
              ? '<span class="badge badge-warning">Aberto</span>'
              : e.status === 'closed'
                ? '<span class="badge badge-success">Encerrado</span>'
                : '<span class="badge badge-neutral">' + escapeHtml(e.status || '—') + '</span>';
            return '<tr>' +
              '<td>' + escapeHtml(e.id || e.encounterId || '—') + '</td>' +
              '<td>' + escapeHtml(e.patientName || e.patientId || '—') + '</td>' +
              '<td>' + statusBadge + '</td>' +
              '<td>' + formatDate(e.createdAt) + '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table>';
      })();
    </script>
  `;
}
