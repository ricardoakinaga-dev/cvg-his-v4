# Relatório de auditoria documental, código e correções

**Data:** 16/08/2026 (atualização do relatório criado em 15/08/2026)
**Escopo:** documentação em `docs/`, código do monorepo, testes, CI e superfícies de deploy
**Status:** correções locais executadas; release enterprise ainda em `HOLD`

## 1. Veredito executivo

Li a documentação Markdown disponível em `docs/` — **978 arquivos**, aproximadamente **192.688 linhas** e **1,05 milhão de palavras** — e confrontei as afirmações operacionais com o worktree atual, os scripts, a configuração de CI e os gates executáveis.

A nota consolidada de qualidade técnica local é **92,8/100** (`1.671/18`). O código atual compila, passa typecheck, lint, build, testes unitários, suíte crítica, cobertura mínima, validações de contrato, RLS, segurança, guardrails de deploy e os gates browser locais executados. A suíte responsiva da SPA passou em **4/4** breakpoints; a suíte funcional SPA passou em **26/26**, a regressão visual canônica em **12/12** e a evidência visual mobile em **1/1**.

Isso não equivale a autorização de produção. O gate estrito de release continua bloqueado por três evidências que não podem ser inventadas localmente:

- execução verde do CI remoto (`RC_CI_URL`);
- restore drill real em homologação/staging (`RC_BACKUP_DRILL_REPORT`);
- deploy/cutover validado no ambiente-alvo (`RC_DEPLOY_EVIDENCE_URL`).

O bloqueio browser local foi resolvido para as suítes cobertas nesta rodada. Os snapshots canônicos foram regenerados após revisão dos diffs esperados da navegação atual e verificados em **12/12**; o cenário mobile de busca passou em **1/1** usando captura recortada da região principal, e a suíte funcional SPA não visual passou em **26/26**. Ainda é necessário repetir esses gates em CI/staging para obter evidência externa de release.

## 2. Critério de pontuação

Cada item combina aderência documental, implementação efetiva, cobertura automatizada e evidência operacional. A nota mede o estado verificável no repositório; ausência de uma evidência externa reduz a prontidão, mas não é tratada como defeito de código local. A média dos 18 itens abaixo produz a nota técnica de **92,8/100**.

## 3. Notas por item

| Item analisado | Nota | Fundamentação resumida |
| --- | ---: | --- |
| Organização e navegabilidade da documentação | **86** | A trilha viva e o arquivo histórico estão separados, mas o volume documental ainda contém referências antigas que exigem leitura contextual. |
| Coerência entre documentação e código | **86** | Frontend canônico, cadeia de migrations, runtime e staff foram reconciliados; permanecem snapshots históricos explicitamente marcados. |
| Arquitetura e modularidade | **94** | `apps/api`, `apps/worker`, `apps/spa`, módulos, shared e persistência seguem fronteiras claras e guardrails executáveis. |
| Qualidade e manutenibilidade | **92** | Typecheck, build e lint passam; houve correções de estado reativo, foco, motion e concorrência de testes. |
| Frontend e cobertura funcional | **94** | SPA canônica tem páginas, contratos e testes relevantes; funcional não visual passou em **26/26**, responsivo em **4/4**, visual em **12/12** e evidência mobile em **1/1**. |
| Backend e módulos de negócio | **96** | Rotas, serviços, repositórios e testes de domínio cobrem o núcleo enterprise documentado. |
| Worker e processamento assíncrono | **95** | Bootstrap, persistência, health/readiness e shutdown estão cobertos por código e gates de segurança. |
| Banco, schema e migrations | **96** | Cadeia canônica reconciliada até `0069_inventory_optimistic_concurrency.sql`; guardrail agora detecta automaticamente a última migration forward. |
| Multi-tenancy e RLS | **97** | Validação passou em **119/119** tabelas tenant, sem exceções documentadas. |
| Autenticação, sessões e MFA | **92** | Sessões persistentes, isolamento por conta e MFA estão implementados; smoke real com provedor/ambiente externo ainda não foi apresentado. |
| RBAC, ABAC e auditoria | **96** | Evidência executável de governança passou com **53/53** checks e auditoria operacional com **16/16**. |
| Segurança de dependências e segredos | **99** | Secret scan limpo, audit sem vulnerabilidades conhecidas na severidade configurada, SBOM íntegro e gates de CI aprovados. |
| Contratos e OpenAPI | **96** | OpenAPI válido com **294 paths**, **39 tags** e **335 schemas**; rotas extraídas permanecem verificáveis. |
| Testes, cobertura e QA | **94** | Suíte completa e crítica passam; cobertura global ficou em **81,81% statements/lines**, **82,23% functions** e **80,48% branches**; os gates SPA funcionais, responsivos e visuais locais também passaram. |
| Observabilidade e SLO | **93** | Health/readiness, SLO, auditoria e checks operacionais estão documentados e testados; falta evidência prolongada em ambiente real. |
| Deploy, backup e operação | **88** | Superfícies estáticas e rehearsal local passam; Helm CLI não está instalado e ainda faltam restore/deploy reais. |
| Paridade funcional com Vetus | **91** | Matriz executável marcou **91/100**, acima da meta 88; paridade clínica marcou **100/100** nos três fluxos avaliados. |
| Prontidão de release enterprise | **86** | Gates locais fortes, incluindo browser; o gate estrito ainda tem **3 FAIL** por evidências externas ausentes (CI remoto, restore real e deploy-alvo). |

## 4. Correções e melhorias realizadas

### SPA e experiência de navegação

- Corrigido o binding de `aria-hidden` no shell da SPA para preservar semântica booleana correta.
- Separado o fechamento da navegação mobile com e sem restauração de foco, evitando que o watcher de rota devolva foco a um elemento obsoleto.
- Corrigido o estado controlado dos grupos de navegação: uma atualização reativa causada pelo scroll não fecha mais um grupo que o usuário abriu.
- Preservada a preferência de movimento reduzido no scroll automático do item ativo.
- Ajustados testes de `AppLayout`, incluindo foco, persistência do grupo aberto e ausência de `matchMedia` no callback atrasado; o arquivo passou em **5/5** testes.

### E2E e estabilidade de testes

- A suíte responsiva ganhou helpers de clique por coordenada e espera por posição real do drawer, mantendo interação de ponteiro sem depender do heurístico instável do locator neste Chrome headless.
- O teste responsivo desativa animações apenas no contexto de teste, cobre 360, 390, 768 e 1024 px e passou em **4/4**.
- A suíte visual ganhou reset determinístico de motion, helpers de interação e rolagem determinística; os snapshots canônicos foram regenerados após revisão dos diffs e a suíte passou em **12/12**.
- O cenário `master-search-360-mobile.spec.ts` passou em **1/1**, com asserções geométricas tolerantes a subpixel e captura recortada da região principal para evidência estável.
- A suíte funcional SPA não visual passou em **26/26**, além do shell responsivo em **4/4**.
- O teste de feature flags deixou de depender da data corrente e ficou determinístico.
- A execução raiz `pnpm test` foi serializada para evitar que setups Vitest concorrentes disputem o banco PostgreSQL efêmero e derrubem testes de outros workspaces.

### Deploy, migrations e CI

- O guardrail `check-cutover-readiness.mjs` passou a descobrir a última migration forward automaticamente, ignorando arquivos `.revert.sql` e `.seed.sql`.
- O guardrail foi refatorado para exportar funções testáveis e ganhou **2/2** testes de regressão, incluindo detecção de documentação apontando migration obsoleta.
- O novo job `deploy-documentation` foi adicionado ao CI para rodar o teste do guardrail e `pnpm deploy:check`.
- A documentação de instalação, política de migrations, README da API, módulo staff e checklist de release foi reconciliada com `apps/spa`, `packages/db` e a trilha atual até `0069`.

## 5. Evidências executadas

| Gate | Resultado observado |
| --- | --- |
| `pnpm typecheck` | **PASS** — todos os workspaces |
| `pnpm build` | **PASS** — todos os apps e pacotes |
| `pnpm lint` | **PASS** — workspaces lintáveis |
| `pnpm test` | **PASS** — exit 0; 62/69 workspaces executáveis, incluindo API 253/253 e SPA 166/166 arquivos / 979/979 testes |
| `pnpm test:critical` | **PASS** — 14 arquivos, **220/220** testes |
| `pnpm test:coverage` | **PASS** — 81,81% / 82,23% / 80,48% |
| `AppLayout.test.ts` | **PASS** — 5/5 |
| `responsive-shell.spec.ts` | **PASS** — 4/4 breakpoints |
| suíte SPA funcional não visual (`--grep-invert "Visual"`) | **PASS** — 26/26 testes |
| `visual-regression.spec.ts` | **PASS** — 12/12 cenários; snapshots canônicos verificados |
| `master-search-360-mobile.spec.ts` | **PASS** — 1/1 cenário visual mobile |
| `pnpm validate:openapi` | **PASS** — 294 paths, 39 tags, 335 schemas |
| `pnpm validate:rls` | **PASS** — 119/119 tabelas tenant |
| `pnpm validate:helm` | **PASS** — validação estática; Helm CLI ausente |
| `pnpm test:database-role-script` | **PASS** — 9/9 |
| `pnpm vetus:parity` | **PASS** — 91/100 |
| `pnpm vetus:clinical-parity` | **PASS** — 100/100 nos fluxos avaliados |
| `pnpm security:enterprise` | **PASS** — secret scan e auditoria sem vulnerabilidades conhecidas |
| `pnpm security:sbom:validate` | **PASS** — CycloneDX 1.6, 976 componentes, 1.045 dependências |
| `pnpm security:ci:test` | **PASS** — 32/32 |
| `pnpm deploy:check` | **PASS** — 10/10 checks |
| `pnpm test:deployment-guardrails` | **PASS** — 2/2 |
| `pnpm rc:evidence` | **PASS advisory** — 11 PASS, 3 WARN |
| `pnpm rc:evidence:strict` | **HOLD esperado** — 11 PASS, 3 FAIL por evidências externas ausentes |

## 6. Pendências que não devem ser mascaradas

1. Preencher `RC_CI_URL` com o run verde do GitHub Actions que inclua o gate enterprise/E2E.
2. Preencher `RC_BACKUP_DRILL_REPORT` com o `restore-drill-report.json` de homologação/staging.
3. Preencher `RC_DEPLOY_EVIDENCE_URL` com o checklist e a evidência do cutover no ambiente-alvo.
4. Reexecutar a suíte E2E funcional e a regressão visual em CI/staging com navegador suportado para gerar evidência externa; os snapshots locais já foram reconciliados e verificados.
5. Executar `validate:database-role` com `DATABASE_URL` e `DATABASE_ADMIN_URL` reais em um ambiente controlado; os testes do script e a política fail-closed já passam localmente.
6. Realizar smoke de OIDC/WebAuthn, soak test, game day de backup e UAT clínico quando o ambiente de homologação estiver disponível.

## 7. Decisão

**Qualidade técnica local:** aprovada, **92,8/100**.

**Publicação enterprise:** **HOLD** até as evidências externas. O browser gate local está aprovado, mas não há base para afirmar que um deploy real, restore real ou CI remoto verde ocorreu apenas a partir do worktree local.

## 8. Arquivos principais alterados

- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/layouts/__tests__/AppLayout.test.ts`
- `e2e/spa/responsive-shell.spec.ts`
- `e2e/spa/visual/visual-regression.spec.ts`
- `infra/scripts/check-cutover-readiness.mjs`
- `infra/scripts/check-cutover-readiness.test.mjs`
- `.github/workflows/ci.yml`
- `package.json`
- documentação viva de instalação, migrations, testes, staff, release e índice de `docs/`
