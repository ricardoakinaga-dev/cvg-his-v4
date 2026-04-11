# 0165 - Backlog de Construcao Premium do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0163-RELATORIO-COMPARATIVO-VETUS-LIKE-CVG-HIS-V2.md](./0163-RELATORIO-COMPARATIVO-VETUS-LIKE-CVG-HIS-V2.md) e [0164-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0164-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Regras do backlog

| Regra | Diretriz |
|---|---|
| Prioridade P0 | bloqueia operacao, corte ou consistencia do frontend oficial |
| Prioridade P1 | eleva o produto de forma material e reduz risco real |
| Prioridade P2 | acabamento premium, refinamento e endurecimento |
| Escopo de frontend | novas entregas vao para `apps/spa` |
| Escopo de legado | `apps/web` recebe apenas transicao, compatibilidade e encerramento |

---

## 2. Macroordem de execucao

1. shell premium e padrao de navegacao
2. dashboard e rotinas de entrada
3. core operacional assistencial
4. governanca e administracao
5. comercial e analitica
6. observabilidade, testes e corte final do legado

---

## 3. Backlog priorizado

### EPIC F01 - Shell premium do SPA

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F01-01 | P0 | menu por dominio unificado | nenhum | todo dominio deve estar agrupado com label, icone e descricao |
| F01-02 | P0 | topbar com contexto persistente | F01-01 | usuario, role, account e grupo ativo visiveis em todas as rotas |
| F01-03 | P0 | favoritos e recentes | F01-01 | fixar e revisitar rotas funciona em toda a SPA |
| F01-04 | P1 | CTA primario/ secundario padronizado | F01-02 | acoes principais ficam sempre no mesmo lugar por tipo de tela |
| F01-05 | P1 | command palette / busca rapida | F01-01 | buscar rotas e rotinas sem navegar menu por menu |

### EPIC F02 - Dashboard e entrada operacional

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F02-01 | P0 | dashboard com KPIs operacionais | F01-02 | dashboard mostra tutores, pacientes, agenda e fila em tempo real |
| F02-02 | P0 | atalhos de dominios prioritarios | F02-01 | acesso rapido para os fluxos mais usados |
| F02-03 | P1 | blocos de recentes e favoritos | F01-03 | dashboard reflete o uso real do operador |
| F02-04 | P1 | widgets por perfil | F02-01 | a leitura muda por papel/role |

### EPIC F03 - Cadastro mestre

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F03-01 | P0 | tutores como hub de relacionamento | F01-01 | list/detail/form com resumo, atalhos e contexto |
| F03-02 | P0 | pacientes como hub assistencial | F03-01 | ficha do paciente com tutor, status e acao primaria |
| F03-03 | P1 | busca e filtros de cadastro | F03-01 | localizar pessoa/paciente em menos cliques |
| F03-04 | P1 | telas de detalhe mais densas | F03-01 | o detalhe vira ponto de decisao e nao so ficha |

### EPIC F04 - Agenda, fila e atendimento

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F04-01 | P0 | agenda com leitura premium | F01-02 | calendario, filtros e status operacionais consistentes |
| F04-02 | P0 | fila operacional | F04-01 | fila vira console de trabalho do dia |
| F04-03 | P0 | atendimentos como fluxo principal | F03-02 | abrir, acompanhar e concluir atendimento sem vacuo |
| F04-04 | P1 | formulario de agendamento melhorado | F04-01 | criar agendamento com menos friccao |
| F04-05 | P1 | detalhe de atendimento com contexto | F04-03 | resumo, timeline e acao principal visiveis |

### EPIC F05 - Prontuario e assistencial avancado

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F05-01 | P0 | prontuario como linha do tempo | F04-03 | acesso rapido ao historico clinico |
| F05-02 | P0 | triagem como etapa critica | F04-03 | prioridade, destino e correcoes controladas |
| F05-03 | P0 | internacao com setores, leitos e mapa | F05-01 | ocupar, mover e liberar leitos com clareza |
| F05-04 | P1 | diagnosticos com resumo executivo | F05-01 | exames e resultados sao legiveis em contexto |
| F05-05 | P1 | cirurgia com status e acompanhamento | F05-01 | o caso cirurgico e rastreavel do inicio ao fim |
| F05-06 | P1 | prescricoes e execucao | F05-01 | prescrever e executar com leitura clara |
| F05-07 | P1 | altas com proxima acao | F05-03 | alta fecha ciclo e aponta seguimento |

### EPIC F06 - Governanca e administracao

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F06-01 | P0 | access-control como governanca real | F01-02 | equipes, setores, roles e grants explicaveis |
| F06-02 | P0 | usuarios com membership e origem | F06-01 | usuario mostra permissao efetiva e fontes |
| F06-03 | P0 | auditoria consultavel | F01-02 | busca e filtros de eventos auditaveis |
| F06-04 | P1 | staff com leitura administrativa madura | F06-01 | equipe interna com visualizacao operacional |
| F06-05 | P1 | notificacoes e integracoes | F01-02 | alertas e canais sao visiveis e acionaveis |
| F06-06 | P1 | api keys, api client e webhooks | F06-05 | integracao administravel no SPA |

### EPIC F07 - Comercial e financeiro

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F07-01 | P0 | billing com painel de leitura | F04-03 | faturamento e recebiveis compreensiveis |
| F07-02 | P0 | caixa com abertura, movimentacao e fechamento | F07-01 | visao operacional de caixa persistente |
| F07-03 | P0 | produtos e servicos como catalogos premium | F01-01 | cadastro com resumo, filtros e detalhe |
| F07-04 | P0 | vendas de balcao / comanda | F07-03 | vender, pagar, fechar e auditar |
| F07-05 | P1 | orcamentos com conversao | F07-04 | simular, aprovar e transformar em venda |
| F07-06 | P1 | inventario com reflexo de consumo | F07-04 | baixa e rastreio consistentes |
| F07-07 | P1 | relatorios comerciais | F07-02 | leitura executiva do financeiro e comercial |

### EPIC F08 - Qualidade, operacao e corte do legado

| ID | Prioridade | Entrega | Dependencias | Aceite |
|---|---|---|---|---|
| F08-01 | P0 | cortar novas entregas em `apps/web` | nenhum | nenhum desenvolvimento novo entra no legado |
| F08-02 | P0 | alinhar docs, compose e deploy ao SPA | F01-02 | documentacao e runtime contam a mesma historia |
| F08-03 | P0 | E2E dos fluxos criticos | F04-03 | cobrir os fluxos mais importantes do produto |
| F08-04 | P1 | visual regression nas telas premium | F01-01 | evitar quebra do shell e dos hubs |
| F08-05 | P1 | checklist de desligamento do web | F08-01 | criterio objetivo de apagamento do legado |
| F08-06 | P2 | limpeza residual de docs historicas | F08-05 | nada vivo deve induzir deploy do web |

---

## 4. Ordem sugerida de entrega

### Sprint/onda 1

- F01-01
- F01-02
- F01-03
- F02-01
- F02-02

### Sprint/onda 2

- F03-01
- F03-02
- F04-01
- F04-02
- F04-03
- F05-01

### Sprint/onda 3

- F05-02
- F05-03
- F05-04
- F05-05
- F05-06
- F05-07

### Sprint/onda 4

- F06-01
- F06-02
- F06-03
- F06-04
- F06-05
- F06-06

### Sprint/onda 5

- F07-01
- F07-02
- F07-03
- F07-04
- F07-05
- F07-06
- F07-07

### Sprint/onda 6

- F08-01
- F08-02
- F08-03
- F08-04
- F08-05
- F08-06

---

## 5. Criticos de aceite do backlog

| Critico | Condicao |
|---|---|
| Shell premium | menu, contexto, favoritos e recentes disponiveis em toda a SPA |
| Hub do core | dashboard, cadastro e agenda resolvem o uso diario |
| Governanca real | access-control e users explicam permissao efetiva |
| Fluxo assistencial | triagem, internacao, prontuario e prescricoes fecham o ciclo |
| Fluxo comercial | billing, caixa, produtos, servicos e vendas funcionam juntos |
| Corte do legado | `apps/web` nao participa da trilha principal |

---

## 6. Observacao final

Este backlog nao substitui os docs de produto ou arquitetura.

Ele existe para orientar o trabalho real de construcao do `cvg-his-v2` na mesma linha premium do `vetus-like`, mas com uma vantagem clara:

- menos ambiguidade
- mais execucao
- mais governanca
- mais capacidade de corte gradual por dominio
