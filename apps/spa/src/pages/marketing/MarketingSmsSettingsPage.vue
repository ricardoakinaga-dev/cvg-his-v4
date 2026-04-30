<template>
  <div class="sms-settings-page">
    <AppPageHeader
      title="Configurações de SMS"
      :breadcrumbs="['Marketing', 'Configurações', 'Configurações de SMS']"
      subtitle="Automações SMS Vetus-like para agenda e aniversários, sem disparo ou salvamento real"
      :primary-action="{ label: 'Salvar', disabled: true }"
    />

    <DsAlert variant="warning">
      Superfície segura para preservar a ordem Vetus de Marketing. As automações podem ser revisadas localmente;
      salvar, consumir saldo e disparar SMS permanecem bloqueados até existir contrato auditável.
    </DsAlert>

    <DsAlert v-if="statusMessage" variant="success" dismissible @dismiss="statusMessage = ''">
      {{ statusMessage }}
    </DsAlert>

    <section class="sms-settings-summary-grid" aria-label="Resumo das configurações de SMS">
      <DsStatCard label="Automações Vetus mapeadas" value="3" />
      <DsStatCard label="Saldo não consumido" value="0 SMS" />
      <DsStatCard label="Salvar bloqueado" value="Segurança" />
      <DsStatCard label="Sem automação real" value="Canal" />
    </section>

    <form class="sms-settings-form" aria-label="Configurações de SMS" @submit.prevent="prepareSettings">
      <section class="sms-settings-options" aria-label="Automações de SMS">
        <h2>Automações</h2>

        <div v-for="automation in automations" :key="automation.id" class="sms-settings-option">
          <DsCheckbox :id="automation.inputId" v-model="automation.enabled.value" :label="automation.label" />
          <p :id="`${automation.inputId}-hint`">Só funcionará se tiver saldo de SMS</p>
        </div>
      </section>

      <div class="sms-settings-actions">
        <DsButton
          id="marketing-sms-settings-preview"
          variant="primary"
          type="button"
          @click="prepareSettings"
        >
          Preparar configuração
        </DsButton>
        <DsButton variant="secondary" type="button" @click="restoreVetusState">Restaurar padrão Vetus</DsButton>
        <DsButton id="marketing-sms-settings-save" variant="primary" disabled>Salvar</DsButton>
      </div>
    </form>

    <section class="sms-settings-preview" aria-label="Prévia das configurações de SMS">
      <h2>Prévia segura</h2>
      <dl>
        <div v-for="automation in automations" :key="automation.id">
          <dt>{{ automation.previewLabel }}</dt>
          <dd>{{ automation.enabled.value ? 'Ativo' : 'Inativo' }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCheckbox from '@cvg-his-v2/design-system/vue/DsCheckbox.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const agendaSms = ref(true);
const animalBirthdaySms = ref(true);
const clientBirthdaySms = ref(true);
const statusMessage = ref('');

const automations = [
  {
    id: 'agenda',
    inputId: 'marketing-sms-agenda',
    label: 'Enviar SMS automático dos agendamentos para os clientes',
    previewLabel: 'Agendamentos',
    enabled: agendaSms
  },
  {
    id: 'animal-birthday',
    inputId: 'marketing-sms-animal-birthday',
    label: 'Enviar SMS automático para os Animais aniversariantes do dia',
    previewLabel: 'Animais aniversariantes',
    enabled: animalBirthdaySms
  },
  {
    id: 'client-birthday',
    inputId: 'marketing-sms-client-birthday',
    label: 'Enviar SMS automático para os Clientes aniversariantes do dia',
    previewLabel: 'Clientes aniversariantes',
    enabled: clientBirthdaySms
  }
];

function prepareSettings() {
  statusMessage.value = 'Configuração preparada sem salvar';
}

function restoreVetusState() {
  agendaSms.value = true;
  animalBirthdaySms.value = true;
  clientBirthdaySms.value = true;
  statusMessage.value = '';
}
</script>

<style scoped>
.sms-settings-page {
  display: grid;
  gap: 16px;
}

.sms-settings-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sms-settings-form {
  display: grid;
  gap: 12px;
}

.sms-settings-options,
.sms-settings-preview {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.sms-settings-options h2,
.sms-settings-preview h2 {
  font-size: 18px;
  line-height: 1.3;
  margin: 0;
}

.sms-settings-option {
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: grid;
  gap: 4px;
  padding-top: 12px;
}

.sms-settings-option:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.sms-settings-option p {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
  padding-left: 28px;
}

.sms-settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sms-settings-preview dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.sms-settings-preview dl > div {
  align-items: center;
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding-top: 12px;
}

.sms-settings-preview dl > div:first-child {
  border-top: 0;
  padding-top: 0;
}

.sms-settings-preview dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.sms-settings-preview dd {
  font-weight: 700;
  margin: 0;
}

@media (max-width: 900px) {
  .sms-settings-summary-grid {
    grid-template-columns: 1fr;
  }

  .sms-settings-preview dl > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
