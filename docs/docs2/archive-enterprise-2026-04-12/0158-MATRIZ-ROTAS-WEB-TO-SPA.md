# 0158 - Matriz de Rotas Web -> SPA

**Data:** 2026-04-11

## Objetivo

Listar as rotas hoje presentes no `apps/web` e sua destinacao no `apps/spa`, para uso direto em backlog, migração e corte.

## Status da matriz

Legenda:

- `MIGRAR`: existe no `apps/web` e precisa ter equivalencia no `apps/spa`
- `CRIAR`: nao existe ainda no `apps/spa` e precisa ser implementada
- `ALIAS`: pode reaproveitar outra rota do SPA com redirecionamento
- `MANTER`: ja existe no SPA e precisa apenas de refinamento

## Matriz principal

| Rota `apps/web` | Destino em `apps/spa` | Status | Sprint alvo | Observacao |
|---|---|---|---|---|
| `/login` | `/login` | MANTER | Sprint 0 | Padronizar auth e redirect |
| `/` | `/` | MIGRAR | Sprint 1 | Dashboard hub premium |
| `/owners` | `/owners` | MIGRAR | Sprint 1 | Cadastros e detalhe |
| `/patients` | `/patients` | MIGRAR | Sprint 1 | Cadastro clinico completo |
| `/encounters` | `/encounters` | MIGRAR | Sprint 2 | Jornada assistencial central |
| `/medical-records` | `/medical-records` | MIGRAR | Sprint 2 | Prontuario premium |
| `/appointments` | `/appointments` | MIGRAR | Sprint 2 | Agenda e kanban |
| `/queue` | `/queue` ou `scheduling/queue` | CRIAR | Sprint 5 | Gap funcional hoje |
| `/triage` | `/triage` | MIGRAR | Sprint 3 | Triagem operacional |
| `/inpatient` | `/inpatient` | MIGRAR | Sprint 3 | Internação |
| `/sectors` | `/sectors` | CRIAR | Sprint 5 | Contexto organizacional |
| `/beds` | `/inpatient/board` ou alias | ALIAS | Sprint 3 | Normalizacao de conceito |
| `/bed-map` | `/inpatient/board` ou alias | ALIAS | Sprint 3 | Pode virar alias canonico |
| `/diagnostics` | `/diagnostics` | MIGRAR | Sprint 3 | Exames e laudos |
| `/surgeries` | `/surgery` | ALIAS | Sprint 3 | Normalizar nome da rota |
| `/inventory` | `/inventory` | MIGRAR | Sprint 4 | Estoque e compras |
| `/billing` | `/billing` | MIGRAR | Sprint 4 | Financeiro |
| `/notifications` | `/notifications` | MIGRAR | Sprint 4 | Notificacoes e automacao |
| `/audit` | `/audit` | CRIAR | Sprint 5 | Governanca |
| `/master-search` | `/master-search` | CRIAR | Sprint 5 | Busca global |
| `/discharges` | `/discharges` | MIGRAR | Sprint 3 | Alta operacional |
| `/prescription-executions` | `/prescription-executions` | MIGRAR | Sprint 3 | Execucoes clinicas |
| `/prescriptions` | `/prescriptions` | MIGRAR | Sprint 3 | Prescricoes |
| `/products` | `/products` | MIGRAR | Sprint 4 | Cadastros e detalhe |
| `/services` | `/services` | MIGRAR | Sprint 4 | Cadastros e detalhe |
| `/counter-sales` | `/counter-sales` | MIGRAR | Sprint 4 | Venda balcao |
| `/quotes` | `/quotes` | MIGRAR | Sprint 4 | Orcamentos |
| `/commercial-reports` | `/reports/commercial` ou `/commercial-reports` | CRIAR | Sprint 5 | Relatorios |
| `/cash-register` | `/cash` | ALIAS | Sprint 4 | Normalizar terminologia |

## Matriz complementar de funcionalidades ainda ausentes no SPA

| Funcionalidade | Estado | Prioridade | Nota |
|---|---|---:|---|
| Favoritos | ausente | P0 | Necessario para navegao premium |
| Recentes | ausente | P0 | Ajuda descoberta por perfil |
| Busca global de rotas | ausente | P0 | Fundamental para shell |
| Contexto tenant/filial/setor | ausente | P0 | Necessario para enterprise |
| Indicador novo/legado/indisponivel | ausente | P0 | Necessario durante convivio |
| Barra de acoes por dominio | parcial | P1 | Padronizar por tela |
| Dashboard premium com KPIs reais | parcial | P1 | Deve virar hub |
| Timeline/narrativa de prontuario | parcial | P2 | Falta densidade premium |
| Board de leitos padronizado | parcial | P2 | Normalizar em internacao |
| Relatorios comerciais | ausente/parcial | P4 | Importante para backoffice |
| Governance center | ausente/parcial | P4 | Access control, audit e roles |

## Ordem de uso da matriz

1. abrir uma linha da matriz por dominio ou rota
2. transformar em issue ou ticket de backlog
3. associar o sprint alvo
4. validar equivalencia com o `apps/web`
5. marcar corte apenas depois do aceite

## Regra de corte

Nenhuma rota pode ser desativada no `apps/web` sem que:

- exista rota funcional equivalente no `apps/spa`
- exista aceite por dominio
- exista fallback documentado

## Condicao para apagamento do web inteiro

Mesmo com todas as rotas migradas, o `apps/web` so pode ser apagado depois do plano formal de desativacao:

- sem usuario ativo dependente
- sem automacao ou link residual
- sem incidente recente de fallback
- sem backlog de corte aberto

Ver:

- [0159 - Plano de Desativacao e Apagamento do apps/web](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0159-PLANO-DESATIVACAO-APAGAMENTO-WEB.md)

## Referencias

- [0155 - Plano de Migracao por Dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0155-PLANO-MIGRACAO-WEB-PARA-SPA-POR-DOMINIO.md)
- [0157 - Checklist de Aceite por Dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0157-CHECKLIST-ACEITE-POR-DOMINIO-SPA.md)
