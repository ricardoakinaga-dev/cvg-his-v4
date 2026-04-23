<template>
  <div class="enterprise-page">
    <AppPageHeader :breadcrumbs="['Laboratório', 'Pedidos API']">
      <template #title>Pedidos de Exame</template>
      <template #subtitle>Superfície dedicada para o contrato `/exam-orders`</template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <section class="page-grid">
      <DsCard title="Criar pedido">
        <div class="form-grid">
          <DsInput v-model="form.encounterId" label="Atendimento" placeholder="enc_..." />
          <DsInput v-model="form.patientId" label="Paciente" placeholder="patient_..." />
          <DsInput v-model="form.examName" label="Exame" placeholder="Hemograma completo" />
          <DsInput v-model="form.examCode" label="Código" placeholder="HEMO001" />
          <DsInput v-model="form.notes" label="Notas" placeholder="Pedido criado pela operação" />
        </div>
        <DsButton variant="primary" :loading="saving" @click="createOrder">
          {{ saving ? 'Criando...' : 'Criar pedido' }}
        </DsButton>
      </DsCard>

      <DsCard title="Pedidos publicados">
        <div v-if="loading" class="muted">Carregando pedidos...</div>
        <div v-else-if="items.length === 0" class="muted">Nenhum pedido retornado pelo endpoint.</div>
        <div v-else class="list-stack">
          <div v-for="item in items" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.examName }}</strong>
              <p>{{ item.encounterId }} · {{ item.patientId }}</p>
            </div>
            <div class="list-item__meta">
              <span>{{ item.status }}</span>
              <span>{{ item.requestedAt }}</span>
            </div>
          </div>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { examApiService } from '@/services/examApi';
import type { ExamOrderRecord } from '@/types/examApi';

const items = ref<ExamOrderRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const form = ref({
  encounterId: '',
  patientId: '',
  examName: '',
  examCode: '',
  notes: ''
});

async function loadOrders() {
  loading.value = true;
  try {
    items.value = await examApiService.listOrders();
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar pedidos de exame.'
    };
  } finally {
    loading.value = false;
  }
}

async function createOrder() {
  if (!form.value.encounterId.trim() || !form.value.patientId.trim() || !form.value.examName.trim()) return;
  saving.value = true;
  try {
    const created = await examApiService.createOrder({
      encounterId: form.value.encounterId.trim(),
      patientId: form.value.patientId.trim(),
      examName: form.value.examName.trim(),
      examCode: form.value.examCode.trim() || undefined,
      notes: form.value.notes.trim() || undefined
    });
    items.value = [created, ...items.value];
    form.value = { encounterId: '', patientId: '', examName: '', examCode: '', notes: '' };
    notice.value = { variant: 'success', message: 'Pedido enviado ao endpoint enterprise.' };
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao criar pedido de exame.'
    };
  } finally {
    saving.value = false;
  }
}

onMounted(loadOrders);
</script>

<style scoped>
.enterprise-page,
.page-grid,
.form-grid,
.list-stack {
  display: grid;
  gap: 16px;
}

.page-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.form-grid {
  margin-bottom: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.list-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.list-item__meta {
  display: grid;
  justify-items: end;
  color: var(--ds-color-neutral-600, #52525b);
}
</style>
