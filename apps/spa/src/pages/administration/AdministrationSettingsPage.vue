<template>
  <div class="administration-settings-page">
    <AppPageHeader
      title="Configurações"
      subtitle="Preferências da plataforma e acesso direto aos controles que sustentam a operação"
      :breadcrumbs="['Console Enterprise', 'Plataforma', 'Configurações']"
    >
      <template #actions>
        <DsBadge variant="info" size="md">Tema {{ themeLabel }}</DsBadge>
        <DsButton variant="primary" icon="sun" @click="toggleTheme">
          Alternar tema
        </DsButton>
      </template>
    </AppPageHeader>

    <section class="settings-hero" aria-labelledby="settings-hero-title">
      <div class="settings-hero__copy">
        <span class="settings-eyebrow">CENTRO DE CONTROLE DA PLATAFORMA</span>
        <h2 id="settings-hero-title">Tudo o que muda o comportamento do ERP, no mesmo lugar.</h2>
        <p>
          Preferências de interface ficam aqui. Regras de negócio, integrações e governança levam
          você às telas responsáveis por cada domínio — com contexto e trilha próprios.
        </p>
      </div>

      <div class="settings-hero__status" aria-label="Resumo da sessão atual">
        <div class="settings-hero__status-mark" aria-hidden="true">
          <DsIcon name="shield" size="md" />
        </div>
        <div>
          <span class="settings-hero__status-label">Sessão atual</span>
          <strong>{{ userLabel }}</strong>
          <span>{{ accountLabel }} · {{ rolesLabel }}</span>
        </div>
      </div>
    </section>

    <section class="settings-overview" aria-label="Estado das preferências">
      <article v-for="card in overviewCards" :key="card.label" class="settings-overview__card">
        <div class="settings-overview__icon" :class="`settings-overview__icon--${card.tone}`">
          <DsIcon :name="card.icon" size="sm" aria-hidden="true" />
        </div>
        <div>
          <span class="settings-overview__label">{{ card.label }}</span>
          <strong class="settings-overview__value">{{ card.value }}</strong>
          <span class="settings-overview__hint">{{ card.hint }}</span>
        </div>
      </article>
    </section>

    <div class="settings-layout">
      <section class="settings-section" aria-labelledby="settings-preferences-title">
        <div class="settings-section__heading">
          <span class="settings-eyebrow">PREFERÊNCIAS LOCAIS</span>
          <h2 id="settings-preferences-title">Ajuste seu espaço de trabalho</h2>
          <p>As escolhas abaixo são aplicadas imediatamente e persistem neste navegador.</p>
        </div>

        <div class="settings-preferences-grid">
          <DsCard title="Aparência" variant="elevated" class="settings-card">
            <div class="settings-control">
              <div>
                <strong>Tema do console</strong>
                <p>Escolha a leitura ideal para a rotina da equipe.</p>
              </div>
              <div class="settings-segmented" role="group" aria-label="Tema do console">
                <DsButton
                  size="sm"
                  :variant="themeStore.theme === 'light' ? 'primary' : 'secondary'"
                  :aria-pressed="themeStore.theme === 'light'"
                  icon="sun"
                  @click="setTheme('light')"
                >
                  Claro
                </DsButton>
                <DsButton
                  size="sm"
                  :variant="themeStore.theme === 'dark' ? 'primary' : 'secondary'"
                  :aria-pressed="themeStore.theme === 'dark'"
                  icon="moon"
                  @click="setTheme('dark')"
                >
                  Escuro
                </DsButton>
              </div>
            </div>
          </DsCard>

          <DsCard title="Navegação" variant="elevated" class="settings-card">
            <div class="settings-control">
              <div>
                <strong>Menu lateral</strong>
                <p>{{ sidebarLabel }} para priorizar conteúdo ou contexto.</p>
              </div>
              <DsButton variant="secondary" icon="collapse" @click="toggleSidebar">
                {{ appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu' }}
              </DsButton>
            </div>
          </DsCard>
        </div>

        <p v-if="preferenceFeedback" class="settings-feedback" role="status" aria-live="polite">
          <DsIcon name="check-circle" size="sm" aria-hidden="true" />
          {{ preferenceFeedback }}
        </p>
      </section>

      <aside class="settings-aside" aria-label="Acesso rápido">
        <DsCard title="Acesso rápido" variant="outlined" class="settings-card settings-card--aside">
          <p class="settings-card__intro">
            Entre direto nas áreas que normalmente acompanham uma mudança de configuração.
          </p>
          <nav class="settings-quick-links" aria-label="Rotinas de governança">
            <RouterLink v-for="item in quickLinks" :key="item.to" :to="item.to" class="settings-quick-link">
              <span class="settings-quick-link__icon">
                <DsIcon :name="item.icon" size="sm" aria-hidden="true" />
              </span>
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
              <DsIcon name="arrow-right" size="sm" aria-hidden="true" />
            </RouterLink>
          </nav>
        </DsCard>
      </aside>
    </div>

    <section class="settings-section settings-section--catalog" aria-labelledby="settings-catalog-title">
      <div class="settings-section__heading">
        <span class="settings-eyebrow">MAPA DE CONFIGURAÇÃO</span>
        <h2 id="settings-catalog-title">Controles por domínio</h2>
        <p>
          Cada atalho abre a superfície operacional responsável pelo dado. Nada é simulado nesta
          visão.
        </p>
      </div>

      <div class="settings-domain-grid">
        <article v-for="domain in domains" :key="domain.title" class="settings-domain-card">
          <div class="settings-domain-card__header">
            <span class="settings-domain-card__icon" :class="`settings-domain-card__icon--${domain.tone}`">
              <DsIcon :name="domain.icon" size="md" aria-hidden="true" />
            </span>
            <div>
              <span class="settings-domain-card__eyebrow">{{ domain.eyebrow }}</span>
              <h3>{{ domain.title }}</h3>
            </div>
          </div>
          <p>{{ domain.description }}</p>
          <nav :aria-label="`Configurações de ${domain.title}`" class="settings-domain-card__links">
            <RouterLink v-for="item in domain.items" :key="item.to" :to="item.to" class="settings-domain-link">
              <span>{{ item.label }}</span>
              <DsIcon name="arrow-right" size="sm" aria-hidden="true" />
            </RouterLink>
          </nav>
        </article>
      </div>
    </section>

    <footer class="settings-footer">
      <DsIcon name="lock" size="sm" aria-hidden="true" />
      <span>Configurações de negócio respeitam as permissões efetivas da conta.</span>
      <RouterLink to="/audit">Ver trilha de auditoria</RouterLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore, type ThemeMode } from '@/stores/theme';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

interface DomainLink {
  label: string;
  to: string;
}

interface DomainConfig {
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  tone: 'teal' | 'violet' | 'amber' | 'blue';
  items: DomainLink[];
}

interface QuickLink {
  label: string;
  description: string;
  to: string;
  icon: string;
}

const appStore = useAppStore();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const preferenceFeedback = ref('');

const themeLabel = computed(() => (themeStore.theme === 'light' ? 'claro' : 'escuro'));
const sidebarLabel = computed(() =>
  appStore.sidebarCollapsed ? 'Menu recolhido' : 'Menu expandido'
);
const userLabel = computed(() => authStore.user.name || authStore.user.email || 'Usuário autenticado');
const accountLabel = computed(() => {
  if (!authStore.user.accountId) return 'Conta atual';
  return `Conta ${authStore.user.accountId.slice(0, 8)}`;
});
const rolesLabel = computed(() => {
  if (authStore.user.roles.length === 0) return 'perfil não informado';
  return authStore.user.roles.slice(0, 2).join(' · ');
});

const overviewCards = computed(() => [
  {
    label: 'Tema ativo',
    value: themeLabel.value,
    hint: 'Preferência salva neste navegador',
    icon: themeStore.theme === 'light' ? 'sun' : 'moon',
    tone: 'teal'
  },
  {
    label: 'Navegação',
    value: appStore.sidebarCollapsed ? 'Compacta' : 'Expandida',
    hint: 'Menu lateral da sessão',
    icon: 'compass',
    tone: 'violet'
  },
  {
    label: 'Permissões',
    value: authStore.user.roles.length ? `${authStore.user.roles.length} perfil(is)` : 'Em avaliação',
    hint: 'Aplicadas pela sessão autenticada',
    icon: 'shield',
    tone: 'amber'
  }
]);

const quickLinks: QuickLink[] = [
  {
    label: 'Governança de acesso',
    description: 'Perfis e permissões efetivas',
    to: '/access-control',
    icon: 'shield'
  },
  {
    label: 'Auditoria',
    description: 'Eventos e conformidade',
    to: '/audit',
    icon: 'receipt'
  },
  {
    label: 'Chaves de API',
    description: 'Credenciais de integração',
    to: '/api-keys',
    icon: 'key'
  }
];

const domains: DomainConfig[] = [
  {
    title: 'Governança e pessoas',
    eyebrow: 'CONTROLE',
    description: 'Identidade, acesso e evidências para operar com segurança.',
    icon: 'users',
    tone: 'teal',
    items: [
      { label: 'Usuários', to: '/users' },
      { label: 'Grupos de acesso', to: '/access-control' },
      { label: 'LGPD', to: '/lgpd' }
    ]
  },
  {
    title: 'Integrações e comunicação',
    eyebrow: 'CONECTIVIDADE',
    description: 'Conecte parceiros, webhooks e canais sem perder rastreabilidade.',
    icon: 'link',
    tone: 'violet',
    items: [
      { label: 'Chaves de API', to: '/api-keys' },
      { label: 'Cliente API', to: '/api-client' },
      { label: 'Webhooks', to: '/webhooks' },
      { label: 'Configurações de SMS', to: '/marketing/sms-settings' }
    ]
  },
  {
    title: 'Fiscal e financeiro',
    eyebrow: 'CONFORMIDADE',
    description: 'Parâmetros fiscais e financeiros que sustentam o fechamento.',
    icon: 'calculator',
    tone: 'amber',
    items: [
      { label: 'Configurações fiscais', to: '/fiscal' },
      { label: 'Formas de pagamento', to: '/payment-methods' },
      { label: 'Regras de split', to: '/finance/split' },
      { label: 'Bancos', to: '/banks' }
    ]
  },
  {
    title: 'Operação e catálogo',
    eyebrow: 'ESTRUTURA',
    description: 'Unidades, estoques e cadastros que dão forma à rotina da clínica.',
    icon: 'building',
    tone: 'blue',
    items: [
      { label: 'Setores da empresa', to: '/company-sectors' },
      { label: 'Estoques', to: '/warehouses' },
      { label: 'Unidades de medida', to: '/measurement-units' }
    ]
  }
];

function setTheme(theme: ThemeMode) {
  themeStore.set(theme);
  preferenceFeedback.value = `Tema ${theme === 'light' ? 'claro' : 'escuro'} aplicado.`;
}

function toggleTheme() {
  setTheme(themeStore.theme === 'light' ? 'dark' : 'light');
}

function toggleSidebar() {
  appStore.toggleSidebar();
  preferenceFeedback.value = `${appStore.sidebarCollapsed ? 'Menu recolhido' : 'Menu expandido'}.`;
}
</script>

<style scoped>
.administration-settings-page {
  --settings-ink: var(--color-text, #112530);
  --settings-muted: var(--color-text-secondary, #3e5c67);
  --settings-border: var(--color-border, #d5e2e6);
  --settings-surface: var(--color-surface, #ffffff);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  padding-bottom: 1.5rem;
}

.settings-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 2rem;
  overflow: hidden;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  color: #f4fbf9;
  background:
    radial-gradient(circle at 86% 8%, rgba(91, 210, 217, 0.28), transparent 34%),
    linear-gradient(126deg, #08232c 0%, #0d3440 56%, #123e4a 100%);
  border: 1px solid rgba(116, 208, 218, 0.24);
  border-radius: var(--radius-2xl, 1.25rem);
  box-shadow: 0 18px 42px rgba(6, 35, 45, 0.18);
}

.settings-hero::after {
  position: absolute;
  right: -5rem;
  bottom: -6rem;
  width: 18rem;
  height: 18rem;
  content: '';
  border: 1px solid rgba(169, 226, 232, 0.18);
  border-radius: 50%;
  box-shadow: 0 0 0 2.5rem rgba(169, 226, 232, 0.04), 0 0 0 5.5rem rgba(169, 226, 232, 0.03);
  pointer-events: none;
}

.settings-hero__copy,
.settings-hero__status {
  position: relative;
  z-index: 1;
}

.settings-hero__copy {
  max-width: 48rem;
}

.settings-eyebrow,
.settings-domain-card__eyebrow {
  display: block;
  color: var(--color-primary-400, #37bdc9);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  line-height: 1.3;
  text-transform: uppercase;
}

.settings-hero .settings-eyebrow {
  color: #a9e2e8;
}

.settings-hero h2,
.settings-section__heading h2 {
  margin: 0;
  color: inherit;
  font-family: var(--font-family-display, Georgia, serif);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  letter-spacing: -0.035em;
  line-height: 1.08;
}

.settings-hero h2 {
  max-width: 35rem;
  margin-top: 0.65rem;
}

.settings-hero p {
  max-width: 43rem;
  margin: 1rem 0 0;
  color: rgba(244, 251, 249, 0.78);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.settings-hero__status {
  align-self: end;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  min-width: 0;
  padding: 1rem;
  background: rgba(4, 22, 30, 0.28);
  border: 1px solid rgba(169, 226, 232, 0.2);
  border-radius: var(--radius-xl, 1rem);
}

.settings-hero__status-mark {
  display: grid;
  flex: 0 0 2.5rem;
  width: 2.5rem;
  height: 2.5rem;
  color: #a9e2e8;
  background: rgba(169, 226, 232, 0.12);
  border-radius: 0.75rem;
  place-items: center;
}

.settings-hero__status > div:last-child {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.settings-hero__status-label {
  color: rgba(244, 251, 249, 0.62);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-hero__status strong {
  overflow: hidden;
  color: #fff;
  font-size: 0.9375rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-hero__status > div:last-child > span:last-child {
  overflow: hidden;
  color: rgba(244, 251, 249, 0.72);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.875rem;
}

.settings-overview__card {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  min-width: 0;
  padding: 1rem;
  background: var(--settings-surface);
  border: 1px solid var(--settings-border);
  border-radius: var(--radius-lg, 0.75rem);
}

.settings-overview__icon,
.settings-domain-card__icon {
  display: grid;
  flex: 0 0 2.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  place-items: center;
}

.settings-overview__icon--teal,
.settings-domain-card__icon--teal {
  color: var(--color-primary-700, #066b80);
  background: var(--color-primary-subtle, #e8f8fa);
}

.settings-overview__icon--violet,
.settings-domain-card__icon--violet {
  color: #6952a3;
  background: #f0ecff;
}

.settings-overview__icon--amber,
.settings-domain-card__icon--amber {
  color: var(--color-warning-700, #805006);
  background: var(--color-warning-50, #fff6e4);
}

.settings-overview__icon--blue,
.settings-domain-card__icon--blue {
  color: var(--color-info-700, #075985);
  background: var(--color-info-50, #eff6ff);
}

.settings-overview__card > div:last-child {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.settings-overview__label,
.settings-overview__hint {
  color: var(--settings-muted);
  font-size: 0.75rem;
}

.settings-overview__value {
  color: var(--settings-ink);
  font-size: 1.2rem;
  line-height: 1.2;
  text-transform: capitalize;
}

.settings-overview__hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
  align-items: start;
  gap: 1.5rem;
}

.settings-section {
  min-width: 0;
}

.settings-section__heading {
  display: grid;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.settings-section__heading h2 {
  color: var(--settings-ink);
  font-size: clamp(1.35rem, 2vw, 1.75rem);
}

.settings-section__heading p {
  max-width: 46rem;
  margin: 0;
  color: var(--settings-muted);
  font-size: 0.875rem;
  line-height: 1.55;
}

.settings-preferences-grid {
  display: grid;
  gap: 0.875rem;
}

.settings-card :deep(.ds-card__body) {
  min-width: 0;
}

.settings-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.settings-control > div:first-child {
  min-width: 0;
}

.settings-control strong {
  display: block;
  color: var(--settings-ink);
  font-size: 0.9375rem;
}

.settings-control p,
.settings-card__intro {
  margin: 0.3rem 0 0;
  color: var(--settings-muted);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.settings-segmented {
  display: flex;
  flex: 0 0 auto;
  gap: 0.375rem;
}

.settings-feedback {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.75rem 0 0;
  color: var(--color-success-700, #0f6958);
  font-size: 0.8125rem;
  font-weight: 700;
}

.settings-card--aside {
  height: 100%;
}

.settings-quick-links,
.settings-domain-card__links {
  display: grid;
  gap: 0.35rem;
  margin-top: 1rem;
}

.settings-quick-link,
.settings-domain-link {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 2.75rem;
  color: var(--settings-ink);
  text-decoration: none;
  border-radius: var(--radius-md, 0.5rem);
  transition: background-color 150ms ease, color 150ms ease;
}

.settings-quick-link {
  gap: 0.65rem;
  padding: 0.4rem 0.5rem;
}

.settings-quick-link > span:nth-child(2) {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 0.12rem;
}

.settings-quick-link strong,
.settings-quick-link small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-quick-link strong {
  font-size: 0.8125rem;
}

.settings-quick-link small {
  color: var(--settings-muted);
  font-size: 0.75rem;
}

.settings-quick-link > .ds-icon,
.settings-domain-link > .ds-icon {
  flex: 0 0 auto;
  color: var(--color-text-muted, #55717a);
}

.settings-quick-link__icon {
  display: grid;
  flex: 0 0 2rem;
  width: 2rem;
  height: 2rem;
  color: var(--color-primary-700, #066b80);
  background: var(--color-primary-subtle, #e8f8fa);
  border-radius: 0.6rem;
  place-items: center;
}

.settings-quick-link:hover,
.settings-domain-link:hover {
  color: var(--color-text-link, #066b80);
  background: var(--color-surface-hover, #f1f8f9);
}

.settings-quick-link:focus-visible,
.settings-domain-link:focus-visible {
  outline: 3px solid var(--color-focus-ring, #075f70);
  outline-offset: 2px;
}

.settings-section--catalog {
  padding-top: 0.5rem;
}

.settings-domain-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem;
}

.settings-domain-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 1.25rem;
  background: var(--settings-surface);
  border: 1px solid var(--settings-border);
  border-radius: var(--radius-xl, 1rem);
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.settings-domain-card__header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.settings-domain-card__header > div:last-child {
  min-width: 0;
}

.settings-domain-card__eyebrow {
  color: var(--settings-muted);
  font-size: 0.625rem;
}

.settings-domain-card h3 {
  margin: 0.2rem 0 0;
  color: var(--settings-ink);
  font-size: 1rem;
  line-height: 1.25;
}

.settings-domain-card > p {
  min-height: 2.7rem;
  margin: 1rem 0 0;
  color: var(--settings-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.settings-domain-card__links {
  margin-top: 1.125rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--settings-border);
}

.settings-domain-link {
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0.4rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.settings-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  color: var(--settings-muted);
  font-size: 0.75rem;
  background: var(--color-bg-subtle, #f5f9fa);
  border: 1px solid var(--settings-border);
  border-radius: var(--radius-lg, 0.75rem);
}

.settings-footer a {
  margin-left: auto;
  color: var(--color-text-link, #066b80);
  font-weight: 800;
  text-decoration: none;
}

.settings-footer a:focus-visible {
  outline: 3px solid var(--color-focus-ring, #075f70);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .settings-hero,
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-hero__status {
    align-self: start;
    max-width: 32rem;
  }
}

@media (max-width: 680px) {
  .administration-settings-page {
    gap: 1.125rem;
  }

  .settings-hero {
    gap: 1.25rem;
    padding: 1.25rem;
  }

  .settings-overview,
  .settings-domain-grid {
    grid-template-columns: 1fr;
  }

  .settings-overview__card {
    padding: 0.875rem;
  }

  .settings-domain-card > p {
    min-height: 0;
  }
}

@media (max-width: 480px) {
  .settings-control {
    align-items: stretch;
    flex-direction: column;
    gap: 0.875rem;
  }

  .settings-segmented {
    width: 100%;
  }

  .settings-segmented :deep(.ds-btn) {
    flex: 1;
  }

  .settings-control :deep(.ds-btn) {
    width: 100%;
  }

  .settings-footer a {
    width: 100%;
    margin-left: 0;
  }
}
</style>
