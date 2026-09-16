# 272. INDEX BLOAT / DATABASE MAINTENANCE

Definir estratégia operacional para:

```text id="8ht6xq"
VACUUM
ANALYZE
autovacuum
index growth
table growth
```

Não criar manutenção manual desnecessária se PostgreSQL já estiver adequadamente configurado.

Criar métricas para detectar degradação.

---

# 273. SLOW QUERY OBSERVABILITY

Habilitar mecanismo apropriado para identificar queries lentas.

Pode incluir:

```text id="r5axnb"
pg_stat_statements
application query metrics
slow-query logs
```

conforme ambiente.

Não registrar parâmetros sensíveis desnecessariamente.

---

# 274. QUERY REGRESSION

Para queries P0, armazenar baseline de performance.

Detectar regressões relevantes após:

```text id="9v6k6q"
migration
index change
ORM/repository change
PostgreSQL upgrade
```

---

# 275. POSTGRESQL VERSION POLICY

Documentar:

```text id="3rrvqx"
supported major
upgrade policy
minimum version
```

Evitar depender acidentalmente de comportamento de uma versão não documentada.

---

# 276. REDIS VERSION POLICY

Fazer o mesmo para Redis.

---

# 277. NODE VERSION POLICY

Node deve estar fixado/documentado.

CI, container e desenvolvimento devem minimizar drift.

---

# 278. PNPM VERSION POLICY

Fixar versão apropriada no projeto.

Build deve falhar de forma clara com package manager incompatível quando necessário.

---

# 279. BROWSER VERSION EVIDENCE

E2E/visual evidence deve registrar:

```text id="o0b1yu"
browser
version
Playwright version
viewport
locale
timezone
```

---

# 280. LOCALE ASSURANCE

Para UI brasileira, testar:

```text id="3s0w02"
pt-BR
currency BRL
date formatting
decimal formatting
```

Não misturar locale com persistência.

---

# 281. CURRENCY PRECISION

Operações financeiras não devem depender de floating point inadequado.

Revisar:

```text id="o6u0c2"
prices
payments
taxes
discounts
totals
```

Usar representação monetária apropriada.

---

# 282. ROUNDING POLICY

Documentar política de arredondamento financeiro.

Testar boundaries.

---

# 283. FINANCIAL RECONCILIATION

Criar mecanismo/testes para detectar divergência entre:

```text id="8tn6gp"
invoice
payment
cash movement
billing status
```

---

# 284. INVENTORY RECONCILIATION

Criar verificação para:

```text id="7xhdwv"
movements
current balance
lots
consumption
```

quando aplicável.

---

# 285. AUDIT RECONCILIATION

Critical mutation deve possuir audit correspondente quando política exigir.

Criar checker.

---

# 286. EVENT RECONCILIATION

Para operações que devem emitir evento:

```text id="v3bixv"
state mutation
↔
outbox event
```

Criar invariant checker quando tecnicamente viável.

---

# 287. WORKFLOW RECONCILIATION

Detectar:

```text id="d6n7et"
terminal task with active lease
completed task still overdue
DLQ task marked processing
```

e outros estados impossíveis.

---

# 288. DATA INVARIANT CHECK COMMAND

Criar comando:

```text id="7ab0gj"
pnpm ops:check-invariants
```

ou equivalente compatível.

Deve ser read-only por padrão.

Nunca corrigir dados automaticamente sem modo explícito e seguro.

---

# 289. READ-ONLY DIAGNOSTICS

Ferramentas operacionais de diagnóstico devem preferir:

```text id="uzdfpd"
read-only
```

como default.

---

# 290. REPAIR COMMANDS

Se existirem comandos de reparo:

exigir:

```text id="5x37od"
explicit confirmation
dry-run
audit
scope
```

Não executar automaticamente em produção.

---

# 291. DRY-RUN STANDARD

Operações potencialmente destrutivas devem oferecer dry-run quando tecnicamente possível.

---

# 292. DATABASE DESTRUCTIVE OPERATION GUARD

Bloquear comandos perigosos em ambiente de produção sem confirmação explícita.

Exemplos:

```text id="8y8mkf"
drop
truncate
reset
destructive fixture
```

---

# 293. ENVIRONMENT CLASSIFICATION

Padronizar:

```text id="cuwt6a"
development
test
ci
staging
production
```

Evitar heurísticas frágeis baseadas apenas em hostname.

---

# 294. DISPOSABLE ENVIRONMENT MARKER

Drills destrutivos devem exigir marcador explícito:

```text id="txzdb0"
CVG_DISPOSABLE_ENVIRONMENT=1
```

ou mecanismo equivalente.

Sem marcador:

```text id="9bfrrk"
BLOCK
```

---

# 295. PRODUCTION SAFETY GUARD

Scripts de:

```text id="0prk49"
restore
reset
chaos
game day
fixture
```

devem detectar produção e falhar fechado por padrão.

---

# 296. CHAOS SAFETY

Chaos testing nunca deve rodar acidentalmente em produção.

Exigir:

```text id="6ls2sg"
explicit environment
explicit opt-in
bounded blast radius
```

---

# 297. GAME DAY EVIDENCE

Cada game day deve registrar:

```text id="ttz1bq"
candidate SHA
environment
failure injected
expected behavior
observed behavior
recovery time
data integrity result
```

---

# 298. GAME DAY MATRIX

Cobrir no mínimo:

```text id="ng5x76"
API failure
Worker failure
PostgreSQL temporary failure
Redis failure
storage failure
provider failure
```

---

# 299. RECOVERY TIME OBSERVATION

Game days devem alimentar RTO observado quando aplicável.

---

# 300. RECOVERY POINT OBSERVATION

Restore drills devem alimentar RPO observado.

---

# 301. RUNBOOK VALIDATION

Runbook não é PASS apenas porque existe.

Executar seguindo o documento.

Registrar divergências.

---

# 302. RUNBOOK FRESHNESS

Runbooks devem possuir:

```text id="fsz9a5"
owner
last_verified
candidate/environment
```

quando apropriado.

---

# 303. OPERATOR EXPERIENCE

Uma pessoa diferente do autor deve conseguir seguir os principais runbooks.

Se revisão humana não estiver disponível:

```text id="szr02b"
HUMAN_REQUIRED
```

---

# 304. CI FAILURE DIAGNOSTICS

Todo job crítico deve preservar diagnóstico suficiente para root cause.

Uploadar artefatos quando útil:

```text id="b8fdum"
logs
test reports
screenshots
performance reports
```

sem incluir secrets.

---

# 305. FAILURE ARTIFACT RETENTION

Definir retenção razoável para artefatos de falha.

---

# 306. TEST RETRY POLICY

Não usar retry indiscriminado para esconder flakiness.

Quando retry existir:

registrar:

```text id="ux1c0f"
initial failure
retry count
final result
```

Teste que passa apenas no retry deve ser observável como flaky.

---

# 307. FLAKY TEST BUDGET

Manter inventário de flakiness.

Critical P0 tests devem ter:

```text id="dtmh45"
flaky = 0
```

---

# 308. QUARANTINE POLICY

Teste crítico não pode ser simplesmente quarantined indefinidamente.

Quarantine exige:

```text id="l9j03c"
owner
reason
issue
expiry
```

---

# 309. TEST ISOLATION

Testes devem ser independentes.

Evitar:

```text id="v7zd8v"
execution-order dependency
shared mutable database
shared fixed ports
global state leak
```

---

# 310. RANDOMIZED ORDER

Onde viável, executar subset de testes em ordem randomizada para detectar dependência oculta.

---

# 311. PORT ALLOCATION

Test infrastructure deve evitar colisões de portas.

Preferir portas dinâmicas quando arquitetura permitir.

---

# 312. PROCESS CLEANUP

Após testes:

```text id="x4a0ha"
no orphan API
no orphan worker
no orphan Redis
no orphan PostgreSQL
no orphan browser
```

---

# 313. WINDOWS PROCESS SAFETY

Preservar os hardenings existentes.

Nunca matar processo apenas por PID sem validar ownership/context.

---

# 314. LINUX PROCESS SAFETY

Aplicar princípio equivalente.

---

# 315. TEMP FILE CLEANUP

Testes não devem deixar arquivos temporários no worktree.

---

# 316. WORKTREE CLEANLINESS

Após:

```text id="6e5qvy"
typecheck
lint
test
build
```

worktree deve permanecer limpo, salvo artefatos explicitamente ignorados.

Criar guard.

---

# 317. GENERATED FILE GOVERNANCE

Arquivos gerados devem ser classificados:

```text id="7m39ck"
tracked canonical
ignored runtime
CI artifact
release artifact
```

---

# 318. BUILD ARTIFACT VALIDATION

Validar conteúdo do build.

Evitar incluir:

```text id="goywyf"
source secrets
test fixtures sensíveis
dev-only config
unexpected source maps
```

---

# 319. SOURCE MAP POLICY

Definir se source maps são:

```text id="3qgf84"
public
private
disabled
```

em produção.

---

# 320. LICENSE INVENTORY

Gerar inventário de licenças das dependências.

Bloquear apenas conforme política formal.

---

# 321. DEPENDENCY ALLOW/DENY POLICY

Se necessário, definir dependências proibidas ou que exigem review.

---

# 322. DEPENDENCY CONFUSION

Validar packages internos/namespaces para reduzir risco de dependency confusion.

---

# 323. LOCKFILE INTEGRITY

CI deve usar instalação frozen.

Exemplo:

```text id="16yavc"
pnpm install --frozen-lockfile
```

ou equivalente atual.

---

# 324. REPRODUCIBLE CI SETUP

Setup compartilhado deve ser versionado.

Evitar copy/paste divergente entre dezenas de workflows.

---

# 325. COMPOSITE ACTIONS

Se houver repetição significativa, consolidar em composite actions internas.

Não abstrair apenas por estética.

---

# 326. CI CONCURRENCY

Usar concurrency groups apropriadamente.

Cancelar execução obsoleta quando seguro.

Nunca cancelar evidence final necessária sem registrar estado.

---

# 327. CI CANDIDATE SEMANTICS

Definir claramente:

```text id="2e0m2q"
PR validation
main validation
release candidate validation
release publication
```

Não misturar semânticas.

---

# 328. RELEASE WORKFLOW

Fluxo alvo:

```text id="wm9wck"
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
INTEGRATION
↓
POSTGRES/RLS
↓
CLINICAL CRITICAL
↓
E2E
↓
VISUAL/A11Y
↓
PERFORMANCE REGRESSION
↓
PREPUBLICATION GATE
↓
BUILD/PUBLISH IMMUTABLE IMAGES
↓
SCAN
↓
ATTEST
↓
VERIFY
↓
PERFORMANCE CERTIFICATION
↓
RECOVERY EVIDENCE
↓
UAT / AUTHORITY
↓
FINAL RELEASE GATE
```

Adapte às limitações reais de execução.

---

# 329. NO PREMATURE PUBLICATION

Nenhuma imagem/artefato final consumível deve ser promovido antes do gate apropriado.

Quarantine artifacts podem existir se claramente marcados como não liberados.

---

# 330. QUARANTINE IDENTITY

Artefato pré-release deve possuir identidade inequívoca.

Nunca usar tag final antes de aprovação.

---

# 331. RELEASE PROMOTION

Preferir promoção por digest em vez de rebuild quando arquitetura/tooling permitir.

Isso reduz:

```text id="wzpv1b"
tested artifact != deployed artifact
```

---

# 332. TEST WHAT YOU DEPLOY

Princípio obrigatório:

# BUILD ONCE — VERIFY — PROMOTE SAME DIGEST

quando tecnicamente viável.

---

# 333. DEPLOY WHAT YOU TESTED

Release manifest deve provar que imagem deployada é a mesma imagem certificada.

---

# 334. FINAL ENVIRONMENT SMOKE

Depois do deploy target:

executar smoke não destrutivo.

Cobrir:

```text id="onm55q"
health
login
patient read
workflow health
database connectivity
worker heartbeat
```

Não criar paciente real sem autorização.

---

# 335. POST-DEPLOY GOLDEN PATH

Se ambiente staging autorizado:

executar golden path com fixtures sintéticas.

Produção real só se existir protocolo aprovado.

---

# 336. RELEASE OBSERVATION WINDOW

Após deploy, observar:

```text id="80w4ap"
errors
latency
worker backlog
DB pool
auth failures
```

antes de declarar release estável.

---

# 337. AUTOMATIC ROLLBACK

Não implementar rollback automático destrutivo sem avaliar migrations/state.

Pode ser seguro para frontend e perigoso para schema.

Decidir por componente.

---

# 338. RELEASE FAILURE CLASSIFICATION

Classificar:

```text id="zobwke"
ROLLBACK_SAFE
ROLLFORWARD_REQUIRED
MANUAL_INTERVENTION
```

---

# 339. MIGRATION ROLLFORWARD

Para migration irreversível, possuir plano rollforward.

---

# 340. RELEASE NOTES

Gerar notas de release técnicas.

Incluir:

```text id="fddr0v"
changes
migrations
known risks
rollback constraints
operator actions
```

---

# 341. CHANGE RISK CLASSIFICATION

Classificar mudanças:

```text id="jvtclx"
LOW
MEDIUM
HIGH
CRITICAL
```

Baseado em superfície afetada.

---

# 342. HIGH-RISK RELEASE GATES

Mudanças em:

```text id="bs5v9j"
auth
RLS
clinical records
medication
billing
migrations
worker semantics
```

devem exigir gates mais fortes.

---

# 343. CHANGE IMPACT GRAPH

Quando viável, mapear:

```text id="k9h4l6"
changed files
→ affected modules
→ required tests
→ stale evidence
```

---

# 344. SELECTIVE TESTING

Pode ser usado para feedback rápido.

Mas final Triple-A gate deve executar todos os gates obrigatórios.

---

# 345. TEST PYRAMID

Preservar equilíbrio:

```text id="tyhn3a"
unit
integration
contract
DB
E2E
failure/recovery
```

Não transformar tudo em E2E.

---

# 346. PROPERTY TESTING

Usar property-based testing em invariantes onde trouxer valor.

Exemplos:

```text id="otb8u5"
financial arithmetic
state transitions
idempotency
```

---

# 347. FUZZING

Aplicar fuzzing seletivamente a parsers/inputs críticos quando útil.

Não fazer fuzzing decorativo.

---

# 348. STATE MACHINE TESTING

Workflow, prescriptions, hospitalization e outros lifecycles devem possuir state-machine tests quando apropriado.

---

# 349. INVALID TRANSITIONS

Toda transição inválida deve falhar deterministicamente.

---

# 350. CONCURRENCY TEST MATRIX

Criar matriz para operações sensíveis:

```text id="4btds7"
workflow claim
medication administration
bed allocation
billing settlement
inventory decrement
diagnostic ingestion
```

---

# 351. FAILURE INJECTION MATRIX

Criar matriz:

```text id="2jq0ec"
before transaction
during transaction
after commit before event delivery
during provider call
during worker execution
```

---

# 352. EXACTLY-ONCE LANGUAGE

Evitar alegar "exactly once" globalmente.

Preferir:

```text id="3hh6ma"
at-least-once delivery
+
idempotent material effect
```

quando isso representar a arquitetura real.

---

# 353. CONSISTENCY MODEL DOCUMENTATION

Documentar consistência entre:

```text id="zt42im"
DB state
events
worker
external integrations
```

---

# 354. EXTERNAL SIDE EFFECT IDEMPOTENCY

Para provider externo, usar idempotency do provider quando disponível.

Quando não disponível, documentar risco e mitigação.

---

# 355. COMPENSATING ACTIONS

Se side effect externo não puder ser transacional:

definir compensação quando necessário.

---

# 356. HUMAN OVERRIDE

Falhas que exigem intervenção humana devem aparecer claramente no sistema.

Não esconder em logs.

---

# 357. OPERATIONS DASHBOARD

Criar/validar dashboard para:

```text id="4y1a10"
system health
worker
workflow
DLQ
DB
backup
integrations
```

---

# 358. CLINICAL OPERATIONS DASHBOARD

Separado do dashboard técnico, quando apropriado:

```text id="q8f67g"
active inpatients
pending diagnostics
overdue tasks
handover pending
```

---

# 359. SECURITY DASHBOARD

Se tooling permitir:

```text id="cdtz49"
failed logins
rate limit
revoked keys
suspicious access
```

sem PII desnecessária.

---

# 360. FINAL ADVERSARIAL AUDIT

Depois de todos os fechamentos, executar auditoria nova do zero.

Não usar conclusões antigas.

Procurar:

```text id="m1jz80"
stale evidence
self-reported PASS
mock promoted to proof
skipped critical tests
threshold relaxation
hidden warnings
cross-tenant bypass
race conditions
restore gaps
supply-chain mismatch
```

---

# 361. RED TEAM MINDSET

Auditoria final deve tentar provar que o sistema NÃO merece Triple-A.

Só se não encontrar blocker relevante, avançar.

---

# 362. CLAIM AUDIT

Pesquisar no repositório por:

```text id="y9hjtp"
TRIPLE-A VERIFIED
State of Art
PASS
production ready
certified
```

Garantir que nenhum claim ultrapasse evidência.

---

# 363. DOCUMENT
