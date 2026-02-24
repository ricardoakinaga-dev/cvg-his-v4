'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  appointmentTypesApi,
  collaboratorsApi,
  resourcesApi,
  appointmentsApi,
  availabilityApi,
  AppointmentType,
  Collaborator,
  Resource,
  Appointment,
  AvailabilitySlotsResponse,
  CollaboratorAvailability,
  CollaboratorTimeOff
} from './api';

// Query keys
export const agendaKeys = {
  all: ['agenda'] as const,
  appointmentTypes: () => [...agendaKeys.all, 'appointmentTypes'] as const,
  appointmentTypesList: (filters?: Record<string, any>) => [...agendaKeys.appointmentTypes(), 'list', filters] as const,
  appointmentType: (id: string) => [...agendaKeys.appointmentTypes(), 'detail', id] as const,
  
  collaborators: () => [...agendaKeys.all, 'collaborators'] as const,
  collaboratorsList: (filters?: Record<string, any>) => [...agendaKeys.collaborators(), 'list', filters] as const,
  collaborator: (id: string) => [...agendaKeys.collaborators(), 'detail', id] as const,
  collaboratorAvailability: (id: string) => [...agendaKeys.collaborators(), 'availability', id] as const,
  collaboratorTimeOff: (id: string) => [...agendaKeys.collaborators(), 'timeOff', id] as const,
  
  resources: () => [...agendaKeys.all, 'resources'] as const,
  resourcesList: (filters?: Record<string, any>) => [...agendaKeys.resources(), 'list', filters] as const,
  resource: (id: string) => [...agendaKeys.resources(), 'detail', id] as const,
  
  appointments: () => [...agendaKeys.all, 'appointments'] as const,
  appointmentsList: (filters?: Record<string, any>) => [...agendaKeys.appointments(), 'list', filters] as const,
  appointment: (id: string) => [...agendaKeys.appointments(), 'detail', id] as const,
  
  slots: (params: { collaboratorId: string; date: string; typeId?: string; resourceId?: string }) => 
    [...agendaKeys.all, 'slots', params] as const,
};

// Appointment Types Hooks
export function useAppointmentTypes(filters?: { query?: string; sector?: string; active?: boolean; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: agendaKeys.appointmentTypesList(filters),
    queryFn: () => appointmentTypesApi.list(filters),
  });
}

export function useAppointmentType(id: string) {
  return useQuery({
    queryKey: agendaKeys.appointmentType(id),
    queryFn: () => appointmentTypesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAppointmentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<AppointmentType>) => appointmentTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointmentTypes() });
    },
  });
}

export function useUpdateAppointmentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AppointmentType> }) => 
      appointmentTypesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointmentType(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointmentTypes() });
    },
  });
}

// Collaborators Hooks
export function useCollaborators(filters?: { query?: string; status?: string; roleTitle?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: agendaKeys.collaboratorsList(filters),
    queryFn: () => collaboratorsApi.list(filters),
  });
}

export function useCollaborator(id: string) {
  return useQuery({
    queryKey: agendaKeys.collaborator(id),
    queryFn: () => collaboratorsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCollaborator() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Collaborator>) => collaboratorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaborators() });
    },
  });
}

export function useUpdateCollaborator() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collaborator> }) => 
      collaboratorsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaborator(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaborators() });
    },
  });
}

export function useCollaboratorAvailability(collaboratorId: string) {
  return useQuery({
    queryKey: agendaKeys.collaboratorAvailability(collaboratorId),
    queryFn: () => collaboratorsApi.getAvailability(collaboratorId),
    enabled: !!collaboratorId,
  });
}

export function useUpdateCollaboratorAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collaboratorId, availability }: { collaboratorId: string; availability: Partial<CollaboratorAvailability>[] }) => 
      collaboratorsApi.updateAvailability(collaboratorId, availability),
    onSuccess: (_, { collaboratorId }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaboratorAvailability(collaboratorId) });
    },
  });
}

export function useCollaboratorTimeOff(collaboratorId: string) {
  return useQuery({
    queryKey: agendaKeys.collaboratorTimeOff(collaboratorId),
    queryFn: () => collaboratorsApi.getTimeOff(collaboratorId),
    enabled: !!collaboratorId,
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collaboratorId, data }: { collaboratorId: string; data: { startAt: string; endAt: string; reason?: string } }) => 
      collaboratorsApi.createTimeOff(collaboratorId, data),
    onSuccess: (_, { collaboratorId }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaboratorTimeOff(collaboratorId) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaboratorAvailability(collaboratorId) });
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collaboratorId, timeOffId }: { collaboratorId: string; timeOffId: string }) => 
      collaboratorsApi.deleteTimeOff(collaboratorId, timeOffId),
    onSuccess: (_, { collaboratorId }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaboratorTimeOff(collaboratorId) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.collaboratorAvailability(collaboratorId) });
    },
  });
}

// Resources Hooks
export function useResources(filters?: { query?: string; type?: string; active?: boolean; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: agendaKeys.resourcesList(filters),
    queryFn: () => resourcesApi.list(filters),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: agendaKeys.resource(id),
    queryFn: () => resourcesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Resource>) => resourcesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.resources() });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Resource> }) => 
      resourcesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.resource(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.resources() });
    },
  });
}

// Appointments Hooks
export function useAppointments(filters?: {
  from?: string;
  to?: string;
  collaboratorId?: string;
  resourceId?: string;
  typeId?: string;
  sector?: string;
  ownerId?: string;
  patientId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: agendaKeys.appointmentsList(filters),
    queryFn: () => appointmentsApi.list(filters),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: agendaKeys.appointment(id),
    queryFn: () => appointmentsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof appointmentsApi.create>[0]) => 
      appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointments() });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof appointmentsApi.update>[1] }) => 
      appointmentsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointment(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointments() });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      appointmentsApi.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointment(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointments() });
    },
  });
}

export function useConfirmAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointment(id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.appointments() });
    },
  });
}

// Availability/Slots Hooks
export function useSlots(params: { collaboratorId: string; date: string; typeId?: string; resourceId?: string }) {
  return useQuery({
    queryKey: agendaKeys.slots(params),
    queryFn: () => availabilityApi.getSlots(params),
    enabled: !!params.collaboratorId && !!params.date,
  });
}

// Utility hook for getting active collaborators for dropdowns
export function useActiveCollaborators() {
  return useQuery({
    queryKey: agendaKeys.collaboratorsList({ status: 'active' }),
    queryFn: () => collaboratorsApi.list({ status: 'active', pageSize: 100 }),
    select: (data) => data.data,
  });
}

// Utility hook for getting active resources for dropdowns
export function useActiveResources() {
  return useQuery({
    queryKey: agendaKeys.resourcesList({ active: true }),
    queryFn: () => resourcesApi.list({ active: true, pageSize: 100 }),
    select: (data) => data.data,
  });
}

// Utility hook for getting active appointment types for dropdowns
export function useActiveAppointmentTypes() {
  return useQuery({
    queryKey: agendaKeys.appointmentTypesList({ active: true }),
    queryFn: () => appointmentTypesApi.list({ active: true, pageSize: 100 }),
    select: (data) => data.data,
  });
}
