<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="login-hero__eyebrow">Frontend oficial · SPA</div>
      <h1 class="login-hero__title">CVG HIS V2</h1>
      <p class="login-hero__subtitle">
        Operação veterinária premium com navegação por domínio, contexto persistente, busca global
        e módulos prontos para escala de longo prazo.
      </p>
      <div class="login-hero__chips">
        <span class="login-chip">⌘K Busca global</span>
        <span class="login-chip">🧭 Menu por domínio</span>
        <span class="login-chip">🔐 MFA obrigatório</span>
        <span class="login-chip">⚡ SPA oficial</span>
      </div>
      <div class="login-hero__stack">
        <div class="login-hero__stat">
          <strong>Shell</strong>
          <span>Contexto, favoritos e recentes</span>
        </div>
        <div class="login-hero__stat">
          <strong>Módulos</strong>
          <span>Operação, clínico, comercial e governança</span>
        </div>
        <div class="login-hero__stat">
          <strong>Execução</strong>
          <span>Base pensada para evolução contínua</span>
        </div>
      </div>
    </section>

    <DsCard tag="div" title="Acesso ao sistema" class="login-card">
      <p class="login-card__subtitle">Entre com suas credenciais para continuar na operação.</p>
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
        <span>·</span>
        <a href="/api/health">Status da API</a>
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
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  align-items: center;
  gap: 28px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 30%),
    radial-gradient(circle at bottom right, rgba(13, 148, 136, 0.14), transparent 26%),
    var(--color-bg, #f0f4f8);
  padding: 32px;
}

.login-hero {
  display: grid;
  gap: 18px;
  max-width: 720px;
  color: var(--color-text, #0f172a);
}

.login-hero__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary-600, #2563eb);
}

.login-hero__title {
  margin: 0;
  font-size: clamp(40px, 6vw, 76px);
  line-height: 0.95;
}

.login-hero__subtitle {
  margin: 0;
  max-width: 56ch;
  font-size: 17px;
  color: var(--color-text-secondary, #475569);
}

.login-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.login-chip {
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

.login-hero__stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.login-hero__stat {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(12px);
}

.login-hero__stat strong {
  font-size: 14px;
}

.login-hero__stat span {
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
}

.login-card {
  width: 100%;
  max-width: 440px;
  justify-self: end;
  padding: 40px 34px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.login-card__subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--color-text-muted, #64748b);
}

.login-card__footer a {
  color: var(--color-text-link, #2563eb);
  text-decoration: none;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .login-card {
    justify-self: stretch;
  }
}
</style>
