# 0160 - Roteiro de Desligamento Operacional do apps/web

**Data:** 2026-04-11

## Objetivo

Executar o desligamento operacional do `apps/web` de forma controlada, com backup, congelamento, remoção de redirects, limpeza de deploy e checklist final de eliminação.

## Premissa

Este roteiro so deve ser executado depois que:

- o `apps/spa` estiver como frontend oficial em operacao
- a matriz de rotas `web -> spa` estiver encerrada
- o plano de desativacao e apagamento tiver sido aprovado
- nenhum dominio critico depender do `apps/web`

## Visao geral das fases

1. Backup e congelamento
2. Remocao de redirects
3. Limpeza de deploy
4. Checklist final de eliminacao

## Fase 1 - Backups e congelamento

### Objetivo

Preservar a trilha historica antes de interromper o frontend legado.

### Acoes obrigatorias

- exportar snapshot final da documentacao de migracao
- registrar a lista final de rotas ainda existentes no legado
- salvar evidencia do ultimo estado funcional
- congelar qualquer mudanca residual no `apps/web`
- bloquear entrada de novas features ou ajustes nao criticos
- marcar a branch/commit que representa o ultimo estado vivo do legado

### Evidencias a guardar

- inventario final de rotas
- lista de redirecionamentos ativos
- status final de dominios migrados
- logs ou relatorios de validacao
- aprovacao de produto e operacao

### Saida da fase

- o `apps/web` nao recebe mais evolucao funcional
- qualquer alteracao passa a exigir aprovacao excepcional

## Fase 2 - Remocao de redirects

### Objetivo

Eliminar caminhos ocultos para o legado depois que o SPA estiver assumindo as rotas.

### Acoes obrigatorias

- remover redirect de entrada principal para o `apps/web`
- atualizar links internos e atalhos de acesso
- revisar menu, bookmarks e acessos documentados
- limpar regras temporarias de fallback
- confirmar que a entrada padrao aponta para o `apps/spa`

### Verificacoes

- acesso direto ao `apps/web` nao e mais necessario para rotas principais
- as rotas migradas apontam apenas para o SPA
- nao ha redirecionamento silencioso que esconda pendencias

### Saida da fase

- o `apps/web` deixa de ser destino de usuario por navegao normal

## Fase 3 - Limpeza de deploy

### Objetivo

Remover o `apps/web` da trilha de deploy e operacao diaria.

### Acoes obrigatorias

- retirar o `apps/web` dos manifests e composes ativos
- remover referencias de CI/CD e pipelines
- atualizar documentacao de deploy e instalacao
- remover variaveis, portas ou health checks exclusivos do legado
- confirmar que o frontend oficial e o `apps/spa`
- revisar scripts de onboarding, infra e cutover para nao apontarem ao legado

### Verificacoes

- nao existe dependencia de deploy do `apps/web`
- nenhuma automacao depende de rota ou porta do legado
- o ambiente sobe e opera com o `apps/spa` sem fallback necessario

### Saida da fase

- o `apps/web` deixa de ser parte da operacao de deploy

## Fase 4 - Checklist final de eliminacao

### Objetivo

Confirmar que o `apps/web` pode ser removido do caminho ativo do produto.

### Checklist final

- todos os dominios prioritarios estao aprovados no SPA
- a matriz de rotas esta sem pendencias criticas
- o plano de desativacao foi executado
- nao ha usuario ativo dependente do legado
- nao ha automacao, bookmark ou link residual
- nao ha incidente recente que exija fallback
- nao ha rollback pendente
- o time de produto aprovou o corte
- o time tecnico aprovou o risco residual
- operacao e suporte sabem que o legado foi encerrado

### Decisao final

Se todos os itens acima estiverem marcados, o `apps/web` pode ser removido do caminho ativo.

## Ordem operacional recomendada

1. congelar o legado
2. validar backup e evidencias
3. remover redirects
4. limpar deploy
5. executar checklist final
6. remover o frontend legado da trilha principal

## O que pode ser removido

- rotas residuais
- referencias em menu e docs operacionais
- artefatos de deploy que apontem para o legado
- fallback temporario

## O que nao deve ser removido sem revisao

- documentacao historica
- auditorias de migracao
- relatorios de validacao
- registros de decisao arquitetural

## Resultado esperado

Ao final do roteiro:

- o `apps/web` nao e mais usado operacionalmente
- o `apps/spa` assume integralmente a experiencia do usuario
- a plataforma fica sem ambiguidade de frontend oficial

## Referencias

- [0159 - Plano de Desativacao e Apagamento do apps/web](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0159-PLANO-DESATIVACAO-APAGAMENTO-WEB.md)
- [0158 - Matriz de Rotas Web -> SPA](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0158-MATRIZ-ROTAS-WEB-TO-SPA.md)
