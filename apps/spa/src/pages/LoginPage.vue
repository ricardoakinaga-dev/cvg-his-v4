<template>
  <main class="login-page" :class="{ 'login-page--dark': themeStore.theme === 'dark' }">
    <header class="login-header">
      <div class="hospital-brand">
        <span class="hospital-brand__logo">
          <img src="/art/hospital-guarapiranga-logo.jpeg" alt="Centro Veterinário Guarapiranga" width="300" height="500" />
        </span>
        <span class="hospital-brand__name" aria-hidden="true">Centro Veterinário<strong>Guarapiranga</strong></span>
      </div>
      <div class="login-controls" aria-label="Preferências de exibição">
        <button v-if="shouldRenderVideo" type="button" class="login-control"
          :aria-label="playbackActive ? 'Pausar animação' : 'Reproduzir animação'" @click="togglePlayback">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path v-if="playbackActive" d="M8 5v14M16 5v14" />
            <path v-else d="m8 5 11 7-11 7V5Z" />
          </svg>
        </button>
        <button type="button" class="login-control"
          :aria-label="themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          @click="themeStore.toggle()">
          <DsIcon :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" size="md" />
        </button>
      </div>
    </header>

    <div class="login-composition">
      <section class="login-stage" aria-label="Logo tridimensional do hospital">
        <div class="login-stage__halo" aria-hidden="true" />
        <button type="button" class="login-stage__interaction"
          aria-label="Animar logo 3D do hospital" title="Mova o cursor ou toque para interagir"
          :disabled="!shouldRenderVideo || !playbackActive"
          @pointermove="tiltLogo" @pointerleave="resetLogoTilt" @blur="resetLogoTilt" @click="animateLogo">
          <span class="login-stage__media" aria-hidden="true" data-visual-asset="hospital-logo">
            <span ref="logoDepthRef" class="login-stage__depth" :style="{ transform: logoTransform }">
              <img class="login-stage__poster" :src="'/art/hospital-logo-poster.webp'" alt="" width="720" height="720" decoding="async" fetchpriority="low" />
              <video v-if="shouldRenderVideo" ref="videoRef" class="login-stage__video"
                :src="'/art/hospital-logo-loop.mp4'" :poster="'/art/hospital-logo-poster.webp'"
                autoplay muted loop playsinline preload="metadata" tabindex="-1"
                @play="playbackActive = true" @pause="stopLogoMotion" @error="handleVideoError" />
            </span>
          </span>
        </button>
        <p class="login-stage__caption">O cuidado nos move<span>.</span></p>
      </section>

      <DsCard tag="div" class="login-card">
        <div class="login-card__header">
          <span class="login-card__eyebrow">CVG PULSE</span>
          <h1 class="login-card__title">Boas-vindas.</h1>
          <p class="login-card__subtitle">Acesse sua conta.</p>
        </div>
        <form class="login-form" aria-label="Acesso ao CVG Pulse" @submit.prevent="handleLogin">
          <DsInput id="email" v-model="email" type="text" label="Usuário" placeholder="Seu usuário"
            required autocomplete="username" />
          <DsInput id="account" v-model="accountId" type="text" label="Conta" placeholder="Código da clínica"
            autocomplete="off" />
          <DsInput id="password" v-model="password" type="password" label="Senha" placeholder="••••••••"
            required autocomplete="current-password" />
          <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
          <DsButton type="submit" variant="primary" size="lg" full-width :loading="loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
            <span v-if="!loading" class="login-submit-arrow" aria-hidden="true">↗</span>
          </DsButton>
        </form>
        <div class="login-card__footer"><DsIcon name="lock" size="sm" aria-hidden="true" />Acesso ao hospital</div>
      </DsCard>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { apiRequest } from '@/services/api';
import type { BrowserAuthSessionResponse, LoginMfaRequiredResponse } from '@cvg-his-v2/shared-contracts';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();
const videoRef = ref<HTMLVideoElement | null>(null);
const logoDepthRef = ref<HTMLElement | null>(null);
const logoTransform = ref('rotateX(0deg) rotateY(0deg)');
let logoAnimation: Animation | undefined;
function resetLogoTilt() {
  logoTransform.value = 'rotateX(0deg) rotateY(0deg)';
}
function tiltLogo(event: PointerEvent) {
  if (prefersReducedMotion.value || !playbackActive.value || event.pointerType !== 'mouse') return;
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2));
  const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2));
  logoTransform.value = `rotateX(${-y * 7}deg) rotateY(${x * 10}deg)`;
}
function animateLogo() {
  if (prefersReducedMotion.value || !playbackActive.value) return;
  logoAnimation?.cancel();
  logoAnimation = logoDepthRef.value?.animate([
    { transform: logoTransform.value },
    { transform: 'rotateX(-8deg) rotateY(18deg) scale(1.035)', offset: .3 },
    { transform: 'rotateX(4deg) rotateY(-10deg) scale(1.01)', offset: .65 },
    { transform: logoTransform.value }
  ], { duration: 1000, easing: 'cubic-bezier(.22,.61,.36,1)' });
}
function stopLogoMotion() {
  playbackActive.value = false;
  logoAnimation?.cancel();
  resetLogoTilt();
}
function handleVideoError() {
  videoLoadFailed.value = true;
  stopLogoMotion();
}
const motionQuery = typeof window !== 'undefined'
  ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
const prefersReducedMotion = ref(motionQuery?.matches ?? false);
const playbackActive = ref(false);
const videoLoadFailed = ref(false);
type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};
function getNetworkInformation(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}
function isNetworkConstrained() {
  const connection = getNetworkInformation();
  return connection?.saveData === true || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
}
const networkConstrained = ref(isNetworkConstrained());
const shouldRenderVideo = computed(() => !prefersReducedMotion.value && !videoLoadFailed.value && !networkConstrained.value);
function syncMotionPreference(event: MediaQueryListEvent) {
  prefersReducedMotion.value = event.matches;
  if (event.matches) { videoRef.value?.pause(); stopLogoMotion(); }
}
function syncNetworkPreference() {
  networkConstrained.value = isNetworkConstrained();
  if (networkConstrained.value) { videoRef.value?.pause(); stopLogoMotion(); }
}
async function togglePlayback() {
  const video = videoRef.value;
  if (!video) return;
  if (video.paused) {
    try { await video.play(); } catch { playbackActive.value = false; }
  } else video.pause();
}
onMounted(() => {
  motionQuery?.addEventListener('change', syncMotionPreference);
  getNetworkInformation()?.addEventListener?.('change', syncNetworkPreference);
});
onBeforeUnmount(() => {
  motionQuery?.removeEventListener('change', syncMotionPreference);
  getNetworkInformation()?.removeEventListener?.('change', syncNetworkPreference);
  logoAnimation?.cancel();
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const accountId = ref(import.meta.env.VITE_ACCOUNT_ID?.trim() ?? '');
const error = ref('');
const loading = ref(false);
const nextPath = computed(() => (typeof route.query.next === 'string' ? route.query.next : '/'));

type LoginErrorShape = {
  message?: unknown;
  status?: unknown;
  body?: unknown;
};

function getLoginErrorMessage(error: unknown): string {
  const candidate = error && typeof error === 'object' ? error as LoginErrorShape : {};
  const body = candidate.body && typeof candidate.body === 'object'
    ? candidate.body as { code?: unknown; message?: unknown }
    : {};
  const status = typeof candidate.status === 'number' ? candidate.status : null;
  const code = typeof body.code === 'string' ? body.code : '';
  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : typeof candidate.message === 'string' ? candidate.message.trim() : '';
  const normalizedMessage = message.toLowerCase();

  if (
    status === 429 ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    normalizedMessage.includes('too many requests')
  ) {
    return 'Muitas tentativas de acesso. Aguarde um instante e tente novamente.';
  }

  if (code === 'AUTHENTICATION_ERROR' || normalizedMessage === 'invalid username or password') {
    return 'Confira usuário, senha e conta da clínica e tente novamente.';
  }

  if (normalizedMessage === 'failed to fetch' || normalizedMessage === 'network error') {
    return 'Não foi possível conectar ao serviço de acesso. Verifique a conexão e tente novamente.';
  }

  return message || 'Falha ao fazer login';
}

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

    // Keep the in-memory access token alive while routing. A full reload starts
    // the cookie refresh flow again and can race the refresh-token rotation
    // when the caller navigates immediately after login.
    await router.replace(nextPath.value);
  } catch (err: unknown) {
    error.value = getLoginErrorMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  --login-ink: #182e38;
  --login-muted: #536b75;
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  padding: clamp(20px, 3.6vw, 56px) clamp(20px, 6vw, 96px);
  overflow: clip;
  background: #071820;
  color: #edf8f7;
}
.login-page::before {
  position: absolute;
  z-index: -2;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, rgba(6, 23, 31, .22), rgba(6, 23, 31, .68)),
    url('/art/cvg-care-material.webp') center / cover;
  opacity: .75;
  pointer-events: none;
}
.login-page::after {
  content: '';
  position: absolute;
  z-index: -1;
  width: 65vw;
  height: 65vw;
  left: -12vw;
  top: -12vw;
  background: radial-gradient(ellipse, rgba(43, 144, 151, .18), transparent 65%);
  pointer-events: none;
}
.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: min(1240px, 100%);
  margin: 0 auto;
}
.hospital-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
.hospital-brand__logo {
  position: relative;
  display: block;
  width: 76px;
  height: 76px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 5px rgba(255,255,255,.04), 0 8px 28px rgba(0,0,0,.15);
}
.hospital-brand__logo img {
  position: absolute;
  width: 100%;
  height: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -54%);
}
.hospital-brand__name { color: #a3bcc1; font-size: 12px; line-height: 1.65; }
.hospital-brand__name strong { display: block; color: #f1f8f8; font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
.login-controls { display: flex; align-items: center; gap: 8px; }
.login-control {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(181,218,223,.25);
  border-radius: 50%;
  background: rgba(14,38,47,.5);
  color: #c2e8e7;
  transition: background-color 160ms ease, border-color 160ms ease;
}
.login-control:hover { background: #1a444e; border-color: #7dd5d5; }
.login-control:focus-visible { outline: 3px solid #7dd5d5; outline-offset: 3px; }
.login-composition {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(340px, 420px);
  align-items: center;
  gap: clamp(32px, 5vw, 80px);
  width: min(1240px, 100%);
  min-height: calc(100dvh - 180px);
  margin: 0 auto;
  padding: 28px 0;
}
.login-stage { position: relative; min-width: 0; height: min(590px, 66vh); }
.login-stage__halo {
  position: absolute;
  inset: 12% 7%;
  border: 1px solid rgba(103,202,209,.2);
  border-radius: 50%;
  transform: rotate(-22deg) scaleY(.78);
  box-shadow: 0 0 100px rgba(37,159,169,.07), inset 0 0 90px rgba(37,159,169,.07);
}
.login-stage__interaction {
  position: absolute;
  inset: 0 0 38px;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 28px;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.login-stage__interaction:disabled { cursor: default; }
.login-stage__interaction:focus-visible { outline: 2px solid #7dd5d5; outline-offset: 4px; }
.login-stage__depth {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 180ms ease-out;
}
.login-stage__media {
  position: absolute;
  width: min(670px, 118%);
  aspect-ratio: 1;
  left: 50%;
  top: 50%;
  pointer-events: none;
  perspective: 1000px;
  transform: translate(-50%, -50%);
  mask-image: radial-gradient(ellipse at center, #000 37%, rgba(0,0,0,.95) 52%, transparent 71%);
}
.login-stage__poster, .login-stage__video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.login-stage__caption { position: absolute; left: 0; bottom: 0; width: 100%; text-align: center; color: #dceeee; font-size: clamp(22px, 2.8vw, 38px); font-weight: 400; letter-spacing: -.04em; }
.login-stage__caption span { color: #70d5cd; }
.login-card {
  position: relative;
  width: 100%;
  color: var(--login-ink);
  background: rgba(255,253,248,.98);
  border: 1px solid rgba(255,255,255,.7);
  border-radius: 24px;
  box-shadow: 0 32px 90px rgba(0,0,0,.28), 0 0 0 8px rgba(163,218,218,.04);
}
.login-card::before { content: ''; position: absolute; top: 0; left: 32px; right: 32px; height: 1px; background: linear-gradient(90deg, transparent, #8ac4c7, transparent); }
:deep(.login-card .ds-card__body) { padding: clamp(28px, 3vw, 40px); }
.login-card__header { margin-bottom: 26px; }
.login-card__eyebrow { color: #32636c; font-size: 10px; font-weight: 750; letter-spacing: .22em; }
.login-card__title { margin: 15px 0 8px; font-family: var(--font-family-sans); font-size: 34px; font-weight: 500; letter-spacing: -.045em; line-height: 1.15; color: var(--login-ink); }
.login-card__subtitle { color: var(--login-muted); font-size: 14px; }
.login-form { display: flex; flex-direction: column; gap: 17px; }
.login-submit-arrow { margin-left: 12px; font-size: 20px; font-weight: 400; }
.login-form :deep(.ds-btn--primary) { background-image: linear-gradient(120deg, rgba(255,255,255,.08), transparent 70%); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 8px 18px rgba(3,105,120,.12); }
.login-card__footer { display: flex; justify-content: center; align-items: center; gap: 7px; padding-top: 23px; color: var(--login-muted); font-size: 11px; }
.login-page--dark { --login-ink: #e9f5f4; --login-muted: #a0b9bc; }
.login-page--dark .login-card { background: rgba(15,37,48,.97); border-color: #31515c; box-shadow: 0 32px 90px rgba(0,0,0,.32), 0 0 0 8px rgba(163,218,218,.025); }
.login-page--dark .login-card__eyebrow { color: #8bd8d7; }
@media (max-width: 860px) {
  .login-page { padding: 24px; }
  .login-composition { grid-template-columns: minmax(0, 1fr); width: min(460px, 100%); gap: 24px; min-height: auto; padding: 18px 0 8px; }
  .login-stage { height: 200px; }
  .login-stage__media { width: 280px; top: 50%; }
  .login-stage__halo { inset: 4% 20% 16%; }
  .login-stage__caption { font-size: 20px; }
  .hospital-brand__logo { width: 60px; height: 60px; }
  .hospital-brand__name strong { font-size: 15px; }
}
@media (max-width: 480px) {
  .login-page { padding: 18px 16px 24px; }
  .hospital-brand { gap: 10px; }
  .hospital-brand__logo { width: 52px; height: 52px; }
  .hospital-brand__name { font-size: 9px; }
  .hospital-brand__name strong { font-size: 12px; }
  .login-controls { gap: 5px; }
  .login-composition { padding-top: 8px; gap: 16px; }
  .login-stage { height: 135px; }
  .login-stage__media { width: 190px; top: 50%; }
  .login-stage__caption { font-size: 17px; }
  .login-card { border-radius: 20px; }
  :deep(.login-card .ds-card__body) { padding: 24px; }
  .login-card__header { margin-bottom: 20px; }
  .login-card__title { font-size: 29px; margin-top: 10px; }
  .login-form { gap: 14px; }
  .login-card__footer { padding-top: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .login-page *, .login-page *::before, .login-page *::after { animation: none !important; transition: none !important; }
}
</style>
