import type { Meta, StoryObj } from '@storybook/vue3';
import DsAlert from '../vue/DsAlert.vue';

const meta = {
  title: 'Design System/Components/Alert',
  component: DsAlert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger']
    },
    title: { control: 'text' },
    dismissible: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Alerta do Design System CVG HIS. Usado para feedback contextual.'
      }
    }
  }
} satisfies Meta<typeof DsAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Informacao',
    children: 'Esta e uma mensagem informativa.'
  },
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args">Esta e uma mensagem informativa.</DsAlert>'
  })
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Sucesso',
    children: 'Operacao realizada com sucesso!'
  },
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args">Operacao realizada com sucesso!</DsAlert>'
  })
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Atencao',
    children: 'Verifique os dados antes de continuar.'
  },
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args">Verifique os dados antes de continuar.</DsAlert>'
  })
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    title: 'Erro',
    children: 'Ocorreu um erro ao processar sua solicitacao.'
  },
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args">Ocorreu um erro ao processar sua solicitacao.</DsAlert>'
  })
};

export const Dismissible: Story = {
  args: {
    variant: 'info',
    dismissible: true,
    title: 'Alerta dispensavel',
    children: 'Voce pode dispensar este alerta.'
  },
  render: (args) => ({
    components: { DsAlert },
    setup: () => ({ args }),
    template: '<DsAlert v-bind="args">Voce pode dispensar este alerta.</DsAlert>'
  })
};
