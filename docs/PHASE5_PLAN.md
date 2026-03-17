# Plano Fase 5: Otimização do MAR (Medication Administration Record)

## Objetivo
Transformar a experiência do MAR de "input manual de UUID" para um fluxo de navegação hierárquico (Ala -> Paciente -> MAR), garantindo usabilidade e prevenindo erros, respeitando as limitações atuais da API.

## Arquivos Afetados/Criados

### Modificação
- **`src/components/MedDueList.tsx`**:
  - Aceitar `stayId` via props (opcional).
  - Se `stayId` for passado via props, esconder o formulário de input manual e carregar dados automaticamente.
  - Manter comportamento atual se `stayId` não for passado (retrocompatibilidade).

- **`src/app/inpatient/mar/page.tsx`**:
  - Transformar em um "Wizard" de seleção.
  - Estado local para `selectedWard` e `selectedStay`.

### Criação
- **`src/features/inpatient/components/WardSelector.tsx`** (Novo):
  - Listar alas (`getWards`).
  - Permitir seleção.

- **`src/features/inpatient/components/StayList.tsx`** (Novo):
  - Listar pacientes internados na ala selecionada (`listInpatientStays`).
  - Mostrar cards com info básica (Nome, Leito, Admissão).
  - Botão "Abrir MAR".

## Ordem de Implementação

1.  **Refactor `MedDueList`**:
    - Adicionar prop `stayId?: string`.
    - Ajustar `useEffect` para carregar se prop existir.
    - Condicionar renderização do input.

2.  **Componentes de Seleção**:
    - Criar `WardSelector`: Simples `select` ou lista de cards.
    - Criar `StayList`: Tabela ou Grid de pacientes da ala.

3.  **Montagem da Página (`/inpatient/mar`)**:
    - Implementar máquina de estados simples: `SELECTION` | `MAR_VIEW`.
    - Se `!selectedStay`: Mostrar seletores.
    - Se `selectedStay`: Mostrar `MedDueList` + Botão "Voltar para Lista".

## Riscos e Mitigação

-   **Fan-out / Performance**:
    -   *Risco*: Tentar carregar o MAR de todos os pacientes da ala de uma vez.
    -   *Mitigação*: Não faremos "Ward View" (Visão Geral da Ala) com doses agora. O fluxo é drill-down estrito: Seleciona Ala -> Seleciona Paciente -> Carrega Doses. Isso mantém 1 request de doses por vez.

-   **Rate Limit**:
    -   *Risco*: Usuário navegando muito rápido entre pacientes.
    -   *Mitigação*: React Query (já em uso ou cache simples) evitaria re-fetches, mas com `useEffect` manual atual, apenas garantir cleanup se o componente desmontar.

-   **UX - Voltar**:
    -   *Risco*: Usuário perder contexto ao clicar em "Voltar".
    -   *Mitigação*: Manter estado da Ala selecionada no componente pai (`page.tsx`) para que ao voltar do MAR, a lista de pacientes daquela ala continue visível.

## Critérios de Aceitação

1.  Acessar `/inpatient/mar` não pede mais UUID manual, e sim mostra lista de Alas.
2.  Ao selecionar Ala, lista Pacientes Ativos.
3.  Ao selecionar Paciente, abre o MAR (componente `MedDueList`) filtrado.
4.  É possível voltar para a lista de pacientes sem recarregar a página (client-side state).
5.  Funcionalidades de Administrar/Checar/Atrasar continuam funcionando no contexto do stay selecionado.
