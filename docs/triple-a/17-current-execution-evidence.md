# Evidência de execução corrente — State of Art

## Candidato

- SHA: `c7336ac0f6a909c10d07797c36814f0b321c6d5c`.
- `HEAD == origin/main`; worktree limpo na captura.
- Rollback preservado em `origin/fix/state-of-art-ci-assurance@fe5406c2`.

## Validações locais

| Escopo          | Resultado                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Gate estrito    | `BLOCKED`, score `50`, critical `46`, open P0 `19`, claim `NOT PROVEN`                           |
| Workspace       | `pnpm test` passou; as suítes API, SPA, worker e pacotes concluíram sem falha                    |
| Qualidade       | `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm security:secrets`, `pnpm docs:validate`: PASS |
| Critical        | `pnpm test:critical`: 66 arquivos / 615 testes; processos críticos `11/11`                       |
| E2E clínico     | jornadas canônicas `2/2` em PostgreSQL/Redis local                                               |
| Supply chain    | 113 actions e 6 imagens verificadas por referência imutável                                      |
| Backup estático | `pnpm ops:backup:check`: 4 testes e 15 guards PASS                                               |

Esses resultados são bounded ao ambiente local. Não são promovidos para target,
UAT, branch protection ou autoridade de release.

## CI remoto do mesmo SHA

O [CI #135](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242)
terminou `failure` com 15/16 jobs verdes. Secret Scan, Dependency Audit, SAST,
typecheck, OpenAPI, coverage, guards, lint, build, contratos, unit,
integration, Windows, visual e E2E concluíram com sucesso. O E2E clínico
canônico e a validação completa de usabilidade também passaram.

O job [Performance/k6](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34663821242/job/103473632130)
falhou nos passos do benchmark/SLO. A coleta e finalização do novo diagnóstico
passaram e o artefato foi publicado. A reprodução local do perfil exato passou
9/9, o que não prova a causa do runner remoto. Nenhum threshold foi relaxado.

## Recovery e target

`pnpm ops:backup:check` valida contratos estáticos. Os drills reais fixture e
representative não iniciaram porque o Docker daemon recusou o socket; não há
evidência de restore, corrupção, migration mismatch, RPO/RTO, deploy,
rollback, attestation, soak ou alert delivery em target.

## Decisão

O envelope ignorado `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` é
`BLOCKED / NOT PROVEN`. A ausência de uma prova externa permanece ausência; não
é convertida em PASS por execução local ou por um run de SHA diferente.
