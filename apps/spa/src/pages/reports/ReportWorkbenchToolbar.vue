<template>
  <AppPageHeader
    :title="props.title"
    :breadcrumbs="props.breadcrumbs"
    :subtitle="props.subtitle"
  >
    <template v-if="props.showActions" #actions>
      <DsButton variant="secondary" :loading="props.loading" @click="emit('refresh')">
        Atualizar
      </DsButton>
      <ReportExportAction
        v-if="props.exportable"
        :label="props.exportLabel"
        :loading="props.exportLoading"
        :disabled="props.exportDisabled"
        @export="emit('export')"
      />
      <DsButton v-else-if="props.primaryDisabled" variant="primary" disabled>
        {{ props.primaryLabel }}
      </DsButton>
      <DsButton v-else variant="primary" tag="a" :to="props.primaryPath">
        {{ props.primaryLabel }}
      </DsButton>
    </template>
  </AppPageHeader>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

import ReportExportAction from './ReportExportAction.vue';

const props = defineProps<{
  title: string;
  breadcrumbs: string[];
  subtitle: string;
  showActions: boolean;
  loading: boolean;
  exportable: boolean;
  exportLabel: string;
  exportLoading: boolean;
  exportDisabled: boolean;
  primaryDisabled: boolean;
  primaryLabel: string;
  primaryPath: string;
}>();

const emit = defineEmits<{
  (event: 'refresh'): void;
  (event: 'export'): void;
}>();
</script>
