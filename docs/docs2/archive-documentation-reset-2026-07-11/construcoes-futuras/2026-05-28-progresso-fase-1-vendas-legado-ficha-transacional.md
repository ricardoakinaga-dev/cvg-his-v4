# Progresso - Fase 1 Vendas Legado - Ficha Transacional

Data: 2026-05-28

## Escopo

Incremento da F1-04 do roadmap Premium Enterprise, focado em aproximar a tela `Vendas` do fluxo legado Vetus sem duplicar o domínio de comanda.

## Implementado

- A ficha da venda passou a exibir:
  - Valor pago.
  - Saldo em aberto.
- O botão `Fechar` da ficha agora aciona `counterSalesService.close`.
- O botão `Excluir Venda` agora aciona `counterSalesService.cancel`.
- Após fechamento ou cancelamento, a ficha recarrega o detalhe atualizado via API.
- Quando a venda fechada deixa de bater com o filtro `Aberta`, a tela altera o filtro para `Todas` para manter a ficha recém-operada visível.
- Erros de regra de negócio da API são exibidos na própria tela, sem fallback para dados mockados.

## Arquivos alterados

- `apps/spa/src/pages/sales/SalesPage.vue`
- `apps/spa/src/pages/sales/__tests__/SalesPage.test.ts`

## Validações

- `pnpm exec vitest run src/pages/sales/__tests__/SalesPage.test.ts --pool=forks`
  - 1 arquivo aprovado.
  - 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Aprovado.

## Observação técnica

Este incremento não cria um novo backend de vendas independente. Ele fortalece a camada operacional `/sales` usando o domínio real já existente de `counter-sales`, mantendo consistência financeira e evitando divergência entre venda legada e comanda.
