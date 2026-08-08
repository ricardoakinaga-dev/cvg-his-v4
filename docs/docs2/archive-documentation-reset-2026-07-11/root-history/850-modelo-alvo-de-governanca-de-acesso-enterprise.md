# 850 - Modelo-Alvo de Governanca de Acesso Enterprise

## 1. Principios de governanca de acesso

1. identidade e autorizacao nao sao a mesma coisa
2. profissao nao e permissao
3. equipe nao e role
4. setor organizacional nao e setor assistencial de internacao
5. permissao efetiva precisa ser explicavel
6. compatibilidade legada deve ser preservada durante o rollout
7. a regra de autorizacao deve viver no backend

## 2. Separacao de conceitos

### Usuario
- identidade autenticavel
- possui credencial, status e vinculos organizacionais

### Vinculo funcional/profissional
- espelhado principalmente por `staff`
- representa funcao/cargo/departamento operacional
- nao concede acesso por si so

### Equipe
- agrupamento configuravel
- usada para heranca de permissao e organizacao operacional

### Setor organizacional
- agrupamento configuravel de governanca de acesso
- diferente de setor/leito assistencial

### Role legado
- camada temporaria de compatibilidade
- continua concedendo permissao basica enquanto a governanca nova entra em operacao

### Permissao
- unidade granular de capacidade

## 3. Modelo de entidades

### Entidades novas
- `access_teams`
- `access_team_memberships`
- `access_sectors`
- `access_sector_memberships`
- `access_user_permissions`
- `access_team_permissions`
- `access_sector_permissions`

### Entidades reaproveitadas
- `users`
- `staff`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

## 4. Modelo de relacionamentos

1. usuario 1:N memberships de equipe
2. usuario 1:N memberships de setor organizacional
3. equipe N:N permissoes
4. setor organizacional N:N permissoes
5. usuario N:N permissoes diretas
6. usuario N:N roles legadas

## 5. Regra de permissao efetiva

### Fontes
1. permissoes diretas do usuario
2. permissoes herdadas de setor organizacional
3. permissoes herdadas de equipe
4. permissoes herdadas de role legado

### Ordem proposta
1. `user` override
2. `sector` override
3. `team` override
4. `legacy role`

## 6. Regra de heranca

- usuario herda todas as permissoes `allow` de suas equipes e setores
- usuario tambem herda permissoes de roles legadas para compatibilidade
- as fontes herdadas ficam visiveis em `sources[]`

## 7. Regra de override

### Modelo recomendado
- cada atribuicao explicita usa `effect`:
  - `allow`
  - `deny`

### Precedencia recomendada
- `user deny` vence tudo
- `user allow` vence herancas inferiores
- `sector deny/allow` vence `team` e `legacy role`
- `team deny/allow` vence `legacy role`
- `legacy role` fica como base de compatibilidade

## 8. Regra de explicabilidade da permissao

Para cada permissao, o backend deve responder:
- codigo da permissao
- estado efetivo
- se ha atribuicao direta
- se ha heranca
- fontes que contribuiram
- motivo da decisao final

### Estrutura minima de resposta
- `permissionCode`
- `effective`
- `resolution`
- `sources[]`

## 9. Proposta de evolucao da matriz

### Modos de visualizacao
1. por role legado
2. por equipe
3. por setor organizacional
4. por usuario

### Comportamento da celula
- celula administravel
- estado minimo:
  - `inherit`
  - `allow`
  - `deny`

### UX proposta
- matriz principal por equipe/setor
- painel lateral de detalhe do usuario
- destaque visual para:
  - direto
  - herdado
  - negado
  - efetivo

## 10. Compatibilidade com runtime atual

### Compatibilidade preservada
- `roles` legadas continuam validas
- `assertAuthorized()` continua trabalhando com `permissionCodes`
- `AuthService` continua emitindo principal autenticado

### Evolucao necessaria
- a montagem do `AccessProfile` passa a consultar governanca real
- o perfil final deixa de depender apenas de `roleCodes`

## 11. Impactos sobre agenda e operacao clinica

- equipes poderao refletir agrupamentos clinicos e administrativos reais
- setores organizacionais poderao segmentar acesso por area
- scheduling e staff poderao usar memberships para elegibilidade futura
- a camada de autorizacao deixa de depender de apelidos de role

## 12. Pontos de migracao de dados

1. manter `user_roles` como base de compatibilidade
2. nao migrar setores assistenciais para setores organizacionais automaticamente
3. permitir iniciar com `teams` e `access sectors` vazios
4. permitir que usuarios recebam memberships e permissoes progressivamente
5. preservar matriz por role legado enquanto a nova matriz e adotada
