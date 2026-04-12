import type { Meta, StoryObj } from '@storybook/vue';

const meta = {
  title: 'Design System/Theme',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Tema Dark/Light do Design System CVG HIS. Use o toolbar acima para alternar entre os temas. Os componentes devem responder as mudanças de tema automaticamente via CSS custom properties.'
      }
    }
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['light', 'dark'],
      description: 'Tema atual (controlado pelo Storybook toolbar)'
    }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  decorators: [
    () => ({
      components: {},
      template: '<div data-theme="light" style="padding: 24px; border-radius: 12px; min-width: 320px; transition: all 250ms ease;"><slot /></div>'
    })
  ],
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted);">Light Theme</span>
        </div>
        <div style="padding: 20px; background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border);">
          <h3 style="margin: 0 0 8px; color: var(--color-text); font-size: 18px;">Titulo de Exemplo</h3>
          <p style="margin: 0 0 16px; color: var(--color-text-secondary); font-size: 14px;">Este e um paragrafo de exemplo que demonstra as cores do tema claro.</p>
          <div style="display: flex; gap: 8px;">
            <button style="padding: 8px 16px; background: var(--color-primary-600); color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">Primario</button>
            <button style="padding: 8px 16px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; cursor: pointer;">Secundario</button>
          </div>
        </div>
        <div style="padding: 16px; background: var(--color-bg-subtle); border-radius: 8px; border: 1px solid var(--color-border);">
          <span style="color: var(--color-text-muted); font-size: 13px;">Background sutil</span>
        </div>
      </div>
    `
  })
};

export const Dark: Story = {
  decorators: [
    () => ({
      components: {},
      template: '<div data-theme="dark" style="padding: 24px; border-radius: 12px; min-width: 320px; transition: all 250ms ease;"><slot /></div>'
    })
  ],
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted);">Dark Theme</span>
        </div>
        <div style="padding: 20px; background: var(--color-surface); border-radius: 12px; border: 1px solid var(--color-border);">
          <h3 style="margin: 0 0 8px; color: var(--color-text); font-size: 18px;">Titulo de Exemplo</h3>
          <p style="margin: 0 0 16px; color: var(--color-text-secondary); font-size: 14px;">Este e um paragrafo de exemplo que demonstra as cores do tema escuro.</p>
          <div style="display: flex; gap: 8px;">
            <button style="padding: 8px 16px; background: var(--color-primary-600); color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">Primario</button>
            <button style="padding: 8px 16px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; cursor: pointer;">Secundario</button>
          </div>
        </div>
        <div style="padding: 16px; background: var(--color-bg-subtle); border-radius: 8px; border: 1px solid var(--color-border);">
          <span style="color: var(--color-text-muted); font-size: 13px;">Background sutil</span>
        </div>
      </div>
    `
  })
};

export const Tokens: Story = {
  render: () => ({
    setup() {
      const tokens = [
        { name: '--color-bg', var: '--color-bg' },
        { name: '--color-surface', var: '--color-surface' },
        { name: '--color-border', var: '--color-border' },
        { name: '--color-text', var: '--color-text' },
        { name: '--color-text-secondary', var: '--color-text-secondary' },
        { name: '--color-text-muted', var: '--color-text-muted' },
        { name: '--color-text-link', var: '--color-text-link' },
        { name: '--color-primary-600', var: '--color-primary-600' }
      ];
      return { tokens };
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
        <div v-for="token in tokens" :key="token.name" style="display: flex; flex-direction: column; gap: 6px;">
          <div :style="{ background: 'var(' + token.var + ')', height: '40px', borderRadius: '8px', border: '1px solid var(--color-border)' }"></div>
          <code style="font-size: 11px; color: var(--color-text-secondary);">{{ token.name }}</code>
        </div>
      </div>
    `
  })
};
