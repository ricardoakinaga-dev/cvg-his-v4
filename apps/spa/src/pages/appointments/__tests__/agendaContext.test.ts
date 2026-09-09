import { describe, expect, it } from 'vitest';
import { emptyAgendaContext, isAgendaPath, localCalendarDate, readAgendaContext, writeAgendaQuery } from '../agendaContext';

describe('agenda URL and workspace context', () => {
  it('uses the local calendar day rather than an ISO UTC day', () => {
    const date = new Date(2026, 8, 7, 23, 59);
    expect(localCalendarDate(date)).toBe('2026-09-07');
  });
  it('round trips structural filters without leaking free text', () => {
    const state = { ...emptyAgendaContext(), date: '2026-09-07', view: 'week' as const, statuses: ['checked_in' as const], practitionerStaffId: 'staff-1', serviceId: 'service-2', unit: 'Clínica', specialty: 'Cirurgia', marker: 'retorno', search: 'Pessoa confidencial', clientSearch: 'Outro nome' };
    const query = writeAgendaQuery({ source: 'reception' }, state);
    expect(query.source).toBe('reception');
    expect(JSON.stringify(query)).not.toContain('confidencial');
    expect(JSON.stringify(query)).not.toContain('Outro nome');
    expect(readAgendaContext(query as never, state)).toEqual(state);
  });
  it('rejects impossible dates, repeated scalar parameters and invalid modes', () => {
    const result = readAgendaContext({ agendaDate:'2026-02-30', agendaView:'unsafe', agendaProfessional:['a','b'], agendaStatus:'scheduled,unknown,scheduled' });
    expect(result.date).toBe(localCalendarDate());
    expect(result.view).toBe('list');
    expect(result.practitionerStaffId).toBe('');
    expect(result.statuses).toEqual(['scheduled']);
  });
  it('accepts a real leap day and removes cleared owned filters without deleting unrelated query', () => {
    expect(readAgendaContext({agendaDate:'2028-02-29'}).date).toBe('2028-02-29');
    const query = writeAgendaQuery({agendaStatus:'cancelled',source:'link'},emptyAgendaContext());
    expect(query.agendaStatus).toBeUndefined();
    expect(query.source).toBe('link');
  });

  it('removes free-text query keys while preserving unrelated structural context', () => {
    const query = writeAgendaQuery(
      { search: 'nome privado', clientSearch: 'tutor privado', unrelated: 'keep' },
      { ...emptyAgendaContext(), date: '2026-09-07', view: 'day' }
    );
    expect(query.search).toBeUndefined();
    expect(query.clientSearch).toBeUndefined();
    expect(query.unrelated).toBe('keep');
  });

  it('recognizes the canonical Agenda aliases as the same workspace', () => {
    expect(['/appointments', '/agenda', '/agendamentos', '/atendimento/agenda', '/atendimento/atendimentos/agenda'].every(isAgendaPath)).toBe(true);
    expect(isAgendaPath('/queue')).toBe(false);
  });
  it('restores session context on return without query, without sharing mutable arrays', () => {
    const prior={...emptyAgendaContext(),date:'2026-09-02',clientSearch:'Nome temporário',statuses:['scheduled' as const]};
    const next=readAgendaContext({},prior);
    expect(next).toEqual(prior);
    next.statuses.push('cancelled');expect(prior.statuses).toEqual(['scheduled']);
  });
  it('clears absent structural filters for explicit deep links, preserving only workspace text', () => {
    const prior={...emptyAgendaContext(),practitionerStaffId:'old',clientSearch:'texto'};
    expect(readAgendaContext({agendaDate:'2026-09-08',agendaView:'day'},prior)).toMatchObject({practitionerStaffId:'',clientSearch:'texto'});
  });
});
