# CVG-HIS V4 — Registro de Riscos

**Data:** 2026-08-25  
**Escala:** P0 perda/corrupção de dados; P1 clínico; P2 segurança; P3 disponibilidade; P4 UX; P5 arquitetura; P6 performance; P7 estética.  
**Estado inicial:** riscos são evidência de trabalho pendente, não aceitação de risco.

| ID    | Pri. | Risco / impacto                                                                                                               | Evidência                                                                                                                                                                                                                                                                                  | Mitigação / dono                                                                                                                        | Estado      |
| ----- | ---: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| R-001 |   P0 | Migration aplicada pode ser alterada e aceita silenciosamente; schema/runtime divergem                                        | runner agora lê nome+hash e valida antes de aplicar; teste unitário e PostgreSQL real                                                                                                                                                                                                      | manter checksum como gate de release; provar aplicação positiva em pipeline; Engenharia DB                                              | BOUNDED     |
| R-002 |   P0 | Dois comandos de migration podem gerar drift ou aplicar trilhas diferentes                                                    | DB-001 remove `drizzle-kit` dos manifests alvo; DB-002 remove a família source-level `migrate.js`/`.d.ts`/`.map` e `drizzle.config.ts`; comandos `db:*` alternativos falham fechado; CI/Compose/Helm/cutover/test bootstrap apontam para o runner canônico                                 | manter `pnpm validate:migration-source` e o teste de artefato como gates; aplicar uma migration nova positiva em staging; Engenharia DB | BOUNDED     |
| R-003 |   P0 | RLS/privileges corretos no SQL, mas não no catálogo de produção                                                               | `validate:rls` 158/159 é estático; prova local fresca aplica 0144 e confirma 123/123 tabelas tenant com `relrowsecurity` e `relforcerowsecurity`, além de RLS/access/runtime ACL 19/19 e bootstrap production-like 6/6; catálogo alvo não foi acessado                                     | executar a mesma prova no PostgreSQL alvo com runtime role `NOBYPASSRLS`, ownership, FORCE RLS e cross-tenant; SRE/DBA                  | BOUNDED     |
| R-004 |   P0 | Restore pode falhar apesar de scripts existirem                                                                               | checker estático e drills mínimo/representativo passam; o perfil representativo restaurou 176 tabelas, 3 arquivos e 19 assertions sob `restore_probe` (`false,false`), com `elapsedMs=28610`; bundle, alvo e RTO/RPO ainda não são equivalentes                                            | repetir com bundle de ambiente homologado, reter manifest/tempo e comparar RTO/RPO; SRE                                                 | BOUNDED     |
| R-005 |   P1 | Jornada Owner→Patient→Encounter→care→close pode ter ruptura entre módulos                                                     | vertical HTTP PostgreSQL passa 11/11; cenário com Owner/Patient/Encounter criados via HTTP leva os mesmos registros por care→inpatient→billing→stock→discharge→close→receipt, com audit, replay e tenant boundary                                                                          | repetir no ambiente alvo com dados representativos e aceite clínico-operacional; Produto/Engenharia                                     | BOUNDED     |
| R-006 |   P1 | Laboratório sem provider/homologação e resultado analítico completo                                                           | readiness report bloqueia laboratório                                                                                                                                                                                                                                                      | definir provider, callback autenticado, release/signature e E2E; Produto/Integrações                                                    | OPEN        |
| R-007 |   P1 | Financeiro real incompleto: cartão, estorno, conciliação não-cash                                                             | readiness report bloqueia financeiro; PIX é mock em parte da prova                                                                                                                                                                                                                         | homologação por meio de pagamento e E2E de settlement/reversal; Financeiro                                                              | OPEN        |
| R-008 |   P1 | Shutdown abrupto perde requests/jobs em rollout                                                                               | API/worker agora fecham listener, DB e observabilidade com exit code; process test cobre SIGTERM repetido e drain                                                                                                                                                                          | executar cenário com DB/Redis e rollout do ambiente alvo; Runtime/SRE                                                                   | BOUNDED     |
| R-009 |   P3 | Dependentes Compose aguardam `service_healthy` sem contrato explícito da superfície                                           | Compose agora declara `/ready` em `127.0.0.1:3001`; teste estrutural/config passa                                                                                                                                                                                                          | validar imagem publicada e dependência em staging; Runtime                                                                              | BOUNDED     |
| R-010 |   P3 | Probe Helm aponta rota inexistente                                                                                            | `charts/helm/api/templates/deployment.yaml` usa `/health/startup`; API expõe `/health`, `/ready`, `/live` e aliases `/health/ready`, `/health/live`                                                                                                                                        | declarar `infra/helm` canônico; alinhar/arquivar segundo track; Release                                                                 | OPEN        |
| R-011 |   P2 | Fallback Vault→env pode degradar gestão de segredos em produção                                                               | `packages/secrets/src/index.ts` agora falha fechado em prod-like sem configuração Vault; dev/test registra warning e mantém fallback explícito; secrets 8/8 e startup 7/7                                                                                                                  | decidir provider/política obrigatória e repetir readiness no alvo; Security                                                             | BOUNDED     |
| R-012 |   P2 | Namespace paralelo permite import fora do boundary e governança ambígua                                                       | 65 V2 vs 5 legacy; o crossing de `module-fiscal → @cvg-his/db` foi removido; RBAC ativo agora é `@cvg-his-v2/rbac`; `validate:namespaces` cobre manifests/imports canônicos e bloqueia o CI                                                                                                                                 | manter guardrail, mapear owners e tratar aposentadoria dos pacotes legados em task autorizada; Arquitetura                              | P2 — BOUNDED/OPEN |
| R-013 |   P5 | API centralizada aumenta blast radius e drift de contrato                                                                     | `server.ts` 7.742 LOC e ~50 dispatches                                                                                                                                                                                                                                                     | extração incremental por domínio, sem rewrite; API                                                                                      | OPEN        |
| R-014 |   P5 | SPA importa internals do design system e tem alias de `src`                                                                   | `apps/spa/main.ts`, `vite.config.ts`; 205 imports observados pelo scout                                                                                                                                                                                                                    | export público + migração incremental; Frontend                                                                                         | OPEN        |
| R-015 |   P6 | Bundle SPA tem imports dinâmicos/estáticos duplicados e páginas grandes                                                       | warning do Vite; PatientDetail ~3.940 LOC                                                                                                                                                                                                                                                  | dividir serviços/chunks após estabilidade funcional; Frontend                                                                           | OPEN        |
| R-016 |   P1 | Parity gate estrutural pode promover domínio sem executar comportamento                                                       | `scripts/lib/vetus-parity-audit.mjs` prova arquivos/nomes; 4/11 funcionalmente verificados                                                                                                                                                                                                 | cenários executáveis por domínio e separar “evidence inventory” de release gate; Produto/QA                                             | IN_PROGRESS |
| R-017 |   P3 | CI não executa todos os gates operacionais disponíveis                                                                        | `repository-guards` chama validators, parity, process, migration, RLS/roles, bootstrap production-like, clinical vertical e Compose config; `unit-tests` sobe PostgreSQL, exige `REQUIRE_TEST_DB=1` e sempre faz cleanup                                                                   | executar workflow remoto e publicar artefatos; DevEx/SRE                                                                                | BOUNDED     |
| R-018 |   P1 | Provider/WhatsApp pode afetar disponibilidade de internação                                                                   | worker/integrations e fallback externo ainda não certificados em alvo                                                                                                                                                                                                                      | outbox assíncrono, timeout, retry/DLQ e jornada sem dependência síncrona; Runtime                                                       | PARTIAL     |
| R-019 |   P3 | Suíte monorepo paralela pode derrubar o PostgreSQL de teste e produzir falso negativo                                         | `pnpm test` repetido com `docker-compose.test.yml` atualizado concluiu os 70 projetos; `postgres-test` foi inspecionado com `shm=1gb`, `OOM=false`, `exit=0`; serviços PostgreSQL do workflow também têm orçamento explícito                                                               | manter orçamento de shared memory, observar runner GitHub e preservar `REQUIRE_TEST_DB=1`; DevEx/SRE                                    | BOUNDED     |
| R-020 |   P4 | Acessibilidade de primeiro acesso pode regredir em hints, foco, contraste ou naming sem falhar no teste de componente         | browser Chromium contra SPA construída passou 2/2 com axe WCAG 2A/2AA, teclado, form naming e `aria-describedby`; o RED identificou contraste 3,96:1 e foi corrigido para `#475569`                                                                                                        | manter o spec no gate enterprise e ampliar para jornadas críticas/responsivas; Frontend/QA                                              | BOUNDED     |
| R-021 |   P1 | SPA E2E pode declarar billing/recebimento coberto em harness local sem instalar a rota persistente de cash receipt            | o comando local default continua in-memory, mas `pnpm test:e2e:spa:docker` passou 60/60 com PostgreSQL/Redis, seed canônico, restart do runtime e cash settlement persistente; o primeiro 59/60 foi isolado a um stub visual `/queue` versus `/api/queue` e corrigido sem alterar baseline | manter o runner Docker/CI explícito para DB-backed, separar gates in-memory, publicar artefatos e repetir em CI/target; QA/SRE          | BOUNDED     |
| R-022 |   P0 | Cache de autorização database-backed pode servir grant/revogação stale durante rollback, outage ou concorrência de instâncias | `packages/modules/access-control` usa pending fail-closed, token antes/depois com retry e hidratação coalescida por conta; vertical HTTP PostgreSQL 14/14 prova rollback/retry, privilege outage→503→recovery e revogação em endpoint protegido na API secundária; Turing aprovou bounded  | repetir com catálogo/ownership/grants do alvo, observabilidade e carga concorrente; Security/SRE                                        | BOUNDED     |

| R-023 | P0 | Fallback de comando tenant-scoped podia perder o contexto canônico exigido por writes de estoque e auditoria/outbox | RED real: Flow 7 retornou `503 TRANSACTION_REQUIRED` no primeiro run crítico; correção propaga actor/correlation metadata para `runInTenantTransactionContext`; API 383/383, crítico 11/11 e SPA Docker 64/64 verdes | expandir a matriz para outras famílias de mutação e repetir no target com grants/ownership; Runtime/Security | P0 — RESOLVED BOUNDED |
| R-024 | P0 | Duas réplicas podem abrir encontros ativos concorrentes para o mesmo paciente e deixar o mapa local divergente | migration `0151` faz preflight fail-closed e cria índice parcial único nomeado; repositório mapeia `23505`; PostgreSQL 7/7, módulo 32/32 e API 410/410; histórico duplicado e target ainda não foram remediados/provados | executar remediação humana aprovada para duplicatas históricas e repetir migration/RLS/roles no target; Runtime/DB/Security | P0 — BOUNDED/OPEN |
| R-025 | P1 | Worker agendado podia registrar `accountId` como `UserId`; um UUID único ainda não modela actor service-principal por conta | resolver compartilhado e config production-like; Secret requerido nos overlays; worker 75/75, config 42/42, processo 12/12 e Helm 6/6; actor explícito persistido e actor desconhecido sem execução | criar mapeamento tenant-aware por conta antes de ampliar relatórios; Runtime/Identity/Security | P1 — BOUNDED/OPEN |

## Priorização de execução

1. R-001, R-003, R-004, R-022: integridade, recuperação, isolamento e autorização.
2. R-008, R-009, R-010, R-017: disponibilidade e rollout.
3. R-005, R-006, R-007, R-016, R-018: prontidão clínica e parity real.
4. R-002, R-012, R-013, R-014, R-015: consolidação arquitetural sem big bang.

## Critério de encerramento

Um risco só passa a `CLOSED` com evidência reproduzível anexada em `docs/engineering`, `.agent/artifacts` ou relatório de verificação, incluindo comando, ambiente, resultado, limitações e revisão independente quando o risco for P0/P1.

## R-024 — unicidade de encontro ativo — 2026-08-27

O risco clínico foi reduzido no boundary canônico sem reescrever dados: a
migration `packages/db/migrations/0151_encounter_active_patient_uniqueness.sql`
recusa aplicar quando já existem múltiplos encontros não fechados por
`(account_id, patient_id)`, rejeita um índice homônimo incompatível e instala a
unicidade parcial somente para `status <> 'closed'`. O repositório traduz
apenas a constraint nomeada para `ConflictError`, inclusive em update/reopen;
o serviço limita o preflight local à conta, restaura a timeline após falha e a
API restaura a fila após conflito de persistência.

A prova local passou repository `5/5`, PostgreSQL `7/7`, módulo `32/32`, pacote
DB `22/22`, API `410/410`, suíte workspace, build, typecheck e cobertura acima
de 80%. O índice foi verificado como único, parcial, válido e pronto, com
visibilidade sob FORCE RLS. `R-024` permanece `P0 — BOUNDED/OPEN`: duplicatas
históricas exigem decisão e remediação humana separadas; a prova local não
substitui target, roles/RLS efetivos, réplicas distribuídas, Redis, providers,
CI remoto ou release.

Artefatos: `.agent/tasks/CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.md`,
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json`,
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS-FINAL-001`.

## R-010 — atualização de contenção — 2026-08-26

O risco da probe Helm inexistente foi contido no plano ativo: a política de
release declara `infra/helm/cvg-his-v2` como única superfície canônica, o
`repository-guards` executa `pnpm validate:deploy-surface` e o README de
`charts/helm` não oferece mais instalação, upgrade ou `/health/startup`.
O guard passou com 68 arquivos e rejeitou um fixture que apontava para o track
legado. A alteração é aditiva e reversível; os arquivos legados não foram
apagados.

R-010 permanece `OPEN`: o chart legado ainda existe, o binário Helm não estava
disponível para lint/template real, não houve render em cluster ou rollout no
target, e a execução remota do CI não foi observada. A contenção reduz a chance
de uso silencioso, mas não prova disponibilidade nem autorização de release.
Artefato: `.agent/artifacts/CVG-003-release-identity-deploy-surface-2026-08-26.md`;
ledgers `VFY-CVG-003-RELEASE-IDENTITY-SURFACE-001` e
`VFY-CVG-003-RELEASE-IDENTITY-SURFACE-FINAL-001`.

## R-010 — gate executável adicional — 2026-08-26

O risco de o CI aceitar Helm apenas estático foi reduzido: o validator falha
fechado com REQUIRE_HELM=1, o workflow instala v3.15.4 com SHA-256 pinado e o
guard detecta remoção ou alteração desses marcadores. A execução local com o
binário oficial passou lint/template nos três overlays; o teste de PATH vazio
confirmou o comportamento rejeitante.

R-010 continua OPEN. O GitHub Actions não foi executado nesta rodada, não houve
render contra cluster, rollout/rollback ou prova de Secrets/identidade no
target, e o track legado permanece retido. Artefato:
.agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md;
ledgers VFY-CVG-003-HELM-EXECUTABLE-001 e
VFY-CVG-003-HELM-EXECUTABLE-FINAL-001.

### R-010 — rechecagem final do executável — 2026-08-26

O controle local/declared-CI agora verifica o binário por caminho explícito,
fixa v3.15.4 por SHA-256 e falha fechado para ausência, versão próxima ou
metadata inválida. Helm oficial passou os três overlays; os contratos focados
passaram 5/5 no validator e 8/8 na composição CI/superfície. R-010 permanece
`OPEN` porque GitHub remoto, cluster, Secrets efetivos, rollout/rollback e
legado físico não foram observados.

## R-023 — reparo de contexto transacional — 2026-08-26

O risco foi reproduzido no boundary HTTP real e corrigido sem abrir fallback:
o runner agora encaminha actor/correlation metadata e o composition root instala
o contexto transacional canônico. As regressões frescas confirmam que o
consumo de estoque volta a funcionar sem remover o guard fail-closed.

`R-023` fica `RESOLVED BOUNDED`, não `CLOSED`: a prova cobre o fallback de
consumo de estoque em ambiente descartável. Outros comandos, o catálogo de
grants/ownership do target e a matriz completa de acesso ainda precisam de
evidência independente.

## R-025 — actor explícito do worker de relatórios — 2026-08-27

O fallback que convertia `accountId` em `UserId` foi removido dos caminhos
contínuo e `run-once`. `WORKER_REPORTS_USER_ID` agora passa por uma única
fronteira validada, é obrigatório em ambientes production-like e é injetado
por Secret requerido nos overlays Helm staging/prod e no Compose canônico.
Ausência, formato inválido e actor inexistente falham fechado; um actor
válido persiste a execução com `requested_by_user_id` explícito.

O slice `CVG-004-WORKER-REPORT-SERVICE-IDENTITY` tem prova local worker `75/75`,
shared-config `42/42`, processo PostgreSQL descartável `12/12`, Helm `6/6`,
build/typecheck/lint e validações de segurança/contratos. `R-025` permanece
`P1 — BOUNDED/OPEN`: um UUID único ainda não expressa o mapeamento
service-principal por conta quando o worker descobre múltiplas contas; a
validação tenant-aware, auditoria agendada e eventual provisioning exigem
decisão e mudança separadas. A revisão independente classificou o slice como
conditional bounded pass, sem Critical/High, e confirmou esse residual.

Artefatos: `.agent/tasks/CVG-004-WORKER-REPORT-SERVICE-IDENTITY.md`,
`.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json`,
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-SERVICE-IDENTITY-FINAL-001`.

## R-025 — integridade tenant-aware do actor de relatórios — 2026-08-27

O residual foi reduzido na camada correta. A migration aditiva `0152` mantém
o mapeamento PIX, permite o propósito `report-execution` sem criar usuários ou
linhas de provisioning, impõe chaves estrangeiras compostas
`(account_id, actor_id)` em execuções/exports/agendamentos e aplica um trigger
transaction-time com `FOR UPDATE` para revalidar propósito e estado ativo de
service principal. O resolver exige que o UUID configurado pertença à conta
corrente, seja service, ativo, não-interativo e esteja mapeado para relatórios;
os caminhos contínuo e run-once falham fechado por conta.

A prova PostgreSQL passou resolver/trigger `9/9`, FKs `6/6`, schema `4/4` e
processo run-once `13/13`, incluindo actor explícito persistido em export e
rejeição cross-account/human/inativa/desmapeada. O workspace, coverage acima
de 80%, lint, typecheck, build, segurança e validators permaneceram verdes.

`R-025` permanece `P1 — PASS_BOUNDED/OPEN`: a topologia atual exige um
mapeamento válido por worker/conta; um único `WORKER_REPORTS_USER_ID` não
representa múltiplos principals de múltiplas contas. Provisioning, target
roles/RLS, worker distribuído, providers, CI remoto, parity, readiness e
release continuam fora do gate. A revisão independente disponível é
condicional, não aprovação de produção.

Artefatos: `.agent/tasks/CVG-004-worker-report-tenant-aware-principal.md`,
`.agent/gates/verified-CVG-004-worker-report-tenant-aware-principal.json`,
`.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-004-WORKER-REPORT-TENANT-AWARE-PRINCIPAL-FINAL-001`.

## R-012 — boundary de namespace canônico — 2026-08-30

O slice `CVG-012-NAMESPACE-CANONICAL-BOUNDARY` removeu os crossings ativos do
grafo V2: `packages/rbac` é resolvido como `@cvg-his-v2/rbac`,
`module-fiscal` não declara mais o banco legado diretamente, e callers de
produção/teste/build usam o nome canônico. O script
`scripts/check-package-namespace-boundaries.mjs` acusa dependências de
manifest e imports de fonte legados nos packages canônicos de `apps` e
`packages`; `pnpm validate:namespaces` passa no workspace e o fixture
negativo confirma saída não-zero para ambos os tipos de crossing. O workflow
`.github/workflows/ci.yml` executa o guard como etapa bloqueante.

Evidência local bounded: guard e contrato CI `10/10`, access-control `39/39`,
fiscal `18/18`, API `519/519`, typecheck/build dos pacotes afetados,
`validate:openapi` (`354` paths), `validate:migration-source`, `validate:rls`
(`165/166`, uma exceção documentada), `security:secrets` e `pnpm install`
com lockfile atualizado. O PostgreSQL descartável inicializou migrations e
seed em todas as suítes DB-backed desta rodada.

R-012 fica `P2 — BOUNDED/OPEN`, não `CLOSED`: os owners legados
`packages/db`/`packages/audit` continuam por decisão explícita, não houve
renomeação global, e não há aprovação independente pós-correção disponível
nesta rodada nem prova no target/CI remoto. A primeira crítica encontrou
false negatives e claims de estado órfãos; a análise AST e a reconciliação do
control-plane corrigiram ambos. Aposentadoria física e release identity
permanecem tasks separadas.

Artefatos: `.agent/tasks/CVG-012-NAMESPACE-CANONICAL-BOUNDARY.md`,
`.agent/gates/verified-CVG-012-namespace-canonical-boundary.json` e
`.agent/artifacts/CVG-012-NAMESPACE-CANONICAL-BOUNDARY-2026-08-30.md`.
