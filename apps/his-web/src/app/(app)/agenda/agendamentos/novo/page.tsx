'use client';

/**
 * New Appointment Page - Premium Agenda Module
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useCreateAppointment, useActiveCollaborators, useActiveResources, useActiveAppointmentTypes, useSlots } from '@/features/agenda/hooks';
import { useOwners } from '@/features/patients/hooks';
import { usePatients } from '@/features/patients/hooks';

// Status colors for display
const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#22c55e',
  arrived: '#eab308',
  in_progress: '#f97316',
  done: '#6b7280',
  canceled: '#ef4444',
  no_show: '#ef4444',
};

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial values from URL params
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const initialTime = searchParams.get('time') || '08:00';

  // Form state
  const [typeId, setTypeId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [primaryCollaboratorId, setPrimaryCollaboratorId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime);
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [forceOverbook, setForceOverbook] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Fetch data
  const { data: collaborators, isLoading: loadingCollaborators } = useActiveCollaborators();
  const { data: resources, isLoading: loadingResources } = useActiveResources();
  const { data: appointmentTypes, isLoading: loadingTypes } = useActiveAppointmentTypes();
  
  // Fetch slots when collaborator, date, and type are selected
  const { data: slotsData, isLoading: loadingSlots } = useSlots({
    collaboratorId: primaryCollaboratorId,
    date,
    typeId,
    resourceId: resourceId || undefined,
  });

  // Create mutation
  const createMutation = useCreateAppointment();

  // Get selected type info
  const selectedType = useMemo(() => {
    return appointmentTypes?.find((t: { id: string; defaultDurationMinutes: number; requiresResource: boolean; requiresTeam: boolean }) => t.id === typeId);
  }, [appointmentTypes, typeId]);

  // Calculate end time based on type duration
  useEffect(() => {
    if (selectedType && startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const duration = selectedType.defaultDurationMinutes || 30;
      const endHours = hours + Math.floor((minutes + duration) / 60);
      const endMinutes = (minutes + duration) % 60;
      setEndTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
    }
  }, [selectedType, startTime]);

  // Available slots
  const availableSlots = slotsData?.slots || [];

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!typeId || !primaryCollaboratorId || !date || !startTime || !endTime) {
      return;
    }

    // Create datetime in ISO format (America/Sao_Paulo timezone)
    const startAt = new Date(`${date}T${startTime}:00-03:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00-03:00`).toISOString();

    try {
      const result = await createMutation.mutateAsync({
        typeId,
        ownerId: ownerId || undefined,
        patientId: patientId || undefined,
        primaryCollaboratorId,
        resourceId: resourceId || undefined,
        startAt,
        endAt,
        notes: notes || undefined,
        forceOverbook,
      });

      router.push(`/agenda/agendamentos/${result.id}`);
    } catch (error: any) {
      // Handle conflict error
      if (error.state?.statusCode === 409) {
        // Show conflict dialog or enable overbook option
        setForceOverbook(false);
      }
    }
  };

  const isLoading = loadingCollaborators || loadingResources || loadingTypes;

  if (isLoading) {
    return <LoadingState message="Carregando..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Agendamento"
        description="Crie um novo agendamento selecionando o profissional, paciente e horário."
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Column 1: Appointment Details */}
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Detalhes do Agendamento</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label htmlFor="typeId">Tipo de Agendamento *</Label>
                <Select
                  id="typeId"
                  value={typeId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {appointmentTypes?.map((type: { id: string; code: string; name: string; sector: string }) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code}) - {type.sector}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="primaryCollaboratorId">Profissional Responsável *</Label>
                <Select
                  id="primaryCollaboratorId"
                  value={primaryCollaboratorId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPrimaryCollaboratorId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {collaborators?.map((collab: { id: string; name: string; roleTitle?: string }) => (
                    <option key={collab.id} value={collab.id}>
                      {collab.name} {collab.roleTitle ? `(${collab.roleTitle})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedType?.requiresResource && (
                <div>
                  <Label htmlFor="resourceId">Recurso/Sala *</Label>
                  <Select
                    id="resourceId"
                    value={resourceId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResourceId(e.target.value)}
                    required={selectedType?.requiresResource}
                  >
                    <option value="">Selecione...</option>
                    {resources?.map((res: { id: string; name: string; type: string }) => (
                      <option key={res.id} value={res.id}>
                        {res.name} ({res.type})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label htmlFor="startTime">Início *</Label>
                  <Select
                    id="startTime"
                    value={startTime}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStartTime(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {availableSlots.map((slot: { start: string; end: string }) => (
                      <option key={`${slot.start}-${slot.end}`} value={slot.start}>
                        {slot.start} - {slot.end}
                      </option>
                    ))}
                    {availableSlots.length === 0 && primaryCollaboratorId && (
                      <option value="" disabled>Nenhum horário disponível</option>
                    )}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="endTime">Término *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                    required
                    disabled
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Column 2: Patient Info */}
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Tutor e Paciente</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label htmlFor="ownerSearch">Buscar Tutor</Label>
                <Input
                  id="ownerSearch"
                  type="text"
                  placeholder="Nome ou telefone..."
                  value={ownerSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwnerSearch(e.target.value)}
                />
                {/* TODO: Add autocomplete dropdown for owners */}
              </div>

              <div>
                <Label htmlFor="ownerId">Tutor</Label>
                <Select
                  id="ownerId"
                  value={ownerId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setOwnerId(e.target.value);
                    setPatientId(''); // Reset patient when owner changes
                  }}
                >
                  <option value="">Selecione...</option>
                  {/* TODO: Populate with owner options from search */}
                </Select>
              </div>

              <div>
                <Label htmlFor="patientSearch">Buscar Paciente</Label>
                <Input
                  id="patientSearch"
                  type="text"
                  placeholder="Nome do animal..."
                  value={patientSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientSearch(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="patientId">Paciente</Label>
                <Select
                  id="patientId"
                  value={patientId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPatientId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {/* TODO: Populate with patient options filtered by owner */}
                </Select>
              </div>
            </div>
          </Card>

          {/* Column 3: Notes */}
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Observações</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label htmlFor="notes">Anotações</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                  placeholder="Observações sobre o agendamento..."
                />
              </div>

              {/* Conflict warning */}
              {createMutation.isError && (createMutation.error as any)?.state?.statusCode === 409 && (
                <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <p style={{ color: '#dc2626', fontWeight: 500, marginBottom: '8px' }}>
                    Conflito de horário detectado!
                  </p>
                  <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '8px' }}>
                    Já existe um agendamento neste horário. Deseja forçar o agendamento mesmo assim?
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={forceOverbook}
                      onChange={(e) => setForceOverbook(e.target.checked)}
                    />
                    <span style={{ fontSize: '14px' }}>Ignorar conflito (overbook)</span>
                  </label>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Criar Agendamento
          </Button>
        </div>
      </form>
    </div>
  );
}
