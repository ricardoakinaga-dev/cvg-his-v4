# Relatório de Estratégia de Autenticação e Segurança

Este documento detalha a implementação atual de Autenticação, Multi-tenancy e RBAC no ecossistema `cvg-his`, identificando lacunas críticas para o desenvolvimento do frontend.

## 1. Auth Contract: Como funciona o Login?

### Situação Atual (As-Is)
O sistema opera em um modelo **"Trust-Based / Gateway Offloaded"**.
- **NÃO existe endpoint de login na API (`his-api`)**.
- A API não emite tokens, nem valida assinaturas JWT, nem controla expiração.
- A API espera receber a identidade do usuário já resolvida através de headers HTTP (`x-user-id`, `x-role`, etc.).

### Implementação no Front-end (`his-web`)
O login atual (`src/app/login/page.tsx`) é **simulado/manual**:
1.  O usuário digita um Token, Account ID e Role manualmente.
2.  O front-end salva esses dados em Cookies (`his_token`) e LocalStorage.
3.  O `apiFetch` (`src/lib/api.ts`) lê esses dados e os injeta em **toda requisição** para o backend.

### Lacunas Críticas
> [!WARNING]
> O Front-end não tem como "autenticar" de verdade. Ele apenas armazena o que o usuário digita.
> **Pergunta para o Backend Team:**
> 1.  Quem é o Identity Provider (IdP)? (Auth0, Keycloak, serviço `his-auth` externo?)
> 2.  Qual é o endpoint para trocar `user/pass` por `token`?
> 3.  Como o front-end deve validar se o token é legítimo antes de salvar?

---

## 2. Tenant Strategy: Multi-tenancy

O sistema é **Multi-tenant** baseado em `Account ID`.

- **Identificação**: O Tenant é identificado pelo UUID da conta (`accountId`).
- **Transmissão**: O header `x-account-id` é obrigatório em todas as requisições API.
- **Isolamento**: O backend usa esse header para filtrar dados no banco (ex: `WHERE account_id = $1`).

**Regra para o Front-end:**
- O `accountId` deve ser obtido no momento do login.
- Deve ser persistido na sessão (`AuthSession`).
- Nunca fazer chamadas API sem este contexto.

---

## 3. RBAC Strategy: Permissões e Roles

O sistema possui um RBAC (Role-Based Access Control) estrito e bem definido no pacote `@cvg-his/rbac`.

### Roles Definidas
O sistema reconhece 4 papéis canônicos (`CanonicalRole`):
1.  `admin`: Acesso total (`*`).
2.  `vet` (Veterinário): Acesso clínico (pacientes, receitas, prontuários) + Leitura de auditoria.
3.  `enfermagem`: Acesso assistencial (administração de meds, triagem, leitura de prontuário, handovers).
4.  `recepcao`: Acesso administrativo (cadastro de owners/pacientes, agendamento, admissão).

### Permissions Map
As permissões são granulares (ex: `patient.read`, `medorder.stop`).
- **Backend**: O middleware `requirePermission('permissao')` bloqueia a rota se o header `x-role` (ou `x-permissions`) não tiver a permissão necessária.
- **Front-end**: Deve usar a lógica de `@cvg-his/rbac` (função `can(user, permission)`) para ocultar/desabilitar botões.

**Regra para o Front-end:**
- Não hard-code regras como `if (role === 'vet')`.
- Use: `if (can(user, 'medorder.write'))`.

---

## 4. Token Refresh Strategy

**NÃO EXISTE.**
- Como não há endpoint de login, também não há refresh token, endpoint `/refresh` ou rotação de chaves.
- O token é tratado como uma string opaca de longa duração (ou controlada externamente).

**Recomendação Imediata:**
Se o projeto não for implementar um IdP próprio agora, assuma que o token é estático. Se houver expiração (401), o `apiFetch` já redireciona para `/login` para o usuário reinserir as credenciais.

---

## 5. Resumo das Regras para o Front-End (Guard Rules)

1.  **Middleware de Proteção**: O `src/middleware.ts` já verifica a presença do cookie `his_token`. Não altere isso.
2.  **Injeção de Headers**: Use SEMPRE `apiFetch` ou `createApiClient`. Nunca use `fetch` nativo diretamente, pois perderá os headers de contexto (`x-account-id`, `x-role`).
3.  **Validação de Sessão**: Ao carregar a app, verifique se `accountId` e `role` existem na sessão. Se não, force logout (`clearAuthToken`).
4.  **UI Condicional**: Importe `can` e `PERMISSIONS` de `@cvg-his/rbac` para renderizar componentes condicionalmente.

## 6. Perguntas para o Backend (Action Items)

Para fechar o contrato de autenticação, precisamos destas respostas:

1.  **Authorization**: "Existe algum serviço externo (ex: Lambda, Kong) que irá validar o Bearer Token antes da requisição chegar na API? Ou devemos confiar que qualquer string no header `Authorization` é válida?" (Atualmente a API ignora o valor do token e confia nos headers `x-*`).
2.  **Login Real**: "Haverá uma tela de login real integrada com um IdP? Se sim, precisamos da documentação da API de Auth (OIDC/OAuth2)."
