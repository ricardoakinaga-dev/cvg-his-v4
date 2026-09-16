# 520. DEFINITION OF DONE — TRIPLE-A CANDIDATE

Pode usar:

# TRIPLE-A CANDIDATE

quando:

```text id="4f11eb"
all locally automatable P0 gates PASS
candidate identity VALID
evidence graph VALID
main GREEN
CI PASS
critical automated tests PASS
no known cross-tenant leak
no known clinical P0 failure
no known Critical security finding
remaining blockers are exclusively HUMAN_REQUIRED or TARGET_REQUIRED
```

Não exigir que evidência humana inexistente seja artificialmente convertida em PASS.

---

# 521. DEFINITION OF DONE — TRIPLE-A VERIFIED

Somente usar:

# TRIPLE-A VERIFIED

quando:

```text id="kkf0wm"
candidate identity             PASS
evidence integrity            PASS
main                           GREEN
CI                             PASS
unit                           PASS
integration                    PASS
critical coverage              PASS
OpenAPI/runtime parity         PASS
PostgreSQL runtime             PASS
RLS runtime                    PASS
tenant pool isolation          PASS
authorization                  PASS
workflow PostgreSQL            PASS
workflow concurrency           PASS
lease/heartbeat/fencing        PASS
worker crash recovery          PASS
event/outbox invariants        PASS
clinical golden path           PASS
clinical negative paths        PASS
clinical safety invariants     PASS
audit immutability             PASS
medication concurrency         PASS
billing concurrency            PASS
inventory invariants           PASS
security runtime               PASS
performance regression         PASS
performance certification      PASS
observability                  PASS
alert delivery                 PASS
backup                         PASS
restore                        PASS
corrupt-backup handling        PASS
RPO/RTO                        PASS
migration upgrade              PASS
game days                      PASS
deploy rehearsal               PASS
rollback rehearsal             PASS
supply-chain                   PASS
image scan                     PASS
SBOM                           PASS
attestation                    PASS
branch governance              PASS
required soak                  PASS
UAT                            PASS
release authority              PASS
final critics                  PASS
fresh adversarial audit        PASS
```

E simultaneamente:

```text id="e8scft"
overall_score >= 97
critical_score >= 95
open_p0 = 0
```

---

# 522. DEFINITION OF DONE — STATE OF ART

Além dos gates Triple-A, o sistema deve apresentar:

```text id="xqxd81"
clear modular boundaries
controlled complexity
documented public contracts
observable runtime
predictable failure behavior
reproducible builds
reproducible evidence
safe deployment
safe recovery
efficient clinical UX
maintainable operations
```

---

# 523. SCORE NÃO SUBSTITUI GATES

Mesmo:

```text id="zwt38q"
overall = 99
```

não permite release se:

```text id="yvp1m0"
open_p0 > 0
```

ou hard blocker existir.

---

# 524. SCORE NÃO DEVE SER HARD-CODED

Calcular a partir das evidências.

---

# 525. SCORE VERSIONING

Quality model deve possuir versão.

Exemplo:

```text id="c2wuwj"
quality_model_version: 1
```

Mudança de modelo precisa ser explícita.

---

# 526. QUALITY BAR CHANGE GOVERNANCE

Não modificar `QUALITY_BAR_V1.json` nesta campanha apenas para facilitar certificação.

Se existir erro real no quality bar:

documentar proposta separadamente.

Não aplicar silenciosamente.

---

# 527. SCORECARD HISTORY

Cada candidato final deve preservar:

```text id="7ckf0w"
behavior SHA
score
critical score
P0 count
verdict
date
```

---

# 528. FINAL RELEASE MANIFEST

Manifesto final deve ser suficiente para responder:

```text id="16dvwg"
Qual código?
Quais imagens?
Qual schema?
Quais testes?
Quais evidências?
Qual ambiente?
Quem aprovou?
```

---

# 529. FINAL RELEASE MANIFEST DIGEST

Calcular SHA-256 do manifesto.

Registrar no final verdict.

---

# 530. FINAL VERDICT SIGNATURE / ATTESTATION

Se tooling existente suportar, produzir attestation do final release evidence.

Não introduzir PKI customizada.

---

# 531. FINAL PACKAGE IMMUTABILITY

Depois da certificação:

não modificar evidence package daquele candidato.

Nova mudança:

```text id="bdk3no"
new candidate
```

---

# 532. POST-CERTIFICATION CHANGE

Qualquer mudança comportamental após `TRIPLE-A VERIFIED` invalida o status do novo HEAD até nova certificação.

O release anterior continua historicamente certificado.

---

# 533. RELEASE ≠ MAIN FOREVER

Não declarar:

```text id="tv31sj"
repository is Triple-A forever
```

A certificação pertence a um candidato/release específico.

---

# 534. VERSIONED CERTIFICATION

Preferir linguagem:

```text id="ot2xug"
Release X at SHA Y: TRIPLE-A VERIFIED
```

---

# 535. PRODUCTION DEPLOYMENT ≠ CERTIFICATION

Um release pode ser certificado antes de produção.

Deployment real deve ter evidence própria.

---

# 536. PRODUCTION READINESS

Pode declarar:

```text id="g91hmz"
PRODUCTION READY
```

somente quando gates definidos para readiness estiverem completos.

Não usar apenas build/test como justificativa.

---

# 537. PRODUCTION VERIFIED

Use termo distinto se houver evidência real pós-deploy.

Exemplo:

```text id="c9y68h"
PRODUCTION DEPLOYMENT VERIFIED
```

apenas após target smoke/observation.

---

# 538. FINAL REPORT TERMINOLOGY

Diferenciar:

```text id="a13prk"
Engineering Quality
Triple-A Certification
Production Readiness
Production Deployment
```

---

# 539. ASSURANCE FRAMEWORK

A infraestrutura de assurance pode estar:

```text id="mj3ipj"
PASS
```

mesmo quando:

```text id="vktx0c"
Triple-A Certification = BLOCKED
```

Isso é válido.

---

# 540. REPORTING EXAMPLE

Um estado intermediário honesto pode ser:

```text id="u9u8xe"
ENGINEERING QUALITY: 97/100
ASSURANCE FRAMEWORK: PASS
AUTOMATED CRITICAL GATES: PASS
TARGET GATES: TARGET_REQUIRED
HUMAN UAT: HUMAN_REQUIRED
TRIPLE-A: CANDIDATE
```

---

# 541. NO MISLEADING "PRODUCTION ASSURANCE PASS"

Se target não foi provado, não escrever genericamente:

```text id="e1q9eg"
PRODUCTION ASSURANCE: PASS
```

Preferir:

```text id="s24nbw"
ASSURANCE FRAMEWORK: PASS
PRODUCTION TARGET ASSURANCE: NOT_PROVEN
```

---

# 542. FINAL P0 TARGET

Objetivo:

```text id="1y3te5"
open_p0 = 0
```

Mas não conseguir isso por reclassificação oportunista.

---

# 543. P1 TARGET

P1 não bloqueador pode permanecer somente se:

* quality bar permitir;
* risco residual estiver documentado;
* nenhum P1 esconder risco crítico.

---

# 544. P2 TARGET

P2 pode compor roadmap pós-certificação.

---

# 545. TECHNICAL DEBT REGISTER

Criar ou atualizar:

`docs/engineering/TECHNICAL_DEBT_REGISTER.md`

para itens não bloqueadores.

---

# 546. POST-TRIPLE-A ROADMAP

Não misturar roadmap futuro com blockers atuais.

Criar seção separada para:

```text id="1a0l4g"
future scalability
future modules
future AI
future infrastructure
```

---

# 547. NO AI EXPANSION DURING CLOSURE

Não implementar novos agentes, LLMs ou features de IA enquanto P0 críticos estiverem abertos.

---

# 548. FUTURE AGENT INTEGRATION BOUNDARY

Apenas garantir que arquitetura futura possa integrar agentes por contratos seguros.

Não construir agora se não necessário.

---

# 549. AGENT PERMISSION MODEL

Se já houver integração com agentes:

agentes devem respeitar as mesmas:

```text id="y9xjqu"
RBAC
tenant
audit
approval
```

Não criar superusuário implícito.

---

# 550. AGENT ACTION AUDIT

Toda ação de agente que altere estado crítico deve possuir actor/agent identity e audit.

---

# 551. HUMAN APPROVAL FOR HIGH-RISK AGENT ACTION

Ações clínicas/financeiras de alto risco não devem ser automatizadas sem política explícita.

Não expandir escopo nesta campanha.

---

# 552. FINAL ARCHITECTURE REVIEW

No fim, confirmar que as melhorias não criaram:

```text id="ax4lru"
new god modules
new circular dependencies
parallel sources of truth
hidden runtime state
unbounded complexity
```

---

# 553. CIRCULAR DEPENDENCY GUARD

Executar ou adicionar detecção apropriada.

---

# 554. MODULE PUBLIC SURFACE

Cada módulo importante deve expor surface pública clara.

---

# 555. DOMAIN OWNERSHIP

Documentar ownership conceitual:

```text id="p69dfn"
patient owns patient identity
workflow owns task lifecycle
billing owns financial state
```

Evitar duplicação de autoridade.

---

# 556. SINGLE SOURCE OF TRUTH

Para cada conceito crítico, identificar source of truth.

Exemplos:

```text id="fyyt0e"
clinical record → clinical module
workflow task → workflow module
payment state → billing/payment domain
tenant authorization → auth/RBAC/RLS layers
```

---

# 557. NO DUPLICATE STATE

Projeções podem duplicar leitura, mas não criar duas autoridades independentes.

---

# 558. EVENTUAL CONSISTENCY DOCUMENTATION

Onde houver projeções assíncronas:

documentar possível atraso.

UX deve lidar com isso adequadamente.

---

# 559. READ-YOUR-WRITES

Para operações onde usuário espera resultado imediato, garantir comportamento adequado.

Não depender de projeção atrasada quando isso causar erro operacional.

---

# 560. FINAL DATA MODEL REVIEW

Auditar:

```text id="dx9xtx"
nullable fields
foreign keys
unique constraints
indexes
status enums
timestamps
tenant columns
audit columns
```

---

# 561. SOFT DELETE REVIEW

Soft delete deve ser usado apenas quando necessário.

Não espalhar `deletedAt` indiscriminadamente.

---

# 562. HARD DELETE REVIEW

Dados clínicos/auditáveis não devem ser hard-deleted sem política explícita.

---

# 563. DATA MERGE

Operações de merge de entidades devem preservar rastreabilidade.

---

# 564. IMPORT/MIGRATION ASSURANCE

Se houver importação de sistemas antigos:

testar:

```text id="t9ebuk"
idempotency
validation
partial failure
audit
tenant
```

---

# 565. PROVIDER CONTRACT TESTS

Para integrações externas, criar contract tests sem promover mock a target proof.

---

# 566. PROVIDER SANDBOX

Quando provider possuir sandbox oficial, usar para evidence de integração quando autorizado.

---

# 567. PROVIDER PRODUCTION PROOF

Somente necessário quando quality bar/release requirement exigir.

Não realizar transações reais indevidas.

---

# 568. FAILURE BUDGET FOR PROVIDERS

External provider down não deve derrubar todo HIS quando não necessário.

---

# 569. NOTIFICATION DELIVERY

Notificação deve possuir estados claros:

```text id="j96oxp"
queued
sent
delivered if known
failed
retrying
dead-letter
```

---

# 570. NOTIFICATION IDEMPOTENCY

Retry não deve enviar múltiplas mensagens quando provider/idempotency permitir evitar.

---

# 571. WHATSAPP FUTURE INTEGRATION

Preservar arquitetura para WhatsApp, mas não expandir escopo além dos contratos atuais nesta closure.

---

# 572. FINAL CODE CLEANUP

Depois de todos os fixes:

remover:

```text id="50z9gw"
temporary debug
dead branches introduced by migration
obsolete TODO
unused compatibility shim
```

somente quando comprovadamente seguro.

---

# 573. NO HISTORICAL CLEANUP THAT DESTROYS EVIDENCE

Não apagar histórico Triple-A necessário apenas para deixar repositório "bonito".

---

# 574. TODO AUDIT

Classificar TODOs em:

```text id="2q82s7"
BLOCKING
DEBT
FUTURE
```

Nenhum TODO P0 pode permanecer escondido.

---

# 575. FIXME AUDIT

Mesmo princípio.

---

# 576. DISABLED CODE AUDIT

Procurar:

```text id="31htkj"
if (false)
feature disabled permanently
commented security control
temporary bypass
```

---

# 577. TEST-ONLY BYPASS AUDIT

Garantir que bypass de testes não possa ser ativado em produção.

---

# 578. DEVELOPMENT BACKDOOR AUDIT

Procurar:

```text id="k8ol8p"
dev auth bypass
default admin
bootstrap token
test user shortcut
```

Production deve fail closed.

---

# 579. BOOTSTRAP SECURITY

Setup inicial deve exigir mecanismo seguro e desabilitar/restringir bootstrap depois.

---

# 580. DEFAULT ACCOUNT SECURITY

Nenhuma senha default conhecida em produção.

---

# 581. PASSWORD POLICY

Seguir política atual.

Não inventar complexidade arbitrária.

Priorizar:

```text id="tb8exu"
secure hashing
rate limiting
MFA support
compromised credential handling when available
```

---

# 582. PASSWORD STORAGE

Confirmar algoritmo e parâmetros adequados.

---

# 583. SESSION COOKIE SECURITY

Se cookies forem usados:

```text id="h98p0m"
HttpOnly
Secure
SameSite appropriate
```

---

# 584. TOKEN STORAGE

Frontend não deve armazenar token sensível de forma insegura sem necessidade.

---

# 585. OIDC TOKEN REDACTION

Tokens nunca em logs.

---

# 586. CSP VALIDATION

Se CSP existir, testar que não está efetivamente desativada por permissividade excessiva.

---

# 587. DEPENDENCY UPDATE AUTOMATION

Renovate deve criar mudanças pequenas e verificáveis.

Não auto-merge major update crítico sem policy.

---

# 588. SECURITY UPDATE PRIORITY

Critical security patch recebe prioridade elevada.

---

# 589. POSTGRESQL BACKUP VERSION COMPATIBILITY

Restore tooling deve validar compatibilidade de versões.

---

# 590. BACKUP CHECKSUM

Verificar checksum antes de restore.

---

# 591. ATTACHMENT CHECKSUM

Quando aplicável, preservar integridade de attachment backup/restore.

---

# 592. RESTORE DATA INVARIANTS

Depois de restore:

executar:

```text id="wzty67"
ops:check-invariants
```

ou equivalente.

---

# 593. RESTORE GOLDEN PATH

Depois de restore:

executar clinical smoke/golden subset.

---

# 594. RPO/RTO EVIDENCE

Registrar tempos automaticamente quando possível.

---

# 595. RPO/RTO TARGET FAILURE

Se observado não atingir target:

```text id="jyofk9"
FAIL
```

Não editar target retroativamente apenas para passar.

---

# 596. PERFORMANCE TARGET FAILURE

Mesmo princípio.

---

# 597. SECURITY POLICY FAILURE

Mesmo princípio.

---

# 598. FINAL FREEZE

Quando todos os gates automatizáveis estiverem verdes:

```text id="ndw40n"
FREEZE BEHAVIOR SHA
```

---

# 599. POST-FREEZE CI

Rodar CI completo no SHA congelado.

---

# 600. POST-FREEZE TARGET EVIDENCE

Executar target evidence necessária no mesmo candidato.

---

# 601. POST-FREEZE UAT

UAT deve apontar para o candidato congelado.

---

# 602. POST-FREEZE CRITICS

Critics finais também.

---

# 603. FINAL FRESHNESS CHECK

Antes do verdict:

```text id="tb4h4s"
no stale mandatory evidence
```

---

# 604. FINAL P0 CHECK

```text id="0h9w90"
open_p0 == 0
```

---

# 605. FINAL SCORE CHECK

```text id="f87o31"
overall >= 97
critical >= 95
```

---

# 606. FINAL MAIN CHECK

```text id="3f2z55"
main == expected release lineage
required checks GREEN
```

---

# 607. FINAL ARTIFACT CHECK

Todos os digests válidos.

---

# 608. FINAL DEPLOYABLE IMAGE CHECK

Imagens:

```text id="rfgisv"
digest pinned
scanned
attested
verified
```

---

# 609. FINAL DATABASE CHECK

Schema/migration esperado.

---

# 610. FINAL RECOVERY CHECK

Restore evidence fresh.

---

# 611. FINAL HUMAN CHECK

UAT + release authority válidos.

---

# 612. FINAL CRITIC CHECK

Nenhum blocker.

---

# 613. FINAL VERDICT ALGORITHM

Pseudo-regra:

```text id="6z22lg"
if evidence_invalid:
    INVALID_CANDIDATE

else if hard_blocker:
    BLOCKED

else if open_p0 > 0:
    BLOCKED

else if overall < 97:
    BLOCKED

else if critical < 95:
    BLOCKED

else if target_required_remaining:
    TRIPLE_A_CANDIDATE

else if human_required_remaining:
    TRIPLE_A_CANDIDATE

else:
    TRIPLE_A_VERIFIED
```

Adapte ao quality gate existente.

---

# 614. FINAL VERDICT — NO MANUAL OVERRIDE

Não permitir:

```text id="rt7e6l"
--force-triple-a
```

ou equivalente.

---

# 615. EMERGENCY RELEASE

Se organização precisar de emergency release, isso deve ser uma policy separada.

Não chamar emergency release de Triple-A Verified sem gates.

---

# 616. FINAL REPORT OUTPUT

Ao terminar, apresentar:

```text id="45fq8c"
CVG-HIS V4
Candidate:
Behavior SHA:
Release SHA:

Architecture:
Correctness:
Testing:
Clinical Safety:
Security:
Database/RLS:
Workflow:
Worker:
Frontend/UX:
Performance:
Observability:
Recovery:
CI/CD:
Supply Chain:
Governance:
Production Assurance:

Overall:
Critical:
Open P0:

Automated blockers:
Target blockers:
Human blockers:
Residual risks:

Verdict:
```

---

# 617. FINAL VERDICT EXAMPLES

## Caso incompleto

```text id="us8ebg"
OVERALL: 97
CRITICAL: 97
```
