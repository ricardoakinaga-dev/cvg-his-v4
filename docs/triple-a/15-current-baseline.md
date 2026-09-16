# Baseline corrente — State of Art

Observado em `2026-09-16T20:00:00Z`, no snapshot corrente
`b3b9d38d3b3d0267c1dedcc2e7f9a963a98f3334`, que contém o alinhamento do runner
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
| current_sha     | `b3b9d38d3b3d0267c1dedcc2e7f9a963a98f3334` (candidato funcional; a identidade/documentação posterior é somente documental) |
| main_sha        | `main@b3b9d38d`; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após os commits de coverage, manifesto e identidade; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O [CI #190](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35138781369) terminou `failure` no pai documental `ef8e7a79`; o candidato corrigido ainda aguarda novo run terminal. |
| ci_failure      | #190 encontrou o par de inicializadores V8 do Node 22 rejeitado e o produtor SQL ausente; ambos foram corrigidos em `0812cb49`. Coverage geral, performance, visual e E2E desse run também não são transferidos. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 51, ancorado em `0812cb49`, com source set e thresholds inalterados; workflow provisiona PostgreSQL 16, aceita somente o par V8 autenticado e publica a evidência SQL antes do checker; nenhum threshold foi alterado |
| verified_local  | lint passou; contratos CI `20/20`; cobertura/processo e evidência SQL `34/34`; produtor SQL PostgreSQL 16.15 passou com `171` migrações e `7` históricos; target externo permanece ausente |
| verified_remote | `NOT_PROVEN`: o CI #190 do candidato pai não é transferido; o novo run do candidato corrigido ainda não é terminal; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Recoleta crítica vinculada à revisão 51, CI remoto terminal do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato `b3b9d38d3b3d0267c1dedcc2e7f9a963a98f3334` foi reconciliado no snapshot corrente;
o manifesto crítico foi reancorado na revisão 51, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou os contratos alterados, o produtor SQL
com PostgreSQL 16 e a conversão do artifact real com os inicializadores V8; a
recoleta crítica/Vue ainda precisa ser executada no candidato publicado e o
R05-010 continua `FAIL/BLOCKED`. O CI #190 de outro SHA terminou com falhas e
não é transferido. A `main` permanece bloqueada para Green Main
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
