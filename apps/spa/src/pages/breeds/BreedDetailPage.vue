<template>
  <div class="breed-detail-page">
    <AppPageHeader
      title="Detalhes da Raça"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Raças', breed?.name ?? 'Detalhes']"
      :subtitle="breed?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/breeds')">Voltar</DsButton>
        <DsButton variant="secondary" :disabled="!breed" @click="duplicateBreed">Duplicar</DsButton>
        <DsButton variant="secondary" :disabled="!breed" @click="deleteBreed">Excluir</DsButton>
        <DsButton variant="primary" :disabled="!breed" @click="router.push(`/breeds/${breedId}/edit`)">
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

    <div v-if="breed" class="detail-layout">
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
        <DsCard title="Dados da Raça">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ breed.id }}</div>
            <div><strong>Código:</strong> {{ breed.code ?? '—' }}</div>
            <div><strong>Descrição:</strong> {{ breed.name }}</div>
            <div><strong>Espécie:</strong> {{ breedSpeciesLabel(breed.species) }}</div>
            <div><strong>Status:</strong> {{ breed.active ? 'Ativa' : 'Inativa' }}</div>
            <div><strong>Observação:</strong> {{ breed.description ?? '—' }}</div>
            <div><strong>Criado em:</strong> {{ formatDateTime(breed.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(breed.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Animais:</strong> opção exibida no cadastro de animal da mesma espécie.</div>
            <div><strong>Clientes:</strong> preserva vínculo indireto pela ficha do animal.</div>
            <div><strong>Atendimento:</strong> melhora triagem, prontuário e histórico clínico.</div>
            <div><strong>Relatórios:</strong> base para filtros por raça e espécie.</div>
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
import { breedSpeciesLabel, breedsService, type BreedSummary } from '@/services/breeds';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const router = useRouter();
const route = useRoute();
const breedId = computed(() => route.params.id as string);
const breed = ref<BreedSummary | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => {
  if (!breed.value) return [];
  return [
    { label: 'Código', value: breed.value.code || '—', hint: 'Referência Vetus' },
    { label: 'Espécie', value: breedSpeciesLabel(breed.value.species), hint: 'Classificação' },
    { label: 'Status', value: breed.value.active ? 'Ativa' : 'Inativa', hint: 'Disponibilidade' },
    { label: 'Atualizado', value: formatDateTime(breed.value.updatedAt), hint: 'Última alteração' }
  ];
});

async function loadBreed() {
  loading.value = true;
  error.value = '';
  try {
    breed.value = await breedsService.getById(breedId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar raça';
  } finally {
    loading.value = false;
  }
}

async function duplicateBreed() {
  if (!breed.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    const duplicated = await breedsService.create({
      name: `${breed.value.name} - cópia`,
      code: breed.value.code ? `${breed.value.code}-COPIA` : null,
      species: breed.value.species,
      description: breed.value.description,
      active: false
    });
    successMessage.value = 'Raça duplicada com sucesso.';
    await router.push(`/breeds/${duplicated.id}/edit`);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao duplicar raça';
  }
}

async function deleteBreed() {
  if (!breed.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    await breedsService.delete(breed.value.id);
    successMessage.value = 'Raça excluída com sucesso.';
    await router.push('/breeds');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao excluir raça';
  }
}

onMounted(loadBreed);
</script>

<style scoped>
.breed-detail-page,
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
