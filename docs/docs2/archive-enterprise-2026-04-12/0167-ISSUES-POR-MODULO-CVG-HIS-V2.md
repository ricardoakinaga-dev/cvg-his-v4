# 0167 - Issues por Modulo do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Objetivo

Transformar o backlog premium em uma lista de issues rastreavel por modulo, de forma que produto, engenharia e QA saibam:

- o que entregar
- em qual modulo
- com qual prioridade
- com qual criterio de aceite

---

## 2. Issues por modulo

### Navigation / Shell

- `ISS-001` - menu por dominio unificado
- `ISS-002` - topbar com contexto persistente
- `ISS-003` - favoritos e recentes no SPA
- `ISS-004` - command palette / busca rapida

### Dashboard

- `ISS-010` - dashboard com KPIs operacionais
- `ISS-011` - atalhos de dominios prioritarios
- `ISS-012` - widgets por perfil

### Owners

- `ISS-020` - tutores como hub de relacionamento
- `ISS-021` - busca e filtros de cadastro
- `ISS-022` - detalhe de tutor com contexto e acoes

### Patients

- `ISS-030` - pacientes como hub assistencial
- `ISS-031` - detalhe de paciente mais denso
- `ISS-032` - formulario de paciente premium

### Scheduling / Queue / Encounters

- `ISS-040` - agenda com leitura premium
- `ISS-041` - fila operacional
- `ISS-042` - atendimentos como fluxo principal
- `ISS-043` - formulario de agendamento melhorado
- `ISS-044` - detalhe de atendimento com contexto

### Medical Records / Clinical

- `ISS-050` - prontuario como linha do tempo
- `ISS-051` - triagem como etapa critica
- `ISS-052` - internacao com setores, leitos e mapa
- `ISS-053` - diagnosticos com resumo executivo
- `ISS-054` - cirurgia com status e acompanhamento
- `ISS-055` - prescricoes e execucao
- `ISS-056` - altas com proxima acao

### Governance / Platform

- `ISS-060` - access-control como governanca real
- `ISS-061` - usuarios com membership e origem
- `ISS-062` - auditoria consultavel
- `ISS-063` - staff com leitura administrativa madura
- `ISS-064` - notificacoes e integracoes
- `ISS-065` - api keys, api client e webhooks

### Commercial / Finance

- `ISS-070` - billing com painel de leitura
- `ISS-071` - caixa com abertura, movimentacao e fechamento
- `ISS-072` - produtos como catalogo premium
- `ISS-073` - servicos como catalogo premium
- `ISS-074` - vendas de balcao / comanda
- `ISS-075` - orcamentos com conversao
- `ISS-076` - inventario com reflexo de consumo
- `ISS-077` - relatorios comerciais

### Legacy cutover

- `ISS-090` - cortar novas entregas em `apps/web`
- `ISS-091` - alinhar docs, compose e deploy ao SPA
- `ISS-092` - E2E dos fluxos criticos
- `ISS-093` - checklist de desligamento do web
- `ISS-094` - limpeza residual de docs historicas

Regra de aplicacao: nenhuma issue de feature nova deve apontar para `apps/web`; o legado so aparece nas issues de corte, limpeza e remocao de redirecionamentos.

---

## 3. Priorizacao sugerida

| Prioridade | Issues |
|---|---|
| P0 | ISS-001, ISS-002, ISS-003, ISS-010, ISS-020, ISS-030, ISS-040, ISS-041, ISS-042, ISS-050, ISS-051, ISS-052, ISS-060, ISS-061, ISS-062, ISS-070, ISS-071, ISS-072, ISS-073, ISS-074, ISS-090, ISS-091 |
| P1 | ISS-004, ISS-011, ISS-012, ISS-021, ISS-022, ISS-031, ISS-032, ISS-043, ISS-044, ISS-053, ISS-054, ISS-055, ISS-056, ISS-063, ISS-064, ISS-065, ISS-075, ISS-076, ISS-077, ISS-092, ISS-093 |
| P2 | ISS-094 |

---

## 4. Mapa de dependencias

| Issue base | Depende de | Observacao |
|---|---|---|
| ISS-001 | nenhum | sem menu por dominio, o resto perde coerencia |
| ISS-002 | ISS-001 | contexto depende da estrutura de menu |
| ISS-003 | ISS-001 | favoritos e recentes vivem no shell |
| ISS-010 | ISS-001, ISS-002 | dashboard precisa de contexto |
| ISS-020 | ISS-001, ISS-002 | tutors precisam do shell para ficar premium |
| ISS-030 | ISS-020 | pacientes dependem do contexto de tutor |
| ISS-040 | ISS-001, ISS-002 | agenda depende de menu e header consistentes |
| ISS-042 | ISS-030, ISS-040 | atendimento depende de cadastro e agenda |
| ISS-050 | ISS-042 | prontuario depende de atendimento |
| ISS-060 | ISS-001, ISS-002 | governanca precisa ser navegavel e auditavel |
| ISS-070 | ISS-042 | billing depende do atendimento |
| ISS-074 | ISS-072, ISS-073, ISS-071 | venda depende de catalogo, caixa e pagamentos |
| ISS-090 | todas as anteriores | corte do web so acontece no final |

---

## 5. Criterio de pronto por issue

Cada issue so pode ser marcada como done quando:

1. estiver entregue no `apps/spa` ou na trilha oficial do backend
2. tiver teste ou validacao objetiva
3. estiver documentada na trilha viva
4. nao abrir regressao no fluxo critico relacionado

---

## 6. Uso pratico

Este documento deve ser usado como base para:

- epicos de sprint
- issues de time
- planejamento semanal
- dashboard de progresso
- revisao de corte do legado
