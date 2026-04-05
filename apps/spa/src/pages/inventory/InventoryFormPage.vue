<template>
  <div class="inventory-form-page">
    <div class="page-header">
      <h1 class="page-header__title">{{ isEdit ? 'Editar Item' : 'Novo Item de Estoque' }}</h1>
    </div>

    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <form class="form-section" @submit.prevent="onSubmit">
      <div class="form-field">
        <label for="sku" class="form-field__label">SKU *</label>
        <input
          id="sku"
          v-model="form.sku"
          class="form-field__input"
          placeholder="Ex: MED-001"
          required
          :disabled="isEdit"
        />
        <span class="form-field__hint">Código único do item. Não editável após criação.</span>
      </div>

      <div class="form-field">
        <label for="name" class="form-field__label">Nome *</label>
        <input
          id="name"
          v-model="form.name"
          class="form-field__input"
          placeholder="Ex: Dipirona Injetavel"
          required
        />
      </div>

      <div class="form-field">
        <label for="unit" class="form-field__label">Unidade de Medida *</label>
        <select id="unit" v-model="form.unit" class="form-field__input" required>
          <option value="" disabled>Selecione a unidade</option>
          <option value="unidade">Unidade</option>
          <option value="ampola">Ampola</option>
          <option value="comprimido">Comprimido</option>
          <option value="pacote">Pacote</option>
          <option value="caixa">Caixa</option>
          <option value="litro">Litro</option>
          <option value="ml">Mililitro (ml)</option>
          <option value="frasco">Frasco</option>
          <option value="rolo">Rolo</option>
        </select>
      </div>

      <div class="form-row form-row--2">
        <div class="form-field">
          <label for="onHandQuantity" class="form-field__label">Quantidade em Estoque *</label>
          <input
            id="onHandQuantity"
            v-model.number="form.onHandQuantity"
            type="number"
            min="0"
            step="0.01"
            class="form-field__input"
            placeholder="0"
            required
          />
        </div>

        <div class="form-field">
          <label for="reorderLevel" class="form-field__label">Ponto de Reposição *</label>
          <input
            id="reorderLevel"
            v-model.number="form.reorderLevel"
            type="number"
            min="0"
            step="1"
            class="form-field__input"
            placeholder="5"
            required
          />
        </div>
      </div>

      <div class="form-field">
        <label for="unitCostAmount" class="form-field__label">Custo Unitário (R$) *</label>
        <input
          id="unitCostAmount"
          v-model.number="form.unitCostAmount"
          type="number"
          min="0"
          step="0.01"
          class="form-field__input"
          placeholder="0.00"
          required
        />
      </div>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :loading="saving" :disabled="saving">
          {{ saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Item' }}
        </DsButton>
        <router-link to="/inventory" class="btn btn--secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inventoryService } from '@/services/inventory';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const itemId = computed(() => route.params.id as string | undefined);

const form = ref({
  sku: '',
  name: '',
  unit: '',
  onHandQuantity: 0,
  reorderLevel: 0,
  unitCostAmount: 0
});

const formError = ref('');
const successMessage = ref('');
const saving = ref(false);

onMounted(async () => {
  if (isEdit.value && itemId.value) {
    try {
      const item = await inventoryService.getById(itemId.value);
      form.value = {
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        onHandQuantity: item.onHandQuantity,
        reorderLevel: item.reorderLevel,
        unitCostAmount: item.unitCostAmount
      };
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar item';
    }
  }
});

async function onSubmit() {
  saving.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    if (isEdit.value && itemId.value) {
      await inventoryService.update(itemId.value, {
        name: form.value.name,
        unit: form.value.unit,
        onHandQuantity: form.value.onHandQuantity,
        reorderLevel: form.value.reorderLevel,
        unitCostAmount: form.value.unitCostAmount
      });
      successMessage.value = 'Item atualizado com sucesso!';
    } else {
      await inventoryService.create({
        sku: form.value.sku,
        name: form.value.name,
        unit: form.value.unit,
        onHandQuantity: form.value.onHandQuantity,
        reorderLevel: form.value.reorderLevel,
        unitCostAmount: form.value.unitCostAmount
      });
      successMessage.value = 'Item criado com sucesso!';
    }
    setTimeout(() => router.push('/inventory'), 1500);
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar item';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-field__hint {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  margin-top: 4px;
}
</style>
