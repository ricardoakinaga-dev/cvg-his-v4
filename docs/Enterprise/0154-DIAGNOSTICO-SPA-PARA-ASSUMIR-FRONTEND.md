# 0154 - Diagnostico de Prontidao do apps/spa

**Data:** 2026-04-11

## Objetivo

Medir o que falta no `apps/spa` para ele assumir formalmente o lugar de frontend oficial, com foco em organizacao, shell, navegacao, consistencia visual e capacidade de sustentar a migracao do `apps/web`.

## Resumo executivo

O `apps/spa` ja e a melhor base tecnica para o frontend de longo prazo, mas ainda nao e o frontend oficial em termos de produto. Ele precisa de:

- arquitetura de navegao mais rica
- consolidacao do shell enterprise
- aprofundamento de modulos
- padronizacao de CTA e paginas
- reforco de testes e validação

## Scorecard de prontidao

| Eixo | Estado atual | Impacto |
|---|---|---|
| Stack Vue | Bom | Base certa para evolucao |
| Router e breadcrumbs | Bom | Ajuda a organizar jornadas |
| Design system | Medio | Existe, mas precisa virar padrao de produto |
| Sidebar / shell | Medio | Estrutura boa, mas ainda plana |
| Contexto operacional | Baixo | Faltam tenant, filial, setor e estado do usuario |
| Favoritos / recentes | Ausente | Reduz velocidade de uso |
| Busca global | Ausente | Dificulta descoberta por papel |
| Hierarquia de acoes | Medio | Existe, mas nao e padronizada em todo o produto |
| Modulos premium | Medio | Ha paginas fortes, mas falta densidade em varios dominios |
| Cobertura funcional | Bom | Cobre boa parte do core |
| Cobertura de testes | Medio/Baixo | Precisam crescer com a migracao |
| Documentacao de modulo | Baixo | Falta camada documental equivalente ao `vetus-like` |

## Pontos fortes do apps/spa

### 1. Estrutura tecnica mais sustentavel

- Vue 3
- componentes reutilizaveis
- router com rotas nomeadas
- layout com sidebar e topbar
- pagina por dominio e por detalhe

### 2. Melhor encaixe para premiumizacao

O `apps/spa` e mais apropriado para:

- adicionar componentes ricos
- manter estados de tela mais complexos
- evoluir gradualmente o shell
- padronizar UX por dominio

### 3. Melhor caminho para durar

Para um produto de longo prazo, a base do `apps/spa` tende a escalar melhor do que a implementacao HTML inline do `apps/web`.

## Lacunas bloqueadoras

### Bloqueio 1: shell sem contexto de negocio

Hoje o shell nao expõe de forma forte:

- tenant
- filial
- setor
- perfil
- estado da sessao
- estado de rollout

### Bloqueio 2: navegao sem taxonomia enterprise

A navegao atual precisa sair do modelo "lista de telas" e entrar no modelo:

- dominio
- subdominio
- rotina
- acao
- acesso condicionado

### Bloqueio 3: paginas ainda muito discretas

Em varios pontos o frontend ainda se comporta como CRUD funcional. O `vetus-like` exige paginas que sejam hubs de operacao:

- KPI
- alerta
- acoes primarias
- quick actions
- estados vazios utilitarios
- trilha de contexto

### Bloqueio 4: cobertura incompleta de modulos legacy

O `apps/web` ainda cobre rotas e funcao que precisam existir no `apps/spa` antes do corte:

- fila / recepcao operacional
- auditoria
- busca global
- setores
- leitos
- relatorios comerciais
- acesso / governanca centralizada

### Bloqueio 5: documentacao nao acompanha o mesmo grau de maturidade

O `vetus-like` documenta cada modulo com:

- problema
- persona
- capacidade
- regra
- entidade
- API/evento
- permissao
- KPI

O `apps/spa` ainda nao tem essa camada para todos os dominios.

## O que precisa existir antes do corte oficial

### A. Shell enterprise

- sidebar agrupada por dominio
- topbar com breadcrumb, contexto e status
- favorito e recentes
- busca global de rotas
- indicacao de modulo novo/legado/indisponivel

### B. Padrão de pagina

Toda pagina deve seguir uma estrutura basica:

1. cabecalho com titulo, subtitulo e acao primaria
2. faixa de contexto
3. faixa de filtros ou tabs
4. conteudo principal
5. acao secundarias
6. observabilidade de estado e erro

### C. Regras de interacao

- um unico CTA primario por tela
- filtros separados das acoes destrutivas
- dialogos modais somente para criacao/edicao critica
- telas detalhadas devem ter resumo + historico + proximas acoes

### D. Cobertura de qualidade

- testes unitarios dos componentes chave
- testes de fluxo das telas principais
- validacao visual dos layouts criticos
- validacao mobile

## Diagnostico por dominio

### Pronto ou quase pronto para migrar

- login
- dashboard
- tutores
- pacientes
- agendamentos
- atendimento
- prontuario
- prescricoes
- execucoes de prescricao
- altas
- cirurgia
- internação
- faturamento
- triagem
- usuarios
- notificacoes
- PIX
- caixa
- vendas
- orcamentos
- produtos
- servicos
- equipe
- webhooks

### Ainda precisa de ajuste estrutural

- acesso / governanca
- fila / recepcao
- auditoria
- busca global
- setores
- leitos
- mapa de leitos
- relatorios comerciais
- inventory detail / form patterns

## Recomendacao objetiva

O `apps/spa` deve ser adotado como frontend oficial alvo agora, mas com a seguinte condicao:

- nenhum dominio critica o `apps/web` deve ser desligado antes de ter equivalencia em `apps/spa`

## Saida esperada deste diagnostico

Este documento serve como criterio de corte para a migracao. O que estiver fora do scorecard nao pode ser considerado pronto para desligar no `apps/web`.
