import type { Meta, StoryObj } from '@storybook/vue3';
import DsBadge from '../vue/DsBadge.vue';

const meta = {
  title: 'Design System/Components/Badge',
  component: DsBadge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger', 'info']
    },
    size: {
      control: 'select',
      options: ['sm', 'md']
    },
    dot: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Badge de status do Design System CVG HIS. Usado para indicar estados.'
      }
    }
  }
} satisfies Meta<typeof DsBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Default</DsBadge>'
  })
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Ativo'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Ativo</DsBadge>'
  })
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Pendente'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Pendente</DsBadge>'
  })
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Cancelado'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Cancelado</DsBadge>'
  })
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Em Andamento'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Em Andamento</DsBadge>'
  })
};

export const WithDot: Story = {
  args: {
    variant: 'success',
    dot: true,
    children: 'Online'
  },
  render: (args) => ({
    components: { DsBadge },
    setup: () => ({ args }),
    template: '<DsBadge v-bind="args">Online</DsBadge>'
  })
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => ({
    components: { DsBadge },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <DsBadge variant="default">Default</DsBadge>
        <DsBadge variant="success">Success</DsBadge>
        <DsBadge variant="warning">Warning</DsBadge>
        <DsBadge variant="danger">Danger</DsBadge>
        <DsBadge variant="info">Info</DsBadge>
      </div>
    `
  })
};
