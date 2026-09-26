# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-09-26 (rodada 2 vigente)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

O [manifesto de governança documental](document-governance.json) identifica a
baseline formal vigente e seus documentos de plano, roadmap e backlog. Esse
conjunto permanece o de **21/09/2026**. O pacote publicado em 23/09 é
complementar e não substitui a baseline: sua auditoria descreve uma árvore de
trabalho suja, sem SHA único de candidato, com veredito `RELEASE_BLOCKED`.
CI/OCI, target, restore aprovado, UAT e autoridade de release não foram provados
naquela fotografia.

## Rodada 2 — vigente desde 26/09/2026

A [auditoria completa do sistema](2026-09-26-auditoria-completa-sistema.md) atribui **70/100**. As correções de 26/09 fecharam os defeitos de Pix, LGPD, anexos, MFA e NFS-e, detectaram loop travado no worker e trouxeram o alerta de alergia na prescrição. O bloqueio principal passou a ser o cache por processo sem invalidação entre réplicas (achado A1).

- [Plano executivo](2026-09-26-plano-executivo-rodada-2.md) — objetivo, papéis, regras e critério de go-live.
- [Roadmap](2026-09-26-roadmap-rodada-2.md) — ondas 0–4 de 28/09 a 04/12, com marcos M0–M3.
- [Backlog](2026-09-26-backlog-rodada-2.md) — 34 itens `R2` (11 P0, 15 P1, 8 P2), com critérios de aceite.
- [Controles de privacidade, autenticação e pagamentos](security/PRIVACY_AUTH_AND_PAYMENT_CONTROLS.md) — comportamento vigente e decisões de produto.
- [Auditoria preliminar de 26/09](2026-09-26-auditoria-programa.md) — histórica; registra as correções aplicadas na primeira parte do dia.

O conjunto de 21/09 (auditoria, plano, roadmap e backlog `REM`) passa a histórico. As seções abaixo descrevem rodadas anteriores e servem de contexto.

## Pacote complementar de 23/09/2026

A [auditoria da árvore de trabalho](2026-09-23-relatorio-auditoria-repositorio.md) atribuiu **66/100** ao estado local observado em 23/09, com alterações ainda sem SHA candidato único. Ela complementa a baseline formal de 21/09 (68/100 no candidato daquela data), sem substituí-la no manifesto. O release segue bloqueado.

- [Lista de 50 melhorias](2026-09-23-lista-50-melhorias.md) — 20 altas, 20 médias e 10 baixas.
- [Plano executivo complementar](2026-09-23-plano-executivo-melhorias.md) — resultados, responsáveis sugeridos e gates.
- [Roadmap complementar](2026-09-23-roadmap-melhorias.md) — ondas relativas W0–W5.
- [Backlog complementar](2026-09-23-backlog-melhorias.md) — 50 itens `M`, dependências e critérios de aceite; reconciliar com `REM` antes de executar.

## Comece aqui

### Programa ativo — ERP State of Art / Triplo AAA

Esta é a fonte ativa para decisão, execução e acompanhamento do programa. O
objetivo é elevar o ERP de uma base extensa em construção para um candidato
reproduzível, integrado, seguro, acessível e operável com régua Triplo AAA.

**Auditoria de 21/09/2026:** nota ponderada **68/100**, estado
`RELEASE_BLOCKED`. A base local tem build, typecheck, testes de workspaces,
PostgreSQL crítico 623/623 e processos 11/11 fortes, mas o coverage gate falha,
o teste padrão não inclui toda a raiz, um blob versionado de 152.651.034 bytes
impede push normal e 11 de 14 P0 permanecem abertos. CI/release exatos,
registry/attestation, target, restore aprovado, UAT e autoridade continuam
ausentes. Uma nota não substitui P0 nem autoriza produção.

Essas duas lacunas de testes descrevem a fotografia de **21/09**. Na árvore de
remediação de 24/09, `pnpm test` já executa a suíte raiz e os workspaces por
`scripts/run-root-test-suite.mjs`, e `pnpm test:coverage` possui gate global
de 82% em statements, branches, functions e lines. Isso não promove release:
os gates candidate-bound, CI, target, UAT e autoridade continuam separados.

1. [Auditoria profunda do HEAD `ad2f0373`](2026-09-21-auditoria-profunda-repositorio.md) — scorecard 0–100 e 33 achados enumerados.
2. [Plano executivo de remediação integral](2026-09-21-plano-executivo-remediacao-integral.md) — estratégia, milestones, Quality Bar e autoridade.
3. [Roadmap de remediação integral](2026-09-21-roadmap-remediacao-integral.md) — preservação → gates locais → CI/release → target → produto → reauditoria.
4. [Backlog executável de remediação](2026-09-21-backlog-remediacao-integral.md) — 55 tarefas `REM`, dependências e aceites; os [contratos detalhados de 14/09](2026-09-14-backlog-state-of-art-triplo-aaa.md) permanecem referência normativa dos cartões PROD.
5. [Prompt mestre para Codex](2026-09-21-prompt-codex-remediacao-integral.md) — instrução copia e cola para executar o programa preservando limites humanos.
- [Matriz de ambiente e runtime](049-matriz-ambiente-runtime.md) — precedência Compose/Helm por ambiente, alvos e owners pendentes.
- [Contrato de identidade corporativa PROD-019](019-contrato-identidade-corporativa.md) — opções C1-C6, requisitos R1-R6 e gate de autoridade; provider e integração permanecem pendentes.
- [Contrato de expiração de pontos PROD-052](052-contrato-expiracao-pontos.md) — opções C1-C6, requisitos R1-R6 e gate Product/Financeiro; nenhum saldo é alterado.
- [Matriz comportamental PROD-027](027-matriz-comportamental-11-areas.md) — preparação da taxonomia de 11 áreas e inventário 45→46, sem aceitar paridade.
- [Pacote de decisão sintético primeiro PROD-027](engineering/PROD-027-SYNTHETIC-FIRST-APPROVAL-PACKET.md) — proposta de sequência e gates; não concede autoridade nem permite fixtures, execução ou dados Vetus.
6. [Quality Bar](engineering/QUALITY_BAR.md) e [matriz de evidências](engineering/REQUIREMENT_EVIDENCE_MATRIX.md) — gates que impedem que uma nota ou um arquivo substitua prova.
7. [Evidência do critical gate de 07/09](engineering/CRITICAL_GATE_2026-09-07.md) — `PASS_BOUNDED` local: 65/65 arquivos, 594/594 testes e 10/10 processos; limites de target e recertificação preservados.
8. [Evidência E2E SPA de 07/09](engineering/E2E_SPA_2026-09-07.md) — `PASS_BOUNDED` scoped: 9/9 jornadas contra PostgreSQL/Redis reais, com cleanup sem erro.
9. [Snapshot Triple-A candidate-bound de 21/09](triple-a/15-current-baseline.md) e [evidência associada](triple-a/17-current-execution-evidence.md) — identidade `74b8669f` pertence àquela fotografia e não identifica a árvore de trabalho auditada em 23/09; CI/target/UAT continuam `NOT_PROVEN`.
10. [Crosswalk do prompt congelado](triple-a/18-master-prompt-crosswalk.md) — estrutura de 61 fases e 76 linhas; os hashes e aceites registrados pertencem ao snapshot anterior.
11. [Relatório final de assurance](triple-a/FINAL_REPORT.md), [scorecard](triple-a/13-final-scorecard.md) e [execution log](triple-a/EXECUTION_LOG.md) — identidade anterior, com limitações externas explícitas.

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
resolvidas explicitamente. O estado operacional permanece em `.agent`, mas o
controller local atualmente retorna `FAIL` e a classificação M-02 dos paths do
snapshot original continua em andamento. Conclua a revisão path-level e a
crítica independente antes da próxima revisão candidate-bound; depois,
mediante autorização, execute CI/release candidate-bound e target.

Relatorios antigos com notas de 85-96/100 foram arquivados porque mediam presenca de arquivos, planos ou implementacoes parciais e nao comprovavam a jornada completa.
