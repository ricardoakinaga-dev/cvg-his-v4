# Progresso Fase 2 - Internacao: Link da Diaria Faturada para Billing

Data: 2026-05-28

## Objetivo

Melhorar a rastreabilidade operacional-financeira da ficha de internacao, exibindo o vinculo da diaria faturada com a cobranca do atendimento.

## Entregas Realizadas

- A secao "Diarias e Cobrancas" da ficha de internacao agora mostra o link `Cobranca {billingRecordId}` quando a diaria esta `billed`.
- O link direciona para `/billing/{encounterId}`, que e a rota de detalhe financeiro usada pelo modulo de billing.
- A diaria pendente continua exibindo a acao "Marcar Faturada".
- A diaria faturada passa a exibir apenas o status e o atalho para a cobranca, reduzindo ambiguidade operacional.
- O teste da pagina valida que diarias faturadas renderizam o link correto para o billing do atendimento.

## Resultado no Roadmap

Este incremento refina F2-05 ao conectar visualmente internacao e faturamento. A equipe consegue sair da ficha hospitalar para a cobranca real sem buscar manualmente o atendimento, melhorando auditoria e produtividade.

## Validacoes Executadas

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/inpatient/__tests__/InpatientDetailPage.test.ts --pool=forks`
- `pnpm --filter @cvg-his-v2/spa typecheck`
- `pnpm --filter @cvg-his-v2/spa build`
- Conferencia do lockfile para manter `vue-component-type-helpers@3.2.7`.

## Proximos Incrementos Recomendados

- Criar fila gerencial de diarias pendentes por setor/unidade.
- Exibir totais de internacao por status de faturamento na lista de internacoes.
- Criar relatorio de internacao com receita por periodo, paciente e unidade.
