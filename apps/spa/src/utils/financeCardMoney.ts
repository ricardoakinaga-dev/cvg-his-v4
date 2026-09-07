export interface CardMoney {
  amount: number | null;
  currency: string | null;
}

export function cardMoney(amount: unknown, currency?: string | null): CardMoney {
  // Card transactions currently use BRL in the payments domain. Preserve an
  // explicit currency from a future/extended response rather than relabel it.
  const code = currency == null ? 'BRL' : currency.trim().toUpperCase();
  return {
    amount: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
    currency: /^[A-Z]{3}$/.test(code) ? code : null
  };
}

export function sumCardMoney(values: readonly CardMoney[]): CardMoney {
  if (!values.length) return cardMoney(0);
  const currency = values[0].currency;
  if (!currency || values.some(value => value.amount === null || value.currency !== currency)) {
    return { amount: null, currency };
  }
  return { amount: values.reduce((sum, value) => sum + value.amount!, 0), currency };
}

export function formatCardMoney(value: CardMoney): string {
  if (value.amount === null || !value.currency) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: value.currency }).format(value.amount);
}
