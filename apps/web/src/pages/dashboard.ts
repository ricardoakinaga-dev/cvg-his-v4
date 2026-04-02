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
        <div class="btn-row">
          <button onclick="window.location.assign('/products')" class="secondary">Produtos</button>
          <button onclick="window.location.assign('/services')" class="secondary">Servicos</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2>Dashboard Comercial</h2>
        <div class="btn-row" style="gap:4px;">
          <select id="comm-date-range" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;">
            <option value="today">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month" selected>Este Mes</option>
            <option value="custom">Personalizado</option>
          </select>
          <button onclick="loadCommercialKpis()" class="secondary" style="padding:6px 12px;">Atualizar</button>
        </div>
      </div>
      <div id="comm-custom-dates" style="display:none;margin-bottom:12px;" class="grid grid-2">
        <label>De <input type="date" id="comm-date-from" /></label>
        <label>Ate <input type="date" id="comm-date-to" /></label>
      </div>
      <div class="dashboard-grid" id="commercial-kpis">
        <div class="stat-card"><div class="stat-value" id="kpi-open-sales">--</div><div class="stat-label">Comandas Abertas</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-closed-today">--</div><div class="stat-label">Fechadas Hoje</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-gross-today">--</div><div class="stat-label">Faturamento Bruto</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-net-today">--</div><div class="stat-label">Faturamento Liquido</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-avg-ticket">--</div><div class="stat-label">Ticket Medio</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-quotes-issued">--</div><div class="stat-label">Orcamentos Emitidos</div></div>
        <div class="stat-card"><div class="stat-value" id="kpi-quotes-converted">--</div><div class="stat-label">Orcamentos Convertidos</div></div>
      </div>
      <div id="commercial-alerts" style="margin-top:12px;"></div>
      <div id="commercial-by-method" style="margin-top:16px;"></div>
      <div id="commercial-top-products" style="margin-top:16px;"></div>
      <div id="commercial-top-services" style="margin-top:16px;"></div>
      <div id="commercial-conversion" style="margin-top:16px;"></div>
      <div class="btn-row" style="margin-top:12px;">
        <button onclick="window.location.assign('/counter-sales')" class="secondary">Comandas</button>
        <button onclick="window.location.assign('/quotes')" class="secondary">Orcamentos</button>
        <button onclick="window.location.assign('/commercial-reports')" class="secondary">Relatorios</button>
        <button onclick="window.location.assign('/products')" class="secondary">Produtos</button>
        <button onclick="window.location.assign('/services')" class="secondary">Servicos</button>
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

    <style>
      .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 8px 0; }
      .bar-chart .bar { flex: 1; background: linear-gradient(to top, #2563eb, #3b82f6); border-radius: 4px 4px 0 0; min-height: 4px; position: relative; transition: height 0.3s ease; }
      .bar-chart .bar:hover { background: linear-gradient(to top, #1d4ed8, #2563eb); }
      .bar-chart .bar-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; color: #64748b; white-space: nowrap; }
      .bar-chart .bar-value { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; font-weight: 600; color: #1e293b; }
      .alert-row { display: flex; gap: 8px; align-items: center; padding: 8px 12px; background: #fef3c7; border-radius: 6px; margin-bottom: 4px; font-size: 0.8rem; }
      .alert-row.alert-danger { background: #fee2e2; }
      .alert-row.alert-success { background: #dcfce7; }
      .conversion-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 4px; }
      .conversion-bar-fill { height: 100%; background: linear-gradient(to right, #10b981, #059669); border-radius: 4px; transition: width 0.5s ease; }
    </style>

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

      function getDateRange() {
        var range = document.getElementById('comm-date-range').value;
        var now = new Date();
        var from, to;
        if (range === 'today') {
          from = now.toISOString().slice(0, 10);
          to = from;
        } else if (range === 'week') {
          var startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          from = startOfWeek.toISOString().slice(0, 10);
          to = now.toISOString().slice(0, 10);
        } else if (range === 'month') {
          from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
          to = now.toISOString().slice(0, 10);
        } else {
          from = document.getElementById('comm-date-from').value || undefined;
          to = document.getElementById('comm-date-to').value || undefined;
        }
        return { from: from, to: to };
      }

      window.loadCommercialKpis = function() {
        var range = getDateRange();
        var params = [];
        if (range.from) params.push('dateFrom=' + encodeURIComponent(range.from));
        if (range.to) params.push('dateTo=' + encodeURIComponent(range.to));
        var url = '/admin/commercial-dashboard' + (params.length ? '?' + params.join('&') : '');

        apiRequest(url).then(function(d) {
          var data = d.body || {};
          document.getElementById('kpi-open-sales').textContent = data.openSales ?? '--';
          document.getElementById('kpi-closed-today').textContent = data.closedToday ?? '--';
          document.getElementById('kpi-gross-today').textContent = 'R$ ' + (data.grossRevenueToday ?? 0).toFixed(2);
          document.getElementById('kpi-net-today').textContent = 'R$ ' + (data.netRevenueToday ?? 0).toFixed(2);
          document.getElementById('kpi-avg-ticket').textContent = 'R$ ' + (data.avgTicket ?? 0).toFixed(2);
          document.getElementById('kpi-quotes-issued').textContent = data.quotesIssued ?? '--';
          document.getElementById('kpi-quotes-converted').textContent = data.quotesConverted ?? '--';

          // Alerts
          var alertsHtml = '';
          if (data.lowStockAlerts && data.lowStockAlerts.length > 0) {
            for (var i = 0; i < Math.min(data.lowStockAlerts.length, 3); i++) {
              var a = data.lowStockAlerts[i];
              alertsHtml += '<div class="alert-row alert-danger">Estoque baixo: ' + escapeHtml(a.name) + ' (' + escapeHtml(a.code) + ') — ' + a.onHand + ' unidades (min: ' + a.reorderLevel + ')</div>';
            }
          }
          if (data.openSales > 10) {
            alertsHtml += '<div class="alert-row">Atencao: ' + data.openSales + ' comandas abertas pendentes de fechamento.</div>';
          }
          if (data.quotesIssued > 0 && data.quotesConverted > 0) {
            var convRate = Math.round((data.quotesConverted / data.quotesIssued) * 100);
            if (convRate < 30) {
              alertsHtml += '<div class="alert-row">Taxa de conversao de orcamentos baixa: ' + convRate + '%.</div>';
            } else {
              alertsHtml += '<div class="alert-row alert-success">Taxa de conversao de orcamentos: ' + convRate + '%.</div>';
            }
          }
          document.getElementById('commercial-alerts').innerHTML = alertsHtml;

          // Payment method bar chart
          var methodHtml = '';
          if (data.salesByPaymentMethod && data.salesByPaymentMethod.length > 0) {
            methodHtml += '<h3 style="margin-bottom:8px;">Vendas por Forma de Pagamento</h3>';
            var maxTotal = 0;
            for (var j = 0; j < data.salesByPaymentMethod.length; j++) {
              if (data.salesByPaymentMethod[j].total > maxTotal) maxTotal = data.salesByPaymentMethod[j].total;
            }
            methodHtml += '<div class="bar-chart">';
            for (var k = 0; k < data.salesByPaymentMethod.length; k++) {
              var m = data.salesByPaymentMethod[k];
              var heightPct = maxTotal > 0 ? (m.total / maxTotal * 100) : 0;
              methodHtml += '<div class="bar" style="height:' + Math.max(heightPct, 5) + '%;">' +
                '<div class="bar-value">R$ ' + m.total.toFixed(0) + '</div>' +
                '<div class="bar-label">' + m.method.replace('_', ' ') + '</div></div>';
            }
            methodHtml += '</div>';
          }
          document.getElementById('commercial-by-method').innerHTML = methodHtml;

          // Top products
          var prodHtml = '';
          if (data.topProducts && data.topProducts.length > 0) {
            prodHtml += '<h3 style="margin-bottom:8px;">Top Produtos</h3>';
            prodHtml += '<table><thead><tr><th>Produto</th><th style="text-align:right">Qtd</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
            for (var p = 0; p < Math.min(data.topProducts.length, 5); p++) {
              var prod = data.topProducts[p];
              prodHtml += '<tr><td>' + escapeHtml(prod.name) + '</td><td style="text-align:right">' + prod.quantity + '</td><td style="text-align:right">R$ ' + prod.revenue.toFixed(2) + '</td></tr>';
            }
            prodHtml += '</tbody></table>';
          }
          document.getElementById('commercial-top-products').innerHTML = prodHtml;

          // Top services
          var svcHtml = '';
          if (data.topServices && data.topServices.length > 0) {
            svcHtml += '<h3 style="margin-bottom:8px;">Top Servicos</h3>';
            svcHtml += '<table><thead><tr><th>Servico</th><th style="text-align:right">Qtd</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
            for (var s = 0; s < Math.min(data.topServices.length, 5); s++) {
              var svc = data.topServices[s];
              svcHtml += '<tr><td>' + escapeHtml(svc.name) + '</td><td style="text-align:right">' + svc.quantity + '</td><td style="text-align:right">R$ ' + svc.revenue.toFixed(2) + '</td></tr>';
            }
            svcHtml += '</tbody></table>';
          }
          document.getElementById('commercial-top-services').innerHTML = svcHtml;

          // Conversion block
          var convHtml = '';
          if (data.quotesIssued > 0) {
            var rate = Math.round((data.quotesConverted / data.quotesIssued) * 100);
            convHtml += '<h3 style="margin-bottom:8px;">Conversao de Orcamentos</h3>';
            convHtml += '<div class="grid grid-3">';
            convHtml += '<div class="kpi"><div class="value">' + data.quotesIssued + '</div><div class="label">Emitidos</div></div>';
            convHtml += '<div class="kpi"><div class="value">' + data.quotesConverted + '</div><div class="label">Convertidos</div></div>';
            convHtml += '<div class="kpi"><div class="value">' + rate + '%</div><div class="label">Taxa</div></div>';
            convHtml += '</div>';
            convHtml += '<div class="conversion-bar"><div class="conversion-bar-fill" style="width:' + rate + '%;"></div></div>';
          }
          document.getElementById('commercial-conversion').innerHTML = convHtml;
        }).catch(function() {
          document.getElementById('kpi-open-sales').textContent = '--';
        });
      };

      // Custom date toggle
      document.getElementById('comm-date-range').addEventListener('change', function() {
        document.getElementById('comm-custom-dates').style.display = this.value === 'custom' ? '' : 'none';
        if (this.value !== 'custom') loadCommercialKpis();
      });

      loadKpis();
      loadCommercialKpis();
    })();
    </script>
  `;
}
