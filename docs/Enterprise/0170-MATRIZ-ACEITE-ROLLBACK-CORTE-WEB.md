# 0170 - Matriz de Aceite e Rollback para Corte do Web

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0168-MATRIZ-CORTE-WEB-PARA-SPA-POR-DOMINIO.md](./0168-MATRIZ-CORTE-WEB-PARA-SPA-POR-DOMINIO.md)

---

## 1. Objetivo

Definir o que precisa estar verdadeiro para cortar o `apps/web` e o que fazer caso o corte precise ser revertido.

---

## 2. Condicoes para aceite de corte

| Condicao | Evidencia minima |
|---|---|
| SPA cobre o dominio | rota equivalente no `apps/spa` |
| Fluxo principal funciona | teste ou validacao objetiva verde |
| UI nao depende do legado | nenhuma jornada critica aponta para `apps/web` |
| Documentacao aponta para o SPA | docs vivas nao ensinam o usuario a usar o web |
| Deploy oficial usa SPA | compose, proxy e services canonicos centrados no SPA |
| Legado sem ajuste novo | `apps/web` nao recebe feature ou correcao de produto |

---

## 3. Gate de corte por dominio

### Gate A - Shell e entrada

Aceite:

- dashboard
- menu
- favoritos
- recentes

Rollback:

- manter web ativo como fallback
- restaurar alias de rota se necessario

### Gate B - Core diario

Aceite:

- owners
- patients
- scheduling
- queue
- encounters

Rollback:

- reativar convivio do web para a jornada afetada
- bloquear desligamento daquele dominio

### Gate C - Assistencial

Aceite:

- medical records
- triage
- inpatient
- diagnostics
- surgery
- prescriptions

Rollback:

- manter web para o dominio especifico
- registrar regressao em backlog de corte

### Gate D - Governanca e plataforma

Aceite:

- access-control
- users
- staff
- audit
- notifications
- api keys
- webhooks
- api client

Rollback:

- manter web como painel de contingencia ate estabilizacao
- nao desligar o dominio afetado

### Gate E - Comercial

Aceite:

- billing
- cash
- products
- services
- counter-sales
- quotes
- commercial-reports
- inventory

Rollback:

- reativar fluxo legado do dominio se houver quebra financeira
- congelar corte final ate corrigir o fluxo

---

## 4. Matriz de rollback por sintoma

| Sintoma | Impacto | Acao imediata |
|---|---|---|
| Usuario nao acha uma rotina no SPA | perda de operacao | reativar acesso ao web e corrigir navegacao |
| Fluxo critico abre erro no SPA | interrupcao de trabalho | voltar o dominio para convivio com web |
| Docs ainda apontam para web | confusao editorial | corrigir docs antes de prosseguir com corte |
| Redirect quebra rota critica | downtime logico | restaurar alias e validar novamente |
| Deploy do SPA falha | indisponibilidade | manter web ativo ate o build/health ficar verde |

---

## 5. Ordem segura de corte

1. shell e dashboard
2. core diario
3. assistencial
4. governanca e plataforma
5. comercial
6. desligamento final do web

---

## 6. Checklist final antes de apagar o web

1. todos os dominios relevantes estao em `web desligado`
2. nenhum link de producao aponta para o web
3. nenhum fluxo critico depende do web
4. o SPA foi validado em uso real
5. o deploy oficial esta documentado como SPA-only
6. o plano de rollback nao e mais necessario para operacao diaria

---

## 7. Condicao de reversao

Se qualquer dominio critico falhar apos o corte:

1. suspender novos desligamentos
2. reativar o web apenas para o dominio afetado
3. corrigir o SPA e validar novamente
4. repetir o gate de aceite
5. voltar a cortar somente quando o dominio ficar verde

---

## 8. Regra final

O `apps/web` so pode ser apagado quando:

- o aceite de corte estiver fechado para todos os dominios
- o plano de rollback nao for mais necessario para uso normal
- o deploy oficial estiver centrado exclusivamente no `apps/spa`
