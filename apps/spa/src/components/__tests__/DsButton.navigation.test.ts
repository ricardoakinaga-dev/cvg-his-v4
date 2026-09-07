import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

async function fixture(props: Record<string, unknown> = { to: '/patients?sort=name#active' }) {
  const router = createRouter({
    history: createMemoryHistory('/clinic/'),
    routes: [
      { path: '/', component: { template: '<p>Home screen</p>' } },
      { path: '/patients', component: { template: '<p>Patients screen</p>' } }
    ]
  });
  await router.push('/');
  await router.isReady();
  const command = vi.fn();
  const buttonProps = reactive(props);
  const wrapper = mount(defineComponent({
    setup: () => () => h('div', [
      h(DsButton, { ...buttonProps, onClick: command }, () => 'Patients'),
      h(RouterView)
    ])
  }), { global: { plugins: [router], stubs: { RouterLink: false } } });
  cleanups.push(() => wrapper.unmount());
  return { wrapper, router, command, buttonProps };
}

// Observe whether the component cancels document navigation, then suppress jsdom's
// default browser action. Modified/external clicks must reach this listener uncanceled.
function click(element: Element, options: MouseEventInit = {}, eventType = 'click') {
  let preventedByComponent = false;
  element.parentElement!.addEventListener(eventType, (event) => {
    preventedByComponent = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  element.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, ...options }));
  return preventedByComponent;
}

describe('DsButton navigation contract', () => {
  it('changes the real router view without a document navigation and supports back/forward', async () => {
    const { wrapper, router, command } = await fixture();
    expect(wrapper.text()).toContain('Home screen');
    const documentNavigationPrevented = click(wrapper.get('a').element);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/patients?sort=name#active');
    expect(documentNavigationPrevented).toBe(true);
    expect(wrapper.get('a').attributes('href')).toBe('/clinic/patients?sort=name#active');
    expect(wrapper.text()).toContain('Patients screen');
    expect(command).toHaveBeenCalledTimes(1);
    router.back();
    await flushPromises();
    expect(wrapper.text()).toContain('Home screen');
    router.forward();
    await flushPromises();
    expect(wrapper.text()).toContain('Patients screen');
  });

  it.each([
    { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }
  ])('preserves native modified click %j', async (options) => {
    const { wrapper, router } = await fixture();
    expect(click(wrapper.get('a').element, options)).toBe(false);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it.each([{ target: '_blank' }, { target: 'report-window' }, { download: 'patients.csv' }])(
    'preserves native target/download behavior %j', async (attrs) => {
      const { wrapper, router } = await fixture({ to: '/patients', ...attrs });
      expect(click(wrapper.get('a').element)).toBe(false);
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe('/');
    }
  );

  it.each(['https://example.org/report', 'mailto:clinic@example.org', '/download.csv'])(
    'keeps href %s as native navigation', async (href) => {
      const { wrapper, router } = await fixture({ href });
      expect(wrapper.get('a').attributes('href')).toBe(href);
      expect(click(wrapper.get('a').element)).toBe(false);
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe('/');
    }
  );

  it.each(['https://example.org/report', '//example.org/report', 'mailto:clinic@example.org'])(
    'does not treat absolute to %s as a SPA route', async (to) => {
      const { wrapper, router } = await fixture({ to });
      expect(wrapper.get('a').attributes('href')).toBe(to);
      expect(click(wrapper.get('a').element)).toBe(false);
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe('/');
    }
  );

  it('resolves a relative route against the current route and honors explicit _self', async () => {
    const { wrapper, router } = await fixture({ to: './patients?sort=name#active', target: '_self' });
    await router.push('/patients');
    await flushPromises();
    expect(wrapper.get('a').attributes('href')).toBe('/clinic/patients?sort=name#active');
    expect(click(wrapper.get('a').element)).toBe(true);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/patients?sort=name#active');
  });

  it.each(['disabled', 'loading'])('blocks navigation and commands while %s', async (state) => {
    for (const destination of [{ to: '/patients' }, { href: 'https://example.org' }]) {
      const { wrapper, router, command } = await fixture({ ...destination, [state]: true });
      expect(wrapper.get('a').attributes('href')).toBeUndefined();
      expect(click(wrapper.get('a').element)).toBe(true);
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe('/');
      expect(command).not.toHaveBeenCalled();
      expect(wrapper.get('a').attributes('aria-disabled')).toBe('true');
      expect(wrapper.get('a').attributes('tabindex')).toBe('-1');
    }
  });

  it.each([
    { state: 'disabled', destination: { to: '/patients' }, href: '/clinic/patients' },
    { state: 'loading', destination: { to: '/patients' }, href: '/clinic/patients' },
    { state: 'disabled', destination: { href: 'https://example.org' }, href: 'https://example.org' },
    { state: 'loading', destination: { href: 'https://example.org' }, href: 'https://example.org' }
  ])('removes and restores the native destination for $state $href', async ({ state, destination, href }) => {
    const { wrapper, router, command, buttonProps } = await fixture(destination);
    const anchor = wrapper.get('a').element as HTMLAnchorElement;
    expect(anchor.href).not.toBe('');
    expect(wrapper.get('a').attributes('href')).toBe(href);
    expect(click(anchor, { button: 1 }, 'auxclick')).toBe(false);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
    expect(command).not.toHaveBeenCalled();

    buttonProps[state] = true;
    await nextTick();
    expect(anchor.hasAttribute('href')).toBe(false);
    expect(anchor.href).toBe('');
    expect(click(anchor, { button: 1 }, 'auxclick')).toBe(true);
    anchor.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    expect(anchor.hasAttribute('href')).toBe(false);
    expect(click(anchor, { ctrlKey: true })).toBe(true);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
    expect(command).not.toHaveBeenCalled();

    buttonProps[state] = false;
    await nextTick();
    expect(wrapper.get('a').attributes('href')).toBe(href);
    expect(click(anchor, { button: 1 }, 'auxclick')).toBe(false);
    expect(click(anchor, { ctrlKey: true })).toBe(false);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('allows consumers to cancel route navigation', async () => {
    const { wrapper, router, command } = await fixture({ to: '/patients' });
    command.mockImplementation((event: MouseEvent) => event.preventDefault());
    expect(click(wrapper.get('a').element)).toBe(true);
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('defaults to a non-submitting command and supports explicit submit', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const command = vi.fn();
    const buttonProps = reactive({ type: undefined as 'submit' | undefined, disabled: false, loading: false });
    const wrapper = mount(defineComponent({
      setup: () => () => h('form', { onSubmit: submit }, [h(DsButton, { ...buttonProps, onClick: command }, () => 'Save')])
    }), { attachTo: document.body });
    cleanups.push(() => wrapper.unmount());
    (wrapper.get('button').element as HTMLButtonElement).click();
    expect(command).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    buttonProps.type = 'submit';
    await nextTick();
    (wrapper.get('button').element as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledTimes(1);
    for (const state of ['disabled', 'loading']) {
      Object.assign(buttonProps, { disabled: false, loading: false, [state]: true });
      await nextTick();
      (wrapper.get('button').element as HTMLButtonElement).click();
      expect(command).toHaveBeenCalledTimes(2);
      expect(submit).toHaveBeenCalledTimes(1);
    }
  });
});
