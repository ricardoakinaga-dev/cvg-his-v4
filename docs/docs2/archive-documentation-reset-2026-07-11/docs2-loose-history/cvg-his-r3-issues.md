# CVG-HIS — Issues propostas para o R3

Data: 2026-03-17
Repo: `ricardoakinaga-dev/cvg-his`

## Objetivo

Registrar as issues propostas para execução do **R3 — Operação clínica integrada**.

---

## Issue 1 — R3.1 Catálogo comercial mínimo

**Título**
`R3.1: implementar catálogo comercial mínimo (services + products)`

**Labels sugeridas**
- enhancement
- documentation

**Descrição resumida**
Criar a base comercial mínima para suportar billing no atendimento, com entidades de serviços e produtos, CRUD básico, pesquisa e segregação por tenant.

---

## Issue 2 — R3.2 Billing clínico básico no atendimento

**Título**
`R3.2: implementar billing clínico básico vinculado ao encounter`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Permitir lançar serviços e produtos diretamente no atendimento, consolidando itens faturáveis por encounter com totalização e auditoria.

---

## Issue 3 — R3.3 Fechamento de atendimento e contas a receber simples

**Título**
`R3.3: implementar fechamento de atendimento e contas a receber simples`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Fechar o ciclo mínimo de cobrança do atendimento, com status financeiro, total final e geração de pendência simples quando houver saldo em aberto.

---

## Issue 4 — R3.4 Agenda clínica básica

**Título**
`R3.4: implementar agenda clínica básica`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Criar o primeiro módulo funcional de agenda com criação, listagem, reagendamento e cancelamento de appointments por profissional e dia.

---

## Issue 5 — R3.5 Configuração operacional da agenda

**Título**
`R3.5: implementar configuração operacional da agenda`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Adicionar disponibilidade de profissionais, tipos de atendimento e status/marcadores mínimos para tornar a agenda operacionalmente útil.

---

## Issue 6 — R3.6 Exames e resultados básicos

**Título**
`R3.6: implementar pedidos e resultados básicos de exames`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Criar ou reativar o fluxo mínimo de exames, com pedido, resultado/laudo básico, histórico por paciente e vínculo com encounter.

---

## Issue 7 — R3.7 Fluxo integrado ponta a ponta

**Título**
`R3.7: integrar agenda, atendimento, exames e cobrança`

**Labels sugeridas**
- enhancement

**Descrição resumida**
Conectar os módulos do R3 para garantir fluxo operacional contínuo: agenda → encounter → exame → billing → fechamento.

---

## Issue 8 — R3.8 Endurecimento, UX e relatórios operacionais mínimos

**Título**
`R3.8: endurecer o fluxo R3 e adicionar relatórios operacionais mínimos`

**Labels sugeridas**
- enhancement
- documentation

**Descrição resumida**
Ajustar validações, UX, testes e relatórios mínimos do fluxo de operação clínica integrada.
