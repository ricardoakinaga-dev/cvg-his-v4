<template>
  <div class="form-page">
    <AppPageHeader
      :breadcrumbs="['RH', 'Usuários', 'Equipe', isEditing ? 'Editar Membro' : 'Novo Membro']"
      :title="isEditing ? 'Editar Membro' : 'Novo Membro'"
      :subtitle="isEditing ? 'Atualize os dados do membro da equipe' : 'Cadastre um novo membro na equipe'"
    >
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/staff')">Voltar</DsButton>
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
        <form class="staff-form" @submit.prevent="submitForm">
          <DsInput
            v-model="form.employeeCode"
            label="Código do Funcionário"
            required
            placeholder="Ex: ADM-001"
          />
          <DsInput v-model="form.fullName" label="Nome Completo" required placeholder="Ex: João Silva" />
          <DsInput v-model="form.department" label="Departamento" placeholder="Ex: Clínica" />
          <DsInput v-model="form.jobTitle" label="Cargo" placeholder="Ex: Médico Veterinário" />
          <div class="active-toggle">
            <label class="toggle-label">
              <input type="checkbox" v-model="form.isActive" />
              <span>Membro Ativo</span>
            </label>
          </div>
          <div class="form-actions">
            <DsButton variant="primary" :loading="submitting" type="submit">
              {{ isEditing ? 'Atualizar' : 'Cadastrar' }}
            </DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/staff')">
              Cancelar
            </DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Resumo em tempo real">
          <div class="summary-grid">
            <div v-for="card in summaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard title="Boas práticas">
          <ul class="guide-list">
            <li>Use o código funcional como referência estável em integrações e relatórios.</li>
            <li>Preencha departamento e cargo para melhorar filtros e composição de equipes.</li>
            <li>Desative membros quando o vínculo terminar, sem apagar o histórico.</li>
          </ul>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

const router = useRouter();
const route = useRoute();
const staffId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!staffId.value);

const form = ref({
  employeeCode: '',
  fullName: '',
  department: '',
  jobTitle: '',
  isActive: true
});
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => [
  { label: 'Código', value: form.value.employeeCode.trim() || '—', hint: 'Identificador interno' },
  { label: 'Nome', value: form.value.fullName.trim() || '—', hint: 'Nome exibido na equipe' },
  { label: 'Departamento', value: form.value.department.trim() || '—', hint: 'Área operacional' },
  { label: 'Status', value: form.value.isActive ? 'Ativo' : 'Inativo', hint: 'Situação operacional' }
]);

async function loadStaff() {
  if (!staffId.value) return;
  try {
    const member = await staffService.getById(staffId.value);
    form.value = {
      employeeCode: member.employeeCode,
      fullName: member.fullName,
      department: member.department ?? '',
      jobTitle: member.jobTitle ?? '',
      isActive: member.status === 'active'
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar membro';
  }
}

async function submitForm() {
  if (!form.value.employeeCode.trim()) {
    error.value = 'Código do funcionário é obrigatório';
    return;
  }
  if (!form.value.fullName.trim()) {
    error.value = 'Nome completo é obrigatório';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    if (isEditing.value && staffId.value) {
      await staffService.update(staffId.value, {
        fullName: form.value.fullName.trim(),
        department: form.value.department.trim() || null,
        jobTitle: form.value.jobTitle.trim() || null,
        isActive: form.value.isActive
      });
      successMessage.value = 'Membro atualizado com sucesso.';
    } else {
      await staffService.create({
        employeeCode: form.value.employeeCode.trim(),
        fullName: form.value.fullName.trim(),
        department: form.value.department.trim() || null,
        jobTitle: form.value.jobTitle.trim() || null
      });
      successMessage.value = 'Membro cadastrado com sucesso.';
    }
    setTimeout(() => router.push('/staff'), 1500);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar membro';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadStaff);
</script>

<style scoped>
.form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.staff-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .staff-form {
    grid-template-columns: 1fr;
  }
}

.active-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-label input {
  width: 18px;
  height: 18px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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

.guide-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .form-layout {
    grid-template-columns: 1fr;
  }

  .form-aside {
    position: static;
  }
}
</style>
