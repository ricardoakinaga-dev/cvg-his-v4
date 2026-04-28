<template>
  <div class="products-import-page">
    <AppPageHeader
      title="Importar Dados Produtos"
      :breadcrumbs="['Estoque', 'Cadastros', 'Produtos', 'Importar Dados Produtos']"
      subtitle="Importacao assistida do cadastro de produtos para estoque, comandas, precos e faturamento."
    >
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/products')">Cadastro de Produtos</DsButton>
        <DsButton variant="secondary" type="button" @click="fillTemplate">Modelo CSV</DsButton>
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
            <input type="file" accept=".csv,.txt,text/csv,text/plain" data-testid="products-import-file" @change="handleFileChange" />
          </label>

          <label class="text-field">
            <span>Dados</span>
            <textarea
              v-model="rawData"
              rows="10"
              data-testid="products-import-data"
              placeholder="Codigo;Produto;Descricao;Preco Base;Ativo"
            ></textarea>
          </label>

          <div class="legacy-filter-grid">
            <DsInput v-model="separator" type="select" label="Separador" data-testid="products-import-separator">
              <option value="auto">Automatico</option>
              <option value=";">Ponto e virgula</option>
              <option value=",">Virgula</option>
              <option value="tab">Tabulacao</option>
              <option value="|">Barra vertical</option>
            </DsInput>

            <DsInput v-model="duplicatePolicy" type="select" label="Duplicados">
              <option value="update">Atualizar por codigo/nome</option>
              <option value="skip">Ignorar duplicados</option>
              <option value="create">Criar novo registro</option>
            </DsInput>

            <label class="active-filter">
              <input v-model="defaultActive" type="checkbox" />
              <span>Produtos Ativos</span>
            </label>
          </div>

          <div class="form-actions">
            <DsButton variant="secondary" type="button" @click="clearRows">Limpar</DsButton>
            <DsButton variant="secondary" type="button" :loading="loadingCatalog" @click="validateRows">Validar</DsButton>
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
            <dt>Novos</dt>
            <dd>{{ newRows.length }}</dd>
          </div>
          <div>
            <dt>Atualizacoes</dt>
            <dd>{{ updateRows.length }}</dd>
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
      empty-description="Informe os dados e valide para visualizar a importacao."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-id">{{ (row as ImportPreviewRow).code || '-' }}</span>
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ImportPreviewRow).basePrice) }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as ImportPreviewRow).active ? 'Sim' : 'Nao' }}
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import { productsService, type ProductSummary } from '@/services/products';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

type ImportStatus = 'Pronto' | 'Ignorado' | 'Erro' | 'Importado';
type ImportOperation = 'Criar' | 'Atualizar' | 'Ignorar';
type DuplicatePolicy = 'update' | 'skip' | 'create';

interface ImportPreviewRow {
  line: number;
  code: string;
  name: string;
  description: string;
  basePrice: number;
  active: boolean;
  operation: ImportOperation;
  existingProductId: string | null;
  status: ImportStatus;
  message: string;
}

const router = useRouter();
const rawData = ref('');
const separator = ref('auto');
const duplicatePolicy = ref<DuplicatePolicy>('update');
const defaultActive = ref(true);
const existingProducts = ref<ProductSummary[]>([]);
const loadingCatalog = ref(false);
const previewRows = ref<ImportPreviewRow[]>([]);
const importing = ref(false);
const error = ref('');
const success = ref('');

const columns: DataTableColumn[] = [
  { key: 'line', label: 'Linha', width: '90px' },
  { key: 'code', label: 'Codigo', width: '150px' },
  { key: 'name', label: 'Produto' },
  { key: 'description', label: 'Descricao' },
  { key: 'basePrice', label: 'Preco Base', width: '140px' },
  { key: 'active', label: 'Produtos Ativos', width: '150px' },
  { key: 'operation', label: 'Acao', width: '130px' },
  { key: 'status', label: 'Situacao', width: '220px' }
];

const importableRows = computed(() => previewRows.value.filter((row) => row.status === 'Pronto'));
const invalidRows = computed(() => previewRows.value.filter((row) => row.status === 'Erro'));
const newRows = computed(() => previewRows.value.filter((row) => row.operation === 'Criar' && row.status !== 'Erro'));
const updateRows = computed(() => previewRows.value.filter((row) => row.operation === 'Atualizar' && row.status !== 'Erro'));

onMounted(loadCatalog);

async function loadCatalog() {
  loadingCatalog.value = true;
  try {
    existingProducts.value = await productsService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar catalogo de produtos';
  } finally {
    loadingCatalog.value = false;
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    rawData.value = String(reader.result ?? '');
    void validateRows();
  };
  reader.onerror = () => {
    error.value = 'Erro ao ler o arquivo selecionado.';
  };
  reader.readAsText(file);
}

function fillTemplate() {
  rawData.value = [
    'Codigo;Produto;Descricao;Preco Base;Ativo',
    'VAC-010;Vacina V10;Imunizante multiplo;120,00;Sim',
    'SER-003;Seringa 3ml;Material de aplicacao;8,50;Sim'
  ].join('\n');
  previewRows.value = [];
  error.value = '';
  success.value = '';
}

function clearRows() {
  rawData.value = '';
  previewRows.value = [];
  error.value = '';
  success.value = '';
}

async function validateRows() {
  error.value = '';
  success.value = '';
  if (!existingProducts.value.length) {
    await loadCatalog();
  }

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
      const payload = {
        name: row.name,
        code: row.code || null,
        description: row.description || null,
        basePrice: row.basePrice,
        active: row.active
      };

      if (row.operation === 'Atualizar' && row.existingProductId) {
        await productsService.update(row.existingProductId, payload);
      } else {
        await productsService.create(payload);
      }

      row.status = 'Importado';
      row.message = row.operation === 'Atualizar' ? 'Produto atualizado' : 'Produto importado';
      imported += 1;
    } catch (err: unknown) {
      row.status = 'Erro';
      row.message = err instanceof Error ? err.message : 'Erro ao importar';
      failed += 1;
    }
  }

  importing.value = false;
  if (failed > 0) {
    error.value = imported > 0
      ? `${imported} produto(s) importado(s); ${failed} produto(s) nao foram importados.`
      : `${failed} produto(s) nao foram importados.`;
  } else if (imported > 0) {
    success.value = `${imported} produto(s) importado(s).`;
  }
  await loadCatalog();
}

function buildPreviewRow(cells: string[], headers: string[], lineNumber: number): ImportPreviewRow {
  const code = valueByHeader(cells, headers, ['codigo', 'código', 'id', 'code', 'sku']) ?? cells[0] ?? '';
  const name =
    valueByHeader(cells, headers, ['produto', 'nome', 'name', 'descricao', 'descrição']) ??
    (headers.length ? '' : cells[1] ?? cells[0] ?? '');
  const description =
    valueByHeader(cells, headers, ['descricao', 'descrição', 'description', 'detalhe']) ??
    (headers.length ? '' : cells[2] ?? '');
  const priceText =
    valueByHeader(cells, headers, ['preco base', 'preço base', 'preco', 'preço', 'valor', 'price']) ??
    cells[3] ??
    '0';
  const activeText = valueByHeader(cells, headers, ['ativo', 'active', 'produtos ativos']) ?? cells[4];
  const basePrice = parseMoney(priceText);
  const messages: string[] = [];
  const existingProduct = findExistingProduct(code, name);
  const operation = resolveOperation(existingProduct);

  if (!name.trim()) messages.push('Produto obrigatorio');
  if (!Number.isFinite(basePrice) || basePrice < 0) messages.push('Preco invalido');
  if (operation === 'Ignorar') messages.push('Produto duplicado ignorado');

  return {
    line: lineNumber,
    code: code.trim(),
    name: name.trim(),
    description: description.trim(),
    basePrice: Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0,
    active: parseActive(activeText),
    operation,
    existingProductId: existingProduct?.id ?? null,
    status: messages.length ? (operation === 'Ignorar' ? 'Ignorado' : 'Erro') : 'Pronto',
    message: messages.join('; ')
  };
}

function resolveOperation(existingProduct?: ProductSummary): ImportOperation {
  if (!existingProduct || duplicatePolicy.value === 'create') return 'Criar';
  if (duplicatePolicy.value === 'skip') return 'Ignorar';
  return 'Atualizar';
}

function findExistingProduct(code: string, name: string): ProductSummary | undefined {
  const normalizedCode = normalizeKey(code);
  const normalizedName = normalizeKey(name);
  return existingProducts.value.find((product) => {
    const productCode = normalizeKey(product.code ?? '');
    const productName = normalizeKey(product.name);
    return (!!normalizedCode && productCode === normalizedCode) || (!!normalizedName && productName === normalizedName);
  });
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
  return normalized.some((cell) => ['produto', 'nome', 'preco', 'preco base', 'valor'].includes(cell));
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizeKey(value: string): string {
  return normalizeHeader(value).replace(/\s+/g, ' ');
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
  if (status === 'Ignorado') return 'status-pill--neutral';
  return 'status-pill--ready';
}
</script>

<style scoped>
.products-import-page {
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
  grid-template-columns: minmax(180px, 240px) minmax(220px, 260px) auto;
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

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
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
  background: #e2e8f0;
  color: #334155;
}

.status-pill--neutral {
  background: #e2e8f0;
  color: #334155;
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
