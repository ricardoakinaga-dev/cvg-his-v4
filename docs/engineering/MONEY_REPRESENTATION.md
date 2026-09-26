# Representação monetária (R2-FIN-01)

**Owner:** Backend e Financeiro · **Revisão:** ao incluir qualquer soma, produto ou arredondamento de valores.

## Contrato

- Registros de domínio e contratos da API guardam valores em **reais com duas
  casas** (`number`), como sempre fizeram; nada muda para o SPA nem para o banco.
- Toda **aritmética** monetária (somas de itens, totais, saldos de caixa,
  descontos, multiplicação por quantidade) passa por
  `@cvg-his-v2/shared-utils` → `money.ts`: `toCents`, `fromCents`,
  `roundAmount`, `sumAmounts`, `addAmounts`, `subtractAmounts`,
  `multiplyAmount`, `amountsEqual`. Internamente os valores viram **centavos
  inteiros**; a conversão para reais acontece uma vez, no fim da operação.
- É proibido escrever `Math.round(x * 100) / 100`, `Number(x.toFixed(2))` ou
  `reduce((a, b) => a + b.amount, 0)` sobre dinheiro fora desse módulo.
- `financial` e `counter-sales` já trabalhavam em centavos inteiros nas suas
  tabelas; `billing`, `cash` e `quotes` foram migrados em 26/09/2026.

## Evidência

- `packages/shared/utils/src/money.test.ts`: testes de propriedade (500 listas
  aleatórias) provando que a soma em centavos nunca diverge, que soma e
  subtração são exatas e invertíveis, que multiplicar por quantidade inteira é
  igual a somar repetidamente e que uma reconciliação de caixa fecha sem
  diferença de centavos.
- `packages/modules/cash/src/cash.test.ts` ("R2-FIN-01"): 253 movimentos com
  valores hostis ao ponto flutuante (0,1; 0,2; 1,005; 2,675…) fecham o caixa
  com `difference = 0` e `totalIn − totalOut` igual ao saldo esperado.
