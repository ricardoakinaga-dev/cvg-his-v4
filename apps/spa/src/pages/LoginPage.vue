<template>
  <div class="login-page">
    <DsCard tag="div" title="CVG HIS V2" class="login-card">
      <p class="login-card__subtitle">Sistema de Gestão Hospitalar Veterinária</p>
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
      <p class="login-card__footer">
        <a href="/api/docs">Documentação da API</a>
      </p>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiRequest } from '@/services/api';
import type { AuthSessionResponse, LoginMfaRequiredResponse } from '@cvg-his-v2/shared-contracts';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const nextPath = computed(() => (typeof route.query.next === 'string' ? route.query.next : '/'));

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    const response = await apiRequest<AuthSessionResponse | LoginMfaRequiredResponse>(
      '/auth/login',
      {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ username: email.value, password: password.value })
      }
    );

    if ('requiresMfa' in response) {
      authStore.setMfaRequired(true);
      authStore.setPendingMfaUserId(response.userId);
      router.push({
        path: '/auth/mfa',
        query: nextPath.value && nextPath.value !== '/' ? { next: nextPath.value } : undefined
      });
      return;
    }

    authStore.setTokens(response.accessToken, response.refreshToken);
    authStore.clearMfaChallenge();

    // Full page reload to ensure auth state is fresh
    window.location.href = window.location.origin + nextPath.value;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao fazer login';
    error.value = message;
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
  min-height: 100vh;
  background: var(--color-bg, #f0f4f8);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 32px;
}

.login-card__subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-card__footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
}

.login-card__footer a {
  color: var(--color-text-link, #2563eb);
  text-decoration: none;
}
</style>
