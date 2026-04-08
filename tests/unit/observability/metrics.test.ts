import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeRoute,
  updateAppMetrics,
  incrementActiveRequests,
  decrementActiveRequests,
  resetActiveRequestsCount,
  getMetricsText
} from '../../../apps/api/src/metrics.js';

describe('Metrics — Route Normalization', () => {
  it('should return exact match for known routes', () => {
    expect(normalizeRoute('/health')).toBe('/health');
    expect(normalizeRoute('/metrics')).toBe('/metrics');
    expect(normalizeRoute('/auth/login')).toBe('/auth/login');
    expect(normalizeRoute('/auth/logout')).toBe('/auth/logout');
    expect(normalizeRoute('/auth/refresh')).toBe('/auth/refresh');
    expect(normalizeRoute('/auth/login/mfa')).toBe('/auth/login/mfa');
    expect(normalizeRoute('/ready')).toBe('/ready');
    expect(normalizeRoute('/live')).toBe('/live');
  });

  it('should normalize health sub-paths', () => {
    expect(normalizeRoute('/health/ready')).toBe('/health');
    expect(normalizeRoute('/health/live')).toBe('/health');
  });

  it('should normalize resource routes with IDs', () => {
    expect(normalizeRoute('/owners/abc-123')).toBe('/{resource}/:id');
    expect(normalizeRoute('/patients/xyz-789')).toBe('/{resource}/:id');
    expect(normalizeRoute('/encounters/enc-001')).toBe('/{resource}/:id');
  });

  it('should limit cardinality for unknown routes', () => {
    expect(normalizeRoute('/unknown/path/here')).toBe('/unknown');
    expect(normalizeRoute('/foo/bar/baz/qux')).toBe('/foo');
  });

  it('should handle root path', () => {
    expect(normalizeRoute('/')).toBe('/');
    expect(normalizeRoute('')).toBe('/');
  });

  it('should normalize LGPD routes', () => {
    expect(normalizeRoute('/lgpd/consent')).toBe('/lgpd/consent');
    expect(normalizeRoute('/lgpd/requests')).toBe('/lgpd/requests');
    expect(normalizeRoute('/lgpd/export')).toBe('/lgpd/export');
  });

  it('should normalize MFA routes', () => {
    expect(normalizeRoute('/auth/mfa/setup')).toBe('/auth/mfa/setup');
    expect(normalizeRoute('/auth/mfa/confirm')).toBe('/auth/mfa/confirm');
    expect(normalizeRoute('/auth/mfa/status')).toBe('/auth/mfa/status');
    expect(normalizeRoute('/auth/mfa/disable')).toBe('/auth/mfa/disable');
    expect(normalizeRoute('/auth/mfa/recovery-codes')).toBe('/auth/mfa/recovery-codes');
  });

  it('should normalize auth/me and sessions', () => {
    expect(normalizeRoute('/auth/me')).toBe('/auth/me');
    expect(normalizeRoute('/auth/sessions')).toBe('/auth/sessions');
  });

  it('should normalize scheduling and triage routes to resource pattern', () => {
    expect(normalizeRoute('/scheduling/appointments')).toBe('/{resource}/:id');
    expect(normalizeRoute('/triage/records')).toBe('/{resource}/:id');
  });
});

describe('Metrics — App Metrics', () => {
  beforeEach(() => {
    resetActiveRequestsCount();
  });

  it('should update uptime, db healthy and persistence mode', async () => {
    updateAppMetrics({
      uptime: 3600,
      dbHealthy: true,
      persistenceMode: 'database'
    });

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_uptime_seconds 3600');
    expect(metrics).toContain('app_database_healthy 1');
    expect(metrics).toContain('app_persistence_mode{mode="database"} 1');
  });

  it('should set in-memory mode correctly', async () => {
    updateAppMetrics({
      uptime: 100,
      dbHealthy: false,
      persistenceMode: 'in-memory'
    });

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_persistence_mode{mode="in-memory"} 1');
    expect(metrics).not.toContain('app_persistence_mode{mode="database"} 1');
  });

  it('should track active requests with increment/decrement', async () => {
    incrementActiveRequests();
    incrementActiveRequests();
    incrementActiveRequests();

    let metrics = await getMetricsText();
    expect(metrics).toContain('app_active_requests 3');

    decrementActiveRequests();

    metrics = await getMetricsText();
    expect(metrics).toContain('app_active_requests 2');
  });

  it('should not go below zero on decrement', async () => {
    decrementActiveRequests();
    decrementActiveRequests();

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_active_requests 0');
  });

  it('should handle alternating increment and decrement', async () => {
    incrementActiveRequests();
    incrementActiveRequests();
    decrementActiveRequests();
    incrementActiveRequests();
    decrementActiveRequests();
    decrementActiveRequests();

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_active_requests 0');
  });
});
