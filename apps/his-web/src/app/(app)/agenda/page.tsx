'use client';

/**
 * Agenda Calendar Page - Premium Agenda Module
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Can } from '@/components/auth/Can';
import { PERMISSIONS } from '@/lib/rbac';
import { useAppointments, useActiveCollaborators, useActiveResources } from '@/features/agenda/hooks';
import { Appointment } from '@/features/agenda/api';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

// Simple date utilities (avoiding date-fns dependency)
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

// Status colors
const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#22c55e',
  arrived: '#eab308',
  in_progress: '#f97316',
  done: '#6b7280',
  canceled: '#ef4444',
  no_show: '#ef4444',
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

// Time slots for the day view (08:00 - 20:00)
const timeSlots = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(8 + i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function AgendaCalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('all');

  // Get start and end of the week
  const weekStart = startOfWeek(currentDate);
  const weekEnd = addDays(weekStart, 6);

  // Format dates for API
  const from = weekStart.toISOString();
  const to = weekEnd.toISOString();

  // Fetch data
  const { data: collaboratorsData, isLoading: loadingCollaborators } = useActiveCollaborators();
  const { data: resourcesData, isLoading: loadingResources } = useActiveResources();
  const { data: appointmentsData, isLoading: loadingAppointments } = useAppointments({
    from,
    to,
    collaboratorId: selectedCollaboratorId !== 'all' ? selectedCollaboratorId : undefined,
    resourceId: selectedResourceId !== 'all' ? selectedResourceId : undefined,
    pageSize: 200,
  });

  const collaborators = collaboratorsData || [];
  const resources = resourcesData || [];
  const appointments = appointmentsData?.data || [];

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((apt: Appointment) => {
      const dateKey = new Date(apt.startAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    return grouped;
  }, [appointments]);

  // Navigation handlers
  const goToPreviousWeek = () => setCurrentDate(addWeeks(currentDate, -1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get appointment position for calendar grid
  const getAppointmentStyle = (appointment: Appointment) => {
    const start = new Date(appointment.startAt);
    const end = new Date(appointment.endAt);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    // Calendar starts at 08:00
    const top = (startHour - 8) * 60; // 60px per hour
    const height = duration * 60;

    return {
      top: `${Math.max(0, top)}px`,
      height: `${Math.max(30, height)}px`,
    };
  };

  const isLoading = loadingCollaborators || loadingResources || loadingAppointments;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Calendário de agendamentos. Visualize e gerencie consultas, cirurgias e procedimentos."
        actions={
          <Can permission={PERMISSIONS.AGENDA_AGENDAMENTOS_CREATE}>
            <Link href="/agenda/agendamentos/novo">
              <Button>Novo Agendamento</Button>
            </Link>
          </Can>
        }
      />

      {/* Filters and Navigation */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button variant="ghost" onClick={goToPreviousWeek}>←</Button>
              <Button variant="ghost" onClick={goToToday}>Hoje</Button>
              <Button variant="ghost" onClick={goToNextWeek}>→</Button>
              <span style={{ fontWeight: 500, marginLeft: '8px' }}>
                {formatDate(weekStart)} - {formatDate(weekEnd)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={selectedCollaboratorId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCollaboratorId(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                <option value="all">Todos os profissionais</option>
                {collaborators.map((collab: { id: string; name: string }) => (
                  <option key={collab.id} value={collab.id}>
                    {collab.name}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedResourceId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedResourceId(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                <option value="all">Todos os recursos</option>
                {resources.map((res: { id: string; name: string }) => (
                  <option key={res.id} value={res.id}>
                    {res.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Calendar Grid */}
          {isLoading ? (
            <LoadingState message="Carregando agenda..." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '800px' }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>
                    Horário
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        borderRight: '1px solid #e5e7eb',
                        backgroundColor: isToday(day) ? '#eff6ff' : 'transparent',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {getDayOfWeek(day)}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: isToday(day) ? '#3b82f6' : '#111827' }}>
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div style={{ position: 'relative', maxHeight: '600px', overflowY: 'auto' }}>
                  {timeSlots.map((time) => (
                    <div key={time} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', borderBottom: '1px solid #f3f4f6', height: '30px' }}>
                      <div style={{ padding: '4px', fontSize: '12px', color: '#6b7280', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        {time}
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={`${day.toISOString()}-${time}`}
                          style={{
                            borderRight: '1px solid #f3f4f6',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const dateStr = day.toISOString().split('T')[0];
                            router.push(`/agenda/agendamentos/novo?date=${dateStr}&time=${time}`);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Appointments overlay */}
                  {weekDays.map((day, dayIndex) => {
                    const dateKey = day.toISOString().split('T')[0];
                    const dayAppointments = appointmentsByDate[dateKey] || [];

                    return dayAppointments.map((apt: Appointment) => {
                      const style = getAppointmentStyle(apt);
                      return (
                        <div
                          key={apt.id}
                          style={{
                            position: 'absolute',
                            left: `calc(12.5% + ${dayIndex * 12.5}%)`,
                            width: '12.5%',
                            padding: '0 2px',
                            cursor: 'pointer',
                            zIndex: 20,
                            ...style,
                          }}
                          onClick={() => router.push(`/agenda/agendamentos/${apt.id}`)}
                        >
                          <div
                            style={{
                              height: '100%',
                              borderRadius: '4px',
                              padding: '4px',
                              fontSize: '12px',
                              overflow: 'hidden',
                              backgroundColor: `${statusColors[apt.status]}20`,
                              borderLeft: `3px solid ${statusColors[apt.status]}`,
                            }}
                          >
                            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {apt.patientName || 'Sem paciente'}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '11px' }}>
                              {apt.collaboratorName}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '11px' }}>
                              {formatTime(new Date(apt.startAt))} - {formatTime(new Date(apt.endAt))}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: statusColors[status] }} />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
