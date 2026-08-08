<template>
  <div class="login-page">
    <DsCard tag="div" class="login-card">
      <div class="login-card__header">
        <span class="login-card__brand">CVG HIS V2</span>
        <h1 class="login-card__title">Entrar</h1>
      </div>
      <form class="login-form" @submit.prevent="handleLogin">
        <DsInput
          id="email"
          v-model="email"
          type="text"
          label="Usuário"
          placeholder="admin"
          required
          autocomplete="username"
        />
        <DsInput
          id="account"
          v-model="accountId"
          type="text"
          label="Conta"
          placeholder="Código da clínica"
          autocomplete="off"
        />
        <DsInput
          id="password"
          v-model="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />
        <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
          {{ error }}
        </DsAlert>
        <DsButton type="submit" variant="primary" size="lg" full-width :loading="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </DsButton>
      </form>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiRequest } from '@/services/api';
import type { BrowserAuthSessionResponse, LoginMfaRequiredResponse } from '@cvg-his-v2/shared-contracts';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const accountId = ref(import.meta.env.VITE_ACCOUNT_ID?.trim() ?? '');
const error = ref('');
const loading = ref(false);
const nextPath = computed(() => (typeof route.query.next === 'string' ? route.query.next : '/'));

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    const response = await apiRequest<BrowserAuthSessionResponse | LoginMfaRequiredResponse>(
      '/auth/login',
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          username: email.value,
          password: password.value,
          ...(accountId.value.trim() ? { accountId: accountId.value.trim() } : {})
        })
      }
    );

    if ('requiresMfa' in response) {
      authStore.setMfaRequired(true);
      authStore.setPendingMfaUserId(response.userId);
      authStore.setPendingMfaChallengeId(response.challengeId ?? null);
      authStore.setMfaSetupRequired(response.enrollmentRequired ?? false);
      router.push({
        path: '/auth/mfa',
        query: nextPath.value && nextPath.value !== '/' ? { next: nextPath.value } : undefined
      });
      return;
    }

    authStore.setTokens(response.accessToken);
    authStore.clearMfaChallenge();

    // Full page reload to ensure auth state is fresh
    window.location.href = window.location.origin + nextPath.value;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao fazer login';
    error.value =
      message === 'Invalid username or password'
        ? 'Usuário ou senha inválidos. No ambiente local, deixe o campo Conta vazio.'
        : message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: var(--color-bg-subtle, #f8fafc);
  padding: clamp(16px, 4vw, 32px);
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 32px 28px;
  border-radius: 20px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: var(--shadow-lg, 0 12px 30px rgba(15, 23, 42, 0.08));
}

.login-card__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.login-card__brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--color-primary-subtle, #eaf3ff);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-card__title {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 1.75rem);
  line-height: 1.1;
  color: var(--color-text, #0f172a);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 960px) {
  .login-page {
    padding: 16px;
  }

  .login-card {
    max-width: none;
    padding: 28px 20px;
  }
}
</style>
