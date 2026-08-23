# Checkpoint de retomada integral — 23 de agosto de 2026

Este documento é o ponto de entrada para a próxima sessão. Ele consolida a
auditoria documental, a pesquisa de mercado e o estado executável observado
nesta sessão. O programa continua `IN_PROGRESS/PARTIAL`; este arquivo não é
uma declaração de produção, paridade, conformidade ou release.

## Estado canônico

- Repositório: `/home/ricardo/cvg-his-v4`
- Branch: `agent/sync-v4-full-program`
- Último commit publicado antes desta onda: `1c60a1244008f6d0a65a0f604ef7f33920e99c31`
  (`docs: align worker continuity ledgers`), alinhado ao `origin`.
- Último commit de implementação do slice: `67d47e2`, sobre
  `ab08865233c4091edcb83cb7319c78b9f406645e`.
- Único caminho dirty permitido: `packages/design-system/tsconfig.vue.tsbuildinfo`.
  É cache pertencente ao usuário e não deve ser adicionado, revertido ou
  limpo.
- Tarefa ativa: `CVG-002C6`.
- Estado global: `ACTIVE / IN_PROGRESS / PARTIAL`; nenhum gate global foi
  promovido.

Retomada mínima:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
git log -1 --oneline
git fetch origin agent/sync-v4-full-program
git diff --check
```

Depois, leia este arquivo, `.agent/state.json`, o ExecPlan
`.agent/plans/premium-enterprise-mvp.md`, `.gauntlet/state.md` e os últimos
registros de `.agent/execution-log.jsonl` e `.agent/verification.jsonl` antes
de editar código.

## O que foi feito e está comprovado de forma limitada

Estas são provas locais, revision-bound e descartáveis, cada uma limitada ao
escopo do teste citado:

| Fatia | Resultado observado |
| --- | --- |
| Worker `payments → billing → webhooks` em PostgreSQL/RLS | `worker-event-consumers-postgres.test.ts` 3/3; replay concorrente, rollback, inbox/outbox, settlement, enqueue e isolamento A/B |
| Financeiro e barramento | 15/15 e 23/23 nos conjuntos focados |
| Identidade composta de cartão | PostgreSQL 3/3, contrato unitário 3/3, handlers/gateway 17/17; `(account_id, transaction_id)` evita colisão entre tenants |
| Jornada clínica-financeira bounded | role API `LOGIN NOSUPERUSER NOBYPASSRLS` 5/5; restart/replay controlado 1/1; não é ainda a jornada completa de release |
| Worker process boundary | ACL/loop/readiness/SIGKILL do entrypoint real 1/1 e grants 11/11; ainda falta fixture de eventos de domínio em processo filho com takeover completo |
| HTTP/UoW de diária, alta e recebimento | provas focadas anteriores permanecem válidas; o teste crítico completo abaixo ainda encontrou bloqueio de fixture |
| Builds e contratos focados | builds/typechecks, OpenAPI, Prettier e scans dos slices publicados passaram nos escopos documentados |

Nenhuma dessas linhas autoriza afirmar que o ERP inteiro, o worker de
produção, um provedor externo, a SPA, a paridade Vetus ou o release estão
prontos.

## Auditoria completa de `docs/`

Todos os arquivos existentes sob `docs/` foram enumerados e lidos como bytes
na auditoria desta sessão; arquivos textuais foram varridos como UTF-8 e os
JSON válidos foram analisados estruturalmente. O snapshot imediatamente antes
deste novo documento foi:

- 1.454 arquivos; 1.198 textuais; 256 binários;
- 53.895.398 bytes; 360.826 linhas textuais;
- 1.002 Markdown, 129 JSON, 67 HTML, 255 PNG e 1 gzip;
- 88 diretórios distintos no manifesto;
- hash do manifesto ordenado (caminho + NUL + conteúdo em hexadecimal,
  separados por newline):
  `1e66d6af2cff706ccf2ac6291680b9fd1795c18ca0e71d84c7cbbcd3a8f290cd`.

Distribuição de autoridade confirmada em `docs/README.md` e
`docs/430-fonte-de-verdade-documental.md`:

1. comportamento executado, testes atuais e estado persistido;
2. código e contratos;
3. camada ativa de agosto de 2026 e procedimentos vigentes;
4. arquitetura e ADRs;
5. auditorias de julho;
6. `docs/vetus` como referência do produto observado;
7. `docs/docs2` como arquivo histórico somente leitura.

`docs/vetus` e `docs/docs2` não são provas de implementação atual. As
afirmações históricas de score, “ready” ou paridade devem permanecer
contexto, nunca critério de promoção.

## Baseline executável desta sessão

| Comando | Resultado | Leitura correta |
| --- | --- | --- |
| `pnpm readiness:enterprise` | exit 1; score estrutural 95/100; paridade estrita 0/11 | indicador estrutural; não é release pass |
| `pnpm vetus:parity:audit` | exit 0 report-only; 0/11 | exit 0 não significa paridade aprovada |
| `pnpm vetus:clinical-parity` | exit 1; 0/3 | atendimento/cadastros/laboratório continuam bloqueados |
| `pnpm validate:rls` | exit 0; 154/155 tabelas protegidas, 1 exceção documentada | `FORCE RLS`/role global ainda não certificados |
| `pnpm validate:openapi` | exit 0; v1.0.0, 337 paths, 40 tags, 390 schemas | valida estrutura, não comportamento de todos os endpoints |
| `node tools/migration-consistency-report.mjs` | exit 1 | falta `docs/phase-9-migration-manifest.json` |
| `pnpm test:critical` | exit 1; 28 arquivos, 385/387 testes passaram | há dois arquivos falhos e nenhum gate de release pode subir |

Falhas concretas do `test:critical`:

1. `tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts`:
   o próprio fixture tenta usar `stayday_<token>` numa coluna PostgreSQL
   `uuid`, produzindo `22P02 invalid input syntax for type uuid` antes da
   asserção de rollback. Corrigir o fixture com um UUID real e manter o teste
   rejeitante; não enfraquecer o contrato de produção para acomodar o texto.
2. `tests/integration/setup/installation-state.test.ts`:
   a asserção espera uma linha literal `REVOKE ... cvg_installer ... worker`,
   mas o template Helm atual gera a revogação por `SELECT format(...)` com
   variáveis. Decidir, com teste primeiro, se o contrato deve inspecionar a
   renderização Helm ou se o template precisa expor uma revogação explícita;
   preservar a separação `cvg_installer`/API/worker.

Os logs também mostram `auth rate limiter using in-memory backend` durante
integrações PostgreSQL. Isso é uma limitação de ambiente de teste e um risco
de prontidão multi-réplica, não uma evidência de Redis compartilhado.

## Barra de qualidade congelada para a retomada

| Gate | Alvo | Estado atual |
| --- | --- | --- |
| `QB-SEC-01` instalação segura | instalação one-shot, grants mínimos, search path fixo e recuperação | `PARTIAL`; regressão estática Helm falha no critical suite |
| `QB-DATA-01` tenancy/RLS | todas as tabelas relevantes com RLS/FORCE RLS e prova sob role sem bypass | `PARTIAL`; 154/155 |
| `QB-AUTH-01` identidade | sessão/MFA/rate-limit compartilhados, revogação e restart | `PARTIAL`; teste atual usa backend in-memory em partes |
| `QB-CORE-01` clínica→recebimento | admissão→handoff→inventário→alta→billing→recebimento→ledger/audit/outbox em dois tenants, replay, concorrência e failpoints | `PARTIAL`; slices bounded, não uma prova única de release |
| `QB-PARITY-01` Vetus | 11/11 domínios gerais + 3/3 clínicos, sem skip/retry | `FAIL`; 0/11 e 0/3 |
| `QB-UX-01` acessibilidade | fluxos críticos responsivos, teclado, foco e WCAG 2.2 AA | `NOT_RUN` |
| `QB-REL-01` qualidade | build/typecheck/lint/unit/integration/E2E/coverage ≥80% sem falha escondida | `FAIL/PARTIAL`; critical suite falha |
| `QB-OPS-01` operação | deploy/rollback, backup/restore, failover, SLO e observabilidade em alvo autorizado | `BLOCKED` |
| `QB-MKT-01` resultado competitivo | workspace unificado com fluxo clínico, comunicação, inventário, finanças e relatórios realmente utilizáveis | `NOT_RUN` |

## Pesquisa oficial e decisões de produto

As fontes abaixo foram consultadas em 23/08/2026. São sinais públicos ou
documentação de fornecedor; não são prova de que o CVG-HIS ou o produto citado
funcione em todos os cenários.

| Fonte | Sinal verificável | Decisão para o CVG-HIS |
| --- | --- | --- |
| [Vetspire API](https://developer.vetspire.com/) | GraphQL, subscriptions, introspection e ambientes separados; API key tem escopo amplo e deve ser tratada como senha administrativa | preferir tokens/escopos por tenant, rotação/revogação e auditoria; não copiar chave global read/write |
| [ezyVet API release notes](https://developers.ezyvet.com/release-notes.html) | `site_uid`, cursores/paginação, saldos de inventário e DICOM Study UID write-once aparecem nos contratos recentes | versionar integrações, suportar cursores, unidade e identidade imutável de estudo |
| [Shepherd features](https://www.shepherd.vet/features/) | SOAP, alta, activity log, autosave, charge capture, whiteboard, inventário e portal são apresentados como um fluxo | o episódio clínico deve correlacionar autoria/versionamento, tarefas, cobrança e alta |
| [Instinct Treatment Plan](https://instinct.vet/products/instinct-treatment-plan/) | boards em tempo real, tratamentos pendentes, folhas de anestesia, alertas e charge capture | flowboard 24h e tratamento devem ser estados persistidos, auditáveis e idempotentes |
| [Covetrus Ascend stocktake](https://software.covetrus.com/emea/stocktake/) | contagem por código, correção/aprovação, localização e histórico de edição | estoque exige FEFO/lote/validade, aprovação e trilha de quem alterou |
| [FHIR R5](https://hl7.org/fhir/R5/) | recursos clínicos, diagnósticos, medicamentos, workflow, financeiro, `Provenance` e `AuditEvent` | contratos de integração devem carregar proveniência, consentimento e reconciliação |
| [DICOMweb](https://www.dicomstandard.org/News-dir/ftsup/docs/sups/sup248.pdf) | QIDO-RS, WADO-RS e STOW-RS | imagens precisam de UID write-once, busca/recuperação/ingestão e auditoria |
| [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [CFMV Res. 1465/2022](https://manual.cfmv.gov.br/arquivos/resolucao/1465.pdf) | dados de saúde são sensíveis; telemedicina veterinária tem regra própria | manter consentimento, minimização, retenção, autoria e revisão jurídica; não declarar conformidade sem autoridade |

Decisão operacional: uma “integração” só entra na barra quando houver ingress
autenticado, escopo, outbox/inbox, idempotência, retry, lease/fence, DLQ,
reconciliação e prova de tenant. Uma função de IA só pode gerar rascunho com
modelo/versão/origem/consentimento, revisão e aceite humano auditáveis.

## Gaps de código confirmados para a próxima sessão

- `apps/spa/src/router/routes.ts` ainda direciona administração/configurações
  para `PlaceholderPage.vue`.
- `apps/api/src/bootstrap.ts` e `apps/api/src/index.ts` ainda possuem
  caminhos `InMemory*`; módulos de reports/quotes/staff/diagnostics/PIX também
  mantêm Map/in-memory em cenários de fallback.
- `infra/scripts/bootstrap-local.mjs` documenta fallback in-memory quando
  Docker/PostgreSQL não estão disponíveis; isso não pode ser confundido com
  prontidão production-like.
- O manifesto `docs/phase-9-migration-manifest.json` ausente impede a checagem
  de consistência de migrações.
- Paridade geral e clínica continuam 0/11 e 0/3; os bloqueadores detalhados
  estão no relatório de readiness e no acervo Vetus.
- Ainda não há prova completa de provedores reais, webhook HTTP com retry/DLQ e
  lease fencing, PIX PostgreSQL/RLS fora dos slices, hidratação cross-instance,
  cobertura ≥80% global, WCAG, deploy/restore/failover ou homologação.

## Próximo passo executável

1. Registrar o resultado deste checkpoint nos ledgers e manter o estado
   `IN_PROGRESS/PARTIAL`.
2. Escrever RED/GREEN para os dois bloqueios do `pnpm test:critical`: usar UUID
   real no fixture de rollback e tornar a asserção de grants Helm semanticamente
   fiel à renderização, sem relaxar least privilege.
3. Reexecutar somente o teste crítico afetado e, depois, `pnpm test:critical`
   completo; anexar stdout/exit status como evidência nova.
4. Retomar `CVG-002C6` pela prova de eventos em processo filho/SIGKILL/takeover,
   failpoints cross-domain e webhook HTTP retry/DLQ/fence. Só então expandir a
   jornada pública clínica-financeira e começar os domínios de paridade.

Não executar produção, rotação de credenciais, homologação fiscal/provedor,
deploy alvo ou aceite de risco HIGH/CRITICAL sem decisão humana explícita.

## Regra de encerramento

Na próxima sessão, não repetir a leitura integral de `docs/` se o manifesto
continuar igual; validar o hash, ler este checkpoint e conferir os ledgers. Se o
manifesto mudar, registrar nova contagem e motivo. Não converter score
estrutural, presença de rota ou teste de um slice em aprovação do ERP.

## Publicação deste checkpoint

O checkpoint, o artefato, os ledgers e o estado canônico foram publicados no
commit 30fa5271b94e2d13451295504f23b843b6a94316, no branch
agent/sync-v4-full-program. A reconciliação confirmou HEAD igual a origin; o
único caminho dirty continua sendo o cache user-owned
packages/design-system/tsconfig.vue.tsbuildinfo.

## Reteste crítico pós-fix — 23/08/2026, 19:03 BRT

O ajuste delimitado de least privilege foi publicado no template Helm:
`REVOKE cvg_installer FROM :"worker_user";` agora aparece explicitamente após
o grant do instalador para a API. O commit de código é `6afd1d9`. A revisão
independente encontrou Critical/High **nenhum**; permanece apenas a limitação
de não haver aplicação do chart em um cluster real nesta rodada.

Testes focados na árvore atual: daily-charge HTTP PostgreSQL **4/4**,
installation-state **8/8**, runtime-role-grants **11/11** e
FK/integrity/PIX **68/68**. A execução integral repetida com PostgreSQL
descartável —
`REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/database
tests/integration/setup tests/integration/foundational.test.ts --config
vitest.integration.config.ts --reporter=dot` — terminou `exit 1`, com **382/387**
testes em **23/28** arquivos.

O full run ainda exibiu cinco falhas: o daily-charge carregou
`stayday_<token>` apesar de o arquivo atual e o teste isolado usarem UUID; duas
asserções FK e a unicidade de usuário foram preemptadas por validação/NOT NULL;
o fixture de backfill PIX referenciou conta inexistente; e o teardown de
`production-like-runtime-bootstrap.test.ts` excedeu 30s. Como os mesmos
arquivos passam isoladamente, isso fica registrado como problema de
reprodutibilidade/isolation/cache a investigar, não como correção artificial de
contrato. `QB-REL-01`, `QB-SEC-01`, CVG-002C6 e o ERP global continuam
`IN_PROGRESS/PARTIAL`.

### Ponto de entrada da próxima sessão

Validar a causa do full run divergente com cache/paralelismo controlados,
preservar o teste isolado 4/4 e os contratos 8/8 + 11/11, e somente então
reexecutar o gate integral. Depois retomar child-process domain/SIGKILL,
failpoints completos, PIX PostgreSQL/RLS e webhook HTTP retry/DLQ/fence. Não
promover paridade, SPA, WCAG, providers, Redis, cobertura, operações, deploy,
release ou produção.

## Reteste controlado de continuidade — 23/08/2026, 19:26 BRT

Esta seção atualiza a hipótese anterior sobre `stayday_<token>`. O diagnóstico
foi executado sem cache e sem paralelismo entre arquivos, contra PostgreSQL
descartável:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run tests/integration/database \
  tests/integration/setup tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot \
  --no-cache --no-file-parallelism --teardownTimeout=120000
```

Resultado: `exit 1`, **5 arquivos falhos / 23 aprovados (28)** e **4 testes
falhos / 383 aprovados (387)**, em aproximadamente **528,85 s**. Nenhuma
falha `stayday_<token>` apareceu; o teste diário passou no mesmo full run. A
divergência anterior fica classificada como problema de reprodutibilidade do
harness (cache/paralelismo), não como motivo para relaxar o contrato UUID.

As falhas restantes devem ser corrigidas sem ampliar as asserções:

1. `fk.test.ts`: o caso de `patient_id` inválido é interceptado pelo guard de
   proprietário primário antes da FK.
2. `fk.test.ts`: o caso de profissional inválido é interceptado pelo `NOT
   NULL` de `appointments.reason` antes da FK.
3. `integrity.test.ts`: a duplicidade de e-mail é interceptada pelo `NOT NULL`
   de `users.username` antes da constraint unique.
4. `pix-service-principals.test.ts`: o fixture de backfill cria uma conta ligada
   a tenant ausente no banco novo.

Também houve dois `afterAll` acima do limite efetivo de **30 s** em
`worker-event-consumers-postgres.test.ts` e `installation-state.test.ts`.
`--teardownTimeout=120000` não alterou esse limite de hook; a próxima sessão
deve medir e configurar explicitamente `hookTimeout`/teardown, sem ocultar
processos ou pools não encerrados.

As regressões focadas anteriores continuam válidas: diária HTTP PostgreSQL
**4/4**, instalação **8/8**, grants de runtime **11/11** e FK/integrity/PIX
**68/68** isoladamente. O gate crítico segue `QB-REL-01 FAIL/PARTIAL`;
`CVG-002C6`, o ERP global e os gates de produção, provider, SPA, paridade,
WCAG, operações, cobertura e release permanecem `IN_PROGRESS/PARTIAL`.

### Próxima ação concreta

Corrigir somente os quatro fixtures para que cada teste alcance a constraint
que pretende provar; inspecionar os dois teardowns e tornar o gate determinista
com `hookTimeout` explícito. Reexecutar os três arquivos focados e o comando
controlado completo, anexando stdout/exit status. Somente com **387/387**
reproduzível retomar child-process/SIGKILL/takeover, failpoints, PIX
PostgreSQL/RLS e webhook HTTP retry/DLQ/lease fencing.

## Publicação do checkpoint — 23/08/2026, 19:32 BRT

Esta atualização documental foi publicada no commit `cef5d6392c82b60e9a13881fa1e8826c39accb7a`
(`docs: record controlled critical retest`) e enviada para
`origin/agent/sync-v4-full-program`. A reconciliação final confirmou `HEAD`
igual ao remoto no ponteiro de reconciliação `b7768ce822804fecfed7a9ff2fc0f744b438f26f`
(`docs: reconcile retest publication pointer`). O único caminho fora do commit
continua sendo o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`.

## Rodada de fixtures determinísticos e teardown — 23/08/2026, 20:08 BRT

Esta rodada corrigiu somente as preempções de fixture e a limpeza do harness;
ela ainda não fecha o gate crítico nem promove qualquer gate global.

- `packages/db/migrations/0123_encounter_owner_guard_fk_order.sql` altera o
  guard de owner para consultar o paciente por `(account_id, id)`. Paciente
  inexistente passa ao FK composto de `encounters`; paciente existente com
  owner divergente continua rejeitado pela mensagem de histórico.
- `tests/integration/database/fk.test.ts` cria tenant/account/owner/patient/user
  reais dentro de uma transação descartável. Os cinco casos de enforcement não
  têm mais `return` silencioso e o encounter/appointment alcançam as FKs
  pretendidas com os campos obrigatórios válidos.
- `tests/integration/database/integrity.test.ts` cria account/user autossuficientes
  e testa a duplicidade de e-mail com `username` válido; o caso de encounter sem
  paciente agora prova `NOT NULL` sob a semântica da migration 0123.
- `tests/integration/database/pix-service-principals.test.ts` cria o tenant na
  mesma transação do account do fixture, removendo a dependência de UUID
  sentinela.
- `vitest.integration.config.ts` passa a serializar arquivos e fixa
  `hookTimeout`/`teardownTimeout` em 120 s; os dois `afterAll` explícitos de
  `worker-event-consumers-postgres.test.ts` e `installation-state.test.ts`
  receberam o mesmo limite. A limpeza continua encerrando pools/sessões e
  removendo os recursos, sem `force` ou skip.

Verificação Lead independente da suíte FK/integrity, em PostgreSQL descartável:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database/fk.test.ts \
  tests/integration/database/integrity.test.ts \
  --config vitest.integration.config.ts --reporter=verbose \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Resultado: migration 0123 aplicada em banco novo; **2 arquivos / 63 testes
passaram**, `exit 0`, duração Vitest de aproximadamente 34,44 s. ESLint dos
arquivos alterados terminou `exit 0`; Prettier dos arquivos TypeScript e
configuração terminou `exit 0`; `git diff --check` terminou `exit 0`. O fixture
PIX focal permanece verde em **5/5**, e a sequência provider → PIX passou **11/11**
em banco descartável. Os reports dos builders registram também worker-event
**3/3** e installation-state **8/8** com o novo timeout.

Limitações atuais: o último full critical ainda é o reteste controlado de
**383/387**, antes desta rodada; o comando integral pós-correção ainda precisa
ser executado. A crítica independente disponível foi feita antes dos fixtures
determinísticos e rejeitou o harness por vacuidade; uma nova crítica, após o
full run, continua obrigatória. O estado canônico permanece
`CVG-002C6=IN_PROGRESS`, `verification_state=PARTIAL`, stop decision `ACTIVE`.

### Próxima ação concreta

Executar, como Lead, o comando integral abaixo contra PostgreSQL descartável e
guardar stdout/exit status:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database tests/integration/setup \
  tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Só aceitar `QB-REL-CRITICAL-HARNESS` com **387/387** reproduzível, teardown
completo e crítica independente atualizada. Depois disso, retomar child-process
domain/SIGKILL/takeover, failpoints completos, PIX PostgreSQL/RLS e webhook HTTP
retry/DLQ/lease fencing; manter WebAuthn, hidratação cross-instance, RLS/FORCE
RLS global, providers, Redis, SPA/paridade, WCAG, cobertura, operações,
deploy/restore e release explicitamente abertos.

## Publicação da rodada — 23/08/2026, 20:09 BRT

O código e o checkpoint desta rodada foram publicados no commit `75a5ccd`
(`fix: make critical integration fixtures deterministic`) e enviados com
upstream para `origin/agent/sync-v4-full-program`. O commit contém a migration
0123, os fixtures determinísticos, os limites explícitos do Vitest e os
documentos/ledgers de continuidade. O próximo operador deve partir deste SHA,
validar o full critical pós-fix e não interpretar o commit como aprovação
global; o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`
continua fora do stage.

## Reconciliação final do checkpoint — 23/08/2026, 20:18 BRT

O conteúdo de implementação é `75a5ccd` e a reconciliação documental/controle
de estado é `dce9c36` (`docs: reconcile deterministic fixture checkpoint`). O
push confirmou o branch `agent/sync-v4-full-program` no GitHub; após a próxima
verificação, `HEAD` deve coincidir com `origin`. O ponto de entrada continua
este arquivo, com o próximo passo integral explicitado acima; somente o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` pode permanecer
dirty.

## Reteste crítico pós-fix — 23/08/2026

O full critical pós-correção foi finalmente executado contra PostgreSQL
descartável novo, sem cache e sem paralelismo entre arquivos, com
`hookTimeout` e `teardownTimeout` explícitos de 120 s. Migrations `0000`–`0123`
foram aplicadas; o banco reportou 172 tabelas, 43 enums e 456 FKs. O teardown
terminou sem timeout reportado.

Comando:

```bash
REQUIRE_TEST_DB=1 pnpm exec vitest run \
  tests/integration/database tests/integration/setup \
  tests/integration/foundational.test.ts \
  --config vitest.integration.config.ts --reporter=dot \
  --no-cache --no-file-parallelism \
  --hookTimeout=120000 --teardownTimeout=120000
```

Resultado bruto: **27/28 arquivos**, **386/387 testes**, `exit 1`, duração
`646.58s`. A única falha foi
`pix-service-principals.test.ts > backfills and defaults existing and new users
to interactive human principals`, com violação de
`users_account_id_accounts_id_fk` durante a aplicação da migration de service
principals. O arquivo PIX passa isoladamente **5/5** e provider → PIX passa
**11/11**; portanto a causa pendente é uma divergência de isolamento/fixture no
contexto integral, não uma justificativa para remover FK, apagar órfãos ou
relaxar a migration 0112. A evidência detalhada está em
[`CVG-002C6-critical-retest-postfix-2026-08-23.md`](../.agent/artifacts/CVG-002C6-critical-retest-postfix-2026-08-23.md).

O gate `QB-REL-CRITICAL-HARNESS` permanece `PARTIAL/FAIL`; `CVG-002C6`, ERP,
Quality Bar, produção, providers, SPA, paridade, WCAG, operações, cobertura,
deploy/restore e release continuam `IN_PROGRESS/PARTIAL`. A próxima sessão
deve reproduzir a menor sequência que introduz o usuário órfão antes do PIX,
corrigir somente a causa de isolamento, repetir os focados e o full critical,
e obter uma crítica independente pós-fix sobre vacuidade, constraints,
isolamento tenant e teardown antes de retomar child-process/SIGKILL,
failpoints, PIX PostgreSQL/RLS ou webhook HTTP retry/DLQ/fencing.

O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` continua
fora do stage.
