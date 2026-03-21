# Template de Evidência - Ativação IAM

## Contexto
- Data/hora de início:
- Data/hora de fim:
- Ambiente:
- Commit/versão implantada:
- Operador responsável:

## Pré-check
- `DATABASE_URL` validada:
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` validados:
- `NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy` confirmado:
- `HIS_API_INTERNAL_URL` confirmado:
- Backup/janela de mudança registrada:

## Execução
- Resultado de `corepack pnpm iam:preflight`:
- Resultado de `corepack pnpm iam:activate`:
- Resultado de `corepack pnpm iam:smoke`:

## Evidências
- Saída resumida do `db:migrate`:
- Saída resumida do `db:seed`:
- Captura sanitizada de `/api/proxy/auth/me`:
- Evidência de acesso a `/settings/users`:
- Evidência de acesso a `/settings/roles`:
- Evidência de um `403` esperado:
- Evidência de um evento de auditoria:

## Verificação SQL
- Admin localizado em `users`:
- Papéis vinculados em `user_roles`:
- Permissões efetivas mínimas (`users.read`, `roles.read`) confirmadas:

## Observações
- Riscos identificados:
- Ações pendentes:
- Decisão de encerramento da janela:
