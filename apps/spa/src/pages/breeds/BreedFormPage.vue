<template>
  <div class="breed-form-page">
    <AppPageHeader
      :title="isEditing ? 'Editar Raça' : 'Incluir Raça'"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Raças', isEditing ? 'Editar' : 'Incluir']"
      subtitle="Cadastro auxiliar para padronizar a ficha do animal e os filtros clínicos.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/breeds')">Voltar</DsButton>
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
        <form class="breed-form" @submit.prevent="submitForm">
          <DsInput v-model="form.name" label="Descrição" required placeholder="Ex: Golden Retriever" />
          <DsInput v-model="form.code" label="Id externo/Código" placeholder="Ex: CAN-GOLD" />
          <DsInput v-model="form.species" type="select" label="Espécie">
            <option v-for="option in breedSpeciesOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </DsInput>
          <DsInput
            v-model="form.description"
            class="description-field"
            type="textarea"
            label="Observação"
            :rows="5"
            placeholder="Informe observações operacionais desta raça."
          />
          <label class="toggle-label">
            <input v-model="form.active" type="checkbox" />
            <span>Raças Ativas</span>
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" @click="router.push('/breeds')">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia do Cadastro">
          <div class="preview-card">
            <span>{{ form.code || 'Sem código' }}</span>
            <strong>{{ form.name || 'Raça' }}</strong>
            <p>{{ breedSpeciesLabel(form.species) }} · {{ form.active ? 'Ativa' : 'Inativa' }}</p>
            <p>{{ form.description || 'Sem observação.' }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Animais:</strong> opção disponível no campo Raça do cadastro do animal.</div>
            <div><strong>Atendimento:</strong> padroniza espécie/raça em triagem e prontuário.</div>
            <div><strong>Relatórios:</strong> permite filtros por espécie e consolidação cadastral.</div>
            <div><strong>Importação Vetus:</strong> mantém código externo para conciliação de dados.</div>
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
  breedSpeciesLabel,
  breedSpeciesOptions,
  breedsService,
  type BreedSpecies
} from '@/services/breeds';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const route = useRoute();
const breedId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(breedId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = ref({
  name: '',
  code: '',
  species: 'canine' as BreedSpecies,
  description: '',
  active: true
});

async function loadBreed() {
  if (!breedId.value) return;
  try {
    const breed = await breedsService.getById(breedId.value);
    form.value = {
      name: breed.name,
      code: breed.code ?? '',
      species: breed.species,
      description: breed.description ?? '',
      active: breed.active
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar raça';
  }
}

async function submitForm() {
  if (!form.value.name.trim()) {
    error.value = 'Descrição é obrigatória';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      name: form.value.name.trim(),
      code: form.value.code.trim() || null,
      species: form.value.species,
      description: form.value.description.trim() || null,
      active: form.value.active
    };

    if (isEditing.value && breedId.value) {
      await breedsService.update(breedId.value, payload);
    } else {
      await breedsService.create(payload);
    }
    successMessage.value = 'Raça salva com sucesso.';
    setTimeout(() => router.push('/breeds'), 1200);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar raça';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadBreed);
</script>

<style scoped>
.breed-form-page {
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

.breed-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.description-field,
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

.preview-card span {
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
  .breed-form {
    grid-template-columns: 1fr;
  }
}
</style>
