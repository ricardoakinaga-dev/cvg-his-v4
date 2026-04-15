# Plano: Implementar Hubs de Tutores e Animais (ERP Profundidade)

**Data:** 2026-04-14  
**Pendente:** MÉDIO | ERP profundidade | Hubs tutores/animais não implementados  
**Fonte:** docs/Enterprise (plano mestre 0206, seções A2 e A3)

---

## 1. Diagnóstico do Gap

### O que os docs Enterprise exigem (plano 0206, seções A2/A3)

#### Hub de Tutor (seção A2)
O tutor deve funcionar como **hub de relacionamento completo**:
- Identificação principal + documentos
- Múltiplos contatos com preferências
- Consentimentos LGPD
- Situação financeira resumida
- **Animais vinculados**
- Agenda do tutor
- Comandas / faturamento
- Orçamento
- Comunicação (WhatsApp/email)
- Ações rápidas: novo animal, abrir atendimento, abrir comanda, enviar mensagem

#### Hub de Animal (seção A3)
O paciente deve funcionar como **hub clínico longitudinal**:
- Identificação clínica + tutor principal
- Raça, espécie, sexo, idade
- Alergias, doenças crônicas, temperamento
- Histórico de peso, vacinas, protocolos
- Agenda futura, últimos atendimentos
- Exames, internações, prescrições
- Timeline clínica
- Ações rápidas: agendar, iniciar atendimento, abrir prontuário

### O que existe hoje no código

| Componente | Status | Observação |
|---|---|---|
| Schema `owners` | ✅ Implementado | Basic, falta: contacts completo, address, preferencias |
| Schema `patients` | ✅ Implementado | Basic, falta: alertas ricos, temperamento, microchip |
| `OwnersService` | ✅ Implementado | In-memory seeds, persistência opcional via repo |
| `PatientsService` | ✅ Implementado | In-memory seeds, persistência opcional via repo |
| `DatabaseOwnerRepository` | ✅ Implementado | CRUD básico, contacts apenas email/phone |
| `DatabasePatientRepository` | ✅ Implementado | CRUD básico |
| `DatabaseOwnerPatientLinkRepository` | ✅ Implementado | Relações tutor-animal |
| **Rotas API /owners** | ❌ Não existe | Precisa ser implementado |
| **Rotas API /patients** | ❌ Não existe | Precisa ser implementado |
| **SPA services** | ❌ Não existe | Precisa ser implementado |
| **SPA pages (hub tutor)** | ❌ Não existe | Detalhe completo com animais vinculados |
| **SPA pages (hub animal)** | ❌ Não existe | Detalhe clínico longitudinal |
| **Endereço/residência tutor** | ❌ Não implementado no schema | addressJson existe mas não é usado |
| **Alertas richness** | ⚠️ Parcial | alertsJson existe mas só `{}` é persistido |
| **LGPD consentimentos** | ❌ Não existe | Ligação com módulo LGPD não feita |
| **Financeiro resumido** | ❌ Não existe | Ligação com billing/financial não feita |
| **Timeline animal** | ❌ Não existe | Não há agregação de eventos clínicos |

---

## 2. Plano de Execução

### Fase 1 — Backend de Tutor Completo
**Responsável:** backend / API routes

1. **Criar `owners.routes.ts`** em `apps/api/src/routes/`
   - `GET /owners` — listagem com search, paginação
   - `GET /owners/:id` — detalhe completo do tutor
   - `POST /owners` — criação
   - `PUT /owners/:id` — atualização
   - `DELETE /owners/:id` — soft delete
   - `GET /owners/:id/patients` — animais vinculados ao tutor
   - `GET /owners/:id/financial-summary` — resumo financeiro (futuro, marcar como placeholder)

2. **Melhorar `DatabaseOwnerRepository`**
   - Mapear e persistir todos os contacts (hoje só email/phone)
   - Persistir e retornar `addressJson`
   - Marcar `financialResponsible` no schema

3. **Criar schema de consentimento LGPD** (se não existir) e vincular ao tutor

4. **Melhorar `OwnersService`**
   - Métodos para buscar animais do tutor (`getPatientsOfOwner`)
   - Ligação com módulo LGPD para consentimentos

### Fase 2 — Backend de Animal Completo
**Responsável:** backend / API routes

1. **Criar `patients.routes.ts`** em `apps/api/src/routes/`
   - `GET /patients` — listagem com search, paginação
   - `GET /patients/:id` — detalhe completo do animal
   - `POST /patients` — criação
   - `PUT /patients/:id` — atualização
   - `DELETE /patients/:id` — soft delete
   - `GET /patients/:id/owner` — tutor do animal
   - `GET /patients/:id/timeline` — timeline clínica agregada (encounters, prescriptions, exams, internments)
   - `GET /patients/:id/alerts` — alertas (alergias, condições crônicas)
   - `PUT /patients/:id/alerts` — atualizar alertas

2. **Melhorar `DatabasePatientRepository`**
   - Persistir alertas rich (alergias, condições crônicas, temperament)
   - Mapear microchip, temperamento

3. **Melhorar `PatientsService`**
   - Método `getTimeline(patientId)` — agregar eventos clínicos
   - Método `getAlerts(patientId)` — retornar alertas formatados

4. **Criar endpoint de timeline** que agrega:
   - Encounters do paciente
   - Prescriptions
   - Exam orders/results
   - Inpatient stays
   - discharges

### Fase 3 — Frontend SPA
**Responsável:** frontend / SPA

1. **Criar SPA service `owners.ts`**
   - Métodos chamando `/owners` e `/owners/:id`
   - Include patients linked

2. **Criar SPA service `patients.ts`**
   - Métodos chamando `/patients` e `/patients/:id`
   - Include owner info, timeline

3. **Criar página Hub de Tutor** `apps/spa/src/pages/owners/[id].vue`
   - Header: nome, documento, contatos, status
   - Seção: animais vinculados (cards)
   - Seção: agenda do tutor
   - Seção: resumo financeiro (placeholder por enquanto)
   - Seção: consentimentos LGPD
   - Ações rápidas: novo animal, abrir atendimento

4. **Criar página Hub de Animal** `apps/spa/src/pages/patients/[id].vue`
   - Header: nome, espécie, raça, idade, tutor principal
   - Seção: perfil clínico (alergias, doenças crônicas, temperamento)
   - Seção: histórico de peso
   - Seção: timeline clínica
   - Seção: Vaccinations e protocolos
   - Ações rápidas: agendar, atendimento, prontuário

### Fase 4 — Integração e Dados
**Responsável:** cross-cutting

1. **Vincular hub tutor a billing** — resumo de contas em aberto
2. **Vincular hub animal a encounters** — timeline real
3. **Vincular hub tutor a notifications** — preferências de contato
4. **Remover seeds `acc_cvg_demo`** — usar dados reais do banco
5. **Atualizar OpenAPI** com novos endpoints

---

## 3. Definição de Pronto

O hub será considerado **DONE** quando:

1. ✅ Navegação oficial pubblicada (menu)
2. ✅ Página de detalhe do tutor com animais vinculados (real data)
3. ✅ Página de detalhe do animal com timeline clínica (real data)
4. ✅ API REST completa (`/owners/*`, `/patients/*`)
5. ✅ Persistência real em PostgreSQL
6. ✅ Permissões (RBAC) e auditoria
7. ✅ Telemetria / métricas mínimas
8. ✅ Testes de contrato e fluxo
9. ✅ Documentação atualizada em `docs/Enterprise`

---

## 4. Ordem de Execução Sugerida

```
1. rotas/owners.ts + rotas/patients.ts (API backend)
2. DatabaseOwnerRepository + DatabasePatientRepository (melhorias)
3. OwnersService + PatientsService (métodos de hub)
4. SPA services owners.ts + patients.ts
5. SPA pages owners/[id].vue
6. SPA pages patients/[id].vue
7. Timeline aggregation + financial summary (Fase 4)
8. Remover acc_cvg_demo seeds
9. Atualizar OpenAPI
```

---

## 5. Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Schema owners não tem campo `status` | Adicionar migration para `status` |
| `addressJson` existe mas não é populado | Atualizar repository a usar o campo |
| Timeline depende de múltiplos módulos (encounters, prescriptions) | Criar endpoint agregado que consulte outros serviços |
| Seeds `acc_cvg_demo` ainda em uso | Garantir que novo código use account real do contexto |
