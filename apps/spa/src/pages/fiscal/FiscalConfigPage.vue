<template>
  <div class="fiscal-config-page">
    <AppPageHeader
      title="Fiscal"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Fiscal']"
      subtitle="Consulta fiscal via backend com backoffice inicial para layouts municipais de NFS-e"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${summary.activeTaxes} tributo(s)`" value="" icon="📋" />
      <DsStatCard :label="`${summary.cfopCount} CFOP mapeados`" value="" icon="🔢" />
      <DsStatCard :label="`${summary.nfseLayouts} layout(s) NFS-e`" value="" icon="📄" />
      <DsStatCard :label="`${summary.icmsRules} regra(s) de ICMS`" value="" icon="📊" />
    </section>

    <section class="hub-alerts" v-if="summary.alerts.length > 0">
      <DsAlert
        v-for="alert in summary.alerts"
        :key="alert.title"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> {{ alert.message }}
      </DsAlert>
    </section>

    <DsAlert v-if="summary.readOnly" variant="info">
      <strong>{{ summary.backendScope }}</strong> Escopo atual: consulta e revisão operacional.
      Pendências ainda fora da UI publicada: {{ summary.pendingScopes.join(' • ') }}.
    </DsAlert>

    <DsAlert v-else variant="success">
      <strong>{{ summary.backendScope }}</strong> O backoffice fiscal já permite cadastro e ajuste
      inicial de layouts NFS-e, mantendo emissão e escrituração fora do escopo atual.
    </DsAlert>

    <section class="hub-section">
      <h2 class="section-title">Tributos e Parametrizações</h2>
      <div class="section-grid">
        <DsCard title="ICMS" icon="📊">
          <p class="card-description">Consulta operacional de ICMS interestadual e interno.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/icms" size="sm">
            Consultar ICMS
          </DsButton>
        </DsCard>
        <DsCard title="PIS / COFINS" icon="📈">
          <p class="card-description">Consulta de alíquotas por regime tributário e revisão operacional.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/pis-cofins" size="sm">
            Consultar
          </DsButton>
        </DsCard>
        <DsCard title="CFOP" icon="🔢">
          <p class="card-description">Tabela operacional de entradas, saídas, devoluções e serviços.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/cfop" size="sm">
            Consultar CFOP
          </DsButton>
        </DsCard>
        <DsCard title="NFS-e" icon="📄">
          <p class="card-description">Consulta de layouts NFS-e já publicados pela API por município.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/nfse" size="sm">
            Consultar NFS-e
          </DsButton>
        </DsCard>
        <DsCard title="IBPT / NCM" icon="🏷️">
          <p class="card-description">Consulta de NCMs e bases fiscais usadas pelo catálogo atual.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/ncm" size="sm">
            Consultar NCM
          </DsButton>
        </DsCard>
        <DsCard title="Matriz Estado ICMS" icon="📊">
          <p class="card-description">Cadastro da matriz de ICMS por estado de origem e destino.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/icms-matrix" size="sm">
            Abrir matriz
          </DsButton>
        </DsCard>
        <DsCard title="Tabela IBS/CBS" icon="🧮">
          <p class="card-description">Cadastro de pacotes IBS/CBS por ID, descrição e percentuais.</p>
          <DsButton variant="secondary" tag="a" to="/fiscal/ibs-cbs" size="sm">
            Abrir tabela
          </DsButton>
        </DsCard>
      </div>
    </section>

    <section class="hub-section">
      <h2 class="section-title">Simulação Base</h2>
      <div class="section-grid">
        <DsCard title="Mercadoria" icon="📦">
          <p class="card-description">
            Base {{ formatCurrency(taxPreview.mercadoria.baseValue) }} • tributos
            {{ formatCurrency(taxPreview.mercadoria.totalTaxValue) }} • total
            {{ formatCurrency(taxPreview.mercadoria.totalWithTax) }}
          </p>
          <DsButton variant="secondary" tag="a" to="/fiscal/icms" size="sm">
            Revisar ICMS
          </DsButton>
        </DsCard>
        <DsCard title="Serviço" icon="🩺">
          <p class="card-description">
            Base {{ formatCurrency(taxPreview.servico.baseValue) }} • tributos
            {{ formatCurrency(taxPreview.servico.totalTaxValue) }} • total
            {{ formatCurrency(taxPreview.servico.totalWithTax) }}
          </p>
          <DsButton variant="secondary" tag="a" to="/fiscal/nfse" size="sm">
            Revisar NFS-e
          </DsButton>
        </DsCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import {
  fiscalService,
  type FiscalDashboardSummary,
  type FiscalTaxPreview
} from '@/services/fiscal';

const loading = ref(false);
const error = ref('');
const summary = ref<FiscalDashboardSummary>({
  activeTaxes: 0,
  cfopCount: 0,
  nfseLayouts: 0,
  icmsRules: 0,
  pisCofinsRules: 0,
  ncmEntries: 0,
  readOnly: true,
  backendScope: '',
  pendingScopes: [],
  alerts: []
});
const taxPreview = ref<FiscalTaxPreview>({
  mercadoria: { baseValue: 0, totalTaxValue: 0, totalWithTax: 0 },
  servico: { baseValue: 0, totalTaxValue: 0, totalWithTax: 0 }
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [nextSummary, nextPreview] = await Promise.all([
      fiscalService.getDashboardSummary(),
      fiscalService.getTaxPreview()
    ]);
    summary.value = nextSummary;
    taxPreview.value = nextPreview;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-config-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-section {
  margin-top: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.card-description {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin: 0 0 12px 0;
}
</style>
