# CVG-HIS V2

Monorepo do sistema HIS veterinário versão 2, construido em padrão Enterprise.

## Arquitetura Canonica

O V2 define uma arquitetura clara com as seguintes trilhas:

| App       | Caminho       | Descricao                |
| --------- | ------------- | ------------------------ |
| API V2    | `apps/api`    | API HTTP com Fastify     |
| Web V2    | `apps/web`    | Node.js HTTP server com HTML inline |
| Worker V2 | `apps/worker` | Processamento assincrono |

### Legado Arquivado

Os apps `apps/his-api`, `apps/his-web` e `apps/his-worker` foram **arquivados**.

**Motivo**: O V2 foi redesenhado com fronteiras de dominio mais claras.

**Destino**: Todo desenvolvimento ativo deve usar `apps/api`, `apps/web` e `apps/worker`.

Ver `docs/adr/ADR-003-arquitetura-canonica-v2.md` e `docs/adr/ADR-007-frontend-canonico-v2.md`.

## Modulos

### Packages Canonicos

| Package           | Caminho                      | Descricao            |
| ----------------- | ---------------------------- | -------------------- |
| shared-types      | `packages/shared/types`      | Tipos compartilhados |
| shared-contracts  | `packages/shared/contracts`  | Contratos de API     |
| shared-validation | `packages/shared/validation` | Validacoes           |
| shared-utils      | `packages/shared/utils`      | Utilitarios          |
| shared-errors     | `packages/shared/errors`     | Erros customizados   |

### Modulos de Domínio

| Modulo          | Caminho                            | Dominio      |
| --------------- | ---------------------------------- | ------------ |
| auth            | `packages/modules/auth`            | Autenticacao |
| users           | `packages/modules/users`           | Usuarios     |
| staff           | `packages/modules/staff`           | Equipe       |
| access-control  | `packages/modules/access-control`  | Autorizacao  |
| audit           | `packages/modules/audit`           | Auditoria    |
| owners          | `packages/modules/owners`          | Tutores      |
| patients        | `packages/modules/patients`        | Pacientes    |
| scheduling      | `packages/modules/scheduling`      | Agenda       |
| triage          | `packages/modules/triage`          | Triagem      |
| encounters      | `packages/modules/encounters`      | Episodios    |
| medical-records | `packages/modules/medical-records` | Prontuario   |
| attachments     | `packages/modules/attachments`     | Anexos       |
| inpatient       | `packages/modules/inpatient`       | Internacao   |
| surgery         | `packages/modules/surgery`         | Cirurgia     |
| diagnostics     | `packages/modules/diagnostics`     | Diagnosticos |
| billing         | `packages/modules/billing`         | Cobranca     |
| inventory       | `packages/modules/inventory`       | Estoque      |
| notifications   | `packages/modules/notifications`   | Notificacoes |

## Como Rodar

### Instalar Dependencias

```bash
pnpm install
```

### Desenvolvimento

```bash
# Todos os apps
pnpm dev

# API apenas
pnpm dev:api

# Web apenas
pnpm dev:web

# Worker apenas
pnpm dev:worker
```

### Build

```bash
pnpm build
```

### Typecheck

```bash
pnpm typecheck
```

### Testes

```bash
pnpm test
pnpm test:all
pnpm release:check
```

### Release / Staging

```bash
# Gate oficial de release
pnpm release:check

# Validacao minima de staging
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his \
FILE_STORAGE_PATH=/tmp/cvg-his-v2-staging \
AUTH_SECRET=change-me \
NODE_ENV=staging \
pnpm staging:check

# Bootstrap local de dependencias reais
pnpm staging:bootstrap
```

Observacao:

- `pnpm release:check` depende de PostgreSQL acessivel para `apps/api test:db`
- se o banco nao estiver previamente disponivel, `infra/scripts/prepare-test-db.mjs` tenta subir `postgres` via Docker
- em ambientes restritos sem acesso ao Docker socket, o gate pode bloquear mesmo sem regressao de codigo

## Fases Implementadas

| Fase | Escopo                   | Status      |
| ---- | ------------------------ | ----------- |
| 0    | Congelamento estrategico | OK          |
| 1    | Fundacao documental      | OK          |
| 2    | Monorepo                 | OK          |
| 3    | Identidade e acesso      | OK          |
| 4    | Cadastro mestre          | OK          |
| 5    | Atendimento              | OK          |
| 6    | Prontuario clinico       | OK          |
| 7    | Operacao avancada        | OK          |
| 8    | Administrativo           | OK          |
| 9    | Migracao                 | Documentado |

Ver `docs/README.md` para indice completo de documentacao.

## Ambiente

### Variaveis de Ambiente

| Variavel     | Descricao               |
| ------------ | ----------------------- |
| DATABASE_URL | URL do banco PostgreSQL |
| REDIS_URL    | URL do Redis            |
| AUTH_SECRET  | Segredo de autenticacao |

### Healthcheck

```bash
curl http://localhost:3000/health
```

## Documentacao

- `docs/README.md` - Indice de documentacao
- `docs/900-executive-audit-backlog.md` - Backlog de auditoria executiva
- `docs/112-target-architecture.md` - Arquitetura alvo
- `docs/phased-execution-plan.md` - Plano de execucao por fase

## Convencoes

- TypeScript strict mode em todos os workspaces
- Commits atômicos com escopo claro
- PRs com validacao automatica (build, typecheck, tests)
- Documentacao atualizada junto com codigo
