import type { Meta, StoryObj } from '@storybook/vue3';
import DsRadio from '../vue/DsRadio.vue';
import { ref } from 'vue';

const meta = {
  title: 'Design System/Components/Radio',
  component: DsRadio,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Radio do Design System CVG HIS. Selecao exclusivo com suporte a erro e disabled.'
      }
    }
  }
} satisfies Meta<typeof DsRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Option1: Story = {
  args: {
    label: 'Opcao 1',
    value: 'option1',
    name: 'group1'
  },
  render: (args) => ({
    components: { DsRadio },
    setup: () => ({ args }),
    template: `
      <div>
        <DsRadio v-bind="args" v-model="selected" />
        <DsRadio label="Opcao 2" value="option2" name="group1" v-model="selected" style="margin-left: 16px;" />
      </div>
    `,
    setup() {
      const selected = ref('option1');
      return { ...args, selected };
    }
  })
};

export const Option2: Story = {
  args: {
    label: 'Opcao 2',
    value: 'option2',
    name: 'group2'
  },
  render: (args) => ({
    components: { DsRadio },
    setup: () => ({ args }),
    template: `
      <div>
        <DsRadio label="Opcao 1" value="option1" name="group2" v-model="selected" />
        <DsRadio v-bind="args" v-model="selected" style="margin-left: 16px;" />
      </div>
    `,
    setup() {
      const selected = ref('option2');
      return { ...args, selected };
    }
  })
};

export const WithError: Story = {
  args: {
    label: 'Selecione uma opcao',
    value: 'option1',
    name: 'errorGroup',
    error: 'Escolha uma das opcoes'
  },
  render: (args) => ({
    components: { DsRadio },
    setup: () => ({ args }),
    template: `
      <div>
        <DsRadio v-bind="args" v-model="selected" />
        <DsRadio label="Opcao 2" value="option2" name="errorGroup" v-model="selected" style="margin-left: 16px;" />
      </div>
    `,
    setup() {
      const selected = ref(null);
      return { ...args, selected };
    }
  })
};

export const Disabled: Story = {
  args: {
    label: 'Opcao desabilitada',
    value: 'disabled',
    name: 'disabledGroup',
    disabled: true
  },
  render: (args) => ({
    components: { DsRadio },
    setup: () => ({ args }),
    template: `
      <div>
        <DsRadio label="Opcao ativa" value="active" name="disabledGroup" />
        <DsRadio v-bind="args" v-model="selected" style="margin-left: 16px;" />
      </div>
    `,
    setup() {
      const selected = ref('');
      return { ...args, selected };
    }
  })
};

export const Group: Story = {
  name: 'Radio Group',
  render: () => ({
    components: { DsRadio },
    setup: () => {
      const selected = ref('option2');
      return { selected };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <p style="font-size: 14px; color: #334155; font-weight: 500;">Selecione o turno</p>
        <DsRadio label="Manha" value="manha" name="turno" v-model="selected" />
        <DsRadio label="Tarde" value="tarde" name="turno" v-model="selected" />
        <DsRadio label="Noite" value="noite" name="turno" v-model="selected" />
        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Selecionado: {{ selected }}</p>
      </div>
    `
  })
};
