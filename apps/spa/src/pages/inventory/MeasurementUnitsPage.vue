<template>
  <div class="measurement-units-page">
    <AppPageHeader
      title="Unidades de Medida"
      :breadcrumbs="['Estoque', 'Cadastros', 'Unidades de Medida']"
      subtitle="Cadastro de siglas e precisões usado por produtos, notas fiscais, compras e movimentações de estoque."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Nova Unidade</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo das unidades de medida">
      <DsStatCard :label="`${units.length} unidade(s)`" value="" icon="📏" />
      <DsStatCard :label="`${integerCount} sem decimal`" value="" icon="1" />
      <DsStatCard :label="`${decimalCount} com decimal`" value="" icon="0.00" />
      <DsStatCard :label="`${inactiveCount} inativa(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Unidades de Medida">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por código ou descrição"
              data-testid="measurement-unit-search"
              @keyup.enter="searchUnits"
            />
          </label>
          <label class="field">
            <span>Precisão</span>
            <select v-model="filters.precision" data-testid="measurement-unit-precision-filter" @change="searchUnits">
              <option value="">Todas</option>
              <option value="integer">Sem decimal</option>
              <option value="decimal">Com decimal</option>
            </select>
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="measurement-unit-active-filter" @change="searchUnits">
              <option :value="true">Ativas</option>
              <option :value="false">Todas</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchUnits">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando unidades de medida.</div>
        <div v-else-if="units.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="unit in units" :key="unit.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Descrição:</span></p>
              <strong>{{ unit.description }}</strong>
              <p><span>Código:</span></p>
              <p>{{ unit.code }}</p>
              <p><span>Decimais:</span></p>
              <p>{{ unit.decimalPlaces }}</p>
              <p><span>Situação:</span></p>
              <p>{{ unit.active ? 'Ativa' : 'Inativa' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectUnit(unit)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="measurement-unit-form" aria-label="Cadastro de unidade de medida" @submit.prevent="submitUnit">
          <label class="field">
            <span>Código</span>
            <input v-model="form.code" type="text" maxlength="30" data-testid="measurement-unit-code" />
          </label>
          <label class="field">
            <span>Descrição</span>
            <input v-model="form.description" type="text" data-testid="measurement-unit-description" />
          </label>
          <label class="field">
            <span>Decimais</span>
            <input
              v-model.number="form.decimalPlaces"
              type="number"
              min="0"
              max="6"
              step="1"
              data-testid="measurement-unit-decimal-places"
            />
          </label>
          <label class="field field--inline">
            <input v-model="form.active" type="checkbox" data-testid="measurement-unit-active" />
            <span>Ativa</span>
          </label>

          <div class="form-actions">
            <DsButton variant="danger" type="button" :disabled="!editingId || submitting" @click="removeSelected">
              Excluir
            </DsButton>
            <DsButton variant="secondary" type="button" @click="cancelForm">Cancelar</DsButton>
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
          </div>
        </form>

        <dl v-if="selectedUnit" class="detail-list">
          <div>
            <dt>Descrição</dt>
            <dd>{{ selectedUnit.description }}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{{ selectedUnit.code }}</dd>
          </div>
          <div>
            <dt>Precisão</dt>
            <dd>{{ precisionLabel(selectedUnit) }}</dd>
          </div>
          <div>
            <dt>Uso operacional</dt>
            <dd>Produtos, nota fiscal, compras e movimentações</dd>
          </div>
        </dl>

        <div v-if="selectedUnit" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/nf">Entrada de NF</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/movements">Movimentações</DsButton>
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
import { measurementUnitsService, type MeasurementUnitItem } from '@/services/measurementUnits';

const filters = reactive<{
  search: string;
  precision: '' | 'integer' | 'decimal';
  active: boolean;
}>({
  search: '',
  precision: '',
  active: true
});
const form = reactive({
  code: '',
  description: '',
  decimalPlaces: 0,
  active: true
});

const units = ref<MeasurementUnitItem[]>([]);
const selectedUnit = ref<MeasurementUnitItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const integerCount = computed(() => units.value.filter((unit) => unit.decimalPlaces === 0).length);
const decimalCount = computed(() => units.value.filter((unit) => unit.decimalPlaces > 0).length);
const inactiveCount = computed(() => units.value.filter((unit) => !unit.active).length);
const formTitle = computed(() => (editingId.value ? 'Editar Unidade' : 'Cadastrar Unidade'));

onMounted(reload);

function precisionLabel(unit: MeasurementUnitItem): string {
  return unit.decimalPlaces === 0 ? 'Sem casas decimais' : `${unit.decimalPlaces} casa(s) decimal(is)`;
}

function normalizeDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(6, Math.max(0, Math.trunc(value)));
}

function resetForm() {
  form.code = '';
  form.description = '';
  form.decimalPlaces = 0;
  form.active = true;
  editingId.value = null;
}

function startCreate() {
  selectedUnit.value = null;
  resetForm();
}

function selectUnit(unit: MeasurementUnitItem) {
  selectedUnit.value = unit;
  editingId.value = unit.id;
  form.code = unit.code;
  form.description = unit.description;
  form.decimalPlaces = unit.decimalPlaces;
  form.active = unit.active;
}

function cancelForm() {
  resetForm();
  selectedUnit.value = null;
}

async function loadUnits() {
  const response = await measurementUnitsService.list({
    search: filters.search.trim() || undefined,
    precision: filters.precision || undefined,
    active: filters.active
  });
  units.value = response.items ?? [];
  if (selectedUnit.value) {
    selectedUnit.value = units.value.find((unit) => unit.id === selectedUnit.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await loadUnits();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar unidades de medida';
    units.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchUnits() {
  loading.value = true;
  error.value = '';
  try {
    await loadUnits();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar unidades de medida';
  } finally {
    loading.value = false;
  }
}

async function submitUnit() {
  error.value = '';
  successMessage.value = '';
  const payload = {
    code: form.code.trim().toUpperCase(),
    description: form.description.trim(),
    decimalPlaces: normalizeDecimalPlaces(form.decimalPlaces),
    active: form.active
  };
  if (!payload.code) {
    error.value = 'Código é obrigatório';
    return;
  }
  if (!payload.description) {
    error.value = 'Descrição é obrigatória';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await measurementUnitsService.update(editingId.value, payload);
      units.value = units.value.map((unit) => (unit.id === updated.id ? updated : unit));
      selectedUnit.value = updated;
      successMessage.value = 'Unidade de medida atualizada com sucesso.';
    } else {
      const created = await measurementUnitsService.create(payload);
      units.value = [created, ...units.value];
      selectedUnit.value = created;
      editingId.value = created.id;
      successMessage.value = 'Unidade de medida cadastrada com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar unidade de medida';
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
    await measurementUnitsService.remove(editingId.value);
    units.value = units.value.filter((unit) => unit.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Unidade de medida excluída com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir unidade de medida';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.measurement-units-page {
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
.measurement-unit-form,
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
