import type { Meta, StoryObj } from '@storybook/vue3';
import DsCard from '../vue/DsCard.vue';

const meta = {
  title: 'Design System/Components/Card',
  component: DsCard,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'compact']
    },
    interactive: { control: 'boolean' },
    title: { control: 'text' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Card do Design System CVG HIS. Container de conteudo.'
      }
    }
  }
} satisfies Meta<typeof DsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Card Padrao',
    children: 'Conteudo do card'
  },
  render: (args) => ({
    components: { DsCard },
    setup: () => ({ args }),
    template: '<DsCard v-bind="args"><template #default>Conteudo do card</template></DsCard>'
  })
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    title: 'Card Elevado'
  },
  render: (args) => ({
    components: { DsCard },
    setup: () => ({ args }),
    template: '<DsCard v-bind="args"><template #default>Card com sombra elevada</template></DsCard>'
  })
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    title: 'Card com Borda'
  },
  render: (args) => ({
    components: { DsCard },
    setup: () => ({ args }),
    template: '<DsCard v-bind="args"><template #default>Card com borda</template></DsCard>'
  })
};

export const Compact: Story = {
  args: {
    variant: 'compact',
    title: 'Card Compacto'
  },
  render: (args) => ({
    components: { DsCard },
    setup: () => ({ args }),
    template: '<DsCard v-bind="args"><template #default>Card compacto</template></DsCard>'
  })
};

export const Interactive: Story = {
  args: {
    variant: 'elevated',
    interactive: true,
    title: 'Card Interativo'
  },
  render: (args) => ({
    components: { DsCard },
    setup: () => ({ args }),
    template: '<DsCard v-bind="args"><template #default>Clique ou passe o mouse</template></DsCard>'
  })
};
