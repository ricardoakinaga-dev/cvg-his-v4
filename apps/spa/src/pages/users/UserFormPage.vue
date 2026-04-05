<template>
  <div class="user-form-page">
    <AppPageHeader>
      <template #title>
        {{ isEdit ? 'Editar Usuário' : 'Novo Usuário' }}
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/users">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

    <form class="user-form" @submit.prevent="onSubmit">
      <DsCard>
        <template #title>👤 Dados Pessoais</template>
        <div class="form-row">
          <DsInput
            id="displayName"
            v-model="form.displayName"
            label="Nome Completo"
            placeholder="Nome completo"
            :error="errors.displayName"
            required
          />
          <DsInput
            id="email"
            v-model="form.email"
            type="email"
            label="E-mail"
            placeholder="email@exemplo.com"
            :error="errors.email"
            required
          />
        </div>
        <div class="form-row">
          <DsInput
            id="username"
            v-model="form.username"
            label="Usuário (login)"
            placeholder="nome.sobrenome"
            :error="errors.username"
            required
          />
          <DsInput id="phone" v-model="form.phone" label="Telefone" placeholder="(11) 99999-9999" />
        </div>
      </DsCard>

      <DsCard>
        <template #title>🏢 Setor e Perfil</template>
        <div class="form-row">
          <DsInput id="department" v-model="form.department" type="select" label="Setor">
            <option value="">Selecione...</option>
            <option value="clinica_geral">🩺 Clínica Geral</option>
            <option value="centro_cirurgico">💉 Centro Cirúrgico</option>
            <option value="uti_veterinaria">🚨 UTI Veterinária</option>
            <option value="diagnostico_imagem">📷 Diagnóstico por Imagem</option>
            <option value="laboratorio">🔬 Laboratório</option>
            <option value="recepcao">🔔 Recepção</option>
            <option value="administrativo">⚙️ Administrativo</option>
            <option value="farmacia">💊 Farmácia</option>
            <option value="governanca">🛡️ Governança</option>
          </DsInput>
          <DsInput
            id="roleCode"
            v-model="form.roleCode"
            type="select"
            label="Perfil (Role)"
            :error="errors.roleCode"
            required
          >
            <option value="">Selecione...</option>
            <option value="admin">👑 Administrador</option>
            <option value="veterinarian">🩺 Veterinário</option>
            <option value="nurse">💉 Enfermeiro(a)</option>
            <option value="reception">🔔 Recepcionista</option>
            <option value="auditor">📝 Auditor</option>
            <option value="finance">💰 Financeiro</option>
            <option value="inventory">📦 Estoque</option>
          </DsInput>
        </div>
        <div class="form-row">
          <DsInput
            id="jobTitle"
            v-model="form.jobTitle"
            label="Cargo/Função"
            placeholder="Ex: Médico Veterinário Sênior"
          />
          <DsInput id="status" v-model="form.status" type="select" label="Status">
            <option value="active">✅ Ativo</option>
            <option value="inactive">⏸ Inativo</option>
          </DsInput>
        </div>
      </DsCard>

      <DsCard>
        <template #title>🔐 Senha {{ isEdit ? '(opcional)' : '' }}</template>
        <div class="form-row">
          <DsInput
            id="password"
            v-model="form.password"
            type="password"
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            :error="errors.password"
            :required="!isEdit"
          />
          <DsInput
            id="passwordConfirm"
            v-model="form.passwordConfirm"
            type="password"
            label="Confirmar Senha"
            placeholder="Repita a senha"
            :error="errors.passwordConfirm"
            :required="!isEdit"
          />
        </div>
      </DsCard>

      <div class="form-actions">
        <DsButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Usuário' }}
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/users">Cancelar</DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { userService } from '@/services/user';
import type { CreateUserRequest, UpdateUserRequest, UserSummary } from '@/types/user';
import { useFormValidation } from '@/composables/useFormValidation';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const userId = computed(() => route.params.id as string);

const form = reactive({
  displayName: '',
  email: '',
  username: '',
  phone: '',
  department: '',
  roleCode: '',
  jobTitle: '',
  status: 'active' as 'active' | 'inactive',
  password: '',
  passwordConfirm: ''
});

const validation = useFormValidation({
  rules: {
    displayName: [(v: unknown) => (!(v as string)?.trim() ? 'Nome é obrigatório' : null)],
    email: [
      (v: unknown) => (!(v as string)?.trim() ? 'E-mail é obrigatório' : null),
      (v: unknown) => ((v as string)?.includes('@') ? null : 'E-mail inválido')
    ],
    username: [(v: unknown) => (!(v as string)?.trim() ? 'Usuário é obrigatório' : null)],
    roleCode: [(v: unknown) => (!v ? 'Perfil é obrigatório' : null)],
    password: [
      (v: unknown) => {
        if (isEdit.value && !(v as string)) return null;
        return !(v as string)?.trim() || (v as string).length < 8
          ? 'Senha deve ter pelo menos 8 caracteres'
          : null;
      }
    ],
    passwordConfirm: [
      (v: unknown) => {
        if (isEdit.value && !(v as string)) return null;
        return (v as string) !== form.password ? 'As senhas não coincidem' : null;
      }
    ]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

function getValues(): Record<string, unknown> {
  return {
    displayName: form.displayName,
    email: form.email,
    username: form.username,
    roleCode: form.roleCode,
    password: form.password,
    passwordConfirm: form.passwordConfirm
  };
}

async function onSubmit() {
  if (!validate(getValues())) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    const basePayload = {
      displayName: form.displayName.trim(),
      fullName: form.displayName.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      roleCode: form.roleCode,
      department: form.department || undefined,
      jobTitle: form.jobTitle || undefined,
      status: form.status
    };

    if (isEdit.value) {
      const payload: UpdateUserRequest = { ...basePayload };
      if (form.password) {
        payload.password = form.password;
      }
      await userService.update(userId.value, payload);
      successMessage.value = 'Usuário atualizado com sucesso!';
      setTimeout(() => router.push(`/users/${userId.value}`), 1000);
    } else {
      const payload: CreateUserRequest = {
        ...basePayload,
        password: form.password
      };
      const created = await userService.create(payload);
      successMessage.value = 'Usuário criado com sucesso!';
      setTimeout(() => router.push(`/users/${created.id}`), 1000);
    }
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar usuário';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const user: UserSummary = await userService.getById(userId.value);
      form.displayName = user.displayName;
      form.email = user.email;
      form.username = user.username;
      form.phone = user.phone || '';
      form.department = user.department || '';
      form.roleCode = user.roleCode;
      form.jobTitle = user.jobTitle || '';
      form.status = user.status;
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar usuário';
    }
  }
});
</script>

<style scoped>
.user-form {
  max-width: 720px;
}
.user-form .ds-card {
  margin-bottom: 16px;
}
</style>
