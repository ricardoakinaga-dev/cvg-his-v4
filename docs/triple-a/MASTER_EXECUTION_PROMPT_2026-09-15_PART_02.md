# 49. DEPLOY REHEARSAL

Executar em ambiente descartável ou staging autorizado.

Fluxo mínimo:

```text
candidate artifact
↓
validate release manifest
↓
validate image digests
↓
provision PostgreSQL
↓
provision Redis
↓
apply migrations
↓
deploy API
↓
deploy Worker
↓
deploy SPA
↓
readiness
↓
health
↓
clinical smoke
↓
workflow smoke
```

Gerar evidência vinculada ao candidato.

Validar:

* versões exatas;
* image digests;
* migrations;
* environment configuration;
* secrets references;
* database roles;
* RLS;
* readiness;
* liveness;
* worker startup;
* workflow processing.

Não executar deploy destrutivo em produção sem autorização explícita.

---

# 50. ROLLBACK REHEARSAL

Provar rollback real em ambiente descartável.

Fluxo:

```text
release N
↓
healthy
↓
release N+1
↓
health validation
↓
simulate/reproduce failure
↓
rollback
↓
release N
↓
health
↓
clinical smoke
```

Validar especialmente:

* database compatibility;
* migration compatibility;
* Redis state;
* worker jobs;
* workflow leases;
* frontend/backend contract compatibility.

Rollback não pode significar apenas:

```text
docker image previous
```

O estado de dados também precisa permanecer consistente.

---

# 51. MIGRATION SAFETY

Classificar migrations como:

```text
expand
data migration
contract
destructive
```

Preferir:

```text
EXPAND
↓
DEPLOY COMPATIBLE CODE
↓
MIGRATE
↓
VERIFY
↓
CONTRACT
```

Evitar alteração destrutiva no mesmo release em que consumidores antigos ainda podem existir.

Criar migration compatibility tests.

---

# 52. MIGRATION UPGRADE DRILL

Testar:

```text
previous supported release
↓
representative database
↓
current migrations
↓
current application
↓
clinical golden smoke
```

Validar:

* dados preservados;
* constraints;
* indexes;
* RLS;
* audit;
* workflows;
* billing;
* clinical records.

---

# 53. DATABASE FAILURE GAME DAY

Simular em ambiente seguro:

```text
API active
Worker active
↓
PostgreSQL unavailable
↓
requests fail predictably
↓
transactions rollback
↓
DB returns
↓
connections recover
↓
processing resumes
```

Provar:

```text
no partial clinical mutation
no duplicate financial effect
no lost workflow task
```

---

# 54. REDIS FAILURE GAME DAY

Simular:

```text
Redis unavailable
```

Verificar:

* degraded behavior;
* readiness semantics;
* retries;
* worker behavior;
* cache fallback;
* recovery;
* telemetry.

Nenhum fallback pode reduzir segurança.

---

# 55. WORKER FAILURE GAME DAY

Simular:

```text
Worker A
↓
SIGKILL
↓
tasks remain durable
↓
lease expiration
↓
Worker B
↓
recovery
```

Validar métricas, logs e audit.

---

# 56. API FAILURE GAME DAY

Simular:

```text
API process kill
↓
restart
```

Validar:

* load balancer/proxy behavior;
* readiness;
* authentication;
* connection cleanup;
* no corrupt state.

---

# 57. STORAGE FAILURE GAME DAY

Simular indisponibilidade temporária do storage de anexos.

Validar:

```text
upload fails explicitly
download fails explicitly
no silent data loss
retry only when safe
audit generated
```

---

# 58. EXTERNAL PROVIDER FAILURE

Simular:

```text
WhatsApp unavailable
PIX unavailable
laboratory unavailable
diagnostic provider unavailable
```

Validar:

* timeout;
* retry;
* circuit behavior;
* DLQ;
* alert;
* recovery;
* idempotency.

---

# 59. OBSERVABILITY END-TO-END

Provar propagação de contexto:

```text
Browser
↓
API
↓
Domain
↓
DB / Event
↓
Worker
↓
External Provider
```

Quando tecnicamente aplicável, preservar:

```text
traceId
correlationId
causationId
```

---

# 60. STRUCTURED LOGGING

Logs devem ser estruturados.

Campos recomendados:

```text
timestamp
level
service
environment
traceId
correlationId
event
tenant
duration
result
```

Não incluir informação clínica sensível desnecessariamente.

---

# 61. METRICS TÉCNICAS

Garantir métricas para:

```text
HTTP requests
HTTP latency
HTTP errors
DB pool
DB acquisition latency
worker backlog
job latency
retries
DLQ
lease contention
external provider latency
```

---

# 62. MÉTRICAS HOSPITALARES

Implementar ou validar métricas operacionais:

```text
cvg_active_inpatients
cvg_open_encounters
cvg_pending_diagnostics
cvg_overdue_diagnostics
cvg_pending_workflow_tasks
cvg_overdue_workflow_tasks
cvg_medication_overdue
cvg_handover_pending
cvg_job_retry_total
cvg_job_dead_letter_total
```

Nunca usar:

```text
patientId
ownerId
encounterId
```

como labels Prometheus.

Evitar high cardinality.

---

# 63. ALERTING

Criar alertas para:

```text
API unavailable
Worker unavailable
PostgreSQL unavailable
Redis unavailable
high API error rate
high latency
DB pool saturation
workflow backlog
workflow overdue
DLQ growth
backup failure
restore verification failure
external provider failure
```

---

# 64. ALERT DELIVERY PROOF

Não basta configuração.

Executar alertas sintéticos.

Provar:

```text
condition
↓
rule triggered
↓
notification generated
↓
destination received
```

Quando destination real não estiver autorizada:

```text
TARGET_REQUIRED
```

---

# 65. SLI / SLO

Criar ou revisar:

`docs/operations/SLO_SLI_POLICY.md`

Definir SLIs para:

## API

```text
availability
p95
p99
error rate
```

## Worker

```text
success rate
processing latency
oldest pending job
retry rate
DLQ rate
```

## Workflow

```text
task execution delay
overdue ratio
lease contention
```

## Clinical

Usar métricas operacionais que não exponham PII.

---

# 66. ERROR BUDGET

Definir error budget.

Se SLO crítico estiver violado além do budget:

```text
release = BLOCKED
```

quando a política assim exigir.

Não transformar isso em burocracia artificial.

---

# 67. SOAK 24H

Executar teste de longa duração em ambiente apropriado.

Monitorar:

```text
RSS
heap
event loop
file handles
DB connections
Redis connections
worker backlog
retries
DLQ
lease count
stale leases
p50
p95
p99
error rate
```

---

# 68. SOAK 24H ACCEPTANCE

Não aceitar:

```text
unbounded memory growth
connection leak
unbounded backlog
stale lease accumulation
continuous latency degradation
clinical data corruption
cross-tenant anomaly
```

Gerar:

`artifacts/triple-a/soak-24h.json`

---

# 69. SOAK 72H

Somente depois do soak 24h ficar verde.

Executar 72h em ambiente controlado.

Objetivo:

provar estabilidade prolongada.

Gerar:

`artifacts/triple-a/soak-72h.json`

---

# 70. FRONTEND VISUAL ASSURANCE

Executar browser real.

Cobrir:

```text
desktop
tablet
mobile
```

Perfis:

```text
Recepção
Veterinário
Internação
Administração
```

---

# 71. VISUAL REGRESSION GOVERNANCE

Não atualizar baseline automaticamente para fazer teste passar.

Classificar diferenças:

```text
EXPECTED_CHANGE
REGRESSION
FALSE_POSITIVE
ENVIRONMENT_VARIANCE
```

Mudança intencional precisa de evidence/review.

---

# 72. ACCESSIBILITY

Executar Axe e testes manuais/automatizados.

Cobrir:

```text
keyboard
focus
labels
dialogs
forms
errors
contrast
semantic headings
screen reader semantics
```

Critical accessibility violations devem bloquear superfícies críticas.

---

# 73. PATIENT 360

Auditar produtividade clínica da visão do paciente.

Priorizar:

```text
identificação
tutor
alertas
atendimento atual
internação
medicações
diagnósticos
tarefas
handover
timeline
ações rápidas
```

Não duplicar regras de domínio no frontend.

---

# 74. WORKFLOW UX

Fila de workflow deve suportar:

```text
priority
status
sector
patient
task type
due time
overdue
assigned team
```

Ações rápidas:

```text
acknowledge
complete
open patient
open encounter
```

---

# 75. HANDOVER

Passagem de plantão deve ser integrada ao workflow.

Cobrir:

```text
patient
current status
critical alerts
pending medications
pending diagnostics
pending procedures
reassessment
unresolved tasks
responsible team
outgoing staff
incoming staff
acknowledgement
```

---

# 76. HANDOVER SAFETY

Testar:

```text
handover created
handover updated
handover ready
handover acknowledged
handover overdue
```

Incoming staff deve reconhecer recebimento.

Histórico deve permanecer auditável.

---

# 77. HUMAN UAT PROTOCOL

Criar ou atualizar:

`docs/operations/HOSPITAL_UAT_PROTOCOL.md`

Personas:

```text
Recepção
Veterinário
Internação
Administração
```

---

# 78. UAT — RECEPÇÃO

Cobrir:

```text
buscar tutor
cadastrar tutor
cadastrar paciente
agendar
check-in
fila
pagamento
resultado
```

---

# 79. UAT — VETERINÁRIO

Cobrir:

```text
abrir paciente
triagem
consulta
evolução
prescrição
exame
internação
alta
```

---

# 80. UAT — INTERNAÇÃO

Cobrir:

```text
admission
bed
prescription
medication execution
diagnostics
workflow tasks
handover
reassessment
discharge
```

---

# 81. UAT — ADMIN

Cobrir:

```text
users
roles
permissions
audit
reports
billing
inventory
configuration
```

---

# 82. HUMAN UAT RULE

Codex NÃO pode autoaprovar UAT.

Se não houver humano autorizado:

```text
HUMAN_REQUIRED
```

Nunca:

```text
PASS
```

Registrar:

```text
candidate SHA
actor
role
date
scenarios
result
notes
approval
```

---

# 83. RELEASE AUTHORITY

Separar explicitamente:

```text
developer
technical verifier
clinical/UAT approver
release authority
```

Não permitir que automação se declare release authority.

Sem autoridade humana:

```text
HUMAN_REQUIRED
```

---

# 84. BRANCH GOVERNANCE

Provar configuração real da `main`.

Verificar:

```text
required checks
PR requirement
required reviews
stale review dismissal
conversation resolution
force push policy
branch deletion policy
admin bypass
other bypass actors
```

---

# 85. BRANCH GOVERNANCE EVIDENCE

Gerar:

`artifacts/triple-a/branch-governance.json`

Se GitHub API/auth não permitir prova:

```text
NOT_PROVEN
```

---

# 86. SECURITY CRITIC

Executar auditoria fresh-context independente.

Foco:

```text
authentication
authorization
RLS
tenant
API keys
MFA
OIDC
WebAuthn
webhooks
uploads
secrets
logging
supply chain
CI
deploy
```

Gerar:

`docs/triple-a/final-security-critic.md`

---

# 87. CLINICAL SAFETY CRITIC

Executar fresh-context critic.

Revisar:

```text
patient identity
clinical records
prescriptions
medication execution
diagnostics
hospitalization
workflow
handover
discharge
audit
```

Gerar:

`docs/triple-a/final-clinical-critic.md`

---

# 88. DATABASE CRITIC

Auditar:

```text
constraints
transactions
RLS
roles
indexes
queries
migrations
concurrency
idempotency
audit
```

Gerar relatório.

---

# 89. OPERATIONS CRITIC

Auditar:

```text
backup
restore
RPO/RTO
deploy
rollback
game days
observability
alerting
performance
soak
runbooks
```

Gerar:

`docs/triple-a/final-operations-critic.md`

---

# 90. UX CRITIC

Auditar:

```text
reception
veterinarian
inpatient
admin
desktop
tablet
mobile
keyboard
accessibility
```

Separar:

```text
automated finding
human usability finding
```

---

# 91. ARCHITECTURE HOTSPOTS

Auditoria anterior encontrou hotspots grandes.

Não refatorar por tamanho isoladamente.

Primeiro medir:

```text
complexity
fan-in
fan-out
change frequency
test fragility
ownership
```

---

# 92. API COMPOSITION ROOT

Se `server.ts` continuar excessivamente concentrado, decompor progressivamente.

Exemplo:

```text
composition/
  identity.ts
  clinical.ts
  hospitalization.ts
  workflow.ts
  diagnostics.ts
  finance.ts
  operations.ts
  integrations.ts
```

`server.ts` deve compor.

Não conter toda a aplicação.

---

# 93. SPA ROUTER

Se router continuar hotspot, separar por domínio:

```text
routes/
  clinical.ts
  hospitalization.ts
  diagnostics.ts
  finance.ts
  administration.ts
```

Preservar lazy loading e guards.

---

# 94. WORKER RUNNER

Se runner continuar hotspot, decompor:

```text
worker/
  supervisor
  lifecycle
  executor
  leases
  retry
  shutdown
```

Preservar comportamento.

Refactor deve ter characterization tests antes.

---

# 95. CONTRACT PACKAGE

Se contracts estiverem concentrados demais, reorganizar internamente:

```text
contracts/
  auth
  patient
  encounter
  workflow
  diagnostics
  financial
```

Preservar public exports.

---

# 96. MODULE BOUNDARY ENFORCEMENT

Proibir imports de internals entre módulos.

Permitido:

```text
@cvg/module-x
```

Proibido:

```text
@cvg/module-x/src/internal/foo
```

Adicionar repository guard.

---

# 97. COVERAGE GOVERNANCE

Não perseguir cobertura apenas por percentual.

Cobertura crítica deve incluir:

```text
routes
repositories
tenant wrapper
worker
workflow
auth
clinical P0
billing
```

---

# 98. CRITICAL COVERAGE

Criar denominador próprio para código P0.

Exigir thresholds maiores.

Não diminuir threshold para passar.

---

# 99. ENVIRONMENTAL SKIPS

Auditar todos os testes:

```text
skip
skipIf
todo
```

Classificar:

```text
JUSTIFIED
ENVIRONMENT_REQUIRED
DEBT
INVALID
```

Nenhum skip P0 pode permanecer silencioso.

---

# 100. JSDOM DIAGNOSTICS

Eliminar ruído recorrente de:

```text
navigation
scrollTo
```

quando possível.

Não esconder erros reais.

---

# 101. DEPENDENCY GOVERNANCE

Revisar dependências.

Usar:

```text
Renovate
pnpm catalogs
dependency policy
SCA
```

Evitar version drift.

---

# 102. MODERATE VULNERABILITIES

Auditoria anterior identificou vulnerabilidades moderadas transitivas.

Reexecutar audit atual.

Se ainda presentes:

* identificar cadeia;
* avaliar exploitability;
* atualizar quando compatível;
* registrar exceção se necessário.

Não bloquear automaticamente por CVSS sem contexto, salvo policy existente.

---

# 103. REPOSITORY HYGIENE

Não versionar:

```text
temporary runtime state
large generated evidence
logs
browser traces
test outputs
```

sem razão explícita.

Usar CI artifacts/object storage.

---

# 104. `.agent` GOVERNANCE

Revisar:

```text
.agent/state.json
.agent/backlog
.agent/verification.jsonl
```

Garantir:

* schema atual;
* candidate SHA atual;
* append-only history quando apropriado;
* nenhuma evidência histórica reescrita.

---

# 105. GAUNTLET LEGACY

Auditar `.gauntlet`.

Se legado:

classificar formalmente:

```text
ACTIVE
COMPATIBILITY
HISTORICAL
DEPRECATED
```

Não permitir que controller antigo interfira em gate atual.

---

# 106. DOCUMENT CLASSIFICATION

Toda documentação crítica deve ter classificação.

Exemplo:

```text
document_status: current
document_kind: operational
candidate_sha:
owner:
effective_date:
```

---

# 107. DOCUMENTATION DRIFT

Criar guards contra:

```text
old SHA
old command
old port
old migration path
old deployment rail
old score
old verdict
```

---

# 108. SCORECARD SINGLE SOURCE OF TRUTH

`13-final-scorecard.md`

deve ser gerado automaticamente.

Não editar manualmente campos críticos.

---

# 109. FINAL REPORT SINGLE SOURCE

`FINAL_REPORT.md`

deve consumir a mesma source.

Nunca:

```text
scorecard says A
final report says B
```

---

# 110. ASSURANCE FRAMEWORK NAMING

Evitar usar:

```text
PRODUCTION ASSURANCE: PASS
```

se produção não foi provada.

Preferir:

```text
ASSURANCE FRAMEWORK: PASS
```

e separadamente:

```text
PRODUCTION ASSURANCE: NOT_PROVEN
```

---

# 111. P0 CONSOLIDATION

Os P0 devem ser agrupados por epic.

Criar:

```text
P0-CI-*
P0-DATA-*
P0-WORKFLOW-*
P0-CLINICAL-*
P0-RECOVERY-*
P0-SUPPLY-*
P0-GOV-*
```
