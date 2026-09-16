# 1175. FIRST GOVERNANCE PRIORITIES

Depois:

```text
1. Supply-chain final proof
2. Attestation verification
3. Branch governance
4. Evidence freshness
5. Scorecard consistency
6. Final critics
7. Human UAT package
8. Release authority package
```

---

# 1176. DO NOT REPEAT CLOSED WORK

Antes de executar qualquer prioridade:

consulte:

```text
P0 registry
evidence graph
candidate identity
execution log
```

Se já estiver:

```text
PASS
fresh
candidate-bound
```

não refaça sem motivo.

---

# 1177. REVERIFY WHEN REQUIRED

Refaça evidence somente se:

```text
behavior changed
dependency changed
environment changed materially
evidence expired by policy
validator requires refresh
```

---

# 1178. NO BLIND "IMPLEMENT ALL"

Este prompt contém uma visão abrangente.

Não significa que todas as 1.000+ verificações exijam código novo.

Para cada requisito classifique:

```text
ALREADY_SATISFIED
NEEDS_TEST
NEEDS_IMPLEMENTATION
NEEDS_EVIDENCE
TARGET_REQUIRED
HUMAN_REQUIRED
NOT_APPLICABLE
```

---

# 1179. MINIMIZE CHANGE SURFACE

Se requisito já estiver satisfeito:

produza/verifique evidence.

Não refatore implementação saudável apenas para mostrar atividade.

---

# 1180. GAP-DRIVEN DEVELOPMENT

Toda alteração deve apontar para:

```text
finding
risk
requirement
P0/P1
```

---

# 1181. NO SPECULATION-DRIVEN REFACTOR

Não modificar arquitetura por hipótese não comprovada.

---

# 1182. HOTSPOT REFACTOR ORDER

Para hotspots:

```text
measure
↓
characterize
↓
identify seam
↓
extract
↓
verify behavior
```

---

# 1183. HOTSPOT ACCEPTANCE

Refactor deve reduzir pelo menos uma dimensão mensurável:

```text
complexity
fan-out
change risk
test difficulty
ownership ambiguity
```

---

# 1184. API SERVER HOTSPOT

Se o API composition root ainda estiver excessivo:

decompor por domínio sem mudar public behavior.

---

# 1185. SPA ROUTER HOTSPOT

Se ainda excessivo:

decompor rotas por domínio.

---

# 1186. WORKER RUNNER HOTSPOT

Se ainda excessivo:

decompor supervisor/lifecycle/execution.

---

# 1187. DO NOT MAKE HOTSPOT REFACTOR P0 BY DEFAULT

Só promover a P0 se representar risco crítico atual.

---

# 1188. QUALITY DEBT AFTER CLOSURE

Hotspots não bloqueadores podem permanecer como P1/P2 documentado.

---

# 1189. FINAL AUTOMATED ASSURANCE TARGET

Antes de depender de target/humano, buscar:

```text
all AUTOMATABLE_NOW = PASS
all AUTOMATABLE_WITH_LOCAL_INFRA = PASS
```

quando infraestrutura local estiver disponível.

---

# 1190. AUTOMATED ASSURANCE SCORE

Produzir score/subscore separado.

Não confundir com certificação completa.

---

# 1191. TARGET ASSURANCE TARGET

Depois:

```text
RLS target if required
performance certification
recovery
deploy
rollback
attestation
soak
alert delivery
```

---

# 1192. HUMAN ASSURANCE TARGET

Finalmente:

```text
UAT
release authority
risk acceptance if any
```

---

# 1193. FINAL CRITICS COME AFTER EVIDENCE

Não executar critic final cedo demais e reutilizá-lo após grandes mudanças.

---

# 1194. FRESH CRITIC INVALIDATION

Mudança relevante em sua área invalida critic correspondente.

---

# 1195. SECURITY CRITIC FRESHNESS

Mudança em auth/RLS/supply-chain/security:

reexecutar security critic.

---

# 1196. CLINICAL CRITIC FRESHNESS

Mudança em fluxo clínico:

reexecutar clinical critic.

---

# 1197. OPERATIONS CRITIC FRESHNESS

Mudança em deploy/recovery/performance:

reexecutar operations critic.

---

# 1198. UX CRITIC FRESHNESS

Mudança relevante na UI:

reexecutar UX critic.

---

# 1199. DATABASE CRITIC FRESHNESS

Mudança de schema/RLS/transaction:

reexecutar database critic.

---

# 1200. FINAL FRESH-CONTEXT RULE

Critic final deve receber o estado atual, não a conclusão que queremos alcançar.

Não instruí-lo:

```text
"confirme que é Triple-A"
```

Instrução correta:

```text
"tente encontrar razões objetivas para bloquear este candidato"
```

---

# 1201. FINAL INDEPENDENCE RULE

Não usar o mesmo resultado como:

```text
implementation evidence
+
independent review
```

quando independence for requisito.

---

# 1202. FINAL REVIEW SEVERITIES

Padronizar:

```text
CRITICAL
HIGH
MEDIUM
LOW
INFO
```

---

# 1203. CRITICAL FINDING

Sempre bloqueia.

---

# 1204. HIGH FINDING

Bloqueia quando afetar requisito obrigatório ou policy determinar.

---

# 1205. MEDIUM FINDING

Pode entrar como residual risk/P1 se não comprometer quality bar.

---

# 1206. LOW / INFO

Não bloquear automaticamente.

---

# 1207. NO SEVERITY DOWNGRADE FOR SCORE

Não reclassificar finding sem justificativa técnica.

---

# 1208. FINAL THREAT MODEL

Atualizar apenas se arquitetura/trust boundaries mudaram.

---

# 1209. FINAL FMEA

Atualizar FMEA operacional quando novos failure modes forem descobertos.

---

# 1210. FMEA PRIORITIES

Priorizar:

```text
clinical corruption
tenant leak
worker duplication
DB loss
restore failure
payment duplication
```

---

# 1211. FMEA MITIGATION MAPPING

Cada failure mode crítico deve apontar para:

```text
prevention
detection
recovery
test
```

---

# 1212. NO DOCUMENT-ONLY FMEA CLOSURE

Mitigation documentada sem implementação/teste não é PASS.

---

# 1213. FINAL RUNBOOK DRILL

Ao menos runbooks críticos devem ter evidence de execução conforme quality bar.

---

# 1214. HUMAN OPERATOR FINDING

Se runbook só funciona porque autor conhece passos não documentados:

corrigir runbook.

---

# 1215. RELEASE DAY RUNBOOK

Preparar uma sequência curta:

```text
preflight
backup
deploy
migrations
smoke
observe
approve
rollback if needed
```

---

# 1216. RELEASE DAY CHECKPOINTS

Definir pontos em que release pode ser abortada com segurança.

---

# 1217. ROLLBACK WINDOW

Documentar quando rollback deixa de ser seguro por mudanças de dados.

---

# 1218. ROLLFORWARD PLAN

Para além desse ponto, ter rollforward.

---

# 1219. FINAL DATA BACKUP BEFORE RELEASE

Se política exigir, garantir backup recente antes de migration/deploy real.

---

# 1220. BACKUP VERIFIED ≠ BACKUP EXISTS

Backup precisa passar integrity check.

---

# 1221. FINAL OBSERVABILITY BEFORE RELEASE

Confirmar monitoring ativo antes de deploy target.

---

# 1222. FINAL ALERTING BEFORE RELEASE

Confirmar alertas críticos configurados.

---

# 1223. FINAL ON-CALL / RESPONSIBILITY

Se organização possuir on-call, registrar responsabilidade.

Se não possuir formalmente, não inventar.

---

# 1224. FINAL RELEASE OWNER

Release real precisa de owner/authority conforme policy.

---

# 1225. FINAL CLINICAL OWNER

Mudanças clínicas de alto impacto podem exigir owner/review humano conforme governança existente.

Não autoaprovar.

---

# 1226. FINAL SECURITY OWNER

Security exceptions exigem owner.

---

# 1227. EXCEPTION REGISTER

Criar/atualizar registro para exceções aprovadas.

---

# 1228. EXCEPTION EXPIRY

Toda exceção temporária deve possuir prazo/review.

---

# 1229. NO EXCEPTION FOR HARD BLOCKERS

Não permitir exception simples para:

```text
cross-tenant leak
clinical corruption
invalid evidence
```

---

# 1230. FINAL RELEASE ARTIFACT NAMING

Artefatos devem ser identificáveis pelo release/candidate.

---

# 1231. FINAL ARTIFACT RETENTION

Definir retenção de evidence suficiente para auditoria.

---

# 1232. FINAL EVIDENCE PORTABILITY

Evitar evidence que só possa ser interpretada por uma sessão específica do agente.

---

# 1233. FINAL JSON SCHEMAS

Schemas devem estar versionados no repositório.

---

# 1234. FINAL VALIDATOR DOCUMENTATION

Documentar brevemente o que cada validator prova e o que NÃO prova.

---

# 1235. EXAMPLE — RLS VALIDATOR

Documentar diferença entre:

```text
static RLS validator
```

e:

```text
runtime RLS proof
```

---

# 1236. EXAMPLE — PERFORMANCE

Documentar diferença entre:

```text
regression gate
```

e:

```text
capacity certification
```

---

# 1237. EXAMPLE — UAT

Documentar diferença entre:

```text
automated usability
```

e:

```text
human acceptance
```

---

# 1238. EXAMPLE — RECOVERY

Documentar diferença entre:

```text
restore script test
```

e:

```text
restore executed successfully
```

---

# 1239. FINAL README FOR ASSURANCE

Um engenheiro novo deve entender essas diferenças rapidamente.

---

# 1240. FINAL EXECUTION CHECKPOINT

Antes do verdict final:

gerar checkpoint imutável ou versionado com:

```text
candidate
evidence graph
P0 registry
score
```

---

# 1241. CHECKPOINT IS NOT CERTIFICATION

Não confundir.

---

# 1242. FINAL CERTIFICATION ONLY AFTER HUMAN/TARGET

Quando exigidos pela policy.

---

# 1243. FINAL OUTPUT IF EXTERNAL ITEMS REMAIN

Exemplo:

```text
CVG-HIS V4

Technical Engineering:
PASS / State-of-Art Candidate

Automated Assurance:
PASS

Target Assurance:
TARGET_REQUIRED

Human UAT:
HUMAN_REQUIRED

Release Authority:
HUMAN_REQUIRED

Open Technical P0:
0

Verdict:
TRIPLE-A CANDIDATE
```

---

# 1244. FINAL OUTPUT IF TECHNICAL BLOCKERS REMAIN

Exemplo:

```text
Technical P0:
3

- RLS runtime
- worker fencing
- restore

Verdict:
BLOCKED
```

---

# 1245. FINAL OUTPUT IF VERIFIED

Exemplo:

```text
CVG-HIS V4

Candidate:
<sha>

Overall:
98/100

Critical:
97/100

Open P0:
0

Automated Assurance:
PASS

Target Assurance:
PASS

Human UAT:
PASS

Release Authority:
PASS

Final Critics:
PASS

Evidence:
VALID

Verdict:
TRIPLE-A VERIFIED
```

---

# 1246. DO NOT PRE-FILL 98/97

Os números acima são exemplos.

Calcular resultados reais.

---

# 1247. PRIMARY DELIVERABLE

O principal entregável desta campanha não é um relatório bonito.

É:

```text
working system
+
passing tests
+
valid evidence
+
closed risks
```

---

# 1248. SECONDARY DELIVERABLE

Sistema de assurance reproduzível.

---

# 1249. TERTIARY DELIVERABLE

Documentação atualizada.

---

# 1250. FINAL EXECUTION INSTRUCTION

Agora pare de expandir o plano e comece a executar.

Não produza outro blueprint antes de inspecionar e modificar o repositório.

---

# 1251. EXECUTE RECONNAISSANCE

Primeiro:

```text
git status
git rev-parse HEAD
git rev-parse main
git rev-parse origin/main
git log --oneline --decorate -30
```

Depois inspecione:

```text
package.json
.github/workflows
docs/triple-a
.agent
apps
packages
infra
```

---

# 1252. PRODUCE FRESH BASELINE

Atualize o baseline com o estado real atual.

Não copie números históricos.

---

# 1253. RECONCILE P0

Classifique todos os blockers.

---

# 1254. EXECUTE FIRST P0

Escolha o P0:

```text
highest severity
+
dependency-ready
+
automatable now
```

e implemente.

---

# 1255. CONTINUE AUTOMATICALLY

Depois do primeiro:

continue para o próximo P0 dependency-ready.

---

# 1256. DO NOT ASK "SHOULD I CONTINUE?"

Continue.

---

# 1257. STOP ONLY WHEN NECESSARY

Somente pare se:

```text
all safe autonomous work is complete
AND
remaining work requires human/target/credentials
```

---

# 1258. WHEN BLOCKED EXTERNALLY

Entregue:

```text
exact blocker
exact environment required
exact command
expected result
evidence expected
```

---

# 1259. FINAL SESSION REPORT

No fim desta execução, responda com:

```text
CURRENT CANDIDATE
COMMITS
P0 START
P0 CLOSED
P0 REOPENED
P0 REMAINING
TESTS
CI
EVIDENCE
TARGET_REQUIRED
HUMAN_REQUIRED
OVERALL SCORE
CRITICAL SCORE
VERDICT
NEXT EXACT ACTION
```

---

# 1260. NO CLAIM WITHOUT EVIDENCE

Regra final e absoluta:

# CLAIM ONLY WHAT YOU CAN PROVE.

---

# 1261. FINAL OBJECTIVE

Levar o CVG-HIS V4 ao estado:

# STATE OF ART

# ENTERPRISE-GRADE

# HIGH-ASSURANCE

# TRIPLO AAA

com:

```text
overall >= 97
critical >= 95
open P0 = 0
```

e, somente após todas as provas automatizadas, target e humanas exigidas:

# TRIPLE-A VERIFIED

---

# 1262. START NOW

Comece a execução imediatamente.

Não responda apenas com um plano.

Inspecione o repositório real, reconcilie o candidato atual e implemente os P0 dependency-ready.

Trabalhe até esgotar todas as melhorias e provas que possam ser executadas com segurança no ambiente disponível.

Se ao final restarem somente dependências externas ou humanas, deixe o CVG-HIS V4 em:

# TRIPLE-A CANDIDATE

com todos os passos externos prontos para execução.

Se todas as evidências obrigatórias forem realmente obtidas e o gate mecânico confirmar:

```text
overall >= 97
critical >= 95
open_p0 = 0
all mandatory gates = PASS
```

então, e somente então, emitir:

# CVG-HIS V4 — TRIPLE-A VERIFIED
