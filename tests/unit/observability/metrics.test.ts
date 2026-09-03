import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeRoute,
  updateAppMetrics,
  incrementActiveRequests,
  decrementActiveRequests,
  resetActiveRequestsCount,
  getMetricsText,
  recordRequestSloObservation,
  getCurrentSloSnapshot,
  resetRequestSloObservations,
  recordSmartSchedulingRecommendation,
  recordSmartSchedulingRecommendationApplied
} from '../../../apps/api/src/metrics.js';

describe('Metrics — Route Normalization', () => {
  it('should return exact match for known routes', () => {
    expect(normalizeRoute('/health')).toBe('/health');
    expect(normalizeRoute('/metrics')).toBe('/metrics');
    expect(normalizeRoute('/reports/executions/rep-123/export')).toBe(
      '/reports/executions/:id/export'
    );
    expect(normalizeRoute('/attachments/att-123/download')).toBe('/attachments/:id/download');
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
    resetRequestSloObservations();
  });

  it('should update uptime, db healthy and persistence mode', async () => {
    updateAppMetrics({
      uptime: 3600,
      dbHealthy: true,
      persistenceMode: 'database',
      redisHealthy: true,
      rateLimiterMode: 'redis',
      runtimeDistributedStateEnabled: true
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
      persistenceMode: 'in-memory',
      redisHealthy: false,
      rateLimiterMode: 'in-memory',
      runtimeDistributedStateEnabled: false
    });

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_persistence_mode{mode="in-memory"} 1');
    expect(metrics).not.toContain('app_persistence_mode{mode="database"} 1');
  });

  it('should expose unavailable mode when database failure is fail-closed', async () => {
    updateAppMetrics({
      uptime: 101,
      dbHealthy: false,
      persistenceMode: 'unavailable',
      redisHealthy: true,
      rateLimiterMode: 'redis',
      runtimeDistributedStateEnabled: false
    });

    const metrics = await getMetricsText();
    expect(metrics).toContain('app_persistence_mode{mode="unavailable"} 1');
    expect(metrics).not.toContain('app_persistence_mode{mode="in-memory"} 1');
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

  it('builds a current SLO snapshot from recent request observations', () => {
    const now = Date.now();
    recordRequestSloObservation({ durationMs: 120, statusCode: 200, timestamp: now - 1_000 });
    recordRequestSloObservation({ durationMs: 260, statusCode: 200, timestamp: now - 2_000 });
    recordRequestSloObservation({ durationMs: 900, statusCode: 503, timestamp: now - 3_000 });
    recordRequestSloObservation({
      durationMs: 80,
      statusCode: 200,
      timestamp: now - 10 * 60 * 1000
    });

    const snapshot = getCurrentSloSnapshot(now);

    expect(snapshot.requestCount5m).toBe(3);
    expect(snapshot.requestCount1h).toBeGreaterThanOrEqual(4);
    expect(snapshot.p95LatencyMs).toBe(900);
    expect(snapshot.p99LatencyMs).toBe(900);
    expect(snapshot.errorRatePercent).toBeCloseTo(33.3333, 3);
    expect(snapshot.availabilityPercent).toBeCloseTo(75, 3);
  });

  it('records smart scheduling recommendation generation and application metrics', async () => {
    recordSmartSchedulingRecommendation({
      visitType: 'scheduled',
      confidence: 0.88
    });
    recordSmartSchedulingRecommendationApplied({
      visitType: 'scheduled'
    });

    const metrics = await getMetricsText();
    expect(metrics).toContain(
      'smart_scheduling_recommendations_total{visit_type="scheduled",confidence_band="high"} 1'
    );
    expect(metrics).toContain(
      'smart_scheduling_recommendation_applies_total{visit_type="scheduled"} 1'
    );
  });
});
