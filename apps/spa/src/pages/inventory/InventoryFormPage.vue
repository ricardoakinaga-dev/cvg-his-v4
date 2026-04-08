<template>
  <div class="inventory-form-page">
    <AppPageHeader>
      <template #title>{{ isEdit ? 'Editar Item' : 'Novo Item de Estoque' }}</template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <DsCard>
      <form @submit.prevent="onSubmit">
        <DsInput
          id="sku"
          v-model="form.sku"
          label="SKU *"
          placeholder="Ex: MED-001"
          :disabled="isEdit"
          hint="Código único do item. Não editável após criação."
          required
        />

        <DsInput
          id="name"
          v-model="form.name"
          label="Nome *"
          placeholder="Ex: Dipirona Injetavel"
          required
        />

        <DsInput id="unit" v-model="form.unit" type="select" label="Unidade de Medida *" required>
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
        </DsInput>

        <div class="form-row">
          <DsInput
            id="onHandQuantity"
            v-model.number="form.onHandQuantity"
            type="number"
            label="Quantidade em Estoque *"
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
          <DsInput
            id="reorderLevel"
            v-model.number="form.reorderLevel"
            type="number"
            label="Ponto de Reposição *"
            placeholder="5"
            min="0"
            step="1"
            required
          />
        </div>

        <DsInput
          id="unitCostAmount"
          v-model.number="form.unitCostAmount"
          type="number"
          label="Custo Unitário (R$) *"
          placeholder="0.00"
          min="0"
          step="0.01"
          required
        />

        <div class="form-actions">
          <DsButton type="submit" variant="primary" :loading="saving" :disabled="saving">
            {{ saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Item' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/inventory">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inventoryService } from '@/services/inventory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

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
.inventory-form-page {
  max-width: 720px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}
</style>
