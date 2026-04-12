import type { Meta, StoryObj } from '@storybook/vue3';
import DsModal from '../vue/DsModal.vue';

const meta = {
  title: 'Design System/Components/Modal',
  component: DsModal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl']
    },
    closable: { control: 'boolean' },
    teleport: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component: 'Modal do Design System CVG HIS. Dialogo sobreposto com header, body e footer opcional.'
      }
    }
  }
} satisfies Meta<typeof DsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: 'Titulo do Modal',
    size: 'md',
    closable: true
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: `
      <div style="min-height: 200px;">
        <DsModal v-bind="args" @close="args.open = false">
          <p>Conteudo do modal. Pode conter texto, formulários ou qualquer elemento.</p>
          <p style="margin-top: 12px;">Clique em fechar ou fora do modal para dispensar.</p>
        </DsModal>
      </div>
    `
  })
};

export const Small: Story = {
  args: {
    open: true,
    title: 'Modal Pequeno',
    size: 'sm',
    closable: true
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: '<DsModal v-bind="args" @close="args.open = false"><p>Conteudo minimalista.</p></DsModal>'
  })
};

export const Large: Story = {
  args: {
    open: true,
    title: 'Modal Grande',
    size: 'lg',
    closable: true
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: '<DsModal v-bind="args" @close="args.open = false"><p>Conteudo em modal grande.</p></DsModal>'
  })
};

export const ExtraLarge: Story = {
  args: {
    open: true,
    title: 'Modal Extra Grande',
    size: 'xl',
    closable: true
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: '<DsModal v-bind="args" @close="args.open = false"><p>Conteudo em modal extra grande.</p></DsModal>'
  })
};

export const WithoutCloseButton: Story = {
  args: {
    open: true,
    title: 'Modal sem Botao de Fechar',
    size: 'md',
    closable: false
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: '<DsModal v-bind="args"><p>Este modal so pode ser fechado clicando fora.</p></DsModal>'
  })
};

export const WithFooter: Story = {
  args: {
    open: true,
    title: 'Modal com Footer',
    size: 'md',
    closable: true
  },
  render: (args) => ({
    components: { DsModal },
    setup: () => ({ args }),
    template: `
      <DsModal v-bind="args" @close="args.open = false">
        <p>Conteudo principal do modal.</p>
        <template #footer>
          <button class="ds-btn ds-btn--secondary ds-btn--md">Cancelar</button>
          <button class="ds-btn ds-btn--primary ds-btn--md">Confirmar</button>
        </template>
      </DsModal>
    `
  })
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => ({
    components: { DsModal },
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Small (400px)</p>
          <DsModal open title="Small" size="sm">
            <p>Modal pequeno.</p>
          </DsModal>
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Medium (560px)</p>
          <DsModal open title="Medium" size="md">
            <p>Modal medio.</p>
          </DsModal>
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Large (768px)</p>
          <DsModal open title="Large" size="lg">
            <p>Modal grande.</p>
          </DsModal>
        </div>
        <div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Extra Large (1024px)</p>
          <DsModal open title="Extra Large" size="xl">
            <p>Modal extra grande.</p>
          </DsModal>
        </div>
      </div>
    `
  })
};
