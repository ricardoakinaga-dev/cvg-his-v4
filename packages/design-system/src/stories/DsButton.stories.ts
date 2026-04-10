import type { Meta, StoryObj } from '@storybook/vue3';
import DsButton from '../vue/DsButton.vue';

const meta = {
  title: 'Design System/Components/Button',
  component: DsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'success']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset']
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Botão primário do Design System CVG HIS. Suporta múltiplas variantes, tamanhos e estados.'
      }
    }
  }
} satisfies Meta<typeof DsButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Botão Primário'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Botao Primario</DsButton>'
  })
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Botão Secundário'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Botao Secundario</DsButton>'
  })
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Botão Perigoso'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Botao Perigoso</DsButton>'
  })
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Botão de Sucesso'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Botao de Sucesso</DsButton>'
  })
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Botão Ghost'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Botao Ghost</DsButton>'
  })
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Carregando...'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Carregando...</DsButton>'
  })
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Desabilitado'
  },
  render: (args) => ({
    components: { DsButton },
    setup: () => ({ args }),
    template: '<DsButton v-bind="args">Desabilitado</DsButton>'
  })
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <DsButton variant="primary">Primary</DsButton>
        <DsButton variant="secondary">Secondary</DsButton>
        <DsButton variant="ghost">Ghost</DsButton>
        <DsButton variant="danger">Danger</DsButton>
        <DsButton variant="success">Success</DsButton>
      </div>
    `
  })
};
