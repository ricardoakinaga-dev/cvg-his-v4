import { describe, expect, it } from 'vitest';
import { cardMoney, formatCardMoney, sumCardMoney } from '../financeCardMoney';

describe('financial card money', () => {
  it('preserves zero and negative values without converting unknown values into zero', () => {
    expect(cardMoney(0).amount).toBe(0);
    expect(cardMoney(-10).amount).toBe(-10);
    for (const value of [undefined, null, NaN, Infinity]) expect(formatCardMoney(cardMoney(value))).toBe('—');
    expect(formatCardMoney(cardMoney(0))).toContain('0,00');
  });
  it('requires every component amount and a common currency for a monetary sum', () => {
    expect(sumCardMoney([cardMoney(100), cardMoney(0)])).toEqual(cardMoney(100));
    expect(sumCardMoney([cardMoney(100), cardMoney(null)]).amount).toBeNull();
    expect(sumCardMoney([cardMoney(100, 'BRL'), cardMoney(100, 'USD')]).amount).toBeNull();
    expect(sumCardMoney([])).toEqual(cardMoney(0));
  });
  it('formats the recorded currency and does not assume a malformed code is BRL', () => {
    expect(formatCardMoney(cardMoney(10, 'USD'))).toContain('US$');
    expect(formatCardMoney(cardMoney(10, 'invalid'))).toBe('—');
  });
});
