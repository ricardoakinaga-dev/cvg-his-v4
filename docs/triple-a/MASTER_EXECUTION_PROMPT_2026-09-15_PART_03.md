# 112. P0 DEPENDENCY GRAPH

Não trate os P0 como lista plana.

Criar dependências explícitas.

Exemplo:

```text
P0-CI-01 Candidate Freeze
        ↓
P0-CI-02 Green Main
        ↓
P0-DATA-01 PostgreSQL Runtime
        ├───────────────┐
        ↓               ↓
P0-DATA-02 RLS     P0-WORKFLOW-01
                        ↓
                  P0-WORKFLOW-02
                        ↓
                  P0-WORKER-01
                        │
        ┌───────────────┘
        ↓
P0-CLINICAL-01 Golden Path
        ↓
P0-RECOVERY-01 Restore
        ↓
P0-RECOVERY-02 Deploy/Rollback
        ↓
P0-GOV-01 Final Evidence
```

O scheduler de execução deve respeitar dependências.

---

# 113. P0 DEDUPLICATION

Auditar os P0 existentes.

Detectar itens duplicados semanticamente.

Exemplo:

```text
"prove RLS"
"test tenant isolation"
"runtime tenant security"
```

podem pertencer ao mesmo epic, mas manter acceptance criteria distintos.

Não inflar artificialmente:

```text
open_p0
```

e também não colapsar riscos diferentes em um único item genérico.

---

# 114. P0 MACHINE-READABLE REGISTRY

Criar um registry canônico.

Exemplo:

`docs/triple-a/P0_REGISTRY.json`

Cada item:

```json
{
  "id": "P0-WORKFLOW-LEASE-FENCING",
  "title": "",
  "status": "NOT_PROVEN",
  "owner": "",
  "behavior_sha": "",
  "dependencies": [],
  "acceptance_criteria": [],
  "evidence_nodes": [],
  "human_required": false,
  "target_required": true
}
```

---

# 115. AUTOMATIC P0 CLOSURE

Um P0 só pode ser fechado automaticamente quando:

```text
all acceptance criteria == PASS
AND
all mandatory evidence == fresh
AND
candidate identity matches
```

Não permitir:

```text
manual status = DONE
```

sem evidência quando o item for automatizável.

---

# 116. HUMAN-ONLY P0

Itens que dependem de decisão humana devem usar:

```text
HUMAN_REQUIRED
```

Exemplos:

```text
UAT approval
release authority
risk acceptance
clinical approval
```

Codex deve preparar tudo necessário, mas nunca fabricar o aceite.

---

# 117. TARGET-ONLY P0

Itens que exigem ambiente apropriado devem usar:

```text
TARGET_REQUIRED
```

Exemplos:

```text
24h soak
72h soak
real alert delivery
registry attestation
production-like restore
controlled performance certification
```

---

# 118. AUTOMATION-ELIGIBLE P0

Codex deve fechar autonomamente todos os P0 que puderem ser comprovados com segurança no ambiente disponível.

Exemplos:

```text
static validation
unit
integration
PostgreSQL disposable
RLS disposable
workflow concurrency
worker crash recovery
clinical E2E
OpenAPI parity
event compatibility
documentation consistency
```

Não pedir aprovação humana para cada pequena etapa.

---

# 119. CLINICAL TIMELINE

Auditar a timeline clínica operacional.

Ela deve funcionar como projeção derivada, não como nova source of truth.

Eventos possíveis:

```text
patient.arrived
triage.completed
encounter.started
inpatient.admitted
prescription.created
medication.administered
diagnostic.ordered
diagnostic.resulted
workflow.created
handover.acknowledged
patient.discharged
```

---

# 120. TIMELINE IDEMPOTENCY

Provar que replay de evento não cria entradas duplicadas.

Testar:

```text
same eventId twice
out-of-order event
rebuild
partial rebuild
consumer restart
```

---

# 121. TIMELINE REBUILD

Se a timeline for rebuildable:

```text
clear disposable projection
↓
replay canonical events
↓
rebuild
↓
compare expected state
```

O resultado deve ser determinístico.

---

# 122. TASK / REMINDER ASSURANCE

Testar:

```text
task scheduled
task due
reminder generated
acknowledgement
completion
overdue
escalation
```

Garantir timezone correto.

---

# 123. TIMEZONE POLICY

Formalizar timezone.

Para regras operacionais do hospital:

```text
America/Sao_Paulo
```

quando apropriado.

Persistência deve preferir timestamps absolutos/UTC e conversão explícita.

Nunca depender do timezone implícito do host.

---

# 124. CLOCK ABSTRACTION

Para regras dependentes de tempo, usar clock injetável quando apropriado.

Evitar:

```ts
new Date()
```

espalhado por regras críticas quando isso prejudicar determinismo.

Testar:

```text
DST/offset changes
midnight
month boundary
year boundary
lease expiry
due reminders
```

---

# 125. IDEMPOTENCY MATRIX

Atualizar:

`docs/architecture/IDEMPOTENCY_MATRIX.md`

Cobrir:

```text
medication execution
workflow
payment
PIX
webhook
diagnostic ingestion
notifications
scheduled jobs
event consumers
imports
```

---

# 126. IDEMPOTENCY SCOPE

Para cada operação definir:

```text
key source
tenant scope
resource scope
fingerprint
TTL
duplicate response
conflict behavior
```

---

# 127. IDEMPOTENCY AUTHORIZATION

Garantir que idempotency key não permita:

```text
user A
→ replay authorized operation created by user B
```

sem autorização adequada.

Binding deve considerar actor/tenant quando necessário.

---

# 128. PRESCRIPTION SAFETY

Testar:

```text
create
revise
cancel
duplicate
unauthorized
wrong patient
wrong tenant
```

Alterações devem preservar histórico.

---

# 129. MEDICATION EXECUTION SAFETY

Este é um fluxo P0.

Testar:

```text
scheduled dose
execution
duplicate execution
late execution
cancelled prescription
wrong patient
wrong encounter
concurrent execution
retry
```

Garantir:

# NO DUPLICATE MATERIAL EFFECT

---

# 130. MEDICATION AUDIT

Toda administração deve possuir:

```text
patient
encounter
prescription
dose
route
scheduledAt
administeredAt
actor
status
correlation
```

conforme modelo clínico existente.

Não introduzir campos redundantes se já houver contratos equivalentes.

---

# 131. DIAGNOSTIC ORDER SAFETY

Testar:

```text
order
collection
processing
result
revision
cancel
duplicate provider callback
```

---

# 132. DIAGNOSTIC RESULT IMMUTABILITY

Resultado original não deve ser silenciosamente sobrescrito.

Quando revisão for permitida:

```text
original
revision
reason
actor
timestamp
```

---

# 133. EXTERNAL DIAGNOSTIC INGESTION

Provar idempotência de callbacks/imports.

Mesmo resultado recebido duas vezes:

```text
1 material result
```

e histórico apropriado.

---

# 134. INPATIENT SAFETY

Testar:

```text
admission
bed allocation
bed transfer
concurrent bed allocation
discharge
readmission
```

Nenhum leito deve ficar simultaneamente alocado de maneira inválida.

---

# 135. BED CONCURRENCY

Dois usuários tentando ocupar o mesmo leito:

```text
1 success
1 deterministic conflict
```

Preferir constraint/transação no banco quando apropriado.

---

# 136. DISCHARGE SAFETY

Testar pré-condições de alta.

Não permitir corrupção de estado entre:

```text
active hospitalization
pending medication
pending task
discharge
```

Política clínica deve ser explícita.

Não inventar regras clínicas novas; derive das regras existentes.

---

# 137. SURGERY SAFETY

Cobrir:

```text
scheduled
pre-op
started
completed
cancelled
post-op
```

e permissões associadas.

---

# 138. PATIENT IDENTITY

Provar que operações clínicas sempre resolvem o paciente correto.

Testar:

```text
same-name patients
merged owner records
known foreign tenant patient UUID
inactive patient
```

---

# 139. OWNER/PATIENT RELATIONSHIP

Testar:

```text
owner reassignment
multiple owners when supported
historical relationship
tenant boundary
```

Não apagar histórico necessário.

---

# 140. SEARCH SAFETY

Busca global não pode vazar dados cross-tenant.

Testar:

```text
patient name
owner
phone
document
encounter
```

com tenants diferentes.

---

# 141. REPORT SECURITY

Relatórios devem respeitar:

```text
tenant
role
permissions
filters
data minimization
```

Export não pode virar bypass de autorização.

---

# 142. EXPORT SECURITY

Para CSV/PDF/outros exports:

testar:

```text
formula injection where applicable
cross-tenant export
unauthorized fields
large export
timeout
```

---

# 143. FINANCIAL INVARIANTS

Definir invariantes como:

```text
payment cannot settle twice
refund cannot exceed allowed amount
invoice cannot silently disappear
cash movement must remain auditable
```

Transformar invariantes críticas em testes.

---

# 144. INVENTORY INVARIANTS

Testar:

```text
negative stock policy
concurrent decrement
lot tracking
expiry
duplicate movement
billing linkage
```

Não inventar regra comercial; preservar regras atuais.

---

# 145. INVENTORY CONCURRENCY

Dois consumos concorrentes do mesmo saldo devem preservar consistência.

Usar:

```text
transaction
constraint
locking
optimistic concurrency
```

conforme apropriado.

---

# 146. PARITY GAPS

A auditoria histórica identificou gaps de paridade.

Reavaliar do zero o estado atual.

Não herdar:

```text
4/11
```

automaticamente.

Criar matriz atual para:

```text
clinical
laboratory
fiscal
financial
marketing
reports
access/LGPD
integrations
migration
inventory
operations
```

Use apenas requisitos reais/documentados.

---

# 147. PARITY ≠ TRIPLE-A

Não exigir feature parity com outro produto apenas para obter Triple-A.

Separar:

```text
PRODUCT PARITY
```

de:

```text
ENGINEERING QUALITY
```

Uma feature ausente pode ser roadmap e não defeito de qualidade, salvo se for requisito formal do CVG-HIS.

---

# 148. FEATURE COMPLETENESS CLASSIFICATION

Cada gap funcional deve ser classificado:

```text
REQUIRED_FOR_CURRENT_RELEASE
PLANNED
OPTIONAL
OUT_OF_SCOPE
```

Somente o primeiro bloqueia release por completude funcional.

---

# 149. LGPD

Revisar:

```text
data minimization
purpose
access
retention
export
anonymization
audit
```

Não declarar conformidade jurídica completa automaticamente.

Use:

```text
TECHNICAL_CONTROLS_VERIFIED
```

quando aplicável.

Revisão jurídica/DPO continua humana.

---

# 150. DATA RETENTION

Criar política explícita para:

```text
clinical records
audit logs
security logs
attachments
notifications
temporary artifacts
```

Não implementar deleção clínica destrutiva sem regra aprovada.

---

# 151. SECRET ROTATION

Preparar e testar runbooks para:

```text
DB credentials
API keys
webhook keys
MFA encryption keyrings
OIDC secrets
AUTH secrets
```

Quando rotação real exigir target:

```text
TARGET_REQUIRED
```

---

# 152. API KEY GOVERNANCE

Garantir:

```text
scope
tenant binding
expiry
revocation
hashing
audit
last-used metadata
```

quando aplicável.

---

# 153. MFA ASSURANCE

Testar:

```text
enrollment
verification
recovery
revocation
replay
wrong tenant
```

Não logar MFA secrets.

---

# 154. OIDC ASSURANCE

A remediação anterior já fortaleceu OIDC.

Agora testar:

```text
issuer
audience
nonce/state
token expiry
userinfo timeout
invalid signature
provider unavailable
```

de acordo com a implementação real.

---

# 155. WEBAUTHN ASSURANCE

Cobrir:

```text
registration
authentication
challenge expiry
replay
wrong origin
wrong RP ID
credential revocation
```

quando suportado.

---

# 156. RATE LIMITING

Revisar:

```text
login
MFA
password recovery
webhooks
expensive searches
exports
```

Garantir que rate limiting não dependa de identificadores facilmente manipuláveis.

---

# 157. BRUTE FORCE LOGGING

Registrar segurança suficiente para detecção sem armazenar PII desnecessária.

Preferir pseudonimização quando possível.

---

# 158. SECURITY HEADERS

Validar:

```text
CSP
HSTS
X-Content-Type-Options
Referrer-Policy
frame protections
```

de acordo com arquitetura e reverse proxy.

---

# 159. CORS

Configuração deve ser allowlist explícita em produção.

Não permitir wildcard inseguro com credentials.

---

# 160. CSRF

Avaliar superfícies baseadas em cookies/sessions.

Se aplicável, testar proteção CSRF.

Não implementar mecanismo desnecessário se arquitetura não exigir.

---

# 161. SSRF

Todas as URLs controláveis externamente devem passar por política SSRF quando aplicável.

Testar:

```text
localhost
private networks
link-local
redirect
DNS rebinding assumptions
```

---

# 162. FILE STORAGE

Validar isolamento físico/lógico de attachments.

Path não deve ser derivado diretamente de input não confiável.

---

# 163. MALWARE SCANNER

Se política de produção exige scanner:

```text
scanner unavailable
→ fail predictably
```

Não aceitar upload silenciosamente se policy exige bloqueio.

---

# 164. FRONTEND AUTHORIZATION

Frontend pode ocultar ações por UX, mas backend continua autoridade.

Criar testes para garantir que esconder botão não é o único controle.

---

# 165. FRONTEND ERROR STATES

Critical flows devem possuir estados claros:

```text
loading
empty
error
permission denied
offline/degraded
retrying
```

---

# 166. FRONTEND NETWORK FAILURE

Simular:

```text
timeout
500
401
403
409
429
network offline
```

em fluxos críticos.

---

# 167. OPTIMISTIC UI SAFETY

Não usar optimistic update em ação clínica/financeira se isso puder mostrar sucesso antes da confirmação material.

Avaliar caso a caso.

---

# 168. FORM VALIDATION

Garantir equivalência razoável entre:

```text
frontend validation
API validation
domain validation
DB constraints
```

Backend continua autoritativo.

---

# 169. ACCESSIBILITY CRITICAL PATH

Os fluxos:

```text
login
patient search
encounter
prescription
medication
diagnostics
workflow
discharge
```

devem ser navegáveis por teclado quando aplicável.

---

# 170. RESPONSIVE MATRIX

Testar breakpoints representativos.

Não buscar dezenas de dispositivos.

Cobrir:

```text
desktop workstation
tablet
mobile
```

---

# 171. UX PERFORMANCE

Medir:

```text
initial load
route transition
large table rendering
search latency
patient 360 rendering
```

Separar backend latency de frontend rendering.

---

# 172. LARGE DATASET UX

Testar:

```text
many patients
long clinical timeline
large audit log
many workflow tasks
large inventory
```

Evitar UI degradar drasticamente com dados realistas.

---

# 173. PAGINATION CONTRACT

Todas as listas potencialmente grandes devem possuir paginação/limite apropriado.

Evitar global scans.

---

# 174. N+1 DETECTION

Auditar endpoints críticos para N+1.

Adicionar teste/diagnóstico quando útil.

---

# 175. QUERY BUDGET

Para endpoints P0, considerar orçamento de queries por request.

Não criar regra artificial universal.

Use onde houver valor.

---

# 176. API PAYLOAD SIZE

Medir payloads críticos.

Evitar Patient 360 gigantesco sem necessidade.

Usar projeções específicas.

---

# 177. CACHE POLICY

Documentar o que pode ser cacheado.

Nunca cachear dados cross-tenant sem chave de isolamento correta.

---

# 178. CACHE INVALIDATION

Testar invalidação em:

```text
patient update
workflow update
diagnostic result
billing state
inventory
```

quando cache existir.

---

# 179. READINESS

Readiness deve representar capacidade real de atender tráfego.

Não marcar ready quando dependência obrigatória crítica está indisponível.

---

# 180. LIVENESS

Liveness não deve reiniciar processo saudável apenas porque uma dependência externa temporária falhou.

Separar:

```text
alive
ready
degraded
```

---

# 181. DEGRADATION MODEL

Definir estados:

```text
HEALTHY
DEGRADED
UNAVAILABLE
```

por componente.

Exemplo:

WhatsApp down não necessariamente derruba prontuário.

PostgreSQL down provavelmente torna API clínica indisponível.

---

# 182. FEATURE FLAGS

Revisar feature flags.

Garantir:

```text
typed
safe default
audited
environment-aware
```

Nenhuma flag pode bypassar autorização ou RLS.

---

# 183. CONFIGURATION VALIDATION

Na inicialização, validar:

```text
required env
secret presence
URLs
timeouts
ports
feature flags
DB roles
```

Falhar cedo em configuração inválida.

---

# 184. SECRET PLACEHOLDER DETECTION

Produção não pode iniciar com valores como:

```text
changeme
example
default-secret
```

quando forem segredos críticos.

---

# 185. DOCKER HARDENING

Revisar imagens:

```text
multi-stage
non-root
minimal runtime
no unnecessary dev deps
health checks
signal handling
```

---

# 186. CONTAINER FILESYSTEM

Quando possível:

```text
read-only root filesystem
```

e writable mounts apenas onde necessários.

---

# 187. CONTAINER CAPABILITIES

Remover Linux capabilities desnecessárias.

Evitar privileged
