# 438. PRIORITY ORDER

Execute nesta ordem macro:

```text
1.  Fresh baseline
2.  Candidate identity
3.  Evidence graph
4.  P0 registry
5.  Documentation/evidence consistency
6.  Green Main
7.  Static/security gates
8.  PostgreSQL runtime
9.  RLS runtime
10. Tenant pool isolation
11. Authorization matrix
12. Workflow PostgreSQL
13. Workflow concurrency
14. Lease/heartbeat/fencing
15. Worker crash recovery
16. Event/outbox assurance
17. Clinical safety invariants
18. Clinical golden path
19. Negative clinical paths
20. Medication concurrency
21. Billing concurrency
22. Inventory concurrency
23. OpenAPI/runtime parity
24. Deadline/cancellation propagation
25. Security runtime
26. Performance regression
27. Performance certification
28. Observability
29. Backup
30. Restore
31. Corrupt backup
32. RPO/RTO
33. Migration upgrade
34. Game days
35. Deploy rehearsal
36. Rollback rehearsal
37. Supply-chain final proof
38. Attestation verification
39. Soak
40. Visual/A11y
41. UAT preparation
42. Human UAT
43. Branch governance
44. Release authority
45. Independent critics
46. Fresh adversarial audit
47. Final evidence package
48. Final gate
```

Não execute cegamente em sequência.

Respeite dependências e execute tarefas independentes em paralelo quando seguro.

---

# 439. FIRST WAVE — LOCAL / AUTONOMOUS

Prioridade imediata:

```text
Candidate Identity
Evidence Graph
P0 Registry
Doc Consistency
Skip-CI Guard
Static Gates
OpenAPI
Security Static
Unit
Integration
Architecture Guards
Event Contracts
Clinical Invariants
```

Objetivo:

eliminar qualquer ambiguidade sobre o candidato antes das provas runtime.

---

# 440. SECOND WAVE — POSTGRESQL

Assim que PostgreSQL real descartável estiver disponível:

```text
Migrations
↓
Runtime roles
↓
RLS
↓
Tenant pool leak
↓
Workflow
↓
Concurrency
↓
Lease/Fencing
↓
Worker recovery
↓
Billing
↓
Inventory
↓
Clinical Golden Path
```

Esta onda possui prioridade muito alta.

---

# 441. THIRD WAVE — FAILURE ASSURANCE

Depois dos fluxos normais:

```text
SIGKILL
DB failure
Redis failure
Storage failure
Provider failure
Retry storm
Outbox redelivery
```

O objetivo é provar recuperação, não apenas happy path.

---

# 442. FOURTH WAVE — PERFORMANCE

Executar primeiro:

```text
Performance Regression
```

Depois, em ambiente controlado:

```text
Performance Certification
```

Não confundir as duas evidências.

---

# 443. FIFTH WAVE — RECOVERY

Executar:

```text
Backup
Restore
Corrupted Backup
Migration Upgrade
RPO/RTO
Game Days
```

---

# 444. SIXTH WAVE — RELEASE

Executar:

```text
Build immutable artifacts
↓
SBOM
↓
Image scan
↓
Publish quarantine
↓
Attest
↓
Verify
↓
Deploy rehearsal
↓
Rollback rehearsal
```

---

# 445. SEVENTH WAVE — LONG-RUN

Executar:

```text
24h soak
```

e, se exigido pela policy:

```text
72h soak
```

Não manter agente bloqueado aguardando passivamente.

Registrar execução e continuar trabalho independente.

---

# 446. EIGHTH WAVE — HUMAN

Preparar:

```text
UAT package
Release authority package
Residual risk package
```

Então marcar:

```text
HUMAN_REQUIRED
```

até ação humana real.

---

# 447. NINTH WAVE — FINAL CRITICS

Executar independentemente:

```text
Security Critic
Clinical Critic
Database Critic
Operations Critic
UX Critic
```

---

# 448. TENTH WAVE — FINAL ADVERSARIAL AUDIT

Realizar auditoria nova.

Não assumir que os críticos anteriores estão corretos.

---

# 449. FINAL CERTIFICATION WAVE

Somente então:

```text
freeze candidate
↓
revalidate freshness
↓
generate evidence package
↓
calculate score
↓
run release:triple-a
↓
issue verdict
```

---

# 450. MATRIX ÚNICA DE GATES

Use esta matriz como visão consolidada.

| Gate                      | Classe           | Obrigatório para Triple-A | Evidence           |
| ------------------------- | ---------------- | ------------------------: | ------------------ |
| Candidate Identity        | P0               |                       YES | candidate-identity |
| Evidence Graph            | P0               |                       YES | evidence-graph     |
| Main Green                | P0               |                       YES | CI                 |
| Unit                      | P0               |                       YES | CI                 |
| Integration               | P0               |                       YES | CI                 |
| OpenAPI parity            | P0               |                       YES | contract           |
| Security static           | P0               |                       YES | security           |
| PostgreSQL runtime        | P0               |                       YES | DB                 |
| RLS runtime               | P0               |                       YES | RLS                |
| Tenant pool isolation     | P0               |                       YES | RLS                |
| Authorization             | P0               |                       YES | security           |
| Workflow PostgreSQL       | P0               |                       YES | workflow           |
| Workflow concurrency      | P0               |                       YES | workflow           |
| Lease/fencing             | P0               |                       YES | workflow           |
| Worker crash recovery     | P0               |                       YES | worker             |
| Outbox invariants         | P0               |                       YES | events             |
| Clinical invariants       | P0               |                       YES | clinical           |
| Golden Path               | P0               |                       YES | clinical           |
| Negative Clinical         | P0               |                       YES | clinical           |
| Audit immutability        | P0               |                       YES | audit              |
| Billing concurrency       | P0               |                       YES | financial          |
| Inventory concurrency     | P0/P1 per policy |   YES if release-critical | inventory          |
| Performance Regression    | P0               |                       YES | performance        |
| Performance Certification | P1/P0 gate       |                       YES | performance        |
| Backup                    | P0               |                       YES | recovery           |
| Restore                   | P0               |                       YES | recovery           |
| RPO/RTO                   | P0               |                       YES | recovery           |
| Migration Upgrade         | P0               |                       YES | migration          |
| Deploy rehearsal          | P0               |                       YES | deploy             |
| Rollback rehearsal        | P0               |                       YES | rollback           |
| Supply Chain              | P0               |                       YES | supply             |
| Image Scan                | P0               |                       YES | supply             |
| Attestation               | P0               |                       YES | provenance         |
| Branch Governance         | P0               |                       YES | governance         |
| UAT                       | HUMAN            |                       YES | human              |
| Release Authority         | HUMAN            |                       YES | human              |
| Final Critics             | P0               |                       YES | critics            |
| Soak                      | Policy           |  according to Quality Bar | soak               |

Não altere classificação apenas para aumentar score.

---

# 451. HARD BLOCKERS

Independentemente da pontuação, estes bloqueiam release:

```text
MAIN RED
OPEN P0
CROSS-TENANT LEAK
RLS BYPASS
DUPLICATE MEDICATION MATERIAL EFFECT
CLINICAL DATA CORRUPTION
LOST CLINICAL AUDIT
STALE WORKER MUTATION
DOUBLE FINANCIAL SETTLEMENT
RESTORE FAILURE
MIGRATION CORRUPTION
CRITICAL SECURITY FINDING
SOURCE/IMAGE/ATTESTATION MISMATCH
INVALID EVIDENCE
```

---

# 452. STOP-THE-LINE

Se qualquer hard blocker for encontrado:

```text
STOP FEATURE WORK
↓
REPRODUCE
↓
ROOT CAUSE
↓
TEST
↓
FIX
↓
REGRESSION
↓
REVALIDATE DEPENDENT EVIDENCE
```

---

# 453. BUG FIX STANDARD

Para bug P0/P1:

preferir:

```text
failing reproduction
↓
minimal root-cause fix
↓
regression test
↓
broader verification
```

Evitar patch cosmético.

---

# 454. ROOT CAUSE

Não encerrar finding com:

```text
"teste estava flaky"
```

sem identificar por quê.

Categorias possíveis:

```text
race
clock
environment
shared state
resource contention
incorrect invariant
bad test
real product bug
```

---

# 455. NO TIMEOUT PATCHING

Aumentar timeout só é solução quando existe justificativa objetiva.

Não usar:

```text
5s → 60s
```

para esconder deadlock/lentidão.

---

# 456. NO RETRY PATCHING

Não adicionar retry ao teste apenas para torná-lo verde.

Corrigir determinismo primeiro.

---

# 457. NO SNAPSHOT PATCHING

Não atualizar snapshot visual sem verificar mudança.

---

# 458. NO MOCK PROMOTION

Mock pode provar unidade.

Mock não prova:

```text
PostgreSQL runtime
RLS
external provider
restore
deployment
target
```

---

# 459. REAL PROCESS REQUIREMENT

Para worker crash recovery:

usar processo real sempre que possível.

---

# 460. REAL DATABASE REQUIREMENT

Para RLS/concurrency:

usar PostgreSQL real.

---

# 461. REAL BROWSER REQUIREMENT

Para E2E/visual/a11y:

usar browser real via Playwright ou tooling equivalente existente.

---

# 462. REAL ARTIFACT REQUIREMENT

Supply-chain final deve usar imagem/artefato real, não metadata simulada.

---

# 463. REAL RESTORE REQUIREMENT

Recovery final exige restore executado.

---

# 464. REAL HUMAN REQUIREMENT

UAT/release authority exigem humano real.

---

# 465. SAFE AUTONOMY

Codex pode autonomamente:

```text
inspect
edit
test
commit
run disposable infrastructure
run CI-compatible commands
generate evidence
```

quando seguro.

---

# 466. ACTIONS REQUIRING EXPLICIT AUTHORITY

Não executar autonomamente:

```text
production destructive restore
production database reset
production chaos
real customer communication
human approval
release authority approval
credential rotation with production impact
```

sem autorização apropriada.

---

# 467. NO PRODUCTION DESTRUCTION

Nunca executar:

```text
DROP
TRUNCATE
reset
chaos
destructive fixture
```

em produção.

---

# 468. DISPOSABLE FIRST

Use ambiente descartável para:

```text
restore
migration drills
chaos
failure injection
load breaking point
```

---

# 469. SECRET HANDLING

Nunca imprimir secrets no relatório final.

Redigir:

```text
tokens
passwords
private keys
connection credentials
```

---

# 470. TEST DATA

Usar dados sintéticos.

---

# 471. CLINICAL DATA PRIVACY

Não incluir dados reais de pacientes/tutores em fixtures ou evidence.

---

# 472. PERFORMANCE DATA PRIVACY

Performance reports devem evitar PII.

---

# 473. LOG ARTIFACT PRIVACY

Antes de publicar log como CI artifact:

redact secrets e dados sensíveis.

---

# 474. ARTIFACT SIZE

Não versionar grandes outputs no Git.

Preferir:

```text
CI artifact
release artifact
object storage
```

---

# 475. EVIDENCE METADATA IN GIT

Git pode armazenar:

```text
digest
status
reference
schema
```

sem precisar armazenar todo artefato pesado.

---

# 476. P0 SCORE INTERPRETATION

Não interpretar:

```text
53 P0
```

automaticamente como regressão.

Auditar granularidade.

---

# 477. P0 TREND

Gerar:

```text
open
closed
new
reopened
blocked
```

por candidato.

---

# 478. SCORE TREND

Registrar score por candidato, mas nunca transferir PASS.

---

# 479. CERTIFICATION TREND

Visualizar progresso:

```text
Evidence nodes PASS / total
P0 closed / total
Critical score
Overall score
```

---

# 480. RELEASE CANDIDATE HISTORY

Preservar histórico em:

```text
docs/triple-a/scorecard-history/
```

ou ledger equivalente.

---

# 481. CURRENT SCORECARD ONLY CURRENT

O scorecard corrente não deve conter dezenas de snapshots históricos no corpo principal.

---

# 482. FINAL REPORT ONLY CURRENT

Mesmo princípio.

---

# 483. HISTORICAL EVIDENCE IMMUTABILITY

Não reescrever evidence histórica para fazê-la parecer atual.

---

# 484. REOPEN SEMANTICS

Se uma mudança invalida finding fechado:

```text
status → REOPENED
```

com motivo.

---

# 485. P0 OWNER

Todo P0 deve possuir owner lógico:

```text
code
security
database
operations
human
```

Não precisa ser nome de pessoa.

---

# 486. NEXT ACTION

Todo blocker deve ter próxima ação clara.

---

# 487. COMPLETION SIGNAL

Toda tarefa deve dizer objetivamente o que significa concluída.

Exemplo:

```text
"RLS test passed"
```

é fraco.

Preferir:

```text
"API and worker runtime roles failed all cross-tenant read/write probes on candidate SHA X using PostgreSQL Y."
```

---

# 488. EVIDENCE QUALITY

Evidence deve responder:

```text
WHAT?
WHERE?
WHEN?
WHICH SHA?
WHICH ENVIRONMENT?
RESULT?
```

---

# 489. AUTOMATED REPORT GENERATION

Gerar relatórios a partir de machine-readable evidence sempre que possível.

---

# 490. MANUAL TEXT MINIMIZATION

Evitar duplicar números manualmente em vários Markdown.

---

# 491. FINAL COMMAND SET

Ao final, idealmente possuir comandos equivalentes a:

```text
pnpm validate:candidate
pnpm validate:evidence
pnpm validate:docs
pnpm validate:rls
pnpm test:critical
pnpm test:clinical-golden
pnpm test:workflow-runtime
pnpm test:worker-recovery
pnpm test:security-runtime
pnpm benchmark:regression
pnpm ops:backup:check
pnpm ops:restore:drill
pnpm ops:check-invariants
pnpm rc:evidence:triple-a
pnpm release:triple-a
```

Não crie comandos duplicados se equivalentes já existirem.

---

# 492. COMMAND DISCOVERY

Antes de criar qualquer script:

inspecione `package.json`.

Reutilize o que já existe.

---

# 493. NO SCRIPT PROLIFERATION

Não criar 50 wrappers de uma linha.

Adicionar comando somente quando melhorar:

```text
discoverability
consistency
automation
evidence
```

---

# 494. TEST REPORT STANDARD

Testes críticos devem gerar resultado machine-readable quando útil.

---

# 495. JUNIT / JSON

Usar formatos existentes para integração com CI.

Não adicionar tooling sem necessidade.

---

# 496. FAILURE SUMMARY

CI deve apresentar rapidamente:

```text
which gate failed
why
artifact location
next diagnostic step
```

---

# 497. FINAL CI EXPERIENCE

Um engenheiro deve conseguir abrir CI e identificar blocker sem ler milhares de linhas.

---

# 498. RELEASE DASHBOARD

Se viável, gerar resumo:

```text
Candidate
CI
P0
Evidence
Target
Human
Verdict
```

a partir do evidence graph.

---

# 499. NO CUSTOM UI REQUIREMENT

Não construir dashboard web novo só para isso se Markdown/Actions summary resolver.

---

# 500. STATE OF ART DEFINITION

Para este projeto, State of Art significa:

```text
strong architecture
+
high automated assurance
+
critical runtime proof
+
secure supply chain
+
failure recovery
+
operational observability
+
human acceptance where required
+
reproducible evidence
```

---

# 501. TRIPLO AAA DEFINITION

Triplo AAA significa:

```text
Engineering Quality
+
Operational Assurance
+
Evidence Integrity
```

Não é apenas estética ou número de features.

---

# 502. QUALITY OVER QUANTITY

Uma implementação simples e comprovada é superior a arquitetura sofisticada sem prova.

---

# 503. NO MICROservices SCORE BONUS

Microservices não aumentam score automaticamente.

---

# 504. NO KUBERNETES SCORE BONUS

Kubernetes não aumenta score automaticamente.

---

# 505. NO AI SCORE BONUS

Adicionar IA/agente não aumenta qualidade core do HIS.

Não adicionar nova IA nesta campanha.

---

# 506. NO FEATURE EXPANSION

Até fechar os P0, não iniciar grandes features novas.

---

# 507. ALLOWED FEATURE WORK

Somente features necessárias para fechar:

```text
safety
reliability
observability
recovery
assurance
```

---

# 508. P2 FREEZE

Enquanto houver P0 executável:

não priorizar P2 cosmético.

---

# 509. REFACTOR RULE

Refactor apenas quando:

```text
reduces demonstrated risk
enables testing
reduces hotspot
fixes boundary
improves reliability
```

---

# 510. CHARACTERIZATION BEFORE REFACTOR

Hotspot grande precisa de characterization tests antes de decomposição.

---

# 511. BEHAVIOR PRESERVATION

Refactor não pode mudar regra clínica silenciosamente.

---

# 512. DATABASE REFACTOR SAFETY

Mudança de schema exige migration e upgrade test.

---

# 513. API BREAKING CHANGE

Não quebrar API existente sem:

```text
consumer analysis
versioning/migration
contract update
```

---

# 514. EVENT BREAKING CHANGE

Mesmo princípio para eventos.

---

# 515. PUBLIC CONTRACT INVENTORY

Manter inventário de:

```text
API
events
webhooks
exports
```

---

# 516. DEPRECATION

Breaking surface deve possuir deprecation quando necessário.

---

# 517. DEFINITION OF DONE — CODE CHANGE

Uma alteração normal só está pronta quando:

```text
typecheck PASS
lint PASS
relevant unit PASS
relevant integration PASS
relevant contract PASS
docs updated if needed
```

---

# 518. DEFINITION OF DONE — P0 CHANGE

P0 exige adicionalmente:

```text
failure reproduction
regression test
broader critical test
evidence
```

---

# 519. DEFINITION OF DONE — RELEASE CANDIDATE

Candidate só existe quando:

```text
behavior SHA frozen
worktree clean
candidate identity valid
CI associated
evidence graph valid
```

---

# 520. DEFINITION OF DONE — TRIPLE-A CANDIDATE

Pode usar:

# TRIPLE-A CANDIDATE

quando:

```text
all locally
```
