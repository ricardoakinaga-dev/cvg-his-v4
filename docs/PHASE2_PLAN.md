# Plano Fase 2: Prontuário Eletrônico & Refatoração Clínica

**Autor:** Antigravity Tech Lead
**Data:** 19/02/2026
**Contexto:** A página atual de encounter (`src/app/encounters/[id]/page.tsx`) é um monólito funcional mas de difícil manutenção e evolução. A Fase 2 foca em modularizar, melhorar a UX clínica e preparar o terreno para features complexas (prescrição, internação).

---

## 1. Auditoria da Página Atual
**Arquivo:** `src/app/encounters/[id]/page.tsx` (~800 linhas)

### 1.1 Mapa de Funcionalidades Existentes
| Bloco | Estado Atual | Problemas Identificados |
|---|---|---|
| **Carregamento** | `useEffect` + `Promise.all` (Timeline + Templates). | Lógica de retry/error manual. |
| **Header** | Exibe IDs, datas e status brutos. | Pouca hierarquia visual. Dificuldade de leitura rápida. |
| **Timeline** | Lista de botões simples na esquerda. | Não parece uma "linha do tempo". Difícil ver histórico. |
| **SOAP Editor** | Bloco gigante com 4 textareas e states locais. | Misturado com lógica de página. Sem auto-save. Styles inline. |
| **Ações de Nota** | `create`, `update`, `version`, `sign` misturados. | Complexidade ciclomática alta no handler de erros. |
| **Documentos** | Input file simples e lista básica. | Sem preview, sem drag-and-drop, sem categorias. |
| **Medicação** | Componente externo `MedOrdersPanel`. | Único ponto positivo de arquitetura atual. |

### 1.2 Principais Problemas
1.  **Acoplamento**: A lógica de *fetching*, *form state* e *business rules* (ex: pode assinar?) está toda no componente da página.
2.  **Estilização Inline**: Uso excessivo de `style={{ ... }}` dificulta a manutenção do tema e responsividade.
3.  **UX Pobre**: O médico precisa rolar muito a página. Não há resumo lateral do paciente (alergias, peso) visível enquanto se edita a nota.
4.  **Feedback Visual**: Erros e Sucessos usam textos simples condicinais, não o componente `Toast` padronizado na Fase 1.

---

## 2. Estratégia de Refatoração (Plan Components)

O objetivo é "quebrar" o monólito em componentes especializados em `src/components/encounter/` e `src/components/clinical/`.

### 2.1 Novos Arquivos e Estrutura

```text
src/app/encounters/[id]/
  ├── page.tsx                  # (Controller) Orchestrator, fetch data, layout grid
  └── components/               # (Componentes Locais)
       ├── EncounterHeader.tsx  # Resumo do Topo (Status, Datas, Título)
       ├── ClinicalTimeline.tsx # Visualização cronológica (Esquerda)
       ├── SoapEditor.tsx       # Editor (Form, Templates, Ações)
       ├── DocumentsCard.tsx    # Galeria e Upload
       └── PatientSummary.tsx   # Sidebar Direita (Alergias, Peso, Vacinas)
```

### 2.2 Detalhamento dos Componentes

#### A. `SoapEditor.tsx` (Prioridade Alta)
- **Props**: `initialData`, `readOnly`, `onSave(data, reason)`, `onSign()`, `onVersion(data, reason)`.
- **Responsabilidade**: Gerir os 4 campos, aplicar templates, validar input.
- **Melhoria**: Usar `react-hook-form` ou manter state controlado isolado.

#### B. `ClinicalTimeline.tsx`
- **Props**: `events: EncounterTimelineEvent[]`, `onSelectNote(id)`.
- **Responsabilidade**: Renderizar eventos (Nota criada, assinada, doc anexado) em ordem cronológica vertical bonita.
- **Melhoria**: Ícones visuais para cada tipo de evento.

#### C. `EncounterHeader.tsx`
- **Props**: `encounter: EncounterRecord`, `patient: Patient`.
- **Responsabilidade**: Mostrar contexto. Botão de "Voltar", Status (Badge), Datas.

#### D. `PatientSummary.tsx` (Novo)
- **Props**: `patient: Patient`.
- **Responsabilidade**: Ficar fixo na direita (sticky). Mostrar:
  - Alertas Críticos (Agressivo, Alergias).
  - Peso atual.
  - Idade.

---

## 3. Plano de Execução (Step-by-Step)

Para minimizar risco, faremos a refatoração em ordem de independência.

### Passo 1: Extração do Header e Summary
1. Criar `EncounterHeader.tsx`.
2. Criar `PatientSummary.tsx` (baseado nos dados que já temos no `getEncounterTimeline` ou fetch adicional).
3. Atualizar `page.tsx` para usar Grid Layout (Timeline | Editor | Summary).

### Passo 2: Extração do SoapEditor
1. Mover lógica de `soapForm`, `templates`, `reason` para `SoapEditor.tsx`.
2. Mover lógica de validação (`normalizeSoapForm`) para utils ou dentro do componente.
3. `page.tsx` passa a ser apenas passador de props e manipulador de chamadas API finais (`api.updateClinicalNote`).

### Passo 3: Melhoria da Timeline
1. Criar `ClinicalTimeline.tsx` substituindo a lista de botões bruta.
2. Implementar visualização de itens mistos (Notas + Documentos + Eventos de sistema).

### Passo 4: Refatoração de Documentos
1. Criar `DocumentsCard.tsx` melhorado.

### Passo 5: Limpeza Final
1. Remover todo código morto de `page.tsx`.
2. Padronizar `toast` para feedbacks.
3. Verificar responsividade.

---

## 4. Critérios de Aceitação
- [ ] `page.tsx` deve ter menos de 200 linhas.
- [ ] Nenhum `style={{ ... }}` complexo inline (usar `theme` ou classes utilitárias se houver).
- [ ] "Editor Clínico" deve funcionar independentemente do resto.
- [ ] Sidebar de Resumo do Paciente visível em telas grandes.
- [ ] Timeline mostra ícones diferentes para Nota vs Documento.
- [ ] Build `tsc` sem erros.
