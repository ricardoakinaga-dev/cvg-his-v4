import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, isNavigationFailure, NavigationFailureType, RouterView } from 'vue-router';
import { useUnsavedChanges } from '../useUnsavedChanges';

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(fn => fn()));
async function setup() {
  let protection!: ReturnType<typeof useUnsavedChanges>;
  const value = ref('initial');
  const Form = defineComponent({ setup() { protection = useUnsavedChanges(() => value.value); return () => h('input', { value: value.value }); } });
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/form/:id', component: Form }, { path: '/list', component: { render: () => h('p', 'list') } }
  ] });
  await router.push('/form/1'); await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  cleanup.push(() => wrapper.unmount());
  await flushPromises();
  return { protection, value, router, wrapper };
}
describe('unsaved changes through router navigation', () => {
  it('keeps edits when leaving is declined, then permits explicit discard', async () => {
    const { protection, value, router } = await setup();
    value.value = 'draft';
    const first = router.push('/list'); await flushPromises();
    expect(protection.leaveRequested.value).toBe(true);
    expect(router.currentRoute.value.path).toBe('/form/1');
    protection.resolveLeave(false); await first;
    expect(value.value).toBe('draft');
    expect(router.currentRoute.value.path).toBe('/form/1');
    const second = router.push('/list'); await flushPromises();
    protection.resolveLeave(true); await second;
    expect(router.currentRoute.value.path).toBe('/list');
  });
  it('protects changing the record in the same component', async () => {
    const { protection, value, router } = await setup(); value.value = 'draft';
    const navigation = router.push('/form/2'); await flushPromises();
    expect(protection.leaveRequested.value).toBe(true);
    protection.resolveLeave(false); await navigation;
    expect(router.currentRoute.value.params.id).toBe('1');
  });
  it('marks only the submitted snapshot clean, retaining subsequent edits', async () => {
    const { protection, value } = await setup(); value.value = 'submitted'; const submitted = value.value;
    value.value = 'newer'; protection.markClean(submitted);
    expect(protection.dirty.value).toBe(true);
    protection.markClean(); expect(protection.dirty.value).toBe(false);
  });
  it('allows clean navigation and warns on browser unload only while dirty', async () => {
    const { protection, value, router } = await setup();
    const clean = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    value.value = 'draft'; const dirty = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    protection.markClean(); await router.push('/list');
    expect(router.currentRoute.value.path).toBe('/list');
    const after = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

describe('concurrent navigation and teardown', () => {
  it('settles pending departure when the component is disposed', async () => {
    const { protection, value, router, wrapper } = await setup();
    value.value = 'draft';
    const navigation = router.push('/list'); await flushPromises();
    expect(protection.leaveRequested.value).toBe(true);
    wrapper.unmount(); const result = await navigation;
    expect(isNavigationFailure(result, NavigationFailureType.aborted)).toBe(true);
    expect(protection.leaveRequested.value).toBe(false);
  });
  it('shares a confirmation for rapid competing destinations without discarding on cancel', async () => {
    const { protection, value, router } = await setup();
    value.value = 'draft';
    const first = router.push('/list'); await flushPromises();
    const second = router.push('/form/2'); await flushPromises();
    protection.resolveLeave(false); await Promise.all([first, second]);
    expect(router.currentRoute.value.path).toBe('/form/1');
    expect(value.value).toBe('draft');
  });
});

describe('workspace logout consent', () => {
  it('keeps session and draft on decline; discard permits logout navigation without a second prompt', async () => {
    const { createUnsavedChangesCoordinator, unsavedChangesCoordinatorKey } = await import('../unsavedChangesCoordinator');
    const coordinator = createUnsavedChangesCoordinator();
    let protection!: ReturnType<typeof useUnsavedChanges>;
    const value = ref('initial'); const authenticated = ref(true);
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/form', component: defineComponent({ setup() { protection = useUnsavedChanges(() => value.value); return () => h('input'); } }) },
      { path: '/login', component: { render: () => h('p', 'login') } }
    ] });
    await router.push('/form');
    const wrapper = mount(RouterView, { global: { plugins: [router], provide: { [unsavedChangesCoordinatorKey as symbol]: coordinator } } });
    cleanup.push(() => wrapper.unmount()); await flushPromises(); value.value = 'draft';
    async function logout() { if (await coordinator.confirmAndDiscard()) { authenticated.value = false; await router.replace('/login'); } }
    const first = logout(); await flushPromises(); protection.resolveLeave(false); await first;
    expect(authenticated.value).toBe(true); expect(value.value).toBe('draft');
    expect(router.currentRoute.value.path).toBe('/form');
    const second = logout(); await flushPromises(); protection.resolveLeave(true); await second;
    expect(authenticated.value).toBe(false); expect(router.currentRoute.value.path).toBe('/login');
    expect(protection.leaveRequested.value).toBe(false);
  });

  it('does not discard a different record or changed values while awaiting consent', async () => {
    const { createUnsavedChangesCoordinator } = await import('../unsavedChangesCoordinator');
    const coordinator = createUnsavedChangesCoordinator(); let value = 'draft'; let discarded = false;
    let resolve!: (answer: boolean) => void;
    coordinator.register({ snapshot: () => value, confirm: () => new Promise<boolean>(r => { resolve = r; }), discard: () => { discarded = true; } });
    const request = coordinator.confirmAndDiscard(); value = 'new edits'; resolve(true);
    expect(await request).toBe(false); expect(discarded).toBe(false);
  });
});
