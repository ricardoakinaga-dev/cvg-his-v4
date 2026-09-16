# 1263. EXECUTION DIRECTIVE — NO MORE PLANNING

A especificação termina aqui.

A partir deste ponto:

# NÃO PRODUZA OUTRO BLUEPRINT.

# NÃO EXPANDA ESTA ESPECIFICAÇÃO.

# NÃO CRIE OUTRA LISTA DE MELHORIAS.

# EXECUTE.

Use os requisitos anteriores como specification backlog.

---

# 1264. BOOT SEQUENCE

Execute imediatamente:

```text id="qfukmt"
Repository Truth
      ↓
Candidate Identity
      ↓
Quality Bar
      ↓
Evidence Graph
      ↓
P0 Registry
      ↓
Dependency Graph
      ↓
Next Best Action
```

---

# 1265. REPOSITORY TRUTH

Comece determinando o estado real:

```bash id="83smad"
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -30
```

Inspecione mudanças locais antes de editar.

Nunca destrua trabalho existente não relacionado.

---

# 1266. CANONICAL STATE LOAD

Carregue as fontes canônicas existentes:

```text id="75r70v"
QUALITY_BAR_V1.json
CURRENT_CANDIDATE_IDENTITY.json
P0_REGISTRY
evidence graph
scorecard
FINAL_REPORT
EXECUTION_LOG
.agent state/backlog
```

Não crie substitutos antes de verificar o que já existe.

---

# 1267. CURRENT CANDIDATE RECONCILIATION

Determine mecanicamente:

```text id="4n4pv4"
behavior_sha
assurance_sha
documentation_sha
head_sha
origin_main_sha
ci_sha
release_sha
```

Identifique divergências.

Corrija candidate identity se necessário.

---

# 1268. CI RECONCILIATION

Descubra o CI remoto mais recente relacionado ao candidato.

Classifique:

```text id="1y7te9"
PASS
FAIL
IN_PROGRESS
STALE
NOT_FOUND
```

CI de outro behavior SHA:

```text id="a45jz7"
STALE
```

---

# 1269. P0 RECONCILIATION

Para cada P0 atual, classifique:

```text id="fj1dl1"
READY
BLOCKED_BY_DEPENDENCY
AUTOMATABLE_LOCAL
LOCAL_INFRA_REQUIRED
TARGET_REQUIRED
HUMAN_REQUIRED
STALE
DUPLICATE
OBSOLETE
```

Não alterar prioridade sem justificativa.

---

# 1270. BUILD EXECUTION DAG

Construa internamente o DAG real.

Exemplo:

```text id="ex82f4"
Candidate
   ↓
CI
   ↓
PostgreSQL
   ├── RLS
   ├── Workflow
   ├── Billing
   └── Inventory
         ↓
Clinical Golden Path
         ↓
Recovery
         ↓
Release
```

Não execute tarefa bloqueada antes da dependência.

---

# 1271. NEXT BEST ACTION ALGORITHM

Escolha sempre:

```text id="xfp88m"
highest severity
+
dependency ready
+
largest risk reduction
+
automatable in current environment
```

Não escolha tarefa porque é mais fácil.

---

# 1272. IMPLEMENTATION LOOP

Para cada finding:

```text id="pv92ao"
UNDERSTAND
↓
REPRODUCE
↓
ROOT CAUSE
↓
DESIGN MINIMAL FIX
↓
IMPLEMENT
↓
FOCAL TEST
↓
INTEGRATION TEST
↓
REGRESSION
↓
EVIDENCE
↓
P0 RECOMPUTE
```

---

# 1273. TDD FOR CRITICAL BUGS

Para P0/P1 crítico:

sempre que tecnicamente possível:

```text id="eqm0zp"
failing test
↓
fix
↓
passing test
```

---

# 1274. EVIDENCE IMMEDIATELY

Não espere o final da campanha para produzir evidence.

Após cada closure:

registre evidence candidate-bound imediatamente.

---

# 1275. RECOMPUTE AFTER EVERY CLOSURE

Atualize:

```text id="dg1qke"
evidence graph
P0 registry
score
critical score
verdict
```

---

# 1276. INVALIDATE AFTER BEHAVIOR CHANGE

Depois de qualquer mudança comportamental:

execute invalidation automática de evidence dependente.

Não preserve PASS indevido.

---

# 1277. COMMIT COHERENT SLICES

Quando uma melhoria estiver:

```text id="f9ckln"
implemented
tested
documented
```

faça commit semântico conforme workflow permitido.

---

# 1278. COMMIT EXAMPLE

```text id="j57t6j"
test(rls): prove pooled runtime tenant isolation
```

ou:

```text id="p0nsn9"
fix(worker): reject stale fencing tokens after takeover
```

Não usar mensagens vagas.

---

# 1279. CONTINUE AFTER COMMIT

Não parar para relatar cada commit.

Continue a campanha.

---

# 1280. POSTGRESQL WAVE

Assim que PostgreSQL real descartável estiver disponível, executar como grupo prioritário:

```text id="p0n78g"
migrations
↓
runtime roles
↓
RLS
↓
pool isolation
↓
workflow
↓
concurrency
↓
lease/fencing
↓
worker recovery
↓
billing concurrency
↓
inventory concurrency
↓
clinical golden path
```

---

# 1281. RLS P0 EXIT CONDITION

Só fechar RLS quando houver prova de:

```text id="exk9v5"
API cross-tenant read denied
API cross-tenant mutation denied
Worker cross-tenant denied
Known foreign UUID denied
Pool reuse isolation PASS
```

---

# 1282. WORKFLOW P0 EXIT CONDITION

Só fechar quando:

```text id="z8sn7q"
PostgreSQL lifecycle PASS
idempotency PASS
concurrent claim PASS
terminal transition PASS
retry/DLQ PASS
replay PASS
```

---

# 1283. WORKER P0 EXIT CONDITION

Só fechar quando:

```text id="u4q4kg"
real process crash PASS
lease expiry PASS
takeover PASS
stale fencing rejection PASS
duplicate material effect = 0
```

---

# 1284. CLINICAL P0 EXIT CONDITION

Só fechar quando:

```text id="shmxx3"
Golden Path PASS
Negative Paths PASS
Medication duplicate protection PASS
Diagnostic duplicate protection PASS
Audit PASS
Tenant PASS
```

---

# 1285. FINANCIAL P0 EXIT CONDITION

Só fechar quando:

```text id="0wp5sm"
duplicate payment effect = 0
duplicate settlement effect = 0
concurrency invariants PASS
audit/reconciliation PASS
```

---

# 1286. PERFORMANCE WAVE

Depois de estabilidade funcional:

```text id="w7puzs"
Regression Benchmark
↓
Profile
↓
Root-cause optimization
↓
Headroom
↓
Controlled Certification
```

---

# 1287. PERFORMANCE EXIT CONDITION

Não basta:

```text id="x09f7d"
SLO barely PASS
```

Busque margem operacional quando razoável.

Mas não altere comportamento funcional apenas para benchmark.

---

# 1288. RECOVERY WAVE

Executar:

```text id="7pnm9i"
backup
↓
integrity
↓
destroy disposable environment
↓
restore
↓
invariant check
↓
clinical smoke
↓
RPO/RTO measurement
```

---

# 1289. RECOVERY EXIT CONDITION

Recovery só recebe PASS se restore realmente aconteceu.

Script existente:

```text id="zj9z31"
!=
```

restore comprovado.

---

# 1290. DEPLOY WAVE

Executar:

```text id="6k1o8g"
preflight
↓
deploy candidate
↓
migrations
↓
readiness
↓
smoke
↓
observation
↓
rollback rehearsal
```

em ambiente autorizado.

---

# 1291. SUPPLY-CHAIN WAVE

Executar:

```text id="u1agmr"
build once
↓
SBOM
↓
scan
↓
digest
↓
publish
↓
attest
↓
verify
↓
promote same digest
```

---

# 1292. SOAK WAVE

Se exigido:

executar duração completa.

Não declarar PASS antes do término real.

---

# 1293. EXTERNAL WAITING

Enquanto:

```text id="z5mslt"
CI
soak
target process
```

estiver em andamento:

execute outros P0 independentes.

---

# 1294. HUMAN WAVE

Quando somente itens humanos restarem:

gere pacote pronto.

Não invente decisão.

---

# 1295. FINAL CANDIDATE FREEZE

Quando código estiver pronto:

```text id="sxj8t8"
freeze behavior SHA
```

Depois:

nenhuma mudança comportamental.

---

# 1296. FINAL REVALIDATION

No SHA congelado:

```text id="2dd12j"
CI
RLS
workflow
clinical
security
performance
recovery
supply chain
```

devem estar fresh conforme dependency model.

---

# 1297. FINAL CRITIC MODE

Invoque critics com objetivo explícito:

```text id="kfrmlz"
Find reasons this candidate should NOT ship.
```

Não:

```text id="trc28f"
Confirm Triple-A.
```

---

# 1298. FINAL ADVERSARIAL QUESTIONS

Pergunte:

```text id="wjdhzl"
Can tenant A access tenant B?
Can a medication execute twice?
Can a stale worker mutate state?
Can a payment settle twice?
Can an event disappear after DB commit?
Can restore lose data?
Can an old evidence file certify new code?
Can an unscanned image be deployed?
Can CI be bypassed?
Can UAT be fabricated by automation?
```

Toda resposta crítica precisa de evidence.

---

# 1299. FINAL HARD-GATE REVIEW

Verifique novamente:

```text id="dx3j93"
MAIN GREEN?
OPEN P0 = 0?
RLS PASS?
CLINICAL PASS?
RECOVERY PASS?
SECURITY PASS?
EVIDENCE VALID?
```

Uma resposta negativa:

```text id="ey5ecf"
BLOCKED
```

---

# 1300. FINAL SCORE COMPUTATION

Calcule mecanicamente:

```text id="jq9skj"
overall
critical
P0
```

Não editar resultado.

---

# 1301. FINAL HUMAN/TARGET CHECK

Antes de Verified:

```text id="pdce29"
TARGET_REQUIRED remaining = 0
HUMAN_REQUIRED remaining = 0
```

quando quality bar exigir essas provas.

---

# 1302. FINAL RELEASE GATE

Execute o comando canônico.

Resultado deve ser determinístico.

---

# 1303. IF VERIFIED

Gerar:

```text id="8y6fgp"
CERTIFICATION.md
release manifest
evidence index
final verdict
scorecard
final report
```

todos consistentes.

---

# 1304. IF CANDIDATE

Não gerar claim Verified.

Gerar lista exata das provas restantes.

---

# 1305. IF BLOCKED

Listar blockers por prioridade.

Não esconder atrás do score.

---

# 1306. FINAL RESPONSE FORMAT

Ao final, entregue exatamente estas seções:

```text id="uc9wm8"
CVG-HIS V4 — FINAL EXECUTION REPORT

1. Candidate Identity
2. Implementation Summary
3. Commits
4. Tests
5. Runtime Evidence
6. Security
7. Clinical Safety
8. Workflow / Worker
9. Performance
10. Recovery
11. Supply Chain
12. CI
13. P0 Burn-down
14. Target Required
15. Human Required
16. Residual Risks
17. Scores
18. Verdict
19. Exact Next Action
```

---

# 1307. REPORT ONLY FACTS

Não use linguagem promocional.

---

# 1308. VERDICT FORMAT — VERIFIED

Somente se verdadeiro:

```text id="b2jgsb"
PROJECT: CVG-HIS V4

CANDIDATE SHA: <sha>
RELEASE SHA: <sha>

OVERALL SCORE: <>=97>
CRITICAL SCORE: <>=95>
OPEN P0: 0

AUTOMATED ASSURANCE: PASS
TARGET ASSURANCE: PASS
HUMAN UAT: PASS
RELEASE AUTHORITY: PASS
EVIDENCE INTEGRITY: PASS

VERDICT:
TRIPLE-A VERIFIED
```

---

# 1309. VERDICT FORMAT — CANDIDATE

```text id="3whi9l"
PROJECT: CVG-HIS V4

AUTOMATED ASSURANCE: PASS
TARGET ASSURANCE: TARGET_REQUIRED
HUMAN ASSURANCE: HUMAN_REQUIRED

VERDICT:
TRIPLE-A CANDIDATE
```

Adapte aos resultados reais.

---

# 1310. VERDICT FORMAT — BLOCKED

```text id="fr5snn"
PROJECT: CVG-HIS V4

OPEN P0: <n>

BLOCKERS:
<exact blockers>

VERDICT:
BLOCKED / NOT PROVEN
```

---

# 1311. FINAL PROHIBITION

Nunca emitir:

# TRIPLE-A VERIFIED

porque:

```text id="lxamqe"
"arquitetura parece excelente"
```

ou:

```text id="jvhh0a"
"muitos testes passaram"
```

ou:

```text id="fl9b93"
"score técnico parece 98"
```

Certificação depende do gate.

---

# 1312. FINAL QUALITY PRINCIPLE

O melhor resultado não é:

```text id="kgntxe"
mais código
```

É:

```text id="4at1ce"
menos risco
+
mais prova
+
mais previsibilidade
```

---

# 1313. FINAL ENGINEERING PRINCIPLE

Para cada fluxo crítico:

# NORMAL PATH + FAILURE PATH + RECOVERY PATH

---

# 1314. FINAL DATABASE PRINCIPLE

# TENANT ISOLATION MUST BE PROVEN AT RUNTIME

---

# 1315. FINAL WORKER PRINCIPLE

# AT-LEAST-ONCE DELIVERY + IDEMPOTENT MATERIAL EFFECT

quando esse for o modelo real.

---

# 1316. FINAL CLINICAL PRINCIPLE

# NO SILENT CLINICAL CORRUPTION

---

# 1317. FINAL FINANCIAL PRINCIPLE

# NO DUPLICATE MATERIAL FINANCIAL EFFECT

---

# 1318. FINAL RECOVERY PRINCIPLE

# A BACKUP IS NOT A BACKUP UNTIL RESTORE IS PROVEN

---

# 1319. FINAL SUPPLY-CHAIN PRINCIPLE

# TEST WHAT YOU DEPLOY — DEPLOY WHAT YOU TESTED

---

# 1320. FINAL ASSURANCE PRINCIPLE

# EVIDENCE BELONGS TO A SPECIFIC CANDIDATE

---

# 1321. FINAL GOVERNANCE PRINCIPLE

# AUTOMATION CANNOT FABRICATE HUMAN APPROVAL

---

# 1322. FINAL CERTIFICATION PRINCIPLE

# CLAIM ONLY WHAT YOU CAN PROVE

---

# 1323. NOW EXECUTE

Não produza mais planejamento.

Não responda com outra especificação.

Comece agora pela verdade atual do repositório.

Reconcilie:

```text id="oqls11"
HEAD
origin/main
candidate identity
latest CI
P0 registry
evidence graph
quality bar
```

Depois execute continuamente os P0 dependency-ready até esgotar todo trabalho seguro disponível.

---

# 1324. EXPECTED END STATE

O objetivo técnico máximo é:

```text id="8v51k8"
Architecture              >= 97
Security                  >= 95
Clinical Safety           >= 95
Database/RLS              >= 95
Workflow/Worker           >= 95
Recovery                  >= 95
Supply Chain              >= 95

Overall                   >= 97
Critical                  >= 95
Open P0                   = 0
```

Os números exatos devem vir do modelo real do projeto.

---

# 1325. FINAL TARGET

Se todas as provas forem obtidas:

# CVG-HIS V4

# STATE OF ART

# ENTERPRISE-GRADE

# HIGH-ASSURANCE

# TRIPLO AAA

# TRIPLE-A VERIFIED

Se ainda depender exclusivamente de target/humano:

# CVG-HIS V4

# STATE OF ART CANDIDATE

# TRIPLE-A CANDIDATE

Se houver P0 técnico:

# BLOCKED / NOT PROVEN

---

# 1326. BEGIN

# EXECUTE NOW.
