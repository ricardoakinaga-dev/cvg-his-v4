<template>
  <div class="term-detail-page">
    <AppPageHeader
      title="Detalhes do Termo"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Termos de Responsabilidade', term?.title ?? 'Detalhes']"
      :subtitle="term?.title ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/responsibility-terms')">Voltar</DsButton>
        <DsButton variant="secondary" :disabled="!term" @click="duplicateTerm">Duplicar</DsButton>
        <DsButton variant="secondary" :disabled="!term" @click="printTerm">Imprimir</DsButton>
        <DsButton variant="primary" :disabled="!term" @click="router.push(`/responsibility-terms/${termId}/edit`)">
          Editar Cadastro
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div v-if="term" class="detail-layout">
      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="detail-grid">
        <DsCard title="Dados do Termo">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ term.id }}</div>
            <div><strong>Código:</strong> {{ term.code ?? '—' }}</div>
            <div><strong>Descrição:</strong> {{ term.title }}</div>
            <div><strong>Tipo de uso:</strong> {{ responsibilityTermUsageLabel(term.usageContext) }}</div>
            <div><strong>Status:</strong> {{ term.active ? 'Ativo' : 'Inativo' }}</div>
            <div><strong>Assinatura do responsável:</strong> {{ term.requiresOwnerSignature ? 'Sim' : 'Não' }}</div>
            <div><strong>Assinatura de testemunha:</strong> {{ term.requiresWitnessSignature ? 'Sim' : 'Não' }}</div>
            <div><strong>Criado em:</strong> {{ formatDateTime(term.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(term.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Texto do Termo">
          <pre class="term-content">{{ term.content }}</pre>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Atendimento:</strong> modelo disponível para consentimento do tutor.</div>
            <div><strong>Internação:</strong> autorização e ciência de riscos para permanência assistencial.</div>
            <div><strong>Procedimentos:</strong> suporte documental para anestesia, cirurgia e exames sensíveis.</div>
            <div><strong>Prontuário/Comanda:</strong> preparado para impressão, assinatura e anexação ao caso.</div>
          </div>
        </DsCard>
      </div>
    </div>

    <div v-else-if="loading" class="loading">Carregando...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import {
  responsibilityTermsService,
  responsibilityTermUsageLabel,
  type ResponsibilityTermSummary
} from '@/services/responsibilityTerms';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const router = useRouter();
const route = useRoute();
const termId = computed(() => route.params.id as string);
const term = ref<ResponsibilityTermSummary | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => {
  if (!term.value) return [];
  return [
    { label: 'Código', value: term.value.code || '—', hint: 'Referência documental' },
    { label: 'Uso', value: responsibilityTermUsageLabel(term.value.usageContext), hint: 'Fluxo operacional' },
    { label: 'Status', value: term.value.active ? 'Ativo' : 'Inativo', hint: 'Disponibilidade' },
    { label: 'Atualizado', value: formatDateTime(term.value.updatedAt), hint: 'Última alteração' }
  ];
});

async function loadTerm() {
  loading.value = true;
  error.value = '';
  try {
    term.value = await responsibilityTermsService.getById(termId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar termo de responsabilidade';
  } finally {
    loading.value = false;
  }
}

async function duplicateTerm() {
  if (!term.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    const duplicated = await responsibilityTermsService.create({
      title: `${term.value.title} - cópia`,
      code: term.value.code ? `${term.value.code}-COPIA` : null,
      usageContext: term.value.usageContext,
      content: term.value.content,
      active: false,
      requiresOwnerSignature: term.value.requiresOwnerSignature,
      requiresWitnessSignature: term.value.requiresWitnessSignature
    });
    successMessage.value = 'Termo duplicado com sucesso.';
    await router.push(`/responsibility-terms/${duplicated.id}/edit`);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao duplicar termo';
  }
}

function printTerm() {
  window.print();
}

onMounted(loadTerm);
</script>

<style scoped>
.term-detail-page,
.detail-layout,
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-card__value {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 800;
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.term-content {
  margin: 0;
  padding: 14px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
  font: inherit;
}

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>
