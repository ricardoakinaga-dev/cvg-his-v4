<template>
  <div class="data-table-wrapper" :class="{ 'data-table-wrapper--compact': compact }">
    <div v-if="loading" class="data-table-loading">
      <div class="data-table-loading__shell" aria-busy="true" aria-live="polite">
        <SkeletonLoader variant="heading" width="28%" />
        <div class="data-table-loading__header">
          <SkeletonLoader
            v-for="col in columns"
            :key="col.key"
            variant="table-cell"
            height="18px"
            :width="col.width ?? '100%'"
          />
        </div>
        <div class="data-table-loading__body">
          <div v-for="row in loadingRows" :key="row" class="data-table-loading__row">
            <SkeletonLoader
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

    <div v-else class="table-wrapper">
      <table class="data-table" :class="tableClass">
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
                {{ formatValue(row[col.key], col) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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

const tableClass = computed(() => {
  const classes: string[] = [];
  if (props.variant === 'striped') classes.push('data-table--striped');
  if (props.variant === 'hoverable') classes.push('data-table--hoverable');
  return classes;
});

const loadingRows = computed(() => [0, 1, 2, 3]);

function formatValue(value: unknown, _col: DataTableColumn): string {
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
</script>

<style scoped>
.data-table-wrapper {
  width: 100%;
}

.data-table-loading {
  padding: 8px 0 24px;
}

.data-table-loading__shell {
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
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
  overflow-x: auto;
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
</style>
