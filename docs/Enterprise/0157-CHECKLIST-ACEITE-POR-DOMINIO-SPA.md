# 0157 - Checklist de Aceite por Dominio para o SPA Oficial

**Data:** 2026-04-11

## Objetivo

Definir um checklist unico para aceitar a migracao de cada dominio do `apps/web` para o `apps/spa`.

## Regra

Um dominio so pode ser considerado migrado quando todos os itens obrigatorios abaixo estiverem validados.

## Checklist padrao por dominio

### Funcionalidade

- a rota existe no `apps/spa`
- o fluxo principal funciona ponta a ponta
- a rota possui equivalente funcional ao que existia no `apps/web`
- os dados principais carregam corretamente
- o estado vazio e o estado de erro estao tratados

### Navegacao e shell

- a pagina aparece dentro do shell oficial do SPA
- breadcrumb ou contexto estao coerentes
- a acao primaria fica clara no topo
- as acoes secundarias estao em local previsivel
- o retorno para outras rotas do mesmo dominio e consistente

### UX e premiumizacao

- a pagina segue o padrao visual do SPA
- a densidade de informacao e adequada para o dominio
- o conteudo premium e util, nao decorativo
- a pagina funciona bem em desktop e mobile
- os textos e labels estao alinhados ao dominio de negocio

### Qualidade e seguranca

- existe teste automatizado do fluxo principal
- a pagina nao quebra a sessao ou a autenticacao
- o dominio respeita permissao/acesso
- o fluxo possui logs ou trilha de auditoria quando necessario
- nao ha regressao em rotas dependentes

### Convivio com o legado

- a tela antiga no `apps/web` continua ativa ate o corte
- existe fallback documentado se a tela nova falhar
- o dominio esta registrado na matriz web -> spa
- o usuario recebeu orientacao de migracao quando aplicavel

## Checklist adicional por tipo de dominio

### Master data

- pesquisa funciona
- criacao funciona
- edicao funciona
- detalhe funciona
- relacionamento com entidades dependentes funciona

### Operacao assistencial

- kanban/lista/timeline funciona quando aplicavel
- detalhes mostram historico e proximas acoes
- acoes clinicas principais estao visiveis
- transicoes de status funcionam

### Internação e leitos

- board ou mapa de leitos esta disponivel
- status do paciente internado esta visivel
- checklist de alta ou deslocamento esta disponivel
- integracao com prescricoes e medicações funciona

### Financeiro e comercial

- indicadores de resumo aparecem
- filtros de periodo funcionam
- fechamento ou consolidacao e acessivel
- exportacao ou detalhamento funciona

### Governança e plataforma

- permissao por perfil funciona
- listas e matrizes carregam com consistencia
- alteracoes sensiveis exigem confirmacao
- o modulo ajuda a operar, nao apenas listar dados

## Critérios de aprovação

Um dominio e aprovado quando:

- todos os itens obrigatorios do checklist padrao estao marcados
- os itens do checklist especifico do dominio estao marcados
- a equipe de produto aprova a experiencia
- a equipe tecnica aprova o risco residual
- o dominio pode ser desligado do `apps/web` sem perda operacional

## Criterio de desligamento global do apps/web

O `apps/web` inteiro somente pode ser apagado quando:

- todos os dominios prioritarios estiverem aprovados
- a matriz de rotas estiver completa e sem pendencias criticas
- o plano de desativacao e apagamento tiver sido executado
- a janela de convivencia tiver sido encerrada formalmente

## Como usar

Este checklist deve ser anexado ao ticket do dominio e revisado em cada sprint de migracao.

## Referencias

- [0155 - Plano de Migracao por Dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0155-PLANO-MIGRACAO-WEB-PARA-SPA-POR-DOMINIO.md)
- [0156 - Plano de Execucao por Sprint](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0156-PLANO-EXECUCAO-POR-SPRINT-SPA-OFICIAL.md)
