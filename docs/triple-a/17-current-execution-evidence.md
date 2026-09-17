# Evidência de execução corrente — State of Art

## Candidato documental observado em 2026-09-17T21:24:29Z

- SHA de código e documentação: `5a5388281633a235a6e53909c7432c4535194d70`;
  identidade em
  [`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json). Evidência de candidatos anteriores permanece histórica e não é transferida.
- O manifesto crítico está na revisão 73, ancorado no commit funcional `836b8b76b957` e publicado na identidade do snapshot; o candidato instala Chromium, fixa Noto Sans nos jobs E2E/visual, desativa LCD text no Playwright e verifica a fonte com comandos portáteis do runner, provisiona PostgreSQL 16 via PGDG fingerprint-pinned, aceita o par V8 de inicializadores do Node 22, publica o artefato SQL verificado, valida o registro P0 e fecha o threshold global de branches com contratos determinísticos. Os gates SPA agora usam API compilada e servidor estático com proxy same-origin `/api`, igual ao harness canônico local. O provider raw de feature flags aplica kill switch persistido, expiração, precedência de escopo, allowlist fail-closed, cache bounded/invalidação, consultas tenant-scoped explícitas e ownership composto entre flag e override; a evidência SQL executa 0173/0174 para validar o schema final, mas publica somente os passos legados 0170/0171/0172 exigidos pelo consumidor. A suíte oficial Node do módulo de feature flags permanece ativa, enquanto seu teste nativo fica fora da varredura global do Vitest; `server.ts` respeita o orçamento de `8.335` linhas. Rollback preservado em `origin/fix/state-of-art-ci-assurance@fe5406c2`.
- Nenhum force-push foi usado.
- O [CI #238](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35248052991), executado antes desta correção, falhou na cobertura global porque um teste Node nativo foi incluído indevidamente no sweep do Vitest; ele não é evidência do candidato corrigido.

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
- A execução local corrente de `DATABASE_URL_TEST` sobre PostgreSQL descartável
  terminou com `67/67` arquivos e `618/618` testes de integração aprovados; a
  fase serial de processo terminou com `11/11` cenários aprovados, incluindo
  SIGKILL/takeover, idempotência, concorrência financeira, PIX, webhook e
  workflow. Essa coleta é diagnóstico candidate-bound e não fecha os P0 que
  exigem CI, target ou autoridade independente.

## Validações locais

| Escopo                 | Resultado                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate crítico R05-010   | O [CI #214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35204183554) terminou com Critical Coverage Gate e gates estruturais/funcionais em `PASS`; E2E SPA `424/424`, Visual `29/29`, e somente Performance falhou |
| Workspace              | Cobertura global `273/273` arquivos e `2907/2907` testes passou; `87,46%` statements, `82,00%` branches, `89,32%` functions, `88,91%` lines; API `618/618`, integração PostgreSQL `16/16`, complexity `8.335` linhas, lint, typecheck, contratos CI `20/20`, cobertura/processo e SQL `34/34` passaram |
| Identidade/evidence graph | Identidade canônica do snapshot documental `5a538828`; registro P0 `1 CLOSED / 13 OPEN`; graph/CI/authority permanecem `BLOCKED / NOT PROVEN` |
| Coverage crítico current | O #205 passou o Critical Coverage Gate; a cobertura geral local passou o threshold congelado e a correção do shard de revogação foi validada localmente |
| Vue especializado current | O #214 passou Visual Regression `29/29` no candidato funcional equivalente; a normalização `--disable-lcd-text` e os seis baselines auditados permanecem; nenhum threshold foi relaxado |
| SQL/migrações current  | PostgreSQL 16.15 privado socket-only; produtor independente PASS com `173` migrações executáveis + `7` históricos; cadeia completa e seed repetível |
| Performance/target     | k6 local limitado a quatro CPUs passou `9/9`; o #214 passou `7/9` SLOs e reprovou query p95 `217ms` e inventory p95 `202,76ms`; target/soak/restore/UAT/attestation permanecem `NOT_PROVEN` |
| Supply/artefatos       | O graph, o pacote local e o registro P0 são gerados/validados fail-closed; nenhum PASS externo ou histórico foi inventado |

### Evidência histórica preservada — candidato `52a62b80`

- O provider de feature flags passou cinco testes focados cobrindo precedência
  de escopo, kill switch persistido, expiração com cache, allowlist sem usuário
  e expiração do catálogo sem conta.
- O typecheck e o lint do workspace passaram em `68/68` projetos. A revisão 71
  do manifesto crítico foi produzida pela ferramenta oficial e preserva todos
  os hashes, thresholds, shards e histórico anterior.
- Essa evidência é local; não prova PostgreSQL/RLS em CI, performance do target,
  recuperação, UAT, attestation, governança de branch ou release authority.

### Evidência adicional do candidato `95227098`

- API: `618/618` testes passaram, incluindo o fail-closed de erro genérico de sessão em HTTP 503; a integração PostgreSQL descartável passou `16/16`, incluindo a revogação concorrente durante a guarda final.
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

O candidato `5a5388281633a235a6e53909c7432c4535194d70` permanece
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
