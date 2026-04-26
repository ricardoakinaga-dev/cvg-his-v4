<template>
  <div class="customer-group-form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Grupo de Clientes' : 'Incluir Grupo de Clientes'"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Grupos de Clientes', isEditing ? 'Editar' : 'Incluir']"
      subtitle="Cadastro auxiliar para segmentação, política comercial, atendimento e marketing.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/customer-groups')">Voltar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="form-layout">
      <DsCard>
        <form class="customer-group-form" @submit.prevent="submitForm">
          <DsInput v-model="form.name" label="Descrição" required placeholder="Ex: Convenio" />
          <DsInput v-model="form.code" label="Id externo/Código" placeholder="Ex: CONVENIO" />
          <DsInput v-model="form.segment" label="Segmento" placeholder="Ex: Relacionamento" />
          <DsInput v-model="form.discountPercent" label="Desconto (%)" type="number" min="0" max="100" step="0.01" />
          <DsInput v-model="form.paymentTermDays" label="Prazo (dias)" type="number" min="0" max="365" step="1" />
          <DsInput v-model="form.creditLimitAmount" label="Limite de crédito" type="number" min="0" step="0.01" />
          <DsInput
            v-model="form.description"
            class="description-field"
            type="textarea"
            label="Observação"
            :rows="5"
            placeholder="Informe regras operacionais, comerciais ou de atendimento deste grupo."
          />
          <label class="toggle-label">
            <input v-model="form.active" type="checkbox" />
            <span>Grupos Ativos</span>
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/customer-groups')">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do Cadastro">
          <div class="preview-card">
            <span>{{ form.code || 'Sem código' }}</span>
            <strong>{{ form.name || 'Grupo de Clientes' }}</strong>
            <p>{{ form.segment || 'Sem segmento' }} · {{ form.active ? 'Ativo' : 'Inativo' }}</p>
            <p>{{ discountPreview }} de desconto · {{ form.paymentTermDays || 0 }} dias</p>
            <p>{{ form.description || 'Sem observação.' }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Clientes:</strong> classificação preparada para vínculo no cadastro do cliente.</div>
            <div><strong>Atendimento:</strong> referência para recepção, comandas, orçamentos e vendas.</div>
            <div><strong>Financeiro:</strong> desconto, prazo e limite ficam prontos para políticas comerciais.</div>
            <div><strong>Marketing:</strong> segmenta campanhas, lembretes e filtros de relacionamento.</div>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { customerGroupsService } from '@/services/customerGroups';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const route = useRoute();
const customerGroupId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(customerGroupId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = ref({
  name: '',
  code: '',
  segment: '',
  discountPercent: '0',
  paymentTermDays: '0',
  creditLimitAmount: '',
  description: '',
  active: true
});

const discountPreview = computed(() => {
  const value = Number(form.value.discountPercent || 0);
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
});

async function loadCustomerGroup() {
  if (!customerGroupId.value) return;
  try {
    const customerGroup = await customerGroupsService.getById(customerGroupId.value);
    form.value = {
      name: customerGroup.name,
      code: customerGroup.code ?? '',
      segment: customerGroup.segment ?? '',
      discountPercent: String(customerGroup.discountPercent),
      paymentTermDays: String(customerGroup.paymentTermDays),
      creditLimitAmount: customerGroup.creditLimitAmount === null ? '' : String(customerGroup.creditLimitAmount),
      description: customerGroup.description ?? '',
      active: customerGroup.active
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar grupo de clientes';
  }
}

async function submitForm() {
  if (!form.value.name.trim()) {
    error.value = 'Descrição é obrigatória';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      name: form.value.name.trim(),
      code: form.value.code.trim() || null,
      segment: form.value.segment.trim() || null,
      discountPercent: Number(form.value.discountPercent || 0),
      paymentTermDays: Number(form.value.paymentTermDays || 0),
      creditLimitAmount: form.value.creditLimitAmount === '' ? null : Number(form.value.creditLimitAmount),
      description: form.value.description.trim() || null,
      active: form.value.active
    };

    if (isEditing.value && customerGroupId.value) {
      await customerGroupsService.update(customerGroupId.value, payload);
    } else {
      await customerGroupsService.create(payload);
    }
    successMessage.value = 'Grupo de Clientes salvo com sucesso.';
    setTimeout(() => router.push('/customer-groups'), 1200);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar grupo de clientes';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadCustomerGroup);
</script>

<style scoped>
.customer-group-form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.customer-group-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.description-field,
.toggle-label,
.form-actions {
  grid-column: 1 / -1;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.toggle-label input {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-aside,
.detail-list,
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-list {
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.preview-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.preview-card > span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.preview-card strong {
  color: var(--color-text, #0f172a);
  font-size: 20px;
}

.preview-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 960px) {
  .form-layout,
  .customer-group-form {
    grid-template-columns: 1fr;
  }
}
</style>
