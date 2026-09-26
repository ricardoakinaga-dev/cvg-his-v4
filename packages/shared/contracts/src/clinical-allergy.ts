/**
 * Allergy screening for prescriptions, shared by the API (authoritative check)
 * and the SPA (early warning while typing) so both flag exactly the same terms.
 *
 * Allergies are free text today, so this is a lexical screen: it warns and asks
 * the prescriber to justify, it never blocks. Class-level matching (e.g. a
 * penicillin allergy against amoxicillin) needs structured allergies.
 */

/** Minimum length of the prescriber's justification when overriding a match. */
export const ALLERGY_ACKNOWLEDGEMENT_MIN_LENGTH = 10;

export const ALLERGY_ACKNOWLEDGEMENT_REQUIRED_CODE = 'ALLERGY_ACKNOWLEDGEMENT_REQUIRED';

const MIN_TOKEN_LENGTH = 4;
const MIN_PARTIAL_MATCH_LENGTH = 5;
const MIN_EMBEDDED_MATCH_LENGTH = 6;

const NEGATION_PREFIX = /^(nenhum|nenhuma|nao|sem|nega|nada|desconhece|desconhecida|desconhecido|ausente|n\/a)\b/;

/** Words that describe the allergy or the presentation, never the substance. */
const NON_SUBSTANCE_WORDS = new Set([
  'alergia', 'alergias', 'alergico', 'alergica', 'alergicos', 'alergicas', 'hipersensibilidade',
  'reacao', 'reacoes', 'adversa', 'adversas', 'intolerancia', 'historico', 'paciente', 'tutor',
  'relata', 'relatou', 'informa', 'informou', 'possui', 'apresenta', 'apresentou', 'conhecida',
  'conhecidas', 'conhecido', 'conhecidos', 'medicamento', 'medicamentos', 'medicamentosa',
  'medicamentosas', 'farmaco', 'farmacos', 'para', 'contra', 'com', 'sem', 'nao', 'nega',
  'nenhum', 'nenhuma', 'algum', 'alguma', 'qualquer', 'outros', 'outras', 'tipo', 'leve',
  'moderada', 'grave', 'severa', 'momento', 'ate', 'data', 'presente', 'ausente', 'desconhece',
  'desconhecida', 'desconhecido', 'suspeita', 'possivel', 'provavel',
  'solucao', 'suspensao', 'injetavel', 'comprimido', 'comprimidos', 'capsula', 'capsulas',
  'gotas', 'pomada', 'creme', 'xarope', 'oral', 'topico', 'topica', 'spray', 'sodica', 'sodico',
  'potassica', 'cloridrato', 'dose', 'doses', 'uso', 'veterinario', 'veterinaria'
]);

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function substanceTokens(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !NON_SUBSTANCE_WORDS.has(token));
}

/**
 * True when the text records an actual allergy. Entries such as "Nenhuma",
 * "Sem alergias conhecidas" or "Nega alergias" do not, and must not raise alerts.
 */
export function hasRecordedAllergy(allergy: string | null | undefined): allergy is string {
  if (!allergy) return false;
  const normalized = normalize(allergy);
  if (normalized.length === 0) return false;
  return !(NEGATION_PREFIX.test(normalized) && substanceTokens(normalized).length === 0);
}

function tokensMatch(allergyToken: string, medicationToken: string): boolean {
  if (allergyToken === medicationToken) return true;
  const [shorter, longer] =
    allergyToken.length <= medicationToken.length
      ? [allergyToken, medicationToken]
      : [medicationToken, allergyToken];
  if (shorter.length >= MIN_PARTIAL_MATCH_LENGTH && longer.startsWith(shorter)) return true;
  return shorter.length >= MIN_EMBEDDED_MATCH_LENGTH && longer.includes(shorter);
}

/**
 * Allergy terms (normalized) that the medication name matches. An empty list
 * means no lexical match — not that the medication is safe for the patient.
 */
export function findAllergyConflicts(
  medicationName: string,
  allergy: string | null | undefined
): string[] {
  if (!hasRecordedAllergy(allergy)) return [];
  const medicationTokens = substanceTokens(medicationName);
  const matches = new Set<string>();
  for (const allergyToken of substanceTokens(allergy)) {
    if (medicationTokens.some((token) => tokensMatch(allergyToken, token))) {
      matches.add(allergyToken);
    }
  }
  return [...matches];
}
