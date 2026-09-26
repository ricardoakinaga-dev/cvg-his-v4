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

// ---------------------------------------------------------------------------
// Structured allergies (R2-CLI-01)
// ---------------------------------------------------------------------------

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'anaphylaxis';

export interface StructuredAllergy {
  readonly substance: string;
  readonly drugClass?: string;
  readonly reaction?: string;
  readonly severity: AllergySeverity;
}

export const ALLERGY_SEVERITY_LABELS: Readonly<Record<AllergySeverity, string>> = {
  mild: 'Leve',
  moderate: 'Moderada',
  severe: 'Grave',
  anaphylaxis: 'Anafilaxia'
};

/** Justification length required to override an anaphylaxis-level match. */
export const ALLERGY_ANAPHYLAXIS_ACKNOWLEDGEMENT_MIN_LENGTH = 20;
export const ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED_CODE =
  'ALLERGY_ANAPHYLAXIS_CONFIRMATION_REQUIRED';

/**
 * Drug classes used for class-level cross-reactivity screening. Members are
 * normalized active ingredients (no accents, lower case). This table is a
 * screening aid derived from common veterinary formularies and MUST be
 * reviewed by the clinical lead before go-live (R2-CLI-01 acceptance).
 */
export const DRUG_CLASSES: Readonly<
  Record<string, { readonly label: string; readonly members: readonly string[] }>
> = {
  penicillins: {
    label: 'Penicilinas',
    members: ['penicilina', 'benzilpenicilina', 'amoxicilina', 'ampicilina', 'oxacilina', 'cloxacilina', 'ticarcilina', 'piperacilina']
  },
  cephalosporins: {
    label: 'Cefalosporinas',
    members: ['cefalexina', 'cefalotina', 'cefazolina', 'cefadroxila', 'cefovecina', 'ceftriaxona', 'cefotaxima', 'ceftiofur', 'cefpodoxima']
  },
  nsaids: {
    label: 'Anti-inflamatórios não esteroides (AINEs)',
    members: ['meloxicam', 'carprofeno', 'firocoxibe', 'robenacoxibe', 'cetoprofeno', 'flunixina', 'deracoxibe', 'grapiprant', 'acido acetilsalicilico', 'aspirina', 'piroxicam', 'nimesulida']
  },
  pyrazolones: {
    label: 'Pirazolonas',
    members: ['dipirona', 'metamizol', 'fenilbutazona']
  },
  sulfonamides: {
    label: 'Sulfonamidas',
    members: ['sulfametoxazol', 'sulfadiazina', 'sulfadimetoxina', 'trimetoprima']
  },
  fluoroquinolones: {
    label: 'Fluoroquinolonas',
    members: ['enrofloxacino', 'enrofloxacina', 'marbofloxacino', 'marbofloxacina', 'ciprofloxacino', 'ciprofloxacina', 'pradofloxacino', 'orbifloxacino']
  },
  tetracyclines: {
    label: 'Tetraciclinas',
    members: ['doxiciclina', 'tetraciclina', 'oxitetraciclina', 'minociclina']
  },
  macrolides: {
    label: 'Macrolídeos',
    members: ['azitromicina', 'eritromicina', 'claritromicina', 'tilosina']
  },
  opioids: {
    label: 'Opioides',
    members: ['morfina', 'metadona', 'tramadol', 'butorfanol', 'buprenorfina', 'fentanil', 'meperidina', 'petidina', 'codeina']
  },
  local_anesthetics_amide: {
    label: 'Anestésicos locais (amidas)',
    members: ['lidocaina', 'bupivacaina', 'ropivacaina', 'mepivacaina']
  }
};

function drugClassesOf(value: string): string[] {
  const normalized = normalize(value);
  const tokens = substanceTokens(value);
  return Object.entries(DRUG_CLASSES)
    .filter(([, drugClass]) =>
      drugClass.members.some((member) =>
        member.includes(' ')
          ? normalized.includes(member)
          : tokens.some((token) => tokensMatch(member, token))
      )
    )
    .map(([key]) => key);
}

export interface StructuredAllergyConflict {
  readonly substance: string;
  readonly severity: AllergySeverity;
  readonly matchedBy: 'substance' | 'class';
  readonly drugClass?: string;
}

/**
 * Matches a medication against structured allergies by substance and by drug
 * class (explicit `drugClass`, or the class the allergy substance belongs to).
 */
export function findStructuredAllergyConflicts(
  medicationName: string,
  allergies: readonly StructuredAllergy[] | null | undefined
): StructuredAllergyConflict[] {
  if (!allergies?.length) return [];
  const medicationTokens = substanceTokens(medicationName);
  const medicationClasses = new Set(drugClassesOf(medicationName));
  const conflicts: StructuredAllergyConflict[] = [];
  for (const allergy of allergies) {
    const substanceMatch = substanceTokens(allergy.substance).some((allergyToken) =>
      medicationTokens.some((token) => tokensMatch(allergyToken, token))
    );
    if (substanceMatch) {
      conflicts.push({ substance: allergy.substance, severity: allergy.severity, matchedBy: 'substance' });
      continue;
    }
    const allergyClasses = allergy.drugClass ? [allergy.drugClass] : drugClassesOf(allergy.substance);
    const sharedClass = allergyClasses.find((drugClass) => medicationClasses.has(drugClass));
    if (sharedClass) {
      conflicts.push({
        substance: allergy.substance,
        severity: allergy.severity,
        matchedBy: 'class',
        drugClass: sharedClass
      });
    }
  }
  return conflicts;
}

const SEVERITIES = new Set<AllergySeverity>(['mild', 'moderate', 'severe', 'anaphylaxis']);
const MAX_STRUCTURED_ALLERGIES = 20;

/**
 * Validates structured allergy input. Returns a normalized list or a Portuguese
 * error message; callers wrap it in their own validation error type.
 */
export function normalizeStructuredAllergies(
  input: unknown
): { readonly allergies: StructuredAllergy[] } | { readonly error: string } {
  if (input === undefined || input === null) return { allergies: [] };
  if (!Array.isArray(input)) return { error: 'allergies deve ser uma lista' };
  if (input.length > MAX_STRUCTURED_ALLERGIES) {
    return { error: `Informe no máximo ${MAX_STRUCTURED_ALLERGIES} alergias` };
  }
  const allergies: StructuredAllergy[] = [];
  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { error: `allergies[${index}] é inválida` };
    }
    const item = raw as Record<string, unknown>;
    const substance = typeof item.substance === 'string' ? item.substance.trim() : '';
    if (substance.length < 2 || substance.length > 80) {
      return { error: `allergies[${index}].substance deve ter entre 2 e 80 caracteres` };
    }
    if (typeof item.severity !== 'string' || !SEVERITIES.has(item.severity as AllergySeverity)) {
      return { error: `allergies[${index}].severity é inválida` };
    }
    const drugClass =
      typeof item.drugClass === 'string' && item.drugClass.trim() ? item.drugClass.trim() : undefined;
    if (drugClass && !DRUG_CLASSES[drugClass]) {
      return { error: `allergies[${index}].drugClass é desconhecida` };
    }
    const reaction =
      typeof item.reaction === 'string' && item.reaction.trim() ? item.reaction.trim() : undefined;
    if (reaction && reaction.length > 200) {
      return { error: `allergies[${index}].reaction deve ter no máximo 200 caracteres` };
    }
    allergies.push({
      substance,
      severity: item.severity as AllergySeverity,
      ...(drugClass ? { drugClass } : {}),
      ...(reaction ? { reaction } : {})
    });
  }
  return { allergies };
}
