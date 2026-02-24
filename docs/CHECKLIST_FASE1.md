# Checklist de Validação - Fase 1

Use este checklist para garantir que a entrega está completa e funcional antes do deploy ou merge.

## 1. Funcionalidades Core
- [x] **Busca Global (`/reception`)**
    - [x] Input foca ao digitar `/`.
    - [x] Não busca com menos de 2 caracteres.
    - [x] Exibe resultados de Tutores e Pacientes separadamente.
    - [x] Clicar em "Iniciar Atendimento" leva para `/reception/start`.

- [x] **Cadastro de Tutor (`/owners/new`)**
    - [x] Validação de campos obrigatórios (Nome).
    - [x] Erro de API exibido via Toast.
    - [x] Redirecionamento para perfil do tutor após sucesso.

- [x] **Cadastro de Paciente (`/patients/new`)**
    - [x] Seleção de Tutor obrigatória (componente de busca).
    - [x] Validação de campos obrigatórios (Nome, Espécie).
    - [x] Alertas médicos salvos corretamente.

- [x] **Fluxo Rápido (`/reception/quick`)**
    - [x] Wizard avança passo-a-passo.
    - [x] Estado preservado entre passos (não perde dados se errar validação).
    - [x] Criação de Encounter automática no final.

## 2. UX & UI
- [x] **Sidebar**: Link "Recepção" destacado e no topo.
- [x] **Estados de Carregamento**: Botões mostram spinner/texto "Carregando..." durante requisições.
- [x] **Feedback**: Mensagens de Sucesso/Erro via Toast em todas as ações de escrita.
- [x] **Autofocus**: Campos principais (Nome) focados ao abrir formulários.

## 3. Código & Qualidade
- [x] **Build**: `npx tsc --noEmit` roda sem erros.
- [x] **Tipagem**: Zod Schemas (`src/contracts/openapi-lite.ts`) sincronizados com API.
- [x] **Organização**: Componentes reutilizáveis em `src/components`.

## 4. Pendências Conhecidas (Backlog Fase 2)
- [ ] Upload de foto do paciente.
- [ ] Impressão de etiqueta na admissão.
- [ ] Edição de dados (apenas Criação foi priorizada na Fase 1).
