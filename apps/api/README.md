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
