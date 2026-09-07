<template>
  <div class="bed-detail-page">
    <AppPageHeader title="Box de Internação" :breadcrumbs="['Atendimento', 'Cadastros', 'Boxes de Internação', 'Abrir']">
      <template #actions>
        <DsButton variant="secondary" :disabled="submitting" @click="router.push('/beds')">Voltar</DsButton>
        <DsButton variant="primary" :disabled="!canAct" @click="router.push(`/beds/${bedId}/edit`)">Editar</DsButton>
      </template>
    </AppPageHeader>
    <p v-if="loading" class="state-message" role="status">Carregando box…</p>
    <DsAlert v-if="recordError" variant="danger">
      {{ recordError }}
      <div class="recovery-action"><DsButton variant="secondary" :disabled="submitting || loading" @click="loadRecord">Recarregar box</DsButton></div>
    </DsAlert>
    <DsAlert v-if="operationError" variant="danger">
      {{ operationError }}
      <div class="recovery-action"><DsButton variant="secondary" :disabled="submitting || loading" @click="loadRecord">Recarregar box</DsButton></div>
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">{{ successMessage }}</DsAlert>
    <DsAlert v-if="previousResult" :variant="previousResult.complete ? 'success' : 'warning'" dismissible @dismiss="previousResult = null">
      {{ previousResult.message }}
      <div class="recovery-action"><DsButton tag="a" :to="`/beds/${previousResult.id}`" variant="secondary">Abrir box anterior</DsButton></div>
    </DsAlert>

    <template v-if="bed">
      <section class="bed-record" aria-labelledby="bed-identity">
        <header class="record-heading">
          <span class="record-mark" aria-hidden="true"><DsIcon name="bed" size="xl" /></span>
          <div><p class="eyebrow">{{ uncertain ? 'Estado a confirmar' : 'Cadastro do box' }}</p><h2 id="bed-identity">{{ bed.code }} · {{ bed.name }}</h2><p class="record-id">{{ bed.id }}</p></div>
        </header>
        <dl class="detail-list">
          <div class="full-field"><dt>Setor</dt><dd>{{ sectorLabel }}</dd><dd class="metadata-id">{{ bed.sectorId }}</dd></div>
          <div><dt>Status</dt><dd><StatusBadge :label="uncertain ? 'A confirmar' : statusLabel(bed.status)" :variant="!uncertain && bed.active && bed.status === 'available' ? 'success' : 'neutral'" /></dd></div>
          <div><dt>Box ativo</dt><dd>{{ uncertain ? 'A confirmar' : bed.active ? 'Sim' : 'Não' }}</dd></div>
          <div class="full-field"><dt>Espécie suportada</dt><dd>{{ bed.supportsSpecies?.trim() || 'Não informada' }}</dd></div>
        </dl>
        <p v-if="sectorsLoading" class="state-message" role="status">Consultando setores…</p>
        <DsAlert v-else-if="sectorError" variant="warning">
          Não foi possível consultar os setores. O identificador permanece disponível.
          <div class="recovery-action"><DsButton variant="secondary" :disabled="submitting" @click="loadSectors">Recarregar setores</DsButton></div>
        </DsAlert>
      </section>
      <section class="bed-actions" aria-label="Ações do box">
        <div><h2>Gerenciar box</h2><p v-if="bed.status === 'occupied'">Boxes ocupados não podem ser arquivados.</p></div>
        <div class="action-buttons">
          <DsButton variant="secondary" :disabled="!canAct" :loading="submitting && operation === 'toggle'" @click="toggleActive">{{ submitting && operation === 'toggle' ? 'Atualizando…' : bed.active ? 'Inativar' : 'Reativar' }}</DsButton>
          <DsButton v-if="bed.active" variant="danger" :disabled="!canAct || bed.status === 'occupied'" :loading="submitting && operation === 'archive'" @click="archiveBed">{{ submitting && operation === 'archive' ? 'Arquivando…' : 'Arquivar' }}</DsButton>
          <DsButton variant="secondary" :disabled="submitting" @click="router.push('/inpatient/board')">Mapa de Leitos</DsButton>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

const route = useRoute(), router = useRouter();
const bedId = computed(() => typeof route.params.id === 'string' ? route.params.id.trim() : '');
const bed = ref<BedSummary | null>(null), sectors = ref<SectorSummary[]>([]);
const loading = ref(true), sectorsLoading = ref(true), submitting = ref(false), uncertain = ref(false);
const recordError = ref(''), sectorError = ref(''), operationError = ref(''), successMessage = ref('');
const operation = ref<'toggle' | 'archive'>('toggle');
const previousResult = ref<{ id: string; complete: boolean; message: string } | null>(null);
let active = true, generation = 0, sectorGeneration = 0;
const current = (version: number) => active && version === generation;
const canAct = computed(() => !!bed.value && bed.value.id === bedId.value && !loading.value && !submitting.value && !uncertain.value);
const sectorLabel = computed(() => {
  const sector = sectors.value.find(item => item.id === bed.value?.sectorId);
  if (sector) return `${sector.code} · ${sector.name}${sector.active ? '' : ' · Inativo'}`;
  if (sectorsLoading.value) return 'Consultando setor…';
  return sectorError.value ? 'Nome do setor indisponível' : 'Setor não localizado';
});
async function loadRecord() {
  const id = bedId.value, version = ++generation;
  loading.value = true; bed.value = null; recordError.value = ''; operationError.value = ''; successMessage.value = ''; uncertain.value = false;
  try {
    if (!id) throw new Error('Missing bed identity');
    const record = await inpatientService.getBedById(id);
    if (!current(version)) return;
    if (record.id !== id) throw new Error('Bed identity mismatch');
    bed.value = record;
  } catch { if (current(version)) recordError.value = 'Não foi possível confirmar este box. Recarregue o cadastro para continuar.'; }
  finally { if (current(version)) loading.value = false; }
}
async function loadSectors() {
  const version = ++sectorGeneration;
  sectorsLoading.value = true; sectorError.value = ''; sectors.value = [];
  try { const items = await inpatientService.listSectors(); if (active && version === sectorGeneration) sectors.value = items; }
  catch { if (active && version === sectorGeneration) sectorError.value = 'Setores indisponíveis'; }
  finally { if (active && version === sectorGeneration) sectorsLoading.value = false; }
}
function failedMutation(version: number, snapshot: BedSummary, cause: unknown) {
  const detail = cause instanceof Error ? cause.message : 'Resposta indisponível.';
  if (current(version)) {
    uncertain.value = true;
    operationError.value = `Não foi possível confirmar a alteração de ${snapshot.code} · ${snapshot.name}. Recarregue o box antes de tentar novamente. ${detail}`;
  } else if (active) previousResult.value = { id: snapshot.id, complete: false, message: `Não foi possível confirmar a alteração de ${snapshot.code} · ${snapshot.name}. Consulte o cadastro anterior.` };
}
function completedMutation(version: number, snapshot: BedSummary, updated: BedSummary, verb: string) {
  const message = `Box ${snapshot.code} · ${snapshot.name} ${verb}.`;
  if (current(version)) { bed.value = updated; successMessage.value = message; }
  else if (active) previousResult.value = { id: snapshot.id, complete: true, message };
}
async function reconcileReturningRecord(version: number, id: string) {
  if (active && !current(version) && bedId.value === id) await loadRecord();
}
async function toggleActive() {
  if (!canAct.value || !bed.value) return;
  const snapshot = { ...bed.value }, version = generation;
  const payload = { active: !snapshot.active, status: snapshot.active ? 'blocked' as const : 'available' as const };
  operation.value = 'toggle'; submitting.value = true; operationError.value = ''; successMessage.value = '';
  try {
    const updated = await inpatientService.updateBed(snapshot.id, payload);
    if (updated.id !== snapshot.id) throw new Error('A resposta não corresponde ao box solicitado.');
    completedMutation(version, snapshot, updated, 'atualizado');
  } catch (cause) { failedMutation(version, snapshot, cause); }
  finally { await reconcileReturningRecord(version, snapshot.id); if (active) submitting.value = false; }
}
async function archiveBed() {
  if (!canAct.value || !bed.value || bed.value.status === 'occupied') return;
  const snapshot = { ...bed.value }, version = generation;
  if (!window.confirm(`Arquivar o box ${snapshot.code} · ${snapshot.name}?`)) return;
  if (!current(version) || !canAct.value) return;
  operation.value = 'archive'; submitting.value = true; operationError.value = ''; successMessage.value = '';
  try {
    await inpatientService.archiveBed(snapshot.id);
    // The archive service acknowledges a soft archive: inactive and blocked.
    completedMutation(version, snapshot, { ...snapshot, active: false, status: 'blocked' }, 'arquivado');
  } catch (cause) { failedMutation(version, snapshot, cause); }
  finally { await reconcileReturningRecord(version, snapshot.id); if (active) submitting.value = false; }
}
function statusLabel(status: BedSummary['status']) { return { available: 'Disponível', occupied: 'Ocupado', maintenance: 'Manutenção', blocked: 'Bloqueado' }[status] || 'Não informado'; }
onMounted(() => { void loadRecord(); void loadSectors(); });
watch(bedId, () => { void loadRecord(); }, { flush: 'sync' });
onBeforeUnmount(() => { active = false; generation++; sectorGeneration++; });
</script>

<style scoped>
.bed-detail-page { display:grid;gap:16px;min-width:0; }.bed-detail-page :deep(.app-page-header) { margin-bottom:0; }
.bed-record,.bed-actions { padding:24px;border:1px solid var(--color-border);border-radius:18px;background:var(--color-surface);min-width:0; }.record-heading { display:flex;gap:14px;align-items:center;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--color-border); }.record-heading>div { min-width:0; }.record-mark { display:grid;place-items:center;flex:0 0 44px;height:44px;border-radius:12px;color:var(--color-primary-700);background:var(--color-primary-50); }
.eyebrow { margin:0;color:var(--color-text-secondary);font-size:11px;letter-spacing:.06em;text-transform:uppercase; }.record-heading h2 { margin:6px 0;font-size:22px;line-height:1.35;overflow-wrap:anywhere; }.record-id,.metadata-id { color:var(--color-text-secondary);font-size:12px;overflow-wrap:anywhere; }.record-id { margin:0; }
.detail-list { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:0; }.detail-list>div { min-width:0; }.full-field { grid-column:1/-1; }.detail-list dt { color:var(--color-text-secondary);font-size:13px;margin-bottom:8px; }.detail-list dd { margin:0;font-size:15px;line-height:1.5;overflow-wrap:anywhere; }.detail-list dd.metadata-id { font-size:12px;margin-top:4px; }.state-message { margin:0;color:var(--color-text-secondary);font-size:14px;line-height:1.5; }.bed-record>.state-message,.bed-record>:deep(.ds-alert) { margin-top:20px; }
.bed-actions { display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap; }.bed-actions h2 { margin:0;font-size:17px; }.bed-actions p { margin:8px 0 0;color:var(--color-text-secondary);font-size:13px; }.action-buttons { display:flex;gap:10px;flex-wrap:wrap; }.recovery-action { margin-top:12px; }.bed-detail-page :deep(.ds-alert__message) { overflow-wrap:anywhere; }
@media(max-width:600px) { .bed-detail-page { gap:12px; }.bed-record,.bed-actions { padding:16px; }.record-heading { align-items:start; }.record-heading h2 { font-size:19px; }.detail-list { gap:16px; }.action-buttons { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%; }.action-buttons>:last-child { grid-column:1/-1; } }
</style>
