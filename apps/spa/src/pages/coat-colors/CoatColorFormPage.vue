<template>
  <div class="coat-color-form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Cor/Pelagem' : 'Incluir Cor/Pelagem'"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Cores/Pelagens', isEditing ? 'Editar' : 'Incluir']"
      subtitle="Cadastro auxiliar para padronizar identificação visual, filtros de animais e relatórios.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/coat-colors')">Voltar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>
    <DsAlert v-if="loading" variant="info">
      Carregando dados da cor/pelagem para edição…
    </DsAlert>

    <div class="form-layout">
      <DsCard>
        <form class="coat-color-form" @submit.prevent="submitForm">
          <DsInput v-model="form.name" label="Descrição" required placeholder="Ex: Tricolor" />
          <DsInput v-model="form.code" label="Id externo/Código" placeholder="Ex: TRICOLOR" />
          <DsInput v-model="form.colorGroup" label="Grupo" placeholder="Ex: Composta" />
          <label class="color-field">
            <span>Cor visual</span>
            <input v-model="form.hexColor" type="color" />
          </label>
          <DsInput
            v-model="form.description"
            class="description-field"
            type="textarea"
            label="Observação"
            :rows="5"
            placeholder="Informe observações operacionais desta cor ou pelagem."
          />
          <label class="toggle-label">
            <input v-model="form.active" type="checkbox" />
            <span>Cores Ativas</span>
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting" :disabled="successPending">Salvar</DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/coat-colors')">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do Cadastro">
          <div class="preview-card">
            <span>{{ form.code || 'Sem código' }}</span>
            <div class="preview-title">
              <span class="preview-swatch" :style="{ backgroundColor: form.hexColor }" />
              <strong>{{ form.name || 'Cor/Pelagem' }}</strong>
            </div>
            <p>{{ form.colorGroup || 'Sem grupo' }} · {{ form.active ? 'Ativa' : 'Inativa' }}</p>
            <p>{{ form.description || 'Sem observação.' }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Animais:</strong> referência preparada para identificação visual no cadastro do animal.</div>
            <div><strong>Atendimento:</strong> padroniza triagem, prontuário, internação e relatórios clínicos.</div>
            <div><strong>Relatórios:</strong> permite agrupar cadastros por pelagem e status ativo.</div>
            <div><strong>Importação Vetus:</strong> mantém código externo para conciliação de dados.</div>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { useSuccessRedirect } from '@/composables/successRedirect';
import { coatColorService } from '@/services/coatColors';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const route = useRoute();
const coatColorId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(coatColorId.value));
const submitting = ref(false);
const successRedirect = useSuccessRedirect();
const successPending = successRedirect.successPending;
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const form = reactive({
  name: '',
  code: '',
  colorGroup: '',
  hexColor: '#7c5f46',
  description: '',
  active: true
});
const routeKey = computed(() => `${route.path}|${coatColorId.value ?? ''}`);
const pageGeneration = ref(0);
let active = true;

function isCurrentRequest(generation: number, key: string) {
  return active && generation === pageGeneration.value && routeKey.value === key;
}

function resetForm() {
  Object.assign(form, { name: '', code: '', colorGroup: '', hexColor: '#7c5f46', description: '', active: true });
  error.value = '';
  successMessage.value = '';
}

async function loadCoatColor(id: string, generation: number, key: string) {
  if (!id) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const coatColor = await coatColorService.getById(id);
    if (!isCurrentRequest(generation, key)) return;
    if (coatColor.id !== id) throw new Error('A cor/pelagem retornada não corresponde ao endereço solicitado.');
    Object.assign(form, {
      name: coatColor.name,
      code: coatColor.code ?? '',
      colorGroup: coatColor.colorGroup ?? '',
      hexColor: coatColor.hexColor ?? '#7c5f46',
      description: coatColor.description ?? '',
      active: coatColor.active
    });
  } catch (err: unknown) {
    if (isCurrentRequest(generation, key)) error.value = err instanceof Error ? err.message : 'Erro ao carregar cor/pelagem';
  } finally {
    if (isCurrentRequest(generation, key)) loading.value = false;
  }
}

async function submitForm() {
  if (submitting.value || !successRedirect.begin()) return;
  if (!form.name.trim()) {
    error.value = 'Descrição é obrigatória';
    return;
  }

  const targetId = coatColorId.value;
  const targetKey = routeKey.value;
  const generation = pageGeneration.value;
  const editing = Boolean(targetId);
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      colorGroup: form.colorGroup.trim() || null,
      hexColor: form.hexColor,
      description: form.description.trim() || null,
      active: form.active
    };

    if (editing && targetId) {
      const updated = await coatColorService.update(targetId, payload);
      if (!isCurrentRequest(generation, targetKey)) return;
      if (updated.id !== targetId) throw new Error('A cor/pelagem retornada não corresponde ao endereço solicitado.');
    } else {
      const created = await coatColorService.create(payload);
      if (!isCurrentRequest(generation, targetKey)) return;
      if (!created.id) throw new Error('A cor/pelagem criada não retornou um identificador.');
    }
    if (!isCurrentRequest(generation, targetKey)) return;
    successMessage.value = 'Cor/Pelagem salva com sucesso.';
    successRedirect.schedule(() => {
      if (isCurrentRequest(generation, targetKey)) return router.push('/coat-colors');
    }, successMessage.value);
  } catch (err: unknown) {
    if (isCurrentRequest(generation, targetKey)) error.value = err instanceof Error ? err.message : 'Erro ao salvar cor/pelagem';
  } finally {
    if (isCurrentRequest(generation, targetKey)) submitting.value = false;
  }
}

watch(routeKey, (key, previousKey) => {
  if (key === previousKey) return;
  const generation = pageGeneration.value + 1;
  pageGeneration.value = generation;
  successRedirect.invalidate();
  resetForm();
  void loadCoatColor(coatColorId.value ?? '', generation, key);
}, { immediate: true });

onBeforeUnmount(() => {
  active = false;
  pageGeneration.value += 1;
  successRedirect.invalidate();
});
</script>

<style scoped>
.coat-color-form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.coat-color-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.description-field,
.toggle-label,
.form-actions {
  grid-column: 1 / -1;
}

.color-field,
.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.color-field {
  flex-direction: column;
  align-items: flex-start;
}

.color-field input {
  width: 100%;
  min-width: 160px;
  height: 44px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  background: var(--color-surface, #fff);
}

.toggle-label input {
  width: 18px;
  height: 18px;
}

.toggle-label {
  min-height: 44px;
}

.form-actions {
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

.preview-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.preview-swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 5px;
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
  .coat-color-form {
    grid-template-columns: 1fr;
  }
}
</style>
