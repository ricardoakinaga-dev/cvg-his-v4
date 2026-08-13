# CVG-HIS V2 - Active Documentation

Esta raiz `docs/` agora contem apenas a documentacao viva e necessaria para conduzir a proxima etapa de construcao do CVG-HIS V2 como um ERP veterinario enterprise.

**Estado auditado em 11/08/2026 e verificado em 12/08/2026:** a auditoria executável partiu de **67/100**, fechou o P1 interno em **78/100** e alcançou a nota conservadora de **81/100** após zerar as 48 ocorrências de vulnerabilidade, fechar o RLS de sessões e validar 98/98 tabelas tenant. O relatório vivo está em [`2026-08-11-relatorio-auditoria-p1.md`](2026-08-11-relatorio-auditoria-p1.md), e o programa até 95 está dividido em [plano executivo](2026-08-12-plano-executivo-meta-95.md), [roadmap](2026-08-12-roadmap-meta-95.md) e [backlog](2026-08-12-backlog-meta-95.md). Os scores `96/100` e `97/100` registrados em documentos de abril/maio são baselines históricos e não substituem os gates atuais.

Todo o acervo historico, auditorias antigas, prompts, relatorios de fase e documentos fora da trilha viva foi arquivado em `docs/docs2/archive-active-reset-2026-03-31/`.

## Objetivo da trilha viva

Levar o repositorio a uma base documental que sustente:

- evolucao tecnica coerente com o codigo existente
- construcao das lacunas restantes para um ERP veterinario enterprise
- operacionalizacao de testes, release e deploy
- nota documental alvo de `85/100` ao final da construcao

## Regra operacional de deploy

Para deploy e cutover do projeto atual, a trilha canonica e exclusivamente a do V2:

- compose oficial: `docker-compose.v2.yml`
- apps oficiais: `apps/api`, `apps/worker`, `apps/spa`
- servicos oficiais: `cvg-his-v2-api`, `cvg-his-v2-worker`, `cvg-his-v2-spa`

`apps/web` e o servico `cvg-his-v2-web` permanecem apenas como legado de transicao e nao devem ser usados como frontend canonico.

Documentos historicos em `docs/docs2/` ou referencias antigas a `apps/his-*`, `cvg-his-api`, `cvg-his-web` e `cvg-his-worker` nao devem ser usados como instrucao operacional do deploy atual.

## Ordem recomendada de leitura

1. `2026-08-11-relatorio-auditoria-p1.md`
2. `2026-08-12-plano-executivo-meta-95.md`
3. `2026-08-12-roadmap-meta-95.md`
4. `2026-08-12-backlog-meta-95.md`
5. `400-auditoria-documental-pente-fino.md`
6. `410-matriz-aderencia-documental.md`
7. `420-plano-atualizacao-documental.md`
8. `430-fonte-de-verdade-documental.md`
9. `440-roadmap-construcao-85.md`
10. `450-gaps-enterprise-priorizados.md`
11. `480-plano-execucao-85-plus-enterprise.md`
12. `490-backlog-executavel-implementacao.md`
13. `112-target-architecture.md`
14. `113-module-contracts.md`
15. `114-frontend-architecture.md`
16. `115-backend-architecture.md`
17. `116-worker-architecture.md`
18. `123-phased-execution-plan.md`
19. `460-qualidade-testes-e-gates.md`
20. `470-politica-migracao-e-deploy.md`
21. `130-instalacao-publicacao-cvg-his-v2-real.md`
22. `131-checklist-cutover-servidor.md`
23. `580-plano-modulos-comerciais-enterprise.md`
24. `581-backlog-modulos-comerciais.md`

## Trilha Premium Vetus-like

Quando a discussão for comparacao com o Vetus-like, roadmap premium, backlog, sprints e corte do legado, a porta de entrada oficial passa a ser:

1. `vetus/README.md`
2. `Enterprise/0338-PLANO-EXECUTIVO-RUMO-96-2026-04-22.md`
3. `Enterprise/0349-PLANO-EXECUTIVO-FECHAMENTO-GAP-96-2026-04-24.md`
4. `Enterprise/0350-ROADMAP-FECHAMENTO-GAP-96-2026-04-24.md`
5. `Enterprise/0351-BACKLOG-FECHAMENTO-GAP-96-2026-04-24.md`
6. `Enterprise/0348-RELATORIO-AUDITORIA-DOCS-VS-CODIGO-2026-04-24.md`
7. `Enterprise/0346-RELATORIO-AUDITORIA-FINAL-96-2026-04-22.md`

## Trilha Vetus de referencia

Quando a necessidade for inspecao visual, comparacao de navegacao, inventario de modulos e evidencias do Vetus, a trilha oficial passa a ser:

1. `vetus/README.md`
2. `vetus/guides/01-overview-relatorio-mestre.md`
3. `vetus/guides/13-arquitetura-rotas-e-api.md`
4. `vetus/guides/16-catalogo-de-evidencias.md`

## Trilha viva

### Auditoria e governanca

- `400-auditoria-documental-pente-fino.md`
- `410-matriz-aderencia-documental.md`
- `420-plano-atualizacao-documental.md`
- `430-fonte-de-verdade-documental.md`

### Construcao alvo

- `2026-08-12-plano-executivo-meta-95.md`
- `2026-08-12-roadmap-meta-95.md`
- `2026-08-12-backlog-meta-95.md`
- `440-roadmap-construcao-85.md`
- `450-gaps-enterprise-priorizados.md`
- `480-plano-execucao-85-plus-enterprise.md`
- `490-backlog-executavel-implementacao.md`
- `123-phased-execution-plan.md`

### Arquitetura

- `112-target-architecture.md`
- `113-module-contracts.md`
- `114-frontend-architecture.md`
- `115-backend-architecture.md`
- `116-worker-architecture.md`
- `adr/ADR-003-arquitetura-canonica-v2.md`
- `adr/ADR-004-stack-persistencia-v2.md`
- `adr/ADR-005-persistencia-implementada-wave1.md`
- `adr/ADR-006-repository-pattern.md`
- `adr/ADR-007-frontend-canonico-v2.md`
- `adr/ADR-009-module-structure-simplified.md`

### Qualidade, dados e operacao

- `460-qualidade-testes-e-gates.md`
- `CI_GATES.md`
- `470-politica-migracao-e-deploy.md`
- `130-instalacao-publicacao-cvg-his-v2-real.md`
- `131-checklist-cutover-servidor.md`
- `132-superficie-canonica-deploy-e-migracao.md`
- `521-operational-runbook-enterprise.md`

Leitura obrigatoria para deploy atual:

- `130-instalacao-publicacao-cvg-his-v2-real.md`
- `131-checklist-cutover-servidor.md`
- `132-superficie-canonica-deploy-e-migracao.md`

Complemento fora de `docs/`:

- `README.md`
- `INSTALACAO_V2_OPENCLAW.md`
- `OPENCLAW_DEPLOY_DIRETRIZES.md`

### Modulos enterprise (docs vivas minimas)

- `500-modulo-access-control.md`
- `501-modulo-attachments.md`
- `502-modulo-billing.md`
- `503-modulo-notifications.md`
- `504-modulo-scheduling.md`
- `505-modulo-staff.md`
- `506-modulo-surgery.md`
- `508-modulo-users.md`

### Fluxos criticos e gaps

- `510-matriz-fluxos-criticos-enterprise.md`
- `511-backlog-gaps-funcionais.md`

### Expansao comercial enterprise

- `580-plano-modulos-comerciais-enterprise.md`
- `581-backlog-modulos-comerciais.md`
- `582-modelagem-comercial-final.md`
- `583-fase-c1-c2-validacao.md`
- `584-fase-c3-c4-validacao.md`
- `585-fase-c5-validacao.md`
- `586-ciclo-comercial-final-validacao.md`
- `587-veredito-comercial-operacional-final.md`

### Release e checklist enterprise

- `520-checklist-release-enterprise.md`

### Score final e veredito

- `530-score-final-85-plus.md`
- `531-riscos-residuais-e-backlog-pos-85.md`
- `540-veredito-final-enterprise.md`
- `550-ciclo-1-fechamento-gaps-final.md`
- `560-pacote-final-prontidao-publicacao.md`
- `561-veredito-operacional-final.md`
- `570-ciclo-2-autonomia-operacional.md`

### Fechamento global

- `590-consolidacao-global-produto.md`
- `591-score-final-global.md`
- `592-veredito-global-operacional.md`
- `593-backlog-residual-pos-fechamento-global.md`
- `594-fechamento-global-validacao.md`

### Ciclo de Autonomia Operacional

- `600-ciclo-autonomia-operacional-validacao.md`
- `601-score-pos-autonomia-operacional.md`
- `602-veredito-pos-autonomia-operacional.md`

### UX operacional e jornadas

- `880-plano-executivo-ux-operacional.md`
- `881-roadmap-ux-operacional.md`
- `882-backlog-ux-operacional.md`
- `879-auditoria-inicial-ui-ux-operacional.md`
- `883-auditoria-ui-atual-ux-operacional.md`
- `884-brief-visual-operacional.md`
- `885-spec-cabecalho-contextual.md`
- `886-modelo-operacional-queue-encounter.md`
- `887-prd-jornada-recepcao.md`
- `888-prd-jornada-veterinario-clinico.md`
- `889-roadmap-fluxos-especializados.md`
- `890-plano-validacao-operacional.md`

### Ciclo de Autonomia Plena

- `610-ciclo-autonomia-plena-validacao.md`
- `611-score-pos-autonomia-plena.md`
- `612-veredito-pos-autonomia-plena.md`

### Ciclo Residual Final

- `620-ciclo-residual-final-validacao.md`

### Avaliacao Atual

- `630-avaliacao-atual-e-plano-producao-enterprise.md`
- `631-fase-e1-qualidade-validacao.md`
- `632-fase-e2-operacao-validacao.md`
- `635-fase-paralela-triage-validacao.md`
- `633-fase-paralela-scheduling-queue-validacao.md`
- `634-fase-hardening-scheduling-validacao.md`

### Governanca de acesso enterprise

- `840-diagnostico-governanca-de-acesso-organizacional.md`
- `850-modelo-alvo-de-governanca-de-acesso-enterprise.md`
- `860-plano-enterprise-de-implementacao-da-governanca-de-acesso.md`
- `870-relatorio-final-da-governanca-de-acesso-enterprise.md`

### Validacao de ondas

- `491-onda-1-validacao.md`
- `492-onda-2-validacao.md`
- `493-onda-3-validacao.md`
- `494-onda-4-validacao.md`

## Regras editoriais

- documento vivo precisa refletir o estado real do codigo
- historico nao fica mais no topo de `docs/`
- prompts operacionais nao ficam mais misturados com documentacao de referencia
- deploy, banco e testes devem ter uma fonte de verdade explicita
- qualquer novo documento na raiz deve ser necessario para construcao ou operacao
- IDs numericos devem ser unicos entre os documentos ativos da raiz; arquivos arquivados podem preservar IDs historicos e nao sao referencia operacional
- scores, contagens e status precisam informar a data da evidencia; documentos antigos devem apontar para o relatorio vivo quando citarem um estado anterior

## Arquivo historico

Os documentos arquivados foram preservados em:

- `docs/docs2/archive-active-reset-2026-03-31/`
- `docs/docs2/archive-enterprise-2026-04-12/`
- `docs/docs2/archive-root-sanitization-2026-04-12/`

Esse arquivo deve ser tratado como acervo historico e nao como trilha principal.
