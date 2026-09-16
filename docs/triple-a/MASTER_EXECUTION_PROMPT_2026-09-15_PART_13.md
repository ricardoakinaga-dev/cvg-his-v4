# 1085. DO NOT DUPLICATE EXISTING DELIVERABLES

Antes de criar qualquer arquivo da lista anterior:

pesquise o repositório.

Se já existir:

```text
update
consolidate
repair
extend
```

em vez de criar uma segunda source of truth.

---

# 1086. CANONICAL FILE DISCOVERY

Antes de implementar qualquer mecanismo novo, descubra:

```text
canonical implementation
canonical test
canonical policy
canonical evidence
canonical deployment rail
```

Não assuma nomes baseados apenas neste prompt.

---

# 1087. REPOSITORY REALITY OVERRIDES EXAMPLES

Os nomes e estruturas deste prompt são exemplos arquiteturais.

Se o repositório já possui solução equivalente melhor:

# PRESERVE E EVOLUA A IMPLEMENTAÇÃO REAL.

Não force estrutura artificial apenas para corresponder literalmente ao prompt.

---

# 1088. NO PARALLEL FRAMEWORK

Não criar:

```text
triple-a-v2
new-assurance
new-release-system
second-evidence-engine
```

se a infraestrutura atual puder ser evoluída.

---

# 1089. MIGRATE IN PLACE

Melhorar o sistema de assurance existente incrementalmente.

---

# 1090. PRESERVE COMPATIBILITY

Scripts, CI e consumidores existentes devem continuar funcionando quando razoável.

Breaking change precisa de justificativa.

---

# 1091. REMOVE LEGACY ONLY AFTER PROOF

Se mecanismo antigo for substituído:

```text
identify consumers
↓
migrate
↓
test
↓
prove no consumer
↓
remove/deprecate
```

---

# 1092. LEGACY CLASSIFICATION

Quando algo antigo não puder ser removido:

classificar:

```text
COMPATIBILITY
HISTORICAL
DEPRECATED
```

---

# 1093. FIRST ACTION — REPOSITORY RECONNAISSANCE

Comece agora inspecionando o estado real.

Execute:

```text
git status
git branch --show-current
git rev-parse HEAD
git rev-parse main
git rev-parse origin/main
git log --oneline --decorate -30
```

e comandos equivalentes necessários.

---

# 1094. FIRST ACTION — WORKTREE

Determine:

```text
clean?
untracked?
generated?
staged?
```

Não sobrescreva trabalho não relacionado.

---

# 1095. FIRST ACTION — CURRENT CANDIDATE

Descubra:

```text
behavior SHA
assurance SHA
documentation SHA
CI SHA
release SHA
```

a partir do estado real.

Não copie SHAs antigos deste prompt.

---

# 1096. FIRST ACTION — CI

Inspecione os runs mais recentes.

Determine:

```text
latest run
candidate SHA
terminal?
jobs
failures
artifacts
```

---

# 1097. FIRST ACTION — QUALITY STATE

Leia:

```text
QUALITY_BAR
CURRENT_CANDIDATE_IDENTITY
P0 registry/backlog
evidence graph
scorecard
FINAL_REPORT
EXECUTION_LOG
```

---

# 1098. FIRST ACTION — EXISTING COMMANDS

Leia `package.json`.

Mapeie todos os comandos relacionados a:

```text
test
critical
RLS
performance
backup
restore
security
supply chain
evidence
release
```

---

# 1099. FIRST ACTION — WORKFLOWS

Inspecione `.github/workflows`.

Mapeie:

```text
PR CI
main CI
performance
soak
security
release
usability
game day
```

---

# 1100. FIRST ACTION — ARCHITECTURE

Inspecione:

```text
apps/api
apps/spa
apps/worker
packages/modules
packages/db
packages/security
packages/rbac
packages/tenant-context
```

---

# 1101. FIRST ACTION — HOTSPOTS

Reavalie hotspots atuais.

Não reutilize contagens históricas sem verificar.

---

# 1102. FIRST ACTION — P0 RECONCILIATION

Pegue todos os P0 atuais.

Para cada um classifique:

```text
AUTOMATABLE_NOW
AUTOMATABLE_WITH_LOCAL_INFRA
TARGET_REQUIRED
HUMAN_REQUIRED
DUPLICATE
OBSOLETE
```

---

# 1103. FIRST ACTION — DO NOT CLOSE YET

Não feche P0 durante reconciliação apenas porque "parece resolvido".

Primeiro encontre evidence.

---

# 1104. FIRST ACTION — EVIDENCE RECONCILIATION

Para cada P0:

```text
required evidence
existing evidence
candidate binding
fresh?
valid?
```

---

# 1105. FIRST ACTION — EXECUTION PLAN

Depois da reconciliação, produzir um plano executável.

Não gerar apenas roadmap textual.

Cada item deve possuir:

```text
ID
priority
dependency
action
command/test
completion signal
evidence output
```

---

# 1106. FIRST EXECUTION WAVE

Comece imediatamente pelos P0:

```text
AUTOMATABLE_NOW
```

com maior impacto.

---

# 1107. SECOND EXECUTION WAVE

Depois:

```text
AUTOMATABLE_WITH_LOCAL_INFRA
```

Provisionar PostgreSQL/Redis descartáveis quando seguro e disponível.

---

# 1108. EXTERNAL WAVE PREPARATION

Para:

```text
TARGET_REQUIRED
HUMAN_REQUIRED
```

prepare todos os scripts/protocolos/evidence schemas.

Não marque PASS.

---

# 1109. P0 CLOSURE LOOP

Para cada P0 automatizável:

```text
REPRODUCE / VERIFY GAP
↓
ROOT CAUSE
↓
IMPLEMENT
↓
FOCAL TEST
↓
INTEGRATION
↓
CRITICAL REGRESSION
↓
EVIDENCE
↓
CRITIC WHEN REQUIRED
↓
CLOSE
```

---

# 1110. NEVER BATCH-CLOSE P0 WITHOUT EVIDENCE

Mesmo que uma alteração resolva dez P0:

cada item deve apontar para evidence correspondente.

---

# 1111. BATCH EXECUTION IS ALLOWED

Pode executar vários testes juntos.

Mas traceability permanece individual.

---

# 1112. AFTER EACH WAVE

Recalcular:

```text
evidence graph
P0 registry
overall score
critical score
verdict
```

---

# 1113. AFTER EACH BEHAVIOR CHANGE

Invalidar evidence dependente.

---

# 1114. AFTER DOC-ONLY CHANGE

Não invalidar behavior evidence se guard provar que mudança é realmente docs-only.

---

# 1115. AFTER WORKFLOW CHANGE

CI evidence correspondente fica stale até rerun.

---

# 1116. AFTER PERFORMANCE CODE CHANGE

Performance evidence fica stale.

---

# 1117. AFTER DATABASE CHANGE

Invalidar no mínimo evidence relacionada a:

```text
DB
RLS
critical integration
golden path
migration
performance when affected
```

---

# 1118. AFTER AUTH CHANGE

Invalidar:

```text
auth
authorization
security
critical E2E
OpenAPI if surface changed
```

---

# 1119. AFTER WORKER CHANGE

Invalidar:

```text
worker
workflow
crash recovery
soak when relevant
```

---

# 1120. AFTER CLINICAL CHANGE

Invalidar clinical evidence afetada.

---

# 1121. COMMIT AFTER COHERENT SLICE

Não esperar centenas de mudanças para commit.

---

# 1122. DO NOT COMMIT BROKEN MAIN INTENTIONALLY

Antes de commit destinado à integração:

executar gates focais.

---

# 1123. PUSH / REMOTE ACTIONS

Se ambiente e autorização atual permitirem fluxo normal do repositório, siga-o.

Não use force push.

---

# 1124. CI RESULT INGESTION

Quando CI terminalizar:

capturar resultado automaticamente quando possível.

---

# 1125. CI FAILURE

Se CI falhar:

não usar sucesso local como substituto.

Investigar diferença.

---

# 1126. CI PASS

CI PASS no SHA correto promove apenas os nodes que aquele CI realmente prova.

---

# 1127. GREEN MAIN DOES NOT PROVE TARGET

Preservar essa distinção.

---

# 1128. TARGET PACKAGE

Quando chegar aos blockers externos, produzir instruções exatas.

Exemplo:

```text
P0-RECOVERY-RESTORE

Environment:
Disposable staging

Command:
<canonical command>

Expected:
restore PASS

Evidence:
artifacts/triple-a/restore.json
```

---

# 1129. HUMAN PACKAGE

Mesmo formato para UAT.

---

# 1130. NO PLACEHOLDER PASS

Arquivos de evidence ainda não executados devem conter:

```text
NOT_PROVEN
TARGET_REQUIRED
HUMAN_REQUIRED
```

e nunca PASS placeholder.

---

# 1131. CURRENT REPORT AFTER AUTOMATED CLOSURE

Quando todos os P0 automatizáveis forem fechados, gerar relatório intermediário.

Exemplo:

```text
AUTOMATED ASSURANCE: PASS
TARGET ASSURANCE: TARGET_REQUIRED
HUMAN ASSURANCE: HUMAN_REQUIRED
VERDICT: TRIPLE-A CANDIDATE
```

somente se verdadeiro.

---

# 1132. DO NOT STOP IF SCORE <97 DUE TO EXTERNAL EVIDENCE

Se tudo automatizável estiver pronto:

prepare external closure.

Não tentar compensar score alterando pesos.

---

# 1133. TARGET EXECUTION

Quando ambiente autorizado estiver disponível:

executar exatamente os drills preparados.

---

# 1134. TARGET SAFETY

Antes de cada drill:

confirmar ambiente.

---

# 1135. TARGET RESULTS

Importar evidence.

---

# 1136. TARGET FAILURE

Se falhar:

abrir/reabrir P0.

Corrigir root cause.

---

# 1137. HUMAN UAT EXECUTION

Somente humano autorizado pode emitir decisão.

---

# 1138. UAT FAILURE

Defeito blocking reabre candidato.

---

# 1139. RELEASE AUTHORITY

Última decisão humana conforme política.

---

# 1140. FINAL FREEZE

Depois de tudo:

```text
freeze candidate
```

Nenhuma mudança comportamental após esse ponto.

---

# 1141. FINAL CI

Rodar novamente no candidato congelado se freshness model exigir.

---

# 1142. FINAL EVIDENCE VALIDATION

Executar todos os validators.

---

# 1143. FINAL SCORE

Calcular.

---

# 1144. FINAL CRITICS

Executar fresh-context.

---

# 1145. FINAL ADVERSARIAL AUDIT

Executar.

---

# 1146. FINAL RELEASE GATE

Executar:

```text
pnpm release:triple-a
```

ou comando canônico equivalente.

---

# 1147. FINAL SUCCESS

Somente se retornar:

```text
TRIPLE_A_VERIFIED
```

com todos os critérios satisfeitos, emitir certificação.

---

# 1148. FINAL CANDIDATE

Se target/human ainda estiver pendente:

emitir:

```text
TRIPLE_A_CANDIDATE
```

---

# 1149. FINAL BLOCKED

Se blocker técnico permanecer:

emitir:

```text
BLOCKED
```

---

# 1150. FINAL DELIVERY TO USER

No final da execução, entregue resumo objetivo:

```text
1. Candidate SHA
2. Commits realizados
3. Principais melhorias
4. Testes executados
5. Evidence produzida
6. P0 fechados
7. P0 restantes
8. Target-required
9. Human-required
10. Score
11. Verdict
12. Próxima ação exata
```

---

# 1151. DO NOT DUMP ALL LOGS

Resumir.

Apontar paths para detalhes.

---

# 1152. REPORT FAILURES HONESTLY

Se algo não passou, dizer.

---

# 1153. REPORT UNEXECUTED HONESTLY

Se não executou, dizer.

---

# 1154. REPORT ENVIRONMENT LIMITATIONS

Exemplo:

```text
PostgreSQL unavailable
Docker unavailable
GHCR credential unavailable
human UAT unavailable
```

---

# 1155. DO NOT SAY "TRIPLE-A" AS MARKETING

Use somente conforme quality gate.

---

# 1156. OBJECTIVE FINAL TARGET

O resultado desejado é:

```text
PROJECT=CVG-HIS-V4

ENGINEERING_QUALITY=STATE_OF_ART
ASSURANCE_FRAMEWORK=PASS
MAIN=GREEN
CI=PASS

OVERALL_SCORE>=97
CRITICAL_SCORE>=95
OPEN_P0=0

DATABASE_RLS=PASS
CLINICAL_SAFETY=PASS
WORKFLOW_RELIABILITY=PASS
WORKER_RELIABILITY=PASS
SECURITY=PASS
PERFORMANCE=PASS
RECOVERY=PASS
SUPPLY_CHAIN=PASS
UX_UAT=PASS
GOVERNANCE=PASS

TRIPLE_A_VERIFIED=true
```

Somente se objetivamente verdadeiro.

---

# 1157. INTERMEDIATE TARGET

Antes disso, um excelente resultado legítimo é:

```text
ENGINEERING_QUALITY=STATE_OF_ART
AUTOMATED_ASSURANCE=PASS
TARGET_ASSURANCE=TARGET_REQUIRED
HUMAN_ASSURANCE=HUMAN_REQUIRED
TRIPLE_A_CANDIDATE=true
TRIPLE_A_VERIFIED=false
```

---

# 1158. GUIDING PRINCIPLE

Durante toda a execução, pergunte:

> Esta mudança reduz um risco real ou produz evidência confiável?

Se a resposta for não:

não priorize durante esta campanha.

---

# 1159. SECOND GUIDING PRINCIPLE

Pergunte:

> Eu consigo provar que isso funciona sob falha, concorrência e ambiente realista?

Se não:

fortaleça a prova.

---

# 1160. THIRD GUIDING PRINCIPLE

Pergunte:

> Esta evidência pertence realmente ao candidato atual?

Se não:

marque STALE/INVALID.

---

# 1161. FOURTH GUIDING PRINCIPLE

Pergunte:

> Estou tentando melhorar o sistema ou apenas melhorar o score?

Se for apenas score:

não faça.

---

# 1162. FIFTH GUIDING PRINCIPLE

Para superfícies clínicas:

# SAFETY > CONVENIENCE

---

# 1163. SIXTH GUIDING PRINCIPLE

Para segurança:

# FAIL CLOSED

quando a policy exigir.

---

# 1164. SEVENTH GUIDING PRINCIPLE

Para operações assíncronas:

# DURABLE + IDEMPOTENT + OBSERVABLE

---

# 1165. EIGHTH GUIDING PRINCIPLE

Para banco:

# CONSTRAINTS + TRANSACTIONS + RLS + EVIDENCE

---

# 1166. NINTH GUIDING PRINCIPLE

Para release:

# BUILD ONCE — VERIFY — PROMOTE SAME DIGEST

quando tecnicamente possível.

---

# 1167. TENTH GUIDING PRINCIPLE

Para certificação:

# CLAIM ONLY WHAT YOU CAN PROVE

---

# 1168. EXECUTION MODE

Não responda apenas com plano.

Depois do reconhecimento inicial:

# IMPLEMENTE.

Execute todas as mudanças seguras e verificáveis disponíveis.

---

# 1169. DO NOT ASK FOR PERMISSION BETWEEN NORMAL PHASES

Continue autonomamente entre:

```text
inspect
implement
test
verify
document
commit
```

quando seguro.

---

# 1170. ONLY STOP FOR TRUE EXTERNAL DEPENDENCY

Pare e solicite ação somente quando a próxima ação realmente exigir:

```text
human
credential
target
production authority
```

e não houver outro trabalho independente.

---

# 1171. START NOW

Comece imediatamente por:

```text
A. git/repository baseline
B. current candidate identity
C. current CI state
D. evidence graph
E. P0 reconciliation
F. quality bar validation
G. executable P0 classification
```

---

# 1172. THEN EXECUTE

Depois:

```text
close AUTOMATABLE_NOW P0
↓
close AUTOMATABLE_WITH_LOCAL_INFRA P0
↓
prepare TARGET_REQUIRED
↓
prepare HUMAN_REQUIRED
↓
recompute assurance
```

---

# 1173. FIRST TECHNICAL PRIORITIES

Se ainda estiverem abertos no estado real, priorize:

```text
1. Current candidate / evidence consistency
2. Current candidate Green Main
3. RLS runtime
4. Tenant pool isolation
5. Workflow PostgreSQL
6. Workflow concurrency
7. Lease/fencing
8. Worker SIGKILL recovery
9. Outbox integrity
10. Clinical golden path
11. Clinical negative paths
12. Audit immutability
13. Billing concurrency
14. Inventory concurrency
15. OpenAPI/runtime parity
16. Deadline/cancellation propagation
17. Security runtime
18. Performance regression determinism
```

Não assuma que ainda estão abertos: verifique primeiro.

---

# 1174. FIRST OPERATIONS PRIORITIES

Depois:

```text
1. Backup
2. Restore
3. Corrupt backup
4. RPO/RTO
5. Migration upgrade
6. Game days
7. Deploy rehearsal
8. Rollback rehearsal
9. Performance certification
10. Soak
```

---

# 1175. FIRST GOVERNANCE PRIORITIES

Depois:

```text
1. Supply-chain final proof
2. Attestation verification
```
