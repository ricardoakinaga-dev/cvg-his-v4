# 508 — Módulo Users

## Objetivo

Gerenciar usuários do sistema com hashing de senha via `scrypt` assíncrono, compatibilidade com seeds legados e persistência opcional por repositório.

## Superfície funcional real

- `list()` — retorna `UserSummary[]` sem `passwordHash` e sem `roleCodes`.
- `getOrThrow(userId)` — busca por ID com retorno do `UserRecord` completo.
- `findByUsername(username)` — busca por username.
- `verifyPassword(user, password)` — compara senha com hash moderno ou seed legada.
- `create(input)` — cria usuário com hash real de senha.
- `update(userId, changes)` — atualiza nome, email e status.
- `hydrateFromDatabase()` — carrega usuários existentes do repositório.
- utilitários exportados: `hashPassword`, `comparePassword`, `createSeedUsers`.

## Regras de negócio relevantes

- O fluxo moderno usa `randomBytes(16)` por usuário.
- O hashing usa `scrypt` assíncrono via `promisify`, sem `scryptSync` no caminho principal.
- O formato moderno é `saltHex:hashHex`.
- Seeds antigos continuam compatíveis no formato `cvg-his-v2-seed-salt-v1:seed_<role>`.
- `username` precisa ser único no serviço.

## Situação de persistência

- Repositório opcional: `DatabaseUsersRepository`.
- O runtime injeta repositório quando o banco está disponível.
- `hydrateFromDatabase()` continua mapeando usuários do banco para o modelo do serviço.

## Situação de testes

- `packages/modules/users/src/users.test.ts` cobre:
  - `create`
  - `update`
  - `verifyPassword`
  - `hashPassword`
  - `comparePassword`
  - compatibilidade com seed legacy
  - comportamento com repositório/hidratação
- `packages/modules/users/package.json` executa a suite real com `vitest`.

## Gaps ainda abertos

1. `accountId` de `create` ainda segue fixo no serviço.
2. Validação de email ainda é básica.
3. ID continua gerado por `Math.random()` e não por UUID/ULID.
4. Desativação ainda não invalida sessões automaticamente.
