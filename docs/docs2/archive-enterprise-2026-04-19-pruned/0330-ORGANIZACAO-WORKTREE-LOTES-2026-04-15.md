# 0330 - Organizacao do Worktree em Lotes - 2026-04-15

**Data UTC:** `2026-04-15`  
**Objetivo:** reduzir ruido operacional do worktree atual e transformar o estado sujo em lotes coerentes, rastreaveis e stageaveis sem misturar infraestrutura, produto, docs e artefatos gerados.

---

## 1. Snapshot atual

- total de entradas no worktree: `239`
- modificados rastreados: `138`
- nao rastreados: `101`
- artefatos `tsconfig.tsbuildinfo` modificados: `38`
- ruido local removido do `git status`: `.claude/` agora entra em `.git/info/exclude`

Leitura operacional:

- o problema principal nao e uma unica feature quebrada, e mistura de trilhas
- o maior bloco vivo esta em `apps/api + packages/modules + packages/shared + packages/db`
- existe um lote SPA isolavel
- existe um lote claro de plataforma/docs (`charts`, `infra/helm`, `docs/Enterprise`)
- existe ruido gerado suficiente para contaminar qualquer revisao se ele nao for tratado separado

---

## 2. Lotes propostos

### Lote A - Runtime Core e Infra de Aplicacao

Escopo:

- `apps/api/src/index.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/server.ts`
- `apps/api/src/health.ts`
- `apps/api/src/metrics.ts`
- `apps/api/src/payment-gateway.ts`
- `apps/api/src/runtime-repositories.ts`
- `apps/worker/**`
- `packages/shared/config/**`
- `packages/shared/database/**`
- `packages/shared/rate-limiter/**`
- `packages/tenant-context/**`
- `packages/secrets/**`
- `vitest.config.ts`
- `pnpm-lock.yaml`

Racional:

- concentra bootstrap, runtime, CORS, tenant context, observabilidade e gates locais
- e o lote mais sensivel para release e para regressao de runtime

Comando de staging sugerido:

```bash
git add apps/api/src/index.ts apps/api/src/runtime.ts apps/api/src/server.ts apps/api/src/health.ts apps/api/src/metrics.ts apps/api/src/payment-gateway.ts apps/api/src/runtime-repositories.ts apps/worker packages/shared/config packages/shared/database packages/shared/rate-limiter packages/tenant-context packages/secrets vitest.config.ts pnpm-lock.yaml
```

### Lote B - Banco, Schema Canonico e Feature Flags

Escopo:

- `packages/db/**`
- `packages/modules/feature-flags/**`
- `packages/shared/feature-flags/**`
- `packages/modules/fiscal/src/database-fiscal.repository.ts`
- `packages/modules/pix/src/index.ts`

Racional:

- junta migrations, schema novo, provider de feature flags e persistencia correlata
- evita misturar mudanca estrutural de banco com refactor de rota ou UI

Comando de staging sugerido:

```bash
git add packages/db packages/modules/feature-flags packages/shared/feature-flags packages/modules/fiscal/src/database-fiscal.repository.ts packages/modules/pix/src/index.ts
```

### Lote C - Modulos de Dominio e Rotas da API

Escopo:

- `apps/api/src/routes/**`
- `apps/api/src/http/**`
- `apps/api/src/consumers/**`
- `apps/api/src/repositories/**`
- `apps/api/src/feature-flags.ts`
- `apps/api/src/pix-transaction-repository.ts`
- `packages/modules/**`
- `tests/unit/api/**`
- `tests/integration/prescriptions-api.test.ts`

Racional:

- concentra a expansao funcional real do backend
- e o lote mais denso do worktree e deve ser tratado separado de docs/helm

Comando de staging sugerido:

```bash
git add apps/api/src/routes apps/api/src/http apps/api/src/consumers apps/api/src/repositories apps/api/src/feature-flags.ts apps/api/src/pix-transaction-repository.ts packages/modules tests/unit/api tests/integration/prescriptions-api.test.ts
```

### Lote D - SPA e Fluxos de Cadastro/Agenda

Escopo:

- `apps/spa/src/components/appointments/**`
- `apps/spa/src/pages/appointments/**`
- `apps/spa/src/pages/owners/**`
- `apps/spa/src/pages/patients/**`
- `apps/spa/src/services/owner.ts`
- `apps/spa/src/services/patient.ts`
- `apps/spa/src/types/owner.ts`
- `apps/spa/src/types/patient.ts`
- `apps/spa/vite.config.ts`

Racional:

- lote de frontend bem delimitado
- mexe em agenda, tutores e pacientes sem depender de helm/docs

Comando de staging sugerido:

```bash
git add apps/spa/src/components/appointments apps/spa/src/pages/appointments apps/spa/src/pages/owners apps/spa/src/pages/patients apps/spa/src/services/owner.ts apps/spa/src/services/patient.ts apps/spa/src/types/owner.ts apps/spa/src/types/patient.ts apps/spa/vite.config.ts
```

### Lote E - Plataforma, Helm, CI e Benchmark

Escopo:

- `charts/**`
- `infra/helm/**`
- `.github/workflows/ci.yml`
- `benchmarks/k6/api-benchmark.js`

Racional:

- separa infraestrutura de deploy e QA operacional do codigo de produto

Comando de staging sugerido:

```bash
git add charts infra/helm .github/workflows/ci.yml benchmarks/k6/api-benchmark.js
```

### Lote F - Documentacao e Backlog Executivo

Escopo:

- `docs/Enterprise/**`
- `docs/adr/**`
- `docs/game-day/**`
- `docs/ENTERPRISE-BUILD-REPORT.md`

Racional:

- isola narrativa, auditoria, roadmap e backlog
- evita que doc review se misture com runtime review

Comando de staging sugerido:

```bash
git add docs/Enterprise docs/adr docs/game-day docs/ENTERPRISE-BUILD-REPORT.md
```

### Lote G - Artefatos Gerados e Metadados Volateis

Escopo:

- todos os `**/tsconfig.tsbuildinfo`
- `packages/db/migrations/meta/_journal.json`

Racional:

- este lote nao deve ser revisado junto com regra de negocio
- e o principal gerador de ruido visual do worktree atual

Tratamento recomendado:

- nao misturar com lotes A-F
- revisar se realmente precisa versionar antes de qualquer commit
- se entrar em commit, que seja isolado e explicitamente marcado como artefato gerado

Comando de inspeção sugerido:

```bash
git status --short | rg 'tsconfig\.tsbuildinfo|migrations/meta/_journal\.json'
```

---

## 3. Ordem operacional recomendada

1. fechar `Lote A` porque ele afeta runtime, CORS, login, coverage e gates
2. fechar `Lote B` porque schema e feature flags mexem em compatibilidade estrutural
3. fechar `Lote C` porque e o maior bloco funcional de backend
4. fechar `Lote D` porque a SPA fica mais facil de revisar depois do backend estabilizado
5. fechar `Lote E` separado como infra
6. fechar `Lote F` por ultimo, com narrativa coerente com o codigo real
7. decidir conscientemente o destino do `Lote G`

---

## 4. Evidencia de reducao de ruido

- `.claude/` saiu do radar do `git status` local
- o worktree passou a ter particionamento explicito por responsabilidade
- os proximos commits podem ser montados por lote sem recatalogar manualmente as `239` entradas
- artefatos gerados ficaram explicitamente classificados como lote proprio em vez de contaminarem revisao funcional

---

## 5. Criterio de conclusao do GAP-004

Considero o `GAP-004` concluido quando:

- o worktree deixa de ser tratado como bloco unico
- existe inventario executavel dos lotes
- existe trilha clara para staging/revisao por responsabilidade
- o ruido local obvio deixa de aparecer no status

Este documento atende esses quatro criterios.
