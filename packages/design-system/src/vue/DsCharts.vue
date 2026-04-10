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

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#334155',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: {
        family: 'Inter, system-ui, sans-serif'
      },
      bodyFont: {
        family: 'Inter, system-ui, sans-serif'
      },
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: props.type === 'bar' || props.type === 'line' ? {
    x: {
      grid: {
        color: '#e2e8f0'
      },
      ticks: {
        color: '#64748b',
        font: {
          family: 'Inter, system-ui, sans-serif'
        }
      }
    },
    y: {
      grid: {
        color: '#e2e8f0'
      },
      ticks: {
        color: '#64748b',
        font: {
          family: 'Inter, system-ui, sans-serif'
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
  <div class="ds-charts" :style="{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }">
    <component
      :is="chartComponent"
      ref="chartRef"
      :data="data"
      :options="mergedOptions"
    />
  </div>
</template>

<style scoped>
.ds-charts {
  position: relative;
  min-height: 100px;
}

.ds-charts canvas {
  max-width: 100%;
}
</style>