<template>
  <div class="form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Produto' : 'Novo Produto'"
      :subtitle="isEditing ? 'Atualize os dados do produto' : 'Cadastre um novo produto no catálogo'"
    >
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/products')">Voltar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <DsCard>
      <form class="product-form" @submit.prevent="submitForm">
        <DsInput v-model="form.name" label="Nome do Produto" required placeholder="Ex: Vacina V4" />
        <DsInput v-model="form.code" label="Código" placeholder="Ex: VAC-001" />
        <DsInput v-model="form.description" type="textarea" label="Descrição" :rows="3" placeholder="Descrição opcional do produto" />
        <DsInput v-model.number="form.basePrice" type="number" label="Preço Base" required step="0.01" min="0" placeholder="0.00" />
        <div class="active-toggle">
          <label class="toggle-label">
            <input type="checkbox" v-model="form.active" />
            <span>Produto Ativo</span>
          </label>
        </div>
        <div class="form-actions">
          <DsButton variant="primary" :loading="submitting" type="submit">
            {{ isEditing ? 'Atualizar' : 'Cadastrar' }}
          </DsButton>
          <DsButton variant="secondary" type="button" @click="router.push('/products')">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { productsService, type ProductSummary } from '@/services/products';

const router = useRouter();
const route = useRoute();
const productId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!productId.value);

const form = ref({
  name: '',
  code: '',
  description: '',
  basePrice: 0,
  active: true
});
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');

async function loadProduct() {
  if (!productId.value) return;
  try {
    const product = await productsService.getById(productId.value);
    form.value = {
      name: product.name,
      code: product.code ?? '',
      description: product.description ?? '',
      basePrice: product.basePrice,
      active: product.active
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar produto';
  }
}

async function submitForm() {
  if (!form.value.name.trim()) {
    error.value = 'Nome é obrigatório';
    return;
  }
  if (form.value.basePrice < 0) {
    error.value = 'Preço base deve ser positivo';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    if (isEditing.value && productId.value) {
      await productsService.update(productId.value, {
        name: form.value.name.trim(),
        code: form.value.code.trim() || null,
        description: form.value.description.trim() || null,
        basePrice: form.value.basePrice,
        active: form.value.active
      });
      successMessage.value = 'Produto atualizado com sucesso.';
    } else {
      await productsService.create({
        name: form.value.name.trim(),
        code: form.value.code.trim() || null,
        description: form.value.description.trim() || null,
        basePrice: form.value.basePrice,
        active: form.value.active
      });
      successMessage.value = 'Produto cadastrado com sucesso.';
    }
    setTimeout(() => router.push('/products'), 1500);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar produto';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadProduct);
</script>

<style scoped>
.form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .product-form {
    grid-template-columns: 1fr;
  }
}

.active-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-label input {
  width: 18px;
  height: 18px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>