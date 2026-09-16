# 363. DOCUMENT CLAIM AUDIT

Auditar toda documentação atual.

Procurar claims como:

```text id="k8v47h"
production ready
production certified
enterprise ready
State of Art
Triple-A
Triple-A Verified
100% secure
zero downtime
fully compliant
```

Cada claim deve possuir evidência compatível.

Se não houver:

corrigir linguagem.

Nunca transformar marketing em evidência técnica.

---

# 364. HISTORICAL DOCUMENTS

Documentos históricos devem ser claramente marcados:

```text id="x6nfbo"
document_status: historical
```

Não permitir que sejam interpretados como estado atual.

---

# 365. CURRENT DOCUMENTS

Documentos correntes devem apontar para candidate identity atual ou declarar explicitamente que não são candidate-bound.

---

# 366. GENERATED EVIDENCE

Evidence gerada automaticamente deve ser distinguível de documentação manual.

Não editar evidence gerada manualmente.

---

# 367. EVIDENCE SCHEMA VERSIONING

Todos os envelopes importantes devem possuir:

```text id="e9wzox"
schema_version
```

Mudança incompatível exige nova versão.

---

# 368. EVIDENCE VALIDATION

Criar JSON Schema ou validação equivalente para evidence crítica.

Malformed evidence:

```text id="3g9xla"
INVALID
```

---

# 369. EVIDENCE DIGEST

Artefato externo usado como prova deve registrar digest.

---

# 370. EVIDENCE ISSUER

Registrar quem/qual sistema produziu a evidência:

```text id="bcd3ai"
local
GitHub Actions
staging
human UAT
release authority
```

---

# 371. EVIDENCE TRUST LEVEL

Classificar quando útil:

```text id="p9gfrk"
LOCAL
CI
TARGET
HUMAN
EXTERNAL
```

Não promover automaticamente entre níveis.

---

# 372. EVIDENCE DEPENDENCY GRAPH VALIDATION

Detectar:

```text id="wttx24"
cycles
missing dependency
unknown evidence node
stale dependency
```

---

# 373. EVIDENCE GRAPH VISUALIZATION

Gerar uma representação legível:

```text id="2nlmr8"
docs/triple-a/EVIDENCE_GRAPH.md
```

ou equivalente.

Objetivo:

permitir identificar rapidamente o que bloqueia certificação.

---

# 374. CRITICAL PATH TO CERTIFICATION

Calcular automaticamente o menor caminho de blockers até:

```text id="o2zxqh"
TRIPLE-A VERIFIED
```

Exemplo:

```text id="d48o6j"
RLS
→ Golden Path
→ Restore
→ Target
→ UAT
→ Authority
```

Não gastar tempo em P2 enquanto P0 independente está disponível.

---

# 375. NEXT BEST ACTION

O controller/harness deve conseguir responder:

```text id="y1od5g"
Qual é a próxima ação executável de maior impacto?
```

Priorizar:

```text id="nhmbre"
P0
then P1
then P2
```

e respeitar dependências.

---

# 376. BLOCKED WORK

Se tarefa depende de:

```text id="krx13o"
human
target
credential
external provider
```

marcar BLOCKED/HUMAN_REQUIRED/TARGET_REQUIRED e seguir para outra tarefa independente.

Não ficar parado.

---

# 377. NO BUSY WORK

Não criar:

* documentação redundante;
* testes duplicados;
* wrappers sem função;
* abstrações sem consumidor;

apenas para aumentar quantidade de entregas.

---

# 378. NO SCORE GAMING

Proibido:

```text id="z8z2yq"
lower threshold
change weight
remove blocker
reclassify P0 as P2 without evidence
ignore test
mark advisory
```

com objetivo de aumentar score.

---

# 379. SCORE MUST FOLLOW EVIDENCE

O score é resultado.

Não objetivo primário.

---

# 380. QUALITY SCORE DIMENSIONS

Score final deve avaliar pelo menos:

```text id="clnpfi"
Architecture
Correctness
Testing
Clinical Safety
Security
Database/Tenant Isolation
Workflow Reliability
Worker Reliability
Frontend/UX
Performance
Observability
Recovery
CI/CD
Supply Chain
Operations
Governance
Production Assurance
```

---

# 381. CRITICAL DIMENSIONS

Tratar como críticas pelo menos:

```text id="kvq98r"
Clinical Safety
Security
Database/Tenant Isolation
Workflow/Worker
Recovery
Release Assurance
```

Adapte à quality bar existente.

---

# 382. NO AVERAGE MASKING

Uma nota alta de documentação não pode compensar:

```text id="9yy9ug"
RLS failure
clinical corruption
restore failure
```

Critical blockers prevalecem.

---

# 383. HARD GATES

Independentemente do score, qualquer um destes deve bloquear:

```text id="chddmd"
main red
open P0
cross-tenant leak
clinical safety invariant failure
critical security vulnerability
restore failure
worker duplicate material effect
release evidence mismatch
```

---

# 384. FINAL GATE COMMAND

Fortalecer:

```text id="upggp6"
pnpm release:triple-a
```

Esse comando deve ser o agregador canônico.

---

# 385. FINAL GATE INPUTS

O gate deve consumir:

```text id="rb57oh"
candidate identity
evidence graph
P0 registry
quality bar
CI evidence
target evidence
human evidence
release manifest
```

---

# 386. FINAL GATE OUTPUT

Produzir saída machine-readable:

`artifacts/triple-a/final-verdict.json`

Exemplo conceitual:

```json id="2hpdqj"
{
  "candidate": "",
  "overall_score": 0,
  "critical_score": 0,
  "open_p0": 0,
  "mandatory_gates": {},
  "verdict": "BLOCKED"
}
```

---

# 387. FINAL VERDICT STATES

Permitir:

```text id="py22qi"
BLOCKED
TRIPLE_A_CANDIDATE
TRIPLE_A_VERIFIED
```

Opcionalmente:

```text id="f1v04c"
INVALID_CANDIDATE
```

quando candidate/evidence estiver inconsistente.

---

# 388. TRIPLE-A VERIFIED RULE

Somente emitir:

# TRIPLE-A VERIFIED

quando simultaneamente:

```text id="yxhuxm"
candidate identity             PASS
main                           GREEN
CI                             PASS
unit                           PASS
integration                    PASS
critical DB                    PASS
RLS runtime                    PASS
authorization                  PASS
clinical golden path           PASS
clinical negative paths        PASS
clinical invariants            PASS
audit immutability             PASS
workflow PostgreSQL            PASS
workflow concurrency           PASS
lease/fencing                  PASS
worker crash recovery          PASS
billing concurrency            PASS
inventory concurrency          PASS
OpenAPI/runtime parity         PASS
security runtime               PASS
performance regression         PASS
performance certification      PASS
observability                  PASS
alerting                       PASS
backup                         PASS
restore                        PASS
corrupt-backup handling        PASS
RPO/RTO                        PASS
deploy rehearsal               PASS
rollback rehearsal             PASS
migration upgrade              PASS
game days                      PASS
soak required by policy        PASS
supply chain                   PASS
image scans                    PASS
attestations                   PASS
branch governance              PASS
UAT                            PASS
release authority              PASS
final critics                  PASS
```

E:

```text id="54p8hv"
overall >= 97
critical >= 95
open_p0 = 0
```

---

# 389. 72H SOAK POLICY

Se quality bar atual exigir 72h:

obrigatório.

Se não exigir:

não inventar requisito artificial.

Classificar como:

```text id="9adg0q"
REQUIRED
RECOMMENDED
NOT_REQUIRED
```

com justificativa.

---

# 390. HUMAN REQUIREMENTS

Não bloquear eternamente desenvolvimento por falta de humano.

Prepare tudo e marque:

```text id="6p9d7r"
HUMAN_REQUIRED
```

O sistema pode chegar a:

```text id="tuf1lh"
TRIPLE_A_CANDIDATE
```

aguardando apenas UAT/authority.

---

# 391. TARGET REQUIREMENTS

Da mesma forma:

se infraestrutura externa não estiver disponível:

```text id="xw3wwy"
TARGET_REQUIRED
```

Nunca simular target com mock e chamar de PASS.

---

# 392. LOCAL MAXIMUM VERDICT

Se tudo automatizável localmente passar, mas target/human continuar ausente:

verdict máximo:

# TRIPLE_A_CANDIDATE

Nunca `TRIPLE_A_VERIFIED`.

---

# 393. FINAL SECURITY CRITERIA

Nenhum:

```text id="ns5v3n"
Critical
```

security finding aberto.

High segue policy formal.

Cross-tenant leak é blocker absoluto.

---

# 394. FINAL CLINICAL CRITERIA

Nenhum P0 clinical invariant pode falhar.

---

# 395. FINAL RECOVERY CRITERIA

Restore precisa ter sido executado, não apenas script validado.

---

# 396. FINAL PERFORMANCE CRITERIA

Performance certification precisa usar ambiente definido.

Shared runner green sozinho não é capacity certification.

---

# 397. FINAL SUPPLY-CHAIN CRITERIA

A imagem deployável deve ser:

```text id="dgpfst"
scanned
digest-pinned
attested
verified
bound to source
```

---

# 398. FINAL GOVERNANCE CRITERIA

Branch governance e release authority devem ser evidenciadas.

---

# 399. FINAL UAT CRITERIA

Aceite humano deve apontar explicitamente para o candidato.

UAT de candidato antigo não vale automaticamente.

---

# 400. FINAL FRESH-CONTEXT CRITIC

Depois que todos os gates parecerem verdes:

executar auditoria fresh-context sem usar o score como premissa.

Pergunta:

> Se eu quisesse bloquear esta release, o que eu encontraria?

---

# 401. CRITIC INDEPENDENCE

O critic não deve simplesmente repetir:

```text id="01wh5g"
todos os testes passaram
```

Ele deve inspecionar:

* código;
* evidence;
* gaps;
* bypasses;
* assumptions.

---

# 402. CRITIC OUTPUT

Cada critic deve emitir:

```text id="tvyccu"
APPROVE
APPROVE_WITH_NONBLOCKING_FINDINGS
REJECT
```

Findings devem ter severidade.

---

# 403. CRITICAL/HIGH CRITIC FINDINGS

Critical ou High que afete requisito obrigatório:

```text id="04qz9m"
release BLOCKED
```

até resolução ou risk acceptance formal quando permitido.

---

# 404. RISK ACCEPTANCE

Não inventar risk acceptance.

Exige autoridade humana.

---

# 405. RESIDUAL RISK REGISTER

Criar:

`docs/triple-a/RESIDUAL_RISK_REGISTER.md`

Somente riscos não bloqueadores aceitos/documentados.

---

# 406. KNOWN LIMITATIONS

Final report deve listar limitações honestamente.

Triple-A não significa "sem nenhum risco".

---

# 407. NO "100% SECURE"

Nunca declarar:

```text id="tfqk23"
100% secure
bug-free
impossible to fail
```

---

# 408. TRIPLE-A SEMANTICS

No projeto, `Triple-A` significa:

```text id="q4x20g"
high engineering assurance
+
defined quality bar
+
reproducible evidence
+
critical gates
```

Não significa certificação regulatória externa, salvo se houver de fato.

---

# 409. FINAL EVIDENCE PACKAGE

Gerar:

```text id="rzql8i"
artifacts/triple-a/
├── candidate-identity.json
├── evidence-graph.json
├── p0-registry.json
├── ci.json
├── unit.json
├── integration.json
├── rls-runtime.json
├── authorization.json
├── workflow-postgres.json
├── workflow-concurrency.json
├── worker-crash-recovery.json
├── clinical-golden-path.json
├── clinical-negative-paths.json
├── audit-immutability.json
├── performance-regression.json
├── performance-certification.json
├── security.json
├── backup.json
├── restore.json
├── rpo-rto.json
├── game-days.json
├── deploy.json
├── rollback.json
├── migration-upgrade.json
├── soak.json
├── supply-chain.json
├── attestations.json
├── branch-governance.json
├── uat.json
├── release-authority.json
├── critics.json
├── release-manifest.json
└── final-verdict.json
```

Não criar PASS placeholder.

---

# 410. EVIDENCE INDEX

Criar:

`artifacts/triple-a/index.json`

Mapear todos os artefatos e digests.

---

# 411. EVIDENCE COMPLETENESS

Gate deve detectar evidence obrigatória ausente.

---

# 412. EVIDENCE TAMPER TEST

Criar testes que alterem:

```text id="4eyg5d"
SHA
digest
status
issuer
dependency
```

e provem que o validator rejeita.

---

# 413. EVIDENCE REPLAY

Não aceitar evidence copiada de candidato anterior.

---

# 414. EVIDENCE PATH SAFETY

Validator não deve permitir path traversal ou referência fora de roots permitidos.

---

# 415. FINAL SCORECARD

Gerar automaticamente:

`docs/triple-a/13-final-scorecard.md`

Formato mínimo:

```text id="9ex34c"
CURRENT CANDIDATE
CURRENT CI
CURRENT OVERALL SCORE
CURRENT CRITICAL SCORE
CURRENT OPEN P0
CURRENT TARGET STATUS
CURRENT HUMAN STATUS
CURRENT RELEASE STATUS
CURRENT VERDICT
```

---

# 416. FINAL REPORT

Gerar:

`docs/triple-a/FINAL_REPORT.md`

a partir da mesma fonte.

---

# 417. FINAL REPORT — EXECUTIVE SUMMARY

Incluir:

```text id="q8gqai"
what changed
what was proven
what remains unproven
release status
```

---

# 418. FINAL REPORT — SCORECARD

Tabela:

```text id="11d4xm"
Architecture
Correctness
Testing
Clinical Safety
Security
Database/RLS
Workflow
Worker
Frontend/UX
Performance
Observability
Recovery
CI/CD
Supply Chain
Governance
Production Assurance
```

---

# 419. FINAL REPORT — P0

Listar:

```text id="b65jgm"
open
closed
human required
target required
```

---

# 420. FINAL REPORT — EVIDENCE

Para cada PASS crítico:

apontar evidence correspondente.

---

# 421. FINAL REPORT — RESIDUAL RISKS

Não esconder risco não bloqueador.

---

# 422. FINAL REPORT — VERDICT

Somente:

```text id="qqomdd"
BLOCKED
TRIPLE-A CANDIDATE
TRIPLE-A VERIFIED
```

---

# 423. EXECUTION LOG

Continuar atualizando:

`docs/triple-a/EXECUTION_LOG.md`

Cada entrada:

```text id="7p3y09"
timestamp
candidate SHA
task
problem
root cause
change
tests
result
evidence
remaining risk
next action
```

---

# 424. COMMIT STRATEGY

Commits pequenos, semanticamente coesos.

Exemplos:

```text id="doxwjz"
feat(assurance): build canonical evidence dependency graph
fix(ci): stabilize bounded performance regression gate
test(rls): prove pooled runtime tenant isolation
test(workflow): prove lease fencing under worker takeover
test(worker): prove SIGKILL recovery without duplicate effect
test(clinical): add canonical hospital golden path
test(billing): prove concurrent settlement idempotency
test(inventory): prove concurrent stock invariants
fix(events): enforce transactional outbox invariants
test(dr): certify representative restore
feat(release): verify digest-bound image provenance
docs(uat): prepare hospital acceptance protocol
```

---

# 425. NO MEGA-COMMIT

Evitar um único commit contendo centenas de mudanças independentes.

---

# 426. COMMIT VERIFICATION

Antes de commit:

executar os testes relevantes.

Antes de promover candidato:

executar gate amplo.

---

# 427. CHECKPOINT STRATEGY

Se execução longa:

criar checkpoints seguros.

Checkpoint não significa certificação.

---

# 428. CHECKPOINT RESUME

Registrar próxima ação mecanicamente.

Objetivo:

outra sessão/agente conseguir continuar sem reconstruir contexto inteiro.

---

# 429. NO BACKGROUND CLAIMS

Não alegar que algo continuará rodando após encerrar a sessão.

Se soak ou CI estiver em andamento:

registrar:

```text id="xet6iz"
IN_PROGRESS
```

---

# 430. DO NOT WAIT PASSIVELY

Se CI externo estiver rodando e houver outras tarefas independentes:

continue trabalhando nelas.

---

# 431. EXTERNAL BLOCKERS

Se faltar:

```text id="v1sul6"
Docker
PostgreSQL
registry
credential
human
target
```

registrar blocker e continuar tarefas independentes.

---

# 432. DOCKER UNAVAILABLE

Se Docker estiver indisponível:

não marcar restore/DB drill como PASS.

Preparar scripts, testar contratos e marcar:

```text id="z7u19x"
TARGET_REQUIRED
```

ou ambiente requerido correspondente.

---

# 433. POSTGRESQL UNAVAILABLE

Mesmo princípio.

Testes que realmente exigem PostgreSQL não podem ser substituídos por mock como prova final.

---

# 434. GHCR UNAVAILABLE

Supply-chain tooling pode ser validado localmente.

Attestation/registry final permanece:

```text id="fjn5z9"
TARGET_REQUIRED
```

---

# 435. UAT UNAVAILABLE

Preparar protocolo.

Marcar:

```text id="7mhqhw"
HUMAN_REQUIRED
```

---

# 436. RELEASE AUTHORITY UNAVAILABLE

Mesmo princípio.

---

# 437. MAXIMIZE AUTONOMOUS PROGRESS

Fechar tudo que for tecnicamente possível sem:

* comprometer segurança;
* inventar evidence;
* realizar ação destrutiva não autorizada.

---

# 438. PRIORITY ORDER

Ordem principal:

```text id="u8xq9d"
1
```
