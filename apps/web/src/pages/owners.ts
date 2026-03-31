export function renderOwners(): string {
  return `
<div class="page-header">
  <div>
    <h1>Tutores</h1>
    <p class="subtitle">Cadastro mestre de responsaveis por pacientes</p>
  </div>
  <div class="btn-row" style="flex-direction:row;margin-top:0;">
    <button id="owner-new-btn" style="white-space:nowrap;">+ Novo Tutor</button>
    <button id="reload-owners" class="secondary" style="white-space:nowrap;">Atualizar</button>
  </div>
</div>

<div id="owners-alert"></div>

<!-- Search & Filters -->
<div class="card" style="margin-bottom:16px;padding:14px 18px;">
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
    <input id="owner-search" placeholder="Buscar por nome, documento, telefone ou e-mail..." style="flex:1;min-width:200px;" />
    <select id="owner-filter-status" style="width:auto;min-width:130px;">
      <option value="">Todos os status</option>
      <option value="active">Ativos</option>
      <option value="inactive">Inativos</option>
      <option value="pending_review">Pendente revisao</option>
    </select>
    <button id="owner-search-btn" class="secondary" style="white-space:nowrap;">Buscar</button>
  </div>
</div>

<!-- Form Modal (hidden by default) -->
<div id="owner-form-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;display:none;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:720px;max-height:90vh;overflow-y:auto;margin:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 id="owner-form-title" style="margin:0;">Novo Tutor</h2>
      <button class="secondary small" id="owner-form-close" type="button">✕</button>
    </div>
    
    <form id="owner-form">
      <input type="hidden" id="owner-edit-id" />
      
      <!-- Bloco 1: Dados Pessoais -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">Dados Pessoais</h3>
        <div class="grid grid-2">
          <label style="grid-column:span 2;">
            Nome Completo *
            <input id="owner-fullname" required placeholder="Nome completo do tutor" />
          </label>
        </div>
        <div class="grid grid-3">
          <label>Tipo Documento
            <select id="owner-doc-type">
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="rg">RG</option>
              <option value="passport">Passaporte</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label style="grid-column:span 2;">Numero do Documento
            <input id="owner-doc-number" placeholder="000.000.000-00" />
          </label>
        </div>
        <div class="grid grid-2">
          <label>Nome Social / Fantasia
            <input id="owner-display-name" placeholder="Como prefere ser chamado" />
          </label>
          <label>Origem do Cadastro
            <select id="owner-origin">
              <option value="reception_manual">Recepção manual</option>
              <option value="administrative_manual">Administrativo</option>
              <option value="patient_flow_quick_create">Fluxo rápido</option>
              <option value="migration">Migração</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Bloco 2: Contatos -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--line);">
          <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0;">Contatos</h3>
          <button type="button" id="owner-add-contact" class="secondary small">+ Adicionar</button>
        </div>
        <div id="owner-contacts-container">
          <!-- Dynamic contact rows -->
        </div>
      </div>

      <!-- Bloco 3: Endereço -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">Endereço</h3>
        <div class="grid grid-3">
          <label>CEP
            <input id="owner-cep" placeholder="00000-000" maxlength="9" />
          </label>
          <label id="owner-cep-status" style="grid-column:span 2;align-self:end;font-size:0.75rem;color:var(--ink-muted);padding-bottom:14px;"></label>
        </div>
        <div class="grid grid-2">
          <label style="grid-column:span 2;">Logradouro
            <input id="owner-street" placeholder="Rua, Avenida, etc." />
          </label>
        </div>
        <div class="grid grid-3">
          <label>Numero
            <input id="owner-number" placeholder="123" />
          </label>
          <label style="grid-column:span 2;">Complemento
            <input id="owner-complement" placeholder="Apto, Casa, etc." />
          </label>
        </div>
        <div class="grid grid-3">
          <label>Bairro
            <input id="owner-district" placeholder="Bairro" />
          </label>
          <label>Cidade
            <input id="owner-city" placeholder="Cidade" />
          </label>
          <label>Estado
            <input id="owner-state" placeholder="UF" maxlength="2" style="text-transform:uppercase;" />
          </label>
        </div>
      </div>

      <!-- Bloco 4: Informações Administrativas -->
      <div style="margin-bottom:20px;">
        <h3 style="font-size:0.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--line);">Informações Administrativas</h3>
        <div class="grid grid-3">
          <label>Status
            <select id="owner-status">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="pending_review">Pendente revisão</option>
              <option value="restricted">Restrito</option>
            </select>
          </label>
          <label>Contato Preferencial
            <select id="owner-pref-contact">
              <option value="">Selecione...</option>
              <option value="phone">Telefone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:8px;padding-top:20px;">
            <input type="checkbox" id="owner-financial" style="width:auto;" />
            <span style="font-size:0.85rem;">Responsável financeiro</span>
          </label>
        </div>
        <label>Observações Administrativas
          <textarea id="owner-notes" placeholder="Notas administrativas (não clínicas)"></textarea>
        </label>
      </div>

      <div class="btn-row">
        <button type="submit" id="owner-submit">Salvar Tutor</button>
        <button type="button" class="secondary" id="owner-cancel">Cancelar</button>
      </div>
    </form>
  </div>
</div>

<!-- Table -->
<div class="card">
  <div id="owners-table"></div>
</div>

<!-- Detail Modal -->
<div id="owner-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(6px);z-index:300;place-items:center;padding:20px;overflow-y:auto;">
  <div class="card" style="width:100%;max-width:600px;max-height:90vh;overflow-y:auto;margin:auto;" id="owner-detail-content"></div>
</div>

<script>
(function() {
  var alertBox = document.getElementById('owners-alert');
  var formOverlay = document.getElementById('owner-form-overlay');
  var detailOverlay = document.getElementById('owner-detail-overlay');
  var contactsContainer = document.getElementById('owner-contacts-container');
  var contactCounter = 0;

  function showAlert(msg, type) {
    alertBox.innerHTML = '<div class="alert alert-' + (type || 'info') + '">' + msg + '</div>';
    setTimeout(function() { alertBox.innerHTML = ''; }, 4000);
  }

  // --- Contact Management ---
  function addContactRow(data) {
    contactCounter++;
    var id = 'c' + contactCounter;
    var row = document.createElement('div');
    row.className = 'card';
    row.style.cssText = 'padding:12px;margin-bottom:8px;background:rgba(99,102,241,0.03);';
    row.id = 'contact-row-' + id;
    row.innerHTML = 
      '<div class="grid grid-3" style="gap:8px;">' +
        '<label style="font-size:0.7rem;">Rotulo<input class="contact-label" placeholder="Ex: Celular" value="' + (data?.label || '') + '" /></label>' +
        '<label style="font-size:0.7rem;">Tipo<select class="contact-type"><option value="phone"' + (data?.type==='phone'?' selected':'') + '>Telefone</option><option value="whatsapp"' + (data?.type==='whatsapp'?' selected':'') + '>WhatsApp</option><option value="email"' + (data?.type==='email'?' selected':'') + '>E-mail</option><option value="other"' + (data?.type==='other'?' selected':'') + '>Outro</option></select></label>' +
        '<label style="font-size:0.7rem;">Valor<input class="contact-value" placeholder="(11) 99999-9999" value="' + (data?.value || '') + '" /></label>' +
      '</div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-top:6px;">' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;"><input type="radio" name="contact-primary" class="contact-primary" value="' + id + '"' + (data?.isPrimary || contactCounter===1 ? ' checked' : '') + ' style="width:auto;" /> Principal</label>' +
        '<label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;"><input type="checkbox" class="contact-whatsapp" style="width:auto;"' + (data?.isWhatsApp ? ' checked' : '') + ' /> WhatsApp</label>' +
        '<button type="button" class="danger small" onclick="this.closest(\\'.card\\').remove()" style="margin-left:auto;padding:4px 10px;font-size:0.7rem;">Remover</button>' +
      '</div>';
    contactsContainer.appendChild(row);
  }

  function getContactsFromForm() {
    var contacts = [];
    contactsContainer.querySelectorAll('[id^="contact-row-"]').forEach(function(row) {
      var value = row.querySelector('.contact-value').value.trim();
      if (!value) return;
      contacts.push({
        label: row.querySelector('.contact-label').value.trim() || 'Contato',
        type: row.querySelector('.contact-type').value,
        value: value,
        isPrimary: row.querySelector('.contact-primary').checked,
        isWhatsapp: row.querySelector('.contact-whatsapp').checked,
        canReceiveClinicalMessages: true,
        canReceiveFinancialMessages: true
      });
    });
    return contacts;
  }

  document.getElementById('owner-add-contact').addEventListener('click', function() { addContactRow(); });

  // --- CEP Auto-fill ---
  var cepTimer = null;
  document.getElementById('owner-cep').addEventListener('input', function(e) {
    var cep = e.target.value.replace(/\\D/g, '');
    if (cep.length > 5) cep = cep.substring(0,5) + '-' + cep.substring(5);
    e.target.value = cep.substring(0, 9);
    
    var statusEl = document.getElementById('owner-cep-status');
    clearTimeout(cepTimer);
    
    var cleanCep = cep.replace(/\\D/g, '');
    if (cleanCep.length === 8) {
      statusEl.innerHTML = '<span class="spinner"></span> Buscando endereço...';
      cepTimer = setTimeout(function() {
        apiRequest('/cep/lookup?cep=' + cleanCep).then(function(resp) {
          if (resp.ok && resp.body && resp.body.found) {
            document.getElementById('owner-street').value = resp.body.street || '';
            document.getElementById('owner-district').value = resp.body.district || '';
            document.getElementById('owner-city').value = resp.body.city || '';
            document.getElementById('owner-state').value = resp.body.state || '';
            if (resp.body.complement) {
              document.getElementById('owner-complement').placeholder = resp.body.complement;
            }
            statusEl.innerHTML = '<span class="text-success">✓ Endereço preenchido automaticamente</span>';
          } else {
            statusEl.innerHTML = '<span class="text-danger">CEP não encontrado</span>';
          }
        }).catch(function() {
          statusEl.innerHTML = '<span class="text-danger">Erro ao buscar CEP</span>';
        });
      }, 500);
    } else {
      statusEl.innerHTML = '';
    }
  });

  // --- Document Mask ---
  document.getElementById('owner-doc-number').addEventListener('input', function(e) {
    var type = document.getElementById('owner-doc-type').value;
    var v = e.target.value.replace(/\\D/g, '');
    if (type === 'cpf' && v.length <= 11) {
      v = v.replace(/(\\d{3})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d{1,2})$/, '$1-$2');
    } else if (type === 'cnpj' && v.length <= 14) {
      v = v.replace(/(\\d{2})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d)/, '$1.$2').replace(/(\\d{3})(\\d)/, '$1/$2').replace(/(\\d{4})(\\d{1,2})$/, '$1-$2');
    }
    e.target.value = v;
  });

  // --- Form Management ---
  function showForm(editData) {
    formOverlay.style.display = 'grid';
    document.getElementById('owner-form-title').textContent = editData ? 'Editar Tutor' : 'Novo Tutor';
    document.getElementById('owner-edit-id').value = editData?.id || '';
    
    if (editData) {
      document.getElementById('owner-fullname').value = editData.fullName || '';
      document.getElementById('owner-display-name').value = editData.displayName || '';
      document.getElementById('owner-doc-type').value = editData.document?.type || 'cpf';
      document.getElementById('owner-doc-number').value = editData.document?.number || '';
      document.getElementById('owner-origin').value = editData.origin || 'reception_manual';
      document.getElementById('owner-status').value = editData.status || 'active';
      document.getElementById('owner-pref-contact').value = editData.preferredContactMethod || '';
      document.getElementById('owner-financial').checked = editData.financialResponsible || false;
      document.getElementById('owner-notes').value = editData.administrativeNotes || '';
      
      // Address
      var addr = editData.address || {};
      document.getElementById('owner-cep').value = addr.postalCode || '';
      document.getElementById('owner-street').value = addr.street || '';
      document.getElementById('owner-number').value = addr.number || '';
      document.getElementById('owner-complement').value = addr.complement || '';
      document.getElementById('owner-district').value = addr.district || '';
      document.getElementById('owner-city').value = addr.city || '';
      document.getElementById('owner-state').value = addr.state || '';
      
      // Contacts
      contactsContainer.innerHTML = '';
      contactCounter = 0;
      (editData.contacts || []).forEach(function(c) { addContactRow(c); });
    } else {
      document.getElementById('owner-form').reset();
      contactsContainer.innerHTML = '';
      contactCounter = 0;
      addContactRow();
      document.getElementById('owner-origin').value = 'reception_manual';
      document.getElementById('owner-status').value = 'active';
    }
  }

  function hideForm() {
    formOverlay.style.display = 'none';
  }

  document.getElementById('owner-new-btn').addEventListener('click', function() { showForm(); });
  document.getElementById('owner-form-close').addEventListener('click', hideForm);
  document.getElementById('owner-cancel').addEventListener('click', hideForm);

  // --- Form Submit ---
  document.getElementById('owner-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var editId = document.getElementById('owner-edit-id').value;
    var contacts = getContactsFromForm();
    
    var body = {
      fullName: document.getElementById('owner-fullname').value,
      displayName: document.getElementById('owner-display-name').value || undefined,
      document: {
        type: document.getElementById('owner-doc-type').value,
        number: document.getElementById('owner-doc-number').value.replace(/\\D/g, '')
      },
      contacts: contacts,
      address: {
        postalCode: document.getElementById('owner-cep').value.replace(/\\D/g, ''),
        street: document.getElementById('owner-street').value,
        number: document.getElementById('owner-number').value,
        complement: document.getElementById('owner-complement').value,
        district: document.getElementById('owner-district').value,
        city: document.getElementById('owner-city').value,
        state: document.getElementById('owner-state').value.toUpperCase(),
        country: 'BR'
      },
      preferredContactMethod: document.getElementById('owner-pref-contact').value || undefined,
      financialResponsible: document.getElementById('owner-financial').checked,
      origin: document.getElementById('owner-origin').value,
      status: document.getElementById('owner-status').value,
      administrativeNotes: document.getElementById('owner-notes').value || undefined
    };

    var method = editId ? 'PATCH' : 'POST';
    var url = editId ? '/owners/' + editId : '/owners';
    
    apiRequest(url, { method: method, body: JSON.stringify(body) }).then(function(resp) {
      if (resp.ok) {
        showAlert(editId ? 'Tutor atualizado com sucesso!' : 'Tutor cadastrado com sucesso!', 'success');
        hideForm();
        loadOwners();
      } else {
        showAlert('Erro: ' + (resp.body?.message || 'Erro desconhecido'), 'error');
      }
    }).catch(function(err) {
      showAlert('Erro: ' + err.message, 'error');
    });
  });

  // --- Load Owners ---
  function loadOwners() {
    var q = document.getElementById('owner-search').value;
    var status = document.getElementById('owner-filter-status').value;
    var url = '/owners';
    var params = [];
    if (q) params.push('q=' + encodeURIComponent(q));
    if (params.length) url += '?' + params.join('&');
    
    apiRequest(url).then(function(resp) {
      var items = (resp.body?.items || resp.body || []);
      if (status) {
        items = items.filter(function(o) { return o.status === status; });
      }
      renderTable(items);
    }).catch(function(err) {
      showAlert('Erro ao carregar tutores: ' + err.message, 'error');
    });
  }

  function renderTable(items) {
    if (!items.length) {
      document.getElementById('owners-table').innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Nenhum tutor encontrado</div></div>';
      return;
    }
    var html = '<table><thead><tr><th>Nome</th><th>Documento</th><th>Contato Principal</th><th>Cidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
    items.forEach(function(o) {
      var contact = (o.contacts || []).find(function(c) { return c.isPrimary; }) || (o.contacts || [])[0];
      var addr = o.address || {};
      var doc = o.document || {};
      var statusBadge = o.status === 'active' ? 'success' : (o.status === 'inactive' ? 'danger' : 'warning');
      html += '<tr>';
      html += '<td><strong>' + escapeHtml(o.fullName || '-') + '</strong>' + (o.displayName ? '<br><small class="muted">' + escapeHtml(o.displayName) + '</small>' : '') + '</td>';
      html += '<td>' + (doc.number ? '<code>' + escapeHtml(doc.number) + '</code>' : '<span class="muted">-</span>') + '<br><small class="muted">' + (doc.type || '').toUpperCase() + '</small></td>';
      html += '<td>' + (contact ? escapeHtml(contact.value) : '<span class="muted">-</span>') + (contact?.isWhatsapp ? ' <span class="badge badge-success">WA</span>' : '') + '</td>';
      html += '<td>' + (addr.city ? escapeHtml(addr.city) + '/' + addr.state : '<span class="muted">-</span>') + '</td>';
      html += '<td><span class="badge badge-' + statusBadge + '">' + escapeHtml(o.status || '-') + '</span></td>';
      html += '<td><button class="small secondary" onclick="showOwnerDetail(\\'' + o.id + '\\')">Ver</button> <button class="small secondary" onclick="editOwner(\\'' + o.id + '\\')">Editar</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('owners-table').innerHTML = html;
  }

  // --- Detail View ---
  window.showOwnerDetail = function(id) {
    apiRequest('/owners/' + id).then(function(resp) {
      if (!resp.ok) { showAlert('Erro ao carregar tutor', 'error'); return; }
      var o = resp.body || resp;
      var addr = o.address || {};
      var doc = o.document || {};
      var contacts = o.contacts || [];
      
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h2 style="margin:0;">' + escapeHtml(o.fullName) + '</h2><button class="secondary small" onclick="document.getElementById(\\'owner-detail-overlay\\').style.display=\\'none\\'">✕</button></div>';
      
      html += '<div style="display:grid;gap:16px;">';
      
      // Status badge
      var statusBadge = o.status === 'active' ? 'success' : (o.status === 'inactive' ? 'danger' : 'warning');
      html += '<div><span class="badge badge-' + statusBadge + '">' + o.status + '</span>' + (o.financialResponsible ? ' <span class="badge badge-info">Resp. Financeiro</span>' : '') + '</div>';
      
      // Document
      if (doc.number) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">' + (doc.type||'').toUpperCase() + '</strong><br><code>' + escapeHtml(doc.number) + '</code></div>';
      }
      
      // Contacts
      if (contacts.length) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Contatos</strong>';
        contacts.forEach(function(c) {
          html += '<div style="padding:4px 0;">' + (c.isPrimary ? '★ ' : '  ') + '<strong>' + escapeHtml(c.label) + '</strong>: ' + escapeHtml(c.value) + (c.isWhatsapp ? ' <span class="badge badge-success" style="font-size:0.6rem;">WA</span>' : '') + '</div>';
        });
        html += '</div>';
      }
      
      // Address
      if (addr.street || addr.city) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Endereço</strong><br>';
        html += escapeHtml(addr.street || '') + (addr.number ? ', ' + escapeHtml(addr.number) : '') + (addr.complement ? ' - ' + escapeHtml(addr.complement) : '');
        html += '<br>' + escapeHtml(addr.district || '') + (addr.city ? ' - ' + escapeHtml(addr.city) + '/' + addr.state : '') + (addr.postalCode ? ' - CEP ' + escapeHtml(addr.postalCode) : '');
        html += '</div>';
      }
      
      // Notes
      if (o.administrativeNotes) {
        html += '<div><strong style="font-size:0.75rem;text-transform:uppercase;color:var(--ink-muted);">Observações</strong><br>' + escapeHtml(o.administrativeNotes) + '</div>';
      }
      
      // Actions
      html += '<div class="btn-row" style="margin-top:12px;">';
      html += '<button class="secondary" onclick="editOwner(\\'' + o.id + '\\');document.getElementById(\\'owner-detail-overlay\\').style.display=\\'none\\'">Editar</button>';
      html += '<button onclick="window.location.assign(\\'/patients?tutorId=' + o.id + '\\')">+ Paciente</button>';
      html += '</div>';
      
      html += '</div>';
      
      document.getElementById('owner-detail-content').innerHTML = html;
      detailOverlay.style.display = 'grid';
    });
  };

  // --- Edit ---
  window.editOwner = function(id) {
    apiRequest('/owners/' + id).then(function(resp) {
      if (resp.ok) showForm(resp.body || resp);
    });
  };

  // --- Search ---
  document.getElementById('owner-search-btn').addEventListener('click', loadOwners);
  document.getElementById('owner-search').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadOwners();
  });
  document.getElementById('owner-filter-status').addEventListener('change', loadOwners);
  document.getElementById('reload-owners').addEventListener('click', loadOwners);

  // --- Init ---
  loadOwners();
})();
</script>
`;
}
