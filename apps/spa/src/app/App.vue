<template>
  <router-view />
  <PWAUpdateToast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useThemeStore } from '@/stores/theme';
import PWAUpdateToast from '@/components/PWAUpdateToast.vue';

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.apply();
});
</script>
