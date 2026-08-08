# 870 - Relatorio Final da Governanca de Acesso Enterprise

## 1. Diagnostico resumido do que existia

- autorizacao centrada em `roles` fixas
- matriz de permissoes visualmente util, mas passiva
- frontend com fallback hardcoded para roles e permissoes
- `users` com `roleCode` e `sector` simplificados
- inexistencia de equipes organizacionais
- inexistencia de setores organizacionais de acesso
- ausencia de explicabilidade da permissao efetiva

## 2. O que foi alterado

### Banco e modelo relacional
- criada a trilha de governanca organizacional com:
  - `access_teams`
  - `access_sectors`
  - `access_team_memberships`
  - `access_sector_memberships`
  - `access_user_permissions`
  - `access_team_permissions`
  - `access_sector_permissions`

### Shared model
- adicionados tipos compartilhados para:
  - equipe de acesso
  - setor organizacional de acesso
  - memberships
  - assignments
  - permissao efetiva e origem

### Backend
- `AccessControlService` foi evoluido para:
  - manter catalogo legado
  - carregar governanca organizacional do banco
  - resolver permissao efetiva por:
    - usuario
    - setor
    - equipe
    - role legado
  - explicar a origem da permissao
- `AuthService` passou a montar principal com `userId` e `accountId` para resolucao efetiva
- `runtime` passou a injetar e hidratar a governanca de acesso
- `POST /users` deixou de montar resposta fake local e passou a usar `UsersService.create()`

### Frontend
- a tela `access-control` foi refeita para operar como governanca de acesso:
  - tab legado
  - tab equipes
  - tab setores
  - tab usuarios
  - tab matriz
- a matriz agora suporta:
  - modo por role legado
  - modo por equipe
  - modo por setor organizacional
  - modo por usuario
- cada celula agora e administravel com:
  - `Herdar`
  - `Conceder`
  - `Negar`

## 3. Migrations criadas

- `packages/shared/database/src/migrations/018_create_access_governance.sql`

## 4. Entidades alteradas

### Novas entidades
- `AccessTeamSummary`
- `AccessSectorSummary`
- `AccessMembershipSummary`
- `AccessPermissionAssignmentSummary`
- `EffectivePermissionSummary`
- `EffectivePermissionSource`

### Entidades reaproveitadas
- `users`
- `staff`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

## 5. Endpoints alterados

### Ajustado
- `POST /users`
- `GET /access-control`

### Novos
- `GET /access-control/teams`
- `POST /access-control/teams`
- `PATCH /access-control/teams/:id`
- `GET /access-control/org-sectors`
- `POST /access-control/org-sectors`
- `PATCH /access-control/org-sectors/:id`
- `POST /access-control/users/:id/teams`
- `POST /access-control/users/:id/sectors`
- `POST /access-control/users/:id/roles`
- `GET /access-control/users/:id/effective`
- `POST /access-control/grants`

## 6. Componentes e telas alterados

- `apps/web/src/pages/access-control.ts`

### Novas capacidades da UI
- cadastro de equipe
- cadastro de setor organizacional
- vinculo de usuario a equipes
- vinculo de usuario a setores organizacionais
- atribuicao de roles legadas por compatibilidade
- matriz editavel por equipe
- matriz editavel por setor
- matriz por usuario com:
  - permissao direta
  - permissao efetiva
  - origem

## 7. Nova regra de permissao efetiva

### Ordem de resolucao
1. `user_deny`
2. `user_allow`
3. `sector_deny`
4. `sector_allow`
5. `team_deny`
6. `team_allow`
7. `role_allow`
8. `none`

### Efeito pratico
- o usuario pode receber grant direto
- o usuario pode herdar grant/deny de equipe
- o usuario pode herdar grant/deny de setor organizacional
- o role legado continua funcionando como base de compatibilidade

## 8. Nova regra da matriz

- a matriz deixou de ser apenas decorativa
- a celula agora e um item administravel
- o estado explicito por celula e:
  - `inherit`
  - `allow`
  - `deny`
- no modo usuario, a tela mostra:
  - grant direto
  - resultado efetivo
  - fontes da permissao

## 9. Compatibilidades preservadas

- roles legadas foram mantidas
- `user_roles` e `role_permissions` continuam validos
- `AuthService` continua emitindo `principal.access.permissionCodes`
- a aba legada da matriz continua disponivel
- os setores assistenciais de internacao nao foram reutilizados como setores organizacionais

## 10. Quebras inevitaveis

- nenhuma quebra contratual ampla foi introduzida no runtime principal
- houve mudanca de comportamento em `POST /users`, que deixou de ser um fake local e passou a seguir o service
- a tela antiga de `access-control` foi substituida por uma governanca mais ampla

## 11. Testes criados e ajustados

### Modulo
- `packages/modules/access-control/src/access-control.test.ts`
  - roles e permissoes legadas
  - profile legado
  - memberships de equipe/setor
  - precedence de heranca e override
  - remocao de grant para `inherit`

### Validacoes executadas
- `pnpm --filter @cvg-his-v2/module-access-control test`
- `pnpm --filter @cvg-his-v2/api test`
- `pnpm --filter @cvg-his-v2/web test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## 12. Limitacoes remanescentes

1. a governanca nova ainda convive com `roleCodes` legadas no dominio de usuarios
2. a pagina `users` ainda tem campos legados de role/setor e nao foi totalmente convergida para a nova UX
3. auditoria detalhada de alteracao de grants ainda pode ser aprofundada em evento dedicado
4. nao houve migracao automatica de departamentos do `staff` para equipes/setores organizacionais

## 13. Proximos passos

1. convergir a pagina `users` para a governanca nova
2. adicionar auditoria mais detalhada de grants e memberships
3. criar seeds iniciais de equipes e setores organizacionais
4. avaliar uso de equipes/setores organizacionais na elegibilidade operacional da agenda e da equipe clinica
