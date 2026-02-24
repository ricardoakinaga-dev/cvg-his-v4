'use client';

/**
 * Appointment Detail Page - Premium Agenda Module
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useAppointment, useCancelAppointment, useConfirmAppointment } from '@/features/agenda/hooks';

// Status colors
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  confirmed: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  arrived: { bg: '#fef9c3', text: '#a16207', border: '#fef08a' },
  in_progress: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  done: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  canceled: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  no_show: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

const statusLabels: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  arrived: 'Chegou',
  in_progress: 'Em atendimento',
  done: 'Finalizado',
  canceled: 'Cancelado',
  no_show: 'Não compareceu',
};

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Fetch appointment
  const { data: appointment, isLoading, error } = useAppointment(id);
  
  // Mutations
  const cancelMutation = useCancelAppointment();
  const confirmMutation = useConfirmAppointment();

  // Handle actions
  const handleConfirm = async () => {
    await confirmMutation.mutateAsync(id);
  };

  const handleCancel = async () => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    await cancelMutation.mutateAsync({ id, reason: reason || undefined });
  };

  if (isLoading) {
    return <LoadingState message="Carregando agendamento..." />;
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agendamento não encontrado" />
        <ErrorBanner message="Não foi possível carregar o agendamento." />
        <Button onClick={() => router.push('/agenda')}>Voltar para Agenda</Button>
      </div>
    );
  }

  const statusStyle = statusColors[appointment.status] || statusColors.scheduled;
  const canConfirm = appointment.status === 'scheduled';
  const canCancel = ['scheduled', 'confirmed', 'arrived'].includes(appointment.status);

  // Format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${appointment.patientName || 'Sem paciente'}`}
        description={`${formatDate(appointment.startAt)} às ${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={() => router.push('/agenda')}>
              Voltar
            </Button>
            {canConfirm && (
              <Button 
                variant="secondary" 
                onClick={handleConfirm}
                isLoading={confirmMutation.isPending}
              >
                Confirmar
              </Button>
            )}
            {canCancel && (
              <Button 
                variant="danger" 
                onClick={handleCancel}
                isLoading={cancelMutation.isPending}
              >
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      {/* Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
          }}
        >
          {statusLabels[appointment.status]}
        </span>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          {appointment.typeName} ({appointment.typeCode})
        </span>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Column 1: Appointment Info */}
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Informações do Agendamento</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <InfoRow label="Tipo" value={appointment.typeName} />
            <InfoRow label="Setor" value={appointment.typeSector} />
            <InfoRow label="Data" value={formatDate(appointment.startAt)} />
            <InfoRow label="Horário" value={`${formatTime(appointment.startAt)} - ${formatTime(appointment.endAt)}`} />
            <InfoRow label="Duração" value={`${appointment.typeRequiresTeam ? 120 : 30} minutos`} />
            {appointment.serviceName && (
              <InfoRow label="Serviço" value={appointment.serviceName} />
            )}
          </div>
        </Card>

        {/* Column 2: Professional & Resource */}
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Profissional e Recurso</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <InfoRow 
              label="Profissional" 
              value={appointment.collaboratorName}
              subValue={appointment.collaboratorRoleTitle}
            />
            {appointment.resourceName && (
              <InfoRow 
                label="Recurso" 
                value={appointment.resourceName}
                subValue={appointment.resourceType}
              />
            )}
          </div>

          {/* Team members */}
          {appointment.team && appointment.team.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>Equipe</h3>
              {appointment.team.map((member) => (
                <div 
                  key={member.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span>{member.collaboratorName}</span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>{member.teamRole}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Column 3: Patient Info */}
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Tutor e Paciente</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appointment.ownerName ? (
              <>
                <InfoRow label="Tutor" value={appointment.ownerName} />
                {appointment.ownerPhone && (
                  <InfoRow label="Telefone" value={appointment.ownerPhone} />
                )}
              </>
            ) : (
              <p style={{ color: '#6b7280' }}>Nenhum tutor vinculado</p>
            )}

            {appointment.patientName ? (
              <>
                <InfoRow 
                  label="Paciente" 
                  value={appointment.patientName}
                  subValue={appointment.patientSpecies}
                />
              </>
            ) : (
              <p style={{ color: '#6b7280' }}>Nenhum paciente vinculado</p>
            )}
          </div>

          {/* Quick links */}
          {appointment.ownerId && (
            <div style={{ marginTop: '16px' }}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push(`/geral/clientes/${appointment.ownerId}`)}
              >
                Ver Tutor →
              </Button>
            </div>
          )}
        </Card>

        {/* Column 4: Notes */}
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Observações</h2>
          
          {appointment.notes ? (
            <p style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{appointment.notes}</p>
          ) : (
            <p style={{ color: '#6b7280' }}>Nenhuma observação registrada.</p>
          )}

          {/* Audit info */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              Criado em: {new Date(appointment.createdAt).toLocaleString('pt-BR')}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              Atualizado em: {new Date(appointment.updatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value, subValue }: { label: string; value?: string; subValue?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || '-'}</span>
      {subValue && (
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{subValue}</span>
      )}
    </div>
  );
}
