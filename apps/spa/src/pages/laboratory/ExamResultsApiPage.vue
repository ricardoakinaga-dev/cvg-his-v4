<template>
  <div class="enterprise-page">
    <AppPageHeader :breadcrumbs="['Laboratório', 'Resultados API']">
      <template #title>Resultados de Exame</template>
      <template #subtitle>Superfície dedicada para o contrato `/exam-results`</template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <DsCard title="Resultados retornados">
      <div v-if="loading" class="muted">Carregando resultados...</div>
      <div v-else-if="items.length === 0" class="muted">Nenhum resultado retornado pelo endpoint.</div>
      <div v-else class="results-stack">
        <div v-for="item in items" :key="item.id" class="result-card">
          <div class="result-card__header">
            <div>
              <strong>{{ item.examName }}</strong>
              <p>{{ item.patientId }} · {{ item.status }}</p>
            </div>
            <div class="quick-actions">
              <DsButton size="sm" variant="secondary" :loading="updatingId === item.id" @click="updateResult(item.id, 'released')">
                Liberar
              </DsButton>
              <DsButton size="sm" variant="ghost" :loading="updatingId === item.id" @click="updateResult(item.id, 'cancelled')">
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
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { examApiService } from '@/services/examApi';
import type { ExamResultRecord } from '@/types/examApi';

const items = ref<ExamResultRecord[]>([]);
const loading = ref(true);
const updatingId = ref('');
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const drafts = ref<Record<string, string>>({});

function setDraft(id: string, value: string) {
  drafts.value = { ...drafts.value, [id]: value };
}

async function loadResults() {
  loading.value = true;
  try {
    items.value = await examApiService.listResults();
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar resultados.'
    };
  } finally {
    loading.value = false;
  }
}

async function updateResult(id: string, status: 'released' | 'cancelled') {
  updatingId.value = id;
  try {
    const updated = await examApiService.updateResult(id, {
      status,
      findings: drafts.value[id] ?? '',
      interpretation: drafts.value[id] ?? ''
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
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
}
</style>
