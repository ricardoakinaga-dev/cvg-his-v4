# apps/api

API principal do CVG-HIS V2.

## Responsabilidades

- autenticar requests e resolver actor
- aplicar policy de autorizacao (RBAC via AccessControlService)
- executar casos de uso por modulo
- persistir estado via Drizzle ORM (PostgreSQL)
- emitir auditoria e eventos
- expor health, readiness e liveness endpoints

## Superficie funcional

### Autenticacao e Autorizacao

- `POST /auth/login` — autenticacao com username/password
- `POST /auth/refresh` — renovacao de sessao
- `POST /auth/logout` — encerramento de sessao
- `GET /auth/session` — inspecao da sessao atual (requer auth)

### Usuarios e Equipe

- `POST /users` — criacao de usuario (admin)
- `GET /users` — listagem de usuarios
- `GET /users/:id` — inspecao de usuario
- `PATCH /users/:id` — atualizacao de usuario
- `GET /staff` — listagem de profissionais (seed-only)

### Tutores e Pacientes

- `POST /owners` — criacao de tutor
- `GET /owners` — listagem de tutores
- `POST /patients` — criacao de paciente
- `GET /patients` — listagem de pacientes
- `PATCH /patients/:id` — atualizacao de paciente

### Agendamento

- `POST /appointments` — criacao de agendamento
- `GET /appointments` — listagem de agendamentos
- `POST /queue/check-in` — check-in de paciente
- `GET /queue` — consulta da fila operacional

### Atendimento Clinico

- `POST /encounters` — abertura de atendimento
- `GET /encounters` — listagem de atendimentos
- `GET /encounters/:id` — detalhe de atendimento
- `POST /encounters/:id/transition` — transicao de status
- `POST /encounters/:id/close` — fechamento de atendimento
- `GET /encounters/:id/timeline` — timeline do atendimento

### Triagem

- `POST /triage` — registro de triagem

### Prontuario

- `GET /medical-records` — consulta de prontuario por encounter
- `POST /medical-records/entries` — criacao de entrada clinica
- `PATCH /medical-records/entries/:id` — atualizacao de entrada

### Internacao

- `POST /inpatient/admit` — admissao de paciente
- `POST /inpatient/:id/assign-bed` — atribuicao de leito
- `POST /inpatient/:id/progress` — registro de progresso
- `GET /inpatient/:id/progress` — listagem de progressos

### Cirurgia

- `POST /surgeries` — solicitacao de cirurgia
- `POST /surgeries/:id/status` — atualizacao de status

### Exames

- `POST /diagnostics/orders` — solicitacao de exame
- `POST /diagnostics/orders/:id/result` — registro de resultado

### Faturamento

- `GET /billing` — consulta de faturamento por encounter
- `POST /billing/estimate` — criacao de orcamento
- `POST /billing/items` — criacao de item faturavel
- `GET /billing/items` — listagem de itens

### Estoque e Farmacia

- `GET /inventory/items` — listagem de itens de estoque
- `POST /inventory/consumptions` — registro de consumo
- `GET /inventory/consumptions` — listagem de consumos

### Notificacoes

- `GET /notifications` — listagem de notificacoes
- `POST /notifications` — criacao de notificacao
- `POST /notifications/process` — processamento de jobs

### Auditoria

- `GET /audit/events` — listagem de eventos de auditoria

### Saude do Servico

- `GET /health` — health check
- `GET /ready` — readiness check
- `GET /live` — liveness check

## Demonstracao local e limites

Quando a API inicia sem `DATABASE_URL`, ela usa `persistenceMode: in-memory`.
Esse modo serve para demonstracao e exploracao local com dados sinteticos; o
estado dos repositorios existe apenas no processo e nao e duravel nem compartilhado
entre instancias.

- `GET /live` confirma que o processo responde. Ele nao consulta banco ou Redis.
- `GET /health` descreve a saude do servico. No fixture sem banco de
  [`src/routes/health-routes.test.ts`](src/routes/health-routes.test.ts), retorna `200` e informa `in-memory`;
  isso nao comprova persistencia.
- `GET /ready` retorna `503` no mesmo fixture: a API nao anuncia prontidao
  persistente quando banco e worker nao estao prontos.

Esses resultados sao evidencias locais do modo sem banco, nao prova de
PostgreSQL, Redis, fila compartilhada ou fluxo clinico duravel. Para executar a
API com PostgreSQL local, use `pnpm dev:api:persistent` e o preflight descrito
abaixo. O preflight e somente leitura; ele nao cria o banco nem aplica migrations.
Use um banco local dedicado e descartavel, ja preparado conforme o contrato do
projeto. A suite persistente pode gravar fixtures nesse banco.

## Stack

- Node.js 22+ (http nativo, sem framework)
- Drizzle ORM + PostgreSQL 16
- Redis 7 (worker integration)
- HMAC para tokens de sessao
- scrypt para hashing de senhas

## Execucao

```bash
# Desenvolvimento
pnpm dev:api

# Desenvolvimento usando PostgreSQL persistente (exige DATABASE_URL local)
pnpm dev:api:persistent

# Build
pnpm --filter @cvg-his-v2/api build

# Producao
NODE_ENV=production node apps/api/dist/index.js
```

## Variaveis de ambiente

- `DATABASE_URL` — conexao PostgreSQL
- `REDIS_URL` — conexao Redis
- `AUTH_SECRET` — segredo para HMAC
- `AUTH_ACCESS_TOKEN_TTL_SECONDS` — TTL do access token (default: 900)
- `AUTH_REFRESH_TOKEN_TTL_SECONDS` — TTL do refresh token (default: 604800)
- `FILE_STORAGE_PATH` — diretorio para anexos

### Exemplo de configuracao local sem credenciais reais

Para um banco de desenvolvimento local, copie este exemplo para `.env` na raiz
e substitua `cvg_local`, `REPLACE_ME` e `cvg_his_dev` pelos valores criados
somente no PostgreSQL descartavel de loopback. O exemplo nao e uma credencial
funcional; nunca versione o `.env`.

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://cvg_local:REPLACE_ME@127.0.0.1:5432/cvg_his_dev
REDIS_URL=redis://127.0.0.1:6379
```

Depois de preparar o schema no PostgreSQL 16 local, execute o preflight abaixo
antes de `pnpm dev:api:persistent`. Ele falha fechado se a URL nao for local ou
se o schema nao corresponder; este guia nao cria banco nem aplica migrations.

## Preflight e testes com banco persistente

`pnpm --filter @cvg-his/db run db:preflight` valida `DATABASE_URL` do ambiente ou
do `.env` na raiz do repositorio antes do comando `pnpm dev:api:persistent`. O
preflight aceita somente destinos loopback, valida
credenciais ao conectar com timeout limitado, exige PostgreSQL 16, confere o ledger
e os checksums de todas as migrations, e compara tabelas/colunas Drizzle. A consulta
usa uma transacao `READ ONLY`; ela nao cria o ledger, nao aplica migrations e nao
imprime a URL de conexao.

Para exercitar a suite de persistencia, configure `DATABASE_URL_TEST` para um banco
PostgreSQL 16 local, descartavel, ja existente e ja migrado, depois execute
`pnpm test:db:persistent`. O preflight roda antes da suite. Com uma URL explicita,
o setup global da suite verifica a existencia e nao reseta, migra, semeia ou remove o
banco; os proprios testes ainda podem gravar fixtures, por isso use um banco dedicado
descartavel. O comando fixa `TEST_DB_SUFFIX` vazio e `TEST_DB_EPHEMERAL=0`, para a
suite usar exatamente a URL verificada e impedir o caminho de reset. Os comandos
padrao de API e teste nao mudam para o modo persistente.
