import type { Meta, StoryObj } from '@storybook/vue';
import DsSidebarNav from '../vue/DsSidebarNav.vue';

const meta = {
  title: 'Design System/Navigation/SidebarNav',
  component: DsSidebarNav,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'SidebarNav e um componente de navegacao em lista do Design System CVG HIS. Suporta grupos com itens, collapse e itens ativos.'
      }
    }
  }
} satisfies Meta<typeof DsSidebarNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleGroups = [
  {
    label: 'Cadastro',
    icon: '👥',
    items: [
      { label: 'Tutores', href: '/tutors', icon: '👤' },
      { label: 'Pacientes', href: '/patients', icon: '🏥', active: true },
      { label: 'Agenda', href: '/schedule', icon: '📅' }
    ]
  },
  {
    label: 'Atendimento',
    icon: '🩺',
    items: [
      { label: 'Triagem', href: '/triage', icon: '⚡' },
      { label: 'Prontuario', href: '/records', icon: '📋' }
    ]
  }
];

export const Default: Story = {
  args: {
    groups: sampleGroups,
    collapsed: false
  },
  render: (args) => ({
    components: { DsSidebarNav },
    setup: () => ({ args }),
    template: '<DsSidebarNav v-bind="args" />'
  })
};

export const Collapsed: Story = {
  args: {
    groups: sampleGroups,
    collapsed: true
  },
  render: (args) => ({
    components: { DsSidebarNav },
    setup: () => ({ args }),
    template: '<DsSidebarNav v-bind="args" />'
  })
};
