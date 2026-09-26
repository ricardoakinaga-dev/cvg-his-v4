import { ref, type Ref } from 'vue';
import type { SchedulingOverviewParams } from '@/services/scheduling';
import type { ServiceSummary } from '@/services/services';
import type {
  SchedulingCockpitAppointmentSummary,
  SchedulingOverviewResponse
} from '@/types/appointment';

export interface AppointmentsOverviewServices {
  getOverview: (params: SchedulingOverviewParams) => Promise<SchedulingOverviewResponse>;
  listServices: () => Promise<ServiceSummary[]>;
  getOwner: (ownerId: string) => Promise<{ fullName: string }>;
  getPatient: (patientId: string) => Promise<{ name: string }>;
}

export interface AppointmentsOverviewOptions {
  canReadScheduling: () => boolean;
  isDisposed: () => boolean;
  getParams: () => SchedulingOverviewParams;
  getSelectedAppointmentId: () => string | undefined;
  setSelectedAppointment: (appointment: SchedulingCockpitAppointmentSummary | null) => void;
  isForbiddenError: (error: unknown) => boolean;
  onForbidden: () => void;
  setError: (message: string) => void;
  services: AppointmentsOverviewServices;
}

export interface AppointmentsOverviewController {
  readonly loading: Ref<boolean>;
  readonly overview: Ref<SchedulingOverviewResponse | null>;
  readonly services: Ref<ServiceSummary[]>;
  readonly ownerCache: Ref<Record<string, string>>;
  readonly patientCache: Ref<Record<string, string>>;
  loadOverview: () => Promise<void>;
  invalidate: () => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao carregar agenda';
}

export function useAppointmentsOverview(
  options: AppointmentsOverviewOptions
): AppointmentsOverviewController {
  const loading = ref(false);
  const overview = ref<SchedulingOverviewResponse | null>(null);
  const services = ref<ServiceSummary[]>([]);
  const ownerCache = ref<Record<string, string>>({});
  const patientCache = ref<Record<string, string>>({});
  let overviewRequest = 0;

  function isCurrent(request: number) {
    return (
      !options.isDisposed() &&
      options.canReadScheduling() &&
      request === overviewRequest
    );
  }

  function invalidate() {
    overviewRequest += 1;
    loading.value = false;
    overview.value = null;
    services.value = [];
    ownerCache.value = {};
    patientCache.value = {};
  }

  async function loadReferenceData(
    items: SchedulingCockpitAppointmentSummary[],
    request: number
  ) {
    const ownerIds = [...new Set(items.map((item) => item.ownerId))];
    const patientIds = [...new Set(items.map((item) => item.patientId))];

    await Promise.all([
      Promise.all(
        ownerIds.map(async (ownerId) => {
          if (!ownerCache.value[ownerId]) {
            try {
              const owner = await options.services.getOwner(ownerId);
              if (isCurrent(request)) ownerCache.value[ownerId] = owner.fullName;
            } catch {
              if (isCurrent(request)) ownerCache.value[ownerId] = `Tutor ${ownerId.slice(0, 6)}`;
            }
          }
        })
      ),
      Promise.all(
        patientIds.map(async (patientId) => {
          if (!patientCache.value[patientId]) {
            try {
              const patient = await options.services.getPatient(patientId);
              if (isCurrent(request)) patientCache.value[patientId] = patient.name;
            } catch {
              if (isCurrent(request)) patientCache.value[patientId] = `Paciente ${patientId.slice(0, 6)}`;
            }
          }
        })
      )
    ]);
  }

  async function loadOverview() {
    if (options.isDisposed() || !options.canReadScheduling()) {
      invalidate();
      return;
    }

    const request = ++overviewRequest;
    overview.value = null;
    loading.value = true;
    options.setError('');

    void options.services.listServices().catch(() => []).then((result) => {
      if (isCurrent(request)) services.value = result;
    });

    try {
      const overviewResponse = await options.services.getOverview(options.getParams());
      if (!isCurrent(request)) return;

      overview.value = overviewResponse;
      void loadReferenceData(overviewResponse.items, request);

      const selectedAppointmentId = options.getSelectedAppointmentId();
      if (selectedAppointmentId) {
        options.setSelectedAppointment(
          overviewResponse.items.find((item) => item.id === selectedAppointmentId) ?? null
        );
      }
    } catch (loadError) {
      if (!isCurrent(request)) return;
      if (options.isForbiddenError(loadError)) {
        options.onForbidden();
        return;
      }
      options.setError(errorMessage(loadError));
    } finally {
      if (isCurrent(request)) loading.value = false;
    }
  }

  return {
    loading,
    overview,
    services,
    ownerCache,
    patientCache,
    loadOverview,
    invalidate
  };
}
