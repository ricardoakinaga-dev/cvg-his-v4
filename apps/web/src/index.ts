import { createServer } from "node:http";

import { AUTH_STORAGE_KEYS, buildAuthorizationHeader } from "@cvg-his-v2/shared-auth-sdk";
import { loadWebConfig } from "@cvg-his-v2/shared-config";
import { createLogger } from "@cvg-his-v2/shared-logging";

const config = loadWebConfig(process.env);
const logger = createLogger(config.appName);

const server = createServer((_request, response) => {
  const authHeaderExample = buildAuthorizationHeader("phase-3-token");

  response.statusCode = 200;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CVG-HIS V2</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f6f2;
        --ink: #1f2a37;
        --accent: #1f6f78;
        --card: #ffffff;
        --line: #d6d3d1;
      }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #f7f6f2 0%, #eef4f4 100%);
        color: var(--ink);
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 24px 72px;
      }
      .hero {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 18px 60px rgba(31, 42, 55, 0.08);
      }
      h1 {
        margin: 0 0 16px;
        font-size: 2.5rem;
      }
      .pill {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(31, 111, 120, 0.12);
        color: var(--accent);
        font-size: 0.875rem;
      }
      dl {
        margin: 24px 0 0;
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 12px 16px;
      }
      dt {
        font-weight: 700;
      }
      code {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 2px 6px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 20px;
        margin-top: 28px;
      }
      .panel {
        margin-top: 24px;
        padding: 20px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.9);
      }
      .panel h2 {
        margin-top: 0;
      }
      form {
        display: grid;
        gap: 12px;
      }
      label {
        display: grid;
        gap: 6px;
        font-weight: 600;
      }
      input {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 12px 14px;
        font: inherit;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 11px 16px;
        background: var(--accent);
        color: white;
        font: inherit;
        cursor: pointer;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .hint {
        color: #475569;
        line-height: 1.5;
      }
      pre {
        overflow: auto;
        padding: 16px;
        border-radius: 16px;
        background: #0f172a;
        color: #dbeafe;
        font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="pill">Fase 8 - Administrativo Vinculado a Assistencia</span>
        <h1>CVG-HIS V2</h1>
        <p>Billing inicial, consumo assistencial e notificacoes operacionais integrados ao atendimento sem misturar dominio clinico com administrativo.</p>
        <dl>
          <dt>App</dt><dd>${config.appName}</dd>
          <dt>Environment</dt><dd>${config.environment}</dd>
          <dt>Host</dt><dd>${config.host}</dd>
          <dt>Port</dt><dd>${config.port}</dd>
          <dt>API Base URL</dt><dd>${config.apiBaseUrl}</dd>
          <dt>Auth SDK Example</dt><dd><code>${authHeaderExample ?? "not-configured"}</code></dd>
        </dl>
        <div class="grid">
          <form id="login-form" class="panel">
            <h2>Login</h2>
            <label>Usuario <input id="username" name="username" value="admin" autocomplete="username" /></label>
            <label>Senha <input id="password" name="password" type="password" value="admin123" autocomplete="current-password" /></label>
            <button type="submit">Entrar</button>
            <button type="button" id="logout">Sair</button>
          </form>
          <section class="panel">
            <h2>Exploracao</h2>
            <div class="actions">
              <button data-endpoint="/auth/session">Sessao</button>
              <button data-endpoint="/owners">Tutores</button>
              <button data-endpoint="/patients">Pacientes</button>
              <button data-endpoint="/owner-patient-links">Vinculos</button>
              <button data-endpoint="/appointments">Agenda</button>
              <button data-endpoint="/queue">Fila</button>
              <button data-endpoint="/encounters">Atendimentos</button>
              <button data-endpoint="/triage">Triagens</button>
              <button data-endpoint="/medical-records?encounterId=">Prontuario</button>
              <button data-endpoint="/inpatient">Internacoes</button>
              <button data-endpoint="/surgeries">Cirurgias</button>
              <button data-endpoint="/diagnostics/orders">Diagnosticos</button>
              <button data-endpoint="/billing">Billing</button>
              <button data-endpoint="/inventory/items">Estoque</button>
              <button data-endpoint="/notifications">Notificacoes</button>
              <button data-endpoint="/users">Usuarios</button>
              <button data-endpoint="/staff">Staff</button>
              <button data-endpoint="/access-control">Roles/Permissions</button>
              <button data-endpoint="/audit/events">Auditoria</button>
            </div>
            <p class="hint">As telas usam a sessao apenas para UX. O cadastro mestre continua protegido no backend por permissions e auditado por evento.</p>
          </section>
        </div>
        <div class="grid">
          <form id="owner-form" class="panel">
            <h2>Novo Tutor</h2>
            <label>Nome completo <input id="owner-full-name" value="Ana Pereira" /></label>
            <label>Documento <input id="owner-document-id" value="333.333.333-33" /></label>
            <label>Contato <input id="owner-contact" value="+55 21 99999-3333" /></label>
            <label>Observacoes <input id="owner-notes" value="Contato preferencial para cobranca." /></label>
            <button type="submit">Cadastrar tutor</button>
          </form>
          <form id="patient-form" class="panel">
            <h2>Novo Paciente</h2>
            <label>Nome <input id="patient-name" value="Thor" /></label>
            <label>Especie <input id="patient-species" value="canine" /></label>
            <label>Raca <input id="patient-breed" value="Labrador" /></label>
            <label>ID tutor principal <input id="patient-owner-id" value="owner_maria_silva" /></label>
            <button type="submit">Cadastrar paciente</button>
          </form>
        </div>
        <div class="grid">
          <form id="link-form" class="panel">
            <h2>Novo Vinculo</h2>
            <label>ID tutor <input id="link-owner-id" value="owner_joao_souza" /></label>
            <label>ID paciente <input id="link-patient-id" value="patient_luna" /></label>
            <label>Tipo
              <input id="link-type" value="secondary" />
            </label>
            <button type="submit">Criar vinculo</button>
          </form>
          <form id="search-form" class="panel">
            <h2>Pesquisa Cadastral</h2>
            <label>Busca <input id="search-query" value="Luna" /></label>
            <button type="submit">Pesquisar cadastro mestre</button>
          </form>
        </div>
        <div class="grid">
          <form id="appointment-form" class="panel">
            <h2>Novo Agendamento</h2>
            <label>ID paciente <input id="appointment-patient-id" value="patient_luna" /></label>
            <label>ID tutor <input id="appointment-owner-id" value="owner_maria_silva" /></label>
            <label>Data/hora <input id="appointment-at" value="2026-03-26T10:00:00.000Z" /></label>
            <label>Motivo <input id="appointment-reason" value="Consulta de retorno" /></label>
            <button type="submit">Criar agendamento</button>
          </form>
          <form id="queue-form" class="panel">
            <h2>Check-in na Fila</h2>
            <label>ID paciente <input id="queue-patient-id" value="patient_luna" /></label>
            <label>ID tutor <input id="queue-owner-id" value="owner_maria_silva" /></label>
            <label>ID agendamento <input id="queue-appointment-id" value="" placeholder="opcional" /></label>
            <label>Motivo <input id="queue-reason" value="Chegada para atendimento" /></label>
            <button type="submit">Fazer check-in</button>
          </form>
        </div>
        <div class="grid">
          <form id="encounter-form" class="panel">
            <h2>Abrir Atendimento</h2>
            <label>ID paciente <input id="encounter-patient-id" value="patient_luna" /></label>
            <label>ID tutor <input id="encounter-owner-id" value="owner_maria_silva" /></label>
            <label>ID fila <input id="encounter-queue-id" value="" placeholder="opcional" /></label>
            <label>Motivo <input id="encounter-reason" value="Atendimento ambulatorial" /></label>
            <button type="submit">Abrir encounter</button>
          </form>
          <form id="triage-form" class="panel">
            <h2>Triagem Inicial</h2>
            <label>ID encounter <input id="triage-encounter-id" value="" /></label>
            <label>ID paciente <input id="triage-patient-id" value="patient_luna" /></label>
            <label>Queixa principal <input id="triage-chief-complaint" value="Vomitos e letargia" /></label>
            <label>Alertas <input id="triage-alerts" value="desidratacao,prostracao" /></label>
            <button type="submit">Registrar triagem</button>
          </form>
        </div>
        <div class="grid">
          <form id="timeline-form" class="panel">
            <h2>Timeline</h2>
            <label>ID encounter <input id="timeline-encounter-id" value="" /></label>
            <button type="submit">Consultar timeline</button>
          </form>
        </div>
        <div class="grid">
          <form id="clinical-entry-form" class="panel">
            <h2>Entrada Clinica</h2>
            <label>ID encounter <input id="clinical-encounter-id" value="" /></label>
            <label>ID paciente <input id="clinical-patient-id" value="patient_luna" /></label>
            <label>Tipo <input id="clinical-entry-type" value="anamnesis" /></label>
            <label>Titulo <input id="clinical-entry-title" value="Anamnese inicial" /></label>
            <label>Conteudo <input id="clinical-entry-content" value="Tutor relata vomitos e inapetencia ha dois dias." /></label>
            <button type="submit">Registrar entrada</button>
          </form>
          <form id="attachment-form" class="panel">
            <h2>Anexo Clinico</h2>
            <label>Tipo de vinculo <input id="attachment-linked-type" value="encounter" /></label>
            <label>ID vinculado <input id="attachment-linked-id" value="" /></label>
            <label>Arquivo <input id="attachment-file-name" value="prescricao-inicial.pdf" /></label>
            <label>MIME <input id="attachment-mime" value="application/pdf" /></label>
            <button type="submit">Anexar arquivo</button>
          </form>
        </div>
        <div class="grid">
          <form id="clinical-timeline-form" class="panel">
            <h2>Timeline Clinica</h2>
            <label>ID encounter <input id="clinical-timeline-encounter-id" value="" /></label>
            <button type="submit">Consultar timeline clinica</button>
          </form>
        </div>
        <div class="grid">
          <form id="inpatient-form" class="panel">
            <h2>Admitir Internacao</h2>
            <label>ID encounter <input id="inpatient-encounter-id" value="" /></label>
            <label>ID paciente <input id="inpatient-patient-id" value="patient_luna" /></label>
            <label>Unidade <input id="inpatient-unit" value="Internacao Clinica" /></label>
            <label>Ala <input id="inpatient-ward" value="Ala A" /></label>
            <label>Leito <input id="inpatient-bed" value="A-12" /></label>
            <button type="submit">Admitir</button>
          </form>
          <form id="inpatient-progress-form" class="panel">
            <h2>Evolucao de Internacao</h2>
            <label>ID stay <input id="inpatient-stay-id" value="" /></label>
            <label>Nota <input id="inpatient-progress-note" value="Paciente estabilizado e monitorado em internacao." /></label>
            <button type="submit">Registrar evolucao</button>
          </form>
        </div>
        <div class="grid">
          <form id="surgery-form" class="panel">
            <h2>Solicitar Cirurgia</h2>
            <label>ID encounter <input id="surgery-encounter-id" value="" /></label>
            <label>ID paciente <input id="surgery-patient-id" value="patient_luna" /></label>
            <label>Procedimento <input id="surgery-procedure-name" value="Exploratoria abdominal" /></label>
            <label>Preparo <input id="surgery-prep-notes" value="Jejum confirmado e consentimento coletado." /></label>
            <button type="submit">Solicitar cirurgia</button>
          </form>
          <form id="surgery-status-form" class="panel">
            <h2>Status Cirurgico</h2>
            <label>ID cirurgia <input id="surgery-case-id" value="" /></label>
            <label>Status <input id="surgery-status" value="recovery" /></label>
            <label>Notas operatorias <input id="surgery-operative-notes" value="Procedimento concluido sem intercorrencias imediatas." /></label>
            <button type="submit">Atualizar status</button>
          </form>
        </div>
        <div class="grid">
          <form id="diagnostic-order-form" class="panel">
            <h2>Solicitar Exame</h2>
            <label>ID encounter <input id="diagnostic-encounter-id" value="" /></label>
            <label>ID paciente <input id="diagnostic-patient-id" value="patient_luna" /></label>
            <label>Tipo de exame <input id="diagnostic-exam-type" value="ultrasound" /></label>
            <label>Motivo <input id="diagnostic-reason" value="Suporte a decisao cirurgica e seguimento pos-operatorio." /></label>
            <button type="submit">Solicitar exame</button>
          </form>
          <form id="diagnostic-result-form" class="panel">
            <h2>Registrar Resultado</h2>
            <label>ID pedido <input id="diagnostic-order-id" value="" /></label>
            <label>Resumo <input id="diagnostic-result-summary" value="Sem evidencias de efusao abdominal, com alcas discretamente espessadas." /></label>
            <button type="submit">Registrar resultado</button>
          </form>
        </div>
        <div class="grid">
          <form id="billing-estimate-form" class="panel">
            <h2>Orcamento Basico</h2>
            <label>ID encounter <input id="billing-estimate-encounter-id" value="" /></label>
            <label>Notas administrativas <input id="billing-estimate-notes" value="Orcamento inicial emitido para tutor." /></label>
            <button type="submit">Emitir orcamento</button>
          </form>
          <form id="billing-item-form" class="panel">
            <h2>Item Cobrado</h2>
            <label>ID encounter <input id="billing-item-encounter-id" value="" /></label>
            <label>Tipo <input id="billing-item-type" value="exam" /></label>
            <label>Descricao <input id="billing-item-description" value="Ultrassonografia abdominal" /></label>
            <label>Quantidade <input id="billing-item-quantity" value="1" /></label>
            <label>Valor unitario <input id="billing-item-unit-price" value="180" /></label>
            <button type="submit">Adicionar item</button>
          </form>
        </div>
        <div class="grid">
          <form id="inventory-consumption-form" class="panel">
            <h2>Consumo Assistencial</h2>
            <label>ID encounter <input id="inventory-encounter-id" value="" /></label>
            <label>ID item estoque <input id="inventory-item-id" value="inv_gauze" /></label>
            <label>Quantidade <input id="inventory-quantity" value="2" /></label>
            <label>Origem <input id="inventory-source-type" value="encounter" /></label>
            <button type="submit">Registrar consumo</button>
          </form>
          <form id="notification-form" class="panel">
            <h2>Alerta Interno</h2>
            <label>Categoria <input id="notification-category" value="operations" /></label>
            <label>ID encounter <input id="notification-encounter-id" value="" /></label>
            <label>Titulo <input id="notification-title" value="Acompanhamento administrativo pendente" /></label>
            <label>Mensagem <input id="notification-message" value="Revisar billing e consumo vinculados ao atendimento." /></label>
            <button type="submit">Criar alerta</button>
            <button type="button" id="notification-process">Processar fila</button>
          </form>
        </div>
        <section class="panel">
          <h2>Status</h2>
          <pre id="output">Aguardando autenticacao.</pre>
        </section>
      </section>
    </main>
    <script>
      const apiBaseUrl = ${JSON.stringify(config.apiBaseUrl)};
      const storageKeys = ${JSON.stringify(AUTH_STORAGE_KEYS)};
      const output = document.getElementById("output");
      const loginForm = document.getElementById("login-form");
      const ownerForm = document.getElementById("owner-form");
      const patientForm = document.getElementById("patient-form");
      const linkForm = document.getElementById("link-form");
      const searchForm = document.getElementById("search-form");
      const appointmentForm = document.getElementById("appointment-form");
      const queueForm = document.getElementById("queue-form");
      const encounterForm = document.getElementById("encounter-form");
      const triageForm = document.getElementById("triage-form");
      const timelineForm = document.getElementById("timeline-form");
      const clinicalEntryForm = document.getElementById("clinical-entry-form");
      const attachmentForm = document.getElementById("attachment-form");
      const clinicalTimelineForm = document.getElementById("clinical-timeline-form");
      const inpatientForm = document.getElementById("inpatient-form");
      const inpatientProgressForm = document.getElementById("inpatient-progress-form");
      const surgeryForm = document.getElementById("surgery-form");
      const surgeryStatusForm = document.getElementById("surgery-status-form");
      const diagnosticOrderForm = document.getElementById("diagnostic-order-form");
      const diagnosticResultForm = document.getElementById("diagnostic-result-form");
      const billingEstimateForm = document.getElementById("billing-estimate-form");
      const billingItemForm = document.getElementById("billing-item-form");
      const inventoryConsumptionForm = document.getElementById("inventory-consumption-form");
      const notificationForm = document.getElementById("notification-form");
      const notificationProcessButton = document.getElementById("notification-process");
      const logoutButton = document.getElementById("logout");
      const actionButtons = Array.from(document.querySelectorAll("[data-endpoint]"));

      function getAccessToken() {
        return localStorage.getItem(storageKeys.accessToken);
      }

      function getRefreshToken() {
        return localStorage.getItem(storageKeys.refreshToken);
      }

      function setTokens(accessToken, refreshToken) {
        localStorage.setItem(storageKeys.accessToken, accessToken);
        localStorage.setItem(storageKeys.refreshToken, refreshToken);
      }

      function clearTokens() {
        localStorage.removeItem(storageKeys.accessToken);
        localStorage.removeItem(storageKeys.refreshToken);
      }

      async function apiRequest(path, options = {}) {
        const headers = new Headers(options.headers || {});
        const accessToken = getAccessToken();
        if (accessToken) {
          headers.set("authorization", "Bearer " + accessToken);
        }
        if (!headers.has("content-type") && options.body) {
          headers.set("content-type", "application/json");
        }

        const response = await fetch(apiBaseUrl + path, {
          ...options,
          headers,
        });

        if (response.status === 204) {
          return { ok: true, status: 204, body: null };
        }

        const body = await response.json().catch(() => null);
        return { ok: response.ok, status: response.status, body };
      }

      async function renderSession() {
        const result = await apiRequest("/auth/session");
        output.textContent = JSON.stringify(result, null, 2);
      }

      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const result = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        if (result.ok && result.body) {
          setTokens(result.body.accessToken, result.body.refreshToken);
        }

        output.textContent = JSON.stringify(result, null, 2);
      });

      ownerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/owners", {
          method: "POST",
          body: JSON.stringify({
            fullName: document.getElementById("owner-full-name").value,
            documentId: document.getElementById("owner-document-id").value,
            contacts: [
              {
                label: "Contato principal",
                value: document.getElementById("owner-contact").value,
                type: "whatsapp",
                primary: true,
              },
            ],
            financialResponsible: true,
            administrativeNotes: document.getElementById("owner-notes").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      patientForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/patients", {
          method: "POST",
          body: JSON.stringify({
            name: document.getElementById("patient-name").value,
            species: document.getElementById("patient-species").value,
            breed: document.getElementById("patient-breed").value,
            sex: "male",
            size: "large",
            primaryOwnerId: document.getElementById("patient-owner-id").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      linkForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/owner-patient-links", {
          method: "POST",
          body: JSON.stringify({
            ownerId: document.getElementById("link-owner-id").value,
            patientId: document.getElementById("link-patient-id").value,
            relationshipType: document.getElementById("link-type").value,
            financialResponsible: false,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const query = encodeURIComponent(document.getElementById("search-query").value);
        const result = await apiRequest("/master-search?q=" + query);
        output.textContent = JSON.stringify(result, null, 2);
      });

      appointmentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/appointments", {
          method: "POST",
          body: JSON.stringify({
            patientId: document.getElementById("appointment-patient-id").value,
            ownerId: document.getElementById("appointment-owner-id").value,
            scheduledAt: document.getElementById("appointment-at").value,
            visitType: "scheduled",
            reason: document.getElementById("appointment-reason").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      queueForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const appointmentId = document.getElementById("queue-appointment-id").value;
        const result = await apiRequest("/queue/check-in", {
          method: "POST",
          body: JSON.stringify({
            patientId: document.getElementById("queue-patient-id").value,
            ownerId: document.getElementById("queue-owner-id").value,
            appointmentId: appointmentId || undefined,
            reason: document.getElementById("queue-reason").value,
            priority: "medium",
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      encounterForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const queueEntryId = document.getElementById("encounter-queue-id").value;
        const result = await apiRequest("/encounters", {
          method: "POST",
          body: JSON.stringify({
            patientId: document.getElementById("encounter-patient-id").value,
            ownerId: document.getElementById("encounter-owner-id").value,
            queueEntryId: queueEntryId || undefined,
            visitType: "walk_in",
            origin: queueEntryId ? "reception" : "reception",
            reason: document.getElementById("encounter-reason").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      triageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const alerts = document.getElementById("triage-alerts").value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const result = await apiRequest("/triage", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("triage-encounter-id").value,
            patientId: document.getElementById("triage-patient-id").value,
            priority: "high",
            chiefComplaint: document.getElementById("triage-chief-complaint").value,
            initialNotes: "Coleta inicial realizada na recepcao.",
            alerts,
            destination: "observation",
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      timelineForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const encounterId = document.getElementById("timeline-encounter-id").value;
        const result = await apiRequest("/encounters/" + encodeURIComponent(encounterId) + "/timeline");
        output.textContent = JSON.stringify(result, null, 2);
      });

      clinicalEntryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/medical-records/entries", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("clinical-encounter-id").value,
            patientId: document.getElementById("clinical-patient-id").value,
            entryType: document.getElementById("clinical-entry-type").value,
            title: document.getElementById("clinical-entry-title").value,
            content: document.getElementById("clinical-entry-content").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      attachmentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/attachments", {
          method: "POST",
          body: JSON.stringify({
            linkedEntityType: document.getElementById("attachment-linked-type").value,
            linkedEntityId: document.getElementById("attachment-linked-id").value,
            category: "document",
            fileName: document.getElementById("attachment-file-name").value,
            mimeType: document.getElementById("attachment-mime").value,
            checksum: "sha256:web-upload-demo",
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      clinicalTimelineForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const encounterId = document.getElementById("clinical-timeline-encounter-id").value;
        const result = await apiRequest("/medical-records/timeline?encounterId=" + encodeURIComponent(encounterId));
        output.textContent = JSON.stringify(result, null, 2);
      });

      inpatientForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/inpatient", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("inpatient-encounter-id").value,
            patientId: document.getElementById("inpatient-patient-id").value,
            unit: document.getElementById("inpatient-unit").value,
            ward: document.getElementById("inpatient-ward").value,
            bed: document.getElementById("inpatient-bed").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      inpatientProgressForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/inpatient/progress", {
          method: "POST",
          body: JSON.stringify({
            stayId: document.getElementById("inpatient-stay-id").value,
            note: document.getElementById("inpatient-progress-note").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      surgeryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/surgeries", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("surgery-encounter-id").value,
            patientId: document.getElementById("surgery-patient-id").value,
            procedureName: document.getElementById("surgery-procedure-name").value,
            preparationNotes: document.getElementById("surgery-prep-notes").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      surgeryStatusForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const caseId = document.getElementById("surgery-case-id").value;
        const result = await apiRequest("/surgeries/" + encodeURIComponent(caseId) + "/status", {
          method: "POST",
          body: JSON.stringify({
            status: document.getElementById("surgery-status").value,
            operativeNotes: document.getElementById("surgery-operative-notes").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      diagnosticOrderForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/diagnostics/orders", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("diagnostic-encounter-id").value,
            patientId: document.getElementById("diagnostic-patient-id").value,
            examType: document.getElementById("diagnostic-exam-type").value,
            reason: document.getElementById("diagnostic-reason").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      diagnosticResultForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const orderId = document.getElementById("diagnostic-order-id").value;
        const result = await apiRequest("/diagnostics/orders/" + encodeURIComponent(orderId) + "/result", {
          method: "POST",
          body: JSON.stringify({
            status: "resulted",
            resultSummary: document.getElementById("diagnostic-result-summary").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      billingEstimateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const result = await apiRequest("/billing/estimate", {
          method: "POST",
          body: JSON.stringify({
            encounterId: document.getElementById("billing-estimate-encounter-id").value,
            administrativeNotes: document.getElementById("billing-estimate-notes").value,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      billingItemForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const encounterId = document.getElementById("billing-item-encounter-id").value;
        const result = await apiRequest("/billing/items", {
          method: "POST",
          body: JSON.stringify({
            encounterId,
            itemType: document.getElementById("billing-item-type").value,
            description: document.getElementById("billing-item-description").value,
            quantity: Number(document.getElementById("billing-item-quantity").value),
            unitPriceAmount: Number(document.getElementById("billing-item-unit-price").value),
            sourceEntityType: "encounter",
            sourceEntityId: encounterId,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      inventoryConsumptionForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const encounterId = document.getElementById("inventory-encounter-id").value;
        const result = await apiRequest("/inventory/consumptions", {
          method: "POST",
          body: JSON.stringify({
            encounterId,
            inventoryItemId: document.getElementById("inventory-item-id").value,
            quantity: Number(document.getElementById("inventory-quantity").value),
            sourceEntityType: document.getElementById("inventory-source-type").value,
            sourceEntityId: encounterId,
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      notificationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const encounterId = document.getElementById("notification-encounter-id").value;
        const result = await apiRequest("/notifications", {
          method: "POST",
          body: JSON.stringify({
            category: document.getElementById("notification-category").value,
            encounterId: encounterId || undefined,
            title: document.getElementById("notification-title").value,
            message: document.getElementById("notification-message").value,
            severity: "medium",
            recipientRoleCode: "finance",
          }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      notificationProcessButton.addEventListener("click", async () => {
        const result = await apiRequest("/notifications/process", {
          method: "POST",
          body: JSON.stringify({ limit: 10 }),
        });
        output.textContent = JSON.stringify(result, null, 2);
      });

      logoutButton.addEventListener("click", async () => {
        const refreshToken = getRefreshToken();
        const result = await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        });
        clearTokens();
        output.textContent = JSON.stringify(result, null, 2);
      });

      for (const button of actionButtons) {
        button.addEventListener("click", async () => {
          const endpoint = button.getAttribute("data-endpoint");
          const result = await apiRequest(endpoint);
          output.textContent = JSON.stringify(result, null, 2);
        });
      }

      if (getAccessToken()) {
        renderSession().catch((error) => {
          output.textContent = JSON.stringify({ ok: false, error: String(error) }, null, 2);
        });
      }
    </script>
  </body>
</html>`);
});

server.listen(config.port, config.host, () => {
  logger.info("web skeleton listening", {
    service: config.appName,
    host: config.host,
    port: config.port,
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl,
  });
});
