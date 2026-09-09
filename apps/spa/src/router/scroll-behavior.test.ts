import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { scrollBehavior } from './scroll-behavior';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }]
});

type ScrollLocation = Parameters<typeof scrollBehavior>[0];
type ScrollSavedPosition = Parameters<typeof scrollBehavior>[2];

function scrollLocation(location: ReturnType<typeof router.resolve>): ScrollLocation {
  return location as ScrollLocation;
}

function navigate(to: string, from: string, savedPosition: ScrollSavedPosition = null) {
  return scrollBehavior(
    scrollLocation(router.resolve(to)),
    scrollLocation(router.resolve(from)),
    savedPosition
  );
}

function anchor(id: string) {
  const element = document.createElement('section');
  element.id = id;
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('navigation scroll policy', () => {
  it('restores history coordinates before considering a new path or anchor', () => {
    anchor('summary');
    const savedPosition = { left: 24, top: 860 };

    expect(navigate('/patients#summary', '/owners', savedPosition)).toEqual({
      ...savedPosition,
      behavior: 'instant'
    });
    expect(savedPosition).toEqual({ left: 24, top: 860 });
  });

  it('restores a zero history position even when only filters changed', () => {
    expect(navigate('/patients?page=1', '/patients?page=2', { left: 0, top: 0 })).toEqual({
      left: 0,
      top: 0,
      behavior: 'instant'
    });
  });

  it.each([
    ['/patients?search=ana', '/patients?search=bea'],
    ['/patients', '/patients?page=2'],
    ['/patients#summary', '/patients#summary'],
    ['/patients?page=2#summary', '/patients?page=1#summary']
  ])('retains scroll for the same page and anchor: %s', (to, from) => {
    anchor('summary');
    expect(navigate(to, from)).toBe(false);
  });

  it('starts a different page at the top', () => {
    expect(navigate('/patients/42', '/patients?page=3')).toEqual({
      left: 0,
      top: 0,
      behavior: 'instant'
    });
  });

  it.each(['/owners', '/patients#previous'])(
    'targets an anchor when navigating from %s',
    (from) => {
      const element = anchor('summary');
      expect(navigate('/patients#summary', from)).toEqual({ el: element, behavior: 'instant' });
    }
  );

  it('resolves encoded fragments and IDs that are invalid CSS selectors', () => {
    const element = anchor('42:details [ação]');
    expect(navigate(`/patients#${encodeURIComponent(element.id)}`, '/patients')).toEqual({
      el: element,
      behavior: 'instant'
    });
  });

  it.each(['#missing', '#', '#%E0%A4%A'])('handles absent or invalid anchor %s safely', (hash) => {
    const to = { ...router.resolve('/patients'), hash } as ScrollLocation;
    expect(scrollBehavior(to, scrollLocation(router.resolve('/patients#previous')), null)).toBe(
      false
    );
    expect(scrollBehavior(to, scrollLocation(router.resolve('/owners')), null)).toEqual({
      left: 0,
      top: 0,
      behavior: 'instant'
    });
  });

  it('preserves scroll when an anchor is removed from the same page', () => {
    expect(navigate('/patients', '/patients#summary')).toBe(false);
  });

  it.each([true, false])('never requests animation when reduced motion is %s', (matches) => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches }))
    );
    const element = anchor('summary');
    expect(navigate('/patients', '/owners')).toMatchObject({ behavior: 'instant' });
    expect(navigate('/patients#summary', '/owners')).toEqual({ el: element, behavior: 'instant' });
    expect(navigate('/patients', '/owners', { left: 4, top: 8 })).toMatchObject({
      behavior: 'instant'
    });
  });
});
