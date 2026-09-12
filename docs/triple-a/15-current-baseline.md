# Baseline corrente — State of Art

Observado em `2026-09-12T09:50:58Z`, no candidato de código/workflow
`a3354f021d7046ad345f5aad89d16ab0ef9c1be3`, publicado em `main` com o
descendentes documentais `8273ecb5c7ea9afd759fdde86c91fe073ba64f94` e
`f9cc660a085793bffee9a45ccbeb3d004a755a70`. Este arquivo
é uma fotografia do estado corrente; históricos anteriores não substituem
evidência do candidato.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| current_sha     | `a3354f021d7046ad345f5aad89d16ab0ef9c1be3` (candidato de código/workflow; a documentação corrente é descendente documental)                                                                                                                                                                       |
| main_sha        | `main` e `origin/main` coincidem; rollback remoto preservado                                                                                                                                                                                                                                      |
| worktree        | Limpo; artefatos de release permanecem ignorados                                                                                                                                                                                                                                                  |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push                                                                                                                                                                                                                                   |
| ci_run          | [CI #148](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34685632858) no `main@f9cc660a` terminou `failure` com `15/16` jobs verdes; E2E SPA, `Run canonical clinical API E2E`, integração, guards, segurança, build e visual passaram.                                            |
| ci_failure      | O #148 falhou somente em Performance/k6: `Run k6 benchmark` terminou com exit code `99` e `Check SLO results` com exit code `1`. O #147 permanece como a confirmação verde `16/16` do código/workflow `a3354f02`; nenhum threshold foi relaxado e os gates externos de release continuam abertos. |
| overall_score   | `55` no gate estrito local completo executado no pai `82ff6eec`, com checks, build e suíte de testes                                                                                                                                                                                              |
| critical_score  | `57` no gate estrito local                                                                                                                                                                                                                                                                        |
| open_p0         | `15` no gate estrito local                                                                                                                                                                                                                                                                        |
| local_gate      | `TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a`: `BLOCKED`, `claim=NOT PROVEN`, `publication_allowed=false`                                                                                                                                                                                          |
| implemented     | Fixtures k6 determinísticas e tenant-safe; evidência com companions obrigatórios e override explícito fail-closed; readiness, supply chain, workflow/worker, RLS estático e documentação do prompt                                                                                                |
| verified_local  | Testes focados `38/38`; testes Node de evidência/diagnóstico `8/8`; typecheck, lint, Prettier e diff: PASS; seed idempotente `2/2`; k6 local descartável `9/9` SLOs; suíte crítica `615` testes de banco + `11` suítes de processo: PASS                                                          |
| verified_remote | CI #147 confirmou o código/workflow `a3354f02` com `16/16` jobs verdes, incluindo a API clínica canônica isolada; o CI #148 documental falhou no SLO remoto de k6. Target, recovery, UAT, attestation, governança e autoridade de release permanecem `NOT PROVEN`.                                |
| verified_target | `NOT PROVEN`                                                                                                                                                                                                                                                                                      |
| blocked         | Falha de Performance/k6 no CI #148; gate estrito local `55/57/15`; restore/DR real por Docker indisponível; target, attestation, deploy/rollback, UAT, branch governance e autoridade humana permanecem abertos.                                                                                  |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95 ou zero P0                                                                                                                                                                                                                            |

## Decisão

O candidato foi publicado em `main` por fast-forward, sem force-push, e mantém
rollback remoto. O CI #147 confirmou o código/workflow com `16/16` checks verdes,
incluindo a prova clínica canônica isolada; o CI #148 do descendente documental
falhou no SLO remoto de k6. A `main` atual permanece bloqueada para Green Main
até que o benchmark passe em uma execução terminal, sem relaxar thresholds. O
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
