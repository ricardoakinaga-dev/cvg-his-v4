import type { Meta, StoryObj } from '@storybook/vue';
import DsHealthStatus from '../vue/DsHealthStatus.vue';

const meta = {
  title: 'Design System/Components/HealthStatus',
  component: DsHealthStatus,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['healthy', 'unhealthy', 'degraded', 'unknown']
    },
    label: { control: 'text' },
    detail: { control: 'text' },
    pulse: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component:
          'HealthStatus exibe o estado de saude de um servico ou dependencia. Usado em dashboards de observabilidade para mostrar status de componentes.'
      }
    }
  }
} satisfies Meta<typeof DsHealthStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  args: {
    status: 'healthy',
    label: 'Online',
    detail: 'Database connected'
  },
  render: (args) => ({
    components: { DsHealthStatus },
    setup: () => ({ args }),
    template: '<DsHealthStatus v-bind="args" />'
  })
};

export const Unhealthy: Story = {
  args: {
    status: 'unhealthy',
    label: 'Offline',
    detail: 'Database unreachable'
  },
  render: (args) => ({
    components: { DsHealthStatus },
    setup: () => ({ args }),
    template: '<DsHealthStatus v-bind="args" />'
  })
};

export const Degraded: Story = {
  args: {
    status: 'degraded',
    label: 'Degradado',
    detail: '3 de 5 réplicas ativas'
  },
  render: (args) => ({
    components: { DsHealthStatus },
    setup: () => ({ args }),
    template: '<DsHealthStatus v-bind="args" />'
  })
};

export const LiveHealthy: Story = {
  args: {
    status: 'healthy',
    label: 'Sistema operacional',
    detail: 'CVG-HIS API',
    pulse: true
  },
  render: (args) => ({
    components: { DsHealthStatus },
    setup: () => ({ args }),
    template: '<DsHealthStatus v-bind="args" />'
  })
};

export const AllStatuses: Story = {
  name: 'All Statuses',
  render: () => ({
    components: { DsHealthStatus },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <DsHealthStatus status="healthy" label="Online" detail="Banco conectado" />
        <DsHealthStatus status="unhealthy" label="Offline" detail="Banco unreachable" />
        <DsHealthStatus status="degraded" label="Degradado" detail="2/3 réplicas" />
        <DsHealthStatus status="unknown" label="Desconhecido" />
      </div>
    `
  })
};
