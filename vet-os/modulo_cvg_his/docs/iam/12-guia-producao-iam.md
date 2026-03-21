# Guia Operacional - Colocar o Modulo IAM em Producao

## Objetivo
Executar a subida do modulo IAM em producao com seguranca, cobrindo dependencias, ordem de deploy, variaveis obrigatorias, sincronizacao entre servicos e validacoes finais.

## Estruturas que precisam estar prontas e sincronizadas
- `PostgreSQL` acessivel e com backup feito antes da mudanca;
- `Redis` acessivel, porque a stack do HIS depende de fila e componentes de infraestrutura;
- `his-api`, `his-web` e, idealmente, `his-worker` na mesma versao/commit;
- migration `db:migrate` aplicada antes de subir a API nova;
- `db:seed` executado no schema ja migrado para garantir papeis, permissoes e admin inicial;
- `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy` no build do `his-web`;
- `HIS_API_INTERNAL_URL` apontando para o host interno real do `his-api`, nunca `localhost` em producao;
- `JWT_SECRET`, `JWT_ISSUER` e `JWT_AUDIENCE` coerentes no backend;
- `RUN_MIGRATIONS_ON_BOOT=0` no `his-api`, deixando migration fora do boot.

## Dependencias minimas por servico

### `his-api`
- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`

### `his-web`
- build-time:
  - `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy`
- runtime:
  - `HIS_API_INTERNAL_URL=http://his-api:3000`

### `his-worker`
- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`

## Passo a passo para subir em producao

### 1. Confirmar infraestrutura
- validar conectividade de Postgres;
- validar conectividade de Redis;
- confirmar janela de mudanca;
- confirmar backup/snapshot do banco.

### 2. Preparar variaveis de ambiente
- no `his-api`, configurar:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
- no `his-web`, configurar:
  - `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy` no build
  - `HIS_API_INTERNAL_URL=http://his-api:3000` no runtime
- definir:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

### 3. Rodar preflight
```bash
corepack pnpm iam:preflight
```

Se falhar:
- nao continuar;
- corrigir env antes de migrar.

### 4. Aplicar schema no banco
```bash
corepack pnpm db:migrate
```

Essa etapa deve acontecer antes de subir o `his-api` novo.

### 5. Executar seed do IAM
```bash
ADMIN_EMAIL='admin@seudominio.com' \
ADMIN_PASSWORD='Troque-Agora-123!' \
corepack pnpm db:seed
```

Isso garante:
- permissoes canonicas;
- papeis;
- admin inicial.

### 6. Subir os servicos na ordem correta
1. `his-api`
2. `his-worker`
3. `his-web`

### 7. Validar saude da stack
- validar `his-api` em `/health`;
- validar `his-web` na home e em `/login`;
- validar proxy em `/api/proxy/health`.

### 8. Validar o modulo IAM com login real
- fazer login com `ADMIN_EMAIL`;
- abrir `/settings/users`;
- abrir `/settings/roles`.

### 9. Rodar smoke autenticado
```bash
IAM_SMOKE_BASE_URL='https://seu-dominio' \
IAM_SMOKE_COOKIE='his_token=...' \
corepack pnpm iam:smoke
```

Alternativas:
- `IAM_SMOKE_BEARER_TOKEN`
- `IAM_SMOKE_AUTH_HEADER`

### 10. Confirmar a sessao administrativa
Validar que `/auth/me` retorna:
- `accountId`
- `roles`
- `permissions`
- `sessionId`

E que as permissoes minimas existem:
- `users.read`
- `roles.read`

### 11. Registrar evidencias
- salvar saida de `iam:preflight`;
- salvar saida de `db:migrate`;
- salvar saida de `db:seed`;
- salvar saida de `iam:smoke`;
- registrar `/auth/me` sanitizado;
- preencher `docs/operacional/IAM_ACTIVATION_REPORT_TEMPLATE.md`.

## Pontos que mais quebram em producao
- `NEXT_PUBLIC_HIS_API_BASE_URL` errado no build do `his-web`;
- `HIS_API_INTERNAL_URL` apontando para destino errado;
- subir frontend novo sem rebuild quando houve mudanca em `NEXT_PUBLIC_*`;
- rodar codigo novo sem `db:migrate`;
- executar `db:seed` antes da migration correta;
- API e web em commits diferentes;
- JWT mal configurado;
- Redis ausente ou inacessivel.

## Ordem recomendada de dependencias
1. `postgres`
2. `redis`
3. job de migration/seed
4. `his-api`
5. `his-worker`
6. `his-web`

## Rollback

### Se falhar antes de expor trafego
- restaurar banco;
- corrigir migration/seed;
- replanejar deploy.

### Se falhar depois do deploy
- voltar imagem/release anterior;
- avaliar se o problema e de aplicacao ou schema/dados;
- usar backup previo se houver incompatibilidade de schema.

## Referencias
- [11-checklist-operacional-ativacao-iam.md](/home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/docs/iam/11-checklist-operacional-ativacao-iam.md)
- [10-rollout-checklist.md](/home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/docs/iam/10-rollout-checklist.md)
- [DEPLOY_CHECKLIST.md](/home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/docs/operacional/DEPLOY_CHECKLIST.md)
- [EASYANEL_ENV_CHECKLIST.md](/home/cvgserver3/.openclaw/workspace/vet-os/modulo_cvg_his/docs/operacional/EASYANEL_ENV_CHECKLIST.md)
