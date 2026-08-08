# 860 - Plano Enterprise de Implementacao da Governanca de Acesso

## 1. Ordem exata de execucao

1. diagnostico confirmado em codigo
2. criar modelo de banco organizacional
3. estender shared-types e contratos
4. implementar repository de governanca
5. refatorar `AccessControlService` para catalogo + resolucao efetiva
6. integrar `AuthService` e runtime
7. expor API administrativa
8. evoluir tela de access-control
9. validar gestao de usuarios/equipes/setores
10. fechar testes e relatorio final

## 2. Fases

### Fase 1 - Base relacional
- novas tabelas
- migration
- exports de schema

### Fase 2 - Dominio e repositorio
- service de governanca
- repositorio DB
- calculo de permissao efetiva

### Fase 3 - API
- rotas de CRUD
- rotas de memberships
- rotas de atribuicao de permissoes
- rotas de matriz

### Fase 4 - Frontend
- nova matriz
- modo por equipe/setor/usuario
- celula administravel

### Fase 5 - Testes e rollout
- testes de integracao
- compatibilidade legada
- relatorio final

## 3. Subfases

### 3.1 Banco
- `access_teams`
- `access_team_memberships`
- `access_sectors`
- `access_sector_memberships`
- `access_user_permissions`
- `access_team_permissions`
- `access_sector_permissions`

### 3.2 Shared model
- novos ids e summaries
- tipos de atribuicao e permissao efetiva

### 3.3 Backend
- `AccessControlService` com repository
- engine de resolucao
- compatibilidade com roles legadas

### 3.4 Frontend
- tabs novas:
  - usuarios
  - equipes
  - setores
  - matriz

## 4. Dependencias

- schema DB e migration antes do runtime DB
- repository antes do calculo efetivo
- calculo efetivo antes da matriz por usuario
- compatibilidade legada antes de alterar auth

## 5. Arquivos, tabelas, rotas e telas a alterar

### Banco/schema
- `packages/db/src/schema/index.ts`
- novos arquivos de schema organizacional
- nova migration em `packages/shared/database/src/migrations`

### Backend
- `packages/modules/access-control/src/index.ts`
- `packages/modules/access-control/src/repositories/database-access-control.repository.ts`
- `packages/shared/types/src/index.ts`
- `packages/modules/auth/src/index.ts`
- `packages/modules/users/src/index.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/server.ts`

### Frontend
- `apps/web/src/pages/access-control.ts`
- possivel ajuste em `apps/web/src/pages/users.ts`

## 6. Migrations necessarias

1. criar tabelas de teams e sectors organizacionais
2. criar memberships
3. criar atribuicoes de permissao
4. criar indices por account e entidade
5. manter `roles`, `permissions`, `user_roles`, `role_permissions`

## 7. Contratos de API a ajustar

- resposta de catalogo de acesso
- resposta de permissao efetiva
- payloads de grant/revoke
- payloads de equipe/setor
- payload de memberships de usuario

## 8. Componentes frontend a ajustar

- tabs do access-control
- grid da matriz
- celulas selecionaveis
- painel lateral de detalhe
- formularios de equipe e setor
- selecao de usuario para permissao efetiva

## 9. Estrategia de compatibilidade

1. manter roles legadas ativas
2. resolver permissao efetiva por composicao
3. manter tela por role legado como modo transitorio
4. nao remover `user_roles`
5. nao colapsar setor assistencial em setor organizacional

## 10. Estrategia de rollout

1. deploy da migration
2. liberar leitura do catalogo composto
3. liberar CRUD de equipes e setores
4. liberar atribuicoes de permissao
5. liberar nova matriz
6. migrar uso administrativo para a governanca nova

## 11. Estrategia de testes

### Dominio
- resolver permissao efetiva com multiplas fontes
- precedence de `deny`/`allow`
- memberships multiplos

### API
- CRUD de equipe
- CRUD de setor
- grants por usuario/equipe/setor
- endpoint de permissao efetiva

### Frontend
- renderizacao da matriz
- edicao por celula
- troca de modo de visualizacao

## 12. Criterios de aceite

1. usuario pode ser vinculado a equipes e setores organizacionais
2. administrador pode editar grants por usuario/equipe/setor
3. backend responde permissao efetiva e origem
4. matriz permite selecao por celula
5. roles legadas continuam funcionando
6. setor assistencial nao e confundido com setor organizacional

## 13. Riscos tecnicos

- quebra de login se `AuthService` nao absorver o novo fluxo
- inconsistencias temporarias entre `user.roleCodes` e `user_roles`
- conflito de nomenclatura com `sectors` assistenciais
- aumento de complexidade no frontend se a matriz nascer sem agregacao adequada

## 14. Backlog executivo priorizado

### P0
- banco organizacional
- engine de permissao efetiva
- API de grants e memberships

### P1
- nova matriz editavel
- painel de origem da permissao
- integracao com users

### P2
- refinamentos de UX
- filtros mais ricos
- auditoria detalhada de mudancas de permissao
