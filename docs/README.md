# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-08-24 (gates críticos, deployment guardrails e handoff)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

1. [`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md) - inventário integral atual, barra de qualidade, pesquisa oficial, evidências e próxima sequência.
2. [`2026-08-23-checkpoint-retomada-sessao-atualizado.md`](2026-08-23-checkpoint-retomada-sessao-atualizado.md) - índice curto para retomar em cinco minutos.
3. [`../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md) - evidência fresca do `test:critical`, guardrails e limites de revisão.
4. [`../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`](../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md) - RED/GREEN da fencing com A vivo e reconciliação SQL.
5. [`../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`](../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md) - vínculo billing→consumo, hash canônico e replay divergente.
6. [`phase-9-migration-manifest.json`](phase-9-migration-manifest.json) - ondas documentais de migração, explicitamente `PLAN_ONLY`.
7. [`2026-08-23-checkpoint-retomada-integral.md`](2026-08-23-checkpoint-retomada-integral.md) - baseline executável e histórico detalhado de retomada.
8. [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md) - handoff amplo da sessão, evidências e decisões independentes.
9. [`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md) - sinais de produto em fontes oficiais e implicações para a barra de paridade.
10. [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) - auditoria consolidada, lacunas de código e pesquisa de PIMS oficiais.
11. [`2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md) - plano executivo vigente, marcos, gates, responsáveis e metas.
12. [`2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md) - backlog rastreável aos achados, dependências e critérios de aceite.
13. [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md) - baseline da auditoria técnica e funcional atual.
14. [`430-fonte-de-verdade-documental.md`](430-fonte-de-verdade-documental.md) - regras de governança e precedência.
15. [`vetus/README.md`](vetus/README.md) - acervo factual capturado do Vetus.

Os documentos 2026-08-23 são a superfície operacional atual. Os itens
históricos preservados abaixo continuam disponíveis para contexto, mas não
substituem o checkpoint e o handoff global acima.

## Documentacao vigente

### Arquitetura

- `112-target-architecture.md`
- `113-module-contracts.md`
- `114-frontend-architecture.md`
- `115-backend-architecture.md`
- `116-worker-architecture.md`
- `adr/`

### Operacao e qualidade

- `130-instalacao-publicacao-cvg-his-v2-real.md`
- `131-checklist-cutover-servidor.md`
- `132-superficie-canonica-deploy-e-migracao.md`
- `CI_GATES.md`
- `2026-07-09-auditoria-correcao-seguranca-runtime.md`

### Produto e navegacao

- `navigation-contract-vetus-aligned.md`
- `navigation-copy-and-breadcrumb-conventions.md`
- `navigation-matrix-current-vs-target.md`
- `routine-state-model.md`
- `micro-build/` - estudos de fluxo; nao substituem prova funcional.

## Referencia e historico

- `vetus/`: evidencia e guias do produto de referencia. Nao e especificacao automatica do CVG-HIS.
- `docs2/`: arquivo historico somente leitura. Nao usar como fonte de verdade operacional.
- `SOC2/` e `game-day/`: material especializado de operacao e conformidade.

## Regra de precedencia

Em divergencias, use esta ordem:

1. comportamento reproduzido na aplicacao e testes sobre runtime real;
2. codigo e contratos da API;
3. programa ativo de 7 de agosto de 2026 e procedimentos posteriores explicitamente vigentes;
4. arquitetura e ADRs vigentes;
5. auditorias de julho de 2026, como baseline anterior;
6. acervo Vetus como referencia de produto;
7. historico em `docs2/`, apenas para contexto.

Relatorios antigos com notas de 85-96/100 foram arquivados porque mediam presenca de arquivos, planos ou implementacoes parciais e nao comprovavam a jornada completa.
