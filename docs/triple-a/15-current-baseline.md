# Baseline corrente — State of Art

Observado em `2026-09-12T05:52:49Z`, no candidato de código e documentação
`ede3a1d8b88a3a259f123349c672a13253851800`. Este arquivo é uma fotografia do
estado corrente; históricos anteriores não substituem evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `ede3a1d8b88a3a259f123349c672a13253851800` (`HEAD == origin/main`; documentação reconciliada após as correções de fixtures k6 e evidência)                                                                            |
| main_sha        | `main` e `origin/main` coincidem; rollback remoto preservado                                                                                                                                            |
| worktree        | Limpo; artefatos de release permanecem ignorados                                                                                                                                        |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                                                                |
| ci_run          | [CI #141](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34675471468) é o run exato do SHA e ainda está `In progress`; o [#140](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34672193141) anterior ficou `failure` somente em Performance/k6                                  |
| ci_failure      | O candidato ainda exige CI remoto exato terminal verde; o último run integralmente verde é o [#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200), em SHA anterior                          |
| overall_score   | `55` no gate estrito local executado exatamente neste SHA, com checks, build e suíte de testes                                                                                                                                        |
| critical_score  | `57` no gate estrito local                                                                                                                                                                                        |
| open_p0         | `15` no gate estrito local                                                                                                                                                                                        |
| local_gate      | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                                         |
| implemented     | Fixtures k6 determinísticas e tenant-safe; evidência com companions obrigatórios e override explícito fail-closed; readiness, supply chain, workflow/worker, RLS estático e documentação do prompt             |
| verified_local  | Testes focados `33/33`; testes Node de evidência/diagnóstico `8/8`; typecheck, lint, Prettier e diff: PASS; seed idempotente `2/2`; k6 local descartável `9/9` SLOs; suíte crítica `615` testes de banco + `11` suítes de processo: PASS                               |
| verified_remote | `NOT PROVEN` enquanto o CI #141 não terminaliza; CI #140 anterior: `15/16` jobs verdes, Performance/k6 falhou                                                                                                                       |
| verified_target | `NOT PROVEN`                                                                                                                                                                                                     |
| blocked         | CI #141 ainda em execução, restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana permanecem abertos                                                      |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                                                            |

## Decisão

O candidato foi publicado em `main` por fast-forward, sem force-push, e mantém
rollback remoto. A política Green Main exige todos os checks obrigatórios verdes
no mesmo SHA; o CI #141 ainda não tem resultado terminal. Por isso este baseline
não declara `main green`, release ou `TRIPLE-A VERIFIED`.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
