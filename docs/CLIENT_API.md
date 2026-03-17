# CVG HIS - Client API Documentation

Este documento descreve o padrão de consumo da API via `src/lib/api.ts`.

## `apiFetch<T>`

Todas as chamadas HTTP para o backend `his-api` devem utilizar a função `apiFetch`. Ela encapsula a lógica de autenticação, injeção de headers de contexto e tratamento padronizado de erros.

### Exemplo de Uso

```typescript
import { apiFetch, ApiError, isApiError } from '@/lib/api';

async function loadData() {
  try {
    const data = await apiFetch<MyDataType>('/endpoint');
    console.log(data);
  } catch (error) {
    if (isApiError(error)) {
      console.error(`Erro API (Req ID: ${error.requestId}):`, error.message);
    } else {
      console.error('Erro desconhecido:', error);
    }
  }
}
```

## Headers Automáticos

O `apiFetch` injeta automaticamente os seguintes headers, quando disponíveis na sessão:

- `Authorization`: `Bearer <token>`
- `x-request-id`: UUID v4 gerado para cada requisição (para rastreabilidade).
- `x-account-id`: ID da conta (tenant) atual.
- `x-role`: Role do usuário atual.
- `x-user-id`: ID do usuário logado.
- `x-unit-id`: ID da unidade atual (se houver).

## Tratamento de Erros (`ApiError`)

A classe `ApiError` foi estendida para facilitar a depuração e observabilidade.

### Propriedades

- `status` (number): Código HTTP (ex: 400, 404, 500). Retorna `0` em caso de erro de rede.
- `message` (string): Mensagem legível (vinda do backend ou texto padrão).
- `payload` (unknown): Corpo da resposta de erro (JSON ou texto).
- `requestId` (string, opcional): ID da requisição gerado pelo frontend. Útil para correlacionar logs.
- `url` (string, opcional): URL chamada.
- `method` (string, opcional): Método HTTP (GET, POST, etc).

### Helper `isApiError`

Utilize o type guard `isApiError(algumErro)` para verificar se o erro capturado é uma instância de `ApiError` e acessar suas propriedades com segurança de tipo.

## Fluxo de Autenticação

- Retorno **401 Unauthorized**: O `apiFetch` intercepta automaticamente, limpa o token local e redireciona o browser para `/login`.

## Boas Práticas

1. **Sempre use tipos genéricos**: `apiFetch<MeuTipoResponse>(...)` para garantir tipagem do retorno.
2. **Exiba o Request ID ao usuário**: Em mensagens de erro críticas (Toast ou Alert), mostre o ID para facilitar o suporte.
3. **Não capture erros silenciosamente**: Logue ou mostre ao usuário, sempre usando o helper de erro.
