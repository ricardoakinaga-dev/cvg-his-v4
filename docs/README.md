# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-09-03 (implementacao local e matriz de dependencias externas)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

### Baseline executiva vigente

1. [`2026-09-02-relatorio-reauditoria-cvg-his-v4.md`](2026-09-02-relatorio-reauditoria-cvg-his-v4.md) - reauditoria executável, notas por item e domínio, bloqueadores e decisão de uso.
2. [`2026-09-02-plano-executivo-melhorias-cvg-his-v4.md`](2026-09-02-plano-executivo-melhorias-cvg-his-v4.md) - metas, frentes, gates, indicadores, responsabilidades e riscos.
3. [`2026-09-02-roadmap-melhorias-cvg-his-v4.md`](2026-09-02-roadmap-melhorias-cvg-his-v4.md) - ondas R0-R4, dependências, critérios de saída e evolução esperada das notas.
4. [`2026-09-02-backlog-priorizado-cvg-his-v4.md`](2026-09-02-backlog-priorizado-cvg-his-v4.md) - backlog P0/P1/P2, critérios de aceite e definições de Ready/Done.
5. [`2026-09-03-implementacao-plano-cvg-his-v4.md`](2026-09-03-implementacao-plano-cvg-his-v4.md) - estado evidenciado de cada ticket, validações locais e dependências que exigem ambiente ou aceite externo.

Esses quatro documentos substituem, para decisão executiva corrente, o relatório, o plano e o backlog de 7 de agosto. A documentação anterior permanece como histórico e evidência de evolução.

A unicidade e os links dessa baseline são definidos no
[`document-governance.json`](document-governance.json) e verificados por
`pnpm docs:validate` no CI.

### Evidências técnicas recentes

1. [`2026-08-24-handoff-inpatient-bed-status-idempotency.md`](2026-08-24-handoff-inpatient-bed-status-idempotency.md) - assignment, transferência e status com replay/conflict cross-instance, failpoints PostgreSQL de timeline/leito/auditoria, callback clínico aguardado, restart/SIGKILL e liberação durável de leitos.
2. [`2026-08-24-handoff-inpatient-clinical-notes-idempotency.md`](2026-08-24-handoff-inpatient-clinical-notes-idempotency.md) - handoff, evolução e ocorrência com replay/conflict cross-instance, recuperação de cache e timeline clínica persistida.
3. [`2026-08-24-handoff-inpatient-command-idempotency.md`](2026-08-24-handoff-inpatient-command-idempotency.md) - admissão e criação de diária com unidade de trabalho tenant-scoped, replay/conflict, auditoria transacional e hidratação cross-instance.
4. [`2026-08-24-handoff-reports-server-audited-receivables-export.md`](2026-08-24-handoff-reports-server-audited-receivables-export.md) - export server-side auditável de Contas a Receber e Contas Recebidas a partir do subledger tenant-scoped.
5. [`2026-08-24-handoff-reports-server-audited-payables-export.md`](2026-08-24-handoff-reports-server-audited-payables-export.md) - export server-side auditável de Contas a Pagar e Contas Pagas a partir do subledger persistido.
6. [`2026-08-24-handoff-reports-workbench-payables-export.md`](2026-08-24-handoff-reports-workbench-payables-export.md) - exportação CSV bounded anterior do workbench financeiro.
7. [`2026-08-24-handoff-reports-workbench-inventory-export.md`](2026-08-24-handoff-reports-workbench-inventory-export.md) - exportação CSV bounded dos recortes de estoque já carregados no workbench Vetus.
8. [`2026-08-24-handoff-reports-workbench-export.md`](2026-08-24-handoff-reports-workbench-export.md) - exportação CSV bounded do workbench Vetus para auditoria, financeiro e atendimento, com teste unitário, componente e E2E.
9. [`2026-08-24-handoff-pix-runtime-role.md`](2026-08-24-handoff-pix-runtime-role.md) - settlement PIX sob role worker real, ACL/RLS, A/B, SIGKILL e fencing; não promove ERP, produção ou release.
10. [`2026-08-24-handoff-reports-run-once.md`](2026-08-24-handoff-reports-run-once.md) - execução one-shot de relatórios agendados, entrega controlada, recovery após SIGKILL e lease distribuído de retry no PostgreSQL.
11. [`2026-08-24-handoff-webhook-storage-audit.md`](2026-08-24-handoff-webhook-storage-audit.md) - reconciliação do diagnóstico histórico com o executor webhook durável já implementado e seus limites honestos.
12. [`2026-08-24-handoff-laboratory-bootstrap-concurrency.md`](2026-08-24-handoff-laboratory-bootstrap-concurrency.md) - dois PIDs reais, catálogo laboratorial idempotente, reparo parcial e isolamento A/B.
13. [`../.agent/artifacts/CVG-002C6-laboratory-bootstrap-concurrency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-laboratory-bootstrap-concurrency-2026-08-24.md) - RED/GREEN da corrida de bootstrap, crítica independente, suíte de regressão e limitações.
14. [`2026-08-24-handoff-cash-receipt-concurrency.md`](2026-08-24-handoff-cash-receipt-concurrency.md) - corrida GREEN bounded entre duas APIs, isolamento A/B e barreira PostgreSQL.
15. [`2026-08-24-handoff-cash-receipt-sigkill.md`](2026-08-24-handoff-cash-receipt-sigkill.md) - rollback/restart/replay do recebimento sob SIGKILL e limites da prova.
16. [`2026-08-24-handoff-worker-account-scope.md`](2026-08-24-handoff-worker-account-scope.md) - escopo fail-closed do worker em Helm e limite explícito de renderização/cluster.
17. [`2026-08-23-auditoria-documental-global-e-handoff.md`](2026-08-23-auditoria-documental-global-e-handoff.md) - inventário e Quality Bar global reconciliada; ler junto com os handoffs de 24/08.
18. [`../.agent/artifacts/CVG-002C6-cash-receipt-concurrency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-cash-receipt-concurrency-2026-08-24.md) - RED/GREEN da corrida, barreira PostgreSQL e crítica independente.
19. [`../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md`](../.agent/artifacts/CVG-002C6-worker-account-scope-2026-08-24.md) - RED/GREEN do Secret obrigatório do worker e limites de Helm.
20. [`2026-08-23-checkpoint-retomada-sessao-atualizado.md`](2026-08-23-checkpoint-retomada-sessao-atualizado.md) - índice curto para retomar em cinco minutos.
21. [`../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md`](../.agent/artifacts/CVG-002C6-critical-gates-2026-08-24.md) - evidência fresca do `test:critical`, guardrails e limites de revisão.
22. [`../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md`](../.agent/artifacts/CVG-002C6-stale-owner-a-alive-2026-08-24.md) - RED/GREEN da fencing com A vivo e reconciliação SQL.
23. [`../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md`](../.agent/artifacts/CVG-002C6-billing-source-hash-2026-08-24.md) - vínculo billing→consumo, hash canônico e replay divergente.
24. [`../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md`](../.agent/artifacts/CVG-002C6-cross-instance-hydration-2026-08-24.md) - RED/GREEN de leitura authoritative na API secundária e isolamento A/B.
25. [`phase-9-migration-manifest.json`](phase-9-migration-manifest.json) - ondas documentais de migração, explicitamente `PLAN_ONLY`.
26. [`2026-08-23-checkpoint-retomada-integral.md`](2026-08-23-checkpoint-retomada-integral.md) - baseline executável e histórico detalhado de retomada.
27. [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md) - handoff amplo da sessão, evidências e decisões independentes.
28. [`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md) - sinais de produto em fontes oficiais e implicações para a barra de paridade.
29. [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) - auditoria consolidada, lacunas de código e pesquisa de PIMS oficiais.
30. [`2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md) - plano executivo histórico, substituído pelo plano de 02/09.
31. [`2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md) - backlog e roadmap históricos, substituídos pelos documentos de 02/09.
32. [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md) - baseline histórica da auditoria técnica e funcional; não substitui a Quality Bar nem os handoffs de 24/08.
33. [`430-fonte-de-verdade-documental.md`](430-fonte-de-verdade-documental.md) - regras de governança e precedência.
34. [`vetus/README.md`](vetus/README.md) - acervo factual capturado do Vetus.

A baseline de 02/09 consolida a decisão executiva atual. Os handoffs de 24/08 e
a Quality Bar global de 23/08 permanecem como evidências técnicas detalhadas;
não promovem gates globais isoladamente. Os demais documentos históricos ficam
disponíveis apenas para contexto e rastreabilidade.

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

### Governança de release, risco e complexidade

- [`adr/ADR-012-release-identity-and-semver-v4.md`](adr/ADR-012-release-identity-and-semver-v4.md)
- [`engineering/RELEASE_IDENTITY.md`](engineering/RELEASE_IDENTITY.md)
- [`engineering/OWNERSHIP_AND_COMPLEXITY.md`](engineering/OWNERSHIP_AND_COMPLEXITY.md)
- [`engineering/EVIDENCE_RISK_DASHBOARD.md`](engineering/EVIDENCE_RISK_DASHBOARD.md)
- [`engineering/INSTALL_UPGRADE_ROLLBACK.md`](engineering/INSTALL_UPGRADE_ROLLBACK.md)
- [`engineering/SLO_AND_LOAD_PROFILE.md`](engineering/SLO_AND_LOAD_PROFILE.md)
- [`engineering/REPORT_DATE_SEMANTICS.md`](engineering/REPORT_DATE_SEMANTICS.md)
- [`engineering/SECRET_ROTATION_AND_BREAK_GLASS.md`](engineering/SECRET_ROTATION_AND_BREAK_GLASS.md)

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
3. baseline executiva de 2 de setembro de 2026 e procedimentos posteriores explicitamente vigentes;
4. arquitetura e ADRs vigentes;
5. auditorias de julho de 2026, como baseline anterior;
6. acervo Vetus como referencia de produto;
7. historico em `docs2/`, apenas para contexto.

Relatorios antigos com notas de 85-96/100 foram arquivados porque mediam presenca de arquivos, planos ou implementacoes parciais e nao comprovavam a jornada completa.
