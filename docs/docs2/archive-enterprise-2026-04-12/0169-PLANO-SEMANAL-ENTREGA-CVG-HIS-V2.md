# 0169 - Plano Semanal de Entrega do CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Base:** [0166-PLANO-EXECUCAO-POR-SPRINTS-CVG-HIS-V2.md](./0166-PLANO-EXECUCAO-POR-SPRINTS-CVG-HIS-V2.md) e [0167-ISSUES-POR-MODULO-CVG-HIS-V2.md](./0167-ISSUES-POR-MODULO-CVG-HIS-V2.md)

---

## 1. Objetivo

Transformar as sprints em uma ordem semanal de entrega para facilitar:

- planejamento de time
- acompanhamento de progresso
- negociacao de escopo
- controle do corte por dominio

---

## 2. Estrutura semanal

| Semana | Foco principal | Saida esperada |
|---|---|---|
| Semana 1 | shell e dashboard | SPA com navegacao premium e entrada forte |
| Semana 2 | cadastro mestre | tutores e pacientes como hubs completos |
| Semana 3 | agenda, fila e atendimento | uso diario da unidade no SPA |
| Semana 4 | prontuario e assistencial | fluxo clinico profundo |
| Semana 5 | governanca e administracao | acesso, usuarios, audit e integracoes |
| Semana 6 | comercial e corte | fluxo comercial e desligamento do web |

---

## 3. Semana 1 - Shell e dashboard

### Entregas

- menu por dominio unificado
- topbar com contexto persistente
- favoritos e recentes
- dashboard com KPIs operacionais
- atalhos de dominios prioritarios

### Como validar

- abrir qualquer rota e ver contexto consistente
- conseguir favoritar e recuperar rotas
- dashboard mostrar KPIs e acoes reais

---

## 4. Semana 2 - Cadastro mestre

### Entregas

- tutores como hub de relacionamento
- pacientes como hub assistencial
- busca e filtros de cadastro
- telas de detalhe mais densas

### Como validar

- criar, buscar e editar tutor sem friccao
- criar, abrir e editar paciente com contexto rico
- tela de detalhe deixar de parecer CRUD generico

---

## 5. Semana 3 - Agenda, fila e atendimento

### Entregas

- agenda com leitura premium
- fila operacional
- atendimentos como fluxo principal
- formulario de agendamento melhorado
- detalhe de atendimento com contexto

### Como validar

- equipe consegue operar a jornada diaria apenas no SPA
- atendimento nao depende de tela legada
- agenda e fila formam um console unico de trabalho

---

## 6. Semana 4 - Prontuario e assistencial

### Entregas

- prontuario como linha do tempo
- triagem como etapa critica
- internacao com setores, leitos e mapa
- diagnosticos com resumo executivo
- cirurgia com status e acompanhamento
- prescricoes e execucao
- altas com proxima acao

### Como validar

- narrativa clinica completa por paciente
- mapa de leitos e setores funcional
- prescricoes e altas com leitura operacional clara

---

## 7. Semana 5 - Governanca e administracao

### Entregas

- access-control como governanca real
- usuarios com membership e origem
- auditoria consultavel
- staff com leitura administrativa madura
- notificacoes e integracoes
- api keys, api client e webhooks

### Como validar

- permissao efetiva e sua origem ficam visiveis
- administracao nao depende mais do web
- auditoria pode ser consultada com filtros uteis

---

## 8. Semana 6 - Comercial e corte

### Entregas

- billing com painel de leitura
- caixa com abertura, movimentacao e fechamento
- produtos e servicos como catalogos premium
- vendas de balcao / comanda
- orcamentos com conversao
- inventario com reflexo de consumo
- relatorios comerciais
- alinhamento final de docs, deploy e cutoff

### Como validar

- fluxo comercial completo no SPA
- nenhum fluxo critico depende do web
- corte do legado pode ser executado com risco controlado

---

## 9. Regras de acompanhamento

1. nenhuma semana avanca sem aceite minimo da semana atual
2. qualquer bloqueio de shell interrompe a linha de frente
3. o trabalho novo entra somente no `apps/spa`
4. `apps/web` recebe apenas manutencao de transicao documental e desligamento
5. cada semana precisa fechar com teste ou validacao objetiva

---

## 10. Entregaveis por semana

| Semana | Entregaveis obrigatorios |
|---|---|
| 1 | shell, dashboard, contexto, favoritos |
| 2 | tutors, patients, busca e detalhe |
| 3 | agenda, fila, atendimento, formulario |
| 4 | prontuario, triagem, internacao, procedimentos |
| 5 | access-control, users, audit, integrations |
| 6 | billing, cash, commercial, cutover final |

---

## 11. Resultado esperado

Ao final das seis semanas:

- o SPA e a trilha principal
- o core diario funciona sem retorno ao legado
- governanca e comercial ficam operacionais no mesmo frontend
- o corte do `apps/web` deixa de ser plano e vira operacao
