import type { Meta, StoryObj } from '@storybook/vue3';
import DsCheckbox from '../vue/DsCheckbox.vue';

const meta = {
  title: 'Design System/Components/Checkbox',
  component: DsCheckbox,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Checkbox do Design System CVG HIS. Selecao binaria com suporte a erro e required.'
      }
    }
  }
} satisfies Meta<typeof DsCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    label: 'Aceito os termos'
  },
  render: (args) => ({
    components: { DsCheckbox },
    setup: () => ({ args }),
    template: '<DsCheckbox v-bind="args" />'
  })
};

export const Checked: Story = {
  args: {
    label: 'Opcao marcada',
    modelValue: true
  },
  render: (args) => ({
    components: { DsCheckbox },
    setup: () => ({ args }),
    template: '<DsCheckbox v-bind="args" />'
  })
};

export const WithError: Story = {
  args: {
    label: 'Aceito os termos',
    error: 'Este campo e obrigatorio'
  },
  render: (args) => ({
    components: { DsCheckbox },
    setup: () => ({ args }),
    template: '<DsCheckbox v-bind="args" />'
  })
};

export const Disabled: Story = {
  args: {
    label: 'Opcao desabilitada',
    disabled: true
  },
  render: (args) => ({
    components: { DsCheckbox },
    setup: () => ({ args }),
    template: '<DsCheckbox v-bind="args" />'
  })
};

export const Required: Story = {
  args: {
    label: 'Confirmar revisao',
    required: true
  },
  render: (args) => ({
    components: { DsCheckbox },
    setup: () => ({ args }),
    template: '<DsCheckbox v-bind="args" />'
  })
};

export const AllStates: Story = {
  name: 'All States',
  render: () => ({
    components: { DsCheckbox },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <DsCheckbox label="Nao marcado" />
        <DsCheckbox label="Marcado" :model-value="true" />
        <DsCheckbox label="Desabilitado" disabled />
        <DsCheckbox label="Com erro" error="Campo obrigatorio" />
        <DsCheckbox label="Obrigatorio" required />
      </div>
    `
  })
};
