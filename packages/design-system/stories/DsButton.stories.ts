import type { Meta, StoryObj } from '@storybook/vue3-vite';
// CSF module: the Storybook indexer resolves this file as TypeScript.
import DsButton from '../src/vue/DsButton.vue';

const meta: Meta<typeof DsButton> = {
  title: 'Design System/Components/DsButton',
  component: DsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'danger', 'ghost'],
      description: 'Visual style variant'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size'
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button'
    },
    tag: {
      control: 'select',
      options: ['button', 'a'],
      description: 'HTML tag to render'
    },
    target: {
      control: 'text',
      description: 'Native anchor target, such as _blank or _self'
    },
    rel: {
      control: 'text',
      description: 'Native anchor relationship metadata'
    },
    download: {
      control: 'text',
      description: 'Native anchor download attribute'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Vue components receive their label through the default slot. Keep the
// `children` control useful in Storybook by adapting the arg to that slot
// explicitly instead of relying on an undeclared component prop.
const renderButton = (args: Record<string, unknown>) => ({
  components: { DsButton },
  setup: () => ({ args }),
  template: '<DsButton v-bind="args">{{ args.children }}</DsButton>'
});

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  },
  render: renderButton
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  },
  render: renderButton
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success Button'
  },
  render: renderButton
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button'
  },
  render: renderButton
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button'
  },
  render: renderButton
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...'
  },
  render: renderButton
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled'
  },
  render: renderButton
};

export const StateMatrix: Story = {
  name: 'State matrix',
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: grid; gap: 16px; max-width: 720px;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <DsButton variant="primary">Idle / foco</DsButton>
          <DsButton variant="primary" disabled>Desabilitado</DsButton>
          <DsButton variant="primary" :loading="true">Carregando</DsButton>
          <DsButton variant="success" icon="check">Concluído</DsButton>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <DsButton variant="secondary" size="sm">Compacto</DsButton>
          <DsButton variant="secondary" size="md">Padrão</DsButton>
          <DsButton variant="secondary" size="lg">Confortável</DsButton>
        </div>
        <p style="margin: 0; color: var(--color-text-secondary, #475b6d);">
          O sucesso representa uma resposta confirmada; hover e pressão são
          complementares ao texto e ao foco visível.
        </p>
      </div>
    `
  })
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small Button'
  },
  render: renderButton
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large Button'
  },
  render: renderButton
};
