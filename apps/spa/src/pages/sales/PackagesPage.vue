<template>
  <div class="packages-page">
    <AppPageHeader
      title="Pacotes"
      :breadcrumbs="['Início', 'Atendimento', 'Atendimentos', 'Pacotes']"
      subtitle="Atendimento > Atendimentos > Pacotes. Contrato de consumo futuro com cliente, animal, serviços, validade e pagamento."
    >
      <template #actions>
        <DsButton tag="a" to="/quotes" variant="primary">+ Incluir Novo Pacote</DsButton>
        <DsButton tag="a" to="/counter-sales" variant="secondary">Comandas abertas</DsButton>
        <DsButton tag="a" to="/appointments" variant="ghost">Agenda</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="actionMessage" :variant="actionMessage.variant" dismissible @dismiss="actionMessage = null">
      {{ actionMessage.text }}
    </DsAlert>

    <section class="package-kpis">
      <DsStatCard :value="packages.length.toString()" label="pacote(s) mapeado(s)" icon="📦" />
      <DsStatCard :value="availablePackages.length.toString()" label="disponível(is)" icon="✅" />
      <DsStatCard :value="totalSessions.toString()" label="sessões contratadas" icon="🧾" />
      <DsStatCard :value="totalValueFormatted" label="valor em contratos" icon="💰" />
    </section>

    <section class="package-flow-grid" aria-label="Fluxo operacional de pacotes">
      <article v-for="step in packageFlow" :key="step.title" class="package-flow-card">
        <span>{{ step.eyebrow }}</span>
        <strong>{{ step.title }}</strong>
        <p>{{ step.description }}</p>
      </article>
    </section>

    <div class="packages-layout">
      <section class="packages-main">
        <DsCard title="Lista de pacotes">
          <div v-if="loading" class="package-empty">Carregando pacotes...</div>
          <div v-else-if="errorMessage" class="package-empty package-empty--error">
            {{ errorMessage }}
            <DsButton size="sm" variant="secondary" @click="loadPackages">Tentar novamente</DsButton>
          </div>

          <div class="package-toolbar">
            <DsInput
              v-model="filters.search"
              type="search"
              label="Buscar por Cliente ou Animal"
              placeholder="Buscar por Cliente ou Animal"
            />
            <DsInput v-model="filters.status" type="select" label="Status do pacote">
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
              <option value="expired">Expirado</option>
            </DsInput>
            <DsInput v-model="filters.period" type="date" label="Emissão ou validade" />
            <DsButton variant="secondary" @click="loadPackages">Filtrar</DsButton>
          </div>

          <div v-if="filteredPackages.length === 0" class="package-empty">
            Nenhum pacote encontrado para os filtros informados.
          </div>

          <div v-else class="package-card-list">
            <article
              v-for="pkg in filteredPackages"
              :key="pkg.id"
              class="package-card"
              :class="{ 'package-card--selected': pkg.id === selectedPackageId }"
            >
              <div class="package-card__header">
                <div>
                  <span class="package-card__eyebrow">Cliente:</span>
                  <h3>{{ pkg.customer }}</h3>
                  <p><strong>Animal:</strong> {{ pkg.animal }}</p>
                </div>
                <StatusBadge :label="statusLabel(pkg.status)" :variant="statusVariant(pkg.status)" />
              </div>

              <dl class="package-facts">
                <div>
                  <dt>Emissão</dt>
                  <dd>{{ pkg.issueDate }}</dd>
                </div>
                <div>
                  <dt>Validade</dt>
                  <dd>{{ pkg.expirationDate || 'Sem validade global' }}</dd>
                </div>
                <div>
                  <dt>Serviços</dt>
                  <dd>{{ packageAvailableSessions(pkg) }}/{{ packagePurchasedSessions(pkg) }} disponível(is)</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{{ formatCurrency(packageTotal(pkg)) }}</dd>
                </div>
              </dl>

              <details class="package-disclosure">
                <summary>Ver serviços</summary>
                <ul>
                  <li v-for="service in pkg.services" :key="`${pkg.id}-${service.name}-${service.dueDate}`">
                    <strong>{{ service.name }}</strong>
                    <span>
                      {{ service.quantityAvailable }}/{{ service.quantityPurchased }} disponível(is) ·
                      {{ formatCurrency(service.price) }} · Validade: {{ service.dueDate }}
                    </span>
                  </li>
                </ul>
              </details>

              <details class="package-disclosure">
                <summary>Observações</summary>
                <p>{{ pkg.notes }}</p>
              </details>

              <div class="package-actions">
                <DsButton size="sm" tag="a" to="/billing" variant="secondary">Pagar pacote</DsButton>
                <DsButton size="sm" tag="a" :to="packageCounterSalePath(pkg)" variant="secondary">Abrir comanda</DsButton>
                <DsButton size="sm" variant="primary" @click="selectPackage(pkg.id)">Ver detalhes</DsButton>
              </div>
            </article>
          </div>
        </DsCard>
      </section>

      <aside class="packages-side">
        <DsCard title="Editar Pacote">
          <template v-if="selectedPackage">
            <div class="detail-stack">
              <div class="selection-note">Pacote {{ selectedPackage.number }} selecionado</div>

              <dl class="detail-grid">
                <div>
                  <dt>ID</dt>
                  <dd>{{ selectedPackage.number }}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{{ selectedPackage.customer }}</dd>
                </div>
                <div>
                  <dt>Animal</dt>
                  <dd>{{ selectedPackage.animal }}</dd>
                </div>
                <div>
                  <dt>Data de emissão</dt>
                  <dd>{{ selectedPackage.issueDate }}</dd>
                </div>
                <div>
                  <dt>Data de validade</dt>
                  <dd>{{ selectedPackage.expirationDate || '—' }}</dd>
                </div>
                <div>
                  <dt>Status do pacote</dt>
                  <dd>{{ statusLabel(selectedPackage.status) }}</dd>
                </div>
              </dl>

              <section class="detail-section">
                <div class="detail-section__header">
                  <strong>Serviços</strong>
                  <span>{{ selectedPackage.services.length }} item(ns)</span>
                </div>
                <div
                  v-for="(service, index) in selectedPackage.services"
                  :key="service.id"
                  class="service-row"
                >
                  <span>Serviço {{ index + 1 }}</span>
                  <strong>{{ service.name }}</strong>
                  <small>
                    Saldo: {{ service.quantityAvailable }}/{{ service.quantityPurchased }} ·
                    Consumido: {{ service.quantityConsumed }} ·
                    {{ formatCurrency(service.price) }} · Validade: {{ service.dueDate }}
                  </small>
                  <DsButton
                    v-if="canConsumeService(selectedPackage, service)"
                    size="sm"
                    variant="success"
                    :loading="actionLoadingKey === `consume:${service.id}`"
                    @click="consumeService(selectedPackage, service)"
                  >
                    Consumir 1
                  </DsButton>
                </div>
                <DsButton size="sm" variant="secondary">Adicionar outro serviço</DsButton>
              </section>

              <section class="detail-section">
                <div class="detail-section__header">
                  <strong>Observações</strong>
                  <span>{{ selectedPackage.notes.length }}/500 Caracteres</span>
                </div>
                <p class="notes-box">Observações gerais sobre o pacote: {{ selectedPackage.notes }}</p>
              </section>

              <div class="package-actions package-actions--wide">
                <DsButton
                  v-if="canCancelPackage(selectedPackage)"
                  variant="danger"
                  :loading="actionLoadingKey === `cancel:${selectedPackage.id}`"
                  @click="cancelPackage(selectedPackage)"
                >
                  Cancelar pacote
                </DsButton>
                <DsButton tag="a" to="/quotes" variant="secondary">Imprimir</DsButton>
                <DsButton tag="a" :to="packageCounterSalePath(selectedPackage)" variant="secondary">Abrir Comanda</DsButton>
                <DsButton tag="a" to="/billing" variant="primary">Pagar Pacote</DsButton>
                <DsButton
                  v-if="selectedPackage.status === 'draft'"
                  variant="primary"
                  :loading="actionLoadingKey === `activate:${selectedPackage.id}`"
                  @click="activatePackage(selectedPackage)"
                >
                  Ativar pacote
                </DsButton>
                <DsButton
                  v-if="canRenewPackage(selectedPackage)"
                  variant="secondary"
                  :loading="actionLoadingKey === `renew:${selectedPackage.id}`"
                  @click="renewPackage(selectedPackage)"
                >
                  Renovar pacote
                </DsButton>
              </div>
            </div>
          </template>
          <p v-else class="package-empty">Selecione um pacote para ver composição, validade e ações.</p>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="integration-stack">
            <article v-for="item in integrations" :key="item.title" class="integration-card">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
              <DsButton size="sm" tag="a" :to="item.to" variant="secondary">{{ item.action }}</DsButton>
            </article>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  packagesService,
  type CustomerPackageDetail,
  type CustomerPackageStatus
} from '@/services/packages';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

interface PackageService {
  id: string;
  name: string;
  price: number;
  dueDate: string;
  quantityPurchased: number;
  quantityConsumed: number;
  quantityAvailable: number;
}

interface CustomerPackage {
  id: string;
  ownerId: string;
  patientId: string | null;
  number: string;
  customer: string;
  animal: string;
  issueDate: string;
  expirationDate: string;
  status: CustomerPackageStatus;
  notes: string;
  services: PackageService[];
}

const packages = ref<CustomerPackage[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const actionLoadingKey = ref('');
const actionMessage = ref<{ variant: 'success' | 'danger'; text: string } | null>(null);

const filters = ref({
  search: '',
  status: 'all',
  period: ''
});
const selectedPackageId = ref('');

const availablePackages = computed(() => packages.value.filter((pkg) => pkg.status === 'active'));
const totalSessions = computed(() =>
  packages.value.reduce((sum, pkg) => sum + packagePurchasedSessions(pkg), 0)
);
const totalValueFormatted = computed(() =>
  formatCurrency(packages.value.reduce((sum, pkg) => sum + packageTotal(pkg), 0))
);
const filteredPackages = computed(() => {
  const search = normalize(filters.value.search);
  const status = filters.value.status;
  const period = filters.value.period;

  return packages.value.filter((pkg) => {
    const matchesSearch =
      !search || normalize(`${pkg.customer} ${pkg.animal} ${pkg.number}`).includes(search);
    const matchesStatus = status === 'all' || pkg.status === status;
    const matchesPeriod =
      !period || toIsoDate(pkg.issueDate) === period || toIsoDate(pkg.expirationDate) === period;
    return matchesSearch && matchesStatus && matchesPeriod;
  });
});
const selectedPackage = computed(() =>
  packages.value.find((pkg) => pkg.id === selectedPackageId.value) ?? null
);

const packageFlow = [
  {
    eyebrow: 'Cadastro',
    title: 'Cliente e animal',
    description: 'O pacote nasce no cliente, mas preserva o vínculo assistencial com o paciente.'
  },
  {
    eyebrow: 'Composição',
    title: 'Serviços com validade',
    description: 'Cada sessão tem valor unitário e janela própria de consumo.'
  },
  {
    eyebrow: 'Execução',
    title: 'Agenda consome sessões',
    description: 'A agenda materializa a ocorrência temporal do direito contratado.'
  },
  {
    eyebrow: 'Caixa',
    title: 'Financeiro recebe pacote',
    description: 'O pagamento pode ser feito no pacote antes do consumo das sessões.'
  }
];

const integrations = [
  {
    title: 'Agenda consome sessões',
    description: 'Use o pacote como contrato e agende a execução de cada serviço dentro da validade.',
    action: 'Abrir agenda',
    to: '/appointments'
  },
  {
    title: 'Comanda materializa consumo',
    description: 'A comanda registra a execução operacional do serviço consumido pelo pacote.',
    action: 'Abrir comandas',
    to: '/counter-sales'
  },
  {
    title: 'Financeiro recebe pacote',
    description: 'O recebimento do pacote fica desacoplado da execução clínica e segue para faturamento.',
    action: 'Abrir financeiro',
    to: '/billing'
  }
];

onMounted(() => {
  void loadPackages();
});

watch(
  filteredPackages,
  (items) => {
    if (items.length === 0) {
      selectedPackageId.value = '';
      return;
    }
    if (!items.some((pkg) => pkg.id === selectedPackageId.value)) {
      selectedPackageId.value = items[0].id;
    }
  },
  { immediate: true }
);

function selectPackage(packageId: string) {
  selectedPackageId.value = packageId;
}

async function loadPackages() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const details = await packagesService.list();
    packages.value = details.map(toCustomerPackage);
  } catch (error) {
    packages.value = [];
    errorMessage.value =
      error instanceof Error
        ? `Não foi possível carregar os pacotes: ${error.message}`
        : 'Não foi possível carregar os pacotes.';
  } finally {
    loading.value = false;
  }
}

function toCustomerPackage(pkg: CustomerPackageDetail): CustomerPackage {
  return {
    id: pkg.id,
    ownerId: pkg.ownerId,
    patientId: pkg.patientId,
    number: pkg.number,
    customer: `Cliente ${pkg.ownerId}`,
    animal: pkg.patientId ? `Paciente ${pkg.patientId}` : 'Contrato sem animal vinculado',
    issueDate: formatDate(pkg.createdAt),
    expirationDate: pkg.expiresAt ? formatDate(pkg.expiresAt) : '',
    status: pkg.status,
    notes: pkg.notes ?? 'Pacote originado do domínio real de pacotes para consumo futuro.',
    services: pkg.items.map((item) => {
      const balance = pkg.balance.find((balanceItem) => balanceItem.packageItemId === item.id);
      return {
        name: item.nameSnapshot,
        id: item.id,
        price: item.unitPrice * item.quantityPurchased,
        dueDate: item.validUntil ? formatDate(item.validUntil) : 'Sem validade individual',
        quantityPurchased: item.quantityPurchased,
        quantityConsumed: balance?.quantityConsumed ?? item.quantityConsumed,
        quantityAvailable: balance?.quantityAvailable ?? item.quantityPurchased - item.quantityConsumed
      };
    })
  };
}

function packageTotal(pkg: CustomerPackage): number {
  return pkg.services.reduce((sum, service) => sum + service.price, 0);
}

function packagePurchasedSessions(pkg: CustomerPackage): number {
  return pkg.services.reduce((sum, service) => sum + service.quantityPurchased, 0);
}

function packageAvailableSessions(pkg: CustomerPackage): number {
  return pkg.services.reduce((sum, service) => sum + service.quantityAvailable, 0);
}

function packageCounterSalePath(pkg: CustomerPackage): string {
  if (!pkg.ownerId) return '/counter-sales';
  return `/counter-sales?ownerId=${encodeURIComponent(pkg.ownerId)}`;
}

function replacePackage(detail: CustomerPackageDetail) {
  const mapped = toCustomerPackage(detail);
  const existingIndex = packages.value.findIndex((pkg) => pkg.id === mapped.id);
  if (existingIndex >= 0) {
    packages.value = packages.value.map((pkg) => (pkg.id === mapped.id ? mapped : pkg));
  } else {
    packages.value = [mapped, ...packages.value];
  }
  selectedPackageId.value = mapped.id;
}

function canConsumeService(pkg: CustomerPackage, service: PackageService): boolean {
  return pkg.status === 'active' && service.quantityAvailable > 0;
}

function canCancelPackage(pkg: CustomerPackage): boolean {
  return pkg.status !== 'cancelled' && pkg.status !== 'completed';
}

function canRenewPackage(pkg: CustomerPackage): boolean {
  return pkg.status === 'active' || pkg.status === 'expired' || pkg.status === 'completed';
}

async function activatePackage(pkg: CustomerPackage) {
  await runPackageAction(`activate:${pkg.id}`, 'Pacote ativado.', async () => {
    replacePackage(await packagesService.activate(pkg.id));
  });
}

async function cancelPackage(pkg: CustomerPackage) {
  await runPackageAction(`cancel:${pkg.id}`, 'Pacote cancelado.', async () => {
    replacePackage(await packagesService.cancel(pkg.id));
  });
}

async function renewPackage(pkg: CustomerPackage) {
  await runPackageAction(`renew:${pkg.id}`, 'Pacote renovado.', async () => {
    replacePackage(await packagesService.renew(pkg.id, {}));
  });
}

async function consumeService(pkg: CustomerPackage, service: PackageService) {
  await runPackageAction(`consume:${service.id}`, 'Sessão consumida.', async () => {
    replacePackage(await packagesService.consumeItem(service.id, {
      quantity: 1,
      sourceType: 'manual'
    }));
  });
}

async function runPackageAction(key: string, successText: string, action: () => Promise<void>) {
  actionLoadingKey.value = key;
  actionMessage.value = null;
  try {
    await action();
    actionMessage.value = { variant: 'success', text: successText };
  } catch (error) {
    actionMessage.value = {
      variant: 'danger',
      text: error instanceof Error ? error.message : 'Não foi possível atualizar o pacote.'
    };
  } finally {
    actionLoadingKey.value = '';
  }
}

function statusLabel(status: CustomerPackageStatus): string {
  return {
    draft: 'Rascunho',
    active: 'Ativo',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    expired: 'Expirado'
  }[status];
}

function statusVariant(status: CustomerPackageStatus): 'success' | 'info' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'completed') return 'info';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function toIsoDate(value: string): string {
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
</script>

<style scoped>
.packages-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.package-kpis,
.package-flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.package-flow-card,
.package-card,
.integration-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.package-flow-card span,
.package-card__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.package-flow-card p,
.integration-card p,
.package-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.packages-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.55fr);
  gap: 16px;
  align-items: start;
}

.packages-side,
.packages-main,
.detail-stack,
.integration-stack,
.package-card-list {
  display: grid;
  gap: 12px;
}

.package-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(160px, 0.35fr) minmax(160px, 0.35fr) max-content;
  gap: 12px;
  margin-bottom: 14px;
  align-items: end;
}

.package-card--selected {
  border-color: var(--color-primary-300, #93c5fd);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.package-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.package-card__header h3 {
  margin: 2px 0;
}

.package-facts,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.package-facts div,
.detail-grid div {
  padding: 10px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.8);
}

dt {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

dd {
  margin: 2px 0 0;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.package-disclosure {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 10px;
}

.package-disclosure summary {
  cursor: pointer;
  font-weight: 700;
}

.package-disclosure ul {
  display: grid;
  gap: 8px;
  padding-left: 18px;
}

.package-disclosure li {
  color: var(--color-text-secondary, #475569);
}

.package-disclosure li span {
  display: block;
  font-size: 13px;
}

.package-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.package-actions--wide {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 12px;
}

.selection-note,
.package-empty,
.notes-box {
  padding: 12px;
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
}

.selection-note {
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.detail-section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
}

.detail-section__header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-muted, #64748b);
}

.service-row {
  display: grid;
  gap: 3px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.06);
}

.service-row span,
.service-row small {
  color: var(--color-text-muted, #64748b);
}

@media (max-width: 960px) {
  .packages-layout,
  .package-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
