<template>
  <div class="laboratory-equipment-form-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Equipamentos', isEditing ? 'Editar' : 'Incluir']"
      :title="isEditing ? 'Editar Equipamento' : 'Incluir Equipamento'"
      subtitle="Cadastro técnico usado por resultados, calibração e manutenção laboratorial"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/equipment">Voltar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="form-layout">
      <DsCard>
        <form class="equipment-form" @submit.prevent="submitForm">
          <label class="form-field">
            <span>Descrição</span>
            <input v-model="form.name" required autocomplete="off" placeholder="Ex: Bioquímico ChemLab 300" />
          </label>
          <label class="form-field">
            <span>Tipo</span>
            <input v-model="form.type" required autocomplete="off" placeholder="Ex: Bioquímica" />
          </label>
          <label class="form-field">
            <span>Nº Série</span>
            <input v-model="form.serialNumber" required autocomplete="off" placeholder="Ex: BIO-300-114" />
          </label>
          <label class="form-field">
            <span>Situação</span>
            <select v-model="form.status">
              <option value="active">Ativo</option>
              <option value="maintenance">Manutenção</option>
            </select>
          </label>
          <label class="form-field">
            <span>Última Calibração</span>
            <input v-model="form.lastCalibrationAt" required type="date" />
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" tag="a" to="/laboratory/equipment">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do cadastro">
          <div class="preview-card">
            <span>{{ form.serialNumber || 'Sem número de série' }}</span>
            <strong>{{ form.name || 'Equipamento' }}</strong>
            <p>{{ form.type || 'Tipo não informado' }} · {{ statusLabel }}</p>
            <p>Última calibração: {{ calibrationPreview }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Hemogramas:</strong> sustentação técnica para leitura tabular.</div>
            <div><strong>Bioquímico:</strong> base de rastreabilidade para medições quantitativas.</div>
            <div><strong>Manutenção:</strong> situação operacional visível para equipe de laboratório.</div>
            <div><strong>Calibração:</strong> controle de confiabilidade técnica do resultado.</div>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { laboratoryService } from '@/services/laboratory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const router = useRouter();
const equipmentId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(equipmentId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = reactive({
  name: '',
  type: '',
  serialNumber: '',
  status: 'active' as 'active' | 'maintenance',
  lastCalibrationAt: new Date().toISOString().slice(0, 10)
});

const statusLabel = computed(() => form.status === 'active' ? 'Ativo' : 'Manutenção');
const calibrationPreview = computed(() => {
  if (!form.lastCalibrationAt) return 'Não informada';
  return new Date(`${form.lastCalibrationAt}T00:00:00`).toLocaleDateString('pt-BR');
});

async function loadEquipment() {
  if (!equipmentId.value) return;
  try {
    const equipment = await laboratoryService.getEquipment(equipmentId.value);
    form.name = equipment.name;
    form.type = equipment.type;
    form.serialNumber = equipment.serialNumber;
    form.status = equipment.status;
    form.lastCalibrationAt = equipment.lastCalibrationAt.slice(0, 10);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipamento';
  }
}

async function submitForm() {
  if (!form.name.trim() || !form.type.trim() || !form.serialNumber.trim() || !form.lastCalibrationAt) {
    error.value = 'Descrição, tipo, número de série e última calibração são obrigatórios';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      serialNumber: form.serialNumber.trim(),
      status: form.status,
      lastCalibrationAt: new Date(`${form.lastCalibrationAt}T00:00:00`).toISOString()
    };

    if (isEditing.value && equipmentId.value) {
      await laboratoryService.updateEquipment(equipmentId.value, payload);
    } else {
      await laboratoryService.createEquipment(payload);
    }

    successMessage.value = 'Equipamento salvo com sucesso.';
    setTimeout(() => void router.push('/laboratory/equipment'), 900);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar equipamento';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadEquipment);
</script>

<style scoped>
.laboratory-equipment-form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.8fr);
  align-items: start;
  gap: 16px;
}

.equipment-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
}

.form-field input,
.form-field select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-aside,
.detail-list,
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-list {
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.preview-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.preview-card > span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.preview-card strong {
  color: var(--color-text, #0f172a);
  font-size: 20px;
}

.preview-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 960px) {
  .form-layout,
  .equipment-form {
    grid-template-columns: 1fr;
  }
}
</style>
