<template>
  <div class="login-page">
    <DsCard tag="div" title="CVG HIS V2" class="login-card">
      <p class="login-card__subtitle">Sistema de Gestão Hospitalar Veterinária</p>
      <form class="login-form" @submit.prevent="handleLogin">
        <DsInput
          id="email"
          v-model="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          required
          autocomplete="email"
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
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiRequest } from '@/services/api';
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

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    const response = await apiRequest<{
      accessToken: string;
      refreshToken?: string;
      mfaRequired?: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    authStore.setTokens(response.accessToken, response.refreshToken);

    if (response.mfaRequired) {
      authStore.setMfaRequired(true);
      router.push('/auth/mfa');
      return;
    }

    const next = route.query.next as string;
    router.push(next || '/');
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
