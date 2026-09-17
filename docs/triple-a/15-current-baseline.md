# Baseline corrente — State of Art

Observado em `2026-09-17T02:14:20Z`, sobre o candidato funcional
`15ba86a883a4283c5bf86c5825bf7d9a6ca5d089`, que contém a otimização do
roteamento autenticado antes da guarda final, além do alinhamento do runner
crítico à versão canônica PostgreSQL 16, a aceitação restrita dos inicializadores
V8 do Node 22, a produção de evidência SQL e a reancoragem do manifesto crítico.
A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `15ba86a883a4283c5bf86c5825bf7d9a6ca5d089` (candidato funcional; documentação de reconciliação posterior é somente documental) |
| main_sha        | `main@f79f7189` antes deste candidato; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo antes da documentação corrente; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | Aguardando execução exata do candidato `15ba86a8`; o [CI #197](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35167554015), no descendente documental anterior, terminou `failure`. |
| ci_failure      | No #197, E2E SPA, Performance/k6 e Visual Regression falharam; essa evidência não é transferida para o novo SHA. Nenhum baseline ou threshold foi alterado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 53, ancorado em `15ba86a8`, com thresholds inalterados e inventário Vitest reconciliado; workflow provisiona PostgreSQL 16, aceita somente o par V8 autenticado e publica a evidência SQL antes do checker; o JWT inicial só resolve contexto de roteamento e a guarda final mantém revalidação autoritativa; nenhum threshold foi alterado |
| verified_local  | cobertura global `273/273` arquivos e `2907/2907` testes passou o threshold; lint, typecheck e API build passaram; Auth `54/54`; contratos CI `20/20`; cobertura/processo e evidência SQL `34/34`; produtor SQL PostgreSQL 16.15 passou com `171` migrações e `7` históricos; k6 local `9/9` SLOs com CPU limitada e visual `29/29`; target externo permanece ausente |
| verified_remote | O CI exato do novo candidato ainda não existe; o #197 anterior não é transferido. Target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | CI exato, target, restore/DR, UAT e autoridade humana continuam abertos; os thresholds gerais e snapshots permanecem sem promoção |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato funcional `15ba86a883a4283c5bf86c5825bf7d9a6ca5d089` foi reconciliado;
o manifesto crítico foi reancorado na revisão 53, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou os contratos alterados, o produtor SQL
com PostgreSQL 16 e a conversão do artifact real com os inicializadores V8; a
otimização autenticada passou Auth `54/54`, k6 `9/9` SLOs e visual `29/29` no
ambiente local. O CI exato ainda aguarda execução. A `main` permanece bloqueada para Green Main
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
