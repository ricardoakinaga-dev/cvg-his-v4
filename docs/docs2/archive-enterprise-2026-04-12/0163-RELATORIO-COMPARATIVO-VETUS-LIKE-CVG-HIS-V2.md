# 0163 - Relatorio Comparativo Vetus-Like vs CVG-HIS V2

**Status:** vivo
**Data de validacao:** 2026-04-11
**Objetivo:** comparar o plano premium do `vetus-like` com o que o `cvg-his-v2` realmente construiu, para orientar a proxima fase de evolucao do frontend e do programa como um todo.

---

## 1. Resumo executivo

O `vetus-like` e, acima de tudo, um **blueprint premium de produto**: a documentacao e tratada como artefato principal, a navegacao e pensada como espinha dorsal e os modulos sao descritos por problema, persona, capacidade, regra, evento, API e KPI.

O `cvg-his-v2` e um **sistema executavel real**: tem apps canonicos, rotas vivas, persistencia, runtime, deploy e uma base de frontend oficial no `apps/spa` que ja cobre a maioria dos dominios operacionais do ERP.
`apps/web` nao deve receber novas entregas; ele fica restrito a desligamento, compatibilidade residual e limpeza documental.

Conclusao objetiva:

- `vetus-like` ganha em maturidade conceitual, linguagem premium e densidade documental de produto
- `cvg-his-v2` ganha em concretude, cobertura real, governanca operacional e capacidade de evoluir sem reconstruir tudo do zero
- o melhor caminho nao e copiar o `vetus-like`; e **usar o `vetus-like` como referencia de organizacao premium para elevar o `cvg-his-v2`**

---

## 2. Metodologia de comparacao

Fontes revisadas:

- `vetus-like/docs/*.md`
- `vetus-like/docs2/*.md`
- `vetus-like/docs2/modulos/*.md`
- imagens de referencia em `vetus-like/referencias/*.png`
- `cvg-his-v2/docs/*.md`
- `cvg-his-v2/docs/Enterprise/*.md`
- `apps/spa/src/*`

Eixos usados na comparacao:

| Eixo | O que foi analisado |
|---|---|
| Produto | visao, estrategia, personas, jornadas, KPIs |
| Shell e navegacao | menu, contexto, favoritos, recentes, hierarquia de rotas |
| Modulos | cobertura funcional, densidade de tela, nivel de detalhe |
| Governanca | permissao, auditoria, compliance, explicabilidade |
| Arquitetura | modularidade, contratos, deploy, cutover |
| Qualidade | testes, gates, rastreabilidade, repetibilidade |
| Visual | densidade, organizacao de cards, grid, contexto de acao |

---

## 3. O que o Vetus-Like faz melhor

### 3.1 Documentacao como produto

O `vetus-like` apresenta o programa como uma colecao coerente de artefatos estrategicos:

- indice mestre
- executive summary
- roadmap
- WBS
- backlog
- matriz de permissoes
- event catalog
- API contracts
- modelo de dados
- readiness
- risk register

Isso cria uma narrativa clara para sponsors, produto e engenharia.

### 3.2 Estrutura modular por dominio

Cada modulo do `vetus-like` responde explicitamente:

- problema de negocio
- personas
- capacidades
- regras
- entidades
- APIs
- eventos
- permissoes
- KPIs
- prioridade de MVP

Essa estrutura e superior a um simples inventario de telas.

### 3.3 Shell e navegacao como espinha dorsal

Pelas imagens de dashboard, agenda, clientes, grupos de acesso e fluxo de caixa, o `vetus-like` mostra uma UI com:

- sidebar fixa e forte
- topbar com busca e suporte
- cards de entrada
- tela de agenda densa e operacional
- tabelas e filtros sem esconder o trabalho real
- visual de software enterprise, nao de landing page

### 3.4 Clareza de premium

O `vetus-like` explicita premissas premium desde a base:

- AI-native
- zero trust
- API-first
- extensibilidade
- observabilidade
- roadmap de produto
- readiness de go-live

Isso orienta a tomada de decisao com mais clareza do que um backlog puramente tecnico.

---

## 4. O que o CVG-HIS V2 faz melhor

### 4.1 Produto executavel real

O `cvg-his-v2` nao e plano: e sistema vivo.

Hoje ele possui:

- `apps/api`
- `apps/worker`
- `apps/spa`
- schema e migrations
- cutover e deploy alinhados
- docs vivas de arquitetura e operacao
- suites de testes e gates

### 4.2 Frontend oficial mais moderno na base

O `apps/spa` ja opera com:

- shell premium
- navegacao por dominio
- favoritos
- recentes
- topbar contextual
- dashboard com KPIs e atalhos
- roteamento por path

Isso o coloca em uma base arquitetural melhor para evoluir do que um frontend legado monolito.

### 4.3 Governanca de acesso mais madura

O `cvg-his-v2` ja foi alem do RBAC legado simples:

- equipes de acesso
- setores organizacionais
- memberships
- grants diretos
- origem explicavel da permissao
- matriz administravel

Esse ponto, no estado atual, ultrapassa o `vetus-like` em modelagem de governanca operacional.

### 4.4 Cobertura funcional real mais ampla

O `cvg-his-v2` ja cobre de forma executavel:

- cadastro mestre
- agenda
- fila
- atendimento
- prontuario
- triagem
- internacao
- diagnicos
- cirurgias
- prescricoes
- faturamento
- caixa
- estoque
- notificacoes
- auditoria
- webhooks
- api keys
- comercial

Ou seja: a solucao nao precisa ser inventada de novo.

---

## 5. Comparacao por eixo

| Eixo | Vetus-like | CVG-HIS V2 | Leitura |
|---|---|---|---|
| Visao de produto | Blueprint premium completo | Produto real com docs vivas | Vetus-like e mais inspirador; CVG e mais acionavel |
| Shell/navegacao | UI organizada, densa, por dominio | SPA premium em evolucao | CVG ja tem a base certa, mas ainda precisa unificar linguagem de acao |
| Modulos | Muito bem descritos na documentacao | Muito bem cobertos no runtime | CVG tem mais execucao; Vetus tem mais narrativa |
| Governanca | Forte no plano | Forte no implementado | CVG venceu em materializacao de governanca |
| Arquitetura | Muito forte no desenho | Muito forte no estado real | Empate, com vantagem do CVG por estar operando |
| Visual | Estruturado, enterprise, funcional | Mais moderno, mais modular | CVG precisa absorver a logica de organizacao do Vetus, nao a copia estetica |
| Backlog | Estruturado por capacidade e entrega | Estruturado por ondas e gaps | CVG precisa ficar mais modular e menos dependente de fase documental |

---

## 6. Gap entre o que existe e o que ainda falta

### 6.1 Gap de shell

Ainda falta fazer o `apps/spa` operar como um shell premium completo em todos os dominios:

- padrao unico de CTA primario e secundario
- contexto mais forte por unidade/tenant/rol
- menu com maior sinalizacao de estado
- densidade visual mais coerente em listas, detalhes e formularios

### 6.2 Gap de modularizacao de tela

O `vetus-like` descreve modulos como capacidades de negocio.

O `cvg-his-v2` ainda tem varias paginas boas, mas nem todas trabalham como **hub de dominio**.

Exemplo de objetivos para evolucao:

- dashboard como centro operacional e nao apenas resumo
- agenda como foco de producao e nao apenas lista de eventos
- pacientes e tutores com narrativa de relacionamento
- finance como console de decisao
- access-control como governanca real e nao painel administrativo

### 6.3 Gap de documentacao viva

O `cvg-his-v2` ja possui trilha viva forte, mas ainda precisa:

- reduzir residuos historicos no topo
- diminuir divergencias entre docs e codigo
- conectar melhor roadmap, backlog e aceites
- manter a trilha de frontend alinhada ao `apps/spa`

### 6.4 Gap de acabamento premium

O que falta nao e mais um sistema paralelo. O que falta e:

- consistencia
- padrao visual
- padrao de navegacao
- padrao de acao
- padrao de leitura executiva

---

## 7. O que deve ser preservado do Vetus-Like

| Elemento | Como aplicar no CVG-HIS V2 |
|---|---|
| Navegacao por dominio | manter a taxonomia do `apps/spa` e aprofundar a hierarquia |
| Menu como espinha dorsal | manter sidebar, contexto, favoritos e recentes |
| KPI por modulo | cada hub precisa expor indicadores e alertas |
| Fluxos densos | listas, filtros, calendarios e painels de detalhe com trabalho real |
| Premium docs | manter docs vivas por dominio, sem ambiguidade |
| Planejamento por capacidade | backlog deve nascer do dominio e do fluxo, nao do arquivo tecnico |

---

## 8. O que o CVG-HIS V2 deve fazer melhor que o Vetus-Like

| Meta | Diretriz |
|---|---|
| Arquitetura executavel | manter `apps/spa` como base oficial e evitar duplicidade de frontend |
| Governanca real | consolidar acesso, auditoria e membership como motor do produto |
| Operacao reproduzivel | garantir build, testes, deploy e cutover com historias unicas e coerentes |
| Evolucao sustentavel | construir por modulo e por hub, com corte por dominio e sem vacuo operacional |
| Linguagem premium moderna | absorver a densidade do Vetus sem copiar o visual antigo |

---

## 9. Conclusao

O `vetus-like` mostra **como pensar premium**.
O `cvg-his-v2` mostra **como construir de forma real, auditavel e escalavel**.

O objetivo para a proxima fase e combinar os dois:

1. manter o `cvg-his-v2` como produto executavel
2. usar o `vetus-like` como referencia de organizacao premium
3. fazer o `apps/spa` virar a melhor expressao dessa combinacao

Em termos praticos:

- `apps/spa` segue como frontend oficial alvo
- `apps/web` permanece apenas como legado de transicao sem novas entregas ate o corte
- os proximos modulos devem nascer com logica de hub, KPI, contexto e governanca
