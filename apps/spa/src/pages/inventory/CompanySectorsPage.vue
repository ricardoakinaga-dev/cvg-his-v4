<template>
  <div class="company-sectors-page">
    <AppPageHeader
      title="Setores da Empresa"
      :breadcrumbs="['Estoque', 'Cadastros', 'Setores da Empresa']"
      subtitle="Cadastro de setores usado para organizar operação, estoque, internação, permissões e leitura gerencial."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Novo Setor</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo dos setores da empresa">
      <DsStatCard :label="`${sectors.length} setor(es)`" value="" icon="🏢" />
      <DsStatCard :label="`${linkedBedsCount} box(es) vinculados`" value="" icon="🛏️" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${inactiveCount} inativo(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Setores da Empresa">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por código ou nome"
              data-testid="company-sector-search"
              @keyup.enter="searchSectors"
            />
          </label>
          <label class="field">
            <span>Tipo</span>
            <select v-model="filters.kind" data-testid="company-sector-kind-filter" @change="searchSectors">
              <option value="">Todos</option>
              <option v-for="option in kindOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="company-sector-active-filter" @change="searchSectors">
              <option :value="true">Ativos</option>
              <option :value="false">Todos</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchSectors">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando setores da empresa.</div>
        <div v-else-if="sectors.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="sector in sectors" :key="sector.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Nome:</span></p>
              <strong>{{ sector.name }}</strong>
              <p><span>Código:</span></p>
              <p>{{ sector.code }}</p>
              <p><span>Tipo:</span></p>
              <p>{{ kindLabel(sector.kind) }}</p>
              <p><span>Situação:</span></p>
              <p>{{ sector.active ? 'Ativo' : 'Inativo' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectSector(sector)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="company-sector-form" aria-label="Cadastro de setor da empresa" @submit.prevent="submitSector">
          <label class="field">
            <span>Código</span>
            <input v-model="form.code" type="text" data-testid="company-sector-code" />
          </label>
          <label class="field">
            <span>Nome</span>
            <input v-model="form.name" type="text" id="name" data-testid="company-sector-name" />
          </label>
          <label class="field">
            <span>Tipo</span>
            <select v-model="form.kind" data-testid="company-sector-kind">
              <option v-for="option in kindOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="field field--inline">
            <input v-model="form.active" type="checkbox" data-testid="company-sector-active" />
            <span>Ativo</span>
          </label>

          <div class="form-actions">
            <DsButton variant="danger" type="button" :disabled="!editingId || submitting" @click="removeSelected">
              Excluir
            </DsButton>
            <DsButton variant="secondary" type="button" @click="cancelForm">Cancelar</DsButton>
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
          </div>
        </form>

        <dl v-if="selectedSector" class="detail-list">
          <div>
            <dt>Nome</dt>
            <dd>{{ selectedSector.name }}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{{ selectedSector.code }}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{{ kindLabel(selectedSector.kind) }}</dd>
          </div>
          <div>
            <dt>Boxes vinculados</dt>
            <dd>{{ bedsFor(selectedSector).length }}</dd>
          </div>
        </dl>

        <div v-if="selectedSector" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/warehouses">Estoques</DsButton>
          <DsButton variant="secondary" tag="a" to="/beds">Boxes</DsButton>
          <DsButton variant="secondary" tag="a" to="/access-control">Acessos</DsButton>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { companySectorsService, type CompanySectorItem } from '@/services/companySectors';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary } from '@/types/inpatient';

const kindOptions = [
  { value: 'reception', label: 'Recepção' },
  { value: 'clinic', label: 'Clínica' },
  { value: 'surgery', label: 'Cirurgia' },
  { value: 'inpatient', label: 'Internação' },
  { value: 'inventory', label: 'Estoque' },
  { value: 'pharmacy', label: 'Farmácia' },
  { value: 'administration', label: 'Administrativo' },
  { value: 'other', label: 'Outro' }
];

const filters = reactive({
  search: '',
  kind: '',
  active: true
});
const form = reactive({
  code: '',
  name: '',
  kind: 'other',
  active: true
});

const sectors = ref<CompanySectorItem[]>([]);
const beds = ref<BedSummary[]>([]);
const selectedSector = ref<CompanySectorItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const activeCount = computed(() => sectors.value.filter((sector) => sector.active).length);
const inactiveCount = computed(() => sectors.value.filter((sector) => !sector.active).length);
const linkedBedsCount = computed(() => new Set(sectors.value.flatMap((sector) => bedsFor(sector).map((bed) => bed.id))).size);
const formTitle = computed(() => (editingId.value ? 'Editar Setor' : 'Cadastrar Setor'));

onMounted(reload);

function kindLabel(kind: string): string {
  return kindOptions.find((option) => option.value === kind)?.label ?? kind;
}

function resetForm() {
  form.code = '';
  form.name = '';
  form.kind = 'other';
  form.active = true;
  editingId.value = null;
}

function startCreate() {
  selectedSector.value = null;
  resetForm();
}

function selectSector(sector: CompanySectorItem) {
  selectedSector.value = sector;
  editingId.value = sector.id;
  form.code = sector.code;
  form.name = sector.name;
  form.kind = sector.kind;
  form.active = sector.active;
}

function cancelForm() {
  resetForm();
  selectedSector.value = null;
}

function bedsFor(sector: CompanySectorItem): BedSummary[] {
  return beds.value.filter((bed) => bed.sectorId === sector.id);
}

async function loadOperationalLinks() {
  try {
    beds.value = await inpatientService.listBeds({ active: false });
  } catch {
    beds.value = [];
  }
}

async function loadSectors() {
  const response = await companySectorsService.list({
    search: filters.search.trim() || undefined,
    kind: filters.kind || undefined,
    active: filters.active
  });
  sectors.value = response.items ?? [];
  if (selectedSector.value) {
    selectedSector.value = sectors.value.find((sector) => sector.id === selectedSector.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadSectors(), loadOperationalLinks()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar setores da empresa';
    sectors.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchSectors() {
  loading.value = true;
  error.value = '';
  try {
    await loadSectors();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar setores da empresa';
  } finally {
    loading.value = false;
  }
}

async function submitSector() {
  error.value = '';
  successMessage.value = '';
  const payload = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    kind: form.kind,
    active: form.active
  };
  if (!payload.code) {
    error.value = 'Código é obrigatório';
    return;
  }
  if (!payload.name) {
    error.value = 'Nome é obrigatório';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await companySectorsService.update(editingId.value, payload);
      sectors.value = sectors.value.map((sector) => (sector.id === updated.id ? updated : sector));
      selectedSector.value = updated;
      successMessage.value = 'Setor da empresa atualizado com sucesso.';
    } else {
      const created = await companySectorsService.create(payload);
      sectors.value = [created, ...sectors.value];
      selectedSector.value = created;
      editingId.value = created.id;
      successMessage.value = 'Setor da empresa cadastrado com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar setor da empresa';
  } finally {
    submitting.value = false;
  }
}

async function removeSelected() {
  if (!editingId.value) return;
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await companySectorsService.remove(editingId.value);
    sectors.value = sectors.value.filter((sector) => sector.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Setor da empresa excluído com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir setor da empresa';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.company-sectors-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.catalog-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(140px, 180px) minmax(140px, 180px) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 700;
}

.field--inline {
  flex-direction: row;
  align-items: center;
}

.field input,
.field select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.field input[type='checkbox'] {
  width: auto;
  min-height: auto;
}

.catalog-list {
  display: grid;
  gap: 12px;
}

.catalog-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 14px;
  background: var(--color-surface, #fff);
}

.catalog-card__main,
.company-sector-form,
.detail-list {
  display: grid;
  gap: 8px;
}

.catalog-card__main {
  min-width: 0;
}

.catalog-card__main p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.catalog-card__main span,
.catalog-card__main strong {
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary, #64748b);
}

.form-actions,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.detail-list {
  margin: 16px 0 0;
}

.detail-list div {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.detail-list dt {
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.detail-list dd {
  margin: 4px 0 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.detail-actions {
  margin-top: 14px;
}

@media (max-width: 1080px) {
  .catalog-toolbar {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 980px) {
  .content-grid,
  .catalog-toolbar {
    grid-template-columns: 1fr;
  }

  .catalog-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
