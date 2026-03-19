# Auditoria de Segurança e Compliance: cvg_his

**Data:** 18/02/2026
**Auditor:** Antigravity (Google Deepmind)
**Escopo:** Autenticação, Autorização, Infraestrutura, Privacidade de Dados (LGPD/HIPAA)

---

## 1. Resumo Executivo

O sistema `cvg_his` atualmente **NÃO é seguro para deploy em produção na internet aberta**.

Embora os modelos internos de **Autorização (RBAC)** e **Isolamento de Dados** sejam sólidos, o mecanismo de **Autenticação** é efetivamente inexistente (stubbed para desenvolvimento), e a API é vulnerável a falsificação de identidade trivial se não for protegida por um API Gateway estritamente configurado.

**Classificação de Risco:** **CRÍTICA**
**Prontidão de Compliance:** **Baixa (devido a lacunas de AuthN)**, mas o potencial é **Alto**.

---

## 2. Vulnerabilidades Críticas (Severidade: Crítica)

### 2.1. Autenticação é um "Dev Stub"
*   **Achado**: A Página de Login (`apps/his-web/src/app/login/page.tsx`) não verifica credenciais. Ela pede que o usuário *cole* um token e um `accountId`.
*   **Achado**: A API (`apps/his-api/src/modules/auth/service.ts`) confia cegamente nos headers `x-user-id`, `x-account-id` e `x-role` de **qualquer** fonte.
*   **Impacto**: Qualquer um pode personificar um Admin enviando uma requisição curl com `x-role: admin`.
*   **Mitigação**:
    *   **Imediata**: NÃO exponha a `his-api` diretamente. Use um API Gateway (Kong/Nginx) que lide com AuthN e *injete* esses headers.
    *   **Correção Adequada**: Implementar `/auth/login` na API, emitir JWTs assinados e verificar a assinatura do JWT em `requestContext.ts` antes de confiar nas claims.

### 2.2. Headers de Segurança de Infraestrutura Ausentes
*   **Achado**: `server.ts` usa `cors`, mas carece de headers de segurança (ex: `helmet`, `content-security-policy`).
*   **Impacto**: Risco aumentado de ataques XSS, clickjacking e content sniffing em interações com o cliente.
*   **Mitigação**: Instalar `@fastify/helmet` e configurar CSP estrita.

---

## 3. Altos Riscos (Severidade: Alta)

### 3.1. Lacunas no Gerenciamento de Segredos
*   **Achado**: `JWT_SECRET` é definido no `docker-compose` mas está **ausente** do `envSchema` em `apps/his-api/src/plugins/env.ts`.
*   **Impacto**: A aplicação pode iniciar sem um segredo (se o código for atualizado para usá-lo), ou usar um segredo inseguro padrão, sem falhar rapidamente.

### 3.2. Lacuna de Auditoria de Acesso de Leitura (Compliance)
*   **Achado**: Operações de Escrita (Criar/Atualizar Paciente) são auditadas via `append()`. No entanto, operações de **Leitura** (ex: `getPatientSummary`) em `apps/his-api/src/modules/patients/summary.ts` recuperam dados sensíveis **sem** criar uma entrada de log de auditoria.
*   **Impacto**: Violação de princípios HIPAA/LGPD (Contabilização de Divulgações). Você não pode provar quem visualizou o registro de um paciente VIP.
*   **Mitigação**: Chamar `append({ action: 'patient.view', ... })` em `getPatientSummary`.

---

## 4. Pontos Fortes e Mitigações Presentes

*   **Implementação RBAC**: O módulo `packages/rbac` é excelente. Permissões são granulares (`patient.read` vs `patient.write`) e corretamente aplicadas no middleware `requirePermission`.
*   **Isolamento de Dados**: Schema Drizzle e lógica da API aplicam consistentemente filtragem por `accountId`, prevenindo vazamento de dados entre inquilinos (assumindo que o header `accountId` seja confiável).
*   **Validação de Input**: Uso generalizado de schemas `Zod` protege contra ataques comuns de Injeção e adulteração de payload.
*   **Redação de Logs**: `apps/his-api/src/lib/logger.ts` redige corretamente headers de Autorização e Cookies.

---

## 5. Roadmap de Remediação

### Fase 1: Hardening (Imediato)
1.  **Implementação de Gateway**: Deploy de Nginx/Kong na frente da `his-api`. Configurar para:
    *   Remover todos os headers `x-account-id`, `x-user-id`, `x-role` de requisições externas.
    *   Validar um JWT (emitido por um IdP ou Auth0/Cognito).
    *   Injetar os headers confiáveis apenas após validação.
2.  **Guarda de Modo Dev**: Adicionar uma verificação em `resolveActorFromHeaders`: se `NODE_ENV === 'production'`, lançar erro se a requisição não vier de um IP de gateway confiável (ou exigir certificado mTLS).

### Fase 2: Auth Nativa (Recomendado)
1.  Implementar `POST /auth/login` na `his-api`:
    *   Validar `email` e `password` contra a tabela `users` (usando `bcrypt` no `passwordHash`).
    *   Emitir um `JWT` assinado contendo `accountId`, `userId`, `role`.
2.  Atualizar `requestContext.ts`:
    *   Verificar a assinatura do JWT usando `JWT_SECRET`.
    *   Extrair claims do JWT em vez de headers crus.

### Fase 3: Compliance e Monitoramento
1.  Adicionar chamadas `append()` a serviços de "Leitura" para entidades sensíveis (Pacientes, Notas Clínicas).
2.  Implementar middleware de `rate-limit` para prevenir ataques de força bruta no novo endpoint de login.

---

## 6. Pontuação de Prontidão Zero-Trust: **20/100**
*   **Por que**: O sistema atualmente confia completamente na rede (headers). Ele falha nos princípios Zero-Trust ("Nunca Confie, Sempre Verifique").

## 7. Pontuação de Prontidão de Compliance: **60/100**
*   **Por que**: Boa estrutura de dados e auditoria de escrita, mas a falta de auditoria de leitura e autenticação forte impede a certificação.
