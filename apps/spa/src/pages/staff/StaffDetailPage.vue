<template>
  <div class="detail-page">
    <AppPageHeader title="Detalhes do Membro" :subtitle="staffMember?.fullName ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/staff')">Voltar</DsButton>
        <DsButton variant="primary" @click="router.push(`/staff/${staffId}/edit`)">Editar</DsButton>
        <DsButton
          v-if="staffMember"
          :variant="staffMember.status === 'active' ? 'secondary' : 'primary'"
          :loading="toggleLoading"
          @click="toggleActive"
        >
          {{ staffMember.status === 'active' ? 'Desativar' : 'Ativar' }}
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="staffMember" class="detail-grid">
      <DsCard title="Dados do Membro">
        <div class="detail-list">
          <div><strong>Nome:</strong> {{ staffMember.fullName }}</div>
          <div><strong>Código:</strong> {{ staffMember.employeeCode }}</div>
          <div><strong>Departamento:</strong> {{ staffMember.department || '—' }}</div>
          <div><strong>Cargo:</strong> {{ staffMember.jobTitle || '—' }}</div>
          <div>
            <strong>Status:</strong>
            <span :class="['status-badge', staffMember.status === 'active' ? 'status-badge--active' : 'status-badge--inactive']">
              {{ staffMember.status === 'active' ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div><strong>Criado em:</strong> {{ formatDateTime(staffMember.createdAt) }}</div>
          <div><strong>Atualizado em:</strong> {{ formatDateTime(staffMember.updatedAt) }}</div>
        </div>
      </DsCard>
    </div>

    <div v-else-if="loading" class="loading">Carregando...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';
import { formatDateTime } from '@/utils/labels';

const router = useRouter();
const route = useRoute();
const staffId = computed(() => route.params.id as string);
const staffMember = ref<StaffSummary | null>(null);
const loading = ref(false);
const toggleLoading = ref(false);
const error = ref('');

async function loadStaff() {
  loading.value = true;
  error.value = '';
  try {
    staffMember.value = await staffService.getById(staffId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar membro';
  } finally {
    loading.value = false;
  }
}

async function toggleActive() {
  if (!staffMember.value) return;
  toggleLoading.value = true;
  error.value = '';
  try {
    staffMember.value = await staffService.toggleActive(staffId.value, staffMember.value.status !== 'active');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao alterar status';
  } finally {
    toggleLoading.value = false;
  }
}

onMounted(loadStaff);
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  gap: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>