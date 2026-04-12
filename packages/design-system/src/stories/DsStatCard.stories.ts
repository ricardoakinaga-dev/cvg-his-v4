import type { Meta, StoryObj } from '@storybook/vue';
import DsStatCard from '../vue/DsStatCard.vue';

const meta = {
  title: 'Design System/Components/StatCard',
  component: DsStatCard,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    icon: { control: 'text' },
    trend: {
      control: 'select',
      options: ['up', 'down', 'neutral']
    },
    trendValue: { control: 'text' },
    loading: { control: 'boolean' },
    error: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component:
          'StatCard e um kart de metrica do Design System CVG HIS. Exibe valor principal, rotulo, icone e tendencia com suporte a loading e error state.'
      }
    }
  }
} satisfies Meta<typeof DsStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Tutores',
    value: '1.284',
    icon: '👤',
    trend: 'up',
    trendValue: '+12%'
  },
  render: (args) => ({
    components: { DsStatCard },
    setup: () => ({ args }),
    template: '<DsStatCard v-bind="args" />'
  })
};

export const DownTrend: Story = {
  args: {
    label: 'Agendamentos',
    value: '342',
    icon: '📅',
    trend: 'down',
    trendValue: '-5%'
  },
  render: (args) => ({
    components: { DsStatCard },
    setup: () => ({ args }),
    template: '<DsStatCard v-bind="args" />'
  })
};

export const NeutralTrend: Story = {
  args: {
    label: 'Fila',
    value: '8',
    icon: '🏥',
    trend: 'neutral',
    trendValue: '0'
  },
  render: (args) => ({
    components: { DsStatCard },
    setup: () => ({ args }),
    template: '<DsStatCard v-bind="args" />'
  })
};

export const Loading: Story = {
  args: {
    label: 'Pacientes',
    loading: true
  },
  render: (args) => ({
    components: { DsStatCard },
    setup: () => ({ args }),
    template: '<DsStatCard v-bind="args" />'
  })
};

export const Error: Story = {
  args: {
    label: 'Tutores',
    error: 'Falha ao carregar'
  },
  render: (args) => ({
    components: { DsStatCard },
    setup: () => ({ args }),
    template: '<DsStatCard v-bind="args" />'
  })
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => ({
    components: { DsStatCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        <DsStatCard label="Tutores" value="1.284" icon="👤" trend="up" trendValue="+12%" />
        <DsStatCard label="Pacientes" value="2.847" icon="🐾" trend="up" trendValue="+8%" />
        <DsStatCard label="Agendamentos" value="342" icon="📅" trend="down" trendValue="-5%" />
        <DsStatCard label="Fila" value="8" icon="🏥" trend="neutral" trendValue="0" />
        <DsStatCard label="Loading..." loading />
        <DsStatCard label="Tutores" error="Falha ao carregar" />
      </div>
    `
  })
};
