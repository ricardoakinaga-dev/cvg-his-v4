import type { Meta, StoryObj } from '@storybook/vue3';
import DsInput from '../vue/DsInput.vue';

const meta = {
  title: 'Design System/Components/Input',
  component: DsInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'date', 'time', 'datetime-local']
    },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Campo de entrada do Design System CVG HIS. Suporta múltiplos tipos e validação.'
      }
    }
  }
} satisfies Meta<typeof DsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    label: 'Nome',
    placeholder: 'Digite seu nome',
    type: 'text'
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const Email: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'seu@email.com'
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const Password: Story = {
  args: {
    label: 'Senha',
    type: 'password',
    placeholder: 'Digite sua senha'
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    modelValue: 'email-invalido',
    error: 'Email inválido',
    required: true
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const WithHint: Story = {
  args: {
    label: 'Telefone',
    type: 'tel',
    hint: 'Formato: (00) 00000-0000'
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const Disabled: Story = {
  args: {
    label: 'Campo Bloqueado',
    modelValue: 'Valor fixo',
    disabled: true
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const Date: Story = {
  args: {
    label: 'Data',
    type: 'date'
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};

export const Number: Story = {
  args: {
    label: 'Quantidade',
    type: 'number',
    min: 0,
    max: 100
  },
  render: (args) => ({
    components: { DsInput },
    setup: () => ({ args }),
    template: '<DsInput v-bind="args" />'
  })
};
