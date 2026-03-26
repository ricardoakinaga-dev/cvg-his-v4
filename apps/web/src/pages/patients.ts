export function renderPatients(): string {
  return `
    <div class="card">
      <h2>Gestão de Pacientes</h2>
      <div class="search-bar">
        <input type="text" id="patient-search" placeholder="Buscar pacientes..." />
        <button id="patient-search-btn" class="btn">Buscar</button>
        <button id="patient-new-btn" class="btn">Novo Paciente</button>
      </div>
      <div id="patient-alert"></div>
      <div id="patient-create-form" class="hidden">
        <div class="card">
          <h3>Novo Paciente</h3>
          <form id="patient-form" class="form">
            <div class="grid grid-2">
              <div>
                <label for="patient-nome">Nome</label>
                <input type="text" id="patient-nome" required />
              </div>
              <div>
                <label for="patient-especie">Espécie</label>
                <select id="patient-especie" required>
                  <option value="">Selecione...</option>
                  <option value="canine">Canino</option>
                  <option value="feline">Felino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label for="patient-raca">Raça</label>
                <input type="text" id="patient-raca" />
              </div>
              <div>
                <label for="patient-sexo">Sexo</label>
                <select id="patient-sexo" required>
                  <option value="">Selecione...</option>
                  <option value="male">Macho</option>
                  <option value="female">Fêmea</option>
                </select>
              </div>
              <div>
                <label for="patient-tutor-id">Tutor Principal ID</label>
                <input type="text" id="patient-tutor-id" />
              </div>
            </div>
            <div class="btn-row">
              <button type="submit" class="btn">Criar Paciente</button>
              <button type="button" id="patient-cancel-btn" class="btn">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
      <div id="patient-link-form" class="hidden">
        <div class="card">
          <h3>Vincular Tutor ao Paciente</h3>
          <form id="owner-patient-link-form" class="form">
            <div class="grid grid-2">
              <div>
                <label for="link-owner-id">Owner ID</label>
                <input type="text" id="link-owner-id" required />
              </div>
              <div>
                <label for="link-patient-id">Patient ID</label>
                <input type="text" id="link-patient-id" required />
              </div>
              <div>
                <label for="link-role">Papel</label>
                <input type="text" id="link-role" value="primary" />
              </div>
            </div>
            <div class="btn-row">
              <button type="submit" class="btn">Vincular</button>
              <button type="button" id="link-cancel-btn" class="btn">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
      <table class="table" id="patients-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Espécie</th>
            <th>Raça</th>
            <th>Tutor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="patients-tbody"></tbody>
      </table>
    </div>
    <script>
      (function() {
        function escapeHtml(str) {
          if (!str) return '';
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }

        function showAlert(msg, type) {
          var el = document.getElementById('patient-alert');
          el.className = type === 'error' ? 'alert-error' : 'alert-success';
          el.textContent = msg;
          setTimeout(function() { el.textContent = ''; el.className = ''; }, 4000);
        }

        async function loadPatients(query) {
          var url = '/patients';
          if (query) url += '?q=' + encodeURIComponent(query);
          try {
            var res = await apiRequest('GET', url);
            var patients = Array.isArray(res) ? res : (res.data || []);
            var tbody = document.getElementById('patients-tbody');
            if (!patients.length) {
              tbody.innerHTML = '<tr><td colspan="5">Nenhum paciente encontrado.</td></tr>';
              return;
            }
            tbody.innerHTML = patients.map(function(p) {
              var tutorName = p.tutor ? escapeHtml(p.tutor.name) : (p.tutorName ? escapeHtml(p.tutorName) : '-');
              var especieMap = { canine: 'Canino', feline: 'Felino', other: 'Outro' };
              var especieLabel = especieMap[p.especie] || escapeHtml(p.especie || '');
              return '<tr>' +
                '<td>' + escapeHtml(p.nome || p.name) + '</td>' +
                '<td><span class="badge">' + especieLabel + '</span></td>' +
                '<td>' + escapeHtml(p.raca || p.breed || '-') + '</td>' +
                '<td>' + tutorName + '</td>' +
                '<td>' +
                  '<button class="btn btn-link" onclick="document.getElementById(\\'link-patient-id\\').value=\\'' + p.id + '\\';document.getElementById(\\'patient-link-form\\').classList.remove(\\'hidden\\')">Vincular Tutor</button>' +
                '</td>' +
              '</tr>';
            }).join('');
          } catch (e) {
            showAlert('Erro ao carregar pacientes: ' + e.message, 'error');
          }
        }

        document.getElementById('patient-search-btn').addEventListener('click', function() {
          var q = document.getElementById('patient-search').value.trim();
          loadPatients(q);
        });

        document.getElementById('patient-search').addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var q = this.value.trim();
            loadPatients(q);
          }
        });

        document.getElementById('patient-new-btn').addEventListener('click', function() {
          document.getElementById('patient-create-form').classList.remove('hidden');
        });

        document.getElementById('patient-cancel-btn').addEventListener('click', function() {
          document.getElementById('patient-create-form').classList.add('hidden');
          document.getElementById('patient-form').reset();
        });

        document.getElementById('patient-form').addEventListener('submit', async function(e) {
          e.preventDefault();
          var body = {
            nome: document.getElementById('patient-nome').value.trim(),
            especie: document.getElementById('patient-especie').value,
            raca: document.getElementById('patient-raca').value.trim(),
            sexo: document.getElementById('patient-sexo').value
          };
          var tutorId = document.getElementById('patient-tutor-id').value.trim();
          if (tutorId) body.tutorId = tutorId;
          try {
            await apiRequest('POST', '/patients', body);
            showAlert('Paciente criado com sucesso!', 'success');
            document.getElementById('patient-create-form').classList.add('hidden');
            document.getElementById('patient-form').reset();
            loadPatients('');
          } catch (e) {
            showAlert('Erro ao criar paciente: ' + e.message, 'error');
          }
        });

        document.getElementById('link-cancel-btn').addEventListener('click', function() {
          document.getElementById('patient-link-form').classList.add('hidden');
          document.getElementById('owner-patient-link-form').reset();
        });

        document.getElementById('owner-patient-link-form').addEventListener('submit', async function(e) {
          e.preventDefault();
          var body = {
            ownerId: document.getElementById('link-owner-id').value.trim(),
            patientId: document.getElementById('link-patient-id').value.trim(),
            role: document.getElementById('link-role').value.trim() || 'primary'
          };
          try {
            await apiRequest('POST', '/owner-patient-links', body);
            showAlert('Vínculo criado com sucesso!', 'success');
            document.getElementById('patient-link-form').classList.add('hidden');
            document.getElementById('owner-patient-link-form').reset();
            loadPatients('');
          } catch (e) {
            showAlert('Erro ao vincular tutor: ' + e.message, 'error');
          }
        });

        loadPatients('');
      })();
    </script>
  `;
}
