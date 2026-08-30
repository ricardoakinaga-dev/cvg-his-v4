<template>
  <main class="setup-page" :aria-busy="pageState === 'checking' || submitting">
    <section class="setup-shell" aria-labelledby="setup-title">
      <aside class="setup-context" aria-label="Sobre a configuração inicial">
        <span class="setup-context__brand">CVG HIS</span>
        <h2>Um início seguro para a operação da clínica.</h2>
        <p>
          Este assistente cria a primeira clínica e o administrador principal uma única vez. Nenhuma
          credencial de instalação fica salva no navegador.
        </p>
        <ul>
          <li>Provisionamento único e auditável</li>
          <li>Sessão iniciada somente pelo fluxo de login</li>
          <li>Dados protegidos desde o primeiro acesso</li>
        </ul>
      </aside>

      <DsCard tag="div" class="setup-card">
        <header class="setup-card__header">
          <span class="setup-card__eyebrow">Primeiro acesso</span>
          <h1 id="setup-title" ref="titleElement" class="setup-card__title" tabindex="-1">
            Configuração inicial
          </h1>
          <p class="setup-card__subtitle">
            Cadastre a organização e a conta que administrará esta instalação.
          </p>
        </header>

        <div v-if="pageState === 'checking'" class="setup-state" role="status" aria-live="polite">
          <span class="setup-state__spinner" aria-hidden="true" />
          <strong>Verificando a instalação...</strong>
          <span>Aguarde enquanto consultamos o estado seguro do serviço.</span>
        </div>

        <div v-else-if="pageState === 'status-error'" class="setup-state">
          <DsAlert variant="danger" title="Verificação indisponível">
            Não foi possível verificar o estado da instalação. Nenhuma alteração foi feita.
          </DsAlert>
          <DsButton
            data-action="retry-status"
            variant="secondary"
            full-width
            :loading="checkingStatus"
            @click="loadSetupState"
          >
            Tentar novamente
          </DsButton>
        </div>

        <div v-else-if="pageState === 'unavailable'" class="setup-state">
          <DsAlert variant="warning" title="Configuração indisponível">
            A instalação ainda precisa ser configurada, mas o provisionamento está indisponível.
            Solicite ao operador que valide o banco de dados e o token de instalação da API.
          </DsAlert>
          <DsButton
            data-action="retry-status"
            variant="secondary"
            full-width
            :loading="checkingStatus"
            @click="loadSetupState"
          >
            Verificar novamente
          </DsButton>
        </div>

        <div
          v-else-if="pageState === 'already-complete'"
          class="setup-state"
          role="status"
          aria-live="polite"
        >
          <DsAlert variant="info" title="Instalação pronta">
            Esta instalação já foi configurada. Entre com uma conta cadastrada.
          </DsAlert>
          <RouterLink class="setup-link" to="/login">Ir para o login</RouterLink>
        </div>

        <div
          v-else-if="pageState === 'completed'"
          class="setup-state"
          role="status"
          aria-live="polite"
        >
          <div class="setup-success__icon" aria-hidden="true">✓</div>
          <strong>Configuração concluída</strong>
          <p>A conta principal foi criada. Faça login para iniciar sua sessão com segurança.</p>
          <RouterLink class="setup-link setup-link--primary" to="/login">
            Continuar para o login
          </RouterLink>
        </div>

        <form
          v-else
          class="setup-form"
          aria-labelledby="setup-title"
          novalidate
          @submit.prevent="handleSetup"
        >
          <DsInput
            id="setup-token"
            v-model="form.setupToken"
            class="setup-form__full"
            type="password"
            label="Token de instalação"
            :hint="setupTokenHint"
            :error="fieldErrors.setupToken"
            :disabled="submitting"
            required
            autocomplete="off"
          />
          <DsInput
            id="setup-clinic"
            v-model="form.clinicName"
            class="setup-form__full"
            type="text"
            label="Nome da clínica"
            placeholder="Clínica Veterinária Central"
            :error="fieldErrors.clinicName"
            :disabled="submitting"
            :maxlength="255"
            required
            autocomplete="organization"
          />
          <DsInput
            id="setup-username"
            v-model="form.adminUsername"
            type="text"
            label="Usuário do administrador"
            placeholder="admin"
            :error="fieldErrors.adminUsername"
            :disabled="submitting"
            :maxlength="128"
            required
            autocomplete="username"
          />
          <DsInput
            id="setup-fullname"
            v-model="form.adminFullName"
            type="text"
            label="Nome completo"
            placeholder="Maria Silva"
            :error="fieldErrors.adminFullName"
            :disabled="submitting"
            :maxlength="255"
            autocomplete="name"
          />
          <DsInput
            id="setup-email"
            v-model="form.adminEmail"
            class="setup-form__full"
            type="email"
            label="E-mail"
            placeholder="admin@clinica.com.br"
            :error="fieldErrors.adminEmail"
            :disabled="submitting"
            :maxlength="320"
            required
            autocomplete="email"
          />
          <DsInput
            id="setup-password"
            v-model="form.adminPassword"
            type="password"
            label="Senha"
            :hint="passwordHint"
            :error="fieldErrors.adminPassword"
            :disabled="submitting"
            :maxlength="MAX_PASSWORD_LENGTH"
            required
            autocomplete="new-password"
          />
          <DsInput
            id="setup-password-confirm"
            v-model="form.adminPasswordConfirm"
            type="password"
            label="Confirme a senha"
            :error="fieldErrors.adminPasswordConfirm"
            :disabled="submitting"
            :maxlength="MAX_PASSWORD_LENGTH"
            required
            autocomplete="new-password"
          />

          <DsAlert v-if="formError" class="setup-form__full" variant="danger">
            {{ formError }}
          </DsAlert>

          <DsButton
            class="setup-form__full"
            type="submit"
            variant="primary"
            size="lg"
            full-width
            :loading="submitting"
          >
            {{ submitting ? 'Configurando...' : 'Concluir instalação' }}
          </DsButton>
        </form>
      </DsCard>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  completeInitialSetup,
  fetchSetupState,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_SETUP_TOKEN_LENGTH
} from '@/services/setup';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

type PageState =
  | 'checking'
  | 'ready'
  | 'status-error'
  | 'unavailable'
  | 'already-complete'
  | 'completed';

const form = reactive({
  setupToken: '',
  clinicName: '',
  adminUsername: '',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: ''
});
type FormField = keyof typeof form;
type FieldErrors = Partial<Record<FormField, string>>;

const pageState = ref<PageState>('checking');
const checkingStatus = ref(true);
const submitting = ref(false);
const formError = ref('');
const fieldErrors = ref<FieldErrors>({});
const titleElement = ref<HTMLElement | null>(null);

const passwordHint = computed(
  () =>
    `Use de ${MIN_PASSWORD_LENGTH} a ${MAX_PASSWORD_LENGTH} caracteres e combine ao menos três entre minúsculas, maiúsculas, números e símbolos.`
);
const setupTokenHint = `Fornecido pelo operador; use ao menos ${MIN_SETUP_TOKEN_LENGTH} caracteres.`;

const fieldIdSuffix: Readonly<Record<FormField, string>> = {
  setupToken: 'token',
  clinicName: 'clinic',
  adminUsername: 'username',
  adminFullName: 'fullname',
  adminEmail: 'email',
  adminPassword: 'password',
  adminPasswordConfirm: 'password-confirm'
};

async function focusElement(id: string): Promise<void> {
  await nextTick();
  document.getElementById(id)?.focus();
}

async function loadSetupState(): Promise<void> {
  checkingStatus.value = true;
  pageState.value = 'checking';

  try {
    const state = await fetchSetupState();
    pageState.value = !state.setupRequired
      ? 'already-complete'
      : state.setupAvailable
        ? 'ready'
        : 'unavailable';
  } catch {
    pageState.value = 'status-error';
  } finally {
    checkingStatus.value = false;
  }
}

function countPasswordClasses(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) => pattern.test(password))
    .length;
}

function validateForm(): FieldErrors {
  const errors: FieldErrors = {};
  const clinicName = form.clinicName.trim();
  const username = form.adminUsername.trim();
  const fullName = form.adminFullName.trim();
  const email = form.adminEmail.trim();

  if (form.setupToken.length < MIN_SETUP_TOKEN_LENGTH) {
    errors.setupToken = `O token deve ter ao menos ${MIN_SETUP_TOKEN_LENGTH} caracteres.`;
  }
  if (!clinicName) errors.clinicName = 'Informe o nome da clínica.';
  if (!/^[a-zA-Z0-9._-]{3,128}$/.test(username)) {
    errors.adminUsername =
      'Use de 3 a 128 caracteres entre letras, números, ponto, hífen ou sublinhado.';
  }
  if (fullName.length > 255) errors.adminFullName = 'Use no máximo 255 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    errors.adminEmail = 'Informe um e-mail válido.';
  }
  if (
    form.adminPassword.length < MIN_PASSWORD_LENGTH ||
    form.adminPassword.length > MAX_PASSWORD_LENGTH ||
    countPasswordClasses(form.adminPassword) < 3
  ) {
    errors.adminPassword = passwordHint.value;
  }
  if (form.adminPassword !== form.adminPasswordConfirm) {
    errors.adminPasswordConfirm = 'As senhas não conferem.';
  } else if (!form.adminPasswordConfirm) {
    errors.adminPasswordConfirm = 'Confirme a senha.';
  }

  return errors;
}

async function handleSetup(): Promise<void> {
  formError.value = '';
  fieldErrors.value = validateForm();
  const firstInvalidField = Object.keys(fieldErrors.value)[0] as FormField | undefined;

  if (firstInvalidField) {
    formError.value = 'Revise os campos indicados antes de continuar.';
    await focusElement(`setup-${fieldIdSuffix[firstInvalidField]}`);
    return;
  }

  submitting.value = true;

  try {
    const result = await completeInitialSetup(
      {
        clinicName: form.clinicName.trim(),
        adminUsername: form.adminUsername.trim(),
        adminFullName: form.adminFullName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword
      },
      form.setupToken
    );

    if (!result.setupCompleted) {
      throw new Error('Setup completion was not confirmed.');
    }

    form.setupToken = '';
    form.adminPassword = '';
    form.adminPasswordConfirm = '';
    pageState.value = 'completed';
    await nextTick();
    titleElement.value?.focus();
  } catch {
    formError.value =
      'Não foi possível concluir a instalação. Verifique os dados e tente novamente.';
  } finally {
    form.setupToken = '';
    form.adminPassword = '';
    form.adminPasswordConfirm = '';
    submitting.value = false;
  }
}

onMounted(loadSetupState);
</script>

<style scoped>
.setup-page {
  min-height: 100dvh;
  padding: clamp(16px, 4vw, 48px);
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.12), transparent 32%),
    radial-gradient(circle at 90% 90%, rgba(13, 148, 136, 0.12), transparent 30%),
    var(--color-bg-subtle, #f8fafc);
}

.setup-shell {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: minmax(260px, 0.76fr) minmax(0, 1.24fr);
  overflow: hidden;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 28px;
  background: var(--color-surface, #fff);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.13);
}

.setup-context {
  padding: clamp(28px, 5vw, 56px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  color: #f8fafc;
  background: linear-gradient(145deg, #0f2854, #174781 60%, #0f766e);
}

.setup-context__brand,
.setup-card__eyebrow {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.setup-context h2,
.setup-context p,
.setup-context ul {
  margin: 0;
}

.setup-context h2 {
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  line-height: 1.08;
}

.setup-context p,
.setup-context li {
  color: #f8fafc;
  line-height: 1.6;
}

.setup-context ul {
  padding-left: 20px;
  display: grid;
  gap: 10px;
}

.setup-card {
  padding: clamp(28px, 5vw, 52px);
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.setup-card__header {
  display: grid;
  gap: 8px;
  margin-bottom: 28px;
}

.setup-card__eyebrow {
  color: var(--color-primary-700, #1d4ed8);
}

.setup-card__title {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  color: var(--color-text, #0f172a);
}

.setup-card__title:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.4);
  outline-offset: 5px;
}

.setup-card__subtitle {
  margin: 0;
  line-height: 1.55;
  color: var(--color-text-muted, #64748b);
}

.setup-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 18px;
  color: var(--color-text, #0f172a);
}

.setup-state > strong,
.setup-state > span,
.setup-state > p {
  text-align: center;
}

.setup-state > p {
  margin: 0;
  line-height: 1.55;
  color: var(--color-text-muted, #64748b);
}

.setup-state__spinner {
  width: 36px;
  height: 36px;
  align-self: center;
  border: 3px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  animation: setup-spin 0.8s linear infinite;
}

.setup-success__icon {
  width: 52px;
  height: 52px;
  align-self: center;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
  font-size: 1.6rem;
  font-weight: 800;
}

.setup-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.setup-form__full {
  grid-column: 1 / -1;
}

.setup-link {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--color-primary-700, #1d4ed8);
  font-weight: 700;
}

.setup-link--primary {
  color: #fff;
  background: var(--color-primary-600, #2563eb);
  text-decoration: none;
}

@keyframes setup-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .setup-state__spinner {
    animation-duration: 1.8s;
  }
}

@media (max-width: 820px) {
  .setup-page {
    padding: 0;
    place-items: stretch;
  }

  .setup-shell {
    min-height: 100dvh;
    grid-template-columns: 1fr;
    border: 0;
    border-radius: 0;
  }

  .setup-context {
    padding: 28px 22px;
  }

  .setup-context h2 {
    font-size: 1.55rem;
  }

  .setup-context ul {
    display: none;
  }

  .setup-card {
    padding: 30px 22px 44px;
  }
}

@media (max-width: 560px) {
  .setup-form {
    grid-template-columns: 1fr;
  }

  .setup-form__full {
    grid-column: auto;
  }
}
</style>
