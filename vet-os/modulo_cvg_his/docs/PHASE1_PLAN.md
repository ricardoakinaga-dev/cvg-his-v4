# Plano de Implementação - Fase 1: Recepção e Cadastro

**Objetivo**: Implementar o fluxo completo de Recepção Hospitalar, permitindo buscar, cadastrar e gerenciar Tutores (Owners) e Pacientes (Patients), com foco em UX ágil para os recepcionistas.

## 1. Auditoria e Lacunas Identificadas

### Rotas Faltantes
- `/reception`: Dashboard operacional da recepção.
- `/owners`: Listagem/Busca de tutores.
- `/owners/new`: Cadastro de novo tutor.
- `/owners/[id]`: Edição de tutor (Existente, mas precisa revisão).
- `/patients/new`: Cadastro de paciente (vinculado a tutor).

### Componentes
- `OwnerForm` e `PatientForm`: Existem, mas focados em edição (`PATCH`). Precisam suportar criação (`POST`).
- Falta componente de "Busca Unificada" (Tutor ou Paciente) para a tela de recepção.

### API (`src/lib/api.ts`)
- Faltam métodos explícitos:
  - `createOwner(payload)`
  - `createPatient(payload)`
  - `getOwners(params)` (Listagem)
  - `getPatients(params)` (Listagem)

## 2. Estratégia de Implementação

### Passo 1: API Client & Schemas
Atualizar `src/lib/api.ts` para incluir os métodos de criação e listagem, tipados corretamente com Zod schemas de `src/contracts/openapi-lite.ts`.

### Passo 2: Formulários Inteligentes
Refatorar `OwnerForm` e `PatientForm` para funcionarem no modo "Dual" (Create/Edit).
- **Create**: Validação completa, sem ID inicial.
- **Edit**: Carrega dados iniciais, permite alteração parcial.
- Uso de `react-hook-form` + `zodResolver`.

### Passo 3: Rota `/reception`
Criar uma "Landing Page" para a recepção com:
- Busca grande e visível (Auto-focus).
- Botões de Ação Rápida: "Novo Tutor", "Emergência".
- Lista de "Chegadas Recentes" ou "Agendamentos" (Mock inicial se backend não suportar).

### Passo 4: Fluxo de Cadastro de Tutor (`/owners/new`)
- Formulário de Tutor.
- Ao salvar -> Redirecionar para `/owners/[id]` ou oferecer "Cadastrar Paciente Agora".

### Passo 5: Fluxo de Cadastro de Paciente (`/owners/[id]/patients/new`)
- Rota aninhada ou parâmetro `?ownerId=...`.
- Pré-selecionar o Tutor.
- Formulário de Paciente.

## 3. Lista de Tarefas (Execution Plan)

### A. Core & API
- [ ] Atualizar `src/lib/api.ts` com `createOwner`, `createPatient`, `getOwners`, `getPatients`.
- [ ] Criar hooks React Query: `useCreateOwner`, `useCreatePatient` em `src/hooks/useReception.ts`.

### B. Componentes
- [ ] Refatorar `OwnerForm.tsx` (Props: `initialData?`, `onSubmit`).
- [ ] Refatorar `PatientForm.tsx` (Props: `initialData?`, `ownerId`, `onSubmit`).
- [ ] Criar `ReceptionSearch.tsx` (Componente de busca otimizado).

### C. Páginas (Routes)
- [ ] Implementar `/reception/page.tsx` (Layout específico, sem Sidebar completo ou com Sidebar colapsada?). *Decisão: Manter AppShell padrão.*
- [ ] Implementar `/owners/new/page.tsx`.
- [ ] Implementar `/owners/[id]/page.tsx` (Refinamento da view de detalhes + Lista de Pacientes do Tutor).
- [ ] Implementar `/patients/new/page.tsx` (Query param `?ownerId=uuid`).

### D. Integração UI
- [ ] Adicionar "Recepção" no `Sidebar`.
- [ ] Adicionar botão "Novo Paciente" na tela do Tutor.

## 4. Riscos e Mitigação
- **Duplicidade**: Risco de cadastrar tutor duplicado. *Mitigação*: Busca prévia obrigatória ou sugestão de "Semelhantes" (Future). Por agora, confiar na busca da `/reception`.
- **Navegação**: Usuário se perder entre criar tutor e criar paciente. *Mitigação*: Feedback visual claro (Toasts) e redirecionamento automático lógico (Criou Tutor -> Vai para tela do Tutor com botão de "Novo Paciente" pulsando/destaque).

## 5. Critérios de Aceite
- [ ] Recepcionista consegue buscar tutor por nome/documento.
- [ ] Recepcionista consegue cadastrar novo tutor.
- [ ] Recepcionista consegue cadastrar novo paciente para um tutor.
- [ ] Validações de formulário funcionam (Email, CPF, Campos obrigatórios).
- [ ] Feedback de sucesso/erro via Toast.
