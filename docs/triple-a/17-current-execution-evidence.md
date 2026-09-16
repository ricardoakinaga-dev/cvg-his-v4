# Evidência de execução corrente — State of Art

## Candidato de código observado em 2026-09-16T01:13:57Z

- SHA de código e documentação: `0ca1526aa3b7152563f4a7c14dc1dbdb0086390e`; identidade em
  [`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json). Evidência de candidatos anteriores permanece histórica e não é transferida.
- `HEAD`/`main` local está em `0ca1526a`; `origin/main` ainda está em `afb5eef8`; rollback preservado em `origin/fix/state-of-art-ci-assurance@fe5406c2`.
- Nenhum force-push foi usado.

## Validações locais

| Escopo                 | Resultado                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate estrito           | `BLOCKED`, score `49`, critical `43`, open P0 `20`, `claim=NOT PROVEN`, `publication_allowed=false`, executado explicitamente com `commitSha=0ca1526a` |
| Workspace              | Typecheck e lint completos PASS; contrato CI `19/19`; testes focados `46/46`; checker de estado `11/11` |
| Identidade/evidence graph | `validate:candidate-identity` PASS; graph gerado com status `BLOCKED`, candidate `PASS`, CI/authority `NOT_PROVEN` |
| Coverage isolado       | `2.661` testes; 2.658 passados e 3 skipped, mas cobertura global `77,97/71,27/79,17/79,60%` (statements/branches/functions/lines), abaixo de 82% |
| E2E clínico browser    | Stack Docker descartável; Chromium desktop/mobile; `4/4` testes PASS, incluindo Axe e recuperação |
| Regressão visual       | Chromium; `29/29` screenshots PASS; 1 caso especializado skipped por exigir execução opt-in |
| Performance/target     | Sem certificação do candidato; k6/target/soak/restore/UAT/attestation permanecem `NOT_PROVEN` |
| Supply/artefatos       | O graph e o pacote local são gerados fail-closed; nenhum PASS externo ou histórico foi inventado |

Esses resultados são limitados ao ambiente local. O banco usado na cobertura e
no E2E é descartável; nenhum resultado é promovido para target, UAT, branch
protection ou autoridade de release.

## CI remoto e reancoragem

Não existe ainda run remoto vinculado ao SHA exato `0ca1526a`; [CI #35030045158](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35030045158) é do SHA anterior `afb5eef8` e permanece somente diagnóstico histórico. O gate local explícito do candidato retornou `49/43/20` e bloqueou publicação. A publicação do candidato deve disparar nova execução com os guards vinculados à identidade corrente.


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

## Decisão

O envelope ignorado `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` do candidato
`0ca1526a` é `BLOCKED / NOT PROVEN` (`49/43/20`); a execução completa passou
checks e suíte workspace, mas não substitui as provas externas ausentes. O pacote local
`artifacts/triple-a/index.json` também permanece `BLOCKED`. A ausência de uma
prova externa permanece ausência; não é convertida em PASS pelo k6 local ou
por um CI verde de outro SHA.
