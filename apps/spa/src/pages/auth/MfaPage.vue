<template>
  <div class="mfa-page">
    <DsCard tag="div" title="Confirmação MFA" class="mfa-card">
      <p class="mfa-card__subtitle">
        Informe o código TOTP para concluir a autenticação.
      </p>

      <DsAlert v-if="!pendingUserId" variant="warning">
        Nenhuma tentativa de MFA ativa foi encontrada. Volte ao login e autentique novamente.
      </DsAlert>

      <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>

      <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
        {{ successMessage }}
      </DsAlert>

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
          maxlength="6"
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
        Após a validação, você será redirecionado para <code>{{ nextTarget }}</code>.
      </p>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiRequest } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { AuthSessionResponse } from '@cvg-his-v2/shared-contracts';
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
    const response = await apiRequest<AuthSessionResponse>('/auth/login/mfa', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        userId: pendingUserId.value,
        token: token.value
      })
    });

    authStore.setTokens(response.accessToken, response.refreshToken);
    authStore.clearMfaChallenge();
    successMessage.value = 'MFA validado com sucesso.';

    await router.push(nextTarget.value || '/');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao validar MFA';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  pendingUserIdModel.value = authStore.pendingMfaUserId ?? '';
  if (!pendingUserIdModel.value && route.query.userId && typeof route.query.userId === 'string') {
    pendingUserIdModel.value = route.query.userId;
  }
});
</script>

<style scoped>
.mfa-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-bg, #f0f4f8);
  padding: 24px;
}

.mfa-card {
  width: 100%;
  max-width: 440px;
  padding: 40px 32px;
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
</style>
