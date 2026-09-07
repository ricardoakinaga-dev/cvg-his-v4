interface CalendarDayCell {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

// Calendar keys represent local civil days, not UTC instants.
function civilDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(1);
  return civilDateKey(date);
}

export function buildVisibleDays(mode: 'day' | 'week' | 'month', baseDate: string) {
  const normalizedBase = mode === 'month' ? startOfMonth(baseDate) : baseDate;
  const start = new Date(`${normalizedBase}T00:00:00`);
  const count = mode === 'day' ? 1 : mode === 'week' ? 7 : 31;

  return Array.from({ length: count }).map((_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const date = civilDateKey(current);
    return {
      date,
      label: current.toLocaleDateString('pt-BR', {
        weekday: mode === 'month' ? undefined : 'long',
        day: '2-digit',
        month: '2-digit'
      })
    };
  });
}

export function buildMonthCalendar(baseDate: string): CalendarDayCell[] {
  const monthStart = new Date(`${startOfMonth(baseDate)}T00:00:00`);
  const firstVisible = new Date(monthStart);
  firstVisible.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(firstVisible);
    current.setDate(firstVisible.getDate() + index);
    const currentDate = civilDateKey(current);
    const now = civilDateKey(new Date());

    return {
      date: currentDate,
      dayNumber: current.getDate(),
      inCurrentMonth: current.getMonth() === monthStart.getMonth(),
      isToday: currentDate === now
    };
  });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function buildSlotScheduledAt(date: string, hour?: number) {
  if (typeof hour !== 'number') {
    return `${date}T09:00`;
  }
  return `${date}T${String(hour).padStart(2, '0')}:00`;
}

export function slotAriaLabel(dayLabel: string, columnLabel: string, hour: number) {
  return `Criar agendamento em ${dayLabel}, ${columnLabel}, às ${formatHour(hour)}`;
}

