# Diretrizes de Deploy do CVG-HIS V2 para OpenClaw

Este documento define a trilha obrigatória que o OpenClaw deve seguir para publicar o `CVG-HIS V2` sem ambiguidade, sem usar componentes legados e com o menor risco operacional possível.

## 1. Fonte de verdade obrigatória

O OpenClaw deve considerar como canônico apenas:

- `apps/api`
- `apps/web`
- `apps/worker`
- `docker-compose.v2.yml`
- `.env.v2`
- `packages/shared/database/src/migrations/*.sql`
- `infra/scripts/cutover-v2.sh`
- `INSTALACAO_V2_OPENCLAW.md`
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- `docs/131-checklist-cutover-servidor.md`

O OpenClaw nao deve tentar usar:

- qualquer trilha `apps/his-*`
- scripts antigos de deploy fora da trilha V2
- compose legado para subir API/Web/Worker

## 2. Regra operacional principal

Antes de qualquer deploy, o OpenClaw deve validar explicitamente:

1. que o repositório possui apenas `apps/api`, `apps/web` e `apps/worker`
2. que o deploy sera feito com `docker-compose.v2.yml`
3. que o banco do V2 nao esta apontando para schema legado
4. que as migrations serao aplicadas na ordem correta
5. que `AUTH_SECRET` existe e nao usa placeholder inseguro
6. que `postgres`, `redis`, `api`, `web` e `worker` vao subir no mesmo stack V2

Se qualquer uma dessas validacoes falhar, o OpenClaw deve parar e reportar o bloqueio antes de continuar.

## 3. Dependencias obrigatorias

O deploy do V2 exige:

- Docker
- Docker Compose
- PostgreSQL 16
- Redis 7
- Node 22 apenas se houver build fora do container
- diretório persistente para anexos/storage
- DNS ou proxy reverso corretamente apontado

## 4. Variaveis de ambiente obrigatorias

O OpenClaw deve exigir no mínimo:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `WORKER_INTERVAL_MS`
- `PUBLIC_WEB_DOMAIN`
- `PUBLIC_API_DOMAIN`

Regras:

- `POSTGRES_PASSWORD` nao pode ficar vazio
- `AUTH_SECRET` deve ter pelo menos 32 caracteres
- `AUTH_SECRET` nao pode conter placeholders inseguros
- `WORKER_INTERVAL_MS` deve ser numerico
- o deploy real deve usar `.env.v2`

## 5. Banco de dados — restricoes e requisitos

O banco do V2 deve usar as migrations oficiais em ordem exata:

1. `packages/shared/database/src/migrations/001_initial_schema.sql`
2. `packages/shared/database/src/migrations/002_entry_revisions.sql`
3. `packages/shared/database/src/migrations/003_advanced_care_persistence.sql`
4. `packages/shared/database/src/migrations/004_clinical_entry_governance.sql`

### Regras obrigatorias do banco

O OpenClaw deve garantir:

- banco dedicado ao V2, preferencialmente `cvg_his_v2`
- schema `public` limpo ou banco novo antes do primeiro deploy real
- acesso de leitura e escrita para API e worker
- persistencia de:
  - medical records
  - entry revisions
  - attachments metadata
  - inpatient
  - surgery
  - diagnostics
  - notifications

### Constraints operacionais obrigatorias

O OpenClaw deve confirmar que o banco suporta corretamente:

- chaves primarias e indices criados pelas migrations
- `clinical_entries` com governanca de revisao
- `clinical_timeline`
- `entry_revisions`
- `attachments`
- `notifications`
- `notification_jobs`
- `inpatient_stays`
- `inpatient_progress`
- `surgery_cases`
- `diagnostic_orders`

Se qualquer tabela esperada nao existir, o OpenClaw deve parar o deploy e reportar exatamente qual migration faltou.

## 6. Redis — requisito operacional

O Redis e obrigatorio para a trilha assincrona e deve:

- estar acessivel pelo container `worker`
- responder `PING`
- usar a URL esperada pelo stack

Se o Redis nao estiver saudável, o OpenClaw nao deve validar o stack como pronto.

## 7. Storage de arquivos — requisito operacional

O V2 usa storage persistente para anexos.

O OpenClaw deve garantir:

- diretório persistente montado em `/srv/cvg-his-v2/storage`
- permissão de escrita para API e worker
- persistencia entre reinicios do container

Se o storage nao estiver montado corretamente, o deploy nao deve ser considerado pronto.

## 8. Ordem obrigatoria de deploy

O OpenClaw deve seguir exatamente esta ordem:

1. validar `.env.v2`
2. validar `docker-compose.v2.yml`
3. subir `postgres` e `redis`
4. esperar healthcheck de `postgres`
5. esperar healthcheck de `redis`
6. aplicar migrations do banco
7. subir `cvg-his-v2-api`
8. validar `/health`
9. validar `/ready`
10. subir `cvg-his-v2-web`
11. subir `cvg-his-v2-worker`
12. validar logs de API, web e worker
13. validar login
14. validar dashboard
15. validar worker sem crash
16. só então executar o cutover do proxy/domínio

## 9. Regras obrigatorias do frontend

O OpenClaw deve validar que:

- a tela `/login` nao mostra navbar de modulo protegido
- acesso sem token a `/` redireciona para `/login`
- token expirado ou invalido nao abre shell autenticada
- login redireciona para `next` ou `/`
- as paginas protegidas nao quebram por erro de `apiRequest`

Se a tela de login mostrar navbar de modulo, o deploy deve ser tratado como incompleto.

## 10. Regras obrigatorias da API

O OpenClaw deve validar:

- `GET /health` responde `200`
- `GET /ready` responde `200`
- `POST /auth/login` funciona com credencial valida
- endpoints principais protegidos exigem autenticacao
- API aponta para o banco V2, nao para schema legado

## 11. Regras obrigatorias do worker

O OpenClaw deve validar:

- worker sobe sem crash
- `QUEUE_PREFIX` e configuracao equivalente nao estao invalidos
- o worker consegue conectar no banco e no Redis
- logs nao mostram falha estrutural de inicializacao

## 12. Comandos base permitidos

O OpenClaw deve preferir estes comandos:

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d --build
infra/scripts/cutover-v2.sh
```

Para aplicar migrations manualmente:

```bash
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/002_entry_revisions.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/003_advanced_care_persistence.sql
psql "$DATABASE_URL" -f packages/shared/database/src/migrations/004_clinical_entry_governance.sql
```

## 13. Validacoes obrigatorias apos subir o stack

O OpenClaw deve rodar e registrar:

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/ready
curl -I http://127.0.0.1:3000/
docker compose --env-file .env.v2 -f docker-compose.v2.yml ps
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-web
docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker
```

## 14. Critérios de pronto para cutover

O OpenClaw só pode considerar o stack pronto para receber tráfego real se:

- banco estiver migrado
- redis estiver saudável
- API responder `health` e `ready`
- web responder `/login`
- login autenticar corretamente
- dashboard carregar sem erro estrutural
- worker estiver estável
- storage estiver persistente

## 15. Condições de bloqueio imediato

O OpenClaw deve interromper o deploy se encontrar:

- `AUTH_SECRET` inseguro
- migrations ausentes ou fora de ordem
- tabela obrigatória ausente
- banco legado sendo reutilizado sem validação explícita
- tela `/login` exibindo shell protegida
- web abrindo direto em `/` sem autenticação
- API sem `/ready`
- worker crashando em loop
- Redis indisponível
- storage sem permissão de escrita

## 16. Regra de rollback

Se qualquer validação crítica falhar após o início do cutover:

1. remover o tráfego do V2
2. restaurar o proxy anterior
3. manter o banco do V2 preservado para diagnóstico
4. registrar logs de API, web e worker
5. reportar o primeiro erro real, não sintomas em cascata

## 17. Comportamento esperado do OpenClaw

O OpenClaw deve:

- seguir a ordem sem pular etapas
- parar ao primeiro bloqueio real
- não improvisar migrations alternativas
- não reintroduzir stack legado
- não mudar o schema fora das migrations oficiais sem justificativa explícita
- não marcar deploy como sucesso sem validação funcional real de login e dashboard

## 18. Documentos de apoio

- `INSTALACAO_V2_OPENCLAW.md`
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- `docs/131-checklist-cutover-servidor.md`
- `docker-compose.v2.yml`
- `.env.v2`
- `infra/scripts/cutover-v2.sh`
