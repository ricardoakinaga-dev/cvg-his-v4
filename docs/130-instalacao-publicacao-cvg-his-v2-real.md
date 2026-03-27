# Instalacao e Publicacao do Modulo Real CVG-HIS V2

Data atualizacao: 2026-03-27

## Objetivo

Este documento descreve o caminho correto para publicar o **CVG-HIS V2 real**.

O V2 canonico e composto por:

- `apps/api`
- `apps/web`
- `apps/worker`

Os apps abaixo sao **legado arquivado** e nao devem ser usados como trilha principal de deploy:

- `apps/his-api`
- `apps/his-web`
- `apps/his-worker`

## 1. Diferenca entre legado e V2 real

### Legado arquivado

- Stack: `apps/his-api` + `apps/his-web` + `apps/his-worker`
- Motivo para nao usar:
  - nao e a trilha principal do projeto
  - nao reflete o backlog enterprise executado
  - ja ficou para tras em relacao a runtime, persistencia e dominio

### V2 real

- API: [apps/api](/root/.openclaw/workspace/cvg-his-v2/apps/api)
- Web: [apps/web](/root/.openclaw/workspace/cvg-his-v2/apps/web)
- Worker: [apps/worker](/root/.openclaw/workspace/cvg-his-v2/apps/worker)

Este e o stack que concentra:

- runtime principal
- persistencia real
- prontuario endurecido
- operacao assistencial avancada
- gate oficial `release:check`

## 2. Arquitetura de deploy recomendada

### Servicos

- `PostgreSQL`
- `Redis`
- `apps/api`
- `apps/web`
- `apps/worker`
- reverse proxy (`Caddy`, `Nginx` ou equivalente)

### Portas sugeridas

- API V2: `3001`
- Web V2: `3000`
- PostgreSQL: `5432`
- Redis: `6379`

### Fluxo

1. usuario acessa o `apps/web`
2. `apps/web` chama o `apps/api` por `API_BASE_URL`
3. `apps/api` usa PostgreSQL como persistencia real
4. `apps/worker` consome a mesma base e processa jobs/notificacoes

## 3. Requisitos minimos

- Ubuntu/Debian ou equivalente Linux
- Node.js `22+`
- `pnpm` `10`
- PostgreSQL `16+`
- Redis `7+`
- acesso de escrita ao path de anexos do V2

## 4. Variaveis de ambiente obrigatorias

### API V2

Obrigatorias:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `REDIS_URL=redis://HOST:6379`
- `AUTH_SECRET=<segredo forte com 32+ caracteres>`
- `FILE_STORAGE_PATH=/srv/cvg-his-v2/storage`

Opcionais uteis:

- `APP_NAME=cvg-his-v2-api`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS=900`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS=604800`

### Web V2

Obrigatorias:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3000`
- `API_BASE_URL=http://127.0.0.1:3001`

Opcionais uteis:

- `APP_NAME=cvg-his-v2-web`

### Worker V2

Obrigatorias:

- `NODE_ENV=production`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`

Opcionais uteis:

- `APP_NAME=cvg-his-v2-worker`
- `WORKER_INTERVAL_MS=5000`

## 5. Preparacao do servidor

### 5.1. Clonar e instalar

```bash
git clone https://github.com/ricardoakinaga-dev/cvg-his-v2.git
cd cvg-his-v2
pnpm install
```

### 5.2. Criar diretório de anexos

```bash
mkdir -p /srv/cvg-his-v2/storage
chmod 750 /srv/cvg-his-v2/storage
```

### 5.3. Gerar segredo forte

```bash
openssl rand -hex 32
```

## 6. Banco de dados do V2 real

## 6.1. Criar banco

Exemplo:

```bash
createdb cvg_his_v2
```

Ou via `psql`:

```bash
psql -U postgres -d postgres -c 'CREATE DATABASE cvg_his_v2;'
```

## 6.2. Aplicar schema e migrations

Hoje o repositório usa SQL versionado em:

- [001_initial_schema.sql](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/001_initial_schema.sql)
- [002_entry_revisions.sql](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/002_entry_revisions.sql)
- [003_advanced_care_persistence.sql](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/003_advanced_care_persistence.sql)
- [004_clinical_entry_governance.sql](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/migrations/004_clinical_entry_governance.sql)

Aplicacao sugerida:

```bash
psql "postgres://USER:PASS@HOST:5432/cvg_his_v2" -f packages/shared/database/src/migrations/001_initial_schema.sql
psql "postgres://USER:PASS@HOST:5432/cvg_his_v2" -f packages/shared/database/src/migrations/002_entry_revisions.sql
psql "postgres://USER:PASS@HOST:5432/cvg_his_v2" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
psql "postgres://USER:PASS@HOST:5432/cvg_his_v2" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
```

## 6.3. Validacao minima do banco

```bash
psql "postgres://USER:PASS@HOST:5432/cvg_his_v2" -c '\dt'
```

O banco deve conter, no minimo, tabelas como:

- `sessions`
- `audit_events`
- `owners`
- `patients`
- `encounters`
- `medical_records`
- `clinical_entries`
- `clinical_timeline`
- `entry_revisions`
- `attachments`
- `notifications`
- `inpatient_stays`
- `surgery_cases`
- `diagnostic_orders`

## 7. Build do V2 real

```bash
pnpm build
```

Validacoes recomendadas antes do deploy:

```bash
pnpm typecheck
pnpm build
pnpm test
```

Se houver PostgreSQL acessivel:

```bash
SKIP_DB_SETUP=true DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 pnpm --filter @cvg-his-v2/api run test:db
pnpm release:check
```

## 8. Execucao manual do V2 real

## 8.1. API

```bash
NODE_ENV=production \
HOST=0.0.0.0 \
PORT=3001 \
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
REDIS_URL=redis://HOST:6379 \
AUTH_SECRET='SEU_SEGREDO_FORTE_COM_32+_CHARS' \
FILE_STORAGE_PATH=/srv/cvg-his-v2/storage \
node apps/api/dist/index.js
```

## 8.2. Web

```bash
NODE_ENV=production \
HOST=0.0.0.0 \
PORT=3000 \
API_BASE_URL=http://127.0.0.1:3001 \
node apps/web/dist/index.js
```

## 8.3. Worker

```bash
NODE_ENV=production \
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
WORKER_INTERVAL_MS=5000 \
node apps/worker/dist/index.js
```

## 9. Exemplo com systemd

## 9.1. API

Arquivo: `/etc/systemd/system/cvg-his-v2-api.service`

```ini
[Unit]
Description=CVG HIS V2 API
After=network.target postgresql.service redis.service

[Service]
Type=simple
WorkingDirectory=/opt/cvg-his-v2
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=3001
Environment=DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2
Environment=REDIS_URL=redis://HOST:6379
Environment=AUTH_SECRET=SEU_SEGREDO_FORTE_COM_32+_CHARS
Environment=FILE_STORAGE_PATH=/srv/cvg-his-v2/storage
ExecStart=/usr/bin/node /opt/cvg-his-v2/apps/api/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 9.2. Web

Arquivo: `/etc/systemd/system/cvg-his-v2-web.service`

```ini
[Unit]
Description=CVG HIS V2 Web
After=network.target cvg-his-v2-api.service

[Service]
Type=simple
WorkingDirectory=/opt/cvg-his-v2
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=3000
Environment=API_BASE_URL=http://127.0.0.1:3001
ExecStart=/usr/bin/node /opt/cvg-his-v2/apps/web/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 9.3. Worker

Arquivo: `/etc/systemd/system/cvg-his-v2-worker.service`

```ini
[Unit]
Description=CVG HIS V2 Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
WorkingDirectory=/opt/cvg-his-v2
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2
Environment=WORKER_INTERVAL_MS=5000
ExecStart=/usr/bin/node /opt/cvg-his-v2/apps/worker/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ativacao:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cvg-his-v2-api
sudo systemctl enable --now cvg-his-v2-web
sudo systemctl enable --now cvg-his-v2-worker
```

## 10. Reverse proxy

### Caddy exemplo

```caddy
his.centroveterinarioguarapiranga.com {
  reverse_proxy 127.0.0.1:3000
}

his-api.centroveterinarioguarapiranga.com {
  reverse_proxy 127.0.0.1:3001
}
```

Recomendacao:

- publicar o usuario final pelo `apps/web`
- restringir o dominio da API para uso interno ou administrativo

## 11. Validacao pos-instalacao

### API

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready
curl http://127.0.0.1:3001/live
```

### Web

```bash
curl -I http://127.0.0.1:3000/
```

### Gate minimo

```bash
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
FILE_STORAGE_PATH=/srv/cvg-his-v2/storage \
AUTH_SECRET='SEU_SEGREDO_FORTE_COM_32+_CHARS' \
NODE_ENV=staging \
pnpm staging:check
```

## 12. Plano cirurgico de troca do deploy legado para o V2

### Etapa 1. Congelar o legado

No host atual:

1. identificar onde o legado esta rodando
2. exportar envs atuais
3. registrar portas e proxy atual
4. tirar backup do banco legado antes de qualquer mudanca

### Etapa 2. Subir o V2 em portas separadas

Suba primeiro em portas internas sem trocar o dominio:

- V2 Web: `3000`
- V2 API: `3001`

Nao derrube o legado ainda.

### Etapa 3. Validar o V2 isolado

Checklist minimo:

1. `/health` da API responde
2. `/ready` da API responde
3. login no V2 funciona
4. dashboard inicial carrega
5. cadastro de tutor/paciente funciona
6. worker sobe sem crash
7. prontuario e anexos funcionam

### Etapa 4. Trocar o proxy

Quando o V2 estiver validado:

1. apontar o dominio principal para `apps/web`
2. se quiser, apontar subdominio tecnico para `apps/api`
3. manter o legado desligado, mas preservado por curto periodo para rollback

### Etapa 5. Observar

Durante a primeira janela pos-cutover:

1. acompanhar logs da API
2. acompanhar logs do worker
3. acompanhar uso de storage
4. validar latencia e erros

## 13. Rollback

Se o V2 falhar no cutover:

1. restaurar o proxy para o legado
2. parar os servicos V2
3. manter o banco V2 isolado
4. nao reaproveitar parcialmente runtime do legado com frontend do V2

## 14. O que nao fazer

- nao publicar `apps/his-api`, `apps/his-web` e `apps/his-worker` como se fossem o V2 real
- nao misturar frontend legado com API V2
- nao usar `AUTH_SECRET` inseguro em `staging` ou `production`
- nao depender de estado in-memory como base operacional
- nao fazer cutover sem validar `/health`, `/ready`, login e worker

## 15. Comando de referencia rapido

### Bootstrap local de dependencias

```bash
pnpm staging:bootstrap
```

### Validacao de staging

```bash
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
FILE_STORAGE_PATH=/srv/cvg-his-v2/storage \
AUTH_SECRET='SEU_SEGREDO_FORTE_COM_32+_CHARS' \
NODE_ENV=staging \
pnpm staging:check
```

### Gate oficial

```bash
pnpm release:check
```

## 16. Veredito

Se o objetivo e colocar no ar o que foi realmente construido no projeto, o deploy correto nao e o stack `his-*`.

O deploy correto e:

- `apps/api`
- `apps/web`
- `apps/worker`

Este documento deve ser usado como base para a troca definitiva do legado para o V2 real.

## 17. Arquivos prontos gerados nesta etapa

Artefatos prontos para uso no servidor:

- [docker-compose.v2.yml](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml)
- [.env.v2.example](/root/.openclaw/workspace/cvg-his-v2/.env.v2.example)
- [apps/api/Dockerfile](/root/.openclaw/workspace/cvg-his-v2/apps/api/Dockerfile)
- [apps/web/Dockerfile](/root/.openclaw/workspace/cvg-his-v2/apps/web/Dockerfile)
- [apps/worker/Dockerfile](/root/.openclaw/workspace/cvg-his-v2/apps/worker/Dockerfile)
- [infra/docker/Caddyfile.v2](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2)
- [infra/systemd/cvg-his-v2-api.service](/root/.openclaw/workspace/cvg-his-v2/infra/systemd/cvg-his-v2-api.service)
- [infra/systemd/cvg-his-v2-web.service](/root/.openclaw/workspace/cvg-his-v2/infra/systemd/cvg-his-v2-web.service)
- [infra/systemd/cvg-his-v2-worker.service](/root/.openclaw/workspace/cvg-his-v2/infra/systemd/cvg-his-v2-worker.service)
- [infra/scripts/cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)

## 18. Script unico de cutover

O repositório agora possui um script unico para executar a troca do legado para o V2:

- [cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)

### O que o script faz

1. valida pre-requisitos
2. carrega `.env.v2`
3. valida o `docker-compose.v2.yml`
4. salva snapshot do estado atual dos containers
5. opcionalmente faz dump do banco legado se `LEGACY_DB_URL` estiver definido
6. sobe o stack V2 com Docker
7. aplica schema/migrations do V2
8. valida:
   - `/health`
   - `/ready`
   - web root
9. opcionalmente troca o `Caddy`
10. opcionalmente para os containers legados

### Uso basico

```bash
chmod +x infra/scripts/cutover-v2.sh
cp .env.v2.example .env.v2
# editar .env.v2
infra/scripts/cutover-v2.sh
```

### Com backup do banco legado

```bash
LEGACY_DB_URL='postgres://USER:PASS@HOST:5432/legacy_db' \
infra/scripts/cutover-v2.sh
```

### Com troca do Caddy

```bash
ENABLE_CADDY_SWITCH=true \
CADDYFILE_TARGET=/etc/caddy/Caddyfile \
infra/scripts/cutover-v2.sh
```

### Parando containers legados apos validacao

```bash
STOP_LEGACY_AFTER_SUCCESS=true \
LEGACY_CONTAINERS_TO_STOP='cvg-his-api cvg-his-web cvg-his-worker' \
infra/scripts/cutover-v2.sh
```

### Observacao importante

O script foi desenhado para ser seguro por padrao:

- ele nao troca o `Caddy` automaticamente
- ele nao para o legado automaticamente

Essas acoes so acontecem se voce habilitar explicitamente por variavel de ambiente.
