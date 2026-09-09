import type { RouterScrollBehavior } from 'vue-router';

/** Resolve IDs without interpreting user-controlled fragments as CSS selectors. */
function anchorElement(hash: string): HTMLElement | null {
  if (!hash.startsWith('#') || hash.length === 1 || typeof document === 'undefined') {
    return null;
  }

  const id = hash.slice(1);
  const exactMatch = document.getElementById(id);
  if (exactMatch) return exactMatch;

  // Vue Router normally decodes fragments; also accept encoded direct inputs.
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
}

/** History restores position; filters retain it; new pages start at the top. */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  // Instant scrolling also respects reduced motion when global CSS enables smooth scroll.
  if (savedPosition) {
    return { ...savedPosition, behavior: 'instant' };
  }

  const samePath = to.path === from.path;
  if (samePath && to.hash === from.hash) {
    return false;
  }

  const anchor = anchorElement(to.hash);
  if (anchor) {
    return { el: anchor, behavior: 'instant' };
  }

  return samePath ? false : { left: 0, top: 0, behavior: 'instant' };
};
