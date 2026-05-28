# Progresso - Fase 4 - Comissões persistidas no worker de relatórios recorrentes

Data: 2026-05-28

## Objetivo

Fechar a lacuna documentada no resolvedor `commission-calculations`, que ainda gerava linha sintética quando havia fechamentos de comissão persistidos disponíveis.

## Entregue

- O resolvedor `resolveScheduledReportRows` passou a aceitar fonte operacional `commissions`.
- Quando a fonte existe, `commission-calculations` passa a listar fechamentos reais pelo `CommissionsService`.
- O resolvedor aplica filtro de status do agendamento quando informado.
- O resolvedor aplica recorte por período quando `dateFrom`/`dateTo` existem nos filtros do agendamento.
- As linhas geradas preservam o schema do relatório:
  - `number`;
  - `period`;
  - `status`;
  - `totalBaseAmount`;
  - `totalCommissionAmount`;
  - `lineCount`.
- O bootstrap do worker conecta `CommissionsService` com `DatabaseCommissionRepository` quando há banco disponível.
- O fallback sintético permanece para ambientes sem fonte de comissões.
- Teste do worker cobre leitura de fechamento persistido revisado e filtragem de fechamento pago fora do recorte.

## Arquivos principais

- `apps/worker/src/runner.ts`
- `apps/worker/src/bootstrap.ts`
- `apps/worker/src/runner.test.ts`
- `apps/worker/package.json`
- `pnpm-lock.yaml`

## Validação executada

- `pnpm --filter @cvg-his-v2/worker test`

## Impacto no plano Premium Enterprise

Este incremento torna o relatório recorrente de comissões mais próximo de uma operação enterprise real: o worker deixa de gerar apenas evidência artificial e passa a reutilizar fechamentos persistidos, mantendo compatibilidade com exportação, agendamento e métricas existentes.
