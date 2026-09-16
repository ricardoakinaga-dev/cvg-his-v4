# 188. CONTAINER RESOURCE GOVERNANCE

Definir recursos quando apropriado:

```text id="u93b5i"
CPU requests/limits
memory requests/limits
graceful shutdown
termination grace period
```

Não definir valores arbitrários.

Derivar de:

* benchmark;
* soak;
* carga representativa;
* observação operacional.

---

# 189. GRACEFUL SHUTDOWN — API

Ao receber:

```text id="8unf33"
SIGTERM
SIGINT
```

API deve:

```text id="8zn95m"
stop accepting new work
↓
drain active requests
↓
close DB connections
↓
flush telemetry when safe
↓
exit bounded
```

Testar.

---

# 190. GRACEFUL SHUTDOWN — WORKER

Worker deve:

```text id="f50r8a"
stop claiming new jobs
↓
finish or safely relinquish current work
↓
release/expire leases correctly
↓
flush telemetry
↓
exit
```

Nunca deixar tarefa em estado impossível.

---

# 191. SHUTDOWN DEADLINE

Shutdown deve possuir deadline.

Depois do deadline:

```text id="43mt3q"
forced termination
```

mas o sistema deve conseguir recuperar trabalho durável posteriormente.

---

# 192. HELM HARDENING

Revisar superfície Helm canônica.

Validar:

```text id="3sgh4v"
securityContext
runAsNonRoot
readOnlyRootFilesystem
resources
liveness
readiness
startupProbe
PDB
NetworkPolicy
ConfigMap
Secrets
rolling update
```

Não duplicar Helm rail.

---

# 193. COMPOSE HARDENING

Compose continua válido para single-node/staging se for a estratégia do projeto.

Revisar:

```text id="7f3xk8"
networks
published ports
health checks
restart policy
volumes
secrets
runtime users
resource governance
```

Não expor PostgreSQL/Redis externamente sem necessidade.

---

# 194. NETWORK SEGMENTATION

Separar quando apropriado:

```text id="ojq0kx"
frontend-facing
application
database
observability
```

Aplicar princípio de menor exposição.

---

# 195. DATABASE NETWORK POLICY

Somente componentes autorizados devem conseguir conectar ao PostgreSQL.

API e worker devem usar identidades próprias.

---

# 196. REDIS NETWORK POLICY

Redis não deve ser publicamente acessível.

Testar configuração de produção.

---

# 197. OBSERVABILITY EXPOSURE

Prometheus/Grafana/OTel devem possuir política explícita de exposição.

Não presumir que endpoints internos são seguros apenas porque "normalmente ficam internos".

---

# 198. TLS

Documentar onde TLS termina:

```text id="0pivts"
edge
reverse proxy
service
database
external provider
```

Não criar dupla complexidade desnecessária.

Mas garantir criptografia nas fronteiras necessárias.

---

# 199. DATABASE TLS

Se o target exigir conexão remota:

validar TLS e certificate policy.

Ambiente local pode ter política distinta explicitamente documentada.

---

# 200. SECRETS DELIVERY

Evitar secrets em:

```text id="i5v4rh"
Git
Docker image
logs
command-line arguments
public artifacts
```

Usar mecanismo de secrets apropriado ao ambiente.

---

# 201. CI SECRET SAFETY

Testar que PR não confiável não consegue acessar secrets de release.

Revisar:

```text id="5f8gr7"
pull_request
pull_request_target
workflow_run
environment secrets
permissions
```

---

# 202. GITHUB ACTION PERMISSIONS

Cada workflow deve usar:

```text id="4kj1ts"
permissions:
```

mínimas.

Evitar:

```text id="ykgn1n"
write-all
```

salvo necessidade excepcional documentada.

---

# 203. ACTION PINNING

Actions críticas devem estar pinadas por SHA imutável.

Manter ferramenta automatizada para atualização.

---

# 204. BUILD REPRODUCIBILITY

Registrar:

```text id="kw85ka"
Node version
pnpm version
lockfile hash
OS/base image
build arguments
source SHA
```

Objetivo:

reproduzir artefato com alto grau de determinismo.

---

# 205. SBOM

Gerar SBOM para release.

Preferir:

```text id="l85n7x"
CycloneDX
SPDX
```

de acordo com tooling existente.

Registrar digest no release manifest.

---

# 206. SOURCE ARCHIVE

Gerar source archive do candidato.

Registrar SHA-256.

Release manifest deve vincular:

```text id="nyqq8c"
source archive digest
behavior SHA
```

---

# 207. PROVENANCE

Gerar provenance verificável para artefatos de release.

Não confundir:

```text id="q55lv6"
provenance generated
```

com:

```text id="n57vyc"
provenance independently verified
```

---

# 208. RELEASE ARTIFACT IMMUTABILITY

Artefato publicado não deve ser sobrescrito silenciosamente.

Preferir:

```text id="abpm7n"
immutable version
immutable digest
```

---

# 209. RELEASE CANDIDATE FREEZE

Quando chegar à fase final:

congelar candidate SHA.

Depois do freeze:

qualquer mudança de comportamento:

```text id="ff1rpg"
invalidates certification evidence
```

e cria novo candidato.

---

# 210. DOCS-ONLY AFTER FREEZE

Mudanças exclusivamente documentais podem ser permitidas se o evidence graph provar que:

```text id="vpbld5"
behavior unchanged
```

Mas devem gerar:

```text id="21ewv6"
documentation SHA
```

separado.

---

# 211. RELEASE MANIFEST IMMUTABILITY

Gerar manifesto final com digest próprio.

Exemplo conceitual:

```json id="g0bqrp"
{
  "project": "CVG-HIS-V4",
  "behavior_sha": "...",
  "release_sha": "...",
  "source_digest": "...",
  "images": {},
  "sbom": {},
  "migrations": {},
  "evidence": {},
  "generated_at": ""
}
```

Adapte ao schema real.

---

# 212. RELEASE EVIDENCE FRESHNESS

Definir dependências de freshness.

Exemplo:

```text id="jvqyn5"
DB code changed
→ RLS evidence stale
→ DB integration stale
→ Golden Path stale
→ Performance potentially stale
```

---

# 213. EVIDENCE TTL

Não use TTL arbitrário para tudo.

Freshness deve ser prioritariamente baseada em:

```text id="h0px8s"
code dependency
config dependency
environment dependency
```

Tempo pode ser usado adicionalmente para provas operacionais.

---

# 214. TARGET IDENTITY

Toda prova de target deve registrar:

```text id="mm2umv"
environment ID
infrastructure version
database version
Redis version
image digests
configuration fingerprint
```

Sem secrets.

---

# 215. ENVIRONMENT FINGERPRINT

Gerar fingerprint seguro do ambiente.

Não incluir credenciais.

Pode incluir:

```text id="pkdvfu"
PostgreSQL major
Redis major
OS/container platform
CPU class
memory
deployment topology
```

---

# 216. PERFORMANCE CERTIFICATION ENVIRONMENT

Performance certification deve registrar hardware.

Sem isso, números não são comparáveis.

---

# 217. LOAD PROFILE VERSIONING

Versionar workload:

```text id="evwv4s"
hospital-load-v1
hospital-load-v2
```

Mudança de workload não pode ser comparada diretamente sem contexto.

---

# 218. HOSPITAL LOAD PROFILE

Construir perfil representativo.

Exemplo conceitual:

```text id="kvd8ec"
Reception:
  patient search
  appointment
  arrival

Clinical:
  patient 360
  encounter
  records

Inpatient:
  workflow
  medication
  diagnostics

Financial:
  billing
  inventory

Background:
  worker
  notifications
```

Não criar carga absurda sem relação com operação real.

---

# 219. CAPACITY HEADROOM

Certificação deve responder:

> Qual carga o sistema suporta mantendo SLO com margem?

Não apenas:

> Passou com 60 VUs?

Produzir capacity curve quando possível.

---

# 220. BREAKING POINT TEST

Em ambiente descartável/controlado, opcionalmente aumentar carga até encontrar saturação.

Objetivo:

identificar:

```text id="yiln6n"
CPU bottleneck
DB pool bottleneck
query bottleneck
Redis bottleneck
worker bottleneck
```

Não executar em produção.

---

# 221. RECOVERY UNDER LOAD

Testar falha durante carga.

Exemplo:

```text id="3wx3qn"
steady workload
↓
worker crash
↓
recover
```

ou:

```text id="1k9d11"
steady workload
↓
Redis restart
↓
recover
```

---

# 222. DEPLOY UNDER LOAD

Em staging:

executar rolling deployment com carga representativa.

Medir:

```text id="oyasv7"
error spikes
latency
connection resets
worker duplication
```

---

# 223. ZERO-DOWNTIME CLAIM

Não declarar zero downtime sem prova.

Se o sistema possui pequena janela planejada:

documentar honestamente.

---

# 224. BACKUP UNDER LOAD

Testar se backup impacta significativamente SLO.

Se impactar:

documentar janela ou estratégia.

---

# 225. RESTORE VALIDATION DATASET

Dataset de restore deve conter:

```text id="em5evm"
patients
owners
encounters
clinical records
inpatient
prescriptions
medications
diagnostics
workflow
billing
inventory
audit
attachments
```

com dados sintéticos.

Nunca usar dados reais sensíveis desnecessariamente.

---

# 226. SYNTHETIC DATA POLICY

Fixtures de CI/staging devem usar dados sintéticos.

Evitar copiar banco de produção sem processo de anonimização aprovado.

---

# 227. BACKUP ENCRYPTION

Se backups contiverem dados sensíveis, política de criptografia deve ser explícita.

---

# 228. BACKUP ACCESS CONTROL

Documentar quem pode:

```text id="g1vm2i"
create
read
restore
delete
```

backups.

---

# 229. RESTORE AUTHORITY

Restore em ambiente real é ação privilegiada.

Automação pode preparar/validar.

Execução destrutiva real exige autoridade apropriada.

---

# 230. DISASTER RECOVERY RUNBOOK

Criar/atualizar:

`docs/operations/DISASTER_RECOVERY.md`

Deve permitir que outra pessoa execute recuperação sem conhecimento tribal.

---

# 231. INCIDENT RUNBOOKS

Criar runbooks mínimos para:

```text id="ukvvhj"
database down
Redis down
worker backlog
high DLQ
storage failure
provider outage
bad deployment
security incident
```

---

# 232. INCIDENT SEVERITY

Definir níveis simples:

```text id="jj5l9r"
SEV1
SEV2
SEV3
```

com critérios objetivos.

Não criar burocracia excessiva.

---

# 233. SECURITY INCIDENT

Runbook deve cobrir:

```text id="hxbgtb"
credential compromise
cross-tenant suspicion
malicious upload
API key leak
suspicious admin activity
```

---

# 234. AUDIT SEARCHABILITY

Audit trail deve permitir investigação por:

```text id="7z6coh"
actor
patient
encounter
event
time range
correlationId
```

respeitando autorização.

---

# 235. AUDIT TAMPER EVIDENCE

Avaliar mecanismos para detectar adulteração.

Não inventar blockchain.

Use controles proporcionais:

```text id="evy17s"
append-only policy
restricted role
integrity checks
immutable external archive where justified
```

---

# 236. CLOCK CONSISTENCY

Componentes distribuídos dependem de tempo.

Documentar expectativa de sincronização de relógio.

Não usar timestamp isolado como mecanismo de segurança se puder ser evitado.

---

# 237. MONOTONIC TIME

Para deadlines internos, usar monotonic clock quando apropriado.

Persistência continua usando timestamps absolutos.

---

# 238. CORRELATION GOVERNANCE

Correlation IDs devem ser:

```text id="aprfzm"
generated safely
propagated
validated
bounded in length
```

Não confiar cegamente em header arbitrário do cliente.

---

# 239. REQUEST ID

Separar se necessário:

```text id="sfvyz5"
requestId
correlationId
causationId
```

Documentar semântica.

---

# 240. ERROR TAXONOMY

Padronizar erros.

Categorias possíveis:

```text id="qig6mx"
VALIDATION
AUTHENTICATION
AUTHORIZATION
NOT_FOUND
CONFLICT
RATE_LIMIT
DEPENDENCY
INTERNAL
```

Não vazar stack traces ao cliente.

---

# 241. EXTERNAL ERROR MAPPING

Erro de provider não deve vazar detalhes internos.

Mapear para erro de domínio/integração adequado.

---

# 242. RETRYABLE ERROR CONTRACT

Worker precisa distinguir:

```text id="uj7pe8"
retryable
permanent
```

de forma explícita.

---

# 243. POISON MESSAGE

Mensagem que sempre falha deve terminar em DLQ.

Nunca criar retry storm infinito.

---

# 244. RETRY STORM GAME DAY

Simular provider falhando em massa.

Verificar:

```text id="gtfy0i"
backoff
jitter
queue growth
DB load
alert
DLQ
```

---

# 245. THUNDERING HERD

Testar recovery de muitos jobs simultâneos após dependência voltar.

Aplicar jitter/bounded concurrency quando necessário.

---

# 246. WORKER CONCURRENCY LIMIT

Definir limite configurável.

Não permitir worker saturar PostgreSQL.

---

# 247. PER-TENANT FAIRNESS

Se um tenant gerar volume anormal, avaliar risco de monopolizar worker.

Não implementar complexidade prematura, mas documentar e testar se arquitetura já suporta múltiplos tenants.

---

# 248. TENANT CONTEXT IN EVENTS

Todo evento tenant-bound deve transportar tenant/account context de forma segura.

Consumer não deve inferir tenant de payload não confiável.

---

# 249. TENANT CONTEXT IN JOBS

Todo job tenant-bound deve possuir tenant explícito e validado.

---

# 250. TENANT CONTEXT RESET

Em workers/pools, garantir que contexto de tenant não vaze entre jobs.

Criar teste:

```text id="y7hjjp"
job tenant A
↓
same worker
↓
job tenant B
```

sem leakage.

---

# 251. RLS CONNECTION POOL SAFETY

Se RLS depende de session variables:

testar reset correto ao devolver conexão ao pool.

Esse é P0.

---

# 252. TRANSACTION-LOCAL TENANT CONTEXT

Preferir tenant context limitado à transação quando arquitetura permitir.

Evitar session state persistente escapar para request seguinte.

---

# 253. RLS POOL LEAK TEST

Teste explícito:

```text id="ug3jys"
connection used tenant A
↓
returned
↓
reused tenant B
↓
cannot see tenant A
```

---

# 254. AUTHORIZATION MATRIX

Criar matriz:

```text id="9jxx0r"
role
capability
resource
action
```

para superfícies críticas.

---

# 255. AUTHORIZATION NEGATIVE TESTS

Para cada rota P0:

```text id="gdkv0c"
unauthenticated
wrong role
wrong capability
wrong tenant
correct capability
```

---

# 256. ADMIN OVERRIDE

Ações administrativas excepcionais devem exigir:

```text id="xggys3"
capability
actor
reason
audit
```

quando aplicável.

---

# 257. BREAK-GLASS

Se houver necessidade clínica real de break-glass:

não inventar automaticamente.

Somente implementar se requisito formal existir.

Se existir:

```text id="rgpc79"
strong audit
reason
short-lived access
alert
review
```

---

# 258. SESSION REVOCATION

Testar:

```text id="9pp4ux"
logout
password/security change
role revocation
user disable
```

e efeito sobre sessões existentes conforme política.

---

# 259. PERMISSION REVOCATION

Permissão removida deve surtir efeito no tempo definido pela arquitetura.

Testar cache/stale authorization.

---

# 260. API KEY REVOCATION

API key revogada não pode permanecer funcional por cache indevido.

---

# 261. WORKER AUTHORIZATION

Replay/admin worker actions devem ter identidade e autorização explícitas.

---

# 262. DATABASE MIGRATION ROLE

Migration role não deve ser reutilizada pela API.

Criar guard de configuração.

---

# 263. DATABASE OWNER SAFETY

Evitar que runtime role seja owner de tabelas protegidas se isso permitir bypass indevido.

---

# 264. DATABASE CONSTRAINT REVIEW

Revisar invariantes importantes que hoje vivem somente no TypeScript.

Promover para DB quando apropriado.

---

# 265. TRANSACTION BOUNDARY REVIEW

Operações que modificam múltiplos aggregates/tabelas críticas devem ter boundary explícita.

Testar rollback parcial.

---

# 266. OUTBOX TRANSACTIONALITY

Se outbox representa evento de mudança persistida:

evento e mudança de estado devem participar de atomicidade apropriada.

Testar:

```text id="zhw5l6"
state commit succeeds
event insert fails
```

e inverso.

Não permitir silent lost event.

---

# 267. OUTBOX DELIVERY IDEMPOTENCY

Consumer deve tolerar redelivery.

---

# 268. OUTBOX RETENTION

Definir política para eventos já processados.

Não crescer indefinidamente.

Preservar audit quando necessário em camada apropriada.

---

# 269. DEAD LETTER RETENTION

Definir retenção e acesso para DLQ.

---

# 270. DATA GROWTH TEST

Simular crescimento representativo.

Avaliar:

```text id="ox2t6f"
audit
events
timeline
notifications
workflow history
```

---

# 271. ARCHIVAL POLICY

Se crescimento exigir archival:

documentar antes de implementar complexidade.

---

# 272. INDEX BLOAT / DB MA
