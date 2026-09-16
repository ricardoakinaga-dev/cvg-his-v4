# Baseline corrente — State of Art

Observado em `2026-09-16T09:46:22Z`, no snapshot documental
`6618df12ac2fc672ccae2d50b391af8c287042f7`, cujo código funcional é
`01e5a168204ccb0f157ac96e7183391e1a1fc609`. A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `6618df12ac2fc672ccae2d50b391af8c287042f7` (snapshot documental; código funcional em `01e5a168`) |
| main_sha        | `snapshot@6618df12`; `origin/main@6217654a`; a branch de assurance é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após o commit documental de reancoragem; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | `NOT_FOUND` para o snapshot `6618df12`; o último run remoto verificável é o [CI #178](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35056933106) em outro SHA, terminado em `failure`. |
| ci_failure      | Coverage crítico/geral, Unit Tests, Performance/k6, Visual Regression e E2E SPA falharam; nenhum threshold foi relaxado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: 19 métricas críticas abaixo dos limiares; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 35; evidência e estado reconciliados append-only; nenhum threshold foi alterado |
| verified_local  | API build/server `68/68`; unit `241/241` arquivos e `2732/2732` testes; integração `105/105` e `933/933`; native-worker/API/process, Vue especializado (25 rotas) e SQL (171 migrações) PASS current; gate agregado permanece bloqueado por 19 métricas |
| verified_remote | `NOT_PROVEN`: o CI #178 terminou com falhas em coverage crítico/geral, unidade, k6, visual e SPA E2E; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | 19 métricas do R05-010 abaixo do limiar; CI remoto terminal do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato funcional `2949fedf` foi reconciliado no candidato documental
`b0e536e2`; `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A recoleta current passou os produtores locais unit, integração,
native-worker, native-api, critical-process, Vue especializado e SQL, mas o
R05-010 ainda falha em 19 métricas críticas. O CI #178 de outro SHA terminou
com falhas e não é transferido. A `main` permanece bloqueada para Green Main
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
