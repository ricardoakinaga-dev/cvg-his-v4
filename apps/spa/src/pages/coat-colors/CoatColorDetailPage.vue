<template>
  <div class="coat-color-detail-page">
    <AppPageHeader
      title="Detalhes da Cor/Pelagem"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Cores/Pelagens', coatColor?.name ?? 'Detalhes']"
      :subtitle="coatColor?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/coat-colors')">Voltar</DsButton>
        <DsButton variant="secondary" :disabled="!coatColor" @click="duplicateCoatColor">Duplicar</DsButton>
        <DsButton variant="secondary" :disabled="!coatColor" @click="deleteCoatColor">Excluir</DsButton>
        <DsButton variant="primary" :disabled="!coatColor" @click="router.push(`/coat-colors/${coatColorId}/edit`)">
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

    <div v-if="coatColor" class="detail-layout">
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
        <DsCard title="Dados da Cor/Pelagem">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ coatColor.id }}</div>
            <div><strong>Código:</strong> {{ coatColor.code ?? '—' }}</div>
            <div class="swatch-row">
              <strong>Descrição:</strong>
              <span class="coat-swatch" :style="{ backgroundColor: coatColor.hexColor ?? '#e2e8f0' }" />
              {{ coatColor.name }}
            </div>
            <div><strong>Grupo:</strong> {{ coatColor.colorGroup ?? '—' }}</div>
            <div><strong>Cor visual:</strong> {{ coatColor.hexColor ?? '—' }}</div>
            <div><strong>Status:</strong> {{ coatColor.active ? 'Ativa' : 'Inativa' }}</div>
            <div><strong>Observação:</strong> {{ coatColor.description ?? '—' }}</div>
            <div><strong>Criado em:</strong> {{ formatDateTime(coatColor.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(coatColor.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Animais:</strong> base para identificação visual do cadastro do animal.</div>
            <div><strong>Atendimento:</strong> permite padronização de triagem, prontuário e internação.</div>
            <div><strong>Relatórios:</strong> facilita buscas por grupo, cor e status ativo.</div>
            <div><strong>Importação Vetus:</strong> código externo pronto para conciliação cadastral.</div>
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
import { coatColorService, type CoatColorSummary } from '@/services/coatColors';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const router = useRouter();
const route = useRoute();
const coatColorId = computed(() => route.params.id as string);
const coatColor = ref<CoatColorSummary | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => {
  if (!coatColor.value) return [];
  return [
    { label: 'Código', value: coatColor.value.code || '—', hint: 'Referência Vetus' },
    { label: 'Grupo', value: coatColor.value.colorGroup || '—', hint: 'Classificação' },
    { label: 'Status', value: coatColor.value.active ? 'Ativa' : 'Inativa', hint: 'Disponibilidade' },
    { label: 'Atualizado', value: formatDateTime(coatColor.value.updatedAt), hint: 'Última alteração' }
  ];
});

async function loadCoatColor() {
  loading.value = true;
  error.value = '';
  try {
    coatColor.value = await coatColorService.getById(coatColorId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cor/pelagem';
  } finally {
    loading.value = false;
  }
}

async function duplicateCoatColor() {
  if (!coatColor.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    const duplicated = await coatColorService.create({
      name: `${coatColor.value.name} - cópia`,
      code: coatColor.value.code ? `${coatColor.value.code}-COPIA` : null,
      colorGroup: coatColor.value.colorGroup,
      hexColor: coatColor.value.hexColor,
      description: coatColor.value.description,
      active: false
    });
    successMessage.value = 'Cor/Pelagem duplicada com sucesso.';
    await router.push(`/coat-colors/${duplicated.id}/edit`);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao duplicar cor/pelagem';
  }
}

async function deleteCoatColor() {
  if (!coatColor.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    await coatColorService.delete(coatColor.value.id);
    successMessage.value = 'Cor/Pelagem excluída com sucesso.';
    await router.push('/coat-colors');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao excluir cor/pelagem';
  }
}

onMounted(loadCoatColor);
</script>

<style scoped>
.coat-color-detail-page,
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

.swatch-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.coat-swatch {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 4px;
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

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>
