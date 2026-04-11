import type { Meta, StoryObj } from '@storybook/vue';
import DsInput from '../src/vue/DsInput.vue';

const meta: Meta<typeof DsInput> = {
  title: 'Design System/Components/DsInput',
  component: DsInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'search', 'url', 'textarea', 'select'],
      description: 'Input type'
    },
    label: { control: 'text', description: 'Input label' },
    hint: { control: 'text', description: 'Help text below input' },
    error: { control: 'text', description: 'Error message' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    placeholder: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'seu@email.com'
  }
};

export const WithHint: Story = {
  args: {
    label: 'Senha',
    type: 'password',
    hint: 'Mínimo 12 caracteres com letra e número'
  }
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    modelValue: 'invalid',
    error: 'Email inválido'
  }
};

export const Disabled: Story = {
  args: {
    label: 'Campo bloqueado',
    type: 'text',
    modelValue: 'Não editável',
    disabled: true
  }
};

export const Required: Story = {
  args: {
    label: 'Nome completo',
    type: 'text',
    required: true,
    placeholder: 'Seu nome'
  }
};
