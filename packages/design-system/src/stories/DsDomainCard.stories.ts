import type { Meta, StoryObj } from '@storybook/vue';
import DsDomainCard from '../vue/DsDomainCard.vue';

const meta = {
  title: 'Design System/Components/DomainCard',
  component: DsDomainCard,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    to: { control: 'text' },
    icon: { control: 'text' },
    description: { control: 'text' },
    badge: { control: 'number' },
    compact: { control: 'boolean' }
  },
  parameters: {
    docs: {
      description: {
        component:
          'DomainCard e um cartao de atalho de dominio do Design System CVG HIS. Usado no dashboard para navegar rapidamente entre dominios operacionais.'
      }
    }
  }
} satisfies Meta<typeof DsDomainCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Tutores',
    to: '/owners',
    icon: '👤',
    description: 'Cadastro de tutores e responsables'
  },
  render: (args) => ({
    components: { DsDomainCard },
    setup: () => ({ args }),
    template: '<DsDomainCard v-bind="args" />'
  })
};

export const WithBadge: Story = {
  args: {
    label: 'Pacientes',
    to: '/patients',
    icon: '🐾',
    description: 'Prontuario e historico clinico',
    badge: 23
  },
  render: (args) => ({
    components: { DsDomainCard },
    setup: () => ({ args }),
    template: '<DsDomainCard v-bind="args" />'
  })
};

export const Compact: Story = {
  args: {
    label: 'Agenda',
    to: '/appointments',
    icon: '📅',
    compact: true
  },
  render: (args) => ({
    components: { DsDomainCard },
    setup: () => ({ args }),
    template: '<DsDomainCard v-bind="args" />'
  })
};

export const AllDomains: Story = {
  name: 'All Domains',
  render: () => ({
    components: { DsDomainCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">
        <DsDomainCard label="Tutores" to="/owners" icon="👤" description="Cadastro de tutores" badge="12" />
        <DsDomainCard label="Pacientes" to="/patients" icon="🐾" description="Prontuario clinico" badge="48" />
        <DsDomainCard label="Agendamentos" to="/appointments" icon="📅" description="Agenda de consultas" />
        <DsDomainCard label="Fila" to="/queue" icon="🏥" description="Fila operacional" badge="5" />
        <DsDomainCard label="Atendimentos" to="/encounters" icon="🩺" description="Atendimentos em andamento" />
        <DsDomainCard label="Prontuario" to="/medical-records" icon="📋" description="Registros medicos" />
        <DsDomainCard label="Triagem" to="/triage" icon="⚡" description="Classificacao de risco" />
        <DsDomainCard label="Internacao" to="/inpatient" icon="🛏️" description="Leitos e internacoes" />
        <DsDomainCard label="Faturamento" to="/billing" icon="💳" description="Faturamento e recibos" />
        <DsDomainCard label="Caixa" to="/cash" icon="💰" description="Movimentacao financeira" />
        <DsDomainCard label="Governanca" to="/access-control" icon="🔐" description="Access control e audit" />
        <DsDomainCard label="Auditoria" to="/audit" icon="📊" description="Log de auditoria" />
      </div>
    `
  })
};

export const CompactGrid: Story = {
  name: 'Compact Grid',
  render: () => ({
    components: { DsDomainCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px;">
        <DsDomainCard label="Tutores" to="/owners" icon="👤" compact />
        <DsDomainCard label="Pacientes" to="/patients" icon="🐾" compact />
        <DsDomainCard label="Agenda" to="/appointments" icon="📅" compact />
        <DsDomainCard label="Fila" to="/queue" icon="🏥" compact />
        <DsDomainCard label="Atendimentos" to="/encounters" icon="🩺" compact />
        <DsDomainCard label="Prontuario" to="/medical-records" icon="📋" compact />
        <DsDomainCard label="Triagem" to="/triage" icon="⚡" compact />
        <DsDomainCard label="Billing" to="/billing" icon="💳" compact />
      </div>
    `
  })
};
