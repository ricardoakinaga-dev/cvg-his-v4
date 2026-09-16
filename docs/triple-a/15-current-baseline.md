# Baseline corrente — State of Art

Observado em `2026-09-16T19:03:48Z`, no snapshot corrente
`c36320d87d70019f7d0e922e023c8379e679a8c0`, que contém o alinhamento do runner
crítico à versão canônica PostgreSQL 16, checkout histórico e reancoragem do
manifesto crítico. A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `c36320d87d70019f7d0e922e023c8379e679a8c0` (candidato corrente; documentação posterior pode ser somente documental) |
| main_sha        | `main@c36320d8`; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após os commits de runner e manifesto; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O [CI #189](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35132608526) foi executado no candidato anterior e falhou no runner PostgreSQL 14/checkout raso; não é promovido como prova verde. |
| ci_failure      | O novo run do candidato corrente precisa terminar antes de qualquer claim remoto. Nenhum threshold foi relaxado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 50, ancorado em `e4d3a2b3`, com source set e thresholds inalterados; workflow agora provisiona PostgreSQL 16 e Chromium para as evidências; nenhum threshold foi alterado |
| verified_local  | unit `260/260` arquivos e `2824/2824` testes, integração afetada `48/48`, migrações/seed privados PostgreSQL 16 repetíveis; recoleta crítica após a revisão 50 ainda é necessária; target externo permanece ausente |
| verified_remote | `NOT_PROVEN`: o CI #189 do candidato anterior não é transferido; o novo run do candidato corrente ainda não é terminal; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Recoleta crítica vinculada à revisão 50, CI remoto terminal do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato `c36320d87d70019f7d0e922e023c8379e679a8c0` foi reconciliado no snapshot corrente;
o manifesto crítico foi reancorado na revisão 50, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou unit, integração afetada, cadeia de
migrações e o provisionamento nativo PostgreSQL 16; a recoleta crítica/Vue ainda
precisa ser executada no candidato publicado e o R05-010 continua `FAIL/BLOCKED`.
O CI #189 de outro SHA
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
