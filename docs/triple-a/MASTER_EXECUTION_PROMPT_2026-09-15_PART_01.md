# CVG-HIS V4 — MASTER EXECUTION PROMPT

## STATE OF ART / TRIPLO AAA / PRODUCTION ASSURANCE FINAL CLOSURE

Repositório:

`https://github.com/ricardoakinaga-dev/cvg-his-v4`

---

# 0. MISSÃO

Atue como:

* Principal Software Engineer;
* Staff Software Architect;
* SRE;
* Security Engineer;
* Database/PostgreSQL Engineer;
* Clinical Safety Engineer;
* Performance Engineer;
* Test Architect;
* Release Assurance Lead;
* Supply-Chain Security Engineer;
* UX/A11y Quality Engineer.

Sua missão é elevar o CVG-HIS V4 ao nível:

# STATE OF ART

# ENTERPRISE-GRADE

# TRIPLO AAA

# HIGH-ASSURANCE

# TRIPLE-A VERIFIED

Meta técnica:

```text
overall_score >= 97
critical_score >= 95
open_p0 = 0
main = GREEN
```

Não obtenha esses números artificialmente.

O objetivo não é maximizar score.

O objetivo é maximizar:

# CONFIABILIDADE COMPROVADA

---

# 1. CONTEXTO

O CVG-HIS V4 é um ERP/HIS veterinário destinado à operação de um hospital veterinário.

Trate:

* prontuário;
* internação;
* prescrições;
* administração de medicamentos;
* exames;
* cirurgia;
* alta;
* tarefas clínicas;
* auditoria;
* billing;
* estoque;
* autenticação;
* isolamento entre tenants;

como superfícies críticas.

O projeto já possui arquitetura madura.

Preserve o modular monolith existente.

Arquitetura conceitual:

```text
                    CVG-HIS V4
                         │
          ┌──────────────┼──────────────┐
          │              │              │
         SPA            API           Worker
          │              │              │
          └──────────────┼──────────────┘
                         │
                   Domain Modules
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    Clinical         Operations         Financial
       │                 │                 │
    Patient           Workflow           Billing
    Encounter          Tasks             Payments
    Triage             Reminders         Inventory
    Records            Handover
    Inpatient          Escalation
    Diagnostics
    Surgery
    Prescription
       │
       └────────────┬─────────────┐
                    │             │
                 Event Bus      Audit
                    │
                    ▼
                  Worker
                    │
                    ▼
               Integrations
                    │
                    ▼
              PostgreSQL + RLS
```

---

# 2. NÃO REESCREVER O SISTEMA

NÃO:

* criar CVG-HIS V5;
* substituir o modular monolith;
* migrar para microservices sem evidência objetiva;
* criar nova API;
* criar outra SPA;
* criar outra source of truth de migrations;
* trocar PostgreSQL;
* introduzir arquitetura paralela;
* fazer rewrite massivo.

O projeto já possui arquitetura suficiente.

Trabalhe incrementalmente.

---

# 3. PRINCÍPIO FUNDAMENTAL

Diferencie sempre:

```text
IMPLEMENTED
VERIFIED_LOCAL
VERIFIED_CI
VERIFIED_TARGET
HUMAN_VERIFIED
```

Nunca converta automaticamente:

```text
IMPLEMENTED → PASS
```

ou:

```text
LOCAL → TARGET
```

ou:

```text
AUTOMATED → HUMAN_APPROVED
```

---

# 4. QUALITY BAR CONGELADO

Leia e preserve:

`docs/triple-a/QUALITY_BAR_V1.json`

A certificação final exige:

```text
overall >= 97
critical >= 95
open_p0 = 0
main = GREEN
```

É proibido diminuir os thresholds.

É proibido converter:

```text
FAIL → WARN
BLOCKED → PASS
NOT_RUN → PASS
NOT_PROVEN → PASS
STALE → PASS
```

para obter certificação.

---

# 5. STATUS CANÔNICOS

Use os estados:

```text
PASS
FAIL
BLOCKED
NOT_RUN
NOT_PROVEN
STALE
INVALID
HUMAN_REQUIRED
TARGET_REQUIRED
```

Use:

`HUMAN_REQUIRED`

para UAT/authority.

Use:

`TARGET_REQUIRED`

para provas que exigem ambiente apropriado.

---

# 6. FRESH BASELINE

Antes de modificar qualquer arquivo:

obtenha:

```text
HEAD
main
origin/main
behavior SHA
documentation SHA
assurance SHA
CI SHA
release SHA
```

Leia:

```text
docs/triple-a/*
docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md
docs/2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md
docs/2026-09-12-backlog-correcao-gaps-triplo-aaa.md
.agent/*
.github/workflows/*
package.json
```

Não presuma que relatórios antigos ainda representam o HEAD.

---

# 7. CANONICAL CANDIDATE IDENTITY

Fortaleça ou implemente:

`docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json`

Modelo:

```json
{
  "behavior_sha": "",
  "assurance_sha": "",
  "documentation_sha": "",
  "ci_sha": "",
  "merge_sha": "",
  "release_sha": "",
  "generated_at": "",
  "status": ""
}
```

Essa deve ser a identidade canônica.

---

# 8. EVIDENCE GRAPH

Fortaleça:

`artifacts/triple-a/evidence-graph.json`

Conceito:

```text
Candidate
│
├── CI
├── Unit
├── Integration
├── E2E
├── Clinical Golden Path
├── Performance Regression
├── Performance Certification
├── Security
├── RLS Runtime
├── Workflow
├── Worker Recovery
├── Audit
├── Backup
├── Restore
├── RPO/RTO
├── Deploy
├── Rollback
├── Soak
├── Supply Chain
├── Attestation
├── UAT
└── Release Authority
```

Cada node deve possuir:

```text
id
status
source_sha
environment
timestamp
issuer
artifact_digest
dependencies
reason
```

---

# 9. EVIDENCE INVALIDATION

Se behavior SHA mudar:

todas as evidências dependentes devem ser recalculadas.

Exemplo:

```text
API changed
   ↓
API contract → STALE
E2E → STALE
Performance → STALE
Security runtime → STALE
```

Não reutilize evidência velha silenciosamente.

---

# 10. SKIP-CI SAFETY

Commits `[skip ci]` só podem modificar documentação/evidence metadata não executável.

Criar ou fortalecer guard.

Se `[skip ci]` alterar:

```text
apps/
packages/
tests/
scripts executáveis
benchmarks/
infra/
.github/workflows/
Dockerfile*
docker-compose*
package.json
pnpm-lock.yaml
```

falhar.

---

# 11. MAIN GREEN

Objetivo:

# CURRENT CANDIDATE 16/16 GREEN

Não aceitar green de SHA histórico.

CI deve executar no candidato atual.

Resolver qualquer falha sem:

* remover job;
* relaxar threshold;
* aumentar timeout arbitrariamente;
* transformar failure em advisory.

---

# 12. PERFORMANCE — SEPARAR DOIS CONTRATOS

Formalize:

## PERFORMANCE REGRESSION GATE

Executado em CI compartilhado.

Objetivo:

detectar regressões.

Deve ser:

* curto;
* determinístico;
* bounded;
* resistente a scheduler noise.

## PERFORMANCE CERTIFICATION

Executado em runner controlado.

Objetivo:

certificar capacidade.

Definir:

```text
CPU
RAM
PostgreSQL
Redis
Node
k6
network assumptions
```

Não misturar os dois.

---

# 13. PERFORMANCE HEADROOM

Não otimizar para passar por 1–2 ms.

Para endpoints críticos buscar:

```text
observed p95 <= 80% threshold
```

quando tecnicamente razoável.

Especialmente:

```text
Billing
Inventory
Patient list
Patient detail
Workflow queue
Inpatient
```

---

# 14. PERFORMANCE PROFILING

Adicionar:

```text
p50
p95
p99
throughput
error rate
DB latency
pool acquisition
pool wait
```

Use:

`EXPLAIN (ANALYZE, BUFFERS)`

em queries críticas.

Não adicionar índices por intuição.

---

# 15. CONNECTION POOL

Instrumentar:

```text
active
idle
waiting
acquisition latency
timeouts
saturation
```

Testar pool exhaustion.

---

# 16. RLS RUNTIME — P0

Executar PostgreSQL real.

Testar com API role:

```text
tenant A read B → DENIED
tenant A update B → DENIED
tenant A delete B → DENIED
known UUID B → DENIED
```

Testar worker role:

```text
worker tenant A
→ resource tenant B
→ DENIED
```

Não executar esses testes usando admin.

---

# 17. DATABASE ROLE MATRIX

Revisar:

`docs/security/DATABASE_ROLE_MATRIX.md`

Roles:

```text
migration/admin
api
worker
runtime
```

Criar testes de least privilege.

---

# 18. FORCE RLS

Para tabelas críticas verificar:

```text
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY
```

quando apropriado.

Testar owner bypass e runtime behavior.

---

# 19. WORKFLOW POSTGRES

Executar com PostgreSQL real:

```text
create
get
list
acknowledge
complete
cancel
retry
DLQ
replay
event history
idempotency
tenant isolation
RLS
```

---

# 20. WORKFLOW CONCURRENCY

Testar concorrência real.

## Duplicate idempotency key

```text
request A
request B
same key
```

Resultado:

```text
1 material effect
```

## Concurrent claim

```text
Worker A
Worker B
```

Resultado:

```text
1 winner
```

## Complete race

Apenas uma transição terminal.

## Cancel vs complete

Resultado determinístico.

## Ack race

Estado consistente.

---

# 21. LEASE / HEARTBEAT / FENCING

Prova obrigatória:

```text
Worker A claims
↓
heartbeat
↓
Worker A freezes/dies
↓
lease expires
↓
Worker B claims
↓
Worker B completes
↓
Worker A returns
↓
stale fencing token rejected
```

PostgreSQL real.

---

# 22. WORKER CRASH RECOVERY

Usar processo real.

Preferir:

```text
SIGKILL
```

quando suportado.

Testar:

```text
claim
crash
lease expiry
reclaim
complete
stale worker attempt
```

Garantir:

```text
no duplicate effect
```

---

# 23. RETRY POLICY

Retry deve ser:

```text
bounded
observable
auditable
```

Definir:

```text
maxAttempts
backoff
jitter
retryableErrors
permanentErrors
DLQ threshold
```

---

# 24. DLQ

DLQ deve preservar:

```text
job/task
attempts
lastError
correlationId
causationId
tenant
timestamp
```

Replay deve exigir autorização.

---

# 25. OUTBOX CONTRACT

Revisar o novo versioned outbox envelope.

Exigir:

```text
eventId
eventType
schemaVersion
tenant/account
correlationId
causationId
occurredAt
payload
```

Testar:

* duplicate;
* old schema;
* future schema;
* malformed envelope;
* missing tenant;
* out-of-order event.

---

# 26. EVENT COMPATIBILITY

Criar contract tests para:

```text
producer N
consumer N

producer N+1
consumer N

producer N
consumer N+1
```

quando compatibilidade for prometida.

---

# 27. CLINICAL GOLDEN PATH — P0

Criar um teste canônico chamado explicitamente:

`clinical-golden-path`

Fluxo:

```text
Tutor
↓
Paciente
↓
Agendamento
↓
Chegada
↓
Fila
↓
Triagem
↓
Atendimento
↓
Internação
↓
Leito
↓
Prescrição
↓
Administração
↓
Exame
↓
Resultado
↓
Workflow
↓
Evolução
↓
Alta
↓
Follow-up
```

Ao final validar:

```text
Audit
Timeline
Billing
Inventory
Permissions
Tenant
Workflow state
```

---

# 28. NEGATIVE CLINICAL PATHS

Cobrir:

```text
duplicate medication
duplicate diagnostic result
invalid discharge
unauthorized prescription
cross-tenant patient
stale workflow token
completed task replay
cancelled task completion
expired session
invalid state transition
```

---

# 29. CLINICAL SAFETY INVARIANTS

Revisar:

`docs/clinical/CLINICAL_SAFETY_INVARIANTS.md`

P0 obrigatórios:

```text
no duplicate medication effect
no cross-tenant clinical access
no silent clinical overwrite
no stale worker mutation
no lost audit history
no duplicate diagnostic ingestion
no invalid terminal transition
```

Cada invariante P0 deve possuir teste executável.

---

# 30. AUDIT IMMUTABILITY

Provar:

```text
clinical revision preserves original
task lifecycle append-only
replay creates new audit evidence
administrative override requires actor + reason
security audit cannot be silently removed
```

---

# 31. BILLING CONCURRENCY

Testar:

```text
concurrent payment
duplicate payment callback
duplicate settlement
duplicate invoice
stale billing update
double cash effect
```

Garantir exatamente um efeito financeiro quando necessário.

---

# 32. OPENAPI RUNTIME PARITY

A remediação anterior melhorou OpenAPI/OIDC.

Agora fechar definitivamente:

```text
runtime routes
==
OpenAPI routes
```

Criar validação bidirecional.

Cobrir:

* session;
* MFA;
* WebAuthn;
* OIDC;
* API keys;
* workflow;
* clinical P0 routes.

---

# 33. DEADLINE / CANCELLATION PROPAGATION

Fechar o GAP histórico de deadlines.

Propagar:

```text
request deadline
AbortSignal
timeout budget
```

através de:

```text
route
service
repository
external provider
```

Evitar request cancelada continuar consumindo recursos.

---

# 34. EXTERNAL PROVIDER TIMEOUTS

Todas integrações externas devem possuir:

```text
connect timeout
request timeout
retry policy
circuit behavior
telemetry
```

Nenhuma chamada externa pode ficar indefinidamente aberta.

---

# 35. SECURITY RUNTIME

Testar:

```text
IDOR
BOLA
auth bypass
privilege escalation
mass assignment
SQL injection
SSRF
open redirect
webhook replay
API key misuse
```

---

# 36. HEALTH / METRICS EXPOSURE

Revisar:

```text
/health
/ready
/metrics
```

Definir política explícita.

Não deixar `/metrics` publicamente exposto por acidente.

Adicionar ingress/network tests.

---

# 37. LOG PRIVACY

Revisar brute-force/auth logs.

Evitar PII desnecessária.

Aplicar:

```text
hash/pseudonymization
redaction
retention policy
```

Criar testes de log redaction.

---

# 38. ATTACHMENT SECURITY

Testar:

```text
path traversal
MIME spoof
malicious filename
oversized payload
malware
cross-tenant access
unauthorized download
```

---

# 39. WEBHOOK SECURITY

Para WhatsApp, PIX, laboratório etc.:

```text
HMAC/signature
keyId
timestamp
replay window
idempotency
tenant binding
payload limits
```

---

# 40. SUPPLY CHAIN

Preservar:

```text
source
↓
SBOM
↓
build
↓
image
↓
scan
↓
digest
↓
attestation
↓
manifest
```

---

# 41. IMAGE PINNING

Deploy deve referenciar imagens por digest.

Evitar:

```text
latest
```

ou tags mutáveis como identidade final de produção.

---

# 42. FAIL-CLOSED IMAGE SCAN

Nenhuma imagem pode ser promovida se scan obrigatório falhar.

Policy:

```text
CRITICAL → BLOCK
HIGH → BLOCK unless approved exception
```

Exception:

```text
owner
reason
mitigation
expiry
```

---

# 43. ATTESTATION

Para API, SPA e Worker:

```text
build
publish
attest
verify
```

Verificar:

```text
repository
workflow
source SHA
image digest
```

---

# 44. RELEASE MANIFEST

Manifesto final deve conter:

```text
behavior SHA
release SHA
image digests
SBOM digests
attestation refs
migration version
test evidence
security evidence
performance evidence
recovery evidence
```

---

# 45. BACKUP

Validar:

```text
PostgreSQL
attachments
checksums
retention
encryption
```

---

# 46. RESTORE — P0

Em ambiente descartável:

```text
representative dataset
↓
backup
↓
destroy environment
↓
restore DB
↓
restore attachments
↓
boot
↓
migration validation
↓
clinical golden smoke
```

---

# 47. CORRUPTED BACKUP

Testar:

```text
corrupted dump
partial dump
wrong checksum
missing attachments
schema mismatch
```

Restore deve falhar fechado.

---

# 48. RPO / RTO

Medir de verdade.

Não inventar números.

Registrar:

```text
observed RPO
observed RTO
target RPO
target RTO
```

---

# 49. DEPLOY REHEARSAL

Ambiente
