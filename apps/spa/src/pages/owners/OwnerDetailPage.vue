<template>
  <div class="owner-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="70%" />
      </div>
    </div>
    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <template v-else-if="owner">
      <AppPageHeader>
        <template #title>{{ owner.fullName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="owner.status === 'active' ? 'Ativo' : 'Inativo'"
            :variant="owner.status === 'active' ? 'success' : 'danger'"
          />
          <StatusBadge v-if="owner.financialResponsible" label="Resp. Financeiro" variant="info" />
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/owners/${owner.id}/edit`" variant="secondary">Editar</DsButton>
          <DsButton variant="secondary" tag="a" to="/owners">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <div class="owner-detail-page__hero">
        <DsCard title="Ficha resumida">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>
      </div>

      <div class="owner-detail-page__grid">
        <AppDetailSection title="Documento">
          <p v-if="owner.documentId">
            <code>{{ owner.documentId }}</code>
          </p>
          <p v-else class="muted">Não informado</p>
        </AppDetailSection>

        <AppDetailSection title="Contatos">
          <div v-if="owner.contacts.length" class="contacts-list">
            <div v-for="(contact, i) in owner.contacts" :key="i" class="contact-item">
              <span v-if="contact.primary" class="contact-item__primary">★</span>
              <strong>{{ contact.label }}</strong
              >: {{ contact.value }}
              <StatusBadge
                v-if="contact.type === 'whatsapp'"
                label="WA"
                variant="success"
                size="sm"
              />
            </div>
          </div>
          <p v-else class="muted">Nenhum contato cadastrado</p>
        </AppDetailSection>

        <AppDetailSection v-if="owner.administrativeNotes" title="Observações">
          <p>{{ owner.administrativeNotes }}</p>
        </AppDetailSection>

        <AppDetailSection title="Informações">
          <p class="muted">Criado em: {{ formatDate(owner.createdAt) }}</p>
          <p class="muted">Atualizado em: {{ formatDate(owner.updatedAt) }}</p>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ownerService } from '@/services/owner';
import type { OwnerSummary } from '@/types/owner';
import { formatDate } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const owner = ref<OwnerSummary | null>(null);
const loading = ref(true);
const error = ref('');

const summaryCards = computed(() => {
  if (!owner.value) return [];

  return [
    {
      label: 'Documento',
      value: owner.value.documentId || 'Não informado',
      hint: 'Identificação fiscal'
    },
    {
      label: 'Contatos',
      value: owner.value.contacts.length.toString(),
      hint: 'Canais cadastrados'
    },
    {
      label: 'Principal',
      value:
        owner.value.contacts.find((contact) => contact.primary)?.label ||
        owner.value.contacts[0]?.label ||
        '—',
      hint: 'Contato de referência'
    },
    {
      label: 'Financeiro',
      value: owner.value.financialResponsible ? 'Sim' : 'Não',
      hint: 'Responsável financeiro'
    }
  ];
});

onMounted(async () => {
  const id = route.params.id as string;
  try {
    owner.value = await ownerService.getById(id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tutor';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.owner-detail-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.owner-detail-page__hero {
  margin-bottom: 16px;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.contact-item__primary {
  color: var(--color-warning-500, #f59e0b);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}
</style>
