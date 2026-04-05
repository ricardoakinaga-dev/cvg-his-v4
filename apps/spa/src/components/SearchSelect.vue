<template>
  <div class="search-select" :class="{ 'search-select--open': isOpen }">
    <div class="search-select__input-wrapper">
      <input
        ref="inputRef"
        type="text"
        class="search-select__input"
        :value="searchQuery"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="onSearchInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.down.prevent="highlightNext"
        @keydown.up.prevent="highlightPrev"
        @keydown.enter.prevent="onEnter"
        @keydown.escape.prevent="close"
      />
      <span v-if="loading" class="search-select__spinner" aria-label="Carregando...">⏳</span>
      <button
        v-if="modelValue && !disabled"
        class="search-select__clear"
        type="button"
        @click="clear"
        aria-label="Limpar seleção"
      >
        ×
      </button>
    </div>

    <div v-if="isOpen && filteredOptions.length > 0" class="search-select__dropdown" role="listbox">
      <div
        v-for="(option, index) in filteredOptions"
        :key="option.value"
        class="search-select__option"
        :class="{
          'search-select__option--highlighted': index === highlightedIndex,
          'search-select__option--selected': option.value === modelValue
        }"
        role="option"
        :aria-selected="option.value === modelValue"
        @mousedown.prevent="select(option)"
        @mouseenter="highlightedIndex = index"
      >
        {{ option.label }}
      </div>
    </div>

    <div
      v-if="isOpen && !loading && filteredOptions.length === 0 && searchQuery"
      class="search-select__empty"
    >
      Nenhum resultado encontrado
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

export interface SearchSelectOption {
  label: string;
  value: string;
}

interface Props {
  modelValue?: string;
  options: SearchSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Buscar...',
  disabled: false,
  loading: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [option: SearchSelectOption | null];
}>();

const searchQuery = ref('');
const isOpen = ref(false);
const highlightedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  const q = searchQuery.value.toLowerCase();
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

const selectedOption = computed(() => props.options.find((o) => o.value === props.modelValue));

function onSearchInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  searchQuery.value = value;
  isOpen.value = true;
  highlightedIndex.value = 0;
}

function onFocus() {
  isOpen.value = true;
  if (selectedOption.value) {
    searchQuery.value = selectedOption.value.label;
  }
}

function onBlur() {
  setTimeout(() => {
    isOpen.value = false;
    if (selectedOption.value) {
      searchQuery.value = selectedOption.value.label;
    } else {
      searchQuery.value = '';
    }
  }, 150);
}

function select(option: SearchSelectOption) {
  emit('update:modelValue', option.value);
  emit('change', option);
  searchQuery.value = option.label;
  isOpen.value = false;
}

function clear() {
  emit('update:modelValue', '');
  emit('change', null);
  searchQuery.value = '';
  inputRef.value?.focus();
}

function highlightNext() {
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1);
}

function highlightPrev() {
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
}

function onEnter() {
  if (isOpen.value && filteredOptions.value[highlightedIndex.value]) {
    select(filteredOptions.value[highlightedIndex.value]);
  }
}

function close() {
  isOpen.value = false;
}

if (selectedOption.value) {
  searchQuery.value = selectedOption.value.label;
}
</script>

<style scoped>
.search-select {
  position: relative;
  width: 100%;
}

.search-select--open .search-select__input {
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.search-select__input-wrapper {
  position: relative;
}

.search-select__input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  font-size: 15px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  min-height: 44px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search-select__input:focus {
  outline: none;
}

.search-select__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-select__spinner {
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.search-select__clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
  min-height: auto;
  line-height: 1;
}

.search-select__clear:hover {
  color: var(--color-text, #0f172a);
}

.search-select__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.08));
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
}

.search-select__option {
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.search-select__option:hover,
.search-select__option--highlighted {
  background: var(--color-primary-50, #eff6ff);
}

.search-select__option--selected {
  font-weight: 600;
  background: var(--color-primary-50, #eff6ff);
}

.search-select__empty {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  padding: 12px 14px;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  text-align: center;
}
</style>
