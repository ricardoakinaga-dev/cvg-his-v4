# CVG-HIS — Assessment R1–R3

Data: 2026-03-17

## Objetivo

Registrar o estado atual do `modulo_cvg_his` em relação ao backlog funcional de R1, R2 e R3, usando três faixas de classificação:

- **Pronto/forte**
- **Parcial**
- **Ausente ou muito fraco**

Este documento serve como fonte de verdade para:

1. priorização de produto
2. planejamento técnico
3. quebra do R3 em sprints
4. acompanhamento de evolução futura

---

# Resumo executivo

## Leitura geral

O estado atual do `modulo_cvg_his` indica que o projeto está mais próximo de um:

- **HIS veterinário hospitalar robusto**

...do que de um:

- **ERP veterinário operacional completo**

## Conclusão principal

- **R1** está bem avançado
- **R2** está muito avançado
- **R3** é o principal gap atual

## Maiores forças atuais

- auth / RBAC / base multi-tenant
- patients / owners / encounters
- clinical notes / patient context / auditoria
- internação / leitos / setores
- prescrição / aprazamento / MAR / administrações
- handover e visão operacional hospitalar

## Maiores lacunas atuais

- agenda clínica
- configuração operacional da agenda
- billing clínico / comanda
- catálogo comercial mínimo
- contas a receber básicas
- fluxo integrado agenda → atendimento → exame → cobrança
- laboratório/imagem ativos de forma clara na árvore atual

---

# Classificação por release

# R1 — Núcleo clínico operacional

## Quadro resumido

| Épico | Status | Observação curta |
|---|---|---|
| R1-01 Auth, usuários e controle de acesso | Parcial avançado | Backend e estrutura fortes; acabamento operacional ainda precisa validação |
| R1-02 Tenant, configurações e fundação operacional | Parcial | Multi-tenant e base técnica existem; settings de produto não parecem maduros |
| R1-03 Cadastros mestre assistenciais | Pronto/forte | Owners, patients e páginas principais existem |
| R1-04 Atendimento clínico / Encounter | Pronto/forte | Encounter está claro no backend, frontend e schema |
| R1-05 Evolução clínica e prontuário | Pronto/forte | Clinical notes com create/update/version/sign |
| R1-06 Patient context e visão consolidada | Pronto/forte | Bloco bem estruturado e com boa densidade clínica |
| R1-07 Documentos básicos e consentimentos | Parcial | Documentos existem; consentimento/termo ainda não parece módulo rico |
| R1-08 Auditoria e rastreabilidade | Pronto/forte | Auditoria, actor/requestContext e eventos críticos já aparecem maduros |

## R1-01 — Auth, usuários e controle de acesso

**Status:** Parcial avançado

### Evidências
- `apps/his-api/src/modules/auth/*`
- `apps/his-api/src/modules/rbac/*`
- `packages/db/src/schema/users.ts`
- `packages/db/src/schema/roles.ts`
- `packages/db/src/schema/permissions.ts`
- `packages/db/src/schema/user_roles.ts`
- `packages/db/src/schema/role_permissions.ts`

### Leitura
A base de autenticação e autorização existe e parece real. Há estrutura de usuários, roles e permissões. O principal ponto em aberto é a maturidade do fluxo operacional/admin no frontend e o acabamento do ciclo completo de gestão.

### Conclusão
Boa base para R1, mas ainda classificada como **parcial** até confirmar a camada administrativa e a experiência completa.

---

## R1-02 — Tenant, configurações e fundação operacional

**Status:** Parcial

### Evidências
- `apps/his-api/src/modules/__tests__/crossTenant.test.ts`
- `packages/db/src/schema/accounts.ts`
- `apps/his-api/src/modules/build/routes.ts`
- `apps/his-api/src/modules/system/routes.ts`

### Leitura
Há sinais fortes de isolamento multi-tenant e de preocupação com build/system health. Por outro lado, o bloco de settings/configuração institucional como feature de produto não aparece tão claro ou maduro quanto o restante.

### Conclusão
Fundação técnica razoável, mas o aspecto funcional/configurável ainda parece **parcial**.

---

## R1-03 — Cadastros mestre assistenciais

**Status:** Pronto/forte

### Evidências
Backend:
- `apps/his-api/src/modules/owners/*`
- `apps/his-api/src/modules/patients/*`

Frontend:
- `apps/his-web/src/app/owners/*`
- `apps/his-web/src/app/patients/*`
- `apps/his-web/src/app/clients/*`

Schema:
- `packages/db/src/schema/owners.ts`
- `packages/db/src/schema/patients.ts`

### Leitura
Cadastro de tutor/cliente e paciente está claramente presente no sistema atual, com backend e frontend existentes.

### Conclusão
Esse épico está **pronto/forte**.

---

## R1-04 — Atendimento clínico / Encounter

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/encounters/*`
- `apps/his-web/src/app/encounters/*`
- `packages/db/src/schema/encounters.ts`

### Leitura
Encounter é uma entidade central já consolidada no código.

### Conclusão
Épico **pronto/forte**.

---

## R1-05 — Evolução clínica e prontuário

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/clinicalNotes/*`
- `packages/db/src/schema/clinical_notes.ts`
- `packages/db/src/schema/clinical_note_versions.ts`
- rotas com create/update/version/sign

### Leitura
O prontuário está além do básico: há versionamento e assinatura de notas clínicas.

### Conclusão
Épico **pronto/forte**.

---

## R1-06 — Patient context e visão consolidada

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/patientContext/*`
- tipos contemplando stay, encounter, ward, bed, alerts e contexto clínico

### Leitura
Esse parece ser um dos blocos mais maduros do sistema atual.

### Conclusão
Épico **pronto/forte**.

---

## R1-07 — Documentos básicos e consentimentos

**Status:** Parcial

### Evidências
- `apps/his-api/src/modules/documents/*`
- `packages/db/src/schema/documents.ts`
- `packages/db/src/schema/encounter_documents.ts`

### Leitura
Documentos e vínculo com encounter já existem. O que ainda não está claro como módulo maduro é o fluxo específico de termos/consentimentos/documentos formais mais ricos.

### Conclusão
Épico **parcial**.

---

## R1-08 — Auditoria e rastreabilidade

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/audit/*`
- `packages/db/src/schema/audit_events.ts`
- uso recorrente de `requestContext.actor`
- teste de isolamento cross-tenant

### Leitura
A preocupação com autoria, contexto e trilha de auditoria é real no sistema atual.

### Conclusão
Épico **pronto/forte**.

---

## Síntese do R1

### Pronto/forte
- R1-03
- R1-04
- R1-05
- R1-06
- R1-08

### Parcial
- R1-01
- R1-02
- R1-07

### Ausente ou muito fraco
- nenhum épico central de R1 aparece totalmente ausente

### Leitura final do R1
R1 está **bem encaminhado e funcionalmente robusto**.

---

# R2 — Núcleo hospitalar: internação e medicação

## Quadro resumido

| Épico | Status | Observação curta |
|---|---|---|
| R2-01 Estrutura hospitalar: setores e leitos | Pronto/forte | Wards, beds e bedmap estão presentes |
| R2-02 Internação: admissão, permanência e alta | Pronto/forte | Admit/transfer/discharge existem |
| R2-03 Eventos da internação e evolução assistencial | Parcial | Parte do comportamento está espalhada entre notes, logs, alerts e handovers |
| R2-04 Prescrição médica | Pronto/forte | Medication orders bem presente |
| R2-05 Aprazamento e horários de medicação | Pronto/forte | Schedules, doses e cálculo existem |
| R2-06 MAR / administração de medicamentos | Pronto/forte | Backend e telas específicas existem |
| R2-07 Impressão e visão operacional da internação | Parcial bom | Handovers e visão operacional já existem, mas ainda não parecem totalmente amplos |

## R2-01 — Estrutura hospitalar: setores e leitos

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/wards/*`
- `apps/his-api/src/modules/beds/*`
- `apps/his-api/src/modules/bedmap/*`
- `packages/db/src/schema/wards.ts`
- `packages/db/src/schema/beds.ts`
- `apps/his-web/src/app/inpatient/bedmap/page.tsx`

### Conclusão
Épico **pronto/forte**.

---

## R2-02 — Internação: admissão, permanência e alta

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/inpatient/*`
- rotas com `admit`, `transfer`, `discharge`, `getById`, `list`
- `packages/db/src/schema/inpatient_stays.ts`
- `apps/his-web/src/app/inpatient/stays/*`

### Conclusão
Épico **pronto/forte**.

---

## R2-03 — Eventos da internação e evolução assistencial

**Status:** Parcial

### Evidências
- `handovers/*`
- `alerts/*`
- `clinicalNotes/*`
- `medicationLogs/*`

### Leitura
Existe bastante material que ajuda a representar eventos assistenciais, mas o módulo de “eventos gerais da internação” não aparece tão explícito e consolidado como entidade própria.

### Conclusão
Épico **parcial**.

---

## R2-04 — Prescrição médica

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/medicationOrders/*`

### Conclusão
Épico **pronto/forte**.

---

## R2-05 — Aprazamento e horários de medicação

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/medicationSchedules/*`
- `apps/his-api/src/modules/medicationDoses/*`
- lógica de cálculo em `calc.ts`
- timezone em `timezone.ts`

### Conclusão
Épico **pronto/forte**.

---

## R2-06 — MAR / administração de medicamentos

**Status:** Pronto/forte

### Evidências
- `apps/his-api/src/modules/medicationAdministrations/*`
- `apps/his-api/src/modules/medicationLogs/*`
- `apps/his-web/src/app/inpatient/mar/page.tsx`

### Conclusão
Épico **pronto/forte**.

---

## R2-07 — Impressão e visão operacional da internação

**Status:** Parcial bom

### Evidências
- `apps/his-api/src/modules/handovers/*`
- `apps/his-web/src/app/inpatient/handovers/page.tsx`
- telas de bedmap e stays

### Leitura
A visão operacional existe e o handover aparece forte. Ainda assim, a camada completa de impressão/resumos operacionais pode ser expandida.

### Conclusão
Épico **parcial** com boa base.

---

## Síntese do R2

### Pronto/forte
- R2-01
- R2-02
- R2-04
- R2-05
- R2-06

### Parcial
- R2-03
- R2-07

### Ausente ou muito fraco
- nenhum épico central de R2 aparece realmente ausente

### Leitura final do R2
R2 está **muito avançado** e é uma das maiores fortalezas atuais do projeto.

---

# R3 — Operação clínica integrada

## Quadro resumido

| Épico | Status | Observação curta |
|---|---|---|
| R3-01 Agenda clínica | Ausente ou muito fraco | Não há módulo ativo de agenda consolidado |
| R3-02 Configuração operacional da agenda | Ausente | Não há disponibilidade/tipos/marcadores maduros |
| R3-03 Pedidos e resultados de exames | Parcial fraco | Não aparece como módulo ativo robusto na árvore atual |
| R3-04 Billing clínico e itens do atendimento | Ausente | Módulos correspondentes não estão ativos na árvore atual |
| R3-05 Catálogo comercial mínimo | Ausente | Products/services não aparecem como blocos ativos |
| R3-06 Fechamento de atendimento e contas a receber básicas | Ausente | Não há bloco financeiro operacional claro |
| R3-07 Fluxo integrado agenda → atendimento → exame → cobrança | Ausente | Depende de blocos ainda não consolidados |

## R3-01 — Agenda clínica

**Status:** Ausente ou muito fraco

### Evidências
- não há módulo ativo `agenda`
- não há schema atual de appointments na árvore principal
- o código atual não mostra rotas/telas consolidadas de agenda

### Conclusão
Épico **ausente** e deve ser um dos primeiros focos do próximo ciclo.

---

## R3-02 — Configuração operacional da agenda

**Status:** Ausente

### Evidências
- sem módulo ativo para disponibilidade
- sem tipos de atendimento claros
- sem marcadores/status de agenda maduros

### Conclusão
Épico **ausente**.

---

## R3-03 — Pedidos e resultados de exames

**Status:** Parcial fraco

### Evidências
- não há módulo ativo claramente robusto para `laboratory` ou `imaging` na árvore principal atual
- há referências residuais, mas não uma camada atual consolidada

### Conclusão
Épico **parcial fraco** e precisa de reconstrução/consolidação.

---

## R3-04 — Billing clínico e itens do atendimento

**Status:** Ausente

### Evidências
- módulos equivalentes de billing/services/products não aparecem ativos na árvore atual
- não há telas claras de comanda/fechamento operacional

### Conclusão
Épico **ausente**.

---

## R3-05 — Catálogo comercial mínimo

**Status:** Ausente

### Evidências
- ausência de módulos ativos de `products` e `services`
- ausência de schemas comerciais equivalentes na árvore principal atual

### Conclusão
Épico **ausente**.

---

## R3-06 — Fechamento de atendimento e contas a receber básicas

**Status:** Ausente

### Evidências
- não aparecem módulos de financeiro operacional, receivable ou comanda/checkout na versão ativa lida

### Conclusão
Épico **ausente**.

---

## R3-07 — Fluxo integrado agenda → atendimento → exame → cobrança

**Status:** Ausente

### Leitura
Como agenda, exames e billing não estão maduros/consolidados, o fluxo integrado também não está presente de forma real.

### Conclusão
Épico **ausente**.

---

## Síntese do R3

### Pronto/forte
- nenhum épico central de R3 aparece pronto

### Parcial
- R3-03

### Ausente ou muito fraco
- R3-01
- R3-02
- R3-04
- R3-05
- R3-06
- R3-07

### Leitura final do R3
R3 é o **maior gap atual do produto**.

---

# Quadro consolidado final

## Pronto/forte
- R1-03 Cadastros mestre assistenciais
- R1-04 Atendimento clínico / Encounter
- R1-05 Evolução clínica e prontuário
- R1-06 Patient context e visão consolidada
- R1-08 Auditoria e rastreabilidade
- R2-01 Estrutura hospitalar: setores e leitos
- R2-02 Internação: admissão, permanência e alta
- R2-04 Prescrição médica
- R2-05 Aprazamento e horários de medicação
- R2-06 MAR / administração de medicamentos

## Parcial
- R1-01 Auth, usuários e controle de acesso
- R1-02 Tenant, configurações e fundação operacional
- R1-07 Documentos básicos e consentimentos
- R2-03 Eventos da internação e evolução assistencial
- R2-07 Impressão e visão operacional da internação
- R3-03 Pedidos e resultados de exames

## Ausente ou muito fraco
- R3-01 Agenda clínica
- R3-02 Configuração operacional da agenda
- R3-04 Billing clínico e itens do atendimento
- R3-05 Catálogo comercial mínimo
- R3-06 Fechamento de atendimento e contas a receber básicas
- R3-07 Fluxo integrado agenda → atendimento → exame → cobrança

---

# Implicações práticas

## O que já está maduro o suficiente para proteger
- encounter
- clinical notes
- patient context
- internação
- medicação / MAR
- auth + RBAC + auditoria

## O que precisa virar prioridade de produto
- agenda
- billing mínimo
- catálogo de serviços/produtos
- contas a receber básicas
- reconstrução pragmática de exames/lab

## Recomendação de foco imediato
A próxima frente deve atacar **R3**, começando por:

1. agenda clínica
2. catálogo comercial mínimo
3. billing clínico
4. fechamento/contas a receber básicas
5. exames/resultados básicos

---

# Próximo passo recomendado

Usar este assessment como base para quebrar o **R3 sprint a sprint**, com ordem de implementação prática e dependências explícitas.
