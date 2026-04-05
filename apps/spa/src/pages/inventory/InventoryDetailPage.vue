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
      <div class="page-header">
        <div class="page-header__left">
          <h1 class="page-header__title">{{ item.name }}</h1>
          <span class="page-header__sku">SKU: {{ item.sku }}</span>
        </div>
        <div class="page-header__actions">
          <DsButton variant="secondary" size="sm" tag="a" :href="`/inventory/${item.id}/edit`">
            Editar
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/inventory">Voltar ao Estoque</DsButton>
        </div>
      </div>

      <div class="detail-section">
        <h2 class="detail-section__title">Informações do Item</h2>

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
      </div>

      <div class="detail-section">
        <h2 class="detail-section__title">Controle de Estoque</h2>

        <div class="detail-row">
          <span class="detail-row__label">Quantidade em Estoque:</span>
          <span class="detail-row__value">
            <DsBadge :variant="stockBadgeVariant" size="lg">
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
      </div>

      <div class="detail-section">
        <h2 class="detail-section__title">Informações Administrativas</h2>

        <div class="detail-row">
          <span class="detail-row__label">Criado em:</span>
          <span class="detail-row__value">{{ formatDate(item.createdAt) }}</span>
        </div>

        <div class="detail-row">
          <span class="detail-row__label">Atualizado em:</span>
          <span class="detail-row__value">{{ formatDate(item.updatedAt) }}</span>
        </div>
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
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}
.page-header__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page-header__title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}
.page-header__sku {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
}
.page-header__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.page-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.detail-section {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.detail-section__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--color-text, #0f172a);
}
.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light, #f1f5f9);
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-row__label {
  flex: 0 0 200px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
}
.detail-row__value {
  flex: 1;
  font-size: 14px;
  color: var(--color-text, #0f172a);
}
code {
  background: var(--color-bg-muted, #f1f5f9);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
