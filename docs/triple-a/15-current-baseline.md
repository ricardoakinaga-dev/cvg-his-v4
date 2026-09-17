# Baseline corrente — State of Art

Observado em `2026-09-17T13:28:36Z`, sobre o candidato documental
`2a02970cc15bdadaa056dc81a65e58f06f866a2f`, que contém a identidade corrente
e a correção funcional de fail-closed, autoridade request-scoped e ownership composto no commit
`03e6fac0a2f726698b40adb351298610f9c1f88d`, sobre a otimização do
roteamento autenticado antes da guarda final e o ciclo de vida de feature flags,
além do alinhamento do runner
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
| current_sha     | `2a02970cc15bdadaa056dc81a65e58f06f866a2f` (snapshot; registro P0 e manifesto revision 72; Noto Sans e rasterização sem LCD determinísticos nos gates E2E/visual; verificação portátil do runner; endurecimento funcional do provider de feature flags, autoridade request-scoped, ownership composto, classificador documental, ciclo de vida, evidência SQL e cobertura de rotas; harness SPA canônico com proxy same-origin; `server.ts` em `8.335` linhas; cobertura global em `82,00%` branches) |
| main_sha        | `main` remota publicada em `origin/main@2a02970cc15b` via Git Data API sem force-push; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits funcionais exclusivos; rollback preservado |
| worktree        | Limpo antes da documentação corrente; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O [CI #238](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35248052991) falhou na cobertura global porque um teste Node nativo foi incluído indevidamente no sweep do Vitest; o resultado não é promovido. |
| ci_failure      | O último run terminal relevante do candidato anterior, [CI #217](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35215228039), passou os gates críticos/funcionais, E2E SPA (`424/424`) e Visual (`29/29`), mas reprovou query e inventory no k6. Nenhum threshold foi alterado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | Registro P0: `13` itens abertos e `1` fechado; o quality bar de release continua exigindo zero P0 para certificação |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 71, ancorado no candidato funcional, com thresholds inalterados e inventário Vitest/SQL reconciliado; workflow provisiona PostgreSQL 16, aceita somente o par V8 autenticado, instala/verifica Noto Sans com comando portátil, publica evidência SQL antes do checker, valida o registro P0 e executa os gates SPA com API compilada e proxy same-origin; o Playwright desativa LCD text para reduzir drift de antialiasing entre runners e os seis baselines promovidos são os `actual.png` do #212 após inspeção; o classificador de identidade trata o manifesto de cobertura como governança documental; o provider raw de feature flags aplica estado persistido, expiração, precedência, allowlist fail-closed, tenant explícito, cache bounded/invalidação, upsert atômico, autoridade request-scoped e ownership composto; o bootstrap bloqueia WebAuthn production-like sem verificador FIDO2 completo, os identificadores direcionados exigem UUID e o estado distribuído é process-wide; a suíte oficial Node do módulo permanece ativa e o teste nativo fica fora da varredura global do Vitest; o JWT inicial só resolve contexto de roteamento e a guarda final mantém revalidação autoritativa, com erros genéricos sanitizados para 503; `server.ts` permanece no orçamento físico de `8.335` linhas; nenhum threshold foi alterado |
| verified_local  | Typecheck e lint do workspace passaram em `68/68` projetos; module-feature-flags passou `10` testes, os testes focados da API passaram `19/19` e a cobertura global passou `274/274` arquivos/testes com branches `82,00%`; a migration foi validada em PostgreSQL 16 com rollback; identidade, P0, manifesto revision 71 e complexity de `8.335` linhas foram validados. A cobertura API `618/618`, integração PostgreSQL `16/16`, evidência SQL `34/34`, k6 local `9/9` e visual `29/29` permanecem evidências anteriores/locais; target externo permanece ausente |
| verified_remote | O CI #214 é a execução terminal do candidato publicado: Critical Coverage, E2E SPA e Visual passaram; Performance falhou em query/inventory. Não há `main green`. Target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | CI exato do candidato, target, restore/DR, UAT e autoridade humana continuam abertos; os thresholds gerais e snapshots permanecem sem promoção |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O snapshot `e4acaf40e399dd29f7c6ec51232dd0ecc92301b7` foi reconciliado;
o candidato funcional `e4acaf40e399dd29f7c6ec51232dd0ecc92301b7` preserva a
otimização autenticada e o fail-closed 503;
o manifesto crítico foi reancorado na revisão 71, com a correção de tipografia e rasterização CI/visual, a verificação portátil do runner, o código funcional de feature flags e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A validação local passou os contratos alterados, o produtor SQL
com PostgreSQL 16 e a conversão do artifact real com os inicializadores V8; a
otimização autenticada passou API `618/618`, integração PostgreSQL `16/16`, complexity
`8.335` linhas, k6 `9/9` SLOs e visual `29/29` no ambiente local. O CI #205
foi executado no `main` remoto e terminou `failure`: a matriz visual divergiu
em `29/29` e dois SLOs de cauda do k6 excederam os limites. A `main` permanece bloqueada para Green Main
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
