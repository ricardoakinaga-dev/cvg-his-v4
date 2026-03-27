export function renderBedMap(): string {
  return `
<div class="page-header">
  <div>
    <h1>Mapa de Leitos</h1>
    <p class="subtitle">Visualizacao da ocupacao de leitos por setor.</p>
  </div>
  <button id="reload-bedmap" class="secondary">Atualizar</button>
</div>

<div id="bedmap-alert"></div>

<div class="grid grid-4" style="margin-bottom:20px;">
  <div class="kpi"><div class="value" id="bedmap-total">0</div><div class="label">Total de Leitos</div></div>
  <div class="kpi"><div class="value" id="bedmap-occupied">0</div><div class="label">Ocupados</div></div>
  <div class="kpi"><div class="value" id="bedmap-available">0</div><div class="label">Disponiveis</div></div>
  <div class="kpi"><div class="value" id="bedmap-rate">0%</div><div class="label">Taxa Ocupacao</div></div>
</div>

<div class="card">
  <h2>Setores e Leitos</h2>
  <div id="bedmap-content"><div class="loading">Carregando</div></div>
</div>

<script>
(function() {
  var alertEl = document.getElementById('bedmap-alert');
  var contentEl = document.getElementById('bedmap-content');
  var reloadBtn = document.getElementById('reload-bedmap');

  function showMsg(msg, type) {
    alertEl.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(msg) + '</div>';
    setTimeout(function() { alertEl.innerHTML = ''; }, 7000);
  }

  function renderBedMap(data) {
    document.getElementById('bedmap-total').textContent = String(data.totalBeds || 0);
    document.getElementById('bedmap-occupied').textContent = String(data.occupiedBeds || 0);
    document.getElementById('bedmap-available').textContent = String(data.availableBeds || 0);
    var rate = data.totalBeds > 0 ? Math.round((data.occupiedBeds / data.totalBeds) * 100) : 0;
    document.getElementById('bedmap-rate').textContent = rate + '%';

    var sectors = data.items || [];
    if (!sectors.length) {
      contentEl.innerHTML = '<div class="empty">Nenhum setor cadastrado. Crie setores primeiro.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < sectors.length; i++) {
      var s = sectors[i];
      html += '<div class="card" style="margin-bottom:16px;">';
      html += '<h3 style="margin-bottom:8px;">';
      html += escapeHtml(s.sectorCode) + ' — ' + escapeHtml(s.sectorName);
      html += ' <span class="badge badge-neutral">' + escapeHtml(s.kind) + '</span>';
      html += '</h3>';
      html += '<div style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">';
      html += 'Total: ' + s.totalBeds + ' | Ocupados: ' + s.occupiedBeds + ' | Disponiveis: ' + s.availableBeds;
      html += '</div>';

      if (!s.beds || !s.beds.length) {
        html += '<div class="empty">Nenhum leito neste setor.</div>';
      } else {
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        for (var j = 0; j < s.beds.length; j++) {
          var b = s.beds[j];
          var statusClass = b.status === 'available' ? 'badge-success' : b.status === 'occupied' ? 'badge-warning' : 'badge-danger';
          html += '<div style="border:1px solid #d6d3d1;border-radius:8px;padding:8px 12px;min-width:120px;background:' + (b.status === 'available' ? '#f0fdf4' : b.status === 'occupied' ? '#fffbeb' : '#fef2f2') + ';">';
          html += '<div style="font-weight:600;">' + escapeHtml(b.code) + '</div>';
          html += '<div style="font-size:0.8rem;color:#64748b;">' + escapeHtml(b.name) + '</div>';
          html += '<div><span class="' + statusClass + '">' + escapeHtml(b.status) + '</span></div>';
          if (b.status === 'occupied' && b.patientId) {
            html += '<div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Paciente: <code>' + escapeHtml(b.patientId).substring(0, 8) + '</code></div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    contentEl.innerHTML = html;
  }

  async function loadBedMap() {
    contentEl.innerHTML = '<div class="loading">Carregando</div>';
    var res = await apiRequest('/bed-map');
    if (!res.ok) {
      contentEl.innerHTML = '<div class="empty">Erro ao carregar mapa de leitos.</div>';
      showMsg(res.body && res.body.message ? res.body.message : 'Falha ao ler /bed-map', 'error');
      return;
    }
    renderBedMap(res.body);
  }

  reloadBtn.addEventListener('click', loadBedMap);
  loadBedMap();
})();
</script>`;
}
