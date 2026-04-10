import type { Meta, StoryObj } from '@storybook/vue3';
import DsDatePicker from '../vue/DsDatePicker.vue';

const meta = {
  title: 'Design System/Components/DatePicker',
  component: DsDatePicker,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    showTime: { control: 'boolean' },
    locale: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'DatePicker do Design System CVG HIS. Seletor de data com calendario.'
      }
    }
  }
} satisfies Meta<typeof DsDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    label: 'Data',
    placeholder: 'Selecione uma data'
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};

export const WithTime: Story = {
  args: {
    label: 'Data e Hora',
    showTime: true
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};

export const WithMinMax: Story = {
  args: {
    label: 'Periodo',
    min: new Date(new Date().setDate(new Date().getDate() - 7)),
    max: new Date(new Date().setDate(new Date().getDate() + 30))
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};

export const Required: Story = {
  args: {
    label: 'Data Obrigatoria',
    required: true
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};

export const Disabled: Story = {
  args: {
    label: 'Campo Bloqueado',
    disabled: true,
    modelValue: new Date()
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};

export const WithError: Story = {
  args: {
    label: 'Data',
    error: 'Data invalida',
    required: true
  },
  render: (args) => ({
    components: { DsDatePicker },
    setup: () => ({ args }),
    template: '<DsDatePicker v-bind="args" />'
  })
};
