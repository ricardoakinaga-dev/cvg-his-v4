# CVG-HIS V2

Monorepo do sistema HIS veterinário versão 2, construido em padrão Enterprise.

## Arquitetura Canonica

O V2 define uma arquitetura clara com as seguintes trilhas:

| App       | Caminho       | Descricao                |
| --------- | ------------- | ------------------------ |
| API V2    | `apps/api`    | API HTTP com Fastify     |
| Web V2    | `apps/web`    | Node.js HTTP server com HTML inline |
| Worker V2 | `apps/worker` | Processamento assincrono |

### Legado Removido

Os apps `apps/his-api`, `apps/his-web` e `apps/his-worker` foram removidos do repositório para evitar confusão operacional.

Todo desenvolvimento e deploy ativo devem usar apenas:

- `apps/api`
- `apps/web`
- `apps/worker`

Ver `docs/adr/ADR-003-arquitetura-canonica-v2.md` e `docs/adr/ADR-007-frontend-canonico-v2.md`.

## Deploy do V2 Real

Se o objetivo e publicar o sistema que realmente foi construido no roadmap enterprise, use a trilha canonica:

- `apps/api`
- `apps/web`
- `apps/worker`

Nao existe mais trilha `apps/his-*` no repositório.

### Regra de imagem canonica

Para evitar que o agente instale a imagem errada do programa antigo, a regra operacional passa a ser:

- a stack correta do projeto atual e **somente** a definida em `docker-compose.v2.yml`
- as imagens corretas da aplicacao sao **somente** as imagens construidas a partir dos Dockerfiles atuais:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
  - `apps/worker/Dockerfile`
- os servicos corretos da stack atual sao:
  - `cvg-his-v2-api`
  - `cvg-his-v2-web`
  - `cvg-his-v2-worker`
- o agente **nunca** deve tentar instalar, subir, reutilizar ou dar pull em qualquer imagem/container legado com nomes como:
  - `cvg-his-api`
  - `cvg-his-web`
  - `cvg-his-worker`
  - qualquer trilha `apps/his-*`

Importante:

- o `docker-compose.v2.yml` usa `build:` para a aplicacao; portanto a imagem correta deve ser gerada **a partir do codigo atual do repositório**, e nao reaproveitada de stack antiga
- se houver qualquer duvida entre imagem antiga e imagem atual, a resposta correta e sempre: **usar apenas `docker-compose.v2.yml` + `.env.v2` + Dockerfiles atuais**

### Sequencia obrigatoria para evitar imagem antiga

Antes de subir a stack do V2 real, o agente deve seguir esta ordem:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
```

Se o agente usar qualquer compose diferente, qualquer imagem legada ou qualquer nome antigo de servico, o deploy deve ser considerado incorreto.

Documentos operacionais diretos:

- [OPENCLAW_DEPLOY_DIRETRIZES.md](/root/.openclaw/workspace/cvg-his-v2/OPENCLAW_DEPLOY_DIRETRIZES.md) - diretrizes obrigatorias para o OpenClaw executar deploy, migrations e validacoes sem ambiguidade
- [INSTALACAO_V2_OPENCLAW.md](/root/.openclaw/workspace/cvg-his-v2/INSTALACAO_V2_OPENCLAW.md) - guia rapido na raiz para OpenClaw localizar stack, compose e migrations canonicas
- [docs/130-instalacao-publicacao-cvg-his-v2-real.md](/root/.openclaw/workspace/cvg-his-v2/docs/130-instalacao-publicacao-cvg-his-v2-real.md) - guia completo de instalacao e publicacao do V2 real
- [docs/131-checklist-cutover-servidor.md](/root/.openclaw/workspace/cvg-his-v2/docs/131-checklist-cutover-servidor.md) - checklist comando por comando para executar o cutover no servidor

Arquivos prontos para deploy:

- [docker-compose.v2.yml](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml)
- [.env.v2.example](/root/.openclaw/workspace/cvg-his-v2/.env.v2.example)
- [infra/scripts/cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)
- [infra/docker/Caddyfile.v2](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2)

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
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his_v2 \
FILE_STORAGE_PATH=/tmp/cvg-his-v2-staging \
AUTH_SECRET=change-me \
NODE_ENV=staging \
pnpm staging:check

# Bootstrap local de dependencias reais
pnpm staging:bootstrap
```

Observacao:

- `pnpm release:check` depende de PostgreSQL acessivel para `apps/api test:db`
- se o banco nao estiver previamente disponivel, `infra/scripts/prepare-test-db.mjs` tenta subir `postgres` via Docker usando `docker-compose.dev.yml`
- em ambientes restritos sem acesso ao Docker socket, o gate pode bloquear mesmo sem regressao de codigo
- `docker-compose.dev.yml` agora contem apenas `postgres` e `redis` para o V2

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
curl -I http://localhost:3001/
```

Mapa operacional da stack V2 real:

- `cvg-his-v2-api` exposto em `localhost:3000` -> porta interna `3001`
- `cvg-his-v2-web` exposto em `localhost:3001` -> porta interna `3000`
- `cvg-his-v2-worker` sem porta HTTP publica

## Documentacao

- `docs/README.md` - Indice de documentacao
- `docs/900-executive-audit-backlog.md` - Backlog de auditoria executiva
- `docs/112-target-architecture.md` - Arquitetura alvo
- `docs/phased-execution-plan.md` - Plano de execucao por fase
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md` - Instalacao e publicacao do V2 real
- `docs/131-checklist-cutover-servidor.md` - Checklist de cutover no servidor

## Convencoes

- TypeScript strict mode em todos os workspaces
- Commits atômicos com escopo claro
- PRs com validacao automatica (build, typecheck, tests)
- Documentacao atualizada junto com codigo
