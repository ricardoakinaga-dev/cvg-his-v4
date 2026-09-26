<template>
  <aside class="clinical-record-aside" aria-label="Resumo do paciente e tutor">
    <section class="patient-summary-card">
      <span class="patient-rail__avatar" aria-hidden="true">🐾</span>
      <div>
        <span class="patient-rail__eyebrow">Paciente</span>
        <strong>{{ props.patientName }}</strong>
        <p>{{ props.patientSummary }}</p>
      </div>
    </section>

    <section class="clinical-side-card">
      <h2>Tutor</h2>
      <dl class="detail-list">
        <div>
          <dt>Nome</dt>
          <dd>{{ props.ownerName || 'Não informado' }}</dd>
        </div>
        <div>
          <dt>Contato</dt>
          <dd>{{ props.ownerPrimaryContact }}</dd>
        </div>
      </dl>
      <div class="rail-actions">
        <DsButton
          v-if="props.ownerHref"
          size="sm"
          variant="secondary"
          tag="a"
          :to="props.ownerHref"
        >
          Ver tutor
        </DsButton>
        <DsButton
          v-if="props.patientHref"
          size="sm"
          variant="secondary"
          tag="a"
          :to="props.patientHref"
        >
          Ver paciente
        </DsButton>
      </div>
    </section>

    <section class="clinical-side-card">
      <h2>Resumo</h2>
      <dl class="detail-list">
        <div>
          <dt>Status</dt>
          <dd>{{ props.recordStatusLabel }}</dd>
        </div>
        <div>
          <dt>Entradas ativas</dt>
          <dd>{{ props.activeEntryCount }}</dd>
        </div>
        <div>
          <dt>Prescrições</dt>
          <dd>{{ props.prescriptionCount }}</dd>
        </div>
      </dl>
    </section>
  </aside>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const props = defineProps<{
  patientName: string;
  patientSummary: string;
  ownerName: string;
  ownerPrimaryContact: string;
  recordStatusLabel: string;
  activeEntryCount: number;
  prescriptionCount: number;
  ownerHref?: string;
  patientHref?: string;
}>();
</script>

<style scoped>
.clinical-record-aside {
  display: grid;
  gap: 14px;
  min-width: 0;
  position: sticky;
  top: 84px;
}

.patient-summary-card,
.clinical-side-card {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.patient-summary-card {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.patient-summary-card strong {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.patient-summary-card p {
  margin: 4px 0 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  line-height: 1.4;
}

.clinical-side-card h2 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.patient-rail__avatar {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 22px;
}

.patient-rail__eyebrow,
.detail-list dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.rail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.detail-list div {
  display: grid;
  grid-template-columns: minmax(86px, 0.8fr) minmax(0, 1fr);
  gap: 8px;
}

.detail-list dd {
  min-width: 0;
  margin: 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
  overflow-wrap: anywhere;
}

@media (max-width: 1180px) {
  .clinical-record-aside {
    position: static;
  }
}
</style>
