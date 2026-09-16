# Baseline corrente — State of Art

Observado em `2026-09-16T02:41:01Z`, no candidato de código
`4da2e56d4bf814b46109b49a29d47f477382aa45`. A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva as correções de CI/coverage, acessibilidade clínica e
bootstrap hermético, além da reconciliação append-only do controlador. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `4da2e56d4bf814b46109b49a29d47f477382aa45` (candidato funcional/controlador atual; históricos permanecem somente comparação) |
| main_sha        | `main@4da2e56d`; `origin/main@a2d2285e` até publicação; local está à frente até publicação; rollback preservado |
| worktree        | Limpo após a reconciliação documental; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | `NOT_FOUND` para o SHA exato antes da publicação; o run remoto mais recente observado é [CI #35047806266](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35047806266) no candidato publicado anterior `a2d2285e`, que não é transferido. |
| ci_failure      | O run anterior falhou em coverage, repository guards, k6, SPA E2E e visual; causas e limitações estão registradas no parecer fresh. Nenhum threshold foi relaxado. |
| overall_score   | `51` no gate estrito executado com `commitSha=4da2e56d`; abaixo do mínimo 97 |
| critical_score  | `49` no gate estrito executado com `commitSha=4da2e56d`; abaixo do mínimo 95 |
| open_p0         | `18` no gate estrito; acima do máximo 0 |
| local_gate      | `BLOCKED`, `score=51`, `critical=49`, `open_p0=18`, `claim=NOT PROVEN`, `publication_allowed=false`; checks externos/target continuam ausentes |
| implemented     | Provisionamento PostgreSQL do coverage resolve `.deb` somente nos archives oficiais assinados, sem alterar thresholds; identidade/evidence graph são validados por ancestralidade; contraste overdue e semântica ARIA corrigidos; teste de bootstrap isola `REQUIRE_TEST_DB` |
| verified_local  | Typecheck e lint workspace PASS; contrato CI `19/19`; testes focados `46/46`; identidade/graph `3/3`; E2E clínico browser real `4/4`; visual `29/29` PASS e 1 especializado skipped; coverage isolado `2.661` testes, porém `77,97%` statements, `71,27%` branches, `79,17%` functions e `79,60%` lines, abaixo de `82%` |
| verified_remote | `NOT_PROVEN`: não há CI terminal do SHA exato; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Coverage global abaixo do limiar; CI exato ainda não publicado; evidência de target, restore/DR, performance certificada, UAT e autoridade humana continuam abertas |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato `4da2e56d` foi reconciliado localmente sem force-push; `origin/main`
ainda aponta para `a2d2285e` até a publicação autorizada. O CI anterior não é
transferido. A `main` permanece bloqueada para Green Main sem relaxar thresholds;
coverage abaixo de 82%, CI exato, target, recovery, attestation, UAT, governança e
autoridade continuam bloqueados. Não há declaração de release ou
`TRIPLE-A VERIFIED`.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
