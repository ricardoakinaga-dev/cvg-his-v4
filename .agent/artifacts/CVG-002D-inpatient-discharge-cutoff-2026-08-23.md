# Quality Bar — cutoff de alta e fail-closed distribuído

Data: 23/08/2026
Tarefa: `CVG-002` / continuação clínica-financeira
Escopo: fechar a fronteira PostgreSQL que impede novos atos clínicos, diárias e
consumo de estoque vinculados a uma internação já dada como alta. Inclui a
prova HTTP de que o login falha fechado quando o rate limiter distribuído fica
indisponível. Não é a jornada completa de internação nem certificação do ERP.

## Implementação

- `packages/db/migrations/0116_inpatient_discharge_cutoff.sql` cria a função
  `SECURITY DEFINER app.reject_inpatient_child_after_discharge` e triggers
  `BEFORE INSERT` para `inpatient_progress`, `inpatient_occurrences`,
  `inpatient_daily_charges` e `inventory_consumptions` com
  `source_entity_type=inpatient_stay`.
- A função consulta `status` e `discharged_at` da stay com a conta composta e
  rejeita a inserção com erro explícito antes de qualquer item clínico ou
  financeiro ser visível. Atualizações posteriores de uma diária já criada
  (por exemplo, marcar como faturada) continuam permitidas.
- `apps/api/src/server.test.ts` prova que uma falha do backend Redis no limite de
  login retorna `500 INTERNAL_ERROR` sem cookie de refresh ou token.
- `packages/chaos/src/experiments/redis-failure.ts` e
  `apps/api/src/chaos-operational-state.ts` agora descrevem `fail-closed`, sem
  a descrição contraditória de fallback local.

## Evidência executada

- RED PostgreSQL: antes da migration, a inserção direta pós-alta era aceita;
  depois da migration, o teste descartável passou `2/2` para os três clinical
  children exercitados separadamente e consumo `inpatient_stay`. A reexecução
  após a revisão do teste manteve `2/2` com lock `FOR SHARE` na stay.
- Ambiente da prova: PostgreSQL 16 Alpine descartável na porta local
  temporária, migrations `0000..0116`, role `cvg_installer` criada apenas no
  container efêmero, sem credenciais de provider ou sistemas externos.
- `pnpm --filter @cvg-his/db build`: PASS.
- `pnpm --filter @cvg-his-v2/chaos build`: PASS.
- `pnpm --filter @cvg-his-v2/api build`: PASS.
- Teste HTTP direcionado de rate-limit indisponível: `1/1` PASS.
- Redis local: `21/21` PASS, incluindo atomicidade em duas conexões, relógio
  Redis sob nó adiantado, deadline bounded e recuperação após cliente falho.
- `pnpm security:secrets`: PASS; Prettier dos arquivos alterados: PASS.

## Limites e retomada

O container PostgreSQL compartilhado de testes entrou em recovery durante a
criação repetida de bancos efêmeros e não foi usado para nova evidência depois
disso. Isso é uma limitação de ambiente, não uma promoção de produção. O
próximo slice ainda deve costurar admissão, handoff/permanência, diária,
estoque, billing, alta, recibo, ledger, auditoria/outbox e RLS em uma UoW ou
saga explícita, com RED de rollback entre `billing.addItem` e a marcação da
diária. Redis failover real entre processos, provider, SPA/B2c, paridade Vetus,
WCAG, operações alvo, cobertura e release permanecem abertos.
