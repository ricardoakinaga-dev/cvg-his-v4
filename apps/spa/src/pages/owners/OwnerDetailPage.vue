<template>
  <div class="owner-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="70%" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="owner">
      <AppPageHeader :breadcrumbs="['Atendimento', 'Cadastros', 'Clientes', owner.fullName]">
        <template #title>{{ owner.fullName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="owner.status === 'active' ? 'Ativo' : 'Inativo'"
            :variant="owner.status === 'active' ? 'success' : 'danger'"
          />
          <StatusBadge v-if="owner.financialResponsible" label="Resp. Financeiro" variant="info" />
          <span class="muted">Atendimento &gt; Cadastros</span>
          <span class="muted">{{ owner.legacyVetusId ? `Vetus ${owner.legacyVetusId}` : owner.id }}</span>
        </template>
        <template #actions>
          <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="primary">
            Selecionar atendimento para cobrança
          </DsButton>
          <DsButton tag="a" :to="`/patients/new?ownerId=${owner.id}`" variant="primary">
            Cadastrar Novo Animal
          </DsButton>
          <DsButton tag="a" :to="`/owners/${owner.id}/edit`" variant="secondary">Editar Cadastro</DsButton>
          <DsButton tag="a" to="/owners" variant="ghost">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <section class="hub-kpis">
        <DsStatCard :label="`${patients.length} animal(is)`" value="" icon="🐾" />
        <DsStatCard :label="`${upcomingAppointments.length} agendamento(s)`" value="" icon="📅" />
        <DsStatCard :label="`${activeEncounters.length} atendimento(s) ativo(s)`" value="" icon="🩺" />
        <DsStatCard :label="primaryContact(owner)" value="" icon="📞" />
      </section>

      <section v-if="ownerTopAlerts.length > 0" class="hub-alerts">
        <DsAlert
          v-for="(alert, index) in ownerTopAlerts"
          :key="index"
          :variant="alert.variant"
          dismissible
        >
          <strong>{{ alert.title }}</strong> - {{ alert.message }}
        </DsAlert>
      </section>

      <section class="hub-actions">
        <DsCard title="Ações rápidas" variant="compact">
          <div class="quick-actions">
            <DsButton tag="a" :to="`/patients/new?ownerId=${owner.id}`" variant="primary" icon="🐾">
              Cadastrar Novo Animal
            </DsButton>
            <DsButton
              tag="a"
              :to="`/appointments/new?ownerId=${owner.id}`"
              variant="secondary"
              icon="📅"
            >
              Agendar
            </DsButton>
            <DsButton
              tag="a"
              :to="`/patients?ownerId=${encodeURIComponent(owner.id)}`"
              variant="ghost"
              icon="🧾"
            >
              Ver animais deste tutor
            </DsButton>
            <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="secondary" icon="🧾">
              Selecionar atendimento para cobrança
            </DsButton>
            <DsButton
              v-if="whatsappContact"
              :href="whatsappContact"
              variant="secondary"
              icon="💬"
            >
              Abrir WhatsApp externo
            </DsButton>
          </div>
        </DsCard>
      </section>

      <section class="owner-360-cockpit" aria-label="Cockpit 360 tutor e paciente">
        <DsCard title="Cockpit 360 tutor/paciente">
          <div class="owner-360-cockpit__summary">
            <div>
              <span>Jornada assistencial</span>
              <strong>{{ owner360Summary.assistential }}</strong>
            </div>
            <div>
              <span>Financeiro</span>
              <strong>{{ owner360Summary.financial }}</strong>
            </div>
            <div>
              <span>Próxima ação</span>
              <strong>{{ owner360Summary.nextAction }}</strong>
            </div>
          </div>

          <div v-if="patient360Rows.length" class="owner-360-list">
            <article
              v-for="row in patient360Rows"
              :key="row.patient.id"
              class="owner-360-card"
            >
              <div class="owner-360-card__head">
                <div>
                  <span>{{ speciesLabel(row.patient.species) }}</span>
                  <strong>{{ row.patient.name }}</strong>
                  <small>{{ row.patient.breed || 'Raça não informada' }}</small>
                </div>
                <StatusBadge
                  :label="row.healthLabel"
                  :variant="row.healthVariant"
                  size="sm"
                />
              </div>

              <div class="owner-360-card__grid">
                <div>
                  <span>Agenda</span>
                  <strong>{{ row.appointmentLabel }}</strong>
                </div>
                <div>
                  <span>Atendimento</span>
                  <strong>{{ row.encounterLabel }}</strong>
                </div>
                <div>
                  <span>Financeiro</span>
                  <strong>{{ row.financialLabel }}</strong>
                </div>
                <div>
                  <span>Alertas</span>
                  <strong>{{ row.alertLabel }}</strong>
                </div>
                <div>
                  <span>Prevenção</span>
                  <strong>{{ row.preventiveLabel }}</strong>
                </div>
                <div>
                  <span>Laboratório</span>
                  <strong>{{ row.laboratoryLabel }}</strong>
                </div>
              </div>

              <div class="owner-360-card__actions">
                <DsButton tag="a" :to="`/patients/${row.patient.id}`" variant="primary" size="sm">
                  Abrir cockpit do paciente
                </DsButton>
                <DsButton
                  tag="a"
                  :to="row.nextActionPath"
                  variant="secondary"
                  size="sm"
                >
                  {{ row.nextActionLabel }}
                </DsButton>
              </div>
            </article>
          </div>
          <div v-else class="owner-360-empty">
            <strong>Nenhum paciente vinculado ao tutor.</strong>
            <p>Cadastre o primeiro animal para ativar a visão 360 assistencial, financeira e de relacionamento.</p>
            <DsButton tag="a" :to="`/patients/new?ownerId=${owner.id}`" variant="primary" size="sm">
              Cadastrar paciente
            </DsButton>
          </div>
        </DsCard>
      </section>

      <section class="owner-360-timeline" aria-label="Timeline 360 do tutor">
        <DsCard title="Timeline 360 do tutor">
          <div v-if="owner360Timeline.length" class="owner-360-timeline__list">
            <div
              v-for="item in owner360Timeline"
              :key="item.id"
              class="owner-360-timeline__item"
            >
              <div>
                <strong>{{ item.source }} · {{ item.patientName }}</strong>
                <p>{{ item.title }}</p>
                <small>{{ item.description }}</small>
              </div>
              <div class="owner-360-timeline__meta">
                <span>{{ formatDate(item.occurredAt) }}</span>
                <RouterLink v-if="item.href" :to="item.href">Abrir</RouterLink>
              </div>
            </div>
          </div>
          <p v-else class="muted">Sem eventos consolidados para a timeline 360 do tutor.</p>
        </DsCard>
      </section>

      <section class="owner-summary-grid">
        <DsCard title="Ficha do cliente">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Documento</span>
              <strong>{{ owner.documentId || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">ID Vetus</span>
              <strong>{{ owner.legacyVetusId || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Contato principal</span>
              <strong>{{ primaryContact(owner) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cadastro Vetus</span>
              <strong>{{ owner.originalCreatedAt ? formatDate(owner.originalCreatedAt) : 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cadastro</span>
              <strong>{{ formatDate(owner.createdAt) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Atualização</span>
              <strong>{{ formatDate(owner.updatedAt) }}</strong>
            </div>
          </div>
          <p v-if="owner.administrativeNotes" class="note-box">{{ owner.administrativeNotes }}</p>
        </DsCard>

        <DsCard title="Identificação do cliente">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Tipo</span>
              <strong>{{ personTypeLabel }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Sexo</span>
              <strong>{{ ownerSexLabel }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Nascimento</span>
              <strong>
                {{ owner.profile?.birthDate ? formatDate(owner.profile.birthDate) : 'Não informado' }}
              </strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">RG</span>
              <strong>{{ owner.profile?.rg || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Grupo</span>
              <strong>{{ owner.profile?.group || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Recebe SMS?</span>
              <strong>{{ owner.profile?.receiveSms ? 'Sim' : 'Não' }}</strong>
            </div>
          </div>
        </DsCard>

        <DsCard title="Relacionamento">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Animais ativos</span>
              <strong>{{ activePatientsCount }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Contato(s)</span>
              <strong>{{ owner.contacts.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Agenda futura</span>
              <strong>{{ upcomingAppointments.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Atendimentos recentes</span>
              <strong>{{ recentEncounters.length }}</strong>
            </div>
          </div>
        </DsCard>

        <DsCard title="Endereço e contato">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">CEP</span>
              <strong>{{ owner.address?.zipCode || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Endereço</span>
              <strong>{{ ownerAddressLine }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Bairro</span>
              <strong>{{ owner.address?.district || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cidade/UF</span>
              <strong>{{ ownerCityState }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Referência</span>
              <strong>{{ owner.address?.reference || 'Não informado' }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Cód. Município</span>
              <strong>{{ owner.address?.cityCode || 'Não informado' }}</strong>
            </div>
          </div>
        </DsCard>

        <DsCard title="Resgate de pontos e limite">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Pontos disponíveis</span>
              <strong>{{ owner.financialProfile?.availablePoints ?? 0 }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Pontos bloqueados</span>
              <strong>{{ owner.financialProfile?.blockedPoints ?? 0 }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Saldo em crédito</span>
              <strong>{{ formatCurrency(owner.financialProfile?.creditBalance ?? 0) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Pode dever até</span>
              <strong>{{ formatCurrency(owner.financialProfile?.allowedDebtLimit ?? 0) }}</strong>
            </div>
          </div>
        </DsCard>

        <DsCard title="Resumo do cadastro">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Animais no resumo</span>
              <strong>{{ ownerSummary?.stats.totalPatients ?? patients.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Atendimentos registrados</span>
              <strong>{{ ownerSummary?.stats.totalEncounters ?? recentEncounters.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Dados consolidados</span>
              <strong>{{ ownerSummary ? 'Atualizados' : 'Calculados nesta tela' }}</strong>
            </div>
          </div>
        </DsCard>
      </section>

      <section class="vetus-client-grid" aria-label="Hub operacional Vetus-like do cliente">
        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Resgate de Pontos</h2>
            <DsButton tag="a" to="/loyalty" variant="secondary" size="sm">Histórico</DsButton>
          </div>
          <div class="vetus-client-card__metrics">
            <div>
              <span>Disponíveis</span>
              <strong>{{ owner.financialProfile?.availablePoints ?? loyaltyPoints }}</strong>
            </div>
            <div>
              <span>Bloqueados</span>
              <strong>{{ owner.financialProfile?.blockedPoints ?? 0 }}</strong>
            </div>
          </div>
          <p>Resgate estimado: {{ formatCurrency(redeemableValue) }}</p>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Live Animal e Live Lab</h2>
            <DsButton tag="a" to="/notifications/whatsapp" variant="secondary" size="sm">Configurar</DsButton>
          </div>
          <div class="vetus-client-card__row">
            <span>Canal do cliente</span>
            <strong>{{ whatsappContact ? 'WhatsApp disponível' : 'Sem canal digital' }}</strong>
          </div>
          <div class="vetus-client-card__row">
            <span>Integração laboratorial</span>
            <strong>{{ labContextLabel }}</strong>
          </div>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Agenda</h2>
            <DsButton tag="a" to="/appointments" variant="secondary" size="sm">Histórico</DsButton>
          </div>
          <div class="vetus-client-card__row">
            <span>Próximo atendimento</span>
            <strong>{{ nextAppointmentLabel }}</strong>
          </div>
          <div class="vetus-client-card__row">
            <span>Paciente</span>
            <strong>{{ nextAppointment ? patientName(nextAppointment.patientId) : 'Não informado' }}</strong>
          </div>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Comandas e Vendas</h2>
            <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="secondary" size="sm">Selecionar atendimento</DsButton>
          </div>
          <div class="vetus-client-card__metrics">
            <div>
              <span>Total</span>
              <strong>{{ ownerBillingRecords.length }}</strong>
            </div>
            <div>
              <span>Em aberto</span>
              <strong>{{ openBillingRecordsCount }}</strong>
            </div>
          </div>
          <p>Movimento: {{ formatCurrency(ownerBillingTotalAmount) }}</p>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Pacotes</h2>
            <DsButton tag="a" to="/packages" variant="secondary" size="sm">Histórico</DsButton>
          </div>
          <div class="vetus-client-card__metrics">
            <div>
              <span>Sugeridos</span>
              <strong>{{ packageRecommendations.length }}</strong>
            </div>
            <div>
              <span>Convertidos</span>
              <strong>{{ activeQuotes.length }}</strong>
            </div>
          </div>
          <p>{{ packageRecommendations[0]?.title || 'Sem pacote sugerido no momento.' }}</p>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Orçamentos</h2>
            <DsButton tag="a" to="/quotes" variant="secondary" size="sm">Histórico</DsButton>
          </div>
          <div class="vetus-client-card__metrics">
            <div>
              <span>Ativos</span>
              <strong>{{ activeQuotes.length }}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{{ ownerQuotes.length }}</strong>
            </div>
          </div>
          <p>{{ lastQuoteLabel }}</p>
        </article>

        <article class="vetus-client-card">
          <div class="vetus-client-card__header">
            <h2>Situação Financeira</h2>
            <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="secondary" size="sm">Selecionar atendimento</DsButton>
          </div>
          <div class="vetus-client-card__metrics">
            <div>
              <span>Crédito</span>
              <strong>{{ formatCurrency(owner.financialProfile?.creditBalance ?? 0) }}</strong>
            </div>
            <div>
              <span>Pendente</span>
              <strong>{{ formatCurrency(openBillingAmount) }}</strong>
            </div>
          </div>
          <p>Limite: {{ formatCurrency(owner.financialProfile?.allowedDebtLimit ?? 0) }}</p>
        </article>
      </section>

      <section v-if="relatedWarnings.length > 0" class="hub-alerts">
        <DsAlert variant="info" dismissible>
          <strong>Visão parcial</strong> - Alguns blocos enterprise não responderam: {{ relatedWarnings.join(', ') }}.
        </DsAlert>
      </section>

      <section v-if="actionError || actionMessage" class="hub-alerts">
        <DsAlert v-if="actionError" variant="danger" dismissible @dismiss="actionError = ''">
          {{ actionError }}
        </DsAlert>
        <DsAlert v-if="actionMessage" variant="success" dismissible @dismiss="actionMessage = ''">
          {{ actionMessage }}
        </DsAlert>
      </section>

      <section v-if="ownerOpportunityAlerts.length > 0" class="hub-alerts">
        <DsAlert
          v-for="(alert, index) in ownerOpportunityAlerts"
          :key="index"
          :variant="alert.variant"
          dismissible
        >
          <strong>{{ alert.title }}</strong> - {{ alert.message }}
        </DsAlert>
      </section>

      <section class="owner-detail-page__grid">
        <DsCard title="CRM financeiro">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Estágio CRM</span>
              <strong>{{ crmStage.label }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Tier</span>
              <strong>{{ loyaltyTier.label }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Pontos</span>
              <strong>{{ loyaltyPoints }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Resgate estimado</span>
              <strong>{{ formatCurrency(redeemableValue) }}</strong>
            </div>
          </div>
          <p class="note-box note-box--info">
            {{ crmStage.description }}
          </p>
        </DsCard>

        <DsCard title="Comandas e Vendas">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-item__label">Faturamentos</span>
              <strong>{{ ownerBillingRecords.length }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Em aberto</span>
              <strong>{{ formatCurrency(openBillingAmount) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Liquidado</span>
              <strong>{{ formatCurrency(settledBillingAmount) }}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-item__label">Orçamentos ativos</span>
              <strong>{{ activeQuotes.length }}</strong>
            </div>
          </div>

          <div class="quick-actions">
            <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="secondary" size="sm">Selecionar atendimento para cobrança</DsButton>
            <DsButton tag="a" to="/quotes" variant="secondary" size="sm">Abrir orçamentos</DsButton>
            <DsButton
              variant="ghost"
              size="sm"
              :disabled="Boolean(pendingQuoteConfirmation)"
              @click="requestRelationshipQuoteConfirmation"
            >
              Gerar orçamento-base
            </DsButton>
          </div>
          <div
            v-if="pendingQuoteConfirmation?.kind === 'relationship'"
            class="quote-confirmation"
            role="group"
            aria-label="Confirmação de orçamento-base"
          >
            <strong>Confirmar criação de orçamento</strong>
            <p><span>Tutor:</span> {{ owner.fullName }}</p>
            <p><span>Tipo:</span> {{ pendingQuoteConfirmation.title }}</p>
            <p><span>Observação:</span> {{ pendingQuoteConfirmation.notes }}</p>
            <p v-if="quoteActionError" class="quote-confirmation__error">{{ quoteActionError }}</p>
            <div class="quick-actions">
              <DsButton
                variant="primary"
                size="sm"
                :loading="creatingRelationshipQuote"
                @click="confirmPendingQuote"
              >
                Confirmar criação
              </DsButton>
              <DsButton
                variant="ghost"
                size="sm"
                :disabled="creatingRelationshipQuote"
                @click="cancelPendingQuote"
              >
                Cancelar
              </DsButton>
            </div>
          </div>
        </DsCard>
      </section>

      <section class="owner-detail-page__grid">
        <DsCard title="Contatos">
          <div v-if="owner.contacts.length" class="contacts-list">
            <div v-for="(contact, index) in owner.contacts" :key="index" class="contact-item">
              <div>
                <strong>{{ contact.label }}</strong>
                <p>{{ contact.value }}</p>
              </div>
              <div class="contact-item__badges">
                <StatusBadge
                  v-if="contact.primary"
                  label="Principal"
                  variant="warning"
                  size="sm"
                />
                <StatusBadge
                  v-if="contact.type === 'whatsapp'"
                  label="WhatsApp"
                  variant="success"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <p v-else class="muted">Nenhum contato cadastrado</p>
        </DsCard>

        <DsCard title="Animais Cadastrados">
          <div v-if="patients.length" class="patient-list">
            <div v-for="patient in patients" :key="patient.id" class="patient-list__item">
              <div>
                <strong>{{ patient.name }}</strong>
                <p>
                  {{ speciesLabel(patient.species) }}
                  <span v-if="patient.breed">· {{ patient.breed }}</span>
                </p>
              </div>
              <div class="patient-list__actions">
                <StatusBadge
                  :label="patientStatusLabel(patient.status)"
                  :variant="patient.status === 'active' ? 'success' : 'warning'"
                  size="sm"
                />
                <DsButton tag="a" :to="`/patients/${patient.id}`" size="sm" variant="ghost">
                  Detalhes
                </DsButton>
                <DsButton
                  tag="a"
                  :to="patientFinancialPath(owner.id, patient.id)"
                  size="sm"
                  variant="secondary"
                >
                  {{ patientFinancialActionLabel(patient.id) }}
                </DsButton>
              </div>
            </div>
          </div>
          <p v-else class="muted">Nenhum animal cadastrado.</p>
        </DsCard>
      </section>

      <section class="owner-detail-page__grid">
        <DsCard title="Agenda vinculada">
          <div v-if="upcomingAppointments.length" class="timeline-list">
            <div
              v-for="appointment in upcomingAppointments.slice(0, 4)"
              :key="appointment.id"
              class="timeline-list__item"
            >
              <div>
                <strong>{{ patientName(appointment.patientId) }}</strong>
                <p>{{ appointment.reason }}</p>
              </div>
              <span>{{ formatDate(appointment.scheduledAt) }}</span>
            </div>
          </div>
          <p v-else class="muted">Nenhum agendamento futuro encontrado.</p>
        </DsCard>

        <DsCard title="Últimos atendimentos">
          <div v-if="recentEncounters.length" class="timeline-list">
            <div
              v-for="encounter in recentEncounters.slice(0, 4)"
              :key="encounter.id"
              class="timeline-list__item"
            >
              <div>
                <strong>{{ patientName(encounter.patientId) }}</strong>
                <p>{{ encounter.reason }}</p>
              </div>
              <span>{{ formatDate(encounter.openedAt) }}</span>
            </div>
          </div>
          <p v-else class="muted">Nenhum atendimento encontrado.</p>
        </DsCard>
      </section>

      <section class="owner-detail-page__grid">
        <DsCard title="Pacotes sugeridos">
          <div v-if="packageRecommendations.length" class="package-list">
            <div
              v-for="pkg in packageRecommendations"
              :key="pkg.id"
              class="package-list__item"
            >
              <div>
                <strong>{{ pkg.title }}</strong>
                <p>{{ pkg.description }}</p>
                <span class="package-list__hint">{{ pkg.reason }}</span>
              </div>
              <div class="package-list__actions">
                <strong>{{ formatCurrency(pkg.referenceValue) }}</strong>
                <DsButton
                  variant="secondary"
                  size="sm"
                  :disabled="Boolean(pendingQuoteConfirmation)"
                  @click="requestPackageQuoteConfirmation(pkg)"
                >
                  Criar orçamento
                </DsButton>
              </div>
            </div>
          </div>
          <p v-else class="muted">Ainda não há recomendação de pacote para este relacionamento.</p>
          <div
            v-if="pendingQuoteConfirmation?.kind === 'package'"
            class="quote-confirmation"
            role="group"
            aria-label="Confirmação de orçamento de pacote"
          >
            <strong>Confirmar criação de orçamento</strong>
            <p><span>Tutor:</span> {{ owner.fullName }}</p>
            <p><span>Tipo:</span> {{ pendingQuoteConfirmation.title }}</p>
            <p><span>Observação:</span> {{ pendingQuoteConfirmation.notes }}</p>
            <p v-if="quoteActionError" class="quote-confirmation__error">{{ quoteActionError }}</p>
            <div class="quick-actions">
              <DsButton
                variant="primary"
                size="sm"
                :loading="creatingPackageQuoteId === pendingQuoteConfirmation.packageId"
                @click="confirmPendingQuote"
              >
                Confirmar criação
              </DsButton>
              <DsButton
                variant="ghost"
                size="sm"
                :disabled="Boolean(creatingPackageQuoteId)"
                @click="cancelPendingQuote"
              >
                Cancelar
              </DsButton>
            </div>
          </div>
        </DsCard>

        <DsCard title="Mensageria contextual (rascunhos)">
          <div class="message-list">
            <div
              v-for="message in contextualMessages"
              :key="message.id"
              class="message-list__item"
            >
              <div>
                <strong>{{ message.title }}</strong>
                <p>{{ message.preview }}</p>
              </div>
              <div class="message-list__actions">
                <DsButton
                  v-if="message.href"
                  :href="message.href"
                  variant="secondary"
                  size="sm"
                >
                  Abrir rascunho externo
                </DsButton>
                <DsButton tag="a" to="/notifications/whatsapp" variant="ghost" size="sm">
                  Hub WhatsApp
                </DsButton>
              </div>
            </div>
          </div>
        </DsCard>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { appointmentService } from '@/services/appointment';
import { encounterService } from '@/services/encounter';
import { billingService } from '@/services/billing';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { laboratoryService } from '@/services/laboratory';
import {
  vaccinesDewormersService,
  preventiveItemTypeLabel,
  type PreventiveEventSummary
} from '@/services/vaccinesDewormers';
import type { OwnerSummary } from '@/types/owner';
import type { OwnerSummaryResponse } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import type { AppointmentSummary } from '@/types/appointment';
import type { EncounterSummary } from '@/types/encounter';
import type { BillingRecordSummary } from '@/types/billing';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { formatDate, patientStatusLabel, speciesLabel } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const owner = ref<OwnerSummary | null>(null);
const patients = ref<PatientSummary[]>([]);
const appointments = ref<AppointmentSummary[]>([]);
const encounters = ref<EncounterSummary[]>([]);
const billingRecords = ref<BillingRecordSummary[]>([]);
const quotes = ref<QuoteSummary[]>([]);
const preventiveEvents = ref<PreventiveEventSummary[]>([]);
const laboratoryOrders = ref<DiagnosticOrderSummary[]>([]);
const ownerSummary = ref<OwnerSummaryResponse | null>(null);
const relatedWarnings = ref<string[]>([]);
const actionError = ref('');
const actionMessage = ref('');
const quoteActionError = ref('');
const creatingRelationshipQuote = ref(false);
const creatingPackageQuoteId = ref('');
const loading = ref(true);
const error = ref('');

type PendingQuoteConfirmation =
  | {
      kind: 'relationship';
      title: string;
      notes: string;
    }
  | {
      kind: 'package';
      title: string;
      notes: string;
      packageId: string;
    };

const pendingQuoteConfirmation = ref<PendingQuoteConfirmation | null>(null);

const activePatientsCount = computed(
  () => patients.value.filter((patient) => patient.status === 'active').length
);

const activeEncounters = computed(() =>
  encounters.value.filter((encounter) => encounter.status !== 'closed')
);

const recentEncounters = computed(() =>
  [...encounters.value].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  )
);

const ownerBillingRecords = computed(() => billingRecords.value.filter((record) => record.ownerId === owner.value?.id));
const ownerQuotes = computed(() => quotes.value.filter((quote) => quote.ownerId === owner.value?.id));
const activeQuotes = computed(() =>
  ownerQuotes.value.filter((quote) => quote.status === 'draft' || quote.status === 'approved')
);
const openBillingRecordsCount = computed(
  () => ownerBillingRecords.value.filter((record) => record.status !== 'settled').length
);
const ownerBillingTotalAmount = computed(() =>
  ownerBillingRecords.value.reduce((sum, record) => sum + record.subtotalAmount, 0)
);
const openBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status !== 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);
const settledBillingAmount = computed(() =>
  ownerBillingRecords.value
    .filter((record) => record.status === 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0)
);
const loyaltyPoints = computed(
  () =>
    Math.round(
      settledBillingAmount.value / 20 +
        recentEncounters.value.length * 8 +
        activePatientsCount.value * 12 +
        activeQuotes.value.length * 15
    )
);
const redeemableValue = computed(() => Math.floor(loyaltyPoints.value / 100) * 25);

const personTypeLabel = computed(() => {
  if (owner.value?.profile?.personType === 'company') return 'Jurídica';
  if (owner.value?.profile?.personType === 'individual') return 'Física';
  return 'Não informado';
});

const ownerSexLabel = computed(() => {
  const sex = owner.value?.profile?.sex;
  if (sex === 'female') return 'Feminino';
  if (sex === 'male') return 'Masculino';
  if (sex === 'other') return 'Outro';
  return 'Não informado';
});

const ownerAddressLine = computed(() => {
  const address = owner.value?.address;
  if (!address?.street) return 'Não informado';
  return [address.street, address.number, address.complement].filter(Boolean).join(', ');
});

const ownerCityState = computed(() => {
  const address = owner.value?.address;
  const cityState = [address?.city, address?.state].filter(Boolean).join('/');
  return cityState || 'Não informado';
});

const loyaltyTier = computed(() => {
  if (loyaltyPoints.value >= 300) return { label: 'Platinum', variant: 'success' as const };
  if (loyaltyPoints.value >= 180) return { label: 'Gold', variant: 'info' as const };
  if (loyaltyPoints.value >= 90) return { label: 'Silver', variant: 'warning' as const };
  return { label: 'Start', variant: 'neutral' as const };
});

const crmStage = computed(() => {
  if (openBillingAmount.value > 0) {
    return {
      label: 'Cobrança ativa',
      description: 'Há valores em aberto. Priorize mensagens financeiras e negociação assistida.'
    };
  }

  if (activeQuotes.value.length > 0) {
    return {
      label: 'Negociação',
      description: 'Há orçamento em andamento. Aproveite a janela comercial para conversão.'
    };
  }

  if (upcomingAppointments.value.length > 0) {
    return {
      label: 'Assistência programada',
      description: 'Cliente com agenda futura. Bom momento para lembretes e pacote preventivo.'
    };
  }

  return {
    label: 'Relacionamento',
    description: 'Base ativa sem pendências críticas. Espaço ideal para fidelização e recompra.'
  };
});

const upcomingAppointments = computed(() => {
  const now = Date.now();
  return [...appointments.value]
    .filter((appointment) => new Date(appointment.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
});

const nextAppointment = computed(() => upcomingAppointments.value[0] ?? null);

const nextAppointmentLabel = computed(() => {
  if (!nextAppointment.value) return 'Sem agendamento futuro';
  return `${formatDate(nextAppointment.value.scheduledAt)} - ${nextAppointment.value.reason}`;
});

const diagnosticContextLabel = computed(() =>
  patients.value.length > 0 ? 'Pronto para exames vinculados' : 'Sem animal vinculado'
);

const labContextLabel = computed(() => {
  if (recentEncounters.value.length > 0) return `${recentEncounters.value.length} atendimento(s) no contexto`;
  return diagnosticContextLabel.value;
});

const lastQuoteLabel = computed(() => {
  const quote = [...ownerQuotes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!quote) return 'Nenhum orçamento registrado.';
  return `${quote.number} - ${formatCurrency(quote.total)}`;
});

const whatsappContact = computed(() => {
  if (!owner.value) return null;
  const whatsapp = owner.value.contacts.find((contact) => contact.type === 'whatsapp');
  if (!whatsapp) return null;
  const number = whatsapp.value.replace(/\D/g, '');
  return `https://wa.me/${number}`;
});

interface SuggestedPackage {
  id: string;
  title: string;
  description: string;
  reason: string;
  referenceValue: number;
}

const packageRecommendations = computed<SuggestedPackage[]>(() => {
  const caninePatients = patients.value.filter((patient) => patient.species === 'canine').length;
  const felinePatients = patients.value.filter((patient) => patient.species === 'feline').length;
  const recommendations: SuggestedPackage[] = [];

  if (patients.value.length > 1) {
    recommendations.push({
      id: 'multi-pet',
      title: 'Pacote Multi Animal',
      description: 'Agrupa rotina preventiva, agenda recorrente e acompanhamento centralizado.',
      reason: 'Cliente com mais de um animal cadastrado.',
      referenceValue: 590
    });
  }

  if (caninePatients > 0) {
    recommendations.push({
      id: 'canine-preventive',
      title: 'Pacote Preventivo Canino',
      description: 'Consultas de rotina, janela vacinal e follow-up de peso.',
      reason: 'Há animais caninos ativos no relacionamento.',
      referenceValue: 360
    });
  }

  if (felinePatients > 0) {
    recommendations.push({
      id: 'feline-care',
      title: 'Pacote Cuidado Felino',
      description: 'Retornos estruturados, revisão clínica e lembretes de prevenção.',
      reason: 'Há animais felinos ativos no relacionamento.',
      referenceValue: 340
    });
  }

  if (recentEncounters.value.length >= 3) {
    recommendations.push({
      id: 'continuity',
      title: 'Pacote Continuidade Clínica',
      description: 'Indicador para animais com recorrência de atendimento e monitoramento frequente.',
      reason: 'Relacionamento com histórico clínico recorrente.',
      referenceValue: 720
    });
  }

  return recommendations.slice(0, 3);
});

interface ContextualMessage {
  id: string;
  title: string;
  preview: string;
  href: string | null;
}

interface Owner360TimelineItem {
  id: string;
  source: string;
  patientName: string;
  title: string;
  description: string;
  occurredAt: string;
  href?: string;
}

interface Patient360Row {
  patient: PatientSummary;
  healthLabel: string;
  healthVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  appointmentLabel: string;
  encounterLabel: string;
  financialLabel: string;
  alertLabel: string;
  preventiveLabel: string;
  laboratoryLabel: string;
  nextActionLabel: string;
  nextActionPath: string;
}

const pendingPreventiveEvents = computed(() =>
  preventiveEvents.value.filter((event) => event.status === 'scheduled')
);

const pendingLaboratoryOrders = computed(() =>
  laboratoryOrders.value.filter((order) => order.status === 'requested' || order.status === 'collected')
);

const patient360Rows = computed<Patient360Row[]>(() =>
  patients.value.map((patient) => {
    const patientAppointments = appointments.value
      .filter((appointment) => appointment.patientId === patient.id)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const nextPatientAppointment =
      patientAppointments.find(
        (appointment) => new Date(appointment.scheduledAt).getTime() >= Date.now()
      ) ?? null;
    const activeEncounter = activeEncounterForPatient(patient.id);
    const patientBilling = ownerBillingRecords.value.filter(
      (record) => record.patientId === patient.id
    );
    const patientOpenAmount = patientBilling
      .filter((record) => record.status !== 'settled')
      .reduce((sum, record) => sum + record.subtotalAmount, 0);
    const alertCount = [patient.chronicDisease, patient.allergy, patient.temperament].filter(
      Boolean
    ).length;
    const patientPreventiveEvents = pendingPreventiveEvents.value
      .filter((event) => event.patientId === patient.id)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    const nextPreventiveEvent = patientPreventiveEvents[0] ?? null;
    const patientLaboratoryOrders = pendingLaboratoryOrders.value.filter(
      (order) => order.patientId === patient.id
    );
    const hasCriticalAlert = Boolean(patient.chronicDisease || patient.allergy);
    const nextAction = resolvePatient360NextAction(
      patient,
      nextPatientAppointment,
      activeEncounter,
      patientOpenAmount,
      patientLaboratoryOrders.length
    );

    return {
      patient,
      healthLabel: hasCriticalAlert
        ? 'Atenção clínica'
        : patient.status === 'active'
          ? 'Ativo'
          : patientStatusLabel(patient.status),
      healthVariant: hasCriticalAlert ? 'warning' : patient.status === 'active' ? 'success' : 'danger',
      appointmentLabel: nextPatientAppointment
        ? `${formatDate(nextPatientAppointment.scheduledAt)} · ${nextPatientAppointment.reason}`
        : 'Sem agenda futura',
      encounterLabel: activeEncounter
        ? `${activeEncounter.reason} · ${activeEncounter.status}`
        : 'Sem atendimento ativo',
      financialLabel:
        patientOpenAmount > 0 ? `${formatCurrency(patientOpenAmount)} em aberto` : 'Sem pendência',
      alertLabel:
        alertCount > 0 ? `${alertCount} alerta(s) no cadastro` : 'Sem alertas clínicos',
      preventiveLabel: nextPreventiveEvent
        ? `${preventiveItemTypeLabel(nextPreventiveEvent.itemType)} · ${nextPreventiveEvent.description}`
        : 'Sem preventivo pendente',
      laboratoryLabel:
        patientLaboratoryOrders.length > 0
          ? `${patientLaboratoryOrders.length} exame(s) pendente(s)`
          : 'Sem exames pendentes',
      nextActionLabel: nextAction.label,
      nextActionPath: nextAction.path
    };
  })
);

const owner360Summary = computed(() => {
  const patientsCount = patients.value.length;
  const activeCount = activePatientsCount.value;
  const openEncounters = activeEncounters.value.length;
  const nextAction =
    patient360Rows.value.find((row) => row.nextActionLabel !== 'Abrir cockpit do paciente')
      ?.nextActionLabel ?? 'Acompanhar relacionamento';

  return {
    assistential: [
      `${activeCount}/${patientsCount} paciente(s) ativo(s)`,
      `${openEncounters} atendimento(s)`,
      `${pendingPreventiveEvents.value.length} preventivo(s)`,
      `${pendingLaboratoryOrders.value.length} exame(s)`
    ].join(' · '),
    financial:
      openBillingAmount.value > 0
        ? `${formatCurrency(openBillingAmount.value)} em aberto`
        : 'Sem pendência financeira',
    nextAction
  };
});

const contextualMessages = computed<ContextualMessage[]>(() => {
  const contactBase = whatsappContact.value;
  const firstPatient = patients.value[0];
  const firstAppointment = upcomingAppointments.value[0];
  const quote = activeQuotes.value[0];

  const messages: ContextualMessage[] = [];

  if (firstAppointment && firstPatient) {
    messages.push({
      id: 'reminder',
      title: 'Lembrete de agenda',
      preview: `Olá, ${owner.value?.fullName}. Confirmando o agendamento de ${firstPatient.name} em ${formatDate(firstAppointment.scheduledAt)}.`,
      href: contactBase
        ? buildWhatsAppLink(
            `Olá, ${owner.value?.fullName}. Confirmando o agendamento de ${firstPatient.name} em ${formatDate(firstAppointment.scheduledAt)}.`
          )
        : null
    });
  }

  if (quote) {
    messages.push({
      id: 'quote-followup',
      title: 'Follow-up comercial',
      preview: `Seu orçamento ${quote.number} está pronto para continuidade. Posso apoiar na conversão?`,
      href: contactBase
        ? buildWhatsAppLink(
            `Olá, ${owner.value?.fullName}. Seu orçamento ${quote.number} está pronto para continuidade. Posso apoiar na conversão?`
          )
        : null
    });
  }

  if (openBillingAmount.value > 0) {
    messages.push({
      id: 'billing',
      title: 'Cobrança contextual',
      preview: `Identificamos pendências financeiras no valor de ${formatCurrency(openBillingAmount.value)}. Podemos alinhar a melhor condição?`,
      href: contactBase
        ? buildWhatsAppLink(
            `Olá, ${owner.value?.fullName}. Identificamos pendências financeiras no valor de ${formatCurrency(openBillingAmount.value)}. Podemos alinhar a melhor condição?`
          )
        : null
    });
  }

  if (messages.length === 0) {
    messages.push({
      id: 'relationship',
      title: 'Régua de relacionamento',
      preview: `Relacionamento estável. Envie uma mensagem de acompanhamento e fidelização.`,
      href: contactBase
        ? buildWhatsAppLink(
            `Olá, ${owner.value?.fullName}. Passando para acompanhar como estão os animais e se podemos apoiar em algo mais.`
          )
        : null
    });
  }

  return messages;
});

const owner360Timeline = computed<Owner360TimelineItem[]>(() => {
  const appointmentItems = appointments.value.map((appointment) => ({
    id: `appointment-${appointment.id}`,
    source: 'Agenda',
    patientName: patientName(appointment.patientId),
    title: appointment.reason,
    description: appointment.status,
    occurredAt: appointment.scheduledAt,
    href: `/appointments/${appointment.id}`
  }));

  const encounterItems = encounters.value.map((encounter) => ({
    id: `encounter-${encounter.id}`,
    source: 'Atendimento',
    patientName: patientName(encounter.patientId),
    title: encounter.reason,
    description: encounter.status,
    occurredAt: encounter.openedAt,
    href: `/encounters/${encounter.id}`
  }));

  const billingItems = ownerBillingRecords.value.map((record) => ({
    id: `billing-${record.id}`,
    source: 'Financeiro',
    patientName: patientName(record.patientId),
    title: `${formatCurrency(record.subtotalAmount)} · ${record.status}`,
    description: record.administrativeNotes || 'Comanda vinculada ao relacionamento',
    occurredAt: record.updatedAt,
    href: `/billing/${record.encounterId}`
  }));

  const laboratoryItems = laboratoryOrders.value.map((order) => ({
    id: `laboratory-${order.id}`,
    source: 'Laboratório',
    patientName: patientName(order.patientId),
    title: order.examType,
    description: `${order.status} · ${order.resultSummary || order.reason}`,
    occurredAt: order.updatedAt,
    href: `/laboratory/orders`
  }));

  const preventiveItems = preventiveEvents.value.map((event) => ({
    id: `preventive-${event.id}`,
    source: 'Preventivo',
    patientName: event.animalName || patientName(event.patientId ?? ''),
    title: event.description,
    description: `${preventiveItemTypeLabel(event.itemType)} · ${event.status}`,
    occurredAt: event.executedAt ?? `${event.eventDate}T12:00:00Z`,
    href: patientPreventivePath(event.patientId, event.ownerId)
  }));

  const messageItems = contextualMessages.value.map((message) => ({
    id: `message-${message.id}`,
    source: 'Mensagem',
    patientName: firstTimelinePatientName(),
    title: message.title,
    description: message.preview,
    occurredAt: owner.value?.updatedAt ?? new Date().toISOString()
  }));

  return [
    ...appointmentItems,
    ...encounterItems,
    ...billingItems,
    ...laboratoryItems,
    ...preventiveItems,
    ...messageItems
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 10);
});

interface OwnerAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const ownerTopAlerts = computed<OwnerAlert[]>(() => {
  if (!owner.value) return [];

  const alerts: OwnerAlert[] = [];

  if (!owner.value.documentId) {
    alerts.push({
      variant: 'warning',
      title: 'Documento ausente',
      message: 'Cadastre CPF/CNPJ para consolidar financeiro e relacionamento.'
    });
  }

  if (owner.value.contacts.length === 0) {
    alerts.push({
      variant: 'warning',
      title: 'Sem contatos',
      message: 'Inclua ao menos um canal de contato para operação e comunicação.'
    });
  }

  if (owner.value.status === 'inactive') {
    alerts.push({
      variant: 'danger',
      title: 'Cliente inativo',
      message: 'Este cadastro está fora da operação ativa.'
    });
  }

  if (patients.value.length === 0) {
    alerts.push({
      variant: 'info',
      title: 'Sem animais cadastrados',
      message: 'Cadastre animais para completar a jornada assistencial.'
    });
  }

  if (openBillingAmount.value > 0) {
    alerts.push({
      variant: 'warning',
      title: 'Financeiro em aberto',
      message: `Há ${formatCurrency(openBillingAmount.value)} pendente(s) neste relacionamento.`
    });
  }

  return alerts;
});

const ownerOpportunityAlerts = computed<OwnerAlert[]>(() => {
  const alerts: OwnerAlert[] = [];

  if (activeQuotes.value.length > 0) {
    alerts.push({
      variant: 'info',
      title: 'Oportunidade comercial',
      message: `${activeQuotes.value.length} orçamento(s) em acompanhamento.`
    });
  }

  return alerts;
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function primaryContact(currentOwner: OwnerSummary): string {
  return currentOwner.contacts.find((contact) => contact.primary)?.value || currentOwner.contacts[0]?.value || 'Sem contato principal';
}

function patientName(patientId: string): string {
  return patients.value.find((patient) => patient.id === patientId)?.name || 'Paciente';
}

function firstTimelinePatientName(): string {
  return patients.value[0]?.name ?? 'Relacionamento';
}

function patientPreventivePath(patientId?: string | null, ownerId?: string | null): string {
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', patientId);
  if (ownerId ?? owner.value?.id) params.set('ownerId', ownerId ?? owner.value?.id ?? '');
  return `/vaccines-dewormers${params.toString() ? `?${params.toString()}` : ''}`;
}

function buildWhatsAppLink(message: string): string | null {
  if (!whatsappContact.value) return null;
  return `${whatsappContact.value}?text=${encodeURIComponent(message)}`;
}

function encounterSelectionPath(ownerId: string, patientId?: string): string {
  const params = new URLSearchParams({ ownerId });
  if (patientId) params.set('patientId', patientId);
  return `/encounters?${params.toString()}`;
}

function activeEncounterForPatient(patientId: string): EncounterSummary | null {
  return (
    encounters.value
      .filter((encounter) => encounter.patientId === patientId && encounter.status !== 'closed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null
  );
}

function patientFinancialPath(ownerId: string, patientId: string): string {
  const activeEncounter = activeEncounterForPatient(patientId);
  return activeEncounter ? `/billing/${activeEncounter.id}` : encounterSelectionPath(ownerId, patientId);
}

function patientFinancialActionLabel(patientId: string): string {
  return activeEncounterForPatient(patientId) ? 'Abrir Cobrança' : 'Selecionar atendimento para cobrança';
}

function resolvePatient360NextAction(
  patient: PatientSummary,
  appointment: AppointmentSummary | null,
  activeEncounter: EncounterSummary | null,
  openAmount: number,
  pendingLaboratoryCount: number
): { label: string; path: string } {
  if (pendingLaboratoryCount > 0) {
    return { label: 'Acompanhar exames pendentes', path: '/laboratory/orders' };
  }

  if (openAmount > 0 && activeEncounter) {
    return { label: 'Resolver cobrança', path: `/billing/${activeEncounter.id}` };
  }

  if (activeEncounter) {
    return { label: 'Continuar atendimento', path: `/encounters/${activeEncounter.id}` };
  }

  if (appointment) {
    return { label: 'Ver agenda', path: `/appointments/${appointment.id}` };
  }

  return {
    label: 'Agendar próximo contato',
    path: `/appointments/new?ownerId=${owner.value?.id ?? patient.primaryOwnerId}&patientId=${patient.id}`
  };
}

function requestRelationshipQuoteConfirmation() {
  if (!owner.value) return;
  quoteActionError.value = '';
  pendingQuoteConfirmation.value = {
    kind: 'relationship',
    title: 'Orçamento-base',
    notes: `Orçamento-base gerado a partir do hub enterprise do cliente ${owner.value.fullName}.`
  };
}

function requestPackageQuoteConfirmation(pkg: SuggestedPackage) {
  if (!owner.value) return;
  quoteActionError.value = '';
  pendingQuoteConfirmation.value = {
    kind: 'package',
    title: pkg.title,
    packageId: pkg.id,
    notes: `Pacote sugerido: ${pkg.title}. Motivo: ${pkg.reason}. Valor de referência: ${formatCurrency(pkg.referenceValue)}.`
  };
}

function cancelPendingQuote() {
  if (creatingRelationshipQuote.value || creatingPackageQuoteId.value) return;
  pendingQuoteConfirmation.value = null;
  quoteActionError.value = '';
}

async function confirmPendingQuote() {
  if (!owner.value || !pendingQuoteConfirmation.value) return;

  const confirmation = pendingQuoteConfirmation.value;
  if (confirmation.kind === 'relationship') {
    creatingRelationshipQuote.value = true;
  } else {
    creatingPackageQuoteId.value = confirmation.packageId;
  }

  actionError.value = '';
  actionMessage.value = '';
  quoteActionError.value = '';

  try {
    const quote = await quoteService.create({
      ownerId: owner.value.id,
      notes: confirmation.notes
    });
    quotes.value = [quote, ...quotes.value];
    actionMessage.value =
      confirmation.kind === 'relationship'
        ? `Orçamento ${quote.number} criado em rascunho para o cliente.`
        : `Orçamento ${quote.number} criado para o pacote ${confirmation.title}.`;
    pendingQuoteConfirmation.value = null;
  } catch (err: unknown) {
    quoteActionError.value = err instanceof Error ? err.message : 'Erro ao criar orçamento';
  } finally {
    creatingRelationshipQuote.value = false;
    creatingPackageQuoteId.value = '';
  }
}

async function loadOwnerHub(ownerId: string) {
  const [ownerResponse, patientResponse, appointmentResponse, encounterResponse] = await Promise.all([
    ownerService.getById(ownerId),
    patientService.list({ ownerId }),
    appointmentService.list(),
    encounterService.list()
  ]);

  owner.value = ownerResponse;
  patients.value = patientResponse;
  appointments.value = appointmentResponse.filter((appointment) => appointment.ownerId === ownerId);
  encounters.value = encounterResponse.filter((encounter) => encounter.ownerId === ownerId);

  relatedWarnings.value = [];

  try {
    ownerSummary.value = await ownerService.getSummary(ownerId);
  } catch {
    ownerSummary.value = null;
    relatedWarnings.value.push('owner-summary');
  }

  const [billingResult, quotesResult, preventiveResult, laboratoryResult] = await Promise.allSettled([
    billingService.list(),
    quoteService.list(),
    vaccinesDewormersService.list({
      ownerId,
      includeExecuted: true
    }),
    laboratoryService.listOrders()
  ]);

  if (billingResult.status === 'fulfilled') {
    billingRecords.value = billingResult.value;
  } else {
    billingRecords.value = [];
    relatedWarnings.value.push('financeiro');
  }

  if (quotesResult.status === 'fulfilled') {
    quotes.value = quotesResult.value;
  } else {
    quotes.value = [];
    relatedWarnings.value.push('orçamentos');
  }

  if (preventiveResult.status === 'fulfilled') {
    preventiveEvents.value = preventiveResult.value.filter((event) => event.ownerId === ownerId);
  } else {
    preventiveEvents.value = [];
    relatedWarnings.value.push('preventivo');
  }

  if (laboratoryResult.status === 'fulfilled') {
    const patientIds = new Set(patients.value.map((patient) => patient.id));
    laboratoryOrders.value = laboratoryResult.value.filter((order) => patientIds.has(order.patientId));
  } else {
    laboratoryOrders.value = [];
    relatedWarnings.value.push('laboratório');
  }
}

onMounted(async () => {
  const ownerId = route.params.id as string;

  try {
    await loadOwnerHub(ownerId);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cliente';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.owner-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions,
.patient-list__actions,
.contact-item__badges,
.message-list__actions,
.package-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.owner-summary-grid,
.owner-detail-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.owner-360-cockpit {
  display: grid;
}

.owner-360-cockpit__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.owner-360-cockpit__summary > div,
.owner-360-card {
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: #fff;
}

.owner-360-cockpit__summary > div {
  display: grid;
  gap: 5px;
  min-height: 84px;
  padding: 12px;
}

.owner-360-cockpit__summary span,
.owner-360-card span,
.owner-360-card small {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.owner-360-list {
  display: grid;
  gap: 12px;
}

.owner-360-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.owner-360-card__head,
.owner-360-card__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.owner-360-card__head > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.owner-360-card__head strong {
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.owner-360-card__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.owner-360-card__grid > div {
  display: grid;
  gap: 4px;
  min-height: 76px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.owner-360-card__grid strong {
  overflow-wrap: anywhere;
}

.owner-360-empty {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.owner-360-timeline {
  display: grid;
}

.owner-360-timeline__list {
  display: grid;
  gap: 10px;
}

.owner-360-timeline__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: #f8fafc;
}

.owner-360-timeline__item > div:first-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.owner-360-timeline__item p,
.owner-360-timeline__item small {
  margin: 0;
  overflow-wrap: anywhere;
}

.owner-360-timeline__item small,
.owner-360-timeline__meta {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.owner-360-timeline__meta {
  display: grid;
  gap: 4px;
  justify-items: end;
  white-space: nowrap;
}

.vetus-client-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.vetus-client-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.vetus-client-card__header,
.vetus-client-card__metrics,
.vetus-client-card__row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.vetus-client-card__header h2 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.vetus-client-card__metrics > div,
.vetus-client-card__row {
  min-width: 0;
}

.vetus-client-card__metrics > div {
  display: grid;
  gap: 3px;
}

.vetus-client-card span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.vetus-client-card strong,
.vetus-client-card p {
  overflow-wrap: anywhere;
}

.vetus-client-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.detail-item__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.note-box {
  margin: 16px 0 0;
  padding: 14px;
  border-radius: 12px;
  background: #fff7ed;
  color: #9a3412;
}

.contacts-list,
.patient-list,
.timeline-list,
.message-list,
.package-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item,
.patient-list__item,
.timeline-list__item,
.message-list__item,
.package-list__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: #fff;
}

.contact-item p,
.patient-list__item p,
.timeline-list__item p,
.message-list__item p,
.package-list__item p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.package-list__hint {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.note-box--info {
  background: #eff6ff;
  color: #1d4ed8;
}

.quote-confirmation {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: #f8fafc;
}

.quote-confirmation p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.quote-confirmation span {
  color: var(--color-text-muted, #64748b);
  font-weight: 800;
}

.quote-confirmation__error {
  color: #b91c1c;
  font-weight: 700;
}

@media (max-width: 720px) {
  .owner-360-cockpit__summary,
  .owner-360-card__grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .contact-item,
  .patient-list__item,
  .timeline-list__item,
  .message-list__item,
  .package-list__item,
  .vetus-client-card__header,
  .vetus-client-card__row,
  .owner-360-timeline__item,
  .owner-360-card__head,
  .owner-360-card__actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .owner-360-timeline__meta {
    justify-items: start;
  }
}
</style>
