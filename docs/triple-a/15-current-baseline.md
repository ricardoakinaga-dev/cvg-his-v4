# Baseline corrente — State of Art

Observado em `2026-09-16T16:05:22Z`, no snapshot documental
`53bbee8057f194b75c0a6a0ed4ad125849eb9c5e`, cujo código funcional é
`578d7271f26f4e41f0d60475c92b9f5da5f0aaf1`. A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `53bbee8057f194b75c0a6a0ed4ad125849eb9c5e` (snapshot documental; código funcional em `578d7271`) |
| main_sha        | `main@53bbee80`; `origin/main@3fca62b7` no momento da coleta; a branch de assurance é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após o commit documental de reancoragem; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | `NOT_FOUND` para o snapshot `53bbee80`; o último run remoto verificável é o [CI #178](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35056933106) em outro SHA, terminado em `failure`. |
| ci_failure      | O CI histórico falhou em coverage crítico/geral, Unit Tests, Performance/k6, Visual Regression e E2E SPA; nenhum threshold foi relaxado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e 25 aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 48 com digest `9b1b0f90359bc494f967ee95ce19e8bc4f7c23122b96fd6a4d9d35c6ed91e87c`; evidência e estado reconciliados append-only; nenhum threshold foi alterado |
| verified_local  | unit `260/260` arquivos e `2824/2824` testes; integração `105/105` e `933/933`; native-worker/API/process e SQL `171` migrações PASS current; Vue especializado `NOT PROVEN`; gate agregado permanece bloqueado |
| verified_remote | `NOT_PROVEN`: não há CI terminal do snapshot atual; o CI #178 de outro SHA terminou com falhas em coverage crítico/geral, unidade, k6, visual e SPA E2E; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Cobertura crítica abaixo da régua, 25 aplicabilidades Vue sem prova, CI remoto terminal do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O código funcional `578d7271f26f4e41f0d60475c92b9f5da5f0aaf1` foi reconciliado no snapshot documental
`53bbee8057f194b75c0a6a0ed4ad125849eb9c5e`; `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A recoleta current passou os produtores locais unit, integração,
native-worker, native-api, critical-process e SQL; a evidência Vue especializada
permanece bloqueada e o R05-010 continua `FAIL/BLOCKED`. O CI #178 de outro SHA
terminou com falhas e não é transferido. A `main` permanece bloqueada para Green Main
sem relaxar thresholds; target, recovery, attestation, UAT, governança e
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
