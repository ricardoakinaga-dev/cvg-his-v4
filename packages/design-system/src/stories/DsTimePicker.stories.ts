import type { Meta, StoryObj } from '@storybook/vue3';
import DsTimePicker from '../vue/DsTimePicker.vue';

const meta = {
  title: 'Design System/Components/TimePicker',
  component: DsTimePicker,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    required: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'TimePicker do Design System CVG HIS. Seletor de horario.'
      }
    }
  }
} satisfies Meta<typeof DsTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    label: 'Horario',
    placeholder: 'Selecione um horario'
  },
  render: (args) => ({
    components: { DsTimePicker },
    setup: () => ({ args }),
    template: '<DsTimePicker v-bind="args" />'
  })
};

export const WithValue: Story = {
  args: {
    label: 'Horario da Consulta',
    modelValue: '14:30'
  },
  render: (args) => ({
    components: { DsTimePicker },
    setup: () => ({ args }),
    template: '<DsTimePicker v-bind="args" />'
  })
};

export const Required: Story = {
  args: {
    label: 'Horario Obrigatorio',
    required: true
  },
  render: (args) => ({
    components: { DsTimePicker },
    setup: () => ({ args }),
    template: '<DsTimePicker v-bind="args" />'
  })
};

export const Disabled: Story = {
  args: {
    label: 'Campo Bloqueado',
    disabled: true,
    modelValue: '09:00'
  },
  render: (args) => ({
    components: { DsTimePicker },
    setup: () => ({ args }),
    template: '<DsTimePicker v-bind="args" />'
  })
};

export const WithError: Story = {
  args: {
    label: 'Horario',
    error: 'Horario fora do expediente',
    required: true
  },
  render: (args) => ({
    components: { DsTimePicker },
    setup: () => ({ args }),
    template: '<DsTimePicker v-bind="args" />'
  })
};
