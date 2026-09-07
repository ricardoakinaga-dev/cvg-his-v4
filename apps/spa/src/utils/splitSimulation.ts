export interface SplitSimulationInput {
  amount: string;
  installments: string;
  mdrPercent: string;
  clinicPercent: string;
  platformPercent: string;
}
export type SplitSimulation = { ok: false; error: string } | {
  ok: true;
  grossCents: number;
  feeCents: number;
  netCents: number;
  clinicCents: number;
  platformCents: number;
  installments: number;
  clinicPercent: number;
  platformPercent: number;
};

export function calculateSplit(input: SplitSimulationInput): SplitSimulation {
  const fields = [
    ['amount', 'Valor da venda'], ['installments', 'Parcelas'], ['mdrPercent', 'Taxa MDR'],
    ['clinicPercent', 'Percentual CVG'], ['platformPercent', 'Percentual Plataforma']
  ] as const;
  const values = {} as Record<keyof SplitSimulationInput, number>;
  for (const [key, label] of fields) {
    if (input[key].trim() === '' || !Number.isFinite(Number(input[key]))) return { ok: false, error: `Informe um número válido em ${label}.` };
    values[key] = Number(input[key]);
  }
  const amountMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.amount.trim());
  const exactCents = amountMatch ? BigInt(amountMatch[1]) * 100n + BigInt((amountMatch[2] ?? '').padEnd(2, '0')) : -1n;
  if (exactCents < 0n || exactCents > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: 'Informe um valor da venda não negativo, com até duas casas decimais e dentro da precisão suportada.' };
  }
  const grossCents = Number(exactCents);
  if (!Number.isSafeInteger(values.installments) || values.installments < 1) return { ok: false, error: 'Parcelas deve ser um número inteiro a partir de 1.' };
  for (const key of ['mdrPercent', 'clinicPercent', 'platformPercent'] as const) {
    if (values[key] < 0 || values[key] > 100 || Math.abs(values[key] * 100 - Math.round(values[key] * 100)) > 1e-6) {
      return { ok: false, error: 'Use percentuais entre 0 e 100, com até duas casas decimais.' };
    }
  }
  const clinicBasis = Math.round(values.clinicPercent * 100);
  const platformBasis = Math.round(values.platformPercent * 100);
  if (clinicBasis + platformBasis !== 10000) return { ok: false, error: 'A soma dos percentuais CVG e Plataforma deve ser 100%.' };
  // Local convention only: round the fee and clinic share to cents, then assign
  // the remaining cents to the platform. Never infer a provider settlement rule.
  const portion = (cents: number, basis: number) => Number((BigInt(cents) * BigInt(basis) + 5000n) / 10000n);
  const feeCents = portion(grossCents, Math.round(values.mdrPercent * 100));
  const netCents = grossCents - feeCents;
  const clinicCents = portion(netCents, clinicBasis);
  return { ok: true, grossCents, feeCents, netCents, clinicCents, platformCents: netCents - clinicCents,
    installments: values.installments, clinicPercent: values.clinicPercent, platformPercent: values.platformPercent };
}
