import { z } from 'zod';

function toTrimmed(value: string): string {
  return value.trim();
}

function toNullableText(value: string): string | null {
  const trimmed = toTrimmed(value);
  return trimmed.length === 0 ? null : trimmed;
}

function toOptionalText(value: string): string | undefined {
  const trimmed = toTrimmed(value);
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizePhone(value: string): string | null {
  const normalized = value.trim().replace(/[\s()-]/g, '');
  return normalized.length === 0 ? null : normalized;
}

function normalizeCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export const ownerFormSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nome completo deve ter pelo menos 2 caracteres'),
    document: z.string(),
    email: z.string(),
    phoneMain: z.string(),
    phoneAlt: z.string()
  })
  .superRefine((value, context) => {
    const emailCandidate = toNullableText(value.email);
    const emailIsValid =
      emailCandidate === null || z.string().email().safeParse(emailCandidate).success;

    if (!emailIsValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email inválido',
        path: ['email']
      });
    }

    const phoneMain = normalizePhone(value.phoneMain);
    const phoneAlt = normalizePhone(value.phoneAlt);

    if (phoneMain !== null && phoneMain.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone principal deve ter ao menos 6 dígitos',
        path: ['phoneMain']
      });
    }

    if (phoneAlt !== null && phoneAlt.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone alternativo deve ter ao menos 6 dígitos',
        path: ['phoneAlt']
      });
    }
  })
  .transform((value) => {
    const emailCandidate = toNullableText(value.email);
    const phoneMain = normalizePhone(value.phoneMain);
    const phoneAlt = normalizePhone(value.phoneAlt);

    return {
      fullName: toTrimmed(value.fullName),
      document: toNullableText(value.document),
      email: emailCandidate ? emailCandidate.toLowerCase() : null,
      phoneMain,
      phoneAlt
    };
  });

export type OwnerFormInput = z.input<typeof ownerFormSchema>;
export type OwnerFormValues = z.output<typeof ownerFormSchema>;

export const patientFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    species: z.string().trim().min(1, 'Espécie é obrigatória'),
    breed: z.string(),
    sex: z.string(),
    microchip: z.string(),
    aggressive: z.boolean(),
    allergies: z.string(),
    anesthesiaRisk: z.enum(['', 'low', 'medium', 'high']),
    chronicConditions: z.string(),
    notes: z.string()
  })
  .transform((value) => ({
    name: toTrimmed(value.name),
    species: toTrimmed(value.species),
    breed: toOptionalText(value.breed),
    sex: toOptionalText(value.sex),
    microchip: toOptionalText(value.microchip),
    alerts: {
      aggressive: value.aggressive,
      allergies: normalizeCsv(value.allergies),
      anesthesia_risk: value.anesthesiaRisk === '' ? null : value.anesthesiaRisk,
      chronic_conditions: normalizeCsv(value.chronicConditions),
      notes: toNullableText(value.notes)
    }
  }));

export type PatientFormInput = z.input<typeof patientFormSchema>;
export type PatientFormValues = z.output<typeof patientFormSchema>;

const soapFieldSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, 'Todos os campos SOAP são obrigatórios'));

export const soapFormSchema = z.object({
  subjective: soapFieldSchema,
  objective: soapFieldSchema,
  assessment: soapFieldSchema,
  plan: soapFieldSchema
});

export type SoapFormInput = z.input<typeof soapFormSchema>;
export type SoapFormValues = z.output<typeof soapFormSchema>;

export const noteReasonSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, 'Informe o motivo da alteração'));
