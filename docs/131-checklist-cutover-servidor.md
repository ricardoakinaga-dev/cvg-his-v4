# Checklist de Cutover no Servidor — CVG-HIS V2

Data atualizacao: 2026-03-27

## Objetivo

Este documento lista, em ordem exata, os comandos para executar o cutover do stack legado para o **CVG-HIS V2 real** no servidor.

Premissas:

- o repositório já está no servidor
- o arquivo [.env.v2](/root/.openclaw/workspace/cvg-his-v2/.env.v2) já existe
- o deploy alvo usa:
  - [docker-compose.v2.yml](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml)
  - [cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)

## 1. Entrar no projeto

```bash
cd /root/.openclaw/workspace/cvg-his-v2
```

## 2. Revisar o `.env.v2`

```bash
sed -n '1,220p' .env.v2
```

## 3. Corrigir a senha do PostgreSQL no `.env.v2`

```bash
nano .env.v2
```

Ponto minimo:

- ajustar `POSTGRES_PASSWORD`

## 4. Garantir permissão de execução no script

```bash
chmod +x infra/scripts/cutover-v2.sh
```

## 5. Validar o compose do V2 com o env novo

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
```

Resultado esperado:

- o comando deve expandir o compose sem erro

## 6. Subir o stack V2

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d --build
```

Resultado esperado:

- `postgres`
- `redis`
- `cvg-his-v2-api`
- `cvg-his-v2-web`
- `cvg-his-v2-worker`

## 7. Aplicar o schema do V2 no banco novo

Substitua `SUA_SENHA` pela senha real do `.env.v2`.

```bash
psql "postgres://postgres:SUA_SENHA@127.0.0.1:5432/cvg_his_v2" -f packages/shared/database/src/migrations/001_initial_schema.sql
psql "postgres://postgres:SUA_SENHA@127.0.0.1:5432/cvg_his_v2" -f packages/shared/database/src/migrations/002_entry_revisions.sql
psql "postgres://postgres:SUA_SENHA@127.0.0.1:5432/cvg_his_v2" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
psql "postgres://postgres:SUA_SENHA@127.0.0.1:5432/cvg_his_v2" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
```

## 8. Validar containers

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
```

Resultado esperado:

- containers em `Up`
- API com healthcheck saudável

## 9. Validar saúde da API

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready
curl http://127.0.0.1:3001/live
```

Resultado esperado:

- `health` com `ok`
- `ready` com `ready: true`
- `live` com resposta positiva

## 10. Validar web

```bash
curl -I http://127.0.0.1:3000/
```

Resultado esperado:

- resposta HTTP do web V2

## 11. Validar staging mínimo

```bash
DATABASE_URL=postgres://postgres:SUA_SENHA@127.0.0.1:5432/cvg_his_v2 \
FILE_STORAGE_PATH=/srv/cvg-his-v2/storage \
AUTH_SECRET="$(grep '^AUTH_SECRET=' .env.v2 | cut -d= -f2-)" \
NODE_ENV=staging \
pnpm staging:check
```

Resultado esperado:

- `staging:check` em verde

## 12. Executar o cutover assistido

```bash
infra/scripts/cutover-v2.sh
```

O script vai:

1. validar `.env.v2`
2. validar o `docker-compose.v2.yml`
3. salvar snapshot operacional
4. subir o stack V2
5. aplicar migrations
6. validar `/health`, `/ready` e web root

## 13. Se quiser já trocar o Caddy no mesmo passo

```bash
ENABLE_CADDY_SWITCH=true \
CADDYFILE_TARGET=/etc/caddy/Caddyfile \
infra/scripts/cutover-v2.sh
```

Use isso apenas quando:

- o V2 já estiver validado localmente no host
- a troca de proxy estiver autorizada

## 14. Se quiser parar o legado após validar o V2

```bash
STOP_LEGACY_AFTER_SUCCESS=true \
LEGACY_CONTAINERS_TO_STOP='cvg-his-api cvg-his-web cvg-his-worker' \
infra/scripts/cutover-v2.sh
```

Use isso apenas quando:

- o V2 já tiver sido validado
- o rollback imediato ainda estiver claro

## 15. Validar após o cutover

```bash
curl -I http://his.centroveterinarioguarapiranga.com
curl http://his-api.centroveterinarioguarapiranga.com/health
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-web
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker
```

Checklist visual minimo:

- login abre
- dashboard carrega
- web responde pelo dominio final
- API responde por `/health`
- worker fica estável

## 16. Rollback rápido

Se o V2 falhar após o cutover:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down
systemctl reload caddy
```

Observacao:

- o rollback real depende de restaurar o proxy para o alvo anterior
- o backup operacional gerado por `cutover-v2.sh` deve ser preservado

## 17. Arquivos usados neste checklist

- [130-instalacao-publicacao-cvg-his-v2-real.md](/root/.openclaw/workspace/cvg-his-v2/docs/130-instalacao-publicacao-cvg-his-v2-real.md)
- [docker-compose.v2.yml](/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml)
- [.env.v2](/root/.openclaw/workspace/cvg-his-v2/.env.v2)
- [cutover-v2.sh](/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh)
- [Caddyfile.v2](/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2)

## 18. Veredito

Se voce executar este checklist em ordem:

1. valida o stack V2 real
2. sobe o V2 em paralelo
3. confirma a saude antes do cutover
4. troca o proxy somente depois da validacao
5. preserva caminho de rollback

Esse e o caminho correto para substituir o deploy legado pelo **CVG-HIS V2 real**.
