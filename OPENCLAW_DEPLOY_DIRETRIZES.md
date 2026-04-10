# Diretrizes de Deploy do CVG-HIS V2 para OpenClaw

Este documento define a trilha obrigatoria para instalar, atualizar imagens e publicar o `CVG-HIS V2` sem ambiguidade.

## 1. Fonte de verdade obrigatoria

O OpenClaw deve considerar como canonico, para deploy da stack atual:

- `docker-compose.v2.yml`
- `.env.v2` derivado de `.env.v2.example`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/spa/Dockerfile`
- `packages/db/src/migrate.ts`
- `packages/db/src/seed.ts`
- `README.md`
- `INSTALACAO_V2_OPENCLAW.md`

Para bootstrap local de dependencia:

- `docker-compose.dev.yml`

## 2. O que e proibido

O OpenClaw nao deve usar:

- qualquer trilha `apps/his-*`
- qualquer imagem `cvg-his-api`, `cvg-his-web`, `cvg-his-worker`
- qualquer compose legado para publicar a stack atual
- qualquer SQL de `packages/shared/database/src/migrations/*.sql` como caminho principal de deploy
- qualquer `npm install` isolado por app para publicacao
- qualquer imagem antiga presente no host como atalho para deploy

Se houver conflito entre artefato antigo e `docker-compose.v2.yml`, vence sempre `docker-compose.v2.yml`.

## 3. Servicos corretos da stack atual

Os servicos corretos no compose atual sao:

- `postgres`
- `redis`
- `cvg-his-v2-api`
- `cvg-his-v2-web`
- `cvg-his-v2-worker`
- `cvg-his-v2-spa`

Mapeamento externo atual:

- API: `3003:3001`
- Web: `3004:3000`
- SPA: `3002:3002`
- Postgres: `5432:5432`
- Redis: `6380:6379`
- Worker: sem porta publicada

Consequencia operacional:

- health da API deve ser validado em `http://127.0.0.1:3003/health`
- ready da API deve ser validado em `http://127.0.0.1:3003/ready`
- Web deve ser validado em `http://127.0.0.1:3004/`
- SPA deve ser validada em `http://127.0.0.1:3002/`
- Worker deve ser validado por `docker compose ps` e logs, a menos que a porta seja publicada explicitamente

## 4. Variaveis de ambiente obrigatorias

O arquivo real de deploy deve ser `.env.v2`, gerado a partir de `.env.v2.example`.

Minimo obrigatorio:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `WORKER_INTERVAL_MS`

Regras:

- `POSTGRES_PASSWORD` nao pode ficar no placeholder
- `AUTH_SECRET` deve ter pelo menos 32 caracteres validos
- nao invente variaveis nao exigidas pelo compose sem necessidade operacional clara
- se houver proxy ou dominio, eles devem ser tratados fora do compose atual, com configuracao explicitamente alinhada

## 5. Regra oficial de migrations

O deploy atual deve aplicar schema apenas por:

- [`packages/db/src/migrate.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/db/src/migrate.ts)

E seed inicial apenas por:

- [`packages/db/src/seed.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/db/src/seed.ts)

O OpenClaw nao deve misturar:

- `packages/db/src/migrate.ts`
- `packages/shared/database/src/migrations/*.sql`

Para deploy atual, o caminho correto e `packages/db`.

## 6. Ordem obrigatoria de instalacao e deploy

O OpenClaw deve seguir exatamente esta ordem:

1. gerar `.env.v2` a partir de `.env.v2.example`
2. preencher segredos e credenciais reais
3. validar o compose com `docker compose ... config`
4. derrubar a stack V2 antiga com `down --remove-orphans`
5. reconstruir explicitamente as imagens V2 corretas
6. subir primeiro `postgres` e `redis`
7. aguardar `postgres` e `redis` saudaveis
8. aplicar migrations com `packages/db/src/migrate.ts`
9. aplicar seed apenas se for necessario e intencional
10. subir `cvg-his-v2-api`, `cvg-his-v2-web`, `cvg-his-v2-worker` e `cvg-his-v2-spa`
11. validar API, Web, SPA, logs e estado dos containers
12. so depois disso alinhar proxy e trafego externo

## 7. Comandos canonicos

### 7.1 Preparar ambiente

```bash
cp .env.v2.example .env.v2
```

### 7.2 Validar compose

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
```

### 7.3 Derrubar stack V2 anterior

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
```

### 7.4 Reconstruir imagens corretas

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

Se precisar atualizar tambem a imagem base:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --pull --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

### 7.5 Subir dependencias primeiro

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
```

### 7.6 Aplicar migrations

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
npx tsx packages/db/src/migrate.ts
```

### 7.7 Aplicar seed inicial apenas quando necessario

```bash
DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=troque-esta-senha \
npx tsx packages/db/src/seed.ts
```

### 7.8 Subir aplicacao

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```

## 8. Validacoes obrigatorias apos subir o stack

O OpenClaw deve rodar e registrar:

```bash
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3003/ready
curl -I http://127.0.0.1:3004/
curl -I http://127.0.0.1:3002/
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-web
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-spa
```

Validacao do worker:

- container `Up` em `docker compose ps`
- sem crash loop
- logs sem falha estrutural de inicializacao

## 9. Regra de atualizacao de imagens

Ao atualizar o projeto:

1. atualize o codigo do repositorio
2. valide o compose
3. derrube a stack V2 anterior
4. reconstrua as imagens do compose atual
5. suba dependencias
6. rode migrations
7. suba aplicacao
8. valide rotas, logs e containers

O OpenClaw nao deve:

- reaproveitar imagem antiga com nome legado
- pular o rebuild quando houver risco de cache incorreto
- instalar dependencia manual fora do fluxo do monorepo
- misturar compose antigo com compose atual

## 10. Observacao critica sobre cutover e proxy

Os arquivos abaixo ainda contem defaults historicos que nao coincidem com o `docker-compose.v2.yml` atual:

- `infra/scripts/cutover-v2.sh`
- `infra/docker/Caddyfile.v2`

Problema:

- eles assumem portas externas `3000` e `3001`
- o compose atual publica API em `3003`, Web em `3004` e SPA em `3002`
- o script de cutover ainda tenta validar worker em `3002`, mas essa porta hoje pertence a SPA no compose atual

Regra obrigatoria:

- nao usar esses defaults cegamente
- se usar `cutover-v2.sh`, sobrescrever explicitamente as URLs
- se usar `Caddyfile.v2`, ajustar `reverse_proxy` para as portas externas reais antes de expor trafego

Exemplo seguro para o script:

```bash
API_HEALTH_URL=http://127.0.0.1:3003/health \
API_READY_URL=http://127.0.0.1:3003/ready \
API_METRICS_URL=http://127.0.0.1:3003/metrics \
WEB_URL=http://127.0.0.1:3004/ \
infra/scripts/cutover-v2.sh
```

Sem esse ajuste, o deploy pode ser validado contra portas erradas.

## 11. Condicoes de bloqueio imediato

O OpenClaw deve interromper o deploy se encontrar:

- `.env.v2` ausente
- `POSTGRES_PASSWORD` vazio ou placeholder
- `AUTH_SECRET` inseguro
- compose invalido
- banco indisponivel
- Redis indisponivel
- migrations falhando
- tentativa de usar SQL legado em paralelo ao fluxo `packages/db`
- tentativa de subir imagem ou servico legado
- API sem responder em `3003`
- Web sem responder em `3004`
- SPA sem responder em `3002`
- worker em crash loop

## 12. Criterio de sucesso

O deploy so pode ser considerado correto se:

- o compose valido for `docker-compose.v2.yml`
- o ambiente usado for `.env.v2`
- as migrations forem aplicadas por `packages/db/src/migrate.ts`
- a API responder `health` e `ready` em `3003`
- Web e SPA responderem nas portas publicadas
- o worker estiver estavel
- nenhum artefato legado tiver sido usado

## 13. Documentos de apoio

- `README.md`
- `INSTALACAO_V2_OPENCLAW.md`
- `docker-compose.v2.yml`
- `.env.v2.example`
- `infra/scripts/cutover-v2.sh`
- `infra/docker/Caddyfile.v2`
