<template>
  <div class="bed-form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Box de Internação' : 'Incluir Box de Internação'"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Boxes de Internação', isEditing ? 'Editar' : 'Incluir']"
      subtitle="Cadastro operacional para admissão, transferência e mapa de ocupação da internação.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/beds')">Voltar</DsButton>
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
        <form class="bed-form" @submit.prevent="submitForm">
          <DsInput v-model="form.code" label="Código" required placeholder="Ex: B01" />
          <DsInput v-model="form.name" label="Descrição" required placeholder="Ex: Box 01" />
          <DsInput v-model="form.sectorId" type="select" label="Setor" required>
            <option value="">Selecione...</option>
            <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
              {{ sector.code }} - {{ sector.name }}
            </option>
          </DsInput>
          <DsInput v-model="form.status" type="select" label="Status" required>
            <option value="available">Disponível</option>
            <option value="occupied">Ocupado</option>
            <option value="maintenance">Manutenção</option>
            <option value="blocked">Bloqueado</option>
          </DsInput>
          <DsInput v-model="form.supportsSpecies" label="Espécie suportada" placeholder="Ex: caninos, felinos" />
          <label class="toggle-label">
            <input v-model="form.active" type="checkbox" />
            <span>Box Ativo</span>
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/beds')">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do Cadastro">
          <div class="preview-card">
            <span>{{ form.code || 'Sem código' }}</span>
            <strong>{{ form.name || 'Box de Internação' }}</strong>
            <p>{{ selectedSectorLabel }} · {{ statusLabel(form.status) }}</p>
            <p>{{ form.supportsSpecies || 'Sem restrição de espécie' }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Internação:</strong> usado em admissão, transferência e alta.</div>
            <div><strong>Mapa de Leitos:</strong> alimenta disponibilidade e ocupação por setor.</div>
            <div><strong>Atendimento:</strong> mantém vínculo com o animal internado e o prontuário.</div>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const route = useRoute();
const router = useRouter();
const bedId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(bedId.value));
const sectors = ref<SectorSummary[]>([]);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = ref({
  code: '',
  name: '',
  sectorId: '',
  status: 'available' as BedSummary['status'],
  supportsSpecies: '',
  active: true
});

const selectedSectorLabel = computed(() => {
  const sector = sectors.value.find((item) => item.id === form.value.sectorId);
  return sector ? `${sector.code} - ${sector.name}` : 'Sem setor';
});

async function loadData() {
  try {
    sectors.value = await inpatientService.listSectors();
    if (!bedId.value) return;
    const bed = await inpatientService.getBedById(bedId.value);
    form.value = {
      code: bed.code,
      name: bed.name,
      sectorId: bed.sectorId,
      status: bed.status,
      supportsSpecies: bed.supportsSpecies ?? '',
      active: bed.active
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar box de internação';
  }
}

async function submitForm() {
  if (!form.value.code.trim()) {
    error.value = 'Código é obrigatório';
    return;
  }
  if (!form.value.name.trim()) {
    error.value = 'Descrição é obrigatória';
    return;
  }
  if (!form.value.sectorId) {
    error.value = 'Setor é obrigatório';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  const payload = {
    sectorId: form.value.sectorId,
    code: form.value.code.trim(),
    name: form.value.name.trim(),
    status: form.value.status,
    supportsSpecies: form.value.supportsSpecies.trim() || null,
    active: form.value.active
  };

  try {
    const saved = isEditing.value && bedId.value
      ? await inpatientService.updateBed(bedId.value, payload)
      : await inpatientService.createBed({
          sectorId: payload.sectorId,
          code: payload.code,
          name: payload.name,
          supportsSpecies: form.value.supportsSpecies.trim() || undefined
        });
    if (!isEditing.value && (saved.status !== form.value.status || saved.active !== form.value.active)) {
      await inpatientService.updateBed(saved.id, { status: form.value.status, active: form.value.active });
    }
    successMessage.value = 'Box de Internação salvo com sucesso.';
    setTimeout(() => router.push('/beds'), 1200);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar box de internação';
  } finally {
    submitting.value = false;
  }
}

function statusLabel(status: BedSummary['status']): string {
  const map: Record<BedSummary['status'], string> = {
    available: 'Disponível',
    occupied: 'Ocupado',
    maintenance: 'Manutenção',
    blocked: 'Bloqueado'
  };
  return map[status];
}

onMounted(loadData);
</script>

<style scoped>
.bed-form-page,
.form-aside,
.detail-list,
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.bed-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.toggle-label,
.form-actions {
  grid-column: 1 / -1;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.toggle-label input {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.detail-list {
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

@media (max-width: 920px) {
  .form-layout,
  .bed-form {
    grid-template-columns: 1fr;
  }
}
</style>
