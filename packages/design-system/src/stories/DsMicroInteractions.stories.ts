import type { Meta, StoryObj } from '@storybook/vue';
import DsButton from '../vue/DsButton.vue';
import DsAlert from '../vue/DsAlert.vue';
import DsSkeleton from '../vue/DsSkeleton.vue';

const meta = {
  title: 'Design System/Animation',
  parameters: {
    docs: {
      description: {
        component:
          'Catalogo de micro-interacoes do Design System CVG HIS. Botao press, skeleton shimmer/pulse, alert fade e hover lift.Todas as animacoes usam CSS custom properties do token system e respeitam `prefers-reduced-motion`.'
      }
    }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ─── Button Press ─── */
export const ButtonPress: Story = {
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
        <DsButton variant="primary" size="md">Primary</DsButton>
        <DsButton variant="secondary" size="md">Secondary</DsButton>
        <DsButton variant="ghost" size="md">Ghost</DsButton>
        <DsButton variant="danger" size="md">Danger</DsButton>
        <DsButton variant="success" size="md">Success</DsButton>
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Botao com hover lift (translateY -1px + shadow) e press scale (0.97). Transicao: 150ms ease.'
      }
    }
  }
};

/* ─── Button Loading ─── */
export const ButtonLoading: Story = {
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
        <DsButton variant="primary" :loading="true">Salvando...</DsButton>
        <DsButton variant="secondary" :loading="true">Processando</DsButton>
        <DsButton variant="danger" :loading="true">Excluindo</DsButton>
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Spinner circular com `animation: ds-spin 0.6s linear infinite`. Botao desabilitado visualmente durante loading.'
      }
    }
  }
};

/* ─── Skeleton Shimmer ─── */
export const SkeletonShimmer: Story = {
  render: () => ({
    components: { DsSkeleton },
    setup: () => ({
      variants: ['text', 'heading', 'avatar', 'button', 'card', 'table-row', 'table-cell']
    }),
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; width: 400px;">
        <DsSkeleton v-for="v in variants" :key="v" :variant="v" />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton com shimmer via `background-position` animation 1.5s ease-in-out infinite. Usa token `--color-skeleton`.'
      }
    }
  }
};

/* ─── Skeleton Pulse ─── */
export const SkeletonPulse: Story = {
  render: () => ({
    components: { DsSkeleton },
    setup: () => ({
      variants: ['text', 'card', 'avatar']
    }),
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; width: 400px;">
        <DsSkeleton
          v-for="v in variants"
          :key="v"
          :variant="v"
          :animate="true"
          style="animation: ds-skeleton-pulse 2s ease-in-out infinite;"
        />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton com pulse suave (opacity 1 → 0.5 → 1) como alternativa ao shimmer para contextos mais calmos.'
      }
    }
  }
};

/* ─── Alert WithDismiss ─── */
export const AlertInteractive: Story = {
  render: () => ({
    components: { DsAlert },
    setup: () => ({
      variants: ['info', 'success', 'warning', 'danger']
    }),
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; width: 400px;">
        <DsAlert variant="info" title="Informacao" dismissible>
          Dados carregados com sucesso.
        </DsAlert>
        <DsAlert variant="success" title="Sucesso" dismissible>
          Operacao conclua.
        </DsAlert>
        <DsAlert variant="warning" title="Atencao" dismissible>
          Verifique os dados.
        </DsAlert>
        <DsAlert variant="danger" title="Erro" dismissible>
          Algo deu errado.
        </DsAlert>
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Alert com botao dismiss (×). Hover no dismiss aumenta opacity de 0.6 para 1. Transicao suave.'
      }
    }
  }
};

/* ─── Hover Lift ─── */
export const HoverLift: Story = {
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; padding: 24px; background: var(--color-bg, #f0f4f8); border-radius: 12px;">
        <DsButton variant="primary" size="sm">Primary</DsButton>
        <DsButton variant="secondary" size="sm">Secondary</DsButton>
        <DsButton variant="ghost" size="sm">Ghost</DsButton>
        <DsButton variant="danger" size="sm">Danger</DsButton>
        <DsButton variant="success" size="sm">Success</DsButton>
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Hover lift: translateY(-1px) + shadow-md. Press: scale(0.97). Transicao: 150ms ease-default.'
      }
    }
  }
};

/* ─── Focus Ring ─── */
export const FocusRingShowcase: Story = {
  render: () => ({
    components: { DsButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px; background: var(--color-bg, #f0f4f8); border-radius: 12px; max-width: 300px;">
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0 0 8px;">Pressione Tab para ver os focus rings:</p>
        <DsButton variant="primary">Primary</DsButton>
        <DsButton variant="secondary">Secondary</DsButton>
        <DsButton variant="ghost">Ghost</DsButton>
        <input
          style="padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 14px;"
          placeholder="Focus me..."
        />
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Focus ring via `box-shadow: var(--shadow-focus)`. Cor configurable via token `--color-focus-ring`.'
      }
    }
  }
};
