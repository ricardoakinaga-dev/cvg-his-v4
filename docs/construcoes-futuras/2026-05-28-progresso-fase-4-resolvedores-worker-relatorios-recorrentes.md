# Progresso Fase 4 - Resolvedores do worker para relatorios recorrentes

Data: 2026-05-28

## Objetivo

Reduzir execucoes vazias de relatorios agendados no worker, criando resolvedores especificos para os principais relatorios recorrentes do catalogo atual.

## Entregue

- O worker deixou de usar `resolveRows: async () => []` como comportamento padrao.
- Foi criado `resolveScheduledReportRows`.
- O resolvedor cobre `administrative-executive`, gerando linhas operacionais com:
  - destinatarios configurados;
  - status do agendamento;
  - ultima falha.
- O resolvedor cobre `commission-calculations`, gerando linha compativel com o schema do relatorio de comissoes.
- `runScheduledReportsTick` passou a usar o resolvedor real por padrao.
- O teste do worker valida que os dois relatorios conhecidos retornam linhas nao vazias e compativeis com seus schemas.

## Evidencias tecnicas

- `apps/worker/src/runner.ts`
- `apps/worker/src/runner.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/worker test` - runner, bootstrap e job de relatorios passando.

## Impacto no Premium Enterprise

Relatorios agendados deixam de depender de um resolvedor vazio no worker. Mesmo sem acoplamento direto aos modulos de API, o worker passa a produzir linhas operacionais uteis e compativeis com o catalogo para os relatorios recorrentes mais importantes.

Isso melhora a automacao Premium porque reduz entregas vazias e cria uma base incremental para plugar fontes mais profundas por dominio.

## Proximos passos recomendados

- Plugar fontes reais completas de financeiro/comercial/caixa no resolvedor `administrative-executive`.
- Plugar leitura persistida de fechamentos no resolvedor `commission-calculations`.
- Emitir metrica por `reportId` para comparar execucoes vazias versus preenchidas.
