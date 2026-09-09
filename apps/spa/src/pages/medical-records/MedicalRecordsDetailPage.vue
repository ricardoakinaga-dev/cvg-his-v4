<template>
  <div class="medical-records-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div class="page-loading__stack">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="record">
      <AppPageHeader
        title="Prontuário clínico"
        :subtitle="medicalRecordHeaderSubtitle"
        :breadcrumb-items="headerBreadcrumbItems"
        :context-items="headerContextItems"
        :next-steps="headerNextSteps"
        :primary-action="headerPrimaryAction"
        :secondary-actions="headerSecondaryActions"
      />

      <DsAlert v-if="entryFormError" variant="danger" dismissible @dismiss="entryFormError = ''">
        {{ entryFormError }}
      </DsAlert>
      <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
        {{ successMessage }}
      </DsAlert>
      <DsAlert
        v-if="clinicalSheetError"
        variant="danger"
        dismissible
        @dismiss="clinicalSheetError = ''"
      >
        {{ clinicalSheetError }}
      </DsAlert>
      <DsAlert v-if="contextWarnings.length" variant="info" dismissible>
        Algumas informações complementares não carregaram: {{ contextWarnings.join(', ') }}. A
        leitura clínica principal continua disponível.
      </DsAlert>
      <DsAlert v-if="!canWriteClinicalRecord" variant="info">
        {{ clinicalReadOnlyMessage }}
      </DsAlert>

      <section v-if="clinicalAlerts.length" class="clinical-alerts" aria-label="Alertas clínicos">
        <DsAlert
          v-for="alert in clinicalAlerts"
          :key="alert.title"
          :variant="alert.variant"
          dismissible
        >
          <strong>{{ alert.title }}</strong> - {{ alert.message }}
        </DsAlert>
      </section>

      <section class="clinical-record-layout" aria-label="Prontuário clínico estruturado">
        <div class="clinical-record-main">
          <nav class="clinical-step-tabs" aria-label="Etapas do prontuário">
            <button
              v-for="step in clinicalSteps"
              :key="step.key"
              type="button"
              :class="{ 'clinical-step-tab--active': activeClinicalStep === step.key }"
              :data-testid="`clinical-step-${step.key}`"
              @click="activeClinicalStep = step.key"
            >
              <span>{{ step.number }}</span>
              {{ step.label }}
            </button>
          </nav>

          <section class="clinical-section clinical-section--chief">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">1. Motivo do atendimento</span>
                <h2>Queixa principal</h2>
              </div>
              <DsButton
                variant="secondary"
                size="sm"
                tag="a"
                :to="`/encounters/${record.encounterId}`"
              >
                Editar atendimento
              </DsButton>
            </div>
            <p v-if="chiefComplaint" class="clinical-text clinical-text--lead">
              {{ chiefComplaint }}
            </p>
            <p v-else class="empty-clinical-state">Nenhuma queixa principal registrada.</p>
          </section>

          <section
            v-if="activeClinicalStep === 'anamnesis'"
            class="clinical-section"
            data-clinical-panel="anamnesis"
          >
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">2. Relato do tutor</span>
                <h2>Anamnese</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('anamnesis')"
                >Adicionar anamnese</DsButton
              >
            </div>
            <article v-if="latestEntry('anamnesis')" class="clinical-entry">
              <h3>{{ latestEntry('anamnesis')?.title }}</h3>
              <p>{{ latestEntry('anamnesis')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('anamnesis')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">
              Nenhuma anamnese registrada neste atendimento.
            </p>
          </section>

          <section
            v-if="activeClinicalStep === 'exam'"
            class="clinical-section"
            data-clinical-panel="exam"
          >
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">3. Achados objetivos</span>
                <h2>Exame físico</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('physical_exam')"
                >Registrar exame</DsButton
              >
            </div>
            <article v-if="latestEntry('physical_exam')" class="clinical-entry">
              <h3>{{ latestEntry('physical_exam')?.title }}</h3>
              <p>{{ latestEntry('physical_exam')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('physical_exam')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">
              Nenhum exame físico registrado neste atendimento.
            </p>
          </section>

          <section v-if="activeClinicalStep === 'exam'" class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">4. Sinais vitais</span>
                <h2>Parâmetros vitais</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('physical_exam')"
                >Registrar parâmetros</DsButton
              >
            </div>
            <div v-if="hasVitalContext" class="vitals-grid">
              <div v-for="item in vitalSigns" :key="item.label" class="vital-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small v-if="item.hint">{{ item.hint }}</small>
              </div>
            </div>
            <p v-else class="empty-clinical-state">
              Parâmetros vitais ainda não registrados neste atendimento.
            </p>
          </section>

          <section v-if="activeClinicalStep === 'assessment'" class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">5. Apoio diagnóstico</span>
                <h2>Exames solicitados / recomendados</h2>
              </div>
              <DsButton
                variant="secondary"
                size="sm"
                :disabled="!canWriteClinicalRecord"
                tag="a"
                :to="clinicalWorkflowPath('/diagnostics')"
              >
                Abrir exames
              </DsButton>
            </div>
            <div v-if="diagnosticEntries.length" class="clinical-list">
              <article
                v-for="entry in diagnosticEntries.slice(0, 4)"
                :key="entry.id"
                class="clinical-entry"
              >
                <h3>{{ entry.title }}</h3>
                <p>{{ entry.content || entryTypeLabel(entry.entryType) }}</p>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </article>
            </div>
            <p v-else class="empty-clinical-state">
              Nenhum exame solicitado ou recomendado neste atendimento.
            </p>
          </section>

          <section
            v-if="activeClinicalStep === 'assessment'"
            class="clinical-section"
            data-clinical-panel="assessment"
          >
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">6. Raciocínio clínico</span>
                <h2>Suspeita diagnóstica / avaliação clínica</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('assessment')"
                >Registrar avaliação</DsButton
              >
            </div>
            <article v-if="latestEntry('assessment')" class="clinical-entry">
              <h3>{{ latestEntry('assessment')?.title }}</h3>
              <p>{{ latestEntry('assessment')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('assessment')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">
              Nenhuma suspeita diagnóstica ou avaliação registrada.
            </p>
          </section>

          <section
            v-if="activeClinicalStep === 'plan'"
            class="clinical-section"
            data-clinical-panel="plan"
          >
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">7. Tratamento</span>
                <h2>Terapêutica / plano de tratamento</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('plan')"
                >Registrar plano</DsButton
              >
            </div>
            <article v-if="latestEntry('plan')" class="clinical-entry">
              <h3>{{ latestEntry('plan')?.title }}</h3>
              <p>{{ latestEntry('plan')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('plan')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">
              Nenhuma terapêutica ou plano de tratamento registrado.
            </p>
          </section>

          <section v-if="activeClinicalStep === 'plan'" class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">8. Medicações</span>
                <h2>Prescrição / receituário</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('prescription')"
                >Registrar prescrição</DsButton
              >
            </div>
            <div v-if="prescriptionEntries.length" class="clinical-list">
              <article
                v-for="entry in prescriptionEntries.slice(0, 3)"
                :key="entry.id"
                class="clinical-entry"
              >
                <h3>{{ entry.title }}</h3>
                <p>{{ entry.content }}</p>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </article>
            </div>
            <p v-else class="empty-clinical-state">
              Nenhuma prescrição registrada para este atendimento.
            </p>
          </section>

          <section v-if="activeClinicalStep === 'plan'" class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">9. Continuidade do cuidado</span>
                <h2>Conduta e próximos passos</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('conduct')"
                >Registrar conduta</DsButton
              >
            </div>
            <article v-if="latestEntry('conduct')" class="clinical-entry">
              <h3>{{ latestEntry('conduct')?.title }}</h3>
              <p>{{ latestEntry('conduct')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('conduct')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">
              Nenhum retorno, orientação ao tutor ou próximo passo registrado.
            </p>
          </section>

          <section v-if="activeClinicalStep === 'plan'" class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">10. Complementos</span>
                <h2>Observações</h2>
              </div>
              <DsButton variant="secondary" size="sm" :disabled="!canWriteClinicalRecord" @click="startEntry('progress_note')"
                >Registrar observação</DsButton
              >
            </div>
            <article v-if="latestEntry('progress_note')" class="clinical-entry">
              <h3>{{ latestEntry('progress_note')?.title }}</h3>
              <p>{{ latestEntry('progress_note')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('progress_note')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">Nenhuma observação complementar registrada.</p>
          </section>

          <section class="clinical-sheet" aria-label="Registrar informação clínica">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">Registro</span>
                <h2>Adicionar informações ao prontuário</h2>
              </div>
              <div class="section-heading__actions">
                <DsButton
                  variant="secondary"
                  :disabled="!canWriteClinicalRecord"
                  @click="clearClinicalSheet"
                >
                  Limpar
                </DsButton>
                <DsButton
                  variant="primary"
                  :loading="submittingClinicalSheet"
                  :disabled="!canWriteClinicalRecord || !hasClinicalSheetContent || submittingClinicalSheet"
                  @click="saveClinicalSheet"
                >
                  Salvar ficha de atendimento
                </DsButton>
              </div>
            </div>

            <p
              class="clinical-sheet__status"
              :class="`clinical-sheet__status--${clinicalSheetStatus.tone}`"
              data-testid="clinical-draft-state"
              role="status"
              aria-live="polite"
            >
              {{ clinicalSheetStatus.label }}
            </p>

            <div class="clinical-form-grid">
              <label
                v-for="section in visibleClinicalSheetSections"
                :key="section.key"
                class="clinical-field"
              >
                <span>{{ section.label }}</span>
                <small>{{ section.hint }}</small>
                <textarea
                  v-model="clinicalSheet[section.key]"
                  :placeholder="section.placeholder"
                  :data-testid="`clinical-${section.key}`"
                  :disabled="!canWriteClinicalRecord"
                  rows="5"
                ></textarea>
              </label>
            </div>
          </section>
        </div>

        <aside class="clinical-record-aside" aria-label="Resumo do paciente e tutor">
          <section class="patient-summary-card">
            <span class="patient-rail__avatar" aria-hidden="true">🐾</span>
            <div>
              <span class="patient-rail__eyebrow">Paciente</span>
              <strong>{{ displayPatientName }}</strong>
              <p>{{ patientClinicalSummary }}</p>
            </div>
          </section>

          <section class="clinical-side-card">
            <h2>Tutor</h2>
            <dl class="detail-list">
              <div>
                <dt>Nome</dt>
                <dd>{{ ownerName || 'Não informado' }}</dd>
              </div>
              <div>
                <dt>Contato</dt>
                <dd>{{ ownerPrimaryContact }}</dd>
              </div>
            </dl>
            <div class="rail-actions">
              <DsButton
                v-if="owner"
                size="sm"
                variant="secondary"
                tag="a"
                :to="`/owners/${owner.id}`"
              >
                Ver tutor
              </DsButton>
              <DsButton
                v-if="patient"
                size="sm"
                variant="secondary"
                tag="a"
                :to="`/patients/${patient.id}`"
              >
                Ver paciente
              </DsButton>
            </div>
          </section>

          <section class="clinical-side-card">
            <h2>Resumo</h2>
            <dl class="detail-list">
              <div>
                <dt>Status</dt>
                <dd>{{ record.status === 'open' ? 'Aberto' : 'Concluído' }}</dd>
              </div>
              <div>
                <dt>Entradas ativas</dt>
                <dd>{{ activeEntries.length }}</dd>
              </div>
              <div>
                <dt>Prescrições</dt>
                <dd>{{ prescriptionEntries.length }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </section>

      <section class="secondary-record-area" aria-label="Blocos secundários do prontuário">
        <details class="secondary-disclosure">
          <summary>Blocos operacionais e contexto complementar</summary>
          <section class="vetus-card-grid" aria-label="Blocos operacionais secundários">
            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Últimos Atendimentos</h3>
                <DsButton
                  size="sm"
                  variant="secondary"
                  tag="a"
                  :to="`/encounters/${record.encounterId}`"
                >
                  Ver Atendimento
                </DsButton>
              </div>
              <div v-if="encounter" class="record-list">
                <div class="record-list__item">
                  <div>
                    <strong>{{ encounter.reason }}</strong>
                    <p>{{ encounterStatusLabel(encounter.status) }}</p>
                  </div>
                  <span>{{ formatDateTime(encounter.openedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Dados do atendimento indisponíveis neste momento.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Anamneses</h3>
                <DsButton size="sm" variant="secondary" :disabled="!canWriteClinicalRecord" @click="startEntry('anamnesis')">
                  Incluir Nova Anamnese
                </DsButton>
              </div>
              <div v-if="anamnesisEntries.length" class="record-list">
                <div
                  v-for="entry in anamnesisEntries.slice(0, 3)"
                  :key="entry.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal ainda não possui anamneses registradas.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Vacinas e Vermífugos</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="newPatientAppointmentPath">
                  Incluir Nova Vacina/Vermífugo
                </DsButton>
              </div>
              <div v-if="preventiveEntries.length" class="record-list">
                <div
                  v-for="entry in preventiveEntries.slice(0, 3)"
                  :key="entry.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">
                Esse animal não possui vacinas ou vermífugos registrados neste prontuário.
              </p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Agenda</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="patientAppointmentsPath">
                  Ver Agenda
                </DsButton>
              </div>
              <dl class="detail-list">
                <div>
                  <dt>Atendimento</dt>
                  <dd>{{ encounter ? encounter.reason : 'Não carregado' }}</dd>
                </div>
                <div>
                  <dt>Entrada</dt>
                  <dd>{{ encounter ? formatDateTime(encounter.openedAt) : 'Não informada' }}</dd>
                </div>
                <div>
                  <dt>Paciente</dt>
                  <dd>{{ displayPatientName }}</dd>
                </div>
              </dl>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Exames</h3>
                <DsButton
                  size="sm"
                  variant="secondary"
                  tag="a"
                  :to="clinicalWorkflowPath('/diagnostics')"
                >
                  Ver mais Exames
                </DsButton>
              </div>
              <div v-if="diagnosticEntries.length" class="record-list">
                <div
                  v-for="entry in diagnosticEntries.slice(0, 3)"
                  :key="entry.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entryTypeLabel(entry.entryType) }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui exames registrados.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Internação</h3>
                <DsButton size="sm" variant="secondary" tag="a" to="/inpatient">
                  Ver Internações
                </DsButton>
              </div>
              <div v-if="inpatientEvents.length" class="record-list">
                <div
                  v-for="event in inpatientEvents.slice(0, 3)"
                  :key="event.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ timelineEventTypeLabel(event.eventType) }}</strong>
                    <p>{{ event.summary }}</p>
                  </div>
                  <span>{{ formatDateTime(event.occurredAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">
                Esse animal não possui internação vinculada a este prontuário.
              </p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Receituário</h3>
                <DsButton size="sm" variant="secondary" :disabled="!canWriteClinicalRecord" @click="startEntry('prescription')">
                  Incluir Nova Receita
                </DsButton>
              </div>
              <div v-if="prescriptionEntries.length" class="record-list">
                <div
                  v-for="entry in prescriptionEntries.slice(0, 3)"
                  :key="entry.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui receitas registradas.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Gráfico de peso</h3>
                <DsButton
                  size="sm"
                  variant="secondary"
                  tag="a"
                  :to="`/patients/${record.patientId}/edit`"
                >
                  Atualizar peso
                </DsButton>
              </div>
              <div class="weight-card">
                <div class="weight-card__chart" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <dl class="detail-list">
                  <div>
                    <dt>Peso atual</dt>
                    <dd>{{ currentWeightLabel }}</dd>
                  </div>
                  <div>
                    <dt>Origem</dt>
                    <dd>{{ patient?.baseWeightKg ? 'Cadastro do animal' : 'Não informado' }}</dd>
                  </div>
                </dl>
              </div>
            </article>

            <article class="vetus-card" data-testid="clinical-attachments">
              <div class="vetus-card__header">
                <h3>Imagens e anexos</h3>
                <DsButton
                  size="sm"
                  variant="secondary"
                  tag="a"
                  :to="clinicalWorkflowPath('/diagnostics')"
                >
                  Incluir Imagem
                </DsButton>
              </div>
              <div
                v-if="attachmentsLoading"
                class="muted"
                data-testid="clinical-attachments-loading"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                Carregando anexos do prontuário…
              </div>
              <div v-else>
                <div
                  v-if="attachmentsError"
                  class="clinical-inline-error"
                  data-testid="clinical-attachments-error"
                  role="alert"
                >
                  {{ attachmentsError }}
                </div>
                <div
                  v-if="attachments.length"
                  class="record-list attachment-list"
                  role="list"
                  aria-label="Anexos vinculados ao prontuário"
                >
                  <div
                    v-for="attachment in attachments"
                    :key="attachment.id"
                    class="record-list__item attachment-item"
                    role="listitem"
                    :data-testid="`clinical-attachment-${String(attachment.id)}`"
                  >
                    <div class="attachment-item__details">
                      <strong>{{ attachment.fileName }}</strong>
                      <p>Tipo: {{ attachment.mimeType }}</p>
                      <p>Tamanho: {{ formatAttachmentSize(attachment.sizeBytes) }}</p>
                      <span class="attachment-item__category">
                        {{ attachmentCategoryLabel(attachment.category) }}
                      </span>
                    </div>
                    <div class="attachment-item__actions">
                      <DsButton
                        v-if="attachment.scanStatus === 'available'"
                        size="sm"
                        variant="secondary"
                        :loading="attachmentOpeningId === String(attachment.id)"
                        :disabled="Boolean(attachmentOpeningId)"
                        :aria-label="`Abrir ou baixar ${attachment.fileName}`"
                        :data-testid="`clinical-attachment-open-${String(attachment.id)}`"
                        @click="openAttachment(attachment)"
                      >
                        {{
                          attachmentOpeningId === String(attachment.id)
                            ? 'Preparando…'
                            : 'Abrir / baixar'
                        }}
                      </DsButton>
                      <span v-else class="attachment-item__availability" role="status">
                        {{ attachmentAvailabilityLabel(attachment.scanStatus) }}
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  v-else-if="!attachmentsError"
                  class="muted"
                  data-testid="clinical-attachments-empty"
                >
                  Nenhum anexo vinculado a este prontuário ou atendimento.
                </p>
                <p v-else class="muted" data-testid="clinical-attachments-unconfirmed">
                  A existência de anexos não pôde ser confirmada porque a leitura falhou.
                </p>
                <p
                  v-if="attachmentActionError"
                  class="clinical-inline-error"
                  data-testid="clinical-attachment-action-error"
                  role="alert"
                >
                  {{ attachmentActionError }}
                </p>
              </div>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Cobrança</h3>
                <div class="vetus-card__actions">
                  <DsButton
                    size="sm"
                    variant="secondary"
                    tag="a"
                    :to="`/billing/${record.encounterId}`"
                  >
                    Abrir Cobrança
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="primary"
                    tag="a"
                    :to="clinicalWorkflowPath('/counter-sales')"
                  >
                    Abrir Comanda
                  </DsButton>
                </div>
              </div>
              <dl class="detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    {{ billingRecord ? billingStatusLabel(billingRecord.status) : 'Não aberta' }}
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>
                    {{
                      formatCurrency(
                        billingRecord?.subtotalAmount ?? 0,
                        billingRecord?.currency ?? 'BRL'
                      )
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Últimos lançamentos</dt>
                  <dd>{{ billingItems.length }}</dd>
                </div>
              </dl>
              <div v-if="billingItems.length" class="record-list record-list--compact">
                <div
                  v-for="item in billingItems.slice(0, 3)"
                  :key="item.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ item.description }}</strong>
                    <p>
                      {{ item.quantity }} x
                      {{ formatCurrency(item.unitPriceAmount, billingRecord?.currency ?? 'BRL') }}
                    </p>
                  </div>
                  <span>{{
                    formatCurrency(item.totalAmount, billingRecord?.currency ?? 'BRL')
                  }}</span>
                </div>
              </div>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Histórico Clinico</h3>
                <DsButton size="sm" variant="secondary" :disabled="!canWriteClinicalRecord" @click="startEntry('progress_note')">
                  Nova Evolução
                </DsButton>
              </div>
              <div v-if="activeEntries.length" class="record-list">
                <div
                  v-for="entry in activeEntries.slice(0, 5)"
                  :key="entry.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entryTypeLabel(entry.entryType) }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">
                Escreva aqui o histórico clínico do animal usando a ficha de atendimento.
              </p>
            </article>
          </section>
        </details>

        <details class="secondary-disclosure">
          <summary>Entradas clínicas brutas e auditoria</summary>
          <section class="clinical-history-grid">
            <AppDetailSection title="Entradas Clínicas">
              <div v-if="entries.length === 0" class="muted">
                Nenhuma entrada clínica registrada ainda. Use a ficha estruturada acima para
                documentar anamnese, exame físico, avaliação, plano e conduta.
              </div>

              <div v-else class="entries-list">
                <div
                  v-for="entry in activeEntries"
                  :key="entry.id"
                  class="entry-card"
                  :class="{ 'entry-card--archived': entry.deletedAt }"
                >
                  <div class="entry-card__header">
                    <span class="entry-card__type">{{ entryTypeLabel(entry.entryType) }}</span>
                    <span class="entry-card__version">v{{ entry.version }}</span>
                    <span class="entry-card__date">{{ formatDateTime(entry.createdAt) }}</span>
                  </div>
                  <h3 class="entry-card__title">{{ entry.title }}</h3>
                  <p class="entry-card__content">{{ entry.content }}</p>
                  <div class="entry-card__footer">
                    <span class="muted"
                      >Autor técnico: {{ entry.authoredByUserId.slice(0, 8) }}...</span
                    >
                    <div class="entry-card__actions">
                      <DsButton
                        v-if="canWriteClinicalRecord && !entry.deletedAt"
                        size="sm"
                        variant="secondary"
                        @click="openEditEntry(entry)"
                      >
                        Editar
                      </DsButton>
                      <DsButton
                        v-if="canWriteClinicalRecord && !entry.deletedAt"
                        size="sm"
                        variant="danger"
                        @click="openArchiveEntry(entry)"
                      >
                        Arquivar
                      </DsButton>
                    </div>
                  </div>
                  <div v-if="entry.deletedAt" class="entry-card__archived">
                    Arquivado em {{ formatDate(entry.deletedAt) }}
                    <span v-if="entry.deleteReason"> - Motivo: {{ entry.deleteReason }}</span>
                  </div>
                </div>
              </div>
            </AppDetailSection>
          </section>
        </details>

        <details class="secondary-disclosure">
          <summary>Timeline técnica e IDs</summary>
          <section class="clinical-history-grid">
            <AppDetailSection title="Timeline Clínica">
              <div v-if="timelineLoading" class="muted">Carregando timeline...</div>
              <div v-else-if="timeline.length === 0" class="muted">
                Nenhum evento registrado ainda neste prontuário.
              </div>
              <div v-else class="timeline-list">
                <div v-for="event in timeline" :key="event.id" class="timeline-event">
                  <span class="timeline-event__type">{{
                    timelineEventTypeLabel(event.eventType)
                  }}</span>
                  <span class="timeline-event__summary">{{ event.summary }}</span>
                  <span class="timeline-event__time">{{ formatDateTime(event.occurredAt) }}</span>
                </div>
              </div>
            </AppDetailSection>

            <AppDetailSection title="Detalhes técnicos">
              <dl class="detail-list">
                <div>
                  <dt>Prontuário</dt>
                  <dd>{{ record.id }}</dd>
                </div>
                <div>
                  <dt>Atendimento</dt>
                  <dd>{{ record.encounterId }}</dd>
                </div>
                <div>
                  <dt>Paciente</dt>
                  <dd>{{ record.patientId }}</dd>
                </div>
                <div v-if="owner">
                  <dt>Tutor</dt>
                  <dd>{{ owner.id }}</dd>
                </div>
                <div>
                  <dt>Criado em</dt>
                  <dd>{{ formatDateTime(record.createdAt) }}</dd>
                </div>
              </dl>
            </AppDetailSection>
          </section>
        </details>
      </section>
    </template>

    <DsModal
      :open="showNewEntryModal || showEditEntryModal"
      :teleport="false"
      :title="entryModalTitle"
      size="lg"
      @close="closeEntryModal"
    >
      <DsAlert v-if="entryFormError" variant="danger">{{ entryFormError }}</DsAlert>
      <p v-if="entryForm.entryType === 'anamnesis'" class="entry-modal-hint">
        Use este espaço para o relato do tutor: início dos sinais, apetite, vômitos, diarreia,
        comportamento, medicações em uso e evolução percebida.
      </p>

      <DsInput
        id="entryType"
        v-model="entryForm.entryType"
        type="select"
        label="Tipo"
        :disabled="!canWriteClinicalRecord || submittingEntry"
        required
      >
        <option value="anamnesis">Anamnese</option>
        <option value="physical_exam">Exame Físico</option>
        <option value="progress_note">Nota de Evolução</option>
        <option value="assessment">Avaliação</option>
        <option value="plan">Plano</option>
        <option value="prescription">Prescrição</option>
        <option value="conduct">Conduta</option>
      </DsInput>

      <DsInput
        id="entryTitle"
        v-model="entryForm.title"
        label="Título"
        placeholder="Título da entrada"
        :disabled="!canWriteClinicalRecord || submittingEntry"
        required
      />

      <DsInput
        id="entryContent"
        v-model="entryForm.content"
        type="textarea"
        label="Conteúdo"
        :placeholder="entryContentPlaceholder"
        :rows="entryForm.entryType === 'anamnesis' ? 10 : 8"
        :disabled="!canWriteClinicalRecord || submittingEntry"
        required
      />

      <DsInput
        v-if="editingEntry"
        id="editReason"
        v-model="editReason"
        label="Motivo da Edição"
        placeholder="Motivo da alteração..."
        :disabled="!canWriteClinicalRecord || submittingEntry"
      />

      <template #footer>
        <DsButton variant="secondary" @click="closeEntryModal">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :disabled="!canWriteClinicalRecord || !isEntryFormValid || submittingEntry"
          @click="handleSaveEntry"
        >
          {{ submittingEntry ? 'Salvando...' : 'Salvar' }}
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="showArchiveModal"
      :teleport="false"
      title="Arquivar Entrada"
      @close="showArchiveModal = false"
    >
      <DsInput
        id="archiveReason"
        v-model="archiveReason"
        type="textarea"
        label="Motivo"
        placeholder="Motivo do arquivamento..."
        :rows="3"
        :disabled="!canWriteClinicalRecord || archivingEntry"
        required
      />

      <template #footer>
        <DsButton variant="secondary" @click="showArchiveModal = false">Cancelar</DsButton>
        <DsButton
          variant="danger"
          :disabled="!canWriteClinicalRecord || !archiveReason.trim() || archivingEntry"
          @click="handleArchiveEntry"
        >
          {{ archivingEntry ? 'Arquivando...' : 'Arquivar' }}
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="leaveRequested"
      title="Alterações não salvas"
      size="sm"
      initial-focus="#medical-record-continue-editing"
      @close="resolveLeave(false)"
    >
      <p>
        Há um rascunho clínico local neste atendimento. Continue editando para salvar ou descarte o
        rascunho para sair sem registrá-lo.
      </p>
      <template #footer>
        <DsButton variant="secondary" @click="resolveLeave(true)">Descartar e sair</DsButton>
        <DsButton
          id="medical-record-continue-editing"
          variant="primary"
          @click="resolveLeave(false)"
        >
          Continuar editando
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { attachmentService } from '@/services/attachments';
import { apiRequest } from '@/services/api';
import { billingService } from '@/services/billing';
import { spaRuntimeConfig } from '@/config/runtime';
import { diagnosticsService } from '@/services/diagnostics';
import { encounterService } from '@/services/encounter';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { prescriptionsService } from '@/services/prescriptions';
import type { BillingItemSummary, BillingRecordSummary, BillingStatus } from '@/types/billing';
import type { EncounterSummary } from '@/types/encounter';
import type {
  ArchiveClinicalEntryRequest,
  ClinicalEntrySummary,
  ClinicalEntryType,
  ClinicalTimelineEventSummary,
  CreateClinicalEntryRequest,
  MedicalRecordSummary,
  UpdateClinicalEntryRequest
} from '@/types/medicalRecords';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSex, PatientSummary } from '@/types/patient';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';
import { useEntityCache } from '@/composables/useEntityCache';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges';
import {
  encounterStatusLabel,
  formatDateTime as formatEncounterDateTime,
  formatOwnerContact
} from '@/utils/labels';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

type ClinicalSheetKey =
  | 'anamnesis'
  | 'physicalExam'
  | 'assessment'
  | 'plan'
  | 'prescription'
  | 'conduct';

interface ClinicalSheetSection {
  key: ClinicalSheetKey;
  entryType: ClinicalEntryType;
  label: string;
  title: string;
  hint: string;
  placeholder: string;
}

interface ClinicalAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

interface AttachmentDownloadUrlResponse {
  readonly url?: unknown;
  readonly expiresAt?: unknown;
}

const route = useRoute();
const routeRecordId = computed(() => String(route.params.id ?? ''));
const entityCache = useEntityCache();

const record = ref<MedicalRecordSummary | null>(null);
const entries = ref<ClinicalEntrySummary[]>([]);
const timeline = ref<ClinicalTimelineEventSummary[]>([]);
const encounter = ref<EncounterSummary | null>(null);
const patient = ref<PatientSummary | null>(null);
const owner = ref<OwnerSummary | null>(null);
const billingRecord = ref<BillingRecordSummary | null>(null);
const billingItems = ref<BillingItemSummary[]>([]);
const patientPrescriptions = ref<ClinicalEntrySummary[]>([]);
const diagnosticEntries = ref<ClinicalEntrySummary[]>([]);
const attachments = ref<AttachmentSummary[]>([]);
const contextWarnings = ref<string[]>([]);
const resolvedEncounterId = ref('');
const loading = ref(true);
const timelineLoading = ref(false);
const attachmentsLoading = ref(false);
const error = ref('');
const attachmentsError = ref('');
const attachmentActionError = ref('');
const attachmentOpeningId = ref<string | null>(null);
const patientName = ref('');
const ownerName = ref('');
const successMessage = ref('');

const showNewEntryModal = ref(false);
const showEditEntryModal = ref(false);
const showArchiveModal = ref(false);
const submittingEntry = ref(false);
const submittingClinicalSheet = ref(false);
const archivingEntry = ref(false);
const entryFormError = ref('');
const clinicalSheetError = ref('');
const clinicalSheetSaveState = ref<'idle' | 'saved' | 'saving'>('idle');
const editingEntry = ref<ClinicalEntrySummary | null>(null);
const editReason = ref('');
const archiveReason = ref('');
const archiveTarget = ref<ClinicalEntrySummary | null>(null);
interface StableClinicalCreateAttempt {
  readonly payloadSignature: string;
  readonly idempotencyKey: string;
}

const clinicalSheetCreateAttempts = new Map<ClinicalSheetKey, StableClinicalCreateAttempt>();
const clinicalEntryUpdateAttempts = new Map<string, StableClinicalCreateAttempt>();
const clinicalEntryArchiveAttempts = new Map<string, StableClinicalCreateAttempt>();
let newEntryCreateAttempt: StableClinicalCreateAttempt | null = null;
let active = true;
let pageGeneration = 0;
let attachmentsLoadSequence = 0;

function isCurrentLoad(generation: number, id: string) {
  return active && generation === pageGeneration && routeRecordId.value === id;
}

function resetPageState() {
  attachmentsLoadSequence += 1;
  record.value = null;
  entries.value = [];
  timeline.value = [];
  encounter.value = null;
  patient.value = null;
  owner.value = null;
  billingRecord.value = null;
  billingItems.value = [];
  patientPrescriptions.value = [];
  diagnosticEntries.value = [];
  attachments.value = [];
  contextWarnings.value = [];
  resolvedEncounterId.value = '';
  error.value = '';
  attachmentsError.value = '';
  attachmentActionError.value = '';
  attachmentsLoading.value = false;
  attachmentOpeningId.value = null;
  patientName.value = '';
  ownerName.value = '';
  successMessage.value = '';
  entryFormError.value = '';
  clearClinicalSheet();
  showNewEntryModal.value = false;
  showEditEntryModal.value = false;
  showArchiveModal.value = false;
  archiveTarget.value = null;
  submittingEntry.value = false;
  submittingClinicalSheet.value = false;
  archivingEntry.value = false;
  newEntryCreateAttempt = null;
  clinicalEntryUpdateAttempts.clear();
  clinicalEntryArchiveAttempts.clear();
}

const entryForm = ref({
  entryType: 'progress_note' as ClinicalEntryType,
  title: '',
  content: ''
});

type ClinicalStepKey = 'anamnesis' | 'exam' | 'assessment' | 'plan';
const activeClinicalStep = ref<ClinicalStepKey>('anamnesis');
const clinicalSteps: ReadonlyArray<{ key: ClinicalStepKey; number: number; label: string }> = [
  { key: 'anamnesis', number: 1, label: 'Anamnese' },
  { key: 'exam', number: 2, label: 'Exame' },
  { key: 'assessment', number: 3, label: 'Avaliação' },
  { key: 'plan', number: 4, label: 'Plano' }
];

const clinicalSheet = reactive<Record<ClinicalSheetKey, string>>({
  anamnesis: '',
  physicalExam: '',
  assessment: '',
  plan: '',
  prescription: '',
  conduct: ''
});

const clinicalSheetSnapshot = () => JSON.stringify(clinicalSheet);
const {
  dirty: clinicalSheetDirty,
  leaveRequested,
  resolveLeave,
  markClean
} = useUnsavedChanges(clinicalSheetSnapshot);

const clinicalSheetSections: ClinicalSheetSection[] = [
  {
    key: 'anamnesis',
    entryType: 'anamnesis',
    label: 'Anamnese / relato do tutor',
    title: 'Anamnese',
    hint: 'História, sinais percebidos, evolução e contexto informado pelo tutor.',
    placeholder:
      'Ex.: início dos sinais, apetite, ingestão hídrica, vômitos, diarreia, comportamento, medicações em uso.'
  },
  {
    key: 'physicalExam',
    entryType: 'physical_exam',
    label: 'Exame físico',
    title: 'Exame físico',
    hint: 'Achados objetivos do atendimento.',
    placeholder:
      'Ex.: TPC, mucosas, hidratação, ausculta, palpação, temperatura, dor, pele, olhos, cavidade oral.'
  },
  {
    key: 'assessment',
    entryType: 'assessment',
    label: 'Suspeita diagnóstica / avaliação clínica',
    title: 'Suspeita diagnóstica / avaliação clínica',
    hint: 'Raciocínio diagnóstico, problemas ativos e exames necessários.',
    placeholder:
      'Ex.: principais suspeitas, diferenciais, gravidade, exames solicitados e justificativa.'
  },
  {
    key: 'plan',
    entryType: 'plan',
    label: 'Terapêutica / plano de tratamento',
    title: 'Terapêutica / plano de tratamento',
    hint: 'Conduta planejada para o caso.',
    placeholder:
      'Ex.: medicações, fluidoterapia, exames complementares, retorno, internação, orientações de monitoramento.'
  },
  {
    key: 'prescription',
    entryType: 'prescription',
    label: 'Prescrição / receituário',
    title: 'Prescrição / receituário',
    hint: 'Prescrições emitidas ou ajustadas no atendimento.',
    placeholder: 'Ex.: medicamento, dose, via, frequência, duração, observações e restrições.'
  },
  {
    key: 'conduct',
    entryType: 'conduct',
    label: 'Conduta e próximos passos',
    title: 'Conduta e próximos passos',
    hint: 'Fechamento clínico e comunicação ao tutor.',
    placeholder:
      'Ex.: orientações ao tutor, sinais de alerta, retorno recomendado, pendências e acompanhamento.'
  }
];

const visibleClinicalSheetSections = computed(() => {
  const keysByStep: Record<ClinicalStepKey, readonly ClinicalSheetKey[]> = {
    anamnesis: ['anamnesis'],
    exam: ['physicalExam'],
    assessment: ['assessment'],
    plan: ['plan', 'prescription', 'conduct']
  };
  const visibleKeys = keysByStep[activeClinicalStep.value];
  return clinicalSheetSections.filter((section) => visibleKeys.includes(section.key));
});

const activeEntries = computed(() =>
  sortMostRecentFirst(
    entries.value.filter((entry) => !entry.deletedAt),
    (entry) => entry.updatedAt || entry.createdAt
  )
);
const anamnesisEntries = computed(() =>
  activeEntries.value.filter((entry) => entry.entryType === 'anamnesis')
);
const preventiveEntries = computed(() =>
  activeEntries.value.filter(
    (entry) => hasPreventiveText(entry.title) || hasPreventiveText(entry.content)
  )
);
const inpatientEvents = computed(() =>
  timeline.value.filter((event) => event.eventType.startsWith('inpatient_'))
);
const prescriptionEntries = computed(() => {
  const ownEntries = activeEntries.value.filter((entry) => entry.entryType === 'prescription');
  const byId = new Map(
    [...ownEntries, ...patientPrescriptions.value].map((entry) => [entry.id, entry])
  );
  return sortMostRecentFirst(
    Array.from(byId.values()),
    (entry) => entry.updatedAt || entry.createdAt
  );
});

const latestEntriesByType = computed(() => {
  const grouped = new Map<ClinicalEntryType, ClinicalEntrySummary>();
  for (const entry of activeEntries.value) {
    if (!grouped.has(entry.entryType)) {
      grouped.set(entry.entryType, entry);
    }
  }
  return grouped;
});

const hasClinicalSheetContent = computed(() =>
  clinicalSheetSections.some((section) => clinicalSheet[section.key].trim().length > 0)
);

const clinicalSheetStatus = computed(() => {
  if (submittingClinicalSheet.value) {
    return { tone: 'saving', label: 'Salvando no prontuário…' } as const;
  }
  if (clinicalSheetError.value) {
    return { tone: 'error', label: 'Persistência não confirmada' } as const;
  }
  if (clinicalSheetDirty.value) {
    return { tone: 'draft', label: 'Rascunho local não salvo' } as const;
  }
  if (clinicalSheetSaveState.value === 'saved') {
    return { tone: 'saved', label: 'Salvo no prontuário' } as const;
  }
  return { tone: 'idle', label: 'Nenhuma alteração pendente' } as const;
});

const displayPatientName = computed(
  () => patientName.value || patient.value?.name || 'Paciente não identificado'
);

const canWriteClinicalRecord = computed(
  () =>
    Boolean(
      record.value &&
        encounter.value &&
        record.value.status === 'open' &&
        encounter.value.status !== 'closed'
    )
);
const clinicalReadOnlyMessage = computed(() =>
  record.value && encounter.value
    ? 'Este prontuário está em somente leitura porque o atendimento foi concluído ou encerrado. Novas entradas, edições e arquivamentos não estão disponíveis.'
    : 'O contexto do atendimento não pôde ser confirmado. As ações clínicas permanecem bloqueadas até que os dados do atendimento estejam disponíveis.'
);

const medicalRecordHeaderSubtitle = computed(() => {
  const status = record.value?.status === 'open' ? 'Atendimento aberto' : 'Atendimento concluído';
  return `Cockpit clínico do atendimento · ${status} · ${displayPatientName.value}`;
});

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'medical-records', label: 'Prontuário', to: '/medical-records' },
  { key: 'record', label: displayPatientName.value, current: true }
]);

const headerContextItems = computed<PageContextItem[]>(() => [
  {
    key: 'encounter',
    label: 'Atendimento',
    value: encounter.value ? encounterStatusLabel(encounter.value.status) : 'Carregando',
    tone: encounter.value?.status === 'closed' ? 'success' : 'info'
  },
  {
    key: 'patient',
    label: 'Paciente',
    value: displayPatientName.value
  },
  {
    key: 'owner',
    label: 'Tutor',
    value: ownerName.value || 'Não informado'
  },
  {
    key: 'species',
    label: 'Espécie',
    value: patient.value?.species || 'Não informada'
  },
  {
    key: 'status',
    label: 'Prontuário',
    value: record.value?.status === 'open' ? 'Aberto' : 'Concluído',
    tone: record.value?.status === 'open' ? 'warning' : 'success'
  },
  {
    key: 'entries',
    label: 'Entradas',
    value: String(activeEntries.value.length)
  }
]);

const headerNextSteps = computed<PageNextStep[]>(() => {
  if (!record.value || !canWriteClinicalRecord.value) return [];
  if (!latestEntry('anamnesis')) {
    return [
      {
        key: 'anamnesis',
        label: 'Completar anamnese',
        description: 'Relato do tutor pendente'
      }
    ];
  }
  if (!latestEntry('physical_exam')) {
    return [
      {
        key: 'physical-exam',
        label: 'Registrar exame físico',
        description: 'Achados objetivos pendentes'
      }
    ];
  }
  return [
    {
      key: 'encounter-review',
      label: 'Revisar atendimento',
      description: ownerPrimaryContact.value,
      to: `/encounters/${record.value.encounterId}`
    }
  ];
});

const headerPrimaryAction = computed<PageAction>(() => ({
  key: 'new-clinical-entry',
  label: 'Registrar evolução',
  disabled: !canWriteClinicalRecord.value,
  onClick: () => {
    startEntry('progress_note');
  }
}));

const headerSecondaryActions = computed<PageAction[]>(() => {
  const actions: PageAction[] = [
    {
      key: 'back',
      label: 'Voltar',
      variant: 'secondary',
      to: '/medical-records'
    }
  ];
  if (record.value) {
    actions.unshift({
      key: 'encounter',
      label: 'Voltar ao atendimento',
      variant: 'secondary',
      to: `/encounters/${record.value.encounterId}`
    });
    actions.unshift({
      key: 'counter-sale',
      label: 'Comanda',
      variant: 'primary',
      to: clinicalWorkflowPath('/counter-sales')
    });
  }
  return actions;
});

const clinicalWorkflowQuery = computed(() => {
  if (!record.value) return '';
  const params = new URLSearchParams({
    encounterId: record.value.encounterId,
    patientId: record.value.patientId
  });
  const ownerId = owner.value?.id || encounter.value?.ownerId || patient.value?.primaryOwnerId;
  if (ownerId) {
    params.set('ownerId', ownerId);
  }
  return params.toString();
});

function clinicalWorkflowPath(path: string): string {
  const query = clinicalWorkflowQuery.value;
  return query ? `${path}?${query}` : path;
}

const patientClinicalSummary = computed(() => {
  if (!patient.value) return 'Espécie, raça, sexo, idade e peso não carregados';
  return [
    patient.value.species || 'Espécie não informada',
    patient.value.breed || 'Raça não informada',
    sexLabel(patient.value.sex),
    patientAgeLabel.value,
    currentWeightLabel.value
  ].join(' · ');
});

const patientAgeLabel = computed(() => {
  if (!patient.value?.birthDateApproximate) return 'Idade não informada';
  const birthDate = new Date(patient.value.birthDateApproximate);
  if (Number.isNaN(birthDate.getTime())) return 'Idade não informada';
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    years -= 1;
  }
  return years > 0 ? `${years} ano(s)` : 'Menos de 1 ano';
});

const chiefComplaint = computed(() => encounter.value?.reason?.trim() || '');

const clinicalAlerts = computed<ClinicalAlert[]>(() => {
  const alerts: ClinicalAlert[] = [];
  if (patient.value?.allergy) {
    alerts.push({
      variant: 'danger',
      title: 'Alergia registrada',
      message: patient.value.allergy
    });
  }
  if (patient.value?.chronicDisease) {
    alerts.push({
      variant: 'warning',
      title: 'Doença crônica',
      message: patient.value.chronicDisease
    });
  }
  if (patient.value?.temperament) {
    alerts.push({
      variant: 'warning',
      title: 'Temperamento / manejo',
      message: patient.value.temperament
    });
  }
  if (!patient.value?.baseWeightKg) {
    alerts.push({
      variant: 'info',
      title: 'Peso não registrado',
      message: 'Atualize o peso antes de prescrever medicações dependentes de dose.'
    });
  }
  if (!latestEntry('physical_exam')) {
    alerts.push({
      variant: 'info',
      title: 'Exame físico pendente',
      message: 'Registre achados objetivos e parâmetros vitais quando aplicável.'
    });
  }
  return alerts;
});

const vitalSigns = computed(() => [
  { label: 'Temperatura', value: 'Não registrada', hint: '' },
  { label: 'Frequência cardíaca', value: 'Não registrada', hint: '' },
  { label: 'Frequência respiratória', value: 'Não registrada', hint: '' },
  {
    label: 'Peso',
    value: patient.value?.baseWeightKg ? currentWeightLabel.value : 'Não registrado',
    hint: patient.value?.baseWeightKg ? 'Peso do cadastro do paciente' : ''
  },
  { label: 'Mucosas', value: 'Não registradas', hint: '' },
  { label: 'TPC', value: 'Não registrado', hint: '' },
  { label: 'Hidratação', value: 'Não registrada', hint: '' },
  { label: 'Dor', value: 'Não registrada', hint: '' }
]);

const hasVitalContext = computed(() => Boolean(patient.value?.baseWeightKg));

const ownerPrimaryContact = computed(() => {
  const contacts = owner.value?.contacts ?? [];
  const primary = contacts.find((contact) => contact.primary) ?? contacts[0];
  return primary ? formatOwnerContact(primary) : 'Não informado';
});

const currentWeightLabel = computed(() => {
  if (!patient.value?.baseWeightKg) return 'Não informado';
  return `${patient.value.baseWeightKg.toLocaleString('pt-BR')} kg`;
});

const patientAppointmentsPath = computed(() => {
  if (!record.value) return '/appointments';
  return `/appointments?patientId=${record.value.patientId}`;
});

const newPatientAppointmentPath = computed(() => {
  if (!record.value) return '/appointments/new';
  const params = new URLSearchParams({ patientId: record.value.patientId });
  if (patient.value?.primaryOwnerId) params.set('ownerId', patient.value.primaryOwnerId);
  return `/appointments/new?${params.toString()}`;
});

const isEntryFormValid = computed(
  () => entryForm.value.title.trim() && entryForm.value.content.trim()
);

const entryModalTitle = computed(() => {
  if (editingEntry.value) {
    return `Editar ${entryTypeLabel(editingEntry.value.entryType)}`;
  }
  return entryForm.value.entryType === 'anamnesis' ? 'Nova Anamnese' : 'Nova Entrada Clínica';
});

const entryContentPlaceholder = computed(() =>
  entryForm.value.entryType === 'anamnesis'
    ? 'Relato do tutor: início dos sinais, apetite, ingestão hídrica, vômitos, diarreia, comportamento, medicações em uso e evolução percebida.'
    : 'Conteúdo clínico...'
);

const entryTypeMap: Record<ClinicalEntryType, string> = {
  anamnesis: 'Anamnese',
  physical_exam: 'Exame Físico',
  progress_note: 'Observação clínica',
  assessment: 'Suspeita diagnóstica / avaliação clínica',
  plan: 'Terapêutica / plano de tratamento',
  prescription: 'Prescrição / receituário',
  conduct: 'Conduta e próximos passos'
};

const timelineEventTypeMap: Record<string, string> = {
  record_created: 'Prontuário criado',
  entry_added: 'Entrada adicionada',
  entry_updated: 'Entrada atualizada',
  entry_archived: 'Entrada arquivada',
  attachment_added: 'Anexo adicionado',
  inpatient_admitted: 'Internação iniciada',
  inpatient_progressed: 'Evolução de internação',
  diagnostic_requested: 'Exame solicitado',
  diagnostic_collected: 'Coleta registrada',
  diagnostic_resulted: 'Resultado liberado'
};

const attachmentCategoryMap: Record<AttachmentSummary['category'], string> = {
  image: 'Imagem',
  lab: 'Laudo',
  document: 'Documento',
  prescription: 'Prescrição',
  other: 'Outro'
};

const attachmentAvailabilityMap: Record<AttachmentSummary['scanStatus'], string> = {
  quarantined: 'Aguardando verificação de segurança',
  available: 'Disponível para abrir ou baixar',
  rejected: 'Indisponível após rejeição de segurança'
};

function entryTypeLabel(type: ClinicalEntryType) {
  return entryTypeMap[type] || type;
}

function latestEntry(type: ClinicalEntryType) {
  return latestEntriesByType.value.get(type);
}

function timelineEventTypeLabel(type: string) {
  return timelineEventTypeMap[type] || type;
}

function sortMostRecentFirst<T extends { id: string }>(
  items: readonly T[],
  getTimestamp: (item: T) => string
): T[] {
  return [...items].sort((left, right) => {
    const leftTimestamp = getTimestamp(left);
    const rightTimestamp = getTimestamp(right);
    const leftTime = Date.parse(leftTimestamp);
    const rightTime = Date.parse(rightTimestamp);

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    const timestampOrder = rightTimestamp.localeCompare(leftTimestamp);
    return timestampOrder !== 0 ? timestampOrder : left.id.localeCompare(right.id);
  });
}

function sortClinicalTimeline(events: readonly ClinicalTimelineEventSummary[]) {
  return sortMostRecentFirst(events, (event) => event.occurredAt);
}

function createIdempotencyKey(scope: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid
    ? `medical-records-${scope}-${uuid}`
    : `medical-records-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function payloadSignature(payload: CreateClinicalEntryRequest) {
  return JSON.stringify(payload);
}

function getClinicalSheetCreateKey(
  sectionKey: ClinicalSheetKey,
  payload: CreateClinicalEntryRequest
) {
  const signature = payloadSignature(payload);
  const existing = clinicalSheetCreateAttempts.get(sectionKey);
  if (existing?.payloadSignature === signature) return existing.idempotencyKey;

  const idempotencyKey = createIdempotencyKey(`sheet-${sectionKey}`);
  clinicalSheetCreateAttempts.set(sectionKey, { payloadSignature: signature, idempotencyKey });
  return idempotencyKey;
}

function getNewEntryCreateKey(payload: CreateClinicalEntryRequest) {
  const signature = payloadSignature(payload);
  if (newEntryCreateAttempt?.payloadSignature === signature) {
    return newEntryCreateAttempt.idempotencyKey;
  }

  const idempotencyKey = createIdempotencyKey('entry');
  newEntryCreateAttempt = { payloadSignature: signature, idempotencyKey };
  return idempotencyKey;
}

function getStableMutationKey(
  attempts: Map<string, StableClinicalCreateAttempt>,
  mutationId: string,
  scope: string,
  payload: object
) {
  const signature = JSON.stringify(payload);
  const existing = attempts.get(mutationId);
  if (existing?.payloadSignature === signature) return existing.idempotencyKey;

  const idempotencyKey = createIdempotencyKey(scope);
  attempts.set(mutationId, { payloadSignature: signature, idempotencyKey });
  return idempotencyKey;
}

function requireClinicalEntryResponse(value: unknown, operation: string): ClinicalEntrySummary {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { id?: unknown }).id !== 'string' ||
    !(value as { id: string }).id
  ) {
    throw new Error(`A API não confirmou o identificador da entrada clínica após ${operation}.`);
  }
  return value as ClinicalEntrySummary;
}

interface ClinicalEntryConfirmationExpectations {
  readonly id?: string;
  readonly encounterId?: string;
  readonly patientId?: string;
  readonly medicalRecordId?: string;
  readonly entryType?: ClinicalEntryType;
  readonly content?: string;
  readonly title?: string;
  readonly previousVersion?: number;
  readonly requireArchived?: boolean;
  readonly deleteReason?: string;
}

function isClinicalEntryConfirmed(
  entry: ClinicalEntrySummary,
  expected?: ClinicalEntryConfirmationExpectations,
  source: readonly ClinicalEntrySummary[] = entries.value
) {
  const expectedId = expected?.id ?? entry.id;
  if (entry.id !== expectedId) return false;
  const currentEntry = source.find((candidate) => candidate.id === expectedId);
  if (!currentEntry) return false;
  if (currentEntry.id !== entry.id) return false;
  if (expected?.encounterId !== undefined && currentEntry.encounterId !== expected.encounterId) {
    return false;
  }
  if (expected?.patientId !== undefined && currentEntry.patientId !== expected.patientId) {
    return false;
  }
  if (
    expected?.medicalRecordId !== undefined &&
    currentEntry.medicalRecordId !== expected.medicalRecordId
  ) {
    return false;
  }
  if (expected?.entryType !== undefined && currentEntry.entryType !== expected.entryType) {
    return false;
  }
  if (expected?.content !== undefined && currentEntry.content !== expected.content) return false;
  if (expected?.title !== undefined && currentEntry.title !== expected.title) return false;
  if (
    expected?.previousVersion !== undefined &&
    currentEntry.version <= expected.previousVersion
  ) {
    return false;
  }
  if (expected?.requireArchived === true && !currentEntry.deletedAt) return false;
  if (expected?.requireArchived === false && currentEntry.deletedAt) return false;
  if (expected?.deleteReason !== undefined && currentEntry.deleteReason !== expected.deleteReason) {
    return false;
  }
  return true;
}

function attachmentCategoryLabel(category: AttachmentSummary['category']) {
  return attachmentCategoryMap[category] || category;
}

function attachmentAvailabilityLabel(scanStatus: AttachmentSummary['scanStatus']) {
  return attachmentAvailabilityMap[scanStatus] || 'Anexo indisponível para abrir ou baixar';
}

function formatAttachmentSize(sizeBytes?: number) {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return 'Tamanho não informado';
  }

  if (sizeBytes < 1024) return `${sizeBytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function resolveAttachmentDownloadUrl(
  attachmentId: string,
  response: AttachmentDownloadUrlResponse
) {
  const rawUrl = response.url;
  const rawExpiresAt = response.expiresAt;
  const expectedPath = `/attachments/${encodeURIComponent(attachmentId)}/content`;

  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/')) {
    throw new Error('A API não confirmou uma URL válida para este anexo.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl, 'https://cvg-his.invalid');
  } catch {
    throw new Error('A API não confirmou uma URL válida para este anexo.');
  }

  const expiresAt = typeof rawExpiresAt === 'string' ? Date.parse(rawExpiresAt) : Number.NaN;
  if (
    parsedUrl.origin !== 'https://cvg-his.invalid' ||
    parsedUrl.pathname !== expectedPath ||
    !parsedUrl.searchParams.get('token') ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new Error('A API não confirmou uma URL válida e vigente para este anexo.');
  }

  return `${spaRuntimeConfig.apiBaseUrl}/api${rawUrl}`;
}

async function openAttachment(attachment: AttachmentSummary) {
  if (attachment.scanStatus !== 'available' || attachmentOpeningId.value) return;

  const attachmentId = String(attachment.id);
  const routeId = routeRecordId.value;
  const generation = pageGeneration;
  attachmentOpeningId.value = attachmentId;
  attachmentActionError.value = '';

  try {
    const response = await apiRequest<AttachmentDownloadUrlResponse>(
      `/attachments/${encodeURIComponent(attachmentId)}/download-url`,
      { method: 'POST' }
    );
    if (!isCurrentLoad(generation, routeId)) return;

    const downloadUrl = resolveAttachmentDownloadUrl(attachmentId, response);
    const openedWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    if (!openedWindow) {
      throw new Error(
        'O navegador bloqueou a abertura do anexo. Permita novas abas e tente novamente.'
      );
    }
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      attachmentActionError.value =
        err instanceof Error ? err.message : 'Não foi possível abrir ou baixar este anexo.';
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) attachmentOpeningId.value = null;
  }
}

function sexLabel(sex: PatientSex) {
  const labels: Record<PatientSex, string> = {
    male: 'Macho',
    female: 'Fêmea',
    unknown: 'Não informado'
  };
  return labels[sex] || sex;
}

function billingStatusLabel(status: BillingStatus) {
  const labels: Record<BillingStatus, string> = {
    draft: 'Rascunho',
    estimated: 'Orçada',
    open: 'Aberta',
    settled: 'Fechada'
  };
  return labels[status] || status;
}

function hasPreventiveText(value: string) {
  return /vacina|vacinacao|vacinal|vermif|verme/i.test(
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
}

function formatDateTime(date: string) {
  try {
    return formatEncounterDateTime(date);
  } catch {
    return date;
  }
}

function startEntry(entryType: ClinicalEntryType) {
  if (!canWriteClinicalRecord.value) return;
  const section = clinicalSheetSections.find((item) => item.entryType === entryType);
  entryForm.value = {
    entryType,
    title: section?.title ?? entryTypeLabel(entryType),
    content: ''
  };
  editingEntry.value = null;
  newEntryCreateAttempt = null;
  editReason.value = '';
  showNewEntryModal.value = true;
}

function focusClinicalAnamnesis() {
  const field = document.querySelector<HTMLTextAreaElement>('[data-testid="clinical-anamnesis"]');
  field?.focus();
}

function routeEntryType(): ClinicalEntryType | null {
  const value = route.query?.entry ?? route.query?.newEntry;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return Object.prototype.hasOwnProperty.call(entryTypeMap, raw)
    ? (raw as ClinicalEntryType)
    : null;
}

function openEditEntry(entry: ClinicalEntrySummary) {
  if (!canWriteClinicalRecord.value || entry.deletedAt) return;
  editingEntry.value = entry;
  newEntryCreateAttempt = null;
  entryForm.value = {
    entryType: entry.entryType,
    title: entry.title,
    content: entry.content
  };
  editReason.value = '';
  showEditEntryModal.value = true;
}

function openArchiveEntry(entry: ClinicalEntrySummary) {
  if (!canWriteClinicalRecord.value || entry.deletedAt) return;
  archiveTarget.value = entry;
  archiveReason.value = '';
  showArchiveModal.value = true;
}

function closeEntryModal() {
  showNewEntryModal.value = false;
  showEditEntryModal.value = false;
  editingEntry.value = null;
  newEntryCreateAttempt = null;
  entryForm.value = { entryType: 'progress_note', title: '', content: '' };
  entryFormError.value = '';
  editReason.value = '';
}

function clearClinicalSheet() {
  for (const section of clinicalSheetSections) {
    clinicalSheet[section.key] = '';
  }
  clinicalSheetError.value = '';
  clinicalSheetSaveState.value = 'idle';
  clinicalSheetCreateAttempts.clear();
}

async function loadRecord(id: string, generation: number, reportError = true): Promise<boolean> {
  try {
    const response = await loadRecordByRouteId(id);
    if (!isCurrentLoad(generation, id)) return false;
    if (response.record.id !== id && response.record.encounterId !== id) {
      throw new Error('O prontuário retornado não corresponde ao endereço solicitado.');
    }
    record.value = response.record;
    entries.value = response.entries;
    resolvedEncounterId.value = response.record.encounterId;
    patientName.value = await entityCache.getPatientName(response.record.patientId);
    if (!isCurrentLoad(generation, id)) return false;
    await loadClinicalContext(response.record, generation, id);
    return isCurrentLoad(generation, id);
  } catch (err: unknown) {
    if (reportError && isCurrentLoad(generation, id)) {
      error.value = getLoadRecordErrorMessage(err);
    }
    return false;
  }
}

function getLoadRecordErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return 'Erro ao carregar prontuário';
  }

  if (err.message === 'Unexpected error') {
    return 'Não foi possível carregar este prontuário. Tente voltar para a lista e abrir o atendimento novamente.';
  }

  return err.message;
}

async function loadRecordByRouteId(id: string) {
  try {
    return await medicalRecordsService.getByEncounter(id);
  } catch (err: unknown) {
    if (!(err instanceof Error) || err.message !== 'Unexpected error') {
      throw err;
    }

    const records = await medicalRecordsService.listAll();
    const matchedRecord = records.find(
      (item) => item.record.id === id || item.record.encounterId === id
    )?.record;

    if (!matchedRecord) {
      throw new Error('Prontuário não encontrado para este identificador.');
    }

    return {
      record: matchedRecord,
      entries: await medicalRecordsService.listEntries(matchedRecord.encounterId)
    };
  }
}

async function loadClinicalAttachments(
  currentRecord: MedicalRecordSummary,
  generation: number,
  routeId: string
) {
  if (!isCurrentLoad(generation, routeId)) return;

  const sequence = ++attachmentsLoadSequence;
  attachmentsLoading.value = true;
  attachmentsError.value = '';
  attachmentActionError.value = '';

  try {
    const [recordResult, encounterResult] = await Promise.allSettled([
      diagnosticsService.listAttachments(currentRecord.encounterId),
      attachmentService.list('encounter', currentRecord.encounterId)
    ]);
    if (!isCurrentLoad(generation, routeId) || sequence !== attachmentsLoadSequence) return;

    const byId = new Map<string, AttachmentSummary>();
    let failedSources = 0;

    const collect = (
      result: PromiseSettledResult<AttachmentSummary[]>,
      linkedEntityType: AttachmentSummary['linkedEntityType'],
      linkedEntityId: string
    ) => {
      if (result.status === 'rejected') {
        failedSources += 1;
        return;
      }

      for (const attachment of result.value) {
        if (
          attachment.linkedEntityType !== linkedEntityType ||
          attachment.linkedEntityId !== linkedEntityId
        ) {
          continue;
        }
        byId.set(String(attachment.id), attachment);
      }
    };

    collect(recordResult, 'medical_record', currentRecord.id);
    collect(encounterResult, 'encounter', currentRecord.encounterId);
    attachments.value = Array.from(byId.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    attachmentsError.value =
      failedSources === 0
        ? ''
        : attachments.value.length > 0
          ? 'Alguns anexos não puderam ser carregados. Os itens exibidos foram confirmados pelo prontuário.'
          : 'Não foi possível carregar os anexos deste prontuário ou atendimento.';
  } finally {
    if (isCurrentLoad(generation, routeId) && sequence === attachmentsLoadSequence) {
      attachmentsLoading.value = false;
    }
  }
}

async function loadClinicalContext(
  currentRecord: MedicalRecordSummary,
  generation: number,
  routeId: string
) {
  contextWarnings.value = [];
  const [
    encounterResult,
    patientResult,
    billingResult,
    billingItemsResult,
    diagnosticsResult,
    prescriptionsResult
  ] = await Promise.allSettled([
    encounterService.getById(currentRecord.encounterId),
    patientService.getById(currentRecord.patientId),
    billingService.getByEncounter(currentRecord.encounterId),
    billingService.listItems(currentRecord.encounterId),
    diagnosticsService.listByEncounter(currentRecord.encounterId),
    prescriptionsService.listByPatient(currentRecord.patientId)
  ]);
  if (!isCurrentLoad(generation, routeId)) return;

  if (encounterResult.status === 'fulfilled') {
    encounter.value = encounterResult.value;
    ownerName.value = await entityCache.getOwnerName(encounterResult.value.ownerId);
    if (!isCurrentLoad(generation, routeId)) return;
  } else {
    contextWarnings.value.push('atendimento');
  }

  if (patientResult.status === 'fulfilled') {
    patient.value = patientResult.value;
  } else {
    contextWarnings.value.push('paciente');
  }

  const ownerId = encounter.value?.ownerId ?? patient.value?.primaryOwnerId;
  if (ownerId) {
    try {
      owner.value = await ownerService.getById(ownerId);
      if (!isCurrentLoad(generation, routeId)) return;
      ownerName.value = owner.value.fullName;
    } catch {
      contextWarnings.value.push('cliente');
    }
  }

  if (billingResult.status === 'fulfilled') {
    billingRecord.value = billingResult.value;
  } else {
    billingRecord.value = null;
  }

  billingItems.value = billingItemsResult.status === 'fulfilled' ? billingItemsResult.value : [];
  diagnosticEntries.value = diagnosticsResult.status === 'fulfilled' ? diagnosticsResult.value : [];
  patientPrescriptions.value =
    prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [];
  void loadClinicalAttachments(currentRecord, generation, routeId);
}

async function loadTimeline(id: string, generation: number): Promise<boolean> {
  if (!isCurrentLoad(generation, id)) return false;
  timelineLoading.value = true;
  try {
    if (!resolvedEncounterId.value) {
      timeline.value = [];
      return true;
    }

    const nextTimeline = await medicalRecordsService.getTimeline(resolvedEncounterId.value);
    if (isCurrentLoad(generation, id)) timeline.value = sortClinicalTimeline(nextTimeline);
    return isCurrentLoad(generation, id);
  } catch {
    if (isCurrentLoad(generation, id)) {
      timeline.value = [];
      return false;
    }
    return false;
  } finally {
    if (isCurrentLoad(generation, id)) timelineLoading.value = false;
  }
}

async function refreshRecordAndTimeline(): Promise<boolean> {
  const id = routeRecordId.value;
  const generation = pageGeneration;
  if (!(await loadRecord(id, generation, false))) return false;
  return loadTimeline(id, generation);
}

async function saveClinicalSheet() {
  if (!canWriteClinicalRecord.value || !record.value || !hasClinicalSheetContent.value) return;
  const routeId = routeRecordId.value;
  const generation = pageGeneration;
  const currentRecord = record.value;
  const submittedSnapshot = clinicalSheetSnapshot();
  submittingClinicalSheet.value = true;
  clinicalSheetSaveState.value = 'saving';
  clinicalSheetError.value = '';
  entryFormError.value = '';
  successMessage.value = '';

  let persistedClinicalSectionCount = 0;
  const submittedClinicalEntries: Array<{
    response: ClinicalEntrySummary;
    payload: CreateClinicalEntryRequest;
  }> = [];
  try {
    const payloads = clinicalSheetSections
      .map((section) => ({
        section,
        content: clinicalSheet[section.key].trim()
      }))
      .filter((item) => item.content.length > 0);

    for (const item of payloads) {
      const payload: CreateClinicalEntryRequest = {
        encounterId: currentRecord.encounterId,
        patientId: currentRecord.patientId,
        entryType: item.section.entryType,
        title: item.section.title,
        content: item.content
      };
      const createdEntry = requireClinicalEntryResponse(
        await medicalRecordsService.createEntry(payload, {
          idempotencyKey: getClinicalSheetCreateKey(item.section.key, payload)
        }),
        'salvar a ficha de atendimento'
      );
      submittedClinicalEntries.push({ response: createdEntry, payload });
      persistedClinicalSectionCount += 1;
      if (!isCurrentLoad(generation, routeId)) return;
    }

    if (!isCurrentLoad(generation, routeId)) return;
    const refreshed = await refreshRecordAndTimeline();
    if (!isCurrentLoad(generation, routeId)) return;
    if (!refreshed) {
      clinicalSheetSaveState.value = 'idle';
      clinicalSheetError.value =
        'A ficha foi enviada, mas a confirmação no prontuário falhou. Preserve este rascunho e atualize a leitura antes de tentar registrar novamente.';
      return;
    }
    if (
      submittedClinicalEntries.some(
        ({ response, payload }) =>
          !isClinicalEntryConfirmed(response, {
            id: response.id,
            encounterId: payload.encounterId,
            patientId: payload.patientId,
            medicalRecordId: currentRecord.id,
            entryType: payload.entryType,
            title: payload.title,
            content: payload.content,
            requireArchived: false
          })
      )
    ) {
      clinicalSheetSaveState.value = 'idle';
      clinicalSheetError.value =
        'A ficha foi enviada, mas as entradas criadas não apareceram na releitura do prontuário. Preserve este rascunho e tente novamente após confirmar a disponibilidade da persistência.';
      return;
    }

    const hasNewerClinicalEdits = clinicalSheetSnapshot() !== submittedSnapshot;
    if (!hasNewerClinicalEdits) {
      clearClinicalSheet();
      markClean();
    } else {
      markClean(submittedSnapshot);
    }
    clinicalSheetSaveState.value = 'saved';
    clinicalSheetCreateAttempts.clear();
    successMessage.value = !hasNewerClinicalEdits
      ? 'Ficha de atendimento salva no prontuário.'
      : 'Ficha salva no prontuário. As alterações feitas durante o salvamento continuam como rascunho local.';
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      clinicalSheetSaveState.value = 'idle';
      const detail = err instanceof Error ? err.message : 'Erro ao salvar ficha de atendimento';
      clinicalSheetError.value =
        persistedClinicalSectionCount > 0
          ? `${persistedClinicalSectionCount} bloco(s) foram enviados, mas o restante falhou. Não repita o envio antes de atualizar o prontuário. ${detail}`
          : detail;
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) submittingClinicalSheet.value = false;
  }
}

async function handleSaveEntry() {
  if (!canWriteClinicalRecord.value || !record.value || !isEntryFormValid.value) return;
  const routeId = routeRecordId.value;
  const generation = pageGeneration;
  const currentRecord = record.value;
  const currentEditingEntry = editingEntry.value;
  submittingEntry.value = true;
  entryFormError.value = '';
  successMessage.value = '';

  try {
    if (currentEditingEntry) {
      const payload: UpdateClinicalEntryRequest = {
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim(),
        reason: editReason.value.trim() || undefined,
        expectedVersion: currentEditingEntry.version
      };
      const updatedEntry = requireClinicalEntryResponse(
        await medicalRecordsService.updateEntry(currentEditingEntry.id, payload, {
          idempotencyKey: getStableMutationKey(
            clinicalEntryUpdateAttempts,
            currentEditingEntry.id,
            `update-${currentEditingEntry.id}`,
            payload
          )
        }),
        'atualizar a entrada clínica'
      );
      if (updatedEntry.id !== currentEditingEntry.id) {
        entryFormError.value =
          'A API retornou outra entrada para a edição solicitada. O formulário foi preservado.';
        return;
      }
      if (!isCurrentLoad(generation, routeId)) return;
      const refreshed = await refreshRecordAndTimeline();
      if (!isCurrentLoad(generation, routeId)) return;
      if (
        !refreshed ||
        !isClinicalEntryConfirmed(updatedEntry, {
          id: currentEditingEntry.id,
          encounterId: currentRecord.encounterId,
          patientId: currentRecord.patientId,
          medicalRecordId: currentRecord.id,
          entryType: currentEditingEntry.entryType,
          content: payload.content,
          title: payload.title,
          previousVersion: currentEditingEntry.version,
          requireArchived: false
        })
      ) {
        entryFormError.value =
          'A entrada foi enviada, mas a confirmação na releitura do prontuário falhou. Preserve o formulário e atualize a leitura antes de tentar novamente.';
        return;
      }
      clinicalEntryUpdateAttempts.delete(currentEditingEntry.id);
      newEntryCreateAttempt = null;
      closeEntryModal();
      successMessage.value = 'Entrada clínica salva no prontuário.';
      return;
    } else {
      const payload: CreateClinicalEntryRequest = {
        encounterId: currentRecord.encounterId,
        patientId: currentRecord.patientId,
        entryType: entryForm.value.entryType,
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim()
      };
      const createdEntry = requireClinicalEntryResponse(
        await medicalRecordsService.createEntry(payload, {
          idempotencyKey: getNewEntryCreateKey(payload)
        }),
        'salvar a entrada clínica'
      );
      if (!isCurrentLoad(generation, routeId)) return;
      const refreshed = await refreshRecordAndTimeline();
      if (!isCurrentLoad(generation, routeId)) return;
      if (
        !refreshed ||
        !isClinicalEntryConfirmed(createdEntry, {
          id: createdEntry.id,
          encounterId: payload.encounterId,
          patientId: payload.patientId,
          medicalRecordId: currentRecord.id,
          entryType: payload.entryType,
          title: payload.title,
          content: payload.content,
          requireArchived: false
        })
      ) {
        entryFormError.value =
          'A entrada foi enviada, mas a confirmação na releitura do prontuário falhou. Preserve o formulário e atualize a leitura antes de tentar novamente.';
        return;
      }
      newEntryCreateAttempt = null;
      closeEntryModal();
      successMessage.value = 'Entrada clínica salva no prontuário.';
      return;
    }
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar entrada';
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) submittingEntry.value = false;
  }
}

async function handleArchiveEntry() {
  if (!canWriteClinicalRecord.value || !archiveTarget.value || !archiveReason.value.trim()) return;
  const routeId = routeRecordId.value;
  const generation = pageGeneration;
  const currentArchiveTarget = archiveTarget.value;
  const reason = archiveReason.value.trim();
  archivingEntry.value = true;
  entryFormError.value = '';

  try {
    const payload: ArchiveClinicalEntryRequest = {
      reason,
      expectedVersion: currentArchiveTarget.version
    };
    const archivedEntry = requireClinicalEntryResponse(
      await medicalRecordsService.archiveEntry(currentArchiveTarget.id, payload, {
      idempotencyKey: getStableMutationKey(
        clinicalEntryArchiveAttempts,
        currentArchiveTarget.id,
        `archive-${currentArchiveTarget.id}`,
        payload
      )
      }),
      'arquivar a entrada clínica'
    );
    if (
      archivedEntry.id !== currentArchiveTarget.id ||
      !archivedEntry.deletedAt ||
      archivedEntry.deleteReason !== reason
    ) {
      throw new Error(
        'O arquivamento foi enviado, mas a API não confirmou o identificador e o estado arquivado da entrada.'
      );
    }
    if (!isCurrentLoad(generation, routeId)) return;
    const refreshed = await refreshRecordAndTimeline();
    if (!isCurrentLoad(generation, routeId)) return;
    if (
      !refreshed ||
      entries.value.some((entry) => entry.id === currentArchiveTarget.id && !entry.deletedAt)
    ) {
      entryFormError.value =
        'O arquivamento foi enviado, mas a confirmação no prontuário falhou. Preserve este contexto e atualize a leitura antes de tentar novamente.';
      return;
    }
    const archivedEntries = await medicalRecordsService.listEntries(
      currentArchiveTarget.encounterId,
      { includeArchived: true }
    );
    if (!isCurrentLoad(generation, routeId)) return;
    if (
      !isClinicalEntryConfirmed(
        archivedEntry,
        {
          id: currentArchiveTarget.id,
          encounterId: currentArchiveTarget.encounterId,
          patientId: currentArchiveTarget.patientId,
          medicalRecordId: currentArchiveTarget.medicalRecordId,
          entryType: currentArchiveTarget.entryType,
          title: currentArchiveTarget.title,
          content: currentArchiveTarget.content,
          previousVersion: currentArchiveTarget.version,
          requireArchived: true,
          deleteReason: reason
        },
        archivedEntries
      )
    ) {
      entryFormError.value =
        'O arquivamento foi enviado, mas a leitura autoritativa não confirmou o estado arquivado. Preserve este contexto e atualize a leitura antes de tentar novamente.';
      return;
    }
    showArchiveModal.value = false;
    archiveTarget.value = null;
    archiveReason.value = '';
    clinicalEntryArchiveAttempts.delete(currentArchiveTarget.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      entryFormError.value = err instanceof Error ? err.message : 'Erro ao arquivar entrada';
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) archivingEntry.value = false;
  }
}

async function loadPage(id: string) {
  const generation = ++pageGeneration;
  resetPageState();
  markClean();
  loading.value = true;
  if (!id) {
    loading.value = false;
    return;
  }

  try {
    await loadRecord(id, generation);
    if (!isCurrentLoad(generation, id) || !record.value) return;
    await loadTimeline(id, generation);
    if (!isCurrentLoad(generation, id)) return;
    const requestedEntryType = routeEntryType();
    if (requestedEntryType) startEntry(requestedEntryType);
  } finally {
    if (isCurrentLoad(generation, id)) loading.value = false;
  }
}

watch(
  () => String(route.params.id ?? ''),
  (id) => {
    void loadPage(id);
  },
  { immediate: true, flush: 'sync' }
);

onBeforeUnmount(() => {
  active = false;
  pageGeneration += 1;
});
</script>

<style scoped>
.page-loading__stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.clinical-alerts {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.clinical-record-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 16px;
  align-items: start;
}

.clinical-record-main {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.clinical-step-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-surface, #ffffff);
}

.clinical-step-tabs button {
  min-height: 44px;
  border: 0;
  border-right: 1px solid var(--color-border, #cbd5e1);
  background: transparent;
  color: var(--color-text-secondary, #475569);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.clinical-step-tabs button:last-child {
  border-right: 0;
}

.clinical-step-tabs button span {
  margin-right: 6px;
  color: var(--color-text-muted, #64748b);
}

.clinical-step-tabs .clinical-step-tab--active {
  background: #196647;
  color: #ffffff;
}

.clinical-step-tabs .clinical-step-tab--active span {
  color: #ffffff;
}

.clinical-record-aside {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 84px;
}

.clinical-section,
.patient-summary-card,
.clinical-side-card,
.secondary-disclosure,
.record-cockpit {
  min-width: 0;
}

.clinical-section,
.patient-summary-card,
.clinical-side-card,
.secondary-disclosure {
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.clinical-section {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.clinical-section--chief {
  border-color: var(--color-primary-200, #bfdbfe);
  background: var(--color-primary-50, #eff6ff);
}

.clinical-text,
.clinical-entry p,
.empty-clinical-state {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  line-height: 1.6;
  white-space: pre-wrap;
}

.clinical-text--lead {
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 800;
}

.clinical-entry {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.clinical-entry h3 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 15px;
}

.clinical-entry span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.clinical-list {
  display: grid;
  gap: 10px;
}

.empty-clinical-state {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.vital-item {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.vital-item span,
.vital-item small {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 800;
}

.vital-item strong {
  color: var(--color-text, #0f172a);
  overflow-wrap: anywhere;
}

.patient-summary-card,
.clinical-side-card {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.patient-summary-card {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.patient-summary-card strong {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.patient-summary-card p {
  margin: 4px 0 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  line-height: 1.4;
}

.clinical-side-card h2 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.secondary-record-area {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.secondary-disclosure {
  padding: 12px 14px;
}

.secondary-disclosure summary {
  cursor: pointer;
  color: var(--color-text, #0f172a);
  font-weight: 900;
}

.secondary-disclosure[open] summary {
  margin-bottom: 12px;
}

.record-cockpit {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.patient-rail,
.clinical-sheet,
.anamnesis-command,
.vetus-card,
.summary-card {
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.patient-rail {
  display: grid;
  gap: 14px;
  padding: 14px;
  position: sticky;
  top: 84px;
}

.patient-rail__identity {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.patient-rail__avatar {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 22px;
}

.patient-rail__eyebrow,
.section-heading__eyebrow,
.summary-card__label,
.detail-list dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.patient-rail__identity strong {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.patient-rail__identity span:last-child {
  display: block;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.rail-section {
  display: grid;
  gap: 10px;
}

.rail-section h2,
.section-heading h2,
.vetus-card h3 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.rail-section--warning {
  padding: 10px;
  border-radius: 8px;
  background: var(--color-warning-50, #fffbeb);
}

.rail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.detail-list div {
  display: grid;
  grid-template-columns: minmax(86px, 0.8fr) minmax(0, 1fr);
  gap: 8px;
}

.detail-list dd {
  min-width: 0;
  margin: 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.clinical-workbench {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 10px;
}

.summary-card {
  min-width: 0;
  padding: 12px;
}

.summary-card__value {
  display: block;
  margin-top: 4px;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.summary-card__hint {
  display: block;
  margin-top: 3px;
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
}

.clinical-sheet {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.clinical-sheet__status {
  margin: -4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 700;
}

.clinical-sheet__status--draft,
.clinical-sheet__status--saving {
  color: var(--color-warning-700, #a16207);
}

.clinical-sheet__status--error {
  color: var(--color-danger-700, #b91c1c);
}

.clinical-sheet__status--saved {
  color: var(--color-success-700, #15803d);
}

.anamnesis-command {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-color: var(--color-primary-200, #bfdbfe);
  background: var(--color-primary-50, #eff6ff);
}

.anamnesis-command h2,
.anamnesis-command p {
  margin: 0;
}

.anamnesis-command p {
  margin-top: 4px;
  color: var(--color-text-secondary, #475569);
  line-height: 1.45;
}

.anamnesis-command__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.section-heading,
.vetus-card__header,
.entry-card__header,
.entry-card__footer,
.timeline-event,
.record-list__item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.section-heading__actions,
.vetus-card__actions,
.entry-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.chief-complaint {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
}

.chief-complaint strong {
  color: var(--color-text, #0f172a);
}

.entry-modal-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-text-secondary, #475569);
  line-height: 1.45;
}

.clinical-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.clinical-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--color-text, #0f172a);
  font-weight: 800;
}

.clinical-field small {
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
  font-weight: 500;
}

.clinical-field textarea {
  width: 100%;
  min-width: 0;
  resize: vertical;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 10px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
  line-height: 1.5;
}

.vetus-card-grid,
.clinical-history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.vetus-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
}

.record-list,
.entries-list,
.timeline-list {
  display: grid;
  gap: 10px;
}

.record-list--compact {
  margin-top: 4px;
}

.weight-card {
  display: grid;
  gap: 12px;
}

.weight-card__chart {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  height: 74px;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.weight-card__chart span {
  display: block;
  border-radius: 6px 6px 0 0;
  background: var(--color-primary-500, #2563eb);
}

.weight-card__chart span:nth-child(1) {
  height: 42%;
}

.weight-card__chart span:nth-child(2) {
  height: 64%;
}

.weight-card__chart span:nth-child(3) {
  height: 82%;
}

.record-list__item {
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.record-list__item div {
  min-width: 0;
}

.record-list__item strong,
.record-list__item p,
.record-list__item span {
  overflow-wrap: anywhere;
}

.record-list__item p {
  margin: 3px 0 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.record-list__item span {
  flex-shrink: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.clinical-inline-error {
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-200, #fecaca);
  border-radius: 8px;
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
  line-height: 1.45;
}

.attachment-item {
  align-items: flex-start;
}

.attachment-item__details {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.attachment-item__details p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.attachment-item__category,
.attachment-item__availability {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.attachment-item__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.entry-card {
  padding: 14px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.entry-card--archived {
  opacity: 0.6;
}

.entry-card__type {
  font-weight: 800;
  font-size: 13px;
  color: var(--color-primary-700, #1d4ed8);
}

.entry-card__version,
.entry-card__date,
.timeline-event__time {
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.entry-card__title {
  margin: 10px 0 8px;
  font-size: 15px;
  color: var(--color-text, #0f172a);
}

.entry-card__content {
  margin: 0 0 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.entry-card__archived {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.timeline-event {
  padding: 10px 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  font-size: 13px;
}

.timeline-event__type {
  flex-shrink: 0;
  font-weight: 800;
}

.timeline-event__summary {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1180px) {
  .record-cockpit,
  .clinical-record-layout {
    grid-template-columns: 1fr;
  }

  .patient-rail,
  .clinical-record-aside {
    position: static;
  }
}

@media (max-width: 820px) {
  .clinical-step-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .anamnesis-command,
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .anamnesis-command__actions,
  .section-heading__actions {
    justify-content: flex-start;
  }

  .clinical-form-grid,
  .vetus-card-grid,
  .clinical-history-grid,
  .vitals-grid {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .vetus-card__header,
  .entry-card__header,
  .entry-card__footer,
  .timeline-event,
  .record-list__item {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-heading__actions,
  .vetus-card__actions,
  .entry-card__actions {
    justify-content: flex-start;
  }
}
</style>
