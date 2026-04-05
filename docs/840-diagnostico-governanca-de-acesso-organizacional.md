# 840 - Diagnostico de Governanca de Acesso Organizacional

## 1. Estado atual real do modulo de access-control

### Confirmado no codigo
- `packages/modules/access-control/src/index.ts` implementa autorizacao por catalogo estatico de permissoes e roles.
- O catalogo atual possui permissoes hardcoded e 7 roles legadas: `admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`.
- `AccessControlService.createProfile()` calcula o perfil efetivo apenas pela uniao das permissoes dessas roles.
- `AccessControlService.assertAuthorized()` valida apenas:
  - usuario ativo
  - presenca do permission code no profile
  - account match opcional
- O service nao suporta:
  - permissoes diretas por usuario
  - permissoes por equipe
  - permissoes por setor organizacional
  - override
  - explicacao da origem da permissao

### Inferido
- O modulo foi desenhado inicialmente como RBAC legado minimo para liberar o runtime geral rapidamente.

### Ausente
- motor dinamico de autorizacao
- heranca organizacional
- explicabilidade de permissao efetiva
- camada de governanca organizacional

## 2. Estado atual da matriz de permissoes

### Confirmado no codigo
- `apps/web/src/pages/access-control.ts` renderiza tabs de roles, permissoes e matriz.
- A matriz atual e majoritariamente visual:
  - usa `roleDescriptions` hardcoded
  - possui `getDefaultRoles()` e `getDefaultPermissions()` como fallback
  - `renderMatrix()` decide acessos com regras fixas em JavaScript
  - cada celula e representada por icones passivos (`🔓`, `👁️`, `🔒`)
- A tela atual nao possui celula editavel, nem painel de origem, nem modo por usuario, equipe ou setor.

### Inferido
- A matriz atual e util como ponto de partida de UX e agrupamento visual por modulo, mas nao pode continuar como motor de autorizacao.

### Ausente
- edicao por celula
- visualizacao de permissao efetiva
- visualizacao da origem da permissao
- visao por equipe
- visao por setor organizacional
- visao por usuario com overrides

## 3. Estado atual das entidades de usuario, roles, permissoes, equipes e setores

### Usuarios

### Confirmado no codigo
- `packages/modules/users/src/index.ts` modela `UserRecord` com:
  - identidade
  - `passwordHash`
  - `roleCodes`
- `roleCodes` ainda vivem no proprio usuario em memoria.
- `UsersService.hydrateFromDatabase()` carrega usuarios do banco, mas popula `roleCodes: []`.
- `UsersService.create()` ainda usa `accountId` fixo (`acc_cvg_demo`).
- O endpoint `POST /users` em `apps/api/src/server.ts` nao usa `UsersService.create()`; ele monta um objeto local e devolve resposta sem persistir governanca.

### Roles e permissoes

### Confirmado no codigo
- Ha schema e migration para:
  - `roles`
  - `permissions`
  - `role_permissions`
  - `user_roles`
- Ha `DatabaseAccessControlRepository`, mas ele nao e injetado no `AccessControlService`.

### Equipes

### Confirmado no codigo
- Nao existe conceito canonico de equipe organizacional no backend, schema ou frontend administrativo.

### Setores

### Confirmado no codigo
- Existe `SectorBedService` e rotas `/sectors` para setores assistenciais de internacao/leitos.
- `apps/web/src/pages/users.ts` tambem usa um campo de setor, mas esse setor esta hardcoded no frontend e nao representa uma entidade organizacional integrada com acesso.

### Inferido
- O termo "setor" esta hoje sobrecarregado:
  - setor assistencial/fisico de internacao
  - setor administrativo exibido no cadastro de usuario
- Isso precisa ser separado para nao contaminar o dominio clinico.

### Ausente
- entidade de setor organizacional de acesso
- memberships usuario-setor organizacional
- atribuicao de permissao ao setor

## 4. Estado atual do backend

### Confirmado no codigo
- `apps/api/src/runtime.ts` instancia:
  - `AccessControlService()` sem repository
  - `UsersService({ repository })`
  - `StaffService({ repository })`
- `AuthService` constroi principal com `accessControl.createProfile({ roleCodes, department })`.
- As rotas atuais relevantes sao:
  - `GET /access-control` retorna apenas catalogo legado
  - `GET/POST/PATCH /users`
  - `GET/POST/PATCH /staff`
  - `GET/POST /sectors` assistenciais
- Nao ha rotas para:
  - equipes
  - setores organizacionais
  - memberships
  - permissoes diretas por usuario
  - permissoes por equipe
  - permissoes por setor
  - permissao efetiva explicada

### Inferido
- O backend ja tem maturidade suficiente para absorver uma camada nova de governanca sem reescrever os modulos clinicos.

### Ausente
- API enterprise de governanca
- endpoints para matriz administravel
- calculo centralizado da permissao efetiva multi-origem

## 5. Estado atual do frontend

### Confirmado no codigo
- `apps/web/src/pages/users.ts` trata:
  - role como select unico
  - setor como select unico hardcoded
- `apps/web/src/pages/access-control.ts` usa catalogo legado e fallback local.
- Nao existem paginas canonicas para:
  - equipes
  - setores organizacionais de acesso
  - detalhe de permissao efetiva
  - origem da permissao

### Pontos reaproveitaveis no frontend
- estrutura visual da tela de access-control
- agrupamento por modulo
- rota administrativa existente
- pagina de usuarios como base de gestao de identidade

## 6. Limitacoes atuais

### Confirmado no codigo
1. autorizacao excessivamente centrada em role fixa
2. permissao efetiva nao explicavel
3. UI da matriz nao administra nada de verdade
4. usuarios nao suportam equipes
5. usuarios nao suportam setores organizacionais reais
6. `POST /users` nao persiste o fluxo de governanca
7. `department` no staff e setor no formulario de user nao equivalem a governanca de acesso

## 7. Hardcodes encontrados

### Confirmado no codigo
- catalogo de permissoes: `packages/modules/access-control/src/index.ts`
- catalogo de roles: `packages/modules/access-control/src/index.ts`
- descricoes de roles no frontend: `apps/web/src/pages/access-control.ts`
- fallback de permissoes no frontend: `apps/web/src/pages/access-control.ts`
- regras da matriz por role/modulo no frontend: `apps/web/src/pages/access-control.ts`
- perfis e setores do formulario de usuarios: `apps/web/src/pages/users.ts`
- `accountId` fixo em `UsersService.create()`
- `POST /users` com hash local e objeto local em `apps/api/src/server.ts`

## 8. Pontos reaproveitaveis

### Confirmado no codigo
- tabelas `roles`, `permissions`, `role_permissions`, `user_roles`
- `DatabaseAccessControlRepository`
- `UsersService` e `StaffService` como bases de identidade e vinculo funcional
- runtime centralizado em `apps/api/src/runtime.ts`
- tela atual de `access-control` como base visual da matriz
- pagina `users` como base de gestao identitaria

## 9. Riscos de adaptacao

### Confirmado no codigo
- confundir setores assistenciais de internacao com setores organizacionais de acesso
- quebrar login/runtime se a resolucao de permissao efetiva trocar abruptamente
- duplicar relacao entre user e staff

### Inferido
- ha risco de inconsistencias temporarias entre `roleCodes` em memoria e `user_roles` no banco se a compatibilidade nao for bem tratada
- a migracao precisa preservar o RBAC legado durante o rollout

## 10. Impacto sobre agenda, staff, users e administracao

### Scheduling
- impacto alto: agenda depende de elegibilidade operacional e acesso correto por equipe/setor.

### Staff
- impacto alto: `department` e `jobTitle` nao podem continuar sendo o unico espelho organizacional.

### Users
- impacto altissimo: identity, membership e permissao hoje estao misturados.

### Administracao
- impacto alto: a nova matriz precisa virar ferramenta real de governanca, nao apenas espelho de papel.

## 11. Conclusao tecnica do que precisa mudar

### Confirmado no codigo
- o sistema precisa sair de RBAC fixo para um modelo composto por:
  - role legado
  - permissoes diretas do usuario
  - permissoes de equipe
  - permissoes de setor organizacional
  - calculo de permissao efetiva com origem explicavel

### Decisao tecnica recomendada
1. preservar roles legadas como camada de compatibilidade
2. criar entidades canonicas de `team` e `access sector`
3. criar tabelas de memberships e atribuicoes de permissao
4. mover o calculo de permissao efetiva para o backend
5. transformar a matriz em UI administravel por celula
6. separar definitivamente setor assistencial de setor organizacional

### Resumo executivo
- O repositório ja possui base suficiente para evolucao enterprise.
- O gargalo nao e falta total de infraestrutura; e rigidez de modelagem e acoplamento frontend-backend.
- A matriz atual deve ser evoluida, nao descartada.
