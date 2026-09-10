<template>
  <div class="owner-form-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Cadastros', 'Tutores', isEdit ? 'Editar Tutor' : 'Novo Tutor']">
      <template #title>
        {{ isEdit ? 'Editar Tutor' : 'Cadastrar Novo Tutor' }}
      </template>
      <template #subtitle>
        Cadastro de {{ clinicalLabels.tutor.singularLower }} com identificação, informações de contato, documentação, endereço e observações.
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/owners">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <div v-if="formError" ref="formErrorRegion" class="form-feedback-region" tabindex="-1">
      <DsAlert variant="danger" dismissible @dismiss="formError = ''">
        {{ formError }}
      </DsAlert>
    </div>
    <div v-if="duplicateOwnerId" ref="duplicateFeedbackRegion" class="duplicate-feedback-region" tabindex="-1">
      <DsAlert variant="warning" icon="alert" title="Cadastro possivelmente duplicado">
        <p>Já existe um tutor com os mesmos dados de identificação. Nada novo foi criado e seu rascunho continua preservado.</p>
        <div class="duplicate-feedback__actions">
          <DsButton type="button" variant="secondary" @click="openDuplicateOwner">Abrir tutor existente</DsButton>
          <DsButton type="button" variant="ghost" @click="dismissDuplicateWarning">Manter este rascunho</DsButton>
        </div>
      </DsAlert>
    </div>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>
    <DsAlert v-if="loading" variant="info">
      Carregando dados do tutor para edição…
    </DsAlert>

    <DsAlert v-if="isEdit && !loading && !hydrated" variant="warning">
      A edição está protegida até que os dados do tutor sejam carregados.
      <DsButton variant="secondary" @click="loadOwner(ownerId, pageGeneration)">Tentar carregar novamente</DsButton>
    </DsAlert>

    <div class="owner-form-page__layout">
      <form
        class="owner-form"
        novalidate
        :aria-describedby="validationErrorFields.length ? 'owner-form-error-summary' : undefined"
        @submit.prevent="onSubmit"
      >
        <div
          v-if="validationErrorFields.length"
          id="owner-form-error-summary"
          class="form-error-summary"
          aria-labelledby="owner-form-error-summary-title"
        >
          <h2 id="owner-form-error-summary-title">Revise os campos obrigatórios</h2>
          <p>Confira os campos destacados antes de salvar o tutor.</p>
          <ul>
            <li v-for="field in validationErrorFields" :key="field.key">
              <a :href="`#${field.targetId}`" @click.prevent="focusValidationField(field.key)">
                {{ field.label }}: {{ errors[field.key] }}
              </a>
            </li>
          </ul>
        </div>
        <fieldset class="owner-form-fields" :disabled="isEdit && (loading || !hydrated)">
        <details open class="owner-section">
          <summary class="owner-section__summary">Identificação do {{ clinicalLabels.tutor.singular }}</summary>
          <div class="owner-section__body">
            <div class="form-row form-row--2">
              <DsInput
                id="fullName"
                v-model="form.fullName"
                label="Nome"
                :placeholder="`Nome completo do ${clinicalLabels.tutor.singularLower}`"
                :error="errors.fullName"
                required
              />
              <DsInput
                id="birthDate"
                v-model="form.birthDate"
                label="Data de Nascimento"
                type="date"
              />
            </div>

            <div class="form-row form-row--3">
              <DsInput id="sex" v-model="form.sex" label="Sexo" type="select">
                <option value="unknown">Não informado</option>
                <option value="female">Feminino</option>
                <option value="male">Masculino</option>
                <option value="other">Outro</option>
              </DsInput>
              <DsInput
                id="group"
                v-model="form.group"
                label="Grupo"
                placeholder="Opcional"
              />
              <div class="form-field form-field--checkbox">
                <DsCheckbox id="receiveSms" v-model="form.receiveSms" label="Receber SMS" />
              </div>
            </div>

          </div>
        </details>

        <details open class="owner-section">
          <summary id="owner-contact-title" class="owner-section__summary">Informações de Contato <span class="required-mark" aria-hidden="true">*</span></summary>
          <div class="owner-section__body">
            <div
              class="contact-fields"
              :class="{ 'contact-fields--error': Boolean(errors.contacts) }"
              role="group"
              aria-labelledby="owner-contact-title"
              :aria-describedby="errors.contacts ? 'owner-contact-hint owner-contact-error' : 'owner-contact-hint'"
              aria-required="true"
            >
              <p id="owner-contact-hint" class="field-hint">Informe pelo menos um telefone, celular ou e-mail.</p>
              <div class="form-row form-row--2">
                <DsInput
                  id="phone1"
                  v-model="form.phone1"
                  label="Telefone 1"
                  type="tel"
                  placeholder="(xx) xxxx-xxxxx"
                  :aria-invalid="Boolean(errors.contacts)"
                  :aria-describedby="errors.contacts ? 'owner-contact-hint owner-contact-error' : 'owner-contact-hint'"
                />
                <DsInput
                  id="phone2"
                  v-model="form.phone2"
                  label="Telefone 2"
                  type="tel"
                  placeholder="(xx) xxxx-xxxxx"
                />
              </div>

              <div class="form-row form-row--2">
                <DsInput
                  id="mobile"
                  v-model="form.mobile"
                  label="Celular"
                  type="tel"
                  placeholder="(xx) xxxx-xxxxx"
                />
                <DsInput
                  id="email"
                  v-model="form.email"
                  label="E-mail"
                  type="email"
                  :placeholder="`${clinicalLabels.tutor.singularLower}@exemplo.com`"
                />
              </div>
              <p v-if="errors.contacts" id="owner-contact-error" class="form-field__error" role="alert">{{ errors.contacts }}</p>
            </div>
          </div>
        </details>

        <details :open="isEdit" class="owner-section">
          <summary class="owner-section__summary">Documentação do {{ clinicalLabels.tutor.singular }}</summary>
          <div class="owner-section__body">
            <div class="form-row form-row--3">
              <DsInput id="personType" v-model="form.personType" label="Física ou Jurídica" type="select">
                <option value="individual">Física</option>
                <option value="company">Jurídica</option>
              </DsInput>
              <DsInput
                id="documentId"
                v-model="form.documentId"
                :label="form.personType === 'company' ? 'CNPJ' : 'CPF'"
                :placeholder="form.personType === 'company' ? 'xx.xxx.xxx/xxxx-xx' : 'xxx.xxx.xxx-xx'"
              />
              <DsInput id="rg" v-model="form.rg" label="RG" placeholder="xx.xxx.xxx-x" />
            </div>
          </div>
        </details>

        <details :open="isEdit" class="owner-section">
          <summary class="owner-section__summary">Dados legados</summary>
          <div class="owner-section__body">
            <div class="form-row form-row--2">
              <DsInput
                id="legacyVetusId"
                v-model="form.legacyVetusId"
                label="ID Vetus"
                :placeholder="`ID legado do ${clinicalLabels.tutor.singularLower}`"
              />
              <DsInput
                id="originalCreatedAt"
                v-model="form.originalCreatedAt"
                label="Data de Cadastro Vetus"
                type="date"
              />
            </div>
          </div>
        </details>

        <details :open="isEdit" class="owner-section">
          <summary class="owner-section__summary">Endereço do {{ clinicalLabels.tutor.singular }}</summary>
          <div class="owner-section__body">
            <div class="form-row form-row--3">
              <DsInput id="zipCode" v-model="form.zipCode" label="CEP" placeholder="xxxxx-xxx" />
              <DsInput id="state" v-model="form.state" label="UF" placeholder="SP" />
              <DsInput id="cityCode" v-model="form.cityCode" label="Cód. Município" />
            </div>

            <div class="form-row form-row--2">
              <DsInput id="street" v-model="form.street" label="Endereço" />
              <DsInput id="number" v-model="form.number" label="Número" />
            </div>

            <div class="form-row form-row--3">
              <DsInput id="complement" v-model="form.complement" label="Complemento" />
              <DsInput id="city" v-model="form.city" label="Cidade" />
              <DsInput id="district" v-model="form.district" label="Bairro" />
            </div>

            <DsInput id="reference" v-model="form.reference" label="Referência" />
          </div>
        </details>

        <details :open="isEdit" class="owner-section">
          <summary class="owner-section__summary">Observações Gerais</summary>
          <div class="owner-section__body">
            <DsInput
              id="notes"
              v-model="form.administrativeNotes"
              label="Observações gerais"
              type="textarea"
              :placeholder="`Escreva aqui observações gerais sobre o ${clinicalLabels.tutor.singularLower}`"
              :rows="5"
              :maxlength="1000"
            />
            <div class="character-counter">{{ notesLength }} / 1000 Caracteres</div>
          </div>
        </details>

        <details :open="isEdit" class="owner-section">
          <summary class="owner-section__summary">Financeiro</summary>
          <div class="owner-section__body">
            <div class="form-row form-row--2">
              <div class="form-field form-field--checkbox">
                <DsCheckbox
                  id="financialResponsible"
                  v-model="form.financialResponsible"
                  label="Responsável financeiro"
                />
              </div>
              <DsInput id="status" v-model="form.status" label="Status" type="select">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </DsInput>
            </div>

            <div class="form-row form-row--2">
              <DsInput
                id="allowedDebtLimit"
                v-model.number="form.allowedDebtLimit"
                label="Pode dever até"
                type="number"
                min="0"
                step="0.01"
              />
              <DsInput
                id="creditBalance"
                v-model.number="form.creditBalance"
                label="Saldo em Crédito"
                type="number"
                step="0.01"
              />
            </div>

            <div class="form-row form-row--2">
              <DsInput
                id="availablePoints"
                v-model.number="form.availablePoints"
                label="Pontos Disponíveis"
                type="number"
                min="0"
                step="1"
              />
              <DsInput
                id="blockedPoints"
                v-model.number="form.blockedPoints"
                label="Pontos Bloqueados"
                type="number"
                min="0"
                step="1"
              />
            </div>
          </div>
        </details>

        <div class="form-actions">
        <DsButton type="submit" variant="primary" :loading="submitting" :disabled="isEdit && (loading || !hydrated)">
            {{ submitting ? 'Salvando...' : isEdit || createdOwnerId ? 'Salvar Alterações' : `Cadastrar ${clinicalLabels.tutor.singularLower}` }}
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/owners">Cancelar</DsButton>
        </div>
        </fieldset>
      </form>

      <aside class="owner-form-page__aside">
        <DsCard title="Resumo em tempo real">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Guia de cadastro">
          <ul class="guide-list">
            <li>Preencha identificação, contato e documentação antes de vincular animais.</li>
            <li>Use CPF/CNPJ, RG e endereço para financeiro, comandas e comunicação.</li>
            <li>Observações gerais devem registrar preferências e restrições operacionais.</li>
            <li>Pontos, crédito e limite financeiro sustentam resgate e situação financeira.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
  </div>
  <DsModal :open="leaveRequested" title="Alterações não salvas" size="sm" initial-focus="#owner-continue-editing" @close="resolveLeave(false)">
    <p>Você alterou os dados deste tutor. Continue editando para salvar ou descarte as alterações para sair.</p>
    <template #footer>
      <DsButton variant="secondary" @click="resolveLeave(true)">Descartar e sair</DsButton>
      <DsButton id="owner-continue-editing" variant="primary" @click="resolveLeave(false)">Continuar editando</DsButton>
    </template>
  </DsModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ownerService } from '@/services/owner';
import type { CreateOwnerRequest, OwnerSummary, UpdateOwnerRequest } from '@/types/owner';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges';
import { clinicalLabels } from '@/utils/labels';
import { duplicateEntityId } from '@/utils/duplicateConflict';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsCheckbox from '@cvg-his-v2/design-system/vue/DsCheckbox.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const ownerId = computed(() => String(route.params.id ?? ''));
const routeOwnerId = computed(() => ownerId.value);
const loading = ref(false);
const createdOwnerId = ref('');
const duplicateOwnerId = ref('');
// A new owner has no remote state to hydrate. Keeping it ready from the first
// render prevents the submit contract from depending on the edit loader.
const hydrated = ref(!isEdit.value);
let active = true;
let pageGeneration = 0;

const form = reactive({
  fullName: '',
  birthDate: '',
  sex: 'unknown' as 'female' | 'male' | 'other' | 'unknown',
  group: '',
  receiveSms: false,
  phone1: '',
  phone2: '',
  mobile: '',
  email: '',
  personType: 'individual' as 'individual' | 'company',
  documentId: '',
  rg: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  state: '',
  city: '',
  district: '',
  reference: '',
  cityCode: '',
  administrativeNotes: '',
  financialResponsible: false,
  status: 'active' as 'active' | 'inactive',
  allowedDebtLimit: '' as number | '',
  creditBalance: '' as number | '',
  availablePoints: '' as number | '',
  blockedPoints: '' as number | '',
  legacyVetusId: '',
  originalCreatedAt: ''
});

const { dirty, leaveRequested, resolveLeave, markClean } = useUnsavedChanges(() => JSON.stringify(form));

const validation = useFormValidation({
  rules: {
    fullName: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
    contacts: [
      () =>
        !form.phone1.trim() && !form.phone2.trim() && !form.mobile.trim() && !form.email.trim()
          ? 'Preencha pelo menos um telefone, celular ou e-mail'
          : null
    ]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;
const formErrorRegion = ref<HTMLElement | null>(null);
const duplicateFeedbackRegion = ref<HTMLElement | null>(null);
const validationFields = [
  { key: 'fullName', label: 'Nome', targetId: 'fullName' },
  { key: 'contacts', label: 'Contato', targetId: 'phone1' }
] as const;
const validationErrorFields = computed(() => validationFields.filter(field => Boolean(errors[field.key])));

function focusValidationField(key: typeof validationFields[number]['key']) {
  const field = validationFields.find(item => item.key === key);
  if (!field) return;
  const target = document.getElementById(field.targetId);
  const details = target?.closest('details');
  if (details) details.open = true;
  target?.focus();
}
async function focusDuplicateFeedback() {
  await nextTick();
  const region = duplicateFeedbackRegion.value;
  if (!region) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  region.scrollIntoView?.({ block: 'center', behavior });
  region.focus({ preventScroll: true });
}
function openDuplicateOwner() {
  const id = duplicateOwnerId.value;
  if (id) void router.push(`/owners/${id}`);
}
function dismissDuplicateWarning() {
  duplicateOwnerId.value = '';
  const target = document.getElementById('documentId');
  target?.closest('details')?.setAttribute('open', '');
  target?.focus({ preventScroll: true });
}
async function focusFormError() {
  await nextTick();
  const region = formErrorRegion.value;
  if (!region) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  region.scrollIntoView?.({ block: 'center', behavior });
  region.focus({ preventScroll: true });
}

function isCurrentLoad(generation: number, id: string) {
  return active && generation === pageGeneration && routeOwnerId.value === id;
}

function resetForm() {
  Object.assign(form, {
    fullName: '', birthDate: '', sex: 'unknown', group: '', receiveSms: false,
    phone1: '', phone2: '', mobile: '', email: '', personType: 'individual', documentId: '', rg: '',
    zipCode: '', street: '', number: '', complement: '', state: '', city: '', district: '', reference: '', cityCode: '',
    administrativeNotes: '', financialResponsible: false, status: 'active', allowedDebtLimit: '', creditBalance: '', availablePoints: '', blockedPoints: '', legacyVetusId: '', originalCreatedAt: ''
  });
  validation.clearErrors();
  formError.value = '';
  successMessage.value = '';
  duplicateOwnerId.value = '';
}

const notesLength = computed(() => form.administrativeNotes.length);
const primaryContactLabel = computed(() => form.mobile || form.phone1 || form.email || '—');
const filledContactsCount = computed(
  () => [form.phone1, form.phone2, form.mobile, form.email].filter((value) => value.trim()).length
);

const summaryCards = computed(() => [
  {
    label: 'Contatos',
    value: String(filledContactsCount.value),
    hint: 'Campos preenchidos'
  },
  {
    label: 'Principal',
    value: primaryContactLabel.value,
    hint: 'Contato prioritário'
  },
  {
    label: 'Cadastro',
    value: form.personType === 'company' ? 'Jurídica' : 'Física',
    hint: form.documentId || 'Documento pendente'
  },
  {
    label: 'Financeiro',
    value: form.financialResponsible ? 'Responsável' : 'Sem vínculo',
    hint: form.status === 'active' ? 'Cadastro ativo' : 'Cadastro inativo'
  }
]);

function normalizeString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNumber(value: number | '') {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildContacts(): CreateOwnerRequest['contacts'] {
  const contacts: Array<CreateOwnerRequest['contacts'][number]> = [];

  if (form.phone1.trim()) {
    contacts.push({
      label: 'Telefone 1',
      value: form.phone1.trim(),
      type: 'phone',
      primary: !form.mobile.trim()
    });
  }

  if (form.phone2.trim()) {
    contacts.push({
      label: 'Telefone 2',
      value: form.phone2.trim(),
      type: 'phone',
      primary: false
    });
  }

  if (form.mobile.trim()) {
    contacts.unshift({
      label: 'Celular',
      value: form.mobile.trim(),
      type: 'whatsapp',
      primary: true
    });
  }

  if (form.email.trim()) {
    contacts.push({
      label: 'E-mail',
      value: form.email.trim(),
      type: 'email',
      primary: contacts.length === 0
    });
  }

  return contacts;
}

function assignContacts(owner: OwnerSummary) {
  const phoneContacts = owner.contacts.filter((contact) => contact.type === 'phone');
  const whatsappContact = owner.contacts.find((contact) => contact.type === 'whatsapp');
  const emailContact = owner.contacts.find((contact) => contact.type === 'email');

  form.phone1 = phoneContacts[0]?.value ?? '';
  form.phone2 = phoneContacts[1]?.value ?? '';
  form.mobile = whatsappContact?.value ?? '';
  form.email = emailContact?.value ?? '';

  if (!form.phone1 && !form.mobile && owner.contacts[0]) {
    if (owner.contacts[0].type === 'whatsapp') {
      form.mobile = owner.contacts[0].value;
    } else if (owner.contacts[0].type === 'phone') {
      form.phone1 = owner.contacts[0].value;
    }
  }
}

function getValues(): Record<string, unknown> {
  return {
    fullName: form.fullName,
    contacts: buildContacts()
  };
}

async function onSubmit() {
  if (submitting.value || loading.value || !hydrated.value) return;
  if (!validate(getValues())) {
    await nextTick();
    const firstInvalidField = validationErrorFields.value[0];
    if (firstInvalidField) focusValidationField(firstInvalidField.key);
    return;
  }

  const submittedSnapshot = JSON.stringify(form);
  const targetId = ownerId.value;
  const generation = pageGeneration;
  const editing = isEdit.value || Boolean(createdOwnerId.value);
  const mutationId = createdOwnerId.value || targetId;
  submitting.value = true;
  formError.value = '';
  successMessage.value = '';
  duplicateOwnerId.value = '';

  try {
    const payloadBase = {
      fullName: form.fullName.trim(),
      documentId: normalizeString(form.documentId),
      contacts: buildContacts(),
      address: {
        zipCode: normalizeString(form.zipCode),
        street: normalizeString(form.street),
        number: normalizeString(form.number),
        complement: normalizeString(form.complement),
        state: normalizeString(form.state),
        city: normalizeString(form.city),
        district: normalizeString(form.district),
        reference: normalizeString(form.reference),
        cityCode: normalizeString(form.cityCode)
      },
      profile: {
        birthDate: normalizeString(form.birthDate),
        sex: form.sex,
        group: normalizeString(form.group),
        receiveSms: form.receiveSms,
        personType: form.personType,
        rg: normalizeString(form.rg)
      },
      financialProfile: {
        allowedDebtLimit: normalizeNumber(form.allowedDebtLimit),
        creditBalance: normalizeNumber(form.creditBalance),
        availablePoints: normalizeNumber(form.availablePoints),
        blockedPoints: normalizeNumber(form.blockedPoints)
      },
      financialResponsible: form.financialResponsible,
      administrativeNotes: normalizeString(form.administrativeNotes),
      legacyVetusId: normalizeString(form.legacyVetusId),
      originalCreatedAt: normalizeString(form.originalCreatedAt)
    };

    if (editing) {
      const payload: UpdateOwnerRequest = {
        ...payloadBase,
        status: form.status
      };
      const updated = await ownerService.update(mutationId, payload);
      if (!isCurrentLoad(generation, targetId)) return;
      if (updated.id !== mutationId) {
        throw new Error('O tutor retornado não corresponde ao endereço solicitado.');
      }
      markClean(submittedSnapshot);
      successMessage.value = `${clinicalLabels.tutor.singular} atualizado com sucesso!`;
      if (!dirty.value) void router.push(`/owners/${mutationId}`);
    } else {
      const payload: CreateOwnerRequest = payloadBase;
      const created = await ownerService.create(payload);
      if (!isCurrentLoad(generation, targetId)) return;
      createdOwnerId.value = created.id;
      markClean(submittedSnapshot);
      successMessage.value = `${clinicalLabels.tutor.singular} cadastrado com sucesso!`;
      if (!dirty.value) void router.push(`/owners/${created.id}`);
    }
  } catch (err: unknown) {
    if (isCurrentLoad(generation, targetId)) {
      const conflictingOwnerId = duplicateEntityId(err, 'ownerId');
      if (conflictingOwnerId) {
        duplicateOwnerId.value = conflictingOwnerId;
        formError.value = '';
      } else {
        formError.value =
          err instanceof Error
            ? err.message
            : `Erro ao salvar ${clinicalLabels.tutor.singularLower}`;
      }
    }
  } finally {
    if (isCurrentLoad(generation, targetId)) submitting.value = false;
  }
}

async function loadOwner(id: string, generation: number) {
  if (!isEdit.value || !id) {
    loading.value = false;
    hydrated.value = true;
    return;
  }

  loading.value = true;
  formError.value = '';
  try {
    const owner = await ownerService.getById(id);
    if (!isCurrentLoad(generation, id)) return;
    if (owner.id !== id) {
      throw new Error('O tutor retornado não corresponde ao endereço solicitado.');
    }
    form.fullName = owner.fullName;
    form.birthDate = owner.profile?.birthDate ?? '';
    form.sex = owner.profile?.sex ?? 'unknown';
    form.group = owner.profile?.group ?? '';
    form.receiveSms = owner.profile?.receiveSms ?? false;
    form.personType = owner.profile?.personType ?? 'individual';
    form.documentId = owner.documentId ?? '';
    form.rg = owner.profile?.rg ?? '';
    form.zipCode = owner.address?.zipCode ?? '';
    form.street = owner.address?.street ?? '';
    form.number = owner.address?.number ?? '';
    form.complement = owner.address?.complement ?? '';
    form.state = owner.address?.state ?? '';
    form.city = owner.address?.city ?? '';
    form.district = owner.address?.district ?? '';
    form.reference = owner.address?.reference ?? '';
    form.cityCode = owner.address?.cityCode ?? '';
    form.administrativeNotes = owner.administrativeNotes ?? '';
    form.financialResponsible = owner.financialResponsible;
    form.status = owner.status;
    form.allowedDebtLimit = owner.financialProfile?.allowedDebtLimit ?? '';
    form.creditBalance = owner.financialProfile?.creditBalance ?? '';
    form.availablePoints = owner.financialProfile?.availablePoints ?? '';
    form.blockedPoints = owner.financialProfile?.blockedPoints ?? '';
    form.legacyVetusId = owner.legacyVetusId ?? '';
    form.originalCreatedAt = owner.originalCreatedAt ?? '';
    assignContacts(owner);
    markClean();
    hydrated.value = true;
  } catch (err: unknown) {
    if (isCurrentLoad(generation, id)) {
      formError.value =
        err instanceof Error
          ? err.message
          : `Erro ao carregar ${clinicalLabels.tutor.singularLower}`;
    }
  } finally {
    if (isCurrentLoad(generation, id)) loading.value = false;
  }
}

watch(
  () => `${route.path}:${routeOwnerId.value}`,
  () => {
    const generation = ++pageGeneration;
    resetForm();
    createdOwnerId.value = '';
    hydrated.value = !isEdit.value;
    markClean();
    submitting.value = false;
    loading.value = false;
    void loadOwner(routeOwnerId.value, generation);
  },
  { immediate: true, flush: 'sync' }
);

watch(formError, (message) => { if (message) void focusFormError(); });
watch(duplicateOwnerId, (id) => { if (id) void focusDuplicateFeedback(); });

onBeforeUnmount(() => {
  active = false;
  pageGeneration += 1;
});
</script>

<style scoped>
.owner-form-fields { display: contents; border: 0; padding: 0; margin: 0; min-width: 0; }
.owner-form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.owner-form-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.85fr);
  gap: 24px;
  align-items: start;
}

.owner-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-padding-bottom: 104px;
}

.owner-section {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--color-surface, #fff), var(--color-bg-subtle, #f8fafc));
  overflow: hidden;
}

.owner-section[open] {
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.owner-section__summary {
  list-style: none;
  cursor: pointer;
  padding: 16px 18px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text, #1e3a5f);
  border-bottom: 1px solid var(--color-border, rgba(226, 232, 240, 0.9));
}

.owner-section__summary::-webkit-details-marker {
  display: none;
}

.owner-section__body {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.contact-fields { display: grid; gap: 14px; }
.contact-fields--error { padding: 12px; border: 1px solid var(--color-danger-200, #f8bebc); border-radius: 12px; background: var(--color-danger-50, #fff0ef); }
.field-hint { margin: 0; color: var(--color-text-secondary, #3e5c67); font-size: 13px; line-height: 1.5; }
.form-feedback-region { scroll-margin-top: 120px; }
.form-feedback-region:focus { outline: 3px solid var(--color-focus-ring); outline-offset: 4px; border-radius: 8px; }
.duplicate-feedback-region { scroll-margin-top: 120px; }
.duplicate-feedback-region:focus { outline: 3px solid var(--color-focus-ring); outline-offset: 4px; border-radius: 8px; }
.duplicate-feedback__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

.form-error-summary {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--color-danger-200, #f8bebc);
  border-left: 4px solid var(--color-danger-600, #c64b52);
  border-radius: 14px;
  background: var(--color-danger-50, #fff0ef);
  color: var(--color-text, #112530);
}

.form-error-summary h2 { color: var(--color-danger-800, #823037); font-size: 16px; }
.form-error-summary p { color: var(--color-text-secondary, #3e5c67); font-size: 13px; line-height: 1.5; }
.form-error-summary ul { display: grid; gap: 4px; padding-left: 18px; }
.form-error-summary a { color: var(--color-danger-800, #823037); font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.form-error-summary a:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 3px; border-radius: 3px; }

.form-row {
  display: grid;
  gap: 12px;
}

.form-row--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-row--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field--checkbox {
  justify-content: end;
  min-height: 100%;
  padding-bottom: 6px;
}

.form-field__error {
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
}

.character-counter {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-align: right;
}

.form-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  position: sticky;
  top: calc(100vh - 80px);
  top: calc(100dvh - 80px);
  z-index: 2;
  padding: 12px 0 max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  box-shadow: 0 -8px 20px rgba(10, 35, 42, 0.1);
}

.owner-form-page__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
  margin-bottom: 4px;
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  word-break: break-word;
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
  .owner-form-page__layout {
    grid-template-columns: 1fr;
  }

  .owner-form-page__aside {
    position: static;
  }
}

@media (max-width: 720px) {
  .form-row--2,
  .form-row--3 {
    grid-template-columns: 1fr;
  }
}
</style>
