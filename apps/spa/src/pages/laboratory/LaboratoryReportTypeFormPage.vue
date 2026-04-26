<template>
  <div class="laboratory-report-type-form-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Tipos de Laudo', isEditing ? 'Editar' : 'Incluir']"
      :title="isEditing ? 'Editar Tipo de Laudo' : 'Incluir Tipo de Laudo'"
      subtitle="Modelo técnico usado para padronizar laudos, exames e liberação de resultados"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/report-types">Voltar</DsButton>
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
        <form class="report-type-form" @submit.prevent="submitForm">
          <label class="form-field">
            <span>Descrição</span>
            <input v-model="form.name" required autocomplete="off" placeholder="Ex: Citologia" />
          </label>
          <label class="form-field">
            <span>Código</span>
            <input v-model="form.code" required autocomplete="off" placeholder="Ex: CITO" />
          </label>
          <label class="form-field">
            <span>Categoria</span>
            <input v-model="form.category" required autocomplete="off" placeholder="Ex: Laboratorial" />
          </label>
          <label class="form-field">
            <span>Situação</span>
            <select v-model="form.active">
              <option :value="true">Ativo</option>
              <option :value="false">Inativo</option>
            </select>
          </label>
          <label class="form-field form-field--full">
            <span>Modelo</span>
            <textarea
              v-model="form.description"
              required
              rows="8"
              placeholder="Estrutura ou descrição padrão usada na emissão do laudo"
            />
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" tag="a" to="/laboratory/report-types">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do cadastro">
          <div class="preview-card">
            <span>{{ normalizedCode || 'SEM CÓDIGO' }}</span>
            <strong>{{ form.name || 'Tipo de laudo' }}</strong>
            <p>{{ form.category || 'Categoria não informada' }} · {{ statusLabel }}</p>
            <p>{{ form.description || 'Modelo ainda não preenchido' }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Exames:</strong> define a classificação do pedido laboratorial.</div>
            <div><strong>Laudos:</strong> padroniza o texto técnico liberado ao tutor.</div>
            <div><strong>Hemogramas/Bioquímico/Urina:</strong> conecta modelos aos resultados estruturados.</div>
            <div><strong>Auditoria:</strong> mantém rastreio do padrão usado na emissão.</div>
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
const reportTypeId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(reportTypeId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = reactive({
  name: '',
  code: '',
  category: '',
  description: '',
  active: true
});

const normalizedCode = computed(() => form.code.trim().toUpperCase());
const statusLabel = computed(() => form.active ? 'Ativo' : 'Inativo');

async function loadReportType() {
  if (!reportTypeId.value) return;
  try {
    const reportType = await laboratoryService.getReportType(reportTypeId.value);
    form.name = reportType.name;
    form.code = reportType.code;
    form.category = reportType.category;
    form.description = reportType.description;
    form.active = reportType.active;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tipo de laudo';
  }
}

async function submitForm() {
  if (!form.name.trim() || !form.code.trim() || !form.category.trim() || !form.description.trim()) {
    error.value = 'Descrição, código, categoria e modelo são obrigatórios';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      name: form.name.trim(),
      code: normalizedCode.value,
      category: form.category.trim(),
      description: form.description.trim(),
      active: form.active
    };

    if (isEditing.value && reportTypeId.value) {
      await laboratoryService.updateReportType(reportTypeId.value, payload);
    } else {
      await laboratoryService.createReportType(payload);
    }

    successMessage.value = 'Tipo de laudo salvo com sucesso.';
    setTimeout(() => void router.push('/laboratory/report-types'), 900);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar tipo de laudo';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadReportType);
</script>

<style scoped>
.laboratory-report-type-form-page {
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

.report-type-form {
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

.form-field--full {
  grid-column: 1 / -1;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.form-field textarea {
  resize: vertical;
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
  .report-type-form {
    grid-template-columns: 1fr;
  }
}
</style>
