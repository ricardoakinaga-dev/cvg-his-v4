import type { Meta, StoryObj } from '@storybook/vue3';
import DsSpinner from '../vue/DsSpinner.vue';

const meta = {
  title: 'Design System/Components/Spinner',
  component: DsSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    inline: { control: 'boolean' },
    ariaLabel: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Spinner de carregamento do Design System CVG HIS.'
      }
    }
  }
} satisfies Meta<typeof DsSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    size: 'sm'
  },
  render: (args) => ({
    components: { DsSpinner },
    setup: () => ({ args }),
    template: '<DsSpinner v-bind="args" />'
  })
};

export const Medium: Story = {
  args: {
    size: 'md'
  },
  render: (args) => ({
    components: { DsSpinner },
    setup: () => ({ args }),
    template: '<DsSpinner v-bind="args" />'
  })
};

export const Large: Story = {
  args: {
    size: 'lg'
  },
  render: (args) => ({
    components: { DsSpinner },
    setup: () => ({ args }),
    template: '<DsSpinner v-bind="args" />'
  })
};

export const Inline: Story = {
  args: {
    size: 'sm',
    inline: true
  },
  render: (args) => ({
    components: { DsSpinner },
    setup: () => ({ args }),
    template: '<div>Carregando <DsSpinner v-bind="args" /> dados...</div>'
  })
};
