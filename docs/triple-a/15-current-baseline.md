# Baseline corrente — State of Art

Observado em `2026-09-17T22:37:07Z`, sobre o candidato documental
`0fab9fc189e122b4ff7e7700d9b07508e64f54bd`, que contém a identidade corrente
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
| current_sha     | `0fab9fc189e122b4ff7e7700d9b07508e64f54bd` (snapshot; registro P0 e manifesto revision 76; migration `0176` forward-only corrige a cascata da ledger de frescor e força RLS; importador do evidence graph mantém validação candidate-bound e evidência local sem promoção automática a PASS) |
| main_sha        | `main` remota em `origin/main@8bbcba3a6687` antes deste candidato; publicação deste candidato será sem force-push; `origin/fix/state-of-art-ci-assurance@fe5406c2` e `origin/codex/state-of-art-hardening-20260917@a902fc24` permanecem ancestrais já integradas |
| worktree        | Limpo antes da documentação corrente; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/main@8bbcba3a6687` (pai publicado); sem force-push |
| ci_run          | O candidato funcional `0fab9fc1` aguarda execução remota exata; o [CI #251](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35281221617) pertence ao predecessor `8bbcba3a` e não é transferido. |
| ci_failure      | O predecessor #251 terminou `failure` em Critical Coverage, Coverage, Repository Guards, Performance, Integration e Unit; nenhum resultado ou threshold histórico é transferido para este candidato. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | Registro P0: `13` itens abertos e `1` fechado; o quality bar de release continua exigindo zero P0 para certificação |
| local_gate      | `BLOCKED / NOT PROVEN`: o caminho local de ACL, migração, RLS, build e integração completa está verde, mas a execução crítica remota deste candidato e os gates target/humanos ainda não existem; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 76, ancorado no commit funcional, com thresholds inalterados e inventário Vitest/SQL reconciliado; workflow provisiona PostgreSQL 16, publica evidência SQL antes do checker, valida o registro P0 e executa os gates SPA com API compilada e proxy same-origin; o provider raw de feature flags mantém estado persistido, expiração, precedência, allowlist fail-closed, tenant explícito, cache bounded/invalidação, upsert atômico, autoridade request-scoped e ownership composto; o caminho de frescor de ACL lê uma versão monotônica indexada, incrementada na mesma transação de cada mutação de ACL, com `0176` protegendo cascatas de exclusão e `FORCE RLS`; o JWT inicial só resolve contexto de roteamento e a guarda final mantém revalidação autoritativa, com erros genéricos sanitizados para 503; `server.ts` permanece no orçamento físico de `8.335` linhas; nenhum threshold foi alterado |
| verified_local  | Typecheck e build do workspace passaram em `68/68` projetos; a suíte completa passou `394/394` arquivos e `3932/3932` testes com as `176` migrações aplicadas em PostgreSQL efêmero; access-control passou `48/48` e migration-source, RLS `171/172`, namespaces, OpenAPI, docs, identidade, P0 e complexity passaram. A evidência local não substitui CI exato, target externo, recovery, UAT, attestation ou autoridade |
| verified_remote | O CI #251 do predecessor `8bbcba3a` terminou `failure` em Critical Coverage, Coverage, Repository Guards, Performance, Integration e Unit; os demais jobs passaram. Nenhum resultado é transferido ao candidato `0fab9fc1`, e não há `main green`. Target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
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
