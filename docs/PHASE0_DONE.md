# FASE 0 CONCLUÍDA

A Fase 0 (Fundação e Hardening) foi concluída com sucesso. O `his-web` agora possui uma base sólida, segura e testável para o desenvolvimento das features de negócio.

## O que foi entregue?

### 1. Hardening & Segurança
- **Autenticação Robusta**: Validação Zod estrita para Sessão e Login. Separação de Token (Cookie) e Metadados (Storage).
- **RBAC no Frontend**: Sistema de permissões com componentes `<Can />` e `<DisableIfCannot />` baseados em `@cvg-his/rbac`.
- **Session Guards**: Proteção de rotas via `AppShell`.

### 2. UI & UX Foundation
- **Design System**: Tokens em `src/lib/theme.ts`.
- **Componentes Base**: Primitives (`Button`, `Input`, `Badge`, `Spinner`, `Card`, `EmptyState`) padronizados.
- **Layout**: `AppShell`, `Sidebar`, `Topbar` refatorados.

### 3. API & Observabilidade
- **Cliente API Tipado**: `apiFetch` com tratamento de erros, `x-request-id` automático e refresh token logic (stub).
- **TanStack Query (React Query)**: Integrado para gerenciamento de estado server-side, com padrão de polling e query keys.

### 4. Qualidade & Testes
- **Pipeline de Testes**: Vitest + Testing Library configurados.
- **Cobertura Inicial**: Testes unitários para `theme`, `auth`, `api` e componentes de RBAC.

## Arquivos Chave Alterados/Criados

- `src/lib/auth.ts`: Lógica core de sessão.
- `src/lib/api.ts`: Cliente HTTP wrapper.
- `src/lib/rbac.ts`: Hooks de permissão.
- `src/components/layout/*`: Estrutura da aplicação.
- `src/app/login/page.tsx`: Login validado.
- `vitest.config.ts` e `src/*.test.ts`: Infraestrutura de testes.

## Como Rodar

### Desenvolvimento
```bash
npm run dev
```

### Testes
```bash
npm test
```

### Build de Produção
```bash
npm run build
npm start
```

## Próximos Passos
A aplicação está pronta para receber os formulários complexos de negócio (Fase 1/7+), começando pelo **Cadastro de Pacientes Completo** e **Prontuário Eletrônico**.
