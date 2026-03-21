# Plano Geral de Implementação IAM - CVG-HIS

## Objetivo
Implementar um módulo robusto de autenticação, cadastro de usuários, perfis, privilégios, escopos, sessões e auditoria, preservando compatibilidade com a arquitetura atual do CVG-HIS.

## Princípios de implementação
- Backend como fonte de verdade para autenticação e autorização.
- Evolução incremental sobre a base existente.
- Compatibilidade com o monorepo atual e com as rotas já publicadas.
- Sem segurança exclusiva no frontend.
- Toda ação sensível deve ser auditável.
- Preferência por soft-disable em vez de exclusão física de registros sensíveis.

## Estratégia macro
Em vez de substituir o sistema atual, a implementação seguirá um reforço estrutural em camadas:

1. Consolidar a fundação relacional de IAM já existente.
2. Fazer o login emitir tokens baseados em papéis e permissões reais do banco.
3. Introduzir sessões persistidas e auditáveis.
4. Expandir a modelagem para escopos hospitalares.
5. Adicionar gestão administrativa e regras hospitalares iniciais.

## Fases

### Fase 0 - Diagnóstico e planejamento
- Ler a base.
- Documentar estado atual.
- Mapear inconsistências.
- Produzir modelagem inicial de acesso.

### Fase 1 - Fundação de identidade e acesso
- Revisar e complementar schema para IAM.
- Criar estruturas faltantes:
  - sessões
  - escopos
  - vínculos de escopo
  - eventuais permissões diretas por usuário, se necessárias
- Atualizar seeds iniciais.
- Criar serviços base de usuários, roles e permissões.

### Fase 2 - Login, sessão e segurança básica
- Resolver usuário por e-mail ou username.
- Validar senha com hash seguro.
- Emitir token com claims mínimas e confiáveis.
- Persistir sessão no backend.
- Implementar logout e expiração.
- Auditar login, falha e logout.

### Fase 3 - Autorização granular real
- Resolver permissões pelo banco.
- Aplicar middleware/guard central.
- Proteger endpoints críticos restantes.
- Introduzir leitura de escopos.
- Alinhar frontend ao contexto real de sessão/permissão.

### Fase 4 - Gestão administrativa
- CRUD de usuários.
- Gestão de papéis e matriz de permissões.
- Atribuição de roles e escopos.
- Desativação lógica.
- Reset administrativo de senha.
- Auditoria de alterações administrativas.

### Fase 5 - Regras hospitalares iniciais
- Formalizar matriz por perfil hospitalar.
- Separar acesso clínico, operacional e financeiro.
- Preparar assinatura/supervisão futura.
- Reforçar auditoria de recursos sensíveis.
- Produzir backlog pós-MVP.

### Fase 6 - Consolidação e entrega
- Revisão técnica final.
- Testes mínimos e smoke tests.
- Validação de migrations e seeds.
- Documentação operacional e resumo executivo.

## Decisões arquiteturais propostas

### 1. Fonte de verdade do acesso
- Tokens continuarão sendo usados para autenticação de requisições.
- Papéis e permissões serão resolvidos a partir do banco no momento da emissão e/ou revalidação da sessão.
- O pacote `packages/rbac` passará a funcionar como catálogo canônico compartilhado e utilitário de interface, mas não como única fonte operacional de autorização.

### 2. Compatibilidade progressiva
- O middleware `requirePermission` será preservado e fortalecido.
- As rotas existentes continuarão exigindo permissões por chave string.
- O frontend continuará usando sessão cacheada para UX, mas o backend seguirá validando tudo.

### 3. Claims mínimas no token
- Preferência por manter no token apenas:
  - `sub`/`userId`
  - `accountId`
  - `unitId` principal, se aplicável
  - `sessionId`
  - `roles`
  - permissões efetivas, se necessário para performance
- Sessões persistidas no banco permitirão revogação e auditoria.

### 4. Escopos
- O modelo inicial de escopo será hospitalar e extensível:
  - unidade
  - setor
  - contexto funcional
  - eventual associação a recursos específicos no futuro

### 5. Auditoria
- Reuso de `audit_events`.
- Padronização de ações IAM:
  - `auth.login.success`
  - `auth.login.failed`
  - `auth.logout`
  - `user.created`
  - `user.updated`
  - `user.disabled`
  - `user.password.reset`
  - `user.roles.updated`
  - `user.scopes.updated`
  - `session.revoked`

## Entregas técnicas previstas por camada

### Banco
- Novas migrations organizadas no pacote `packages/db`.
- Evolução do schema sem quebrar tabelas existentes.
- Seeds idempotentes e seguras.

### Backend
- Serviços de IAM dedicados.
- Rotas administrativas de usuários/roles/permissões.
- Fluxo de autenticação e sessão persistida.
- Guards/middlewares reforçados.
- Auditoria de IAM.

### Frontend
- Tela de login alinhada ao backend real.
- Gestão administrativa de usuários e perfis.
- Matriz de permissões.
- Leitura da sessão atual.
- Reflexo visual das permissões reais.

### Testes
- Testes de autenticação.
- Testes de autorização.
- Testes de seeds/migrations quando viável.
- Smoke tests dos fluxos principais.

## Riscos já conhecidos
- Divergência entre permissões hardcoded em `packages/rbac` e permissões usadas nas rotas.
- Possível impacto em módulos já publicados se o formato das claims mudar de forma brusca.
- Necessidade de migração de hashes legados.
- Necessidade de manter compatibilidade com `dev-login` durante a transição local.

## Mitigações
- Fazer mudanças compatíveis e incrementais.
- Registrar todas as decisões em relatórios por fase.
- Introduzir fallback controlado para hashes legados enquanto a migração é concluída.
- Cobrir o fluxo de autorização com testes antes de expandir o frontend administrativo.

## Critério de sucesso
- Usuários autenticam de forma segura com backend como fonte de verdade.
- Papéis e permissões são geridos no banco.
- Rotas críticas negam acesso indevido mesmo sem frontend.
- Eventos sensíveis ficam auditáveis.
- A base fica pronta para MFA, assinatura, supervisão clínica e escopos avançados.
