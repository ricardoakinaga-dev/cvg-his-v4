# Baseline corrente — State of Art

Observado em `2026-09-18T02:45:16Z`, sobre o candidato funcional
`cef206bf4600c3fdb1dbf428ef37e407abaf4996`. A identidade corrente preserva a
separação entre código/assurance e documentação; a implementação deste
snapshot fecha localmente a verificação criptográfica WebAuthn, sem promover
evidência externa.
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
| current_sha     | `cef206bf4600c3fdb1dbf428ef37e407abaf4996` (snapshot; verificação FIDO2 criptográfica, RP/origens autoritativos, registro P0 e thresholds inalterados) |
| main_sha        | `origin/main@cef206bf4600c3fdb1dbf428ef37e407abaf4996`; sem force-push |
| worktree        | Limpo após o commit funcional; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/main@0d830f2966b7873cb9dad5fb9006d757c4577221` (pai publicado); sem force-push |
| ci_run          | [CI #35300563062](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35300563062) está `in_progress` no SHA exato; [State of Art Closure #35300563044](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35300563044) terminou `success` |
| ci_failure      | Nenhuma falha terminal do SHA atual foi observada; o CI exato ainda não terminou e falhas de predecessores não são transferidas |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | Registro P0: `12` itens abertos e `2` fechados; o quality bar de release continua exigindo zero P0 para certificação |
| local_gate      | R05-010 e SQL local `PASS`; release/Triple-A permanece `BLOCKED / NOT PROVEN` porque CI terminal, target, recovery, UAT, attestation e autoridade ainda não foram provados |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito; manifesto crítico revision 79; workflow PostgreSQL/evidence graph/P0 preservados; feature flags tenant-scoped fail-closed; telemetria HTTP sanitizada; WebAuthn agora usa SimpleWebAuthn para verificar attestation/assertion, persiste credential ID e chave COSE reais, aplica challenge/origem/RP ID/user handle, contador CAS e isolamento de conta/usuário; configuração `WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGINS` é server-owned; nenhum threshold foi alterado |
| verified_local  | `pnpm validate:migration-source` PASS; SQL producer PASS (`175` migrações ativas + `7` históricas); integração efêmera PASS (`105/105` arquivos, `933/933` testes); WebAuthn FIDO2 `14/14`, config `47/47`, MFA `66/66`, rotas nativas `47/47`, typecheck MFA/API e OpenAPI/runtime/dependency guards PASS. A evidência local não substitui CI exato, target externo, recovery, UAT, attestation de fabricante ou autoridade |
| verified_remote | O [CI #35300563062](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35300563062) está `in_progress`; não há `main green` terminal promovido. Target, recovery, UAT, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | CI terminal do candidato, RLS no target, restore/DR, performance/soak, UAT, attestation, governança e autoridade humana continuam abertos; os thresholds permanecem sem alteração |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Reconciliação atual

O fechamento local de `P0-DATA-POSTGRESQL-RUNTIME` está registrado em
[`24-local-automated-closure-2026-09-18.md`](./24-local-automated-closure-2026-09-18.md).
O estado global continua **BLOCKED / NOT PROVEN** até o CI exato terminar e
os gates de target/humanos serem executados por seus responsáveis.

## Decisões históricas preservadas

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
