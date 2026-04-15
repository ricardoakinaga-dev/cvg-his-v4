<template>
  <DsModal :open="open" title="Selecione um cliente" size="lg" @close="emit('close')">
    <div class="client-selector">
      <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>

      <div class="client-selector__tabs" role="tablist" aria-label="Fluxo de cliente">
        <button
          type="button"
          class="client-selector__tab"
          :class="{ 'client-selector__tab--active': activeTab === 'registered' }"
          @click="activeTab = 'registered'"
        >
          Clientes Cadastrados
        </button>
        <button
          type="button"
          class="client-selector__tab"
          :class="{ 'client-selector__tab--active': activeTab === 'new' }"
          @click="activeTab = 'new'"
        >
          Novo Cliente
        </button>
      </div>

      <template v-if="activeTab === 'registered'">
        <div class="client-selector__search">
          <DsInput
            id="client-search"
            v-model="searchDraft"
            type="search"
            label="Buscar cliente"
            placeholder="Nome, id, CPF, telefone ou e-mail"
            @keyup.enter="applySearch"
          />
          <DsButton variant="secondary" :loading="loading" @click="applySearch">Filtrar</DsButton>
        </div>

        <div v-if="loading" class="client-selector__loading">
          <DsSpinner size="md" />
        </div>

        <EmptyState
          v-else-if="owners.length === 0"
          icon="👤"
          title="Nenhum cliente encontrado"
          description="Ajuste a busca ou abra a aba de novo cliente para cadastrar um tutor dentro do fluxo."
        />

        <div v-else class="client-selector__list">
          <button
            v-for="owner in owners"
            :key="owner.id"
            type="button"
            class="client-card"
            :class="{ 'client-card--selected': selectedOwnerId === owner.id }"
            @click="selectedOwnerId = owner.id"
          >
            <div class="client-card__header">
              <div>
                <strong>{{ owner.fullName }}</strong>
                <div class="client-card__meta">
                  <span>{{ owner.documentId || 'Documento não informado' }}</span>
                  <span>{{ primaryContactLabel(owner) }}</span>
                </div>
              </div>
              <span class="client-card__status">{{ owner.status === 'active' ? 'Ativo' : 'Inativo' }}</span>
            </div>

            <div class="client-card__body">
              <span>ID: {{ owner.id }}</span>
              <span>{{ owner.financialResponsible ? 'Responsável financeiro' : 'Contato operacional' }}</span>
            </div>

            <div class="client-card__actions" @click.stop>
              <DsButton variant="ghost" size="sm" @click="toggleDetails(owner.id)">
                {{ expandedOwnerId === owner.id ? 'Ocultar informações' : 'Ver mais informações' }}
              </DsButton>
            </div>

            <div v-if="expandedOwnerId === owner.id" class="client-card__details">
              <div class="client-card__detail-group">
                <span class="client-card__detail-label">Contatos</span>
                <div class="client-card__detail-values">
                  <span v-for="contact in owner.contacts" :key="`${owner.id}-${contact.type}-${contact.value}`">
                    {{ contact.label }}: {{ contact.value }}
                  </span>
                </div>
              </div>

              <div class="client-card__detail-group">
                <span class="client-card__detail-label">Pacientes vinculados</span>
                <div v-if="patientLookupLoading[owner.id]" class="client-card__patients-loading">
                  <DsSpinner size="sm" inline label="Carregando..." />
                </div>
                <div v-else class="client-card__detail-values">
                  <span v-if="ownerPatients[owner.id]?.length">
                    {{ ownerPatients[owner.id].map((patient) => patient.name).join(', ') }}
                  </span>
                  <span v-else>Nenhum paciente encontrado para este cliente.</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div v-if="totalPages > 1" class="client-selector__pagination">
          <DsButton variant="secondary" :disabled="page <= 1" @click="changePage(page - 1)">
            Anterior
          </DsButton>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <DsButton variant="secondary" :disabled="page >= totalPages" @click="changePage(page + 1)">
            Próxima
          </DsButton>
        </div>
      </template>

      <template v-else>
        <div class="client-selector__new-form">
          <DsInput id="client-name" v-model="draft.fullName" label="Nome completo" required />
          <div class="client-selector__new-grid">
            <DsInput id="client-document" v-model="draft.documentId" label="CPF/Documento" />
            <DsInput id="client-email" v-model="draft.email" label="E-mail" />
          </div>
          <div class="client-selector__new-grid">
            <DsInput id="client-whatsapp" v-model="draft.whatsapp" label="WhatsApp" />
            <DsInput id="client-phone" v-model="draft.phone" label="Telefone" />
          </div>
          <p class="client-selector__hint">
            O cadastro do cliente acontece dentro do fluxo da agenda. Depois disso, o próximo passo
            é vincular ou criar o paciente e definir horário, profissional e serviço.
          </p>
        </div>
      </template>
    </div>

    <template #footer>
      <DsButton variant="ghost" @click="emit('close')">Cancelar</DsButton>
      <DsButton
        v-if="activeTab === 'registered'"
        variant="primary"
        :disabled="!selectedOwner"
        @click="confirmSelection"
      >
        Adicionar Cliente
      </DsButton>
      <DsButton v-else variant="primary" :loading="creating" @click="createOwnerAndContinue">
        {{ creating ? 'Criando...' : 'Criar Cliente' }}
      </DsButton>
    </template>
  </DsModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  selected: [owner: OwnerSummary];
}>();

const activeTab = ref<'registered' | 'new'>('registered');
const searchDraft = ref('');
const appliedSearch = ref('');
const loading = ref(false);
const creating = ref(false);
const error = ref('');
const owners = ref<OwnerSummary[]>([]);
const selectedOwnerId = ref('');
const expandedOwnerId = ref('');
const page = ref(1);
const pageSize = 6;
const totalPages = ref(1);
const ownerPatients = ref<Record<string, PatientSummary[]>>({});
const patientLookupLoading = ref<Record<string, boolean>>({});

const draft = reactive({
  fullName: '',
  documentId: '',
  email: '',
  whatsapp: '',
  phone: ''
});

const selectedOwner = computed(
  () => owners.value.find((owner) => owner.id === selectedOwnerId.value) ?? null
);

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    activeTab.value = 'registered';
    searchDraft.value = '';
    appliedSearch.value = '';
    page.value = 1;
    selectedOwnerId.value = '';
    expandedOwnerId.value = '';
    error.value = '';
    ownerPatients.value = {};
    patientLookupLoading.value = {};
    await loadOwners();
  },
  { immediate: true }
);

watch(activeTab, async (tab) => {
  error.value = '';
  if (tab === 'registered' && props.open && owners.value.length === 0) {
    await loadOwners();
  }
});

function primaryContactLabel(owner: OwnerSummary) {
  const primary = owner.contacts.find((contact) => contact.primary) ?? owner.contacts[0];
  return primary ? `${primary.label}: ${primary.value}` : 'Sem contato principal';
}

async function loadOwners() {
  loading.value = true;
  error.value = '';

  try {
    const response = await ownerService.listPage({
      search: appliedSearch.value.trim() || undefined,
      page: page.value,
      pageSize,
      status: 'active'
    });

    owners.value = response.items ?? [];
    totalPages.value = response.totalPages ?? 1;

    if (!owners.value.some((owner) => owner.id === selectedOwnerId.value)) {
      selectedOwnerId.value = owners.value[0]?.id ?? '';
    }
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : 'Erro ao carregar clientes cadastrados';
    owners.value = [];
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
}

async function loadOwnerPatients(ownerId: string) {
  if (ownerPatients.value[ownerId] || patientLookupLoading.value[ownerId]) return;

  patientLookupLoading.value = {
    ...patientLookupLoading.value,
    [ownerId]: true
  };

  try {
    const response = await patientService.listPage({
      ownerId,
      page: 1,
      pageSize: 50
    });

    ownerPatients.value = {
      ...ownerPatients.value,
      [ownerId]: response.items ?? []
    };
  } catch {
    ownerPatients.value = {
      ...ownerPatients.value,
      [ownerId]: []
    };
  } finally {
    patientLookupLoading.value = {
      ...patientLookupLoading.value,
      [ownerId]: false
    };
  }
}

function applySearch() {
  page.value = 1;
  appliedSearch.value = searchDraft.value;
  void loadOwners();
}

function changePage(nextPage: number) {
  page.value = nextPage;
  void loadOwners();
}

function confirmSelection() {
  if (!selectedOwner.value) return;
  emit('selected', selectedOwner.value);
}

async function toggleDetails(ownerId: string) {
  expandedOwnerId.value = expandedOwnerId.value === ownerId ? '' : ownerId;
  if (expandedOwnerId.value === ownerId) {
    await loadOwnerPatients(ownerId);
  }
}

async function createOwnerAndContinue() {
  if (!draft.fullName.trim()) {
    error.value = 'Nome completo é obrigatório';
    return;
  }

  const contacts = [
    draft.whatsapp.trim()
      ? {
          label: 'WhatsApp',
          value: draft.whatsapp.trim(),
          type: 'whatsapp' as const,
          primary: true
        }
      : null,
    draft.phone.trim()
      ? {
          label: 'Telefone',
          value: draft.phone.trim(),
          type: 'phone' as const,
          primary: !draft.whatsapp.trim()
        }
      : null,
    draft.email.trim()
      ? {
          label: 'E-mail',
          value: draft.email.trim(),
          type: 'email' as const,
          primary: !draft.whatsapp.trim() && !draft.phone.trim()
        }
      : null
  ].filter(
    (
      contact
    ): contact is { label: string; value: string; type: 'email' | 'whatsapp' | 'phone'; primary: boolean } =>
      contact !== null
  );

  if (contacts.length === 0) {
    error.value = 'Informe ao menos um contato para cadastrar o cliente';
    return;
  }

  creating.value = true;
  error.value = '';

  try {
    const owner = await ownerService.create({
      fullName: draft.fullName.trim(),
      documentId: draft.documentId.trim() || undefined,
      contacts,
      financialResponsible: true
    });

    draft.fullName = '';
    draft.documentId = '';
    draft.email = '';
    draft.whatsapp = '';
    draft.phone = '';

    emit('selected', owner);
  } catch (createError) {
    error.value = createError instanceof Error ? createError.message : 'Erro ao criar cliente';
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.client-selector {
  display: grid;
  gap: 16px;
}

.client-selector__tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.client-selector__tab {
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
}

.client-selector__tab--active {
  border-color: rgba(249, 115, 22, 0.4);
  background: rgba(249, 115, 22, 0.1);
  color: #c2410c;
}

.client-selector__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.client-selector__loading {
  min-height: 220px;
  display: grid;
  place-items: center;
}

.client-selector__list {
  display: grid;
  gap: 12px;
  max-height: 440px;
  overflow-y: auto;
}

.client-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-border, #dbe2ea);
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.08), transparent 38%),
    linear-gradient(180deg, #fff, #f8fafc);
  padding: 16px;
  display: grid;
  gap: 12px;
  cursor: pointer;
}

.client-card--selected {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
}

.client-card__header,
.client-card__body,
.client-selector__pagination,
.client-selector__new-grid {
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.client-card__header {
  align-items: start;
}

.client-card__meta,
.client-card__body,
.client-card__detail-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.client-card__status {
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.client-card__actions {
  display: flex;
  justify-content: flex-end;
}

.client-card__details {
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  padding-top: 12px;
  display: grid;
  gap: 12px;
}

.client-card__detail-group {
  display: grid;
  gap: 6px;
}

.client-card__detail-label,
.client-selector__hint {
  color: var(--color-text-muted, #64748b);
}

.client-card__detail-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.client-card__patients-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.client-selector__pagination {
  align-items: center;
}

.client-selector__new-form {
  display: grid;
  gap: 14px;
}

@media (max-width: 820px) {
  .client-selector__search,
  .client-selector__new-grid {
    grid-template-columns: 1fr;
  }

  .client-card__header,
  .client-card__body,
  .client-selector__pagination {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
