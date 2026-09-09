<template>
  <div class="encounter-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>
    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <template v-else-if="encounter">
      <AppPageHeader
        title="Atendimento clínico"
        :subtitle="encounterHeaderSubtitle"
        :breadcrumb-items="headerBreadcrumbItems"
        :context-items="headerContextItems"
        :next-steps="headerNextSteps"
        :primary-action="headerPrimaryAction"
        :secondary-actions="headerSecondaryActions"
      />

      <DsAlert v-if="contextWarnings.length" variant="info" dismissible>
        Algumas informações complementares não carregaram:
        {{ contextWarnings.join(', ') }}. O atendimento principal continua disponível.
      </DsAlert>

      <section class="encounter-cockpit" aria-label="Cockpit do atendimento">
        <aside class="patient-rail">
          <div class="patient-rail__identity">
            <span class="patient-rail__avatar">🐾</span>
            <div>
              <span class="patient-rail__eyebrow">Paciente em atendimento</span>
              <strong>{{ patientName || 'Paciente em carregamento' }}</strong>
              <span>{{ ownerName || 'Tutor em carregamento' }}</span>
            </div>
          </div>

          <div class="patient-rail__facts">
            <div class="detail-row">
              <span class="detail-row__label">Tipo</span>
              <span>{{ visitTypeLabel(encounter.visitType) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Origem</span>
              <span>{{ encounterOriginLabel(encounter.origin) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Status</span>
              <span>{{ encounterStatusLabel(encounter.status) }}</span>
            </div>
          </div>

          <div class="patient-rail__actions">
            <DsButton variant="primary" tag="a" :to="`/medical-records/${encounter.id}`">
              Continuar prontuário
            </DsButton>
            <DsButton variant="secondary" tag="a" :to="workflowLink('/prescriptions')">
              Receituário
            </DsButton>
            <DsButton variant="secondary" tag="a" :to="`/patients/${encounter.patientId}`">
              Cadastro do paciente
            </DsButton>
            <DsButton
              v-if="encounter.status !== 'closed'"
              variant="secondary"
              tag="a"
              :to="`/inpatient/admit?encounterId=${encodeURIComponent(encounter.id)}`"
            >
              Internar
            </DsButton>
            <DsButton v-if="canTransition" variant="secondary" @click="showTransitionModal = true">
              Transicionar Status
            </DsButton>
            <DsButton v-if="canClose" variant="danger" @click="showCloseModal = true">
              Fechar Atendimento
            </DsButton>
          </div>
        </aside>

        <div class="workflow-shell">
          <nav class="workflow-tabs" aria-label="Etapas do atendimento">
            <button
              v-for="step in workflowSteps"
              :key="step.key"
              type="button"
              class="workflow-tab"
              :class="{ 'workflow-tab--active': activeWorkflowStep === step.key }"
              @click="selectWorkflowStep(step.key)"
            >
              <span>{{ step.index }}</span>
              <strong>{{ step.label }}</strong>
              <small>{{ step.hint }}</small>
            </button>
          </nav>

          <section class="workflow-panel">
            <template v-if="activeWorkflowStep === 'summary'">
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Resumo</span>
                  <h2>Queixa Principal</h2>
                </div>
                <DsButton
                  variant="secondary"
                  :loading="financialLoading"
                  @click="refreshEnterpriseSummary"
                >
                  Atualizar resumo
                </DsButton>
              </div>
              <p class="chief-complaint">{{ encounter.reason }}</p>
              <div v-if="encounter.closeReason" class="close-reason-block">
                <strong>Motivo do Fechamento</strong>
                <p>{{ encounter.closeReason }}</p>
              </div>
              <div class="summary-grid summary-grid--compact">
                <div v-for="item in summaryCards" :key="item.label" class="summary-card">
                  <span class="summary-card__icon">{{ item.icon }}</span>
                  <span class="summary-card__label">{{ item.label }}</span>
                  <strong class="summary-card__value">{{ item.value }}</strong>
                </div>
              </div>
            </template>

            <template v-else-if="activeWorkflowStep === 'quote'">
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Orçamento</span>
                  <h2>Montar orçamento do caso</h2>
                </div>
                <DsButton variant="primary" tag="a" :to="workflowLink('/quotes')">
                  Abrir orçamento
                </DsButton>
              </div>
              <p class="muted">
                O orçamento recebe tutor, paciente e atendimento pela URL para evitar redigitação.
              </p>
            </template>

            <template v-else-if="activeWorkflowStep === 'exams'">
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Exames</span>
                  <h2>Solicitar e acompanhar exames</h2>
                </div>
                <DsButton variant="primary" tag="a" :to="workflowLink('/exam-orders')">
                  Pedir exame
                </DsButton>
              </div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-row__label">Pedidos diagnósticos</span>
                  <span>{{ encounterSummary?.diagnostics.totalOrders ?? 0 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-row__label">Pedidos pendentes</span>
                  <span>{{ encounterSummary?.diagnostics.pendingOrders ?? 0 }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-row__label">Resultados liberados</span>
                  <span>{{ encounterSummary?.diagnostics.releasedResults ?? 0 }}</span>
                </div>
              </div>
            </template>

            <template v-else-if="activeWorkflowStep === 'medications'">
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Medicações</span>
                  <h2>Prescrever e administrar</h2>
                </div>
                <div class="workflow-panel__actions">
                  <DsButton variant="primary" tag="a" :to="workflowLink('/prescriptions')">
                    Receituário
                  </DsButton>
                  <DsButton
                    variant="secondary"
                    tag="a"
                    :to="workflowLink('/prescription-executions')"
                  >
                    Aplicar medicação
                  </DsButton>
                </div>
              </div>
              <p class="muted">
                A execução de medicação abre no mesmo atendimento e usa a prescrição vinculada.
              </p>
            </template>

            <template v-else-if="activeWorkflowStep === 'billing'">
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Serviços / Cobrança</span>
                  <h2>Acompanhar pendências financeiras</h2>
                </div>
                <DsButton variant="secondary" tag="a" :to="`/billing/${encounter.id}`">
                  Ver cobrança
                </DsButton>
              </div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-row__label">Total financeiro</span>
                  <span>{{ formatMoney(financialSummary?.total ?? 0) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-row__label">Pago</span>
                  <span>{{ formatMoney(financialSummary?.paidAmount ?? 0) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-row__label">Saldo</span>
                  <span>{{ formatMoney(financialSummary?.balanceDue ?? 0) }}</span>
                </div>
              </div>
              <EncounterPixPaymentPanel
                :encounter-id="encounter.id"
                :encounter-status="encounter.status"
                :financial-eligible="canRequestPix"
              />
            </template>

            <template v-else>
              <div class="workflow-panel__header">
                <div>
                  <span class="workflow-panel__eyebrow">Fechamento</span>
                  <h2>Concluir atendimento</h2>
                </div>
                <div class="workflow-panel__actions">
                  <DsButton
                    v-if="encounter.status !== 'closed'"
                    variant="secondary"
                    @click="showFinancialCloseModal = true"
                  >
                    Fechar Financeiro
                  </DsButton>
                  <DsButton
                    v-if="canReceiveCash"
                    variant="primary"
                    :loading="preparingCashReceipt"
                    @click="prepareCashReceipt"
                  >
                    Receber em dinheiro
                  </DsButton>
                  <DsButton
                    v-else-if="requiresOpenBilling"
                    variant="secondary"
                    tag="a"
                    :to="`/billing/${encounter.id}`"
                  >
                    Abrir cobrança
                  </DsButton>
                  <DsButton
                    v-if="canTransition"
                    variant="secondary"
                    @click="showTransitionModal = true"
                  >
                    Transicionar Status
                  </DsButton>
                  <DsButton v-if="canClose" variant="danger" @click="showCloseModal = true">
                    Fechar Atendimento
                  </DsButton>
                </div>
              </div>
              <div v-if="encounter.closeReason" class="close-reason-block">
                <strong>Motivo do Fechamento</strong>
                <p>{{ encounter.closeReason }}</p>
              </div>
              <p v-else class="muted">
                Revise cobrança, exames, receituário e prontuário antes de fechar o caso.
              </p>
              <section
                ref="cashReceiptReviewRef"
                class="cash-receipt-review"
                aria-labelledby="cash-receipt-review-title"
                tabindex="-1"
              >
                <div class="cash-receipt-review__header">
                  <div>
                    <span class="workflow-panel__eyebrow">Recebimento em dinheiro</span>
                    <h3 id="cash-receipt-review-title">Conferência do caixa</h3>
                  </div>
                  <DsButton
                    variant="ghost"
                    size="sm"
                    :loading="cashReceiptLoading"
                    @click="loadCashReceipt()"
                  >
                    Atualizar recebimento
                  </DsButton>
                </div>
                <div v-if="cashReceiptLoading" class="muted">Consultando recebimento confirmado...</div>
                <DsAlert v-else-if="cashReceiptError" variant="danger" title="Recebimento não consultado">
                  <p class="alert-copy">{{ cashReceiptError }}</p>
                  <DsButton variant="secondary" size="sm" @click="loadCashReceipt()">
                    Tentar consultar novamente
                  </DsButton>
                </DsAlert>
                <div v-else-if="cashReceipt" class="cash-receipt-review__body">
                  <div class="detail-grid">
                    <div class="detail-row">
                      <span class="detail-row__label">Estado</span>
                      <strong>{{ cashReceiptReversed ? 'Estornado' : 'Recebimento confirmado' }}</strong>
                    </div>
                    <div class="detail-row">
                      <span class="detail-row__label">Valor</span>
                      <strong>{{ formatMoney(cashReceipt.amount) }}</strong>
                    </div>
                    <div class="detail-row">
                      <span class="detail-row__label">Recebimento</span>
                      <code>{{ cashReceipt.id }}</code>
                    </div>
                    <div class="detail-row">
                      <span class="detail-row__label">Data</span>
                      <span>{{ formatDateTime(cashReceipt.receivedAt) }}</span>
                    </div>
                  </div>
                  <DsAlert
                    v-if="cashReceiptRefreshWarning"
                    variant="warning"
                    title="Última confirmação mantida"
                  >
                    <p class="alert-copy">{{ cashReceiptRefreshWarning }}</p>
                  </DsAlert>
                  <DsAlert v-if="cashReceiptReversed" variant="success" title="Estorno confirmado">
                    <p class="alert-copy">
                      <strong>Estorno confirmado.</strong> O estorno foi registrado no livro
                      financeiro. Nenhum novo recebimento foi criado.
                    </p>
                    <p class="alert-copy">Motivo: {{ cashReversalDisplayReason }}</p>
                  </DsAlert>
                  <div v-else class="cash-receipt-review__actions">
                    <p class="muted">
                      Um estorno exige motivo, confirmação explícita e chave de idempotência própria.
                      Ele não altera o histórico do recebimento original.
                    </p>
                    <DsButton
                      variant="danger"
                      :disabled="reversingCash"
                      @click="showCashReversalModal = true"
                    >
                      Solicitar estorno
                    </DsButton>
                  </div>
                </div>
                <p v-else class="muted">
                  Nenhum recebimento em dinheiro confirmado para este atendimento.
                </p>
              </section>
              <section class="pre-handoff" aria-labelledby="pre-handoff-title">
                <div class="pre-handoff__header">
                  <div>
                    <span class="workflow-panel__eyebrow">Conferência operacional</span>
                    <h3 id="pre-handoff-title">Pré-handoff para recepção</h3>
                  </div>
                  <span class="pre-handoff__status">{{
                    encounterStatusLabel(encounter.status)
                  }}</span>
                </div>
                <p class="pre-handoff__notice">
                  Este bloco orienta a conferência; não envia o caso automaticamente para a recepção.
                  Use o envio manual quando o pacote mínimo estiver pronto para a recepção assumir e
                  confirmar recebimento.
                </p>
                <DsAlert
                  v-if="clinicalHandoffError"
                  variant="danger"
                  dismissible
                  @dismiss="clinicalHandoffError = ''"
                >
                  {{ clinicalHandoffError }}
                </DsAlert>
                <div class="detail-grid">
                  <div class="detail-row">
                    <span class="detail-row__label">Paciente</span>
                    <span>{{ patientName || 'Paciente em carregamento' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-row__label">Tutor</span>
                    <span>{{ ownerName || 'Tutor em carregamento' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-row__label">Motivo / queixa</span>
                    <span>{{ encounter.reason }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-row__label">Saldo financeiro</span>
                    <span>{{ formatMoney(financialSummary?.balanceDue ?? 0) }}</span>
                  </div>
                  <div v-if="encounter.closeReason" class="detail-row">
                    <span class="detail-row__label">Motivo do fechamento</span>
                    <span>{{ encounter.closeReason }}</span>
                  </div>
                </div>
                <div v-if="clinicalHandoffLoading" class="muted">Carregando handoff...</div>
                <div v-else-if="clinicalHandoff" class="handoff-status">
                  <div>
                    <span class="detail-row__label">Handoff</span>
                    <strong>{{ clinicalHandoffStatusLabel(clinicalHandoff.handoffStatus) }}</strong>
                    <p>{{ clinicalHandoff.receptionInstructions }}</p>
                  </div>
                  <div>
                    <span class="detail-row__label">Prioridade</span>
                    <strong>{{ clinicalHandoffPriorityLabel(clinicalHandoff.priority) }}</strong>
                    <p v-if="clinicalHandoff.acknowledgedAt">
                      Recebido em {{ formatDateTime(clinicalHandoff.acknowledgedAt) }}
                    </p>
                  </div>
                </div>
                <div v-else class="handoff-form">
                  <div class="form-field">
                    <label for="clinicalHandoffSummary" class="form-field__label"
                      >Resumo clínico-operacional *</label
                    >
                    <DsInput
                      id="clinicalHandoffSummary"
                      v-model="clinicalHandoffForm.clinicalSummary"
                      type="textarea"
                      :rows="3"
                      placeholder="Resumo curto para a recepção orientar o tutor"
                    />
                  </div>
                  <div class="form-field">
                    <label for="clinicalHandoffInstructions" class="form-field__label"
                      >Instruções para recepção *</label
                    >
                    <DsInput
                      id="clinicalHandoffInstructions"
                      v-model="clinicalHandoffForm.receptionInstructions"
                      type="textarea"
                      :rows="3"
                      placeholder="O que a recepção deve fazer agora"
                    />
                  </div>
                  <div class="handoff-form__footer">
                    <label class="form-field__label" for="clinicalHandoffPriority"
                      >Prioridade</label
                    >
                    <select
                      id="clinicalHandoffPriority"
                      v-model="clinicalHandoffForm.priority"
                      class="handoff-form__select"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                    <DsButton
                      variant="primary"
                      :loading="sendingClinicalHandoff"
                      :disabled="encounter.status === 'closed'"
                      @click="sendClinicalHandoff"
                    >
                      Enviar para recepção
                    </DsButton>
                  </div>
                </div>
                <div class="pre-handoff__links" aria-label="Atalhos de conferência para recepção">
                  <DsButton
                    size="sm"
                    variant="secondary"
                    tag="a"
                    :to="`/medical-records/${encounter.id}`"
                  >
                    Prontuário
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="secondary"
                    tag="a"
                    :to="workflowLink('/prescriptions')"
                  >
                    Prescrições
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="secondary"
                    tag="a"
                    :to="workflowLink('/diagnostics')"
                  >
                    Exames/diagnóstico
                  </DsButton>
                  <DsButton size="sm" variant="secondary" tag="a" :to="workflowLink('/quotes')">
                    Orçamento
                  </DsButton>
                  <DsButton size="sm" variant="secondary" tag="a" :to="`/billing/${encounter.id}`">
                    Faturamento
                  </DsButton>
                </div>
              </section>
            </template>
          </section>
        </div>
      </section>

      <section class="support-grid" aria-label="Informações de apoio do atendimento">
        <DsCard title="Timeline">
          <div v-if="timelineLoading" class="muted">Carregando timeline...</div>
          <div v-else-if="timeline.length === 0" class="muted">
            Nenhum evento registrado ainda neste atendimento.
          </div>
          <div v-else class="timeline-list">
            <div v-for="event in timeline" :key="event.id" class="timeline-event">
              <span class="timeline-event__type">{{
                encounterEventTypeLabel(event.eventType)
              }}</span>
              <span class="timeline-event__summary">{{ event.summary }}</span>
              <span class="timeline-event__time">{{ formatDateTime(event.occurredAt) }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Anexos">
          <div v-if="attachmentsLoading" class="muted">Carregando anexos...</div>
          <div v-else-if="attachments.length === 0" class="muted">
            Nenhum anexo registrado. Use este espaço para complementar o caso clínico.
          </div>
          <div v-else class="attachments-list">
            <div v-for="att in attachments" :key="att.id" class="attachment-item">
              <span class="attachment-item__icon">📎</span>
              <span class="attachment-item__name">{{ att.fileName }}</span>
              <span class="attachment-item__category">{{ att.category }}</span>
            </div>
          </div>
          <div class="attachment-upload">
            <DsInput v-model="newAttachment.fileName" label="" placeholder="Nome do arquivo" />
            <DsInput v-model="newAttachment.mimeType" label="" placeholder="MIME type" />
            <DsInput v-model="newAttachment.checksum" label="" placeholder="Checksum" />
            <DsButton
              variant="secondary"
              size="sm"
              :loading="uploadingAttachment"
              @click="uploadAttachment"
            >
              Anexar
            </DsButton>
          </div>
        </DsCard>
      </section>
    </template>

    <DsModal
      :open="showTransitionModal"
      :teleport="false"
      title="Transicionar Status"
      size="sm"
      @close="showTransitionModal = false"
    >
      <div class="transition-options">
        <DsButton
          v-for="opt in availableTransitions"
          :key="opt"
          variant="secondary"
          @click="handleTransition(opt)"
        >
          {{ encounterStatusLabel(opt) }}
        </DsButton>
      </div>
      <DsButton variant="ghost" @click="showTransitionModal = false">Cancelar</DsButton>
    </DsModal>

    <DsModal
      :open="showFinancialCloseModal"
      :teleport="false"
      title="Fechar Financeiro"
      size="md"
      @close="showFinancialCloseModal = false"
    >
      <div class="form-field">
        <label for="financialNotes" class="form-field__label">Notas</label>
        <DsInput
          id="financialNotes"
          v-model="financialNotes"
          type="textarea"
          :rows="3"
          placeholder="Observações do fechamento financeiro"
        />
      </div>
      <template #footer>
        <DsButton variant="primary" :loading="closingFinancial" @click="handleFinancialClose">
          {{ closingFinancial ? 'Fechando...' : 'Confirmar fechamento' }}
        </DsButton>
        <DsButton variant="ghost" @click="showFinancialCloseModal = false">Cancelar</DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="showCashReceiptModal"
      :teleport="false"
      title="Receber em dinheiro"
      size="md"
      @close="showCashReceiptModal = false"
    >
      <div class="detail-grid">
        <div class="detail-row">
          <span class="detail-row__label">Valor integral</span>
          <strong>{{ formatMoney(financialSummary?.total ?? 0) }}</strong>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Caixa aberto</span>
          <span>{{ cashReceiptRegisterId }}</span>
        </div>
      </div>
      <div class="form-field">
        <label for="cashReceiptNotes" class="form-field__label">Notas</label>
        <DsInput
          id="cashReceiptNotes"
          v-model="cashReceiptNotes"
          type="textarea"
          :rows="3"
          placeholder="Observações do recebimento"
        />
      </div>
      <template #footer>
        <DsButton variant="primary" :loading="receivingCash" @click="handleCashReceipt">
          {{ receivingCash ? 'Recebendo...' : 'Confirmar recebimento' }}
        </DsButton>
        <DsButton variant="ghost" @click="showCashReceiptModal = false">Cancelar</DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="showCashReversalModal"
      :teleport="false"
      title="Solicitar estorno do recebimento"
      size="md"
      @close="showCashReversalModal = false"
    >
      <DsAlert variant="warning" title="Ação financeira irreversível">
        O recebimento de {{ formatMoney(cashReceipt?.amount ?? 0) }} será estornado no caixa e no
        contas a receber. Confira o atendimento e informe um motivo antes de confirmar.
      </DsAlert>
      <div v-if="cashReceipt" class="detail-grid">
        <div class="detail-row">
          <span class="detail-row__label">Recebimento</span>
          <code>{{ cashReceipt.id }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Atendimento</span>
          <code>{{ cashReceipt.encounterId }}</code>
        </div>
      </div>
      <div class="form-field">
        <label for="cashReversalReason" class="form-field__label">Motivo do estorno *</label>
        <DsInput
          id="cashReversalReason"
          v-model="cashReversalReason"
          type="textarea"
          :rows="3"
          :maxlength="500"
          required
          placeholder="Descreva o motivo operacional"
        />
      </div>
      <DsAlert v-if="cashReversalError" variant="danger" title="Estorno não confirmado">
        <p class="alert-copy">{{ cashReversalError }}</p>
        <p class="alert-copy">A mesma chave será reaproveitada ao tentar novamente.</p>
      </DsAlert>
      <template #footer>
        <DsButton
          variant="danger"
          :loading="reversingCash"
          :disabled="!cashReversalReason.trim() || !cashReceipt"
          @click="handleCashReversal"
        >
          {{ reversingCash ? 'Estornando...' : 'Confirmar estorno' }}
        </DsButton>
        <DsButton variant="ghost" :disabled="reversingCash" @click="showCashReversalModal = false">
          Cancelar
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="showCloseModal"
      :teleport="false"
      title="Fechar Atendimento"
      size="md"
      @close="showCloseModal = false"
    >
      <div class="form-field">
        <label for="closeReason" class="form-field__label">Motivo do fechamento *</label>
        <DsInput
          id="closeReason"
          v-model="closeReason"
          type="textarea"
          :rows="3"
          placeholder="Descreva o motivo..."
        />
      </div>
      <template #footer>
        <DsButton variant="danger" :disabled="!closeReason.trim() || closing" @click="handleClose">
          {{ closing ? 'Fechando...' : 'Fechar' }}
        </DsButton>
        <DsButton variant="ghost" @click="showCloseModal = false">Cancelar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { encounterService } from '@/services/encounter';
import type { EncounterCashReceipt, EncounterCashReceiptReversal } from '@/services/encounter';
import { cashService } from '@/services/cash';
import { billingService } from '@/services/billing';
import { clinicalHandoffService } from '@/services/clinicalHandoff';
import { attachmentService } from '@/services/attachments';
import EncounterPixPaymentPanel from '@/components/finance/EncounterPixPaymentPanel.vue';
import type {
  EncounterSummary,
  EncounterTimelineEventSummary,
  EncounterFinancialSummary,
  EncounterSummaryResponse
} from '@/types/encounter';
import type { ClinicalHandoffPriority, ClinicalHandoffSummary } from '@/types/clinicalHandoff';
import type { BillingStatus } from '@/types/billing';
import {
  visitTypeLabel,
  encounterStatusLabel,
  encounterOriginLabel,
  encounterEventTypeLabel,
  encounterAllowedTransitions,
  formatDateTime
} from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';

const route = useRoute();
const routeEncounterId = computed(() => String(route.params.id ?? ''));
const encounter = ref<EncounterSummary | null>(null);
const timeline = ref<EncounterTimelineEventSummary[]>([]);
const loading = ref(true);
const timelineLoading = ref(false);
const financialLoading = ref(false);
const error = ref('');
const contextWarnings = ref<string[]>([]);
const clinicalHandoffError = ref('');
const showTransitionModal = ref(false);
const showFinancialCloseModal = ref(false);
const showCashReceiptModal = ref(false);
const showCashReversalModal = ref(false);
const showCloseModal = ref(false);
const closeReason = ref('');
const closing = ref(false);
const closingFinancial = ref(false);
const financialNotes = ref('');
const preparingCashReceipt = ref(false);
const receivingCash = ref(false);
const cashReceiptRegisterId = ref('');
const cashReceiptNotes = ref('');
const cashReceiptAttempt = ref<{ readonly fingerprint: string; readonly key: string } | null>(null);
const cashReceipt = ref<EncounterCashReceipt | null>(null);
const cashReceiptLoading = ref(false);
const cashReceiptError = ref('');
const cashReceiptRefreshWarning = ref('');
const cashReversal = ref<EncounterCashReceiptReversal | null>(null);
const cashReversalReason = ref('');
const cashReversalError = ref('');
const cashReversalAttempt = ref<{ readonly fingerprint: string; readonly key: string } | null>(null);
const reversingCash = ref(false);
const cashReceiptReviewRef = ref<HTMLElement | null>(null);
const entityCache = useEntityCache();
const attachments = ref<any[]>([]);
const attachmentsLoading = ref(false);
const uploadingAttachment = ref(false);
const newAttachment = ref({ fileName: '', mimeType: 'application/pdf', checksum: '' });

const patientName = ref('');
const ownerName = ref('');
const financialSummary = ref<EncounterFinancialSummary | null>(null);
const encounterSummary = ref<EncounterSummaryResponse | null>(null);
const billingStatus = ref<BillingStatus | null>(null);
const billingItemCount = ref<number | null>(null);
const hasFullUnpaidBalance = computed(() => {
  const summary = financialSummary.value;
  return Boolean(
    encounter.value?.status === 'closed'
    && summary
    && summary.total > 0
    && summary.paidAmount === 0
    && summary.balanceDue === summary.total
  );
});
const canReceiveCash = computed(() => hasFullUnpaidBalance.value && billingStatus.value === 'open');
const canRequestPix = computed(() =>
  hasFullUnpaidBalance.value
  && billingStatus.value === 'open'
  && (billingItemCount.value ?? 0) > 0
);
const cashReceiptReversed = computed(() =>
  Boolean(cashReversal.value || cashReceipt.value?.reversalId)
);
const cashReversalDisplayReason = computed(() =>
  cashReversal.value?.reason || cashReceipt.value?.reversalReason || 'Motivo registrado no livro financeiro.'
);
const requiresOpenBilling = computed(() =>
  hasFullUnpaidBalance.value
  && billingStatus.value !== null
  && billingStatus.value !== 'open'
  && billingStatus.value !== 'settled'
);
const activeWorkflowStep = ref('summary');
const clinicalHandoff = ref<ClinicalHandoffSummary | null>(null);
const clinicalHandoffLoading = ref(false);
const sendingClinicalHandoff = ref(false);
const clinicalHandoffForm = ref<{
  clinicalSummary: string;
  receptionInstructions: string;
  priority: ClinicalHandoffPriority;
}>({
  clinicalSummary: '',
  receptionInstructions: '',
  priority: 'medium'
});
let active = true;
let pageGeneration = 0;

function isCurrentLoad(generation: number, id: string) {
  return active && generation === pageGeneration && routeEncounterId.value === id;
}

function resetPageState() {
  encounter.value = null;
  timeline.value = [];
  patientName.value = '';
  ownerName.value = '';
  financialSummary.value = null;
  encounterSummary.value = null;
  billingStatus.value = null;
  billingItemCount.value = null;
  attachments.value = [];
  clinicalHandoff.value = null;
  clinicalHandoffError.value = '';
  contextWarnings.value = [];
  error.value = '';
  closeReason.value = '';
  clinicalHandoffForm.value = {
    clinicalSummary: '',
    receptionInstructions: '',
    priority: 'medium'
  };
  showTransitionModal.value = false;
  showFinancialCloseModal.value = false;
  showCashReceiptModal.value = false;
  showCashReversalModal.value = false;
  showCloseModal.value = false;
  cashReceiptAttempt.value = null;
  cashReceipt.value = null;
  cashReceiptLoading.value = false;
  cashReceiptError.value = '';
  cashReceiptRefreshWarning.value = '';
  cashReversal.value = null;
  cashReversalReason.value = '';
  cashReversalError.value = '';
  cashReversalAttempt.value = null;
  reversingCash.value = false;
  financialLoading.value = false;
  timelineLoading.value = false;
  attachmentsLoading.value = false;
  clinicalHandoffLoading.value = false;
  closing.value = false;
  closingFinancial.value = false;
  preparingCashReceipt.value = false;
  receivingCash.value = false;
  sendingClinicalHandoff.value = false;
  uploadingAttachment.value = false;
  financialNotes.value = '';
  cashReceiptRegisterId.value = '';
  cashReceiptNotes.value = '';
  newAttachment.value = { fileName: '', mimeType: 'application/pdf', checksum: '' };
}

function pushContextWarning(label: string) {
  if (!contextWarnings.value.includes(label)) contextWarnings.value.push(label);
}

const summaryCards = computed(() => [
  { icon: '🐾', label: 'Paciente', value: patientName.value || 'Carregando...' },
  { icon: '👤', label: 'Tutor', value: ownerName.value || 'Carregando...' },
  {
    icon: '🧭',
    label: 'Tipo',
    value: encounter.value ? visitTypeLabel(encounter.value.visitType) : '—'
  },
  {
    icon: '⚡',
    label: 'Status',
    value: encounter.value ? encounterStatusLabel(encounter.value.status) : '—'
  }
]);

const encounterHeaderSubtitle = computed(() => {
  if (!encounter.value) return 'Caso clínico em carregamento.';
  return `Hub clínico-operacional · ${encounterStatusLabel(encounter.value.status)} · ${encounter.value.reason}`;
});

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'encounters', label: 'Atendimentos', to: '/encounters' },
  { key: 'encounter', label: patientName.value || 'Atendimento', current: true }
]);

const headerContextItems = computed<PageContextItem[]>(() => {
  if (!encounter.value) return [];
  const balanceDue = financialSummary.value?.balanceDue ?? 0;
  return [
    {
      key: 'patient',
      label: 'Paciente',
      value: patientName.value || 'Carregando'
    },
    {
      key: 'owner',
      label: 'Tutor',
      value: ownerName.value || 'Carregando'
    },
    {
      key: 'status',
      label: 'Status',
      value: encounterStatusLabel(encounter.value.status),
      tone: encounter.value.status === 'closed' ? 'success' : 'info'
    },
    {
      key: 'type',
      label: 'Tipo',
      value: visitTypeLabel(encounter.value.visitType)
    },
    {
      key: 'balance',
      label: 'Saldo',
      value: formatMoney(balanceDue),
      tone: balanceDue > 0 ? 'warning' : 'neutral'
    }
  ];
});

const headerNextSteps = computed<PageNextStep[]>(() => {
  if (!encounter.value) return [];
  const steps: PageNextStep[] = [];
  if (encounter.value.status === 'closed') {
    steps.push({
      key: 'closed-record',
      label: 'Revisar prontuário',
      description: 'Caso clínico finalizado',
      to: `/medical-records/${encounter.value.id}`
    });
  } else {
    steps.push({
      key: 'clinical-record',
      label: 'Continuar prontuário',
      description: patientName.value || encounterStatusLabel(encounter.value.status),
      to: `/medical-records/${encounter.value.id}`
    });
  }

  if ((financialSummary.value?.balanceDue ?? 0) > 0) {
    steps.push({
      key: 'billing',
      label: 'Pendência financeira',
      description: formatMoney(financialSummary.value?.balanceDue ?? 0),
      to: `/billing/${encounter.value.id}`
    });
  }
  return steps;
});

const headerPrimaryAction = computed<PageAction | null>(() => {
  if (!encounter.value) return null;
  return {
    key: 'medical-record',
    label: encounter.value.status === 'closed' ? 'Abrir prontuário' : 'Continuar prontuário',
    to: `/medical-records/${encounter.value.id}`
  };
});

const headerSecondaryActions = computed<PageAction[]>(() => {
  if (!encounter.value)
    return [{ key: 'back', label: 'Voltar', variant: 'secondary', to: '/encounters' }];
  return [
    {
      key: 'billing',
      label: 'Cobrança',
      variant: 'secondary',
      to: `/billing/${encounter.value.id}`
    },
    {
      key: 'back',
      label: 'Voltar',
      variant: 'secondary',
      to: '/encounters'
    }
  ];
});

const workflowSteps = computed(() => [
  {
    key: 'summary',
    index: '1',
    label: 'Resumo',
    hint: encounter.value ? encounterStatusLabel(encounter.value.status) : 'Contexto'
  },
  { key: 'quote', index: '2', label: 'Orçamento', hint: 'Plano e autorização' },
  {
    key: 'exams',
    index: '3',
    label: 'Exames',
    hint: `${encounterSummary.value?.diagnostics.pendingOrders ?? 0} pendente(s)`
  },
  { key: 'medications', index: '4', label: 'Medicações', hint: 'Receituário e aplicação' },
  {
    key: 'billing',
    index: '5',
    label: 'Serviços / Cobrança',
    hint: formatMoney(financialSummary.value?.balanceDue ?? 0)
  },
  {
    key: 'close',
    index: '6',
    label: 'Fechamento',
    hint: encounter.value?.status === 'closed' ? 'Finalizado' : 'Em aberto'
  }
]);

function selectWorkflowStep(step: string): void {
  activeWorkflowStep.value = step;
  if (step === 'close') void loadCashReceipt();
}

const workflowQuery = computed(() => {
  if (!encounter.value) return '';
  const params = new URLSearchParams({
    encounterId: encounter.value.id,
    patientId: encounter.value.patientId,
    ownerId: encounter.value.ownerId
  });
  return params.toString();
});

function workflowLink(path: string): string {
  const query = workflowQuery.value;
  return query ? `${path}?${query}` : path;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

async function loadEntityNames(enc: EncounterSummary, generation: number, routeId: string) {
  const [nextPatientName, nextOwnerName] = await Promise.all([
    entityCache.getPatientName(enc.patientId),
    entityCache.getOwnerName(enc.ownerId)
  ]);
  if (!isCurrentLoad(generation, routeId)) return;
  patientName.value = nextPatientName;
  ownerName.value = nextOwnerName;
}

function hydrateClinicalHandoffForm(enc: EncounterSummary) {
  if (!clinicalHandoffForm.value.clinicalSummary.trim()) {
    clinicalHandoffForm.value.clinicalSummary = enc.reason;
  }

  if (!clinicalHandoffForm.value.receptionInstructions.trim()) {
    clinicalHandoffForm.value.receptionInstructions =
      'Orientar tutor, conferir pendencias e confirmar proximos passos operacionais.';
  }
}

async function loadClinicalHandoff(
  generation = pageGeneration,
  routeId = routeEncounterId.value,
  currentEncounter = encounter.value
) {
  if (!currentEncounter) return;
  clinicalHandoffLoading.value = true;
  clinicalHandoffError.value = '';

  try {
    const items = await clinicalHandoffService.list({ encounterId: currentEncounter.id });
    if (!isCurrentLoad(generation, routeId)) return;
    clinicalHandoff.value = items[0] ?? null;
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      clinicalHandoff.value = null;
      clinicalHandoffError.value =
        err instanceof Error ? err.message : 'Erro ao carregar handoff clinico';
      pushContextWarning('handoff clínico');
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) clinicalHandoffLoading.value = false;
  }
}

async function sendClinicalHandoff() {
  if (!encounter.value) return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;

  const clinicalSummary = clinicalHandoffForm.value.clinicalSummary.trim();
  const receptionInstructions = clinicalHandoffForm.value.receptionInstructions.trim();
  if (!clinicalSummary || !receptionInstructions) {
    clinicalHandoffError.value = 'Informe resumo clinico e instrucoes para recepcao.';
    return;
  }

  sendingClinicalHandoff.value = true;
  clinicalHandoffError.value = '';

  try {
    const nextHandoff = await clinicalHandoffService.sendToReception({
      encounterId: currentEncounter.id,
      clinicalSummary,
      receptionInstructions,
      priority: clinicalHandoffForm.value.priority,
      toResponsibleType: 'sector',
      toResponsibleId: 'reception'
    });
    if (!isCurrentLoad(generation, routeId)) return;
    clinicalHandoff.value = nextHandoff;
    await loadTimeline(generation, routeId, currentEncounter.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      clinicalHandoffError.value =
        err instanceof Error ? err.message : 'Erro ao enviar handoff para recepcao';
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) sendingClinicalHandoff.value = false;
  }
}

function clinicalHandoffStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ready_to_send: 'Pronto para envio',
    sent_to_reception: 'Enviado para recepcao',
    acknowledged_by_reception: 'Recebido pela recepcao'
  };
  return labels[status] ?? status;
}

function clinicalHandoffPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica'
  };
  return labels[priority] ?? priority;
}

const canTransition = computed(() => {
  return (
    encounter.value &&
    encounter.value.status !== 'closed' &&
    encounterAllowedTransitions[encounter.value.status]?.length > 0
  );
});
const canClose = computed(() => {
  return encounter.value && encounter.value.status !== 'closed';
});
const availableTransitions = computed(() => {
  return encounter.value ? encounterAllowedTransitions[encounter.value.status] || [] : [];
});

async function handleTransition(nextStatus: string) {
  if (!encounter.value) return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;
  try {
    const updated = await encounterService.transition(currentEncounter.id, { nextStatus: nextStatus as any });
    if (!isCurrentLoad(generation, routeId)) return;
    if (updated.id !== currentEncounter.id) {
      alert('O atendimento retornado não corresponde à rota atual.');
      return;
    }
    encounter.value = { ...currentEncounter, ...updated };
    encounter.value.status = nextStatus as any;
    showTransitionModal.value = false;
    await loadTimeline(generation, routeId, currentEncounter.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      alert(err instanceof Error ? err.message : 'Erro ao transicionar');
    }
  }
}

async function handleClose() {
  if (!encounter.value || !closeReason.value.trim()) return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;
  const reason = closeReason.value.trim();
  closing.value = true;
  try {
    const updated = await encounterService.close(currentEncounter.id, { closeReason: reason });
    if (!isCurrentLoad(generation, routeId)) return;
    if (updated.id !== currentEncounter.id) {
      alert('O atendimento retornado não corresponde à rota atual.');
      return;
    }
    encounter.value = { ...currentEncounter, ...updated, status: 'closed', closeReason: reason };
    showCloseModal.value = false;
    closeReason.value = '';
    await loadTimeline(generation, routeId, currentEncounter.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      alert(err instanceof Error ? err.message : 'Erro ao fechar');
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) closing.value = false;
  }
}

async function loadTimeline(
  generation = pageGeneration,
  routeId = routeEncounterId.value,
  encounterId = encounter.value?.id
) {
  if (!encounterId || !isCurrentLoad(generation, routeId)) return;
  timelineLoading.value = true;
  try {
    const nextTimeline = await encounterService.getTimeline(encounterId);
    if (isCurrentLoad(generation, routeId)) timeline.value = nextTimeline;
  } catch {
    if (isCurrentLoad(generation, routeId)) pushContextWarning('timeline');
  } finally {
    if (isCurrentLoad(generation, routeId)) timelineLoading.value = false;
  }
}

async function refreshEnterpriseSummary(
  generation = pageGeneration,
  routeId = routeEncounterId.value,
  encounterId = encounter.value?.id
) {
  if (!encounterId || !isCurrentLoad(generation, routeId)) return;
  financialLoading.value = true;
  billingItemCount.value = null;
  try {
    const summary = await encounterService.getSummary(encounterId);
    if (!isCurrentLoad(generation, routeId)) return;
    encounterSummary.value = summary;
    financialSummary.value = summary.financial;
  } catch {
    try {
      const fallback = await encounterService.getFinancialSummary(encounterId);
      if (!isCurrentLoad(generation, routeId)) return;
      financialSummary.value = fallback;
    } catch {
      if (isCurrentLoad(generation, routeId)) {
        financialSummary.value = null;
        pushContextWarning('resumo financeiro');
      }
    }
  } finally {
    if (!isCurrentLoad(generation, routeId)) return;
    try {
      const billingRecord = await billingService.getByEncounter(encounterId);
      if (!isCurrentLoad(generation, routeId)) return;
      billingStatus.value = billingRecord.status;
      const billingItems = await billingService.listItems(encounterId);
      if (!isCurrentLoad(generation, routeId)) return;
      billingItemCount.value = billingItems.length;
    } catch {
      if (isCurrentLoad(generation, routeId)) {
        billingStatus.value = null;
        billingItemCount.value = null;
        pushContextWarning('status/itens de cobrança');
      }
    }
    if (isCurrentLoad(generation, routeId)) financialLoading.value = false;
  }
}

async function handleFinancialClose() {
  if (!encounter.value) return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;
  closingFinancial.value = true;
  try {
    const updated = await encounterService.closeFinancial(currentEncounter.id, {
      notes: financialNotes.value.trim() || null
    });
    if (!isCurrentLoad(generation, routeId)) return;
    if (updated.encounterId && updated.encounterId !== currentEncounter.id) {
      alert('O resumo financeiro retornado não corresponde à rota atual.');
      return;
    }
    financialSummary.value = updated;
    showFinancialCloseModal.value = false;
    financialNotes.value = '';
    await refreshEnterpriseSummary(generation, routeId, currentEncounter.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      alert(err instanceof Error ? err.message : 'Erro ao fechar financeiro');
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) closingFinancial.value = false;
  }
}

async function prepareCashReceipt() {
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  preparingCashReceipt.value = true;
  try {
    const dashboard = await cashService.getDashboard();
    if (!isCurrentLoad(generation, routeId)) return;
    if (!dashboard.openRegister) {
      alert('Abra um caixa antes de registrar o recebimento em dinheiro');
      return;
    }
    cashReceiptRegisterId.value = dashboard.openRegister.id;
    showCashReceiptModal.value = true;
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      alert(err instanceof Error ? err.message : 'Erro ao consultar o caixa aberto');
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) preparingCashReceipt.value = false;
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { readonly status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

async function loadCashReceipt(
  generation = pageGeneration,
  routeId = routeEncounterId.value,
  encounterId = encounter.value?.id
) {
  if (!encounterId || !isCurrentLoad(generation, routeId)) return;
  cashReceiptLoading.value = true;
  cashReceiptError.value = '';
  cashReceiptRefreshWarning.value = '';
  try {
    const receipt = await encounterService.getCashReceiptForEncounter(encounterId, {
      includeReversed: true
    });
    if (!isCurrentLoad(generation, routeId)) return;
    cashReceipt.value = receipt;
    cashReceiptRefreshWarning.value = '';
  } catch (error: unknown) {
    if (!isCurrentLoad(generation, routeId)) return;
    if (getErrorStatus(error) === 404) {
      if (!cashReceiptReversed.value) {
        cashReceipt.value = null;
        cashReversal.value = null;
        cashReceiptRefreshWarning.value = '';
      } else {
        cashReceiptRefreshWarning.value =
          'Não foi possível reler o recebimento agora. O estorno confirmado permanece visível, mas consulte novamente para confirmar os metadados no servidor.';
      }
      return;
    }
    cashReceiptError.value =
      error instanceof Error ? error.message : 'Não foi possível consultar o recebimento em dinheiro.';
  } finally {
    if (isCurrentLoad(generation, routeId)) cashReceiptLoading.value = false;
  }
}

function createCashReceiptIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `cash-receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function handleCashReceipt() {
  const summary = financialSummary.value;
  if (!encounter.value || !summary || !cashReceiptRegisterId.value) return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;
  const payload = {
    cashRegisterId: cashReceiptRegisterId.value,
    expectedAmount: summary.total,
    notes: cashReceiptNotes.value.trim() || undefined
  };
  const fingerprint = JSON.stringify({ encounterId: currentEncounter.id, ...payload });
  const attempt = cashReceiptAttempt.value?.fingerprint === fingerprint
    ? cashReceiptAttempt.value
    : { fingerprint, key: createCashReceiptIdempotencyKey() };
  cashReceiptAttempt.value = attempt;
  receivingCash.value = true;
  try {
    const createdReceipt = await encounterService.createCashReceipt(
      currentEncounter.id,
      payload,
      attempt.key
    );
    if (!isCurrentLoad(generation, routeId)) return;
    cashReceipt.value = createdReceipt;
    cashReversal.value = null;
    cashReceiptError.value = '';
    cashReceiptAttempt.value = null;
    showCashReceiptModal.value = false;
    cashReceiptNotes.value = '';
    await refreshEnterpriseSummary(generation, routeId, currentEncounter.id);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar recebimento em dinheiro');
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) receivingCash.value = false;
  }
}

function createCashReversalIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `cash-reversal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function handleCashReversal() {
  const receipt = cashReceipt.value;
  const reason = cashReversalReason.value.trim();
  if (!encounter.value || !receipt || !reason || cashReceiptReversed.value || reversingCash.value) return;

  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const fingerprint = JSON.stringify({
    encounterId: encounter.value.id,
    receiptId: receipt.id,
    reason
  });
  const attempt = cashReversalAttempt.value?.fingerprint === fingerprint
    ? cashReversalAttempt.value
    : { fingerprint, key: createCashReversalIdempotencyKey() };
  cashReversalAttempt.value = attempt;
  reversingCash.value = true;
  cashReversalError.value = '';

  try {
    const reversal = await encounterService.reverseCashReceipt(
      encounter.value.id,
      receipt.id,
      reason,
      attempt.key
    );
    if (!isCurrentLoad(generation, routeId)) return;
    cashReversal.value = reversal;
    cashReversalAttempt.value = null;
    cashReversalReason.value = '';
    showCashReversalModal.value = false;
    await nextTick();
    cashReceiptReviewRef.value?.focus({ preventScroll: true });
    await refreshEnterpriseSummary(generation, routeId, encounter.value.id);
  } catch (error: unknown) {
    if (isCurrentLoad(generation, routeId)) {
      cashReversalError.value =
        error instanceof Error ? error.message : 'Não foi possível confirmar o estorno.';
    }
  } finally {
    if (isCurrentLoad(generation, routeId)) reversingCash.value = false;
  }
}

async function loadAttachments(
  generation = pageGeneration,
  routeId = routeEncounterId.value,
  encounterId = encounter.value?.id
) {
  if (!encounterId || !isCurrentLoad(generation, routeId)) return;
  attachmentsLoading.value = true;
  try {
    const nextAttachments = await attachmentService.list('encounter', encounterId);
    if (isCurrentLoad(generation, routeId)) attachments.value = nextAttachments;
  } catch {
    if (isCurrentLoad(generation, routeId)) pushContextWarning('anexos');
  } finally {
    if (isCurrentLoad(generation, routeId)) attachmentsLoading.value = false;
  }
}

async function uploadAttachment() {
  if (
    !encounter.value ||
    !newAttachment.value.fileName.trim() ||
    !newAttachment.value.checksum.trim()
  )
    return;
  const routeId = routeEncounterId.value;
  const generation = pageGeneration;
  const currentEncounter = encounter.value;
  if (!currentEncounter) return;
  uploadingAttachment.value = true;
  try {
    await attachmentService.upload({
      linkedEntityType: 'encounter',
      linkedEntityId: currentEncounter.id,
      category: 'document',
      fileName: newAttachment.value.fileName.trim(),
      mimeType: newAttachment.value.mimeType.trim() || 'application/pdf',
      checksum: newAttachment.value.checksum.trim()
    });
    if (!isCurrentLoad(generation, routeId)) return;
    newAttachment.value = { fileName: '', mimeType: 'application/pdf', checksum: '' };
    await loadAttachments(generation, routeId, currentEncounter.id);
  } catch {
    // Upload failure is non-critical
  } finally {
    if (isCurrentLoad(generation, routeId)) uploadingAttachment.value = false;
  }
}

async function loadPage(id: string) {
  const generation = ++pageGeneration;
  resetPageState();
  loading.value = true;
  if (!id) {
    loading.value = false;
    return;
  }

  try {
    const enc = await encounterService.getById(id);
    if (!isCurrentLoad(generation, id)) return;
    if (enc.id !== id) {
      throw new Error('O atendimento retornado não corresponde ao endereço solicitado.');
    }
    encounter.value = enc;
    hydrateClinicalHandoffForm(enc);
    await loadEntityNames(enc, generation, id);
    if (!isCurrentLoad(generation, id)) return;
    await Promise.all([
      loadTimeline(generation, id, enc.id),
      loadAttachments(generation, id, enc.id),
      refreshEnterpriseSummary(generation, id, enc.id),
      loadClinicalHandoff(generation, id, enc)
    ]);
  } catch (err: unknown) {
    if (isCurrentLoad(generation, id)) {
      error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimento';
    }
  } finally {
    if (isCurrentLoad(generation, id)) loading.value = false;
  }
}

watch(
  () => routeEncounterId.value,
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
.encounter-cockpit {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.patient-rail,
.workflow-panel {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.patient-rail {
  display: grid;
  gap: 16px;
  padding: 16px;
  position: sticky;
  top: 16px;
}

.patient-rail__identity {
  display: flex;
  gap: 12px;
  align-items: center;
}

.patient-rail__avatar {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #fff7ed;
  font-size: 22px;
}

.patient-rail__identity div,
.patient-rail__facts,
.patient-rail__actions {
  display: grid;
  gap: 8px;
}

.patient-rail__identity strong {
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.patient-rail__identity span:last-child,
.patient-rail__eyebrow,
.workflow-panel__eyebrow,
.muted {
  color: var(--color-text-muted, #64748b);
}

.patient-rail__eyebrow,
.workflow-panel__eyebrow {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.workflow-shell {
  display: grid;
  gap: 12px;
}

.workflow-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.workflow-tab {
  display: grid;
  gap: 4px;
  min-height: 86px;
  padding: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #ffffff;
  color: var(--color-text, #0f172a);
  text-align: left;
  cursor: pointer;
}

.workflow-tab--active {
  border-color: #f97316;
  box-shadow: inset 0 3px 0 #f97316;
}

.workflow-tab span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eef2ff;
  color: #1d4ed8;
  font-weight: 800;
  font-size: 12px;
}

.workflow-tab strong {
  font-size: 14px;
}

.workflow-tab small {
  color: var(--color-text-muted, #64748b);
}

.workflow-panel {
  min-height: 260px;
  padding: 18px;
}

.workflow-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 14px;
}

.workflow-panel__header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.workflow-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chief-complaint {
  margin: 0 0 14px;
  color: var(--color-text, #0f172a);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-bottom: 0;
}

.summary-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 14px;
  row-gap: 3px;
  align-items: center;
  padding: 18px;
  min-width: 0;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
  grid-row: 1 / -1;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1.15;
  min-width: 0;
  overflow-wrap: break-word;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  min-width: 0;
}

.support-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.detail-grid,
.detail-row {
  display: grid;
  gap: 8px;
}

.detail-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.detail-row {
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.detail-row__label {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.close-reason-block {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
}

.close-reason-block p {
  margin: 6px 0 0;
}

.pre-handoff {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #f8fafc;
}

.pre-handoff__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pre-handoff__header h3 {
  margin: 4px 0 0;
  font-size: 18px;
}

.pre-handoff__status {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: var(--color-text, #0f172a);
  font-size: 12px;
  font-weight: 700;
}

.pre-handoff__notice {
  margin: 0;
  color: var(--color-text-muted, #64748b);
}

.pre-handoff__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.handoff-status {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(180px, 0.6fr);
  gap: 12px;
}

.handoff-status > div {
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.handoff-status strong,
.handoff-status p {
  display: block;
  margin: 4px 0 0;
}

.handoff-form {
  display: grid;
  gap: 12px;
}

.handoff-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 8px;
}

.handoff-form__select {
  min-height: 38px;
  min-width: 140px;
  padding: 7px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 8px;
  background: #ffffff;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-event {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  font-size: 13px;
}

.timeline-event__type {
  font-weight: 600;
  flex-shrink: 0;
}

.timeline-event__summary {
  flex: 1;
}

.timeline-event__time {
  color: var(--color-text-muted, #94a3b8);
  flex-shrink: 0;
}

.transition-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
}

.form-field__textarea {
  resize: vertical;
  min-height: 80px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.attachment-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 6px;
  font-size: 13px;
}

.attachment-item__icon {
  flex-shrink: 0;
}

.attachment-item__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item__category {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
  text-transform: uppercase;
}

.attachment-upload {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 8px;
  align-items: end;
}

.attachment-upload > * {
  min-width: 0;
}

.cash-receipt-review {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #d5e2e6);
  border-radius: var(--radius-lg, 0.75rem);
  background: var(--color-bg-subtle, #f5f9fa);
}

.cash-receipt-review__header,
.cash-receipt-review__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.cash-receipt-review__header h3 {
  margin: 0.2rem 0 0;
  color: var(--color-text, #112530);
  font-size: var(--font-size-lg, 1.125rem);
}

.cash-receipt-review__actions {
  align-items: center;
  flex-wrap: wrap;
}

.cash-receipt-review code {
  overflow-wrap: anywhere;
}

@media (max-width: 960px) {
  .encounter-cockpit,
  .support-grid {
    grid-template-columns: 1fr;
  }

  .patient-rail {
    position: static;
  }

  .workflow-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-panel__header {
    flex-direction: column;
  }

  .pre-handoff__header {
    flex-direction: column;
  }

  .handoff-status {
    grid-template-columns: 1fr;
  }

  .attachment-upload {
    grid-template-columns: 1fr;
  }

  .cash-receipt-review__header,
  .cash-receipt-review__actions {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .summary-grid,
  .summary-grid--compact {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
:root[data-theme='dark'] .encounter-detail-page .patient-rail__avatar {
  background: var(--color-warning-50);
}

:root[data-theme='dark'] .encounter-detail-page .workflow-tab {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

:root[data-theme='dark'] .encounter-detail-page .workflow-tab:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

:root[data-theme='dark'] .encounter-detail-page .workflow-tab--active {
  border-color: var(--color-warning-400);
  box-shadow: inset 0 3px 0 var(--color-warning-400);
}

:root[data-theme='dark'] .encounter-detail-page .workflow-tab span {
  background: var(--color-primary-subtle);
  color: var(--color-text-link);
}

:root[data-theme='dark'] .encounter-detail-page .summary-card__icon {
  background: var(--color-primary-subtle);
}

:root[data-theme='dark'] .encounter-detail-page .close-reason-block {
  border-color: var(--color-success-200);
  background: var(--color-success-50);
}

:root[data-theme='dark'] .encounter-detail-page .pre-handoff {
  border-color: var(--color-border);
  background: var(--color-bg-subtle);
}

:root[data-theme='dark'] .encounter-detail-page .pre-handoff__status {
  background: var(--color-border);
  color: var(--color-text);
}

:root[data-theme='dark'] .encounter-detail-page .handoff-status > div {
  border-color: var(--color-primary-200);
  background: var(--color-primary-50);
}

:root[data-theme='dark'] .encounter-detail-page .handoff-form__select {
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
