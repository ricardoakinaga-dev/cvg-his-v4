# CVG-HIS — Mapa de reaproveitamento do código atual para o R3

Data: 2026-03-17

## Objetivo

Identificar o que pode ser reaproveitado da base atual do `modulo_cvg_his` para acelerar a implementação do R3.

---

# Leitura geral

O código atual oferece uma base forte em:

- auth / RBAC
- requestContext / actor / tenant scoping
- padrões de repo/service/routes
- frontend com páginas e componentes em App Router
- patient/owner/encounter como núcleo funcional
- audit trail

A melhor estratégia para o R3 não é criar um módulo paralelo “do zero”, e sim **seguir os padrões já estabelecidos nos módulos maduros**.

---

# Reaproveitamento transversal

## Padrões de backend reutilizáveis

### Estrutura de módulo
Reaproveitar o padrão presente em módulos como:
- `owners`
- `patients`
- `encounters`
- `clinicalNotes`
- `inpatient`
- `medicationOrders`

Padrão observado:
- `repo.ts`
- `service.ts`
- `routes.ts`
- `types.ts` quando necessário
- testes por módulo

### Request context / actor
Reaproveitar o padrão já usado nos services:
- validação de `actor`
- uso de `accountId`
- isolamento por tenant

### Auditoria
Reaproveitar:
- `audit_events`
- convenções de autoria/timestamps
- trilha de alterações críticas

### Busca/listagem
Reaproveitar o estilo de listagem e filtros já presente em:
- `owners`
- `patients`
- `inpatient`
- `search`

---

# Reaproveitamento por sprint

# Sprint R3.1 — Catálogo comercial mínimo

## Pode reaproveitar diretamente
- padrão de schema com `account_id`
- padrão de `repo/service/routes`
- lógica de tenant scoping dos módulos maduros
- padrões de páginas CRUD de `owners` / `patients`
- componentes de formulário e estados de loading/erro do frontend atual

## Referências técnicas úteis
- `apps/his-api/src/modules/owners/*`
- `apps/his-api/src/modules/patients/*`
- `packages/db/src/schema/owners.ts`
- `packages/db/src/schema/patients.ts`
- `apps/his-web/src/app/owners/*`
- `apps/his-web/src/app/patients/*`

## Reaproveitamento parcial / atenção
- `clients/*` pode servir como referência de UX para cadastros simples
- `search/*` pode ajudar em busca textual simples

## Não reaproveitar cegamente
- módulos removidos antigos de `products/services` se estiverem fora da árvore ativa
- código de versões antigas que já foi descartado por refatoração

---

# Sprint R3.2 — Billing clínico básico

## Pode reaproveitar diretamente
- `encounters` como entidade-pai
- `documents.attachToEncounter` como referência de vínculo entre entidades e encounter
- padrões de service/repo com validação por actor
- patient context como referência de agregação futura

## Referências técnicas úteis
- `apps/his-api/src/modules/encounters/*`
- `apps/his-api/src/modules/documents/*`
- `packages/db/src/schema/encounters.ts`
- `packages/db/src/schema/encounter_documents.ts`

## Reaproveitamento parcial / atenção
- lógica de resumo/overview de `patientContext` pode inspirar visão consolidada de billing no encounter
- componentes de pages de encounter podem receber o bloco de itens faturáveis

## Não reaproveitar cegamente
- qualquer lógica antiga de invoices/billing removida da árvore atual sem revisar motivo da remoção

---

# Sprint R3.3 — Fechamento e contas a receber simples

## Pode reaproveitar diretamente
- status e transições inspiradas em fluxos existentes do `inpatient`
- padrões de listagem e filtros já usados em módulos clínicos
- estrutura de auditoria para marcar mudança de situação financeira

## Referências técnicas úteis
- `apps/his-api/src/modules/inpatient/*`
- `apps/his-api/src/modules/audit/*`
- `apps/his-api/src/modules/encounters/*`

## Reaproveitamento parcial / atenção
- `accounts.ts` existe, mas parece muito mais ligado a tenancy/conta do sistema do que a contas a receber operacionais
- evitar usar esse schema como atalho errado para A/R do produto

---

# Sprint R3.4 — Agenda clínica básica

## Pode reaproveitar diretamente
- estrutura de páginas do frontend atual (`/reception`, `/reception/start`, `/reception/quick`) como ponto de entrada de fluxo
- padrões de CRUD e listagem dos módulos maduros
- padrões de vínculo patient/professional/encounter já existentes

## Referências técnicas úteis
- `apps/his-web/src/app/reception/*`
- `apps/his-api/src/modules/patients/*`
- `apps/his-api/src/modules/owners/*`
- `apps/his-api/src/modules/auth/*`

## Reaproveitamento parcial / atenção
- há sinais de que agenda antiga já existiu e foi removida; usar somente como referência conceitual se código legado ainda for recuperável e estiver saudável

## Não reaproveitar cegamente
- módulos antigos de agenda removidos em refatorações anteriores sem revisão técnica

---

# Sprint R3.5 — Configuração operacional da agenda

## Pode reaproveitar diretamente
- modelo de settings base e catálogos simples
- padrões de listas e formulários do frontend atual
- RBAC para distinguir recepção, clínico e admin

## Referências técnicas úteis
- `auth`
- `rbac`
- estruturas de CRUD simples já presentes no projeto

---

# Sprint R3.6 — Exames e resultados básicos

## Pode reaproveitar diretamente
- `documents` para anexos e laudos simples
- `patientContext` para agregação futura de exames no prontuário
- `encounters` como entidade-pai para pedidos
- `clinicalNotes` como referência de autoria, versionamento e sign-off de conteúdo clínico

## Referências técnicas úteis
- `apps/his-api/src/modules/documents/*`
- `apps/his-api/src/modules/patientContext/*`
- `apps/his-api/src/modules/encounters/*`
- `apps/his-api/src/modules/clinicalNotes/*`

## Reaproveitamento parcial / atenção
- módulos antigos de laboratory/imaging parecem não estar ativos na árvore atual; se houver código recuperável fora da árvore principal, ele deve ser auditado antes de voltar

---

# Sprint R3.7 — Fluxo integrado ponta a ponta

## Pode reaproveitar diretamente
- patient context para visão consolidada
- search para navegação cruzada
- encounter como eixo central de integração
- auditoria e requestContext para rastrear a cadeia completa

## Referências técnicas úteis
- `patientContext`
- `search`
- `encounters`
- `audit`

---

# Mapa resumido

## Reaproveitar fortemente
- padrões de módulo backend (`repo/service/routes`)
- auth / RBAC / requestContext
- tenant scoping
- audit trail
- encounters
- patients / owners
- patient context
- documents
- componentes de frontend para CRUD e páginas de domínio

## Reaproveitar com cuidado
- reception pages como embrião da agenda
- search para filtros cruzados
- qualquer vestígio de módulos antigos removidos

## Evitar reaproveitamento automático
- blocos antigos de agenda, products, services, invoices, lab/imaging que tenham sido removidos sem entender o motivo
- modelagem financeira antiga caso ela tenha sido descartada por desalinhamento com a arquitetura atual

---

# Recomendação final

A implementação do R3 deve seguir a arquitetura que já deu certo no projeto:

1. schema claro
2. repo enxuto
3. service com regra de negócio
4. routes objetivas
5. testes por módulo
6. frontend incremental acoplado ao domínio

Ou seja: o R3 deve ser construído como **continuação natural do que já está sólido em R1/R2**, e não como um subsistema paralelo improvisado.
