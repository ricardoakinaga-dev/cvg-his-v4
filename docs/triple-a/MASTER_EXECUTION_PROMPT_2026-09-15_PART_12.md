# 993. HASH CANONICALIZATION

Para JSON gerado, definir canonicalização quando o hash precisar ser reproduzível.

Evitar diferenças irrelevantes de:

```text
whitespace
property order
line endings
```

alterarem identidade lógica sem necessidade.

Não criar formato criptográfico próprio se ferramenta existente resolver.

---

# 994. SHA-256 POLICY

Para artefatos/evidências onde digest for necessário, usar SHA-256 ou mecanismo já padronizado pelo projeto.

Não introduzir múltiplos algoritmos sem necessidade.

---

# 995. ARTIFACT DIGEST VERIFICATION

Sempre verificar digest antes de consumir artefato crítico como evidence.

---

# 996. EVIDENCE MANIFEST

Gerar manifesto contendo:

```text
artifact path/reference
digest
schema version
issuer
candidate
status
```

---

# 997. EVIDENCE MANIFEST SELF-CHECK

O manifesto não deve listar a si próprio de maneira circular impossível de verificar.

---

# 998. EXTERNAL ARTIFACT REFERENCES

Quando evidence estiver fora do Git:

registrar identificador estável.

Exemplos:

```text
GitHub Actions run ID
artifact ID
registry digest
attestation reference
```

---

# 999. EXTERNAL EVIDENCE AVAILABILITY

Se referência externa não puder ser acessada durante validação obrigatória:

classificar conforme policy:

```text
NOT_PROVEN
TARGET_REQUIRED
BLOCKED
```

Não presumir PASS por existência histórica.

---

# 1000. TRIPLE-A MASTER GATE

O projeto deve possuir um único gate agregador canônico.

Preferência:

```text
pnpm release:triple-a
```

Esse gate é a autoridade automatizada para determinar se o candidato satisfaz os requisitos técnicos automatizáveis.

Ele NÃO substitui UAT humano nem release authority.

---

# 1001. MASTER GATE PIPELINE

O gate deve executar ou verificar, na ordem adequada:

```text
Candidate Identity
↓
Quality Bar
↓
P0 Registry
↓
Evidence Graph
↓
Evidence Integrity
↓
Main / CI
↓
Static Quality
↓
Security
↓
Database / RLS
↓
Workflow / Worker
↓
Clinical Safety
↓
E2E
↓
Performance
↓
Recovery
↓
Supply Chain
↓
Target
↓
Human Evidence
↓
Critics
↓
Score
↓
Verdict
```

---

# 1002. MASTER GATE MUST NOT DUPLICATE EVERYTHING

Quando evidence confiável e fresca já existir, o gate pode validá-la em vez de reexecutar testes de 72h.

Mas precisa verificar:

```text
candidate binding
environment
digest
freshness
status
```

---

# 1003. FAST LOCAL MODE

Pode existir modo local para desenvolvimento:

```text
pnpm triple-a:check
```

Ele deve deixar claro:

```text
LOCAL ASSURANCE ONLY
```

Nunca emitir `TRIPLE-A VERIFIED`.

---

# 1004. CI CANDIDATE MODE

Pode existir:

```text
pnpm triple-a:candidate
```

para avaliar automated eligibility.

---

# 1005. RELEASE MODE

Somente release mode pode avaliar pacote completo.

---

# 1006. MODE SEPARATION TEST

Criar teste garantindo que local mode não consiga emitir Verified.

---

# 1007. NO ENV VAR BYPASS

Procurar variáveis como:

```text
SKIP_TRIPLE_A
FORCE_PASS
IGNORE_P0
ALLOW_STALE
```

Qualquer bypass deve ser removido ou estritamente limitado a testes internos que não possam contaminar release.

---

# 1008. TEST FIXTURE BYPASS

Fixtures podem simular PASS/FAIL.

Mas release runtime não pode carregar fixture acidentalmente.

---

# 1009. NODE_ENV IS NOT AUTHORIZATION

Não usar:

```text
NODE_ENV=production
```

como único mecanismo de proteção para ação destrutiva.

---

# 1010. EXPLICIT SAFETY FLAGS

Para operações destrutivas em disposable environments, exigir opt-in específico.

---

# 1011. PRODUCTION DETECTION

Usar múltiplos sinais quando necessário.

Fail closed em ambiguidade.

---

# 1012. DATABASE HOST SAFETY

Restore/reset scripts devem verificar host/database esperado.

---

# 1013. DATABASE NAME SAFETY

Banco disposable deve possuir naming convention reconhecível.

---

# 1014. RESTORE TARGET CONFIRMATION

Antes de restore destrutivo:

mostrar destino e exigir confirmação/flag apropriada.

---

# 1015. CI DESTRUCTIVE DRILLS

Em CI, criar infraestrutura efêmera dedicada.

Nunca apontar para serviço compartilhado.

---

# 1016. K6 SAFETY

Load test deve bloquear host não autorizado.

Não executar carga pesada acidentalmente contra produção.

---

# 1017. CHAOS HOST ALLOWLIST

Mesmo princípio.

---

# 1018. PROVIDER SANDBOX SAFETY

Integração de teste deve usar sandbox quando disponível.

---

# 1019. PAYMENT TEST SAFETY

Nunca criar cobrança financeira real sem autorização.

---

# 1020. NOTIFICATION TEST SAFETY

Evitar enviar WhatsApp/SMS/email real para clientes em testes.

---

# 1021. SYNTHETIC RECIPIENTS

Usar destinatários controlados quando delivery real for necessário.

---

# 1022. CLINICAL TEST SAFETY

Fixtures devem ser claramente sintéticas.

---

# 1023. PRODUCTION FIXTURE GUARD

Seed/fixture command deve bloquear produção.

---

# 1024. FINAL SAFETY REVIEW

Antes dos drills finais, revisar todos os guards acima.

---

# 1025. AUTONOMOUS EXECUTION POLICY

Codex deve avançar autonomamente em todas as etapas seguras.

Não interromper para pedir confirmação em:

```text
code inspection
local edits
unit tests
integration tests
disposable PostgreSQL
disposable Redis
local E2E
static analysis
documentation generation
evidence generation
```

---

# 1026. ASK ONLY WHEN REQUIRED

Solicitar ação humana apenas quando realmente necessário para:

```text
credentials unavailable
target access
human UAT
release authority
production-impacting operation
risk acceptance
```

---

# 1027. DO NOT STOP AT FIRST BLOCKER

Se uma tarefa estiver bloqueada por humano/target:

registre e avance para outra independente.

---

# 1028. DO NOT CLAIM BACKGROUND WORK

Se CI/soak estiver executando:

registrar `IN_PROGRESS`.

Não alegar que continuará monitorando após a sessão.

---

# 1029. RESUME POINT

Ao final de cada sessão atualizar:

```text
CURRENT_CANDIDATE_IDENTITY
P0_REGISTRY
evidence graph
EXECUTION_LOG
next best action
```

---

# 1030. SESSION SUMMARY

Cada sessão deve terminar com:

```text
Candidate
Changes
Tests
Evidence
P0 closed
P0 remaining
Blocked external work
Next action
Verdict
```

---

# 1031. NO FAKE PROGRESS

Quantidade de arquivos modificados não é métrica de sucesso.

---

# 1032. PRIMARY SUCCESS METRIC

Prioridade:

```text
risk eliminated
+
evidence produced
+
P0 legitimately closed
```

---

# 1033. SECONDARY SUCCESS METRIC

Redução de:

```text
complexity
flakiness
operational ambiguity
```

---

# 1034. FAILURE IS ACCEPTABLE

Um teste que revela bug real é progresso.

Não enfraquecer teste.

---

# 1035. BLOCKED IS ACCEPTABLE

`BLOCKED / NOT_PROVEN` é resultado correto quando evidence não existe.

---

# 1036. HONESTY OVER SCORE

Nunca sacrificar integridade do gate para alcançar 97.

---

# 1037. CODE REVIEW STANDARD

Antes de considerar uma fase concluída:

revisar diff como reviewer adversarial.

---

# 1038. SECURITY REVIEW STANDARD

Mudanças em:

```text
auth
RLS
secrets
CI
supply chain
```

exigem security-oriented review.

---

# 1039. CLINICAL REVIEW STANDARD

Mudanças em:

```text
prescription
medication
diagnostics
inpatient
discharge
```

exigem clinical-safety-oriented review.

Não inventar decisões médicas; revisar integridade do software e das regras existentes.

---

# 1040. DATABASE REVIEW STANDARD

Migration/concurrency/RLS exigem database-oriented review.

---

# 1041. OPERATIONS REVIEW STANDARD

Deploy/recovery/performance exigem SRE-oriented review.

---

# 1042. UX REVIEW STANDARD

Fluxos humanos críticos exigem UX/a11y review.

---

# 1043. SECONDARY CRITIC

Quando possível, usar critic independente/fresh-context para mudanças P0.

---

# 1044. CRITIC MUST SEE EVIDENCE

Critic deve avaliar implementação + testes + evidence.

---

# 1045. CRITIC MUST NOT SELF-CERTIFY

O critic não pode substituir human release authority.

---

# 1046. FINAL CODE QUALITY

Antes do freeze:

```text
typecheck PASS
lint PASS
format PASS
complexity PASS according to policy
module boundaries PASS
dependency checks PASS
```

---

# 1047. FINAL TEST QUALITY

```text
unit PASS
integration PASS
critical DB PASS
clinical PASS
E2E PASS
security PASS
```

---

# 1048. FINAL OPERATIONS QUALITY

```text
performance PASS
recovery PASS
deploy PASS
rollback PASS
observability PASS
```

---

# 1049. FINAL SUPPLY-CHAIN QUALITY

```text
SBOM PASS
scan PASS
digest PASS
attestation PASS
verification PASS
```

---

# 1050. FINAL GOVERNANCE QUALITY

```text
candidate identity PASS
evidence graph PASS
P0 registry PASS
branch governance PASS
human authority PASS
```

---

# 1051. FINAL PRODUCT QUALITY

```text
critical UX PASS
clinical workflow PASS
UAT PASS
```

---

# 1052. FINAL MATRIX MUST BE MECHANICAL

Não escrever manualmente:

```text
Architecture PASS
Security PASS
```

se puder ser derivado de evidence.

---

# 1053. MANUAL DIMENSIONS

Somente dimensões genuinamente humanas devem depender de entrada humana.

---

# 1054. FINAL SCORECARD GENERATOR

Fortalecer gerador existente.

Não criar segundo gerador concorrente.

---

# 1055. FINAL REPORT GENERATOR

Mesmo princípio.

---

# 1056. SINGLE SOURCE OF TRUTH

Ideal:

```text
machine-readable certification state
↓
scorecard
↓
final report
↓
CI summary
```

---

# 1057. NO MARKDOWN AS DATABASE

Markdown não deve ser a única source of truth para estado de certificação.

---

# 1058. JSON/STRUCTURED STATE

Estado canônico deve ser machine-readable.

---

# 1059. HUMAN COMMENTS

Markdown pode adicionar contexto, não redefinir status.

---

# 1060. FINAL P0 CLOSURE CAMPAIGN

A partir deste ponto, tratar o trabalho como:

# TRIPLE-A EVIDENCE CLOSURE CAMPAIGN

Não como feature sprint.

---

# 1061. P0 BURN-DOWN

A cada checkpoint registrar:

```text
P0 start
P0 closed
P0 reopened
P0 remaining
```

---

# 1062. EVIDENCE BURN-UP

Registrar:

```text
mandatory evidence total
PASS
STALE
NOT_PROVEN
HUMAN_REQUIRED
TARGET_REQUIRED
```

---

# 1063. TARGET READINESS

Quando todos os gates locais estiverem concluídos:

produzir pacote específico para target execution.

---

# 1064. TARGET EXECUTION PACKAGE

Incluir:

```text
exact candidate
required environment
commands
expected results
safety guards
artifacts to capture
```

---

# 1065. HUMAN UAT PACKAGE

Incluir:

```text
candidate
roles
scenarios
expected outcomes
defect form
approval form
```

---

# 1066. RELEASE AUTHORITY PACKAGE

Incluir:

```text
candidate
manifest
score
P0
UAT
security
recovery
performance
rollback
residual risk
```

---

# 1067. FINAL EXTERNAL DEPENDENCIES

Listar explicitamente tudo que Codex não consegue fechar sozinho.

---

# 1068. NO VAGUE EXTERNAL BLOCKERS

Não escrever apenas:

```text
needs production testing
```

Especificar:

```text
which test
which environment
which command
which evidence
```

---

# 1069. READY-TO-RUN EXTERNAL STEPS

Toda etapa externa deve ficar preparada para execução direta.

---

# 1070. NO PRODUCTION CREDENTIALS IN DOCS

Usar placeholders seguros.

---

# 1071. FINAL TARGET EXECUTION RESULT INGESTION

Criar mecanismo para importar evidence externa de volta ao evidence graph.

---

# 1072. EXTERNAL EVIDENCE VALIDATION

Importada evidence deve passar:

```text
schema
SHA binding
environment
digest
issuer
freshness
```

---

# 1073. HUMAN EVIDENCE INGESTION

Mesmo princípio, respeitando que decisão humana não é recalculada pelo agente.

---

# 1074. RECOMPUTE AFTER INGESTION

Após nova evidence:

```text
recompute graph
recompute P0
recompute score
recompute verdict
```

---

# 1075. NO MANUAL SCORE UPDATE

Não editar score manualmente após UAT.

---

# 1076. FINAL CERTIFICATION RUN

Quando todos os inputs estiverem disponíveis:

executar gate completo novamente.

---

# 1077. FINAL SUCCESS CONDITION

A campanha só pode ser declarada totalmente concluída quando:

```text
VERDICT == TRIPLE_A_VERIFIED
```

ou quando todo trabalho automatizável estiver concluído e os únicos blockers restantes forem explicitamente externos/humanos.

Neste segundo caso:

```text
VERDICT == TRIPLE_A_CANDIDATE
```

---

# 1078. ACCEPTABLE SESSION END

É aceitável terminar sessão com:

```text
TRIPLE-A CANDIDATE
TARGET_REQUIRED
HUMAN_REQUIRED
```

se isso representar a realidade.

---

# 1079. UNACCEPTABLE SESSION END

Não é aceitável:

```text
TRIPLE-A VERIFIED
```

sem evidence obrigatória.

---

# 1080. FINAL MASTER DEFINITION OF DONE

Para `TRIPLE-A VERIFIED`:

```text
Overall Score                  >= 97
Critical Score                 >= 95
Open P0                        = 0

Candidate Identity             PASS
Evidence Integrity             PASS
Main                           GREEN
CI                             PASS

Architecture                   PASS
Typecheck                      PASS
Lint                           PASS
Build                          PASS
Unit                           PASS
Integration                    PASS

PostgreSQL Runtime             PASS
RLS Runtime                    PASS
Tenant Pool Isolation          PASS
Authorization                  PASS
Database Roles                 PASS
Migration Upgrade              PASS

Workflow PostgreSQL            PASS
Workflow Concurrency           PASS
Lease/Fencing                  PASS
Worker Crash Recovery          PASS
Retry/DLQ                      PASS
Outbox/Event Integrity         PASS

Clinical Golden Path           PASS
Negative Clinical Paths        PASS
Clinical Safety Invariants     PASS
Medication Safety              PASS
Diagnostic Safety              PASS
Audit Immutability             PASS

Billing Concurrency            PASS
Inventory Integrity            PASS

OpenAPI Runtime Parity         PASS
Security Runtime               PASS
Secrets                        PASS
Attachments                    PASS
Webhooks                       PASS

Frontend E2E                   PASS
Visual Regression              PASS
Accessibility                  PASS

Performance Regression         PASS
Performance Certification      PASS

Observability                  PASS
Alert Delivery                 PASS
SLO/SLI                        PASS

Backup                         PASS
Restore                        PASS
Corrupted Backup               PASS
RPO/RTO                        PASS
Game Days                      PASS

Deploy Rehearsal               PASS
Rollback Rehearsal             PASS

Supply Chain                   PASS
SBOM                           PASS
Container Scan                 PASS
Image Digest                   PASS
Attestation                    PASS
Provenance                     PASS

Branch Governance              PASS
Required Checks                PASS

Soak Required by Policy        PASS

Human UAT                      PASS
Release Authority              PASS

Security Critic                PASS
Clinical Critic                PASS
Database Critic                PASS
Operations Critic              PASS
UX Critic                      PASS
Final Adversarial Audit        PASS

Final Evidence Package         VALID
Final Release Manifest         VALID
```

---

# 1081. TRIPLE-A VERIFIED SUCCESS BLOCK

Somente quando todos os requisitos forem verdadeiros, gerar mecanicamente:

```text
PROJECT=CVG-HIS-V4
TRIPLE_A_VERIFIED=true
CANDIDATE_SHA=<behavior-sha>
RELEASE_SHA=<release-sha>
OVERALL_SCORE=<>=97>
CRITICAL_SCORE=<>=95>
OPEN_P0=0
EVIDENCE_GRAPH=PASS
TARGET_ASSURANCE=PASS
HUMAN_UAT=PASS
RELEASE_AUTHORITY=PASS
FINAL_ADVERSARIAL_AUDIT=PASS
```

---

# 1082. CANDIDATE SUCCESS BLOCK

Se apenas target/humano permanecer:

```text
PROJECT=CVG-HIS-V4
TRIPLE_A_VERIFIED=false
TRIPLE_A_CANDIDATE=true
AUTOMATED_ASSURANCE=PASS
TARGET_ASSURANCE=TARGET_REQUIRED
HUMAN_UAT=HUMAN_REQUIRED
```

Derivar mecanicamente.

---

# 1083. BLOCKED SUCCESS BLOCK

Se blockers técnicos permanecerem:

```text
PROJECT=CVG-HIS-V4
TRIPLE_A_VERIFIED=false
TRIPLE_A_CANDIDATE=false
VERDICT=BLOCKED
```

Listar blockers.

---

# 1084. FINAL DELIVERABLES

Ao final desta campanha devem existir, reutilizando arquivos equivalentes já presentes sempre que possível:

```text
Candidate Identity
Evidence Graph
P0 Registry
Requirement Traceability
Quality Bar
Current Scorecard
Final Report
Execution Log
Residual Risk Register
Clinical Safety Invariants
Database Role Matrix
Performance Certification Policy
SLO/SLI Policy
RPO/RTO Policy
DR Runbook
Deploy Runbook
Rollback Runbook
UAT Protocol
Release Manifest
Final Evidence Package
Final Verdict
```

---

# 1085. DO NOT DUPLICATE EXISTING DELIVERABLES

Antes de criar qualquer arquivo da lista anterior:

pesquise o repositório.

Se já existir:

```text
update
consolidate
repair
```
