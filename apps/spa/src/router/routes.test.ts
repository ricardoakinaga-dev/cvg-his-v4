import { describe, expect, it } from 'vitest';

import { routes } from './routes';

function findChildRoute(path: string) {
  const appShell = routes.find((route) => route.path === '/');
  const children = appShell?.children ?? [];
  return children.find((route) => route.path === path);
}

describe('router convergence', () => {
  it('redirects legacy scheduling routes to the canonical agenda', () => {
    expect(findChildRoute('scheduling')?.redirect).toBe('/appointments');
    expect(findChildRoute('scheduling/new')?.redirect).toBe('/appointments/new');
  });

  it('keeps the queue route canonical inside Atendimento', () => {
    const queueRoute = findChildRoute('queue');
    expect(queueRoute?.meta?.title).toBe('Fila Operacional');
    expect(queueRoute?.meta?.breadcrumb).toBe('Fila Operacional');
    expect(queueRoute?.meta?.breadcrumbParent).toBe('Agenda');
  });
});
