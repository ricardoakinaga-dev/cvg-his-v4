<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="showUpdateToast" class="pwa-toast" role="alert">
        <div class="toast-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div class="toast-content">
          <p class="toast-title">{{ title }}</p>
          <p class="toast-message">{{ message }}</p>
        </div>
        <div class="toast-actions">
          <button v-if="action" class="toast-btn primary" @click="handleAction">
            {{ action.text }}
          </button>
          <button v-if="dismissible" class="toast-btn secondary" @click="handleDismiss">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Offline Banner -->
    <Transition name="slide-down">
      <div v-if="isOffline" class="offline-banner" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { usePWA, useNetworkStatus } from '@/composables/usePWA';

const {
  needRefresh,
  updateServiceWorker,
  messages
} = usePWA();

const { isOffline } = useNetworkStatus();

const showUpdateToast = ref(false);
const title = ref('Atualização disponível');
const message = ref('Uma nova versão está pronta para ser instalada.');
const action = ref<{ text: string; handler: () => void } | null>(null);
const dismissible = ref(true);

const handleAction = () => {
  if (action.value) {
    action.value.handler();
  }
  showUpdateToast.value = false;
};

const handleDismiss = () => {
  showUpdateToast.value = false;
};

watch(needRefresh, (newVal) => {
  if (newVal) {
    title.value = 'Nova versão disponível!';
    message.value = 'Clique em atualizar para obter a última versão.';
    action.value = {
      text: 'Atualizar',
      handler: () => updateServiceWorker()
    };
    dismissible.value = true;
    showUpdateToast.value = true;

    // Auto-dismiss after 30 seconds if not dismissed
    setTimeout(() => {
      showUpdateToast.value = false;
    }, 30000);
  }
});

watch(messages, (newMessages) => {
  if (newMessages.length > 0) {
    const msg = newMessages[0];
    title.value = msg.message;
    if (msg.action) {
      action.value = msg.action;
    }
    showUpdateToast.value = true;
  }
}, { deep: true });

onMounted(() => {
  // Hide toast if already refreshed
  if (!needRefresh.value) {
    showUpdateToast.value = false;
  }
});
</script>

<style scoped>
.pwa-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #1f2937;
  color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  max-width: calc(100vw - 40px);
}

.toast-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.toast-icon svg {
  width: 20px;
  height: 20px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.toast-message {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-actions {
  display: flex;
  gap: 8px;
}

.toast-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.toast-btn.primary {
  background: #3b82f6;
  color: white;
}

.toast-btn.primary:hover {
  background: #2563eb;
}

.toast-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 6px;
}

.toast-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toast-btn.secondary svg {
  width: 16px;
  height: 16px;
}

/* Offline Banner */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: #dc2626;
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
}

.offline-banner svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(100px);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
