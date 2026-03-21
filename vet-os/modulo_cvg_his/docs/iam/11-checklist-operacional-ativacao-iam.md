# Checklist Operacional - Ativacao do IAM no Ambiente

## Objetivo
Executar a ativacao curta do IAM com preflight, `migrate`, `seed` e smoke autenticado do admin inicial.

> Este arquivo e a versao curta e executavel da ativacao.
> Para rollout completo, janela de mudanca, backup e rollback ampliado, use `docs/iam/10-rollout-checklist.md`.

## Comandos oficiais do workspace

```bash
corepack pnpm iam:preflight
corepack pnpm iam:activate
corepack pnpm iam:smoke
```

## 1. Confirmar variaveis obrigatorias

### Backend (`his-api`)
```bash
printenv | grep -E '^(DATABASE_URL|JWT_SECRET|JWT_ISSUER|JWT_AUDIENCE)='
```

### Frontend (`his-web`)
```bash
printenv | grep -E '^(NEXT_PUBLIC_HIS_API_BASE_URL|HIS_API_INTERNAL_URL)='
```

### Valores esperados
- `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy`
- `HIS_API_INTERNAL_URL=http://<host-interno-do-his-api>:<porta>`

### Observacao importante
- `NEXT_PUBLIC_HIS_API_BASE_URL` e variavel de build do `his-web`;
- `HIS_API_INTERNAL_URL` e variavel de runtime do proxy server-side do `his-web`;
- em producao Docker/EasyPanel, nao use `localhost` para `HIS_API_INTERNAL_URL`;
- para validar tudo de uma vez, prefira:

```bash
corepack pnpm iam:preflight
```

## 2. Aplicar migration do banco
```bash
corepack pnpm db:migrate
```

## 3. Executar seed com admin inicial
Substitua pelos valores reais antes de rodar:

```bash
ADMIN_EMAIL='admin@seudominio.com' \
ADMIN_PASSWORD='Troque-Agora-123!' \
corepack pnpm db:seed
```

Regras praticas:
- `ADMIN_EMAIL` deve ser explicito e valido;
- `ADMIN_PASSWORD` deve ser forte e temporaria;
- nao existe mais fallback inseguro no fluxo de ativacao automatizada.

## 4. Subir ou redeploy dos servicos

### Backend local
```bash
corepack pnpm --filter @cvg-his/his-api dev
```

### Frontend local
```bash
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy \
HIS_API_INTERNAL_URL=http://127.0.0.1:3000 \
corepack pnpm --filter @cvg-his/his-web dev
```

### Build de verificacao do frontend
```bash
NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy \
HIS_API_INTERNAL_URL=http://127.0.0.1:3000 \
corepack pnpm --filter @cvg-his/his-web build
```

### Ativacao automatizada com logging controlado
Se as variaveis obrigatorias ja estiverem exportadas:

```bash
ADMIN_EMAIL='admin@seudominio.com' \
ADMIN_PASSWORD='Troque-Agora-123!' \
corepack pnpm iam:activate
```

Esse comando:
- roda preflight;
- executa `db:migrate`;
- executa `db:seed`;
- gera log em `logs/activation-iam/`;
- gera relatorio inicial em `memory/activation-iam-report-<data>.md`.

## 5. Validar login administrativo
1. Acesse `/login`
2. Entre com o `ADMIN_EMAIL` e `ADMIN_PASSWORD`
3. Depois do login, tente abrir diretamente:
   - `/settings/users`
   - `/settings/roles`

## 6. Validar sessao real do backend
Com o usuario ja logado no navegador:

```bash
curl -i http://localhost:3001/api/proxy/auth/me
```

Se estiver testando localmente e quiser reaproveitar o cookie do navegador via DevTools/cURL, o retorno esperado deve conter:
- `accountId`
- `roles`
- `permissions`
- `sessionId`

As permissoes minimas esperadas para aparecer o menu sao:
- `users.read`
- `roles.read`

### Smoke autenticado reproduzivel
O comando abaixo executa as checagens de:
- `/api/proxy/auth/me`
- `/api/proxy/admin/iam/users`
- `/api/proxy/admin/iam/roles`

Com cookie exportado do navegador:

```bash
IAM_SMOKE_BASE_URL='http://localhost:3001' \
IAM_SMOKE_COOKIE='his_token=<cookie-ou-cookie-header>' \
corepack pnpm iam:smoke
```

Alternativas suportadas:
- `IAM_SMOKE_BEARER_TOKEN='<jwt>'`
- `IAM_SMOKE_AUTH_HEADER='Bearer <jwt>'`

## 7. Validar rotas administrativas diretamente
Com sessao autenticada:

```bash
curl -i http://localhost:3001/api/proxy/admin/iam/users
```

```bash
curl -i http://localhost:3001/api/proxy/admin/iam/roles
```

## 8. Diagnostico rapido se nao aparecer nada

### Caso 1: `/api/proxy/auth/me` retorna `401`
- cookie/sessao nao foi criada corretamente;
- login falhou parcialmente;
- backend nao conseguiu validar a sessao persistida.

### Caso 2: `/api/proxy/auth/me` retorna sem `users.read` e `roles.read`
- o usuario nao recebeu os papeis corretos no banco;
- o seed nao criou/vinculou o admin como esperado;
- e necessario revisar `users`, `user_roles`, `roles` e `role_permissions`;
- rode novamente `corepack pnpm iam:smoke` apos corrigir os vinculos.

### Caso 3: `/api/proxy/auth/me` vem correto, mas as telas falham
- frontend com build antiga;
- deploy sem estas correcoes;
- variavel `HIS_API_INTERNAL_URL` apontando para destino errado;
- proxy do web alcançando backend errado.

## 9. Verificacao SQL objetiva

### Confirmar usuario admin
```sql
select id, email, username, is_active
from users
where email = 'admin@seudominio.com';
```

### Confirmar papeis vinculados
```sql
select u.email, r.name
from users u
join user_roles ur on ur.user_id = u.id
join roles r on r.id = ur.role_id
where u.email = 'admin@seudominio.com';
```

### Confirmar permissoes efetivas dos papeis
```sql
select distinct r.name as role_name, p.key as permission_key
from users u
join user_roles ur on ur.user_id = u.id
join roles r on r.id = ur.role_id
join role_permissions rp on rp.role_id = r.id
join permissions p on p.id = rp.permission_id
where u.email = 'admin@seudominio.com'
  and p.key in ('users.read', 'roles.read', 'permissions.read', 'permissions.manage', 'sessions.read', 'sessions.revoke')
order by r.name, p.key;
```

## 10. Criterio de sucesso
- login funciona;
- `/api/proxy/auth/me` retorna sessao valida;
- `/settings/users` abre;
- `/settings/roles` abre;
- menu de configuracao aparece para o admin;
- rotas `/api/proxy/admin/iam/users` e `/api/proxy/admin/iam/roles` respondem autenticadas.

## 11. Evidencias recomendadas
- salvar a saida de `corepack pnpm iam:preflight`;
- salvar a saida de `corepack pnpm iam:activate`;
- salvar a saida de `corepack pnpm iam:smoke`;
- registrar um `/auth/me` sanitizado;
- preencher o template `docs/operacional/IAM_ACTIVATION_REPORT_TEMPLATE.md`.
