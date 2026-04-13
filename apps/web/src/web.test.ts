import { describe, expect, it } from 'vitest';

import { buildPage, createWebServer, routes } from './index.js';

describe('apps/web smoke automation', () => {
  it('renders bootstrap HTML for administrative routes without crashing', () => {
    expect(buildPage('/')).toContain('Dashboard');
    expect(buildPage('/staff')).toContain('Equipe');
    expect(buildPage('/users')).toContain('Usuários');
    expect(buildPage('/notifications')).toContain('Notifica');
    expect(buildPage('/route-that-does-not-exist')).toContain('Dashboard');
  });

  it('keeps the main administrative navigation reachable in rendered shells', () => {
    for (const path of ['/', '/staff', '/users', '/notifications', '/products', '/quotes']) {
      const body = buildPage(path);

      expect(body.toLowerCase()).toContain('<!doctype html>');
      expect(body).toContain('/staff');
      expect(body).toContain('/users');
      expect(body).toContain('/notifications');
      expect(body).toContain('/products');
      expect(body).toContain('/quotes');
    }
  });

  it('exposes a coherent route catalog for the main app shell', () => {
    expect(Object.keys(routes)).toEqual(
      expect.arrayContaining(['/', '/login', '/staff', '/users', '/appointments', '/notifications'])
    );
  });

  it('keeps key route renderers tied to their functional labels', () => {
    expect(buildPage('/appointments')).toContain('Agenda');
    expect(buildPage('/queue')).toContain('Recepc');
    expect(buildPage('/triage')).toContain('Triagem');
    expect(buildPage('/medical-records')).toContain('Prontu');
    expect(buildPage('/audit')).toContain('Auditoria');
  });

  it('preserves critical operational controls in sensitive pages', () => {
    const appointments = buildPage('/appointments');
    const triage = buildPage('/triage');
    const quotes = buildPage('/quotes');

    expect(appointments).toContain('appt-new-btn');
    expect(appointments).toContain('appt-filter-status');
    expect(appointments).toContain('Kanban');

    expect(triage).toContain('triage-form');
    expect(triage).toContain('triage-priority');
    expect(triage).toContain('triage-destination');

    expect(quotes).toContain('qt-create');
    expect(quotes).toContain('qt-print');
    expect(quotes).toContain('convert-to-sale');
  });

  it('creates a web server instance with request handling capabilities', () => {
    const server = createWebServer({
      appName: 'web-test',
      environment: 'test',
      host: '127.0.0.1',
      port: 0,
      apiBaseUrl: 'http://127.0.0.1:3999',
      proxyApiTarget: 'http://127.0.0.1:3999',
      disablePwa: true
    });

    expect(server).toBeDefined();
    expect(typeof server.emit).toBe('function');
    expect(typeof server.close).toBe('function');
  });
});
