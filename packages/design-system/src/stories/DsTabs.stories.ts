import type { Meta, StoryObj } from '@storybook/vue';
import DsTabs from '../vue/DsTabs.vue';

const meta = {
  title: 'Design System/Components/Tabs',
  component: DsTabs,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: 'number' },
    ariaLabel: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Navegacao por abas do Design System CVG HIS. Suporta contagem e desabilitacao.'
      }
    }
  }
} satisfies Meta<typeof DsTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const tabs = [
  { key: 0, label: 'Geral' },
  { key: 1, label: 'Detalhes' },
  { key: 2, label: 'Historico' }
];

const tabsWithCount = [
  { key: 0, label: 'Pendentes', count: 12 },
  { key: 1, label: 'Concluidos', count: 48 },
  { key: 2, label: 'Cancelados', count: 3 }
];

export const Default: Story = {
  args: {
    tabs: tabs,
    modelValue: 0
  },
  render: (args) => ({
    components: { DsTabs },
    setup: () => ({ args }),
    template: '<DsTabs v-bind="args" @update:modelValue="args.modelValue = $event" />'
  })
};

export const WithCount: Story = {
  args: {
    tabs: tabsWithCount,
    modelValue: 0
  },
  render: (args) => ({
    components: { DsTabs },
    setup: () => ({ args }),
    template: '<DsTabs v-bind="args" @update:modelValue="args.modelValue = $event" />'
  })
};

export const SecondTabActive: Story = {
  args: {
    tabs: tabs,
    modelValue: 1
  },
  render: (args) => ({
    components: { DsTabs },
    setup: () => ({ args }),
    template: '<DsTabs v-bind="args" @update:modelValue="args.modelValue = $event" />'
  })
};

export const AllTabs: Story = {
  name: 'All States',
  render: () => ({
    components: { DsTabs },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Tabs Padrao</p>
          <DsTabs :tabs="tabs" v-model="0" />
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Tabs com Contagem</p>
          <DsTabs :tabs="tabsWithCount" v-model="0" />
        </div>
      </div>
    `
  }),
  setup: () => ({ tabs, tabsWithCount })
};
