import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export interface WidgetConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  order: number;
}

interface WidgetRegistry {
  [role: string]: WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', label: 'KPIs Operacionais', icon: '📊', visible: true, order: 0 },
  { id: 'shortcuts', label: 'Domínios', icon: '🚀', visible: true, order: 1 },
  { id: 'recent', label: 'Recentes', icon: '🧭', visible: true, order: 2 },
  { id: 'favorites', label: 'Favoritos', icon: '★', visible: true, order: 3 }
];

const WIDGET_STORAGE_KEY = 'cvg-his-v2:spa:widget-prefs';

function readWidgets(fallback: WidgetConfig[]): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as WidgetConfig[];
  } catch {
    return fallback;
  }
}

function writeWidgets(widgets: WidgetConfig[]): void {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    /* noop */
  }
}

export const useWidgetStore = defineStore('widgets', {
  state: () => ({
    widgets: [] as WidgetConfig[]
  }),

  getters: {
    visibleWidgets: (state) =>
      state.widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order),

    isWidgetVisible: (state) => (id: string) =>
      state.widgets.find((w) => w.id === id)?.visible ?? true
  },

  actions: {
    initWidgets() {
      const authStore = useAuthStore();
      const primaryRole = authStore.user.roles[0] ?? 'operator';
      const key = `role:${primaryRole}`;
      const stored = readWidgets([]);
      const roleWidgets = stored.filter((w) => w.id.startsWith(key));
      if (roleWidgets.length > 0) {
        this.widgets = roleWidgets;
      } else {
        this.widgets = DEFAULT_WIDGETS.map((w) => ({ ...w }));
      }
    },

    toggleWidget(id: string) {
      const widget = this.widgets.find((w) => w.id === id);
      if (widget) {
        widget.visible = !widget.visible;
        writeWidgets(this.widgets);
      }
    },

    reorderWidgets(ordered: WidgetConfig[]) {
      this.widgets = ordered.map((w, i) => ({ ...w, order: i }));
      writeWidgets(this.widgets);
    },

    resetWidgets() {
      this.widgets = DEFAULT_WIDGETS.map((w) => ({ ...w }));
      writeWidgets(this.widgets);
    }
  }
});
