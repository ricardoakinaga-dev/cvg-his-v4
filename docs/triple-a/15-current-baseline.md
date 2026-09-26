# Baseline corrente — State of Art

## Remediação local do candidato — 2026-09-21

| Campo | Estado atual |
| --- | --- |
| current_sha | `9f165ae7fedcd040e3b107ad2d8b408bf9b9f0aa` — rebind de 26/09/2026 para o candidato da rodada 2; nenhuma evidência de execução foi refeita neste SHA (status BLOCKED / NOT PROVEN). As evidências registradas pertencem a `d9a16cf45898` — mapeamento em `evidence/sha-remap-20260926.json` |
| CI do código | `NOT_PROVEN` para este SHA; CI remoto não executado |
| local_gate | PASS: supply-chain 17/17, dependências, segredos, backup/restore, Helm 3.15.4, qualidade, banco crítico 623/623, processos 11/11, SPA E2E 424/424 e imagens production-shaped |
| open_p0 | 11; externos/target preservados |

Os gates locais foram reexecutados no runtime `d9a16cf4`: lint, typecheck e build;
suíte monorepo; supply-chain, dependências, segredos e segurança; Helm 3.15.4;
RLS/runtime/tracing; backup/restore documental; banco PostgreSQL efêmero com
migrações 0000–0177; 11 processos críticos; E2E SPA `424/424` sem falhas ou
skips; e o gate de imagens com runtime não-root/read-only, Vault fixture, roles,
readiness e proxy Helm. A correção também impõe teto de 1.000 contas por processo do worker, com consulta de banco limitada a 1.001 linhas e falha fechada para sharding explícito. Isso não substitui CI remoto,
OCI/attestation, target, restore aprovado, soak, UAT ou autoridade.

O registro mantém **11 P0 abertos** porque CI, target, recuperação, UAT e
autoridade não foram provados. A certificação Triplo AAA permanece **BLOCKED /
NOT PROVEN**.

Detalhes, hashes e limites: [evidência local](evidence/local-candidate-51982f48.json), [remediação dos P0](30-p0-remediation-20260918.md) e [avaliação por critério](evidence/p0-remediation-20260918.json). **Certificação Triplo AAA: BLOCKED / NOT PROVEN.**

---

## Fotografia histórica — consolidação anterior de 2026-09-18

| Campo | Evidência atual |
| --- | --- |
| current_sha | `51391915eb165a9b99e33682d0ab557f6263cb2a` |
| main_sha | Descendente de `origin/main@47ba9c54`, somente main; sem reescrever histórico |
| ci_run | CI final pendente; predecessor35352873670 aprovou16/17 e falhou em performance |
| local_gate | Contratos6/6, equivalência63/63, k6 local9/9/query20ms; CI final pendente |
| open_p0 | 12 abertos, 2 fechados no registro; certificação requer zero |

A consolidação Git está concluída: somente main permanece localmente e no
GitHub, com histórico anterior em bundle verificado. O runtime da aplicação
permanece na fonte `d8d8b821`; a mudança atual corrige a execução do benchmark.

O [CI 35352873670](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35352873670)
do predecessor `47ba9c54` terminou com **16/17 jobs aprovados**, incluindo
cobertura crítica, global **2.932 testes/82,03% de branches**, **619 testes de
integração**, E2E, visual, API, Windows, build, tipos, lint e segurança.
Performance falhou: query p95 **184,8ms**, API p95 **207,65ms**, contra150/200ms.
A correção do encerramento de fixtures PostgreSQL foi confirmada no CI.

O candidato usa `response.json()` nativo do k6 para interpretar o corpo completo
do OpenAPI, mantendo o mesmo predicado, pedidos, dados, estágios e limites.
O teste nativo de equivalência passou **63/63 verificações**; os contratos
passaram **6/6**. A crítica independente aprovou a preservação do instrumento e
verificou propagação de falhas, encerramento e fingerprints sem alterações.

A reprodução anterior de quatro CPUs usava `GOMAXPROCS=4`; o CI usa1. Na nova
comparação controlada, ambos os casos usam quatro CPUs, `GOMAXPROCS=1`, seed
novo e profiler de180s: query p95 **102→20ms**, API **102,79→17,77ms**,
**3.421→4.516 iterações**, CPU do gerador **116,86→66,06s**. Ambos passaram9/9
localmente; esses resultados explicam o custo removido, sem provar o CI remoto.
A configuração do gerador agora consta na proveniência antes/depois. O CI final
exato e sem profiler permanece pendente na publicação deste registro.

[Relatório atual, decisões por branch e limitações](./29-main-unification-20260918.md).
Manifesto crítico revision85, ancorado no candidato acima, com os quatro novos
inputs de execução registrados. Os555 caminhos de fonte e thresholds não
mudaram. Target, UAT, recuperação, attestations e autoridade de release
continuam sem prova suficiente; não há certificação AAA.

## Registro histórico anterior

As seções abaixo preservam observações de candidatos anteriores. Referências a
“corrente”, “mais recente” ou “PASS” nessas seções valem para suas datas e SHAs;
o relatório acima é a fotografia atual.

Observado em `2026-09-18T05:30:00Z`, sobre o candidato funcional
`0a2eba022fac4b1100138e1ad17cab87f8d049c8`. A identidade corrente preserva a
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
| current_sha     | `0a2eba022fac4b1100138e1ad17cab87f8d049c8` (snapshot integrado; auth com lookup autoritativo combinado, health probe coalescido, teste de reexport ESM corrigido, manifesto revision 81, registro P0 e thresholds inalterados) |
| main_sha        | candidato funcional `0a2eba022fac4b1100138e1ad17cab87f8d049c8` preparado para fast-forward de `origin/main`; pai publicado `e011cfd2e47a8a8290b26b5c6328750d71586c95`; sem force-push |
| worktree        | Limpo após o commit funcional; artefatos gerados locais permanecem fora do commit |
| rollback        | `origin/main@94b1ae08b7dda6c0e9d670ba4ffb749fcfea3fbb` (pai publicado); sem force-push |
| ci_run          | [CI #282](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907606) é o terminal mais recente e terminou `failure`; o CI do candidato integrado será disparado após o push |
| ci_failure      | Falha terminal no checker de cobertura crítica e no benchmark/validação k6; métricas remotas não foram inferidas sem acesso autenticado ao artefato |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | Registro P0: `12` itens abertos e `2` fechados; o quality bar de release continua exigindo zero P0 para certificação |
| local_gate      | R05-010 e SQL local `PASS`; release/Triple-A permanece `BLOCKED / NOT PROVEN` porque CI terminal, target, recovery, UAT, attestation e autoridade ainda não foram provados |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito; manifesto crítico revision 81; workflow PostgreSQL/evidence graph/P0 preservados; feature flags tenant-scoped fail-closed; telemetria HTTP sanitizada; WebAuthn agora usa SimpleWebAuthn para verificar attestation/assertion, persiste credential ID e chave COSE reais, aplica challenge/origem/RP ID/user handle, contador CAS e isolamento de conta/usuário; configuração `WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGINS` é server-owned; o loader OpenAPI aceita source, build e URLs `file:` sob Vitest; sessões DB fazem lookup combinado de sessão/usuário e probes Redis compartilham trabalho por janela curta; nenhum threshold foi alterado |
| verified_local  | Build PASS; DB `36/36`, auth `72/72`, API `620/620`, reexport `17/17`, SQL evidence `6/6`; `pnpm validate:candidate-identity`, `pnpm validate:p0-registry`, `pnpm docs:validate` e `pnpm validate:prompt-traceability` revalidados após a reancoragem. A evidência local não substitui CI exato, target externo, recovery, UAT, attestation de fabricante ou autoridade |
| verified_remote | O [CI #282](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907606) terminou `failure`; o novo candidato ainda não tem CI terminal e não há `main green` promovido. Target, recovery, UAT, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | CI terminal do candidato, RLS no target, restore/DR, performance/soak, UAT, attestation, governança e autoridade humana continuam abertos; os thresholds permanecem sem alteração |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Reconciliação atual

A branch `origin/codex/state-of-art-hardening-20260917` e a branch de correções
anteriores já eram ancestrais de `main`. Da branch divergente
`origin/codex/state-of-art-hardening-final-ci-20260917`, somente as atualizações
não conflitantes e verificadas foram integradas: lookup autoritativo combinado,
coalescência do health probe, compatibilidade do teste de reexport ESM e o gate
de revogação correspondente. A migração alternativa de versionamento de ACL, o
teste SQL duplicado e os commits de CI/documentação reancorados foram rejeitados:
eles conflitam com as migrações canônicas `0175/0176` já presentes ou carregam
identidade/evidência obsoletas. O detalhamento está em
[`28-branch-reconciliation-20260918.md`](./28-branch-reconciliation-20260918.md).

O fechamento local de `P0-DATA-POSTGRESQL-RUNTIME` está registrado em
[`24-local-automated-closure-2026-09-18.md`](./24-local-automated-closure-2026-09-18.md).
O CI exato terminou com falha nos gates de cobertura crítica e performance; o
estado global continua **BLOCKED / NOT PROVEN** até esses gates e os gates de
target/humanos serem executados por seus responsáveis.

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
