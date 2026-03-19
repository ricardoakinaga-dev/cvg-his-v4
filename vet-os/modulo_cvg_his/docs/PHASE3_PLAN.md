# Plano de Implementação - Fase 3: Gestão de Internação

## Objetivos
Implementar o fluxo completo de internação, permitindo visualizar pacientes internados, gerenciar leitos, prescrições e administrações de medicamentos.

## 1. Auditoria e Rotas

### Rotas Existentes (Mantos)
- `/inpatient/bedmap` (Mapa de Leitos)
- `/inpatient/mar` (Mapa de Administração de Medicamentos)
- `/inpatient/handovers` (Passagem de Plantão)

### Novas Rotas a Criar
- `/inpatient/stays`: Dashboard de Internação (Lista de pacientes ativos).
- `/inpatient/stays/[id]`: Detalhes da Internação (SPA enterprise).

## 2. Novos Componentes (Features)

### Feature: `src/features/inpatient`
| Componente | Função |
| :--- | :--- |
| `InpatientDashboard.tsx` | Lista/Kanban de pacientes internados com filtros por Ala (Ward). |
| `StayHeader.tsx` | Cabeçalho fixo com dados do paciente, leito atual e status. |
| `StayTabs.tsx` | Navegação interna: "Prescrições", "Administrações", "Logs", "Care Plan". |
| `StayMedicationTab.tsx` | Orquestrador para `MedOrdersPanel` e `MedDueList`. |
| `StayCarePlanTab.tsx` | Visualização e edição do plano de cuidados (integrado ao Handover). |

## 3. Integrações e Fluxos

### BedMap (Mapa de Leitos)
- **Atual**: Exibe cards de leitos.
- **Modificação**: Ao clicar em um leito "Ocupado", navegar para `/inpatient/stays/[stayId]`.
- **Modificação**: Ao clicar em "Liberar" (Discharge), atualizar o status e redirecionar para `/inpatient/bedmap`.

### MAR (Medication Administration Record)
- **Atual**: Lista geral de doses a administrar.
- **Modificação**: Clicar no paciente redireciona para `/inpatient/stays/[stayId]?tab=medications`.

## 4. Análise da API (Riscos e Mitigações)

### Endpoints Disponíveis
- `getWards`, `getBedMap` ✅
- `admitInpatient`, `transferInpatient`, `dischargeInpatient` ✅
- `listInpatientStays` ✅
- `medication-orders` (CRUD) ✅
- `medication-administrations` (Create/List) ✅

### Riscos Identificados
1.  **Falta de `getInpatientStay(id)`**:
    - O arquivo `api.ts` não exporta uma função para buscar uma internação específica por ID.
    - **Mitigação A**: Usar `listInpatientStays` filtrando no client-side (OK para volumes baixos, ruim para escala).
    - **Mitigação B (Recomendada)**: Solicitar/Implementar endpoint `GET /inpatient/stays/:id`.
2.  **Concorrência em Prescrições**:
    - Múltiplos usuários editando a mesma prescrição.
    - **Mitigação**: Usar Optimistic Updates com reversão em caso de erro.

## 5. Critérios de Aceitação
- [ ] Rota `/inpatient/stays` lista todos os pacientes ativos.
- [ ] Rota `/inpatient/stays/[id]` carrega corretamente via URL.
- [ ] É possível admitir um paciente via BedMap.
- [ ] É possível prescrever um medicamento (MedOrder) dentro da internção.
- [ ] É possível registrar administração (MedAdmin) e ver o log.
- [ ] Alta (Discharge) libera o leito no BedMap.
