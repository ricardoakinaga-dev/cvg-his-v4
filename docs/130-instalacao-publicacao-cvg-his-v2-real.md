# 130 - Instalacao e Publicacao do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-12
**Ultima atualizacao:** 2026-04-12 — config fail-fast, security baseline e rotacao de segredos

## Escopo

Este documento descreve a trilha oficial para instalar e publicar o stack canonico do V2:

- `apps/api`
- `apps/worker`
- `apps/spa` **— frontend canonico do sistema**

## Regra central

Nao usar trilhas `apps/his-*` como deploy oficial.

Nao reutilizar imagens, containers ou nomes de servico legados do programa antigo.

**O frontend canonico e `apps/spa`** — nao `apps/web`.

## Stack oficial obrigatoria

O deploy oficial do projeto atual usa exclusivamente:

- `docker-compose.v2.yml`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/spa/Dockerfile`

Os nomes de servico validos da stack atual sao:

- `cvg-his-v2-api`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa` **— frontend canonico (apps/spa)**

Nao usar como runtime oficial:

- `cvg-his-api`
- `cvg-his-web`
- `cvg-his-worker`
- qualquer trilha `apps/his-*`
- qualquer imagem antiga reaproveitada de build anterior

## Requisitos minimos

- Linux
- Node.js `22+`
- `pnpm` `10`
- PostgreSQL `16+`
- Redis `7+`
- diretorio de storage com escrita para anexos

## Variaveis de ambiente principais

### API

- `NODE_ENV=production`
- `APP_NAME=cvg-his-v2-api`
- `HOST=0.0.0.0`
- `PORT=3001`
- `CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `REDIS_URL=redis://HOST:6379` (no host process usando o compose canonico, o
  exemplo `.env.v2.example` usa `localhost:6380`; dentro dos containers a URL
  continua `redis://redis:6379`)
- `RUNTIME_DISTRIBUTED_STATE_ENABLED=1` (obrigatorio para rate limiting e estado distribuido em production/staging)
- `AUTH_SECRET=<segredo forte>`
- `FILE_STORAGE_PATH=/srv/cvg-his-v2/storage`
- `ENABLE_MFA=false`
- `MFA_SECRET_ENCRYPTION_KEY=<obrigatorio se ENABLE_MFA=true>`
- `MFA_SECRET_ENCRYPTION_KEY_VERSION=<versao da chave atual>`
- `MFA_SECRET_ENCRYPTION_KEYRING_JSON=<JSON versao:chave para leitura durante rotacao>`
- `OTEL_ENABLED=false`
- `OTEL_SERVICE_NAME=cvg-his-v2-api`
- `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces`
- `OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer <token>`

### Worker

- `NODE_ENV=production`
- `APP_NAME=cvg-his-v2-worker`
- `DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2`
- `WORKER_INTERVAL_MS=5000`
- `WORKER_HEALTH_PORT=3002`
- `OTEL_ENABLED=false`
- `OTEL_SERVICE_NAME=cvg-his-v2-worker`
- `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces`

### SPA (frontend canonico)

- `NODE_ENV=production`
- `PORT=3002`
- `VITE_API_BASE_URL=` para mesma origem ou `http://localhost:3001`
- `VITE_PROXY_API_TARGET=http://localhost:3001`
- `VITE_APP_NAME=CVG HIS V2`
- `VITE_DISABLE_PWA=0`

### Regra de validacao

- API, worker e SPA usam validacao central de configuracao em `@cvg-his-v2/shared-config`
- configuracao invalida ou ausente falha cedo no bootstrap/build
- em `production`, `staging`, `prod` e `stage`, a API exige `CORS_ALLOWED_ORIGINS` explicita
- HSTS so e emitido quando a requisicao chega como HTTPS real ou `x-forwarded-proto=https`
- quando `OTEL_ENABLED=true`, API e worker exigem `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- a fundacao atual de OTLP usa `http/protobuf`

### Baseline de seguranca pre-deploy

- executar `pnpm security:secrets` antes de promover alteracoes
- validar que `CORS_ALLOWED_ORIGINS` contem apenas origens reais do frontend
- garantir que o proxy reverso envia `x-forwarded-proto=https` no ambiente TLS
- validar `OTEL_ENABLED`, `OTEL_SERVICE_NAME` e `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` antes do deploy observavel
- nao publicar com placeholders em `POSTGRES_PASSWORD`, `AUTH_SECRET` ou chaves de integracao
- manter `.env.v2` apenas no host ou pipeline autorizado

### Variaveis operacionais de backup

- `BACKUP_BASE_DIR=/var/backups/cvg-his-v2`
- `BACKUP_RETENTION_DAYS=7`
- `BACKUP_INCLUDE_STORAGE=true`

## Build e validacao local

```bash
pnpm install
pnpm security:secrets
pnpm typecheck
pnpm build
pnpm test
```

## Politica de migrations

### Trilha oficial: Drizzle ORM

A trilha oficial de persistencia e migracao do CVG-HIS V2 e o Drizzle ORM.

- **Migrations:** `packages/db/migrations/`
- **Manifesto de fases:** `docs/phase-9-migration-manifest.json` (plano de ondas; nao substitui a execucao do runner)
- **Schema:** `packages/db/src/schema/`
- **Seed local sintetico:** `packages/db/src/seed.ts` (nao usar como bootstrap de staging/producao)
- **Runner:** `tsx packages/db/src/migrate.ts`

A cadeia viva inicia em `0000_vengeful_pet_avengers.sql` e evolui por migrations
ordenadas no mesmo diretorio. Nao congele neste runbook o numero da ultima
migration: o runner oficial `packages/db/src/migrate.ts` aplica automaticamente
todas as migrations `.sql` em ordem, ignorando arquivos `.revert.sql` e `.seed.sql`.
O contrato de auditoria estrutural inclui
`packages/db/migrations/0012_audit_events_alignment.sql`; a referencia serve
para validar a trilha canonica e nao e uma declaracao de que um ambiente alvo
ja foi migrado.

### Aplicacao em producao

```bash
# Aplicar migration Drizzle
DATABASE_URL=postgres://USER:PASS@HOST:5432/cvg_his_v2 \
  tsx packages/db/src/migrate.ts

# Antes de subir a API de uma instalacao vazia, fornecer por secret manager:
export SETUP_BOOTSTRAP_TOKEN="$(openssl rand -hex 32)"
```

Depois do deploy, conclua o assistente `/setup` e remova o segredo do ambiente.
O contrato completo esta em `docs/2026-08-10-primeiro-acesso-super-admin.md`.

### Trilha SQL legacy (deprecada)

Os arquivos em `packages/shared/database/src/migrations/001-016` sao classificados como **legados/deprecados**. Nao usar para novos deploys.

## Docker Compose

Arquivo:

- `docker-compose.v2.yml`

### Sequencia operacional recomendada

Para evitar reaproveitamento acidental de imagem antiga, usar a sequencia abaixo:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB npx tsx packages/db/src/migrate.ts
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

Essa e a trilha recomendada para garantir que o agente construa a stack atual do V2 e nao uma imagem residual do legado.

Guardrail recomendado antes da publicacao:

```bash
pnpm deploy:check
```

### Checklist de seguranca antes do `up`

1. Confirmar `NODE_ENV=production` nos servicos de runtime.
2. Confirmar `CORS_ALLOWED_ORIGINS` com os dominios oficiais do frontend.
3. Confirmar `AUTH_SECRET` forte e fora de qualquer valor placeholder.
4. Confirmar `MFA_SECRET_ENCRYPTION_KEY` presente se `ENABLE_MFA=true`.
5. Confirmar `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` quando `OTEL_ENABLED=true`.
6. Confirmar segredos de banco, Redis e integracoes carregados fora do repositório.
7. Executar `pnpm security:secrets`.

### Portas publicadas

| Servico       | Porta interna | Porta externa | Acesso                      |
|---------------|--------------|--------------|----------------------------|
| SPA (canonico)| 3002         | 3002         | `http://host:3002`         |
| API           | 3001         | 3003         | `http://host:3003`         |
| PostgreSQL    | 5432         | 5432         | `host:5432`                 |
| Redis         | 6379         | 6380         | `host:6380`                 |

**Importante:**

- porta externa `3002` e a SPA (frontend canonico) — e o que o dominio principal publica
- porta externa `3003` e a API

O proxy reverso (Caddy) aponta:

- `his.centroveterinarioguarapiranga.com` → `127.0.0.1:3002` (SPA — frontend canonico)
- `his-api.centroveterinarioguarapiranga.com` → `127.0.0.1:3003` (API)

**Validacao pos-deploy da SPA (frontend canonico):**

> Nota de escopo: esta correcao atualiza somente a identificacao e a validacao da
> SPA. Nao representa recertificacao do deploy e nao altera a data de validacao
> deste documento.

A identidade da release nao deve ser inferida pelo `<title>` nem por um nome de
chunk Vite presumido. Use a origem autorizada do ambiente e as URLs exatas
referenciadas pelo HTML servido e pelas requisicoes observadas no Network do
navegador:

1. Abra a origem autorizada da SPA no navegador, habilite **Disable cache** no
   Network e recarregue `/`. Registre o `src` dos scripts e o `href` dos modulepreload
   referenciados pelo HTML e os URLs JavaScript efetivamente solicitados ao
   navegar pelas rotas do smoke. Nao construa nomes de chunks nem use curingas.
2. Para cada URL registrada, valide status HTTP `200`, `Content-Type` de
   JavaScript/ECMAScript e corpo JavaScript real, nao HTML. Um fallback pode
   devolver `index.html` com status `200` para um asset inexistente; por isso o
   status deve ser conferido por URL junto com o tipo e o conteudo.
3. Registre o SHA-256 de cada resposta e compare-o com a identidade do artefato
   e o hash constantes no manifesto/evidencia de release aprovado. O hash
   calculado localmente, isoladamente, nao aprova a release.

Exemplo reproduzivel depois de copiar para `ASSET_URLS` somente os URLs exatos
vistos no HTML/Network (sem inventar nomes remotos):

```bash
set -eu
evidence_dir="$(mktemp -d)"
index_headers="$evidence_dir/index.headers"
index_body="$evidence_dir/index.html"
index_status="$(curl -sS -D "$index_headers" -o "$index_body" -w '%{http_code}' '<origem-autorizada-do-ambiente>/')"
test "$index_status" = 200
grep -Eiq '^Content-Type:.*text/html' "$index_headers"

ASSET_URLS=(
  '<URL exata copiada do HTML ou Network>'
  # inclua aqui cada URL JavaScript realmente observado no smoke
)
asset_number=0
for asset_url in "${ASSET_URLS[@]}"; do
  asset_number=$((asset_number + 1))
  asset_headers="$evidence_dir/asset-${asset_number}.headers"
  asset_body="$evidence_dir/asset-${asset_number}.mjs"
  asset_status="$(curl -sS -D "$asset_headers" -o "$asset_body" -w '%{http_code}' "$asset_url")"
  test "$asset_status" = 200
  grep -Eiq '^Content-Type:.*(javascript|ecmascript)' "$asset_headers"
  if grep -Eiq '^[[:space:]]*(<!doctype[[:space:]]+html|<html([[:space:]>]|$))' "$asset_body"; then
    echo 'Asset devolveu HTML; validacao interrompida.' >&2
    exit 1
  fi
  node --check "$asset_body"
  sha256sum "$asset_body"
done
```

Com uma conta de teste autorizada, conclua no navegador um smoke real de `/`,
`/login`, `/api-keys`, `/access-control`, `/audit` e `/lgpd`, alem das rotas ou
aliases de compatibilidade exigidos pela release. Recarregue diretamente ao
menos uma rota protegida e confirme a tela esperada, ausencia de erros no
console e carregamento dos recursos observados sem resposta HTML no lugar de
JavaScript. Registre URLs, status, tipos, hashes, artefato aprovado e rotas
exercitadas; qualquer divergencia interrompe a validacao.

## Artefatos operacionais oficiais

- `docker-compose.v2.yml`
- `.env.v2.example`
- `infra/docker/Caddyfile.v2`
- `infra/scripts/backup-v2.sh`
- `infra/systemd/cvg-his-v2-api.service`
- `infra/systemd/cvg-his-v2-worker.service`
- `infra/systemd/cvg-his-v2-spa.service`
- `infra/scripts/cutover-v2.sh`
- `docs/Enterprise/0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md`

## Validacoes minimas pos-subida

```bash
# API health checks (porta externa 3003)
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl http://127.0.0.1:3003/live

# SPA availability (porta externa 3002 — frontend canonico)
curl -I http://127.0.0.1:3002/
```

## Backup operacional

Comando raiz:

```bash
pnpm ops:backup:v2
```

Restore drill oficial:

```bash
pnpm ops:restore:drill:v2
```

Execucao direta:

```bash
BACKUP_BASE_DIR=/var/backups/cvg-his-v2 \
BACKUP_RETENTION_DAYS=7 \
BACKUP_INCLUDE_STORAGE=true \
bash infra/scripts/backup-v2.sh
```

Saida esperada por execucao:

- `database/<db>.dump` em formato `pg_dump --format=custom`
- `database/postgres-globals.sql`
- `storage/file-storage.tar.gz`
- `meta/manifest.json`
- `meta/restore-hints.txt`
- `SHA256SUMS`

Validacao minima do backup:

```bash
docker run --rm -v /var/backups/cvg-his-v2/<backup-id>:/backup postgres:16-alpine \
  pg_restore -l /backup/database/cvg_his_v2.dump

tar -tzf /var/backups/cvg-his-v2/<backup-id>/storage/file-storage.tar.gz | head
```

Validacao minima de restore:

```bash
pnpm ops:restore:drill:v2 -- <backup-id>

# evidência gerada em:
ls /tmp/cvg-his-v2-restore-drills/
```

Saída esperada do restore drill:

- checksums verificados com `sha256sum -c`
- `postgres-globals.sql` aplicado em Postgres descartável
- dump lógico restaurado em banco temporário
- `restored-public-tables.txt` com tabelas públicas recuperadas
- restore do storage em workspace temporário
- diff vazio entre `file-storage.contents.txt` e o conteúdo restaurado

## Segredos e rotacao

Regras operacionais:

- rotacionar `AUTH_SECRET`, credenciais de banco, Redis e integracoes no minimo a cada `90` dias
- rotacionar `MFA_SECRET_ENCRYPTION_KEY` em janela controlada semestral
- durante a rotacao, publicar a nova chave/versao para escrita e manter as versoes antigas em `MFA_SECRET_ENCRYPTION_KEYRING_JSON` ate a recriptografia das credenciais; versoes desconhecidas falham fechadas
- executar rotacao imediata em caso de vazamento, incidente, troca de operador ou restauracao de ambiente
- registrar evidencia operacional de cada rotacao

Fonte oficial:

- `docs/Enterprise/0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md`

## Readiness operacional

### API pronta

A API e considerada pronta quando `/ready` retorna 200 com:

- `persistenceMode` = `database`
- `databaseHealthy` = `true`
- `repositoriesReady` = `true` (17+ repositorios)
- `workerReady` = `true`
- `productionReady` = `true`

### Worker pronto

O worker e considerado pronto quando:

- `DATABASE_URL` configurado
- `databaseHealthy` = `true` no bootstrap
- `notificationRepository` disponivel
- Loop de ticks executa sem erro por 5+ minutos

### SPA pronta

A SPA e considerada pronta quando:

- Servidor HTTP responde na porta configurada (3002)
- Homepage (`/`) retorna 200 com `index.html` da SPA (apps/spa)
- Os scripts e chunks JavaScript realmente referenciados pelo HTML/Network
  passam a validacao de status, tipo, conteudo nao-HTML e hash do artefato
  aprovado descrita acima
- O smoke real no navegador confirma as rotas da SPA e os aliases de
  compatibilidade exigidos pela release

Para os contratos vigentes de release e cutover, ver
[identidade de release e deploy](engineering/RELEASE_IDENTITY.md) e
[checklist de cutover no servidor](131-checklist-cutover-servidor.md).

## Regra de seguranca operacional

- nao considerar deploy valido se banco, compose e documentacao estiverem divergentes
- nao executar cutover com migrations parciais
- nao misturar frontend legado com API V2
- nao usar fallback in-memory como base de producao
- **o dominio principal DEVE servir a SPA (apps/spa)**

**Regra anti-regressao:**

Antes de validar o deploy, SEMPRE executar a validacao pos-deploy acima: usar
somente URLs JavaScript reais capturadas do HTML/Network, conferir `200`,
`Content-Type`, corpo nao-HTML e o hash contra o artefato aprovado, e concluir
o smoke real das rotas da SPA. Nao considerar o `<title>` ou a existencia de um
nome de chunk presumido como evidencia de identidade; se qualquer verificacao
falhar, interromper a validacao e investigar o roteamento/artefato.

## Fonte complementar

Para a politica vigente de migrations, compatibilidade e rollback, ver
[instalacao, upgrade e rollback](engineering/INSTALL_UPGRADE_ROLLBACK.md).
Para a convergencia de trilhas, ver
[superficie canonica de deploy e migracao](132-superficie-canonica-deploy-e-migracao.md).
Os antigos documentos470 e520 estao no arquivo historico, nao na raiz viva de `docs/`.
