export function renderMedicalRecords(): string {
  return `
<div class="card">
  <h2>Prontuário Médico</h2>
  <div class="form">
    <div class="grid">
      <div>
        <label for="mr-encounter-search">ID do Atendimento</label>
        <input type="text" id="mr-encounter-search" placeholder="Informe o ID do atendimento" />
      </div>
      <div class="btn-row" style="align-items:flex-end">
        <button class="btn btn-primary" onclick="loadMedicalRecord()">Carregar</button>
      </div>
    </div>
  </div>
</div>

<div id="mr-content" class="hidden">
  <div class="tab-bar">
    <button class="tab active" onclick="switchMrTab('registro')">Registro</button>
    <button class="tab" onclick="switchMrTab('timeline')">Timeline</button>
    <button class="tab" onclick="switchMrTab('anexos')">Anexos</button>
  </div>

  <div id="mr-tab-registro">
    <div class="card">
      <h3>Detalhes do Prontuário</h3>
      <div id="mr-details"><p>Carregando...</p></div>
    </div>

    <div class="card">
      <h3>Entradas Clínicas</h3>
      <div id="mr-entries"><p>Carregando...</p></div>
    </div>

    <div class="card">
      <h3>Nova Entrada</h3>
      <div id="mr-new-entry-msg"></div>
      <div class="form">
        <div class="grid-2">
          <div>
            <label for="mr-entry-encounter-id">ID do Atendimento</label>
            <input type="text" id="mr-entry-encounter-id" />
          </div>
          <div>
            <label for="mr-entry-patient-id">ID do Paciente</label>
            <input type="text" id="mr-entry-patient-id" />
          </div>
        </div>
        <div class="grid-2">
          <div>
            <label for="mr-entry-type">Tipo</label>
            <select id="mr-entry-type">
              <option value="anamnesis">Anamnese</option>
              <option value="evolution">Evolução</option>
              <option value="prescription">Prescrição</option>
              <option value="conduct">Conduta</option>
            </select>
          </div>
          <div>
            <label for="mr-entry-title">Título</label>
            <input type="text" id="mr-entry-title" />
          </div>
        </div>
        <div>
          <label for="mr-entry-content">Conteúdo</label>
          <textarea id="mr-entry-content" rows="4"></textarea>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="submitNewEntry()">Salvar Entrada</button>
        </div>
      </div>
    </div>
  </div>

  <div id="mr-tab-timeline" class="hidden">
    <div class="card">
      <h3>Linha do Tempo</h3>
      <div id="mr-timeline"><p>Carregando...</p></div>
    </div>
  </div>

  <div id="mr-tab-anexos" class="hidden">
    <div class="card">
      <h3>Anexos</h3>
      <div id="mr-attachments"><p>Carregando...</p></div>
    </div>

    <div class="card">
      <h3>Novo Anexo</h3>
      <div id="mr-upload-msg"></div>
      <div class="form">
        <div class="grid-2">
          <div>
            <label for="mr-attach-link-type">Tipo de Vínculo</label>
            <select id="mr-attach-link-type">
              <option value="encounter">Atendimento</option>
            </select>
          </div>
          <div>
            <label for="mr-attach-link-id">ID Vinculado</label>
            <input type="text" id="mr-attach-link-id" />
          </div>
        </div>
        <div class="grid-2">
          <div>
            <label for="mr-attach-filename">Arquivo</label>
            <input type="text" id="mr-attach-filename" placeholder="nome_do_arquivo.pdf" />
          </div>
          <div>
            <label for="mr-attach-mime">MIME Type</label>
            <input type="text" id="mr-attach-mime" placeholder="application/pdf" />
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="uploadAttachment()">Enviar Anexo</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  let currentEncounterId = '';

  window.loadMedicalRecord = async function() {
    const encounterId = document.getElementById('mr-encounter-search').value.trim();
    if (!encounterId) {
      alert('Informe o ID do atendimento.');
      return;
    }
    currentEncounterId = encounterId;
    document.getElementById('mr-content').classList.remove('hidden');
    document.getElementById('mr-entry-encounter-id').value = encounterId;
    document.getElementById('mr-attach-link-id').value = encounterId;
    await Promise.all([
      loadRecordDetails(encounterId),
      loadEntries(encounterId),
      loadTimeline(encounterId),
      loadAttachments(encounterId)
    ]);
  };

  window.switchMrTab = function(tab) {
    document.querySelectorAll('.tab-bar .tab').forEach(function(btn) {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    document.getElementById('mr-tab-registro').classList.add('hidden');
    document.getElementById('mr-tab-timeline').classList.add('hidden');
    document.getElementById('mr-tab-anexos').classList.add('hidden');
    document.getElementById('mr-tab-' + tab).classList.remove('hidden');
  };

  async function loadRecordDetails(encounterId) {
    try {
      const record = await apiRequest('GET', '/medical-records?encounterId=' + encodeURIComponent(encounterId));
      if (!record) {
        document.getElementById('mr-details').innerHTML = '<p>Nenhum prontuário encontrado.</p>';
        return;
      }
      document.getElementById('mr-details').innerHTML =
        '<div class="grid-2">' +
          '<div><strong>ID:</strong> ' + escapeHtml(record.id || '-') + '</div>' +
          '<div><strong>Atendimento:</strong> ' + escapeHtml(record.encounterId || '-') + '</div>' +
          '<div><strong>Paciente:</strong> ' + escapeHtml(record.patientId || '-') + '</div>' +
          '<div><strong>Criado em:</strong> ' + escapeHtml(formatDate(record.createdAt)) + '</div>' +
        '</div>';
      if (record.patientId) {
        document.getElementById('mr-entry-patient-id').value = record.patientId;
      }
    } catch (err) {
      document.getElementById('mr-details').innerHTML = '<div class="alert-error">Erro ao carregar prontuário: ' + escapeHtml(err.message) + '</div>';
    }
  }

  async function loadEntries(encounterId) {
    try {
      const entries = await apiRequest('GET', '/medical-records/entries?encounterId=' + encodeURIComponent(encounterId));
      if (!entries || entries.length === 0) {
        document.getElementById('mr-entries').innerHTML = '<p>Nenhuma entrada clínica encontrada.</p>';
        return;
      }
      let html = '<table class="table"><thead><tr><th>Tipo</th><th>Título</th><th>Conteúdo</th><th>Criado em</th></tr></thead><tbody>';
      entries.forEach(function(entry) {
        html += '<tr>' +
          '<td><span class="badge">' + escapeHtml(entry.type || '-') + '</span></td>' +
          '<td>' + escapeHtml(entry.title || '-') + '</td>' +
          '<td>' + escapeHtml(entry.content || '-') + '</td>' +
          '<td>' + escapeHtml(formatDate(entry.createdAt)) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('mr-entries').innerHTML = html;
    } catch (err) {
      document.getElementById('mr-entries').innerHTML = '<div class="alert-error">Erro ao carregar entradas: ' + escapeHtml(err.message) + '</div>';
    }
  }

  window.submitNewEntry = async function() {
    const msgEl = document.getElementById('mr-new-entry-msg');
    const payload = {
      encounterId: document.getElementById('mr-entry-encounter-id').value.trim(),
      patientId: document.getElementById('mr-entry-patient-id').value.trim(),
      type: document.getElementById('mr-entry-type').value,
      title: document.getElementById('mr-entry-title').value.trim(),
      content: document.getElementById('mr-entry-content').value.trim()
    };
    if (!payload.encounterId || !payload.patientId || !payload.title || !payload.content) {
      msgEl.innerHTML = '<div class="alert-error">Preencha todos os campos obrigatórios.</div>';
      return;
    }
    try {
      await apiRequest('POST', '/medical-records/entries', payload);
      msgEl.innerHTML = '<div class="alert-success">Entrada criada com sucesso.</div>';
      document.getElementById('mr-entry-title').value = '';
      document.getElementById('mr-entry-content').value = '';
      await loadEntries(currentEncounterId);
    } catch (err) {
      msgEl.innerHTML = '<div class="alert-error">Erro ao criar entrada: ' + escapeHtml(err.message) + '</div>';
    }
  };

  async function loadTimeline(encounterId) {
    try {
      const events = await apiRequest('GET', '/medical-records/timeline?encounterId=' + encodeURIComponent(encounterId));
      if (!events || events.length === 0) {
        document.getElementById('mr-timeline').innerHTML = '<p>Nenhum evento encontrado.</p>';
        return;
      }
      let html = '<div class="timeline">';
      events.forEach(function(ev) {
        html += '<div class="timeline-item">' +
          '<div class="timeline-item-header"><strong>' + escapeHtml(formatDate(ev.timestamp)) + '</strong></div>' +
          '<div class="timeline-item-body">' +
            '<span class="badge">' + escapeHtml(ev.type || '-') + '</span> ' +
            escapeHtml(ev.details || '-') +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      document.getElementById('mr-timeline').innerHTML = html;
    } catch (err) {
      document.getElementById('mr-timeline').innerHTML = '<div class="alert-error">Erro ao carregar timeline: ' + escapeHtml(err.message) + '</div>';
    }
  }

  async function loadAttachments(encounterId) {
    try {
      const attachments = await apiRequest('GET', '/attachments?linkedEntityType=encounter&linkedEntityId=' + encodeURIComponent(encounterId));
      if (!attachments || attachments.length === 0) {
        document.getElementById('mr-attachments').innerHTML = '<p>Nenhum anexo encontrado.</p>';
        return;
      }
      let html = '<table class="table"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Criado em</th></tr></thead><tbody>';
      attachments.forEach(function(att) {
        html += '<tr>' +
          '<td>' + escapeHtml(att.filename || '-') + '</td>' +
          '<td>' + escapeHtml(att.mimeType || '-') + '</td>' +
          '<td>' + escapeHtml(formatDate(att.createdAt)) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('mr-attachments').innerHTML = html;
    } catch (err) {
      document.getElementById('mr-attachments').innerHTML = '<div class="alert-error">Erro ao carregar anexos: ' + escapeHtml(err.message) + '</div>';
    }
  }

  window.uploadAttachment = async function() {
    const msgEl = document.getElementById('mr-upload-msg');
    const payload = {
      linkedEntityType: document.getElementById('mr-attach-link-type').value,
      linkedEntityId: document.getElementById('mr-attach-link-id').value.trim(),
      filename: document.getElementById('mr-attach-filename').value.trim(),
      mimeType: document.getElementById('mr-attach-mime').value.trim()
    };
    if (!payload.linkedEntityId || !payload.filename) {
      msgEl.innerHTML = '<div class="alert-error">Preencha todos os campos obrigatórios.</div>';
      return;
    }
    try {
      await apiRequest('POST', '/attachments', payload);
      msgEl.innerHTML = '<div class="alert-success">Anexo enviado com sucesso.</div>';
      document.getElementById('mr-attach-filename').value = '';
      document.getElementById('mr-attach-mime').value = '';
      await loadAttachments(currentEncounterId);
    } catch (err) {
      msgEl.innerHTML = '<div class="alert-error">Erro ao enviar anexo: ' + escapeHtml(err.message) + '</div>';
    }
  };
})();
</script>
  `;
}
