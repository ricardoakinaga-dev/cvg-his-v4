# Baseline corrente — State of Art

Observado em `2026-09-12T08:40:31Z`, no candidato de código e documentação
`a3354f021d7046ad345f5aad89d16ab0ef9c1be3`. Este arquivo é uma fotografia do
estado corrente; históricos anteriores não substituem evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `a3354f021d7046ad345f5aad89d16ab0ef9c1be3` (candidato de código/workflow; a documentação corrente é descendente documental)                                                                                                                                                                                                                               |
| main_sha        | `main` e `origin/main` coincidem; rollback remoto preservado                                                                                                                                                                                                                                                                                              |
| worktree        | Limpo; artefatos de release permanecem ignorados                                                                                                                                                                                                                                                                                                          |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                                                                                                                                                                                                           |
| ci_run          | [CI #146](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34682262401) no `main@697c6efa` terminou `failure`: o job E2E SPA passou a suíte SPA, mas falhou em `Run canonical clinical API E2E`; Performance/k6, integração, guards e demais jobs passaram. A correção de isolamento está no candidato `a3354f02`; não há CI verde para ele. |
| ci_failure      | O candidato exige CI remoto exato terminal verde; o #146 falhou no E2E clínico canônico antes do isolamento do banco. O último run integralmente verde continua sendo o [#137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200), em SHA anterior.                                                                               |
| overall_score   | `55` no gate estrito local completo executado no pai `82ff6eec`, com checks, build e suíte de testes                                                                                                                                                                                                                                                      |
| critical_score  | `57` no gate estrito local                                                                                                                                                                                                                                                                                                                                |
| open_p0         | `15` no gate estrito local                                                                                                                                                                                                                                                                                                                                |
| local_gate      | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                                                                                                                                                                                  |
| implemented     | Fixtures k6 determinísticas e tenant-safe; evidência com companions obrigatórios e override explícito fail-closed; readiness, supply chain, workflow/worker, RLS estático e documentação do prompt                                                                                                                                                        |
| verified_local  | Testes focados `33/33`; testes Node de evidência/diagnóstico `8/8`; typecheck, lint, Prettier e diff: PASS; seed idempotente `2/2`; k6 local descartável `9/9` SLOs; suíte crítica `615` testes de banco + `11` suítes de processo: PASS                                                                                                                  |
| verified_remote | `NOT PROVEN`; o CI #146 falhou no passo de API E2E clínico canônico no descendente `697c6efa`; a correção `a3354f02` separa o banco da prova e aguarda novo CI.                                                                                                                                                                                           |
| verified_target | `NOT PROVEN`                                                                                                                                                                                                                                                                                                                                              |
| blocked         | Performance/k6 falhou no CI #145; o CI #146 falhou no E2E clínico canônico; #144 encontrou checkout raso no guard de snapshot, já corrigido; restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana permanecem abertos                                                                 |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                                                                                                                                                                                                    |

## Decisão

O candidato foi publicado em `main` por fast-forward, sem force-push, e mantém
rollback remoto. A política Green Main exige todos os checks obrigatórios verdes
no mesmo SHA. O CI #146 no descendente documental `697c6efa` falhou no passo
de API E2E clínico canônico, enquanto Performance/k6 passou; o candidato
`a3354f02` isola essa prova em banco e API próprios. O novo CI ainda é
necessário, e os gates externos permanecem bloqueados. Por isso este baseline
não declara `main green`, release ou `TRIPLE-A VERIFIED`.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
