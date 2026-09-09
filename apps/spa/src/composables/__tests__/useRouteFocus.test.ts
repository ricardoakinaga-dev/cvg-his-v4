import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, onMounted, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView, useRoute, onBeforeRouteLeave, type NavigationGuard } from 'vue-router';
import { preserveNavigationFocus, useRouteFocus } from '../useRouteFocus';

const cleanup: (() => void)[] = [];
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  frames = new Map();
  let id = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
});
afterEach(() => {
  cleanup.splice(0).forEach(fn => fn());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
function renderFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}
async function setup(options: {
  earlyGuard?: NavigationGuard;
  claimOnLeave?: boolean;
  multipleScrollRegions?: boolean;
  semanticCardScrollRegions?: boolean;
} = {}) {
  let reorderActions: (() => void) | undefined;
  let reorderScrollRegions: (() => void) | undefined;
  const Page = defineComponent({
    setup() {
      const route = useRoute();
      const actionOrder = ref(['first-action', 'stable-action', 'last-action']);
      const scrollOrder = ref(['primary-results', 'secondary-results']);
      reorderActions = () => { actionOrder.value = ['last-action', 'first-action', 'stable-action']; };
      reorderScrollRegions = () => { scrollOrder.value = [...scrollOrder.value].reverse(); };
      onBeforeRouteLeave(to => {
        if (options.claimOnLeave) preserveNavigationFocus(router, to, document.getElementById("shell-search")!);
      });
      const scrollRegions = () => options.semanticCardScrollRegions
        ? scrollOrder.value.map(key => h('article', { key, class: 'ds-card' }, [
          h('div', { class: 'ds-card__header' }, [h('h2', { class: 'ds-card__title' }, key)]),
          h('div', { class: 'legacy-scroll-region', 'data-scroll-container': 'local' }, key)
        ]))
        : options.multipleScrollRegions
        ? scrollOrder.value.map(key => h('div', { class: 'local-scroll-region', 'data-scroll-container': 'local', 'data-scroll-key': key }, key))
        : [h('div', { class: 'local-scroll-region', 'data-scroll-container': 'local' }, 'Scrollable results')];
      return () => h('article', [h('h1', `Page ${route.params.id}`), h('input'),
        h('a', { href: '/empty' }, 'Cancel'), h('a', { href: '/empty' }, 'Cancel'),
        h('div', { class: 'action-list' }, actionOrder.value.map(action =>
          h('button', { key: action, 'data-focus-key': action }, action)
        )), h('button', { class: 'anonymous-action' }, 'Unkeyed action'), ...scrollRegions()]);
    }
  });
  const AutoFocus = defineComponent({
    setup() {
      const input = ref<HTMLInputElement | null>(null);
      onMounted(() => input.value?.focus());
      return () => h('article', [h('h1', 'Editor'), h('input', { ref: input })]);
    }
  });
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/page/:id', component: Page },
    { path: '/empty', component: { render: () => h('p', 'No heading') } },
    { path: '/editor', component: AutoFocus }
  ] });
  if (options.earlyGuard) router.beforeEach(options.earlyGuard);
  await router.push('/page/1');
  await router.isReady();
  const Shell = defineComponent({ setup() {
    const body = ref<HTMLElement | null>(null);
    useRouteFocus(body);
    return () => h('div', [h('button', 'Navigation'), h('input', { id: 'shell-search' }),
      h('a', { id: 'sidebar-link', href: '/page/2' }, 'Next page'),
      h('section', { ref: body, 'aria-label': 'Page content' }, [h(RouterView)])]);
  } });
  const wrapper = mount(Shell, { attachTo: document.body, global: { plugins: [router] } });
  cleanup.push(() => wrapper.unmount());
  await flushPromises();
  const navigate = async (path: string) => { await router.push(path); await flushPromises(); };
  return {
    wrapper,
    router,
    navigate,
    reorderActions: () => reorderActions?.(),
    reorderScrollRegions: () => reorderScrollRegions?.()
  };
}

describe('route focus', () => {
  it('respects explicit focus ownership in an earlier global guard', async () => {
    let activeRouter: Awaited<ReturnType<typeof setup>>['router'];
    const { wrapper, router, navigate } = await setup({ earlyGuard: to => {
      if (to.path === '/empty') preserveNavigationFocus(activeRouter, to, document.getElementById('shell-search')!);
    } });
    activeRouter = router;
    await navigate('/empty'); renderFrame();
    expect(document.activeElement).toBe(wrapper.get('#shell-search').element);
    (wrapper.get('#sidebar-link').element as HTMLElement).focus();
    await navigate('/page/2'); renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('respects explicit focus ownership in a component leave guard', async () => {
    const { wrapper, navigate } = await setup({ claimOnLeave: true });
    await navigate('/empty'); renderFrame();
    expect(document.activeElement).toBe(wrapper.get('#shell-search').element);
  });

  it.each(['aria-disabled', 'hidden', 'detached'])('does not retain an explicitly claimed target that becomes %s', async state => {
    const { wrapper, router, navigate } = await setup();
    router.beforeEach(to => { preserveNavigationFocus(router, to, document.getElementById('shell-search')!); });
    await navigate('/page/2');
    const target = wrapper.get('#shell-search').element;
    if (state === 'detached') target.remove();
    else target.setAttribute(state, state === 'aria-disabled' ? 'true' : '');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('consumes rejected ownership without affecting a later attempt', async () => {
    const { wrapper, router, navigate } = await setup();
    const remove = router.beforeEach(to => {
      preserveNavigationFocus(router, to, document.getElementById('shell-search')!);
      return false;
    });
    await navigate('/empty'); renderFrame(); remove();
    (wrapper.get('#sidebar-link').element as HTMLElement).focus();
    await navigate('/empty'); renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section').element);
  });

  it('leaves initial focus alone, then focuses the rendered heading without scrolling', async () => {
    const { wrapper, navigate } = await setup();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    renderFrame();
    expect(focus).not.toHaveBeenCalled();
    await navigate('/page/2');
    expect(focus).not.toHaveBeenCalled();
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
    expect(document.activeElement?.textContent).toBe('Page 2');
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(wrapper.get('h1').attributes('tabindex')).toBe('-1');
    (wrapper.get('button').element as HTMLElement).focus();
    expect(wrapper.get('h1').attributes('tabindex')).toBeUndefined();
  });

  it('uses the labelled workspace when a page has no visible heading', async () => {
    const { wrapper, navigate } = await setup();
    await navigate('/empty');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section').element);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Page content');
  });

  it('does not steal focus on query, hash, duplicate, or rejected navigation', async () => {
    const { wrapper, router, navigate } = await setup();
    const input = wrapper.get('section input').element as HTMLElement;
    input.focus();
    router.beforeEach(to => to.path === '/empty' ? false : undefined);
    for (const path of ['/page/1?q=test', '/page/1?q=test#details', '/page/1?q=test#details', '/empty']) {
      await navigate(path);
      renderFrame();
      expect(document.activeElement).toBe(input);
    }
  });

  it('respects a control focused by the new page or retained during a parameter update', async () => {
    const { wrapper, navigate } = await setup();
    const input = wrapper.get('section input').element as HTMLElement;
    input.focus();
    await navigate('/page/2');
    renderFrame();
    expect(document.activeElement).toBe(input);
    await navigate('/editor');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section input').element);
  });

  it.each(['aria', 'native'])('respects an active %s modal outside the workspace', async kind => {
    const { navigate } = await setup();
    const dialog = document.createElement(kind === 'native' ? 'dialog' : 'div');
    if (kind === 'native') dialog.setAttribute('open', '');
    else dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
    await navigate('/page/2');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    renderFrame();
    expect(focus).not.toHaveBeenCalled();
  });

  it('ignores hidden dialogs and hidden headings', async () => {
    const { wrapper, navigate } = await setup();
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.display = 'none';
    document.body.append(dialog);
    await navigate('/page/2');
    (wrapper.get('h1').element as HTMLElement).hidden = true;
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section').element);
  });

  it('cancels stale work for rapid navigation, even if an old callback is invoked', async () => {
    const { wrapper, navigate } = await setup();
    await navigate('/page/2');
    const stale = [...frames.values()][0]!;
    await navigate('/empty');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    stale(0);
    expect(focus).not.toHaveBeenCalled();
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section').element);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('cancels queued work on teardown and preserves author-provided tabindex', async () => {
    const { wrapper, navigate } = await setup();
    await navigate('/page/2');
    const heading = wrapper.get('h1').element;
    heading.setAttribute('tabindex', '0');
    renderFrame();
    (wrapper.get('button').element as HTMLElement).focus();
    expect(heading.getAttribute('tabindex')).toBe('0');
    await navigate('/empty');
    const stale = [...frames.values()][0]!;
    wrapper.unmount();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    stale(0);
    renderFrame();
    expect(focus).not.toHaveBeenCalled();
  });

  it('removes temporary tabindex when the shell unmounts', async () => {
    const { wrapper, navigate } = await setup();
    await navigate('/page/2');
    renderFrame();
    const heading = wrapper.get('h1').element;
    wrapper.unmount();
    expect(heading.hasAttribute('tabindex')).toBe(false);
  });

  it('preserves focus intentionally moved to a shell control while the frame is pending', async () => {
    const { wrapper, navigate } = await setup();
    await navigate('/empty');
    const button = wrapper.get('button').element as HTMLElement;
    button.focus();
    renderFrame();
    expect(document.activeElement).toBe(button);
  });

  it.each(['beforeEach', 'beforeResolve'] as const)('preserves a shell input focused during a %s guard', async hook => {
    const { wrapper, router, navigate } = await setup();
    const search = wrapper.get('#shell-search').element as HTMLElement;
    router[hook](() => { search.focus(); });
    await navigate('/page/2');
    renderFrame();
    expect(document.activeElement).toBe(search);
  });

  it('still orients focus when the sidebar link that started navigation remains focused', async () => {
    const { wrapper, navigate } = await setup();
    (wrapper.get('#sidebar-link').element as HTMLElement).focus();
    await navigate('/page/2');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('restores the departing duplicate link on native Back, but not on a new push', async () => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.findAll('section a')[1]!.element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    renderFrame();
    expect(document.activeElement).toBe(wrapper.findAll('section a')[1]!.element);
    expect(document.activeElement?.hasAttribute('tabindex')).toBe(false);
    await navigate('/empty');
    renderFrame();
    await navigate('/page/1');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('restores a key-only button across native Back and Forward without scrolling', async () => {
    const { wrapper, router, navigate, reorderActions } = await setup();
    const stableAction = () => wrapper.get('button[data-focus-key="stable-action"]');
    expect(stableAction().attributes('id')).toBeUndefined();
    await navigate('/empty');
    renderFrame();
    await navigate('/page/2');
    renderFrame();
    (stableAction().element as HTMLElement).focus();
    router.back();
    await flushPromises();
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('section').element);
    router.forward();
    await flushPromises();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    reorderActions();
    await flushPromises();
    expect(wrapper.findAll('.action-list button').map(button => button.attributes('data-focus-key')))
      .toEqual(['last-action', 'first-action', 'stable-action']);
    renderFrame();
    expect(document.activeElement).toBe(stableAction().element);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it('does not infer a return identity from an unkeyed button', async () => {
    const { wrapper, router, navigate } = await setup();
    const target = wrapper.get('.anonymous-action');
    expect(target.attributes('id')).toBeUndefined();
    expect(target.attributes('data-focus-key')).toBeUndefined();
    (target.element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('clears a previous identity when a later departure uses an unkeyed control', async () => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    renderFrame();

    (wrapper.get('.anonymous-action').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    renderFrame();

    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('restores local scroll coordinates together with a stable return control', async () => {
    const { wrapper, router, navigate } = await setup();
    const region = wrapper.get('.local-scroll-region').element as HTMLElement;
    region.scrollLeft = 321;
    region.scrollTop = 44;
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();

    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    renderFrame();

    const restored = wrapper.get('.local-scroll-region').element as HTMLElement;
    expect(restored.scrollLeft).toBe(321);
    expect(restored.scrollTop).toBe(44);
    expect(document.activeElement).toBe(wrapper.get('button[data-focus-key="stable-action"]').element);
  });

  it('resets local scroll coordinates on a new page navigation', async () => {
    const { wrapper, navigate } = await setup({ multipleScrollRegions: true });
    const primary = wrapper.get('[data-scroll-key="primary-results"]').element as HTMLElement;
    const secondary = wrapper.get('[data-scroll-key="secondary-results"]').element as HTMLElement;
    primary.scrollLeft = 321;
    primary.scrollTop = 44;
    secondary.scrollLeft = 654;
    secondary.scrollTop = 88;

    await navigate('/page/2');
    renderFrame();

    expect(primary).toMatchObject({ scrollLeft: 0, scrollTop: 0 });
    expect(secondary).toMatchObject({ scrollLeft: 0, scrollTop: 0 });
  });

  it('restores local scroll by semantic key when multiple regions reorder', async () => {
    const { wrapper, router, navigate, reorderScrollRegions } = await setup({ multipleScrollRegions: true });
    const primary = wrapper.get('[data-scroll-key="primary-results"]').element as HTMLElement;
    const secondary = wrapper.get('[data-scroll-key="secondary-results"]').element as HTMLElement;
    primary.scrollLeft = 321;
    primary.scrollTop = 44;
    secondary.scrollLeft = 654;
    secondary.scrollTop = 88;

    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    reorderScrollRegions();
    await flushPromises();
    renderFrame();

    expect(wrapper.get('[data-scroll-key="primary-results"]').element).toMatchObject({ scrollLeft: 321, scrollTop: 44 });
    expect(wrapper.get('[data-scroll-key="secondary-results"]').element).toMatchObject({ scrollLeft: 654, scrollTop: 88 });
  });

  it('restores legacy local scroll by its titled card when regions reorder', async () => {
    const { wrapper, router, navigate, reorderScrollRegions } = await setup({ semanticCardScrollRegions: true });
    const regionFor = (title: string) => wrapper.findAll('.ds-card')
      .find(card => card.find('.ds-card__title').text() === title)!
      .find('.legacy-scroll-region').element as HTMLElement;
    const primary = regionFor('primary-results');
    const secondary = regionFor('secondary-results');
    primary.scrollLeft = 321;
    primary.scrollTop = 44;
    secondary.scrollLeft = 654;
    secondary.scrollTop = 88;

    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    reorderScrollRegions();
    await flushPromises();
    renderFrame();

    expect(regionFor('primary-results')).toMatchObject({ scrollLeft: 321, scrollTop: 44 });
    expect(regionFor('secondary-results')).toMatchObject({ scrollLeft: 654, scrollTop: 88 });
  });

  it('waits for an asynchronously rendered return control while the destination is loading', async () => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();

    const body = wrapper.get('section').element as HTMLElement;
    body.querySelector('button[data-focus-key="stable-action"]')?.remove();
    body.setAttribute('aria-busy', 'true');
    renderFrame();
    expect(document.activeElement).not.toBe(wrapper.get('h1').element);

    body.removeAttribute('aria-busy');
    const lateAction = document.createElement('button');
    lateAction.dataset.focusKey = 'stable-action';
    lateAction.textContent = 'stable-action';
    body.querySelector('.action-list')?.append(lateAction);
    await flushPromises();
    renderFrame();

    expect(document.activeElement).toBe(lateAction);
  });

  it('falls back after a loading return target remains unresolved', async () => {
    vi.useFakeTimers();
    try {
      const { wrapper, router, navigate } = await setup();
      (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
      await navigate('/empty');
      renderFrame();
      router.back();
      await flushPromises();

      const body = wrapper.get('section').element as HTMLElement;
      body.querySelector('button[data-focus-key="stable-action"]')?.remove();
      body.setAttribute('aria-busy', 'true');
      renderFrame();
      expect(document.activeElement).not.toBe(wrapper.get('h1').element);

      vi.advanceTimersByTime(1000);
      renderFrame();

      expect(document.activeElement).toBe(wrapper.get('h1').element);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['hidden', 'disabled', 'missing'])('falls back to the heading when the return control is %s', async state => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    const target = wrapper.get('button[data-focus-key="stable-action"]').element;
    if (state === 'missing') target.remove();
    else target.setAttribute(state, '');
    renderFrame();
    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it('falls back when a missing return control is replaced by a terminal state message', async () => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();

    const body = wrapper.get('section').element as HTMLElement;
    body.querySelector('button[data-focus-key="stable-action"]')?.remove();
    const terminalState = document.createElement('p');
    terminalState.className = 'state-message';
    terminalState.textContent = 'Nenhum resultado encontrado.';
    body.append(terminalState);
    renderFrame();

    expect(document.activeElement).toBe(wrapper.get('h1').element);
  });

  it.each(['body', 'second-summary', 'first-summary'])('handles a return control in closed details %s', async location => {
    const { wrapper, router, navigate } = await setup();
    (wrapper.get('button[data-focus-key="stable-action"]').element as HTMLElement).focus();
    await navigate('/empty');
    renderFrame();
    router.back();
    await flushPromises();
    const target = wrapper.get('button[data-focus-key="stable-action"]').element;
    const details = document.createElement('details');
    const first = document.createElement('summary');
    first.textContent = 'Visible summary';
    const second = document.createElement('summary');
    second.textContent = 'Hidden summary';
    details.append(first, second);
    target.before(details);
    (location === 'body' ? details : location === 'first-summary' ? first : second).append(target);
    renderFrame();
    expect(document.activeElement).toBe(location === 'first-summary' ? target : wrapper.get('h1').element);
  });
});
