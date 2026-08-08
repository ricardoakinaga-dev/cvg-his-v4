<template>
  <Teleport to="body" :disabled="!teleport">
    <div
      v-if="open"
      class="ds-modal-overlay"
      tabindex="-1"
      @click.self="onOverlayClick"
      @keydown="handleKeydown"
    >
      <div
        :ref="onModalMounted"
        :class="classes"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="title ? modalId + '-title' : undefined"
        :aria-label="title ? undefined : 'Dialog'"
      >
        <div class="ds-modal__header">
          <h2 v-if="title" :id="modalId + '-title'" class="ds-modal__title">{{ title }}</h2>
          <button
            v-if="closable"
            class="ds-modal__close"
            @click="$emit('close')"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div class="ds-modal__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="ds-modal__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue';

export interface DsModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  teleport?: boolean;
}

const props = withDefaults(defineProps<DsModalProps>(), {
  open: false,
  title: undefined,
  size: 'md',
  closable: true,
  teleport: true
});

const emit = defineEmits<{
  close: [];
}>();

const modalId = computed(() => `ds-modal-${Math.random().toString(36).slice(2, 8)}`);
const modalRef = ref<HTMLElement | null>(null);
const returnFocusTarget = ref<HTMLElement | null>(null);

const classes = computed(() => ['ds-modal', `ds-modal--${props.size}`]);

function onOverlayClick() {
  if (props.closable && props.open) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closable && props.open) {
    event.preventDefault();
    emit('close');
  }
  // Focus trap
  if (event.key === 'Tab' && props.open && modalRef.value) {
    const focusable = modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}

function onModalMounted(el: Element | ComponentPublicInstance | null) {
  if (el && (el as HTMLElement).querySelector) {
    modalRef.value = el as HTMLElement;
    const focusable = modalRef.value?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      returnFocusTarget.value = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      await nextTick();
      modalRef.value?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )?.focus();
      return;
    }

    const target = returnFocusTarget.value;
    returnFocusTarget.value = null;
    await nextTick();
    target?.focus();
  }
);
</script>

<style scoped>
.ds-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 400);
  padding: 24px;
}

.ds-modal {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ds-modal--sm {
  max-width: 400px;
}

.ds-modal--md {
  max-width: 560px;
}

.ds-modal--lg {
  max-width: 768px;
}

.ds-modal--xl {
  max-width: 1024px;
}

.ds-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.ds-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-modal__close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary, #475569);
  padding: 4px 8px;
  border-radius: var(--radius-sm, 4px);
  line-height: 1;
}

.ds-modal__close:hover {
  background: var(--color-neutral-100, #f1f5f9);
}

.ds-modal__body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.ds-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
