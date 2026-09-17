# Baseline corrente — State of Art

Observado em `2026-09-17T05:57:08Z`, sobre o candidato documental
`85c105467139bee415896c97232e1a56ad7772b7`, que contém a identidade corrente
e a correção funcional de fail-closed e complexidade no commit
`95227098193966638102ccfe1e54842289ebe7f1`, sobre a otimização do
roteamento autenticado antes da guarda final, além do alinhamento do runner
crítico à versão canônica PostgreSQL 16, a aceitação restrita dos inicializadores
V8 do Node 22, a produção de evidência SQL e a reancoragem do manifesto crítico.
A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O registro P0 candidate-bound está em [`P0_REGISTRY.json`](./P0_REGISTRY.json) e
é validado por `pnpm validate:p0-registry` no gate de release e no CI.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `85c105467139bee415896c97232e1a56ad7772b7` (snapshot; registro P0 e manifesto revision 58; correção funcional em `95227098` sobre `15ba86a8`; harness SPA canônico com proxy same-origin) |
| main_sha        | `main` contém o snapshot candidato e sua documentação corrente; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo antes da documentação corrente; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O CI #203 pertence ao ancestral `261e5b45` e falhou; o próximo run será a primeira execução exata do snapshot `85c10546` com o harness SPA corrigido e o registro P0 integrado. |
| ci_failure      | O #203 encontrou divergência entre `vite preview` sem proxy `/api` e o harness canônico, além do SLO remoto de performance; nenhuma dessas evidências é transferida. Nenhum baseline ou threshold foi alterado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | Registro P0: `13` itens abertos e `1` fechado; o quality bar de release continua exigindo zero P0 para certificação |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 58, ancorado em `85c10546`, com thresholds inalterados e inventário Vitest reconciliado; workflow provisiona PostgreSQL 16, aceita somente o par V8 autenticado, publica evidência SQL antes do checker, valida o registro P0 e executa os gates SPA com API compilada e proxy same-origin; o JWT inicial só resolve contexto de roteamento e a guarda final mantém revalidação autoritativa, com erros genéricos sanitizados para 503; `server.ts` permanece no orçamento físico de `8.335` linhas; nenhum threshold foi alterado |
| verified_local  | cobertura global `273/273` arquivos e `2907/2907` testes passou o threshold; lint, typecheck e API build passaram; API `618/618`; integração PostgreSQL `16/16`; contratos CI `20/20`; cobertura/processo e evidência SQL `34/34`; produtor SQL PostgreSQL 16.15 passou com `171` migrações e `7` históricos; k6 local `9/9` SLOs com CPU limitada e visual `29/29`; target externo permanece ausente |
| verified_remote | O CI #203 foi executado no ancestral `261e5b45` e não representa `85c10546`; o próximo candidato precisa de execução exata. Target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | CI exato, target, restore/DR, UAT e autoridade humana continuam abertos; os thresholds gerais e snapshots permanecem sem promoção |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O snapshot `85c105467139bee415896c97232e1a56ad7772b7` foi reconciliado;
o candidato funcional `95227098193966638102ccfe1e54842289ebe7f1` preserva a
otimização autenticada e o fail-closed 503;
o manifesto crítico foi reancorado na revisão 58, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou os contratos alterados, o produtor SQL
com PostgreSQL 16 e a conversão do artifact real com os inicializadores V8; a
otimização autenticada passou API `618/618`, integração PostgreSQL `16/16`, complexity
`8.335` linhas, k6 `9/9` SLOs e visual `29/29` no ambiente local. O CI #203
falhou no guard de complexidade e não é transferido; o novo CI exato aguarda
execução após o push. A `main` permanece bloqueada para Green Main
sem relaxar thresholds; target, recovery, attestation, UAT, governança e
autoridade continuam bloqueados. Não há declaração de release ou
`TRIPLE-A VERIFIED`.

O registro [`P0_REGISTRY.json`](./P0_REGISTRY.json) é a fonte canônica para
deduplicação, dependências, classificação de automação e fechamento dos P0;
qualquer item `DONE`, evidência sem vínculo ao candidato ou ciclo de dependência
faz a validação falhar.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
