# RELATÓRIO DE INSTALAÇÃO — CVG-HIS V2
**Data:** 2026-04-10
**Executor:** Claude Code (OpenClaw)
**Ambiente:** Produção

---

## RESUMO EXECUTIVO

A instalação da stack V2 do CVG-HIS foi executada com sucesso parcial. A stack subiu
corretamente usando `docker-compose.v2.yml` e todas as imagens foram reconstruídas a
partir do código atual. Os serviços estão ativos e respondendo nas portas corretas.
Duas pendências foram identificadas: (1) uma tabela faltando no schema e (2) uma
coluna ausente na tabela de auditoria.

**Veredito:** `PARCIALMENTE CONCLUÍDA — COM PENDÊNCIAS RESOLVÍVEIS`

---

## 1. ARQUIVOS DE DOCUMENTAÇÃO USADOS COMO FONTE DE VERDADE

| Arquivo | Papel |
|---------|-------|
| `README.md` | Definição da stack canônica e sequência de deploy |
| `OPENCLAW_DEPLOY_DIRETRIZES.md` | Diretrizes obrigatórias e regras de bloqueio |
| `INSTALACAO_V2_OPENCLAW.md` | Guia rápido de instalação sem ambiguidade |
| `docker-compose.v2.yml` | Compose oficial da stack V2 |
| `.env.v2.example` | Template de variáveis de ambiente |
| `infra/scripts/cutover-v2.sh` | Script de cutover (não usado — ajuste de portas necessário) |
| `infra/docker/Caddyfile.v2` | Configuração de proxy (não aplicado — portas divergem do compose) |

---

## 2. SERVIÇOS DA STACK V2

| Serviço | Imagem | Porta Externa | Status |
|---------|--------|---------------|--------|
| `postgres` | `postgres:16-alpine` | 5432 | healthy |
| `redis` | `redis:7-alpine` | 6380 | healthy |
| `cvg-his-v2-api` | `cvg-his-v2-cvg-his-v2-api` | 3003:3001 | healthy |
| `cvg-his-v2-web` | `cvg-his-v2-cvg-his-v2-web` | 3004:3000 | Up |
| `cvg-his-v2-spa` | `cvg-his-v2-cvg-his-v2-spa` | 3002:3002 | healthy |
| `cvg-his-v2-worker` | `cvg-his-v2-cvg-his-v2-worker` | — (sem porta) | Up |

---

## 3. SEQUÊNCIA DE COMANDOS EXECUTADOS

### 3.1 Validação do arquivo de ambiente
```bash
ls -la /root/.openclaw/workspace/cvg-his-v2/.env.v2
```
**Resultado:** ✅ OK — arquivo existe com segredos reais preenchidos.

### 3.2 Validação do compose
```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml config
```
**Resultado:** ✅ OK — compose válido, sem erros de parsing.

### 3.3 Remoção da stack antiga
```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
```
**Resultado:** ✅ OK — containers anteriores removidos.

### 3.4 Reconstrução das imagens
```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml build \
  --no-cache \
  cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```
**Resultado:** ✅ OK — 4 imagens reconstruídas sem cache.

Imagens geradas:
- `cvg-his-v2-cvg-his-v2-api:latest`
- `cvg-his-v2-cvg-his-v2-web:latest`
- `cvg-his-v2-cvg-his-v2-worker:latest`
- `cvg-his-v2-cvg-his-v2-spa:latest`

### 3.5 Subida das dependências
```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
```
**Resultado:** ✅ OK — Postgres e Redis subiram como healthy.

### 3.6 Aplicação de migrations
```bash
DATABASE_URL="<migration-database-url>" \
  npx tsx packages/db/src/migrate.ts
```
**Resultado:** ⚠️ OK reportou "Migrations applied successfully", porém com ressalvas
(ver Seção 5 — Pendências).

### 3.7 Correção da tabela outbox_events
```bash
cat /root/.openclaw/workspace/cvg-his-v2/packages/db/migrations/0011_outbox_events.sql | \
  sudo docker compose --env-file .env.v2 -f docker-compose.v2.yml exec -T postgres \
  psql -U postgres -d cvg_his_v2
```
**Resultado:** ✅ OK — tabela `outbox_events` e seus 4 índices criados.

### 3.8 Subida da aplicação
```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d \
  cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa
```
**Resultado:** ✅ OK — todos os serviços subiram.

---

## 4. VALIDAÇÕES HTTP

| Endpoint | Porta | HTTP Status | Resposta |
|----------|-------|-------------|----------|
| `GET /health` | 3003 | 200 | `{ok:true, service:"cvg-his-v2-api", liveness:{live:true,initialized:true}}` |
| `GET /ready` | 3003 | 200 | `{ok:true, readiness:{ready:true,productionReady:true}}` |
| `GET /` (Web) | 3004 | 200 | HTML do nginx |
| `GET /` (SPA) | 3002 | 200 | HTML do nginx |

---

## 5. PENDÊNCIAS E BLOQUEIOS

### 5.1 Pendência Média — Journal Drizzle Desincronizado

**Problema:** O arquivo `packages/db/migrations/meta/_journal.json` só registra a
migration idx 0 (`0000_vengeful_pet_avengers`). As migrations 0001 a 0010 foram
aplicadas diretamente no banco (SQL executado manualmente ou por outro mecanismo)
e não pelo `drizzle-orm` via `packages/db/src/migrate.ts`.

**Consequência:** Em próximo deploy, `npx tsx packages/db/src/migrate.ts` pode não
aplicar as migrations pendentes porque o journal não as rastreia.

**Banco atual — tabelas presentes:** 51 (derivadas das migrations 0000-0010).

**Tabela `drizzle_migrations`:** Não existe no banco (o migrator não a criou porque
as migrations foram aplicadas fora do fluxo Drizzle).

**Correção necessária:** Regenerar o journal ou marcar as migrations como aplicadas
manualmente. A correção deve ser feita com `drizzle-kit generate` ou via SQL
inserindo registros em uma tabela de controle. Alternativamente, o fluxo deve ser
padronizado para que migrations futuras usem estritamente o caminho
`packages/db/src/migrate.ts`.

### 5.2 Pendência Baixa — Coluna `metadata` Ausente em `audit_events`

**Problema:** O módulo de auditoria tenta inserir em `audit_events.metadata`, mas
essa coluna não existe na tabela.

**Erro observado nos logs da API:**
```
Failed to persist audit event to database: error: column "metadata" of relation
"audit_events" does not exist ... code: '42703'
```

**Migration de origem:** A migration `0000_vengeful_pet_avengers.sql` cria
`audit_events` com as colunas: `id`, `created_at`, `account_id`, `actor_user_id`,
`actor_role`, `actor_roles`, `entity_type`, `entity_id`, `action`, `before_json`,
`after_json`, `reason`, `request_id`. Não há coluna `metadata`.

**Impacto:** Erro não-fatal — a API continua operando, mas eventos de auditoria não
são persistidos. Isso representa perda de trilha de auditoria.

**Correção necessária:** O código do repositório de auditoria deve ser corrigido para
não inserir na coluna `metadata` inexistente, OU uma migration adicional deve adicionar
essa coluna à tabela.

### 5.3 Pendência Média — Tabela `outbox_events` Não Foi Aplicada pelo Fluxo Canônico

**Problema:** A migration `0011_outbox_events.sql` existia no filesystem mas não foi
capturada pelo fluxo `packages/db/src/migrate.ts` (journal só tem idx 0). Foi
aplicada manualmente via `psql` durante este deploy para corrigir o worker.

**Estado atual:** Tabela existe e o worker está operando normalmente.

**Risco:** Em próximo rebuild completo, se o volume do banco for recriado, a
migration 0011 não será automaticamente aplicada pelo fluxo canônico.

---

## 6. LOGS RELEVANTES

### API (tail=100)
- ✅ Inicialização bem-sucedida em 3001
- ✅ Conexão com banco de dados estabelecida
- ✅ Conexão com Redis estabelecida
- ✅ 13 repositórios wireados
- ✅ `productionReady: true`
- ⚠️ Erro não-fatal ao persistir `audit_events` (coluna `metadata` ausente)

### Worker (tail=100)
- ✅ Conexão com banco estabelecida
- ✅ `worker health endpoint listening` na porta 3002
- ✅ Ticks de notificação operando (`processedNotifications: 0`)
- ✅ Ticks de event bus operando (`processedEvents: 0`)
- ℹ️ Erro transitório `relation "outbox_events" does not exist` cessou após
  aplicação da migration 0011

### Web
- ✅ `web listening` em 0.0.0.0:3000

### SPA
- ✅ nginx iniciado e respondendo na porta 3002
- ✅ healthcheck respondendo 200

---

## 7. REGRA DE CUTOVER E PROXY

**FRONTEND CANONICO:** O dominio `his.centroveterinarioguarapiranga.com` serve `cvg-his-v2-spa` (porta 3002, apps/spa).
NUNCA servir `cvg-his-v2-web` como dominio principal.

`infra/docker/Caddyfile.v2` esta configurado com `reverse_proxy 127.0.0.1:3002` (SPA — frontend canonico).

Mappings de portas do compose:
- `3002` — SPA (frontend canonico, apps/spa)
- `3003` — API
- `3004` — Web (portal alternativo, apps/web — NAO o frontend principal)

Validacao anti-regressao obrigatoria apos qualquer deploy:
```bash
curl -s https://his.centroveterinarioguarapiranga.com/assets/ApiKeysPage*.js | head -c 100
# Se falhar: dominio esta servindo apps/web (erro de roteamento)
```

---

## 8. CONDIÇÕES DE BLOQUEIO VERIFICADAS

| Condição | Status |
|----------|--------|
| `.env.v2` ausente | ❌ Não se aplica — arquivo existe |
| `POSTGRES_PASSWORD` vazio ou placeholder | ✅ OK — segredo real |
| `AUTH_SECRET` inseguro | ✅ OK — 64 caracteres hex |
| Compose inválido | ✅ OK — validado |
| Banco indisponível | ✅ OK — healthy |
| Redis indisponível | ✅ OK — healthy |
| Migrations falhando | ⚠️ Parcial — migration 0011 precisou correção manual |
| API sem responder em 3003 | ✅ OK — 200 |
| Web sem responder em 3004 | ✅ OK — 200 |
| SPA sem responder em 3002 | ✅ OK — 200 |
| Worker em crash loop | ✅ OK — estável |

---

## 9. VEREDITO FINAL

### `INSTALAÇÃO PARCIALMENTE CONCLUÍDA`

A stack V2 foi instalada seguindo estritamente o `docker-compose.v2.yml` com rebuild
de imagens e usando o arquivo `.env.v2` correto. Todos os serviços estão ativos e
respondendo nas portas canônicas. Nenhum artefato legado foi usado.

**Resolve-se com:**
1. Correção do código de auditoria para não usar coluna `metadata` inexistente, ou
   adição da coluna via migration.
2. Sincronização do `_journal.json` com as migrations efetivamente aplicadas no banco.
3. Validação de que o fluxo `packages/db/src/migrate.ts` consegue aplicar migrations
   futuras de forma determinística.

---

## 10. PRÓXIMOS PASSOS RECOMENDADOS

1. **Imediato:** Corrigir写入 de `audit_events.metadata` no código ou adicionar a coluna.
2. **Breve prazo:** Regenerar o `_journal.json` via `drizzle-kit generate` para refletir
   o estado real do banco.
3. **Médio prazo:** Padronizar o processo de deployment para que migrations sejam
   sempre aplicadas via `packages/db/src/migrate.ts` e rastreadas pelo journal Drizzle.
4. **Cutover de proxy:** O proxy Caddy ja aponta para `3002` (SPA) como dominio principal.
   Nao redirecionar para `3004` (apps/web). Validar sempre com `ApiKeysPage*.js`. 3003 para API.

---

---

## ADDENDUM — RESOLUCAO BLOCO 1 (10/04/2026 04:51 UTC)

Todas as pendencias identificadas neste relatorio foram resolvidas conforme verificacao
de campo em 10/04/2026 04:51 UTC.

### Pendencias resolvidas

| # | Problema original | Resolucao |
|---|------------------|-----------|
| 5.1 | Journal desincronizado (só idx 0) | Journal agora contem idx 0-12. `0012_audit_events_alignment` adicionado ao journal |
| 5.2 | `audit_events.metadata` ausente | Migration 0012 adiciona `metadata JSONB`, `correlation_id VARCHAR`, `occurred_at TIMESTAMPTZ` |
| 5.3 | `outbox_events` aplicada manualmente | Migration 0011 aplicada canonicamente; journal sincronizado |

### Estado atual verificado

| Verificacao | Resultado | Evidencia |
|-------------|----------|-----------|
| `pnpm typecheck` | ✅ PASS | Todos os 49 projetos |
| `pnpm build` | ✅ PASS | Todos os 49 projetos |
| `pnpm test:critical` | ✅ PASS 169/169 | 4 suites: integrity, fk, foundational, migration |
| Journal migrations | ✅ idx 0-12 | `packages/db/migrations/meta/_journal.json` |
| audit_events.metadata | ✅ Coluna existe | Migration 0012 aplicada |
| outbox_events | ✅ Tabela existe | Migration 0011 aplicada |

### Veredito atualizado

**`INSTALACAO COMPLETA — BLOCO 1 APROVADO`**

*Addendum gerado por Claude Code — OpenClaw — 2026-04-10 04:55 UTC*
