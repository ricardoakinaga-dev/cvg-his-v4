<template>
  <div class="detail-page">
    <AppPageHeader title="Detalhes do Serviço" :subtitle="service?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/services')">Voltar</DsButton>
        <DsButton variant="primary" @click="router.push(`/services/${serviceId}/edit`)">Editar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="service" class="detail-grid">
      <DsCard title="Dados do Serviço">
        <div class="detail-list">
          <div><strong>Nome:</strong> {{ service.name }}</div>
          <div><strong>Código:</strong> {{ service.code ?? '—' }}</div>
          <div><strong>Descrição:</strong> {{ service.description ?? '—' }}</div>
          <div><strong>Preço Base:</strong> {{ formatCurrency(service.basePrice) }}</div>
          <div>
            <strong>Status:</strong>
            <span :class="['status-badge', service.active ? 'status-badge--active' : 'status-badge--inactive']">
              {{ service.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div><strong>Criado em:</strong> {{ formatDateTime(service.createdAt) }}</div>
          <div><strong>Atualizado em:</strong> {{ formatDateTime(service.updatedAt) }}</div>
        </div>
      </DsCard>
    </div>

    <div v-else-if="loading" class="loading">Carregando...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import { formatDateTime } from '@/utils/labels';

const router = useRouter();
const route = useRoute();
const serviceId = computed(() => route.params.id as string);
const service = ref<ServiceSummary | null>(null);
const loading = ref(false);
const error = ref('');

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function loadService() {
  loading.value = true;
  error.value = '';
  try {
    service.value = await servicesService.getById(serviceId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar serviço';
  } finally {
    loading.value = false;
  }
}

onMounted(loadService);
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  gap: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>