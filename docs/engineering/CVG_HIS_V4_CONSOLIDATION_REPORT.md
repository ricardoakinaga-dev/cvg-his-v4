# CVG-HIS V4 — Relatório Final de Consolidação

**Data:** 2026-08-25  
**Escopo:** consolidação incremental do monorepo CVG-HIS, sem rewrite, com foco em operação 24x7, integridade de dados, núcleo clínico e rastreabilidade de release.  
**Status:** `IN_PROGRESS` — primeiro slice operacional com `CONDITIONAL PASS`; produto global ainda `NOT READY FOR GO-LIVE`.

## Orchestration Complete

Esta rodada concluiu a descoberta, congelou a barra de qualidade, publicou PRD/SPEC/plano, implementou o primeiro slice de integridade de migrations e lifecycle e executou crítica independente. A consolidação global continua aberta nos itens de parity, providers, restore, RLS de ambiente-alvo, identidade V2/V4 e capacidade do harness de testes.

## Implemented

- checksum fail-fast no runner de migrations, sem editar migrations aplicadas;
- healthcheck explícito da API no Compose, usando `/ready` na porta interna 3001;
- shutdown idempotente e observável da API e do worker, com drain/readiness e `exitCode` correto;
- testes unitários, de processo e PostgreSQL descartável para o slice;
- guardrails bloqueantes no CI para OpenAPI, RLS, Helm, deploy, backup, parity, lifecycle e migration integrity;
- prova PostgreSQL descartável de isolamento RLS, ACL sensível e bootstrap production-like de roles, promovida ao `repository-guards`;
- orçamento explícito de 1 GiB de shared memory no PostgreSQL de teste, eliminando a falha reproduzida de `/dev/shm` sob concorrência;
- lock de setup no banco administrativo para serializar alterações de roles de cluster entre bancos efêmeros;
- correção da fixture do teste de laboratório para representar signer autorizado, mantendo o fail-closed de produção.
- fixture restore drill executado em PostgreSQL descartável, restaurando globals, banco e storage após validação de checksums/TOC.
- fonte única de migration consolidada no DB-001: `packages/db` mantém runner/seed checksum-aware, `shared/database` permanece cliente runtime com SQL histórica, comandos alternativos falham fechado, `drizzle-kit` foi removido dos manifests alvo e os entrypoints CI/Compose/Helm/cutover/test bootstrap foram contratados.

## Agents Used

Scouts independentes cobriram arquitetura/runtime, banco/segurança/ops e clínico/parity. Gauss atuou como crítico read-only do primeiro slice; Locke fez a segunda revisão independente; Noether realizou a revisão read-only final do slice clínico/cache e retornou `CONDITIONAL_PASS`, sem blocker/high/medium no escopo. As limitações de ambiente, cobertura direta do snapshot e observabilidade de refresh permanecem registradas como dívida LOW, não como aceite global.

## Files Changed

Os artefatos de engenharia estão em `docs/engineering/` e `.agent/plans/`. As alterações de runtime estão concentradas em API, worker, Compose, runner de migrations, setup de testes e CI; nenhuma migration SQL aplicada foi reescrita ou apagada.

## Validation

O resultado detalhado está na seção Testing. Em resumo: route `24/24`, medical-records `17/17`, inpatient `17/17`, API boundary `366/366`, process `2/2`, migration integrity PostgreSQL `1/1`, RLS/roles `19/19`, bootstrap production-like `6/6`, clinical-financial vertical `11/11`, restore drill descartável `1/1`, laboratório `2/2`, validators estáticos verdes, duas suites DB concorrentes `19/19` após o lock e `pnpm test` completo nos 70 projetos selecionados. O PostgreSQL de teste foi inspecionado com `shm=1gb`, `OOM=false`, `exit=0`.

## Independent Verification

O crítico independente inicialmente encontrou corrida pré-listen da API, cleanup que podia mascarar erro, ausência de process test no CI, ausência de evidência PostgreSQL e cobertura insuficiente de idempotência. A implementação foi ajustada para fechar essas lacunas; a evidência atual inclui o process test no job `repository-guards`, o teste PostgreSQL real e a repetição da suíte completa com memória compartilhada dimensionada. A lacuna adicional do job `unit-tests` — executar a suíte sem DB obrigatório — foi reproduzida em teste RED e corrigida no workflow. Noether revisou o diff clínico final read-only e confirmou `CONDITIONAL_PASS` sem blocker/high/medium; o relatório mantém explícitas as dívidas LOW e os gates globais não promovidos.

## Remaining Risks

- parity funcional Vetus permanece `4/11` áreas verificadas;
- restore de backup representativo, providers externos, RLS no catálogo de produção, Redis failover e cutover real não foram executados; o fixture restore drill local passou;
- o orçamento de recursos do harness agora está dimensionado localmente e nos cinco serviços PostgreSQL do workflow, mas a execução no runner GitHub ainda precisa ser observada;
- identidade V2/V4 e segundo track Helm continuam pendentes; a duplicação executável de migration e os artefatos source-level stale foram removidos, enquanto a SQL histórica do shared-database permanece preservada;
- há uma prova vertical PostgreSQL 11/11 de admissão→handoff/stay→consumo→cobrança diária→alta→close→receipt e uma segunda prova HTTP que cria Owner/Patient/Encounter e leva esses mesmos registros por care→inpatient→billing→stock→discharge→close→receipt, com replay e isolamento de tenant; a evidência ainda é local e não substitui o aceite do ambiente alvo.

## Decisions / Assumptions

- `docker-compose.v2.yml` e `packages/db` são a superfície operacional atual até cutover formal;
- V2→V4 será uma migração de identidade de release, não rename global nesta rodada;
- Vue, PostgreSQL, RLS, auditoria e módulos existentes permanecem;
- nenhuma claim de go-live é feita por score, presença de arquivo ou documentação sem evidência executada;
- commit/push desta consolidação não foi executado automaticamente.

## Recommended Next Step

Observar a execução do contrato de shared memory no runner GitHub e repetir a prova Owner→Patient→Encounter→care→inpatient→billing→stock→receipt no ambiente autorizado; em seguida executar restore com backup representativo, medindo RTO/RPO, antes de qualquer cutover. A fixture API `db-persistence` agora está verde bounded em 17/17 dentro de `test:all`; ela não substitui evidência de ambiente alvo nem a barra global.

## Gauntlet Result

**Goal:** consolidar o CVG-HIS como uma base operacional 24x7, sem rewrite e sem introduzir uma V5.

**Quality Bar:** primeiro slice `BOUNDED PASS`; barra global `PARTIAL`. A ausência de prova de ambiente-alvo impede `PASS` global.

**Rounds:**

1. discovery e auditoria de arquitetura, runtime, banco, RLS, CI, Helm, parity e documentação;
2. congelamento de `QUALITY_BAR.md`, PRD, SPEC, plano e registros de risco/dívida;
3. implementação S1–S3 com testes antes da alteração;
4. crítica independente e correção dos gaps HIGH/MEDIUM;
5. regressão focada, processos reais, PostgreSQL real e validators;
6. tentativa de suíte monorepo, recuperação do banco de teste e classificação honesta da falha de capacidade;
7. dimensionamento do PostgreSQL de teste, regressão monorepo completa e revisão read-only independente do slice clínico/cache; o resultado final foi `CONDITIONAL_PASS`, sem promoção da barra global.

**Major gaps discovered:** identidade V2/V4 ambígua; duas casas de banco e dois tracks Helm; checksum não validado; healthcheck implícito; shutdown abrupto; CI sem gates operacionais; parity estrutural em vez de comportamental; restore/provider/RLS de produção sem prova; harness DB-heavy inicialmente sem orçamento de shared memory.

**Major improvements:** checksum validado antes de aplicar qualquer migration nova; `/ready` explícito no Compose; drain e encerramento idempotente da API/worker; process test no CI; migration test com PostgreSQL descartável; prova RLS/roles 19/19, bootstrap production-like 6/6 e clinical-financial vertical 11/11 promovidos ao CI; prova adicional cria Owner/Patient/Encounter via HTTP e leva os mesmos registros até receipt com idempotência, audit e isolamento de tenant; fixture restore drill 1/1 restaura checksums/TOC, globals, banco e storage; lock para roles globais no setup paralelo; `shm_size: '1gb'` no banco de testes; suíte monorepo completa sem crash; contrato de backup estático e fixture de laboratório corrigidos.

**Verification performed:** focused 4 arquivos/22 testes; route 24/24; medical-records 17/17; inpatient 17/17; API boundary 366/366; process lifecycle 2 testes; migration integrity 1 teste PostgreSQL; RLS/access/runtime ACL 19 testes; bootstrap production-like 6 testes; clinical-financial vertical 11 testes; restore drill fixture 1/1 com checksums/TOC/globals/banco/storage; laboratório 2 testes; marketing+staff concorrentes 12+7 testes com DB obrigatório; `pnpm test` nos 70 projetos selecionados, incluindo SPA 172 arquivos/1.016 testes; PostgreSQL `shm=1gb`, `OOM=false`, `exit=0`; OpenAPI, RLS estático, Helm estático, deploy, backup checker, parity estrutural, Compose, CI contract e secret scan.

- **Final Critic:** Gauss, Locke e Noether; os achados de lifecycle, cleanup, CI, evidência de migration e rollback cross-domain foram incorporados. Noether não encontrou blocker/high/medium no slice final; a observação de dívida LOW e os limites de ambiente permanecem explícitos.

**Remaining limitations:** não houve restore de backup representativo, provider externo, catálogo RLS de produção, Helm renderizado por binário, GitHub Actions executado, parity 11/11 ou cutover no alvo. O fixture restore drill local passou, mas não substitui RTO/RPO de ambiente homologado. A suíte monorepo agora passa localmente com `shm_size: '1gb'`; a capacidade do runner GitHub ainda é uma ressalva operacional. A fixture API `db-persistence` foi reconciliada com UUID/principals/contexto e passou 17/17 dentro de `test:all`; isso continua sendo evidência local bounded e não promove o slice global.

**Final verdict:** `CONDITIONAL PASS` somente para o primeiro slice operacional; `NOT READY FOR GO-LIVE` para a consolidação completa.

## Executive Summary

O repositório é amplo e recuperável, mas não deve ser tratado como V4 pronto apenas por compilar ou conter telas. A base atual combina runtime e documentação V2, namespaces V2/legacy, mais de uma superfície de database/migration e dois tracks Helm. O risco mais importante não era ausência de funcionalidade isolada: era a impossibilidade de provar uma única cadeia de release, integridade histórica, lifecycle, recuperação e parity.

O primeiro slice fechou os riscos operacionais mais baratos e de alto impacto. A trilha de migration agora falha com segurança quando um nome aplicado tem hash diferente; a API possui healthcheck explícito; API e worker encerram drenando; o CI passou a chamar os gates operacionais; e as provas mínimas foram executadas em processos reais e PostgreSQL descartável.

Isso não certifica o produto inteiro. O score de readiness continua `95/100`, com parity estrita `4/11`; o próprio comando retorna falha por parity. O próximo gate deve ser clínico/operacional, não mais uma limpeza cosmética de nomes.

## Architecture Before/After

| Dimensão   | Antes                                                                                    | Depois desta rodada                                                                                                                           | Próximo alvo                                                 |
| ---------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Identidade | projeto, Compose, pacotes e imagens predominantemente V2 em uma missão V4                | conflito documentado e governado; sem rename big-bang                                                                                         | decisão formal V2→V4 com aliases e rastreabilidade           |
| Runtime    | API/worker dependiam de lifecycle implícito e `process.exit(0)`                          | shutdown idempotente, drain/readiness, fechamento de listener/DB/observabilidade                                                              | ensaio com DB/Redis e rollout em staging                     |
| Health     | `service_healthy` dependia principalmente do Dockerfile                                  | `/ready` explícito em `docker-compose.v2.yml`                                                                                                 | alinhar o Helm canônico e retirar probe alternativo inválido |
| Database   | runner conhecia nome, mas não validava hash aplicado; havia comandos e artefatos legados | runner compara nome+hash; lock de setup; DB-001/DB-002 deixam `packages/db` como única rail executável e removem a família source-level stale | provar migration positiva e catálogo alvo                    |
| CI         | vários validators não bloqueavam o fluxo                                                 | `repository-guards` executa contratos, process/RLS/role/clinical tests e migration test                                                       | executar no GitHub e reter artefatos                         |
| Módulos    | 64 namespaces V2 e 6 legacy, API concentrada                                             | mapa e owners registrados, sem migração global arriscada                                                                                      | guardrail contra novos crossings e extração incremental      |

## Problems Found/Fixed

### Corrigidos nesta rodada

- checksum de migration aplicada agora é comparado por SHA-256; mismatch interrompe antes de aplicar nova migration;
- hash inválido, ausente, duplicado, migration local ausente e registro extra são tratados como inconsistência explícita;
- `/ready` é o healthcheck declarado na mesma porta interna usada pelo serviço;
- sinal antes/durante o bootstrap não deve continuar silenciosamente para o listen;
- sinais repetidos compartilham uma promessa de shutdown; cleanup continua mesmo se uma etapa falhar;
- worker deixa de anunciar readiness enquanto drena e não inicia novo tick;
- cleanup que falha produz exit code 1, não sucesso falso;
- CI sobe PostgreSQL isolado antes da prova real de migration e sempre tenta pará-lo;
- setup concorrente serializa migrations que alteram roles cluster-scoped;
- teste de laboratório recebeu signer autorizado somente na fixture, preservando o bloqueio de produção sem signer.
- DB-001/DB-002 bloquearam as rails alternativas e removeram a família source-level stale (`packages/db/src/migrate.js`, companions `.d.ts`/`.map` e `packages/db/drizzle.config.ts`); o build continua gerando `packages/db/dist/migrate.js` a partir do TypeScript.

### Ainda não corrigidos

- V2/V4, `@cvg-his/*`/`@cvg-his-v2/*` e casas duplicadas ainda coexistem;
- `charts/helm` continua secundário e tem probe `/health/startup` não comprovado;
- `server.ts` permanece composition root/dispatch muito grande;
- parity continua baseada em provas incompletas por domínio;
- restore/provider/RLS de catálogo e cutover real continuam sem evidência.

## Remaining Debt

O registro completo está em [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md). Os itens prioritários são:

- P0: retirar a superfície de migration duplicada e executar restore drill com backup representativo;
- P0/P1: prova de RLS/roles no catálogo do ambiente-alvo e jornada clínica transacional integrada;
- P1: homologação de laboratório, fiscal, pagamentos, marketing e importação Vetus;
- P1: observar o orçamento de shared memory no runner remoto e separar/limitar a suíte DB-heavy se a capacidade variar;
- P1/P2: decidir Helm owner, política Vault/env e guardrail de namespaces;
- P2/P3: decompor API/SPA somente depois que contratos clínicos e operacionais estiverem estáveis.

## Clinical Architecture

O núcleo clínico existente é rastreável como:

`Owner → Patient → Encounter → triage/medical-records/diagnostics/prescriptions → inpatient/surgery/discharge → billing/stock/audit`.

Owners e pacientes possuem rotas, páginas, repositórios e migrations; encounters ligam paciente/owner e alimentam o atendimento; cuidado, prescrição, diagnóstico, internação e alta têm módulos próprios. A arquitetura preserva a regra de que WhatsApp/provider não pode ser dependência síncrona da internação: integrações devem usar outbox, retry, timeout, DLQ e idempotência.

Já existe uma prova HTTP que cria owner/patient/encounter, atravessa care e fecha a jornada com auditoria, isolamento de tenant e replay idempotente. O próximo incremento é ligar esses mesmos registros recém-criados às consequências financeira/estoque e ao recebimento da vertical completa.

## Database

`packages/db/migrations` + `packages/db/src/migrate.ts` permanecem a única trilha de aplicação. Há 142 arquivos SQL aplicáveis; arquivos `.revert.sql` ficam fora do runner. O runner usa transações por migration, registra hash e mantém lock por database para execuções concorrentes no mesmo banco. `packages/db/src/seed.ts` é o seed canônico. O DB-002 removeu a família `migrate.js`/`.d.ts`/`.map` e o `drizzle.config.ts` source-level, deixando `packages/db/dist/migrate.js` como saída gerada do TypeScript para Compose/Helm.

O DB-001 adicionou um guardrail executável e um contrato CI: `pnpm
validate:migration-source` verifica manifests, ausência de `drizzle-kit`, cinco
consumidores operacionais e a preservação da SQL histórica; `db:generate`,
`db:push` e `db:migrate` do pacote runtime falham fechado com orientação
explícita. O CI usa `pnpm exec tsx packages/db/src/migrate.ts`, eliminando a
invocação ambígua de TypeScript com `node`. Os builds de `@cvg-his/db` e
`@cvg-his-v2/shared-database` continuam verdes.

O teste real criou banco PostgreSQL descartável, aplicou as 142 migrations, alterou temporariamente o hash de uma migration aplicada, confirmou falha explícita de checksum e verificou que a quantidade de registros não mudou; o hash original foi restaurado. A prova é forte para fail-fast, mas ainda falta um cenário separado que aplique uma migration nova positiva em uma release controlada.

O setup de testes usa ainda um lock no banco administrativo porque roles PostgreSQL são cluster-scoped e não ficam isoladas por nome de database. A execução monorepo demonstrou outro limite: muitas bases efêmeras simultâneas exauriram shared memory do container.

## Security

`pnpm security:secrets` passou. A alteração não adiciona segredo, token ou credencial. O erro de migration expõe apenas nome e prefixos de hash, nunca SQL, URL ou payload clínico.

`validate:rls` passou estaticamente com 158/159 tabelas tenant-protected e uma exceção documentada. A prova descartável agora cobre isolation/access/runtime ACL `19/19` e bootstrap production-like `6/6`, incluindo roles restritas, rejeição de login unsafe e falha antes de listen/loop. Isso ainda não substitui prova do catálogo implantado com ownership, `NOBYPASSRLS`, `FORCE ROW LEVEL SECURITY`, grants efetivos, role API/worker e negativo cross-tenant. A política Vault→env também precisa de decisão explícita para production-like.

## Testing

### Passes atuais

- focused slice: 4 arquivos, 22 testes;
- API/worker process lifecycle: 2/2, incluindo SIGTERM repetido e readiness 503 durante drain;
- migration integrity PostgreSQL: 1/1, 142 migrations aplicáveis;
- RLS isolation/access governance/runtime ACL: 19/19 em PostgreSQL descartável com 176 tabelas;
- production-like runtime bootstrap: 6/6; API/worker restritos `NOBYPASSRLS`, unsafe role e schema incompleto falham fechados;
- laboratório route test: 2/2;
- marketing + staff concorrentes com `REQUIRE_TEST_DB=1`: 12/12 + 7/7;
- OpenAPI: 345 paths, 40 tags, 396 schemas;
- RLS estático: 158/159;
- Helm: validação estática; binário Helm não instalado;
- deploy check: 12 contratos PASS;
- backup/restore static checker: 2/2 testes e 11/11 checks; fixture restore drill 1/1, com 2 tabelas e 2 arquivos restaurados, listing idêntico e wall time de 13,41 s;
- parity structural contract: 4/4 testes;
- secret scan e `git diff --check`: PASS;
- build/lint/typecheck dos componentes API, worker e DB afetados: PASS; `packages/db` não possui script `typecheck`, então sua checagem atual foi feita por `tsc -b` no build;
- suíte monorepo: PASS — 70 projetos selecionados; SPA 172 arquivos/1.016 testes e API boundary 366/366; PostgreSQL de teste com `shm=1gb`, `OOM=false`, `exit=0`. A fixture adicional `db-persistence` passou 17/17 após a correção UUID/principals/contexto e permanece bounded, sem promoção dos gates globais.
- contrato CI: PASS — `unit-tests` sobe/desce PostgreSQL isolado, exige `REQUIRE_TEST_DB=1`, e os cinco serviços PostgreSQL declarados recebem `--shm-size 1g`.

### Limitação observada e correção

A execução anterior havia levado o PostgreSQL descartável a `No space left on device` ao redimensionar shared memory; o processo servidor sofreu segfault e `module-event-consumers` terminou com `Connection terminated unexpectedly`. O Compose passou a reservar 1 GiB para `postgres-test`; a repetição completa não reproduziu o crash e confirmou `OOM=false`, `exit=0`. O workflow também dimensiona os serviços PostgreSQL gerenciados pelo GitHub e obriga DB no job de suíte completa. TD-021/R-019 permanecem `BOUNDED` até a observação no runner GitHub.

## Operations

O Compose continua sendo a superfície atual de referência: PostgreSQL, Redis, runtime-role-init, migration, API, worker e SPA. API e worker agora têm lifecycle observável e `/ready` deixa de aceitar readiness durante drain. O CI executa os contratos baratos em job próprio; `repository-guards` sobe PostgreSQL isolado e executa migration integrity, RLS/roles, bootstrap production-like e clinical-financial vertical; `unit-tests` também sobe PostgreSQL e exige `REQUIRE_TEST_DB=1` para impedir falso skip de testes DB-dependent.

Ainda não há evidência de rollout com requests/jobs reais em voo, Redis failover, relógio divergente, dois workers disputando lease, backup/restore contra ambiente homolog, ou RTO/RPO de alvo medidos. O fixture local foi restaurado com sucesso em runtime descartável; isso não equivale a um drill com backup representativo.

## Migration Notes

- não editar ou apagar migrations aplicadas;
- manter `packages/db` como única trilha de aplicação;
- manter os comandos legados de `packages/shared/database` fail-closed e a SQL histórica somente como material de referência;
- manter o teste de ausência dos artefatos source-level e o build que regenera `dist/migrate.js` a partir do runner TypeScript;
- toda release deve executar checksum validation antes de qualquer migration nova;
- registrar nome, hash, release, ambiente, operador e resultado em evidência de deploy;
- a execução real desta rodada confirmou mismatch sem mutação posterior.

## Future Roadmap

1. **Harness e CI:** manter shared memory dimensionada, observar o runner remoto, limitar workspace concurrency ou separar unit/DB-heavy se necessário, e exigir `REQUIRE_TEST_DB=1` nos jobs que afirmam cobertura PostgreSQL; conservar os guardrails DB-001/DB-002.
2. **Database/RLS:** repetir no alvo a prova agora existente de roles, `NOBYPASSRLS`, ownership, FORCE RLS e cross-tenant negativo; depois validar migration nova em staging.
3. **Clínico:** repetir no ambiente alvo a prova agora consolidada Owner→Patient→Encounter→care→inpatient→billing→stock→receipt; o cenário local 11/11 já cobre a cadeia completa com registros criados via HTTP, mas ainda não substitui homologação, carga e aceite clínico-operacional.
4. **Parity:** converter cada uma das 7 áreas bloqueadas em cenário comportamental executável, com fonte Vetus, resultado e aceite.
5. **Providers:** homologar laboratório, fiscal, pagamentos, marketing e webhooks com sandbox/certificado/callback/retry/rollback.
6. **DR/Ops:** executar restore drill com backup representativo, medir RTO/RPO, retenção, storage, globals, manifest, checksums e evidência assinada.
7. **Release identity:** decidir V2→V4, canonicalizar Helm e retirar superfícies duplicadas por lotes compatíveis.
8. **Arquitetura:** extrair registries/ports da API e reduzir acoplamento SPA somente após estabilizar os contratos acima.

## Execution Ledger

| Fase            | Status       | Arquivos/artefatos                                              | Decisão                                                                     | Testes/evidência                                                                                                 | Risco                                                               | Próximo passo                                           |
| --------------- | ------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| Discovery       | DONE         | `ARCHITECTURE_AUDIT.md`                                         | comportamento executável prevalece sobre docs                               | inventário completo e baseline                                                                                   | identidade e fontes duplicadas                                      | manter mapa vivo                                        |
| Risk/PRD/SPEC   | DONE         | `RISK_REGISTER.md`, `TECHNICAL_DEBT.md`, PRD, SPEC, quality bar | primeiro slice operacional antes de refatoração ampla                       | revisão de três fronteiras                                                                                       | P0/P1 externos abertos                                              | priorizar DB/RLS/DR                                     |
| S1 migrations   | BOUNDED PASS | `migrate.ts`, helpers e testes                                  | fail-fast, sem tocar histórico aplicado                                     | unit + PostgreSQL real                                                                                           | migration nova positiva pendente                                    | testar em staging                                       |
| S2 health       | BOUNDED PASS | Compose + runtime contract test                                 | `/ready` é contrato explícito                                               | YAML/config + process evidence                                                                                   | Helm alternativo                                                    | escolher Helm owner                                     |
| S3 lifecycle    | BOUNDED PASS | API/worker + health/process tests                               | shutdown idempotente e drain                                                | 2 processos reais                                                                                                | rollout real                                                        | ensaiar staging                                         |
| CI guardrails   | BOUNDED      | workflow + CI contract test                                     | gates baratos são bloqueantes                                               | validators locais PASS                                                                                           | GitHub ainda não executado                                          | executar workflow remoto                                |
| Test harness    | BOUNDED      | `docker-compose.test.yml`, runtime contract e CI contract       | PostgreSQL recebe orçamento explícito de shared memory                      | `pnpm test` 70 projetos; `shm=1gb`, OOM=false, exit=0                                                            | capacidade do runner remoto                                         | observar GitHub e ajustar concurrency se necessário     |
| Clinical/parity | OPEN         | módulos existentes e mapas                                      | sem claim de parity por presença                                            | readiness 4/11                                                                                                   | providers e cenários ausentes                                       | jornada integrada                                       |
| DR/cutover      | BOUNDED      | scripts/checkers e fixture restore drill                        | fixture não representa backup do alvo                                       | static checks + fixture drill PASS; 2 tabelas/2 arquivos; 13,41 s wall                                           | RTO/RPO do alvo desconhecidos                                       | restore/cutover representativo                          |
| DB-001 source   | BOUNDED      | package manifests, migration-source guard, CI contract          | `packages/db` é a única trilha executável; histórico shared preservado      | guardrail PASS; focused contracts 5/5; builds dos dois pacotes; critic APPROVE                                   | migration nova positiva, target catalog e source artifacts          | staging migration positiva e reconciliação de artefatos |
| DB-002 stale    | BOUNDED      | artifact absence test, source guard, generated dist runner      | família JS/config source-level removida sem tocar SQL; dist continua gerado | RED inicial + RED de companion + GREEN 15/15; builds; `node --check`; scan de consumidores; crítica independente | migration nova positiva, target catalog, remote CI e runtime target | staging migration positiva e target RLS/DR              |

## Source Documents

- [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md)
- [RISK_REGISTER.md](./RISK_REGISTER.md)
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)
- [QUALITY_BAR.md](./QUALITY_BAR.md)
- [CVG_HIS_V4_CONSOLIDATION_PRD.md](./CVG_HIS_V4_CONSOLIDATION_PRD.md)
- [CVG_HIS_V4_CONSOLIDATION_SPEC.md](./CVG_HIS_V4_CONSOLIDATION_SPEC.md)
- [CVG_HIS_V4_CONSOLIDATION_IMPLEMENTATION_PLAN.md](./CVG_HIS_V4_CONSOLIDATION_IMPLEMENTATION_PLAN.md)

## Atualização de evidência — CVG-001 setup browser/axe — 2026-08-25

O wizard de primeiro acesso agora tem prova no artefato SPA construído: dois
testes Chromium passaram contra o servidor E2E, cobrindo formulário com nome
acessível, hints/error IDs via `aria-describedby`, Tab/foco, foco do primeiro
campo inválido, remoção dos campos de credencial após sucesso e axe WCAG
2A/2AA sem violações. O valor claro de texto auxiliar que o axe identificou
como 3,96:1 foi corrigido no token de tema claro para `#475569`, acima do
mínimo AA.

O teste intercepta status e conclusão apenas para isolar o comportamento da UI;
não é uma prova de banco. A instalação, sentinel, negativos HTTP, sessão e
revogação continuam provados separadamente no processo real PostgreSQL/two-API.
O resultado eleva UX e autorização/dados somente a `PARTIAL`; não promove
release, WCAG global, Redis, RLS/FORCE RLS de alvo, parity ou operações.

## Fechamento bounded do browser/axe — CVG-001 — 2026-08-25

O comando `pnpm test:e2e:spa:setup` passou 4/4 em Chromium contra o artefato
construído. A prova agora exige origem/URL, método, ausência de cookie e
payload exato nos caminhos de status, sucesso e retry. Também verifica foco e
Tab, nome acessível do formulário, hints/erros via `aria-describedby`,
`aria-invalid`, viewport de 390px sem overflow, axe com tags WCAG 2.1/2.2 AA e
limpeza completa de credenciais após sucesso ou erro.

O RED inicial encontrou contraste 3,96:1 no texto auxiliar do tema claro; o
token foi alterado para `#475569` e o painel contextual para texto opaco
`#f8fafc`. SetupPage 8/8, DsInput 9/9 e SPA typecheck/build passaram. O spec
foi incluído no script focado e no conjunto enterprise do CI. A segunda revisão
independente de Kepler foi `APPROVE_BOUNDED`, sem HIGH/MEDIUM.

Limite: isto é evidência local bounded do wizard, não certificação de todas as
jornadas críticas, dark theme/manual review, RLS/FORCE RLS alvo, Redis/failover,
restore/RTO-RPO, parity, cobertura, operações ou release.

## Continuação browser enterprise/clínica — 2026-08-25

O conjunto selecionado no CI passou 15/15 em Chromium, cobrindo dashboard e
exports do workbench, Busca Mestre 360 em desktop/mobile e o wizard. A jornada
crítica ponta a ponta passou 1/1 com Owner, Patient, Encounter, entrada clínica,
item de cobrança e fechamento, com cleanup. Agendamento passou 2/2 e internação
2/2.

Billing adjacente passou 5/6. A falha única ocorre na quitação em dinheiro:
o harness local padrão usa `API_DISABLE_INCOMPATIBLE_DB_REPOS=1`, portanto o
endpoint persistente de cash receipt não é instalado; a asserção final de
`R$ 0,00` não é alcançada. A tentativa com `=0` falhou no bootstrap porque o
PostgreSQL local não tinha o seed/usuário E2E (`user_admin`). A limitação é
registrada como gap de harness, sem promover o fluxo financeiro; a próxima
execução deve usar o script Docker/CI com banco seedado.

## Catálogo local FORCE RLS — 2026-08-25

O contrato de catálogo foi executado primeiro em RED contra um banco efêmero:
123 tabelas públicas com `account_id` tinham RLS habilitado, mas não tinham
`relforcerowsecurity`; `installation_state` era a única tabela sem RLS e é a
exceção global deliberada da instalação.

A migration `0144_force_rls_tenant_tables.sql` percorre o catálogo no momento
da aplicação e aplica `FORCE ROW LEVEL SECURITY` a cada tabela pública
base/particionada com `account_id`, excluindo somente `installation_state`.
O contrato verde passou 2/2 em um banco novo com migrations até `0144`.
A regressão conjunta de catálogo, isolamento RLS, ACL sensível e instalação
passou 4 arquivos e 26/26 testes; os guards de migration e `validate:rls`
continuaram verdes.

Artefato: `.agent/artifacts/CVG-002C6-force-rls-catalog-2026-08-25.md`.
O resultado é `PASS_BOUNDED` para o catálogo local. Não substitui a consulta
no PostgreSQL alvo com ownership, grants, roles `NOBYPASSRLS`, cross-tenant
negativo, staging positivo ou aceite operacional.

## Restore representativo local — 2026-08-25

O próximo gate P0 operacional foi executado pelo comando explícito
`pnpm ops:restore:drill:fixture:representative`. O perfil manteve o drill
`minimal` compatível e adicionou um caminho que aplica migrations canônicas
`0000`–`0144` em PostgreSQL descartável, cria um bundle custom com globals,
storage, manifest e checksums e valida o banco restaurado sob
`app.current_account_id`.

O comando oficial passou ponta a ponta: restaurou **176 tabelas públicas**, **3
arquivos**, confirmou `storageListingMatch=true` e passou **19 assertions** da
cadeia Owner→Patient→Encounter→internação/progresso→nota→billing→estoque→
conta financeira/recebível/ledger→outbox/audit/documento após `SET ROLE
restore_probe` (`false,false`). O relatório reteve `elapsedMs=28610`, com fases
checksum/TOC `851 ms`, startup estável `7244 ms`, restore do banco `20142 ms`,
validação `204 ms` e storage `24 ms`.

Artefato: `.agent/artifacts/CVG-002C6-restore-representative-2026-08-25.md`.
O resultado é `PASS_BOUNDED` local. Ainda não é RTO/RPO do ambiente alvo: o
bundle real/homologado, retenção, ownership/grants, failover PostgreSQL/Redis,
Game Day e aceite operacional continuam pendentes; CVG-002C6 permanece
`IN_PROGRESS`.

## Matriz comportamental de evidências — 2026-08-25

O slice CVG-003 saiu de RED com um contrato que exige uma linha para cada ID da
Quality Bar congelada. A matriz em
`docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md` cobre os 12 critérios
QB-ARC/DB/OPS/SEC/CLIN/PAR/REL/UX/ARCH e exige comportamento rejeitante,
artefato, ledger e status honesto. O teste passou 2/2, e o `repository-guards`
passou a executar o contrato com `REQUIRE_TEST_DB=1`; seu contrato de workflow
passou 4/4 após o GREEN.

Isso é uma spine de auditoria local, não um score de release: requisitos
`PARTIAL`/`BLOCKED`, parity, providers, target operations e autorização humana
continuam abertos.

## Índice dos subcritérios Gauntlet — CVG-003 — 2026-08-25

O índice complementar
[`GAUNTLET_SUBCRITERIA_EVIDENCE.md`](./GAUNTLET_SUBCRITERIA_EVIDENCE.md)
expande a spine para os 30 identificadores `QB-*` únicos presentes no
`.gauntlet/state.md`. A linha de cada subcritério combina a fonte congelada,
um comportamento rejeitante/observável, uma referência de artefato ou ledger
e o estado atual com seu limite. O critério histórico
`QB-REL-CRITICAL-HARNESS` também está incluído, evitando que uma evidência
fora da tabela principal desapareça do índice.

O contrato Node passou 2/2 após REDs controlados pela ausência do índice e pela
detecção de que uma extração somente da tabela omitia um dos 30 IDs. O
`repository-guards` agora executa o contrato, e a composição dos contratos
matrix/CI passou 2 arquivos/6 testes. O resultado é `PASS_BOUNDED` apenas
para a indexação e o guard local: `PASS_BOUNDED` não é aprovação de produto,
ambiente alvo, release ou go-live, e todos os estados pendentes continuam
explícitos. A revisão independente de Confucius foi `APPROVE_BOUNDED`, sem
finding bloqueante; testes, validadores, formatação, ledgers, diff, stage e
checagem de resíduo Docker também passaram. O programa continua
`IN_PROGRESS/PARTIAL`.

## Regressão do critical process runner — CVG-002C6 — 2026-08-25

O runner serial canônico foi repetido contra PostgreSQL descartável após as
migrations `0000`–`0144`, com oito suffixes efêmeros independentes. Passaram
setup/session `1/1`, inpatient SIGKILL/takeover `10/10`, restart
clínico-financeiro `1/1`, cash SIGKILL `1/1`, concorrência de cash `1/1`, PIX
settlement `8/8`, worker `1/1` e webhook `1/1`; total `8/8` arquivos, exit 0.

O artefato
`.agent/artifacts/CVG-002C6-critical-process-regression-2026-08-25.md`
registra tempos, isolamento e a limpeza explícita dos oito bancos criados pela
execução. Confucius retornou `APPROVE_BOUNDED`, sem inconsistência crítica,
mantendo claro que cleanup é uma etapa separada do runner. O resultado não
promove target, provider/Redis, RTO/RPO, parity, cobertura, operações ou
release.

## Suíte base crítica — CVG-002C6 — 2026-08-26

A primeira execução da suíte PostgreSQL base encontrou um RED no contrato de
marketing porque o fixture gerava `OWNER_A`/`OWNER_B` sem inserir os Owners na
conta. O comportamento de produção — validação tenant-scoped de Owner — estava
correto; a correção foi limitada ao fixture, que passou a inserir os dois
Owners. O teste focalizado passou 1/1.

A repetição da suíte `tests/integration/database` + `tests/integration/setup` +
`tests/integration/foundational.test.ts` passou **40/40 arquivos e 447/447
testes** em 698,27 s, após migrations `0000`–`0144`, contra PostgreSQL
descartável. O banco da execução foi removido explicitamente e não restaram
bancos do suffix nem containers relacionados a critical-process/restore.

Artefato: `.agent/artifacts/CVG-002C6-critical-base-regression-2026-08-26.md`.
Confucius retornou `APPROVE_BOUNDED` sem finding crítico; a revisão confirmou
o comando, a alteração delimitada e os limites, observando que o artefato não
anexa stdout bruto para uma segunda verificação independente dos números
agregados. A evidência é `PASS_BOUNDED` local e não promove target, providers,
Redis/failover, RTO/RPO, parity, WCAG/cobertura global, operações ou release.

## Reconciliação da spine de evidências — CVG-003 — 2026-08-26

Após a suíte base crítica, a matriz de requisitos e o índice subordinado
Gauntlet passaram a citar o novo artefato nos critérios
`QB-CLIN-01`/`QB-CORE-01` e `QB-REL-01`. Os estados honestos não foram
promovidos: `PARTIAL` e `BOUNDED PASS` permanecem explícitos.

O contrato combinado matriz/CI passou 2 arquivos e 6 testes em 52,07 s; o
contrato Node do índice passou 2/2; Prettier ficou verde; e o banco descartável
foi removido explicitamente. Artefato:
`.agent/artifacts/CVG-003-evidence-spine-reconciliation-2026-08-26.md`.

Confucius retornou `APPROVE_BOUNDED` depois de uma correção de precisão que
separou a mudança documental da superfície de contratos read-only já existente.
Nenhum código de produção, workflow ou comportamento de produto foi alterado;
target, providers/Redis, RTO/RPO, parity, cobertura, operações e release
continuam abertos.

## CVG-003 — access-control/audit/cache hardening — 2026-08-26

O crítico independente encontrou primeiro uma corrida real: a hidratação de
autorização lia dados e token de mudança em transações concorrentes e podia
publicar um cache stale como fresh. O GREEN passou a ler o token antes/depois
da carga, repetir quando a conta muda durante a leitura e coalescer
hidratações concorrentes por conta. Assim, uma hidratação antiga não pode
terminar depois de uma nova e sobrescrever uma revogação.

O slice também fechou o caminho de auditoria de access-control: mutations
aguardam audit persistente, o estado pendente falha fechado durante a
transação, rollback/commit reidratam somente depois do boundary transacional,
outage de privilégio retorna `503` e a próxima leitura saudável recupera o
estado. Entradas de memberships e filtros repetidos têm limites explícitos.
O caminho Vault prod-like sem configuração falha fechado; dev/test mantém
fallback apenas com warning explícito.

Evidência fresca: access-control **32/32**, API **373/373**, build/typecheck
afetados verdes e vertical HTTP PostgreSQL descartável **14/14**. A vertical
cobre rollback de audit e retry, propagação na segunda API, `503` durante
revogação de privilégio e `403` em endpoint protegido após revogação
cross-instance. O artefato é
`.agent/artifacts/CVG-003-access-control-audit-cache-2026-08-26.md`.

Turing fez revisão independente read-only do tree final e retornou
`APPROVE_BOUNDED`, sem finding material. O resultado permanece bounded local:
ownership/grants e cross-tenant no PostgreSQL alvo, Redis/failover, provider,
RTO/RPO, CI remoto, parity, cobertura, operações, release e go-live continuam
abertos; `QB-SEC-01` permanece `PARTIAL`. Não houve commit, push, staging ou
produção.

## CVG-003 — identidade de release e guard da superfície de deploy — 2026-08-26

O gap selecionado nesta rodada foi a divergência entre o chart Helm canônico em
`infra/helm/cvg-his-v2` e a árvore histórica `charts/helm`. O segundo README
oferecia comandos de instalação e documentava `/health/startup`, rota que não
existe no contrato da API. O scan de consumidores não encontrou uso do track
legado em CI, scripts ativos, package scripts ou Compose.

A contenção adotada foi incremental: registrar
`docs/engineering/RELEASE_IDENTITY.md`, declarar `infra/helm/cvg-his-v2` como
única superfície canônica, marcar `charts/helm` como legado e retirar suas
instruções executáveis/stale. O package metadata passou a identificar o
repositório V4, o README raiz passou a usar links relativos e o
`repository-guards` executa `pnpm validate:deploy-surface`. Nenhum arquivo
legado foi apagado e não houve rename global V2→V4.

Evidência local fresca:

- `pnpm validate:deploy-surface`: PASS, 68 arquivos escaneados; um fixture
  ativo com `helm lint charts/helm/umbrella` foi rejeitado;
- contrato Vitest focalizado: 2 arquivos/6 testes verdes, com PostgreSQL
  descartável e migrations 0000–0144 durante o setup;
- `pnpm validate:helm`: PASS estático para dev/staging/prod, com Helm binário
  ausente;
- `pnpm deploy:check`: 12/12 verificações verdes;
- `pnpm validate:openapi`: 345 paths, 40 tags e 396 schemas válidos;
- YAML do workflow, package JSON e `git diff --check`: válidos/verdes.

Artefato: `.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`.
Ledgers: `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-001` e
`VFY-CVG-003-RELEASE-IDENTITY-SURFACE-FINAL-001`.

Não houve revisão independente nova nesta fatia: os scouts Spark falharam por
quota, o reviewer codex não era suportado e dois reviewers default foram
encerrados sem retorno. A leitura temporal do lead foi usada apenas como
inspeção local, não como aprovação independente. O resultado é
`PASS_BOUNDED` para o control-plane local; o programa global continua
`IN_PROGRESS/PARTIAL`. Helm executável, cluster/target, CI remoto, rollout e
rollback, identidade observada de imagem/porta, remoção/alinhamento do legado,
providers, Redis, RTO/RPO, parity, cobertura e go-live permanecem abertos.

## CVG-003 — gate executável de Helm e CI fail-closed — 2026-08-26

A revisão do slice de deploy encontrou uma lacuna concreta: sem o binário Helm,
validate:helm podia retornar sucesso somente com verificações estáticas. O
validator agora distingue esse fallback local do modo obrigatório
REQUIRE_HELM=1; nesse modo, ausência do executável ou versão diferente de
v3.15.4 falha.

O repository-guards instala Helm v3.15.4 a partir do arquivo oficial, verifica
o SHA-256 pinado
11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9 e executa o
validator obrigatório. O guard de superfície exige a versão, o checksum, a
verificação e o comando fail-closed. O teste de PATH vazio foi RED antes da
implementação e GREEN depois; a regressão de overlay continua coberta.

Evidência fresca:

- node --test tests/unit/infra/validate-helm-script.test.mjs: 4/4, incluindo
  checks estáticos antes do render e rejeição de v3.15.40;
- Helm v3.15.4 executável isolado + REQUIRE_HELM=1 pnpm validate:helm:
  checks estáticos e lint/template passaram para dev/staging/prod;
- tests/unit/infra/ci-contract.test.ts: 4/4;
- tests/unit/infra/deploy-surface-of-truth.test.ts: 4/4;
- pnpm validate:deploy-surface: PASS, 68 arquivos;
- checksum oficial, YAML, sintaxe e diff: PASS.

Artefato:
.agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md.
Ledgers VFY-CVG-003-HELM-EXECUTABLE-001 e
VFY-CVG-003-HELM-EXECUTABLE-FINAL-001.

O resultado é PASS_BOUNDED para o control plane local/CI declarado. A revisão
independente inicial encontrou os dois gaps acima; ambos foram corrigidos e
testados. O follow-up ainda está pendente e não é tratado como aprovação.
GitHub Actions, cluster target, identidade de imagem/porta,
rollout/rollback, target RLS/restore, providers, Redis, parity, cobertura e
go-live continuam abertos; nenhuma alteração externa foi feita.

## Addendum final — gate executável de Helm — 2026-08-26

Após a crítica independente, o validator passou a usar `HELM_BIN` de forma
consistente, exigir a versão exata v3.15.4 com metadata válida e testar
static-before-render. O contrato Node passou 5/5; os contratos CI e
deploy-surface passaram 8/8; Helm oficial com SHA pinado passou lint/template
em dev, staging e prod; deploy-surface, deploy-check, OpenAPI, YAML, Prettier
e diff passaram. O resultado é `PASS_BOUNDED` para o control plane local e a
configuração declarada do CI. Averroes retornou `CONDITIONAL PASS`: os
achados HIGH/MEDIUM foram resolvidos, com apenas a ressalva menor de
constantes duplicadas e do worktree untracked. GitHub remoto, cluster target,
identidade, rollout/rollback, providers, Redis, RTO/RPO, parity, coverage e
go-live permanecem abertos.

## Addendum final — acesso, guardas assíncronas e restore seguro — 2026-08-26

O próximo gap P0 local foi a fronteira entre hidratação de autorização,
revogação cross-instance e o restore drill. O access-control passou a manter
snapshots por conta, invalidar gerações em voo e negar durante hidratação
invalidada; o servidor passou a aguardar o refresh final de token, a sessão
fresca e a verificação final de acesso em todas as rotas protegidas. A
varredura independente encontrou 406 chamadas em módulos de rotas e 79 no
servidor, todas aguardadas, sem `await` em função não assíncrona ou caminho
ternário não aguardado.

O restore fixture agora usa senha por execução, artefatos privados,
`pg_dumpall --no-role-passwords` e redaction de credenciais. O storage archive
é validado antes da extração contra traversal, caminhos absolutos, caracteres
de controle, links, devices e tipos não suportados; a extração ocorre em
workspace temporário mode 0700, com rejeição explícita de destino symlink.

Evidência local fresca:

- access-control: 35/35 testes e typecheck do módulo;
- API typecheck e webhook contract: 2/2;
- revogação interleaved cross-instance: 1 teste aprovado, 14 ignorados no
  arquivo; revogação sequencial: 1 aprovado, 13 ignorados;
- restore fixture/security contracts: 13/13; `bash -n`: PASS;
- representative restore: 176 tabelas públicas, 3 arquivos de storage e
  19/19 assertions, com `restore_probe` sem superuser e sem bypass de RLS;
- security enterprise/secrets, backup, RLS, migration-source,
  deploy-surface, API typecheck, `git diff --check` e staging vazio: PASS.

Hooke e Averroes retornaram `PASS` após a correção do risco TOCTOU do destino
de extração e da tipagem/await dos webhooks. O resultado é
`PASS_BOUNDED` para a implementação e o control plane local. Permanece uma
limitação arquitetural explícita: uma revogação commitada depois da leitura
final do guard e antes de uma escrita protegida do handler requer
linearização por transação/versionamento no banco, ainda não implementada.

Artefato: `.agent/artifacts/CVG-003-access-restore-security-2026-08-26.md`.
Ledgers: `VFY-CVG-003-ACCESS-RESTORE-SECURITY-001`,
`VFY-CVG-003-AUTH-GUARD-INTERLEAVED-001`,
`VFY-CVG-003-SECURITY-GATES-001` e
`VFY-CVG-003-ACCESS-RESTORE-SECURITY-FINAL-001`.

O readiness global continua honesto em 98/100 de cobertura de evidência,
4/11 áreas Vetus verificadas e paridade funcional `NOT VERIFIED`. Providers,
fiscal municipal, pagamentos, marketing, relatórios Vetus restantes,
admin/LGPD, Live Pet/Live Lab, importação/reconciliação, CI remoto, backup e
deploy reais, operações, cobertura e release permanecem abertos. Nenhum
commit, push, staging, deploy ou sistema de produção foi tocado.

### Follow-up de consumo SPA — 2026-08-26

Uma auditoria final dos consumidores encontrou e fechou a busca local da
lista geral de laudos: `LaboratoryResultsPage` agora pesquisa também
parâmetro, valor, unidade e referência estruturados, preservando o resumo
legado e a normalização sem acentos. O teste dedicado passou 5/5; a suíte
analítica permaneceu 7/7 e o typecheck da SPA permaneceu verde. O follow-up
independente não encontrou novo problema. Esta correção permanece dentro do
mesmo `PASS_BOUNDED` local e não altera os bloqueadores de provider,
homologação ou paridade global.

## Addendum — structured laboratory result values — 2026-08-26

O slice seguinte de CVG-004 fechou a lacuna entre o resultado laboratorial
livre-texto e as páginas analíticas especializadas. `resultValues` agora é um
contrato compartilhado, limitado a 200 valores validados e imutáveis, com
parâmetro, valor, unidade, referência e indicador de fora da faixa. A migração
0145 adiciona JSONB nullable em `diagnostic_orders` e
`diagnostic_order_workflows`, faz o backfill seguro do workflow e impõe shape
de array no banco.

O serviço inclui os valores na assinatura/idempotência, preserva o contexto de
tenant, reidrata a mesma informação após restart/consulta e limpa valores
clínicos ao iniciar recolhimento. A API e o OpenAPI projetam o contrato; o
relatório imprimível escapa todas as células estruturadas. Hemograma,
bioquímica e urina usam dados estruturados primeiro e o parser do
`resultSummary` como fallback de compatibilidade. A busca `body/corpo` inclui
parâmetro, valor, unidade e referência, com normalização accent-insensitive
também no servidor.

Evidência local fresca: diagnostics 30 passados/1 skip na seleção do pacote,
PostgreSQL 1/1 com migrations 0000–0145, rotas API 21/21, páginas SPA 7/7,
typecheck/build da API, diagnostics e SPA, OpenAPI 345 paths/40 tags/397
schemas, migration-source e diff check. A primeira revisão independente
encontrou três achados MEDIUM; todos foram corrigidos. O follow-up encontrou a
inconsistência LOW de acentos, corrigida com teste RED/GREEN para
`pH urinário`/`corpo=urinario`, e retornou `PASS` sem achados
CRITICAL/HIGH/MEDIUM restantes.

Artefato: `.agent/artifacts/CVG-004-laboratory-structured-results-2026-08-26.md`.
Ledgers: `VFY-CVG-004-LAB-STRUCTURED-RESULTS-001`,
`VFY-CVG-004-LAB-STRUCTURED-RESULTS-FINAL-001` e
`VFY-CVG-004-LAB-STRUCTURED-RESULTS-REVIEW-001` e
`VFY-CVG-004-LAB-SPA-CONSUMER-FINAL-001`.

O resultado é `PASS_BOUNDED` somente para a capacidade local estruturada. A
auditoria geral continua em 4/11 áreas Vetus verificadas e paridade funcional
`NOT VERIFIED`; a clínica continua 2/3, com provider/homologação laboratorial
bloqueados. Readiness permanece 95/100 até evidência de provider, target,
backup/restore, CI remoto, RTO/RPO, operações, cobertura e release. Nenhum
commit, push, staging, deploy ou sistema de produção foi tocado.

## Addendum — transaction-level authorization linearization — 2026-08-26

O gap P0 seguinte de CVG-003 era a janela entre a leitura final de autorização
e a escrita protegida do handler: uma revogação concorrente ainda poderia
comitar nessa janela. O slice autorizado adiciona um helper fail-closed no
`packages/shared/database`, que exige o tenant unit of work ativo, valida a
conta e adquire `pg_advisory_xact_lock(hashtextextended(account_id, 0))` antes
do `ensureFreshForRequest` final em `requirePrincipal`. O lock é liberado pelo
PostgreSQL no commit ou rollback; leituras e caminhos SQL/admin diretos não
foram alterados.

O TDD RED falhou antes da implementação e a corrida real, com duas instâncias
HTTP e PostgreSQL descartável, mostrou a revogação comitar sob a implementação
anterior. Depois da correção, os controles de transação passaram 8/8, a API
passou 374/374, e a corrida determinística passou 1/1 selecionada (15 testes
do arquivo ficaram intencionalmente não selecionados). A revisão independente
de Parfit retornou `PASS`, sem achados Critical/High/Medium. O teardown remove
o trigger exatamente de `inventory_purchases`, e a prova espera as chaves de
lock específicas, sem sleeps fixos ou varredura global.

O resultado é `PASS_BOUNDED` apenas para writes protegidos que entram no UoW
canônico da aplicação. Não promove CVG-003, a paridade geral ou readiness:
continuam abertos target/RLS e restore reais, providers/homologação, Redis,
CI remoto, os demais journeys Vetus, coverage, operações e release. O estado
honesto permanece 4/11 áreas Vetus gerais, clínica 2/3 e readiness 95/100;
nenhum commit, push, staging, deploy ou sistema de produção foi tocado.

Artefatos: `.agent/tasks/CVG-003-auth-linearization.md`,
`.agent/gates/implementation-ready-CVG-003-auth-linearization.json` e
`.agent/artifacts/CVG-003-auth-linearization-2026-08-26.md`.

## Addendum — relatório server-side de Cheques — 2026-08-26

O controle bounded seguinte de CVG-004 foi corrigido após a revisão do primeiro
desenho client-side. O workbench não hidrata mais cada comanda em N+1 nem
infere vencimento ou situação a partir de notas. A definição `financial-cheques`
agora usa a fonte persistida `counter_sale_payments`, com `method = 'check'`,
join account-scoped à comanda e filtros de período sobre `created_at` do
pagamento. A API projeta somente pagamento, comanda, status da comanda,
referência, valor, parcelas, registro e observações.

Execução e CSV passam pelo ReportsService server-side existente e pelas
auditorias de execução/exportação. O query usa intervalo half-open UTC e limite
defensivo de 10.000 linhas, lendo no máximo uma linha além do limite para
rejeitar snapshots excessivos antes da persistência. A SPA mantém a ordem de
colunas do catálogo, expõe caption programático, valida a resposta, limpa
linhas/sucesso antes do refresh e mostra erro em falha ou payload inválido.

Evidência local fresca: módulo counter-sales com os controles de isolamento,
boundary de milissegundo final e cardinalidade; reports 12/12; rotas compiladas
11/11; workbench 34/34; API 375/375; builds/typechecks API, módulos e SPA;
OpenAPI 345 paths/40 tags/397 schemas; security/secrets, migration-source,
deploy-surface e diff check verdes. O parecer independente final é registrado
em `VFY-CVG-004-REPORT-CHEQUES-REVIEW-001`.

O resultado é `PASS_BOUNDED` somente para este recorte local. A rota Vetus
completa de Cheques, criação/baixa/devolução, banco, vencimento, conciliação,
Pagamento Antecipado, providers, target, CI remoto, restore/RTO-RPO, cobertura,
operações, acessibilidade global, parity e release permanecem abertos. A
paridade geral mais recente continua em 98/100 de evidência e 4/11 áreas
verificadas; a clínica está em 2/3 e readiness em 95/100. Nenhum commit, push,
staging, deploy ou sistema de produção foi tocado.

## Addendum — worker agendado do relatório de Cheques — 2026-08-26

A continuação bounded de CVG-004 fechou a fonte local do worker para
`financial-cheques`. O job agora resolve o mesmo fato persistido de
`counter_sale_payments` usado pela API, encaminha `dateFrom`/`dateTo` do
agendamento, projeta somente as colunas catalogadas e falha fechado quando a
fonte não está configurada. O bootstrap reutiliza o `CounterSalesService`
tenant-aware já existente para a fonte comercial e para Cheques.

O TDD RED falhou no typecheck antes da extensão `cheques`; um RED posterior
também capturou filtro de data numérico antes da validação estrita. O GREEN
passou o pacote completo do worker (23 testes do runner e as suítes auxiliares)
e o processo one-shot PostgreSQL 6/6, incluindo uma comanda e um pagamento
`check` persistidos e a execução do relatório confirmada no banco. O job também
foi corrigido para não criar delivery sem `executionId` quando a fonte falha
antes da execução; falhas pós-execução continuam no caminho de retry. Formatação
e `git diff --check` também passaram.

Este resultado é `PASS_BOUNDED` somente para a execução local agendada do
relatório de Cheques. Não prova entrega com provider externo, nem fecha
Pagamento Antecipado, cadastros/personalizados, demais relatórios Vetus,
provider/homologação, target, restart/concurrency/failure no ambiente-alvo,
CI remoto, restore/RTO-RPO, acessibilidade, cobertura, operações ou release.
Paridade geral, clínica e readiness permanecem abertos.

Artefato: `.agent/artifacts/CVG-004-reports-cheques-worker-2026-08-26.md`.

## Addendum — fila de compras persistidas na SPA — 2026-08-26

A página de Compras deixou de tratar a fila como somente preparada/sugerida:
ela agora carrega o contrato persistido de `GET /inventory/purchases` em
escopo de conta, projeta linhas e situações sem inventar fatos ausentes,
calcula o valor em aberto a partir de `totalAmount - receivedAmount` e limpa
linhas derivadas quando a consulta falha. O botão `Abrir` aponta para uma nova
rota read-only de detalhe que exibe todas as linhas persistidas, totais,
status, timestamps de auditoria, estado missing e retry.

O RED ocorreu antes de a página consumir `listPurchases`; o GREEN passou a
suíte de inventário da SPA com 25 arquivos/103 testes, typecheck/build e o
E2E focado fila→detalhe 1/1. O módulo de inventário existente passou 24/24 e
os checks de OpenAPI (345/40/397), segurança, secrets, migration-source,
deploy-surface, Prettier e diff check passaram. A prova browser usa stub da
API e demonstra contrato/navegação; não reivindica persistência PostgreSQL
browser, dois tenants, restart, concurrency ou failure injection.

Este é `PASS_BOUNDED` somente para a integração local da fila. Não fecha a
paridade Vetus de Compras nem CVG-004: a auditoria geral permanece 98/100 de
evidência, 4/11 áreas verificadas e `NOT VERIFIED`; clínica 2/3 e readiness
95/100 com 42 PASS, 3 WARN e 1 FAIL. Pagamento Antecipado,
cadastros/personalizados, famílias restantes, provider/homologação, target,
backup/restore RTO/RPO, CI remoto, coverage, acessibilidade ampla, operações
e release continuam abertos. Nenhum commit, push, staging, deploy, provider,
target ou produção foi tocado.

Artefato: `.agent/artifacts/CVG-004-inventory-purchases-spa-2026-08-26.md`.

Duas revisões independentes do ciclo encontraram e levaram à correção de
problemas Medium no cálculo de aberto, na navegação para detalhe e no estado
de erro/retry. Tentativas posteriores de parecer final estreito não
retornaram e foram encerradas; não são contadas como aprovação independente.

## Addendum — exports auditados de cadastros — 2026-08-26

O recorte seguinte de CVG-004 fechou somente os exports server-side auditados
dos cadastros persistidos de Clientes e Animais. `registration-owners` exige
`owners.read` e `registration-patients` exige `patients.read`; ambos passam
por `billing.read`, filtram a fonte existente por `accountId` e aceitam apenas
datas ISO válidas em `createdAt`. A API usa o limite defensivo de 10.000 linhas
e projeta somente fatos armazenados, deixando campos opcionais vazios.

A SPA mantém suas tabelas read-only, mas os botões agora executam os ids de
relatório no ReportsService e baixam o CSV produzido pelo caminho auditado de
execução/exportação. O RED ocorreu na ausência da ação SPA e da definição API.
O GREEN passou Reports 13/13, rotas API compiladas 12/12, workbench 35/35,
typechecks/builds e Playwright 2/2; o browser verificou as requisições de
execução e exportação usando stubs de API.

O resultado é `PASS_BOUNDED` somente para estes dois cadastros. Serviços,
fornecedores, Pagamento Antecipado, personalizados e demais famílias Vetus
continuam abertos, assim como PostgreSQL browser real, dois tenants,
restart/concurrency/failure, providers, target, backup/restore, CI remoto,
coverage, acessibilidade, operações e release. O reviewer especializado foi
rejeitado pela política de modelo e a tentativa default expirou sem parecer;
nenhum PASS de agente é inferido. Nenhum commit, push, staging, deploy,
provider, credencial, target ou produção foi tocado.

## Addendum — reparo do contexto transacional do consumo de estoque — 2026-08-26

A regressão do fluxo crítico encontrou um defeito real na composição do
monólito modular: o fallback sem chave de idempotência do `tenant-command`
abria a transação por conta, mas não instalava o `TenantTransactionContext`
exigido pelo guard de consumo de estoque. O comportamento correto era falhar
fechado; o efeito observado foi `503 TRANSACTION_REQUIRED` no Flow 7.

O TDD RED foi preservado no teste de metadata e no primeiro run crítico
10/11. O GREEN encaminha actor/correlation metadata por
`apps/api/src/helpers/tenant-command.ts`, pelos composition roots da API, e
por `packages/shared/database/src/client.ts` até o helper existente de
contexto transacional. Não houve alteração de migration, schema, payload ou
provider.

Regressão fresca: helper compilado 8/8, API 383/383, Flow 7 1/1, fluxo crítico
11/11, SPA Docker PostgreSQL/Redis 64/64, typecheck e lint completos, cobertura
1.948 pass/1 skip em 82,06% statements, 80,06% branches, 88,53% functions e
82,06% lines; OpenAPI, RLS, secrets, migration source-of-truth e deploy surface
também passaram. Os fluxos SPA incluíram o seed de `admin_b` e `reception`,
portanto a nota anterior sobre ausência de `admin_b` foi corrigida no contrato
de paridade.

Este checkpoint é `PASS_BOUNDED` apenas para o fallback transacional do
consumo de estoque e para a matriz local exercitada. Não fecha CVG-004,
paridade geral/clínica, todos os sete perfis, LGPD/governança operacional,
target, Redis failover, providers, backup/restore, CI remoto, operações ou
release. A revisão independente não esteve disponível; nenhum PASS de agente
foi inferido. Nenhum commit, push, staging, deploy, provider, credencial,
target ou produção foi tocado.

Artefatos: `.agent/tasks/CVG-004-inventory-consumption-transaction-context.md`,
`.agent/artifacts/CVG-004-inventory-consumption-transaction-context-2026-08-26.md`,
`.agent/artifacts/CVG-004-access-matrix-e2e-2026-08-26.md` e
`.agent/gates/verified-CVG-004-inventory-consumption-transaction-context.json`.

## Addendum — ciclo de escrita do Pagamento Antecipado — 2026-08-26

O slice autorizado e delimitado de escrita foi reconciliado como
`PASS_BOUNDED`. Ele implementa emissão manual em
`POST /finance/advance-payments` e compensação append-only em
`POST /finance/advance-payments/:id/allocations`, com `billing.manage`,
centavos inteiros de BRL, identidade de tenant/ator derivada no servidor,
Idempotency-Key, tenant UoW, auditoria/outbox na mesma transação e proteção de
over-allocation no PostgreSQL. O Finance usa os fatos persistidos do ledger
0148 e não usa mais `OwnerSummary.financialProfile.creditBalance` como fonte
financeira.

As evidências frescas passaram API 5/5 e 394/394, SPA focado 7/7 e completo
1.036/1.036, PostgreSQL descartável 7/7, typecheck, lint, build, cobertura
oficial de 1.954 pass/1 skip (82,09% statements; 80,07% branches; 88,53%
functions; 82,09% lines), OpenAPI, RLS, source-of-truth de migrations,
deploy-surface, Helm estático, secrets, segurança de dependências e contrato
de paridade. O TDD reproduziu e corrigiu o escape de `URIError` em UUID com
percent-encoding inválido e a conversão insegura de bigint persistido.

Este resultado é local e limitado: não fecha cancelamento, estorno, reversão,
vínculo bancário/caixa/PIX, diário contábil, liquidação de recebíveis,
providers, import/backfill, target, acessibilidade, operações, CI remoto ou
release. A prontidão global continua 95/100 (42 PASS, 3 WARN, 1 FAIL), com
paridade Vetus geral 4/11 verificada; portanto CVG-004 e o programa global
permanecem `IN_PROGRESS/PARTIAL`. O explorador independente ficou indisponível
por limite de uso do modelo e nenhuma aprovação de reviewer é alegada. Não
houve commit, push, staging, deploy, provider, target, credencial ou mutação
em produção.

Artefatos: `.agent/tasks/CVG-004-advance-payment-write-lifecycle.md`,
`.agent/gates/verified-CVG-004-advance-payment-write.json` e
`.agent/artifacts/CVG-004-advance-payment-write-2026-08-26.md`.

## Addendum — integridade bounded da importação Vetus — 2026-08-26

O slice local de integridade do importador Vetus foi reconciliado como
`PASS_BOUNDED`. A migration canônica aditiva `0149` acrescenta fingerprints
SHA-256 internos e nulos aos fatos persistidos das migrations `0098` e `0102`.
O fingerprint é calculado sobre o comando normalizado; replay idêntico mantém
idempotência, divergência de referência de fonte — no import unitário, lote ou
item — retorna `409`, e o hash não é exposto em respostas públicas.

A aquisição de referência usa lock advisory transacional e `FOR UPDATE` no
mesmo tenant UoW, preservando os índices únicos existentes. O lote mantém a
identidade original de cada linha rejeitada ao retomar, impede mudança de
identidade/modo em lote concluído, suporta dry-run/rollback e rejeita resposta
acima do orçamento antes da auditoria final. O teste HTTP autenticado aplicou
as migrations até `0149` em PostgreSQL descartável e passou `7/7` com duas
instâncias da API, incluindo replay na segunda instância, conflito atômico,
concorrência e isolamento entre tenants.

O ciclo de recuperação pós-commit/pós-rollback agora reconcilia owners,
patients e audit; refreshes da mesma conta são serializados, e
`Promise.allSettled` impede liberar a fila enquanto um snapshot irmão ainda
está terminando após uma falha. A checagem final de response-budget ocorre
antes de `appendAudit`, evitando phantom audit em falha tardia. O RED/GREEN
focused route/cache/UoW passou `25/25`; a API completa passou `401/401`, o
typecheck/lint passou em 70 projetos e a cobertura oficial ficou em 81,98%
statements, 80,08% branches, 88,56% functions e 81,98% lines. Migration
source-of-truth, RLS, OpenAPI, deploy-surface, Helm estático, secrets e
dependências também passaram. A revisão independente final retornou
`PASS_BOUNDED` sem achados High/Medium atuais.

Este resultado é somente o bounded control plane local: não comprova as onze
jornadas Vetus, navegador E2E, reconciliação externa, Live Pet/Live Lab,
providers, target, worker distribuído, backup/restore, CI remoto,
acessibilidade, operações ou release. A auditoria geral permanece 98/100 com
4/11 áreas verificadas; a clínica permanece 100/100 com 2/3, e enterprise
readiness permanece 95/100 (42 PASS, 3 WARN, 1 FAIL). Nenhum import-specific
outbox event foi alegado neste slice. Não houve commit, push, staging, deploy,
provider, credencial, target, produção ou mutação externa.

Artefatos: `.agent/tasks/CVG-004-vetus-import-integrity.md`,
`.agent/gates/verified-CVG-004-vetus-import-integrity.json`,
`.agent/artifacts/CVG-004-vetus-import-integrity-2026-08-26.md`,
`.agent/verification.jsonl#VFY-CVG-004-VETUS-IMPORT-INTEGRITY-FINAL-001` e
`tests/integration/database/vetus-import-http-postgres.test.ts`.

## Addendum — composição bounded de PIX assinado sintético — 2026-08-26

A composição local `CVG-002B2B` foi reconciliada como `PASS_BOUNDED`, com
confiança `HIGH` e risco residual `HIGH`. O fluxo comprovado foi HTTP real com
HMAC do raw body → recibo e delivery duráveis → processo worker real sob papel
runtime restrito → service principal não interativo → B1 compartilhado →
billing/attempt/PIX, receipt, journal, audit, outbox e conclusão do delivery.

O primeiro callback e seu replay byte a byte retornaram `202`; um payload do
tenant B assinado com a chave do tenant A retornou `400` sem ingress para B. O
evento inicialmente não correlacionado foi retentado como `PIX_NOT_CORRELATED`
e, após a correlação do attempt/PIX, liquidou uma única vez. A prova confirmou
ausência de efeitos financeiros em B. A matriz independente de processos
passou `8/8` com `SIGKILL` nos pontos de claim/B1/CAS e takeover/fencing de
processo stale.

As correções RED/GREEN removeram `FOR UPDATE` incompatível com o papel API
SELECT-only, bloquearam `production`, `prod`, `staging`, `stage` e
`NODE_ENV` production-like para a capacidade sintética, adicionaram readiness
de schema/RLS/ACL no worker e serializaram a leitura do service principal com o
mesmo advisory lock das revogações protegidas. A readiness final valida as
policies vinculadas às tabelas, `ALL`, predicados tenant exatos e colunas,
constraints e índices requeridos, incluindo `created_at` da delivery. Fixtures
são transacionais, usam exact cents e o teardown destrutivo exige
`TEST_DB_EPHEMERAL=1`; no modo explicitamente não-efêmero, global-setup e
db-admin preservam o banco sem reset, criação, migrations, seed, grants ou
drop e as suites/hooks processuais ficam skipped.

Evidência fresca: unit `80/80`, ingress PostgreSQL `11/11`, HTTP `14/14`,
HTTP→PostgreSQL `2/2`, composição real `1/1`, consumer PostgreSQL `7/7`,
SIGKILL/restart `8/8`, worker `71/71`, API `401/401` e cobertura oficial
`1.956 passed / 1 skipped` em 81,98% statements, 80,08% branches, 88,56%
functions e 81,98% lines. O smoke explícito não-efêmero passou com as três
suites processuais skipped (`16 skipped`), registrando que global-setup não
resetou, migrou, seedou, concedeu grants ou dropou o banco. Typecheck, ESLint,
Prettier e `git diff --check` passaram.

O resultado permanece limitado: testes dedicados de todos os failpoints B1,
composição com dois workers vivos, matriz completa de login/cache/MFA,
providers reais, target, operações e release continuam abertos. Um escritor
SQL privilegiado fora dos papéis runtime ainda pode ignorar o advisory lock;
esse protocolo deve ser imposto e revalidado antes da operação produtiva.

Os gates globais foram retestados e continuam abertos: paridade geral `98/100`
com `4/11` áreas verificadas, paridade clínica `100/100` com `2/3`, e
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Não houve commit,
push, deploy, provider, credencial, target ou mutação externa.

Artefatos: `.agent/tasks/CVG-002B2B.md`,
`.agent/gates/verified-CVG-002B2B-signed-pix-composition.json`,
`.agent/artifacts/CVG-002B2B-signed-pix-composition-2026-08-26.md`,
`.agent/verification.jsonl#VFY-CVG-002B2B-SIGNED-PIX-FINAL-001`,
`.agent/verification.jsonl#VFY-CVG-002B2B-SIGNED-PIX-REVIEW-001` e
`tests/integration/process/pix-provider-webhook-settlement-e2e.test.ts`.

## Addendum — isolamento tenant da coleção de prescrições — 2026-08-26

O slice `CVG-003-PRESCRIPTION-TENANT-ISOLATION` foi reconciliado como
`PASS_BOUNDED`. A rota autenticada `GET /prescriptions` agora deriva o tenant
exclusivamente do principal e encaminha o `AccountId` obrigatório para os
filtros por `encounterId` e `patientId`; contexto ausente ou filtro explícito
vazio falha fechado. Isso corrige a exposição possível quando o runtime
hidrata prescrições de múltiplas contas com identificadores clínicos iguais.

O RED reproduziu dois registros no retorno de uma conta onde o contrato exigia
um. O GREEN foi coberto por hidratação de duas contas no mesmo serviço, testes
unitários de isolamento/fail-closed e integração HTTP-shaped. A suíte focada
passou `37/37`, o módulo `32/32`, a API compilada `401/401`, typecheck,
Prettier, ESLint e `git diff --check`; a cobertura oficial passou `1.959` com
`1` skip em `81,98%` statements, `80,08%` branches, `88,56%` functions e
`81,98%` lines. A revisão independente final retornou `PASS_BOUNDED` sem
achados bloqueantes Critical/High/Medium/Low.

O resultado é restrito à fronteira de serviço/HTTP em repositório local; não
alega prova PostgreSQL específica dessa consulta, RLS de target, todas as
rotas clínicas, escritores SQL privilegiados, providers, acessibilidade,
operações, paridade ou release. Os gates globais permanecem não promovidos:
paridade geral `98/100` (`4/11`), clínica `100/100` (`2/3`) e enterprise
readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Não houve commit, push,
deploy, provider, target, credencial, produção ou mutação externa.

Artefatos: `.agent/tasks/CVG-003-prescription-tenant-isolation.md`,
`.agent/gates/verified-CVG-003-prescription-tenant-isolation.json`,
`.agent/artifacts/CVG-003-prescription-tenant-isolation-2026-08-26.md` e
`.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-TENANT-ISOLATION-FINAL-001`.

## Addendum — isolamento tenant da coleção de execuções de prescrição — 2026-08-26

O slice `CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION` foi reconciliado
como `PASS_BOUNDED`. `PrescriptionExecutionsService` agora exige `AccountId`
nos filtros por encontro/paciente e falha fechado quando o contexto runtime
está ausente. A rota autenticada usa somente o tenant do principal e rejeita
filtros vazios antes de cair na lista da conta.

O RED capturou as duas falhas: ausência de contexto não lançava
`ValidationError`, e `encounterId=` ampliava indevidamente a consulta. O GREEN
passou unit `15/15`, rota `2/2`, integração HTTP-shaped `1/1`, API completa
`402/402`, typechecks, Prettier, ESLint e `git diff --check`. A suíte oficial
passou `1.960` testes com `1` skip, mantendo `81,98%` statements, `80,08%`
branches, `88,56%` functions e `81,98%` lines. O teste unitário persiste e
hidrata duas contas com identificadores clínicos compartilhados; a revisão
independente final retornou `PASS_BOUNDED` sem achados bloqueantes.

O resultado continua restrito à fronteira local de serviço/HTTP e não alega
prova PostgreSQL específica dessa coleção, ownership de eventos em todos os
detalhes, todas as rotas clínicas, RLS de target, providers, acessibilidade,
operações, paridade ou release. Os gates globais seguem não promovidos:
paridade geral `98/100` (`4/11`), clínica `100/100` (`2/3`) e enterprise
readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Não houve commit, push,
deploy, provider, target, credencial, produção ou mutação externa.

Artefatos: `.agent/tasks/CVG-003-prescription-execution-tenant-isolation.md`,
`.agent/gates/verified-CVG-003-prescription-execution-tenant-isolation.json`,
`.agent/artifacts/CVG-003-prescription-execution-tenant-isolation-2026-08-26.md`
e `.agent/verification.jsonl#VFY-CVG-003-PRESCRIPTION-EXECUTION-TENANT-ISOLATION-FINAL-001`.

## Addendum — isolamento tenant de triagem — 2026-08-26

O slice `CVG-003-TRIAGE-TENANT-ISOLATION` foi reconciliado como
`PASS_BOUNDED`, com residual `HIGH`. `TriageService` agora exige `AccountId`
na hidratação, coleção, detalhe, histórico, criação e atualização; o
repositório aplica `account_id` em todos os `SELECT`/`UPDATE`; e a rota
autenticada rejeita filtro `encounterId` vazio e usa somente o principal.
Modelos e snapshots retornados têm cópias defensivas, falhas de persistência
restauram o cache especulativo e o POST valida/persiste antes de transicionar o
encounter.

O RED reproduziu contexto ausente, coleção incorreta e filtro vazio. O GREEN
passou módulo `10/10`, serviço `3/3`, API `405/405` e persistência PostgreSQL
descartável `17/17`; a cobertura oficial passou `1.964/1 skip` em `82,03%`
statements, `80,20%` branches, `88,59%` functions e `82,03%` lines. O fixture
HTTP usa duas contas e cobre listagem própria, histórico/PATCH/POST cruzados;
typecheck, Prettier, ESLint isolado e diff hygiene passaram. A revisão fresca
retornou `PASS_BOUNDED`, sem achado Critical/High.

Permanecem explicitamente fora do aceite: atomicidade de `update` +
`createVersion` quando não há transaction wrapper externo, prova TCP com RLS do
target, lint agregado (45 diagnósticos em arquivos alheios já sujos), demais
rotas clínicas, providers, acessibilidade, operações, paridade e release.
Paridade geral continua `98/100` (`4/11`), clínica `100/100` (`2/3`) e
enterprise readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). CVG-003 e o
programa global permanecem `IN_PROGRESS/PARTIAL`; não houve mutação externa.

Artefatos: `.agent/tasks/CVG-003-triage-tenant-isolation.md`,
`.agent/gates/verified-CVG-003-triage-tenant-isolation.json`,
`.agent/artifacts/CVG-003-triage-tenant-isolation-2026-08-26.md` e
`.agent/verification.jsonl#VFY-CVG-003-TRIAGE-TENANT-ISOLATION-FINAL-001`.

## Addendum — isolamento tenant de discharge — 2026-08-26

O slice `CVG-003-DISCHARGE-TENANT-ISOLATION` foi fechado como
`PASS_BOUNDED`, sem promover CVG-003, paridade clínica, readiness ou release.
`DischargesService` agora exige `AccountId` em hidratação, refresh, coleção,
detail, lookup por encounter, criação, update e remoção de cache. Os
repositórios in-memory e PostgreSQL usam predicados explícitos de conta; o
INSERT PostgreSQL rejeita conta diferente do tenant ativo; o update casa a
versão anterior atomicamente; e o PATCH reidrata a conta antes de operar,
fechando a lacuna de réplica secundária. Cópias defensivas, rollback de cache
e recuperação da fila também estão cobertos.

O RED histórico registrou 7/13 falhas de contrato e a fila rejeitada. Após as
correções, passaram módulo `17/17`, rota `2/2`, HTTP→PostgreSQL descartável
`6/6`, API `406/406`, corrida de update com um sucesso/um conflito, criação
com conta ativa incompatível, builds/typechecks, lint escopado, Prettier,
secrets e diff hygiene. A cobertura oficial passou `1.970/1 skipped` em
`82,03%` statements, `80,22%` branches, `88,59%` functions e `82,03%` lines.
A revisão inicial `CONDITIONAL` ficou preservada como crítica; a revisão
follow-up não encontrou Critical, High ou Medium técnico.

O resultado é evidência local com PostgreSQL descartável, não prova target
TCP/RLS, papel runtime `NOBYPASSRLS` conectado separadamente, browser,
providers, demais rotas clínicas, operações, CI remoto, restore, paridade Vetus
restante ou release. Os gates globais permanecem abertos: paridade geral
`98/100` (`4/11`), clínica `100/100` (`2/3`) e readiness `95/100` (`42 PASS /
3 WARN / 1 FAIL`). Nenhuma mutação externa ocorreu.

Artefatos: `.agent/tasks/CVG-003-discharge-tenant-isolation.md`,
`.agent/gates/verified-CVG-003-discharge-tenant-isolation.json`,
`.agent/artifacts/CVG-003-discharge-tenant-isolation-2026-08-26.md` e
`.agent/verification.jsonl#VFY-CVG-003-DISCHARGE-TENANT-ISOLATION-FINAL-001`.

## Addendum — reversão financeira append-only de recebimento em dinheiro — 2026-08-27

O slice autorizado `CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL` foi reconciliado
como `PASS_BOUNDED`, com residual `HIGH`. A API agora oferece
`POST /encounters/{encounterId}/cash-receipts/{receiptId}/reverse`, protegido
por `billing.manage`, idempotência e motivo estrito. A migração 0150 adiciona
o ledger de reversão tenant-scoped, mantém o recebimento original imutável,
cria saque compensatório e journal inverso balanceado, reabre as projeções
financeiras e permite um novo recebimento somente depois da reversão. Auditoria
e outbox permanecem transacionais.

O fechamento incluiu os controles que a primeira revisão independente havia
identificado: grant `EXECUTE` dos helpers para API/worker, reautorização dentro
da transação antes de lookup/replay de idempotência, proteção de INSERT/UPDATE/
DELETE das linhas do journal, `search_path` fixo nas funções novas,
revalidação do caixa da reversão quando seu status/horário muda e o padrão
OpenAPI que rejeita motivo apenas com whitespace. A revisão follow-up de Godel
retornou `PASS_BOUNDED`, com Critical `0`, High `0`, Medium `0` e Low `0`.

As provas atuais passaram unitários focados `30/30`, PostgreSQL/HTTP/RLS
descartável `44/44`, ACL de runtime `1/1`, API compilada `408/408`, typecheck
global em 70 projetos, lint/build da API e DB, OpenAPI, migration source of
truth, Helm estático, Prettier, secrets e diff hygiene. A cobertura oficial
está em `80,72%` statements, `80,22%` branches e `88,06%` functions.

O resultado é estritamente local/bounded: não prova target TCP/RLS/FORCE RLS,
produção, providers, refunds/chargebacks, liquidação não-caixa, conciliação
bancária, cancelamento fiscal, browser, acessibilidade, CI remoto, operações,
backup/restore ou release. Os gates globais seguem abertos: paridade geral
`98/100` (`4/11`), clínica `100/100` (`2/3`) e enterprise readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). Não houve commit, push, deploy, ação de
credencial/provider, target ou mutação externa.

Artefatos: `.agent/tasks/CVG-004-financial-cash-receipt-reversal.md`,
`.agent/gates/verified-CVG-004-financial-cash-receipt-reversal.json`,
`.agent/artifacts/CVG-004-financial-cash-receipt-reversal-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-FINANCIAL-CASH-RECEIPT-REVERSAL-FINAL-001`.

## Addendum — relatório agendado de contas a pagar no worker — 2026-08-27

O slice autorizado `CVG-004-REPORT-SCHEDULED-PAYABLES` foi reconciliado como
`PASS_BOUNDED`, com residual `HIGH`. O worker agora compõe o
`DatabaseFinancialPayablesRepository` tenant-scoped, valida status, busca e
datas ISO estritas, aplica `dueAt` inclusivo, verifica account/status nos fatos
retornados e grava exatamente as onze colunas já definidas no catálogo
`financial-payables`. O fallback genérico que podia gerar sucesso vazio foi
substituído por falha explícita para fonte ausente, relatório catalogado sem
fonte e ID desconhecido; o job registra `lastError` sem execution/export/
delivery substituto.

O RED TDD permanece registrado. A prova fresca passou worker `74/74`, módulo
reports `16/16`, processo real `run-once` contra PostgreSQL descartável `9/9`
com duas contas e registros negativos por status/busca/due date, API compilada
`408/408`, typecheck global em 70 projetos, build do worker, segurança,
OpenAPI, migration source of truth, RLS, deploy surface, Helm estático,
Prettier, diff hygiene e cobertura `1.982 passados / 1 skip` (`80,72%`
statements, `80,23%` branches, `88,05%` functions, `80,72%` lines).

A revisão independente de Ramanujan não encontrou Critical/High, mas foi
`CONDITIONAL` antes da última remediação: apontou a ausência dos negativos no
PostgreSQL, a necessidade de explicitar o escopo administrativo, a cobertura
de ID desconhecido e a falta de regressão/build completos. Esses pontos foram
corrigidos ou explicitamente delimitados. Uma nova revisão independente
pós-fix não esteve disponível: o papel reviewer foi recusado pela política de
modelo da conta e o fallback explorer atingiu o limite de uso. Isso está
registrado como limitação, não como aprovação independente pós-fix. O ramo
preexistente `administrative-executive`, que possui linhas nativas de controle
e diagnósticos `Fonte indisponivel`, ficou explicitamente fora deste contrato.

O resultado fecha somente a leitura agendada persistida de contas a pagar. Os
demais relatórios agendados, providers, target TCP/RLS/FORCE RLS, worker
distribuído, browser/acessibilidade, operações, CI remoto, backup/restore,
paridade Vetus restante e release continuam abertos. Paridade geral permanece
`98/100` (`4/11`), clínica `100/100` (`2/3`) e enterprise readiness `95/100`
(`42 PASS / 3 WARN / 1 FAIL`). CVG-004 e o programa global seguem
`IN_PROGRESS/PARTIAL`; não houve commit, push, deploy, ação de provider,
credencial ou mutação externa.

Artefatos: `.agent/tasks/CVG-004-report-scheduled-payables.md`,
`.agent/gates/verified-CVG-004-report-scheduled-payables.json`,
`.agent/artifacts/CVG-004-report-scheduled-payables-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-FINAL-001`.

## Addendum — relatório agendado de adiantamentos financeiros no worker — 2026-08-27

O slice autorizado `CVG-004-REPORT-SCHEDULED-ADVANCE-PAYMENTS` foi reconciliado
como `PASS_BOUNDED`, com residual `HIGH`. O worker agora compartilha, pela
fronteira do módulo financeiro, a fonte persistida canônica de
`advance_payments` e das alocações append-only. A resolução é tenant-scoped,
deriva compensado/saldo/status das alocações, valida status, busca e datas ISO
estritas com `dateTo` inclusivo, limita o resultado a 10.000 linhas e mapeia
exatamente as dez colunas do catálogo. Fonte ausente, schema não pronto,
status persistido inválido, ID catalogado sem fonte e ID desconhecido falham
fechado sem sucesso vazio ou persistência substituta.

O RED TDD permanece registrado. A evidência fresca passou worker `77/77`,
módulo financeiro `16/16`, API compilada `408/408`, processo real
`run-once` contra PostgreSQL descartável `10/10`, fonte canônica sob RLS
`9/9`, typecheck global em 70 projetos, coverage `1.983 passados / 1 skip`
(`80,42%` statements, `80,21%` branches, `87,74%` functions, `80,42%` lines),
segurança, OpenAPI, migration source of truth, RLS `163/164`, deploy surface,
Helm estático, Prettier e diff hygiene.

A revisão independente pós-implementação de Hubble foi `CONDITIONAL`, sem
achado Critical no contrato bounded. Permanecem explicitamente delimitados o
fallback de ator do worker, a semântica de auditoria do job agendado, a
projeção de leitura duplicada da API, a verificação completa de ACL/funções/
runtime-role no bootstrap, wildcard/timezone e alguns testes de borda. Isso
não é aprovação de produção.

Os retestes globais seguem abertos: paridade geral `98/100` (`4/11`), clínica
`100/100` (`2/3`) e readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Outros
relatórios, providers, target TCP/RLS/FORCE RLS, worker distribuído,
browser/acessibilidade, operações, CI remoto, backup/restore, paridade Vetus
restante e release continuam pendentes. CVG-004 e o programa global seguem
`IN_PROGRESS/PARTIAL`; não houve commit, push, deploy, ação de provider,
credencial ou mutação externa.

Artefatos: `.agent/tasks/CVG-004-report-scheduled-advance-payments.md`,
`.agent/gates/verified-CVG-004-report-scheduled-advance-payments.json`,
`.agent/artifacts/CVG-004-report-scheduled-advance-payments-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-ADVANCE-PAYMENTS-FINAL-001`.

## Addendum — unicidade de encontro ativo — 2026-08-27

O slice autorizado `CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS` foi reconciliado como
`PASS_BOUNDED`, com risco residual `HIGH`. A migration canônica `0151` faz
preflight fail-closed de duplicatas históricas, rejeita índice homônimo
incompatível e aplica unicidade parcial em `(account_id, patient_id)` para
encontros não fechados. O repositório mapeia somente a violação PostgreSQL
`23505` nomeada para `ConflictError`, inclusive em update/reopen; o serviço
escopa o preflight local pela conta, restaura a timeline em falha e a API
restaura a fila depois de conflito de persistência.

A evidência fresca passou RED/GREEN, repository `5/5`, PostgreSQL descartável
`7/7`, módulo encounters `32/32`, pacote DB `22/22`, API compilada `410/410`,
suíte workspace, build, typecheck e coverage (`80,45%` statements/lines,
`80,20%` branches, `87,75%` functions), além de segurança, migration source,
RLS, OpenAPI, deploy surface, Helm estático e diff hygiene. A revisão
independente de Lovelace não encontrou Critical/High; os achados Medium sobre
validade do índice, rollback de fila e fixture HTTP database-origin foram
corrigidos. Uma tentativa adicional de reviewer ficou indisponível por
política de modelo da conta e não foi tratada como aprovação.

O resultado não promove `CVG-002`, paridade Vetus, paridade clínica,
enterprise readiness ou release. Duplicatas existentes continuam exigindo
remediação humana autorizada; a prova local não substitui target TCP/RLS/
roles, réplicas/cache distribuídos, providers, operações, CI remoto,
backup/restore, acessibilidade ou homologação. Os retestes globais continuam
`98/100` (`4/11`), `100/100` (`2/3`) e `95/100` (`42 PASS / 3 WARN / 1 FAIL`).
Não houve provider, target, staging, produção, credencial, commit, push,
deploy ou mutação externa.

Artefatos: `.agent/tasks/CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.md`,
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`,
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS-FINAL-001`.

## Addendum — identidade explícita do worker de relatórios — 2026-08-27

O slice autorizado `CVG-004-WORKER-REPORT-SERVICE-IDENTITY` removeu o
fallback inseguro que usava `accountId` como `UserId` nos relatórios agendados.
`WORKER_REPORTS_USER_ID` é agora uma configuração compartilhada, trimada e
validada com um contrato RFC 4122 não-nil; em production-like é obrigatória.
O worker contínuo e o `run-once` passam pelo mesmo resolver e usam somente o
actor explícito para execução/retry/export. Compose e Helm staging/prod
referenciam uma chave requerida de Secret gerenciado pelo operador; nenhum UUID
ou credencial foi criado no repositório.

O RED foi preservado. A prova fresca passou shared-config `42/42`, worker
`75/75`, processo real contra PostgreSQL descartável `12/12` (actor explícito
persistido e actor desconhecido sem `report_executions`), contrato Helm `6/6`,
lint/typecheck/build e validators de segurança, OpenAPI, migrations, RLS e
deploy-surface. A revisão independente foi `CONDITIONAL`, sem Critical/High,
mas manteve como residual o mapeamento tenant-aware/service-principal por
conta; por isso o resultado é `PASS_BOUNDED`, não aprovação de produção.

Os gates globais continuam abertos: paridade geral `98/100` (`4/11`), clínica
`100/100` (`2/3`) e readiness `95/100` (`42 PASS / 3 WARN / 1 FAIL`). Outros
relatórios, providers, target TCP/RLS/FORCE RLS, operações distribuídas,
browser/acessibilidade, CI remoto, backup/restore, parity restante e release
seguem pendentes. Não houve mutação de target/provedor/produção, credencial,
deployment, commit, push ou ação externa.

Artefatos: `.agent/tasks/CVG-004-WORKER-REPORT-SERVICE-IDENTITY.md`,
`.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json`,
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-SERVICE-IDENTITY-FINAL-001`.

## Addendum — actor tenant-aware para relatórios agendados — 2026-08-27

O slice autorizado `CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL` foi
reconciliado como `PASS_BOUNDED`, com residual `HIGH`. A migration aditiva
`0152_report_service_principal_tenant_integrity.sql` estende o catálogo de
service principals para `report-execution`, sem inserir usuários ou mappings,
e vincula por FK composta os actors de execução, export e schedule à conta
proprietária. Um trigger `SECURITY DEFINER` com `search_path` fixo e locks
`FOR UPDATE` revalida purpose/active-state no momento da persistência.

O resolver tenant-scoped exige um service user ativo, não-interativo,
mapeado na conta corrente; continuous e run-once passam o actor resolvido para
execução, retry e export. A prova fresca passou schema `4/4`, PostgreSQL
resolver/trigger `9/9`, FKs `6/6`, processo run-once `13/13`, regressões dos
entrypoints e webhook, suíte workspace completa, coverage `80.45%`
statements/linhas, `80.19%` branches e `87.74%` functions, typecheck, build,
lint, segurança, OpenAPI, migrations, RLS, deploy surface e Helm estático.

A revisão independente disponível é `CONDITIONAL`, sem autorização de
produção. A operação precisa manter um mapping válido por worker/conta; um
UUID global não modela múltiplos principals em múltiplas contas. Provisioning,
target/RLS/ownership, runtime distribuído, providers, CI remoto, parity,
readiness, acessibilidade, restore e release permanecem abertos. Não houve
mutação de target, provider, staging, produção, credencial, commit, push,
deploy ou sistema externo.

Artefatos: `.agent/tasks/CVG-004-worker-report-tenant-aware-principal.md`,
`.agent/gates/verified-CVG-004-worker-report-tenant-aware-principal.json`,
`.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-001`.

## Bounded closure — CVG-004 scheduled financial-receivables — 2026-08-28

O slice `CVG-004-REPORT-SCHEDULED-RECEIVABLES` foi reconciliado como
`PASS_BOUNDED`, com confiança `MEDIUM` e risco residual `HIGH`. O worker agora
resolve o relatório existente por uma fonte financeira compartilhada,
tenant-scoped e somente leitura, com os dezesseis campos do catálogo,
filtros estritos, datas inclusivas interpretadas em UTC, fallback de
`issuedAt`, limite de 10.000 linhas e rejeição fail-closed de fonte ausente,
estado inválido ou conta estrangeira.

A prova contra PostgreSQL descartável passou `19/19` no processo real com dois
tenants, auditoria durável de execução/exportação sem PII, overflow de 10.001
linhas, fallback de data, isolamento e recuperação de entrega/lease. O
one-shot agora retorna código não-zero quando o tick agendado termina com
falha; o worker contínuo preserva o comportamento de continuar o loop.
Módulo financeiro `20/20`, worker `37/37` mais as suítes de bootstrap,
identidade, job, composição e PIX, builds/typechecks, secrets, Prettier e
`git diff --check` passaram. A revisão independente final de Darwin foi
`PASS` sem achado scoped Critical/High/Medium.

Isso fecha apenas o caminho local do relatório agendado. Paridade Vetus geral
segue `4/11` verificada, clínica `2/3` e readiness `95/100` (`42 PASS`,
`3 WARN`, `1 FAIL`); CVG-004/ERP permanecem `IN_PROGRESS/PARTIAL` e a promoção
permanece `BLOCKED`. Settlement, providers, target/RLS/roles, operações
distribuídas, acessibilidade, LGPD operacional, CI remoto, backup/restore,
paridade restante e release continuam fora deste resultado. Não houve commit,
push, deploy ou mutação externa.

Evidências: `.agent/gates/verified-CVG-004-report-scheduled-receivables.json`,
`.agent/artifacts/CVG-004-report-scheduled-receivables-2026-08-28.md` e
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-services — 2026-08-28

A fresh local inspection selected the missing scheduled `registration-services`
worker source as the next bounded gap after scheduled financial-receivables.
The existing catalog/API contract exposes exactly six persisted service fields,
and the `services` relation/repository/RLS provide a credential-free local
source; the worker resolver and database source composition do not yet cover
this report id.

The new authority and implementation-ready gate freeze only a shared
tenant-scoped read source, strict inclusive UTC `createdAt` date filters,
deterministic ordering, a 10,000-row fail-closed bound, malformed/foreign-row
rejection, exact catalog mapping, existing PII-safe schedule audit and the
real two-account one-shot proof. No migration, CRUD, supplier/owner/patient
expansion, provider, target, production, deployment or release behavior is
authorized.

Delegated fresh explorer attempts were unavailable and are not represented as
consensus or approval. The parent CVG-004/global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-services.json`,
`.agent/tasks/CVG-004-report-scheduled-services.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-SERVICES-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-SERVICES-001`.

## Bounded closure — CVG-004 scheduled registration-services — 2026-08-28

The scheduled `registration-services` worker gap is closed as
`PASS_BOUNDED`, with `MEDIUM` confidence and `HIGH` residual risk. The shared
services-module source uses explicit tenant context plus an account predicate,
an explicit projection, strict inclusive UTC `createdAt` filters,
deterministic order and a 10,000-row fail-closed bound. The worker maps only
`code`, `name`, `description`, `basePrice`, `status` and `createdAt`, preserves
durable non-PII audit and one-shot failure semantics, and leaves continuous
tick-and-continue behavior unchanged.

Fresh evidence passed services module `21/21`, worker regression `97/97`, the
worker/module builds and typechecks, and the disposable PostgreSQL two-account
process `20/20`. The process proved exact rows, UTC date selection,
inverse-account isolation, null/status mapping and durable audit. Secrets,
Prettier, diff and control-plane hygiene also passed.

Independent review was attempted but unavailable: the explicit role was
rejected by the account model policy and compatible default reviewers timed
out. This is recorded as
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-REVIEW-UNAVAILABLE-001`
and is not approval; a fresh independent review is required before
higher-confidence use or scope expansion.

The global retest remains open: general Vetus parity `4/11`, clinical parity
`2/3` and enterprise readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`).
CVG-004/global ERP remain `IN_PROGRESS/PARTIAL` and promotion remains
`BLOCKED`. Providers, target operations, distributed workers, accessibility,
operational LGPD, remote CI, remaining parity and release acceptance remain
open. No commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-services.json`,
`.agent/artifacts/CVG-004-report-scheduled-services-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-FINAL-001`.

## Implementation-ready and bounded closure — CVG-004 scheduled registration-suppliers — 2026-08-28

The next bounded gap was the missing scheduled `registration-suppliers`
worker source. Fresh scouts disagreed between patients and suppliers; local
repository evidence ranked suppliers because its existing on-demand contract
already reads persisted finance catalog items under account RLS with a smaller
PII blast radius. The new authority froze only that read path and did not
authorize migration `0146`, supplier master/CRUD, provider, target, production,
deployment or release behavior.

The slice is now `PASS_BOUNDED` with `MEDIUM` confidence and `HIGH` residual
risk. The shared financial source uses explicit tenant context and predicate,
explicit projection, strict search/category/cost-center/date filters, inclusive
UTC dates, deterministic name/id ordering, a 10,000-row fail-closed bound and
foreign/malformed-row rejection. The worker emits exactly nine catalog fields
and preserves durable non-PII audit plus existing one-shot and continuous-worker
semantics.

Financial module tests passed `24/24`; the configured worker suites passed
runner `43/43`, bootstrap `20/20`, account discovery `7/7`, consumer
composition `2/2`, report identity `8/8`, scheduled-job `3/3` and PIX settlement
`17/17`. The post-format disposable PostgreSQL process passed `21/21` with
two-account isolation, filters, exact rows, excluded-row behavior and audit.

The independent review attempt timed out and was shut down without a verdict;
it remains a condition, not approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity is `4/11`, clinical parity `2/3`,
readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains
`BLOCKED`. Any next scope requires fresh scouting and a new implementation-ready
authority. No commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-suppliers.json`,
`.agent/artifacts/CVG-004-report-scheduled-suppliers-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-FINAL-001`.

## Implementation-ready checkpoint — CVG-004 scheduled registration-owners — 2026-08-28

After the bounded scheduled-suppliers closure, local fresh scouting ranked the
missing scheduled `registration-owners` source as the next smaller registry
gap. The existing catalog/API contract has exactly seven owner fields, and the
persisted `owners` table already has account isolation plus RLS/FORCE-RLS
coverage. The candidate does not require a patient join or expose microchip
data; the worker currently lacks only the scheduled source and branch.

The confirmed authority freezes a shared read-only owners source, explicit
tenant context and account predicate, strict inclusive UTC `createdAt` dates,
deterministic `fullName ASC, id ASC` order, a 10,000-row fail-closed bound,
metadata validation/fallback and exact seven-field worker mapping. Existing
schedule execution/export audit and one-shot semantics remain unchanged. No
migration, patient expansion, owner CRUD/master, provider, target, production,
deployment or release behavior is authorized.

Both delegated scout attempts errored before execution because the
`gpt-5.3-codex-spark` usage limit was reached. The owners selection is therefore
local repository evidence, not scout consensus or approval. RED is the next
bounded action.

Evidence: `.agent/gates/implementation-ready-CVG-004-report-scheduled-owners.json`,
`.agent/tasks/CVG-004-report-scheduled-owners.md`,
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-OWNERS-IR-001` and
`.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-OWNERS-001`.

## Bounded closure — CVG-004 scheduled registration-owners — 2026-08-28

The scheduled `registration-owners` worker path is `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The shared owners source uses
explicit tenant context and predicate, an owners-only projection, strict
inclusive UTC `createdAt` dates, deterministic `fullName ASC, id ASC` order,
metadata fallback and a 10,000-row fail-closed bound. The worker emits exactly
`documentId`, `fullName`, `primaryContact`, `city`, `financialResponsible`,
`status` and `createdAt`; patient joins and microchip data remain excluded.

Owners module tests passed `49/49`; configured worker suites passed runner
`46/46`, bootstrap `20/20`, account discovery `7/7`, consumer composition
`2/2`, report identity `8/8`, scheduled-job `3/3` and PIX settlement `17/17`.
The post-format disposable PostgreSQL process passed `22/22` with two-account
isolation, inclusive filtering, contact fallback, exact rows, durable audit
and no PII in worker output. The independent review attempts were unavailable
and remain a condition, not approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, parity remains `4/11` general and `2/3` clinical,
readiness remains `95/100` and promotion remains `BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-owners.json`,
`.agent/artifacts/CVG-004-report-scheduled-owners-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-OWNERS-FINAL-001`.

## Bounded closure — CVG-004 scheduled registration-patients — 2026-08-28

The scheduled `registration-patients` worker path is `PASS_BOUNDED` with
`MEDIUM` confidence and `HIGH` residual risk. The shared source uses explicit
tenant context and predicate, an explicit patients-only projection, strict
inclusive UTC `createdAt` dates, deterministic `name ASC, id ASC` ordering,
legacy-code/status/sex fallback and a 10,000-row fail-closed bound. The worker
emits exactly the eight existing catalog fields and keeps owner joins,
clinical/lifecycle behavior and additional PII out of scope.

TDD RED preceded implementation. Patients module tests passed `55/55`, focused
new-source coverage passed `94.07%` statements/lines, `90.41%` branches and
`100%` functions, configured worker suites passed runner `49/49`, bootstrap
`20/20`, account discovery `7/7`, consumer composition `2/2`, report identity
`8/8`, scheduled-job `3/3` and PIX settlement `17/17`, and the disposable
PostgreSQL run-once process passed `23/23` with two-account isolation, exact
rows, fallback, durable execution and non-PII audit. Prettier,
`security:secrets`, `git diff --check` and empty-index hygiene passed.

The independent reviewer timed out and was shut down without a verdict; this
is recorded as a condition, not approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical parity `2/3`, readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion `BLOCKED`. No commit,
push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-patients.json`,
`.agent/artifacts/CVG-004-report-scheduled-patients-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-FINAL-001`.

## 2026-08-28 — scheduled commission-calculations bounded closure

The scheduled `commission-calculations` report now resolves persisted
`commission_calculations` headers and same-account `commission_lines` through
an explicit tenant-scoped source in the worker. The implementation preserves
the existing six-field catalog contract, validates strict status/date overlap
filters and source rows, bounds results at 10,000, orders by persisted
`created_at DESC, id DESC`, and leaves schedule execution, export audit and
one-shot semantics unchanged. Commission writes, rules, payable/payment
lifecycle, joins, API/SPA, providers, target and production remain out of
scope.

Evidence: commissions `18/18`, source coverage `94.02%` statements/lines,
`88%` branches and `100%` functions; worker runner `51/51` plus configured
worker suites; disposable PostgreSQL run-once process `24/24` with two-account
isolation, filters, same-account line counts, durable execution and non-PII
payload. Independent review was unavailable and remains a condition, not
approval. Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`, general parity
`4/11`, clinical parity `2/3`, readiness `95/100` and promotion `BLOCKED`.

Evidence references: `.agent/gates/verified-CVG-004-report-scheduled-commissions.json`,
`.agent/artifacts/CVG-004-report-scheduled-commissions-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-FINAL-001`.

## Bounded closure — CVG-004 scheduled inventory-products — 2026-08-28

The scheduled `inventory-products` worker path is closed as `PASS_BOUNDED`,
with `HIGH` confidence for this bounded local slice and `HIGH` residual risk.
The new shared source reads only persisted `inventory_items` using explicit
tenant context and an account predicate. It applies parameterized literal
case-insensitive SKU/name search, strict inclusive UTC `createdAt` dates,
deterministic `name ASC, id ASC` ordering and a 10,000-row fail-closed bound.
The worker revalidates account ownership, exact source shape, canonical
timestamps and non-negative two-decimal numeric facts, then emits only
`sku`, `name`, `unit`, `onHandQuantity`, `reorderLevel`, `unitCostAmount`,
`createdAt` and `updatedAt`. Existing durable schedule execution/export audit,
recipient handling and one-shot semantics remain unchanged.

TDD RED preceded implementation. Inventory module tests passed `37/37`, focused
source coverage passed `92.07%` statements/lines, `89.85%` branches and `100%`
functions, module typecheck/build passed, configured worker suites passed
runner `53/53`, bootstrap `20/20`, account discovery `7/7`, consumer
composition `2/2`, report identity `8/8`, scheduled-job `3/3` and PIX
settlement `17/17`, and the disposable PostgreSQL run-once process passed
`25/25`. The process included concurrent two-account isolation, lower/upper
inclusive UTC boundaries, a literal `%` search with an in-window false-positive
guard, exact rows, durable execution and non-PII audit.

The independent reviewer returned `APPROVE_BOUNDED` with no CRITICAL, HIGH or
MEDIUM finding. Its LOW observation that the new `ILIKE ... ESCAPE` behavior
was only structurally tested was addressed with the real PostgreSQL fixture
and a successful process rerun. This approval is limited to the bounded local
slice and is not global ERP or production approval.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`; general Vetus parity remains
`4/11` verified, clinical parity `2/3` verified, enterprise readiness remains
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.
Historical/as-of stock, lots, movements, invoices, valuation, providers,
target RLS/runtime, distributed operations, accessibility, operational LGPD,
remote CI, backup/restore, remaining parity and release acceptance remain
open. No commit, push, deploy or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-products.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-products-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-FINAL-001`.

## 2026-08-28 — bounded scheduled inventory-stock closure

The scheduled `inventory-stock` path now has a bounded `PASS_BOUNDED` gate.
The source reuses the explicit tenant-safe persisted `inventory_items`
projection and derives current `stockValue` and `reorderStatus`; the worker
revalidates source rows and emits exactly the ten existing catalog fields.
Search/date filters, deterministic ordering, the 10,000-row guard, durable
run-once behavior and non-PII audit/log handling remain bounded by the frozen
authority. Lots, movements, invoices, historical valuation, providers, target,
production and release acceptance were not expanded.

Evidence: inventory module `43/43`, focused source coverage `96.15%`
statements/lines, `91.42%` branches and `100%` functions, module
build/typecheck, configured worker suites, focused disposable PostgreSQL
two-account process proof and independent `APPROVE_BOUNDED` review with no
CRITICAL/HIGH/MEDIUM/LOW finding. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`; parity/readiness remain non-promoting and promotion is
`BLOCKED`.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-stock.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-stock-2026-08-28.md` and
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-FINAL-001`.

## 2026-08-28 — CVG-002 child-process clinical-financial bounded closure

The real API child-process restart/replay slice is `PASS_BOUNDED` under the
verified bounded gate. Its guarded disposable PostgreSQL proof passed `1/1`
with restricted runtime roles, exact post-`billing_items` `SIGKILL` rollback,
distinct-PID restart, two identical replays, divergent-key conflict, valid
tenant-B/A-encounter isolation with zero B mutations, full continuation to
BRL receipt and exact financial, lifecycle, audit and outbox SQL reconciliation.

The final independent review returned `APPROVE_BOUNDED`. The serial critical
runner passed entries `1–7` including the child entry 5, then the existing PIX
entry 8 timed out at `15/25` (`spawnSync pnpm ETIMEDOUT`); later entries were
not run, so no full-runner/provider/distributed approval is claimed. Global
parity remains `4/11` general and `2/3` clinical, readiness `95/100`
(`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`. No production,
migration, provider, deployment, commit, push or external mutation occurred.

Evidence: `.agent/gates/verified-CVG-002-clinical-financial-child-process-restart.json`,
`.agent/artifacts/CVG-002-clinical-financial-child-process-restart-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-REVIEW-002` and
`.agent/verification.jsonl#VFY-CVG-002-CLINICAL-FINANCIAL-CHILD-PROCESS-RESTART-FINAL-001`.

## 2026-08-28 — bounded scheduled inventory-movements closure

The scheduled `inventory-movements` worker path now has a bounded
`PASS_BOUNDED` gate. It reads the existing tenant-scoped
`inventory_stock_movements` ledger joined only to same-account
`inventory_items` labels, validates persisted facts under explicit tenant
context and emits exactly the thirteen catalog fields. Search is literal and
case-insensitive, dates are inclusive in UTC, ordering is deterministic,
signed deltas are preserved, nullable references become `""`, and the
10,000-row bound is enforced before execution persistence. No lot/consumption
reconstruction, invoice/NF, fiscal/historical valuation, API/SPA, migration,
provider, target, production or release behavior was added.

Fresh evidence passed the source at `4/4` with `96.38%` statements/lines,
`82.47%` branches and `100%` functions, the inventory module at `47/47`,
all configured worker suites, and the full disposable PostgreSQL
`worker-run-once-reports` process at `27/27`. The process proved
concurrent two-account isolation, exact movement rows, inclusive dates,
literal search, durable execution and non-PII audit. Secrets, formatting,
typecheck/build, diff and empty-index hygiene passed. A fresh compatible
independent review returned `APPROVE_BOUNDED` with no
CRITICAL/HIGH/MEDIUM/LOW finding; the incompatible reviewer attempt is
recorded as unavailable, not approval.

Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`: general parity is
`4/11` verified, clinical parity `2/3` verified, readiness is `95/100`
(`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.
Target RLS/runtime roles, distributed operations, providers/homologation,
accessibility, operational LGPD, remote CI, backup/restore, remaining parity
and release acceptance remain open. No commit, push, deploy or external
mutation occurred.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-movements.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-movements-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-FINAL-001`.
