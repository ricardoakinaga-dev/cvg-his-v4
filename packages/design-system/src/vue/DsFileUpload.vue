<script setup lang="ts">
import { ref, computed } from 'vue';

export interface DsFileUploadProps {
  modelValue?: File | File[] | null;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  id?: string;
}

const props = withDefaults(defineProps<DsFileUploadProps>(), {
  multiple: false,
  maxSize: 10 * 1024 * 1024, // 10MB default
  maxFiles: 5
});

const emit = defineEmits<{
  'update:modelValue': [value: File | File[] | null];
  'error': [message: string];
}>();

const isDragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const generatedUploadId = props.id || Math.random().toString(36).slice(2, 8);
const dropzoneId = computed(() => `ds-file-upload-desc-${generatedUploadId}`);
const hintId = computed(() => `ds-file-upload-hint-${generatedUploadId}`);
const errorId = computed(() => `ds-file-upload-error-${generatedUploadId}`);

const hasError = computed(() => !!props.error);

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (!props.disabled) isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  if (props.disabled) return;

  const files = event.dataTransfer?.files;
  if (files) {
    processFiles(Array.from(files));
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.key === 'Enter' || event.key === ' ') && !props.disabled) {
    event.preventDefault();
    openFilePicker();
  }
};

const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files) {
    processFiles(Array.from(files));
  }
  // Reset input so same file can be selected again
  target.value = '';
};

const processFiles = (files: File[]) => {
  // Filter by max size
  const validFiles = files.filter(file => {
    if (file.size > props.maxSize) {
      emit('error', `Arquivo ${file.name} excede o tamanho máximo de ${formatSize(props.maxSize)}`);
      return false;
    }
    return true;
  });

  // Check max files
  if (props.multiple) {
    const currentFiles = Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [];
    const totalFiles = currentFiles.length + validFiles.length;
    if (totalFiles > props.maxFiles) {
      emit('error', `Máximo de ${props.maxFiles} arquivos permitidos`);
      return;
    }
  }

  if (validFiles.length === 0) return;

  if (props.multiple) {
    const currentFiles = Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [];
    emit('update:modelValue', [...currentFiles, ...validFiles]);
  } else {
    emit('update:modelValue', validFiles[0]);
  }
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const removeFile = (index: number) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const newFiles = [...props.modelValue];
    newFiles.splice(index, 1);
    emit('update:modelValue', newFiles);
  } else {
    emit('update:modelValue', null);
  }
};

const openFilePicker = () => {
  if (!props.disabled) inputRef.value?.click();
};

const selectedFiles = computed(() => {
  if (!props.modelValue) return [];
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue];
});
</script>

<template>
  <div class="ds-file-upload">
    <label v-if="label" :for="id" class="ds-file-upload__label">
      {{ label }}
      <span v-if="required" class="ds-file-upload__required" aria-hidden="true">*</span>
    </label>

    <div
      class="ds-file-upload__dropzone"
      :class="{
        'ds-file-upload__dropzone--active': isDragging,
        'ds-file-upload__dropzone--error': hasError,
        'ds-file-upload__dropzone--disabled': disabled
      }"
      role="button"
      tabindex="0"
      :aria-disabled="disabled"
      :aria-describedby="[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFilePicker"
      @keydown="handleKeydown"
    >
      <input
        :id="id"
        ref="inputRef"
        type="file"
        class="ds-file-upload__input"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        :aria-describedby="[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined"
        @change="handleInputChange"
      />

      <div class="ds-file-upload__content">
        <svg class="ds-file-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17,8 12,3 7,8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p :id="dropzoneId" class="ds-file-upload__text">
          <span v-if="isDragging">Solte os arquivos aqui</span>
          <span v-else>Arraste arquivos aqui ou clique para selecionar</span>
        </p>
        <p v-if="hint" :id="hintId" class="ds-file-upload__hint">{{ hint }}</p>
      </div>
    </div>

    <div v-if="selectedFiles.length > 0" class="ds-file-upload__files" role="list" :aria-label="`${selectedFiles.length} arquivo(s) selecionado(s)`">
      <div
        v-for="(file, index) in selectedFiles"
        :key="`${file.name}-${index}`"
        class="ds-file-upload__file"
        role="listitem"
      >
        <svg class="ds-file-upload__file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
        </svg>
        <span class="ds-file-upload__file-name">{{ file.name }}</span>
        <span class="ds-file-upload__file-size">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          class="ds-file-upload__file-remove"
          :disabled="disabled"
          :aria-label="`Remover arquivo ${file.name}`"
          @click.stop="removeFile(index)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <p v-if="error" :id="errorId" class="ds-file-upload__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.ds-file-upload {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ds-file-upload__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-file-upload__required {
  color: var(--color-danger-500, #dc2626);
  margin-left: 0.25rem;
}

.ds-file-upload__dropzone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px dashed var(--color-border, #cbd5e1);
  border-radius: var(--radius-md, 6px);
  background-color: var(--color-bg-subtle, #f8fafc);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ds-file-upload__dropzone:hover:not(.ds-file-upload__dropzone--disabled) {
  border-color: var(--color-primary-400, #60a5fa);
  background-color: var(--color-surface-hover, #f1f5f9);
}

.ds-file-upload__dropzone:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
  border-color: var(--color-primary-500, #3b82f6);
}

.ds-file-upload__dropzone--active {
  border-color: var(--color-primary-500, #3b82f6);
  background-color: var(--color-primary-50, #eff6ff);
}

.ds-file-upload__dropzone--error {
  border-color: var(--color-danger-500, #dc2626);
}

.ds-file-upload__dropzone--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ds-file-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.ds-file-upload__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.ds-file-upload__icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-text-muted, #64748b);
}

.ds-file-upload__text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #475569);
  margin: 0;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-file-upload__hint {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  margin: 0;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-file-upload__files {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.ds-file-upload__file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 4px);
}

.ds-file-upload__file-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-text-muted, #64748b);
  flex-shrink: 0;
}

.ds-file-upload__file-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-file-upload__file-size {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-file-upload__file-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted, #94a3b8);
  border-radius: var(--radius-sm, 4px);
  transition: all 0.2s ease;
}

.ds-file-upload__file-remove:hover:not(:disabled) {
  color: var(--color-danger-500, #dc2626);
  background-color: var(--color-danger-50, #fef2f2);
}

.ds-file-upload__file-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ds-file-upload__file-remove:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-file-upload__file-remove svg {
  width: 1rem;
  height: 1rem;
}

.ds-file-upload__error {
  font-size: 0.75rem;
  color: var(--color-danger-600, #dc2626);
  margin: 0;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}
</style>
