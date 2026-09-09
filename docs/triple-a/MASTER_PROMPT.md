# MISSÃO

Você é o engenheiro principal responsável por elevar o repositório:

`https://github.com/ricardoakinaga-dev/cvg-his-v4`

ao nível:

# STATE OF ART — TRIPLO AAA

O objetivo NÃO é criar uma nova versão, reescrever o sistema ou substituir a arquitetura existente.

O objetivo é transformar o atual CVG-HIS V4 em um ERP/HIS veterinário enterprise de altíssima confiabilidade, segurança, observabilidade, resiliência, qualidade clínica e maturidade operacional.

O sistema deve continuar sendo um:

`modular monolith`

com:

* `apps/api`
* `apps/spa`
* `apps/worker`
* `packages/modules/*`
* `packages/shared/*`
* `packages/db`
* `infra/*`

Não introduza microserviços sem uma justificativa arquitetural extremamente forte e aprovada por evidência.

---

# PRINCÍPIO CENTRAL

O sistema já possui uma arquitetura madura.

Portanto:

NÃO faça uma reescrita.

NÃO crie um CVG-HIS V5.

NÃO introduza outra SPA.

NÃO introduza outra API.

NÃO introduza outra source of truth de migrations.

NÃO crie trilhas paralelas de deploy.

NÃO destrua compatibilidade existente apenas para renomear componentes V2 para V4.

O trabalho deve ser incremental, verificável e compatível com a arquitetura existente.

---

# ESTADO DESEJADO

Ao final, o sistema deverá atingir o seguinte nível de maturidade:

* arquitetura: 97+
* segurança: 97+
* testes: 97+
* CI/CD: 98+
* observabilidade: 97+
* resiliência: 97+
* UX operacional: 95+
* integridade clínica: 98+
* operações: 97+
* disaster recovery: 97+
* supply-chain security: 97+
* release assurance: 98+
* production readiness: 97+

Meta geral:

# 97–99 / 100

O resultado deve ser classificável como:

# ENTERPRISE-GRADE

# STATE OF ART

# TRIPLO AAA

---

# REGRA ABSOLUTA DE EXECUÇÃO

Antes de alterar código:

1. audite o repositório real;
2. valide o estado atual da `main`;
3. leia a documentação viva;
4. identifique a arquitetura real;
5. identifique os testes existentes;
6. identifique os gaps;
7. produza um plano executável;
8. somente depois implemente.

Não trabalhe com suposições.

A implementação deve refletir o estado real do código.

---

# FASE 0 — RECONHECIMENTO E BASELINE

Primeiro faça uma auditoria completa do repositório atual.

Inspecione no mínimo:

* `README.md`
* `package.json`
* `pnpm-workspace.yaml`
* `pnpm-lock.yaml`
* `apps/api`
* `apps/spa`
* `apps/worker`
* `packages/modules`
* `packages/shared`
* `packages/db`
* `packages/rbac`
* `packages/security`
* `packages/secrets`
* `packages/tenant-context`
* `packages/contracts`
* `packages/chaos`
* `infra`
* `docs`
* `docs/adr`
* `.github/workflows`
* `.semgrep.yml`
* `.secretlintrc.json`
* `docker-compose.v2.yml`
* Helm
* observabilidade
* scripts de backup
* restore
* cutover
* staging
* game day
* performance
* testes Playwright
* testes Vitest
* testes PostgreSQL/RLS

Crie:

`docs/engineering/TRIPLE_A_BASELINE.md`

Inclua:

* arquitetura atual;
* strengths;
* weaknesses;
* riscos;
* technical debt;
* security debt;
* testing debt;
* operational debt;
* UX debt;
* clinical-safety debt;
* supply-chain debt;
* estado do CI;
* estado da documentação;
* estado dos deploy rails.

Não declare nada como comprovado sem evidência.

---

# FASE 1 — GREEN MAIN / RELEASE INTEGRITY

O primeiro objetivo deve ser:

# MAIN MUST ALWAYS BE GREEN

Investigue o GitHub Actions atual.

Resolva qualquer falha estrutural ou funcional que impeça a `main` de ficar totalmente verde.

Estabeleça gates obrigatórios para:

* typecheck;
* lint;
* build;
* unit tests;
* integration tests;
* critical tests;
* OpenAPI;
* migration integrity;
* RLS;
* security;
* secret scanning;
* documentation;
* complexity;
* deployment;
* Helm;
* backup/restore;
* release validation.

Crie uma política:

`docs/engineering/GREEN_MAIN_POLICY.md`

Defina:

* critérios para merge;
* critérios de bloqueio;
* critérios de release;
* critérios de rollback;
* critérios para hotfix.

O estado esperado é:

`HEAD(main) -> all required checks GREEN`

Nenhuma release deverá ser certificada se a main estiver vermelha.

---

# FASE 2 — SUPPLY CHAIN SECURITY

Eleve a segurança da cadeia de build.

Implemente ou valide:

## GitHub Actions

Não usar apenas tags mutáveis como:

`actions/checkout@v4`

Sempre que razoável, fazer pin por SHA conhecido.

Criar política centralizada de actions permitidas.

---

## Dependency review

Adicionar validação de novas dependências.

Detectar:

* vulnerabilities;
* dependency confusion;
* typosquatting;
* packages abandonados;
* licenças incompatíveis;
* dependências de risco.

---

## SCA

Adicionar ferramentas adequadas, como:

* OSV Scanner;
* Trivy;
* npm/pnpm audit apenas como camada complementar.

---

## SBOM

Gerar SBOM por release, preferencialmente:

* CycloneDX;
* SPDX.

Produzir ao menos:

`artifacts/release/sbom.cdx.json`

---

## Container Security

Escanear imagens:

* API;
* SPA;
* Worker.

Detectar vulnerabilidades:

* OS packages;
* runtime packages;
* base images.

---

## Provenance

Gerar metadados de proveniência da build.

Incluir:

* commit SHA;
* lockfile hash;
* image digest;
* build timestamp;
* toolchain versions.

---

## Signing

Quando tecnicamente apropriado, adicionar assinatura verificável dos artefatos e/ou imagens.

Avaliar Cosign/Sigstore.

---

# FASE 3 — RELEASE MANIFEST IMUTÁVEL

Criar um release manifest oficial.

Exemplo conceitual:

`artifacts/release/enterprise-release-manifest.json`

Deve conter:

* project;
* version;
* commitSha;
* buildId;
* buildTimestamp;
* packageLockHash;
* migrations;
* apiImageDigest;
* workerImageDigest;
* spaImageDigest;
* SBOM digests;
* security status;
* test status;
* backup/restore status;
* performance status;
* release verdict.

Uma release precisa ser reproduzível e auditável.

---

# FASE 4 — CI/CD STATE OF ART

Reorganize o CI quando necessário para aumentar:

* paralelismo;
* clareza;
* determinismo;
* diagnósticos;
* velocidade;
* segurança.

Evite duplicação extrema de setup.

Considere composite actions internas para setup repetitivo.

Crie:

`.github/actions/setup-cvg-his/`

caso faça sentido.

A pipeline final deverá incluir conceitos equivalentes a:

`Static -> Security -> Build -> Unit -> Integration -> Clinical Critical -> E2E -> Performance -> Recovery -> Release Assurance`

Cada estágio deve produzir evidência.

Não faça jobs “decorativos”.

Cada gate deve proteger um risco real.

---

# FASE 5 — CLINICAL CRITICALITY MATRIX

Crie:

`docs/clinical/CLINICAL_CRITICALITY_MATRIX.md`

Classifique fluxos por criticidade.

No mínimo:

## P0 — críticos

* autenticação clínica;
* owner/patient resolution;
* encounter;
* triage;
* medical records;
* inpatient admission;
* bed allocation;
* prescriptions;
* medication execution;
* diagnostics order;
* diagnostics result;
* surgery;
* discharge;
* emergency alerts;
* handover;
* clinical reminders.

## P1

* estoque;
* billing;
* payments;
* cash;
* commissions;
* scheduling;
* notifications.

## P2

* reports;
* marketing;
* secondary administrative workflows.

Para cada fluxo P0 exija:

* unit test;
* repository test;
* Postgres integration;
* tenant/RLS test;
* authorization test;
* API test;
* E2E test;
* audit evidence;
* concurrency test quando aplicável;
* failure recovery;
* idempotency.

---

# FASE 6 — CLINICAL CRITICAL PATH ASSURANCE

Construa testes de ponta a ponta para os fluxos clínicos.

Exemplo:

`Owner -> Patient -> Appointment -> Triage -> Encounter -> Admission -> Prescription -> Medication -> Diagnostic -> Result -> Discharge`

Também testar cenários de falha.

Exemplos:

* prescrição duplicada;
* administração duplicada;
* dois usuários alterando o mesmo paciente;
* resultado laboratorial recebido duas vezes;
* job repetido;
* timeout do banco;
* restart do worker;
* falha Redis;
* retry de webhook;
* evento repetido;
* falta de autorização;
* troca de tenant.

Nenhum fluxo P0 pode depender apenas de unit test.

---

# FASE 7 — WORKER RELIABILITY

Transforme o worker em um runtime assíncrono extremamente confiável.

Implementar ou fortalecer:

* idempotency;
* retry;
* exponential backoff;
* dead-letter handling;
* deduplication;
* leases;
* lock ownership;
* job timeout;
* retry budget;
* poison-message protection;
* deterministic job identity;
* correlationId;
* causationId;
* trace propagation.

Criar um padrão de envelope.

Exemplo:

```ts
interface JobEnvelope<T> {
  id: string
  type: string
  accountId: string
  correlationId: string
  causationId?: string
  idempotencyKey: string
  payload: T
  attempt: number
  maxAttempts: number
  createdAt: string
  scheduledAt?: string
}
```

Não copie esse contrato cegamente.

Adapte à implementação real.

---

# FASE 8 — DEAD LETTER / RETRY GOVERNANCE

Defina formalmente:

* quantas tentativas;
* quando reprocessar;
* quando escalar;
* quando considerar permanent failure;
* quem pode reexecutar;
* como auditar replay.

Criar:

`docs/operations/JOB_RETRY_AND_DLQ_POLICY.md`

Cada retry deve ser observável.

---

# FASE 9 — WORKFLOW ENGINE

Construir uma infraestrutura transversal de workflows hospitalares.

Criar domínio ou infraestrutura apropriada para:

* Task;
* Reminder;
* Acknowledgment;
* Escalation;
* Workflow.

Não espalhar lógica de lembretes em dezenas de módulos.

Criar uma surface pública que outros módulos possam consumir.

Exemplo conceitual:

```text
Clinical Module
      ↓
Workflow Task
      ↓
Worker
      ↓
Notification
      ↓
Acknowledgment
      ↓
Escalation
```

Suportar:

* dueAt;
* priority;
* status;
* owner/team;
* patient;
* encounter;
* escalation rules;
* acknowledgment;
* completion;
* cancellation;
* audit trail.

---

# FASE 10 — REMINDER ENGINE

Criar mecanismos para lembretes hospitalares.

Exemplo:

Paciente Bob possui ultrassom às 14:00.

Sistema cria tarefa:

* patient: Bob;
* exam: ultrasound;
* due: 13:00;
* assigned sector: internação;
* notification: WhatsApp/internal.

Às 13:00:

notificar.

Caso não seja reconhecida:

* retry/reminder;
* escalation;
* audit.

Criar política configurável.

Não hardcode regras específicas do Bob.

---

# FASE 11 — HANDOVER / PASSAGEM DE PLANTÃO

Criar domínio de passagem de plantão.

Não tratar passagem de plantão como simples campo de texto.

Criar estrutura conceitual para:

* patient;
* encounter;
* current condition;
* current treatment;
* critical alerts;
* pending diagnostics;
* pending procedures;
* pending medications;
* reassessment due;
* unresolved tasks;
* responsible team;
* outgoing staff;
* incoming staff;
* handover timestamp;
* acknowledgement.

Eventos possíveis:

* `handover.created`
* `handover.updated`
* `handover.ready`
* `handover.acknowledged`
* `handover.overdue`

Os eventos devem respeitar versionamento e contracts existentes.

---

# FASE 12 — CLINICAL EVENT TIMELINE

Criar uma timeline clínica operacional unificada.

Objetivo:

resolver informação fragmentada entre módulos.

Exemplo:

```text
08:13 Patient admitted
08:21 Triage completed
08:35 Encounter started
09:02 Inpatient admission
09:20 CBC collected
10:04 Diagnostic result received
10:20 Prescription created
10:32 Medication administered
13:00 Ultrasound reminder
13:58 Patient sent to ultrasound
14:25 Ultrasound completed
15:03 Report available
```

A timeline NÃO deve substituir os bancos soberanos dos módulos.

Ela deve funcionar como projeção/event log operacional.

Criar modelo robusto de:

`ClinicalEvent`

com referências como:

* accountId;
* patientId;
* encounterId;
* type;
* sourceModule;
* actor;
* occurredAt;
* correlationId;
* causationId;
* summary;
* metadata segura.

Não armazenar PHI/LGPD desnecessária em metadata.

---

# FASE 13 — EVENT GOVERNANCE

Padronizar eventos.

Todos os eventos importantes devem possuir:

* name;
* schema version;
* eventId;
* occurredAt;
* accountId;
* actor;
* correlationId;
* causationId;
* payload versionado.

Criar:

`docs/architecture/EVENT_GOVERNANCE.md`

Definir:

* naming convention;
* versioning;
* compatibility;
* deprecation;
* replay;
* ordering;
* duplication;
* out-of-order handling.

---

# FASE 14 — AUDIT IMMUTABILITY

Fortalecer o audit trail.

Informação clínica crítica não deve ser simplesmente apagada ou sobrescrita.

Usar modelo:

`original -> revision -> reason -> author -> timestamp`

Garantir que:

* alterações clínicas sejam rastreáveis;
* motivo de alteração seja armazenado quando necessário;
* exclusão lógica seja preferida em dados auditáveis;
* manipulação administrativa não apague histórico clínico.

Criar testes para isso.

---

# FASE 15 — RBAC + TENANT + RLS ASSURANCE

Manter defesa em profundidade.

Camadas:

`API authorization -> tenant context -> repository -> PostgreSQL RLS`

Testar explicitamente:

* acesso cross-tenant;
* IDs conhecidos de outro tenant;
* query injection attempts;
* staff sem capability;
* worker com identidade incorreta;
* privilege escalation;
* runtime role misuse.

Criar property/invariant tests se fizer sentido.

Nenhuma rota clínica deve depender apenas do frontend para autorização.

---

# FASE 16 — MFA / API KEYS / SERVICE PRINCIPALS

Revisar:

* MFA;
* API keys;
* tokens;
* service principals;
* worker identities;
* webhook credentials.

Garantir:

* hashing/secure storage;
* key rotation;
* revocation;
* expiration;
* scope;
* tenant binding;
* audit.

Nunca logar segredos.

---

# FASE 17 — ATTACHMENT SECURITY

Revisar uploads clínicos.

Implementar/validar:

* MIME sniffing;
* extension validation;
* maximum size;
* virus scanning;
* safe storage;
* generated filename;
* no path traversal;
* content disposition;
* authorization;
* tenant isolation;
* quarantine.

Se ClamAV é obrigatório em production-like, o sistema deve falhar de forma previsível quando indisponível.

---

# FASE 18 — WEBHOOK SECURITY

Fortalecer integrações.

Para WhatsApp, PIX, laboratório e outras integrações:

* HMAC quando aplicável;
* key rotation;
* replay protection;
* timestamp;
* nonce/idempotency;
* account binding;
* payload size limits;
* validation;
* audit;
* rate limiting.

Não aceitar segredo global único para tudo.

---

# FASE 19 — API HARDENING

Revisar API contra:

* injection;
* SSRF;
* open redirect;
* IDOR;
* broken object level authorization;
* mass assignment;
* CSRF quando relevante;
* CORS;
* request smuggling;
* oversized payloads;
* rate abuse;
* auth bypass.

Adicionar testes de segurança para casos críticos.

---

# FASE 20 — OBSERVABILITY TECHNICAL

Padronizar:

* traces;
* metrics;
* logs;
* correlation IDs;
* structured logging.

Usar OpenTelemetry corretamente.

Garantir propagação entre:

`SPA -> API -> event -> worker -> external integration`

quando possível.

---

# FASE 21 — OBSERVABILITY HOSPITALAR

Criar métricas de negócio/operacionais.

Exemplos:

* `cvg_active_inpatients`
* `cvg_open_encounters`
* `cvg_pending_diagnostics`
* `cvg_diagnostic_overdue`
* `cvg_medication_overdue`
* `cvg_handover_pending`
* `cvg_handover_overdue`
* `cvg_tasks_overdue`
* `cvg_job_retry_total`
* `cvg_job_dead_letter_total`
* `cvg_notification_failure_total`

Não usar patientId como label Prometheus.

Evitar cardinalidade alta.

Criar dashboards e alertas úteis.

---

# FASE 22 — SLO / SLI

Criar SLOs.

Exemplos:

API:

* availability;
* p95 latency;
* error rate.

Worker:

* job latency;
* success rate;
* retry rate;
* oldest pending job.

Hospital workflow:

* overdue task rate;
* delayed diagnostics;
* notification delivery.

Criar:

`docs/operations/SLO_SLI_POLICY.md`

---

# FASE 23 — ERROR BUDGET

Definir error budget para serviços críticos.

Não precisa criar burocracia artificial.

Mas deve ser possível responder:

* sistema está estável?
* estamos consumindo o budget?
* podemos fazer deploy?
* devemos congelar feature work?

---

# FASE 24 — BACKUP / RESTORE

Revisar mecanismo existente.

Definir formalmente:

* backup database;
* attachments;
* encryption;
* retention;
* restore;
* integrity check.

Estabelecer:

* RPO;
* RTO.

Produzir:

`docs/operations/DISASTER_RECOVERY.md`

e:

`docs/operations/RPO_RTO_POLICY.md`

---

# FASE 25 — RESTORE DRILLS

Expandir drills.

Testar:

* restore completo;
* restore de database;
* restore de attachments;
* banco vazio;
* corrupted backup;
* missing object;
* mismatch de migrations.

Produzir evidência automaticamente.

---

# FASE 26 — CHAOS / GAME DAYS

Usar o pacote de chaos e os workflows existentes de forma real.

Simular:

* API restart;
* worker restart;
* Redis unavailable;
* Postgres restart;
* temporary DB latency;
* webhook retries;
* storage unavailable;
* OTEL unavailable.

Validar:

* sem corrupção;
* sem perda crítica;
* recovery automática ou controlada.

---

# FASE 27 — PERFORMANCE

Criar baseline.

Medir:

* API p50/p95/p99;
* throughput;
* DB latency;
* connection pool;
* worker throughput;
* SPA startup;
* critical route response.

Utilizar k6 já existente e expandir quando necessário.

Criar budgets.

Exemplo:

* core API p95 abaixo de limite apropriado;
* frontend route interactive dentro de budget.

Não inventar números arbitrários sem baseline.

---

# FASE 28 — CONCURRENCY ASSURANCE

Testar concorrência em operações críticas.

Exemplos:

* dois profissionais administrando mesma medicação;
* dois check-ins;
* dois pagamentos;
* duas baixas de estoque;
* duas alterações de leito;
* dois webhooks idênticos.

Garantir invariantes.

Quando necessário usar:

* optimistic concurrency;
* DB constraints;
* transactions;
* idempotency keys.

---

# FASE 29 — DATABASE INTEGRITY

Adicionar constraints no banco sempre que a integridade puder ser garantida melhor no PostgreSQL.

Não confiar somente na aplicação.

Revisar:

* unique;
* foreign keys;
* check constraints;
* not null;
* indexes;
* transaction boundaries.

Evitar invariantes importantes somente em TypeScript.

---

# FASE 30 — MIGRATION SAFETY

Toda migration deve ser:

* versionada;
* verificável;
* testada;
* compatível com rollback operacional quando possível.

Testar:

`old schema + migrate -> new runtime`

e quando aplicável:

`previous release -> migration -> current release`

Criar upgrade drills de verdade.

---

# FASE 31 — FRONTEND CLINICAL UX

Não fazer redesign meramente estético.

O objetivo deve ser produtividade clínica.

Reduzir:

* clicks;
* scroll;
* context switching;
* hunting;
* repeated data entry.

Priorizar:

* patient context persistente;
* quick actions;
* keyboard navigation;
* command palette;
* pending tasks;
* warnings;
* current medication;
* diagnostics pending;
* latest results;
* hospitalization status.

---

# FASE 32 — PATIENT 360

Criar ou melhorar uma visão Patient 360.

Deve reunir:

* identificação;
* tutor;
* alertas;
* atendimento atual;
* internação;
* prescrições;
* medicações;
* exames;
* resultados;
* cirurgia;
* pendências;
* timeline;
* financeiro relevante;
* ações rápidas.

Não duplicar regras de domínio no frontend.

---

# FASE 33 — ACCESSIBILITY

Manter/expandir:

* axe;
* keyboard;
* focus;
* labels;
* contrast;
* forms;
* error announcements;
* responsive layouts.

Clinical UX precisa funcionar em telas pequenas e estações de atendimento.

---

# FASE 34 — DESIGN SYSTEM

Consolidar componentes reutilizáveis.

Evitar múltiplas implementações diferentes de:

* buttons;
* forms;
* dialogs;
* alerts;
* badges;
* tables;
* timelines;
* clinical cards;
* status indicators.

Manter tokens e UX consistentes.

---

# FASE 35 — MODULE BOUNDARY ENFORCEMENT

Criar mecanismos automáticos que impeçam módulos de acessar internals de outros módulos.

Validar imports.

Exemplo:

permitido:

`@cvg-his-v2/module-patients`

proibido:

`@cvg-his-v2/module-patients/src/internal/foo`

Criar tests/guards.

---

# FASE 36 — CONTRACTS SCALABILITY

Auditar `packages/shared/contracts`.

Se estiver se tornando um God Package, reorganizar internamente por domínio.

Exemplo:

```text
contracts/
  auth/
  patient/
  encounter/
  inpatient/
  diagnostics/
  finance/
```

Pode manter barrel exports compatíveis.

Não fazer breaking change desnecessária.

---

# FASE 37 — COMPOSITION ROOT

Auditar `apps/api/src/runtime.ts`.

Se estiver concentrando responsabilidades demais, decompor.

Exemplo:

```text
composition/
  identity.ts
  clinical.ts
  inpatient.ts
  diagnostics.ts
  finance.ts
  operations.ts
  integrations.ts
```

`runtime.ts` deve orquestrar, não conter toda implementação.

---

# FASE 38 — DEPENDENCY GOVERNANCE

Implementar política de dependências.

Preferir:

* pnpm catalogs;
* Renovate;
* version consistency;
* dependency constraints.

Reduzir drift entre:

* Vitest;
* Vue;
* Vite;
* TypeScript;
* OpenTelemetry;
* Playwright.

Criar:

`docs/engineering/DEPENDENCY_POLICY.md`

---

# FASE 39 — RENOVATE

Adicionar Renovate com grupos seguros.

Exemplos:

* patch/minor;
* testing stack;
* frontend toolchain;
* observability;
* security patches.

Updates críticos de segurança devem ter prioridade.

---

# FASE 40 — REPOSITORY HYGIENE

Revisar arquivos de runtime presentes no Git.

`.gauntlet/state.json` ou equivalentes gigantes não devem crescer indefinidamente no repositório.

Mover estados/artefatos grandes para:

* GitHub Actions artifacts;
* object storage;
* explicit evidence package.

Preservar apenas:

* configuração;
* schema;
* documentação;
* pequenas evidências relevantes.

Não deletar histórico importante sem avaliação.

---

# FASE 41 — DOCUMENTATION GOVERNANCE

Definir classes de documentos:

* canonical;
* ADR;
* operational;
* historical;
* generated evidence.

Evitar que documentação antiga seja confundida com instrução ativa.

Adicionar frontmatter ou marcadores, quando útil:

```text
status: canonical
validated_at:
owner:
supersedes:
```

---

# FASE 42 — ADR GOVERNANCE

Toda mudança arquitetural significativa deve possuir ADR.

Especialmente:

* workflow engine;
* clinical event timeline;
* handover;
* jobs;
* event governance;
* release assurance;
* supply-chain.

---

# FASE 43 — DEPLOYMENT HARDENING

Revisar Dockerfiles.

Garantir:

* multi-stage builds;
* non-root;
* minimal base image;
* pinned major/minor base version;
* health checks;
* no dev dependencies em runtime quando desnecessárias;
* readonly filesystem quando possível;
* no privileged;
* drop capabilities quando possível.

---

# FASE 44 — COMPOSE HARDENING

Manter Compose como uma opção válida de produção single-node.

Aplicar:

* isolated networks;
* no unnecessary published ports;
* restart policies;
* resource limits quando apropriado;
* health checks;
* read-only mounts;
* secrets strategy;
* backup volumes.

Não obrigar Kubernetes se não houver necessidade.

---

# FASE 45 — HELM HARDENING

O Helm existente deve continuar sendo validado.

Revisar:

* securityContext;
* probes;
* resources;
* PDB;
* NetworkPolicy;
* secrets;
* config;
* rollout;
* rollback.

Manter apenas uma superfície Helm canônica.

---

# FASE 46 — RELEASE IDENTITY

Não fazer rename global V2 -> V4 neste trabalho salvo necessidade objetiva.

Preservar política existente de compatibilidade.

Somente preparar documentação para futura canonicalização.

Criar plano futuro se necessário:

`docs/engineering/V4_RUNTIME_NAMESPACE_MIGRATION_PLAN.md`

Sem executar automaticamente.

---

# FASE 47 — ENTERPRISE RELEASE GATE

Criar um comando único:

`pnpm release:triple-a`

ou equivalente adequado ao projeto.

Esse comando deve executar ou verificar:

* clean checkout;
* dependency integrity;
* typecheck;
* lint;
* build;
* unit;
* integration;
* critical clinical;
* RLS;
* OpenAPI;
* E2E;
* security;
* SBOM;
* container scan;
* backup restore;
* upgrade;
* performance;
* documentation;
* release manifest.

Não precisa duplicar trabalho desnecessariamente; pode orquestrar jobs ou scripts já existentes.

---

# FASE 48 — RELEASE EVIDENCE

Criar:

`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`

Exemplo conceitual:

```json
{
  "verdict": "PASS",
  "commit": "...",
  "architecture": "PASS",
  "security": "PASS",
  "clinicalCriticalPaths": "PASS",
  "tenantIsolation": "PASS",
  "workerReliability": "PASS",
  "e2e": "PASS",
  "backupRestore": "PASS",
  "upgrade": "PASS",
  "performance": "PASS",
  "supplyChain": "PASS"
}
```

Não marcar PASS se a evidência não existir.

---

# FASE 49 — TRIPLE-A SCORECARD

Criar mecanismo de avaliação.

Exemplo:

`pnpm rc:evidence:triple-a`

Produzir nota por domínio:

* architecture;
* security;
* testing;
* clinical safety;
* operations;
* observability;
* recovery;
* CI/CD;
* frontend;
* data integrity;
* supply chain.

Critério de aprovação:

* nenhum domínio crítico abaixo de 95;
* geral >=97;
* nenhum P0 aberto;
* main verde;
* critical path verde;
* security gate verde.

---

# FASE 50 — PRODUCTION CERTIFICATION

Preparar um runbook para homologação final.

Criar:

`docs/operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md`

Deve incluir:

## Preflight

* backups;
* credentials;
* DNS;
* reverse proxy;
* storage;
* Postgres;
* Redis;
* migrations.

## Functional

* login;
* patient;
* encounter;
* admission;
* prescription;
* medication;
* diagnostic;
* discharge.

## Reliability

* worker restart;
* API restart;
* Redis restart;
* Postgres restart.

## Recovery

* backup;
* restore.

## Performance

* load test.

## Security

* vulnerability gates.

## Soak

Planejar teste de longa duração.

Não declarar que um soak remoto foi executado se não foi.

---

# FASE 51 — TESTE DE SOAK

Preparar infraestrutura para testes de 24h/72h.

Coletar:

* memory;
* handles;
* DB connections;
* worker backlog;
* retries;
* latency;
* errors;
* storage;
* job failures.

Detectar leaks e degradação progressiva.

---

# FASE 52 — SECURITY TEST MATRIX

Criar:

`docs/security/SECURITY_TEST_MATRIX.md`

Cobrir:

* auth;
* authz;
* tenant;
* RLS;
* API keys;
* webhook;
* secrets;
* attachments;
* SSRF;
* injection;
* path traversal;
* unsafe deserialization;
* excessive requests;
* audit tampering;
* privilege escalation.

---

# FASE 53 — FAILURE MODE ANALYSIS

Criar:

`docs/operations/FMEA.md`

Para cada componente:

* failure;
* impact;
* detection;
* mitigation;
* recovery.

Incluir:

* PostgreSQL;
* Redis;
* API;
* worker;
* SPA;
* storage;
* WhatsApp;
* laboratory provider;
* payment provider;
* telemetry.

---

# FASE 54 — CLINICAL SAFETY INVARIANTS

Criar:

`docs/clinical/CLINICAL_SAFETY_INVARIANTS.md`

Exemplos:

* medicamento não pode ser registrado como administrado duas vezes pela mesma execução;
* alta não pode apagar pendências históricas;
* resultado laboratorial não pode mudar de tenant;
* alteração de prontuário deve preservar histórico;
* operação P0 deve ser auditável;
* paciente deve permanecer resolvível após merge de tutor/paciente quando permitido.

Transformar invariantes importantes em testes automatizados.

---

# FASE 55 — IDEMPOTENCY MATRIX

Criar:

`docs/architecture/IDEMPOTENCY_MATRIX.md`

Identificar toda operação que precisa de idempotência:

* webhooks;
* pagamentos;
* medication execution;
* imports;
* external results;
* notifications;
* scheduled jobs;
* event consumers.

---

# FASE 56 — EXTERNAL INTEGRATION CONTRACTS

Criar padrões para integrações.

Toda integração externa deve possuir:

* timeout;
* retries;
* circuit breaker quando útil;
* idempotency;
* telemetry;
* health status;
* error classification.

Não permitir chamadas externas indefinidas.

---

# FASE 57 — FEATURE FLAGS

Revisar feature flags existentes.

Garantir:

* typed flags;
* default safe;
* audit;
* environment policy;
* no security bypass.

---

# FASE 58 — PRIVACY / LGPD

Auditar:

* minimização de dados;
* retention;
* export;
* anonymization;
* purpose;
* access logs.

Evitar duplicar PHI desnecessariamente em logs, events ou metrics.

Criar redaction central.

---

# FASE 59 — LOGGING SECURITY

Logs nunca devem incluir:

* password;
* token;
* auth header;
* webhook secrets;
* clinical attachment payloads;
* encrypted MFA material;
* payment secrets.

Criar tests de redaction.

---

# FASE 60 — FINAL CLEANUP

Antes de encerrar:

* remover código morto criado durante migrações;
* remover TODOs obsoletos;
* não remover histórico necessário;
* alinhar documentação;
* validar imports;
* validar namespace;
* validar migrations;
* validar deploy.

---

# DOCUMENTAÇÃO OBRIGATÓRIA DA EXECUÇÃO

Criar:

`docs/triple-a/`

No mínimo:

```text
00-baseline.md
01-green-main.md
02-supply-chain.md
03-clinical-assurance.md
04-worker-reliability.md
05-workflow-engine.md
06-handover.md
07-clinical-timeline.md
08-observability.md
09-recovery.md
10-performance.md
11-security.md
12-production-certification.md
13-final-scorecard.md
```

Cada documento deve conter:

* problema;
* estado anterior;
* decisão;
* implementação;
* arquivos alterados;
* testes;
* evidências;
* riscos residuais.

---

# REGRAS DE QUALIDADE

Não aceite:

* mock como evidência de produção;
* teste que só verifica que função foi chamada;
* coverage artificial;
* snapshot sem valor;
* TODO em fluxo P0;
* fallback inseguro;
* `any` desnecessário;
* `catch {}` silencioso;
* erro engolido;
* credencial hardcoded;
* migration duplicada;
* regra clínica somente no frontend;
* autorização somente no frontend;
* retry infinito;
* worker sem idempotência;
* evento sem tenant;
* log de segredo;
* release com main vermelha.

---

# TESTES OBRIGATÓRIOS

Sempre que modificar código relevante:

* typecheck;
* lint;
* unit;
* integration;
* relevant DB tests;
* relevant RLS tests;
* relevant API tests;
* relevant E2E tests.

Para código crítico:

* failure tests;
* concurrency;
* retries;
* idempotency;
* tenant isolation.

---

# POLÍTICA DE COBERTURA

Não perseguir cobertura apenas por percentual.

Cobertura deve ser baseada em risco.

Mesmo assim:

* módulos críticos precisam de cobertura alta;
* branch coverage é importante;
* código não testável deve ser refatorado.

Nunca diminuir thresholds apenas para fazer CI passar.

---

# POLÍTICA DE ALTERAÇÃO

Antes de alterar algo grande:

1. detectar consumidores;
2. avaliar compatibilidade;
3. documentar decisão;
4. implementar;
5. testar;
6. migrar consumidores;
7. remover legado somente após comprovação.

---

# PROIBIÇÕES

Não:

* reescrever tudo;
* criar microserviços prematuramente;
* criar outro frontend;
* criar outro banco;
* criar migration rail paralelo;
* fazer rename global V2/V4;
* remover compatibilidade sem consumer scan;
* desativar teste para obter verde;
* reduzir segurança;
* transformar failures em warnings;
* ignorar erros de CI.

---

# ORDEM DE PRIORIDADE

## P0

1. Main verde.
2. Required gates.
3. Clinical critical paths.
4. Tenant/RLS isolation.
5. Worker reliability.
6. Job idempotency.
7. Audit integrity.
8. Backup/restore.

## P1

9. Supply chain.
10. Workflow engine.
11. Handover.
12. Clinical timeline.
13. Hospital observability.
14. SLO.
15. Performance.
16. Dependency governance.

## P2

17. UX refinement.
18. Runtime naming canonicalization plan.
19. Documentation cleanup.
20. Further optimizations.

---

# ESTRATÉGIA DE COMMITS

Faça commits pequenos e semânticos.

Exemplos:

```text
fix(ci): restore green main gate
feat(security): add SBOM release evidence
feat(worker): add idempotent job execution
feat(workflow): introduce task lifecycle
feat(handover): add hospital shift handover
feat(clinical-events): add patient event timeline
test(clinical): add medication execution concurrency coverage
docs(ops): define RPO and RTO
```

Evite um commit gigante para tudo.

---

# EXECUTION LOG

Mantenha:

`docs/triple-a/EXECUTION_LOG.md`

Para cada etapa:

* data;
* objetivo;
* alteração;
* resultado;
* testes;
* riscos restantes.

---

# DEFINITION OF DONE

O trabalho NÃO termina quando o código compila.

O trabalho termina quando:

* main verde;
* CI verde;
* security verde;
* P0s fechados;
* clinical critical paths verdes;
* worker reliability comprovada;
* RLS comprovado;
* backup/restore comprovado;
* upgrade drill verde;
* performance dentro do budget;
* documentação alinhada;
* release evidence gerada;
* score >=97/100;
* nenhum domínio crítico abaixo de 95.

Se algo não puder ser comprovado localmente ou no CI:

registre como:

`NOT PROVEN`

Nunca como PASS.

---

# FINAL REPORT

Ao final, gerar:

`docs/triple-a/FINAL_REPORT.md`

Com:

## Executive Summary

Estado anterior e estado final.

## Scorecard

| Área                 | Antes | Depois |
| -------------------- | ----: | -----: |
| Architecture         |       |        |
| Security             |       |        |
| Testing              |       |        |
| Clinical Safety      |       |        |
| Worker               |       |        |
| CI/CD                |       |        |
| Observability        |       |        |
| Recovery             |       |        |
| Frontend             |       |        |
| Database             |       |        |
| Supply Chain         |       |        |
| Production Readiness |       |        |
| Overall              |       |        |

## P0 Findings

Todos fechados ou claramente identificados.

## Remaining Risks

Nenhum risco deve ser escondido.

## Release Recommendation

Uma das opções:

* BLOCKED
* CANDIDATE
* ENTERPRISE READY
* TRIPLE-A CANDIDATE
* TRIPLE-A VERIFIED

Somente usar:

`TRIPLE-A VERIFIED`

se houver evidência objetiva suficiente.

---

# CRITÉRIO TRIPLO AAA

Para considerar o CVG-HIS V4 Triplo AAA:

```text
Main                       GREEN
Security                   PASS
Supply-chain               PASS
Critical clinical paths    PASS
RLS/Tenant isolation       PASS
Worker reliability         PASS
Idempotency                PASS
Audit integrity            PASS
Backup/Restore             PASS
Upgrade drill              PASS
Performance                PASS
E2E                        PASS
Documentation              PASS
Release evidence           PASS
```

E:

```text
Overall score >= 97
Critical dimensions >= 95
P0 issues = 0
```

---

# VISÃO FINAL DO PRODUTO

O CVG-HIS não deve terminar apenas como ERP veterinário.

Ele deve evoluir para:

# VETERINARY HOSPITAL OPERATING SYSTEM

Com arquitetura conceitual equivalente a:

```text
                       CVG-HIS V4
                           │
            ┌──────────────┼──────────────┐
            │              │              │
           SPA            API           Worker
            │              │              │
            └──────────────┼──────────────┘
                           │
                    Domain Modules
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Clinical          Operations          Financial
        │                  │                  │
     Patient            Workflow           Billing
     Encounter           Tasks             Payments
     Triage              Reminders         Inventory
     Records             Handover
     Inpatient           Escalation
     Diagnostics
     Surgery
     Prescriptions
        │
        ▼
 Clinical Event Timeline
        │
        ▼
      Event Bus
        │
        ├──────────────► Workflow Runtime
        │                      │
        │                      ▼
        │                    Worker
        │                      │
        │                      ▼
        │            Notifications / WhatsApp
        │
        ▼
 PostgreSQL + RLS + Audit
```

---

# PRIMEIRA AÇÃO

Comece agora pela FASE 0.

Não implemente todas as mudanças imediatamente.

Primeiro:

1. leia o repositório inteiro de forma direcionada;
2. valide a main atual;
3. identifique gaps reais;
4. produza `TRIPLE_A_BASELINE.md`;
5. produza um plano de execução por fases;
6. classifique achados em P0/P1/P2;
7. somente depois comece a implementação pelos P0.

Não peça confirmação para continuar entre pequenas etapas.

Avance de forma autônoma enquanto houver evidência suficiente.

Quando encontrar divergência entre documentação e código:

# O CÓDIGO EXECUTÁVEL + TESTES + DEPLOY CANÔNICO SÃO A VERDADE OPERACIONAL.

Documente a divergência e corrija-a.

Objetivo final:

# CVG-HIS V4

# STATE OF ART

# ENTERPRISE-GRADE

# TRIPLO AAA

# 97–99/100
