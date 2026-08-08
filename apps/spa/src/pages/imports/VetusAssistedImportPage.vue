<template>
  <div class="vetus-import-page">
    <AppPageHeader
      title="Importação Assistida Vetus"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Importação Assistida Vetus']"
      subtitle="Clientes e animais revisados antes da entrada no CVG HIS.">
      <template #actions>
        <DsButton variant="secondary" type="button" @click="applyTemplate">Modelo CSV</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <section class="import-layout">
      <DsCard>
        <div class="import-form">
          <label class="file-field">
            <span>Arquivo</span>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" @change="handleFileChange" />
          </label>

          <label class="text-field">
            <span>Dados</span>
            <textarea
              v-model="rawData"
              rows="10"
              placeholder="ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor"
            ></textarea>
          </label>

          <div class="legacy-filter-grid">
            <DsInput v-model="separator" type="select" label="Separador">
              <option value="auto">Automático</option>
              <option value=";">Ponto e vírgula</option>
              <option value=",">Vírgula</option>
              <option value="tab">Tabulação</option>
              <option value="|">Barra vertical</option>
            </DsInput>
            <DsInput v-model="defaultSource" label="Origem padrão" />
            <DsInput v-model="defaultReviewer" label="Revisor padrão" />
          </div>

          <div class="form-actions">
            <DsButton variant="secondary" type="button" @click="validateRows">Validar</DsButton>
            <DsButton
              variant="secondary"
              type="button"
              :disabled="!previewRows.length || importing"
              :loading="importing && batchAction === 'dry-run'"
              @click="runDryRun"
            >
              Dry-run
            </DsButton>
            <DsButton
              variant="primary"
              type="button"
              :disabled="!importableRows.length || importing"
              :loading="importing && batchAction === 'import'"
              @click="importRows"
            >
              Importar
            </DsButton>
            <DsButton
              v-if="latestBatch?.status === 'partial'"
              variant="secondary"
              type="button"
              :disabled="importing"
              :loading="importing && batchAction === 'resume'"
              @click="resumeBatch"
            >
              Retomar rejeitados
            </DsButton>
            <DsButton
              v-if="latestBatch && (latestBatch.status === 'completed' || latestBatch.status === 'partial')"
              variant="danger"
              type="button"
              :disabled="importing"
              :loading="importing && batchAction === 'rollback'"
              @click="rollbackBatch"
            >
              Desfazer lote
            </DsButton>
          </div>
        </div>
      </DsCard>

      <DsCard>
        <dl class="import-summary">
          <div>
            <dt>Registros</dt>
            <dd>{{ previewRows.length }}</dd>
          </div>
          <div>
            <dt>Prontos</dt>
            <dd>{{ importableRows.length }}</dd>
          </div>
          <div>
            <dt>Importados</dt>
            <dd>{{ importedRows.length }}</dd>
          </div>
          <div>
            <dt>Validados</dt>
            <dd>{{ validatedRows.length }}</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{{ invalidRows.length }}</dd>
          </div>
        </dl>
        <div v-if="latestBatch" class="batch-summary" aria-live="polite">
          <span>Lote atual</span>
          <strong>{{ latestBatch.id }}</strong>
          <span>{{ batchStatusLabel(latestBatch.status) }}</span>
          <span>{{ latestBatch.importedCount }} importado(s), {{ latestBatch.rejectedCount }} rejeitado(s)</span>
          <span>{{ batchItems.length }} linha(s) persistida(s)</span>
        </div>
      </DsCard>
    </section>

    <DataTable
      :columns="previewColumns"
      :rows="previewRows"
      empty-icon="⬆️"
      empty-title="Nenhum registro encontrado"
      empty-description="Informe os dados e valide para visualizar a importação."
      variant="hoverable"
    >
      <template #cell-owner="{ row }">
        <strong>{{ (row as ImportPreviewRow).ownerName }}</strong>
        <span class="subtle-line">{{ (row as ImportPreviewRow).ownerLegacyId || '-' }}</span>
      </template>
      <template #cell-patient="{ row }">
        <strong>{{ (row as ImportPreviewRow).patientName }}</strong>
        <span class="subtle-line">{{ (row as ImportPreviewRow).patientLegacyId || '-' }}</span>
      </template>
      <template #cell-source="{ row }">
        <span>{{ (row as ImportPreviewRow).sourceReference || '-' }}</span>
        <span class="subtle-line">{{ (row as ImportPreviewRow).reviewedBy || '-' }}</span>
      </template>
      <template #cell-status="{ row }">
        <span class="status-pill" :class="statusClass((row as ImportPreviewRow).status)">
          {{ (row as ImportPreviewRow).status }}
        </span>
        <span v-if="(row as ImportPreviewRow).message" class="status-message">
          {{ (row as ImportPreviewRow).message }}
        </span>
      </template>
    </DataTable>

    <DataTable
      :columns="logColumns"
      :rows="recentImports"
      :loading="loadingLog"
      empty-icon="🧾"
      empty-title="Nenhuma importação assistida"
      empty-description="Os registros importados aparecerão nesta lista."
      variant="hoverable"
    >
      <template #cell-ownerName="{ row }">
        <strong>{{ (row as VetusImportSummary).ownerName }}</strong>
        <span class="subtle-line">{{ (row as VetusImportSummary).ownerId }}</span>
      </template>
      <template #cell-patientName="{ row }">
        <strong>{{ (row as VetusImportSummary).patientName }}</strong>
        <span class="subtle-line">{{ (row as VetusImportSummary).patientId }}</span>
      </template>
      <template #cell-status="{ row }">
        {{ importStatusLabel((row as VetusImportSummary).status) }}
      </template>
      <template #cell-importedAt="{ row }">
        {{ formatDateTime((row as VetusImportSummary).importedAt) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import {
  vetusImportService,
  type CreateVetusImportRequest,
  type VetusImportBatchItemSummary,
  type VetusImportBatchResult,
  type VetusImportBatchSummary,
  type VetusImportSummary,
  type VetusPatientSex
} from '@/services/vetusImport';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

type ImportStatus = 'Pronto' | 'Erro' | 'Importado' | 'Validado';

interface ImportPreviewRow {
  line: number;
  ownerLegacyId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  patientLegacyId: string;
  patientName: string;
  species: string;
  breed: string;
  sex: VetusPatientSex;
  weightKg: number | undefined;
  notes: string;
  sourceReference: string;
  reviewedBy: string;
  status: ImportStatus;
  message: string;
}

const csvTemplate = [
  'ID Cliente Vetus;Cliente;Telefone;Email;ID Animal Vetus;Animal;Especie;Raca;Sexo;Peso;Historico;Origem;Revisor',
  '3835;Maria Silva;(11) 99999-1111;maria@example.com;10115;Luna;Canina;SRD;Femea;12,4;Historico importado do Vetus;planilha-animais-abril;Maria Recepcao'
].join('\n');

const rawData = ref('');
const separator = ref('auto');
const defaultSource = ref('Vetus');
const defaultReviewer = ref('');
const previewRows = ref<ImportPreviewRow[]>([]);
const recentImports = ref<VetusImportSummary[]>([]);
const importing = ref(false);
const batchAction = ref<'dry-run' | 'import' | 'resume' | 'rollback' | null>(null);
const latestBatch = ref<VetusImportBatchSummary | null>(null);
const batchItems = ref<readonly VetusImportBatchItemSummary[]>([]);
const loadingLog = ref(false);
const error = ref('');
const success = ref('');

const previewColumns: DataTableColumn[] = [
  { key: 'line', label: 'Linha', width: '90px' },
  { key: 'owner', label: 'Cliente' },
  { key: 'patient', label: 'Animal' },
  { key: 'species', label: 'Espécie', width: '130px' },
  { key: 'source', label: 'Origem/Revisor', width: '220px' },
  { key: 'status', label: 'Situação', width: '220px' }
];

const logColumns: DataTableColumn[] = [
  { key: 'ownerName', label: 'Cliente' },
  { key: 'patientName', label: 'Animal' },
  { key: 'sourceReference', label: 'Origem', width: '200px' },
  { key: 'reviewedBy', label: 'Revisor', width: '180px' },
  { key: 'status', label: 'Situação', width: '120px' },
  { key: 'importedAt', label: 'Importado em', width: '180px' }
];

const importableRows = computed(() => previewRows.value.filter(
  (row) => row.status === 'Pronto' || row.status === 'Validado'
));
const importedRows = computed(() => previewRows.value.filter((row) => row.status === 'Importado'));
const validatedRows = computed(() => previewRows.value.filter((row) => row.status === 'Validado'));
const invalidRows = computed(() => previewRows.value.filter((row) => row.status === 'Erro'));

onMounted(() => {
  void loadRecentImports();
});

function applyTemplate() {
  rawData.value = csvTemplate;
  validateRows();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    rawData.value = String(reader.result ?? '');
    validateRows();
  };
  reader.onerror = () => {
    error.value = 'Erro ao ler o arquivo selecionado.';
  };
  reader.readAsText(file);
}

async function loadRecentImports() {
  loadingLog.value = true;
  try {
    recentImports.value = await vetusImportService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar importações assistidas.';
  } finally {
    loadingLog.value = false;
  }
}

function validateRows() {
  error.value = '';
  success.value = '';
  const lines = rawData.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    previewRows.value = [];
    error.value = 'Nenhum registro encontrado.';
    return;
  }

  const resolvedSeparator = resolveSeparator(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], resolvedSeparator);
  const hasHeader = isHeader(firstCells);
  const headers = hasHeader ? firstCells.map(normalizeHeader) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  previewRows.value = dataLines.map((line, index) => {
    const cells = splitDelimitedLine(line, resolvedSeparator);
    const lineNumber = hasHeader ? index + 2 : index + 1;
    return buildPreviewRow(cells, headers, lineNumber);
  });
}

async function importRows() {
  importing.value = true;
  batchAction.value = 'import';
  error.value = '';
  success.value = '';
  try {
    const rows = [...importableRows.value];
    const result = await vetusImportService.createBatch({
      sourceSystem: defaultSource.value.trim() || 'Vetus',
      items: rows.map(toPayload)
    });
    applyBatchResult(result, rows);
    reportBatchResult(result, 'import');
    await loadRecentImports();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao importar o lote.';
  } finally {
    importing.value = false;
    batchAction.value = null;
  }
}

async function runDryRun() {
  importing.value = true;
  batchAction.value = 'dry-run';
  error.value = '';
  success.value = '';
  try {
    const rows = [...previewRows.value];
    const result = await vetusImportService.createBatch({
      sourceSystem: defaultSource.value.trim() || 'Vetus',
      dryRun: true,
      items: rows.map(toPayload)
    });
    applyBatchResult(result, rows);
    reportBatchResult(result, 'dry-run');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao validar o lote.';
  } finally {
    importing.value = false;
    batchAction.value = null;
  }
}

async function resumeBatch() {
  if (!latestBatch.value) return;
  importing.value = true;
  batchAction.value = 'resume';
  error.value = '';
  success.value = '';
  try {
    const result = await vetusImportService.createBatch({ resumeBatchId: latestBatch.value.id });
    applyBatchResult(result, [...previewRows.value]);
    reportBatchResult(result, 'resume');
    await loadRecentImports();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao retomar o lote.';
  } finally {
    importing.value = false;
    batchAction.value = null;
  }
}

async function rollbackBatch() {
  if (!latestBatch.value) return;
  importing.value = true;
  batchAction.value = 'rollback';
  error.value = '';
  success.value = '';
  try {
    const result = await vetusImportService.rollbackBatch(latestBatch.value.id);
    applyBatchResult(result, [...previewRows.value]);
    success.value = 'Lote revertido. Registros criados pelo lote foram inativados.';
    await loadRecentImports();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao desfazer o lote.';
  } finally {
    importing.value = false;
    batchAction.value = null;
  }
}

function applyBatchResult(result: VetusImportBatchResult, rows: ImportPreviewRow[]) {
  latestBatch.value = result.batch;
  batchItems.value = result.items;
  for (const item of result.items) {
    const row = rows[item.rowNumber - 1];
    if (!row) continue;
    if (item.status === 'imported' || item.status === 'linked') {
      row.status = 'Importado';
      row.message = item.status === 'linked' ? 'Registro vinculado' : 'Registro importado';
    } else if (item.status === 'validated') {
      row.status = 'Validado';
      row.message = 'Nenhuma mutação executada no dry-run';
    } else if (item.status === 'rejected') {
      row.status = 'Erro';
      row.message = item.reason ?? 'Registro rejeitado';
    }
  }
}

function reportBatchResult(result: VetusImportBatchResult, action: 'dry-run' | 'import' | 'resume') {
  if (result.batch.rejectedCount > 0) {
    error.value = `${result.batch.importedCount} registro(s) processado(s); ${result.batch.rejectedCount} registro(s) rejeitado(s).`;
  } else if (action === 'dry-run') {
    success.value = `${result.batch.importedCount} registro(s) validados no dry-run.`;
  } else {
    success.value = `${result.batch.importedCount + result.batch.linkedCount} registro(s) processado(s).`;
  }
}

function toPayload(row: ImportPreviewRow): CreateVetusImportRequest {
  return {
    sourceSystem: 'Vetus',
    sourceReference: row.sourceReference || undefined,
    reviewedBy: row.reviewedBy || undefined,
    owner: {
      legacyVetusId: row.ownerLegacyId || undefined,
      fullName: row.ownerName,
      phone: row.ownerPhone || undefined,
      email: row.ownerEmail || undefined
    },
    patient: {
      legacyVetusId: row.patientLegacyId || undefined,
      name: row.patientName,
      species: row.species,
      breed: row.breed || undefined,
      sex: row.sex,
      baseWeightKg: row.weightKg,
      generalNotes: row.notes || undefined
    }
  };
}

function buildPreviewRow(cells: string[], headers: string[], lineNumber: number): ImportPreviewRow {
  const ownerLegacyId = pick(cells, headers, ['id cliente vetus', 'cliente vetus', 'idcliente', 'codigo cliente'], 0);
  const ownerName = pick(cells, headers, ['cliente', 'tutor', 'nome cliente', 'owner'], 1);
  const ownerPhone = pick(cells, headers, ['telefone', 'celular', 'phone'], 2);
  const ownerEmail = pick(cells, headers, ['email', 'e-mail'], 3);
  const patientLegacyId = pick(cells, headers, ['id animal vetus', 'animal vetus', 'idanimal', 'codigo animal'], 4);
  const patientName = pick(cells, headers, ['animal', 'paciente', 'pet', 'nome animal'], 5);
  const species = pick(cells, headers, ['especie', 'espécie', 'species'], 6);
  const breed = pick(cells, headers, ['raca', 'raça', 'breed'], 7);
  const sex = normalizeSex(pick(cells, headers, ['sexo', 'sex'], 8));
  const weightKg = parseWeight(pick(cells, headers, ['peso', 'peso kg', 'weight'], 9));
  const notes = pick(cells, headers, ['historico', 'histórico', 'observacao', 'observação', 'notes'], 10);
  const sourceReference = pick(cells, headers, ['origem', 'referencia', 'referência', 'source'], 11) || defaultSource.value.trim();
  const reviewedBy = pick(cells, headers, ['revisor', 'revisado por', 'reviewer'], 12) || defaultReviewer.value.trim();
  const messages: string[] = [];

  if (!ownerName) messages.push('Cliente obrigatório');
  if (!ownerPhone && !ownerEmail) messages.push('Contato obrigatório');
  if (!patientName) messages.push('Animal obrigatório');
  if (!species) messages.push('Espécie obrigatória');

  return {
    line: lineNumber,
    ownerLegacyId,
    ownerName,
    ownerPhone,
    ownerEmail,
    patientLegacyId,
    patientName,
    species,
    breed,
    sex,
    weightKg,
    notes,
    sourceReference,
    reviewedBy,
    status: messages.length ? 'Erro' : 'Pronto',
    message: messages.join('; ')
  };
}

function pick(cells: string[], headers: string[], aliases: string[], fallbackIndex: number): string {
  const value = valueByHeader(cells, headers, aliases) ?? (headers.length ? '' : cells[fallbackIndex]);
  return (value ?? '').trim();
}

function resolveSeparator(sampleLine: string): string {
  if (separator.value === 'tab') return '\t';
  if (separator.value !== 'auto') return separator.value;

  return [';', ',', '\t', '|']
    .map((candidate) => ({ candidate, count: splitDelimitedLine(sampleLine, candidate).length }))
    .sort((a, b) => b.count - a.count)[0]?.candidate ?? ';';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function isHeader(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader);
  return normalized.some((cell) => ['cliente', 'animal', 'id cliente vetus', 'id animal vetus'].includes(cell));
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function valueByHeader(cells: string[], headers: string[], aliases: string[]): string | undefined {
  const normalizedAliases = aliases.map(normalizeHeader);
  const index = headers.findIndex((header) => normalizedAliases.includes(header));
  return index >= 0 ? cells[index] : undefined;
}

function normalizeSex(value: string): VetusPatientSex {
  const normalized = normalizeHeader(value);
  if (['macho', 'male', 'm'].includes(normalized)) return 'male';
  if (['femea', 'female', 'f'].includes(normalized)) return 'female';
  return 'unknown';
}

function parseWeight(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function statusClass(status: ImportStatus): string {
  if (status === 'Importado') return 'status-pill--success';
  if (status === 'Erro') return 'status-pill--danger';
  if (status === 'Validado') return 'status-pill--success';
  return 'status-pill--ready';
}

function batchStatusLabel(status: VetusImportBatchSummary['status']): string {
  if (status === 'dry_run') return 'Dry-run concluído';
  if (status === 'completed') return 'Concluído';
  if (status === 'rolled_back') return 'Revertido';
  return 'Parcial — há rejeitados';
}

function importStatusLabel(status: VetusImportSummary['status']): string {
  return status === 'linked' ? 'Vinculado' : 'Importado';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<style scoped>
.vetus-import-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(220px, 0.7fr);
  gap: 16px;
  align-items: start;
}

.import-form,
.text-field,
.file-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.import-form {
  gap: 14px;
}

.file-field span,
.text-field span {
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.file-field input,
.text-field textarea {
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.file-field input {
  padding: 10px;
}

.text-field textarea {
  min-height: 190px;
  padding: 12px;
  resize: vertical;
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(180px, 1fr) minmax(180px, 1fr);
  gap: 12px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.import-summary {
  display: grid;
  gap: 14px;
  margin: 0;
}

.import-summary div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.import-summary div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.import-summary dt {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.import-summary dd {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 700;
}

.batch-summary {
  display: grid;
  gap: 4px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border, #d1d5db);
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.batch-summary strong {
  overflow-wrap: anywhere;
  color: var(--color-text, #0f172a);
  font-size: 12px;
}

.subtle-line {
  display: block;
  margin-top: 2px;
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--ready {
  background: #e0f2fe;
  color: #075985;
}

.status-pill--success {
  background: #dcfce7;
  color: #166534;
}

.status-pill--danger {
  background: #fee2e2;
  color: #991b1b;
}

.status-message {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
}

@media (max-width: 960px) {
  .import-layout,
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
