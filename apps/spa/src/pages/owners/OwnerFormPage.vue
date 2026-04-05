<template>
  <div class="owner-form-page">
    <AppPageHeader>
      <template #title>
        {{ isEdit ? 'Editar Tutor' : 'Novo Tutor' }}
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/owners">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <form class="owner-form" @submit.prevent="onSubmit">
      <DsCard title="Dados Pessoais">
        <DsInput
          id="fullName"
          v-model="form.fullName"
          label="Nome Completo *"
          placeholder="Nome completo do tutor"
          :error="errors.fullName"
          required
        />
        <DsInput
          id="documentId"
          v-model="form.documentId"
          label="Documento (CPF/CNPJ)"
          placeholder="000.000.000-00"
        />
      </DsCard>

      <DsCard>
        <template #header>
          <div class="form-section__header">
            <h2 class="form-section__title">Contatos</h2>
            <DsButton variant="secondary" size="sm" @click="addContact"> + Adicionar </DsButton>
          </div>
        </template>

        <div v-for="(contact, i) in form.contacts" :key="i" class="contact-row">
          <div class="form-row form-row--3">
            <DsInput
              :id="`contact-label-${i}`"
              v-model="contact.label"
              label="Rótulo"
              placeholder="Ex: Celular"
            />
            <DsInput :id="`contact-type-${i}`" v-model="contact.type" label="Tipo" type="select">
              <option value="phone">Telefone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </DsInput>
            <DsInput
              :id="`contact-value-${i}`"
              v-model="contact.value"
              label="Valor *"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div class="contact-row__actions">
            <DsRadio :name="'contact-primary'" :value="i" v-model="primaryIndex" label="Principal" />
            <DsButton
              v-if="form.contacts.length > 1"
              variant="danger"
              size="sm"
              @click="removeContact(i)"
            >
              Remover
            </DsButton>
          </div>
        </div>
        <span v-if="errors.contacts" class="form-field__error">{{ errors.contacts }}</span>
      </DsCard>

      <DsCard title="Informações Administrativas">
        <div class="form-row">
          <DsInput id="status" v-model="form.status" label="Status" type="select">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </DsInput>
          <div class="form-field" style="display: flex; align-items: center; padding-top: 24px;">
            <DsCheckbox v-model="form.financialResponsible" label="Responsável financeiro" />
          </div>
        </div>
        <DsInput
          id="notes"
          v-model="form.administrativeNotes"
          label="Observações"
          type="textarea"
          placeholder="Notas administrativas"
          :rows="3"
        />
      </DsCard>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :loading="submitting">
          {{ submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Tutor' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/owners">Cancelar</DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ownerService } from '@/services/owner';
import type { CreateOwnerRequest, UpdateOwnerRequest, OwnerSummary } from '@/types/owner';
import { useFormValidation } from '@/composables/useFormValidation';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCheckbox from '@cvg-his-v2/design-system/vue/DsCheckbox.vue';
import DsRadio from '@cvg-his-v2/design-system/vue/DsRadio.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const ownerId = computed(() => route.params.id as string);

const form = reactive({
  fullName: '',
  documentId: '',
  contacts: [
    { label: 'Telefone', type: 'phone' as 'phone' | 'email' | 'whatsapp', value: '', primary: true }
  ],
  financialResponsible: false,
  administrativeNotes: '',
  status: 'active' as 'active' | 'inactive'
});

const primaryIndex = ref(0);

const validation = useFormValidation({
  rules: {
    fullName: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
    contacts: [
      (v: unknown) => {
        const contacts = v as Array<{ value: string }>;
        if (!contacts || contacts.filter((c) => c.value.trim()).length === 0) {
          return 'Adicione pelo menos um contato com valor';
        }
        return null;
      }
    ]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

function addContact() {
  form.contacts.push({ label: 'Contato', type: 'phone', value: '', primary: false });
}

function removeContact(index: number) {
  if (form.contacts.length <= 1) return;
  form.contacts.splice(index, 1);
  if (primaryIndex.value >= form.contacts.length) {
    primaryIndex.value = 0;
  }
}

function getValues(): Record<string, unknown> {
  return {
    fullName: form.fullName,
    contacts: form.contacts
  };
}

async function onSubmit() {
  if (!validate(getValues())) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    const contacts = form.contacts
      .map((c, i) => ({
        label: c.label || 'Contato',
        value: c.value.trim(),
        type: c.type,
        primary: i === primaryIndex.value
      }))
      .filter((c) => c.value);

    if (isEdit.value) {
      const payload: UpdateOwnerRequest = {
        fullName: form.fullName.trim() || undefined,
        documentId: form.documentId.trim() || undefined,
        contacts,
        financialResponsible: form.financialResponsible,
        administrativeNotes: form.administrativeNotes || undefined,
        status: form.status
      };
      await ownerService.update(ownerId.value, payload);
      successMessage.value = 'Tutor atualizado com sucesso!';
      setTimeout(() => router.push(`/owners/${ownerId.value}`), 1000);
    } else {
      const payload: CreateOwnerRequest = {
        fullName: form.fullName.trim(),
        documentId: form.documentId.trim() || undefined,
        contacts,
        financialResponsible: form.financialResponsible,
        administrativeNotes: form.administrativeNotes || undefined
      };
      const created = await ownerService.create(payload);
      successMessage.value = 'Tutor cadastrado com sucesso!';
      setTimeout(() => router.push(`/owners/${created.id}`), 1000);
    }
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar tutor';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const owner: OwnerSummary = await ownerService.getById(ownerId.value);
      form.fullName = owner.fullName;
      form.documentId = owner.documentId || '';
      form.contacts = owner.contacts.length
        ? owner.contacts.map((c) => ({
            label: c.label,
            type: c.type,
            value: c.value,
            primary: c.primary
          }))
        : [{ label: 'Telefone', type: 'phone' as const, value: '', primary: true }];
      form.financialResponsible = owner.financialResponsible;
      form.administrativeNotes = owner.administrativeNotes || '';
      form.status = owner.status;
      primaryIndex.value = owner.contacts.findIndex((c) => c.primary);
      if (primaryIndex.value < 0) primaryIndex.value = 0;
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar tutor';
    }
  }
});
</script>

<style scoped>
.owner-form-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.owner-form-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.owner-form {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-section__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-600, #2563eb);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
}

.form-row {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row--3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field__error {
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
}

.contact-row {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
}

.contact-row__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.btn--secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  min-height: 44px;
  cursor: pointer;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  border: 1px solid var(--color-border-strong, #cbd5e1);
  transition: background 0.15s ease;
}

.btn--secondary:hover {
  background: var(--color-surface-hover, #f8fafc);
}
</style>
