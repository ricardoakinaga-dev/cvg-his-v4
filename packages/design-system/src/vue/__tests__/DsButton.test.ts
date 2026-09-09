import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DsButton from '../DsButton.vue';

describe('DsButton.vue', () => {
  it.each([
    'primary',
    'secondary',
    'ghost',
    'danger',
    'success'
  ] as const)('renders the %s variant with an accessible label', (variant) => {
    const wrapper = mount(DsButton, {
      props: { variant },
      slots: { default: 'Ação operacional' }
    });

    const button = wrapper.get('button');
    expect(button.classes()).toContain(`ds-btn--${variant}`);
    expect(button.text()).toBe('Ação operacional');
    expect(button.attributes('aria-label')).toBeUndefined();
    expect(button.attributes('type')).toBe('button');
  });

  it.each([
    ['sm', 'ds-btn--sm'],
    ['md', 'ds-btn--md'],
    ['lg', 'ds-btn--lg']
  ] as const)('keeps the requested %s size class', (size, className) => {
    expect(mount(DsButton, { props: { size }, slots: { default: 'Continuar' } }).classes()).toContain(className);
  });

  it('preserves the button width contract and exposes busy state while loading', async () => {
    const wrapper = mount(DsButton, {
      props: { loading: false },
      slots: { default: 'Salvar alterações' }
    });
    const button = wrapper.get('button');
    Object.defineProperty(button.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 184 })
    });

    await wrapper.setProps({ loading: true });

    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('aria-busy')).toBe('true');
    expect(button.find('.ds-btn__spinner').exists()).toBe(true);
    expect(button.attributes('style')).toContain('width: 184px');
  });

  it('does not emit an action from a disabled or loading button', async () => {
    const wrapper = mount(DsButton, {
      props: { loading: true },
      slots: { default: 'Enviar' }
    });

    await wrapper.trigger('click');

    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('supports an icon-only accessible action', () => {
    const wrapper = mount(DsButton, {
      props: { icon: 'search', ariaLabel: 'Buscar tutor' }
    });

    expect(wrapper.get('button').attributes('aria-label')).toBe('Buscar tutor');
    expect(wrapper.get('.ds-btn__icon').attributes('aria-hidden')).toBe('true');
  });

  it('preserves external link semantics and download metadata', () => {
    const wrapper = mount(DsButton, {
      props: {
        to: 'https://example.org/relatorio',
        target: '_blank',
        rel: 'noopener',
        download: 'relatorio.csv'
      },
      slots: { default: 'Baixar relatório' }
    });

    const link = wrapper.get('a');
    expect(link.attributes('href')).toBe('https://example.org/relatorio');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener');
    expect(link.attributes('download')).toBe('relatorio.csv');
  });

  it('marks a full-width action without changing its accessible name', () => {
    const wrapper = mount(DsButton, {
      props: { fullWidth: true },
      slots: { default: 'Entrar' }
    });

    expect(wrapper.get('button').classes()).toContain('ds-btn--full-width');
    expect(wrapper.text()).toBe('Entrar');
  });
});
