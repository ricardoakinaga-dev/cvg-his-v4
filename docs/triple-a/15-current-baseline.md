# Baseline corrente — State of Art

Observado em `2026-09-16T20:35:31Z`, sobre o candidato funcional
`79adc0c6c825512a9200b5c94a373512f18be4fc`, que contém o alinhamento do runner
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
| current_sha     | `79adc0c6c825512a9200b5c94a373512f18be4fc` (candidato funcional; documentação de reconciliação posterior é somente documental) |
| main_sha        | `main@79adc0c6`; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após os commits de coverage, manifesto e identidade; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O CI do candidato `79adc0c6` ainda aguarda execução terminal; os #191/#192 são evidência de ancestrais e não são transferidos após a correção do teste ML. |
| ci_failure      | Nos ancestrais, Coverage falhou por conexão do contrato ML em `:5433`; k6 perdeu 3/9 SLOs; E2E/Visual falharam em 29 snapshots divergentes. Nenhum baseline ou threshold foi alterado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 51, ancorado em `0812cb49`, com source set e thresholds inalterados; workflow provisiona PostgreSQL 16, aceita somente o par V8 autenticado e publica a evidência SQL antes do checker; nenhum threshold foi alterado |
| verified_local  | lint passou; contratos CI `20/20`; cobertura/processo e evidência SQL `34/34`; produtor SQL PostgreSQL 16.15 passou com `171` migrações e `7` históricos; target externo permanece ausente |
| verified_remote | `NOT_PROVEN` para o candidato `79adc0c6` até novo CI; #191/#192 provaram o gate crítico apenas nos ancestrais. Target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Novo CI do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos; os thresholds gerais e snapshots permanecem sem promoção |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato funcional `79adc0c6c825512a9200b5c94a373512f18be4fc` foi reconciliado;
o manifesto crítico foi reancorado na revisão 51, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou os contratos alterados, o produtor SQL
com PostgreSQL 16 e a conversão do artifact real com os inicializadores V8; a
recoleta crítica/Vue passou no Critical Coverage Gate dos ancestrais #191/#192, mas
o novo candidato ainda precisa de CI próprio. A `main` permanece bloqueada para Green Main
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
