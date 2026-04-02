export function renderCommercialReports(): string {
  return `
<div class="page-header">
  <div>
    <h1>Relatorios Comerciais</h1>
    <p class="subtitle">Relatorios administrativos de vendas, pagamentos, produtos, servicos e orcamentos.</p>
  </div>
  <button id="reload-reports" class="secondary">Atualizar</button>
</div>

<div id="reports-alert"></div>

<div class="card" style="margin-bottom:20px;">
  <h2>Filtros</h2>
  <div class="grid grid-4">
    <label>De <input type="date" id="report-date-from" /></label>
    <label>Ate <input type="date" id="report-date-to" /></label>
    <label>Relatorio
      <select id="report-type">
        <option value="summary">Resumo Geral</option>
        <option value="sales">Vendas</option>
        <option value="payments">Pagamentos</option>
        <option value="products">Produtos</option>
        <option value="services">Servicos</option>
        <option value="quotes">Orcamentos</option>
      </select>
    </label>
    <div style="display:flex;align-items:flex-end;">
      <button id="report-generate" class="secondary">Gerar Relatorio</button>
    </div>
  </div>
</div>

<div id="report-result" style="display:none;" class="card">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h2 id="report-title">Relatorio</h2>
    <div class="btn-row">
      <button id="report-print" class="secondary">Imprimir</button>
    </div>
  </div>
  <div id="report-content"></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('reports-alert');
  var resultEl = document.getElementById('report-result');
  var contentEl = document.getElementById('report-content');
  var titleEl = document.getElementById('report-title');
  var dateFrom = document.getElementById('report-date-from');
  var dateTo = document.getElementById('report-date-to');
  var reportType = document.getElementById('report-type');
  var generateBtn = document.getElementById('report-generate');
  var printBtn = document.getElementById('report-print');
  var reloadBtn = document.getElementById('reload-reports');

  // Set default dates (current month)
  var now = new Date();
  dateFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  dateTo.value = now.toISOString().slice(0, 10);

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function currency(val) {
    return 'R$ ' + Number(val || 0).toFixed(2);
  }

  var lastReportHtml = '';

  async function generateReport() {
    var type = reportType.value;
    var from = dateFrom.value || undefined;
    var to = dateTo.value || undefined;
    var params = [];
    if (from) params.push('dateFrom=' + encodeURIComponent(from));
    if (to) params.push('dateTo=' + encodeURIComponent(to));
    var url = '/admin/commercial-reports/' + type + (params.length ? '?' + params.join('&') : '');

    var res = await apiRequest(url);
    if (!res.ok) {
      showMsg('Falha ao gerar relatorio', 'error');
      return;
    }

    var data = res.body;
    var titles = {
      summary: 'Resumo Geral',
      sales: 'Vendas por Periodo',
      payments: 'Vendas por Forma de Pagamento',
      products: 'Vendas por Produto',
      services: 'Vendas por Servico',
      quotes: 'Orcamentos'
    };
    titleEl.textContent = titles[type] || type;

    var html = '';
    html += '<p style="font-size:0.8rem;color:#64748b;margin-bottom:12px;">Gerado em ' + new Date(data.generatedAt).toLocaleString('pt-BR') + (data.dateFrom ? ' | Periodo: ' + data.dateFrom + ' ate ' + data.dateTo : '') + '</p>';

    if (type === 'summary' && data.data) {
      var d = data.data;
      html += '<div class="grid grid-4" style="margin-bottom:20px;">';
      html += '<div class="kpi"><div class="value">' + d.totalSales + '</div><div class="label">Total Comandas</div></div>';
      html += '<div class="kpi"><div class="value">' + d.closedSales + '</div><div class="label">Fechadas</div></div>';
      html += '<div class="kpi"><div class="value">' + currency(d.grossRevenue) + '</div><div class="label">Faturamento Bruto</div></div>';
      html += '<div class="kpi"><div class="value">' + currency(d.productRevenue) + ' / ' + currency(d.serviceRevenue) + '</div><div class="label">Produtos / Servicos</div></div>';
      html += '</div>';
      if (d.byPaymentMethod && d.byPaymentMethod.length > 0) {
        html += '<h3>Por Forma de Pagamento</h3>';
        html += '<table><thead><tr><th>Metodo</th><th style="text-align:right">Total</th></tr></thead><tbody>';
        d.byPaymentMethod.forEach(function(m) {
          html += '<tr><td>' + escapeHtml(m.method) + '</td><td style="text-align:right">' + currency(m.total) + '</td></tr>';
        });
        html += '</tbody></table>';
      }
    } else if (type === 'sales' && data.data) {
      var d = data.data;
      html += '<div class="grid grid-4" style="margin-bottom:20px;">';
      html += '<div class="kpi"><div class="value">' + d.totalSales + '</div><div class="label">Total</div></div>';
      html += '<div class="kpi"><div class="value">' + d.openSales + '</div><div class="label">Abertas</div></div>';
      html += '<div class="kpi"><div class="value">' + d.closedSales + '</div><div class="label">Fechadas</div></div>';
      html += '<div class="kpi"><div class="value">' + currency(d.avgTicket) + '</div><div class="label">Ticket Medio</div></div>';
      html += '</div>';
      html += '<div class="grid grid-2">';
      html += '<div class="kpi"><div class="value">' + currency(d.grossRevenue) + '</div><div class="label">Receita Bruta</div></div>';
      html += '<div class="kpi"><div class="value">' + currency(d.netRevenue) + '</div><div class="label">Receita Liquida</div></div>';
      html += '</div>';
      if (d.sales && d.sales.length > 0) {
        html += '<h3 style="margin-top:16px;">Comandas Fechadas</h3>';
        html += '<table><thead><tr><th>Numero</th><th>Total</th><th>Pago</th><th>Data</th></tr></thead><tbody>';
        d.sales.forEach(function(s) {
          html += '<tr><td>' + escapeHtml(s.number) + '</td><td>' + currency(s.total) + '</td><td>' + currency(s.paidAmount) + '</td><td>' + (s.closedAt ? new Date(s.closedAt).toLocaleDateString('pt-BR') : '—') + '</td></tr>';
        });
        html += '</tbody></table>';
      }
    } else if (type === 'payments' && data.data) {
      if (data.data.byMethod && data.data.byMethod.length > 0) {
        html += '<table><thead><tr><th>Metodo</th><th style="text-align:right">Qtd</th><th style="text-align:right">Total</th></tr></thead><tbody>';
        var totalAll = 0;
        data.data.byMethod.forEach(function(m) {
          html += '<tr><td>' + escapeHtml(m.method) + '</td><td style="text-align:right">' + m.count + '</td><td style="text-align:right">' + currency(m.total) + '</td></tr>';
          totalAll += m.total;
        });
        html += '<tr style="font-weight:bold;"><td>Total</td><td></td><td style="text-align:right">' + currency(totalAll) + '</td></tr>';
        html += '</tbody></table>';
      } else {
        html += '<div class="empty">Nenhum pagamento registrado no periodo.</div>';
      }
    } else if (type === 'products' && data.data) {
      if (data.data.products && data.data.products.length > 0) {
        html += '<table><thead><tr><th>Produto</th><th style="text-align:right">Qtd</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
        data.data.products.forEach(function(p) {
          html += '<tr><td>' + escapeHtml(p.name) + '</td><td style="text-align:right">' + p.quantity + '</td><td style="text-align:right">' + currency(p.revenue) + '</td></tr>';
        });
        html += '</tbody></table>';
      } else {
        html += '<div class="empty">Nenhum produto vendido no periodo.</div>';
      }
    } else if (type === 'services' && data.data) {
      if (data.data.services && data.data.services.length > 0) {
        html += '<table><thead><tr><th>Servico</th><th style="text-align:right">Qtd</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
        data.data.services.forEach(function(s) {
          html += '<tr><td>' + escapeHtml(s.name) + '</td><td style="text-align:right">' + s.quantity + '</td><td style="text-align:right">' + currency(s.revenue) + '</td></tr>';
        });
        html += '</tbody></table>';
      } else {
        html += '<div class="empty">Nenhum servico vendido no periodo.</div>';
      }
    } else if (type === 'quotes') {
      html += '<div class="empty">Relatorio de orcamentos disponivel na pagina de Orcamentos.</div>';
    }

    contentEl.innerHTML = html;
    lastReportHtml = html;
    resultEl.style.display = 'block';
  }

  printBtn.addEventListener('click', function() {
    var w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatorio</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;}.kpi{background:#f8fafc;padding:12px;border-radius:8px;text-align:center;}.value{font-size:1.5rem;font-weight:700;}.label{font-size:0.75rem;color:#64748b;}.grid{display:grid;gap:12px;}.grid-4{grid-template-columns:repeat(4,1fr);}.grid-2{grid-template-columns:repeat(2,1fr);}h2,h3{margin:16px 0 8px;}</style></head><body><h2>' + escapeHtml(titleEl.textContent) + '</h2>' + lastReportHtml + '</body></html>');
    w.document.close();
    setTimeout(function() { w.print(); }, 500);
  });

  generateBtn.addEventListener('click', generateReport);
  reloadBtn.addEventListener('click', function() { resultEl.style.display = 'none'; });
})();
</script>`;
}
