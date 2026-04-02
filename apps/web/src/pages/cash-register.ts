export function renderCashRegister(): string {
  return `
<div class="page-header">
  <div>
    <h1>Caixa</h1>
    <p class="subtitle">Abertura, fechamento e movimentacoes de caixa. Controle financeiro do balcao.</p>
  </div>
  <button id="reload-cash" class="secondary">Atualizar</button>
</div>

<div id="cash-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="cash-status">--</div><div class="label">Status do Caixa</div></div>
  <div class="kpi"><div class="value" id="cash-balance">--</div><div class="label">Saldo Atual</div></div>
  <div class="kpi"><div class="value" id="cash-opened">--</div><div class="label">Abertura</div></div>
  <div class="kpi"><div class="value" id="cash-movements">--</div><div class="label">Movimentacoes</div></div>
</div>

<div id="cash-open-section" class="card" style="margin-bottom:20px;">
  <h2>Abrir Caixa</h2>
  <form id="cash-open-form">
    <div class="grid grid-3">
      <label>Valor Inicial <input id="cash-opening-amount" type="number" min="0" step="0.01" value="0" required placeholder="0.00" /></label>
      <label>Observacoes <input id="cash-open-notes" placeholder="Obs. (opcional)" /></label>
      <div style="display:flex;align-items:flex-end;"><button type="submit">Abrir Caixa</button></div>
    </div>
  </form>
</div>

<div id="cash-active-section" style="display:none;">
  <div class="card" style="margin-bottom:20px;">
    <h2>Movimentacao</h2>
    <form id="cash-movement-form">
      <div class="grid grid-4">
        <label>Tipo
          <select id="cash-mov-type" required>
            <option value="supply">Suprimento (entrada)</option>
            <option value="withdrawal">Sangria (saida)</option>
            <option value="adjustment">Ajuste</option>
          </select>
        </label>
        <label>Valor <input id="cash-mov-amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
        <label>Referencia <input id="cash-mov-ref" placeholder="Ref. (opcional)" /></label>
        <div style="display:flex;align-items:flex-end;"><button type="submit">Registrar</button></div>
      </div>
      <label>Observacoes <input id="cash-mov-notes" placeholder="Obs. (opcional)" style="width:100%;" /></label>
    </form>
  </div>

  <div class="card" style="margin-bottom:20px;">
    <h2>Fechar Caixa</h2>
    <form id="cash-close-form">
      <div class="grid grid-3">
        <label>Valor Informado <input id="cash-closing-amount" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
        <label>Observacoes <input id="cash-close-notes" placeholder="Obs. (opcional)" /></label>
        <div style="display:flex;align-items:flex-end;"><button type="submit" class="secondary">Fechar Caixa</button></div>
      </div>
    </form>
  </div>
</div>

<div class="card">
  <h2>Movimentacoes Recentes</h2>
  <div id="cash-movements-list"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('cash-alert');
  var openSection = document.getElementById('cash-open-section');
  var activeSection = document.getElementById('cash-active-section');
  var currentRegisterId = null;

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function currency(val) {
    return 'R$ ' + Number(val || 0).toFixed(2);
  }

  function movementTypeLabel(t) {
    var labels = { opening: 'Abertura', closing: 'Fechamento', payment: 'Pagamento', supply: 'Suprimento', withdrawal: 'Sangria', adjustment: 'Ajuste' };
    return labels[t] || t;
  }

  function movementTypeBadge(t) {
    if (t === 'opening') return 'badge badge-success';
    if (t === 'closing') return 'badge badge-neutral';
    if (t === 'payment' || t === 'supply') return 'badge badge-success';
    if (t === 'withdrawal') return 'badge badge-danger';
    return 'badge badge-info';
  }

  async function loadCash() {
    var res = await apiRequest('/cash-registers');
    if (!res.ok) { showMsg('Falha ao carregar caixa', 'error'); return; }
    var data = res.body;
    var openReg = data.openRegister;

    if (openReg) {
      currentRegisterId = openReg.id;
      openSection.style.display = 'none';
      activeSection.style.display = '';
      document.getElementById('cash-status').textContent = 'Aberto';
      document.getElementById('cash-status').style.color = '#059669';
      document.getElementById('cash-opened').textContent = currency(openReg.openingAmount);

      var balRes = await apiRequest('/cash-registers/' + openReg.id + '/balance');
      if (balRes.ok) {
        document.getElementById('cash-balance').textContent = currency(balRes.body.balance);
      }

      var movRes = await apiRequest('/cash-registers/' + openReg.id + '/movements');
      if (movRes.ok) {
        renderMovements(movRes.body.movements || []);
        document.getElementById('cash-movements').textContent = String((movRes.body.movements || []).length);
      }
    } else {
      currentRegisterId = null;
      openSection.style.display = '';
      activeSection.style.display = 'none';
      document.getElementById('cash-status').textContent = 'Fechado';
      document.getElementById('cash-status').style.color = '#64748b';
      document.getElementById('cash-balance').textContent = 'R$ 0.00';
      document.getElementById('cash-opened').textContent = '—';
      document.getElementById('cash-movements').textContent = '—';
      document.getElementById('cash-movements-list').innerHTML = '<div class="empty">Nenhum caixa aberto. Abra um caixa para iniciar.</div>';
    }
  }

  function renderMovements(movements) {
    if (!movements.length) {
      document.getElementById('cash-movements-list').innerHTML = '<div class="empty">Nenhuma movimentacao.</div>';
      return;
    }
    var html = '<table><thead><tr><th>Tipo</th><th style="text-align:right">Valor</th><th style="text-align:right">Saldo</th><th>Referencia</th><th>Data</th></tr></thead><tbody>';
    var reversed = movements.slice().reverse();
    for (var i = 0; i < reversed.length; i++) {
      var m = reversed[i];
      html += '<tr><td><span class="' + movementTypeBadge(m.movementType) + '">' + movementTypeLabel(m.movementType) + '</span></td>' +
        '<td style="text-align:right">' + currency(m.amount) + '</td>' +
        '<td style="text-align:right"><strong>' + currency(m.runningBalance) + '</strong></td>' +
        '<td>' + escapeHtml(m.reference || '—') + '</td>' +
        '<td>' + new Date(m.createdAt).toLocaleString('pt-BR') + '</td></tr>';
    }
    html += '</tbody></table>';
    document.getElementById('cash-movements-list').innerHTML = html;
  }

  document.getElementById('cash-open-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var payload = {
      openingAmount: parseFloat(document.getElementById('cash-opening-amount').value),
      notes: document.getElementById('cash-open-notes').value || null
    };
    var res = await apiRequest('/cash-registers', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao abrir caixa', 'error'); return; }
    showMsg('Caixa aberto com sucesso. Saldo inicial: ' + currency(payload.openingAmount), 'success');
    loadCash();
  });

  document.getElementById('cash-movement-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var payload = {
      movementType: document.getElementById('cash-mov-type').value,
      amount: parseFloat(document.getElementById('cash-mov-amount').value),
      reference: document.getElementById('cash-mov-ref').value || null,
      notes: document.getElementById('cash-mov-notes').value || null
    };
    var res = await apiRequest('/cash-registers/' + currentRegisterId + '/movements', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao registrar movimentacao', 'error'); return; }
    showMsg('Movimentacao registrada com sucesso.', 'success');
    document.getElementById('cash-mov-amount').value = '';
    document.getElementById('cash-mov-ref').value = '';
    document.getElementById('cash-mov-notes').value = '';
    loadCash();
  });

  document.getElementById('cash-close-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm('Fechar este caixa?')) return;
    var payload = {
      closingAmount: parseFloat(document.getElementById('cash-closing-amount').value),
      notes: document.getElementById('cash-close-notes').value || null
    };
    var res = await apiRequest('/cash-registers/' + currentRegisterId + '/close', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { showMsg(res.body && res.body.message ? res.body.message : 'Falha ao fechar caixa', 'error'); return; }
    var diff = res.body.difference || 0;
    var msg = 'Caixa fechado com sucesso.';
    if (Math.abs(diff) > 0.01) msg += ' Diferenca: ' + currency(diff);
    showMsg(msg, diff === 0 ? 'success' : 'warning');
    loadCash();
  });

  document.getElementById('reload-cash').addEventListener('click', loadCash);
  loadCash();
})();
</script>`;
}
