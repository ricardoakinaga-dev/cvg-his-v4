# 505 — Módulo Staff

## Objetivo

Prover cadastro administrativo real de profissionais/equipe, com persistência em `staff`, vínculo opcional com `users` e controle de ativação/inativação.

## Superfície funcional real

- `list(accountId?)` — lista colaboradores carregados no serviço.
- `getOrThrow(staffId, accountId?)` — busca por ID e respeita escopo de conta quando informado.
- `findByUserId(userId)` — localiza colaborador pelo `userId` vinculado.
- `create(accountId, input)` — cria colaborador persistente.
- `update(staffId, input)` — atualiza nome, departamento, cargo e status.
- `toggleActive(staffId, isActive)` — ativa/inativa sem apagar histórico.
- `hydrateFromDatabase(accountId?)` — reidrata o serviço a partir do repositório.
- `DatabaseStaffRepository` — persistência SQL real na tabela `staff`.

## API e UI entregues

- API:
  - `GET /staff`
  - `GET /staff/:id`
  - `POST /staff`
  - `PATCH /staff/:id`
  - `POST /staff/:id/toggle-active`
- UI:
  - `apps/spa/src/pages/staff/StaffListPage.vue`
  - `apps/spa/src/pages/staff/StaffFormPage.vue`
  - `apps/spa/src/pages/staff/StaffDetailPage.vue`
  - rota `/staff`
  - navegação administrativa já exposta em `apps/spa/src/navigation.ts`

## Regras de negócio relevantes

- O módulo mantém os 7 seeds existentes como baseline local, mas deixa de depender exclusivamente deles.
- Em modo com banco, novos registros são persistidos em `staff` e reidratados no startup do runtime.
- `employeeCode` é único por conta no banco.
- A API filtra leitura por `accountId` do principal autenticado.
- A inativação preserva o registro e expõe `status: inactive`.

## Situação de persistência

- Tabela oficial: `staff`.
- Repositório oficial: `packages/modules/staff/src/repositories/database-staff.repository.ts`.
- Wiring de runtime/bootstrap: `apps/api/src/runtime.ts` e `apps/api/src/bootstrap.ts`.
- Não é mais um módulo seed-only.

## Situação de testes

- `packages/modules/staff/src/staff.test.ts` cobre create, update, toggle, filtro por `accountId` e `hydrateFromDatabase()` com repositório stub.
- `apps/api/src/db-persistence.test.ts` cobre persistência real do repositório `DatabaseStaffRepository`.
- `e2e/tests/fluxos-criticos.spec.ts` passou a exercer criação real de staff no fluxo do veterinário.
- `packages/modules/staff/package.json` executa a suite dedicada com `vitest`.

## Gaps ainda abertos

1. Validação forte de existência do `userId` vinculado no mesmo fluxo transacional.
2. Filtros/paginação por departamento e status.
3. Histórico dedicado de movimentação de cargo/setor.
