# 0166 - Plano de Execucao por Sprints do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0164-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0164-ROADMAP-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md) e [0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md](./0165-BACKLOG-CONSTRUCAO-PREMIUM-CVG-HIS-V2.md)

---

## 1. Objetivo

Converter o roadmap premium em uma ordem de execucao curta, legivel e auditavel, com foco em:

- `apps/spa` como frontend oficial alvo
- `apps/web` apenas como legado sem novas entregas, limitado a desligamento e transicao documental
- entrega por sprint com aceite claro
- fechamento progressivo do risco operacional

---

## 2. Estrutura operacional

| Sprint | Foco | Saida esperada |
|---|---|---|
| Sprint 1 | shell e dashboard | SPA consistente no topo e na entrada |
| Sprint 2 | cadastro mestre | tutores e pacientes como hub |
| Sprint 3 | agenda, fila e atendimento | fluxo diario fechado |
| Sprint 4 | prontuario e assistencial | triagem, internacao, leitos e prescricoes |
| Sprint 5 | governanca e administracao | acesso, usuarios, audit e integracoes |
| Sprint 6 | comercial e corte do legado | billing, cash, vendas e desligamento do web |

---

## 3. Sprint 1 - Shell e dashboard

### Objetivo

Estabelecer a base visual e de navegacao que o resto do produto vai reutilizar.

### Itens

- F01-01 menu por dominio unificado
- F01-02 topbar com contexto persistente
- F01-03 favoritos e recentes
- F02-01 dashboard com KPIs operacionais
- F02-02 atalhos de dominios prioritarios

### Entregas

- sidebar com contexto, busca, favoritos e recentes
- dashboard como console de entrada
- padrao de header e CTA para as proximas telas

### Criterio de aceite

- qualquer rota do SPA mostra contexto e identidade
- dashboard mostra KPIs e atalhos reais
- menu por dominio nao depende de UX legado

---

## 4. Sprint 2 - Cadastro mestre

### Objetivo

Transformar tutores e pacientes em hubs de relacionamento e de assistencia.

### Itens

- F03-01 tutores como hub de relacionamento
- F03-02 pacientes como hub assistencial
- F03-03 busca e filtros de cadastro
- F03-04 telas de detalhe mais densas

### Entregas

- list/detail/form com leitura executiva
- acao principal visivel por tela
- contexto de tutor/paciente nas areas de uso frequente

### Criterio de aceite

- criar, buscar, abrir detalhe e editar sem ambiguidades
- as telas principais nao parecem CRUD generico

---

## 5. Sprint 3 - Agenda, fila e atendimento

### Objetivo

Fechar o fluxo diario da unidade sem depender do legado.

### Itens

- F04-01 agenda com leitura premium
- F04-02 fila operacional
- F04-03 atendimentos como fluxo principal
- F04-04 formulario de agendamento melhorado
- F04-05 detalhe de atendimento com contexto

### Entregas

- agenda com status e leitura de ocupacao
- fila como console operacional
- atendimento com resumo, timeline e acao clara

### Criterio de aceite

- recepcao e equipe conseguem operar o dia inteiro no SPA
- o fluxo nao exige troca para `apps/web`

---

## 6. Sprint 4 - Prontuario e assistencial avancado

### Objetivo

Elevar a densidade clinica do SPA.

### Itens

- F05-01 prontuario como linha do tempo
- F05-02 triagem como etapa critica
- F05-03 internacao com setores, leitos e mapa
- F05-04 diagnosticos com resumo executivo
- F05-05 cirurgia com status e acompanhamento
- F05-06 prescricoes e execucao
- F05-07 altas com proxima acao

### Entregas

- narrativa clinica completa por paciente
- mapa de leitos e setores com acao operacional
- prescricoes e alt as com contexto suficiente para uso real

### Criterio de aceite

- a trilha assistencial principal fica disponivel no SPA
- os modulos deixam de parecer telas isoladas

---

## 7. Sprint 5 - Governanca e administracao

### Objetivo

Consolidar acesso, auditoria e administracao de plataforma.

### Itens

- F06-01 access-control como governanca real
- F06-02 usuarios com membership e origem
- F06-03 auditoria consultavel
- F06-04 staff com leitura administrativa madura
- F06-05 notificacoes e integracoes
- F06-06 api keys, api client e webhooks

### Entregas

- governanca explicavel
- auditoria consultavel por filtro
- administracao de equipe e integracoes dentro do SPA

### Criterio de aceite

- perfil efetivo e suas fontes ficam visiveis
- a administracao nao depende mais de telas legadas

---

## 8. Sprint 6 - Comercial e corte do legado

### Objetivo

Fechar a camada comercial e executar o corte do `apps/web` sem novas entregas no legado.

### Itens

- F07-01 billing com painel de leitura
- F07-02 caixa com abertura, movimentacao e fechamento
- F07-03 produtos e servicos como catalogos premium
- F07-04 vendas de balcao / comanda
- F07-05 orcamentos com conversao
- F07-06 inventario com reflexo de consumo
- F07-07 relatorios comerciais
- F08-01 bloquear novas entregas em `apps/web`
- F08-02 alinhar docs, compose e deploy ao SPA
- F08-03 E2E dos fluxos criticos
- F08-05 checklist de desligamento do web

### Entregas

- fluxo comercial completo no SPA
- evidencia de que o `apps/web` nao e mais trilha ativa
- checklist final para desligamento operacional

### Criterio de aceite

- nenhuma jornada critica depende do web
- o corte do legado pode ser agendado com risco controlado

---

## 9. Regras de prioridade entre sprints

1. nao iniciar sprint seguinte sem aceite minimo da sprint atual
2. nao abrir modulo novo fora da trilha oficial do SPA
3. qualquer bloqueador de navegacao ou contexto quebra a fila da sprint
4. o corte do `apps/web` so ocorre apos aceite do core, assistencial, governanca e comercial

---

## 10. Resultado esperado

Ao fim das 6 sprints:

- `apps/spa` deve estar operacional como frontend oficial
- `apps/web` deve estar fora da trilha principal e sem novas entregas
- o produto deve estar mais coerente com a logica premium do Vetus-like
- a documentacao deve estar alinhada com o que foi construido
