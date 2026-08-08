# Progresso Fase 1 - Counter-sales consistencia financeira

Data: 2026-05-28

## Incremento entregue

Incremento da Fase 1 do roadmap Premium Enterprise no item `F1-02 - Consolidar comandas/counter-sales`.

O foco foi fortalecer a confiabilidade financeira das comandas em modo persistido, evitando divergencia entre itens, pagamentos e totais salvos.

## Escopo implementado

- Persistencia dos totais recalculados da comanda apos:
  - adicionar item;
  - atualizar item;
  - remover item;
  - registrar pagamento.
- Bloqueio de total negativo em comanda.
- Bloqueio de alteracao de itens quando a mudanca deixaria pagamentos acima do total recalculado.
- Validacao de item financeiro:
  - nome obrigatorio;
  - quantidade maior que zero;
  - preco unitario nao negativo;
  - desconto nao negativo.
- Validacao de pagamento:
  - valor maior que zero;
  - parcelas maior que zero;
  - bloqueio de pagamento acima do saldo.
- Ajuste do teste de rota de comandas para seguir a ordem financeira correta: editar itens antes de receber o pagamento final.

## Evidencias de validacao

- `pnpm --filter @cvg-his-v2/module-counter-sales build`: passou.
- `pnpm --filter @cvg-his-v2/module-counter-sales test`: passou.
  - `27` testes.
- `pnpm --filter @cvg-his-v2/module-counter-sales typecheck`: passou.
- `pnpm --filter @cvg-his-v2/api build`: passou.
- `node --test apps/api/dist/routes/counter-sales-routes.test.js`: passou.
  - `4` testes.
- `pnpm typecheck`: passou no monorepo.

## Impacto no roadmap

Este incremento melhora diretamente `F1-02`, pois comandas/counter-sales deixam de depender apenas do estado em memoria para exibir saldos corretos apos operacoes intermediarias. Isso reduz risco de divergencia em lista, detalhes, dashboard comercial e fechamento financeiro.

Tambem aproxima o modulo do nivel Premium Enterprise por reforcar invariantes financeiras de dominio antes de adicionar novas experiencias visuais ou relatorios.

## Proximo foco recomendado

Continuar `F1-02` com uma das duas frentes:

1. Documentar e expor `counter-sales` completamente no OpenAPI, incluindo schemas de comanda, item, pagamento e dashboard comercial.
2. Criar fluxo E2E/integração cobrindo abrir comanda, adicionar itens, registrar pagamento, fechar e bloquear edicoes financeiras indevidas apos pagamento.
