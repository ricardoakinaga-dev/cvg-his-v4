# Plano de Implementação — Consolidação CVG-HIS V4

**Data:** 2026-08-25  
**Estado:** Fases 0–3 concluídas; Fase 4 em execução  
**Plano adaptativo:** cada fase preserva evidência e pode parar sem quebrar a trilha canônica.

## Fases e gates

| Fase | Estado | Entrega | Gate |
|---|---|---|---|
| 0. Recuperação | DONE | instruções, state, backlog, plano antigo e histórico lidos | estado reproduzido |
| 1. Discovery | DONE | mapa de apps, packages, DB, RLS, runtime, CI, Helm, parity e docs | auditoria/riscos/dívida publicados |
| 2. Especificação | DONE | PRD, SPEC, quality bar e decisão de primeiro slice | implementation-ready |
| 3. Hardening operacional S1–S3 | DONE — bounded | checksum, healthcheck explícito, shutdown, process/PG evidence | focused/process/PG tests + critic |
| 4. Guardrails de consolidação | IN_PROGRESS — bounded | CI gates, test setup lock e fonte única de migration; mapa de namespace/release/Helm ainda aberto | graph/config/CI/migration-source evidence |
| 5. Núcleo clínico | DONE — bounded | vertical HTTP 11/11 cobre admissão→care/internação→alta→close→receipt e inclui cenário com Owner/Patient/Encounter criados via HTTP levando os mesmos registros até billing/stock/receipt, com replay e tenant boundary | PostgreSQL/audit/idempotência |
| 6. Parity e providers | TODO | laboratório, fiscal, financeiro, reports, marketing, integrations | cenários reais/homologação |
| 7. DR/ops/cutover | IN_PROGRESS — bounded | fixture restore drill executado com evidência de checksums/TOC/globals/banco/storage; restore representativo, RTO/RPO e cutover ainda faltam | target environment approval |
| 8. Final validation | TODO | relatório final com limitações e roadmap | verdict PASS/CONDITIONAL/FAIL |

## Ordem imediata

1. escrever testes RED para S1 e S2/S3;
2. implementar o mínimo compatível;
3. rodar package/focused/process tests;
4. rodar typecheck, lint, build e validators;
5. obter crítica independente read-only;
6. corrigir somente os gaps relevantes encontrados;
7. atualizar risk register, technical debt e evidências.

## Estado de implementação em 2026-08-25

- S1: implementado em `packages/db/src/migrate.ts`, com validação pura de checksum e teste real de mismatch sem aplicar migration posterior.
- S2: healthcheck `/ready` declarado no serviço API do Compose.
- S3: API e worker têm shutdown idempotente, drain/readiness e testes em processos reais.
- CI: `repository-guards` agora executa validators, process test, migration integrity, RLS/roles, bootstrap production-like e clinical-financial vertical 11/11 com PostgreSQL isolado; o job `unit-tests` também sobe/desce PostgreSQL e exige `REQUIRE_TEST_DB=1`; execução remota ainda não ocorreu.
- DB-001/DB-002: `packages/db/src/migrate.ts`/`seed.ts` são a única superfície executável de migration/seed; `packages/shared/database` preserva o cliente runtime e SQL histórica, mas seus comandos `db:*` falham fechado; lockfile removeu `drizzle-kit`, a família source-level stale (`migrate.js`, companions `.d.ts`/`.map` e `drizzle.config.ts`) foi removida e CI usa `pnpm exec tsx packages/db/src/migrate.ts`.
- Testes: `pnpm test` completo passou nos 70 projetos selecionados após `docker-compose.test.yml` reservar `shm_size: '1gb'` para `postgres-test`; inspeção confirmou `OOM=false`, `exit=0`. Duas suites DB concorrentes com `REQUIRE_TEST_DB=1` também passaram após o lock administrativo; a execução remota ainda precisa ser observada.

## Decisões de escopo

- nenhuma migration aplicada será reescrita;
- nenhuma limpeza destrutiva de artefatos gerados;
- nenhuma publicação externa automática nesta fase;
- sem commit/push automático desta consolidação até a revisão final e autorização explícita do usuário;
- falhas históricas fora do slice serão preservadas como limitações, especialmente laboratório 201/202 e parity.

## Dependências e bloqueios externos

- provider/sandbox/certificados para homologação;
- PostgreSQL/Redis e ambiente alvo para provas de RLS, failover e restore;
- decisão humana sobre release identity, Vault obrigatório, Helm alternativo e aceitação residual;
- fonte comportamental Vetus para os domínios ainda sem equivalência verificável.

## Próximo passo executável

Manter o orçamento de shared memory no CI e observar o workflow remoto; depois
repetir a vertical clínica completa no alvo e executar o restore com bundle
representativo antes de qualquer cutover. O DB-001 está bounded localmente,
mas migration positiva nova, catálogo RLS/FORCE RLS alvo, providers, Redis,
parity, WCAG, cobertura, operações e release continuam sem promoção.

## Continuação CVG-001 — browser/axe

O próximo gap local foi fechado de forma bounded: `e2e/spa/setup-wizard-accessibility.spec.ts`
é executado no Chromium contra a SPA construída e foi incluído no comando focado
`test:e2e:spa:setup` e no conjunto enterprise do workflow. O teste passa 2/2 após
`vue-tsc`/Vite, com axe WCAG 2A/2AA, teclado, foco, nome do formulário e limpeza
visual de credenciais. A fronteira HTTP do teste é interceptada de propósito;
persistência e sessão permanecem no processo PostgreSQL/two-API.

O primeiro RED do axe detectou contraste insuficiente no token claro
`#718198`; o token foi corrigido para `#475569` e a execução seguinte passou.
O próximo gap autorizado permanece a extensão para jornadas browser reais e
Redis/failover; target RLS/FORCE RLS, restore/RTO-RPO, parity, provider e CI
remoto continuam dependências externas.

### Fechamento do checkpoint browser/axe

Após a crítica independente, a especificação passou a compartilhar asserções
estritas para status, sucesso e retry: URL/origem exatas, método, ausência de
cookie e payload completo. O texto contextual também recebeu cor opaca
`#f8fafc`, e o `finally` do submit limpa token, senha e confirmação em qualquer
resultado.

`pnpm test:e2e:spa:setup` passou 4/4 em Chromium; SetupPage passou 8/8,
DsInput 9/9 e SPA typecheck/build passaram. Kepler fez a re-revisão read-only e
retornou `APPROVE_BOUNDED` sem HIGH/MEDIUM. O spec está selecionado tanto no
script focado quanto no job SPA enterprise do CI. O resultado não altera os
gates ainda abertos de journeys amplas, RLS alvo, Redis, DR, parity, cobertura,
operações ou release.

### Continuação browser enterprise e clínica

O gate enterprise selecionado no CI passou 15/15 e a jornada crítica separada
Owner → Patient → Encounter → clínica → billing → fechamento passou 1/1.
Agendamento passou 2/2 e internação 2/2. A suite adjacente de billing passou
5/6; sua quitação falha no harness local default porque a API em memória não
instala o repositório de cash receipt. O modo persistente não foi executável no
PostgreSQL local sem seed `user_admin`. Não alterar o produto para mascarar essa
diferença: a próxima prova autorizada é o E2E Docker/CI seedado.
