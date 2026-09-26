import assert from 'node:assert/strict';
import test from 'node:test';

import { findAllergyConflicts, hasRecordedAllergy } from './clinical-allergy.js';

test('negative allergy statements do not count as a recorded allergy', () => {
  for (const text of ['Nenhuma', 'Sem alergias conhecidas', 'Nega alergias', 'Não possui alergia', '', '   ']) {
    assert.equal(hasRecordedAllergy(text), false, text);
  }
  assert.equal(hasRecordedAllergy(undefined), false);
  assert.equal(hasRecordedAllergy('Alérgico a dipirona'), true);
  assert.equal(hasRecordedAllergy('Sem alergia a antibióticos, mas reagiu à dipirona'), true);
});

test('matches the substance regardless of accents, case, presentation and plural', () => {
  assert.deepEqual(findAllergyConflicts('Dipirona sódica 500 mg/ml', 'Alérgico à DIPIRONA'), ['dipirona']);
  assert.deepEqual(findAllergyConflicts('Cefalexinas', 'reação à cefalexina'), ['cefalexina']);
  assert.deepEqual(findAllergyConflicts('Benzilpenicilina benzatina', 'penicilina'), ['penicilina']);
  assert.deepEqual(
    findAllergyConflicts('Meloxicam comprimido', 'Dipirona; meloxicam (vômito)'),
    ['meloxicam']
  );
});

test('does not raise alerts on presentation words or unrelated substances', () => {
  assert.deepEqual(findAllergyConflicts('Dipirona solução oral', 'Clorexidina solução tópica'), []);
  assert.deepEqual(findAllergyConflicts('Amoxicilina', 'Alergia a dipirona'), []);
  assert.deepEqual(findAllergyConflicts('Dipirona', 'Nenhuma alergia conhecida'), []);
  assert.deepEqual(findAllergyConflicts('Dipirona', undefined), []);
});

test('structured allergies match by substance and by drug class', async () => {
  const { findStructuredAllergyConflicts } = await import('./clinical-allergy.js');
  const allergies = [
    { substance: 'Penicilina', severity: 'anaphylaxis' as const },
    { substance: 'Meloxicam', severity: 'moderate' as const, reaction: 'vômito' }
  ];
  assert.deepEqual(findStructuredAllergyConflicts('Amoxicilina + clavulanato', allergies), [
    { substance: 'Penicilina', severity: 'anaphylaxis', matchedBy: 'class', drugClass: 'penicillins' }
  ]);
  assert.deepEqual(findStructuredAllergyConflicts('Meloxicam 0,2%', allergies), [
    { substance: 'Meloxicam', severity: 'moderate', matchedBy: 'substance' }
  ]);
  assert.deepEqual(findStructuredAllergyConflicts('Carprofeno', allergies), [
    { substance: 'Meloxicam', severity: 'moderate', matchedBy: 'class', drugClass: 'nsaids' }
  ]);
  assert.deepEqual(findStructuredAllergyConflicts('Cefalexina', allergies), []);
  assert.deepEqual(
    findStructuredAllergyConflicts('Cefalexina', [
      { substance: 'Reação a antibióticos beta-lactâmicos', drugClass: 'cephalosporins', severity: 'severe' as const }
    ]),
    [{ substance: 'Reação a antibióticos beta-lactâmicos', severity: 'severe', matchedBy: 'class', drugClass: 'cephalosporins' }]
  );
});

test('structured allergy input is validated and normalized', async () => {
  const { normalizeStructuredAllergies } = await import('./clinical-allergy.js');
  assert.deepEqual(normalizeStructuredAllergies(undefined), { allergies: [] });
  assert.deepEqual(
    normalizeStructuredAllergies([{ substance: '  Dipirona ', severity: 'severe', reaction: ' edema ', drugClass: 'pyrazolones' }]),
    { allergies: [{ substance: 'Dipirona', severity: 'severe', drugClass: 'pyrazolones', reaction: 'edema' }] }
  );
  assert.ok('error' in normalizeStructuredAllergies([{ substance: 'X', severity: 'severe' }]));
  assert.ok('error' in normalizeStructuredAllergies([{ substance: 'Dipirona', severity: 'fatal' }]));
  assert.ok('error' in normalizeStructuredAllergies([{ substance: 'Dipirona', severity: 'mild', drugClass: 'unknown' }]));
  assert.ok('error' in normalizeStructuredAllergies('dipirona'));
});
