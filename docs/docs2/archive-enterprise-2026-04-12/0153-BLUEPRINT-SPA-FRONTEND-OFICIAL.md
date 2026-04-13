# 0153 - Blueprint SPA Frontend Oficial

**Data:** 2026-04-11

## Objetivo

Formalizar o `apps/spa` como frontend alvo de longo prazo do `cvg-his-v2`, alinhando o produto a logica de construcao parecida com o `vetus-like`:

- menu por dominio
- contexto sempre visivel
- hierarquia clara de acoes
- modulos mais densos e premium
- migracao controlada por dominio
- `apps/web` vivo ate o cutover completo

## Decisao de produto

O `apps/spa` deve assumir a responsabilidade de ser o frontend oficial do futuro.

O `apps/web` continua ativo como trilha de convivencia e operacao ate que:

- os dominios prioritarios estejam migrados
- os fluxos criticos tenham equivalencia funcional
- os usuarios-chave validem os novos fluxos
- o corte por dominio esteja registrado e revertivel

## Base de evidencia

Fontes vivas do repositorio:

- [Frontend oficial atual e estrategia de convivencia](/root/.openclaw/workspace/cvg-his-v2/docs/114-frontend-architecture.md#L9)
- [Arquitetura alvo do repo](/root/.openclaw/workspace/cvg-his-v2/docs/112-target-architecture.md#L13)
- [Plano de fases consolidado](/root/.openclaw/workspace/cvg-his-v2/docs/123-phased-execution-plan.md#L91)
- [Shell e navega ao atual em `apps/web`](/root/.openclaw/workspace/cvg-his-v2/apps/web/src/index.ts#L131)
- [Estrutura Vue atual em `apps/spa`](/root/.openclaw/workspace/cvg-his-v2/apps/spa/src/layouts/AppLayout.vue#L1)
- [Mapa de rotas do `apps/spa`](/root/.openclaw/workspace/cvg-his-v2/apps/spa/src/router/routes.ts#L3)

## Diagnostico resumido

### O que o `apps/spa` ja tem

- arquitetura Vue 3 com router, stores e componentes
- layout consistente com sidebar e topbar
- breadcrumbs
- design system reutilizavel
- paginas por dominio com estrutura de tela mais evoluida que o HTML inline
- rota por entidade e rotas de detalhe/edicao

### O que ainda falta para assumir oficialmente

- shell enterprise por dominio, nao apenas sidebar plana
- menu com grupos, contexto, favoritos e rotinas recentes
- indicadores de modulo novo, legado e indisponivel
- barra de contexto com tenant, filial, setor e perfil
- busca global de rotinas
- hierarquia padronizada de botao primario, secundario e contextual
- padrao de pagina por tipo de tela
- cobertura de testes e validacao por dominio mais ampla
- documentacao de modulo com narrativa funcional completa

## Principios de construcao

### 1. Domain first

Cada area da interface deve nascer da jornada do dominio, nao da estrutura tecnica.

### 2. Enterprise by default

Permissao, contexto, auditoria, rollout e rastreabilidade devem existir no shell, nao como ajuste posterior.

### 3. UX first

Cada pagina precisa responder claramente:

- qual e a acao principal
- quais sao as acoes secundarias
- qual e o estado do contexto
- o que esta disponivel, bloqueado ou em rollout

### 4. Migration safe

O `apps/web` nao e descartado de imediato. Ele permanece como fallback operacional ate a entrega por dominio.

### 5. Premium but practical

Premium aqui nao significa excesso visual. Significa:

- menos friccao
- mais densidade util
- mais contexto
- mais previsibilidade
- mais confianca operacional

## Target state do frontend

O `apps/spa` deve evoluir para um shell com estas camadas:

- **shell global**: sidebar, topbar, contexto, estado do usuario
- **navegacao por dominio**: grupos, subgrupos, busca, recentes, favoritos
- **workspace da pagina**: header, acoes, filtros, tabs, conteudo
- **painel de contexto**: indicadores de tenant, filial, setor, permissao e status
- **camada de operacao**: alertas, estados vazios, loading, erros, validacoes

## Diretrizes para premiumizacao

- usar um unico sistema visual para cards, tabelas, forms e modais
- padronizar espaco entre topo, acoes e conteudo
- reduzir botao sem contexto
- evitar copiar o mesmo CTA em mais de um lugar na mesma tela
- transformar dashboards em hubs de decisao, nao em telas decorativas
- inserir KPI, alerta e acao de fechamento nos modulos centrais

## Entregaveis esperados

- shell oficial do `apps/spa`
- navbar por dominio com hierarquia clara
- pagina padrâo por tipo de tela
- mapa de rotas e migrao por dominio
- corte funcional de `apps/web` por modulo
- documentacao de UX e contrato por dominio

## Critério de aceite

O `apps/spa` pode ser considerado frontend oficial quando:

- os dominios prioritarios tiverem equivalencia funcional
- a navegacao refletir o mapa de negocio, nao a estrutura tecnica
- o layout estiver consistente em desktop e mobile
- os fluxos criticos estiverem cobertos por testes
- o `apps/web` puder ser mantido apenas como convivio ate desativacao final

## Leituras complementares

- [0154 - Diagnostico de prontidao do apps/spa](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0154-DIAGNOSTICO-SPA-PARA-ASSUMIR-FRONTEND.md)
- [0155 - Plano de migracao por dominio](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0155-PLANO-MIGRACAO-WEB-PARA-SPA-POR-DOMINIO.md)
