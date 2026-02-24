# Integration Audit: his-web vs his-api

## Diagnóstico das Páginas Quebradas

| Página / Rota | Problema Relatado | Causa Raiz | Fix Planejado |
| ------------- | ----------------- | ---------- | ------------- |
| `/geral/clientes/novo` | "Cliente não encontrado / Erro ao carregar dados do cliente" | Rota conflitante. O Next.js interpreta "novo" como `[id]` e tenta buscar na API: `GET /owners/novo`. | Criar rota dedicada `/geral/clientes/novo/page.tsx`. Adicionar trava em `[id]/page.tsx` para redirecionar se o ID for "novo" ou falhar com 404 se não for um UUID válido. |
| `/geral/animais/novo` | Retorna 404 | Falta de página. Não existe a rota `/geral/animais/novo` nem validação no `[id]`. | Criar `[id]/page.tsx` e `novo/page.tsx` com as mesmas proteções do cliente. |
| `/internacao/painel` | "Internal server error" | 500 no `his-api`. Possivelmente falta de contexto tenant (account_id), data vazia falhando no BD, ou payload da API fora do contrato esperado. A requisição provavelmente chega em `GET /inpatient/panel` (ou rota similar) e o backend quebra. | Investigar a rota de internação (`/inpatient` / `/wards` e `/beds`) no backend. Se der vazio, retornar `200 []` em vez de 500. Tratamento adequado do tenant no dev. |
| `/imagem/agenda` | "Erro ao carregar agenda" | Rota da API não existe ou baseURL incorreta. O frontend possivelmente tenta `GET /imaging/schedule` ou similar, mas essa rota não está mapeada no `his-api`. | Criar endpoint MVP de compatibilidade no `his-api` (`GET /imaging/schedule`) retornado lista vazia ou DTO mínimo para não quebrar a UI. |
| `/settings/geral` | "Erro ao carregar configurações" | Endpoint de settings não existe ou baseURL/auth falhando. Frontend chama `GET /settings/geral`. | Criar ou adaptar router `settingsRoutes` com `GET /settings/:namespace` com mock/array vazio retornando status 200. |

## Plano de Correções Globais

### 1. Comunicação HTTP Padronizada
- A comunicação entre o frontend e backend será padronizada via Same-Origin API Proxy do Next.js.
- O Frontend fará chamadas para `/api/proxy/*`.
- O Next reescreve para `HIS_API_INTERNAL_URL` (`http://127.0.0.1:3000`).
- Teremos um API Client único `src/lib/api/client.ts`.

### 2. Tenant Context no Dev
- Injetar no `his-api` comportamento para considerar variáveis locais ou headers (`x-account-id`, `x-user-id`) fixos se a requisição vier sem autenticação apropriada, prevenindo retornos 401/403/500 em modo de desenvolvimento local para fins de integração do UI.

### 3. Garantir 200 ao invés de 500
- Nenhuma das listagens da UI deverá ser preenchida com um retorno de erro 500 se o banco de dados não contiver registros. Elas devem retornar HTTP 200 com arrays vazios (empty state).
