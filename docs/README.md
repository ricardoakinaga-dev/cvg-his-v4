# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-08-24 (escopo fail-closed do worker, hidratação cross-instance, gates críticos e handoff)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

1. [`2026-08-24-handoff-cash-receipt-sigkill.md`](2026-08-24-handoff-cash-receipt-sigkill.md) - ponteiro operacional mais recente: prova GREEN bounded de recebimento sob SIGKILL e a próxima sequência de failpoints; não promove ERP, produção ou release.
2. [`2026-08-24-handoff-worker-account-scope.md`](2026-08-24-handoff-worker-account-scope.md) - handoff imediatamente anterior: escopo fail-closed do worker em Helm e limite explícito de renderização/cluster.
3. [`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md) - inventário e Quality Bar global reconciliada; ler junto com os dois handoffs de 24/08 para o estado de continuidade.
4. [`../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md`](../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md) - RED/GREEN do Secret obrigatório do worker e limites de Helm.
5. [`2026-08-23-checkpoint-retomada-sessao-atualizado.md`](2026-08-23-checkpoint-retomada-sessao-atualizado.md) - índice curto para retomar em cinco minutos.
6. [`../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md) - evidência fresca do `test:critical`, guardrails e limites de revisão.
7. [`../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`](../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md) - RED/GREEN da fencing com A vivo e reconciliação SQL.
8. [`../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`](../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md) - vínculo billing→consumo, hash canônico e replay divergente.
9. [`../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md`](../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md) - RED/GREEN de leitura authoritative na API secundária e isolamento A/B.
10. [`phase-9-migration-manifest.json`](phase-9-migration-manifest.json) - ondas documentais de migração, explicitamente `PLAN_ONLY`.
11. [`2026-08-23-checkpoint-retomada-integral.md`](2026-08-23-checkpoint-retomada-integral.md) - baseline executável e histórico detalhado de retomada.
12. [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md) - handoff amplo da sessão, evidências e decisões independentes.
13. [`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md) - sinais de produto em fontes oficiais e implicações para a barra de paridade.
14. [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) - auditoria consolidada, lacunas de código e pesquisa de PIMS oficiais.
15. [`2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md) - plano executivo vigente, marcos, gates, responsáveis e metas.
16. [`2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md) - backlog rastreável aos achados, dependências e critérios de aceite.
17. [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md) - baseline histórica da auditoria técnica e funcional; não substitui a Quality Bar nem os handoffs de 24/08.
18. [`430-fonte-de-verdade-documental.md`](430-fonte-de-verdade-documental.md) - regras de governança e precedência.
19. [`vetus/README.md`](vetus/README.md) - acervo factual capturado do Vetus.

Os handoffs de 24/08 e a Quality Bar global de 23/08 compõem a superfície
operacional atual. Evidência posterior bounded atualiza a continuidade, mas não
promove gates globais; os documentos históricos permanecem apenas para contexto.

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
