import { describe, it, expect } from 'vitest';
import {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  transitions,
  zIndex,
  layout
} from '../../../packages/design-system/src/tokens/index.js';
import {
  lightTheme,
  darkTheme,
  generateThemeCSS
} from '../../../packages/design-system/src/themes/index.js';
import { renderButton } from '../../../packages/design-system/src/components/button.js';
import { renderInput, renderSelect } from '../../../packages/design-system/src/components/input.js';
import {
  renderCard,
  renderBadge,
  renderAlert,
  renderSpinner
} from '../../../packages/design-system/src/components/display.js';

describe('Design System — Tokens', () => {
  it('should have complete color palette', () => {
    expect(colors.primary).toHaveProperty('500');
    expect(colors.accent).toHaveProperty('500');
    expect(colors.success).toHaveProperty('500');
    expect(colors.warning).toHaveProperty('500');
    expect(colors.danger).toHaveProperty('500');
    expect(colors.info).toHaveProperty('500');
    expect(colors.neutral).toHaveProperty('500');
  });

  it('should have spacing scale (4px grid)', () => {
    expect(spacing[0]).toBe('0');
    expect(spacing[1]).toBe('0.25rem');
    expect(spacing[4]).toBe('1rem');
    expect(spacing[8]).toBe('2rem');
  });

  it('should have radius values', () => {
    expect(radius.none).toBe('0');
    expect(radius.sm).toBe('0.375rem');
    expect(radius.full).toBe('9999px');
  });

  it('should have shadow definitions', () => {
    expect(shadows.xs).toContain('rgba');
    expect(shadows.focus).toContain('0 0 0 3px');
  });

  it('should have typography tokens', () => {
    expect(typography.fontFamily.sans).toContain('Inter');
    expect(typography.fontSize.base).toBe('0.9375rem');
    expect(typography.fontWeight.medium).toBe(500);
  });

  it('should have transition tokens', () => {
    expect(transitions.ease.default).toContain('cubic-bezier');
    expect(transitions.duration.fast).toBe('150ms');
  });

  it('should have z-index scale', () => {
    expect(zIndex.dropdown).toBe(100);
    expect(zIndex.tooltip).toBe(600);
    expect(zIndex.modal).toBeGreaterThan(zIndex.overlay);
  });

  it('should have layout tokens', () => {
    expect(layout.touchMin).toBe('44px');
    expect(layout.topbarHeight).toBe('56px');
  });
});

describe('Design System — Themes', () => {
  it('should have light theme with all surface colors', () => {
    expect(lightTheme.bg).toBeDefined();
    expect(lightTheme.surface).toBe('#ffffff');
    expect(lightTheme.text).toBeDefined();
    expect(lightTheme.border).toBeDefined();
  });

  it('should have dark theme with all surface colors', () => {
    expect(darkTheme.bg).toBeDefined();
    expect(darkTheme.surface).toBe('#1e293b');
    expect(darkTheme.text).toBeDefined();
    expect(darkTheme.border).toBeDefined();
  });

  it('should generate valid CSS from theme', () => {
    const css = generateThemeCSS(lightTheme);
    expect(css).toContain('--color-bg');
    expect(css).toContain('--color-surface');
    expect(css).toContain('--color-text');
  });

  it('should have different values for light and dark themes', () => {
    expect(lightTheme.bg).not.toBe(darkTheme.bg);
    expect(lightTheme.surface).not.toBe(darkTheme.surface);
    expect(lightTheme.text).not.toBe(darkTheme.text);
  });
});

describe('Design System — Button Component', () => {
  it('should render a primary button', () => {
    const html = renderButton({ label: 'Click me' });
    expect(html).toContain('<button');
    expect(html).toContain('ds-btn');
    expect(html).toContain('ds-btn--primary');
    expect(html).toContain('Click me');
  });

  it('should render variants', () => {
    const secondary = renderButton({ label: 'Secondary', variant: 'secondary' });
    expect(secondary).toContain('ds-btn--secondary');

    const danger = renderButton({ label: 'Delete', variant: 'danger' });
    expect(danger).toContain('ds-btn--danger');

    const ghost = renderButton({ label: 'Ghost', variant: 'ghost' });
    expect(ghost).toContain('ds-btn--ghost');
  });

  it('should render sizes', () => {
    const sm = renderButton({ label: 'Small', size: 'sm' });
    expect(sm).toContain('ds-btn--sm');

    const lg = renderButton({ label: 'Large', size: 'lg' });
    expect(lg).toContain('ds-btn--lg');
  });

  it('should render disabled state', () => {
    const html = renderButton({ label: 'Disabled', disabled: true });
    expect(html).toContain('disabled');
    expect(html).toContain('ds-btn--disabled');
  });

  it('should render loading state with spinner', () => {
    const html = renderButton({ label: 'Loading', loading: true });
    expect(html).toContain('ds-btn__spinner');
    expect(html).toContain('aria-busy="true"');
  });

  it('should include icon when provided', () => {
    const html = renderButton({ label: 'With icon', icon: '🔍' });
    expect(html).toContain('ds-btn__icon');
    expect(html).toContain('🔍');
  });

  it('should set aria-label', () => {
    const html = renderButton({ label: 'Submit', ariaLabel: 'Submit form' });
    expect(html).toContain('aria-label="Submit form"');
  });

  it('should use default aria-label from label when not provided', () => {
    const html = renderButton({ label: 'Save' });
    expect(html).toContain('aria-label="Save"');
  });
});

describe('Design System — Input Component', () => {
  it('should render a basic input', () => {
    const html = renderInput({ id: 'name', label: 'Name' });
    expect(html).toContain('ds-input__wrapper');
    expect(html).toContain('ds-input__label');
    expect(html).toContain('for="name"');
    expect(html).toContain('id="name"');
    expect(html).toContain('Name');
  });

  it('should render required indicator', () => {
    const html = renderInput({ id: 'email', label: 'Email', required: true });
    expect(html).toContain('ds-input__required');
    expect(html).toContain('required');
  });

  it('should render error state', () => {
    const html = renderInput({ id: 'email', label: 'Email', error: 'Invalid email' });
    expect(html).toContain('ds-input--error');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Invalid email');
  });

  it('should render help text', () => {
    const html = renderInput({ id: 'phone', label: 'Phone', helpText: 'Format: (11) 99999-9999' });
    expect(html).toContain('ds-input__help');
    expect(html).toContain('(11) 99999-9999');
  });

  it('should render select with options', () => {
    const html = renderSelect({
      id: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    });
    expect(html).toContain('<select');
    expect(html).toContain('value="active"');
    expect(html).toContain('Active');
    expect(html).toContain('Inactive');
  });
});

describe('Design System — Display Components', () => {
  it('should render a card with title', () => {
    const html = renderCard({ title: 'My Card', children: '<p>Content</p>' });
    expect(html).toContain('ds-card');
    expect(html).toContain('ds-card__header');
    expect(html).toContain('ds-card__title');
    expect(html).toContain('My Card');
    expect(html).toContain('ds-card__body');
    expect(html).toContain('<p>Content</p>');
  });

  it('should render card variants', () => {
    const elevated = renderCard({ title: 'Elevated', children: '', variant: 'elevated' });
    expect(elevated).toContain('ds-card--elevated');

    const glass = renderCard({ title: 'Glass', children: '', variant: 'glass' });
    expect(glass).toContain('ds-card--glass');
  });

  it('should render badges with variants', () => {
    const success = renderBadge({ label: 'Active', variant: 'success' });
    expect(success).toContain('ds-badge--success');
    expect(success).toContain('role="status"');

    const warning = renderBadge({ label: 'Pending', variant: 'warning' });
    expect(warning).toContain('ds-badge--warning');

    const withDot = renderBadge({ label: 'Online', variant: 'success', dot: true });
    expect(withDot).toContain('ds-badge--dot');
    expect(withDot).toContain('ds-badge__dot');
  });

  it('should render alerts with variants', () => {
    const info = renderAlert({ message: 'Info message', variant: 'info' });
    expect(info).toContain('ds-alert--info');
    expect(info).toContain('role="alert"');

    const danger = renderAlert({ message: 'Error message', variant: 'danger' });
    expect(danger).toContain('ds-alert--danger');

    const withTitle = renderAlert({ title: 'Warning', message: 'Be careful', variant: 'warning' });
    expect(withTitle).toContain('ds-alert__title');
    expect(withTitle).toContain('Warning');
  });

  it('should render dismissible alert', () => {
    const html = renderAlert({ message: 'Dismiss me', dismissible: true });
    expect(html).toContain('ds-alert--dismissible');
    expect(html).toContain('ds-alert__dismiss');
    expect(html).toContain('aria-label="Fechar alerta"');
  });

  it('should render spinners with sizes', () => {
    const sm = renderSpinner({ size: 'sm' });
    expect(sm).toContain('ds-spinner--sm');
    expect(sm).toContain('role="status"');
    expect(sm).toContain('aria-label');

    const lg = renderSpinner({ size: 'lg' });
    expect(lg).toContain('ds-spinner--lg');
  });
});

describe('Design System — Accessibility', () => {
  it('button should have aria-label', () => {
    const html = renderButton({ label: 'Submit' });
    expect(html).toContain('aria-label');
  });

  it('input error should have aria-invalid and aria-describedby', () => {
    const html = renderInput({ id: 'test', label: 'Test', error: 'Error' });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby');
    expect(html).toContain('role="alert"');
  });

  it('alert should have role="alert"', () => {
    const html = renderAlert({ message: 'Alert' });
    expect(html).toContain('role="alert"');
  });

  it('badge should have role="status"', () => {
    const html = renderBadge({ label: 'Active' });
    expect(html).toContain('role="status"');
  });

  it('spinner should have role="status" and aria-label', () => {
    const html = renderSpinner({ size: 'md' });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label');
  });

  it('dismissible alert should have accessible close button', () => {
    const html = renderAlert({ message: 'Alert', dismissible: true });
    expect(html).toContain('aria-label="Fechar alerta"');
    expect(html).toContain('type="button"');
  });
});
