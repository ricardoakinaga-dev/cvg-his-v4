import type { Meta, StoryObj } from '@storybook/vue';
import DsBreadcrumb from '../vue/DsBreadcrumb.vue';

const meta = {
  title: 'Design System/Navigation/Breadcrumb',
  component: DsBreadcrumb,
  tags: ['autodocs'],
  argTypes: {
    items: { control: 'object' },
    separator: { control: 'select', options: ['/', '›', '>', '→'] }
  },
  parameters: {
    docs: {
      description: {
        component:
          'Breadcrumb de navegacao do Design System CVG HIS. Suporta itens com e sem link, separador customizavel e acessibilidade WCAG 2.1 AA.'
      }
    }
  }
} satisfies Meta<typeof DsBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Inicio', href: '/' },
      { label: 'Modulo', href: '/modulo' },
      { label: 'Pagina Atual' }
    ]
  },
  render: (args) => ({
    components: { DsBreadcrumb },
    setup: () => ({ args }),
    template: '<DsBreadcrumb v-bind="args" />'
  })
};

export const ManyItems: Story = {
  args: {
    items: [
      { label: 'Inicio', href: '/' },
      { label: 'Cadastro', href: '/cadastro' },
      { label: 'Pacientes', href: '/pacientes' },
      { label: 'Joao Silva', href: '/pacientes/1' },
      { label: 'Prontuario' }
    ]
  },
  render: (args) => ({
    components: { DsBreadcrumb },
    setup: () => ({ args }),
    template: '<DsBreadcrumb v-bind="args" />'
  })
};

export const CustomSeparator: Story = {
  args: {
    items: [
      { label: 'Inicio', href: '/' },
      { label: 'Relatorios', href: '/relatorios' },
      { label: 'Faturamento' }
    ],
    separator: '›'
  },
  render: (args) => ({
    components: { DsBreadcrumb },
    setup: () => ({ args }),
    template: '<DsBreadcrumb v-bind="args" />'
  })
};
