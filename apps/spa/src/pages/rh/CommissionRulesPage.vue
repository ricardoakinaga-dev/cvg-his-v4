<template>
  <div class="rh-catalog-page">
    <AppPageHeader
      title="Regras de Comissão"
      :breadcrumbs="['RH', 'Comissões', 'Regras de Comissão']"
      subtitle="Estrutura inicial das regras que direcionam cálculo, repasse e leitura gerencial de comissões"
    >
      <template #actions>
        <DsButton variant="secondary" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary">Nova Regra</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície inicial para <strong>RH &gt; Comissões</strong>. Motor completo de cálculo, vigência e vínculos
      por profissional ainda será expandido nas próximas ondas.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${rules.length} regra(s)`" value="" icon="📐" />
      <DsStatCard :label="`${activeCount} ativa(s)`" value="" icon="✅" />
      <DsStatCard :label="`${departmentsCount} departamento(s)`" value="" icon="🏢" />
    </section>

    <DsCard title="Mapa inicial de regras">
      <div class="catalog-grid">
        <article v-for="rule in rules" :key="rule.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ rule.name }}</strong>
            <span class="catalog-item__badge" :class="{ 'catalog-item__badge--active': rule.active }">
              {{ rule.active ? 'Ativa' : 'Inativa' }}
            </span>
          </div>
          <p class="catalog-item__meta">Código: {{ rule.code }} · Escopo: {{ rule.scope }}</p>
          <p class="catalog-item__hint">{{ rule.description }}</p>
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

const rules = ref([
  {
    code: 'COM-VET',
    name: 'Comissão Veterinária',
    scope: 'Atendimento clínico',
    active: true,
    description: 'Base inicial para repasse por atendimento e procedimento executado.'
  },
  {
    code: 'COM-LAB',
    name: 'Comissão Laboratorial',
    scope: 'Laboratório',
    active: true,
    description: 'Estrutura inicial para regras por exame e produção laboratorial.'
  },
  {
    code: 'COM-BAL',
    name: 'Comissão de Balcão',
    scope: 'Comercial',
    active: false,
    description: 'Preparação para regras futuras ligadas a vendas e comandas.'
  }
]);

const activeCount = computed(() => rules.value.filter((item) => item.active).length);
const departmentsCount = computed(() => new Set(rules.value.map((item) => item.scope)).size);

function reload() {
  rules.value = [...rules.value];
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
  background: #e2e8f0;
  color: #475569;
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
