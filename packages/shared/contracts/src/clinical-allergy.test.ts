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
