<template>
  <div class="app-search-toolbar" @keyup.enter="emit('search')">
    <div class="app-search-toolbar__search">
      <DsInput
        :model-value="modelValue"
        type="search"
        :placeholder="placeholder"
        :label="label"
        :id="id"
        @update:model-value="emit('update:modelValue', String($event ?? ''))"
      />
    </div>

    <div v-if="$slots.filters" class="app-search-toolbar__filters">
      <slot name="filters" />
    </div>

    <div class="app-search-toolbar__actions">
      <slot name="actions" />
      <DsButton v-if="showSearchButton" variant="secondary" @click="emit('search')">
        {{ searchButtonLabel }}
      </DsButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    label?: string;
    id?: string;
    searchButtonLabel?: string;
    showSearchButton?: boolean;
  }>(),
  {
    placeholder: 'Buscar...',
    label: 'Buscar',
    id: 'app-search-toolbar-input',
    searchButtonLabel: 'Buscar',
    showSearchButton: true
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [];
}>();
</script>

<style scoped>
.app-search-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.app-search-toolbar__search {
  flex: 1 1 320px;
  min-width: 240px;
}

.app-search-toolbar__filters {
  display: flex;
  gap: 12px;
  flex: 2 1 320px;
  flex-wrap: wrap;
}

.app-search-toolbar__filters :deep(.ds-input-wrapper) {
  min-width: 160px;
  flex: 1 1 160px;
}

.app-search-toolbar__actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}
@media (max-width: 720px) {
  .app-search-toolbar {
    align-items: stretch;
  }

  .app-search-toolbar__search,
  .app-search-toolbar__filters,
  .app-search-toolbar__actions {
    flex: 1 1 100%;
    min-width: 0;
    width: 100%;
  }

  .app-search-toolbar__filters :deep(.ds-input-wrapper) {
    flex-basis: 100%;
    min-width: 0;
  }

  .app-search-toolbar__actions :deep(.ds-btn) {
    flex: 1 1 auto;
  }
}
</style>
