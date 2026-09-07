<template>
  <svg
    class="icon-symbol"
    :class="`icon-symbol--${resolvedIconName}`"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
    :aria-hidden="ariaLabel ? undefined : 'true'"
    :aria-label="ariaLabel"
    :role="ariaLabel ? 'img' : undefined"
  >
    <path v-for="(path, index) in iconPaths" :key="`${resolvedIconName}-${index}`" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const ICON_PATHS = {
  brand: [
    'M12 3.5 19 6v5.4c0 4.4-2.8 8-7 9.3-4.2-1.3-7-4.9-7-9.3V6L12 3.5Z',
    'M12 8v7',
    'M8.5 11.5h7',
    'M17.6 7.4h.01'
  ],
  dot: ['M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13Z', 'M12 10.5v3', 'M10.5 12h3'],
  home: [
    'M3.5 10.8 12 3.5l8.5 7.3',
    'M5.5 9.4v10.1h13V9.4',
    'M9.2 19.5v-5.3h5.6v5.3'
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  panel: ['M4 5h16v14H4z', 'M9 5v14', 'M13 10l2 2-2 2'],
  search: ['M20 20l-4.2-4.2', 'M10.8 17a6.2 6.2 0 1 1 0-12.4 6.2 6.2 0 0 1 0 12.4Z'],
  bell: [
    'M6 17.5h12',
    'M8 17.5V11a4 4 0 0 1 8 0v6.5',
    'M10 20h4',
    'M12 3.5v1'
  ],
  message: ['M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.7-.8L4 19.5l1.3-3.6A7.1 7.1 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 8 7Z', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01'],
  sun: [
    'M12 3v2',
    'M12 19v2',
    'm4.2 4.2 1.4 1.4',
    'm18.4 18.4 1.4 1.4',
    'M3 12h2',
    'M19 12h2',
    'm4.2 19.8 1.4-1.4',
    'm18.4 5.6 1.4-1.4',
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z'
  ],
  moon: ['M20 15.2A7.8 7.8 0 0 1 8.8 4a7.8 7.8 0 1 0 11.2 11.2Z'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-up': ['m6 15 6-6 6 6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'arrow-left': ['M19 12H5', 'm11 6-6 6 6 6'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  star: ['m12 3.8 2.5 5.1 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z'],
  tag: ['m4.5 5.5 7-2 9 9-8 8-9-9v-6Z', 'M8 8h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  calendar: ['M5 5.5h14v14H5z', 'M8 3.5v4', 'M16 3.5v4', 'M5 9.5h14', 'M8.5 13h2', 'M13.5 13h2', 'M8.5 16.5h2'],
  receipt: ['M6 3.5h12v17l-2.2-1.5-2.2 1.5-2.2-1.5-2.2 1.5L6 20.5v-17Z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  file: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12h6', 'M9 16h6'],
  clipboard: ['M8 5.5h8v-2H8z', 'M6 5.5h12v15H6z', 'M9 11h6', 'M9 15h4'],
  money: ['M12 4v16', 'M16 7.5c-.8-.8-2-1.2-3.7-1.2-2.3 0-3.8 1.1-3.8 2.7 0 4.4 7.5 1.6 7.5 5.5 0 1.6-1.4 2.7-3.8 2.7-1.7 0-3-.5-4-1.5'],
  'credit-card': ['M3.5 6.5h17v11h-17z', 'M3.5 10h17', 'M7 14h3'],
  package: ['m12 3.5 7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7L12 3.5Z', 'm4.8 7.8 7.2 4 7.2-4', 'M12 11.8v8.4'],
  hospital: ['M5 20V5.5h14V20', 'M8.5 8h7', 'M12 6.5v7', 'M8.5 10h7', 'M8 20v-4h2v4', 'M14 20v-4h2v4'],
  stethoscope: ['M6.5 4v5a3.5 3.5 0 0 0 7 0V4', 'M4.5 4h4', 'M12 4h4', 'M16 4v7a4 4 0 0 0 8 0v-1.5', 'M20 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z'],
  'test-tube': ['M9 3.5h6', 'M10 3.5v9.2l-3.4 5.5a1.8 1.8 0 0 0 1.5 2.8h7.8a1.8 1.8 0 0 0 1.5-2.8L14 12.7V3.5', 'M8 16.5h8'],
  microscope: ['M8 4h4v7H8z', 'M12 6h3a3 3 0 0 1 3 3v4', 'M6 20h13', 'M9 16a5 5 0 0 1 10 0v1H9z', 'M5 20a3 3 0 0 1 3-3'],
  syringe: ['m5 5 14 14', 'm7 3 4 4', 'M9 5 5 9', 'm15 17 4-4', 'M8 12l4-4', 'M4 20l3-3'],
  target: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 12h.01'],
  bed: ['M4 18.5V7', 'M4 15h16.5v3.5', 'M7 15V9.5h4.5A4.5 4.5 0 0 1 16 14v1', 'M20.5 15v3.5'],
  paw: ['M8.2 10.7c-1.7 0-3.2-1.6-3.2-3.5S6.1 4 7.7 4s2.8 1.5 2.8 3.4c0 1.8-1 3.3-2.3 3.3Z', 'M16 10.7c-1.3 0-2.3-1.5-2.3-3.3S15.1 4 16.7 4s2.7 1.3 2.7 3.2-1.5 3.5-3.4 3.5Z', 'M12 11c-2.5 0-5.4 2.7-5.4 5.6 0 2.3 1.8 3.4 3.5 2.5l1.9-1 1.9 1c1.7.9 3.5-.2 3.5-2.5C17.4 13.7 14.5 11 12 11Z'],
  user: ['M19 20a7 7 0 0 0-14 0', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  users: ['M16 20a5 5 0 0 0-10 0', 'M11 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M16 5.5a3 3 0 0 1 0 5.8', 'M18 13.5a4 4 0 0 1 3 3.5'],
  tools: ['m14.7 6.3 3-3a5 5 0 0 0 0 7l-8.9 8.9a2.1 2.1 0 1 1-3-3l8.9-8.9a5 5 0 0 0 7 0l-3 3'],
  wrench: ['M14.7 6.3a5 5 0 0 0 6.1 6.1l-8.2 8.2a2.1 2.1 0 0 1-3-3l8.2-8.2a5 5 0 0 0-3.1-8.9l-2.3 2.3 3 3-1.7 1.7-3-3-2.3 2.3a5 5 0 0 0 8.3 3.5Z'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M5 20h14'],
  download: ['M12 4v12', 'm7 11 5 5 5-5', 'M5 20h14'],
  link: ['M10 13.5 14 9.5', 'M7.5 16.5H6a4 4 0 0 1 0-8h3', 'M16.5 7.5H18a4 4 0 0 1 0 8h-3'],
  chart: ['M4 19.5V13', 'M10 19.5V7', 'M16 19.5V10', 'M22 19.5V4'],
  activity: ['M3 12h4l2.2-5 4.1 10 2.2-5H21'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3.5 2'],
  settings: ['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z', 'm19.4 15 .1.1-1.7 2.9-.2-.1a7.5 7.5 0 0 1-2.3 1.3v.2H8.7v-.2a7.5 7.5 0 0 1-2.3-1.3l-.2.1-1.7-2.9.1-.1a7.5 7.5 0 0 1 0-2.6l-.1-.1 1.7-2.9.2.1a7.5 7.5 0 0 1 2.3-1.3V8h6.6v.2a7.5 7.5 0 0 1 2.3 1.3l.2-.1 1.7 2.9-.1.1a7.5 7.5 0 0 1 0 2.6Z'],
  compass: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm15.5 8.5-2 5-5 2 2-5 5-2Z'],
  shield: ['M12 3.5 19 6v5.4c0 4.4-2.8 8-7 9.3-4.2-1.3-7-4.9-7-9.3V6L12 3.5Z'],
  'shield-check': ['M12 3.5 19 6v5.4c0 4.4-2.8 8-7 9.3-4.2-1.3-7-4.9-7-9.3V6L12 3.5Z', 'm8.5 12 2.2 2.2 4.8-5'],
  lock: ['M6 10h12v10H6z', 'M8.5 10V7a3.5 3.5 0 0 1 7 0v3', 'M12 14v2'],
  key: ['m14 10 7-7', 'm18 6 2 2', 'm15 9 2 2', 'M13.5 12.5a4.5 4.5 0 1 1-6.4-6.4 4.5 4.5 0 0 1 6.4 6.4Z'],
  'life-buoy': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'm5.6 5.6 3.6 3.6', 'm14.8 14.8 3.6 3.6', 'm18.4 5.6-3.6 3.6', 'm9.2 14.8-3.6 3.6'],
  'log-out': ['M10 4H5.5v16H10', 'M13 8l4 4-4 4', 'M8.5 12H17'],
  inbox: ['M4 5.5h16v13H4z', 'M4 14h4l1.5 2h5L16 14h4'],
  flask: ['M9 3.5h6', 'M10 3.5v6l-4.2 7.2A2.5 2.5 0 0 0 8 20.5h8a2.5 2.5 0 0 0 2.2-3.8L14 9.5v-6', 'M8.2 15h7.6'],
  droplet: ['M12 3.5S6.5 10 6.5 14.5a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z'],
  dna: ['M8 4c4 0 4 4 8 4', 'M8 20c4 0 4-4 8-4', 'M8 4v16', 'M16 8v8', 'M8 8h8', 'M8 12h8', 'M8 16h8'],
  bone: ['M8.5 10.5a2.5 2.5 0 1 0-3.4-3.6 2.5 2.5 0 1 0-3.6 3.4l8 8a2.5 2.5 0 1 0 3.6-3.4 2.5 2.5 0 1 0 3.4-3.6l-8-8a2.5 2.5 0 1 0-3.6 3.4'],
  palette: ['M12 3.5a8.5 8.5 0 1 0 0 17h1.5a1.8 1.8 0 0 0 .8-3.4 1.8 1.8 0 0 1 .8-3.4H17a3.5 3.5 0 0 0 3.5-3.5A6.8 6.8 0 0 0 12 3.5Z', 'M7.5 10h.01', 'M10 7h.01', 'M14 7h.01', 'M16.5 10h.01'],
  truck: ['M3.5 6h11v10h-11z', 'M14.5 10h3l3 3v3h-6', 'M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  factory: ['M4 20V9l6 3V9l6 3V6h4v14', 'M7 16h2', 'M12 16h2', 'M17 16h1'],
  building: ['M5 20V4h10v16', 'M15 9h4v11', 'M8 7h2', 'M8 11h2', 'M8 15h2', 'M17 13h.01', 'M17 16h.01'],
  briefcase: ['M4 8h16v12H4z', 'M9 8V5h6v3', 'M4 12h16', 'M10 12v2h4v-2'],
  map: ['M4 5.5 9.3 3l5.4 2.5L20 3v15.5l-5.3 2.5-5.4-2.5L4 21V5.5Z', 'M9.3 3v15.5', 'M14.7 5.5V21'],
  'check-circle': ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'm8 12 2.5 2.5L16 9'],
  'alert-triangle': ['m12 4 9 16H3L12 4Z', 'M12 9v5', 'M12 17h.01'],
  'heart-pulse': ['M20.5 12h-4l-2.2 5-4.1-10L8 12H3.5', 'M12 20.5S4 16 4 9.5a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 1.2-.3 2.2-.8 3.1'],
  help: ['M9.7 9a2.5 2.5 0 1 1 4.5 1.5c-.9 1-2.2 1.3-2.2 3', 'M12 17h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  filter: ['M4 5h16l-6.2 7v5l-3.6 2v-7L4 5Z'],
  refresh: ['M20 11a8 8 0 0 0-14.7-3L4 10', 'M4 5v5h5', 'M4 13a8 8 0 0 0 14.7 3L20 14', 'M20 19v-5h-5'],
  'more-horizontal': ['M5 12h.01', 'M12 12h.01', 'M19 12h.01']
} as const;

type IconName = keyof typeof ICON_PATHS;

const ICON_ALIASES: Record<string, IconName> = {
  'panel-left': 'panel',
  'panel-right': 'panel',
  'panel-horizontal': 'panel',
  'message-circle': 'message',
  'star-filled': 'star',
  favorite: 'star',
  reception: 'inbox',
  rc: 'inbox',
  'life-ring': 'life-buoy',
  logout: 'log-out',
  'sign-out': 'log-out',
  'arrow-up': 'upload',
  'arrow-down': 'download',
  calculator: 'chart',
  cart: 'package',
  mail: 'message',
  phone: 'message',
  megaphone: 'message',
  puzzle: 'settings',
  building: 'factory',
  microscope: 'microscope'
};

const LEGACY_CODEPOINT_ALIASES: Record<string, IconName> = {
  '1f3e0': 'home',
  '1fa7a': 'stethoscope',
  '1f4c5': 'calendar',
  '1f9fe': 'receipt',
  '1f4b8': 'money',
  '1f4b5': 'money',
  '1f4b0': 'money',
  '1f4e6': 'package',
  '1f3e5': 'hospital',
  '1f9ea': 'test-tube',
  '1f52c': 'microscope',
  '1f489': 'syringe',
  '1f3af': 'target',
  '1f6cf': 'bed',
  '1f43e': 'paw',
  '1f464': 'user',
  '1f6e0': 'tools',
  '2b06': 'upload',
  '1f4c4': 'file',
  '1f9ec': 'dna',
  '1f9b4': 'bone',
  '1f3a8': 'palette',
  '1f3f7': 'tag',
  '1f465': 'users',
  '1f517': 'link',
  '1f4a7': 'droplet',
  '2697': 'flask',
  '1f527': 'wrench',
  '1f4ca': 'chart',
  '1f4c8': 'chart',
  '1f4c9': 'chart',
  '1f3e2': 'factory',
  '1f3ed': 'factory',
  '1f4b3': 'credit-card',
  '1f552': 'clock',
  '1f9e9': 'settings',
  '2705': 'check-circle',
  '1f4e4': 'upload',
  '1f504': 'refresh',
  '1f6d2': 'package',
  '1f4e5': 'download',
  '23e9': 'arrow-right',
  '1f4df': 'message',
  '1f4f0': 'message',
  '1f4ac': 'message',
  '1f4f1': 'message',
  '1f4e7': 'message',
  '2699': 'settings',
  '1f512': 'lock',
  '1f5dd': 'key',
  '1f6aa': 'log-out',
  '1f198': 'help',
  '1f9ed': 'compass',
  '1f4a9': 'alert-triangle',
  '1f4cf': 'tools',
  '1f4d0': 'tools',
  '1f4f2': 'message',
  '1f9e0': 'activity',
  '2764': 'heart-pulse',
  '1f4a8': 'activity',
  '1f4c3': 'file',
  '1f4cb': 'clipboard',
  '1f4d1': 'clipboard',
  '1f4c6': 'calendar',
  '1f3db': 'building',
  '1f5c2': 'file',
  '1f4b6': 'activity',
  '1f4c7': 'user',
  '1f4da': 'file',
  '1f4dd': 'file',
  '1f4ce': 'file',
  '1f3e6': 'building',
  '1f3d9': 'building',
  '1f4bc': 'briefcase',
  '1f334': 'activity',
  '1f3ec': 'building',
  '1f510': 'lock',
  '1f50e': 'search',
  '1f522': 'chart',
  '1f4a1': 'help',
  '1f4a4': 'activity',
  '1fa78': 'droplet',
  '1faaa': 'user',
  '1f9ee': 'chart',
  '1f52e': 'compass',
  '1f5fa': 'map',
  '1f69a': 'truck',
  '1f9ec-fe0f': 'dna'
};

interface IconSymbolProps {
  name?: string;
  size?: number | string;
  strokeWidth?: number;
  label?: string;
}

const props = withDefaults(defineProps<IconSymbolProps>(), {
  name: 'dot',
  size: 18,
  strokeWidth: 1.8
});

function codepointKey(value: string): string {
  return Array.from(value.trim())
    .map((character) => character.codePointAt(0))
    .filter((codePoint): codePoint is number => codePoint !== undefined && codePoint !== 0xfe0f)
    .map((codePoint) => codePoint.toString(16))
    .join('-');
}

function resolveIconName(value: string): IconName {
  const normalized = value.trim().toLowerCase();
  if (normalized in ICON_PATHS) {
    return normalized as IconName;
  }

  const alias = ICON_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  return LEGACY_CODEPOINT_ALIASES[codepointKey(value)] ?? 'dot';
}

const resolvedIconName = computed(() => resolveIconName(props.name));
const iconPaths = computed(() => ICON_PATHS[resolvedIconName.value]);
const ariaLabel = computed(() => props.label?.trim() || undefined);
</script>

<style scoped>
.icon-symbol {
  display: block;
  flex: 0 0 auto;
  overflow: visible;
  color: currentColor;
}
</style>
