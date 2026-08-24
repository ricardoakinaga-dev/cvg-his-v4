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

| Medida | Resultado |
| --- | ---: |
| Arquivos | 1.456 |
| Markdown | 1.004 |
| JSON | 129 |
| HTML | 67 |
| PNG | 255 |
| Gzip | 1 |
| Arquivos textuais | 1.200 |
| Arquivos binários | 256 |
| Bytes totais | 53.957.807 |
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

| Gate | Situação atual | Motivo de não promoção |
| --- | --- | --- |
| `QB-SEC-01` | `PARTIAL` | fail-closed e controles melhorados, mas a suíte crítica e a durabilidade completa ainda não fecham todos os casos |
| `QB-DATA-01` | `PARTIAL` | recorte documentado em 154/155 para RLS/FORCE RLS; falta prova global com roles runtime |
| `QB-AUTH-01` | `PARTIAL` | sessão, MFA, revogação e rate-limit entre réplicas ainda incompletos |
| `QB-CORE-01` | `PARTIAL` | seam clínico-financeiro bounded; matriz cross-domain e falhas ainda abertas |
| `QB-PARITY-01` | `FAIL` | Vetus geral 0/11 e clínica 0/3 |
| `QB-UX-01` | `NOT_RUN` | falta auditoria WCAG 2.2 AA, teclado, foco, mobile e recuperação |
| `QB-REL-01` | `FAIL/PARTIAL` | cobertura e release E2E ainda não são integralmente verdes |
| `QB-OPS-01` | `BLOCKED` | deploy, restore, failover, RPO/RTO e SLO exigem ambiente autorizado |
| `QB-MKT-01` | `NOT_RUN` | capacidade competitiva não foi convertida em resultado comportamental do produto |

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
