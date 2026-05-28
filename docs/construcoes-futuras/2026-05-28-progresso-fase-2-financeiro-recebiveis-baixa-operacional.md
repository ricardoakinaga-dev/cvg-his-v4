# Progresso Fase 2 - Financeiro Recebíveis com Baixa Operacional

Data: 2026-05-28

## Objetivo

Aprofundar o financeiro legado da F2-04 transformando a tela de Contas a Receber em superfície operacional, não apenas consulta.

## Entregas

- `financialReceivablesService` passou a expor `settle(receivableId, payload)`.
- A tela `BillingListPage.vue`, usada por `/billing` e `/finance/accounts-receivable`, agora permite:
  - baixar um título aberto individualmente;
  - baixar em lote títulos abertos selecionados;
  - recarregar a lista após liquidação;
  - manter seleção imutável e remover títulos liquidados da seleção;
  - exibir loading específico por linha e no lote.
- A baixa usa o endpoint real `POST /financial/receivables/:id/settle`, com auditoria já existente na API.
- Testes da página foram ampliados para cobrir baixa individual e em lote.

## Validação

- `pnpm exec vitest run src/pages/billing/__tests__/BillingListPage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`

## Resultado

F2-04 iniciou com ganho operacional direto em Contas a Receber: o financeiro consegue listar, selecionar e baixar títulos reais de atendimento, aproximando o sistema do fluxo Enterprise de cobrança e conciliação.

## Próximos Passos

1. Evoluir baixa parcial com campo de valor e observação por título.
2. Conectar baixa com gaveta/caixa e método de pagamento explícito.
3. Criar subledger de contas a pagar com vencimento, fornecedor, competência e liquidação.
4. Expandir DRE usando receitas realizadas, despesas por centro de custo e comissões pagas.
