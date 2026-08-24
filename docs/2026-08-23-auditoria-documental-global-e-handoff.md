# Auditoria documental global e handoff

**Data da consolidação:** 23 de agosto de 2026, 22:34 BRT
**Branch:** `agent/sync-v4-full-program`
**HEAD verificado antes desta publicação:** `6996deb951d8ca35705d1c2e9d1b6ed13bc0401f`
**Estado:** `BUILD/VERIFY`, `IN_PROGRESS/PARTIAL`

Este documento registra o que foi lido, reconciliado e comprovado até esta
sessão para que outra sessão possa retomar sem transformar histórico em prova
atual. Ele é um handoff operacional; não é declaração de produção, paridade,
conformidade ou perfeição do ERP.

## Retomada curta

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git fetch origin agent/sync-v4-full-program
git status --short
git log -1 --oneline
git diff --check
```

Leia nesta ordem:

1. [`2026-08-23-checkpoint-retomada-sessao-atualizado.md`](2026-08-23-checkpoint-retomada-sessao-atualizado.md);
2. [`../.agent/state.json`](../.agent/state.json), item `CVG-002C6`;
3. [`../.agent/backlog.json`](../.agent/backlog.json);
4. [`../.agent/plans/premium-enterprise-mvp.md`](../.agent/plans/premium-enterprise-mvp.md);
5. este handoff e o artefato de processo
   [`../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md`](../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md);
6. os últimos registros de [`../.agent/execution-log.jsonl`](../.agent/execution-log.jsonl)
   e [`../.agent/verification.jsonl`](../.agent/verification.jsonl).

O único dirty path esperado é o cache user-owned
[`../packages/design-system/tsconfig.vue.tsbuildinfo`](../packages/design-system/tsconfig.vue.tsbuildinfo).
Não fazer stage, limpeza, revert ou commit desse arquivo.

## Corpus documental lido e inventariado

O inventário atual de `docs/` foi reexecutado por caminho e conteúdo:

| Medida                                             |                                                          Resultado |
| -------------------------------------------------- | -----------------------------------------------------------------: |
| Arquivos                                           |                                                              1.456 |
| Markdown                                           |                                                              1.004 |
| JSON                                               |                                                                129 |
| HTML                                               |                                                                 67 |
| PNG                                                |                                                                255 |
| Gzip                                               |                                                                  1 |
| Arquivos textuais                                  |                                                              1.200 |
| Arquivos binários                                  |                                                                256 |
| Bytes totais                                       |                                                         53.957.807 |
| SHA-256 do manifesto ordenado por caminho/conteúdo | `5f16bfc916277a232726ea670e140c9b87c4da3e0c091e529d560b097679e546` |

Os Markdown, JSON e HTML foram varridos como texto; os 129 JSON foram
parseados sem erro. PNG e gzip foram verificados por assinatura e hash, não
interpretados como requisito executável. As contagens anteriores (1.445,
1.447, 1.449 e 1.454) são snapshots históricos e não devem substituir este
manifesto atual.

## Regra de autoridade

Em qualquer conflito, a ordem é:

1. comportamento reproduzido no runtime e testes atuais;
2. persistência, migrations e estado de controle;
3. código e contratos da API;
4. documentação ativa de agosto de 2026;
5. arquitetura e ADRs;
6. auditorias antigas;
7. referência Vetus e `docs2` histórico.

`docs2/` e `docs/vetus/` continuam sendo contexto e referência de produto, não
especificação automática nem evidência de paridade do CVG-HIS. Scores antigos
de 85/100, 95/100 ou 100/100 medem presença estrutural quando assim indicado;
não fecham jornada comportamental.

## Evidência técnica preservada

- O harness crítico PostgreSQL passou **28/28 arquivos e 387/387 testes** em
  banco descartável novo, migrations `0000–0123`, 172 tabelas, 43 enums, 456
  FKs e teardown concluído. A revisão independente aceitou somente o escopo de
  isolamento; permanece a lacuna de commit-boundary de receipt válido.
- O prefixo cash-receipt → PIX passou **30/30** após remover o bypass de
  `session_replication_role` do fixture.
- A prova child-process inpatient passou **2/2 em 81,65 s** com PIDs reais,
  `SIGKILL` em `after_claim` e
  `after_domain_command_before_cas`, expiração/takeover de lease e replay
  idempotente. API e worker usaram roles distintas `LOGIN NOSUPERUSER
NOBYPASSRLS`; SQL reconciliou consumo, estoque, billing, audit, outbox e
  idempotência.
- A revisão independente aceitou a prova child-process apenas como bounded.
  Ainda faltam stale-owner com A vivo, billing `source_entity_id` explícito,
  hash canônico completo, payload divergente, dois tenants/A-B, hidratação de
  segunda API, inclusão no CI crítico e os demais boundaries.
- O seam público HTTP/PostgreSQL existente já costura:
  `admissão → handoff/ack → internação → consumo de lote → diária/billing →
alta → close → receipt → ledger/reconciliation → audit/outbox`.
  Isso é uma prova vertical bounded, não a matriz integral de restart/failpoint.

Artefatos e testes: [`../.agent/artifacts/CVG-002C6-critical-harness-green-2026-08-23.md`](../.agent/artifacts/CVG-002C6-critical-harness-green-2026-08-23.md), [`../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md`](../.agent/artifacts/CVG-002C6-process-sigkill-2026-08-23.md), [`../tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`](../tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts) e [`../tests/integration/process/inpatient-domain-sigkill.test.ts`](../tests/integration/process/inpatient-domain-sigkill.test.ts).

## Quality Bar global reconciliada

| Gate           | Situação atual | Motivo de não promoção                                                                                            |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `QB-SEC-01`    | `PARTIAL`      | fail-closed e controles melhorados, mas a suíte crítica e a durabilidade completa ainda não fecham todos os casos |
| `QB-DATA-01`   | `PARTIAL`      | recorte documentado em 154/155 para RLS/FORCE RLS; falta prova global com roles runtime                           |
| `QB-AUTH-01`   | `PARTIAL`      | sessão, MFA, revogação e rate-limit entre réplicas ainda incompletos                                              |
| `QB-CORE-01`   | `PARTIAL`      | seam clínico-financeiro bounded; matriz cross-domain e falhas ainda abertas                                       |
| `QB-PARITY-01` | `FAIL`         | Vetus geral 0/11 e clínica 0/3                                                                                    |
| `QB-UX-01`     | `NOT_RUN`      | falta auditoria WCAG 2.2 AA, teclado, foco, mobile e recuperação                                                  |
| `QB-REL-01`    | `FAIL/PARTIAL` | cobertura e release E2E ainda não são integralmente verdes                                                        |
| `QB-OPS-01`    | `BLOCKED`      | deploy, restore, failover, RPO/RTO e SLO exigem ambiente autorizado                                               |
| `QB-MKT-01`    | `NOT_RUN`      | capacidade competitiva não foi convertida em resultado comportamental do produto                                  |

Nenhum gate global, `CVG-002C6`, ERP ou produção foi promovido.

## Auditoria de produto e pesquisa oficial

As fontes oficiais revalidadas apontam como padrão moderno recorrente: prontuário
colaborativo e versionado, SOAP/autosave, flowboard de internação, treatment
sheet, alta, captura de cobrança ligada ao ato clínico, lote/validade/FEFO,
portal do tutor, pagamentos, laboratório/imagem, integrações versionadas e
observabilidade. As fontes são benchmark de produto, não validação do código:

- [ezyVet Features](https://www.ezyvet.com/features) e [API Release Notes](https://developers.ezyvet.com/release-notes.html);
- [Shepherd Features](https://www.shepherd.vet/features/);
- [Digitail](https://digitail.com/);
- [Vetspire API](https://developer.vetspire.com/);
- [Covetrus Ascend Cloud](https://software.covetrus.com/apac/veterinary-solutions/ascend-cloud-veterinary-software/);
- [Provet Cloud](https://www.provet.cloud/product/first-opinion-clinics);
- [Instinct EMR](https://instinct.vet/products/instinct-emr/).

Padrões normativos a manter no backlog: [FHIR R5](https://hl7.org/fhir/R5/),
[FHIR Provenance](https://hl7.org/fhir/provenance.html), [DICOMweb + FHIR](https://www.dicomstandard.org/using/dicomweb/dicomweb-and-hl7-fhir),
[LGPD, art. 5º, II](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
e [CFMV Resolução 1.465/2022](https://manual.cfmv.gov.br/arquivos/resolucao/1465.pdf).

Lacunas P0 observadas no código: fallbacks process-local em domínios críticos,
laboratório in-memory/lock local, ausência comprovada de FHIR/DICOMweb
produtivo, revoke/rotate/DLQ de integrações incompletos, portal/telemedicina
ausentes e backup/restore/failover sem evidência de ambiente alvo. Não usar
fallback `Map` como prova de durabilidade.

## Crítica independente global

O revisor independente classificou o ERP global como **REJECT** para
`production-ready` e a prova child-process como **ACCEPT bounded**. O maior gap
é a ausência de uma jornada comportamental completa e rejeitável
`tutor → paciente → agenda/atendimento → internação/transferência →
consumo/estoque → billing/ledger → caixa/recebimento → fechamento →
auditoria/outbox`.

Achados High que a próxima sessão deve tratar com evidência executável:

- o deploy canônico não define explicitamente
  `RUNTIME_DISTRIBUTED_STATE_ENABLED` no compose production-like, enquanto a
  política de rate-limit exige estado distribuído e fail-closed;
- a API possui requisitos de Pagar.me, NFS-e, Resend, SMS, Google Calendar,
  ClamAV e storage que não estão todos representados no `.env.v2.example`;
- o readiness atual mede presença estrutural de scripts/arquivos e não prova
  que `deploy:check`, E2E e paridade executaram com sucesso;
- a configuração de coverage exclui rotas, bootstrap, repositories e módulos
  críticos, então qualquer percentual não representa os caminhos sensíveis;
- o processo child/SIGKILL ainda não está incluído em `test:critical`.

Achados Medium: fixture de um tenant, API dentro do harness, ausência de
stale-owner com A vivo, A/B/spoofing, segunda API hidratada, failpoints
completos, Redis failover/clock skew, `billing_items.source_entity_id`
explícito e hash canônico completo; RLS 154/155 ainda é recorte estático;
Helm e visual regression não são provas de ambiente alvo; e há links absolutos
históricos que precisam ser corrigidos quando o runbook correspondente for
retomado.

Ordem recomendada pelo revisor: fechar boot/deploy e manifesto de migrations;
costurar uma jornada vertical P0 com dois tenants e failpoints; promover a
prova processual ao CI crítico; fechar sessão/MFA/Redis/backup/restore; e só
então executar paridade Vetus por domínio e promoção de release.

## Próxima sequência obrigatória

1. stale-owner fencing com processo A ainda vivo;
2. asserções de `billing_items.source_entity_id`, hash canônico e replay
   divergente;
3. dois tenants, A/B, spoofing e hidratação/rebootstrap de segunda API;
4. failpoints/restart em admission, handoff, inventory, daily billing,
   discharge, close e receipt;
5. reexecução do harness crítico e crítica independente;
6. PIX PostgreSQL/RLS e webhook HTTP retry/DLQ/lease fencing;
7. somente depois, paridade Vetus, SPA/WCAG, providers, cobertura, deploy,
   restore/failover e release.

Preservar `IN_PROGRESS/PARTIAL` enquanto qualquer item obrigatório estiver sem
evidência fresca, independente e reproduzível. Não acessar produção, provedores
reais, credenciais, homologação fiscal ou cluster alvo sem aprovação humana.

## Publicação

Esta consolidação deve ser publicada junto com o ajuste dos ponteiros em
`docs/README.md`, no checkpoint curto e nos ledgers de controle. Após o push,
validar `HEAD == origin/agent/sync-v4-full-program`, `git diff --check` e que
somente o `tsconfig.vue.tsbuildinfo` permanece dirty.

## Publicação reconciliada

Commit de conteúdo: `a4b85624653314b06aa951e8046664852a7a9c56`
(`docs: consolidate global audit handoff`). A reconciliação documental seguinte
foi publicada em `b41e938` (`docs: reconcile audit handoff publication`); ambos
foram enviados ao branch remoto. Para o ponteiro atual, sempre execute `git
fetch` e compare `git rev-parse HEAD` com
`git rev-parse origin/agent/sync-v4-full-program`. O único caminho dirty
continua sendo o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, fora do commit.

## Atualização de execução — 24/08/2026

O slice seguinte foi executado e documentado em
[`../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md).
O `test:critical` agora é composto por duas fases fisicamente isoladas e
passou com URL explícita:

- base: **28/28 arquivos, 387/387 testes, exit 0**;
- processo inpatient/SIGKILL: **1/1 arquivo, 2/2 testes, exit 0**.

As regressões focadas de inventário (**3/3**) e bootstrap production-like
(**6/6**), além do fechamento → receipt (**5/5**), também passaram. O teste de bootstrap usa timeout de teardown de
120 s; a implementação de rollback observa rejeições da hidratação de cache e
registra `accountId`/cache afetado, mantendo o boundary assíncrono sem
`unhandled rejection` silenciosa.

Guardrails executados com exit 0: `pnpm deploy:check` (12/12), checker JSON de
cutover (12/12), relatório de consistência de migrations (manifest v2, cinco
ondas `PLAN_ONLY`), RLS (154/155 com uma exceção documentada), OpenAPI (337
paths/390 schemas) e `pnpm security:secrets`. A distinção Redis host
`localhost:6380` versus container `redis:6379` e o flag
`RUNTIME_DISTRIBUTED_STATE_ENABLED=1` agora estão no exemplo/env/Compose e no
runbook.

A revisão independente final não encontrou P0. Permanecem P1 de
endurecimento do harness (prova explícita de duas execuções simultâneas ou
lock externo) e retry de inventário sem backoff/jitter; são follow-ups, não
claims de produção. A Quality Bar global, CVG-002C6 e o ERP permanecem
`IN_PROGRESS/PARTIAL`: Vetus geral segue 0/11, clínica 0/3, e continuam abertos
paridade comportamental, sessão/WebAuthn, Redis/providers, SPA/WCAG, cobertura,
backup/restore/failover, operações e release.

### Publicação deste checkpoint

O commit `d23120a` (`fix: harden critical runtime and deployment gates`) foi
enviado para `origin/agent/sync-v4-full-program`. A reconciliação pós-push
confirmou `HEAD == origin/agent/sync-v4-full-program` em
`d23120accb6c6f5ea1e26d6e54bbef9477bc5622`. O único caminho dirty continua
sendo o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`,
fora do stage.

O commit documental de ponteiro `4ee4afc` (`docs: record critical gates
publication`) sucedeu o commit de implementação acima e também foi enviado ao
remoto. Como o branch pode avançar com novos checkpoints, a próxima sessão
deve sempre repetir `git fetch` e comparar `HEAD` com `origin`.

## Atualização de execução — stale-owner A vivo — 24/08/2026

O próximo gap P0 foi fechado apenas no limite de evidência do fixture de
processo. O RED novo falhou em **2/2** porque o child process não expunha o
resultado da tentativa de `completeClaim` depois da perda da lease. A fixture
agora tem uma barreira de pausa controlada por `SIGUSR2` (somente em teste) e
publica `leaseLost` a partir do retorno real do CAS.

O GREEN foi executado contra PostgreSQL efêmero novo:

```text
1 arquivo, 4/4 testes, exit 0, 233,66 s
```

Os quatro casos incluem os dois checkpoints SIGKILL já existentes e os dois
casos em que A permanece vivo em `after_claim` e
`after_domain_command_before_cas`. A prova confirma PIDs distintos, lease
`1 → 2`, B concluindo, A ainda vivo até ser liberado, `outboxCompletion=false`
e `leaseLost=true` no CAS tardio. A reconciliação SQL confirma uma única
consumption/billing/audit/outbox, estoque `8`, idempotência `1`, attempts `2`
e `lease_version=2`; Prettier e ESLint dos arquivos alterados passaram.

Artefato: [`../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`](../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md).

Isso reduz a lacuna de fencing, mas não promove `CVG-002C6`, o ERP ou
produção. Ainda faltam crítica independente fresca, billing
`sourceEntityId`/hash canônico e replay divergente, dois tenants/A-B/spoofing,
hidratação cross-instance, failpoints completos, PIX/RLS, webhook retry/DLQ e
os gates de paridade, SPA/WCAG, providers, operações e release.

### Publicação reconciliada — stale-owner — 24/08/2026

O commit de implementação e evidência `af4bf20`
(`test: prove stale-owner fencing with live worker`) foi enviado ao GitHub.
O `git fetch` pós-push confirmou
`HEAD == origin/agent/sync-v4-full-program` em
`af4bf20e2c2fbbbf716bd8a0fba13a008af88c54`. O único caminho dirty continua
sendo o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, preservado fora do stage.

## Atualização de execução — billing source/hash — 24/08/2026

O follow-on do mesmo harness tornou executáveis três claims que eram apenas
limitações da revisão: `billing_items.source_entity_type` é
`inventory_consumption`, `source_entity_id` coincide com o ID persistido do
consumo, e `request_hash` é comparado ao SHA-256 completo do envelope canônico
HTTP (`path`, `query`, `body`). O replay da mesma chave com `quantity=3` é
exercitado pela API real e precisa retornar `409 IDEMPOTENCY_CONFLICT` sem
alterar o grafo SQL.

O primeiro RED revelou a forma correta do contrato: o hash não é do body cru,
mas de `{path, query, body}` produzido pelo dispatcher. Após alinhar a
asserção ao canonicalizer compartilhado, a execução GREEN passou **4/4 testes
em 1 arquivo**, exit 0, em 125,96 s; os dois SIGKILL e os dois stale-owner
continuaram verdes. Não foi necessário alterar código de produção: a rota e o
UoW já implementavam a regra, que agora está coberta na fronteira de processo.

Artefato: [`../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`](../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md).

A crítica independente fresca rerodou o mesmo slice com banco descartável,
retornou **APPROVE bounded**, encontrou 4/4 testes verdes e nenhum P0/P1. A
publicação desta rodada ainda precisa do commit/push e da reconciliação final
de SHA. Permanecem abertos dois tenants/A-B/spoofing, hidratação
cross-instance e failpoints completos da jornada. A barra global e
`CVG-002C6` permanecem `IN_PROGRESS/PARTIAL`.

### Publicação reconciliada — billing source/hash — 24/08/2026

O commit `9bd8cd8`
(`test: assert billing provenance and canonical replay hash`) foi enviado ao
GitHub. O `git fetch` pós-push confirmou
`HEAD == origin/agent/sync-v4-full-program` em
`9bd8cd8aab0c9f7fe78f4f0b6a5355619cd827a5`. O único caminho dirty continua
sendo o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, preservado fora do stage.
Na próxima sessão, repetir `git fetch`/`git rev-parse`, ler este handoff e
retomar A/B entre tenants, hydration cross-instance e failpoints.

## Atualização de execução — hidratação cross-instance e isolamento A/B — 24/08/2026

A próxima regressão P0 foi congelada em quatro critérios: HYD-01 exige que
uma API secundária já aquecida leia o stay de internação committed, inclusive
com status discharged; HYD-02 exige que a mesma instância leia o discharge
novo; TEN-01 exige que o bearer B não veja os dados de A; e REG-01 exige
que as regressões vertical, close/receipt e discharge permaneçam verdes.

O RED foi reproduzido antes da alteração:

```text
vertical_hydration_red: 1 arquivo, 4 passed, 1 failed, exit 1, 33,11 s
```

A causa foi stale cache real: a segunda API estava pronta antes da mutação da
primeira e retornava items=[] para o stay committed. O ajuste mínimo agora
faz refresh account-scoped a partir do PostgreSQL antes de GET /inpatient,
GET /discharges e GET /discharges/:id; a falha do repositório não é
silenciada como um board stale.

GREEN e regressões frescas:

- vertical_hydration_green2: 1 arquivo, 5/5 testes, exit 0, 36,06 s;
- close/receipt: 1 arquivo, 5/5 testes, exit 0, 50,35 s;
- discharge: 1 arquivo, 5/5 testes, exit 0, 44,93 s;
- pnpm typecheck: 70/70 projetos scoped;
- pnpm security:secrets, Prettier, ESLint focado e git diff --check:
  exit 0.

A suíte vertical comprova que a instância secundária lê o stay/discharge de A
após a mutação na primária e que o bearer B recebe listas vazias para A. A
crítica independente fresca retornou APPROVE bounded, sem P0/P1 ou
regressão bloqueadora. O artefato executável é
[CVG-002C6-cross-instance-hydration-2026-08-24.md](../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md);
os registros são VFY-CVG-002C6-CROSS-INSTANCE-HYDRATION-001 e
VFY-CVG-002C6-CROSS-INSTANCE-HYDRATION-REVIEW-001.

Este fechamento é deliberadamente bounded: não prova concorrência enquanto o
refresh está em voo (P2), invalidação Redis distribuída, todos os domínios com
cache, failpoints completos admission→receipt, composição worker de produção,
PIX/webhook, paridade Vetus ou readiness global. O estado continua
CVG-002C6=IN_PROGRESS/PARTIAL e o próximo workstream é publicar esta
rodada, expandir failpoints de discharge/close/receipt e depois tratar os
gates PIX/RLS e webhook retry/DLQ/fencing.

### Publicação reconciliada — hidratação cross-instance — 24/08/2026

O commit de implementação, teste, artefato e control plane
20cf9e666d20adeb5303f86cf32d0346e025898d
(fix: hydrate clinical reads across api instances) foi enviado ao GitHub.
O fetch pós-push confirmou HEAD == origin/agent/sync-v4-full-program no mesmo
SHA. O único caminho dirty permanece o cache user-owned
packages/design-system/tsconfig.vue.tsbuildinfo, preservado fora do stage.

A verificação de continuidade é VFY-DOCS-CONTINUATION-064. Na próxima sessão,
repetir git fetch/rev-parse, ler este handoff, o checkpoint curto, state e
backlog, e continuar pelos failpoints de discharge/close/receipt e pela
concorrência durante hydration in-flight (P2), sem promover ERP, produção,
paridade ou release.

## Atualização de continuidade — cash receipt SIGKILL — 24/08/2026

O handoff [`2026-08-24-handoff-cash-receipt-sigkill.md`](2026-08-24-handoff-cash-receipt-sigkill.md)
acrescenta uma prova GREEN bounded: API em processo filho, PostgreSQL efêmero,
`SIGKILL` durante o recebimento, rollback sem grafo parcial, restart/replay,
conflito de payload e isolamento A/B. A prova foi executada em `NODE_ENV=test`;
ela não é boot production-like, renderização Helm, entrega de worker ou prova
global de RLS/FORCE RLS.

Portanto a Quality Bar desta página não muda de estado: `QB-CORE-01` continua
`PARTIAL`; `QB-AUTH-01`, `QB-DATA-01`, `QB-PARITY-01`, `QB-UX-01`, `QB-REL-01`,
`QB-OPS-01` e `QB-MKT-01` preservam os resultados da tabela reconciliada acima.
`CVG-002C6`, ERP, produção e release permanecem `IN_PROGRESS/PARTIAL`. A próxima
ação é expandir failpoints, concorrência e takeover em admission→receipt; depois
PIX PostgreSQL/RLS e webhook retry/DLQ/lease fencing.

## Atualização de execução — concorrência de cash receipt — 24/08/2026

O handoff [`2026-08-24-handoff-cash-receipt-concurrency.md`](2026-08-24-handoff-cash-receipt-concurrency.md)
fecha uma prova adicional `GREEN bounded`: duas APIs reais com PIDs distintos,
duas chaves de idempotência e uma barreira PostgreSQL que observa o mesmo
advisory lock em estado `granted` e `waiting` antes de liberar a corrida. O
resultado foi exatamente um `201` e um `409`; tenant B recebeu `404` e a
reconciliação exige zero de todos os efeitos financeiros, de auditoria, outbox
e idempotência no tenant B. O débito e crédito de A permanecem balanceados em
`260`.

Lead e crítica independente rerodaram a suíte de concorrência e o SIGKILL em
bancos efêmeros distintos, ambos `1/1` com exit `0`; Prettier, ESLint,
`pnpm security:secrets`, `pnpm typecheck` (70/70) e `git diff --check` também
passaram. A prova ainda usa `NODE_ENV=test`, inicia os processos
sequencialmente por uma colisão de seed laboratorial conhecida e não foi
incluída no `test:critical`.

Assim, `QB-CORE-01` ganha evidência bounded de concorrência, mas continua
`PARTIAL`; todos os demais gates globais conservam os estados reconciliados.
`CVG-002C6`, ERP, produção e release permanecem `IN_PROGRESS/PARTIAL`. O
próximo gate executável é o runner serializado da matriz processual no CI;
startup horizontal idempotente, Helm renderizado, PIX/RLS e webhook
retry/DLQ/fencing continuam abertos.

### Publicação reconciliada — concorrência de cash receipt

O teste, artefato e handoffs foram publicados em
`5ed15310eb6fa777a679a7c30b9ba535a84bac91`; o próximo checkpoint deve confirmar
`HEAD == origin/agent/sync-v4-full-program` e manter o cache user-owned fora do
stage. A publicação não altera os estados globais nem promove `CVG-002C6`.
