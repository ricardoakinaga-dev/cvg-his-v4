# Handoff CVG-002C5 — alta HTTP e cache de auditoria

## Ponto de entrada

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Preserve `packages/design-system/tsconfig.vue.tsbuildinfo`: ele já estava
dirty e é cache user-owned, não parte desta entrega.

Implementação publicada: `db73cb72ac5d36e24030651959cdcc18ec1d82d9`
(`fix: close inpatient stay on discharge and preserve audit cache`).

## O que foi fechado

O `POST /discharges` agora é tenant-scoped pelo bearer, valida o encounter em
qualquer tipo de alta e, para internação, fecha a stay ativa dentro do comando
tenant-aware. Replay retorna o mesmo corpo; rollback não deixa discharge/stay/
audit/idempotência ou cache fantasma. A violação única do encounter em duas
instâncias HTTP vira `409`.

O cache de auditoria tem um caminho de reidratação dedicado que não usa o
limite default de 100 eventos e filtra por conta. O fallback de transação foi
explicitado para runtime SQL que não exponha `unitOfWork`.

## Evidência fresca

- `tests/integration/database/inpatient-discharge-http-postgres.test.ts`: `5/5`;
- AuditService + discharges: `31/31`;
- daily-charge + cash receipt HTTP: `6/6`;
- tenant-command: `5/5`;
- API build/typecheck e module typechecks: PASS;
- OpenAPI parse, Prettier direcionado e `git diff --check`: PASS.

Detalhes: `.agent/artifacts/CVG-002C5-discharge-http-closes-stay-audit-refresh-2026-08-23.md`.

## Retomada recomendada

1. executar a jornada PostgreSQL/RLS admissão → handoff/permanência →
   inventário → alta → billing → recebimento/ledger/auditoria/outbox como um
   vertical slice com replay, concorrência e failpoints;
2. transformar `listForCacheRefresh` em paginação/cursor se o volume alvo
   justificar;
3. manter abertos Redis failover real, provider real, SPA/B2c, paridade Vetus,
   WCAG, operações target-like, cobertura e release.

O ERP e o Quality Bar global continuam `IN_PROGRESS/PARTIAL`; nenhum gate de
produção foi promovido.
