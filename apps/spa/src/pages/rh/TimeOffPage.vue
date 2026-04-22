<template>
  <div class="rh-catalog-page">
    <AppPageHeader
      title="Folgas"
      :breadcrumbs="['RH', 'Cadastros', 'Folgas']"
      subtitle="Base inicial de folgas, indisponibilidades e organização de cobertura da equipe"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Nova Folga</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>RH &gt; Cadastros</strong>. Escalas, cobertura automática e conflito com agenda
      ainda entram em ondas futuras.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${timeOffEntries.length} registro(s)`" value="" icon="🌴" />
      <DsStatCard :label="`${approvedCount} aprovado(s)`" value="" icon="✅" />
      <DsStatCard :label="`${pendingCount} pendente(s)`" value="" icon="⏳" />
    </section>

    <DsCard title="Janela inicial de folgas">
      <div class="catalog-grid">
        <article v-for="entry in timeOffEntries" :key="entry.employee + entry.period" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ entry.employee }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': entry.status === 'Aprovada' }">
              {{ entry.status }}
            </span>
          </div>
          <p class="catalog-item__meta">Período: {{ entry.period }} · Cobertura: {{ entry.coverage }}</p>
          <p class="catalog-item__hint">{{ entry.reason }}</p>
        </article>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const timeOffEntries = ref([
  {
    employee: 'Ana Paula',
    period: '12 a 14/05',
    coverage: 'Equipe clínica',
    status: 'Aprovada',
    reason: 'Descanso programado com cobertura definida no plantão.'
  },
  {
    employee: 'Rafael Lima',
    period: '18/05',
    coverage: 'Neurologia',
    status: 'Pendente',
    reason: 'Aguardando confirmação de substituição para agenda do dia.'
  },
  {
    employee: 'Equipe laboratório',
    period: '21/05',
    coverage: 'Backoffice',
    status: 'Aprovada',
    reason: 'Janela operacional para manutenção e rodízio interno.'
  }
]);

const approvedCount = computed(() => timeOffEntries.value.filter((item) => item.status === 'Aprovada').length);
const pendingCount = computed(() => timeOffEntries.value.filter((item) => item.status === 'Pendente').length);

function reload() {
  timeOffEntries.value = [...timeOffEntries.value];
}
</script>

<style scoped>
.rh-catalog-page {
  display: grid;
  gap: 16px;
}
.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.catalog-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-surface, #fff);
}
.catalog-item__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.catalog-item__badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
}
.catalog-item__badge--active {
  background: #dcfce7;
  color: #15803d;
}
.catalog-item__meta {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #475569;
}
.catalog-item__hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
</style>
