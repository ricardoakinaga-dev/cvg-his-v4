<template>
  <div class="inventory-detail-page">
    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" label="Carregando item..." />
    </div>

    <template v-else-if="error">
      <DsAlert variant="danger" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsButton variant="secondary" tag="a" href="/inventory">Voltar ao Estoque</DsButton>
    </template>

    <template v-else-if="item">
      <AppPageHeader :breadcrumbs="['Estoque', 'Controles', 'Estoque', item.name]">
        <template #title>{{ item.name }}</template>
        <template #subtitle>
          <span class="inventory-sku">SKU: {{ item.sku }}</span>
        </template>
        <template #actions>
          <DsButton variant="secondary" size="sm" tag="a" :href="`/inventory/${item.id}/edit`">
            Editar
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/inventory">Voltar ao Estoque</DsButton>
        </template>
      </AppPageHeader>

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
        <AppDetailSection title="Informações do Item">
          <div class="detail-row">
            <span class="detail-row__label">Nome:</span>
            <span class="detail-row__value"
              ><strong>{{ item.name }}</strong></span
            >
          </div>
          <div class="detail-row">
            <span class="detail-row__label">SKU:</span>
            <span class="detail-row__value"
              ><code>{{ item.sku }}</code></span
            >
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Unidade:</span>
            <span class="detail-row__value">{{ item.unit }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Custo Unitário:</span>
            <span class="detail-row__value">{{ formatCurrency(item.unitCostAmount) }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection title="Controle de Estoque">
          <div class="detail-row">
            <span class="detail-row__label">Quantidade em Estoque:</span>
            <span class="detail-row__value">
              <DsBadge :variant="stockBadgeVariant" size="md">
                {{ item.onHandQuantity }} {{ item.unit }}
              </DsBadge>
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Ponto de Reposição:</span>
            <span class="detail-row__value">{{ item.reorderLevel }} {{ item.unit }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Status:</span>
            <span class="detail-row__value">
              <DsBadge :variant="isLowStock ? 'danger' : 'success'" size="sm">
                {{ isLowStock ? 'Estoque Baixo' : 'Estoque Normal' }}
              </DsBadge>
            </span>
          </div>
        </AppDetailSection>

        <AppDetailSection title="Informações Administrativas">
          <div class="detail-row">
            <span class="detail-row__label">Criado em:</span>
            <span class="detail-row__value">{{ formatDate(item.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Atualizado em:</span>
            <span class="detail-row__value">{{ formatDate(item.updatedAt) }}</span>
          </div>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary } from '@/types/inventory';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';

const route = useRoute();
const item = ref<InventoryItemSummary | null>(null);
const loading = ref(true);
const error = ref('');

const isLowStock = computed(() => {
  if (!item.value) return false;
  return item.value.onHandQuantity <= item.value.reorderLevel;
});

const stockBadgeVariant = computed(() => {
  if (!item.value) return 'default';
  if (item.value.onHandQuantity <= 0) return 'danger';
  if (item.value.onHandQuantity <= item.value.reorderLevel) return 'warning';
  return 'success';
});

const summaryCards = computed(() => {
  if (!item.value) return [];
  return [
    { label: 'SKU', value: item.value.sku, hint: 'Código único do item' },
    { label: 'Unidade', value: item.value.unit, hint: 'Unidade de controle' },
    { label: 'Estoque', value: `${item.value.onHandQuantity} ${item.value.unit}`, hint: 'Quantidade disponível' },
    { label: 'Valor', value: formatCurrency(item.value.onHandQuantity * item.value.unitCostAmount), hint: 'Valor estimado em estoque' }
  ];
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(async () => {
  const id = route.params.id as string;
  if (!id) {
    error.value = 'ID do item não fornecido';
    loading.value = false;
    return;
  }

  try {
    item.value = await inventoryService.getById(id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar item de estoque';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.detail-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.inventory-sku {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
  font-weight: 400;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
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
</style>
