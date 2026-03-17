# Relatório de Auditoria: `apps/his-web`

Este relatório detalha a estrutura, padrões e bibliotecas identificados no projeto `apps/his-web` para garantir compatibilidade futura.

## 1. Estrutura e Padrões de Pasta
- **Framework**: Next.js 14.2.0 (App Router).
- **Diretório Base**: `src/` está presente.
- **Roteamento**: App Router (`src/app`).
- **Componentes**: Localizados em `src/components`.
- **Lógica de Negócio**: `src/lib` contém clientes de API, auth e schemas.

## 2. Bibliotecas e Padrões Identificados

| Categoria | Estado Atual / Biblioteca | Observação |
|-----------|---------------------------|------------|
| **UI** | **Nenhuma biblioteca externa**. | Uso extensivo de **Inline Styles** (ex: `style={{ border: '1px solid...' }}`). Não há Tailwind, MUI ou Shadcn. |
| **State** | **React Hooks nativos** (`useState`, `useEffect`). | Não há TanStack Query, SWR ou Redux. O data fetching é feito manualmente em `useEffect`. |
| **Forms** | **Controlled Inputs** manuais. | Não há React Hook Form ou Formik. O estado do formulário é gerenciado via `useState` com objetos simples. |
| **Validação** | **Zod**. | Schemas definidos em `src/lib/schemas.ts`. A validação é chamada manualmente nos handlers de submit. |
| **Auth** | **Custom Cookie Implementation**. | Token armazenado no cookie `his_token`. Lógica em `src/lib/auth.ts`. Middleware protege rotas `/login`. |

## 3. API Client (`src/lib/api.ts`)
Existe um cliente HTTP robusto implementado manualmente.
- **Wrapper**: Função `apiFetch` encapsula o `fetch` nativo.
- **Auth**: Injeta automaticamente o header `Authorization: Bearer <token>` obtido via `getAuthSession()`.
- **Contexto**: Injeta headers customizados de conta/role se disponíveis (`x-account-id`, `x-role`, etc.).
- **Tratamento de Erro**: Classe `ApiError` customizada. Redireciona para `/login` em caso de 401.
- **Tipagem**: Funções fortemente tipadas (ex: `getPatientSummary`, `createEncounter`).

**⚠️ Regra de Compatibilidade**: Qualquer nova chamada de API **DEVE** usar o `apiFetch` exportado de `src/lib/api.ts` e não o `fetch` nativo, para garantir que as credenciais e headers de contexto sejam passados corretamente.

## 4. Variáveis de Ambiente
- **Padrão**: Acesso via `process.env`.
- **Setup**: `next.config.js` não expõe envs explicitamente, confiando no Next.js para carregar `.env`.
- **Variáveis Chave**:
  - `NEXT_PUBLIC_HIS_API_BASE_URL` (Frontend)
  - `HIS_API_BASE_URL` (Server-side fallback)
  - `PORT` (Uso em scripts de start)

## 5. O Que Está Faltando (Gaps Identificados)
1.  **Sistema de Design**: A ausência de um framework CSS (Tailwind) ou biblioteca de componentes (MUI/Shadcn) torna a UI difícil de escalar e manter consistente. Todo estilo é inline.
2.  **Gerenciamento de Estado Async**: O uso de `useEffect` para data fetching é propenso a "waterfalls" e race conditions. Bibliotecas como TanStack Query seriam benéficas.
3.  **Gerenciamento de Formulários**: Formulários manuais geram muito boilerplate.

## 6. Regras de Compatibilidade (Não Quebrar)
1.  **Auth Flow**: Não altere o nome do cookie `his_token` ou a estrutura de `AuthSession` em `src/lib/api.ts` sem refatorar o `middleware.ts` e o backend.
2.  **Inline Styles**: Ao criar novos componentes, siga o padrão de *inline styles* existente OU proponha uma migração completa para Tailwind. Misturar padrões deixará o código caótico.
3.  **API Client**: Utilize sempre as funções de `src/lib/api.ts`.
