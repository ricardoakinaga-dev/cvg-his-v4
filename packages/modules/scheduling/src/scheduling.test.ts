import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulingService } from './index.js';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';

describe('SchedulingService', () => {
  let owners: OwnersService;
  let patients: PatientsService;
  let service: SchedulingService;

  beforeEach(() => {
    owners = new OwnersService({ seedOwners: [] });
    patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
    service = new SchedulingService(owners, patients, []);
  });

  it('should list appointments (empty)', () => {
    expect(service.listAppointments().length).toBe(0);
  });

  it('should get queue (empty)', () => {
    expect(service.getQueue().length).toBe(0);
  });
});
