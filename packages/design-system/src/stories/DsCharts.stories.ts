import type { Meta, StoryObj } from '@storybook/vue3';
import DsCharts from '../vue/DsCharts.vue';

const meta = {
  title: 'Design System/Components/Charts',
  component: DsCharts,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['bar', 'line', 'doughnut', 'pie']
    },
    height: { control: 'number' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Graficos do Design System CVG HIS. Suporta Bar, Line, Doughnut e Pie via Chart.js.'
      }
    }
  }
} satisfies Meta<typeof DsCharts>;

export default meta;
type Story = StoryObj<typeof meta>;

const barData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    label: 'Atendimentos',
    data: [45, 52, 38, 60, 72],
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
    borderWidth: 1
  }]
};

const lineData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  datasets: [{
    label: 'Receita (R$)',
    data: [12000, 15800, 13200, 18500, 22000],
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: '#2563eb',
    borderWidth: 2,
    fill: true,
    tension: 0.4
  }]
};

const doughnutData = {
  labels: ['Consulta', 'Exame', 'Procedimento', 'Internacao'],
  datasets: [{
    data: [45, 25, 20, 10],
    backgroundColor: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626'],
    borderWidth: 0
  }]
};

export const BarChart: Story = {
  args: {
    type: 'bar',
    data: barData,
    height: 300
  },
  render: (args) => ({
    components: { DsCharts },
    setup: () => ({ args }),
    template: '<DsCharts v-bind="args" />'
  })
};

export const LineChart: Story = {
  args: {
    type: 'line',
    data: lineData,
    height: 300
  },
  render: (args) => ({
    components: { DsCharts },
    setup: () => ({ args }),
    template: '<DsCharts v-bind="args" />'
  })
};

export const DoughnutChart: Story = {
  args: {
    type: 'doughnut',
    data: doughnutData,
    height: 300
  },
  render: (args) => ({
    components: { DsCharts },
    setup: () => ({ args }),
    template: '<DsCharts v-bind="args" />'
  })
};

export const PieChart: Story = {
  args: {
    type: 'pie',
    data: {
      labels: ['Ativo', 'Inativo', 'Pendente'],
      datasets: [{
        data: [60, 25, 15],
        backgroundColor: ['#16a34a', '#dc2626', '#f59e0b'],
        borderWidth: 0
      }]
    },
    height: 300
  },
  render: (args) => ({
    components: { DsCharts },
    setup: () => ({ args }),
    template: '<DsCharts v-bind="args" />'
  })
};

export const AllCharts: Story = {
  name: 'All Types',
  render: () => ({
    components: { DsCharts },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Bar</p>
          <DsCharts type="bar" :data="barData" :height="200" />
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Line</p>
          <DsCharts type="line" :data="lineData" :height="200" />
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Doughnut</p>
          <DsCharts type="doughnut" :data="doughnutData" :height="200" />
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Pie</p>
          <DsCharts type="pie" :data="doughnutData" :height="200" />
        </div>
      </div>
    `
  }),
  setup: () => ({
    barData,
    lineData,
    doughnutData
  })
};
