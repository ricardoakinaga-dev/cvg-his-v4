import { describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import {
  useAppointmentsOverview,
  type AppointmentsOverviewOptions,
  type AppointmentsOverviewServices
} from '../useAppointmentsOverview';
import type {
  SchedulingCockpitAppointmentSummary,
  SchedulingOverviewResponse
} from '@/types/appointment';
import type { ServiceSummary } from '@/services/services';

const appointment: SchedulingCockpitAppointmentSummary = {
  id: 'appt-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  scheduledAt: '2026-04-12T09:00:00.000Z',
  endsAt: '2026-04-12T09:30:00.000Z',
  durationMinutes: 30,
  visitType: 'scheduled',
  reason: 'Serviço Sintético de rotina',
  status: 'scheduled',
  createdAt: '2026-04-12T08:00:00.000Z',
  updatedAt: '2026-04-12T08:00:00.000Z',
  conflicts: [],
  operational: {
    stage: 'scheduled',
    label: 'Agendado',
    source: 'appointment',
    updatedAt: '2026-04-12T08:00:00.000Z'
  }
};

function overview(items: SchedulingCockpitAppointmentSummary[] = [appointment]): SchedulingOverviewResponse {
  return {
    viewMode: 'day',
    windowStart: '2026-04-12T00:00:00.000Z',
    windowEnd: '2026-04-13T00:00:00.000Z',
    stats: {
      total: items.length,
      scheduled: items.length,
      checkedIn: 0,
      completed: 0,
      cancelled: 0,
      conflicts: 0,
      unassigned: 0
    },
    professionals: [],
    blocks: [],
    filterOptions: { units: [], specialties: [], statuses: ['scheduled'] },
    items
  };
}

const service: ServiceSummary = {
  id: 'service-1',
  accountId: 'acc-1',
  name: 'Serviço Sintético',
  code: null,
  description: null,
  basePrice: 100,
  active: true,
  createdAt: '',
  updatedAt: ''
};

interface HarnessOverrides {
  canReadScheduling?: AppointmentsOverviewOptions['canReadScheduling'];
  isDisposed?: AppointmentsOverviewOptions['isDisposed'];
  getParams?: AppointmentsOverviewOptions['getParams'];
  getSelectedAppointmentId?: AppointmentsOverviewOptions['getSelectedAppointmentId'];
  setSelectedAppointment?: AppointmentsOverviewOptions['setSelectedAppointment'];
  isForbiddenError?: AppointmentsOverviewOptions['isForbiddenError'];
  onForbidden?: AppointmentsOverviewOptions['onForbidden'];
  setError?: AppointmentsOverviewOptions['setError'];
  services?: Partial<AppointmentsOverviewServices>;
}

function createHarness(overrides: HarnessOverrides = {}) {
  const getOverview = overrides.services?.getOverview ?? vi.fn(async () => overview());
  const listServices = overrides.services?.listServices ?? vi.fn(async () => [service]);
  const getOwner = overrides.services?.getOwner ?? vi.fn(async () => ({ fullName: 'Tutor Sintético' }));
  const getPatient = overrides.services?.getPatient ?? vi.fn(async () => ({ name: 'Paciente Sintético' }));
  const services: AppointmentsOverviewServices = { getOverview, listServices, getOwner, getPatient };
  const setError = overrides.setError ?? vi.fn((_message: string) => undefined);
  const onForbidden = overrides.onForbidden ?? vi.fn();
  let disposed = false;
  const options: AppointmentsOverviewOptions = {
    canReadScheduling: overrides.canReadScheduling ?? (() => true),
    isDisposed: overrides.isDisposed ?? (() => disposed),
    getParams: overrides.getParams ?? (() => ({ viewMode: 'day', referenceDate: '2026-04-12T00:00:00.000Z' })),
    getSelectedAppointmentId: overrides.getSelectedAppointmentId ?? (() => undefined),
    setSelectedAppointment: overrides.setSelectedAppointment ?? vi.fn(),
    isForbiddenError: overrides.isForbiddenError ?? (() => false),
    onForbidden,
    setError,
    services
  };

  return {
    controller: useAppointmentsOverview(options),
    getOverview,
    listServices,
    getOwner,
    getPatient,
    setError,
    onForbidden,
    dispose: () => { disposed = true; }
  };
}

describe('useAppointmentsOverview', () => {
  it('publishes the primary overview before optional services and names finish', async () => {
    let resolveServices!: (value: ServiceSummary[]) => void;
    let resolveOwner!: (value: { fullName: string }) => void;
    let resolvePatient!: (value: { name: string }) => void;
    const services = new Promise<ServiceSummary[]>((resolve) => { resolveServices = resolve; });
    const owner = new Promise<{ fullName: string }>((resolve) => { resolveOwner = resolve; });
    const patient = new Promise<{ name: string }>((resolve) => { resolvePatient = resolve; });
    const harness = createHarness({
      services: {
        listServices: () => services,
        getOwner: () => owner,
        getPatient: () => patient
      }
    });

    await harness.controller.loadOverview();
    expect(harness.controller.overview.value?.items).toHaveLength(1);
    expect(harness.controller.loading.value).toBe(false);
    expect(harness.controller.services.value).toEqual([]);
    expect(harness.controller.ownerCache.value).toEqual({});

    resolveServices([service]);
    resolveOwner({ fullName: 'Tutor Sintético' });
    resolvePatient({ name: 'Paciente Sintético' });
    await flushPromises();
    expect(harness.controller.services.value).toEqual([service]);
    expect(harness.controller.ownerCache.value).toEqual({ 'owner-1': 'Tutor Sintético' });
    expect(harness.controller.patientCache.value).toEqual({ 'pat-1': 'Paciente Sintético' });
  });

  it('keeps the newer overview and ignores stale responses', async () => {
    let resolveOld!: (value: SchedulingOverviewResponse) => void;
    let resolveCurrent!: (value: SchedulingOverviewResponse) => void;
    const old = new Promise<SchedulingOverviewResponse>((resolve) => { resolveOld = resolve; });
    const current = new Promise<SchedulingOverviewResponse>((resolve) => { resolveCurrent = resolve; });
    const getOverview = vi.fn().mockReturnValueOnce(old).mockReturnValueOnce(current);
    const harness = createHarness({ services: { getOverview } });

    const oldRequest = harness.controller.loadOverview();
    const currentRequest = harness.controller.loadOverview();
    resolveCurrent(overview([appointment]));
    await currentRequest;
    resolveOld(overview([]));
    await oldRequest;

    expect(harness.controller.overview.value?.items).toHaveLength(1);
    expect(harness.controller.loading.value).toBe(false);
  });

  it('fails closed on forbidden responses and ignores enrichment after disposal', async () => {
    const forbidden = createHarness({
      services: { getOverview: vi.fn().mockRejectedValue(new Error('Forbidden')) },
      isForbiddenError: () => true
    });
    await forbidden.controller.loadOverview();
    expect(forbidden.onForbidden).toHaveBeenCalledTimes(1);
    expect(forbidden.setError).not.toHaveBeenCalledWith('Forbidden');

    let resolveOverview!: (value: SchedulingOverviewResponse) => void;
    const getOverview = vi.fn(() => new Promise<SchedulingOverviewResponse>((resolve) => { resolveOverview = resolve; }));
    const disposed = createHarness({ services: { getOverview } });
    const request = disposed.controller.loadOverview();
    disposed.dispose();
    resolveOverview(overview());
    await request;
    await flushPromises();
    expect(disposed.controller.overview.value).toBeNull();
    expect(disposed.getOwner).not.toHaveBeenCalled();
    expect(disposed.getPatient).not.toHaveBeenCalled();
  });

  it('reconciles a selected appointment when the current overview replaces its summary', async () => {
    const setSelectedAppointment = vi.fn();
    const harness = createHarness({
      getSelectedAppointmentId: () => 'appt-1',
      setSelectedAppointment
    });
    await harness.controller.loadOverview();
    expect(setSelectedAppointment).toHaveBeenCalledWith(appointment);
  });
});
