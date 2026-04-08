<template>
  <div class="user-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px">
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger">{{ error }}</DsAlert>

    <template v-else-if="user">
      <AppPageHeader>
        <template #title>👤 {{ user.displayName }}</template>
        <template #subtitle>
          <StatusBadge
            :label="user.status === 'active' ? 'Ativo' : 'Inativo'"
            :variant="user.status === 'active' ? 'success' : 'neutral'"
          />
          <span class="muted" style="margin-left: 8px">@{{ user.username }}</span>
        </template>
        <template #actions>
          <DsButton variant="secondary" tag="a" :to="`/users/${user.id}/edit`">Editar</DsButton>
          <DsButton variant="secondary" tag="a" to="/users">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <AppDetailSection title="Informações do Usuário">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item__label">Nome Completo</span>
            <span class="detail-item__value">{{ user.displayName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">E-mail</span>
            <span class="detail-item__value">{{ user.email }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Usuário</span>
            <span class="detail-item__value">@{{ user.username }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Perfil</span>
            <span class="detail-item__value">{{ roleLabel(user.roleCode) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Setor</span>
            <span class="detail-item__value">{{ user.department || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Cargo</span>
            <span class="detail-item__value">{{ user.jobTitle || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Telefone</span>
            <span class="detail-item__value">{{ user.phone || 'Não informado' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Criado em</span>
            <span class="detail-item__value">{{ formatDateTime(user.createdAt) }}</span>
          </div>
        </div>
      </AppDetailSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { userService } from '@/services/user';
import type { UserSummary } from '@/types/user';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { formatDateTime } from '@/utils/labels';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const userId = route.params.id as string;

const user = ref<UserSummary | null>(null);
const loading = ref(true);
const error = ref('');

const roleLabelMap: Record<string, string> = {
  admin: '👑 Admin',
  veterinarian: '🩺 Veterinário',
  nurse: '💉 Enfermeiro(a)',
  reception: '🔔 Recepção',
  auditor: '📝 Auditor',
  finance: '💰 Financeiro',
  inventory: '📦 Estoque'
};

function roleLabel(code: string) {
  return roleLabelMap[code] || code;
}

onMounted(async () => {
  try {
    user.value = await userService.getById(userId);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar usuário';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #94a3b8);
}
.detail-item__value {
  font-size: 15px;
  color: var(--color-text, #0f172a);
}
</style>
