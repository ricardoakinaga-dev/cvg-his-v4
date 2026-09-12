# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-09-12 (programa executivo State of Art / Triplo AAA)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

### Programa ativo — ERP State of Art / Triplo AAA

Esta é a fonte ativa para decisão, execução e acompanhamento do programa. O
objetivo é elevar o ERP de uma base extensa em construção para um candidato
reproduzível, integrado, seguro, acessível e operável com régua Triplo AAA.

1. [Relatório de estado atual](2026-09-06-relatorio-estado-atual-erp-cvg-his-v4.md) — 67 itens pontuados, baseline **75/100, NO-GO**, com revalidação técnica de 07/09 no adendo.
2. [Plano executivo State of Art / Triplo AAA](2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md) — objetivos, investimento, gates, governança e decisões necessárias.
3. [Roadmap State of Art / Triplo AAA](2026-09-06-roadmap-erp-state-of-art-triplo-aaa.md) — fases relativas a T0, caminho crítico, marcos e trajetória de maturidade.
4. [Backlog State of Art / Triplo AAA](2026-09-06-backlog-erp-state-of-art-triplo-aaa.md) — 50 entregas `AAA-*`, status, dependências, owners e critérios de aceite.
5. [Quality Bar](engineering/QUALITY_BAR.md) e [matriz de evidências](engineering/REQUIREMENT_EVIDENCE_MATRIX.md) — gates que impedem que uma nota ou um arquivo substitua prova.
6. [Evidência do critical gate de 07/09](engineering/CRITICAL_GATE_2026-09-07.md) — `PASS_BOUNDED` local: 65/65 arquivos, 594/594 testes e 10/10 processos; limites de target e recertificação preservados.
7. [Evidência E2E SPA de 07/09](engineering/E2E_SPA_2026-09-07.md) — `PASS_BOUNDED` scoped: 9/9 jornadas contra PostgreSQL/Redis reais, com cleanup sem erro.
8. [Baseline corrente](triple-a/15-current-baseline.md) e [evidência corrente](triple-a/17-current-execution-evidence.md) — candidato `d8488431`, envelope de eventos, crosswalk e pins de supply chain validados, com limitações explícitas.
9. [Crosswalk do prompt congelado](triple-a/18-master-prompt-crosswalk.md) — 61 fases do prompt, 76 linhas da matriz, hashes e aceitação executável.
10. [Relatório final de assurance](triple-a/FINAL_REPORT.md), [scorecard](triple-a/13-final-scorecard.md) e [execution log](triple-a/EXECUTION_LOG.md).

As entradas numeradas de [`triple-a/MASTER_PROMPT.md`](triple-a/MASTER_PROMPT.md) seguem as fases do prompt
preservado; o [crosswalk](triple-a/18-master-prompt-crosswalk.md) é a referência
normativa da correspondência com a matriz expandida. Cada documento separa implementação local de verificação remota e
target; `BLOCKED`/`NOT PROVEN` não é convertido em aprovação.

O selo “Triplo AAA” é aspiracional e só poderá ser usado após nota global ≥95,
dimensões ≥90, nenhum item crítico abaixo de 85, gates obrigatórios aprovados,
evidência fresca no mesmo SHA, revisão independente e aceites de Produto,
Operação, Segurança/DPO e liberação.

- Ponto de salvamento de 06/09/2026 (histórico arquivado: `legado/docs/2026-09-06-checkpoint-salvamento.md`) —
  retomada da execução interrompida a pedido do usuário; falhas e próximos passos
  preservados, sem declaração de release pronta.

### Subprograma frontend — Precisão sensível

- [Auditoria de frontend, usabilidade e estética](2026-09-06-auditoria-frontend-usabilidade-estetica.md) — diagnóstico de 18 achados e limites da evidência.
- [Plano executivo frontend premium](2026-09-06-plano-executivo-frontend-premium.md) — direção de arte, experiência, controles, movimento e critérios de qualidade.
- [Roadmap frontend premium](2026-09-06-roadmap-frontend-premium.md) — ondas, capacidade proposta, dependências e gates.
- [Backlog frontend premium](2026-09-06-backlog-frontend-premium.md) — 34 entregas propostas, aceites e cobertura dos achados.
- [Caderno visual interativo](frontend/caderno-visual.html) e [assets/fonte](frontend/assets/README.md) — estudos próprios de material e movimento, ainda sem homologação no produto.

Este subprograma detalha o frontend; não substitui a governança nem encerra os gates do programa ERP acima.

### Continuidade técnica

- Execução da consolidação (histórico arquivado: `legado/docs/2026-09-05-execucao-consolidacao-cvg-his-v4.md`): evidências e pendências da implementação anterior.
- [Manifesto de migração](phase-9-migration-manifest.json): planejamento das ondas, sem comprovação de execução.

Os planos e relatórios executivos superados foram arquivados em `legado/docs/`.
O manifesto `legado/manifest.json` registra origem, destino e integridade dos arquivos.

### Certificação de uso

[Runbook de certificação](usability-certification-runbook.md): procedimento vigente de revisão visual, UAT e acessibilidade. Relatórios e handoffs de execuções anteriores ficam em `legado/docs/` e não comprovam o candidato atual.

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
- [`operations/PERFORMANCE_DIAGNOSTICS.md`](operations/PERFORMANCE_DIAGNOSTICS.md)
- [`engineering/REPORT_DATE_SEMANTICS.md`](engineering/REPORT_DATE_SEMANTICS.md)
- [`engineering/SECRET_ROTATION_AND_BREAK_GLASS.md`](engineering/SECRET_ROTATION_AND_BREAK_GLASS.md)

### Produto e navegacao

- `navigation-contract-vetus-aligned.md`
- `navigation-copy-and-breadcrumb-conventions.md`
- `navigation-matrix-current-vs-target.md`
- `routine-state-model.md`
- `legado/docs/micro-build/` - estudos de fluxo; nao substituem prova funcional.

## Referencia e historico

- `vetus/`: evidencia e guias do produto de referencia. Nao e especificacao automatica do CVG-HIS.
- `legado/docs/docs2/`: arquivo historico somente leitura. Nao usar como fonte de verdade operacional.
- `SOC2/` e `game-day/`: material especializado de operacao e conformidade.

## Regra de precedencia

Em divergencias, use esta ordem:

1. comportamento reproduzido na aplicacao e testes sobre runtime real;
2. codigo e contratos da API;
3. baseline/relatório e plano ativos de 7 de setembro de 2026, incluindo a Quality Bar e procedimentos posteriores explicitamente vigentes;
4. baseline executiva de 2 de setembro de 2026 e arquitetura/ADRs vigentes quando não contraditos pelo programa atual;
5. auditorias de julho de 2026, como baseline anterior;
6. acervo Vetus como referencia de produto;
7. historico em `legado/docs/docs2/`, apenas para contexto.

Relatorios antigos com notas de 85-96/100 foram arquivados porque mediam presenca de arquivos, planos ou implementacoes parciais e nao comprovavam a jornada completa.
