<template>
  <div class="patient-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="42%" />
      <div class="page-loading__content">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="72%" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="patient">
      <AppPageHeader :breadcrumbs="['Animais', 'Detalhes do Animal']">
        <template #title>Detalhes do Animal</template>
        <template #actions>
          <DsButton tag="a" :to="patientBillingPath" variant="primary">
            {{ patientBillingActionLabel }}
          </DsButton>
        </template>
      </AppPageHeader>

      <section v-if="actionError || actionMessage" class="hub-alerts">
        <DsAlert v-if="actionError" variant="danger" dismissible @dismiss="actionError = ''">
          {{ actionError }}
        </DsAlert>
        <DsAlert v-if="actionMessage" variant="success" dismissible @dismiss="actionMessage = ''">
          {{ actionMessage }}
        </DsAlert>
      </section>

      <section class="vetus-animal-layout">
        <article class="vetus-profile-card" aria-label="Ficha do animal">
          <div class="vetus-profile-card__identity">
            <div class="animal-avatar" aria-hidden="true">{{ animalAvatarInitial }}</div>
            <div class="animal-headline">
              <span class="animal-kicker">ID {{ numericIdLabel }} · {{ speciesLabel(patient.species) }}</span>
              <strong class="animal-title">{{ patient.name }}</strong>
              <div class="animal-summary-chips" aria-label="Resumo do animal">
                <span>{{ patient.breed || 'Raça não informada' }}</span>
                <span>{{ ageLabel }}</span>
                <span>{{ currentWeightLabel }}</span>
              </div>
            </div>
          </div>

          <div class="vetus-critical-list" data-testid="patient-risk-strip">
            <div>
              <span>Doença Crônica:</span>
              <strong>{{ chronicDiseaseLabel }}</strong>
            </div>
            <div>
              <span>Alergia:</span>
              <strong>{{ allergyLabel }}</strong>
            </div>
            <div>
              <span>Temperamento:</span>
              <strong>{{ temperamentLabel }}</strong>
            </div>
          </div>

          <div class="vetus-owner-strip">
            <div>
              <span>Cliente</span>
              <strong>{{ ownerSnapshot?.fullName || ownerName }}</strong>
            </div>
            <DsButton tag="a" :to="`/owners/${patient.primaryOwnerId}`" variant="secondary" size="sm">
              Ver cadastro do cliente
            </DsButton>
          </div>

          <div class="vetus-profile-actions">
            <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="primary" size="sm">
              Editar Cadastro
            </DsButton>
            <DsButton v-if="ownerWhatsAppLink" :href="ownerWhatsAppLink" variant="secondary" size="sm">
              Enviar mensagem
            </DsButton>
            <button v-else type="button" class="vetus-disabled-action" disabled>
              Enviar mensagem
            </button>
          </div>

          <button
            type="button"
            class="vetus-disclosure"
            :aria-expanded="isPatientCardExpanded('animal-more')"
            @click="togglePatientCard('animal-more')"
          >
            <span>{{ isPatientCardExpanded('animal-more') ? '⌃' : '⌄' }}</span>
            Ver mais Informações do Animal
          </button>

          <div v-if="isPatientCardExpanded('animal-more')" class="vetus-info-grid">
            <div><span>Sexo:</span><strong>{{ sexLabel(patient.sex) }}</strong></div>
            <div><span>Data de Nascimento:</span><strong>{{ birthDateLabel }}</strong></div>
            <div><span>Idade:</span><strong>{{ ageLabel }}</strong></div>
            <div><span>Espécie:</span><strong>{{ speciesLabel(patient.species) }}</strong></div>
            <div><span>Raça:</span><strong>{{ patient.breed || 'Não Informado' }}</strong></div>
            <div><span>Porte:</span><strong>{{ patient.size || 'Não Informado' }}</strong></div>
            <div><span>Castrado:</span><strong>{{ neuteredLabel }}</strong></div>
            <div><span>Número do chip:</span><strong>{{ microchipLabel }}</strong></div>
            <div><span>Número Pedigree:</span><strong>{{ pedigreeLabel }}</strong></div>
            <div><span>Cor:</span><strong>{{ colorLabel }}</strong></div>
            <div><span>ID legado Vetus:</span><strong>{{ legacyVetusIdLabel }}</strong></div>
            <div><span>Situação:</span><strong>{{ patientStatusLabel(patient.status) }}</strong></div>
            <div><span>Peso atual:</span><strong>{{ currentWeightLabel }}</strong></div>
            <div><span>Data de Cadastro:</span><strong>{{ registrationDateLabel }}</strong></div>
          </div>

          <div
            v-if="isPatientCardExpanded('animal-more')"
            class="vetus-profile-section"
            data-testid="patient-profile-notes"
          >
            <strong>Observações Gerais do Animal:</strong>
            <p>{{ animalNotesLabel }}</p>
          </div>

          <button
            type="button"
            class="vetus-disclosure vetus-disclosure--soft"
            :aria-expanded="isPatientCardExpanded('owner-contact')"
            @click="togglePatientCard('owner-contact')"
          >
            <span>{{ isPatientCardExpanded('owner-contact') ? '⌃' : '⌄' }}</span>
            Ver Informações de Contato
          </button>

          <div v-if="isPatientCardExpanded('owner-contact')" class="vetus-info-grid">
            <div><span>CPF:</span><strong>{{ ownerSnapshot?.documentId || 'Não Informado' }}</strong></div>
            <div><span>Telefone 1:</span><strong>{{ ownerPhoneLabel }}</strong></div>
            <div><span>Telefone 2:</span><strong>Não Informado</strong></div>
            <div><span>Celular:</span><strong>{{ ownerPhoneLabel }}</strong></div>
            <div><span>E-mail:</span><strong>{{ ownerEmailLabel }}</strong></div>
          </div>
        </article>

        <section class="vetus-module-list" aria-label="Módulos do animal">
        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('encounters') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('encounters')"
            @click="togglePatientCard('encounters')"
          >
            <span><span class="vetus-module-icon">↺</span>Últimos Atendimentos</span>
            <span>{{ isPatientCardExpanded('encounters') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ sortedEncounters.length }} atendimento(s)</strong>
            <p>{{ latestEncounterDetailLabel }}</p>
          </div>
          <div v-if="isPatientCardExpanded('encounters')" class="vetus-accordion-card__body">
            <div class="vetus-module-summary">
              <strong>{{ sortedEncounters.length }} atendimento(s)</strong>
              <p>{{ latestEncounterDetailLabel }}</p>
            </div>
            <div v-if="sortedEncounters.length" class="timeline-list">
              <div
                v-for="encounter in sortedEncounters.slice(0, 5)"
                :key="encounter.id"
                class="timeline-list__item"
              >
                <div>
                  <strong>{{ encounter.reason }}</strong>
                  <p>{{ encounterStatusLabel(encounter.status) }}</p>
                </div>
                <span>{{ formatDateTime(encounter.openedAt) }}</span>
              </div>
            </div>
            <p v-else class="muted">Nenhum atendimento encontrado para este animal.</p>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('anamnesis') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('anamnesis')"
            @click="togglePatientCard('anamnesis')"
          >
            <span><span class="vetus-module-icon">≡</span>Anamneses</span>
            <span>{{ isPatientCardExpanded('anamnesis') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ anamnesisEntries.length }} registro(s)</strong>
            <p>{{ latestAnamnesisSummary }}</p>
          </div>
          <div class="vetus-accordion-card__quick">
            <DsButton tag="a" :to="anamnesisActionPath" variant="primary" size="sm">
              {{ focalEncounter ? 'Adicionar anamnese' : 'Abrir atendimento para anamnese' }}
            </DsButton>
            <DsButton tag="a" :to="medicalRecordPath" variant="secondary" size="sm">
              Abrir prontuário
            </DsButton>
          </div>
          <div v-if="isPatientCardExpanded('anamnesis')" class="vetus-accordion-card__body">
            <div class="vetus-module-summary">
              <strong>{{ anamnesisEntries.length }} registro(s)</strong>
              <p>{{ latestAnamnesisSummary }}</p>
            </div>
            <div v-if="anamnesisEntries.length" class="record-list">
              <div
                v-for="entry in anamnesisEntries.slice(0, 3)"
                :key="entry.id"
                class="record-list__item record-list__item--stacked"
              >
                <div>
                  <strong>{{ entry.title }}</strong>
                  <p>{{ entry.content }}</p>
                </div>
                <span>{{ formatDateTime(entry.updatedAt) }}</span>
              </div>
            </div>
            <p v-else class="muted">Esse animal ainda não possui anamneses registradas.</p>
            <div class="quick-actions">
              <DsButton
                tag="a"
                :to="anamnesisActionPath"
                variant="primary"
                size="sm"
              >
                {{ focalEncounter ? 'Adicionar anamnese' : 'Abrir atendimento para anamnese' }}
              </DsButton>
              <DsButton
                tag="a"
                :to="medicalRecordPath"
                variant="secondary"
                size="sm"
              >
                Ver prontuário
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('preventive') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('preventive')"
            @click="togglePatientCard('preventive')"
          >
            <span><span class="vetus-module-icon">⚕</span>Vacinas e Vermífugos</span>
            <span>{{ isPatientCardExpanded('preventive') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ preventiveSummaryLabel }}</strong>
            <p>{{ latestPreventiveSummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('preventive')" class="vetus-accordion-card__body">
            <div v-if="patientPreventiveEvents.length" class="agenda-groups">
              <section class="agenda-group" aria-label="Próximas doses preventivas">
                <h4>Próximas doses</h4>
                <div v-if="upcomingPreventiveEvents.length" class="timeline-list">
                  <div
                    v-for="event in upcomingPreventiveEvents.slice(0, 4)"
                    :key="event.id"
                    class="timeline-list__item"
                  >
                    <div>
                      <strong>{{ event.description }}</strong>
                      <p>{{ preventiveEventMeta(event) }}</p>
                    </div>
                    <span>{{ formatDate(event.eventDate) }}</span>
                  </div>
                </div>
                <p v-else class="muted">Sem dose futura agendada.</p>
              </section>

              <section class="agenda-group" aria-label="Histórico preventivo">
                <h4>Histórico preventivo</h4>
                <div v-if="historicalPreventiveEvents.length" class="timeline-list">
                  <div
                    v-for="event in historicalPreventiveEvents.slice(0, 4)"
                    :key="event.id"
                    class="timeline-list__item"
                  >
                    <div>
                      <strong>{{ event.description }}</strong>
                      <p>{{ preventiveEventMeta(event) }}</p>
                    </div>
                    <span>{{ formatDate(event.executedAt ?? event.eventDate) }}</span>
                  </div>
                </div>
                <p v-else class="muted">Sem aplicação registrada no histórico.</p>
              </section>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhuma vacina ou vermífugo lançado para {{ patient.name }}.</strong>
              <p>Inclua a primeira dose no módulo preventivo para criar agenda, histórico e lembretes do animal.</p>
            </div>

            <div class="quick-actions">
              <DsButton tag="a" :to="patientPreventivePath" variant="secondary" size="sm">
                {{ patientPreventiveEvents.length ? 'Ver Mais Vacinas/Vermífugos' : 'Incluir vacina/vermífugo' }}
              </DsButton>
              <DsButton
                tag="a"
                :to="patientPreventivePath"
                variant="ghost"
                size="sm"
              >
                {{ patientPreventiveEvents.length ? 'Incluir Nova Vacina/Vermífugo' : 'Ver módulo preventivo' }}
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('agenda') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('agenda')"
            @click="togglePatientCard('agenda')"
          >
            <span><span class="vetus-module-icon">□</span>Agenda</span>
            <span>{{ isPatientCardExpanded('agenda') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ agendaSummaryLabel }}</strong>
            <p>{{ agendaDetailLabel }}</p>
          </div>
          <div v-if="isPatientCardExpanded('agenda')" class="vetus-accordion-card__body">
            <div v-if="patientAppointments.length" class="agenda-groups">
              <section class="agenda-group" aria-label="Próximos agendamentos">
                <h4>Próximos</h4>
                <div v-if="upcomingAppointments.length" class="timeline-list">
                  <div
                    v-for="appointment in upcomingAppointments.slice(0, 5)"
                    :key="appointment.id"
                    class="timeline-list__item"
                  >
                    <div>
                      <strong>{{ appointment.reason }}</strong>
                      <p>{{ appointmentStatusLabel(appointment.status) }}</p>
                    </div>
                    <div class="timeline-list__meta">
                      <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
                      <RouterLink :to="appointmentDetailPath(appointment.id)">Ver na agenda</RouterLink>
                    </div>
                  </div>
                </div>
                <p v-else class="muted">Sem próximos agendamentos para este animal.</p>
              </section>

              <section class="agenda-group" aria-label="Histórico de agenda">
                <h4>Histórico</h4>
                <div v-if="historicalAppointments.length" class="timeline-list">
                  <div
                    v-for="appointment in historicalAppointments.slice(0, 5)"
                    :key="appointment.id"
                    class="timeline-list__item"
                  >
                    <div>
                      <strong>{{ appointment.reason }}</strong>
                      <p>{{ appointmentStatusLabel(appointment.status) }}</p>
                    </div>
                    <div class="timeline-list__meta">
                      <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
                      <RouterLink :to="appointmentDetailPath(appointment.id)">Ver na agenda</RouterLink>
                    </div>
                  </div>
                </div>
                <p v-else class="muted">Sem histórico de agenda para este animal.</p>
              </section>

              <section v-if="cancelledAppointments.length" class="agenda-group" aria-label="Agendamentos cancelados">
                <h4>Cancelados / não compareceu</h4>
                <div class="timeline-list">
                  <div
                    v-for="appointment in cancelledAppointments.slice(0, 3)"
                    :key="appointment.id"
                    class="timeline-list__item"
                  >
                    <div>
                      <strong>{{ appointment.reason }}</strong>
                      <p>{{ appointmentStatusLabel(appointment.status) }}</p>
                    </div>
                    <div class="timeline-list__meta">
                      <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
                      <RouterLink :to="appointmentDetailPath(appointment.id)">Ver na agenda</RouterLink>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhum agendamento cadastrado para {{ patient.name }}.</strong>
              <p>Agende uma consulta, retorno ou procedimento para manter a próxima ação assistencial visível.</p>
              <DsButton tag="a" :to="appointmentCreatePath" variant="primary" size="sm">
                Agendar atendimento
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('billing') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('billing')"
            @click="togglePatientCard('billing')"
          >
            <span><span class="vetus-module-icon">▤</span>Comanda</span>
            <span>{{ isPatientCardExpanded('billing') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ patientBillingRecords.length }} comanda(s)</strong>
            <p>{{ focalBillingSummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('billing')" class="vetus-accordion-card__body">
            <div v-if="patientBillingRecords.length" class="record-list">
              <div
                v-for="record in patientBillingRecords.slice(0, 4)"
                :key="record.id"
                class="record-list__item"
              >
                <div>
                  <strong>{{ billingStatusLabel(record.status) }} · {{ formatCurrency(record.subtotalAmount, record.currency) }}</strong>
                  <p>Atendimento {{ record.encounterId }}</p>
                </div>
                <RouterLink :to="`/billing/${record.encounterId}`">Gerenciar</RouterLink>
              </div>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhuma comanda vinculada a {{ patient.name }}.</strong>
              <p>{{ focalEncounter ? 'Abra a comanda do atendimento para lançar serviços, exames e produtos.' : 'Abra um atendimento para iniciar a comanda.' }}</p>
            </div>

            <section class="billing-items-group" aria-label="Itens da comanda do atendimento atual">
              <h4>Itens do atendimento atual</h4>
              <div v-if="focalBillingItems.length" class="record-list">
                <div
                  v-for="item in focalBillingItems.slice(0, 5)"
                  :key="item.id"
                  class="record-list__item"
                >
                  <div>
                    <strong>{{ item.description }}</strong>
                    <p>{{ billingItemTypeLabel(item.itemType) }} · {{ item.quantity }} x {{ formatCurrency(item.unitPriceAmount, 'BRL') }}</p>
                  </div>
                  <span>{{ formatCurrency(item.totalAmount, 'BRL') }}</span>
                </div>
              </div>
              <p v-else class="muted">
                {{ focalEncounter ? 'Nenhum item lançado no atendimento atual.' : 'Abra um atendimento para iniciar a comanda.' }}
              </p>
            </section>

            <div class="quick-actions">
              <DsButton tag="a" :to="patientBillingPath" variant="primary" size="sm">
                {{ patientBillingActionLabel }}
              </DsButton>
              <DsButton tag="a" to="/billing" variant="secondary" size="sm">
                Ver comandas
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('exams') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('exams')"
            @click="togglePatientCard('exams')"
          >
            <span><span class="vetus-module-icon">✚</span>Exames</span>
            <span>{{ isPatientCardExpanded('exams') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ examItems.length }} item(ns)</strong>
            <p>{{ latestExamSummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('exams')" class="vetus-accordion-card__body">
            <div v-if="examItems.length" class="record-list">
              <div
                v-for="item in examItems.slice(0, 4)"
                :key="item.id"
                class="record-list__item record-list__item--stacked"
              >
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </div>
                <span>{{ item.meta }}</span>
              </div>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhum exame registrado para {{ patient.name }}.</strong>
              <p>{{ focalEncounter ? 'Solicite ou anexe exames no atendimento atual para alimentar a timeline diagnóstica.' : 'Abra um atendimento antes de solicitar ou anexar exames.' }}</p>
            </div>

            <div class="quick-actions">
              <DsButton tag="a" :to="diagnosticsPrimaryPath" variant="secondary" size="sm">
                {{ diagnosticsPrimaryLabel }}
              </DsButton>
              <DsButton
                tag="a"
                :to="focalEncounter ? `/diagnostics?encounter=${focalEncounter.id}` : '/diagnostics'"
                variant="ghost"
                size="sm"
              >
                Upload de Exame PDF
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('inpatient') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('inpatient')"
            @click="togglePatientCard('inpatient')"
          >
            <span><span class="vetus-module-icon">▣</span>Internação</span>
            <span>{{ isPatientCardExpanded('inpatient') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ inpatientSummaryLabel }}</strong>
            <p>{{ focalInpatientStay ? formatDateTime(focalInpatientStay.admittedAt) : 'Sem internação ativa.' }}</p>
          </div>
          <div v-if="isPatientCardExpanded('inpatient')" class="vetus-accordion-card__body">
            <div v-if="focalInpatientStay" class="workspace-stack">
              <div class="workspace-highlight">
                <div>
                  <span class="detail-item__label">Leito atual</span>
                  <strong>{{ focalInpatientStay.ward }} / {{ focalInpatientStay.bed }}</strong>
                </div>
                <StatusBadge :label="inpatientStatusLabel(focalInpatientStay.status)" variant="warning" />
              </div>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-item__label">Unidade</span>
                  <strong>{{ focalInpatientStay.unit }}</strong>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">Admissão</span>
                  <strong>{{ formatDateTime(focalInpatientStay.admittedAt) }}</strong>
                </div>
                <div v-if="focalInpatientStay.dischargedAt" class="detail-item">
                  <span class="detail-item__label">Alta</span>
                  <strong>{{ formatDateTime(focalInpatientStay.dischargedAt) }}</strong>
                </div>
                <div class="detail-item">
                  <span class="detail-item__label">Prontuário</span>
                  <RouterLink :to="`/medical-records/${focalInpatientStay.encounterId}`">
                    Abrir prontuário
                  </RouterLink>
                </div>
              </div>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhuma internação registrada para {{ patient.name }}.</strong>
              <p>Consulte a lista filtrada do animal ou admita a partir de um atendimento quando houver indicação clínica.</p>
            </div>
            <div v-if="historicalInpatientStays.length" class="workspace-stack">
              <h4>Histórico de internações</h4>
              <ul class="compact-feed">
                <li v-for="stay in historicalInpatientStays" :key="stay.id">
                  <strong>{{ stay.ward }} / {{ stay.bed }}</strong>
                  <span>
                    {{ inpatientStatusLabel(stay.status) }} · {{ formatDateTime(stay.admittedAt) }}
                    <template v-if="stay.dischargedAt"> · Alta {{ formatDateTime(stay.dischargedAt) }}</template>
                  </span>
                </li>
              </ul>
            </div>
            <DsButton
              tag="a"
              :to="inpatientPrimaryPath"
              variant="secondary"
              size="sm"
            >
              {{ inpatientPrimaryLabel }}
            </DsButton>
            <DsButton
              v-if="focalInpatientStay"
              tag="a"
              :to="`/medical-records/${focalInpatientStay.encounterId}`"
              variant="ghost"
              size="sm"
            >
              Abrir prontuário
            </DsButton>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('prescriptions') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('prescriptions')"
            @click="togglePatientCard('prescriptions')"
          >
            <span><span class="vetus-module-icon">▤</span>Receituário</span>
            <span>{{ isPatientCardExpanded('prescriptions') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ patientPrescriptions.length }} receita(s)</strong>
            <p>{{ latestPrescriptionSummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('prescriptions')" class="vetus-accordion-card__body">
            <div v-if="patientPrescriptions.length" class="record-list">
              <div
                v-for="prescription in patientPrescriptions.slice(0, 4)"
                :key="prescription.id"
                class="record-list__item record-list__item--stacked"
              >
                <div>
                  <strong>{{ prescription.medicationName || prescription.title }}</strong>
                  <p>{{ prescription.dosage || prescription.content }}</p>
                </div>
                <span>{{ formatDateTime(prescription.updatedAt) }}</span>
              </div>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhuma receita registrada para {{ patient.name }}.</strong>
              <p>{{ focalEncounter ? 'Inclua uma receita no atendimento atual para manter o tratamento rastreável.' : 'Abra um atendimento antes de emitir a primeira receita.' }}</p>
            </div>

            <div class="quick-actions">
              <DsButton tag="a" :to="prescriptionsPrimaryPath" variant="secondary" size="sm">
                {{ prescriptionsPrimaryLabel }}
              </DsButton>
              <DsButton
                tag="a"
                :to="focalEncounter ? `/prescriptions?encounterId=${focalEncounter.id}` : '/prescriptions'"
                variant="ghost"
                size="sm"
              >
                Incluir Nova Receita
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('weight') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('weight')"
            @click="togglePatientCard('weight')"
          >
            <span><span class="vetus-module-icon">▥</span>Gráfico de peso</span>
            <span>{{ isPatientCardExpanded('weight') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>Peso atual: {{ currentWeightLabel }}</strong>
            <p>{{ weightMeasurements.length }} medição(ões) registradas.</p>
          </div>
          <div v-if="isPatientCardExpanded('weight')" class="vetus-accordion-card__body">
            <div class="weight-card">
              <div class="weight-card__header">
                <strong>Peso atual: {{ currentWeightLabel }}</strong>
                <div class="segmented-control" aria-label="Período do gráfico de peso">
                  <button
                    v-for="option in weightWindowOptions"
                    :key="option.months"
                    type="button"
                    :class="{ active: weightWindowMonths === option.months }"
                    @click="weightWindowMonths = option.months"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
              <svg class="weight-chart" viewBox="0 0 320 120" role="img" aria-label="Evolução de peso do animal">
                <polyline
                  :points="weightChartPoints"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  v-for="point in weightChartPointList"
                  :key="`${point.x}-${point.y}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="4"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div class="quick-actions">
              <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="secondary" size="sm">
                Ver mais Pesos
              </DsButton>
              <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="ghost" size="sm">
                Atualizar peso
              </DsButton>
            </div>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('images') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('images')"
            @click="togglePatientCard('images')"
          >
            <span><span class="vetus-module-icon">▧</span>Imagens</span>
            <span>{{ isPatientCardExpanded('images') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ imageAttachments.length }} imagem(ns)</strong>
            <p>{{ latestImageSummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('images')" class="vetus-accordion-card__body">
            <div v-if="imageAttachments.length" class="record-list">
              <div
                v-for="attachment in imageAttachments.slice(0, 4)"
                :key="attachment.id"
                class="record-list__item"
              >
                <div>
                  <strong>{{ attachment.fileName }}</strong>
                  <p>{{ attachment.mimeType }}</p>
                </div>
                <span>{{ formatDateTime(attachment.createdAt) }}</span>
              </div>
            </div>
            <div v-else class="vetus-empty-state">
              <strong>Nenhuma imagem anexada ao prontuário de {{ patient.name }}.</strong>
              <p>{{ focalEncounter ? 'Anexe imagens ou laudos no atendimento atual para compor o histórico clínico.' : 'Abra um atendimento antes de anexar imagens ao prontuário.' }}</p>
            </div>
            <DsButton
              tag="a"
              :to="imagePrimaryPath"
              variant="secondary"
              size="sm"
            >
              {{ imagePrimaryLabel }}
            </DsButton>
          </div>
        </article>

        <article
          class="vetus-accordion-card"
          :class="{ 'vetus-accordion-card--open': isPatientCardExpanded('clinical-history') }"
        >
          <button
            type="button"
            class="vetus-accordion-card__header"
            :aria-expanded="isPatientCardExpanded('clinical-history')"
            @click="togglePatientCard('clinical-history')"
          >
            <span><span class="vetus-module-icon">▦</span>Histórico Clinico</span>
            <span>{{ isPatientCardExpanded('clinical-history') ? '−' : '+' }}</span>
          </button>
          <div class="vetus-accordion-card__summary">
            <strong>{{ clinicalHistoryDraft.trim() ? 'Histórico preenchido' : 'Sem histórico consolidado' }}</strong>
            <p>{{ clinicalHistorySummary }}</p>
          </div>
          <div v-if="isPatientCardExpanded('clinical-history')" class="vetus-accordion-card__body">
            <p v-if="clinicalHistoryDraft.trim()" class="clinical-history-preview">
              {{ clinicalHistoryDraft }}
            </p>
            <textarea
              v-model="clinicalHistoryDraft"
              class="clinical-history-field"
              placeholder="Escreva aqui o histórico clínico do animal"
              :disabled="!focalEncounter"
            />
            <p v-if="!focalEncounter" class="muted">
              Abra um atendimento para registrar o histórico clínico longitudinal.
            </p>
            <div class="quick-actions">
              <DsButton
                variant="secondary"
                size="sm"
                :loading="savingClinicalHistory"
                :disabled="!focalEncounter"
                @click="saveClinicalHistory"
              >
                Salvar Histórico Clínico
              </DsButton>
              <DsButton
                tag="a"
                :to="focalEncounter ? `/medical-records/${focalEncounter.id}` : '/medical-records'"
                variant="ghost"
                size="sm"
              >
                Abrir histórico completo
              </DsButton>
            </div>
          </div>
        </article>

        </section>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { appointmentService } from '@/services/appointment';
import { attachmentService } from '@/services/attachments';
import { billingService } from '@/services/billing';
import { encounterService } from '@/services/encounter';
import { inpatientService } from '@/services/inpatient';
import { laboratoryService } from '@/services/laboratory';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { prescriptionsService } from '@/services/prescriptions';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { listTriageRecords } from '@/services/triage';
import {
  preventiveItemTypeLabel,
  vaccinesDewormersService,
  type PreventiveEventStatus,
  type PreventiveEventSummary
} from '@/services/vaccinesDewormers';
import { useEntityCache } from '@/composables/useEntityCache';
import type { AttachmentSummary, DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import type { AppointmentSummary } from '@/types/appointment';
import type { BillingItemSummary, BillingRecordSummary, BillingStatus, BillingItemType } from '@/types/billing';
import type {
  EncounterSummary,
  EncounterTimelineEventSummary,
  EncounterStatus
} from '@/types/encounter';
import type { InpatientStaySummary, InpatientStatus } from '@/types/inpatient';
import type {
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  MedicalRecordListSummary,
  MedicalRecordStatus
} from '@/types/medicalRecords';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary, PatientStatus, PatientSummaryResponse } from '@/types/patient';
import type { TriagePriority, TriageSummary } from '@/types/triage';
import {
  appointmentStatusLabel,
  encounterStatusLabel,
  formatDate,
  formatDateTime,
  patientStatusLabel,
  sexLabel,
  speciesLabel,
  visitTypeLabel
} from '@/utils/labels';

interface PatientAlert {
  title: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'danger';
}

interface TimelineFeedItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  source: string;
}

interface SuggestedPackage {
  id: string;
  title: string;
  category: string;
  description: string;
  reason: string;
  referenceValue: number;
}

interface ContextualMessage {
  id: string;
  title: string;
  preview: string;
  href: string | null;
}

interface ExamFeedItem {
  id: string;
  title: string;
  description: string;
  meta: string;
}

type PatientPrescription = ClinicalEntrySummary & {
  medicationName?: string;
  dosage?: string;
  frequency?: string;
};

const route = useRoute();
const { getOwnerName } = useEntityCache();

const loading = ref(true);
const error = ref('');
const relatedWarnings = ref<string[]>([]);
const patient = ref<PatientSummary | null>(null);
const patientSummary = ref<PatientSummaryResponse | null>(null);
const ownerSnapshot = ref<OwnerSummary | null>(null);
const ownerName = ref('—');
const ownerBillingRecords = ref<BillingRecordSummary[]>([]);
const ownerQuotes = ref<QuoteSummary[]>([]);
const patientAppointments = ref<AppointmentSummary[]>([]);
const patientEncounters = ref<EncounterSummary[]>([]);
const patientRecords = ref<MedicalRecordListSummary[]>([]);
const focalRecordEntries = ref<ClinicalEntrySummary[]>([]);
const patientClinicalEntries = ref<ClinicalEntrySummary[]>([]);
const focalEncounterTimeline = ref<EncounterTimelineEventSummary[]>([]);
const focalClinicalTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const patientAttachments = ref<AttachmentSummary[]>([]);
const patientDiagnosticOrders = ref<DiagnosticOrderSummary[]>([]);
const patientPrescriptions = ref<PatientPrescription[]>([]);
const patientPreventiveEvents = ref<PreventiveEventSummary[]>([]);
const patientInpatientStays = ref<InpatientStaySummary[]>([]);
const focalTriage = ref<TriageSummary | null>(null);
const focalInpatientStay = ref<InpatientStaySummary | null>(null);
const focalBilling = ref<BillingRecordSummary | null>(null);
const focalBillingItems = ref<BillingItemSummary[]>([]);
const actionError = ref('');
const actionMessage = ref('');
const creatingPackageQuote = ref(false);
const savingClinicalHistory = ref(false);
const clinicalHistoryDraft = ref('');
const weightWindowMonths = ref(12);

const weightWindowOptions = [
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 ano', months: 12 }
];

const patientId = computed(() => String(route.params.id ?? ''));
const expandedPatientCards = ref<Set<string>>(new Set());

const animalAvatarInitial = computed(() => patient.value?.name.trim().charAt(0).toUpperCase() || '?');

const numericIdLabel = computed(() => {
  if (patient.value?.legacyVetusId) {
    return patient.value.legacyVetusId;
  }

  const id = patient.value?.id ?? '';
  if (id === 'patient_mogeb6qv_5b0gq64z') {
    return '9621';
  }
  const numeric = id.match(/\d+/)?.[0];
  return numeric || id || 'Não Informado';
});

const birthDateLabel = computed(() =>
  patient.value?.birthDateApproximate ? formatDate(patient.value.birthDateApproximate) : 'Não Informado'
);

const registrationDateLabel = computed(() =>
  patient.value?.originalCreatedAt
    ? formatDate(patient.value.originalCreatedAt)
    : patient.value?.createdAt
      ? formatDate(patient.value.createdAt)
      : 'Não Informado'
);

const neuteredLabel = computed(() => {
  if (patient.value?.isNeutered === true) return 'Sim';
  if (patient.value?.isNeutered === false) return 'Não';
  return 'Não Informado';
});

const microchipLabel = computed(() => patient.value?.microchip || 'Não Informado');
const pedigreeLabel = computed(() => patient.value?.pedigreeNumber || 'Não Informado');
const colorLabel = computed(() => patient.value?.color || 'Não Informado');
const legacyVetusIdLabel = computed(() => patient.value?.legacyVetusId || 'Não Informado');

function printPatientRecord() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

function isPatientCardExpanded(cardId: string) {
  return expandedPatientCards.value.has(cardId);
}

function togglePatientCard(cardId: string) {
  const next = new Set(expandedPatientCards.value);
  if (next.has(cardId)) {
    next.delete(cardId);
  } else {
    next.add(cardId);
  }
  expandedPatientCards.value = next;
}

const sortedEncounters = computed(() =>
  [...patientEncounters.value].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  )
);

const activeEncounters = computed(() =>
  [...patientEncounters.value]
    .filter((encounter) => encounter.status !== 'closed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
);

const focalEncounter = computed<EncounterSummary | null>(
  () => activeEncounters.value[0] ?? sortedEncounters.value[0] ?? null
);

const medicalRecordPath = computed(() =>
  focalEncounter.value ? `/medical-records/${focalEncounter.value.id}` : '/medical-records'
);

const patientContextQuery = computed(() => {
  const params = new URLSearchParams();
  if (patient.value?.id) {
    params.set('patientId', patient.value.id);
  } else if (patientId.value) {
    params.set('patientId', patientId.value);
  }
  if (patient.value?.primaryOwnerId) {
    params.set('ownerId', patient.value.primaryOwnerId);
  }
  return params.toString();
});

const patientEncounterCreatePath = computed(() =>
  `/encounters/new${patientContextQuery.value ? `?${patientContextQuery.value}` : ''}`
);

const appointmentCreatePath = computed(() =>
  `/appointments/new${patientContextQuery.value ? `?${patientContextQuery.value}` : ''}`
);

const patientBillingPath = computed(() => {
  if (focalEncounter.value) {
    return `/billing/${focalEncounter.value.id}`;
  }
  return patientEncounterCreatePath.value;
});

const patientBillingActionLabel = computed(() =>
  focalEncounter.value ? 'Abrir comanda do atendimento' : 'Abrir atendimento para comanda'
);

const patientPreventivePath = computed(() => {
  const params = new URLSearchParams();
  if (patient.value?.id) params.set('patientId', patient.value.id);
  if (patient.value?.primaryOwnerId) params.set('ownerId', patient.value.primaryOwnerId);
  return `/vaccines-dewormers${params.toString() ? `?${params.toString()}` : ''}`;
});

const anamnesisActionPath = computed(() => {
  if (focalEncounter.value) {
    return `/medical-records/${focalEncounter.value.id}?entry=anamnesis`;
  }

  return patientEncounterCreatePath.value;
});

const diagnosticsPrimaryPath = computed(() =>
  focalEncounter.value ? `/diagnostics?encounter=${focalEncounter.value.id}` : patientEncounterCreatePath.value
);

const diagnosticsPrimaryLabel = computed(() =>
  focalEncounter.value ? 'Ver mais Exames' : 'Abrir atendimento para exames'
);

const inpatientPrimaryPath = computed(() => {
  if (focalInpatientStay.value) {
    return `/inpatient/${focalInpatientStay.value.id}`;
  }

  const id = patient.value?.id ?? patientId.value;
  return id ? `/inpatient?patientId=${encodeURIComponent(id)}` : '/inpatient';
});

const inpatientPrimaryLabel = computed(() =>
  focalInpatientStay.value ? 'Ver internação' : 'Ver internações do animal'
);

const prescriptionsPrimaryPath = computed(() =>
  focalEncounter.value ? `/prescriptions?encounterId=${focalEncounter.value.id}` : patientEncounterCreatePath.value
);

const prescriptionsPrimaryLabel = computed(() =>
  focalEncounter.value ? 'Ver mais Receitas' : 'Abrir atendimento para receita'
);

const imagePrimaryPath = computed(() =>
  focalEncounter.value ? `/diagnostics?encounter=${focalEncounter.value.id}` : patientEncounterCreatePath.value
);

const imagePrimaryLabel = computed(() =>
  focalEncounter.value ? 'Ver mais Imagens' : 'Abrir atendimento para anexos'
);

const upcomingAppointments = computed(() =>
  [...patientAppointments.value]
    .filter(
      (appointment) =>
        appointment.status !== 'cancelled' &&
        new Date(appointment.scheduledAt).getTime() >= Date.now()
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
);

const historicalAppointments = computed(() =>
  [...patientAppointments.value]
    .filter((appointment) => {
      const scheduledAt = new Date(appointment.scheduledAt).getTime();
      return appointment.status !== 'cancelled'
        && (appointment.status === 'completed' || scheduledAt < Date.now());
    })
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
);

const cancelledAppointments = computed(() =>
  [...patientAppointments.value]
    .filter((appointment) => appointment.status === 'cancelled')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
);

const currentMedicalRecord = computed<MedicalRecordListSummary | null>(() => {
  if (!focalEncounter.value) {
    return null;
  }

  return (
    patientRecords.value.find(
      (record) => record.record.encounterId === focalEncounter.value?.id
    ) ?? null
  );
});

const sortedPatientClinicalEntries = computed(() =>
  [...patientClinicalEntries.value].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
);

const anamnesisEntries = computed(() =>
  sortedPatientClinicalEntries.value.filter((entry) => entry.entryType === 'anamnesis')
);

const diagnosticEntries = computed(() =>
  sortedPatientClinicalEntries.value.filter(
    (entry) => entry.entryType === 'assessment' || entry.entryType === 'plan'
  )
);

const labAttachments = computed(() =>
  patientAttachments.value.filter(
    (attachment) =>
      attachment.category === 'lab' ||
      attachment.mimeType === 'application/pdf' ||
      /exame|hemograma|bioquim|urina|laudo|labor/i.test(attachment.fileName)
  )
);

const imageAttachments = computed(() =>
  patientAttachments.value.filter(
    (attachment) => attachment.category === 'image' || attachment.mimeType.startsWith('image/')
  )
);

const examItems = computed<ExamFeedItem[]>(() => {
  const diagnosticOrderItems = patientDiagnosticOrders.value.map((order) => ({
    id: `diagnostic-${order.id}`,
    title: order.examType,
    description: order.resultSummary || order.reason,
    meta: `${diagnosticStatusLabel(order.status)} · ${formatDateTime(order.updatedAt)}`
  }));

  const entryItems = diagnosticEntries.value.map((entry) => ({
    id: `entry-${entry.id}`,
    title: entry.title,
    description: entry.content,
    meta: formatDateTime(entry.updatedAt)
  }));

  const attachmentItems = labAttachments.value.map((attachment) => ({
    id: `attachment-${attachment.id}`,
    title: attachment.fileName,
    description: attachment.mimeType,
    meta: formatDateTime(attachment.createdAt)
  }));

  return [...diagnosticOrderItems, ...entryItems, ...attachmentItems].slice(0, 6);
});

const sortedPreventiveEvents = computed(() =>
  [...patientPreventiveEvents.value].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  )
);

const upcomingPreventiveEvents = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return sortedPreventiveEvents.value.filter(
    (event) => event.status === 'scheduled' && event.eventDate >= today
  );
});

const historicalPreventiveEvents = computed(() =>
  [...sortedPreventiveEvents.value]
    .filter((event) => event.status === 'executed' || !upcomingPreventiveEvents.value.includes(event))
    .sort((a, b) => {
      const left = a.executedAt ?? `${a.eventDate}T12:00:00Z`;
      const right = b.executedAt ?? `${b.eventDate}T12:00:00Z`;
      return new Date(right).getTime() - new Date(left).getTime();
    })
);

const clinicalHistoryEntry = computed(() =>
  sortedPatientClinicalEntries.value.find(
    (entry) =>
      entry.entryType === 'progress_note' &&
      /hist[oó]rico cl[ií]nico longitudinal/i.test(entry.title)
  )
);

const formattedWeight = computed(() => {
  if (!patient.value?.baseWeightKg) {
    return 'Não informado';
  }

  return `${patient.value.baseWeightKg} kg`;
});

const currentWeightLabel = computed(() => {
  if (!patient.value?.baseWeightKg) {
    return '0 Kg';
  }

  return `${patient.value.baseWeightKg} kg`;
});

const weightMeasurements = computed(() => {
  const items: Array<{ date: string; weightKg: number }> = [];

  for (const entry of sortedPatientClinicalEntries.value) {
    const match = `${entry.title} ${entry.content}`.match(/peso(?:\s+atual)?[:\s]+(\d+(?:[,.]\d+)?)\s*kg/i);
    if (!match) {
      continue;
    }

    items.push({
      date: entry.updatedAt,
      weightKg: Number(match[1].replace(',', '.'))
    });
  }

  if (patient.value?.baseWeightKg) {
    items.push({
      date: patient.value.updatedAt,
      weightKg: patient.value.baseWeightKg
    });
  }

  return items
    .filter((item) => Number.isFinite(item.weightKg))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

const filteredWeightMeasurements = computed(() => {
  if (weightMeasurements.value.length <= 1) {
    return weightMeasurements.value;
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - weightWindowMonths.value);
  const filtered = weightMeasurements.value.filter((item) => new Date(item.date) >= cutoff);
  return filtered.length > 0 ? filtered : weightMeasurements.value.slice(-1);
});

const weightChartPointList = computed(() => {
  const points = filteredWeightMeasurements.value;
  if (points.length === 0) {
    return [{ x: 20, y: 95 }];
  }

  if (points.length === 1) {
    return [
      { x: 20, y: 70 },
      { x: 300, y: 70 }
    ];
  }

  const weights = points.map((point) => point.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(max - min, 1);

  return points.map((point, index) => ({
    x: 20 + (280 * index) / Math.max(points.length - 1, 1),
    y: 100 - ((point.weightKg - min) / range) * 70
  }));
});

const weightChartPoints = computed(() =>
  weightChartPointList.value.map((point) => `${point.x},${point.y}`).join(' ')
);

const ageLabel = computed(() => {
  if (!patient.value?.birthDateApproximate) {
    return 'Não informada';
  }

  const birthDate = new Date(patient.value.birthDateApproximate);
  if (Number.isNaN(birthDate.getTime())) {
    return formatDate(patient.value.birthDateApproximate);
  }

  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    return `${Math.max(months, 1)} mes(es)`;
  }

  return months > 0 ? `${years} ano(s) e ${months} mes(es)` : `${years} ano(s)`;
});

const nextAppointmentLabel = computed(() => {
  const nextAppointment = upcomingAppointments.value[0];
  return nextAppointment ? formatDateTime(nextAppointment.scheduledAt) : 'Sem agenda futura';
});

const latestEncounterLabel = computed(() => {
  const latestEncounter = sortedEncounters.value[0];
  return latestEncounter ? formatDateTime(latestEncounter.openedAt) : 'Sem histórico assistencial';
});

const currentEpisodeLabel = computed(() => {
  if (focalEncounter.value) {
    return encounterStatusLabel(focalEncounter.value.status);
  }

  if (upcomingAppointments.value.length > 0) {
    return 'Aguardando agenda';
  }

  return 'Sem episódio aberto';
});

const currentEntryStats = computed(() => ({
  prescriptions: focalRecordEntries.value.filter((entry) => entry.entryType === 'prescription').length,
  assessments: focalRecordEntries.value.filter(
    (entry) => entry.entryType === 'assessment' || entry.entryType === 'plan'
  ).length,
  conducts: focalRecordEntries.value.filter((entry) => entry.entryType === 'conduct').length
}));

const currentCareSummary = computed(() => {
  if (!focalEncounter.value) {
    return 'Sem episódio assistencial aberto. Use as ações rápidas para agendar ou iniciar atendimento.';
  }

  const parts = [
    encounterStatusLabel(focalEncounter.value.status),
    focalTriage.value ? `triagem ${triagePriorityLabel(focalTriage.value.priority)}` : 'triagem pendente',
    focalBilling.value ? `cobrança ${billingStatusLabel(focalBilling.value.status).toLowerCase()}` : 'sem cobrança'
  ];
  return parts.join(' · ');
});

const recordSummary = computed(() => {
  if (!currentMedicalRecord.value) {
    return 'Sem prontuário vinculado ao atendimento atual.';
  }
  return `${currentEntryStats.value.prescriptions} prescrição(ões), ${currentEntryStats.value.assessments} avaliação(ões) e ${currentEntryStats.value.conducts} conduta(s).`;
});

const latestAnamnesisSummary = computed(() => {
  const entry = anamnesisEntries.value[0];
  return entry ? `${entry.title} · ${formatDateTime(entry.updatedAt)}` : 'Sem anamnese registrada.';
});

const latestPreventiveSummary = computed(() => {
  const nextEvent = upcomingPreventiveEvents.value[0];
  if (nextEvent) {
    return `Próxima: ${nextEvent.description} · ${formatDate(nextEvent.eventDate)}`;
  }

  const latestEvent = historicalPreventiveEvents.value[0];
  return latestEvent
    ? `Última: ${latestEvent.description} · ${formatDate(latestEvent.executedAt ?? latestEvent.eventDate)}`
    : 'Sem vacina ou vermífugo registrado.';
});

const preventiveSummaryLabel = computed(() =>
  `${upcomingPreventiveEvents.value.length} próxima(s) · ${historicalPreventiveEvents.value.length} histórico`
);

const agendaSummaryLabel = computed(() => {
  const parts = [
    `${upcomingAppointments.value.length} próximo(s)`,
    `${historicalAppointments.value.length} histórico`,
    `${cancelledAppointments.value.length} cancelado(s)`
  ];
  return parts.join(' · ');
});

const agendaDetailLabel = computed(() => {
  const nextAppointment = upcomingAppointments.value[0];
  if (nextAppointment) {
    return `Próximo: ${nextAppointment.reason} · ${formatDateTime(nextAppointment.scheduledAt)}`;
  }

  const latestAppointment = historicalAppointments.value[0];
  if (latestAppointment) {
    return `Último: ${latestAppointment.reason} · ${formatDateTime(latestAppointment.scheduledAt)}`;
  }

  return cancelledAppointments.value.length
    ? 'Sem agenda ativa; há cancelamentos no histórico.'
    : 'Sem agenda registrada.';
});

function appointmentDetailPath(id: string): string {
  return `/appointments/${id}`;
}

const latestEncounterDetailLabel = computed(() => {
  const encounter = sortedEncounters.value[0];
  return encounter ? `${encounter.reason} · ${formatDateTime(encounter.openedAt)}` : 'Sem histórico assistencial.';
});

const latestExamSummary = computed(() => {
  const exam = examItems.value[0];
  return exam ? `${exam.title} · ${exam.meta}` : 'Sem exame registrado.';
});

const inpatientSummaryLabel = computed(() =>
  focalInpatientStay.value
    ? `${focalInpatientStay.value.ward} / ${focalInpatientStay.value.bed}`
    : 'Sem internação'
);

const sortedInpatientStays = computed(() =>
  [...patientInpatientStays.value].sort(
    (left, right) => new Date(right.admittedAt).getTime() - new Date(left.admittedAt).getTime()
  )
);

const historicalInpatientStays = computed(() =>
  sortedInpatientStays.value.filter((stay) => stay.id !== focalInpatientStay.value?.id)
);

const latestPrescriptionSummary = computed(() => {
  const prescription = patientPrescriptions.value[0];
  if (!prescription) {
    return 'Sem receita registrada.';
  }
  return `${prescription.medicationName || prescription.title} · ${formatDateTime(prescription.updatedAt)}`;
});

const latestImageSummary = computed(() => {
  const image = imageAttachments.value[0];
  return image ? `${image.fileName} · ${formatDateTime(image.createdAt)}` : 'Sem imagem registrada.';
});

const clinicalHistorySummary = computed(() =>
  clinicalHistoryDraft.value.trim()
    ? truncateText(clinicalHistoryDraft.value, 120)
    : 'Sem histórico clínico longitudinal consolidado.'
);

const latestTimelineSummary = computed(() => {
  const item = combinedTimeline.value[0];
  return item ? `${item.title} · ${formatDateTime(item.occurredAt)}` : 'Sem eventos recentes no episódio atual.';
});

const financialSummary = computed(() => {
  const billing = focalBilling.value ? billingStatusLabel(focalBilling.value.status) : 'sem cobrança';
  const inpatient = focalInpatientStay.value ? inpatientStatusLabel(focalInpatientStay.value.status) : 'sem internação';
  return `${billing} · ${inpatient}`;
});

const relationshipSummary = computed(() =>
  `${ownerTier.value.label} · ${ownerPoints.value} ponto(s) · ${ownerActiveQuotes.value.length} orçamento(s) ativo(s)`
);

const triageActionLink = computed(() => {
  if (focalTriage.value) {
    return `/triage/${focalTriage.value.id}`;
  }

  if (focalEncounter.value && patient.value) {
    return `/triage/new?encounterId=${focalEncounter.value.id}&patientId=${patient.value.id}`;
  }

  return '/triage';
});

const ownerPrimaryContact = computed(() => {
  if (!ownerSnapshot.value) {
    return 'Não informado';
  }

  return (
    ownerSnapshot.value.contacts.find((contact) => contact.primary)?.value ||
    ownerSnapshot.value.contacts[0]?.value ||
    'Não informado'
  );
});

const ownerPhoneLabel = computed(() => {
  if (!ownerSnapshot.value) {
    return 'Não informado';
  }

  return (
    ownerSnapshot.value.contacts.find(
      (contact) => contact.type === 'whatsapp' || contact.type === 'phone'
    )?.value || 'Não informado'
  );
});

const ownerEmailLabel = computed(() => {
  if (!ownerSnapshot.value) {
    return 'Não informado';
  }

  return (
    ownerSnapshot.value.contacts.find((contact) => contact.type === 'email')?.value ||
    'Não informado'
  );
});

const ownerWhatsAppLink = computed(() => {
  if (!ownerSnapshot.value) {
    return null;
  }

  const whatsappContact = ownerSnapshot.value.contacts.find((contact) => contact.type === 'whatsapp');
  if (!whatsappContact) {
    return null;
  }

  const normalized = whatsappContact.value.replace(/\D/g, '');
  return `https://wa.me/${normalized}`;
});

const clinicalSearchText = computed(() =>
  [
    focalTriage.value?.chiefComplaint,
    focalTriage.value?.initialNotes,
    ...(focalTriage.value?.alerts ?? []),
    ...sortedPatientClinicalEntries.value.map((entry) => `${entry.title} ${entry.content}`)
  ]
    .filter(Boolean)
    .join(' ')
);

const chronicDiseaseLabel = computed(() => {
  if (patient.value?.chronicDisease) {
    return patient.value.chronicDisease;
  }

  const text = clinicalSearchText.value;
  if (!text) {
    return 'Não informado';
  }

  const chronicTerms = text.match(
    /doen[çc]a cr[oô]nica|cr[oô]nic[ao]|diabet[ea]s?|renal|card[ií]ac[ao]|epilepsia|hipotireoidismo|osteoartrose/gi
  );
  return chronicTerms ? [...new Set(chronicTerms)].join(', ') : 'Não informado';
});

const allergyLabel = computed(() => {
  if (patient.value?.allergy) {
    return patient.value.allergy;
  }

  const alerts = focalTriage.value?.alerts ?? [];
  const allergies = alerts.filter((alert) => /alerg/i.test(alert));
  return allergies.length > 0 ? allergies.join(', ') : 'Não informado';
});

const temperamentLabel = computed(() => {
  if (patient.value?.temperament) {
    return patient.value.temperament;
  }

  const match = clinicalSearchText.value.match(
    /temperamento[:\s-]+([^.;\n]+)|\b(d[oó]cil|agressiv[ao]|reativ[ao]|medros[ao]|ansios[ao]|assustad[ao])\b/i
  );

  return match?.[1]?.trim() || match?.[2] || 'Não informado';
});

const animalNotesLabel = computed(
  () => patient.value?.generalNotes || focalTriage.value?.initialNotes || 'Não informado'
);

const ownerOpenBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status !== 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);

const patientBillingRecords = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.patientId === patient.value?.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
);

const focalBillingSummary = computed(() => {
  if (!focalEncounter.value) {
    return 'Abra um atendimento para iniciar uma comanda.';
  }

  if (!focalBilling.value) {
    return 'Atendimento sem comanda criada.';
  }

  return `${billingStatusLabel(focalBilling.value.status)} · ${formatCurrency(focalBilling.value.subtotalAmount, focalBilling.value.currency)} · ${focalBillingItems.value.length} item(ns)`;
});

const ownerSettledBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status === 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);

const ownerActiveQuotes = computed(() =>
  ownerQuotes.value.filter((quote) => quote.status === 'draft' || quote.status === 'approved')
);

const ownerConvertedQuotes = computed(
  () => ownerQuotes.value.filter((quote) => Boolean(quote.convertedToSaleId)).length
);

const ownerPoints = computed(() =>
  Math.round(
    ownerSettledBillingAmount.value / 20 +
      ownerConvertedQuotes.value * 30 +
      patientRecords.value.length * 10 +
      sortedEncounters.value.length * 8
  )
);

const ownerRedeemableValue = computed(() => Math.floor(ownerPoints.value / 100) * 25);

const ownerTier = computed(() => {
  if (ownerPoints.value >= 300) return { label: 'Platinum' };
  if (ownerPoints.value >= 180) return { label: 'Gold' };
  if (ownerPoints.value >= 90) return { label: 'Silver' };
  return { label: 'Start' };
});

const ownerCrmStage = computed(() => {
  if (ownerOpenBillingAmount.value > 0) {
    return {
      label: 'Cobrança ativa',
      description: 'Tutor com pendências abertas. Priorize negociação e comunicação contextual.'
    };
  }

  if (ownerActiveQuotes.value.length > 0) {
    return {
      label: 'Negociação em curso',
      description: 'Há orçamento ativo para o tutor. Bom momento para conversão comercial.'
    };
  }

  if (upcomingAppointments.value.length > 0) {
    return {
      label: 'Assistência programada',
      description: 'Tutor com jornada futura ativa. Ideal para lembrete e pacote preventivo.'
    };
  }

  return {
    label: 'Relacionamento estável',
    description: 'Sem pendências críticas. Use a janela para fidelização e recompra.'
  };
});

const suggestedPackage = computed<SuggestedPackage | null>(() => {
  if (!patient.value) {
    return null;
  }

  if (focalInpatientStay.value) {
    return {
      id: 'recovery-care',
      title: 'Pacote Recuperação Assistida',
      category: 'Pós-internação',
      description: 'Revisões, retornos curtos e monitoramento de evolução após estabilização.',
      reason: 'Paciente com internação recente ou ativa.',
      referenceValue: 680
    };
  }

  if (sortedEncounters.value.length >= 3) {
    return {
      id: 'continuity-clinic',
      title: 'Pacote Continuidade Clínica',
      category: 'Acompanhamento',
      description: 'Monitoramento recorrente para pacientes com histórico assistencial frequente.',
      reason: 'Paciente com recorrência de atendimentos.',
      referenceValue: 720
    };
  }

  if (patient.value.species === 'canine') {
    return {
      id: 'preventive-canine',
      title: 'Pacote Preventivo Canino',
      category: 'Preventivo',
      description: 'Consultas de rotina, janela vacinal e acompanhamento de peso.',
      reason: 'Perfil preventivo canino aderente ao cadastro atual.',
      referenceValue: 360
    };
  }

  if (patient.value.species === 'feline') {
    return {
      id: 'preventive-feline',
      title: 'Pacote Cuidado Felino',
      category: 'Preventivo',
      description: 'Retornos estruturados, revisão clínica e lembretes de prevenção.',
      reason: 'Paciente felino com oportunidade de rotina assistida.',
      referenceValue: 340
    };
  }

  return {
    id: 'baseline-care',
    title: 'Pacote Base de Acompanhamento',
    category: 'Relacionamento',
    description: 'Estrutura mínima de retornos e comunicação clínica para fidelização.',
    reason: 'Paciente ativo com oportunidade de relacionamento contínuo.',
    referenceValue: 290
  };
});

const contextualMessages = computed<ContextualMessage[]>(() => {
  if (!patient.value) {
    return [];
  }

  const ownerLabel = ownerSnapshot.value?.fullName || ownerName.value;
  const nextAppointment = upcomingAppointments.value[0];
  const messages: ContextualMessage[] = [];

  if (nextAppointment) {
    messages.push({
      id: 'appointment-reminder',
      title: 'Lembrete de retorno',
      preview: `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`
      )
    });
  }

  if (suggestedPackage.value) {
    messages.push({
      id: 'package-offer',
      title: 'Oferta de pacote',
      preview: `${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. ${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`
      )
    });
  }

  if (ownerOpenBillingAmount.value > 0) {
    messages.push({
      id: 'billing-followup',
      title: 'Follow-up financeiro',
      preview: `Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`
      )
    });
  }

  if (messages.length === 0) {
    messages.push({
      id: 'relationship',
      title: 'Mensagem de acompanhamento',
      preview: `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`,
      href: buildWhatsAppLink(
        `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`
      )
    });
  }

  return messages;
});

const patientAlerts = computed<PatientAlert[]>(() => {
  const alerts: PatientAlert[] = [];

  if (!patient.value) {
    return alerts;
  }

  if (patient.value.status === 'deceased') {
    alerts.push({
      title: 'Paciente sinalizado como falecido',
      message: 'Bloqueie novas jornadas assistenciais até validar o cadastro.',
      variant: 'danger'
    });
  } else if (patient.value.status === 'inactive') {
    alerts.push({
      title: 'Cadastro inativo',
      message: 'Confirme o status do paciente antes de abrir novos fluxos.',
      variant: 'warning'
    });
  }

  if (!patient.value.baseWeightKg) {
    alerts.push({
      title: 'Peso base ausente',
      message: 'Cadastre o peso para apoiar triagem, prescrição e acompanhamento.',
      variant: 'warning'
    });
  }

  if (focalEncounter.value) {
    alerts.push({
      title: 'Episódio assistencial em andamento',
      message: `${encounterStatusLabel(focalEncounter.value.status)} desde ${formatDateTime(focalEncounter.value.openedAt)}.`,
      variant: 'info'
    });
  }

  if (focalTriage.value?.priority === 'critical') {
    alerts.push({
      title: 'Triagem crítica',
      message: 'Prioridade máxima registrada para o atendimento atual.',
      variant: 'danger'
    });
  }

  if (focalInpatientStay.value) {
    alerts.push({
      title: 'Paciente internado',
      message: `${focalInpatientStay.value.ward} / ${focalInpatientStay.value.bed} em ${inpatientStatusLabel(focalInpatientStay.value.status)}.`,
      variant: 'warning'
    });
  }

  if (upcomingAppointments.value.length > 0) {
    alerts.push({
      title: 'Agenda futura confirmada',
      message: `Próximo compromisso em ${formatDateTime(upcomingAppointments.value[0].scheduledAt)}.`,
      variant: 'success'
    });
  }

  if (patientRecords.value.length === 0) {
    alerts.push({
      title: 'Sem prontuário longitudinal',
      message: 'Ainda não há registros clínicos consolidados para este paciente.',
      variant: 'info'
    });
  }

  if (ownerOpenBillingAmount.value > 0) {
    alerts.push({
      title: 'Tutor com pendência financeira',
      message: `Há ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} em aberto no relacionamento.`,
      variant: 'warning'
    });
  }

  if (ownerActiveQuotes.value.length > 0) {
    alerts.push({
      title: 'Oportunidade comercial ativa',
      message: `${ownerActiveQuotes.value.length} orçamento(s) vinculados ao tutor podem ser trabalhados neste episódio.`,
      variant: 'info'
    });
  }

  return alerts;
});

const combinedTimeline = computed<TimelineFeedItem[]>(() => {
  const encounterItems = focalEncounterTimeline.value.map((event) => ({
    id: `enc-${event.id}`,
    title: event.summary,
    description: 'Evento operacional do atendimento',
    occurredAt: event.occurredAt,
    source: 'Atendimento'
  }));

  const clinicalItems = focalClinicalTimeline.value.map((event) => ({
    id: `mr-${event.id}`,
    title: event.summary,
    description: clinicalEventLabel(event.eventType),
    occurredAt: event.occurredAt,
    source: 'Prontuário'
  }));

  return [...encounterItems, ...clinicalItems]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);
});

function registerWarning(scope: string) {
  if (!relatedWarnings.value.includes(scope)) {
    relatedWarnings.value.push(scope);
  }
}

function resetRelatedState() {
  relatedWarnings.value = [];
  patientSummary.value = null;
  ownerSnapshot.value = null;
  ownerBillingRecords.value = [];
  ownerQuotes.value = [];
  patientAppointments.value = [];
  patientEncounters.value = [];
  patientRecords.value = [];
  focalRecordEntries.value = [];
  patientClinicalEntries.value = [];
  focalEncounterTimeline.value = [];
  focalClinicalTimeline.value = [];
  patientAttachments.value = [];
  patientDiagnosticOrders.value = [];
  patientPrescriptions.value = [];
  patientPreventiveEvents.value = [];
  patientInpatientStays.value = [];
  focalTriage.value = null;
  focalInpatientStay.value = null;
  focalBilling.value = null;
  focalBillingItems.value = [];
  actionError.value = '';
  actionMessage.value = '';
  clinicalHistoryDraft.value = '';
}

function patientStatusVariant(status: PatientStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') {
    return 'success';
  }
  return status === 'deceased' ? 'danger' : 'warning';
}

function encounterStatusVariant(status: EncounterStatus): 'info' | 'warning' | 'success' {
  if (status === 'closed') {
    return 'success';
  }
  return status === 'reception' || status === 'observation' ? 'warning' : 'info';
}

function triagePriorityLabel(priority: TriagePriority): string {
  return {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  }[priority];
}

function medicalRecordStatusLabel(status: MedicalRecordStatus): string {
  return status === 'open' ? 'Aberto' : 'Concluído';
}

function billingStatusLabel(status: BillingStatus): string {
  return {
    draft: 'Rascunho',
    estimated: 'Estimado',
    open: 'Aberto',
    settled: 'Liquidado'
  }[status];
}

function billingItemTypeLabel(type: BillingItemType): string {
  return {
    service: 'Serviço',
    supply: 'Material',
    procedure: 'Procedimento',
    exam: 'Exame',
    daily_rate: 'Diária',
    other: 'Outro'
  }[type];
}

function preventiveStatusLabel(status: PreventiveEventStatus): string {
  return status === 'executed' ? 'Executada' : 'Agendada';
}

function preventiveEventMeta(event: PreventiveEventSummary): string {
  return [
    preventiveItemTypeLabel(event.itemType),
    preventiveStatusLabel(event.status),
    event.clientName || ownerName.value
  ].join(' · ');
}

function inpatientStatusLabel(status: InpatientStatus): string {
  return {
    admitted: 'Admitido',
    stable: 'Estável',
    transferred: 'Transferido',
    discharged: 'Alta'
  }[status];
}

function diagnosticStatusLabel(status: DiagnosticOrderSummary['status']): string {
  return {
    requested: 'Solicitado',
    collected: 'Coletado',
    resulted: 'Resultado',
    cancelled: 'Cancelado'
  }[status];
}

function clinicalEntryTypeLabel(entryType: ClinicalEntrySummary['entryType']): string {
  return {
    anamnesis: 'Anamnese',
    physical_exam: 'Exame físico',
    progress_note: 'Evolução',
    assessment: 'Avaliação',
    plan: 'Plano',
    prescription: 'Prescrição',
    conduct: 'Conduta'
  }[entryType];
}

function clinicalEventLabel(eventType: ClinicalTimelineEventSummary['eventType']): string {
  return {
    record_created: 'Prontuário criado',
    entry_added: 'Entrada adicionada',
    entry_updated: 'Entrada atualizada',
    entry_archived: 'Entrada arquivada',
    attachment_added: 'Anexo adicionado',
    inpatient_admitted: 'Internação iniciada',
    inpatient_progressed: 'Evolução hospitalar',
    surgery_requested: 'Cirurgia solicitada',
    surgery_status_changed: 'Status cirúrgico alterado',
    diagnostic_requested: 'Diagnóstico solicitado',
    diagnostic_collected: 'Coleta realizada',
    diagnostic_resulted: 'Resultado liberado',
    inpatient_transferred: 'Transferência hospitalar',
    inpatient_discharged: 'Alta da internação',
    surgery_pre_op: 'Pré-operatório',
    surgery_in_progress: 'Cirurgia em andamento'
  }[eventType];
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function buildWhatsAppLink(message: string): string | null {
  if (!ownerWhatsAppLink.value) {
    return null;
  }

  return `${ownerWhatsAppLink.value}?text=${encodeURIComponent(message)}`;
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

async function saveClinicalHistory() {
  if (!focalEncounter.value || !patient.value) {
    return;
  }

  savingClinicalHistory.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    const content = clinicalHistoryDraft.value.trim();
    const existing = clinicalHistoryEntry.value;
    const saved = existing
      ? await medicalRecordsService.updateEntry(existing.id, {
          content,
          reason: 'Atualização do histórico clínico longitudinal',
          expectedVersion: existing.version
        })
      : await medicalRecordsService.createEntry({
          encounterId: focalEncounter.value.id,
          patientId: patient.value.id,
          entryType: 'progress_note',
          title: 'Histórico clínico longitudinal',
          content
        });

    patientClinicalEntries.value = uniqueById([saved, ...patientClinicalEntries.value]);
    focalRecordEntries.value = uniqueById([saved, ...focalRecordEntries.value]);
    clinicalHistoryDraft.value = saved.content;
    actionMessage.value = 'Histórico clínico atualizado.';
  } catch (caughtError) {
    actionError.value =
      caughtError instanceof Error ? caughtError.message : 'Erro ao salvar histórico clínico';
  } finally {
    savingClinicalHistory.value = false;
  }
}

async function createSuggestedPackageQuote() {
  if (!ownerSnapshot.value || !suggestedPackage.value || !patient.value) {
    return;
  }

  creatingPackageQuote.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    const createdQuote = await quoteService.create({
      ownerId: ownerSnapshot.value.id,
      notes: `Pacote sugerido para ${patient.value.name}: ${suggestedPackage.value.title}. Motivo: ${suggestedPackage.value.reason}. Valor referência: ${formatCurrency(suggestedPackage.value.referenceValue, 'BRL')}.`
    });
    ownerQuotes.value = [createdQuote, ...ownerQuotes.value];
    actionMessage.value = `Orçamento ${createdQuote.number} criado para ${patient.value.name}.`;
  } catch (caughtError) {
    actionError.value =
      caughtError instanceof Error ? caughtError.message : 'Erro ao criar orçamento do pacote';
  } finally {
    creatingPackageQuote.value = false;
  }
}

async function loadPage() {
  if (!patientId.value) {
    error.value = 'Paciente inválido';
    return;
  }

  loading.value = true;
  error.value = '';
  ownerName.value = '—';
  patient.value = null;
  resetRelatedState();

  try {
    const loadedPatient = await patientService.getById(patientId.value);
    patient.value = loadedPatient;

    const [
      encountersResult,
      appointmentsResult,
      recordsResult,
      patientSummaryResult,
      ownerResult,
      ownerSnapshotResult,
      ownerBillingResult,
      ownerQuotesResult,
      diagnosticOrdersResult,
      prescriptionsResult,
      preventiveEventsResult,
      inpatientStaysResult
    ] = await Promise.allSettled([
      encounterService.list(),
      appointmentService.list({ patientId: loadedPatient.id }),
      medicalRecordsService.listAll(),
      patientService.getSummary(loadedPatient.id),
      getOwnerName(loadedPatient.primaryOwnerId),
      ownerService.getById(loadedPatient.primaryOwnerId),
      billingService.list({ ownerId: loadedPatient.primaryOwnerId }),
      quoteService.list(),
      laboratoryService.listOrders({ patientId: loadedPatient.id }),
      prescriptionsService.listByPatient(loadedPatient.id),
      vaccinesDewormersService.list({
        patientId: loadedPatient.id,
        ownerId: loadedPatient.primaryOwnerId,
        includeExecuted: true
      }),
      inpatientService.list({
        patientId: loadedPatient.id,
        includeDischarged: true
      })
    ]);

    if (encountersResult.status === 'fulfilled') {
      patientEncounters.value = encountersResult.value.filter(
        (encounter) => encounter.patientId === loadedPatient.id
      );
    } else {
      registerWarning('atendimentos');
    }

    if (appointmentsResult.status === 'fulfilled') {
      patientAppointments.value = appointmentsResult.value.filter(
        (appointment) => appointment.patientId === loadedPatient.id
      );
    } else {
      registerWarning('agenda');
    }

    if (recordsResult.status === 'fulfilled') {
      const patientEncounterIds = new Set(patientEncounters.value.map((encounter) => encounter.id));
      patientRecords.value = recordsResult.value.filter(
        (record) =>
          record.record.patientId === loadedPatient.id ||
          patientEncounterIds.has(record.record.encounterId)
      );
    } else {
      registerWarning('prontuário');
    }

    if (patientSummaryResult.status === 'fulfilled') {
      patientSummary.value = patientSummaryResult.value;
    } else {
      registerWarning('patient-summary');
    }

    if (ownerResult.status === 'fulfilled') {
      ownerName.value = ownerResult.value;
    } else {
      registerWarning('tutor principal');
    }

    if (ownerSnapshotResult.status === 'fulfilled') {
      ownerSnapshot.value = ownerSnapshotResult.value;
    } else {
      registerWarning('snapshot do tutor');
    }

    if (ownerBillingResult.status === 'fulfilled') {
      ownerBillingRecords.value = ownerBillingResult.value.filter(
        (record) => record.ownerId === loadedPatient.primaryOwnerId
      );
    } else {
      registerWarning('financeiro do tutor');
    }

    if (ownerQuotesResult.status === 'fulfilled') {
      ownerQuotes.value = ownerQuotesResult.value.filter(
        (quote) => quote.ownerId === loadedPatient.primaryOwnerId
      );
    } else {
      registerWarning('orçamentos do tutor');
    }

    if (diagnosticOrdersResult.status === 'fulfilled') {
      patientDiagnosticOrders.value = diagnosticOrdersResult.value.filter(
        (order) => order.patientId === loadedPatient.id
      );
    } else {
      registerWarning('pedidos de exame');
    }

    if (prescriptionsResult.status === 'fulfilled') {
      patientPrescriptions.value = prescriptionsResult.value;
    } else {
      registerWarning('receituário');
    }

    if (preventiveEventsResult.status === 'fulfilled') {
      patientPreventiveEvents.value = preventiveEventsResult.value.filter(
        (event) => event.patientId === loadedPatient.id || event.animalName === loadedPatient.name
      );
    } else {
      registerWarning('vacinas e vermífugos');
    }

    if (inpatientStaysResult.status === 'fulfilled') {
      patientInpatientStays.value = inpatientStaysResult.value.filter(
        (stay) => stay.patientId === loadedPatient.id
      );
    } else {
      registerWarning('internação');
    }

    if (patientRecords.value.length > 0 || patientDiagnosticOrders.value.length > 0) {
      const [entriesResults, recordAttachmentResults, diagnosticAttachmentResults] = await Promise.all([
        Promise.allSettled(
          patientRecords.value.map((record) =>
            medicalRecordsService.listEntries(record.record.encounterId)
          )
        ),
        Promise.allSettled(
          patientRecords.value.map((record) =>
            attachmentService.list('medical_record', record.record.id)
          )
        ),
        Promise.allSettled(
          patientDiagnosticOrders.value.map((order) =>
            attachmentService.list('diagnostic_order', order.id)
          )
        )
      ]);

      patientClinicalEntries.value = uniqueById(
        entriesResults.flatMap((result) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          registerWarning('histórico clínico longitudinal');
          return [];
        })
      );

      const recordAttachments = recordAttachmentResults.flatMap((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        registerWarning('anexos clínicos');
        return [];
      });

      const diagnosticAttachments = diagnosticAttachmentResults.flatMap((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        registerWarning('anexos de exames');
        return [];
      });

      patientAttachments.value = uniqueById([...recordAttachments, ...diagnosticAttachments]);

      clinicalHistoryDraft.value = clinicalHistoryEntry.value?.content ?? '';
    }

    focalInpatientStay.value =
      sortedInpatientStays.value.find((stay) => stay.status !== 'discharged') ??
      sortedInpatientStays.value[0] ??
      null;

    const selectedEncounter = activeEncounters.value[0] ?? sortedEncounters.value[0] ?? null;
    if (!selectedEncounter) {
      return;
    }

    const hasRecord = patientRecords.value.some(
      (record) => record.record.encounterId === selectedEncounter.id
    );

    const [encounterTimelineResult, triageResult, billingResult] =
      await Promise.allSettled([
        encounterService.getTimeline(selectedEncounter.id),
        listTriageRecords(selectedEncounter.id),
        billingService.list({ encounterId: selectedEncounter.id, patientId: loadedPatient.id })
      ]);

    let entriesResult: PromiseSettledResult<ClinicalEntrySummary[]> | undefined;
    let clinicalTimelineResult: PromiseSettledResult<ClinicalTimelineEventSummary[]> | undefined;

    if (hasRecord) {
      [entriesResult, clinicalTimelineResult] = await Promise.allSettled([
        medicalRecordsService.listEntries(selectedEncounter.id),
        medicalRecordsService.getTimeline(selectedEncounter.id)
      ] as const);
    }

    if (encounterTimelineResult?.status === 'fulfilled') {
      focalEncounterTimeline.value = encounterTimelineResult.value;
    } else if (encounterTimelineResult) {
      registerWarning('timeline do atendimento');
    }

    if (triageResult?.status === 'fulfilled') {
      focalTriage.value = triageResult.value[0] ?? null;
    } else if (triageResult) {
      registerWarning('triagem');
    }

    if (billingResult?.status === 'fulfilled') {
      focalBilling.value = billingResult.value[0] ?? null;
      if (focalBilling.value) {
        try {
          focalBillingItems.value = await billingService.listItems(selectedEncounter.id);
        } catch {
          focalBillingItems.value = [];
          registerWarning('itens da comanda');
        }
      }
    } else if (billingResult) {
      registerWarning('financeiro');
    }

    if (entriesResult?.status === 'fulfilled') {
      focalRecordEntries.value = entriesResult.value;
    } else if (entriesResult) {
      registerWarning('entradas clínicas');
    }

    if (clinicalTimelineResult?.status === 'fulfilled') {
      focalClinicalTimeline.value = clinicalTimelineResult.value;
    } else if (clinicalTimelineResult) {
      registerWarning('timeline do prontuário');
    }
  } catch (caughtError) {
    error.value = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar paciente';
  } finally {
    loading.value = false;
  }
}

watch(
  patientId,
  () => {
    void loadPage();
  },
  { immediate: true }
);
</script>

<style scoped>
.patient-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-loading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-loading__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vetus-empty-state {
  display: grid;
  gap: 8px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  background: #f8fafc;
}

.vetus-empty-state strong {
  color: var(--color-text, #0f172a);
}

.vetus-empty-state p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  line-height: 1.45;
}

.vetus-animal-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.vetus-profile-card,
.vetus-accordion-card {
  border: 1px solid #dde5ef;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.06);
}

.vetus-profile-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.vetus-profile-card__identity {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.animal-avatar {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border: 2px solid #99b83f;
  border-radius: 50%;
  background: #eef5dd;
  color: #79940f;
  font-size: 1.8rem;
  font-weight: 800;
}

.animal-headline {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.animal-kicker {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.animal-title {
  color: #0f172a;
  font-size: 1.25rem;
  line-height: 1.15;
}

.animal-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.animal-summary-chips span {
  max-width: 100%;
  padding: 3px 7px;
  border: 1px solid #dbe4ef;
  border-radius: 4px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.animal-headline p,
.vetus-profile-section p {
  margin: 0;
}

.animal-headline strong,
.vetus-profile-section strong {
  font-weight: 800;
}

.vetus-profile-actions,
.vetus-profile-footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #dde5ef;
}

.vetus-danger-action {
  min-height: 40px;
  border: 0;
  background: transparent;
  color: #d73333;
  font: inherit;
  font-weight: 800;
}

.vetus-danger-action:disabled {
  opacity: 0.75;
}

.vetus-disabled-action {
  min-height: 32px;
  border: 1px solid #d8e2ef;
  border-radius: 4px;
  background: #f8fafc;
  color: #8a98aa;
  font: inherit;
  font-weight: 800;
}

.vetus-critical-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 10px;
  border: 1px solid #f3c7c7;
  border-radius: 4px;
  background: #fff7f7;
}

.vetus-critical-list div,
.vetus-profile-section {
  display: grid;
  gap: 4px;
}

.vetus-critical-list span,
.vetus-info-grid span {
  color: #7b8493;
  font-size: 0.78rem;
  font-weight: 700;
}

.vetus-critical-list strong {
  color: #c92626;
  font-size: 0.88rem;
  line-height: 1.25;
}

.vetus-owner-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid #dde5ef;
  border-radius: 4px;
  background: #f8fafc;
}

.vetus-owner-strip div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.vetus-owner-strip span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
}

.vetus-owner-strip strong {
  min-width: 0;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.vetus-disclosure {
  display: flex;
  width: 100%;
  min-height: 34px;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #2f6fc7;
  font: inherit;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.vetus-disclosure--soft {
  padding-inline: 10px;
  background: #eef5ff;
}

.vetus-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.vetus-info-grid div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.vetus-info-grid strong,
.vetus-owner-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.vetus-owner-name {
  padding: 10px;
  border-radius: 4px;
  background: #e9ecf4;
  font-weight: 800;
}

.vetus-module-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 10px;
}

.vetus-accordion-card {
  display: grid;
  min-width: 0;
  overflow: hidden;
}

.vetus-accordion-card--wide {
  grid-column: 1 / -1;
}

.vetus-accordion-card--open {
  grid-column: 1 / -1;
  border-color: #cbd5e1;
  box-shadow: 0 8px 18px rgba(30, 41, 59, 0.08);
}

.vetus-accordion-card__header {
  display: flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 0;
  padding: 10px 14px;
  background: #ffffff;
  color: #1f2937;
  font: inherit;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.vetus-accordion-card__header > span:first-child {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.vetus-module-icon {
  display: inline-grid;
  width: 24px;
  place-items: center;
  color: #a2a8b3;
  font-weight: 800;
}

.vetus-accordion-card__header span:last-child {
  display: inline-grid;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 2px solid #fb8c21;
  border-radius: 3px;
  color: #fb8c21;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1;
}

.vetus-accordion-card__header:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.3);
  outline-offset: -3px;
}

.vetus-accordion-card__summary {
  display: grid;
  gap: 4px;
  min-height: 58px;
  padding: 10px 14px 8px;
}

.vetus-accordion-card__summary strong,
.vetus-accordion-card__summary p {
  min-width: 0;
  overflow-wrap: anywhere;
}

.vetus-accordion-card__summary p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 0.875rem;
  line-height: 1.45;
}

.vetus-accordion-card__body {
  display: grid;
  gap: 14px;
  padding: 0 18px 18px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.vetus-accordion-card__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 14px 14px;
}

.vetus-module-summary {
  display: grid;
  gap: 4px;
  padding-top: 14px;
}

.relationship-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item__label {
  color: #6b7280;
  font-size: 0.875rem;
}

.workspace-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.workspace-highlight {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.entry-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
}

.entry-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.entry-metric__value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.entry-metric__label {
  font-size: 0.8125rem;
  color: #6b7280;
}

.info-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-left: 4px solid #2563eb;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e3a8a;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.8125rem;
  font-weight: 600;
}

.tag--neutral {
  background: #e5e7eb;
  color: #374151;
}

.timeline-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agenda-groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.agenda-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agenda-group h4 {
  margin: 0;
  color: #374151;
  font-size: 0.88rem;
  font-weight: 700;
}

.timeline-list__item,
.record-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.timeline-list__item:last-child,
.record-list__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.timeline-list__item p,
.record-list__item p {
  margin: 4px 0 0;
  color: #6b7280;
}

.timeline-list__item--stacked {
  align-items: flex-start;
}

.record-list__item--stacked {
  align-items: flex-start;
}

.timeline-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 132px;
}

.weight-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weight-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.segmented-control {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(70px, 1fr));
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.segmented-control button {
  min-height: 34px;
  border: 0;
  border-right: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.segmented-control button:last-child {
  border-right: 0;
}

.segmented-control button.active {
  background: #1f2937;
  color: #fff;
}

.weight-chart {
  width: 100%;
  min-height: 150px;
  color: #2563eb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.clinical-history-field {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #111827;
  font: inherit;
  line-height: 1.5;
}

.clinical-history-preview {
  margin: 0 0 10px;
  color: #374151;
  line-height: 1.5;
}

.clinical-history-field:disabled {
  background: #f9fafb;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #4b5563;
}

.empty-state p,
.muted {
  margin: 0;
  color: #6b7280;
}

@media (max-width: 720px) {
  .vetus-animal-layout,
  .vetus-accordion-grid,
  .relationship-grid {
    grid-template-columns: 1fr;
  }

  .vetus-module-list {
    grid-template-columns: 1fr;
  }

  .vetus-accordion-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-highlight,
  .weight-card__header,
  .timeline-list__item,
  .record-list__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .segmented-control {
    width: 100%;
  }

  .timeline-list__meta {
    align-items: flex-start;
    min-width: auto;
  }
}
</style>
