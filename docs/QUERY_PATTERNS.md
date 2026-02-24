# Padrões TanStack Query (React Query)

O HIS Web V2 utiliza o **TanStack Query** para gerenciamento de estado assíncrono (server state).

## Estrutura Básica

- **Client**: Configurado em `src/lib/query/queryClient.ts` com defaults estritos (30s staleTime, retry 1).
- **Provider**: `src/app/providers.tsx` envolve a aplicação.
- **Hooks**: Todo acesso a dados deve ser encapsulado em custom hooks em `src/features/<feature>/queries.ts` ou `mutations.ts`.

## Query Keys

Utilizamos **Query Key Factories** para garantir consistência e facilitar invalidação de cache.

**Padrão:**
```typescript
export const featureKeys = {
  all: ['feature'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters: any) => [...featureKeys.lists(), { ...filters }] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
};
```

**Exemplo (Patients):**
- `['patients']`
- `['patients', 'list', { q: 'max', page: 1 }]`
- `['patients', 'detail', '123']`

## Polling e Real-time

Para dados críticos (Mapas, Alertas), usamos polling ao invés de WebSocket (V1). Utilize o helper `usePollingQueryOptions`:

```typescript
import { usePollingQueryOptions } from '@/lib/query/utils';

// Em um hook
useQuery({
  ...usePollingQueryOptions('BED_MAP'), // 30s
  queryKey: bedMapKeys.detail(wardId),
  queryFn: ...
});
```

| Tipo | Intervalo | Uso |
|---|---|---|
| `BED_MAP` | 30s | Mapa de Leitos (Internação) |
| `ALERTS` | 30s | Alertas Clínicos Críticos |
| `MAR` | 60s | Medication Administration Record |

## Mutações

Use `useMutation` para operações de escrita (POST, PUT, PATCH, DELETE).

**Regra de Ouro**: Sempre invalide as queries relacionadas após o sucesso (`onSuccess`).

```typescript
const queryClient = useQueryClient();

useMutation({
  mutationFn: updatePatient,
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
    queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
  }
});
```
