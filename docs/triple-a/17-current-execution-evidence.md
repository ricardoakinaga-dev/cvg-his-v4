# Evidência de execução corrente — State of Art

## Candidato integrado e reconciliação de branches — 2026-09-18T05:30:00Z

O candidato funcional corrente é
`686c47d09adc6b57d624f3ca822ca649710425f6`. A reconciliação preservou as
migrations ACL canônicas `0175/0176` de `main` e incorporou somente os deltas
não conflitantes da branch `final-ci`: lookup autoritativo combinado de
sessão/usuário, coalescência do health probe, compatibilidade do teste de
reexport ESM e o gate de revogação correspondente. A migração alternativa de
versionamento de ACL, o teste SQL duplicado e os commits de CI/documentação
reancorados ficaram fora por conflito ou obsolescência de identidade.

As verificações locais do delta passaram: build, DB `36/36`, auth `72/72`, API
`620/620`, reexport `17/17`, SQL evidence `6/6`, identidade/P0/docs/prompt e
manifesto crítico revision `81`. O novo candidato ainda não possui CI remoto
terminal; o último CI terminal disponível é o #282 e permanece `failure`.
O parecer detalhado está em
[`28-branch-reconciliation-20260918.md`](./28-branch-reconciliation-20260918.md).

## Observação terminal mais recente — CI #282

O [CI #282](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907606)
terminou `failure` no HEAD documental `0d230b65d41cfc3f227c0815bb821369241dcbb7`:
`Critical Coverage Gate` e `Performance (k6 SLOs)` falharam, enquanto os demais
jobs passaram. A ficha exata, os horários, os jobs e os artefatos estão em
[`26-remote-ci-35306907606.md`](./26-remote-ci-35306907606.md). A matriz visual
local reproduziu `29/29` no Chromium e `0/29` em Firefox e WebKit por engine;
essa evidência diagnóstica está em
[`27-local-visual-matrix-20260918.md`](./27-local-visual-matrix-20260918.md).
O release permanece `BLOCKED / NOT PROVEN`.

## Observação terminal do CI exato — 2026-09-18T04:20:23Z

O [CI #35304185255](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35304185255)
foi executado no HEAD documental `52453612a7d45c1e2a002aae8e1e0a1f4eb7fcc9`,
com comportamento ancorado no candidato funcional
`4e71d3ff9f53a3b24e656ecb09d2f12311fb3a2d`, e terminou `failure`. O
`Critical Coverage Gate` falhou no checker completo e o `Performance (k6 SLOs)`
falhou no benchmark/validação; E2E SPA, integração, unitários, build, guards,
OpenAPI, visual e os demais jobs terminaram `success`.

O artefato remoto de performance foi publicado, mas suas métricas não foram
inferidas porque o download exige autenticação neste ambiente. A execução local
independente do mesmo perfil passou `9/9` SLOs (API P95 `97,78 ms`, query P95
`107 ms`, erro `0%`, disponibilidade `100%`). Essa leitura não promove o CI
remoto nem altera thresholds. A ficha terminal completa está em
[`25-remote-ci-35304185255.md`](./25-remote-ci-35304185255.md).

## Recoleta local do candidato OpenAPI/WebAuthn — 2026-09-18T03:21:30Z

O candidato funcional dessa recoleta histórica foi
`4e71d3ff9f53a3b24e656ecb09d2f12311fb3a2d`, publicado em `origin/main` sem
force-push. Esta recoleta cobre somente a mudança de autenticação WebAuthn e
seus contratos e a resolução do artefato OpenAPI entre source/build/Vitest; não
transfere evidência de candidatos anteriores nem fecha gates externos.

SHA de código e documentação: `686c47d09adc6b57d624f3ca822ca649710425f6`.

- manifesto de cobertura crítica na revisão `81`, ancorado no candidato
  funcional, com `node --test scripts/critical-source-manifest.test.mjs`
  **16/16 PASS** e `refresh-critical-source-manifest.mjs --check` **PASS**;
- o rebind atualiza seis hashes de fontes modificadas e preserva o manifesto
  anterior em `artifacts/remediation/MA-02/refresh/`;

- `pnpm --filter @cvg-his-v2/module-mfa typecheck`: **PASS**;
- `pnpm --filter @cvg-his-v2/shared-config typecheck`: **PASS**;
- testes FIDO2 com chave P-256, attestation CBOR `fmt:none`, assinatura,
  challenge, origem, RP ID, user handle e contador: **14/14 PASS**;
- `pnpm --filter @cvg-his-v2/shared-config test`: **47/47 PASS**;
- `pnpm --filter @cvg-his-v2/module-mfa test`: **66/66 PASS**;
- `pnpm --filter @cvg-his-v2/api test:auth-route`: **47/47 PASS**;
- `pnpm --filter @cvg-his-v2/api typecheck`: **PASS**;
- OpenAPI routes Vitest: **5/5 PASS**;
- `pnpm validate:openapi`: **PASS**, 430 paths e 525 schemas;
- API build e rotas nativas compiladas: **PASS**, **2/2**;
- runtime de produção e política de dependências: **PASS**.

A suíte nativa confirma que `x-rp-id: attacker.example` não altera o RP ID
server-owned `cvg.local`. O loader OpenAPI ignora URLs não-`file:` geradas pelo
Vitest e usa candidatos source/build; o ADR-015 registra a decisão e o limite explícito:
attestation de fabricante/enterprise trust não foi habilitada; o registro usa
`attestation: none` para o fluxo de passkeys. O [CI #35302897107](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35302897107)
estava `pending` na observação; o [State of Art Closure #35302897028](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35302897028)
estava em execução. Portanto, a conclusão local continua separada de CI
terminal, target, recovery, UAT, governança e release authority.

## Recoleta terminal local — 2026-09-18T01:53:20Z

O candidato funcional permanece
`28043455f12cf2ef076eafcf09516ffd67007c74`; os processos desta recoleta
executaram no descendente documental `42902e95f696e8c9456cee7c11afa192c149fefd`.
O binding foi aceito como `DOCUMENTATION_ONLY_DESCENDANT`, sem caminhos de
fonte/workflow disallowed.

- `pnpm validate:migration-source`: **PASS**;
- SQL producer `c43c3222-6973-4031-9276-bd33f7e011b3`: **PASS**, 175 migrações
  ativas e 7 artefatos históricos;
- integração efêmera `2c101787-344c-40d4-bb3e-d1c00df4f6f8`: **PASS**, 105/105
  arquivos e 933/933 testes;
- `node scripts/check-critical-coverage.mjs`: **PASS**, R05-010 sem erros,
  SQL/Vue **PASS** e todos os componentes acima do threshold congelado;
- shards promovidos: unit `0e4e7132`, native-api `526e31f5`, native-worker
  `7c3442b7`, critical-process `ddfb1587` e Vue `6935d8c0`, todos com o
  manifesto revision 79 e digest
  `987b3a9c8e8cbbc0670b0ed45b06d00fbaa91676f1b608363effda4a9b7f5dbd1`.

Esta recoleta fecha apenas o P0 local de PostgreSQL/migrações. O CI exato
`35296518702` ainda estava `in_progress` na observação; RLS no target,
recovery/RPO-RTO, performance/soak, attestation, UAT e autoridade humana
continuam `NOT_PROVEN`.

## Candidato documental observado em 2026-09-18T01:07:08Z

- SHA histórico de código e documentação: `28043455f12cf2ef076eafcf09516ffd67007c74`;
  identidade em
  [`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json). Evidência de candidatos anteriores permanece histórica e não é transferida.
- O manifesto crítico está na revisão 79, ancorado no commit funcional `28043455f12c` e publicado na identidade do snapshot; a migration `0176` preserva o checksum da `0175`, força RLS na ledger e evita recriação durante cascatas de conta. O produtor de evidência SQL cobre as `175` migrações ativas e preserva os artefatos históricos. O candidato também exige Redis saudável antes de abrir o listener em produção-like, ativa tracing HTTP W3C/OTel com targets sem query strings sensíveis, publica métricas de frescor e modo de persistência do worker, valida o contrato de composição produtiva e a integridade do catálogo de eventos. Rollback preservado em `origin/main@893d6cac` e nas branches ancestrais integradas.
- Nenhum force-push foi usado.
- O [CI #252](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35284475981), executado no predecessor `893d6cac`, não é evidência deste candidato e nenhum resultado é transferido.

## Importação corrente do evidence graph — 2026-09-17

- `pnpm evidence:triple-a:graph` lê os envelopes locais conhecidos em
  `artifacts/release/`, valida schema, SHA do envelope, ambiente, frescor,
  ancestralidade do candidato funcional e digest dos artefatos referenciados.
- Evidência local fresca de workflow PostgreSQL e auditoria foi importada como
  `PARTIAL`, com vínculo explícito ao candidato funcional e ao HEAD documental;
  a ausência de attestation independente impede `PASS` e mantém o graph
  `BLOCKED`.
- Os testes do contrato cobrem envelope fresco, descendente documental,
  stale, digest adulterado e symlink. O importador não substitui o gate de
  release, CI remoto, target ou autoridade humana.
- A execução local corrente sobre PostgreSQL descartável terminou com `393/394`
  arquivos e `3930/3933` testes aprovados, com `1` arquivo e `3` testes ignorados
  de forma esperada, após aplicar as `176` migrations, incluindo cenários de
  SIGKILL/takeover, idempotência, concorrência financeira, PIX, webhook e
  workflow. Essa coleta é diagnóstico candidate-bound e não fecha os P0 que
  exigem CI, target ou autoridade independente.

## Validações locais

| Escopo                 | Resultado                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate crítico R05-010   | O [CI #214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35204183554) terminou com Critical Coverage Gate e gates estruturais/funcionais em `PASS`; E2E SPA `424/424`, Visual `29/29`, e somente Performance falhou |
| Workspace              | Cobertura global `273/273` arquivos e `2907/2907` testes passou; `87,46%` statements, `82,00%` branches, `89,32%` functions, `88,91%` lines; API `619/619`, integração PostgreSQL `16/16`, complexity `8.335` linhas, lint, typecheck `68/69` projetos, contratos CI `20/20`, cobertura/processo e SQL `34/34` passaram |
| Identidade/evidence graph | Identidade canônica do snapshot documental `db47bb15`; registro P0 `1 CLOSED / 13 OPEN`; graph/CI/authority permanecem `BLOCKED / NOT PROVEN` |
| Coverage crítico current | O #205 passou o Critical Coverage Gate; a cobertura geral local passou o threshold congelado e a correção do shard de revogação foi validada localmente |
| Vue especializado current | O #214 passou Visual Regression `29/29` no candidato funcional equivalente; a normalização `--disable-lcd-text` e os seis baselines auditados permanecem; nenhum threshold foi relaxado |
| SQL/migrações current  | PostgreSQL 16.15 privado socket-only; suíte completa aplicou `176` migrações executáveis + `7` históricos contabilizados no manifesto; cadeia e seed repetíveis |
| Performance/target     | O #247 falhou no job k6 do predecessor; a otimização de frescor ACL está pronta para nova execução exata, sem relaxar thresholds; target/soak/restore/UAT/attestation permanecem `NOT_PROVEN` |
| Supply/artefatos       | O graph, o pacote local e o registro P0 são gerados/validados fail-closed; nenhum PASS externo ou histórico foi inventado |

### Evidência histórica preservada — candidato `52a62b80`

- O provider de feature flags passou cinco testes focados cobrindo precedência
  de escopo, kill switch persistido, expiração com cache, allowlist sem usuário
  e expiração do catálogo sem conta.
- O typecheck e o lint do workspace passaram em `68/69` projetos. A revisão 71
  do manifesto crítico foi produzida pela ferramenta oficial e preserva todos
  os hashes, thresholds, shards e histórico anterior.
- Essa evidência é local; não prova PostgreSQL/RLS em CI, performance do target,
  recuperação, UAT, attestation, governança de branch ou release authority.

### Evidência adicional do candidato `95227098`

- API: `619/619` testes passaram, incluindo o fail-closed de erro genérico de sessão em HTTP 503; a integração PostgreSQL descartável passou `16/16`, incluindo a revogação concorrente durante a guarda final.
- Performance local: PostgreSQL 16 descartável, API compilada limitada a quatro CPUs e perfil k6 de 60 VUs passaram `9/9` SLOs; `query_latency_ms.p95=138ms` contra o limite de `150ms`, sem erros HTTP e com disponibilidade de `100%`.
- Visual local: Chromium/Playwright com o runtime do workspace passou `29/29` cenários visuais. O primeiro ensaio com o rate limit padrão falhou por `429` após quatro cenários; a repetição com `AUTH_RATE_LIMIT_MAX_REQUESTS=200` passou integralmente. Nenhuma baseline foi promovida.

Esses resultados são limitados ao ambiente local. O banco usado na cobertura e
no E2E é descartável; nenhum resultado é promovido para target, UAT, branch
protection ou autoridade de release.

## CI remoto e reancoragem

### CI #205 — resultado terminal histórico do main remoto

O [CI #205](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35188872670)
foi executado no `main@7ff8847b52c0914ad65a4a5dec21f27c378b20f2`, descendente
documental do candidato funcional remoto `b313fba795175947559347b7e82b460040fc459d`.
O código/workflow é equivalente ao candidato local `d9acec6e`, mas os SHAs não
são intercambiáveis. O run terminou `failure`.

- Critical Coverage Gate, segurança, dependências, secrets, SAST, OpenAPI, lint,
  typecheck, coverage, guards, build, unitários, integração, contratos API e
  processo Windows: PASS.
- API clínica canônica: `2/2` PASS.
- E2E SPA: `395 passed`, `29 failed`; as 29 falhas correspondem à matriz
  visual.
- Visual Regression: `29/29` falharam depois de banco, seed, API e SPA estarem
  saudáveis. O comparativo mostra drift consistente de tipografia/layout, em
  todas as variantes, e não tela vazia ou falha de autenticação.
- Performance/k6: `7/9` SLOs; query p95 `212 ms` excedeu `150 ms` e inventory
  p95 `200,36 ms` excedeu `200 ms`; erros `0%`, disponibilidade `100%`.

O CI usa Playwright `1.58.2`/Chrome for Testing `145` em Ubuntu `22.04`,
enquanto os baselines foram gerados no host Linux Mint. Como a SPA usa fontes
do sistema e não versiona fonte web, o parecer visual independente é **drift
provável de fonte/renderização**. Baselines e thresholds não foram alterados;
o detalhamento está em [`20-ci-205-evidence.md`](./20-ci-205-evidence.md).

O commit de fonte `e69b4484` adicionou o registro P0 machine-readable, seu
validador com dependências acíclicas e evidências candidate-bound, o comando
`pnpm validate:p0-registry`, o teste de processo e a execução bloqueante no CI e
no gate `release:triple-a`. O manifesto foi atualizado para a revisão 57 no
commit `fa877475` e a identidade canônica foi gerada sobre esse commit. O
registro corrente contabiliza `14` itens (`1` `CLOSED`, `13` abertos); o estado
`DONE` é rejeitado explicitamente. A validação local passou, mas isso não fecha
os P0 de CI remoto, target, recovery, UAT ou autoridade humana.

O CI [#201](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35180698030), no snapshot documental `e54a4374`, falhou em Repository Guards porque a identidade ainda apontava ao manifesto pré-correção. O #200 anterior também terminou `failure` por binding inválido do manifesto, e nenhum dos dois é promovido. A identidade foi reancorada no candidato `e54a4374`; nenhum threshold, baseline ou resultado histórico é promovido. O novo snapshot aguarda uma execução exata após o push.

O [CI #178](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35056933106), executado no `main@6b7c1cec`, terminou `failure`. Repository Guards, API Contract, Integration e Windows passaram junto com os checks de segurança, typecheck, lint, OpenAPI e build; Critical Coverage, Coverage, Unit Tests, Performance/k6, Visual Regression e E2E SPA falharam. O E2E remoto falhou na etapa principal e na validação de usabilidade, embora a API clínica canônica tenha passado; o gate local explícito do candidato retornou `51/49/18` e bloqueou publicação; nenhum resultado histórico ou parcial é promovido.


O [CI #143](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34678150409)
é o run do candidato funcional pai `82ff6eec` e terminou `failure` com `15/16`
jobs verdes: E2E SPA, integração, segurança, build, visual e demais checks
passaram; somente Performance/k6 falhou em `Run k6 benchmark`/`Check SLO results`.
Esse resultado não é transferido para `0d475dee`; nenhum threshold foi relaxado.
O CI #144 do pai documental `da5dd244` falhou em `Repository Guards` porque o
checkout raso impediu validar a ancestralidade do snapshot. O candidato atual
passa a solicitar `fetch-depth: 0`; a correção foi exercitada no CI seguinte.
O [CI #145](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34680830958)
no `main@66a605be` confirmou a correção do guard e terminou com 15/16 jobs
verdes; E2E, integração e os demais checks passaram, mas Performance/k6 falhou.
O SLO remoto permanece sem prova de aprovação.
O [CI #146](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34682262401),
no descendente documental `697c6efa`, terminou `failure`: a suíte SPA passou,
mas `Run canonical clinical API E2E` falhou. O candidato `a3354f02` prepara
`cvg_his_e2e_canonical` e sobe a API em `3113`, separando a prova clínica do
banco mutável da suíte SPA. O [CI #147](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34684079972),
no SHA exato publicado `8273ecb5`, confirmou a correção: `16/16` jobs verdes,
SPA E2E verde e `Run canonical clinical API E2E` concluído com sucesso em
`8s`, além de Performance/k6, integração, unidade, visual, guards e segurança.
O [CI #148](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34685632858),
no descendente documental `f9cc660a`, manteve E2E SPA, API clínica canônica,
integração, unidade, visual e demais checks verdes, mas falhou no job
Performance/k6: `Run k6 benchmark` exit `99` e `Check SLO results` exit `1`.
Esse resultado não transfere falha para o código/workflow de `a3354f02`, que
permanece confirmado pelo #147; ele mantém o snapshot atual `BLOCKED` até uma
execução k6 terminal verde.

O [CI #149](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34687849607),
no SHA `553078be`, terminou `failure` em `Validate repository source contracts`:
o guard detectou que os documentos correntes ainda declaravam `a3354f02` depois
da alteração do workflow/contrato. Os jobs Typecheck, SAST, Secret Scan,
Dependency Audit, Coverage e OpenAPI passaram; nenhum resultado parcial é
promovido. A reconciliação foi publicada no descendente `4b49c4ef`.

O [CI #151](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34690210769),
no SHA `fecb70ca`, terminou `failure` somente em `Performance (k6 SLOs)`:
`15/16` jobs passaram, incluindo Repository Guards, Integration, E2E SPA e
Visual Regression. O benchmark terminou com exit `99` e o parser com exit `1`;
o job remoto publicou o artefato `performance-k6-report` com digest
`sha256:84b09a10162af819504fe8e269a84d498f1927aee9189af553ff3f8086390afa`.
As métricas detalhadas não estão disponíveis sem credencial. A mudança
`GOMAXPROCS=1` e o watcher de diagnóstico passaram na reprodução local, mas a
evidência hospedada continua falha. Runs anteriores do mesmo código/workflow
alternaram entre verde e falha em runners diferentes; nenhum threshold foi
relaxado.

O [CI #153](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34693263252)
permanece como histórico do descendente documental anterior `9955b8b5`; terminou
`failure` com `15/16` jobs verdes e falha exclusiva de Performance/k6. Nenhuma
evidência parcial ou de outro SHA é transferida para `e605597c`.

## Recovery e target

`pnpm ops:backup:check` valida contratos estáticos. Os drills reais fixture e
representative não iniciaram porque o Docker daemon recusou o socket; não há
evidência de restore, corrupção, migration mismatch, RPO/RTO, deploy,
rollback, attestation, soak ou alert delivery em target. O k6 local aprovado
não substitui a execução remota nem uma certificação de target.

## Decisão corrente

O candidato `5998287d386559fc3b3ed760a47756e62349f286` permanece
`BLOCKED / NOT PROVEN`. A suíte local de integração/processo está verde e os
envelopes locais são candidate-bound, mas o evidence graph os mantém em
`PARTIAL` até uma verificação independente. O registro P0 permanece em
`1 CLOSED / 13 OPEN`; não há autorização para release, `main green` ou
`TRIPLE-A VERIFIED`.

## Decisão histórica preservada

O envelope ignorado `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` do candidato
`358e546e` é `BLOCKED / NOT PROVEN` (`51/49/18`); a execução completa passou
checks e suíte workspace, mas não substitui as provas externas ausentes. O pacote local
`artifacts/triple-a/index.json` também permanece `BLOCKED`. A ausência de uma
prova externa permanece ausência; não é convertida em PASS pelo k6 local ou
por um CI verde de outro SHA.

## Recoleta corrente — revisão 33 — 2026-09-16T07:57:55Z

- O commit funcional observado é `2949fedf010febbe4bc71acd2071a2211b4688f3`.
  Ele alinha o contrato de criação de paciente entre o OpenAPI, o parser de
  runtime e a fixture de integração (`sex` obrigatório e enums `sex`/`size`).
- A identidade documental corrente foi gerada para `b0e536e27155036782105ddd00a8329940476b16`, commit que contém esta reconciliação; commits posteriores só podem ser documentais e exigem nova validação da identidade.
- A inspeção de branches confirmou que
  `origin/fix/state-of-art-ci-assurance` é ancestral de `main`, sem commits
  exclusivos (`main...branch = 138 0`). Portanto, a unificação com `main` não
  exige merge commit nem descarte seletivo; o conteúdo da branch já está em
  `main` e a branch remota foi preservada.
- O manifest crítico é a revision `33`, com
  `sourceSetSha256=c02011a9e76ec80a6243e5ce15a2c53e07fd3bbb945251eb4d0bcfe99289f84a`
  e digest `035fc93421038e46b8e7582322c89e901e53a21330c0c5ed2c427d4651ca1ec`.
  A recoleta não alterou thresholds, fontes ou aplicabilidade.

| Produtor | Resultado corrente e identidade |
| --- | --- |
| Vitest unit | PASS; 241/241 arquivos, 2.732/2.732 testes; run `4bdee84a-585c-41c3-bb28-8ebecd603a34` |
| Vitest integração | PASS; 105/105 arquivos, 933/933 testes, sem skips; run `1fcf0fd4-7896-4a68-be25-85399dcffd0e` |
| Native worker | PASS; run `23939cb3-5e36-4bc2-8922-c236cd2b75c0` |
| Native API | PASS; run `eb64f8b1-f85c-41e9-a845-cde9a16ea48d` |
| Critical process | PASS; 11/11 reports de suítes críticas verificados; run `b6c80b7c-5946-46b9-9ce3-4fb2ee5cb236` |
| Vue especializado | PASS; build, consumer e 60/60 suítes (399/399 testes), com browser evidence; run `73e2a5b4-73dd-40e2-b52b-91d71d1ec46a` |
| SQL/migrações | PASS; 171 migrações ativas, escopo reconciliado 171+7=178, TCP privado desabilitado; run `3ab57b1c-7d29-4c6f-b6cb-5919925f4eeb` |

O gate `node scripts/check-critical-coverage.mjs` foi executado após a
promoção de todos os produtores e não encontrou mais erro de identidade,
proveniência, Vue ou SQL. O resultado agregado permanece `FAIL`/`BLOCKED` por
19 métricas: `auth:functions=72.28`; `billing-cash:functions=83.05,
branches=82.7`; `inpatient:branches=81.53`; `records:functions=78.6,
branches=78.63`; `prescriptions:functions=73.61, branches=81.05`;
`pix:functions=73.93, branches=84.36`; `webhooks:lines=82,
statements=82.23, functions=65.73, branches=77.39`;
`http-routes:branches=79.32`; `repositories:lines=74.86,
statements=73.88, functions=62.11, branches=68.1`. Nenhum threshold foi
reduzido e nenhuma fonte foi reclassificada para encobrir a insuficiência.

Esta recoleta é local e current; não prova CI remoto do novo SHA, target,
UAT, restore/recovery, attestation, authority ou certificação Triplo AAA.
Consequentemente, o claim de release continua `NOT PROVEN` e
`publication_allowed=false`; a próxima ação é elevar a cobertura das fontes
afetadas e repetir o gate.
