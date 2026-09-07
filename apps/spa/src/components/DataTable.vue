<template>
  <div class="data-table-wrapper" :class="{ 'data-table-wrapper--compact': compact }">
    <div v-if="loading" class="data-table-loading">
      <div
        class="data-table-loading__shell"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Carregando dados da tabela"
      >
        <SkeletonLoader aria-hidden="true" variant="heading" width="28%" />
        <div class="data-table-loading__header">
          <SkeletonLoader aria-hidden="true"
            v-for="col in columns"
            :key="col.key"
            variant="table-cell"
            height="18px"
            :width="col.width ?? '100%'"
          />
        </div>
        <div class="data-table-loading__body">
          <div v-for="row in loadingRows" :key="row" class="data-table-loading__row">
            <SkeletonLoader aria-hidden="true"
              v-for="col in columns"
              :key="`${row}-${col.key}`"
              variant="table-cell"
              height="18px"
              :width="skeletonWidth(col.key, row)"
            />
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="rows.length === 0"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template v-if="$slots.emptyAction" #action>
        <slot name="emptyAction" />
      </template>
    </EmptyState>

    <div
      v-else
      ref="scrollRegion"
      class="table-wrapper"
      role="region"
      :aria-label="caption || 'Tabela de dados'"
      :aria-describedby="hasHorizontalOverflow ? scrollHintId : undefined"
      data-scroll-container="local"
      tabindex="0"
    >
      <div v-if="hasHorizontalOverflow" class="table-wrapper__scroll-cue" aria-hidden="true">
        <span class="table-wrapper__scroll-cue-label">Rolagem local</span>
        <span class="table-wrapper__scroll-cue-copy">Deslize para ver outras colunas <span>↔</span></span>
      </div>
      <p v-if="hasHorizontalOverflow" :id="scrollHintId" class="sr-only">
        Esta tabela usa rolagem horizontal local. Use as setas para a esquerda e para a direita com esta região em foco,
        ou deslize horizontalmente para consultar todas as colunas.
      </p>
      <table ref="tableElement" class="data-table" :class="tableClass">
        <caption v-if="caption" class="sr-only">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="col.class"
              :style="col.width ? { width: col.width } : undefined"
              scope="col"
              :aria-label="col.label || columnAccessibleName(col.key)"
            >
              <slot :name="`header-${col.key}`" :column="col">
                {{ col.label }}
              </slot>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="rowKey(row, rowIndex)">
            <td v-for="col in columns" :key="col.key" :class="col.class">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="rowIndex">
                {{ formatValue(row[col.key], col, row) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, useId, watch } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';

export interface DataTableColumn {
  key: string;
  label: string;
  width?: string;
  class?: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

export type DataTableRow = Record<string, unknown>;

interface Props {
  columns: readonly DataTableColumn[];
  rows: readonly any[];
  caption?: string;
  loading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
  variant?: 'default' | 'striped' | 'hoverable';
  rowKeyField?: string;
}

const props = withDefaults(defineProps<Props>(), {
  caption: '',
  loading: false,
  emptyIcon: '📋',
  emptyTitle: 'Nenhum registro encontrado',
  emptyDescription: '',
  compact: false,
  variant: 'default',
  rowKeyField: 'id'
});

const scrollHintId = `data-table-scroll-hint-${useId()}`;

const scrollRegion = ref<HTMLElement | null>(null);
const tableElement = ref<HTMLTableElement | null>(null);
const hasHorizontalOverflow = ref(false);
let resizeObserver: ResizeObserver | undefined;
let measurementFrame: number | undefined;

function measureOverflow() {
  const region = scrollRegion.value;
  const table = tableElement.value;
  // Measure the table itself: the instruction must never create its own overflow.
  hasHorizontalOverflow.value = !!(region && table && table.scrollWidth > region.clientWidth + 1);
}
function scheduleMeasurement() {
  if (measurementFrame !== undefined) return;
  measurementFrame = requestAnimationFrame(() => {
    measurementFrame = undefined;
    measureOverflow();
  });
}
watch([scrollRegion, tableElement], ([region, table]) => {
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  hasHorizontalOverflow.value = false;
  if (!region || !table) return;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(region);
    resizeObserver.observe(table);
  }
  scheduleMeasurement();
}, { flush: 'post' });
onMounted(() => window.addEventListener('resize', scheduleMeasurement));
// Slot content and row changes can alter scrollWidth without resizing a fixed table box.
onUpdated(scheduleMeasurement);
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', scheduleMeasurement);
  if (measurementFrame !== undefined) cancelAnimationFrame(measurementFrame);
});

const tableClass = computed(() => {
  const classes: string[] = [];
  if (props.variant === 'striped') classes.push('data-table--striped');
  if (props.variant === 'hoverable') classes.push('data-table--hoverable');
  return classes;
});

const loadingRows = computed(() => [0, 1, 2, 3]);

function formatValue(
  value: unknown,
  col: DataTableColumn,
  row: Record<string, unknown>
): string {
  if (col.format) return col.format(value, row);
  if (value == null) return '';
  return String(value);
}

function rowKey(row: Record<string, unknown>, index: number): string {
  const key = row[props.rowKeyField];
  return key != null ? String(key) : `row-${index}`;
}

function skeletonWidth(columnKey: string, rowIndex: number): string {
  const widthsByColumn: Record<string, string[]> = {
    name: ['72%', '64%', '78%', '70%'],
    email: ['84%', '76%', '82%', '74%'],
    status: ['58%', '52%', '62%', '56%'],
    title: ['76%', '68%', '80%', '72%']
  };

  return widthsByColumn[columnKey]?.[rowIndex] ?? (rowIndex % 2 === 0 ? '90%' : '72%');
}

function columnAccessibleName(columnKey: string): string {
  if (columnKey === 'select') return 'Selecionar';
  if (columnKey === 'actions') return 'Ações';
  return columnKey;
}
</script>

<style scoped>
.data-table-wrapper {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.data-table-loading {
  padding: 8px 0 24px;
}

.data-table-loading__shell {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.06));
}

.data-table-loading__header,
.data-table-loading__row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(120px, 1fr);
  gap: 12px;
}

.data-table-loading__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-table-loading__row {
  align-items: center;
}

.data-table-loading__header :deep(.ds-skeleton),
.data-table-loading__row :deep(.ds-skeleton) {
  width: 100%;
}

.table-wrapper {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-gutter: stable;
}

.table-wrapper:focus-visible {
  outline: 2px solid var(--color-primary-500, #3b82f6);
  outline-offset: 2px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary, #475569);
  border-bottom: 2px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
  white-space: nowrap;
}

.data-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  vertical-align: middle;
}

.data-table--striped tbody tr:nth-child(even) {
  background: var(--color-bg-subtle, #f8fafc);
}

.data-table--hoverable tbody tr:hover {
  background: var(--color-primary-50, #eff6ff);
}

.data-table-wrapper--compact .data-table thead th,
.data-table-wrapper--compact .data-table tbody td {
  padding: 8px 12px;
  font-size: 13px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ─── CVG Pulse table surface ─── */
.data-table-wrapper {
  min-width: 0;
  max-width: 100%;
}

.data-table-loading {
  padding: 2px 0 20px;
}

.data-table-loading__shell {
  gap: 16px;
  padding: clamp(14px, 2vw, 20px);
  border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  border-radius: var(--pulse-radius-lg, 16px);
  background:
    linear-gradient(135deg, var(--pulse-cyan-wash, rgba(16, 183, 198, 0.08)), transparent 45%),
    var(--pulse-surface, var(--color-surface, #ffffff));
  box-shadow: var(--pulse-shadow-card, 0 12px 30px rgba(15, 35, 48, 0.08));
}

.data-table-loading__header,
.data-table-loading__row {
  gap: 14px;
}

.data-table-loading__header {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--pulse-surface-soft, var(--color-bg-subtle, #f7fafb));
}

.data-table-loading__body {
  gap: 8px;
}

.data-table-loading__row {
  min-height: 44px;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--pulse-line-soft, var(--color-border, #d5e2e6));
}

.table-wrapper {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-color: var(--pulse-cyan, var(--color-primary-500, #0fa8b8))
    var(--pulse-surface-soft, var(--color-bg-subtle, #f7fafb));
  scrollbar-width: thin;
  border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  border-radius: var(--pulse-radius-lg, 16px);
  background: var(--pulse-surface, var(--color-surface, #ffffff));
  box-shadow: var(--pulse-shadow-card, 0 12px 30px rgba(15, 35, 48, 0.08));
}

.table-wrapper::-webkit-scrollbar {
  height: 9px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: var(--pulse-surface-soft, var(--color-bg-subtle, #f7fafb));
}

.table-wrapper::-webkit-scrollbar-thumb {
  border: 2px solid var(--pulse-surface-soft, var(--color-bg-subtle, #f7fafb));
  border-radius: 999px;
  background: var(--pulse-cyan, var(--color-primary-500, #0fa8b8));
}

.table-wrapper:focus-visible {
  outline: 3px solid var(--pulse-focus, var(--color-focus-ring, rgba(15, 168, 184, 0.36)));
  outline-offset: 3px;
}

.table-wrapper__scroll-cue {
  position: sticky;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 32px;
  padding: 7px 14px;
  border-bottom: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  background: var(--pulse-surface-soft, var(--color-bg-subtle, #f7fafb));
  color: var(--pulse-muted, var(--color-text-muted, #55717a));
  font-size: 11px;
  line-height: 1.3;
  pointer-events: none;
}

.table-wrapper__scroll-cue-label {
  color: var(--pulse-cyan-strong, var(--color-primary-700, #066b80));
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.table-wrapper__scroll-cue-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.table-wrapper__scroll-cue-copy span {
  color: var(--pulse-cyan, var(--color-primary-500, #0fa8b8));
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.data-table {
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--pulse-ink, var(--color-text, #112530));
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.data-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 13px 16px;
  border-bottom: 1px solid var(--pulse-line-strong, var(--color-border-strong, #b8ccd2));
  background: var(--pulse-table-head, var(--color-bg-subtle, #f7fafb));
  color: var(--pulse-muted-strong, var(--color-text-secondary, #3e5c67));
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.075em;
  line-height: 1.3;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--pulse-line-soft, var(--color-border, #d5e2e6));
  color: var(--pulse-ink, var(--color-text, #112530));
  vertical-align: middle;
}

.data-table tbody tr {
  transition: background-color var(--duration-fast, 150ms) var(--ease-default, ease);
}

.data-table tbody tr:last-child td {
  border-bottom: 0;
}

.data-table--striped tbody tr:nth-child(even) {
  background: var(--pulse-table-stripe, var(--color-bg-subtle, #f7fafb));
}

.data-table--hoverable tbody tr:hover {
  background: var(--pulse-table-hover, var(--color-primary-50, #e8f8fa));
}

.data-table tbody tr:focus-within {
  background: var(--pulse-table-hover, var(--color-primary-50, #e8f8fa));
  box-shadow: inset 3px 0 0 var(--pulse-cyan, var(--color-primary-500, #0fa8b8));
}

.data-table :where(a, button, [role='button']) {
  min-height: var(--touch-min, 44px);
}

.data-table-wrapper--compact .data-table thead th,
.data-table-wrapper--compact .data-table tbody td {
  padding: 10px 12px;
  font-size: 13px;
}

@media (max-width: 720px) {
  .table-wrapper__scroll-cue {
    min-height: 36px;
    padding-inline: 12px;
  }

  .table-wrapper__scroll-cue-copy {
    font-size: 10px;
  }

  .data-table {
    min-width: 600px;
  }

  .data-table thead th,
  .data-table tbody td {
    padding-inline: 12px;
  }
}
</style>
