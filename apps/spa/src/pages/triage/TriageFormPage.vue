<template>
  <div class="triage-form-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Atendimentos', 'Triagem', 'Nova Triagem']"
      title="Nova Triagem"
      subtitle="Atendimento > Triagem. Registre prioridade, destino e alertas para orientar o próximo passo do caso."
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/queue">🏥 Ver Fila</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="triage-form-page__layout">
      <DsCard>
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <DsInput
              id="encounterId"
              v-model="form.encounterId"
              label="Atendimento *"
              placeholder="ID do atendimento"
              required
            />
            <DsInput
              id="patientId"
              v-model="form.patientId"
              label="Paciente *"
              placeholder="ID do paciente"
              required
            />
          </div>

          <div class="form-row">
            <DsInput
              id="priority"
              v-model="form.priority"
              type="select"
              label="Prioridade *"
              required
            >
              <option value="" disabled>Selecione a prioridade</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </DsInput>
            <DsInput
              id="destination"
              v-model="form.destination"
              type="select"
              label="Destino *"
              required
            >
              <option value="" disabled>Selecione o destino</option>
              <option value="in_care">Em Atendimento</option>
              <option value="observation">Observação</option>
            </DsInput>
          </div>

          <DsInput
            id="chiefComplaint"
            v-model="form.chiefComplaint"
            type="textarea"
            label="Queixa Principal *"
            placeholder="Descreva a queixa principal"
            :rows="3"
            required
          />

          <DsInput
            id="initialNotes"
            v-model="form.initialNotes"
            type="textarea"
            label="Notas Iniciais"
            placeholder="Notas adicionais (opcional)"
            :rows="3"
          />

          <DsInput
            id="alerts"
            v-model="alertsInput"
            label="Alertas"
            placeholder="Separe por vírgulas (ex: alergia, jejum)"
            hint="Separe múltiplos alertas por vírgula"
          />

          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="saving">
              {{ saving ? 'Salvando...' : 'Registrar Triagem' }}
            </DsButton>
            <DsButton variant="secondary" tag="a" href="/triage">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="triage-form-page__aside">
        <DsCard title="Resumo em tempo real">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Boas práticas">
          <ul class="guide-list">
            <li>Use prioridade crítica apenas quando houver risco imediato.</li>
            <li>Destino deve refletir o próximo passo real entre atendimento e observação.</li>
            <li>Alertas precisam ser curtos, objetivos e fáceis de ler na passagem de plantão.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { createTriage } from '@/services/triage';
import type { CreateTriageRequest, TriagePriority, TriageDestination } from '@/types/triage';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const router = useRouter();
const error = ref('');
const saving = ref(false);

const form = ref<CreateTriageRequest>({
  encounterId: '',
  patientId: '',
  priority: 'medium' as TriagePriority,
  chiefComplaint: '',
  initialNotes: '',
  alerts: [],
  destination: 'in_care' as TriageDestination
});

const alertsInput = ref('');

const summaryCards = computed(() => [
  { label: 'Atendimento', value: form.value.encounterId.trim() || '—', hint: 'Vínculo assistencial' },
  { label: 'Paciente', value: form.value.patientId.trim() || '—', hint: 'Identificação clínica' },
  {
    label: 'Prioridade',
    value:
      form.value.priority === 'critical'
        ? 'Crítica'
        : form.value.priority === 'high'
          ? 'Alta'
          : form.value.priority === 'medium'
            ? 'Média'
            : 'Baixa',
    hint: 'Classificação inicial'
  },
  {
    label: 'Destino',
    value: form.value.destination === 'in_care' ? 'Em Atendimento' : 'Observação',
    hint: 'Direcionamento do fluxo'
  }
]);

function applyQueryPrefill() {
  const params = new URLSearchParams(window.location.search);
  const encounterId = params.get('encounterId')?.trim();
  const patientId = params.get('patientId')?.trim();

  if (encounterId) {
    form.value.encounterId = encounterId;
  }

  if (patientId) {
    form.value.patientId = patientId;
  }
}

async function handleSubmit() {
  error.value = '';
  saving.value = true;

  try {
    const payload: CreateTriageRequest = {
      ...form.value,
      alerts: alertsInput.value
        ? alertsInput.value
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : []
    };

    const record = await createTriage(payload);
    router.push(`/triage/${record.id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao registrar triagem';
    error.value = message;
  } finally {
    saving.value = false;
  }
}

applyQueryPrefill();
</script>

<style scoped>
.triage-form-page {
  width: 100%;
}

.triage-form-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}

.triage-form-page__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .triage-form-page__layout {
    grid-template-columns: 1fr;
  }

  .triage-form-page__aside {
    position: static;
  }
}
</style>
