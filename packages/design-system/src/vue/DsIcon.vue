<template>
  <svg
    class="ds-icon"
    :class="`ds-icon--${size}`"
    :width="iconSize"
    :height="iconSize"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
    :data-icon="resolvedIconName"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <path v-for="(path, index) in resolvedIconPaths" :key="`${props.name}-${index}`" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DsIconProps {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
}

const props = withDefaults(defineProps<DsIconProps>(), {
  name: 'spark',
  size: 'md',
  label: undefined
});

const iconSize = computed(() => ({ xs: 14, sm: 16, md: 18, lg: 22, xl: 28 })[props.size]);

const iconAliases: Record<string, string> = {
  '🏠': 'home',
  '📊': 'chart',
  '📈': 'chart',
  '📉': 'chart',
  '📋': 'clipboard',
  '🧾': 'receipt',
  '👤': 'user',
  '👥': 'users',
  '🐾': 'paw',
  '📅': 'calendar',
  '🕒': 'clock',
  '📦': 'package',
  '🏷️': 'tag',
  '💳': 'card',
  '💰': 'money',
  '💵': 'money',
  '💸': 'money',
  '🛒': 'cart',
  '🏥': 'hospital',
  '🩺': 'stethoscope',
  '🧪': 'flask',
  '🔬': 'microscope',
  '🧬': 'dna',
  '🦴': 'bone',
  '🛏️': 'bed',
  '🗺️': 'map',
  '🔐': 'shield',
  '🔒': 'lock',
  '🔑': 'key',
  '🔎': 'search',
  '🔔': 'bell',
  '💬': 'message',
  '📱': 'phone',
  '📣': 'megaphone',
  '📧': 'mail',
  '🚚': 'truck',
  '🛠️': 'tool',
  '🔧': 'tool',
  '➕': 'plus',
  '★': 'star',
  '☆': 'star',
  '↗': 'arrow-up-right',
  '↪': 'log-out',
  '↔️': 'collapse',
  '☀️': 'sun',
  '🌙': 'moon',
  '☰': 'menu',
  '⇤': 'collapse',
  '🆘': 'support',
  '🧭': 'compass',
  '🧩': 'grid',
  '🗂️': 'folder',
  '📥': 'inbox',
  '📤': 'upload',
  '📝': 'edit',
  '📄': 'file',
  '🧮': 'calculator',
  '🔗': 'link',
  '🔄': 'refresh',
  '⚠️': 'alert',
  '🗓️': 'calendar',
  '🎂': 'spark',
  '📡': 'signal',
  '🛏': 'bed',
  '📁': 'folder',
  reception: 'inbox',
  'credit-card': 'card',
  tools: 'tool',
  x: 'close',
  close: 'close',
  '•': 'dot'
};

const ICON_PATHS: Record<string, string[]> = {
  spark: ['M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z'],
  dot: ['M12 12h.01'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  'chevron-up': ['m6 15 6-6 6 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  activity: ['M3 12h4l2.2-5 4.1 10 2.2-5H21'],
  home: ['m3 10 9-7 9 7', 'M5 9v11h14V9', 'M9 20v-6h6v6'],
  chart: ['M4 19V5', 'M4 19h16', 'm7 15 3-4 3 2 5-7'],
  clipboard: ['M9 5h6', 'M9 4a3 3 0 0 1 6 0', 'M6 5H5v15h14V5h-1', 'M8 10h8', 'M8 14h6'],
  receipt: ['M5 3h14v18l-3-2-4 2-4-2-3 2V3Z', 'M8 8h8', 'M8 12h8', 'M8 16h4'],
  user: ['M20 21a8 8 0 0 0-16 0', 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  users: ['M16 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1', 'M9.5 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M17 8a3 3 0 0 1 0 6', 'M21 21v-1a4 4 0 0 0-3-3.87'],
  paw: ['M7.5 11.5c-2.2 0-4 1.6-4 3.6 0 1.5 1 2.5 2.5 2.5 1.2 0 1.8-.8 2.7-.8s1.5.8 2.7.8c1.5 0 2.5-1 2.5-2.5 0-2-1.8-3.6-4-3.6-.5 0-1 .1-1.2.1s-.7-.1-1.2-.1Z', 'M7 8.5a2 2 0 1 0-3.5-1.7A2 2 0 0 0 7 8.5Z', 'M17 8.5a2 2 0 1 1 3.5-1.7A2 2 0 0 1 17 8.5Z', 'M10 7a2 2 0 1 0-3.5-1.7A2 2 0 0 0 10 7Z', 'M14 7a2 2 0 1 1 3.5-1.7A2 2 0 0 1 14 7Z'],
  calendar: ['M5 4h14v16H5z', 'M8 2v4', 'M16 2v4', 'M5 9h14', 'M9 13h2', 'M13 13h2', 'M9 17h2'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  package: ['m4 7 8-4 8 4v10l-8 4-8-4V7Z', 'm4 7 8 4 8-4', 'M12 11v10'],
  tag: ['m4 4 9-.2 7.2 7.2-9 9L4 12V4Z', 'M8 8h.01'],
  card: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
  money: ['M4 6h16v12H4z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M7 9h.01', 'M17 15h.01'],
  cart: ['M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5L21 8H6', 'M10 21h.01', 'M18 21h.01'],
  hospital: ['M4 21V5h16v16', 'M8 9h8', 'M12 6v6', 'M9 21v-5h6v5'],
  stethoscope: ['M6 3v5a4 4 0 0 0 8 0V3', 'M4 3h4', 'M12 3h4', 'M18 14a3 3 0 1 0 3 3v-1', 'M14 12a4 4 0 0 0 4 4'],
  flask: ['M9 3h6', 'M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3', 'M8 15h8'],
  microscope: ['M6 20h12', 'M9 20a6 6 0 0 1 6-6', 'M15 14V4h3', 'M12 4h6', 'M9 4h3v6H9z', 'M6 14h10'],
  dna: ['M8 3c8 4 8 14 0 18', 'M16 3C8 7 8 17 16 21', 'M9 6h6', 'M8 10h8', 'M8 14h8', 'M9 18h6'],
  bone: ['M7 7.5a2.5 2.5 0 1 1-3.5-3.5A2.5 2.5 0 0 1 7 7l10 10a2.5 2.5 0 1 1 3.5 3.5A2.5 2.5 0 0 1 17 17L7 7.5Z'],
  bed: ['M3 18v-7', 'M3 15h18', 'M21 18v-7', 'M6 11V7h5a4 4 0 0 1 4 4', 'M6 11h12'],
  map: ['M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z', 'M9 4v14', 'M15 6v14'],
  shield: ['M12 3 20 6v5c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3Z', 'm9 12 2 2 4-4'],
  lock: ['M6 10h12v10H6z', 'M8 10V7a4 4 0 0 1 8 0v3', 'M12 14v2'],
  key: ['m14 7 7 7-3 3-2-2-2 2-2-2-2 2-3-3 3-3a4 4 0 1 0-3-3l-3 3'],
  search: ['m20 20-4.5-4.5', 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  message: ['M4 5h16v11H8l-4 4V5Z', 'M8 9h8', 'M8 12h5'],
  phone: ['M6 3h3l2 5-2 1a14 14 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2C10 20 4 14 4 5a2 2 0 0 1 2-2Z'],
  megaphone: ['m3 11 14-5v12L3 14v-3Z', 'M17 10h3a2 2 0 0 1 0 4h-3', 'M6 15l1 5h3l-1-5'],
  mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
  truck: ['M3 6h11v10H3z', 'M14 10h4l3 3v3h-7', 'M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  tool: ['M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7Z'],
  star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'],
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  collapse: ['M8 4v16', 'm4 8 4-4 4 4', 'm4 16 4 4 4-4', 'M16 8h4', 'M16 12h4', 'M16 16h4'],
  sun: ['M12 4V2', 'M12 22v-2', 'm4.9 4.9-1.4-1.4', 'm20.5 20.5-1.4-1.4', 'M4 12H2', 'M22 12h-2', 'm4.9 19.1-1.4 1.4', 'm20.5 3.5-1.4 1.4', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z'],
  moon: ['M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  support: ['M4 13a8 8 0 0 1 16 0', 'M4 13v4h4v-4H4Z', 'M20 13v4h-4v-4h4Z', 'M12 21h3'],
  compass: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm15 9-2 5-5 2 2-5 5-2Z'],
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  folder: ['M3 6h7l2 2h9v10H3z'],
  inbox: ['M4 4h16v13H4z', 'M4 13h5l1 2h4l1-2h5', 'M12 8v4', 'm10 10 2 2 2-2'],
  'test-tube': ['M9 3.5h6', 'M10 3.5v9.2l-3.4 5.5a1.8 1.8 0 0 0 1.5 2.8h7.8a1.8 1.8 0 0 0 1.5-2.8L14 12.7V3.5', 'M8 16.5h8'],
  syringe: ['m5 5 14 14', 'm7 3 4 4', 'M9 5 5 9', 'm15 17 4-4', 'M8 12l4-4', 'M4 20l3-3'],
  target: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 12h.01'],
  droplet: ['M12 3.5S6.5 10 6.5 14.5a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z'],
  palette: ['M12 3.5a8.5 8.5 0 1 0 0 17h1.5a1.8 1.8 0 0 0 .8-3.4 1.8 1.8 0 0 1 .8-3.4H17a3.5 3.5 0 0 0 3.5-3.5A6.8 6.8 0 0 0 12 3.5Z', 'M7.5 10h.01', 'M10 7h.01', 'M14 7h.01', 'M16.5 10h.01'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 20h16'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v5h5', 'M9 13h6', 'M9 17h6'],
  link: ['m10 13 4-4', 'M7 17H6a4 4 0 0 1 0-8h3', 'M17 7h1a4 4 0 0 1 0 8h-3'],
  refresh: ['M20 11a8 8 0 0 0-14.5-4L3 9', 'M3 4v5h5', 'M4 13a8 8 0 0 0 14.5 4L21 15', 'M21 20v-5h-5'],
  wrench: ['M14.7 6.3a5 5 0 0 0 6.1 6.1l-8.2 8.2a2.1 2.1 0 0 1-3-3l8.2-8.2a5 5 0 0 0-3.1-8.9l-2.3 2.3 3 3-1.7 1.7-3-3-2.3 2.3a5 5 0 0 0 8.3 3.5Z'],
  building: ['M5 20V4h10v16', 'M15 9h4v11', 'M8 7h2', 'M8 11h2', 'M8 15h2', 'M17 13h.01', 'M17 16h.01'],
  factory: ['M4 20V9l6 3V9l6 3V6h4v14', 'M7 16h2', 'M12 16h2', 'M17 16h1'],
  settings: ['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z', 'm19.4 15 .1.1-1.7 2.9-.2-.1a7.5 7.5 0 0 1-2.3 1.3v.2H8.7v-.2a7.5 7.5 0 0 1-2.3-1.3l-.2.1-1.7-2.9.1-.1a7.5 7.5 0 0 1 0-2.6l-.1-.1 1.7-2.9.2.1a7.5 7.5 0 0 1 2.3-1.3V8h6.6v.2a7.5 7.5 0 0 1 2.3 1.3l.2-.1 1.7 2.9-.1.1a7.5 7.5 0 0 1 0 2.6Z'],
  'check-circle': ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'm8 12 2.5 2.5L16 9'],
  alert: ['M12 3 22 21H2L12 3Z', 'M12 9v4', 'M12 17h.01'],
  signal: ['M4 18v-2', 'M8 18v-5', 'M12 18V9', 'M16 18V6', 'M20 18V3'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13 6 4 4'],
  calculator: ['M5 3h14v18H5z', 'M8 7h8', 'M8 12h2', 'M14 12h2', 'M8 16h2', 'M14 16h2']
};

const resolvedIconName = computed(() => {
  const normalized = props.name.trim().toLowerCase();
  const key = iconAliases[props.name] ?? iconAliases[normalized] ?? normalized;
  return ICON_PATHS[key] ? key : 'spark';
});

const resolvedIconPaths = computed(() => ICON_PATHS[resolvedIconName.value]);
</script>

<style scoped>
.ds-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
}

.ds-icon--xs {
  width: 14px;
  height: 14px;
}

.ds-icon--sm {
  width: 16px;
  height: 16px;
}

.ds-icon--md {
  width: 18px;
  height: 18px;
}

.ds-icon--lg {
  width: 22px;
  height: 22px;
}

.ds-icon--xl {
  width: 28px;
  height: 28px;
}
</style>
