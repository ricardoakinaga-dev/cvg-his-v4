<template>
  <div class="enterprise-page">
    <AppPageHeader :breadcrumbs="['Laboratório', 'Resultados']">
      <template #title>Resultados de Exame</template>
      <template #subtitle>Revise os achados e acompanhe a liberação dos exames.</template>
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="loading || Boolean(updatingId)" @click="loadResults">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <DsCard title="Resultados">
      <div v-if="loading" class="results-loading" role="status">Carregando resultados…</div>
      <EmptyState v-else-if="loadFailed" icon="🧪" title="Resultados indisponíveis" description="Não foi possível carregar os exames. Tente novamente para consultar os resultados." size="sm">
        <template #action><DsButton variant="primary" @click="loadResults">Tentar novamente</DsButton></template>
      </EmptyState>
      <EmptyState v-else-if="items.length === 0" icon="🧪" title="Nenhum resultado disponível" description="Consulte as solicitações para acompanhar os exames em andamento." size="sm">
        <template #action><DsButton tag="a" to="/exam-orders" variant="secondary">Ver solicitações</DsButton></template>
      </EmptyState>
      <div v-else class="results-stack">
        <div v-for="item in items" :key="item.id" class="result-card">
          <div class="result-card__header">
            <div>
              <strong>{{ item.examName }}</strong>
              <p>Paciente · <RouterLink :to="`/patients/${item.patientId}`">{{ item.patientId }}</RouterLink></p>
              <DsBadge :variant="item.status === 'released' ? 'success' : item.status === 'cancelled' ? 'danger' : 'default'">{{ statusLabels[item.status] }}</DsBadge>
            </div>
            <div class="quick-actions">
              <DsButton size="sm" variant="secondary" :disabled="Boolean(updatingId)" :loading="updatingId === item.id" @click="updateResult(item.id, 'released')">
                Liberar
              </DsButton>
              <DsButton size="sm" variant="ghost" :disabled="Boolean(updatingId)" :loading="updatingId === item.id" @click="updateResult(item.id, 'cancelled')">
                Cancelar
              </DsButton>
            </div>
          </div>
          <DsInput
            :model-value="drafts[item.id] ?? item.findings ?? ''"
            label="Achados / interpretação"
            type="textarea"
            :rows="3"
            @update:model-value="setDraft(item.id, String($event ?? ''))"
          />
        </div>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { examApiService } from '@/services/examApi';
import type { ExamResultRecord } from '@/types/examApi';

const items = ref<ExamResultRecord[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const statusLabels = { draft: 'Rascunho', released: 'Liberado', cancelled: 'Cancelado' };
const updatingId = ref('');
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const drafts = ref<Record<string, string>>({});

function setDraft(id: string, value: string) {
  drafts.value = { ...drafts.value, [id]: value };
}

async function loadResults() {
  loading.value = true;
  loadFailed.value = false;
  notice.value = null;
  try {
    items.value = await examApiService.listResults();
  } catch (error) {
    loadFailed.value = true;
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar resultados.'
    };
  } finally {
    loading.value = false;
  }
}

async function updateResult(id: string, status: 'released' | 'cancelled') {
  if (updatingId.value) return;
  updatingId.value = id;
  try {
    const current = items.value.find(item => item.id === id);
    const updated = await examApiService.updateResult(id, {
      status,
      findings: drafts.value[id] ?? current?.findings ?? '',
      interpretation: drafts.value[id] ?? current?.interpretation ?? ''
    });
    items.value = items.value.map((item) => (item.id === id ? updated : item));
    notice.value = { variant: 'success', message: `Resultado ${status === 'released' ? 'liberado' : 'cancelado'}.` };
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao atualizar resultado.'
    };
  } finally {
    updatingId.value = '';
  }
}

onMounted(loadResults);
</script>

<style scoped>
.enterprise-page,
.results-stack {
  display: grid;
  gap: 16px;
}

.result-card {
  display: grid;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
  min-width: 0;
}

.result-card:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.result-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-self: start;
}

.result-card__header > div:first-child { min-width: 0; }
.result-card__header strong { font-size: 1rem; overflow-wrap: anywhere; }
.result-card__header p { color: var(--color-text-muted); margin: 8px 0; overflow-wrap: anywhere; }
.result-card__header a { color: var(--color-text); text-underline-offset: 3px; display: inline-flex; align-items: center; min-height: 44px; }
.results-loading { padding: 24px 0; color: var(--color-text-muted); }
@media (max-width: 720px) {
  .result-card__header { flex-direction: column; }
  .quick-actions { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
}
</style>
