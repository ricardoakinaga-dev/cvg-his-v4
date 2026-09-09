import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import {
  cancelPendingSuccessFlashActivation,
  scheduleSuccessRedirect,
  useSuccessFlash,
  useSuccessRedirect
} from '../successRedirect';

describe('scheduleSuccessRedirect', () => {
  const originalMatchMedia = window.matchMedia;
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;

  function flushFrame() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(performance.now()));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    frames.clear();
    cancelPendingSuccessFlashActivation();
    useSuccessFlash().clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia
    });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('commits the success announcement across a bounded pair of paint frames', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false }))
    });
    const callback = vi.fn();

    const handle = scheduleSuccessRedirect(callback);
    expect(handle.cancel).toEqual(expect.any(Function));
    expect(callback).not.toHaveBeenCalled();
    flushFrame();
    expect(callback).not.toHaveBeenCalled();
    flushFrame();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('does not introduce a duration-based JavaScript wait', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/composables/successRedirect.ts'), 'utf8');
    expect(source).toContain('requestAnimationFrame');
    expect(source).toContain('queueMicrotask');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('delayMs');
  });

  it('runs at the next microtask when reduced motion is requested', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)'
      }))
    });
    const callback = vi.fn();

    scheduleSuccessRedirect(callback);
    expect(callback).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('refuses a newer submission while success feedback is pending', async () => {
    const controller = useSuccessRedirect();
    const first = vi.fn();

    expect(controller.begin()).toBe(true);
    controller.schedule(first);
    expect(controller.successPending.value).toBe(true);
    expect(controller.begin()).toBe(false);

    flushFrame();
    expect(first).not.toHaveBeenCalled();
    flushFrame();
    expect(first).toHaveBeenCalledOnce();
    expect(controller.successPending.value).toBe(false);
    expect(controller.begin()).toBe(true);
  });

  it('keeps a confirmed success message available after the route callback', () => {
    const flash = useSuccessFlash();
    const controller = useSuccessRedirect();
    const callback = vi.fn();

    expect(controller.begin()).toBe(true);
    controller.schedule(callback, 'Usuário criado com sucesso!');
    flushFrame();
    expect(flash.message.value).toBeNull();
    flushFrame();
    expect(callback).toHaveBeenCalledOnce();
    expect(flash.message.value).toBeNull();
    flushFrame();
    expect(flash.message.value).toBe('Usuário criado com sucesso!');
    flash.clear();
  });

  it('waits for an SPA navigation promise before activating the shell flash', async () => {
    const flash = useSuccessFlash();
    const controller = useSuccessRedirect();
    const callback = vi.fn();
    let resolveNavigation!: () => void;
    const navigation = new Promise<void>((resolve) => {
      resolveNavigation = resolve;
    });
    callback.mockReturnValue(navigation);

    expect(controller.begin()).toBe(true);
    controller.schedule(callback, 'Membro cadastrado com sucesso.');
    flushFrame();
    flushFrame();
    expect(callback).toHaveBeenCalledOnce();
    expect(flash.message.value).toBeNull();
    expect(controller.successPending.value).toBe(true);
    expect(controller.begin()).toBe(false);

    resolveNavigation();
    await Promise.resolve();
    expect(flash.message.value).toBeNull();
    flushFrame();
    expect(flash.message.value).toBe('Membro cadastrado com sucesso.');
    expect(controller.successPending.value).toBe(false);
    flash.clear();
  });

  it('activates the shell flash after a real successful router navigation', async () => {
    let controller!: ReturnType<typeof useSuccessRedirect>;
    const Form = defineComponent({
      setup() {
        controller = useSuccessRedirect();
        return () => h('div', 'form');
      }
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/form', component: Form },
        { path: '/destination', component: { render: () => h('p', 'destination') } }
      ]
    });
    await router.push('/form');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    await flushPromises();
    const flash = useSuccessFlash();

    controller.begin();
    controller.schedule(() => router.push('/destination'), 'Navegação confirmada.');
    flushFrame();
    flushFrame();
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/destination');
    expect(flash.message.value).toBeNull();
    flushFrame();
    expect(flash.message.value).toBe('Navegação confirmada.');
    wrapper.unmount();
  });

  it('does not announce a completed route after the shell has moved on', async () => {
    let controller!: ReturnType<typeof useSuccessRedirect>;
    const Form = defineComponent({
      setup() {
        controller = useSuccessRedirect();
        return () => h('div', 'form');
      }
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/form', component: Form },
        { path: '/destination', component: { render: () => h('p', 'destination') } },
        { path: '/later', component: { render: () => h('p', 'later') } }
      ]
    });
    await router.push('/form');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    await flushPromises();
    const flash = useSuccessFlash();

    controller.begin();
    controller.schedule(() => router.push('/destination'), 'Destino B concluído.');
    flushFrame();
    flushFrame();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/destination');
    expect(flash.message.value).toBeNull();

    await router.push('/later');
    cancelPendingSuccessFlashActivation();
    flushFrame();
    expect(router.currentRoute.value.path).toBe('/later');
    expect(flash.message.value).toBeNull();
    expect(controller.successPending.value).toBe(false);
    wrapper.unmount();
  });

  it('does not activate a flash when an SPA navigation resolves with a failure', async () => {
    let controller!: ReturnType<typeof useSuccessRedirect>;
    const Form = defineComponent({
      setup() {
        controller = useSuccessRedirect();
        return () => h('div', 'form');
      }
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/form', component: Form },
        {
          path: '/blocked',
          component: { render: () => h('p', 'blocked') },
          beforeEnter: () => false
        }
      ]
    });
    await router.push('/form');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    await flushPromises();
    const flash = useSuccessFlash();

    expect(controller.begin()).toBe(true);
    controller.schedule(() => router.push('/blocked'), 'Registro criado com sucesso!');
    flushFrame();
    flushFrame();
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/form');
    expect(flash.message.value).toBeNull();
    expect(window.sessionStorage.getItem('cvg-pulse.success-flash.v1')).toBeNull();
    expect(controller.successPending.value).toBe(false);
    wrapper.unmount();
  });

  it('clears persisted feedback and unlocks the form when navigation rejects', async () => {
    const controller = useSuccessRedirect();
    const callback = vi.fn(() => Promise.reject(new Error('navigation failed')));

    expect(controller.begin()).toBe(true);
    controller.schedule(callback, 'Registro criado com sucesso!');
    flushFrame();
    flushFrame();
    await flushPromises();

    expect(callback).toHaveBeenCalledOnce();
    expect(useSuccessFlash().message.value).toBeNull();
    expect(window.sessionStorage.getItem('cvg-pulse.success-flash.v1')).toBeNull();
    expect(controller.successPending.value).toBe(false);
    expect(controller.begin()).toBe(true);
  });

  it('cancels destination-shell activation when a new route cycle explicitly cancels it', () => {
    const controller = useSuccessRedirect();
    const flash = useSuccessFlash();

    expect(controller.begin()).toBe(true);
    controller.schedule(vi.fn(), 'Registro criado com sucesso!');
    flushFrame();
    flushFrame();
    expect(controller.successPending.value).toBe(true);

    controller.cancel();
    flushFrame();
    expect(flash.message.value).toBeNull();
    expect(controller.successPending.value).toBe(false);
    expect(controller.begin()).toBe(true);
  });

  it('does not re-arm a stale async response after route invalidation', async () => {
    const controller = useSuccessRedirect();
    const stale = vi.fn();
    let resolveRequest!: () => void;
    const request = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    controller.begin();
    controller.invalidate();
    resolveRequest();
    await request.then(() => controller.schedule(stale));

    flushFrame();
    flushFrame();
    expect(stale).not.toHaveBeenCalled();

    controller.begin();
    controller.schedule(stale);
    flushFrame();
    flushFrame();
    expect(stale).toHaveBeenCalledOnce();
  });

  it('cancels the redirect when a routed form is unmounted', async () => {
    let controller!: ReturnType<typeof useSuccessRedirect>;
    const Form = defineComponent({
      setup() {
        controller = useSuccessRedirect();
        return () => h('div', 'form');
      }
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/form', component: Form },
        { path: '/list', component: { render: () => h('p', 'list') } }
      ]
    });
    await router.push('/form');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    await flushPromises();
    const callback = vi.fn();

    controller.schedule(callback);
    wrapper.unmount();
    flushFrame();
    flushFrame();

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels the redirect when the route is updated in place', async () => {
    let controller!: ReturnType<typeof useSuccessRedirect>;
    const Form = defineComponent({
      setup() {
        controller = useSuccessRedirect();
        return () => h('div', 'form');
      }
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/form/:id', component: Form }]
    });
    await router.push('/form/one');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    await flushPromises();
    const callback = vi.fn();

    controller.schedule(callback);
    await router.push('/form/two');
    flushFrame();
    flushFrame();

    expect(callback).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the bounded migration inventory explicit across all legacy consumers', () => {
    const consumers = [
      'src/pages/breeds/BreedFormPage.vue',
      'src/pages/coat-colors/CoatColorFormPage.vue',
      'src/pages/customer-groups/CustomerGroupFormPage.vue',
      'src/pages/encounters/EncounterFormPage.vue',
      'src/pages/inventory/InventoryFormPage.vue',
      'src/pages/laboratory/LaboratoryBiochemistryReferenceValueFormPage.vue',
      'src/pages/laboratory/LaboratoryEquipmentFormPage.vue',
      'src/pages/laboratory/LaboratoryHemogramReferenceValueFormPage.vue',
      'src/pages/laboratory/LaboratoryReportTypeFormPage.vue',
      'src/pages/patients/PatientFormPage.vue',
      'src/pages/products/ProductFormPage.vue',
      'src/pages/responsibility-terms/ResponsibilityTermFormPage.vue',
      'src/pages/scheduling/SchedulingFormPage.vue',
      'src/pages/services/ServiceFormPage.vue',
      'src/pages/species/SpeciesFormPage.vue',
      'src/pages/staff/StaffFormPage.vue',
      'src/pages/users/UserFormPage.vue',
      'src/pages/webhooks/WebhookFormPage.vue'
    ];

    expect(consumers).toHaveLength(18);
    for (const relativePath of consumers) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      expect(source, relativePath).toContain('useSuccessRedirect');
      expect(source, relativePath).toContain('successRedirect.begin()');
      expect(source, relativePath).toMatch(/!successRedirect\.begin\(\)/);
      expect(source, relativePath).toContain('successRedirect.schedule(');
      expect(source, relativePath).toContain('successRedirect.successPending');
      expect(source, relativePath).not.toContain('scheduleSuccessRedirect(');
      expect(source, relativePath).not.toMatch(/setTimeout\s*\(/);
    }
  });
});
