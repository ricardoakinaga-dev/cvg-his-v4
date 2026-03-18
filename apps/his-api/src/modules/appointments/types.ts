import {
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  appointmentIdParamSchema,
  appointmentResponseSchema,
  updateAppointmentBodySchema,
  type CreateAppointmentBody,
  type ListAppointmentsQuery,
  type AppointmentIdParam,
  type AppointmentResponse,
  type UpdateAppointmentBody,
  type AppointmentStatus,
  type AppointmentType
} from '@cvg-his/contracts';

export {
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  appointmentIdParamSchema,
  appointmentResponseSchema,
  updateAppointmentBodySchema
};

export type {
  CreateAppointmentBody,
  ListAppointmentsQuery,
  AppointmentIdParam,
  AppointmentResponse,
  UpdateAppointmentBody,
  AppointmentStatus,
  AppointmentType
};

export type AppointmentRecord = {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  professionalUserId: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
