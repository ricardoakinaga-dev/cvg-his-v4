# Legacy Inventory

Data de corte do inventario: 2026-03-24

## Escopo inventariado

O levantamento considerou a estrutura atual do repositorio, com destaque para:

- `apps/his-api`
- `apps/his-web`
- `apps/his-worker`
- `packages/db`
- `packages/rbac`
- `packages/audit`
- `packages/contracts`
- `packages/domain`
- `packages/config`
- `packages/events`
- `docs/docs2`

## Inventario por area

### Apps legadas

- `apps/his-api`: backend operacional principal com modulos de auth, owners, patients, encounters, inpatient, notifications, stock, payments, exams e outros.
- `apps/his-web`: frontend com App Router e telas para recepcao, pacientes, tutores, encontros, internacao, financeiro, estoque, exames e notificacoes.
- `apps/his-worker`: worker assíncrono para filas de sistema e rotinas auxiliares.

### Packages legados

- `packages/db`: schemas e migrations com ampla cobertura funcional.
- `packages/rbac`: papeis e permissoes reutilizaveis como referencia.
- `packages/audit`: artefatos de auditoria com potencial de reaproveitamento conceitual.
- `packages/contracts`: contratos compartilhados existentes, ainda sem segmentacao por bounded context.
- `packages/domain`: utilitarios de dominio, mas sem particionamento claro do novo alvo.
- `packages/config` e `packages/events`: base tecnica util, porem ainda moldada pela estrutura antiga.

### Modulos funcionais identificados no backend legado

- identidade e acesso: `auth`, `rbac`
- cadastros mestres: `owners`, `patients`
- assistencial: `encounters`, `clinicalNotes`, `documents`, `patientContext`
- operacao assistencial avancada: `inpatient`, `beds`, `wards`, `bedmap`, `handovers`
- medicacao: `medicationOrders`, `medicationSchedules`, `medicationAdministrations`, `medicationLogs`, `medicationDoses`
- agenda e fluxo de chegada: `appointments`, `agendaConfig`
- diagnostico: `exams`
- administrativo: `encounterBilling`, `encounterFinancial`, `payments`, `cash`, `products`, `services`, `stock`
- suporte transversal: `audit`, `notifications`, `reports`, `metrics`, `system`, `integration`, `search`

## Sinais de maturidade aproveitaveis

- tenant scoping recorrente
- trilha de autoria e timestamps em varias entidades
- presenca de encounters como eixo clinico
- nucleo funcional tutor-paciente-atendimento consolidado
- catalogo amplo de schemas que ajuda a descobrir regras ja operadas

## Sinais de risco estrutural

- naming heterogeneo entre dominios e camadas
- coexistencia de clinico, financeiro e estoque sem fronteiras consistentes
- documentacao anterior orientada a fases de expansao, nao a reconstrucao
- acoplamento potencial entre UI, RBAC e casos de uso
- risco de reaproveitar schemas como "atalho" sem revalidar invariantes

## Conclusao do inventario

O legado e valioso como mapa de regras descobertas e cobertura funcional. Ele nao e adequado como fundacao direta do V2 porque mistura maturidade operacional com divida estrutural acumulada.
