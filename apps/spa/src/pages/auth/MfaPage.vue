<template>
  <div class="mfa-page">
    <section class="mfa-hero">
      <div class="mfa-hero__eyebrow">Camada de segurança</div>
      <h1 class="mfa-hero__title">Confirmação MFA</h1>
      <p class="mfa-hero__subtitle">
        Validação extra para manter o acesso premium seguro, com proteção por contexto e trilha de
        autenticação coerente com a arquitetura do SPA oficial.
      </p>
      <div class="mfa-hero__chips">
        <span class="mfa-chip">🔐 TOTP</span>
        <span class="mfa-chip">🛡️ Zero trust</span>
        <span class="mfa-chip">🏥 Operação segura</span>
      </div>
      <div class="mfa-hero__stack">
        <div class="mfa-hero__stat">
          <strong>Usuário</strong>
          <span>Exibido na sessão pendente</span>
        </div>
        <div class="mfa-hero__stat">
          <strong>Tempo</strong>
          <span>Código de uso único e janela curta</span>
        </div>
        <div class="mfa-hero__stat">
          <strong>Fluxo</strong>
          <span>Redirecionamento automático após validação</span>
        </div>
      </div>
    </section>

    <DsCard tag="div" title="Confirmação MFA" class="mfa-card">
      <p class="mfa-card__subtitle">Informe o código TOTP para concluir a autenticação.</p>

      <DsAlert v-if="!pendingUserId" variant="warning">
        Nenhuma tentativa de MFA ativa foi encontrada. Volte ao login e autentique novamente.
      </DsAlert>

      <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>

      <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
        {{ successMessage }}
      </DsAlert>

      <div v-if="setupData" class="mfa-setup">
        <strong>Ativação do autenticador</strong>
        <code>{{ setupData.secret }}</code>
        <a :href="setupData.provisioningUri">Abrir no autenticador</a>
        <div class="mfa-recovery-codes">
          <code v-for="recoveryCode in setupData.recoveryCodes" :key="recoveryCode">
            {{ recoveryCode }}
          </code>
        </div>
      </div>

      <form class="mfa-form" @submit.prevent="handleSubmit">
        <DsInput
          id="mfa-user"
          v-model="pendingUserIdModel"
          label="Usuário"
          readonly
          :disabled="!pendingUserId"
        />
        <DsInput
          id="mfa-token"
          v-model="token"
          label="Código MFA"
          placeholder="000000"
          :maxlength="6"
          autocomplete="one-time-code"
          required
        />
        <DsButton type="submit" variant="primary" size="lg" full-width :loading="loading">
          {{ loading ? 'Validando...' : 'Confirmar MFA' }}
        </DsButton>
        <DsButton tag="a" href="/login" variant="secondary" size="lg" full-width>
          Voltar ao login
        </DsButton>
      </form>

      <p v-if="nextTarget && nextTarget !== '/'" class="mfa-card__hint">
        Após a validação, você será redirecionado para <code>{{ nextTarget }}</code
        >.
      </p>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiRequest } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { BrowserAuthSessionResponse, MfaSetupResponse } from '@cvg-his-v2/shared-contracts';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = ref('');
const error = ref('');
const successMessage = ref('');
const loading = ref(false);
const pendingUserIdModel = ref('');
const setupData = ref<MfaSetupResponse | null>(null);

const nextTarget = computed(() => (typeof route.query.next === 'string' ? route.query.next : '/'));
const pendingUserId = computed(() => authStore.pendingMfaUserId || pendingUserIdModel.value);

async function handleSubmit() {
  error.value = '';

  if (!pendingUserId.value) {
    error.value = 'Nenhum usuário pendente para MFA.';
    return;
  }

  loading.value = true;
  try {
    const enrollmentRequired = authStore.mfaSetupRequired;
    const response = await apiRequest<BrowserAuthSessionResponse>(
      enrollmentRequired ? '/auth/mfa/enroll/confirm' : '/auth/login/mfa',
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify(
          enrollmentRequired
            ? { token: token.value, challengeId: authStore.pendingMfaChallengeId }
            : {
                userId: pendingUserId.value,
                token: token.value,
                challengeId: authStore.pendingMfaChallengeId
              }
        )
      }
    );

    authStore.setTokens(response.accessToken);
    authStore.clearMfaChallenge();
    successMessage.value = 'MFA validado com sucesso.';

    await router.push(nextTarget.value || '/');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao validar MFA';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  pendingUserIdModel.value = authStore.pendingMfaUserId ?? '';
  if (!pendingUserIdModel.value && route.query.userId && typeof route.query.userId === 'string') {
    pendingUserIdModel.value = route.query.userId;
  }
  if (authStore.mfaSetupRequired && authStore.pendingMfaChallengeId) {
    loading.value = true;
    try {
      setupData.value = await apiRequest<MfaSetupResponse>('/auth/mfa/enroll', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ challengeId: authStore.pendingMfaChallengeId })
      });
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Falha ao iniciar MFA';
    } finally {
      loading.value = false;
    }
  }
});
</script>

<style scoped>
.mfa-page {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  align-items: center;
  gap: 28px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 30%),
    radial-gradient(circle at bottom right, rgba(13, 148, 136, 0.14), transparent 26%),
    var(--color-bg, #f0f4f8);
  padding: 32px;
}

.mfa-hero {
  display: grid;
  gap: 18px;
  max-width: 720px;
  color: var(--color-text, #0f172a);
}

.mfa-hero__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary-600, #2563eb);
}

.mfa-hero__title {
  margin: 0;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 0.98;
}

.mfa-hero__subtitle {
  margin: 0;
  max-width: 56ch;
  font-size: 16px;
  color: var(--color-text-secondary, #475569);
}

.mfa-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mfa-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
}

.mfa-hero__stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.mfa-hero__stat {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(12px);
}

.mfa-hero__stat strong {
  font-size: 14px;
}

.mfa-hero__stat span {
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
}

.mfa-card {
  width: 100%;
  max-width: 480px;
  justify-self: end;
  padding: 40px 34px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.mfa-card__subtitle,
.mfa-card__hint {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
}

.mfa-card__hint {
  margin-top: 20px;
}

.mfa-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mfa-setup {
  display: grid;
  gap: 10px;
  margin: 16px 0;
  padding: 14px 0;
  border-block: 1px solid var(--color-border, #d8dee8);
}

.mfa-setup code {
  overflow-wrap: anywhere;
}

.mfa-recovery-codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

@media (max-width: 960px) {
  .mfa-page {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .mfa-card {
    justify-self: stretch;
  }
}
</style>
