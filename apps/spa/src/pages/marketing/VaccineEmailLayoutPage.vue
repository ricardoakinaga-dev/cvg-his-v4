<template>
  <div class="vaccine-email-page">
    <AppPageHeader
      title="Layout de Email de Vacina"
      :breadcrumbs="['Marketing', 'Configurações', 'Layout de Email de Vacina']"
      subtitle="Template seguro de lembrete vacinal, sem envio ou salvamento real"
      :primary-action="{ label: 'Salvar', disabled: true }"
    />

    <DsAlert variant="warning">
      Superfície segura para preservar a ordem Vetus de Marketing. O template pode ser preparado localmente; salvar,
      enviar email e alterar automações permanecem bloqueados até existir contrato auditável.
    </DsAlert>

    <DsAlert v-if="statusMessage" variant="success" dismissible @dismiss="statusMessage = ''">
      {{ statusMessage }}
    </DsAlert>

    <section class="vaccine-email-summary-grid" aria-label="Resumo do layout de email de vacina">
      <DsStatCard label="Template de vacina preventivo" value="Email" />
      <DsStatCard :label="`${dynamicKeys.length} chaves Vetus`" value="Chaves" />
      <DsStatCard label="Salvar bloqueado" value="Segurança" />
      <DsStatCard label="Sem envio real" value="Canal" />
    </section>

    <form class="vaccine-email-form" aria-label="Layout de e-mail de vacina" @submit.prevent="preparePreview">
      <DsInput
        id="vaccine-email-title"
        v-model="title"
        label="Título do Email"
        :maxlength="200"
        autocomplete="off"
      />

      <DsInput
        id="vaccine-email-body"
        v-model="body"
        label="Corpo do Email"
        type="textarea"
        :rows="9"
        autocomplete="off"
      />

      <section class="vaccine-email-keys" aria-label="Chaves dinâmicas do email de vacina">
        <h2>Chaves</h2>
        <div class="vaccine-email-keys__grid">
          <DsButton
            v-for="key in dynamicKeys"
            :key="key"
            variant="secondary"
            size="sm"
            type="button"
            :data-token="key"
            @click="insertKey(key)"
          >
            {{ key }}
          </DsButton>
        </div>
      </section>

      <div class="vaccine-email-actions">
        <DsButton
          id="vaccine-email-preview-button"
          variant="primary"
          type="submit"
          :disabled="!canPreparePreview"
          @click="preparePreview"
        >
          Preparar prévia
        </DsButton>
        <DsButton variant="secondary" type="button" @click="resetTemplate">Restaurar padrão</DsButton>
        <DsButton id="vaccine-email-save" variant="primary" disabled>Salvar</DsButton>
      </div>
    </form>

    <section class="vaccine-email-preview" aria-label="Prévia do email de vacina">
      <h2>Prévia do email</h2>
      <dl>
        <div>
          <dt>Título</dt>
          <dd>{{ previewTitle }}</dd>
        </div>
        <div>
          <dt>Corpo</dt>
          <dd class="vaccine-email-preview__body">{{ previewBody }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const DEFAULT_TITLE = 'Lembrete Vacinas Anuais';
const DEFAULT_BODY = [
  'Olá,',
  '',
  'Gostaríamos de lembrar que esse mês, precisamos fazer o reforço das vacinas anuais da @NOME@.',
  '',
  'Atenciosamente,',
  '@NOMEDACLINICA@'
].join('\n');

const dynamicKeys = [
  '@ESPECIE@',
  '@RACA@',
  '@COR@',
  '@SEXO@',
  '@IDADE@',
  '@NOME@',
  '@DATAEHORAATUAL@',
  '@DIAATUAL@',
  '@MESATUAL@',
  '@ANOATUAL@',
  '@CLIENTE@',
  '@ENDERECO@',
  '@CIDADE@',
  '@DATADAVACINA@',
  '@VACINA@',
  '@NOMEDACLINICA@',
  '@ENDERECODACLINICA@',
  '@TELEFONE1DACLINICA@',
  '@TELEFONE2DACLINICA@',
  '@LOGOTIPO@'
];

const sampleValues: Record<string, string> = {
  '@ESPECIE@': 'Canina',
  '@RACA@': 'SRD',
  '@COR@': 'Caramelo',
  '@SEXO@': 'Fêmea',
  '@IDADE@': '4 anos',
  '@NOME@': 'Luna',
  '@DATAEHORAATUAL@': '30/04/2026 09:00',
  '@DIAATUAL@': '30',
  '@MESATUAL@': '04',
  '@ANOATUAL@': '2026',
  '@CLIENTE@': 'Maria Souza',
  '@ENDERECO@': 'Rua Guarapiranga, 100',
  '@CIDADE@': 'São Paulo',
  '@DATADAVACINA@': '30/04/2026',
  '@VACINA@': 'V10',
  '@NOMEDACLINICA@': 'Centro Veterinário Guarapiranga',
  '@ENDERECODACLINICA@': 'Av. Guarapiranga, 123',
  '@TELEFONE1DACLINICA@': '(11) 99999-1111',
  '@TELEFONE2DACLINICA@': '(11) 3333-2222',
  '@LOGOTIPO@': '[logotipo da clínica]'
};

const title = ref(DEFAULT_TITLE);
const body = ref(DEFAULT_BODY);
const preparedTitle = ref('');
const preparedBody = ref('');
const statusMessage = ref('');

const canPreparePreview = computed(() => Boolean(title.value.trim() && body.value.trim()));
const previewTitle = computed(() => preparedTitle.value || replaceKeys(title.value));
const previewBody = computed(() => preparedBody.value || replaceKeys(body.value));

function preparePreview() {
  if (!canPreparePreview.value) return;
  preparedTitle.value = replaceKeys(title.value.trim());
  preparedBody.value = replaceKeys(body.value.trim());
  statusMessage.value = 'Layout preparado sem salvar';
}

function insertKey(key: string) {
  body.value = `${body.value}${key}`;
}

function resetTemplate() {
  title.value = DEFAULT_TITLE;
  body.value = DEFAULT_BODY;
  preparedTitle.value = '';
  preparedBody.value = '';
  statusMessage.value = '';
}

function replaceKeys(value: string): string {
  return dynamicKeys.reduce((result, key) => result.replaceAll(key, sampleValues[key] ?? key), value);
}
</script>

<style scoped>
.vaccine-email-page {
  display: grid;
  gap: 16px;
}

.vaccine-email-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.vaccine-email-form {
  display: grid;
  gap: 12px;
}

.vaccine-email-keys,
.vaccine-email-preview {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.vaccine-email-keys h2,
.vaccine-email-preview h2 {
  font-size: 18px;
  line-height: 1.3;
  margin: 0;
}

.vaccine-email-keys__grid,
.vaccine-email-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vaccine-email-preview dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.vaccine-email-preview dl > div {
  display: grid;
  gap: 4px;
}

.vaccine-email-preview dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.vaccine-email-preview dd {
  margin: 0;
}

.vaccine-email-preview__body {
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .vaccine-email-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
