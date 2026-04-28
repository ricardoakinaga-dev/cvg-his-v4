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
      <AppPageHeader :breadcrumbs="['Atendimento', 'Prontuário Clínico', displayPatientName]">
        <template #title>{{ displayPatientName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="record.status === 'open' ? 'Atendimento aberto' : 'Atendimento concluído'"
            :variant="record.status === 'open' ? 'warning' : 'success'"
          />
          <span class="muted">{{ patientClinicalSummary }}</span>
          <span class="muted">Tutor: {{ ownerName || 'Não informado' }}</span>
          <span class="muted">Contato: {{ ownerPrimaryContact }}</span>
        </template>
        <template #actions>
          <DsButton variant="ghost" tag="a" to="/medical-records">Voltar</DsButton>
          <DsButton variant="secondary" tag="a" :to="`/encounters/${record.encounterId}`">
            Continuar atendimento
          </DsButton>
          <DsButton variant="primary" @click="showNewEntryModal = true">Salvar entrada clínica</DsButton>
        </template>
      </AppPageHeader>

      <DsAlert v-if="entryFormError" variant="danger" dismissible @dismiss="entryFormError = ''">
        {{ entryFormError }}
      </DsAlert>
      <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
        {{ successMessage }}
      </DsAlert>
      <DsAlert v-if="contextWarnings.length" variant="info" dismissible>
        Algumas informações complementares não carregaram: {{ contextWarnings.join(', ') }}. A leitura clínica principal continua disponível.
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
        <main class="clinical-record-main">
          <section class="clinical-section clinical-section--chief">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">1. Motivo do atendimento</span>
                <h2>Queixa principal</h2>
              </div>
              <DsButton variant="secondary" size="sm" tag="a" :to="`/encounters/${record.encounterId}`">
                Editar atendimento
              </DsButton>
            </div>
            <p v-if="chiefComplaint" class="clinical-text clinical-text--lead">{{ chiefComplaint }}</p>
            <p v-else class="empty-clinical-state">Nenhuma queixa principal registrada.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">2. Relato do tutor</span>
                <h2>Anamnese</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('anamnesis')">Adicionar anamnese</DsButton>
            </div>
            <article v-if="latestEntry('anamnesis')" class="clinical-entry">
              <h3>{{ latestEntry('anamnesis')?.title }}</h3>
              <p>{{ latestEntry('anamnesis')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('anamnesis')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">Nenhuma anamnese registrada neste atendimento.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">3. Achados objetivos</span>
                <h2>Exame físico</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('physical_exam')">Registrar exame</DsButton>
            </div>
            <article v-if="latestEntry('physical_exam')" class="clinical-entry">
              <h3>{{ latestEntry('physical_exam')?.title }}</h3>
              <p>{{ latestEntry('physical_exam')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('physical_exam')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">Nenhum exame físico registrado neste atendimento.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">4. Sinais vitais</span>
                <h2>Parâmetros vitais</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('physical_exam')">Registrar parâmetros</DsButton>
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

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">5. Apoio diagnóstico</span>
                <h2>Exames solicitados / recomendados</h2>
              </div>
              <DsButton variant="secondary" size="sm" tag="a" :to="`/diagnostics?encounter=${record.encounterId}`">
                Abrir exames
              </DsButton>
            </div>
            <div v-if="diagnosticEntries.length" class="clinical-list">
              <article v-for="entry in diagnosticEntries.slice(0, 4)" :key="entry.id" class="clinical-entry">
                <h3>{{ entry.title }}</h3>
                <p>{{ entry.content || entryTypeLabel(entry.entryType) }}</p>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </article>
            </div>
            <p v-else class="empty-clinical-state">Nenhum exame solicitado ou recomendado neste atendimento.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">6. Raciocínio clínico</span>
                <h2>Suspeita diagnóstica / avaliação clínica</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('assessment')">Registrar avaliação</DsButton>
            </div>
            <article v-if="latestEntry('assessment')" class="clinical-entry">
              <h3>{{ latestEntry('assessment')?.title }}</h3>
              <p>{{ latestEntry('assessment')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('assessment')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">Nenhuma suspeita diagnóstica ou avaliação registrada.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">7. Tratamento</span>
                <h2>Terapêutica / plano de tratamento</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('plan')">Registrar plano</DsButton>
            </div>
            <article v-if="latestEntry('plan')" class="clinical-entry">
              <h3>{{ latestEntry('plan')?.title }}</h3>
              <p>{{ latestEntry('plan')?.content }}</p>
              <span>{{ formatDateTime(latestEntry('plan')?.updatedAt ?? '') }}</span>
            </article>
            <p v-else class="empty-clinical-state">Nenhuma terapêutica ou plano de tratamento registrado.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">8. Medicações</span>
                <h2>Prescrição / receituário</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('prescription')">Registrar prescrição</DsButton>
            </div>
            <div v-if="prescriptionEntries.length" class="clinical-list">
              <article v-for="entry in prescriptionEntries.slice(0, 3)" :key="entry.id" class="clinical-entry">
                <h3>{{ entry.title }}</h3>
                <p>{{ entry.content }}</p>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </article>
            </div>
            <p v-else class="empty-clinical-state">Nenhuma prescrição registrada para este atendimento.</p>
          </section>

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">9. Continuidade do cuidado</span>
                <h2>Conduta e próximos passos</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('conduct')">Registrar conduta</DsButton>
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

          <section class="clinical-section">
            <div class="section-heading">
              <div>
                <span class="section-heading__eyebrow">10. Complementos</span>
                <h2>Observações</h2>
              </div>
              <DsButton variant="secondary" size="sm" @click="startEntry('progress_note')">Registrar observação</DsButton>
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
                <DsButton variant="secondary" :disabled="submittingClinicalSheet" @click="clearClinicalSheet">
                  Limpar
                </DsButton>
                <DsButton
                  variant="primary"
                  :loading="submittingClinicalSheet"
                  :disabled="!hasClinicalSheetContent || submittingClinicalSheet"
                  @click="saveClinicalSheet"
                >
                  Salvar ficha de atendimento
                </DsButton>
              </div>
            </div>

            <div class="clinical-form-grid">
              <label v-for="section in clinicalSheetSections" :key="section.key" class="clinical-field">
                <span>{{ section.label }}</span>
                <small>{{ section.hint }}</small>
                <textarea
                  v-model="clinicalSheet[section.key]"
                  :placeholder="section.placeholder"
                  :data-testid="`clinical-${section.key}`"
                  rows="5"
                ></textarea>
              </label>
            </div>
          </section>
        </main>

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
              <DsButton v-if="owner" size="sm" variant="secondary" tag="a" :to="`/owners/${owner.id}`">
                Ver tutor
              </DsButton>
              <DsButton v-if="patient" size="sm" variant="secondary" tag="a" :to="`/patients/${patient.id}`">
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
                <DsButton size="sm" variant="secondary" tag="a" :to="`/encounters/${record.encounterId}`">
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
                <DsButton size="sm" variant="secondary" @click="startEntry('anamnesis')">
                  Incluir Nova Anamnese
                </DsButton>
              </div>
              <div v-if="anamnesisEntries.length" class="record-list">
                <div v-for="entry in anamnesisEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
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
                <div v-for="entry in preventiveEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.content }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui vacinas ou vermífugos registrados neste prontuário.</p>
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
                <DsButton size="sm" variant="secondary" tag="a" :to="`/diagnostics?encounter=${record.encounterId}`">
                  Ver mais Exames
                </DsButton>
              </div>
              <div v-if="diagnosticEntries.length" class="record-list">
                <div v-for="entry in diagnosticEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
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
                <div v-for="event in inpatientEvents.slice(0, 3)" :key="event.id" class="record-list__item">
                  <div>
                    <strong>{{ timelineEventTypeLabel(event.eventType) }}</strong>
                    <p>{{ event.summary }}</p>
                  </div>
                  <span>{{ formatDateTime(event.occurredAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui internação vinculada a este prontuário.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Receituário</h3>
                <DsButton size="sm" variant="secondary" @click="startEntry('prescription')">
                  Incluir Nova Receita
                </DsButton>
              </div>
              <div v-if="prescriptionEntries.length" class="record-list">
                <div v-for="entry in prescriptionEntries.slice(0, 3)" :key="entry.id" class="record-list__item">
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
                <DsButton size="sm" variant="secondary" tag="a" :to="`/patients/${record.patientId}/edit`">
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

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Imagens</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="`/diagnostics?encounter=${record.encounterId}`">
                  Incluir Imagem
                </DsButton>
              </div>
              <div v-if="imageEvents.length" class="record-list">
                <div v-for="event in imageEvents.slice(0, 3)" :key="event.id" class="record-list__item">
                  <div>
                    <strong>{{ timelineEventTypeLabel(event.eventType) }}</strong>
                    <p>{{ event.summary }}</p>
                  </div>
                  <span>{{ formatDateTime(event.occurredAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Esse animal não possui imagens anexadas a este prontuário.</p>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Cobrança</h3>
                <DsButton size="sm" variant="secondary" tag="a" :to="`/billing/${record.encounterId}`">
                  Abrir Cobrança
                </DsButton>
              </div>
              <dl class="detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>{{ billingRecord ? billingStatusLabel(billingRecord.status) : 'Não aberta' }}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{{ formatCurrency(billingRecord?.subtotalAmount ?? 0, billingRecord?.currency ?? 'BRL') }}</dd>
                </div>
                <div>
                  <dt>Últimos lançamentos</dt>
                  <dd>{{ billingItems.length }}</dd>
                </div>
              </dl>
              <div v-if="billingItems.length" class="record-list record-list--compact">
                <div v-for="item in billingItems.slice(0, 3)" :key="item.id" class="record-list__item">
                  <div>
                    <strong>{{ item.description }}</strong>
                    <p>{{ item.quantity }} x {{ formatCurrency(item.unitPriceAmount, billingRecord?.currency ?? 'BRL') }}</p>
                  </div>
                  <span>{{ formatCurrency(item.totalAmount, billingRecord?.currency ?? 'BRL') }}</span>
                </div>
              </div>
            </article>

            <article class="vetus-card">
              <div class="vetus-card__header">
                <h3>Histórico Clinico</h3>
                <DsButton size="sm" variant="secondary" @click="startEntry('progress_note')">
                  Nova Evolução
                </DsButton>
              </div>
              <div v-if="activeEntries.length" class="record-list">
                <div v-for="entry in activeEntries.slice(0, 5)" :key="entry.id" class="record-list__item">
                  <div>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entryTypeLabel(entry.entryType) }}</p>
                  </div>
                  <span>{{ formatDateTime(entry.updatedAt) }}</span>
                </div>
              </div>
              <p v-else class="muted">Escreva aqui o histórico clínico do animal usando a ficha de atendimento.</p>
            </article>
          </section>
        </details>

        <details class="secondary-disclosure">
          <summary>Entradas clínicas brutas e auditoria</summary>
          <section class="clinical-history-grid">
            <AppDetailSection title="Entradas Clínicas">
              <div v-if="entries.length === 0" class="muted">
                Nenhuma entrada clínica registrada ainda. Use a ficha estruturada acima para documentar anamnese, exame físico, avaliação, plano e conduta.
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
                    <span class="muted">Autor técnico: {{ entry.authoredByUserId.slice(0, 8) }}...</span>
                    <div class="entry-card__actions">
                      <DsButton
                        v-if="!entry.deletedAt"
                        size="sm"
                        variant="secondary"
                        @click="openEditEntry(entry)"
                      >
                        Editar
                      </DsButton>
                      <DsButton
                        v-if="!entry.deletedAt"
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
              <div v-else-if="timeline.length === 0" class="muted">Nenhum evento registrado ainda neste prontuário.</div>
              <div v-else class="timeline-list">
                <div v-for="event in timeline" :key="event.id" class="timeline-event">
                  <span class="timeline-event__type">{{ timelineEventTypeLabel(event.eventType) }}</span>
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

      <DsInput id="entryType" v-model="entryForm.entryType" type="select" label="Tipo" required>
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
        required
      />

      <DsInput
        id="entryContent"
        v-model="entryForm.content"
        type="textarea"
        label="Conteúdo"
        :placeholder="entryContentPlaceholder"
        :rows="entryForm.entryType === 'anamnesis' ? 10 : 8"
        required
      />

      <DsInput
        v-if="editingEntry"
        id="editReason"
        v-model="editReason"
        label="Motivo da Edição"
        placeholder="Motivo da alteração..."
      />

      <template #footer>
        <DsButton variant="secondary" @click="closeEntryModal">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :disabled="!isEntryFormValid || submittingEntry"
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
        required
      />

      <template #footer>
        <DsButton variant="secondary" @click="showArchiveModal = false">Cancelar</DsButton>
        <DsButton
          variant="danger"
          :disabled="!archiveReason.trim() || archivingEntry"
          @click="handleArchiveEntry"
        >
          {{ archivingEntry ? 'Arquivando...' : 'Arquivar' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { billingService } from '@/services/billing';
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
import { useEntityCache } from '@/composables/useEntityCache';
import {
  encounterStatusLabel,
  formatDateTime as formatEncounterDateTime
} from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

type ClinicalSheetKey = 'anamnesis' | 'physicalExam' | 'assessment' | 'plan' | 'prescription' | 'conduct';

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

const route = useRoute();
const routeRecordId = String(route.params.id ?? '');
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
const contextWarnings = ref<string[]>([]);
const resolvedEncounterId = ref('');
const loading = ref(true);
const timelineLoading = ref(false);
const error = ref('');
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
const editingEntry = ref<ClinicalEntrySummary | null>(null);
const editReason = ref('');
const archiveReason = ref('');
const archiveTarget = ref<ClinicalEntrySummary | null>(null);

const entryForm = ref({
  entryType: 'progress_note' as ClinicalEntryType,
  title: '',
  content: ''
});

const clinicalSheet = reactive<Record<ClinicalSheetKey, string>>({
  anamnesis: '',
  physicalExam: '',
  assessment: '',
  plan: '',
  prescription: '',
  conduct: ''
});

const clinicalSheetSections: ClinicalSheetSection[] = [
  {
    key: 'anamnesis',
    entryType: 'anamnesis',
    label: 'Anamnese / relato do tutor',
    title: 'Anamnese',
    hint: 'História, sinais percebidos, evolução e contexto informado pelo tutor.',
    placeholder: 'Ex.: início dos sinais, apetite, ingestão hídrica, vômitos, diarreia, comportamento, medicações em uso.'
  },
  {
    key: 'physicalExam',
    entryType: 'physical_exam',
    label: 'Exame físico',
    title: 'Exame físico',
    hint: 'Achados objetivos do atendimento.',
    placeholder: 'Ex.: TPC, mucosas, hidratação, ausculta, palpação, temperatura, dor, pele, olhos, cavidade oral.'
  },
  {
    key: 'assessment',
    entryType: 'assessment',
    label: 'Suspeita diagnóstica / avaliação clínica',
    title: 'Suspeita diagnóstica / avaliação clínica',
    hint: 'Raciocínio diagnóstico, problemas ativos e exames necessários.',
    placeholder: 'Ex.: principais suspeitas, diferenciais, gravidade, exames solicitados e justificativa.'
  },
  {
    key: 'plan',
    entryType: 'plan',
    label: 'Terapêutica / plano de tratamento',
    title: 'Terapêutica / plano de tratamento',
    hint: 'Conduta planejada para o caso.',
    placeholder: 'Ex.: medicações, fluidoterapia, exames complementares, retorno, internação, orientações de monitoramento.'
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
    placeholder: 'Ex.: orientações ao tutor, sinais de alerta, retorno recomendado, pendências e acompanhamento.'
  }
];

const activeEntries = computed(() => entries.value.filter((entry) => !entry.deletedAt));
const anamnesisEntries = computed(() => activeEntries.value.filter((entry) => entry.entryType === 'anamnesis'));
const preventiveEntries = computed(() =>
  activeEntries.value.filter((entry) => hasPreventiveText(entry.title) || hasPreventiveText(entry.content))
);
const inpatientEvents = computed(() =>
  timeline.value.filter((event) => event.eventType.startsWith('inpatient_'))
);
const imageEvents = computed(() =>
  timeline.value.filter((event) => event.eventType === 'attachment_added')
);
const prescriptionEntries = computed(() => {
  const ownEntries = activeEntries.value.filter((entry) => entry.entryType === 'prescription');
  const byId = new Map([...ownEntries, ...patientPrescriptions.value].map((entry) => [entry.id, entry]));
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

const latestEntriesByType = computed(() => {
  const grouped = new Map<ClinicalEntryType, ClinicalEntrySummary>();
  for (const entry of [...activeEntries.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    if (!grouped.has(entry.entryType)) {
      grouped.set(entry.entryType, entry);
    }
  }
  return grouped;
});

const hasClinicalSheetContent = computed(() =>
  clinicalSheetSections.some((section) => clinicalSheet[section.key].trim().length > 0)
);

const displayPatientName = computed(() => patientName.value || patient.value?.name || 'Paciente não identificado');

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
  return primary ? `${primary.label}: ${primary.value}` : 'Não informado';
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

const isEntryFormValid = computed(() => entryForm.value.title.trim() && entryForm.value.content.trim());

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

function entryTypeLabel(type: ClinicalEntryType) {
  return entryTypeMap[type] || type;
}

function latestEntry(type: ClinicalEntryType) {
  return latestEntriesByType.value.get(type);
}

function timelineEventTypeLabel(type: string) {
  return timelineEventTypeMap[type] || type;
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
  return /vacina|vacinacao|vacinal|vermif|verme/i.test(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
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
  const section = clinicalSheetSections.find((item) => item.entryType === entryType);
  entryForm.value = {
    entryType,
    title: section?.title ?? entryTypeLabel(entryType),
    content: ''
  };
  editingEntry.value = null;
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
  return Object.prototype.hasOwnProperty.call(entryTypeMap, raw) ? (raw as ClinicalEntryType) : null;
}

function openEditEntry(entry: ClinicalEntrySummary) {
  editingEntry.value = entry;
  entryForm.value = {
    entryType: entry.entryType,
    title: entry.title,
    content: entry.content
  };
  editReason.value = '';
  showEditEntryModal.value = true;
}

function openArchiveEntry(entry: ClinicalEntrySummary) {
  archiveTarget.value = entry;
  archiveReason.value = '';
  showArchiveModal.value = true;
}

function closeEntryModal() {
  showNewEntryModal.value = false;
  showEditEntryModal.value = false;
  editingEntry.value = null;
  entryForm.value = { entryType: 'progress_note', title: '', content: '' };
  entryFormError.value = '';
  editReason.value = '';
}

function clearClinicalSheet() {
  for (const section of clinicalSheetSections) {
    clinicalSheet[section.key] = '';
  }
}

async function loadRecord() {
  try {
    const response = await loadRecordByRouteId(routeRecordId);
    record.value = response.record;
    entries.value = response.entries;
    resolvedEncounterId.value = response.record.encounterId;
    patientName.value = await entityCache.getPatientName(response.record.patientId);
    await loadClinicalContext(response.record);
  } catch (err: unknown) {
    error.value = getLoadRecordErrorMessage(err);
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

async function loadClinicalContext(currentRecord: MedicalRecordSummary) {
  contextWarnings.value = [];
  const [encounterResult, patientResult, billingResult, billingItemsResult, diagnosticsResult, prescriptionsResult] =
    await Promise.allSettled([
      encounterService.getById(currentRecord.encounterId),
      patientService.getById(currentRecord.patientId),
      billingService.getByEncounter(currentRecord.encounterId),
      billingService.listItems(currentRecord.encounterId),
      diagnosticsService.listByEncounter(currentRecord.encounterId),
      prescriptionsService.listByPatient(currentRecord.patientId)
    ]);

  if (encounterResult.status === 'fulfilled') {
    encounter.value = encounterResult.value;
    ownerName.value = await entityCache.getOwnerName(encounterResult.value.ownerId);
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
  patientPrescriptions.value = prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [];
}

async function loadTimeline() {
  timelineLoading.value = true;
  try {
    if (!resolvedEncounterId.value) {
      timeline.value = [];
      return;
    }

    timeline.value = await medicalRecordsService.getTimeline(resolvedEncounterId.value);
  } catch {
    timeline.value = [];
  } finally {
    timelineLoading.value = false;
  }
}

async function refreshRecordAndTimeline() {
  await loadRecord();
  await loadTimeline();
}

async function saveClinicalSheet() {
  if (!record.value || !hasClinicalSheetContent.value) return;
  submittingClinicalSheet.value = true;
  entryFormError.value = '';
  successMessage.value = '';

  try {
    const payloads = clinicalSheetSections
      .map((section) => ({
        section,
        content: clinicalSheet[section.key].trim()
      }))
      .filter((item) => item.content.length > 0);

    for (const item of payloads) {
      await medicalRecordsService.createEntry({
        encounterId: record.value.encounterId,
        patientId: record.value.patientId,
        entryType: item.section.entryType,
        title: item.section.title,
        content: item.content
      });
    }

    clearClinicalSheet();
    successMessage.value = 'Ficha de atendimento salva no prontuário.';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar ficha de atendimento';
  } finally {
    submittingClinicalSheet.value = false;
  }
}

async function handleSaveEntry() {
  if (!record.value || !isEntryFormValid.value) return;
  submittingEntry.value = true;
  entryFormError.value = '';
  successMessage.value = '';

  try {
    if (editingEntry.value) {
      const payload: UpdateClinicalEntryRequest = {
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim(),
        reason: editReason.value.trim() || undefined,
        expectedVersion: editingEntry.value.version
      };
      await medicalRecordsService.updateEntry(editingEntry.value.id, payload);
    } else {
      const payload: CreateClinicalEntryRequest = {
        encounterId: record.value.encounterId,
        patientId: record.value.patientId,
        entryType: entryForm.value.entryType,
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim()
      };
      await medicalRecordsService.createEntry(payload);
    }
    closeEntryModal();
    successMessage.value = 'Entrada clínica salva no prontuário.';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar entrada';
  } finally {
    submittingEntry.value = false;
  }
}

async function handleArchiveEntry() {
  if (!archiveTarget.value || !archiveReason.value.trim()) return;
  archivingEntry.value = true;

  try {
    const payload: ArchiveClinicalEntryRequest = {
      reason: archiveReason.value.trim(),
      expectedVersion: archiveTarget.value.version
    };
    await medicalRecordsService.archiveEntry(archiveTarget.value.id, payload);
    showArchiveModal.value = false;
    archiveTarget.value = null;
    archiveReason.value = '';
    await refreshRecordAndTimeline();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao arquivar entrada');
  } finally {
    archivingEntry.value = false;
  }
}

onMounted(async () => {
  try {
    await loadRecord();
    await loadTimeline();
    const requestedEntryType = routeEntryType();
    if (requestedEntryType) {
      startEntry(requestedEntryType);
    }
  } finally {
    loading.value = false;
  }
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
  .entry-card__actions {
    justify-content: flex-start;
  }
}
</style>
