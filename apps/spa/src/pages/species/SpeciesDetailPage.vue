<template>
  <div class="species-detail-page">
    <AppPageHeader
      title="Detalhes da Espécie"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Espécies', species?.name ?? 'Detalhes']"
      :subtitle="species?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/species')">Voltar</DsButton>
        <DsButton variant="secondary" :disabled="!species" @click="duplicateSpecies">Duplicar</DsButton>
        <DsButton variant="secondary" :disabled="!species" @click="deleteSpecies">Excluir</DsButton>
        <DsButton variant="primary" :disabled="!species" @click="router.push(`/species/${speciesId}/edit`)">
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

    <div v-if="species" class="detail-layout">
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
        <DsCard title="Dados da Espécie">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ species.id }}</div>
            <div><strong>Código:</strong> {{ species.code ?? '—' }}</div>
            <div><strong>Descrição:</strong> {{ species.name }}</div>
            <div><strong>Código operacional:</strong> {{ animalSpeciesSystemLabel(species.systemCode) }}</div>
            <div><strong>Status:</strong> {{ species.active ? 'Ativa' : 'Inativa' }}</div>
            <div><strong>Observação:</strong> {{ species.description ?? '—' }}</div>
            <div><strong>Criado em:</strong> {{ formatDateTime(species.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(species.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Animais:</strong> opção exibida no cadastro e filtros de animais.</div>
            <div><strong>Raças:</strong> controla agrupamento e busca das raças cadastradas.</div>
            <div><strong>Atendimento:</strong> melhora triagem, prontuário, internação e relatórios.</div>
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
import {
  animalSpeciesService,
  animalSpeciesSystemLabel,
  type AnimalSpeciesSummary
} from '@/services/species';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const router = useRouter();
const route = useRoute();
const speciesId = computed(() => route.params.id as string);
const species = ref<AnimalSpeciesSummary | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => {
  if (!species.value) return [];
  return [
    { label: 'Código', value: species.value.code || '—', hint: 'Referência Vetus' },
    { label: 'Operacional', value: animalSpeciesSystemLabel(species.value.systemCode), hint: 'Valor do animal' },
    { label: 'Status', value: species.value.active ? 'Ativa' : 'Inativa', hint: 'Disponibilidade' },
    { label: 'Atualizado', value: formatDateTime(species.value.updatedAt), hint: 'Última alteração' }
  ];
});

async function loadSpecies() {
  loading.value = true;
  error.value = '';
  try {
    species.value = await animalSpeciesService.getById(speciesId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar espécie';
  } finally {
    loading.value = false;
  }
}

async function duplicateSpecies() {
  if (!species.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    const duplicated = await animalSpeciesService.create({
      name: `${species.value.name} - cópia`,
      code: species.value.code ? `${species.value.code}-COPIA` : null,
      systemCode: species.value.systemCode,
      description: species.value.description,
      active: false
    });
    successMessage.value = 'Espécie duplicada com sucesso.';
    await router.push(`/species/${duplicated.id}/edit`);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao duplicar espécie';
  }
}

async function deleteSpecies() {
  if (!species.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    await animalSpeciesService.delete(species.value.id);
    successMessage.value = 'Espécie excluída com sucesso.';
    await router.push('/species');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao excluir espécie';
  }
}

onMounted(loadSpecies);
</script>

<style scoped>
.species-detail-page,
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

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>
