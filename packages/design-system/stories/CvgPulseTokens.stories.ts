import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { cvgPulseDarkTheme, cvgPulseLightTheme } from '../src/themes/index';
import { cvgPulseTokens } from '../src/tokens/index';

const meta = {
  title: 'Design System/Tokens/CVG Pulse',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Prancha canônica dos tokens CVG Pulse. Os dois temas são renderizados lado a lado e continuam vinculados às CSS custom properties; o toolbar do Storybook não é necessário para comparar light e dark.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const storyStyles = `
  .cvg-pulse-story {
    box-sizing: border-box;
    width: 100%;
    min-height: 100%;
    padding: clamp(20px, 3vw, 48px);
    color: var(--content-primary);
    font-family: var(--type-family-interface);
    background: var(--material-canvas);

    /* Capture the runtime motion source before each themed board rebinds it. */
    --cvg-pulse-motion-source-duration-hover: var(--motion-duration-hover);
    --cvg-pulse-motion-source-duration-press: var(--motion-duration-press);
    --cvg-pulse-motion-source-duration-detail: var(--motion-duration-detail);
    --cvg-pulse-motion-source-duration-drawer: var(--motion-duration-drawer);
    --cvg-pulse-motion-source-duration-route: var(--motion-duration-route);
    --cvg-pulse-motion-source-duration-exit: var(--motion-duration-exit);
    --cvg-pulse-motion-source-ease-enter: var(--motion-ease-enter);
    --cvg-pulse-motion-source-ease-state: var(--motion-ease-state);
    --cvg-pulse-motion-source-ease-exit: var(--motion-ease-exit);
    --cvg-pulse-motion-source-distance-press: var(--motion-distance-press);
    --cvg-pulse-motion-source-distance-detail: var(--motion-distance-detail);
    --cvg-pulse-motion-source-distance-drawer: var(--motion-distance-drawer);
    --cvg-pulse-motion-source-distance-route: var(--motion-distance-route);
  }

  .cvg-pulse-story *,
  .cvg-pulse-story *::before,
  .cvg-pulse-story *::after {
    box-sizing: border-box;
  }

  .cvg-pulse-story__intro {
    width: min(100%, 1480px);
    margin: 0 auto clamp(20px, 3vw, 32px);
    display: grid;
    gap: 10px;
  }

  .cvg-pulse-story__eyebrow,
  .cvg-pulse-board__eyebrow,
  .cvg-pulse-section__eyebrow {
    margin: 0;
    color: var(--content-link);
    font-size: var(--type-size-label);
    font-weight: var(--type-weight-label);
    letter-spacing: 0.12em;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .cvg-pulse-story__intro h1 {
    max-width: 18ch;
    margin: 0;
    color: var(--content-primary);
    font-family: var(--type-family-editorial);
    font-size: var(--type-size-editorial);
    font-weight: var(--type-weight-title);
    letter-spacing: var(--type-tracking-title);
    line-height: var(--type-leading-title);
  }

  .cvg-pulse-story__intro p {
    max-width: 68ch;
    margin: 0;
    color: var(--content-secondary);
    font-size: var(--type-size-body);
    line-height: var(--type-leading-body);
  }

  .cvg-pulse-story__boards {
    width: min(100%, 1480px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(16px, 2vw, 28px);
    align-items: start;
  }

  .cvg-pulse-board {
    position: relative;
    isolation: isolate;
    min-width: 0;
    /* The board is an explicit theme island. Rebind aliases locally because
       custom properties declared on :root may already be computed in light. */
    --material-canvas: var(--color-bg);
    --material-panel: var(--color-surface);
    --material-inset: var(--color-bg-subtle);
    --material-raised: var(--color-bg-elevated);
    --material-hover: var(--color-surface-hover);
    --material-scrim: var(--color-bg-overlay);
    --material-border: var(--color-border);
    --material-border-strong: var(--color-border-strong);
    --material-radius-control: var(--radius-md);
    --material-radius-panel: var(--radius-lg);
    --material-radius-editorial: var(--radius-2xl);
    --material-elevation-panel: none;
    --material-elevation-floating: var(--shadow-md);
    --material-elevation-drawer: var(--shadow-lg);
    --content-primary: var(--color-text);
    --content-secondary: var(--color-text-secondary);
    --content-muted: var(--color-text-muted);
    --content-link: var(--color-text-link);
    --action-primary-bg: var(--color-primary-700);
    --action-primary-hover: var(--color-primary-800);
    --action-primary-pressed: var(--color-primary-900);
    --action-primary-content: var(--color-text-inverse);
    --color-cyan: var(--color-primary-500);
    --color-coral: var(--color-danger-500);
    --color-mint: var(--color-success-500);
    --type-family-interface: var(--font-family-sans);
    --type-family-editorial: var(--font-family-display);
    --type-family-code: var(--font-family-mono);
    --type-size-body: var(--font-size-base);
    --type-size-label: var(--font-size-sm);
    --type-size-metadata: var(--font-size-sm);
    --type-size-page-title: var(--font-size-2xl);
    --type-size-editorial: clamp(2.5rem, 4vw, 3.5rem);
    --type-weight-body: var(--font-weight-normal);
    --type-weight-label: var(--font-weight-semibold);
    --type-weight-title: var(--font-weight-semibold);
    --type-leading-body: var(--line-height-normal);
    --type-leading-title: var(--line-height-tight);
    --type-tracking-body: var(--letter-spacing-normal);
    --type-tracking-title: var(--letter-spacing-tight);
    --type-numeric-variant: tabular-nums;
    --motion-duration-hover: 120ms;
    --motion-duration-press: 80ms;
    --motion-duration-detail: 180ms;
    --motion-duration-drawer: 240ms;
    --motion-duration-route: 160ms;
    --motion-duration-exit: 120ms;
    --motion-ease-enter: cubic-bezier(0.2, 0.8, 0.2, 1);
    --motion-ease-state: cubic-bezier(0.2, 0, 0, 1);
    --motion-distance-detail: 4px;
    --motion-distance-drawer: 16px;
    overflow: hidden;
    padding: clamp(16px, 2.2vw, 28px);

    /*
     * Rebind semantic aliases at the themed scope. Custom properties declared
     * on :root can otherwise inherit their already-resolved color when a
     * nested board switches data-theme.
     */
    --material-canvas: var(--color-bg);
    --material-panel: var(--color-surface);
    --material-inset: var(--color-bg-subtle);
    --material-raised: var(--color-bg-elevated);
    --material-hover: var(--color-surface-hover);
    --material-scrim: var(--color-bg-overlay);
    --material-border: var(--color-border);
    --material-border-strong: var(--color-border-strong);
    --material-radius-control: var(--radius-md);
    --material-radius-panel: var(--radius-lg);
    --material-radius-editorial: var(--radius-2xl);
    --material-elevation-panel: none;
    --material-elevation-floating: var(--shadow-md);
    --material-elevation-drawer: var(--shadow-lg);
    --space-control-gap: var(--space-2);
    --space-panel-padding: var(--space-6);
    --space-section-gap: var(--space-6);
    --content-primary: var(--color-text);
    --content-secondary: var(--color-text-secondary);
    --content-muted: var(--color-text-muted);
    --content-link: var(--color-text-link);
    --action-primary-bg: var(--color-primary-700);
    --action-primary-hover: var(--color-primary-800);
    --action-primary-pressed: var(--color-primary-900);
    --action-primary-content: var(--color-text-inverse);
    --type-family-interface: var(--font-family-sans);
    --type-family-editorial: var(--font-family-display);
    --type-family-code: var(--font-family-mono);
    --type-size-body: var(--font-size-base);
    --type-size-label: var(--font-size-sm);
    --type-size-metadata: var(--font-size-sm);
    --type-size-page-title: var(--font-size-2xl);
    --type-size-editorial: clamp(2.5rem, 4vw, 3.5rem);
    --type-weight-body: var(--font-weight-normal);
    --type-weight-label: var(--font-weight-semibold);
    --type-weight-title: var(--font-weight-semibold);
    --type-leading-body: var(--line-height-normal);
    --type-leading-title: var(--line-height-tight);
    --type-tracking-body: var(--letter-spacing-normal);
    --type-tracking-title: var(--letter-spacing-tight);
    --type-numeric-variant: tabular-nums;
    --type-measure-prose: var(--max-width-prose);
    --motion-duration-hover: var(--cvg-pulse-motion-source-duration-hover);
    --motion-duration-press: var(--cvg-pulse-motion-source-duration-press);
    --motion-duration-detail: var(--cvg-pulse-motion-source-duration-detail);
    --motion-duration-drawer: var(--cvg-pulse-motion-source-duration-drawer);
    --motion-duration-route: var(--cvg-pulse-motion-source-duration-route);
    --motion-duration-exit: var(--cvg-pulse-motion-source-duration-exit);
    --motion-ease-enter: var(--cvg-pulse-motion-source-ease-enter);
    --motion-ease-state: var(--cvg-pulse-motion-source-ease-state);
    --motion-ease-exit: var(--cvg-pulse-motion-source-ease-exit);
    --motion-distance-press: var(--cvg-pulse-motion-source-distance-press);
    --motion-distance-detail: var(--cvg-pulse-motion-source-distance-detail);
    --motion-distance-drawer: var(--cvg-pulse-motion-source-distance-drawer);
    --motion-distance-route: var(--cvg-pulse-motion-source-distance-route);
    color: var(--content-primary);
    background:
      linear-gradient(135deg, var(--material-canvas), var(--material-inset));
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-editorial);
    box-shadow: var(--material-elevation-floating);
  }

  .cvg-pulse-board::before {
    position: absolute;
    z-index: -1;
    top: -96px;
    right: -72px;
    width: 240px;
    height: 240px;
    content: '';
    background: radial-gradient(
      circle,
      var(--color-primary-subtle) 0,
      transparent 70%
    );
    opacity: 0.72;
    pointer-events: none;
  }

  /* Primitive values also need to be isolated: Storybook renders both boards
     in one document, so the browser's outer theme cannot be their source. */
  .cvg-pulse-board[data-theme='light'] {
    --color-primary-50: #e8f8fa;
    --color-primary-100: #d3f1f3;
    --color-primary-200: #a9e2e8;
    --color-primary-300: #74d0da;
    --color-primary-400: #37bdc9;
    --color-primary-500: #0fa8b8;
    --color-primary-600: #07869d;
    --color-primary-700: #066b80;
    --color-primary-800: #075466;
    --color-primary-900: #093d4c;
    --color-accent-50: #e8f8f1;
    --color-accent-100: #d0f1e6;
    --color-accent-200: #a8e4d2;
    --color-accent-300: #70d2b7;
    --color-accent-400: #35b998;
    --color-accent-500: #159f83;
    --color-accent-600: #12836c;
    --color-accent-700: #0f6958;
    --color-accent-800: #0d5145;
    --color-accent-900: #0b3c35;
    --color-success-50: #e8f8f1;
    --color-success-100: #d0f1e6;
    --color-success-200: #a8e4d2;
    --color-success-300: #70d2b7;
    --color-success-400: #35b998;
    --color-success-500: #159f83;
    --color-success-600: #12836c;
    --color-success-700: #0f6958;
    --color-success-800: #0d5145;
    --color-success-900: #0b3c35;
    --color-warning-500: #bc7a12;
    --color-danger-500: #d15b63;
    --color-info-500: #0fa8b8;
    --color-neutral-0: #ffffff;
    --color-neutral-50: #f7fafb;
    --color-neutral-100: #eef4f6;
    --color-neutral-200: #dce7eb;
    --color-neutral-300: #c5d5da;
    --color-neutral-400: #91aab2;
    --color-neutral-500: #607983;
    --color-neutral-600: #465e69;
    --color-neutral-800: #1e333e;
    --color-neutral-950: #081720;
    --color-ink: #112530;
    --color-navy: #0b202c;
    --color-off-white: #f7f6f0;
    --color-primary-subtle: #e8f8fa;
    --color-primary-surface: #f7fcfc;
    --color-bg: #eef4f6;
    --color-bg-elevated: #ffffff;
    --color-bg-subtle: #f5f9fa;
    --color-bg-overlay: rgba(8, 23, 32, 0.58);
    --color-surface: #ffffff;
    --color-surface-glass: rgba(255, 255, 255, 0.9);
    --color-surface-hover: #f1f8f9;
    --color-border: #d5e2e6;
    --color-border-strong: #b8ccd2;
    --color-text: #112530;
    --color-text-secondary: #3e5c67;
    --color-text-muted: #55717a;
    --color-text-inverse: #ffffff;
    --color-text-link: #066b80;
    --color-focus-ring: rgba(15, 168, 184, 0.42);
    --shadow-xs: 0 1px 2px rgba(15, 35, 48, 0.04);
    --shadow-sm: 0 2px 8px rgba(15, 35, 48, 0.06);
    --shadow-md: 0 4px 16px rgba(15, 35, 48, 0.08);
    --shadow-lg: 0 8px 32px rgba(15, 35, 48, 0.1);
    --shadow-xl: 0 16px 48px rgba(15, 35, 48, 0.12);
  }

  .cvg-pulse-board[data-theme='dark'] {
    --color-primary-50: #123b45;
    --color-primary-100: #164c58;
    --color-primary-200: #216675;
    --color-primary-300: #2d8994;
    --color-primary-400: #3fb8c0;
    --color-primary-500: #56d7dd;
    --color-primary-600: #35c4cf;
    --color-primary-700: #86e9ea;
    --color-primary-800: #b3f2f1;
    --color-primary-900: #d7faf8;
    --color-accent-50: #0d302e;
    --color-accent-100: #12443e;
    --color-accent-200: #1a604f;
    --color-accent-300: #2b8d70;
    --color-accent-400: #45ba8e;
    --color-accent-500: #68d8ad;
    --color-accent-600: #50c999;
    --color-accent-700: #7be2bb;
    --color-accent-800: #aaefd0;
    --color-accent-900: #143d32;
    --color-success-50: #102d29;
    --color-success-100: #153c36;
    --color-success-200: #1d5749;
    --color-success-300: #2d8064;
    --color-success-400: #45b98b;
    --color-success-500: #64d5a6;
    --color-success-600: #4dc796;
    --color-success-700: #7be3b9;
    --color-success-800: #a9efd0;
    --color-success-900: #153d32;
    --color-warning-500: #d4a043;
    --color-danger-500: #e27a74;
    --color-info-500: #59ced8;
    --color-neutral-0: #f4f7f3;
    --color-neutral-50: #15293a;
    --color-neutral-100: #1b3447;
    --color-neutral-200: #2a4659;
    --color-neutral-300: #3c5b6d;
    --color-neutral-400: #718b96;
    --color-neutral-500: #91a8b0;
    --color-neutral-600: #b2c6cb;
    --color-neutral-800: #e7f0ef;
    --color-neutral-950: #fbfffc;
    --color-ink: #eff7f5;
    --color-navy: #091522;
    --color-off-white: #f4f7f3;
    --color-primary-subtle: #103743;
    --color-primary-surface: #122a3b;
    --color-bg: #091522;
    --color-bg-elevated: #112337;
    --color-bg-subtle: #0e1c2a;
    --color-bg-overlay: rgba(3, 11, 18, 0.78);
    --color-surface: #112337;
    --color-surface-glass: rgba(17, 35, 55, 0.9);
    --color-surface-hover: #1a3346;
    --color-border: #2b4558;
    --color-border-strong: #426277;
    --color-text: #eff7f5;
    --color-text-secondary: #b4cbd0;
    --color-text-muted: #96b0b7;
    --color-text-inverse: #091522;
    --color-text-link: #70e0e5;
    --color-focus-ring: #83e7eb;
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.32);
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.38);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.46);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.56);
    --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.66);
  }

  .cvg-pulse-board[data-theme='dark']::before {
    opacity: 0.42;
  }

  .cvg-pulse-board__header {
    display: grid;
    gap: 10px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--material-border);
  }

  .cvg-pulse-board__title-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    align-items: center;
    justify-content: space-between;
  }

  .cvg-pulse-board h2,
  .cvg-pulse-section h3,
  .cvg-pulse-section h4,
  .cvg-pulse-section p {
    margin: 0;
  }

  .cvg-pulse-board h2 {
    color: var(--content-primary);
    font-size: clamp(1.4rem, 2.4vw, 2rem);
    font-weight: var(--type-weight-title);
    letter-spacing: var(--type-tracking-title);
    line-height: var(--type-leading-title);
  }

  .cvg-pulse-board__contract,
  .cvg-pulse-token__ref,
  .cvg-pulse-type__ref,
  .cvg-pulse-motion__ref,
  .cvg-pulse-contrast__token,
  .cvg-pulse-material__ref {
    color: var(--content-muted);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    line-height: 1.45;
  }

  .cvg-pulse-board__contract {
    max-width: 100%;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .cvg-pulse-board__summary {
    max-width: 52ch;
    color: var(--content-secondary);
    font-size: var(--type-size-body);
    line-height: var(--type-leading-body);
  }

  .cvg-pulse-board__signal {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    color: var(--content-secondary);
    font-size: var(--type-size-label);
  }

  .cvg-pulse-board__signal::before {
    width: 8px;
    height: 8px;
    content: '';
    background: var(--color-cyan);
    border-radius: var(--radius-full);
    box-shadow: 0 0 0 5px var(--color-primary-subtle);
  }

  .cvg-pulse-board__sections {
    display: grid;
    gap: 14px;
    padding-top: 14px;
  }

  .cvg-pulse-section {
    min-width: 0;
    display: grid;
    gap: 14px;
    padding: clamp(14px, 1.8vw, 20px);
    background: var(--material-panel);
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-panel);
    box-shadow: var(--material-elevation-panel);
  }

  .cvg-pulse-section__heading {
    display: grid;
    gap: 4px;
  }

  .cvg-pulse-section h3 {
    color: var(--content-primary);
    font-size: var(--type-size-page-title);
    font-weight: var(--type-weight-title);
    letter-spacing: var(--type-tracking-title);
    line-height: var(--type-leading-title);
  }

  .cvg-pulse-section__description {
    color: var(--content-secondary);
    font-size: var(--type-size-label);
    line-height: var(--type-leading-body);
  }

  .cvg-pulse-palette {
    display: grid;
    gap: 16px;
  }

  .cvg-pulse-palette__group {
    display: grid;
    gap: 8px;
  }

  .cvg-pulse-palette__group-header {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: baseline;
    justify-content: space-between;
  }

  .cvg-pulse-palette__group-header strong {
    color: var(--content-primary);
    font-size: var(--type-size-label);
    font-weight: var(--type-weight-label);
  }

  .cvg-pulse-palette__group-header span {
    color: var(--content-muted);
    font-size: var(--font-size-xs);
  }

  .cvg-pulse-palette__swatches {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }

  .cvg-pulse-token {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .cvg-pulse-token__chip {
    min-height: 38px;
    border: 1px solid color-mix(in srgb, var(--material-border-strong) 72%, transparent);
    border-radius: var(--material-radius-control);
    box-shadow: var(--shadow-inner);
  }

  .cvg-pulse-token__label {
    color: var(--content-secondary);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    text-align: center;
  }

  .cvg-pulse-semantic-grid,
  .cvg-pulse-material-grid,
  .cvg-pulse-motion-grid,
  .cvg-pulse-contrast-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .cvg-pulse-semantic,
  .cvg-pulse-motion,
  .cvg-pulse-contrast {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 10px;
    background: var(--material-inset);
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-control);
  }

  .cvg-pulse-semantic__sample {
    min-height: 34px;
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-control);
  }

  .cvg-pulse-semantic__label,
  .cvg-pulse-motion__label,
  .cvg-pulse-contrast__label {
    color: var(--content-primary);
    font-size: var(--type-size-label);
    font-weight: var(--type-weight-label);
    line-height: 1.3;
  }

  .cvg-pulse-semantic__ref {
    color: var(--content-muted);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    overflow-wrap: anywhere;
  }

  .cvg-pulse-migration {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    color: var(--content-secondary);
    font-size: var(--font-size-xs);
  }

  .cvg-pulse-migration th,
  .cvg-pulse-migration td {
    padding: 9px 8px;
    border-bottom: 1px solid var(--material-border);
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  .cvg-pulse-migration th {
    color: var(--content-muted);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    font-weight: var(--type-weight-body);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .cvg-pulse-migration tr:last-child td {
    border-bottom: 0;
  }

  .cvg-pulse-migration code {
    color: var(--content-primary);
    font-family: var(--type-family-code);
    overflow-wrap: anywhere;
  }

  .cvg-pulse-first-page {
    display: grid;
    gap: 14px;
  }

  .cvg-pulse-first-page__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: baseline;
    justify-content: space-between;
  }

  .cvg-pulse-first-page__header strong {
    color: var(--content-primary);
    font-size: var(--type-size-body);
    font-weight: var(--type-weight-title);
  }

  .cvg-pulse-first-page__header span {
    color: var(--content-muted);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
  }

  .cvg-pulse-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .cvg-pulse-metric {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: 10px;
    background: var(--material-inset);
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-control);
  }

  .cvg-pulse-metric span {
    color: var(--content-muted);
    font-size: var(--font-size-xs);
    line-height: 1.35;
  }

  .cvg-pulse-metric strong {
    color: var(--content-primary);
    font-family: var(--type-family-interface);
    font-size: var(--type-size-page-title);
    font-variant-numeric: var(--type-numeric-variant);
    font-weight: var(--type-weight-title);
    line-height: 1;
  }

  .cvg-pulse-first-page__action {
    display: inline-flex;
    width: fit-content;
    min-height: var(--touch-min);
    align-items: center;
    padding: 0 14px;
    color: var(--action-primary-content);
    background: var(--action-primary-bg);
    border: 0;
    border-radius: var(--material-radius-control);
    font-size: var(--type-size-label);
    font-weight: var(--type-weight-label);
  }

  .cvg-pulse-long-copy {
    margin: 0;
    padding: 12px;
    color: var(--content-secondary);
    background: var(--material-inset);
    border-left: 3px solid var(--color-cyan);
    border-radius: var(--material-radius-control);
    font-size: var(--type-size-body);
    line-height: var(--type-leading-body);
  }

  .cvg-pulse-long-copy strong {
    color: var(--color-mint);
    font-weight: var(--type-weight-label);
  }

  .cvg-pulse-tabular-sample {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: baseline;
    padding: 12px;
    color: var(--content-primary);
    background: var(--material-inset);
    border: 1px solid var(--material-border);
    border-radius: var(--material-radius-control);
    font-family: var(--type-family-interface);
    font-variant-numeric: var(--type-numeric-variant);
  }

  .cvg-pulse-tabular-sample strong {
    color: var(--content-link);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    font-weight: var(--type-weight-body);
  }

  .cvg-pulse-tabular-sample span {
    font-size: var(--type-size-body);
    font-weight: var(--type-weight-label);
    letter-spacing: 0.02em;
  }

  .cvg-pulse-type {
    display: grid;
    gap: 8px;
  }

  .cvg-pulse-type__row {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(72px, 0.45fr) minmax(0, 1.55fr);
    gap: 10px;
    align-items: baseline;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--material-border);
  }

  .cvg-pulse-type__row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .cvg-pulse-type__role {
    color: var(--content-muted);
    font-family: var(--type-family-code);
    font-size: var(--font-size-xs);
    line-height: 1.35;
  }

  .cvg-pulse-type__sample {
    min-width: 0;
    color: var(--content-primary);
    overflow-wrap: anywhere;
  }

  .cvg-pulse-type__extras {
    display: grid;
    gap: 8px;
  }

  .cvg-pulse-material-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cvg-pulse-material {
    min-height: 120px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--material-border);
  }

  .cvg-pulse-material strong {
    color: var(--content-primary);
    font-size: var(--type-size-label);
    font-weight: var(--type-weight-label);
  }

  .cvg-pulse-material p {
    color: var(--content-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .cvg-pulse-motion__preview {
    min-width: 0;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .cvg-pulse-motion__orb {
    width: 24px;
    height: 24px;
    background: var(--color-cyan);
    border: 4px solid var(--color-primary-subtle);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-glow);
  }

  [data-cvg-pulse-motion-mode='standard'] .cvg-pulse-motion__orb {
    animation: cvg-pulse-token-breathe var(--motion-duration-detail) var(--motion-ease-enter) infinite alternate;
  }

  [data-cvg-pulse-motion-mode='reduced'] .cvg-pulse-motion__orb {
    animation: none;
    opacity: 0.72;
  }

  .cvg-pulse-motion__copy {
    display: grid;
    gap: 2px;
  }

  .cvg-pulse-motion__copy span {
    color: var(--content-secondary);
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }

  .cvg-pulse-motion__row {
    display: grid;
    gap: 6px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--material-border);
  }

  .cvg-pulse-motion__row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .cvg-pulse-contrast {
    color: var(--contrast-foreground);
    background: var(--contrast-background);
    border-color: var(--material-border-strong);
  }

  .cvg-pulse-contrast__label,
  .cvg-pulse-contrast__token {
    color: inherit;
  }

  .cvg-pulse-contrast__label {
    font-size: var(--type-size-body);
  }

  .cvg-pulse-contrast__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: baseline;
    justify-content: space-between;
  }

  .cvg-pulse-contrast__target {
    color: inherit;
    font-size: var(--font-size-xs);
    font-weight: var(--type-weight-label);
    opacity: 0.86;
  }

  @keyframes cvg-pulse-token-breathe {
    from {
      transform: translateY(0) scale(0.94);
    }
    to {
      transform: translateY(calc(-1 * var(--motion-distance-detail))) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cvg-pulse-board {
      --motion-duration-hover: 0ms;
      --motion-duration-press: 0ms;
      --motion-duration-detail: 0ms;
      --motion-duration-drawer: 0ms;
      --motion-duration-route: 0ms;
      --motion-duration-exit: 0ms;
      --motion-ease-enter: linear;
      --motion-ease-state: linear;
      --motion-distance-detail: 0px;
      --motion-distance-drawer: 0px;
    }

    .cvg-pulse-story *,
    .cvg-pulse-story *::before,
    .cvg-pulse-story *::after {
      scroll-behavior: auto !important;
    }

    [data-cvg-pulse-motion-mode='standard'] .cvg-pulse-motion__orb {
      animation: none;
      transform: none;
    }
  }

  @media (max-width: 1100px) {
    .cvg-pulse-story__boards {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .cvg-pulse-story {
      padding: 16px;
    }

    .cvg-pulse-semantic-grid,
    .cvg-pulse-material-grid,
    .cvg-pulse-motion-grid,
    .cvg-pulse-contrast-grid,
    .cvg-pulse-metrics {
      grid-template-columns: 1fr;
    }

    .cvg-pulse-palette__swatches {
      grid-template-columns: repeat(5, minmax(38px, 1fr));
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .cvg-pulse-type__row {
      grid-template-columns: 1fr;
      gap: 3px;
    }
  }
`;

const swatches = (group: object, steps: string[], prefix: string) => {
  const values = group as Record<string, string>;
  return steps.map((step) => ({
    id: `${prefix}-${step}`,
    label: step,
    ref: values[step]
  }));
};

export const CanonicalBoard: Story = {
  name: 'Canonical board · light + dark',
  render: () => ({
    setup() {
      const paletteGroups = [
        {
          id: 'primary',
          label: 'Cyan / primary',
          note: 'ação, foco e continuidade',
          swatches: swatches(cvgPulseTokens.colors.primary, ['50', '100', '200', '400', '500', '600', '700', '900'], 'primary')
        },
        {
          id: 'accent',
          label: 'Mint / accent',
          note: 'handoff e sucesso',
          swatches: swatches(cvgPulseTokens.colors.accent, ['50', '100', '200', '400', '500', '600', '700', '900'], 'accent')
        },
        {
          id: 'neutral',
          label: 'Ink / neutral',
          note: 'hierarquia e respiro',
          swatches: swatches(cvgPulseTokens.colors.neutral, ['50', '100', '200', '400', '500', '600', '800', '950'], 'neutral')
        },
        {
          id: 'status',
          label: 'Status',
          note: 'semântica com rótulo',
          swatches: [
            { id: 'success-500', label: 'success', ref: cvgPulseTokens.colors.success[500] },
            { id: 'warning-500', label: 'warning', ref: cvgPulseTokens.colors.warning[500] },
            { id: 'danger-500', label: 'danger', ref: cvgPulseTokens.colors.danger[500] },
            { id: 'info-500', label: 'info', ref: cvgPulseTokens.colors.info[500] }
          ]
        }
      ];

      const semanticRows = [
        { id: 'canvas', label: 'Canvas', ref: cvgPulseTokens.semantic.material.canvas, sample: 'base / espaço clínico', style: { background: cvgPulseTokens.semantic.material.canvas, color: cvgPulseTokens.semantic.content.primary } },
        { id: 'panel', label: 'Panel', ref: cvgPulseTokens.semantic.material.panel, sample: 'surface / leitura', style: { background: cvgPulseTokens.semantic.material.panel, color: cvgPulseTokens.semantic.content.primary } },
        { id: 'inset', label: 'Inset', ref: cvgPulseTokens.semantic.material.inset, sample: 'apoio / agrupamento', style: { background: cvgPulseTokens.semantic.material.inset, color: cvgPulseTokens.semantic.content.secondary } },
        { id: 'primary-action', label: 'Primary action', ref: cvgPulseTokens.semantic.action.primary, sample: 'ação / confirmação', style: { background: cvgPulseTokens.semantic.action.primary, color: cvgPulseTokens.semantic.action.content } },
        { id: 'content-secondary', label: 'Content secondary', ref: cvgPulseTokens.semantic.content.secondary, sample: 'texto auxiliar', style: { background: cvgPulseTokens.semantic.material.panel, color: cvgPulseTokens.semantic.content.secondary } },
        { id: 'content-link', label: 'Content link', ref: cvgPulseTokens.semantic.content.link, sample: 'navegação / referência', style: { background: cvgPulseTokens.semantic.material.panel, color: cvgPulseTokens.semantic.content.link } }
      ];

      const typeRows = [
        {
          id: 'editorial',
          label: 'editorial',
          ref: '--type-size-editorial',
          sample: 'Cuidado que continua',
          style: { fontFamily: cvgPulseTokens.typography.roles.familyEditorial, fontSize: cvgPulseTokens.typography.roles.sizeEditorial, fontWeight: cvgPulseTokens.typography.roles.weightTitle, letterSpacing: cvgPulseTokens.typography.roles.trackingTitle, lineHeight: cvgPulseTokens.typography.roles.leadingTitle }
        },
        {
          id: 'page-title',
          label: 'page title',
          ref: '--type-size-page-title',
          sample: 'Resumo do atendimento',
          style: { fontFamily: cvgPulseTokens.typography.roles.familyInterface, fontSize: cvgPulseTokens.typography.roles.sizePageTitle, fontWeight: cvgPulseTokens.typography.roles.weightTitle, letterSpacing: cvgPulseTokens.typography.roles.trackingTitle, lineHeight: cvgPulseTokens.typography.roles.leadingTitle }
        },
        {
          id: 'body',
          label: 'body',
          ref: '--type-size-body',
          sample: 'Uma interface calma torna o próximo cuidado evidente.',
          style: { fontFamily: cvgPulseTokens.typography.roles.familyInterface, fontSize: cvgPulseTokens.typography.roles.sizeBody, fontWeight: cvgPulseTokens.typography.roles.weightBody, letterSpacing: cvgPulseTokens.typography.roles.trackingBody, lineHeight: cvgPulseTokens.typography.roles.leadingBody }
        },
        {
          id: 'label',
          label: 'label',
          ref: '--type-size-label',
          sample: 'PRÓXIMA AÇÃO · CONFIRMADA',
          style: { fontFamily: cvgPulseTokens.typography.roles.familyInterface, fontSize: cvgPulseTokens.typography.roles.sizeLabel, fontWeight: cvgPulseTokens.typography.roles.weightLabel, letterSpacing: cvgPulseTokens.typography.roles.trackingTitle, lineHeight: cvgPulseTokens.typography.roles.leadingBody, textTransform: 'uppercase' }
        },
        {
          id: 'code',
          label: 'code',
          ref: '--type-family-code',
          sample: 'data-theme="dark"  ·  --color-cyan',
          style: { fontFamily: cvgPulseTokens.typography.roles.familyCode, fontSize: cvgPulseTokens.typography.fontSize.xs, lineHeight: cvgPulseTokens.typography.roles.leadingBody }
        }
      ];

      const materialRows = [
        { id: 'panel', label: 'panel', ref: '--material-elevation-panel', description: 'quieto · contexto', background: cvgPulseTokens.semantic.material.panel, elevation: cvgPulseTokens.semantic.material.elevationPanel, radius: cvgPulseTokens.semantic.material.radiusPanel },
        { id: 'floating', label: 'floating', ref: '--material-elevation-floating', description: 'flutua · ação', background: cvgPulseTokens.semantic.material.raised, elevation: cvgPulseTokens.semantic.material.elevationFloating, radius: cvgPulseTokens.semantic.material.radiusPanel },
        { id: 'drawer', label: 'drawer', ref: '--material-elevation-drawer', description: 'separa · detalhe', background: cvgPulseTokens.semantic.material.raised, elevation: cvgPulseTokens.semantic.material.elevationDrawer, radius: cvgPulseTokens.semantic.material.radiusEditorial }
      ];

      const motionRows = [
        { id: 'hover', label: 'hover', duration: cvgPulseTokens.motion.duration.hover, ease: cvgPulseTokens.motion.ease.state, distance: cvgPulseTokens.motion.distance.detail },
        { id: 'detail', label: 'detail', duration: cvgPulseTokens.motion.duration.detail, ease: cvgPulseTokens.motion.ease.enter, distance: cvgPulseTokens.motion.distance.detail },
        { id: 'drawer', label: 'drawer', duration: cvgPulseTokens.motion.duration.drawer, ease: cvgPulseTokens.motion.ease.enter, distance: cvgPulseTokens.motion.distance.drawer }
      ];

      const contrastPairs = [
        { id: 'primary-on-canvas', label: 'Primary content / canvas', foregroundToken: '--content-primary', backgroundToken: '--material-canvas', foreground: cvgPulseTokens.semantic.content.primary, background: cvgPulseTokens.semantic.material.canvas, target: 'AA · body 4.5:1' },
        { id: 'secondary-on-canvas', label: 'Secondary content / canvas', foregroundToken: '--content-secondary', backgroundToken: '--material-canvas', foreground: cvgPulseTokens.semantic.content.secondary, background: cvgPulseTokens.semantic.material.canvas, target: 'AA · body 4.5:1' },
        { id: 'link-on-canvas', label: 'Link / canvas', foregroundToken: '--content-link', backgroundToken: '--material-canvas', foreground: cvgPulseTokens.semantic.content.link, background: cvgPulseTokens.semantic.material.canvas, target: 'AA · body 4.5:1' },
        { id: 'action-content-on-action', label: 'Action content / primary action', foregroundToken: '--action-primary-content', backgroundToken: '--action-primary-bg', foreground: cvgPulseTokens.semantic.action.content, background: cvgPulseTokens.semantic.action.primary, target: 'AA · control 3:1' }
      ];

      const boards = [
        { id: 'light', label: 'Light', description: 'off-white mineral · cyan signal · baixa fricção', contract: 'cvgPulseLightTheme', snapshot: cvgPulseLightTheme },
        { id: 'dark', label: 'Dark', description: 'navy mineral · mint signal · foco protegido', contract: 'cvgPulseDarkTheme', snapshot: cvgPulseDarkTheme }
      ];

      const migrationRows = [
        { legacy: 'colors.primary.600', current: 'cvgPulseTokens.colors.primary.600', runtime: '--color-primary-600', decision: 'cyan de ação' },
        { legacy: 'colors.accent.600', current: 'cvgPulseTokens.colors.accent.600', runtime: '--color-accent-600', decision: 'mint de continuidade' },
        { legacy: 'typography.fontFamily.sans', current: 'cvgPulseTokens.typography.fontFamily.interface', runtime: '--font-family-sans', decision: 'Aptos + fallback local' },
        { legacy: 'lightTheme / darkTheme', current: 'cvgPulseLightTheme / cvgPulseDarkTheme', runtime: '[data-theme] + CSS vars', decision: 'SSR compatível' },
        { legacy: 'semanticTokens.material.panel', current: 'cvgPulseTokens.semantic.material.panel', runtime: '--material-panel', decision: 'superfície calma' }
      ];

      const firstPageMetrics = [
        { label: 'Atendimentos hoje', value: '18' },
        { label: 'Aguardando confirmação', value: '04' },
        { label: 'Próxima ação', value: '09:30' }
      ];

      return {
        boards,
        contrastPairs,
        cvgPulseTokens,
        firstPageMetrics,
        materialRows,
        migrationRows,
        motionRows,
        paletteGroups,
        semanticRows,
        storyStyles,
        typeRows
      };
    },
    template: `
      <component :is="'style'" v-html="storyStyles" />
      <main class="cvg-pulse-story" data-cvg-pulse-story="canonical" data-cvg-pulse-contract="css-backed-v1">
        <header class="cvg-pulse-story__intro" data-cvg-pulse-section="intro">
          <p class="cvg-pulse-story__eyebrow">CVG HIS · design system</p>
          <h1>CVG Pulse, cuidado em continuidade.</h1>
          <p>
            Uma prancha de contrato para revisar ritmo, contraste e profundidade
            antes de um token chegar a uma superfície clínica. Cada board usa
            <code>data-theme</code> explícito; o toolbar é apenas um complemento.
          </p>
        </header>

        <div class="cvg-pulse-story__boards" data-cvg-pulse-boards="light-dark">
          <article
            v-for="board in boards"
            :key="board.id"
            class="cvg-pulse-board"
            :data-theme="board.id"
            :data-theme-board="board.id"
            :data-cvg-pulse-board="board.id"
            :data-theme-contract="board.contract"
            :data-theme-contract-background="board.snapshot.bg"
            :style="{ colorScheme: board.id }"
          >
            <header class="cvg-pulse-board__header" data-cvg-pulse-section="board-header">
              <p class="cvg-pulse-board__eyebrow">theme contract · {{ board.contract }}</p>
              <div class="cvg-pulse-board__title-row">
                <h2>{{ board.label }}</h2>
                <code class="cvg-pulse-board__contract">CSS vars · {{ board.snapshot.bg }} source snapshot</code>
              </div>
              <p class="cvg-pulse-board__summary">{{ board.description }}. A superfície abaixo é a referência explícita para captura, inspeção e comparação entre temas.</p>
              <span class="cvg-pulse-board__signal">CSS-backed · sem export legacy reinterpretado</span>
            </header>

            <div class="cvg-pulse-board__sections">
              <section class="cvg-pulse-section" data-cvg-pulse-section="first-page">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">00 · filled page</p>
                  <h3>Primeira página preenchida</h3>
                  <p class="cvg-pulse-section__description">A decisão de UX aparece no conteúdo: prioridade clínica primeiro, sinal visual depois, próxima ação sempre nomeada.</p>
                </div>
                <div class="cvg-pulse-first-page">
                  <div class="cvg-pulse-first-page__header">
                    <strong>Resumo do atendimento</strong>
                    <span>segunda-feira · 07 outubro 2026</span>
                  </div>
                  <p class="cvg-pulse-long-copy" data-long-copy>
                    <strong>Atenção clínica:</strong> a conciliação de medicamentos está pendente para
                    o próximo atendimento. O estado não depende apenas de cor: o rótulo, a hierarquia
                    e a próxima ação continuam legíveis em claro, escuro e com acentos.
                  </p>
                  <div class="cvg-pulse-tabular-sample" data-tabular-sample>
                    <strong>tabular-nums</strong>
                    <span>18 · 04 · 09:30 · R$ 1.250,00</span>
                  </div>
                  <div class="cvg-pulse-metrics" data-cvg-pulse-metrics>
                    <div v-for="metric in firstPageMetrics" :key="metric.label" class="cvg-pulse-metric">
                      <span>{{ metric.label }}</span>
                      <strong>{{ metric.value }}</strong>
                    </div>
                  </div>
                  <button class="cvg-pulse-first-page__action" type="button">Revisar conciliação</button>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="migration">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">00.1 · migration</p>
                  <h3>Inventário antigo → atual</h3>
                  <p class="cvg-pulse-section__description">Exports antigos permanecem compatíveis; superfícies novas apontam para tokens CSS-backed e semânticos.</p>
                </div>
                <div style="overflow-x: auto;">
                  <table class="cvg-pulse-migration" data-token-migration>
                    <thead>
                      <tr>
                        <th scope="col">Legado</th>
                        <th scope="col">API atual</th>
                        <th scope="col">Runtime</th>
                        <th scope="col">Decisão</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in migrationRows" :key="row.legacy">
                        <td><code>{{ row.legacy }}</code></td>
                        <td><code>{{ row.current }}</code></td>
                        <td><code>{{ row.runtime }}</code></td>
                        <td>{{ row.decision }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="palette-semantics">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">01 · palette</p>
                  <h3>Paleta e semântica</h3>
                  <p class="cvg-pulse-section__description">Primitivos nomeados alimentam papéis de canvas, conteúdo e ação.</p>
                </div>
                <div class="cvg-pulse-palette" data-cvg-pulse-token-layer="primitive">
                  <div v-for="group in paletteGroups" :key="group.id" class="cvg-pulse-palette__group" :data-cvg-pulse-palette="group.id">
                    <div class="cvg-pulse-palette__group-header">
                      <strong>{{ group.label }}</strong>
                      <span>{{ group.note }}</span>
                    </div>
                    <div class="cvg-pulse-palette__swatches">
                      <div v-for="swatch in group.swatches" :key="swatch.id" class="cvg-pulse-token" :data-cvg-pulse-token="swatch.id" :data-token-ref="swatch.ref">
                        <span class="cvg-pulse-token__chip" :style="{ background: swatch.ref }" aria-hidden="true"></span>
                        <span class="cvg-pulse-token__label">{{ swatch.label }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="cvg-pulse-semantic-grid" data-cvg-pulse-token-layer="semantic">
                  <div v-for="row in semanticRows" :key="row.id" class="cvg-pulse-semantic" :data-cvg-pulse-semantic="row.id">
                    <div class="cvg-pulse-semantic__sample" :style="row.style">{{ row.sample }}</div>
                    <span class="cvg-pulse-semantic__label">{{ row.label }}</span>
                    <code class="cvg-pulse-semantic__ref">{{ row.ref }}</code>
                  </div>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="typography">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">02 · voice</p>
                  <h3>Tipografia por papel</h3>
                  <p class="cvg-pulse-section__description">Aptos para interface, editorial para orientação e mono para contrato.</p>
                </div>
                <div class="cvg-pulse-type" data-cvg-pulse-token-layer="typography">
                  <div v-for="row in typeRows" :key="row.id" class="cvg-pulse-type__row" :data-cvg-pulse-type-role="row.id">
                    <code class="cvg-pulse-type__role">{{ row.label }}</code>
                    <div class="cvg-pulse-type__sample" :style="row.style">
                      <span>{{ row.sample }}</span>
                      <code class="cvg-pulse-type__ref">{{ row.ref }}</code>
                    </div>
                  </div>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="materials-elevation">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">03 · material</p>
                  <h3>Materiais e elevation</h3>
                  <p class="cvg-pulse-section__description">Painéis ficam calmos; a profundidade aparece apenas quando há separação operacional.</p>
                </div>
                <div class="cvg-pulse-material-grid">
                  <div v-for="row in materialRows" :key="row.id" class="cvg-pulse-material" :data-cvg-pulse-material="row.id" :data-cvg-pulse-elevation="row.ref" :style="{ background: row.background, boxShadow: row.elevation, borderRadius: row.radius }">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <p>{{ row.description }}</p>
                    </div>
                    <code class="cvg-pulse-material__ref">{{ row.ref }}</code>
                  </div>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="motion-reduced-motion">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">04 · motion</p>
                  <h3>Movimento com saída reduzida</h3>
                  <p class="cvg-pulse-section__description">A mudança explica estado; <code>reduce</code> troca loop espacial por estado estável.</p>
                </div>
                <div class="cvg-pulse-motion-grid">
                  <div class="cvg-pulse-motion" data-motion-token data-cvg-pulse-motion-mode="standard" data-cvg-pulse-motion-policy="default">
                    <div class="cvg-pulse-motion__preview">
                      <span class="cvg-pulse-motion__orb" aria-hidden="true"></span>
                      <div class="cvg-pulse-motion__copy">
                        <span class="cvg-pulse-motion__label">Normal · sinal de continuidade</span>
                        <span>Hover/entrada usa transform e opacidade sem alterar layout.</span>
                      </div>
                    </div>
                    <code class="cvg-pulse-motion__ref">{{ cvgPulseTokens.motion.duration.detail }} · {{ cvgPulseTokens.motion.ease.enter }}</code>
                  </div>
                  <div class="cvg-pulse-motion" data-cvg-pulse-motion-mode="reduced" data-cvg-pulse-motion-policy="prefers-reduced-motion">
                    <div class="cvg-pulse-motion__preview">
                      <span class="cvg-pulse-motion__orb" aria-hidden="true"></span>
                      <div class="cvg-pulse-motion__copy">
                        <span class="cvg-pulse-motion__label">Reduced · estado imediato</span>
                        <span>Sem loop nem deslocamento; o texto continua sendo o feedback.</span>
                      </div>
                    </div>
                    <code class="cvg-pulse-motion__ref">0ms · linear · distância 0px</code>
                  </div>
                </div>
                <div class="cvg-pulse-motion" data-cvg-pulse-motion="durations">
                  <div v-for="row in motionRows" :key="row.id" class="cvg-pulse-motion__row" :data-cvg-pulse-motion-token="row.id">
                    <span class="cvg-pulse-motion__label">{{ row.label }}</span>
                    <code class="cvg-pulse-motion__ref">{{ row.duration }} · {{ row.ease }} · {{ row.distance }}</code>
                  </div>
                </div>
              </section>

              <section class="cvg-pulse-section" data-cvg-pulse-section="contrast">
                <div class="cvg-pulse-section__heading">
                  <p class="cvg-pulse-section__eyebrow">05 · perception</p>
                  <h3>Pares de contraste</h3>
                  <p class="cvg-pulse-section__description">Os pares são captura-friendly: foreground e background ficam expostos por papel, não por hex isolado.</p>
                </div>
                <div class="cvg-pulse-contrast-grid">
                  <div v-for="pair in contrastPairs" :key="pair.id" class="cvg-pulse-contrast" data-contrast-pair :data-cvg-pulse-contrast-pair="pair.id" :data-contrast-name="pair.id" :data-contrast-minimum="pair.id === 'action-content-on-action' ? 3 : 4.5" :data-contrast-foreground="pair.foregroundToken" :data-contrast-background="pair.backgroundToken" data-contrast-target="wcag-aa" :style="{ '--contrast-foreground': pair.foreground, '--contrast-background': pair.background }">
                    <span class="cvg-pulse-contrast__label">{{ pair.label }}</span>
                    <span class="cvg-pulse-contrast__meta">
                      <code class="cvg-pulse-contrast__token">{{ pair.foregroundToken }} on {{ pair.backgroundToken }}</code>
                      <span class="cvg-pulse-contrast__target">{{ pair.target }}</span>
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>
    `
  })
};
