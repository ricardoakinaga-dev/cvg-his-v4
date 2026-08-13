# Progresso Fase 4 - E2E 360 com PostgreSQL real

Data: 2026-05-28

## Objetivo

Fechar a pendencia registrada na jornada `Busca Mestre -> cockpit 360 -> recepcao -> cockpit 360 -> esteira`: rodar o mesmo fluxo critico com PostgreSQL de teste ativo, sem fallback forçado para repositorios em memoria.

## Entregue

- `playwright-spa.config.ts` agora respeita `API_DISABLE_INCOMPATIBLE_DB_REPOS` vindo do ambiente.
- O modo local continua seguro por padrao com fallback em memoria (`1`), mas a validacao Enterprise pode usar `API_DISABLE_INCOMPATIBLE_DB_REPOS=0`.
- `infra/scripts/run-e2e-spa.sh` passou a executar Playwright com `API_DISABLE_INCOMPATIBLE_DB_REPOS=0` no ambiente Docker-backed.
- `packages/db/migrations/0047_commissions.sql` foi corrigida para usar `UUID` em `staff_id`, alinhando com `staff.id`.
- `packages/db/migrations/0053_laboratory_result_release_signature.sql` passou a criar as tabelas laboratoriais esperadas pelos repositorios reais antes de aplicar metadados de liberacao e assinatura.
- O CI `test-e2e-spa` passou a semear admin, iniciar API em modo database e executar a jornada 360 como passo bloqueante.

## Evidencia tecnica

- PostgreSQL de teste em `127.0.0.1:5433` ficou saudavel via `docker-compose.test.yml`.
- `node infra/scripts/prepare-test-db.mjs` aplicou migrations com sucesso ate `0054_enterprise_rls_gap_closure`.
- A API inicializou com `persistenceMode: "database"` e `Database repositories initialized for critical auth/encounter runtime`.
- A jornada Playwright `e2e/spa/master-search-360-reception.spec.ts` passou com 4/4 cenarios:
  - atencao clinica;
  - exames pendentes;
  - preventivo vencido;
  - pendencia financeira.

## Validacao executada

- `pnpm --filter @cvg-his/db build`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/spa build`
- `pnpm validate:rls` - `96/96 tenant table(s) protected`
- `DATABASE_URL="<test-database-url>" node infra/scripts/prepare-test-db.mjs`
- `API_DISABLE_INCOMPATIBLE_DB_REPOS=0 E2E_DATABASE_URL="<test-database-url>" npx playwright test --config playwright-spa.config.ts e2e/spa/master-search-360-reception.spec.ts`
- `pnpm test:e2e:spa:360` - 5/5 testes passando localmente.

Resultado final: `4 passed`.

## Impacto Premium Enterprise

A jornada 360 deixou de ter apenas evidencia funcional em memoria e passou a ter evidencia operacional com persistencia real, migrations canonicas e API em modo database. Isso fortalece diretamente o marco `Enterprise Technical Ready` e o item P0 `Criar E2E dos fluxos criticos`.

## Proximos passos recomendados

- Adicionar cobertura visual/mobile para a mesma jornada 360.
- Executar o pipeline remoto para anexar evidencia de job GitHub Actions ao release candidate.
