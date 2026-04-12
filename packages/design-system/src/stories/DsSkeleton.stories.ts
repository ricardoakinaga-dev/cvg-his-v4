import type { Meta, StoryObj } from '@storybook/vue3';
import DsSkeleton from '../vue/DsSkeleton.vue';

const meta = {
  title: 'Design System/Components/Skeleton',
  component: DsSkeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'heading', 'avatar', 'button', 'card', 'table-row', 'table-cell']
    },
    width: { control: 'text' },
    height: { control: 'text' },
    animate: { control: 'boolean' },
    ariaLabel: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Skeleton de carregamento do Design System CVG HIS para estados de leitura e estrutura.'
      }
    }
  }
} satisfies Meta<typeof DsSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    variant: 'text',
    width: '100%'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const Card: Story = {
  args: {
    variant: 'card',
    height: '140px'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const TableRow: Story = {
  args: {
    variant: 'table-row'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const Heading: Story = {
  args: {
    variant: 'heading'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const Avatar: Story = {
  args: {
    variant: 'avatar'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const Button: Story = {
  args: {
    variant: 'button'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const TableCell: Story = {
  args: {
    variant: 'table-cell'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  })
};

export const AllVariants: Story = {
  args: {
    variant: 'text'
  },
  render: () => ({
    components: { DsSkeleton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <DsSkeleton variant="text" />
        <DsSkeleton variant="heading" />
        <DsSkeleton variant="avatar" />
        <DsSkeleton variant="button" />
        <DsSkeleton variant="card" height="100px" />
        <DsSkeleton variant="table-row" />
        <DsSkeleton variant="table-cell" />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Todos os variantes de skeleton para referencia rapida.'
      }
    }
  }
};

export const NoAnimation: Story = {
  args: {
    variant: 'card',
    animate: false,
    height: '80px'
  },
  render: (args) => ({
    components: { DsSkeleton },
    setup: () => ({ args }),
    template: '<DsSkeleton v-bind="args" />'
  }),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton sem animacao para quando movimento excessivo deve ser evitado.'
      }
    }
  }
};
