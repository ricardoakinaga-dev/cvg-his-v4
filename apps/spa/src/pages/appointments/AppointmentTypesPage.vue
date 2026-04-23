<template>
  <div class="config-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Agenda', 'Tipos de Agendamento']">
      <template #title>Tipos de Agendamento</template>
      <template #subtitle>Catálogo operacional consumido pela agenda enterprise</template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <section class="config-grid">
      <DsCard title="Novo tipo">
        <div class="form-grid">
          <DsInput v-model="form.code" label="Código" placeholder="CONS_CLIN" />
          <DsInput v-model="form.name" label="Nome" placeholder="Consulta Clínica" />
          <DsInput v-model.number="form.defaultDurationMinutes" label="Duração padrão" type="number" />
          <DsInput v-model="form.color" label="Cor" placeholder="#0F766E" />
          <DsInput v-model="form.description" label="Descrição" placeholder="Atendimento clínico geral" />
        </div>
        <label class="checkbox">
          <input v-model="form.active" type="checkbox" />
          <span>Tipo ativo</span>
        </label>
        <DsButton variant="primary" :loading="saving" @click="createType">
          {{ saving ? 'Salvando...' : 'Salvar tipo' }}
        </DsButton>
      </DsCard>

      <DsCard title="Catálogo ativo">
        <div v-if="loading" class="muted">Carregando tipos...</div>
        <div v-else-if="items.length === 0" class="muted">Nenhum tipo cadastrado.</div>
        <div v-else class="list-stack">
          <div v-for="item in items" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.code }} · {{ item.description || 'Sem descrição' }}</p>
            </div>
            <div class="list-item__meta">
              <span>{{ item.defaultDurationMinutes }} min</span>
              <span>{{ item.active ? 'Ativo' : 'Inativo' }}</span>
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
import { agendaConfigService } from '@/services/agendaConfig';
import type { AppointmentTypeRecord } from '@/types/agendaConfig';

const items = ref<AppointmentTypeRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const form = ref({
  code: '',
  name: '',
  defaultDurationMinutes: 30,
  color: '#0F766E',
  description: '',
  active: true
});

async function loadTypes() {
  loading.value = true;
  try {
    const response = await agendaConfigService.listAppointmentTypes();
    items.value = response.items;
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar tipos de agendamento.'
    };
  } finally {
    loading.value = false;
  }
}

async function createType() {
  if (!form.value.code.trim() || !form.value.name.trim()) return;
  saving.value = true;
  try {
    const created = await agendaConfigService.createAppointmentType({
      code: form.value.code.trim(),
      name: form.value.name.trim(),
      defaultDurationMinutes: Number(form.value.defaultDurationMinutes),
      color: form.value.color.trim() || null,
      description: form.value.description.trim() || null,
      active: form.value.active
    });
    items.value = [...items.value, created];
    form.value = {
      code: '',
      name: '',
      defaultDurationMinutes: 30,
      color: '#0F766E',
      description: '',
      active: true
    };
    notice.value = { variant: 'success', message: 'Tipo de agendamento criado.' };
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao salvar tipo de agendamento.'
    };
  } finally {
    saving.value = false;
  }
}

onMounted(loadTypes);
</script>

<style scoped>
.config-page,
.config-grid,
.form-grid,
.list-stack {
  display: grid;
  gap: 16px;
}

.config-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.form-grid {
  margin-bottom: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
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
