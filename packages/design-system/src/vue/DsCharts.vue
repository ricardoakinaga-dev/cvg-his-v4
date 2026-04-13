<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export type ChartType = 'bar' | 'line' | 'doughnut' | 'pie';

export interface DsChartsProps {
  type?: ChartType;
  data: {
    labels: string[];
    datasets: {
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
    }[];
  };
  options?: Record<string, unknown>;
  height?: number;
  width?: number | string;
  ariaLabel?: string;
  ariaDescription?: string;
}

const props = withDefaults(defineProps<DsChartsProps>(), {
  type: 'bar',
  height: 300
});

const chartRef = shallowRef<any>(null);

const chartComponent = computed(() => {
  switch (props.type) {
    case 'line':
      return Line;
    case 'doughnut':
      return Doughnut;
    case 'pie':
      return Pie;
    default:
      return Bar;
  }
});

const accessibleDescription = computed(() => {
  if (props.ariaDescription) return props.ariaDescription;
  const labels = props.data.labels;
  const values = props.data.datasets[0]?.data;
  if (!labels || !values) return '';
  return labels.map((label, i) => `${label}: ${values[i]}`).join(', ');
});

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'var(--color-text-secondary, #475569)',
        font: {
          family: 'var(--font-sans, Inter, system-ui, sans-serif)',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'var(--color-neutral-800, #1e293b)',
      titleFont: {
        family: 'var(--font-sans, Inter, system-ui, sans-serif)'
      },
      bodyFont: {
        family: 'var(--font-sans, Inter, system-ui, sans-serif)'
      },
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: props.type === 'bar' || props.type === 'line' ? {
    x: {
      grid: {
        color: 'var(--color-border, #e2e8f0)'
      },
      ticks: {
        color: 'var(--color-text-muted, #64748b)',
        font: {
          family: 'var(--font-sans, Inter, system-ui, sans-serif)'
        }
      }
    },
    y: {
      grid: {
        color: 'var(--color-border, #e2e8f0)'
      },
      ticks: {
        color: 'var(--color-text-muted, #64748b)',
        font: {
          family: 'var(--font-sans, Inter, system-ui, sans-serif)'
        }
      }
    }
  } : undefined
};

const mergedOptions = computed(() => ({
  ...defaultOptions,
  ...props.options
}));
</script>

<template>
  <figure
    class="ds-charts"
    role="img"
    :aria-label="ariaLabel || 'Gráfico'"
    :aria-describedby="accessibleDescription ? 'ds-charts-desc' : undefined"
    :style="{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }"
  >
    <component
      :is="chartComponent"
      ref="chartRef"
      :data="data"
      :options="mergedOptions"
    />
    <span id="ds-charts-desc" class="sr-only">{{ accessibleDescription }}</span>
  </figure>
</template>

<style scoped>
.ds-charts {
  position: relative;
  min-height: 100px;
}

.ds-charts canvas {
  max-width: 100%;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>