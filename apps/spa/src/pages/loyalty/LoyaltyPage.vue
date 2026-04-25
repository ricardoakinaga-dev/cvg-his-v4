<template>
  <div class="loyalty-page">
    <AppPageHeader
      title="Resgate de Pontos"
      :breadcrumbs="['Atendimento', 'Fidelidade', 'Resgate de Pontos']"
      subtitle="Histórico de resgates, saldo do cliente e conversão de pontos em produto ou serviço"
    >
      <template #actions>
        <DsButton variant="secondary" @click="resetFilters">Limpar filtros</DsButton>
        <DsButton variant="primary" @click="openCreateDialog">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="loyalty-page__overview">
      <DsCard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span class="metric-card__label">{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.hint }}</p>
      </DsCard>
    </section>

    <DsCard title="Pesquisar resgates" class="panel">
      <div class="filters-grid">
        <DsInput v-model="filters.client" label="Cliente" placeholder="Cliente" />
        <DsInput v-model="filters.date" label="Data" placeholder="Data" />
        <DsButton variant="secondary">Pesquisar</DsButton>
      </div>
    </DsCard>

    <section class="loyalty-page__content">
      <DsCard title="Histórico de resgates" class="panel">
        <div class="table-wrapper">
          <table class="loyalty-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Pontos</th>
                <th>Abrir</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="redemption in filteredRedemptions" :key="redemption.id">
                <td>{{ redemption.id }}</td>
                <td>
                  <strong>{{ redemption.ownerId }}</strong>
                  <div class="muted">Cliente</div>
                </td>
                <td>{{ formatDate(redemption.redeemedAt) }}</td>
                <td>{{ redemption.pointsUsed }}</td>
                <td>
                  <DsButton size="sm" variant="secondary" @click="selectedRedemptionId = redemption.id">
                    Abrir
                  </DsButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="filteredRedemptions.length === 0" class="empty-state">
          Nenhum registro encontrado
        </div>
        <div v-if="isLoading" class="empty-state">Carregando resgates...</div>
        <div v-if="errorMessage" class="empty-state">{{ errorMessage }}</div>
      </DsCard>

      <DsCard title="Composição do resgate" class="panel">
        <div class="selected-card">
          <span class="selected-card__eyebrow">{{ selectedRedemption.ownerId }}</span>
          <strong>{{ selectedRedemption.rewardDescription }}</strong>
          <p>
            Conversão de {{ selectedRedemption.pointsUsed }} pontos em benefício,
            mantendo histórico rastreável por cliente.
          </p>
        </div>
        <div class="reward-grid">
          <article class="reward-card">
            <span>Produto</span>
            <strong>{{ selectedRedemption.productQuantity }}</strong>
            <p>Quantidade de benefício em produto, alinhada ao campo legacy `quantidadeProduto`.</p>
          </article>
          <article class="reward-card">
            <span>Serviço</span>
            <strong>{{ selectedRedemption.serviceQuantity }}</strong>
            <p>Quantidade de benefício em serviço, alinhada ao campo legacy `quantidadeServico`.</p>
          </article>
        </div>
      </DsCard>
    </section>

    <DsCard title="Integrações comerciais" class="panel">
      <div class="integration-grid">
        <article v-for="integration in integrations" :key="integration.title" class="integration-card">
          <span>{{ integration.scope }}</span>
          <strong>{{ integration.title }}</strong>
          <p>{{ integration.description }}</p>
        </article>
      </div>
    </DsCard>

    <DsModal
      :open="isCreateOpen"
      title="Incluir Resgate"
      size="lg"
      :teleport="false"
      @close="closeCreateDialog"
    >
      <form class="redemption-form" @submit.prevent="submitRedemption">
        <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
          {{ formError }}
        </DsAlert>

        <div class="form-grid">
          <DsInput
            id="redemption-owner"
            v-model="form.ownerId"
            label="Cliente"
            placeholder="Cliente"
            :error="formErrors.ownerId"
            required
          />
          <DsInput
            id="redemption-points"
            v-model.number="form.pointsUsed"
            type="number"
            label="Pontos"
            placeholder="0"
            min="1"
            :error="formErrors.pointsUsed"
            required
          />
          <DsInput
            id="redemption-reward"
            v-model="form.rewardDescription"
            class="form-grid__wide"
            label="Benefício"
            placeholder="Produto ou serviço concedido"
            :error="formErrors.rewardDescription"
            required
          />
        </div>

        <div class="legacy-actions">
          <section class="legacy-action">
            <div>
              <strong>Adicionar Produto</strong>
              <span>Quantidade</span>
            </div>
            <DsInput
              id="redemption-product-quantity"
              v-model.number="form.productQuantity"
              type="number"
              label="Quantidade"
              placeholder="0"
              min="0"
            />
            <DsButton type="button" variant="secondary" @click="addProductReward">Adicionar</DsButton>
          </section>

          <section class="legacy-action">
            <div>
              <strong>Adicionar Serviço</strong>
              <span>Quantidade</span>
            </div>
            <DsInput
              id="redemption-service-quantity"
              v-model.number="form.serviceQuantity"
              type="number"
              label="Quantidade"
              placeholder="0"
              min="0"
            />
            <DsButton type="button" variant="secondary" @click="addServiceReward">Adicionar</DsButton>
          </section>
        </div>

        <p v-if="formErrors.rewardQuantity" class="form-error">{{ formErrors.rewardQuantity }}</p>

        <div class="form-actions">
          <DsButton type="button" variant="secondary" :disabled="isSaving" @click="closeCreateDialog">
            Cancelar
          </DsButton>
          <DsButton type="submit" variant="primary" :loading="isSaving">
            Salvar
          </DsButton>
        </div>
      </form>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import {
  getLoyaltySummary,
  listLoyaltyRedemptions,
  redeemLoyaltyPoints,
  type LoyaltyBalanceSummary,
  type LoyaltyRedemptionSummary
} from '@/services/commercial';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

const filters = reactive({ client: '', date: '' });
const form = reactive({
  ownerId: '',
  pointsUsed: '',
  rewardDescription: '',
  productQuantity: 0,
  serviceQuantity: 0
});
const formErrors = reactive({
  ownerId: '',
  pointsUsed: '',
  rewardDescription: '',
  rewardQuantity: ''
});
const selectedRedemptionId = ref('');
const redemptions = ref<readonly LoyaltyRedemptionSummary[]>([]);
const balance = ref<LoyaltyBalanceSummary>({
  ownerId: null,
  availablePoints: 0,
  blockedPoints: 0,
  redeemedPoints: 0,
  redemptionCount: 0
});
const isLoading = ref(false);
const isSaving = ref(false);
const isCreateOpen = ref(false);
const errorMessage = ref('');
const formError = ref('');
const successMessage = ref('');

const integrations = [
  {
    scope: 'Origem',
    title: 'Vendas',
    description: 'Compras geram pontos por regra comercial, com origem rastreável por cliente.'
  },
  {
    scope: 'Consumo',
    title: 'Comandas',
    description: 'Benefícios podem ser consumidos no contexto operacional do atendimento.'
  },
  {
    scope: 'Relacionamento',
    title: 'Pacotes',
    description: 'Pontos coexistem com pacotes como incentivo comercial e retenção.'
  },
  {
    scope: 'Identidade',
    title: 'Clientes',
    description: 'Saldo disponível e bloqueado pertencem ao tutor/cliente, não ao animal.'
  }
];

const filteredRedemptions = computed(() => {
  const clientNeedle = filters.client.trim().toLowerCase();
  const dateNeedle = filters.date.trim().toLowerCase();
  return redemptions.value.filter((redemption) => {
    const matchesClient =
      !clientNeedle ||
      [redemption.ownerId, redemption.rewardDescription].some((value) => value.toLowerCase().includes(clientNeedle));
    const matchesDate = !dateNeedle || redemption.redeemedAt.toLowerCase().includes(dateNeedle);
    return matchesClient && matchesDate;
  });
});

const selectedRedemption = computed(
  () => redemptions.value.find((redemption) => redemption.id === selectedRedemptionId.value) ?? redemptions.value[0] ?? {
    id: 'empty',
    ownerId: 'Sem cliente selecionado',
    pointsUsed: 0,
    rewardDescription: 'Nenhum resgate selecionado',
    productQuantity: 0,
    serviceQuantity: 0,
    status: 'pending',
    redeemedAt: new Date().toISOString()
  }
);

const metrics = computed(() => [
  {
    label: 'Saldo disponível',
    value: `${balance.value.availablePoints} pts`,
    hint: 'Pontos livres para conversão em benefícios.'
  },
  {
    label: 'Saldo bloqueado',
    value: `${balance.value.blockedPoints} pts`,
    hint: 'Pontos pendentes de confirmação ou regra.'
  },
  {
    label: 'Resgates',
    value: filteredRedemptions.value.length.toString(),
    hint: 'Histórico filtrado por cliente e data.'
  }
]);

function resetFilters() {
  filters.client = '';
  filters.date = '';
}

function openCreateDialog() {
  resetForm();
  formError.value = '';
  isCreateOpen.value = true;
}

function closeCreateDialog() {
  if (isSaving.value) return;
  isCreateOpen.value = false;
}

function resetForm() {
  form.ownerId = '';
  form.pointsUsed = '';
  form.rewardDescription = '';
  form.productQuantity = 0;
  form.serviceQuantity = 0;
  clearFormErrors();
}

function clearFormErrors() {
  formErrors.ownerId = '';
  formErrors.pointsUsed = '';
  formErrors.rewardDescription = '';
  formErrors.rewardQuantity = '';
}

function normalizeQuantity(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function addProductReward() {
  form.productQuantity = normalizeQuantity(form.productQuantity) + 1;
}

function addServiceReward() {
  form.serviceQuantity = normalizeQuantity(form.serviceQuantity) + 1;
}

function validateRedemption() {
  clearFormErrors();
  const pointsUsed = normalizeQuantity(form.pointsUsed);
  const productQuantity = normalizeQuantity(form.productQuantity);
  const serviceQuantity = normalizeQuantity(form.serviceQuantity);

  if (!form.ownerId.trim()) formErrors.ownerId = 'Informe o cliente.';
  if (pointsUsed <= 0) formErrors.pointsUsed = 'Informe uma quantidade de pontos maior que zero.';
  if (!form.rewardDescription.trim()) formErrors.rewardDescription = 'Informe o benefício.';
  if (productQuantity + serviceQuantity <= 0) {
    formErrors.rewardQuantity = 'Adicione pelo menos um produto ou serviço ao resgate.';
  }

  return {
    isValid: !formErrors.ownerId && !formErrors.pointsUsed && !formErrors.rewardDescription && !formErrors.rewardQuantity,
    pointsUsed,
    productQuantity,
    serviceQuantity
  };
}

async function loadLoyaltyData() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const [summaryPayload, redemptionsPayload] = await Promise.all([
      getLoyaltySummary(),
      listLoyaltyRedemptions()
    ]);
    balance.value = summaryPayload;
    redemptions.value = redemptionsPayload;
    selectedRedemptionId.value = redemptionsPayload[0]?.id ?? '';
  } catch {
    errorMessage.value = 'Não foi possível carregar os resgates de pontos.';
  } finally {
    isLoading.value = false;
  }
}

async function submitRedemption() {
  const validation = validateRedemption();
  if (!validation.isValid) return;

  isSaving.value = true;
  formError.value = '';
  successMessage.value = '';
  try {
    const redemption = await redeemLoyaltyPoints({
      ownerId: form.ownerId.trim(),
      pointsUsed: validation.pointsUsed,
      rewardDescription: form.rewardDescription.trim(),
      productQuantity: validation.productQuantity,
      serviceQuantity: validation.serviceQuantity
    });
    await loadLoyaltyData();
    selectedRedemptionId.value = redemption.id;
    successMessage.value = 'Resgate de pontos incluído com sucesso.';
    isCreateOpen.value = false;
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível incluir o resgate de pontos.';
  } finally {
    isSaving.value = false;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

onMounted(() => {
  void loadLoyaltyData();
});
</script>

<style scoped>
.loyalty-page {
  display: grid;
  gap: 16px;
}

.loyalty-page__overview,
.loyalty-page__content,
.integration-grid,
.reward-grid,
.form-grid,
.legacy-actions {
  display: grid;
  gap: 12px;
}

.loyalty-page__overview {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.loyalty-page__content {
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
}

.panel {
  border-radius: 8px;
}

.metric-card,
.integration-card,
.reward-card,
.selected-card {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.metric-card__label,
.integration-card span,
.reward-card span,
.selected-card__eyebrow {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.metric-card strong,
.reward-card strong {
  font-size: 24px;
}

.metric-card p,
.integration-card p,
.reward-card p,
.selected-card p {
  margin: 8px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.table-wrapper {
  overflow-x: auto;
}

.loyalty-table {
  width: 100%;
  border-collapse: collapse;
}

.loyalty-table th,
.loyalty-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  text-align: left;
  vertical-align: top;
}

.loyalty-table th {
  background: var(--color-bg-subtle, #f8fafc);
  white-space: nowrap;
}

.muted {
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted, #64748b);
}

.integration-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.reward-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
}

.redemption-form {
  display: grid;
  gap: 16px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.legacy-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.legacy-action {
  display: grid;
  grid-template-columns: 1fr minmax(96px, 128px) auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.legacy-action strong,
.legacy-action span {
  display: block;
}

.legacy-action span {
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.form-error {
  margin: 0;
  color: var(--color-danger, #dc2626);
  font-size: 13px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 960px) {
  .loyalty-page__content,
  .filters-grid,
  .reward-grid,
  .form-grid,
  .legacy-actions,
  .legacy-action {
    grid-template-columns: 1fr;
  }
}
</style>
