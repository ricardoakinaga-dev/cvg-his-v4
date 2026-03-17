# FASE 3: Gestão de Internação (Nurse Station) - Concluída

## 1. Rotas Implementadas

| Rota | Descrição | Status |
|---|---|---|
| `/inpatient/stays` | **Dashboard de Internações**: Lista pacientes internados com filtros (Ala, Status) e KPIs. | ✅ |
| `/inpatient/stays/[id]` | **Nurse Station (Detalhes)**: Visão completa do paciente internado, incluindo Prescrições, MAR e Logs. | ✅ |
| `/inpatient/bedmap` | **Mapa de Leitos**: (Existente) Melhorado com link direto para "Abrir Stay". | ✅ |

## 2. Fluxos Verificados

### Navegação e Acesso
- [x] **Acesso via Sidebar**: Novo item "Internações (Stays)" adicionado.
- [x] **Acesso via BedMap**: Botão "Abrir Stay" nos cards de leitos ocupados leva direto ao Nurse Station.
- [x] **Listagem**: Busca e filtragem de internações ativas/históricas funciona.

### Nurse Station (Estação de Enfermagem)
- [x] **Cabeçalho**: Exibe dados do paciente, tempo de internação e status.
- [x] **Prescrição**: Painel `MedOrdersPanel` integrado para visualizar e (com permissão) criar/editar ordens.
- [x] **MAR (Medication Administration Record)**:
  - Painel `StayMarPanel` dedicado ao stay.
  - Seleção de janela de tempo (1h, 2h, 3h, 4h).
  - Registro de ações: `Administrar`, `Recusar`, `Atrasar`.
  - Controle de permissões (`medadmin.read`/`write`) com feedback visual.
- [x] **Logs**: Histórico de administrações com identificação do usuário.

### Ações Administrativas
- [x] **Transferência**: Modal de transferência de leito/ala funcional.
- [x] **Alta (Discharge)**: Modal de alta hospitalar funcional.
- [x] **Integração com Plantão**: Botão "Abrir Plantão da Ala" leva para `/inpatient/handovers` com contexto pré-preenchido.

## 3. Endpoints Integrados

Abaixo a lista de funções do `src/lib/api.ts` utilizadas nesta fase:

**Gestão de Stays:**
- `listInpatientStays` (Listagem e Detalhes)
- `transferInpatient`
- `dischargeInpatient`
- `admitInpatient` (via BedMap)

**Estrutura:**
- `getWards`
- `getBedMap`

**Medicação (Ordens):**
- `listMedicationOrders`
- `createMedicationOrder`
- `updateMedicationOrder`
- `stopMedicationOrder`
- `getAuditEvents`

**Medicação (Administração/MAR):**
- `getMedicationDueDoses`
- `listMedicationAdministrations`
- `createMedicationAdministration`
- `getMedicationLogs`

## 4. Segurança e RBAC

Refatoração centralizada em `src/lib/permissions.ts`.
- **Enfermagem**: Acesso total ao MAR, Leitura de Ordens.
- **Veterinário**: Acesso total a Ordens, Leitura de MAR.
- **Recepção**: Admissão/Alta, Leitura de Mapa.
