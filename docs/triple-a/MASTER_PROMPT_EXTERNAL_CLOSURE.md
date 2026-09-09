# MISSÃO

Você é o engenheiro principal responsável por levar o repositório:

`https://github.com/ricardoakinaga-dev/cvg-his-v4`

do estado atual de:

`Enterprise-grade avançado / Triple-A Candidate`

para:

# STATE OF ART

# TRIPLO AAA

# TRIPLE-A VERIFIED

# 97–99/100 DE QUALIDADE

O objetivo NÃO é reescrever o sistema.

O objetivo NÃO é criar uma nova versão.

O objetivo NÃO é migrar prematuramente para microserviços.

O objetivo é fechar todas as lacunas técnicas, operacionais, de segurança, confiabilidade, UX, recuperação, performance e evidência externa necessárias para que o próprio quality gate do projeto possa atingir:

```text
overall >= 97
critical >= 95
open_p0 = 0
main = GREEN
claim = TRIPLE-A VERIFIED
```

Somente quando houver evidência objetiva suficiente.

---

# CONTEXTO ATUAL DO REPOSITÓRIO

O CVG-HIS V4 já possui uma arquitetura madura baseada em:

```text
apps/api
apps/spa
apps/worker
packages/modules/*
packages/shared/*
packages/db
packages/rbac
packages/security
packages/secrets
packages/tenant-context
packages/chaos
infra/*
docs/*
```

O sistema continua sendo um:

# MODULAR MONOLITH

Essa decisão arquitetural deve ser preservada.

Não introduza microserviços sem necessidade técnica extremamente forte.

---

# ESTADO ATUAL IMPORTANTE

O repositório já possui:

* API extensa;
* SPA funcional;
* worker;
* PostgreSQL;
* RLS;
* tenant isolation;
* RBAC;
* audit;
* MFA;
* API keys;
* OpenTelemetry;
* Prometheus;
* Grafana;
* backups;
* restore drills;
* Helm;
* Docker Compose;
* Semgrep;
* Secretlint;
* tests unitários;
* integration tests;
* Playwright;
* E2E;
* performance tooling;
* critical soak;
* game days;
* supply-chain controls;
* release evidence;
* SBOM;
* image digest;
* attestations;
* prepublication gate.

Também já existe um novo módulo de workflows clínicos:

`packages/modules/workflows`

com capacidades equivalentes a:

* task;
* reminder;
* acknowledgement;
* completion;
* cancellation;
* retry;
* DLQ;
* replay;
* lease;
* heartbeat;
* fencing;
* idempotency.

---

# QUALITY BAR EXISTENTE

Preserve e respeite:

`docs/triple-a/QUALITY_BAR_V1.json`

O quality bar atual exige:

```text
minimum_total_score >= 97
minimum_critical_score >= 95
maximum_open_p0 = 0
required_release_state = main_green
```

É proibido reduzir esses thresholds para conseguir PASS.

Não altere critérios para fazer a certificação passar.

Se algo não puder ser comprovado:

```text
NOT PROVEN
```

e nunca:

```text
PASS
```

---

# PRINCÍPIO CENTRAL

O projeto já tem ótima engenharia.

A prioridade agora é:

# PROVAR A CONFIABILIDADE DO SISTEMA

Portanto, concentre esforços em:

* green main;
* CI remoto;
* PostgreSQL/RLS runtime;
* worker crash recovery;
* workflow concurrency;
* critical E2E;
* UAT;
* disaster recovery;
* performance;
* soak;
* supply-chain real;
* attestations;
* branch governance;
* release evidence.

---

# REGRA ABSOLUTA

Não crie novas grandes features antes de fechar os P0 de certificação.

Não inicie:

* CRM novo;
* outro frontend;
* outro financeiro;
* outro estoque;
* novo sistema de IA;
* microserviços;
* V5.

Antes disso, complete:

# TRIPLE-A EXTERNAL EVIDENCE & PRODUCTION ASSURANCE CLOSURE

---

# FASE 0 — BASELINE FRESCO

Antes de alterar código:

1. obtenha o HEAD real da `main`;
2. leia o estado dos workflows do GitHub;
3. leia `QUALITY_BAR_V1.json`;
4. leia `FINAL_REPORT.md`;
5. leia `13-final-scorecard.md`;
6. leia o último release evidence;
7. identifique todos os P0 atuais;
8. diferencie:

   * implemented;
   * locally verified;
   * remotely verified;
   * production verified.

Crie ou atualize:

`docs/triple-a/14-external-evidence-baseline.md`

Inclua:

* current SHA;
* CI status;
* current score;
* critical score;
* open P0 count;
* blocked criteria;
* missing evidence;
* execution order.

---

# FASE 1 — GREEN MAIN CLOSURE

Objetivo:

# MAIN MUST BE 100% GREEN

Audite todos os GitHub Actions.

O estado esperado deve ser:

```text
main
├── CI                         GREEN
├── security                   GREEN
├── usability                  GREEN
├── performance                GREEN
├── critical soak              GREEN
├── operational certification  GREEN
└── release assurance          GREEN
```

Investigue workflows que aparecem como `failure` sem jobs executados.

Considere:

* YAML invalid;
* expression errors;
* permissions;
* unsupported fields;
* workflow syntax;
* reusable workflow contracts;
* policy violations;
* token permissions;
* action SHA;
* environment requirements.

Corrija a causa real.

Não transforme falhas em warnings.

Não remova gates.

Não desative workflows.

---

# FASE 2 — REQUIRED CHECKS / BRANCH GOVERNANCE

Verifique e documente:

* branch protection;
* rulesets;
* required status checks;
* required pull request reviews;
* restrictions para direct pushes;
* stale review dismissal;
* status check freshness;
* force push policy;
* branch deletion policy.

Se possível via GitHub API/CLI, produza evidência.

Crie:

`docs/engineering/BRANCH_GOVERNANCE.md`

e evidência em:

`artifacts/release/branch-governance-evidence.json`

A release deve falhar se required checks não estiverem realmente configurados.

---

# FASE 3 — CLINICAL WORKFLOW POSTGRES ASSURANCE

O módulo:

`packages/modules/workflows`

precisa sair de "PASS local" para "PASS em PostgreSQL real".

Criar integração real com PostgreSQL para:

* create task;
* list;
* get;
* acknowledge;
* complete;
* cancel;
* retry;
* DLQ;
* replay;
* event history;
* idempotency;
* tenant isolation;
* RLS.

Criar testes específicos.

Sugestão estrutural:

```text
tests/integration/workflows/
  create-postgres.test.ts
  idempotency-postgres.test.ts
  lifecycle-postgres.test.ts
  concurrency-postgres.test.ts
  lease-postgres.test.ts
  fencing-postgres.test.ts
  retry-postgres.test.ts
  dlq-postgres.test.ts
  replay-postgres.test.ts
  tenant-isolation-postgres.test.ts
  audit-postgres.test.ts
```

Adapte à convenção atual do projeto.

---

# FASE 4 — WORKFLOW CONCURRENCY ASSURANCE

Teste cenários concorrentes reais.

Obrigatórios:

## Concurrent creation

Duas requisições com mesma idempotency key.

Resultado esperado:

* um único efeito material;
* resposta determinística.

## Concurrent claim

Worker A e Worker B tentam adquirir a mesma tarefa.

Somente um deve vencer.

## Lease expiration

Worker A adquire.

Worker A para.

Lease expira.

Worker B pode adquirir.

## Fencing

Worker A com token antigo tenta concluir depois que Worker B assumiu.

A operação antiga deve ser rejeitada.

## Concurrent acknowledgment

Duas pessoas reconhecem simultaneamente.

Estado final deve ser consistente e auditável.

## Concurrent completion

Evitar double-completion.

---

# FASE 5 — WORKER CRASH RECOVERY

Construir teste de falha real.

Fluxo obrigatório:

```text
worker A claims task
↓
worker A crashes
↓
heartbeat stops
↓
lease expires
↓
worker B claims
↓
worker B processes
↓
worker A resumes with stale fencing token
↓
stale mutation rejected
```

Produzir evidência.

Testar também:

* DB restart;
* Redis failure;
* worker restart;
* API restart.

---

# FASE 6 — IDEMPOTENCY MATRIX EXECUTÁVEL

Atualize ou crie:

`docs/architecture/IDEMPOTENCY_MATRIX.md`

Mapeie:

* workflow tasks;
* medication execution;
* diagnostic result ingestion;
* PIX;
* payments;
* WhatsApp webhooks;
* laboratory imports;
* event consumers;
* scheduled jobs;
* notifications.

Para cada item:

* idempotency key source;
* uniqueness scope;
* fingerprint;
* expiration;
* replay behavior;
* failure mode.

Transforme itens P0 em testes executáveis.

---

# FASE 7 — TENANT + RLS RUNTIME ASSURANCE

Atualmente RLS estrutural está forte.

Agora prove runtime.

Teste obrigatoriamente:

```text
tenant A cannot read tenant B
tenant A cannot mutate tenant B
worker A cannot process tenant B without context
known UUID from tenant B cannot bypass policy
RLS remains active through repositories
```

Usar PostgreSQL real.

Testar com:

* API runtime role;
* worker runtime role;
* migration/admin role.

Garantir que roles administrativas não sejam usadas no runtime comum.

---

# FASE 8 — DATABASE ROLE ASSURANCE

Validar:

```text
cvg_api
cvg_worker
cvg_runtime
migration/admin role
```

Cada role deve possuir apenas o necessário.

Criar:

`docs/security/DATABASE_ROLE_MATRIX.md`

e testes que comprovem:

* least privilege;
* RLS enforcement;
* migration privileges separados;
* worker sem privilégios extras.

---

# FASE 9 — CLINICAL CRITICAL PATH E2E

Criar um E2E completo equivalente a:

```text
Owner
↓
Patient
↓
Appointment
↓
Queue
↓
Triage
↓
Encounter
↓
Inpatient admission
↓
Bed assignment
↓
Prescription
↓
Medication execution
↓
Diagnostic order
↓
Diagnostic result
↓
Workflow task
↓
Discharge
↓
Follow-up
```

Verificar também:

* audit;
* clinical timeline;
* task lifecycle;
* tenant isolation;
* notifications.

---

# FASE 10 — NEGATIVE CLINICAL E2E

Criar cenários negativos.

Exemplos:

* medication execution duplicada;
* exam result duplicado;
* discharge inválida;
* cross-tenant patient;
* prescription sem permission;
* stale task;
* completed task being replayed;
* cancelled task completion;
* missing actor;
* invalid lifecycle transition.

---

# FASE 11 — CLINICAL SAFETY INVARIANTS

Garanta execução automatizada de invariantes.

Crie/atualize:

`docs/clinical/CLINICAL_SAFETY_INVARIANTS.md`

Exemplos:

* mesma execução de medicamento não pode gerar dois efeitos;
* alteração de prontuário deve preservar histórico;
* workflow P0 deve gerar audit;
* resultado clínico não pode trocar de tenant;
* cancellation não pode apagar histórico;
* completed task não pode voltar silenciosamente a pending;
* stale lease cannot mutate current state.

Para cada invariant P0:

# MUST HAVE EXECUTABLE TEST

---

# FASE 12 — AUDIT IMMUTABILITY

Verifique que:

* task events são append-only;
* medical records revisions preservam original;
* security events não desaparecem;
* replay gera nova trilha auditável;
* administrative override contém actor + reason;
* timestamps são consistentes.

Não permitir:

`UPDATE destructive history`

quando uma revisão/versionamento for apropriada.

---

# FASE 13 — EVENT GOVERNANCE

Padronizar eventos.

Todo evento crítico deve conter:

```text
eventId
eventType
schemaVersion
accountId
actorId
correlationId
causationId
occurredAt
source
payload
```

Evitar payloads desnecessariamente grandes.

Evitar PII/clinical sensitive information desnecessária.

Criar testes de schema.

---

# FASE 14 — CLINICAL TIMELINE ASSURANCE

Se já existe projeção/timeline:

prove que:

* eventos aparecem na ordem correta;
* duplicados não aparecem;
* out-of-order events não corrompem timeline;
* replay não duplica efeito;
* tenant isolation permanece;
* timeline sobrevive a restart/rebuild.

Se incompleta, finalize.

---

# FASE 15 — WORKFLOW REPOSITORY HARDENING

Audite:

`packages/modules/workflows/src/repository.ts`

Atualmente é um hotspot relevante.

Se complexity estiver alta, decomponha apenas se houver ganho real.

Sugestão:

```text
repositories/
  task.repository.ts
  task-events.repository.ts
  lease.repository.ts
  replay.repository.ts
```

Não refatore apenas por tamanho.

Use complexity evidence.

---

# FASE 16 — WORKFLOW TEST EXPANSION

O módulo possui cobertura inicial pequena.

Expandir para:

* invalid input;
* lifecycle state machine;
* idempotency;
* retries;
* max attempts;
* DLQ;
* replay;
* fencing;
* lease;
* heartbeat;
* concurrency;
* tenant;
* permission;
* event history.

---

# FASE 17 — API AUTHORIZATION ASSURANCE

Cada endpoint de workflow deve possuir testes de:

* unauthenticated;
* wrong permission;
* correct permission;
* tenant mismatch;
* replay permission;
* mutation permission.

Exemplo:

```text
workflow-tasks.read
workflow-tasks.manage
workflow-tasks.replay
```

Não permitir que `manage` e `replay` sejam implicitamente equivalentes sem decisão formal.

---

# FASE 18 — API CONTRACT ASSURANCE

Validar OpenAPI real contra runtime.

Para workflows e fluxos clínicos:

* documented status codes;
* response schemas;
* validation;
* enum consistency;
* errors;
* pagination;
* limits.

Evitar drift:

```text
OpenAPI != implementation
```

---

# FASE 19 — FRONTEND WORKFLOW UX

Criar UX operacional extremamente eficiente.

A fila deve permitir:

* filtro por setor;
* prioridade;
* paciente;
* status;
* due time;
* overdue;
* task type.

Ações rápidas:

```text
acknowledge
complete
cancel
open patient
open encounter
```

Reduzir clicks.

---

# FASE 20 — PATIENT 360 + TASK CONTEXT

Em Patient 360, mostrar:

* critical alerts;
* overdue tasks;
* medications;
* diagnostics pending;
* handover pending;
* upcoming procedures;
* recent results;
* clinical timeline.

Não criar nova source of truth.

---

# FASE 21 — HANDOVER ASSURANCE

Se o handover já existe, conectar ao workflow.

Passagem de plantão deve incluir:

* pending tasks;
* overdue items;
* diagnostics;
* medication issues;
* reassessment;
* unresolved alerts.

Incoming team deve poder:

`acknowledge handover`

Audit obrigatório.

---

# FASE 22 — USABILITY CERTIFICATION

Corrigir o workflow atual de usability certification.

Depois executar:

* Playwright real;
* axe;
* desktop;
* tablet;
* mobile;
* keyboard navigation;
* responsive breakpoints;
* focus management;
* critical forms.

Produzir screenshots e evidence package.

---

# FASE 23 — HUMAN UAT

Preparar UAT real.

Perfis:

```text
Recepção
Veterinário
Internação
Admin
```

Cenários:

* check-in;
* atendimento;
* internação;
* medicação;
* exames;
* alta;
* workflow;
* passagem de plantão.

Gerar:

`docs/operations/HOSPITAL_UAT_PROTOCOL.md`

e:

`artifacts/usability/uat-evidence.json`

Não autoaprovar UAT.

---

# FASE 24 — ACCESSIBILITY

Exigir:

* axe zero critical;
* labels;
* focus;
* keyboard;
* form errors;
* contrast;
* dialog focus trapping;
* screen reader semantics.

Não reduzir regra para passar.

---

# FASE 25 — PERFORMANCE BASELINE

Use k6 e ferramentas existentes.

Medir:

* API p50;
* p95;
* p99;
* DB latency;
* Redis latency;
* worker throughput;
* workflow claim latency;
* task completion latency;
* concurrent sessions;
* SPA startup.

Definir budget baseado em baseline.

---

# FASE 26 — HOSPITAL LOAD PROFILE

Crie carga representativa do CVG.

Exemplo conceitual:

```text
100 sessions
active reception
hospitalization
diagnostics
workflow bursts
billing
reports
notifications
```

Não tente benchmark de hyperscale sem necessidade.

A pergunta é:

# aguenta um hospital muito ocupado com ampla margem?

---

# FASE 27 — WORKER LOAD / BACKLOG TEST

Medir:

* jobs/s;
* workflow tasks/s;
* backlog recovery;
* retry storms;
* dead-letter growth;
* lease contention.

Criar threshold.

---

# FASE 28 — SOAK TEST 24H

Preparar e executar quando ambiente permitir.

Observar:

* memory leak;
* heap;
* handles;
* DB connections;
* Redis connections;
* stuck leases;
* retries;
* queue backlog;
* response time drift.

---

# FASE 29 — SOAK 72H

Quando o 24h estiver verde, executar 72h.

Critérios:

* zero critical data loss;
* zero stale lease corruption;
* no unbounded memory growth;
* backlog bounded;
* stable latency;
* no RLS failures.

---

# FASE 30 — BACKUP ASSURANCE

Validar:

* PostgreSQL backup;
* attachments;
* checksums;
* retention;
* encryption quando aplicável.

---

# FASE 31 — RESTORE DRILL

Fluxo:

```text
backup
↓
destroy disposable environment
↓
restore DB
↓
restore storage
↓
migrate if required
↓
start API/worker/SPA
↓
critical smoke
```

Medir:

```text
RPO
RTO
```

---

# FASE 32 — CORRUPT BACKUP DRILL

Testar:

* corrupted backup;
* incomplete backup;
* wrong schema version;
* missing attachment archive.

Sistema deve detectar e bloquear restore inválido.

---

# FASE 33 — RPO / RTO

Definir valores realistas.

Não inventar números arbitrários.

Basear em:

* tamanho real do banco;
* restore time;
* hospital criticality.

Criar:

`docs/operations/RPO_RTO_POLICY.md`

---

# FASE 34 — API RESTART GAME DAY

Simular:

```text
API dies
↓
reverse proxy
↓
API returns
↓
no corruption
```

Validar sessions/tokens conforme arquitetura.

---

# FASE 35 — WORKER RESTART GAME DAY

Simular:

* kill worker;
* recreate;
* task recovery;
* no duplicate effects.

---

# FASE 36 — REDIS FAILURE GAME DAY

Testar:

* Redis unavailable;
* degraded mode;
* retry behavior;
* readiness;
* recovery.

Production-like deve falhar de maneira previsível.

---

# FASE 37 — POSTGRES FAILURE GAME DAY

Testar:

* database restart;
* temporary network failure;
* connection recovery;
* transaction rollback.

Não aceitar partial clinical mutation.

---

# FASE 38 — STORAGE FAILURE

Simular indisponibilidade de attachment storage.

Garantir:

* no silent data loss;
* explicit error;
* retry if safe;
* audit.

---

# FASE 39 — OBSERVABILITY ASSURANCE

Provar:

```text
SPA
↓ correlationId
API
↓
DB/event
↓
worker
↓
external integration
```

onde tecnicamente possível.

Verificar:

* trace propagation;
* structured logs;
* metrics.

---

# FASE 40 — HOSPITAL METRICS

Adicionar ou validar:

```text
cvg_active_inpatients
cvg_open_encounters
cvg_pending_workflow_tasks
cvg_overdue_workflow_tasks
cvg_medication_overdue
cvg_pending_diagnostics
cvg_handover_pending
cvg_job_retry_total
cvg_job_dead_letter_total
```

Evitar high-cardinality labels.

Nunca colocar patientId em Prometheus label.

---

# FASE 41 — ALERTING

Criar alertas para:

* database down;
* worker down;
* high DLQ;
* high retry;
* overdue tasks;
* backup failure;
* restore failure;
* RLS anomaly;
* excessive auth failures.

Testar entrega do alerta.

---

# FASE 42 — SLO / SLI

Definir e medir:

API:

* availability;
* p95;
* error rate.

Worker:

* processing latency;
* success rate;
* oldest job.

Workflow:

* task delay;
* overdue percentage;
* retry rate.

Criar:

`docs/operations/SLO_SLI_POLICY.md`

---

# FASE 43 — ERROR BUDGET

Implementar conceito de error budget.

Se critical SLO está fora do orçamento:

```text
feature deployment = blocked
```

quando apropriado.

---

# FASE 44 — SUPPLY-CHAIN REMOTE PROOF

O código já possui controles.

Agora prove execução real.

Para API, worker e SPA:

* build;
* image digest;
* SBOM;
* vulnerability scan;
* provenance;
* attestation;
* `gh attestation verify`.

Salvar evidence.

---

# FASE 45 — CONTAINER SCANNING

Executar scanner em imagens publicadas.

Falhar release para CVEs conforme política de severidade.

Documentar exceptions.

Exceptions precisam ter:

* owner;
* reason;
* expiry;
* mitigation.

---

# FASE 46 — DEPENDENCY GOVERNANCE

Validar:

* dependency drift;
* known CVEs;
* unsupported versions;
* multiple critical versions.

Manter `validate:dependencies`.

Integrar Renovate se ainda não estiver operacional.

---

# FASE 47 — ACTION PINNING

Garantir GitHub Actions críticas pinadas por SHA.

Criar política verificável.

---

# FASE 48 — DOCKER BASE PINNING

Pin de imagens base críticas por digest quando adequado.

Atualização via Renovate.

---

# FASE 49 — RELEASE MANIFEST

Garantir manifest imutável com:

```text
commit
source hash
image digests
SBOM digests
attestation references
migration state
test evidence
security evidence
performance evidence
recovery evidence
```

---

# FASE 50 — RELEASE AUTHORITY

Separar:

```text
build authority
technical verification
human release authority
```

Não permitir que um job marque automaticamente produção como aprovada sem gate humano quando exigido pela política.

---

# FASE 51 — DEPLOY REHEARSAL

Executar deploy em staging/disposable environment.

Validar:

* migrations;
* startup;
* readiness;
* health;
* SPA;
* worker;
* workflow;
* rollback.

---

# FASE 52 — ROLLBACK REHEARSAL

Provar rollback.

Testar:

```text
release N
↓
release N+1
↓ failure
rollback
↓
release N functional
```

Atenção a migrations incompatíveis.

---

# FASE 53 — MIGRATION COMPATIBILITY

Toda migration crítica deve ser avaliada quanto a:

* expand/contract;
* backwards compatibility;
* runtime compatibility;
* rollback constraints.

---

# FASE 54 — DATABASE INDEX / QUERY REVIEW

Use evidence.

Analisar queries críticas:

* Patient 360;
* workflow queue;
* active inpatient;
* diagnostics;
* medication;
* audit timeline.

Adicionar índices somente com justificativa.

---

# FASE 55 — SECURITY RUNTIME TESTS

Criar testes reais para:

* IDOR;
* cross-tenant;
* auth bypass;
* privilege escalation;
* SSRF;
* upload traversal;
* injection;
* webhook replay;
* API key misuse.

---

# FASE 56 — WEBHOOK REPLAY PROTECTION

Para:

* WhatsApp;
* PIX;
* laboratory;
* external diagnostic.

Garantir:

* timestamp;
* HMAC;
* key id;
* replay window;
* idempotency.

---

# FASE 57 — ATTACHMENT SECURITY

Provar:

* malware scan;
* MIME;
* tenant;
* access;
* filename;
* path traversal;
* size limits.

---

# FASE 58 — SECRET ROTATION

Criar e testar procedimentos de rotação para:

* AUTH_SECRET quando viável;
* MFA keyring;
* webhook keyrings;
* API keys;
* DB credentials.

---

# FASE 59 — LOG REDACTION

Criar testes que garantam que logs não contêm:

* passwords;
* tokens;
* secrets;
* auth headers;
* full sensitive payloads.

---

# FASE 60 — LGPD / DATA RETENTION

Validar:

* data minimization;
* retention;
* audit access;
* export;
* anonymization quando aplicável.

---

# FASE 61 — ARCHITECTURE BOUNDARY TESTS

Impedir imports internos indevidos.

Exemplo proibido:

```text
module-A/src/internal/*
```

entre módulos.

Permitir apenas public surface.

---

# FASE 62 — COMPOSITION ROOT REVIEW

Audite:

`apps/api/src/runtime.ts`

Se estiver crescendo demais, decompor em:

```text
composition/
  identity
  clinical
  workflows
  diagnostics
  financial
  operations
  integrations
```

Somente se necessário.

---

# FASE 63 — CONTRACT PACKAGE SCALABILITY

Audite shared contracts.

Se houver concentração excessiva, decompor internamente por domínio mantendo compatibility exports.

---

# FASE 64 — REPOSITORY HYGIENE

Remover do Git estados gerados gigantes quando possível.

Não usar Git como runtime storage.

Mover:

* logs;
* state;
* generated evidence;
* screenshots temporários;
* large runtime artifacts.

para:

* CI artifacts;
* release artifacts;
* object storage.

---

# FASE 65 — DOCUMENTATION VALIDATION

Garantir que documentação viva corresponde ao runtime.

Classifique docs:

```text
canonical
operational
ADR
historical
generated evidence
```

---

# FASE 66 — ADRs

Criar/atualizar ADRs para:

* workflow control plane;
* lease/fencing;
* release assurance;
* external evidence model;
* supply-chain verification;
* clinical task state machine.

---

# FASE 67 — FINAL CI PIPELINE

A pipeline final deve representar:

```text
SOURCE
↓
STATIC
↓
SECURITY
↓
BUILD
↓
UNIT
↓
POSTGRES INTEGRATION
↓
RLS
↓
CLINICAL CRITICAL
↓
E2E
↓
UX
↓
PERFORMANCE
↓
RECOVERY
↓
SUPPLY CHAIN
↓
PREPUBLICATION GATE
↓
PUBLISH
↓
ATTESTATION VERIFY
↓
POSTPUBLICATION GATE
↓
HUMAN RELEASE AUTHORITY
```

---

# FASE 68 — TRIPLE-A RELEASE COMMAND

Fortalecer:

`pnpm release:triple-a`

Ele deve bloquear se:

* main not green;
* required checks absent;
* P0 open;
* runtime RLS absent;
* critical E2E absent;
* recovery absent;
* performance absent;
* image attestation absent;
* UAT required but absent.

---

# FASE 69 — SCORECARD DINÂMICO

O score deve refletir evidência.

Não hardcode PASS.

Cada critério deve possuir:

```text
status
evidence
timestamp
commit
issuer
```

Status possíveis:

```text
PASS
FAIL
BLOCKED
NOT_EVALUATED
NOT_PROVEN
```

---

# FASE 70 — STALE EVIDENCE PROTECTION

Evidência de commit antigo não vale automaticamente para commit novo.

Sempre vincular ao SHA.

Se código crítico mudar:

* critical E2E;
* performance;
* security;
* release evidence

podem precisar ser reexecutados.

---

# FASE 71 — TRIPLE-A CERTIFICATION RULE

Somente declarar:

# TRIPLE-A VERIFIED

quando:

```text
main = GREEN
overall >= 97
critical >= 95
open_p0 = 0
all mandatory evidence fresh
```

Caso contrário:

```text
TRIPLE-A CANDIDATE
```

ou:

```text
BLOCKED / NOT PROVEN
```

---

# FASE 72 — FINAL FRESH AUDIT

Antes da certificação:

faça auditoria adversarial fresca.

Procure especificamente por:

* self-reported PASS sem evidence;
* stale artifacts;
* bypass;
* skipped tests;
* warnings masquerading as pass;
* fake attestation;
* mocks;
* environment-specific holes;
* ignored errors;
* race conditions;
* RLS bypass;
* release drift.

---

# FASE 73 — SECURITY CRITIC

Faça uma segunda revisão independente focada apenas em segurança.

Produza:

`docs/triple-a/security-final-critic.md`

---

# FASE 74 — CLINICAL SAFETY CRITIC

Faça revisão independente dos fluxos clínicos.

Produza:

`docs/triple-a/clinical-final-critic.md`

---

# FASE 75 — OPERATIONS CRITIC

Revisar:

* deploy;
* backup;
* restore;
* alerts;
* runbooks;
* rollback;
* on-call.

Produza:

`docs/triple-a/operations-final-critic.md`

---

# FASE 76 — UX CRITIC

Revisar:

* reception;
* veterinarian;
* inpatient;
* mobile;
* keyboard;
* accessibility.

---

# FASE 77 — FINAL EVIDENCE PACKAGE

Gerar:

```text
artifacts/triple-a/
  release-manifest.json
  quality-scorecard.json
  ci-evidence.json
  branch-governance.json
  security-evidence.json
  rls-runtime.json
  clinical-e2e.json
  workflow-reliability.json
  uat.json
  performance.json
  soak.json
  backup-restore.json
  deployment.json
  rollback.json
  attestations.json
  final-verdict.json
```

---

# FASE 78 — FINAL REPORT

Atualizar:

`docs/triple-a/FINAL_REPORT.md`

Incluindo:

* SHA;
* evidence package;
* score;
* residual risks;
* exact gates;
* certification state.

---

# P0 OBRIGATÓRIOS A FECHAR

Prioridade máxima:

```text
P0-01 main green
P0-02 required branch governance
P0-03 PostgreSQL workflow integration
P0-04 RLS runtime
P0-05 workflow concurrency
P0-06 lease/fencing
P0-07 worker crash recovery
P0-08 clinical critical E2E
P0-09 audit integrity
P0-10 release gate
P0-11 external evidence bound to SHA
P0-12 no unsupported verified claim
```

Adicione todos os demais P0 identificados pelo quality bar.

---

# NÃO FAÇA

Não:

* reduzir thresholds;
* desabilitar workflow quebrado;
* marcar NOT PROVEN como PASS;
* usar mock como prova externa;
* inventar branch protection;
* declarar UAT executada sem pessoa;
* declarar production deploy sem deploy;
* declarar soak sem soak;
* esconder failures;
* remover testes difíceis;
* criar bypass temporário que fica permanente;
* fazer rename global V2→V4;
* criar CVG-HIS V5;
* migrar para microserviços.

---

# POLÍTICA DE COMMITS

Commits pequenos.

Exemplos:

```text
fix(ci): restore usability certification execution
test(workflows): add postgres lease fencing coverage
test(rls): prove runtime tenant isolation
feat(worker): harden crash recovery lease takeover
test(e2e): add complete inpatient clinical journey
feat(release): bind external evidence to candidate sha
feat(dr): add timed restore certification
feat(perf): add hospital workload certification
docs(triple-a): close production assurance evidence
```

---

# EXECUTION LOG

Atualize continuamente:

`docs/triple-a/EXECUTION_LOG.md`

Registrar:

* action;
* SHA;
* command;
* result;
* evidence;
* limitation;
* next step.

---

# STOP-THE-LINE CONDITIONS

Pare feature work se:

* main red;
* P0 regression;
* cross-tenant leak;
* lost clinical event;
* duplicate medication effect;
* broken audit trail;
* restore failure;
* security critical vulnerability.

Corrija antes.

---

# DEFINITION OF DONE

O projeto estará concluído somente quando:

```text
Main                         GREEN
All required remote CI       PASS
Branch governance            PASS
Architecture                 PASS
Security                     PASS
Supply chain                 PASS
PostgreSQL runtime           PASS
RLS tenant isolation         PASS
Workflow concurrency         PASS
Lease/fencing                PASS
Worker crash recovery        PASS
Clinical critical E2E        PASS
UX automated                 PASS
Human UAT                    PASS
Backup/restore               PASS
RPO/RTO                      PASS
Performance                  PASS
Soak                         PASS
Deploy                       PASS
Rollback                     PASS
Image attestations           PASS
Release evidence             PASS
```

E:

```text
Overall >= 97
Critical >= 95
Open P0 = 0
```

---

# RESULTADO FINAL ESPERADO

Ao final, o sistema deve poder emitir objetivamente:

```text
PROJECT: CVG-HIS V4
ARCHITECTURE: PASS
SECURITY: PASS
CLINICAL SAFETY: PASS
WORKER RELIABILITY: PASS
RLS/TENANT: PASS
CI/CD: PASS
UX: PASS
RECOVERY: PASS
PERFORMANCE: PASS
SUPPLY CHAIN: PASS
PRODUCTION ASSURANCE: PASS

OVERALL SCORE: >= 97
CRITICAL SCORE: >= 95
OPEN P0: 0

VERDICT:
TRIPLE-A VERIFIED
```

Somente se houver evidência real.

---

# PRIMEIRA AÇÃO AGORA

Comece pela fase:

# TRIPLE-A EXTERNAL EVIDENCE & PRODUCTION ASSURANCE CLOSURE

Execute nesta ordem:

1. baseline fresco;
2. GitHub Actions;
3. green main;
4. branch governance;
5. PostgreSQL workflow tests;
6. RLS runtime;
7. concurrency;
8. worker crash recovery;
9. clinical E2E;
10. usability/browser;
11. UAT preparation;
12. backup/restore;
13. performance;
14. soak;
15. deploy/rollback;
16. attestations;
17. release gate;
18. final adversarial audit;
19. final scorecard.

Não abra uma grande nova frente de produto antes de fechar essa sequência.

O objetivo não é produzir mais código.

O objetivo é produzir:

# CONFIABILIDADE COMPROVADA

E transformar:

```text
Triple-A Candidate
```

em:

# TRIPLE-A VERIFIED

# STATE OF ART

# 97–99/100
