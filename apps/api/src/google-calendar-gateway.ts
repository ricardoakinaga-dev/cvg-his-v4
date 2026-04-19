import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';

export interface GoogleCalendarSyncResult {
  readonly provider: 'local-google-calendar' | 'google-calendar';
  readonly status: 'synced' | 'cancelled' | 'failed';
  readonly syncedAt: string;
  readonly externalEventId?: string;
  readonly failureReason?: string;
}

export interface GoogleCalendarGateway {
  readonly providerName: 'local-google-calendar' | 'google-calendar';
  syncAppointment(appointment: SchedulingAppointmentSummary): Promise<GoogleCalendarSyncResult>;
}

export class LocalGoogleCalendarGateway implements GoogleCalendarGateway {
  readonly providerName = 'local-google-calendar' as const;

  async syncAppointment(appointment: SchedulingAppointmentSummary): Promise<GoogleCalendarSyncResult> {
    const syncedAt = nowIso();
    if (appointment.reason.toLowerCase().includes('fail')) {
      return {
        provider: this.providerName,
        status: 'failed',
        syncedAt,
        failureReason: 'Simulated Google Calendar sync failure'
      };
    }

    return {
      provider: this.providerName,
      status: appointment.status === 'cancelled' ? 'cancelled' : 'synced',
      syncedAt,
      externalEventId: `gcal_${appointment.id}`
    };
  }
}

export class GoogleCalendarGatewayAdapter implements GoogleCalendarGateway {
  readonly providerName = 'google-calendar' as const;
  readonly #accessToken: string;
  readonly #calendarId: string;

  public constructor(options: { readonly accessToken: string; readonly calendarId: string }) {
    this.#accessToken = options.accessToken;
    this.#calendarId = options.calendarId;
  }

  async syncAppointment(appointment: SchedulingAppointmentSummary): Promise<GoogleCalendarSyncResult> {
    const syncedAt = nowIso();
    const externalEventId = `appt-${appointment.id}`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.#calendarId)}/events${appointment.status === 'cancelled' ? `/${externalEventId}` : ''}`;
    const method = appointment.status === 'cancelled' ? 'PATCH' : 'POST';
    const body =
      appointment.status === 'cancelled'
        ? { status: 'cancelled' }
        : {
            id: externalEventId,
            summary: appointment.reason,
            description: `Appointment ${appointment.id} synced from CVG HIS`,
            start: { dateTime: appointment.scheduledAt },
            end: {
              dateTime: new Date(
                new Date(appointment.scheduledAt).getTime() + (appointment.durationMinutes ?? 30) * 60_000
              ).toISOString()
            }
          };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.#accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      return {
        provider: this.providerName,
        status: 'failed',
        syncedAt,
        failureReason: error instanceof Error ? error.message : 'Google Calendar request failed before response'
      };
    }

    if (!response.ok) {
      return {
        provider: this.providerName,
        status: 'failed',
        syncedAt,
        failureReason: `Google Calendar sync failed with status ${response.status}`
      };
    }

    const payload = (await response.json()) as { id?: string };
    return {
      provider: this.providerName,
      status: appointment.status === 'cancelled' ? 'cancelled' : 'synced',
      syncedAt,
      externalEventId: payload.id ?? externalEventId
    };
  }
}
