# Controle de Acesso Baseado em Função (RBAC) no Frontend

O `his-web` utiliza o pacote compartilhado `@cvg-his/rbac` para gerenciar permissões. A verificação é feita no lado do cliente com base nos dados da sessão (token, role, permissions).

## Componentes

### 1. `<Can />`
Use para **esconder** elementos que o usuário não tem permissão para ver.

```tsx
import { Can } from '@/components/auth/Can';
import { PERMISSIONS } from '@/lib/rbac';

<Can permission={PERMISSIONS.PATIENT_WRITE}>
  <Button>Novo Paciente</Button>
</Can>
```

#### Props:
- `permission`: string (use constante `PERMISSIONS`)
- `fallback`: ReactNode (opcional, ex: mensagem de erro ou componente alternativo)

### 2. `<DisableIfCannot />`
Use para **desabilitar** elementos (opacidade reduzida, `disabled=true`) mas mantê-los visíveis. Ideal para ações que o usuário deve saber que existem, mas não pode executar.

```tsx
import { DisableIfCannot } from '@/components/auth/DisableIfCannot';

<DisableIfCannot permission={PERMISSIONS.ENCOUNTER_WRITE}>
  <Button>Editar Atendimento</Button>
</DisableIfCannot>
```

> **Nota:** O componente filho deve aceitar a prop `disabled` (como `Button` ou `Input`).

## Hooks e Funções

### `usePermission(permission: string): boolean`
Hook para lógica condicional mais complexa.

```tsx
const canEdit = usePermission(PERMISSIONS.PATIENT_WRITE);
```

### `getCurrentPrincipal()`
Retorna o objeto `RbacPrincipal` atual ({ role, permissions[] }).

## Permissões Disponíveis

Consulte `packages/rbac/src/permissions.ts` para a lista completa. As mais comuns:

- `patient.read` / `patient.write`
- `owner.read` / `owner.write`
- `encounter.read` / `encounter.write`
- `medadmin.read` / `medadmin.write` (Prescrição/Administração)

## Segurança
Lembre-se: **Validação no frontend é apenas para UX.** A segurança real é garantida pela API, que deve validar o token/permissões em cada requisição.
