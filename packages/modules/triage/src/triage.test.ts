import { describe, it, expect, beforeEach } from 'vitest';
import { TriageService } from './index.js';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { EncountersService } from '@cvg-his-v2/module-encounters';

describe('TriageService', () => {
  let service: TriageService;

  beforeEach(() => {
    const owners = new OwnersService({ seedOwners: [] });
    const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
    const encounters = new EncountersService({ owners, patients, seedEncounters: [], seedTimeline: [] });
    service = new TriageService(encounters);
  });

  it('should list triage records (empty)', () => {
    expect(service.list().length).toBe(0);
  });
});
