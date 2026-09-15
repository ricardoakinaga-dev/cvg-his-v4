---
document_status: current
document_kind: execution_round_report
effective_date: 2026-09-13
owner: Engenharia
source_audit: docs/2026-09-12-avaliacao-profunda-release-triplo-aaa.md
---

# Execução multiagente — rodada 2: ambiente isolado, cobertura 5/5 e promoção

A rodada 2 resolveu o bloqueio de ambiente (MA-11) usando o runtime privado do projeto,
reparou dois defeitos reais do coletor de processo, executou os cinco shards críticos contra
identidade congelada e implementou a promoção verificada de candidatos (D7). A certificação
continua **BLOCKED / NOT PROVEN**: 6 falhas de integração pré-existentes e as 193 fontes
especializadas (D5) permanecem abertas.

## Entregas e evidência

| Frente | Resultado | Evidência |
| --- | --- | --- |
| MA-11 runtime privado | PostgreSQL 16 + Redis 7 do runtime do projeto; shards nativos/processo executados; integração com banco efêmero isolado via socket | `artifacts/remediation/MA-11-MA05-RUNTIME/attempt-20260913T0411Z/REPORT.md` |
| Fontes fora do inventário | 16 originais alcançáveis pelos artefatos gerados reconciliados em `executionInputs`; manifesto revisão 6 | `docs/engineering/critical-coverage-scope.json` |
| Coletor de processo | Observações de processos SIGKILL sem coverage passam a ser registradas (`uncoveredObservations`), nunca convertidas; PID com coverage continua fail-closed | `scripts/process-coverage-collection.test.mjs` 28/28 |
| Ambiente de teste | Config crítica em `node`; suítes SPA com `// @vitest-environment jsdom` por arquivo | `vitest.critical-coverage.config.ts` |
| D7 promoção | `scripts/promote-critical-shard.mjs` + `pnpm critical:promote`; 3 candidatos nativos promovidos com PASS | `scripts/promote-critical-shard.test.mjs` 3/3 |
| Shards 5/5 | unit `ce596aaa`, native-worker `2c790337`, native-api `4c181464`, critical-process `8c8ae65d` (passed); integração `07fc4b29` (failed, 910/916) | `artifacts/consolidacao-2026-09-05/coverage-scope/` |
| Checker agregado | FAIL com 243 erros (193 especializadas, 29 métricas, 18 type-only, 3 proveniência da integração); sem input hash mismatch | `artifacts/.../logs/checker-5-shards.log` |
| MA-07 CI | Contratos de promoção e de coleção de processo adicionados ao passo obrigatório | `.github/workflows/ci.yml` |

## Falhas de integração pré-existentes (bloqueantes)

Reproduzidas isoladamente; não são isolamento, ambiente nem regressão desta rodada:

1. `outbox-delivery.test.ts`: 2 falhas de lease/efeito.
2. `worker-event-consumers-postgres.test.ts`: 2 falhas de efeitos duráveis.
3. `pix-legacy-confirmation-http-postgres.test.ts`: rate limit atômico sem respostas 201.
4. `frontend-backend-contract.test.ts`: 16 chamadas SPA sem contrato estático no OpenAPI.

Correção exige produto/domínio (MA-13/14/18) com donos humanos; nenhuma regra de negócio foi
alterada nesta rodada.

## Avaliação independente

Verificação executável independente confirmou A1–A7 (5×2142 hashes de input recomputados, sem
mismatch; testes focais 44/44 + 28/28 + 3/3; 6 falhas reproduzidas isoladamente;
`verifyCandidate` vazio nos 3 shards promovidos; checker com 243 erros e zero mismatch) e
atribuiu **9/10** à rodada. A única ressalva de higiene (resumo 910/916 só no log) foi fechada
com `integration-failures.json` e recipe exato no REPORT. `program_score` 3/10 permanece
determinado pelos bloqueios declarados.

## Próximos passos

1. Corrigir as 6 falhas de integração com aceite dos donos de domínio e recolher o shard.
2. Decidir e implementar D5: evidência especializada para 168 migrations SQL + 25 Vue.
3. Repetir agregação, crítico fresco e MA-35 somente com os cinco shards verdes.

## Documentos relacionados

- [Rodada 1: reparos e primeiros shards](2026-09-13-execucao-round1-reparos-e-shards.md).
- [Roadmap e backlog multiagente](2026-09-12-roadmap-backlog-multiagente-release-triplo-aaa.md).
- [Préflight MA-05 e slice habilitador](2026-09-12-ma05-preflight-e-slice-habilitador.md).
