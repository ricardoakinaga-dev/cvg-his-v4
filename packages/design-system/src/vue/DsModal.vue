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
        :aria-describedby="modalId + '-body'"
        tabindex="-1"
      >
        <div class="ds-modal__header">
          <h2 v-if="title" :id="modalId + '-title'" class="ds-modal__title">{{ title }}</h2>
          <button
            v-if="closable"
            class="ds-modal__close"
            type="button"
            @click="$emit('close')"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div :id="modalId + '-body'" class="ds-modal__body">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue';

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

const modalId = `ds-modal-${Math.random().toString(36).slice(2, 10)}`;
const modalRef = ref<HTMLElement | null>(null);
const returnFocusTarget = ref<HTMLElement | null>(null);
const bodyScrollLocked = ref(false);

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
    if (!first || !last) {
      event.preventDefault();
      modalRef.value.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function onModalMounted(el: Element | ComponentPublicInstance | null) {
  if (el && (el as HTMLElement).querySelector) {
    modalRef.value = el as HTMLElement;
    const focusable = modalRef.value?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    (focusable || modalRef.value)?.focus();
  }
}

function updateBodyScrollLock(shouldLock: boolean) {
  if (typeof document === 'undefined' || bodyScrollLocked.value === shouldLock) return;

  type ModalLockBody = HTMLElement & {
    __dsModalLockCount?: number;
    __dsModalPreviousOverflow?: string;
  };
  const body = document.body as ModalLockBody;
  const activeModalCount = body.__dsModalLockCount ?? 0;

  bodyScrollLocked.value = shouldLock;
  if (shouldLock) {
    if (activeModalCount === 0) {
      body.__dsModalPreviousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }
    body.__dsModalLockCount = activeModalCount + 1;
    return;
  }

  const nextModalCount = Math.max(0, activeModalCount - 1);
  body.__dsModalLockCount = nextModalCount;
  if (nextModalCount === 0) {
    body.style.overflow = body.__dsModalPreviousOverflow ?? '';
    delete body.__dsModalPreviousOverflow;
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
      const focusable = modalRef.value?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (focusable || modalRef.value)?.focus();
      updateBodyScrollLock(true);
      return;
    }

    updateBodyScrollLock(false);
    const target = returnFocusTarget.value;
    returnFocusTarget.value = null;
    await nextTick();
    target?.focus();
  }
);

onMounted(() => {
  if (props.open) updateBodyScrollLock(true);
});

onBeforeUnmount(() => {
  updateBodyScrollLock(false);
});
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
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ds-modal {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  width: 100%;
  max-height: min(720px, calc(100dvh - 32px));
  min-height: 0;
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
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.ds-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  min-width: 0;
  overflow-wrap: anywhere;
}

.ds-modal__close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary, #475569);
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-md, 6px);
  line-height: 1;
  flex: 0 0 auto;
}

.ds-modal__close:hover {
  background: var(--color-surface-hover, #f1f5f9);
}

.ds-modal__close:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
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
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .ds-modal-overlay {
    align-items: flex-end;
    padding: 8px;
  }

  .ds-modal {
    max-height: calc(100dvh - 16px);
    border-radius: var(--radius-xl, 16px);
  }

  .ds-modal__header,
  .ds-modal__body {
    padding-inline: 16px;
  }

  .ds-modal__footer {
    padding-inline: 16px;
  }

  .ds-modal__footer > * {
    flex: 1 1 auto;
  }
}
</style>
