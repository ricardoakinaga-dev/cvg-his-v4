# Modelagem Inicial de Acesso - CVG-HIS

## Objetivo
Definir a modelagem conceitual e técnica para autenticação, autorização, escopos e auditoria no contexto hospitalar veterinário do CVG-HIS.

## Modelo de controle de acesso adotado
- Base principal: RBAC relacional.
- Complemento: permissões granulares por recurso/ação.
- Extensão planejada: escopos contextuais.
- Futuro compatível com ABAC:
  - supervisão
  - assinatura
  - regras por contexto clínico
  - break-glass

## Entidades-base já existentes
- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `audit_events`

## Entidades complementares propostas

### 1. `auth_sessions`
Finalidade:
- rastrear sessões ativas;
- permitir revogação;
- suportar auditoria de login/logout;
- preparar base para sessão por dispositivo.

Campos sugeridos:
- `id`
- `account_id`
- `user_id`
- `unit_id`
- `issued_at`
- `expires_at`
- `revoked_at`
- `revoked_reason`
- `last_seen_at`
- `ip_address`
- `user_agent`
- `auth_method`
- `created_at`
- `updated_at`

### 2. `access_scopes`
Finalidade:
- catalogar escopos hospitalares reutilizáveis.

Campos sugeridos:
- `id`
- `account_id`
- `scope_type`
- `scope_key`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`

Tipos iniciais esperados:
- `unit`
- `sector`
- `module`
- `context`

### 3. `user_scope_assignments`
Finalidade:
- vincular usuário a escopos específicos.

Campos sugeridos:
- `user_id`
- `scope_id`
- `granted_by_user_id`
- `granted_at`
- `expires_at`

### 4. `role_scope_templates` ou equivalente futuro
Finalidade:
- permitir vincular templates de escopo por papel sem travar a Fase 1.

Observação:
- pode ficar fora do MVP inicial se aumentar demais a complexidade.

### 5. `user_permission_grants` opcional
Finalidade:
- suportar exceções controladas por usuário.

Uso recomendado:
- apenas se necessário para casos administrativos específicos;
- não substituir o modelo principal baseado em roles.

## Modelo de usuário

### Estado desejado
Usuário hospitalar individual, não compartilhado.

Campos atuais relevantes:
- `email`
- `password_hash`
- `full_name`
- `account_id`
- `unit_id`
- `is_active`

Evoluções recomendadas:
- `username` opcional único por conta
- `last_login_at`
- `password_changed_at`
- `must_change_password`
- `failed_login_attempts`
- `locked_until`

## Modelo de autenticação

### Login aceito
- e-mail + senha
- username + senha

### Hash de senha
- padrão alvo: `scrypt` já suportado na base
- fallback temporário para hashes legados durante migração

### Sessão
- JWT assinado continua como credencial de transporte
- cada token deve apontar para uma sessão persistida (`sessionId`)
- logout passa a revogar sessão

### Expiração
- expiração curta a moderada para access token
- renovação futura possível por refresh token ou renovação de sessão segura

### Recuperação de senha
Estrutura futura:
- tabela de tokens/requisições de reset
- token de uso único
- validade curta
- auditoria obrigatória

## Modelo de autorização

### Níveis
1. Usuário autenticado
2. Roles atribuídos ao usuário
3. Permissões herdadas de roles
4. Permissões diretas excepcionais, se adotadas
5. Escopos aplicáveis
6. Regras contextuais futuras

### Convenção de permissões
Padrão:
- `<recurso>.<acao>`

Exemplos alinhados ao domínio:
- `users.read`
- `users.create`
- `users.update`
- `users.disable`
- `roles.read`
- `roles.create`
- `roles.update`
- `permissions.read`
- `permissions.manage`
- `sessions.read`
- `sessions.revoke`
- `audit_logs.read`
- `patient.read`
- `patient.create`
- `patient.update`
- `medical_record.read`
- `medical_record.write`
- `medical_record.sign`
- `lab_order.create`
- `lab_result.read`
- `imaging_order.create`
- `inventory.read`
- `inventory.adjust`
- `billing.read`
- `billing.create`
- `financial_reports.read`
- `system.settings.manage`

### Compatibilidade com o legado
- O projeto já usa permissões como `patient.read`, `note.write`, `financial_account.read`.
- A estratégia será manter compatibilidade e evoluir gradualmente.
- Onde houver nova nomenclatura, a fase de transição deve mapear equivalências claramente.

## Papéis hospitalares-alvo

### Papéis nucleares
- `superadmin`
- `diretoria`
- `coordenacao_medica`
- `veterinario`
- `residente`
- `enfermagem`
- `recepcao`
- `laboratorio`
- `imagem`
- `farmacia_estoque`
- `financeiro`
- `administrativo`

### Relação inicial com a base atual
- `admin` atual será tratado como papel legado de alta permissão.
- `vet` mapeia para `veterinario`.
- `enfermagem` e `recepcao` podem ser preservados.
- Demais perfis serão adicionados de forma incremental.

## Matriz resumida inicial por perfil

### Recepção
- pode:
  - cadastrar tutor/paciente
  - operar agenda
  - acompanhar fluxo operacional
  - atuar em faturamento operacional básico quando permitido
- não pode:
  - editar prontuário clínico
  - acessar relatórios financeiros estratégicos

### Veterinário
- pode:
  - ler e escrever prontuário
  - registrar evolução
  - pedir exames
  - prescrever
  - assinar quando aplicável
- não pode:
  - acessar relatórios financeiros estratégicos por padrão

### Residente
- pode:
  - registrar conteúdo clínico conforme política
  - produzir rascunhos/evoluções
- restrição esperada:
  - assinatura final e certas ações podem exigir supervisão futura

### Enfermagem / internação
- pode:
  - acompanhar internação
  - registrar administração e acompanhamento assistencial
  - ler contexto clínico necessário
- não deve:
  - atuar como assinante clínico final de conteúdos privativos do médico

### Laboratório / imagem
- pode:
  - operar pedidos e resultados do respectivo domínio
- não deve:
  - navegar livremente por prontuário completo ou financeiro

### Farmácia / estoque
- pode:
  - operar itens, saldo e movimentos necessários
- não deve:
  - ver prontuário completo nem relatórios financeiros estratégicos

### Financeiro
- pode:
  - faturamento
  - contas
  - recebíveis
  - relatórios financeiros
- não deve:
  - acessar prontuário clínico detalhado

## Escopos hospitalares

### Exemplos de escopo
- unidade:
  - matriz
  - filial
  - hospital-escola
- setor:
  - internacao
  - recepcao
  - laboratorio
  - radiologia
  - ultrassonografia
  - farmacia
  - financeiro
- módulo:
  - prontuario
  - agenda
  - estoque
  - faturamento

### Regras de uso
- permissões concedem capacidade.
- escopos delimitam onde a capacidade vale.
- exemplo:
  - um usuário pode ter `inventory.read`, mas apenas no escopo `farmacia`.

## Modelo de auditoria

### Eventos mínimos obrigatórios
- `auth.login.success`
- `auth.login.failed`
- `auth.logout`
- `user.created`
- `user.updated`
- `user.disabled`
- `user.password.reset`
- `user.roles.updated`
- `user.permissions.updated`
- `user.scopes.updated`
- `session.revoked`

### Campos já suportados por `audit_events`
- ator
- ação
- entidade
- before/after
- motivo
- requestId
- escopo por conta

### Evoluções recomendadas
- categorizar risco/sensibilidade do evento
- registrar metadados operacionais relevantes para IAM:
  - `sessionId`
  - `ip`
  - `userAgent`
- avaliar trilha de leitura sensível quando viável

## Diretrizes de implementação
- Não confiar em papel vindo do frontend.
- Não confiar em permissões informadas pelo cliente.
- Resolver acesso a partir da sessão válida e dados do backend.
- Toda rota sensível deve exigir autenticação e permissão.
- Toda operação administrativa deve ser auditada.

## Resultado esperado desta modelagem
- Base suficiente para:
  - autenticação segura
  - autorização granular
  - escopo hospitalar
  - auditoria forte
  - evolução futura com MFA, assinatura, supervisão e regras contextuais
