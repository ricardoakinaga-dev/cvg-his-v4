# Baseline corrente — State of Art

Observado em `2026-09-12T10:23:00Z`, no candidato de código/workflow
`553078be60c963ffb7cab5c45c130912e5e299b8`, publicado em `main` com o
descendentes documentais `8273ecb5c7ea9afd759fdde86c91fe073ba64f94` e
`f9cc660a085793bffee9a45ccbeb3d004a755a70`. Este arquivo
é uma fotografia do estado corrente; históricos anteriores não substituem
evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `553078be60c963ffb7cab5c45c130912e5e299b8` (candidato de código/workflow; a documentação corrente será publicada em descendente documental)                                                                                                                                                       |
| main_sha        | `main` e `origin/main` coincidem; rollback remoto preservado                                                                                                                                                                                                                                      |
| worktree        | Limpo; artefatos de release permanecem ignorados                                                                                                                                                                                                                                                  |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                                                                                                                                                   |
| ci_run          | [CI #149](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34687849607) no `main@553078be` terminou `failure` no `Repository Guards`; os jobs iniciais, Coverage e OpenAPI passaram antes do guard bloquear o restante. |
| ci_failure      | O guard falhou porque os snapshots documentais ainda apontavam para `a3354f02` depois da alteração controlada do workflow/contrato. A correção documental está neste candidato; nenhum threshold foi relaxado. O #147 permanece como evidência histórica verde do candidato funcional anterior. |
| overall_score   | `55` no gate estrito local completo executado no pai `82ff6eec`, com checks, build e suíte de testes                                                                                                                                                                                              |
| critical_score  | `57` no gate estrito local                                                                                                                                                                                                                                                                        |
| open_p0         | `15` no gate estrito local                                                                                                                                                                                                                                                                        |
| local_gate      | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                                                                                                                          |
| implemented     | Fixtures k6 determinísticas e tenant-safe; evidência com companions obrigatórios e override explícito fail-closed; readiness, supply chain, workflow/worker, RLS estático e documentação do prompt                                                                                                |
| verified_local  | Testes focados `5/5`; typecheck, lint, Prettier, docs e diff: PASS; seed idempotente `2/2`; k6 local descartável `9/9` SLOs inclusive com API/PostgreSQL/Redis em 2 CPUs e `GOMAXPROCS=1`; suíte crítica histórica `615` testes de banco + `11` suítes de processo: PASS |
| verified_remote | CI #149 detectou e bloqueou o snapshot documental stale; #147 confirmou historicamente o código/workflow clínico `a3354f02` com `16/16` jobs. Target, recovery, UAT, attestation, governança e autoridade de release permanecem `NOT PROVEN`. |
| verified_target | `NOT PROVEN`                                                                                                                                                                                                                                                                                      |
| blocked         | Falha de `Repository Guards` no CI #149 por snapshot stale; gate estrito local `55/57/15`; restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana permanecem abertos. |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                                                                                                                                            |

## Decisão

O candidato foi publicado em `main` por fast-forward, sem force-push, e mantém
rollback remoto. O CI #149 bloqueou no guard porque os documentos ainda não
estavam ligados ao SHA do workflow; esta atualização fecha a causa detectada,
mas requer nova execução terminal. A `main` atual permanece bloqueada para Green
Main até que o CI do snapshot corrigido termine, sem relaxar thresholds. O
gate estrito local e as provas externas de target, recovery, attestation, UAT,
governança e autoridade também continuam bloqueados; não há declaração de
release ou `TRIPLE-A VERIFIED`.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
