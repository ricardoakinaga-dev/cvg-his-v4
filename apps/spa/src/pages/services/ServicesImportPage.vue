<template>
  <div class="import-page">
    <AppPageHeader
      title="Importar Dados Serviços"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Serviços', 'Importar Dados Serviços']"
      subtitle="Importação assistida do cadastro de serviços para agenda, comandas e faturamento.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/services')">Cadastro de Serviços</DsButton>
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
              placeholder="Id;Descrição;Valor;Ativo"
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
            <label class="active-filter">
              <input v-model="defaultActive" type="checkbox" />
              <span>Serviços Ativos</span>
            </label>
          </div>

          <div class="form-actions">
            <DsButton variant="secondary" type="button" @click="validateRows">Validar</DsButton>
            <DsButton
              variant="primary"
              type="button"
              :disabled="!importableRows.length || importing"
              :loading="importing"
              @click="importRows"
            >
              Importar
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
            <dt>Com erro</dt>
            <dd>{{ invalidRows.length }}</dd>
          </div>
        </dl>
      </DsCard>
    </section>

    <DataTable
      :columns="columns"
      :rows="previewRows"
      empty-icon="⬆️"
      empty-title="Nenhum registro encontrado"
      empty-description="Informe os dados e valide para visualizar a importação."
      variant="hoverable"
    >
      <template #cell-value="{ row }">
        {{ formatCurrency((row as ImportPreviewRow).value) }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as ImportPreviewRow).active ? 'Sim' : 'Não' }}
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import { servicesService } from '@/services/services';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

type ImportStatus = 'Pronto' | 'Erro' | 'Importado';

interface ImportPreviewRow {
  line: number;
  id: string;
  description: string;
  value: number;
  active: boolean;
  status: ImportStatus;
  message: string;
}

const router = useRouter();
const rawData = ref('');
const separator = ref('auto');
const defaultActive = ref(true);
const previewRows = ref<ImportPreviewRow[]>([]);
const importing = ref(false);
const error = ref('');
const success = ref('');

const columns: DataTableColumn[] = [
  { key: 'line', label: 'Linha', width: '90px' },
  { key: 'id', label: 'Id', width: '160px' },
  { key: 'description', label: 'Descrição' },
  { key: 'value', label: 'Valor', width: '140px' },
  { key: 'active', label: 'Serviços Ativos', width: '150px' },
  { key: 'status', label: 'Situação', width: '220px' }
];

const importableRows = computed(() => previewRows.value.filter((row) => row.status === 'Pronto'));
const invalidRows = computed(() => previewRows.value.filter((row) => row.status === 'Erro'));

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
  error.value = '';
  success.value = '';
  let imported = 0;
  let failed = 0;

  for (const row of importableRows.value) {
    try {
      await servicesService.create({
        name: row.description,
        code: row.id || null,
        description: null,
        basePrice: row.value,
        active: row.active
      });
      row.status = 'Importado';
      row.message = 'Serviço importado';
      imported += 1;
    } catch (err: unknown) {
      row.status = 'Erro';
      row.message = err instanceof Error ? err.message : 'Erro ao importar';
      failed += 1;
    }
  }

  importing.value = false;
  success.value = `${imported} serviço(s) importado(s).`;
  if (failed > 0) {
    error.value = `${failed} serviço(s) não foram importados.`;
  }
}

function buildPreviewRow(cells: string[], headers: string[], lineNumber: number): ImportPreviewRow {
  const id = valueByHeader(cells, headers, ['id', 'codigo', 'code']) ?? cells[0] ?? '';
  const description =
    valueByHeader(cells, headers, ['descricao', 'descrição', 'servico', 'serviço', 'nome', 'name']) ??
    (headers.length ? '' : cells[1] ?? cells[0] ?? '');
  const valueText = valueByHeader(cells, headers, ['valor', 'preco', 'preço', 'value', 'price']) ?? cells[2] ?? '0';
  const activeText = valueByHeader(cells, headers, ['ativo', 'active', 'servicos ativos', 'serviços ativos']) ?? cells[3];
  const value = parseMoney(valueText);
  const messages: string[] = [];

  if (!description.trim()) messages.push('Descrição obrigatória');
  if (!Number.isFinite(value) || value < 0) messages.push('Valor inválido');

  return {
    line: lineNumber,
    id: id.trim(),
    description: description.trim(),
    value: Number.isFinite(value) && value >= 0 ? value : 0,
    active: parseActive(activeText),
    status: messages.length ? 'Erro' : 'Pronto',
    message: messages.join('; ')
  };
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
  return normalized.some((cell) => ['descricao', 'descrição', 'servico', 'serviço', 'nome', 'valor'].includes(cell));
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

function parseMoney(value: string): number {
  const sanitized = value.replace(/[^\d,.-]/g, '').trim();
  if (!sanitized) return 0;

  if (sanitized.includes(',') && sanitized.includes('.')) {
    return Number(sanitized.replace(/\./g, '').replace(',', '.'));
  }
  if (sanitized.includes(',')) {
    return Number(sanitized.replace(',', '.'));
  }
  return Number(sanitized);
}

function parseActive(value?: string): boolean {
  if (!value?.trim()) return defaultActive.value;
  return !['nao', 'não', 'false', '0', 'inativo', 'inativa'].includes(normalizeHeader(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function statusClass(status: ImportStatus): string {
  if (status === 'Importado') return 'status-pill--success';
  if (status === 'Erro') return 'status-pill--danger';
  return 'status-pill--ready';
}
</script>

<style scoped>
.import-page {
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
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
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
  grid-template-columns: minmax(180px, 240px) auto;
  align-items: end;
  gap: 12px;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.active-filter input {
  width: 18px;
  height: 18px;
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

@media (max-width: 860px) {
  .import-layout,
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
