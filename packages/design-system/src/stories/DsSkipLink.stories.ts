import type { Meta, StoryObj } from '@storybook/vue3';
import DsSkipLink from '../vue/DsSkipLink.vue';

const meta = {
  title: 'Design System/Components/SkipLink',
  component: DsSkipLink,
  tags: ['autodocs'],
  argTypes: {
    href: { control: 'text' },
    label: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Link de acessibilidade para pular blocos de navegacao repetitive. Usar como primeiro elemento focavel na pagina.'
      }
    }
  }
} satisfies Meta<typeof DsSkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: '#main-content',
    label: 'Pular para o conteúdo principal'
  },
  render: (args) => ({
    components: { DsSkipLink },
    setup: () => ({ args }),
    template: '<DsSkipLink v-bind="args" />'
  })
};

export const CustomText: Story = {
  args: {
    href: '#main',
    label: 'Ir direto para o main'
  },
  render: (args) => ({
    components: { DsSkipLink },
    setup: () => ({ args }),
    template: '<DsSkipLink v-bind="args" />'
  })
};
