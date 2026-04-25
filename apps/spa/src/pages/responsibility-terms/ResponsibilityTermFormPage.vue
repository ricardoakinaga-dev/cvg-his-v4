<template>
  <div class="term-form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Termo de Responsabilidade' : 'Incluir Termo de Responsabilidade'"
      :breadcrumbs="[
        'Atendimento',
        'Cadastros',
        'Termos de Responsabilidade',
        isEditing ? 'Editar' : 'Incluir'
      ]"
      subtitle="Modelo documental para consentimento, ciência de risco e autorização operacional.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/responsibility-terms')">Voltar</DsButton>
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
        <form class="term-form" @submit.prevent="submitForm">
          <DsInput v-model="form.title" label="Descrição" required placeholder="Ex: Termo de internação" />
          <DsInput v-model="form.code" label="Id externo/Código" placeholder="Ex: TER-INTERNACAO" />
          <DsInput v-model="form.usageContext" type="select" label="Tipo de uso">
            <option value="atendimento">Atendimento</option>
            <option value="internacao">Internação</option>
            <option value="procedimento">Procedimento</option>
            <option value="autorizacao">Autorização</option>
            <option value="outro">Outro</option>
          </DsInput>
          <DsInput
            v-model="form.content"
            class="content-field"
            type="textarea"
            label="Texto do termo"
            required
            :rows="12"
            placeholder="Informe o texto padrão do documento."
          />
          <div class="toggles">
            <label class="toggle-label">
              <input v-model="form.active" type="checkbox" />
              <span>Termos Ativos</span>
            </label>
            <label class="toggle-label">
              <input v-model="form.requiresOwnerSignature" type="checkbox" />
              <span>Assinatura do responsável</span>
            </label>
            <label class="toggle-label">
              <input v-model="form.requiresWitnessSignature" type="checkbox" />
              <span>Assinatura de testemunha</span>
            </label>
          </div>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/responsibility-terms')">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do Documento">
          <article class="document-preview">
            <h2>{{ form.title || 'Termo de Responsabilidade' }}</h2>
            <p class="document-preview__meta">
              {{ responsibilityTermUsageLabel(form.usageContext) }} · {{ form.active ? 'Ativo' : 'Inativo' }}
            </p>
            <pre>{{ form.content || 'Texto do termo...' }}</pre>
            <div class="signature-grid">
              <span>Responsável</span>
              <span v-if="form.requiresWitnessSignature">Testemunha</span>
            </div>
          </article>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Atendimento:</strong> termo selecionável para consentimento do tutor.</div>
            <div><strong>Internação:</strong> documento de autorização e ciência de risco.</div>
            <div><strong>Procedimentos:</strong> apoio para cirurgias, anestesia e exames sensíveis.</div>
            <div><strong>Prontuário:</strong> modelo preparado para impressão e anexação documental.</div>
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
import {
  responsibilityTermsService,
  responsibilityTermUsageLabel,
  type ResponsibilityTermUsageContext
} from '@/services/responsibilityTerms';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const route = useRoute();
const termId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(termId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = ref({
  title: '',
  code: '',
  usageContext: 'atendimento' as ResponsibilityTermUsageContext,
  content: '',
  active: true,
  requiresOwnerSignature: true,
  requiresWitnessSignature: false
});

async function loadTerm() {
  if (!termId.value) return;
  try {
    const term = await responsibilityTermsService.getById(termId.value);
    form.value = {
      title: term.title,
      code: term.code ?? '',
      usageContext: term.usageContext,
      content: term.content,
      active: term.active,
      requiresOwnerSignature: term.requiresOwnerSignature,
      requiresWitnessSignature: term.requiresWitnessSignature
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar termo de responsabilidade';
  }
}

async function submitForm() {
  if (!form.value.title.trim()) {
    error.value = 'Descrição é obrigatória';
    return;
  }
  if (!form.value.content.trim()) {
    error.value = 'Texto do termo é obrigatório';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      title: form.value.title.trim(),
      code: form.value.code.trim() || null,
      usageContext: form.value.usageContext,
      content: form.value.content.trim(),
      active: form.value.active,
      requiresOwnerSignature: form.value.requiresOwnerSignature,
      requiresWitnessSignature: form.value.requiresWitnessSignature
    };

    if (isEditing.value && termId.value) {
      await responsibilityTermsService.update(termId.value, payload);
    } else {
      await responsibilityTermsService.create(payload);
    }
    successMessage.value = 'Termo salvo com sucesso.';
    setTimeout(() => router.push('/responsibility-terms'), 1200);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar termo de responsabilidade';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadTerm);
</script>

<style scoped>
.term-form-page {
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

.term-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.content-field,
.toggles,
.form-actions {
  grid-column: 1 / -1;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
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

.form-aside,
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-list {
  gap: 10px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.document-preview {
  display: grid;
  gap: 12px;
  color: var(--color-text, #0f172a);
}

.document-preview h2 {
  margin: 0;
  font-size: 18px;
}

.document-preview__meta {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.document-preview pre {
  margin: 0;
  padding: 12px;
  min-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  font: inherit;
  color: var(--color-text-secondary, #475569);
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.signature-grid span {
  padding-top: 28px;
  border-top: 1px solid var(--color-border-strong, #94a3b8);
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 960px) {
  .form-layout,
  .term-form {
    grid-template-columns: 1fr;
  }
}
</style>
