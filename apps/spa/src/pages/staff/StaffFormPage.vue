<template>
  <div class="form-page">
    <AppPageHeader
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

    <DsCard>
      <form class="staff-form" @submit.prevent="submitForm">
        <DsInput v-model="form.employeeCode" label="Código do Funcionário" required placeholder="Ex: ADM-001" />
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
          <DsButton variant="secondary" type="button" @click="router.push('/staff')">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>
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
</style>