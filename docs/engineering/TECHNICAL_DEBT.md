# CVG-HIS V4 — Dívida Técnica

**Data:** 2026-08-25  
**Escopo:** dívida que afeta consolidação, operação, segurança clínica ou capacidade de evolução.  
**Regra:** dívida não é sinônimo de “arquivo grande”; cada item tem impacto observável e uma ação incremental.

| ID     | Área         | Dívida                                                                                                                                                | Evidência                                                                                                                                                                                                                  | Consequência                                                                                                        | Próxima ação                                                                                                                |            Prioridade |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------: |
| TD-001 | Identidade   | Repositório/runtime ainda V2 em projeto chamado V4                                                                                                    | root `package.json`, README, Compose, imagens e 1.327 arquivos com refs V2                                                                                                                                                 | cutover e rastreabilidade ambíguos                                                                                  | decisão de release identity + aliases + atualização documental em lotes                                                     |                    P0 |
| TD-002 | DB           | `packages/db` e `packages/shared/database` mantêm responsabilidades distintas, mas ainda há SQL histórica em duas casas                               | 142 migrations aplicáveis em `packages/db`; 30 SQL históricas em `shared/database`; os manifests alvo não dependem de `drizzle-kit` e os comandos `db:*` alternativos falham fechado                                       | confusão documental e risco de operador usar artefato histórico                                                     | manter guardrail CI, preservar a SQL histórica até reconciliação autorizada e decidir a política de remoção em task própria |          P0 — BOUNDED |
| TD-003 | DB           | Runner não verifica checksum de migration já aplicada                                                                                                 | runner agora lê `migration_name, hash` e falha antes de aplicar em mismatch                                                                                                                                                | drift histórico ainda precisa de reconciliação operacional                                                          | manter gate e provar migration nova em pipeline                                                                             |          P0 — BOUNDED |
| TD-004 | DB           | Journal legado do Drizzle não representa a trilha SQL completa                                                                                        | metadata reduzida frente às migrations canônicas; `drizzle.config.ts` foi removido e `db:generate`/`db:push` falham fechado nos manifests alvo                                                                             | falsa confiança em ferramentas ou uso de artefato legado                                                            | declarar runner próprio, manter `validate:migration-source` e preservar o SQL histórico sem reabrir a rail Drizzle          |          P0 — BOUNDED |
| TD-005 | Runtime      | Shutdown da API não fechava servidor/DB antes de sair                                                                                                 | corrigido em `apps/api/src/index.ts`/`bootstrap.ts`, com process test                                                                                                                                                      | rollout com DB/Redis reais ainda não ensaiado                                                                       | manter teste de processo no CI e executar staging                                                                           |          P1 — BOUNDED |
| TD-006 | Runtime      | Shutdown do worker dependia de `finally` que o signal handler podia pular                                                                             | corrigido com drain/readiness e exitCode                                                                                                                                                                                   | job em voo com dependências reais ainda não ensaiado                                                                | prova de rollout e lease em staging                                                                                         |          P1 — BOUNDED |
| TD-007 | Runtime      | Healthcheck Compose era implícito na imagem                                                                                                           | `/ready` agora está declarado no YAML do serviço API                                                                                                                                                                       | ainda há probes Helm alternativos a alinhar                                                                         | canonicalizar track Helm                                                                                                    |          P1 — BOUNDED |
| TD-008 | Release      | Dois tracks Helm sem owner único                                                                                                                      | `infra/helm/cvg-his-v2` e `charts/helm`                                                                                                                                                                                    | deploy incorreto                                                                                                    | canonicalizar `infra/helm`, testar/desativar segundo                                                                        |                    P1 |
| TD-009 | Release      | Probe `/health/startup` inexiste no chart alternativo                                                                                                 | API health routes                                                                                                                                                                                                          | pods podem ficar não-ready                                                                                          | alinhar ou arquivar chart                                                                                                   |                    P1 |
| TD-010 | CI           | Gates operacionais disponíveis não bloqueavam PR                                                                                                      | `repository-guards` inclui validators e testes de processo/DB; `unit-tests` sobe PostgreSQL e exige `REQUIRE_TEST_DB=1`                                                                                                    | workflow remoto e retenção de artefatos ainda pendentes                                                             | executar no GitHub e publicar evidência                                                                                     |          P1 — BOUNDED |
| TD-011 | QA           | Parity inventory mistura presença de evidência com comportamento                                                                                      | auditoria 4/11; score 98/100 não significa parity                                                                                                                                                                          | falsa prontidão                                                                                                     | cenários por domínio, status VERIFIED separado                                                                              |                    P1 |
| TD-012 | API          | Composition root/dispatch concentrado em `server.ts`                                                                                                  | 7.742 LOC, ~50 handlers                                                                                                                                                                                                    | alto custo de revisão                                                                                               | route registries e ports incrementais                                                                                       |                    P2 |
| TD-013 | SPA          | imports diretos de internals do design system                                                                                                         | aliases `@cvg-his-v2/design-system/src`                                                                                                                                                                                    | acoplamento de build                                                                                                | exports públicos e regra de import                                                                                          |                    P2 |
| TD-014 | SPA          | warnings de chunk por import duplo e páginas grandes                                                                                                  | build Vite; páginas >3k LOC                                                                                                                                                                                                | performance e manutenção                                                                                            | decomposição após contratos estáveis                                                                                        |                    P3 |
| TD-015 | Docs         | docs contêm caminhos de máquina `/root/.openclaw/...` e datas divergentes                                                                             | 73 arquivos com refs                                                                                                                                                                                                       | onboarding/execução não reproduzíveis                                                                               | links relativos e validação documental                                                                                      |                    P2 |
| TD-016 | Ops          | backup/restore ainda não foi provado com bundle representativo do ambiente                                                                            | perfil local representativo restaura 176 tabelas, 3 arquivos e 19 assertions sob `restore_probe` com `elapsedMs=28610`; ainda não mede bundle, retenção, RTO/RPO ou failover do alvo                                       | executar drill com backup homologado e registrar tempos, manifest, retenção e volume representativo                 | P0 — BOUNDED                                                                                                                |
| TD-017 | Security     | Fallback Vault/env não é política explícita                                                                                                           | `packages/secrets/src/index.ts` falha fechado em prod-like sem Vault configurado e preserva fallback apenas em dev/test; secrets 8/8 e startup 7/7                                                                         | política/provider do ambiente alvo ainda precisa de aceite e execução                                               | manter modo obrigatório em prod-like e provar provider no alvo                                                              |          P1 — BOUNDED |
| TD-018 | Integrations | provider laboratory/fiscal/payment/marketing não homologado                                                                                           | readiness 4/11                                                                                                                                                                                                             | release funcional incompleta                                                                                        | plano de homologação por provider                                                                                           |                    P1 |
| TD-019 | Testes       | bancos efêmeros isolam schema, mas compartilham roles PostgreSQL                                                                                      | migrations aplicam `ALTER ROLE` no cluster; setup paralelo pode colidir                                                                                                                                                    | suíte monorepo intermitente e falso skip sem DB obrigatório                                                         | lock de setup no banco administrativo + repetição com `REQUIRE_TEST_DB=1`                                                   |                    P1 |
| TD-020 | DB           | Família de artefatos source-level stale (`packages/db/src/migrate.js`, companions `.d.ts`/`.map` e `drizzle.config.ts`) poderia divergir do runner TS | DB-002 removeu os cinco artefatos; `packages/db/dist/migrate.js` é regenerado pelo build e permanece consumidor de Compose/Helm                                                                                            | risco de import implícito/stale eliminado localmente                                                                | manter teste de ausência, guardrail e build do pacote; migration positiva em staging permanece separada                     | P1 — RESOLVED BOUNDED |
| TD-021 | CI/Testes    | `pnpm test` dispara muitas migrations/bancos efêmeros em paralelo e depende do orçamento de `/dev/shm` do runner                                      | após `shm_size: '1gb'`, os 70 projetos selecionados passaram e o container terminou `OOM=false`, `exit=0`; cinco serviços PostgreSQL do workflow também têm `--shm-size 1g`; execução GitHub ainda não foi observada       | CI instável e feedback lento                                                                                        | manter shared memory dimensionada, acompanhar runner remoto e separar DB-heavy se a capacidade variar                       |          P1 — BOUNDED |
| TD-022 | UX/QA        | A prova browser/axe cobre o setup wizard, mas não todos os fluxos críticos desktop/mobile                                                             | `setup-wizard-accessibility.spec.ts` passa 2/2 contra a SPA construída; parity browser, responsividade manual e journeys clínicas ainda não estão sob o mesmo gate                                                         | expandir specs por jornada sem confundir mock de UI com prova de persistência                                       | P1 — BOUNDED                                                                                                                |
| TD-023 | QA/Infra     | O comando Playwright local default usa API in-memory e não suporta cash receipt persistente, enquanto o fluxo billing exige banco seedado             | o default permanece in-memory; o runner Docker/CI seedado passou 60/60 em database mode, incluindo cash settlement, após contratos de role/seed e stub visual API-prefixed; execução GitHub/target ainda não foi observada | manter o modo da suíte explícito, reter o runner Docker/CI como prova DB-backed e acompanhar execução remota/target | P1 — BOUNDED                                                                                                                |

| TD-024 | DB/Security | O catálogo histórico habilitava RLS sem aplicar `FORCE RLS` de forma uniforme | migration `0144_force_rls_tenant_tables.sql` e contrato efêmero confirmam 123/123 tabelas públicas tenant com `relrowsecurity=true` e `relforcerowsecurity=true`; `installation_state` permanece exceção global documentada | executar a mesma consulta no alvo, validar ownership/grants e impedir novas tabelas tenant sem `FORCE RLS` em revisão de migration | P0 — BOUNDED |
| TD-025 | Security | Read model de autorização em memória precisa permanecer alinhado ao commit PostgreSQL entre réplicas e durante falhas | `AccessControlService` agora descarta leitura com token instável, serializa hidratações por conta e falha fechado em pending/erro; 32 testes unitários, API 373/373 e vertical HTTP 14/14 cobrem rollback, outage, recovery e revogação protegida cross-instance | ainda falta prova de ownership/grants, latência/carga e failover no ambiente alvo; o intervalo entre preflight e commit de uma nova revogação é um limite operacional explícito | repetir teste concorrente e métricas no alvo, mantendo fallback fail-closed; Security/SRE | P0 — BOUNDED |

| TD-026 | Runtime/DB | O fallback `tenant-command` não propagava o contexto completo para `withTenantTransaction`, bloqueando writes que exigem `TenantTransactionContext` | RED reproduzido no Flow 7 (`503 TRANSACTION_REQUIRED`); metadata imutável e `runInTenantTransactionContext` agora compõem a transação; helper 8/8, API 383/383, crítico 11/11 e SPA 64/64 | outras famílias de mutation e o catálogo efetivo do target ainda não foram exercitados | manter teste de contrato, regressão crítica e prova PostgreSQL alvo; Runtime/DB | P0 — RESOLVED BOUNDED |
| TD-027 | Clinical/DB | O limite de um encontro ativo por paciente dependia de mapa process-local e podia divergir entre réplicas | migration `0151` com preflight histórico fail-closed e índice parcial único; repository 5/5, PostgreSQL 7/7, módulo 32/32 e API 410/410; remediação histórica e target continuam fora | executar task humana para duplicatas históricas e repetir roles/RLS/concurrency no target; Clinical/DB/Security | P0 — BOUNDED/OPEN |

| TD-028 | Runtime/Identity | O worker agendado usava `accountId` como se fosse `UserId` quando `WORKER_REPORTS_USER_ID` não existia, e o mesmo actor explícito ainda não modela múltiplas contas | resolver compartilhado, config production-like, Secret requerido nos overlays, teste contínuo/run-once, actor persistido e processo desconhecido sem execução; worker 75/75, config 42/42, processo 12/12 e Helm 6/6 | criar mapeamento service-principal por conta e validação tenant-aware antes de ampliar relatório agendado; manter provisioning/auditoria separados e repetir target/RLS | P1 — BOUNDED/OPEN |
| TD-029 | Architecture/CI | Packages V2 podiam importar a namespace legada e criar owners ambíguos por acidente | RBAC ativo migrado para `@cvg-his-v2/rbac`; dependência stale removida de `module-fiscal`; `validate:namespaces` verifica manifests/imports canônicos e bloqueia `repository-guards`; fixture negativa cobre os dois crossings | manter o guardrail, concluir mapa de owners e autorizar aposentadoria dos packages legados separadamente | P2 — BOUNDED/OPEN |

## Ordem de pagamento da dívida

O trabalho segue a ordem P0 → P1 → P2/P3. Não será feita limpeza física ampla de `dist`, `coverage` ou `tsbuildinfo` no mesmo change-set de hardening; esses arquivos têm política e owners próprios.

## TD-008 — atualização bounded — 2026-08-26

O owner e a superfície de release foram definidos para a transição: somente
`infra/helm/cvg-his-v2` é canônico, `charts/helm` está marcado como legado e o
guard `validate:deploy-surface` impede novas referências ativas ao segundo
track. O README legado foi convertido em política não-executável, sem apagar
arquivos nem fazer rename global. A prova local passou com 68 arquivos, junto
com `deploy:check` e a validação estática de Helm.

TD-008 permanece P1 `BOUNDED/OPEN` até haver lint/template com o binário Helm,
prova no cluster/target, execução remota do CI e uma task autorizada de
alinhamento ou remoção do legado. TD-009 continua aberto pelos mesmos limites;
o guard não transforma um chart histórico em superfície operacional.

## TD-008/TD-009 — gate Helm executável — 2026-08-26

Além do guard de identidade, o CI agora instala Helm v3.15.4 com checksum
pinado e executa o validator em modo fail-closed. O validator local passou
lint/template para dev, staging e prod com o binário oficial; o modo obrigatório
rejeitou PATH sem Helm. Isso remove a possibilidade de um CI corretamente
configurado mascarar a ausência do renderizador.

TD-008 e TD-009 permanecem P1 BOUNDED/OPEN: GitHub Actions, cluster alvo,
rollout/rollback, Secrets reais e a decisão física sobre o track legado ainda
não foram observados. Artefato:
.agent/artifacts/CVG-003-helm-executable-gate-2026-08-26.md.

### Rechecagem final TD-008/TD-009 — 2026-08-26

O caminho executável foi fechado no control plane: `HELM_BIN` é usado na
descoberta e na execução, o CI instala o arquivo oficial em
`/usr/local/bin/helm`, verifica o SHA-256 e exige `REQUIRE_HELM=1`. A gramática
de versão e os caminhos de falha têm cobertura direta. A dívida permanece
P1 `BOUNDED/OPEN` até haver execução GitHub, target e decisão autorizada sobre
o track legado.

## TD-026 — rechecagem bounded — 2026-08-26

O debt foi corrigido na composição compartilhada, não mascarado na rota:
actor/correlation IDs percorrem o fallback até o contexto canônico da
transação e o guard de estoque continua fail-closed. A cobertura formal local
permanece acima de 80% e os fluxos HTTP/SPA frescos passaram.

`TD-026` é `RESOLVED BOUNDED`; a classificação não se estende a toda a
superfície de comandos, target, provider, operações ou release.

## TD-027 — unicidade de encontro ativo — 2026-08-27

O debt foi reduzido na autoridade correta: PostgreSQL agora impede dois
encontros não fechados para o mesmo `(account_id, patient_id)` e o adaptador
traduz somente a constraint nomeada em conflito de domínio. A otimização
process-local passou a respeitar a conta; reopen restaura encounter/timeline
quando a persistência conflita; a rota HTTP persiste o encontro antes de
associá-lo à fila e restaura a fila em falha.

O RED, a prova de migration/rerun, a corrida concorrente, close/reopen,
isolamento de conta, FORCE RLS, HTTP 409, regressões completas, build,
typecheck, coverage, segurança e validators estão registrados no artefato
bounded. `TD-027` permanece `P0 — BOUNDED/OPEN`: a migration é deliberadamente
fail-closed diante de duplicatas históricas, o modelo existente impede
reutilizar um UUID global de paciente entre contas e não há prova de target,
réplicas distribuídas, Redis, providers, CI remoto ou release.

Artefatos: `.agent/tasks/CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.md`,
`.agent/gates/verified-CVG-002-ENCOUNTER-ACTIVE-UNIQUENESS.json` e
`.agent/artifacts/CVG-002-encounter-active-uniqueness-2026-08-27.md`.

## TD-028 — actor explícito do worker de relatórios — 2026-08-27

O debt de identidade foi reduzido sem criar usuário, credencial ou migration:
configuração compartilhada e resolver usam o mesmo contrato RFC 4122 não-nil;
os dois entrypoints deixam de aceitar o fallback de conta; Compose e Helm
production-like consomem uma chave de Secret requerida; o processo descartável
confirma tanto a persistência do actor explícito quanto a ausência de execução
quando o actor não existe.

`TD-028` permanece `P1 — BOUNDED/OPEN`. O worker ainda recebe um UUID único
enquanto `WORKER_ACCOUNT_IDS` pode representar várias contas, e o schema
histórico de relatórios não prova a relação `(account_id, actor_id)`. Resolver
essa lacuna demanda autoridade própria para service principals, tenant-aware
validation e auditoria; não foi incluído neste slice.

Artefatos: `.agent/tasks/CVG-004-WORKER-REPORT-SERVICE-IDENTITY.md`,
`.agent/gates/verified-CVG-004-WORKER-REPORT-SERVICE-IDENTITY.json` e
`.agent/artifacts/CVG-004-worker-report-service-identity-2026-08-27.md`.

## TD-028 — rechecagem tenant-aware — 2026-08-27

O slice seguinte fecha a lacuna de pertencimento do actor sem criar
provisioning: `0152_report_service_principal_tenant_integrity.sql` amplia o
purpose allowlist, impõe FKs compostas para os três audit actors e revalida em
trigger transacional, com lock `FOR UPDATE`, que um service user ativo mantém
o propósito `report-execution` na conta dona. Resolver, continuous e run-once
compartilham a mesma fronteira e nenhum caminho usa `accountId` como actor.

As provas frescas passaram schema `4/4`, resolver/trigger `9/9`, FKs `6/6`,
processo `13/13`, regressões de entrypoint/webhook, suíte workspace, coverage
`80.45%` statements/lines, `80.19%` branches e `87.74%` functions, além de
lint, typecheck, build, segurança e validators.

`TD-028` permanece `P1 — PASS_BOUNDED/OPEN`: `WORKER_REPORTS_USER_ID` ainda é
singular enquanto `WORKER_ACCOUNT_IDS` pode ser plural, portanto a operação
deve provisionar e executar um worker por conta até existir uma configuração
de mapeamento multi-conta autorizada. Target roles/RLS, provisioning,
distributed runtime, providers, CI remoto e release não foram certificados.

Artefatos: `.agent/tasks/CVG-004-worker-report-tenant-aware-principal.md`,
`.agent/gates/verified-CVG-004-worker-report-tenant-aware-principal.json` e
`.agent/artifacts/CVG-004-worker-report-tenant-aware-principal-2026-08-27.md`.

## TD-029 — boundary de namespace canônico — 2026-08-30

O grafo canônico recebeu uma fronteira executável: manifests e imports dos
packages canônicos em `apps` e `packages` não podem apontar para
`@cvg-his/*`. A migração é deliberadamente pequena: renomeia apenas o pacote
RBAC compartilhado, remove a dependência não utilizada de fiscal e atualiza
callers, aliases, filtros e lockfile. O guard usa a AST TypeScript, cobre
imports/exports estáticos, `import()`, `require`, `require.resolve`,
`import = require` e templates, retorna detalhes por arquivo/package, ignora
comentários/strings comuns e o CI o executa como gate bloqueante.

`TD-029` permanece `P2 — BOUNDED/OPEN`: packages legados continuam presentes
por ownership explícito, a revisão independente pós-correção não retornou
aprovação e a prova local não cobre target, CI remoto, release identity ou uma
aposentadoria global.

Artefatos: `.agent/tasks/CVG-012-NAMESPACE-CANONICAL-BOUNDARY.md`,
`.agent/gates/verified-CVG-012-namespace-canonical-boundary.json` e
`.agent/artifacts/CVG-012-NAMESPACE-CANONICAL-BOUNDARY-2026-08-30.md`.
