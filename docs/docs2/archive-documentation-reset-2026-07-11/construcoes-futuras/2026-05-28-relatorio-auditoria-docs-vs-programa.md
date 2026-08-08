# Relatorio de Auditoria - Docs vs Programa

**Data:** 2026-05-28  
**Escopo:** comparacao entre `docs/`, `docs/Enterprise/` e o codigo atual do clone em `/home/ricardo/.openclaw/workspace/cvg-his-v4`.  
**Nota consolidada:** **77/100**

## Resumo Executivo

O sistema tem uma base enterprise real, com monorepo estruturado, API ampla, SPA grande, worker, migrations, RLS, integracoes, OpenAPI e muitos testes.

O principal bloqueio atual e que os gates de typecheck falham em API, SPA e worker. Por isso, o estado atual nao sustenta as notas mais altas documentadas em parte da trilha viva.

Leitura recomendada: **homologacao avancada / producao assistida com risco**, ainda nao **producao enterprise plena**.

## Notas Por Item

| Item analisado | Nota | Leitura objetiva |
|---|---:|---|
| Documentacao viva | 78 | Rica e bem organizada, mas contraditoria: ha docs falando em 90-96, enquanto `docs/630-avaliacao-atual-e-plano-producao-enterprise.md` ja recalcula para 84 por gates quebrados. |
| Aderencia docs vs codigo | 74 | Boa aderencia estrutural, mas as notas documentais estao acima do que o clone passa hoje. |
| Arquitetura monorepo | 88 | Estrutura bate com a arquitetura alvo: `apps/api`, `apps/spa`, `apps/worker`, `packages/modules`, DB e infra. |
| Frontend SPA | 70 | SPA ampla, muitas paginas e testes; so foi encontrada 1 rota placeholder real. Porem `pnpm --filter @cvg-his-v2/spa typecheck` falha com muitos erros. |
| Backend API | 74 | API grande e OpenAPI valido com 234 paths, mas `pnpm --filter @cvg-his-v2/api typecheck` falha no build de `shared-contracts`. |
| Worker | 62 | Worker existe com health, metrics e jobs, mas `pnpm --filter @cvg-his-v2/worker typecheck` falha por imports internos nao resolvidos e erros implicitos. |
| OpenAPI e contratos | 82 | `pnpm validate:openapi` passou: 234 paths, 35 tags, 230 schemas. Contratos TS ainda quebram no typecheck. |
| Auth, MFA, OIDC, WebAuthn | 86 | Rotas e modulos existem em `auth-routes.ts`, com MFA/OIDC/WebAuthn. Falta gate verde global. |
| RBAC/ABAC e governanca de acesso | 84 | Modulo e rotas existem; `docs/500-modulo-access-control.md` e bem detalhado. Ainda depende de validacao fim a fim. |
| Multi-tenancy e RLS | 88 | Forte: migrations RLS, `account_id`, testes RLS comerciais e clinicos. |
| Banco e migrations | 87 | 51 arquivos de migration; inclui comercial, billing, handoff, RLS, notificacoes e scheduling queue. |
| Clinico core | 80 | Encounters, triage, medical records, inpatient, diagnostics, surgery e prescriptions existem. Ainda ha gaps de validacao/E2E em fluxos criticos. |
| Scheduling/fila | 84 | Melhorou bastante: queue persistida e state machine documentada em `docs/504-modulo-scheduling.md`. Gate TS impede nota maior. |
| Billing, financeiro e fiscal | 77 | Superficie grande em API/SPA; fiscal e financeiro avancaram. Ainda ha maturidade desigual e typecheck falhando. |
| Estoque e comercial/Vetus | 76 | Existem loyalty, price tables, POS sync, RLS comercial e telas. A documentacao Enterprise antiga apontava gaps; o codigo avancou, mas gates nao comprovam estabilidade. |
| Integracoes externas | 82 | Email, SMS, WhatsApp, Google Calendar, webhooks, PIX/cards aparecem no codigo e testes. Producao real depende de credenciais e ambiente. |
| AI/ML | 75 | Ha modulo ML, smart scheduling, OCR, forecast e anomalias, mas parece mais funcionalidade inicial do que operacao madura. |
| Observabilidade e SLOs | 80 | Health, metrics, SLOs e scripts existem. Stack observavel real em producao nao foi validada. |
| Plataforma/deploy/Helm | 73 | Docker, Helm e cutover existem. Helm nao foi executado nesta auditoria; docs anteriores registravam falha ambiental por ausencia de `helm`. |
| Seguranca e segredos | 80 | Ha secretlint, semgrep, startup secrets e politica de rotacao. Secret scan completo nao foi executado nesta auditoria. |
| QA, testes e gates | 58 | Principal problema: typecheck de API, SPA e worker falha. Existem 361 arquivos de teste/spec, mas gate quebrado derruba a nota. |

## Evidencias Executadas

| Comando | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm validate:openapi` | PASS - OpenAPI valido com 234 paths, 35 tags e 230 schemas |
| `pnpm --filter @cvg-his-v2/api typecheck` | FAIL - imports internos em `packages/shared/contracts` |
| `pnpm --filter @cvg-his-v2/spa typecheck` | FAIL - multiplos erros de tipos/imports em paginas e services |
| `pnpm --filter @cvg-his-v2/worker typecheck` | FAIL - imports internos nao resolvidos e parametros implicitos |

## Principais Gaps

1. Corrigir resolucao/build dos pacotes internos para permitir `pnpm typecheck` verde na raiz.
2. Corrigir erros de tipagem da SPA, especialmente imports para `shared-types`, `shared-contracts` e `shared-auth-sdk`.
3. Corrigir typecheck do worker, incluindo dependencias internas e parametros implicitos.
4. Revalidar `pnpm build`, `pnpm test`, `pnpm test:coverage` e E2E depois do typecheck.
5. Atualizar documentos de score para refletir o estado real atual, evitando convivencia de notas 90-96 com gates quebrados.

## Veredito

O projeto esta bem mais avancado que um skeleton e tem base enterprise real. No estado atual do clone, a classificacao mais defensavel e:

**Homologacao avancada / producao assistida com risco.**

Para comunicar como producao enterprise plena, o primeiro corte obrigatorio e deixar `pnpm typecheck` verde na raiz. Sem isso, qualquer score acima de 80 fica fragil.
