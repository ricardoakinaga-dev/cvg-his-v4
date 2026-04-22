<template>
  <div class="form-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Cadastros', 'Serviços', isEditing ? 'Editar Serviço' : 'Novo Serviço']"
      :title="isEditing ? 'Editar Serviço' : 'Novo Serviço'"
      :subtitle="isEditing ? 'Atualize os dados do serviço' : 'Cadastre um novo serviço no catálogo'"
    >
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/services')">Voltar</DsButton>
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
        <form class="service-form" @submit.prevent="submitForm">
          <DsInput
            v-model="form.name"
            label="Nome do Serviço"
            required
            placeholder="Ex: Consulta Veterinária"
          />
          <DsInput v-model="form.code" label="Código" placeholder="Ex: CONS-001" />
          <DsInput
            v-model="form.description"
            type="textarea"
            label="Descrição"
            :rows="3"
            placeholder="Descrição opcional do serviço"
          />
          <DsInput
            v-model.number="form.basePrice"
            type="number"
            label="Preço Base"
            required
            step="0.01"
            min="0"
            placeholder="0.00"
          />
          <div class="active-toggle">
            <label class="toggle-label">
              <input type="checkbox" v-model="form.active" />
              <span>Serviço Ativo</span>
            </label>
          </div>
          <div class="form-actions">
            <DsButton variant="primary" :loading="submitting" type="submit">
              {{ isEditing ? 'Atualizar' : 'Cadastrar' }}
            </DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/services')">
              Cancelar
            </DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Resumo em tempo real">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Boas práticas">
          <ul class="guide-list">
            <li>Reutilize códigos consistentes para facilitar agendas, faturamento e relatórios.</li>
            <li>Preço base deve representar a tabela pública do serviço.</li>
            <li>Use a descrição para orientar operação, não para registrar regras pessoais.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
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
import { servicesService, type ServiceSummary } from '@/services/services';

const router = useRouter();
const route = useRoute();
const serviceId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!serviceId.value);

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

const summaryCards = computed(() => [
  { label: 'Nome', value: form.value.name.trim() || '—', hint: 'Identificação de catálogo' },
  { label: 'Código', value: form.value.code.trim() || '—', hint: 'Referência de integração' },
  {
    label: 'Preço',
    value: formatCurrency(Number(form.value.basePrice || 0)),
    hint: 'Valor base do serviço'
  },
  { label: 'Status', value: form.value.active ? 'Ativo' : 'Inativo', hint: 'Situação operacional' }
]);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function loadService() {
  if (!serviceId.value) return;
  try {
    const service = await servicesService.getById(serviceId.value);
    form.value = {
      name: service.name,
      code: service.code ?? '',
      description: service.description ?? '',
      basePrice: service.basePrice,
      active: service.active
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar serviço';
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
    if (isEditing.value && serviceId.value) {
      await servicesService.update(serviceId.value, {
        name: form.value.name.trim(),
        code: form.value.code.trim() || null,
        description: form.value.description.trim() || null,
        basePrice: form.value.basePrice,
        active: form.value.active
      });
      successMessage.value = 'Serviço atualizado com sucesso.';
    } else {
      await servicesService.create({
        name: form.value.name.trim(),
        code: form.value.code.trim() || null,
        description: form.value.description.trim() || null,
        basePrice: form.value.basePrice,
        active: form.value.active
      });
      successMessage.value = 'Serviço cadastrado com sucesso.';
    }
    setTimeout(() => router.push('/services'), 1500);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar serviço';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadService);
</script>

<style scoped>
.form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.service-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .service-form {
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

.form-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
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

.guide-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .form-layout {
    grid-template-columns: 1fr;
  }

  .form-aside {
    position: static;
  }
}
</style>
