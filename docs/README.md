# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-09-20 (candidato local `ed663abe`)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

### Programa ativo — ERP State of Art / Triplo AAA

Esta é a fonte ativa para decisão, execução e acompanhamento do programa. O
objetivo é elevar o ERP de uma base extensa em construção para um candidato
reproduzível, integrado, seguro, acessível e operável com régua Triplo AAA.

**Auditoria de 20/09/2026:** nota ponderada **68/100** (entrada 53/100), estado
`LOCAL_COMPLETE / EXTERNAL_BLOCKED`. Os gates locais de supply-chain,
dependências, segredos, backup/restore documental, métricas, upload, Helm,
qualidade e banco passam no candidato `ed663abe`; CI/release exatos, target,
restore aprovado, UAT e autoridade continuam ausentes. Uma nota não substitui
P0 nem autoriza produção.

1. [Auditoria e scorecard do candidato `ed663abe`](2026-09-20-auditoria-scorecard-ed663abe.md) — notas 0–100, veredito, provas e blockers.
2. [Plano executivo da nova rodada](2026-09-20-plano-executivo-nova-rodada-melhorias.md) — estratégia, milestones, gates e autoridade.
3. [Roadmap da nova rodada](2026-09-20-roadmap-nova-rodada-melhorias.md) — sequência runtime → controle → candidato → CI/release → target.
4. [Backlog executável](2026-09-20-backlog-nova-rodada-melhorias.md) — P0/P1 e dependências externas; os [contratos detalhados de 14/09](2026-09-14-backlog-state-of-art-triplo-aaa.md) permanecem referência normativa dos cartões PROD.
- [Matriz de ambiente e runtime](049-matriz-ambiente-runtime.md) — precedência Compose/Helm por ambiente, alvos e owners pendentes.
- [Contrato de identidade corporativa PROD-019](019-contrato-identidade-corporativa.md) — opções C1-C6, requisitos R1-R6 e gate de autoridade; provider e integração permanecem pendentes.
- [Contrato de expiração de pontos PROD-052](052-contrato-expiracao-pontos.md) — opções C1-C6, requisitos R1-R6 e gate Product/Financeiro; nenhum saldo é alterado.
- [Matriz comportamental PROD-027](027-matriz-comportamental-11-areas.md) — preparação da taxonomia de 11 áreas e inventário 45→46, sem aceitar paridade.
5. [Quality Bar](engineering/QUALITY_BAR.md) e [matriz de evidências](engineering/REQUIREMENT_EVIDENCE_MATRIX.md) — gates que impedem que uma nota ou um arquivo substitua prova.
6. [Evidência do critical gate de 07/09](engineering/CRITICAL_GATE_2026-09-07.md) — `PASS_BOUNDED` local: 65/65 arquivos, 594/594 testes e 10/10 processos; limites de target e recertificação preservados.
7. [Evidência E2E SPA de 07/09](engineering/E2E_SPA_2026-09-07.md) — `PASS_BOUNDED` scoped: 9/9 jornadas contra PostgreSQL/Redis reais, com cleanup sem erro.
8. [Snapshot Triple-A corrente](triple-a/15-current-baseline.md) e [evidência associada](triple-a/17-current-execution-evidence.md) — vinculados à fonte congelada `ed663abe`; CI/target/UAT continuam `NOT_PROVEN`.
9. [Crosswalk do prompt congelado](triple-a/18-master-prompt-crosswalk.md) — estrutura de 61 fases e 76 linhas; os hashes e aceites registrados pertencem ao snapshot anterior.
10. [Relatório final de assurance](triple-a/FINAL_REPORT.md), [scorecard](triple-a/13-final-scorecard.md) e [execution log](triple-a/EXECUTION_LOG.md) — snapshot corrente `ed663abe`, com limitações externas explícitas.

As entradas numeradas de [`triple-a/MASTER_PROMPT.md`](triple-a/MASTER_PROMPT.md) seguem as fases do prompt
preservado; o [crosswalk](triple-a/18-master-prompt-crosswalk.md) é a referência
normativa da correspondência com a matriz expandida. Cada documento separa implementação local de verificação remota e
target; `BLOCKED`/`NOT PROVEN` não é convertido em aprovação.

O selo “Triplo AAA” é aspiracional e só poderá ser usado após nota total ≥97,
dimensões críticas ≥95, zero P0 abertos, gates obrigatórios aprovados, conforme
a [régua congelada](triple-a/QUALITY_BAR_V1.json),
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

Os planos e relatórios já migrados foram arquivados em `legado/docs/`, com
origem, destino e integridade em `legado/manifest.json`. Os predecessores
executivos recentes permanecem na raiz como `historical` até migração
autorizada e são governados por `document-governance.json`.

### Certificação de uso

[Runbook de certificação](usability-certification-runbook.md): procedimento vigente de revisão visual, UAT e acessibilidade. Relatórios e handoffs de execuções anteriores ficam em `legado/docs/` e não comprovam o candidato atual.

## Documentacao vigente

### Arquitetura

- `112-target-architecture.md`
- `113-module-contracts.md`
- `114-frontend-architecture.md`
- `115-backend-architecture.md`
- `116-worker-architecture.md`
- [`architecture/spa-api-base-url.md`](architecture/spa-api-base-url.md) — contrato build-time da URL da API e proxy same-origin.
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
3. auditoria, plano, roadmap e backlog vigentes conforme `document-governance.json`, mantendo a Quality Bar congelada e os procedimentos explicitamente vigentes;
4. baseline executiva de 2 de setembro de 2026 e arquitetura/ADRs vigentes quando não contraditos pelo programa atual;
5. auditorias de julho de 2026, como baseline anterior;
6. acervo Vetus como referencia de produto;
7. historico em `legado/docs/docs2/`, apenas para contexto.

Essa ordem identifica evidência do comportamento atual, não autoriza um bug a
substituir requisito aprovado. Para decidir o comportamento esperado, consultar
contratos, ADRs e autoridades vigentes; divergências devem ser registradas e
resolvidas explicitamente. O estado operacional em `.agent` passa
estruturalmente, mas não torna a evidência atual. A próxima ação técnica é
revisão independente fresh; depois, mediante autorização, CI/release
candidate-bound e target.

Relatorios antigos com notas de 85-96/100 foram arquivados porque mediam presenca de arquivos, planos ou implementacoes parciais e nao comprovavam a jornada completa.
