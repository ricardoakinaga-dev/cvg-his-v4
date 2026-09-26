#!/usr/bin/env node
/**
 * R2-ARC-03 evidence: memory held by the per-process account caches.
 *
 * Builds the owners → patients → encounters service graph with in-memory
 * repositories (the same classes the API hydrates at boot), loads one large
 * synthetic account and measures the resident heap delta. The result is the
 * per-entity cost the API pays per replica, which sizes `api.resources` and
 * the point where the cache must move out of process.
 *
 * Usage: node scripts/measure-cache-memory.mjs [--owners 5000 --patients 10000 --encounters 20000]
 * Requires the workspace to be built (pnpm build).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EncountersService } from '../packages/modules/encounters/dist/index.js';
import { OwnersService } from '../packages/modules/owners/dist/index.js';
import { PatientsService } from '../packages/modules/patients/dist/index.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const counts = {
  owners: arg('owners', 5_000),
  patients: arg('patients', 10_000),
  encounters: arg('encounters', 20_000)
};
const ACCOUNT = 'acc-large-cache-measurement';

function heap() {
  if (typeof global.gc === 'function') global.gc();
  const usage = process.memoryUsage();
  return { heapUsed: usage.heapUsed, rss: usage.rss };
}

const before = heap();
const owners = new OwnersService({ seedOwners: [] });
const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
const encounters = new EncountersService({ owners, patients, requireUuidIdentifiers: false });

const ownerIds = [];
for (let index = 0; index < counts.owners; index += 1) {
  const owner = owners.create(ACCOUNT, {
    fullName: `Tutor ${index}`,
    documentId: `${String(index).padStart(11, '0')}`,
    contacts: [{ label: 'phone', value: `119${String(index).padStart(8, '0')}`, type: 'phone', primary: true }],
    address: { street: `Rua ${index}`, city: 'Sao Paulo', state: 'SP', zipCode: '01000-000' },
    financialResponsible: true
  });
  ownerIds.push(owner.id);
}
const afterOwners = heap();

const patientIds = [];
for (let index = 0; index < counts.patients; index += 1) {
  const patient = patients.create(ACCOUNT, {
    name: `Paciente ${index}`,
    species: index % 3 === 0 ? 'feline' : 'canine',
    breed: 'SRD',
    sex: index % 2 === 0 ? 'male' : 'female',
    baseWeightKg: 5 + (index % 30),
    primaryOwnerId: ownerIds[index % ownerIds.length]
  });
  patientIds.push({ id: patient.id, ownerId: patient.primaryOwnerId });
}
const afterPatients = heap();

let opened = 0;
for (let index = 0; index < counts.encounters; index += 1) {
  const patient = patientIds[index % patientIds.length];
  try {
    const encounter = encounters.openEncounter(ACCOUNT, 'user-measurement', {
      patientId: patient.id,
      ownerId: patient.ownerId,
      visitType: 'walk_in',
      origin: 'reception',
      reason: `Consulta ${index}`
    });
    encounters.transitionEncounter(ACCOUNT, encounter.id, 'user-measurement', { nextStatus: 'closed' });
    opened += 1;
  } catch {
    // an active encounter already exists for this patient; closing above prevents most conflicts
  }
}
const afterEncounters = heap();

const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
const perEntity = (bytes, count) => (count > 0 ? Math.round(bytes / count) : 0);
const result = {
  measurement: 'per-process account cache memory',
  backlogItem: 'R2-ARC-03',
  measuredAt: new Date().toISOString(),
  nodeVersion: process.version,
  gcExposed: typeof global.gc === 'function',
  account: { owners: counts.owners, patients: counts.patients, encountersOpened: opened },
  heapDeltaMb: {
    owners: mb(afterOwners.heapUsed - before.heapUsed),
    patients: mb(afterPatients.heapUsed - afterOwners.heapUsed),
    encounters: mb(afterEncounters.heapUsed - afterPatients.heapUsed),
    total: mb(afterEncounters.heapUsed - before.heapUsed)
  },
  bytesPerEntity: {
    owner: perEntity(afterOwners.heapUsed - before.heapUsed, counts.owners),
    patient: perEntity(afterPatients.heapUsed - afterOwners.heapUsed, counts.patients),
    encounter: perEntity(afterEncounters.heapUsed - afterPatients.heapUsed, opened)
  },
  rssMb: { before: mb(before.rss), after: mb(afterEncounters.rss) },
  note:
    'Each API replica holds this for every hydrated account. Encounter timeline events and other modules (billing, scheduling, inventory) add to it.'
};
const evidenceDir = path.join(rootDir, 'artifacts', 'operations');
mkdirSync(evidenceDir, { recursive: true });
const evidencePath = path.join(evidenceDir, `cache-memory-${result.measuredAt.replace(/[:.]/g, '-')}.json`);
writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\nevidence: ${path.relative(rootDir, evidencePath)}\n`);
