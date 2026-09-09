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

export const StateMatrix: Story = {
  name: 'State matrix',
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: grid; gap: 16px; max-width: 720px;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <DsButton variant="primary">Idle / foco</DsButton>
          <DsButton variant="primary" disabled>Desabilitado</DsButton>
          <DsButton variant="primary" :loading="true">Carregando</DsButton>
          <DsButton variant="success" icon="check">Concluído</DsButton>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <DsButton variant="secondary" size="sm">Compacto</DsButton>
          <DsButton variant="secondary" size="md">Padrão</DsButton>
          <DsButton variant="secondary" size="lg">Confortável</DsButton>
        </div>
        <p style="margin: 0; color: var(--color-text-secondary, #475b6d);">
          O estado de sucesso é representado por uma resposta confirmada da operação;
          hover e pressão continuam complementares ao texto e ao foco visível.
        </p>
      </div>
    `
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
