# CVG-HIS V4 - Documentacao ativa

**Atualizado em:** 2026-08-23 (checkpoint integral de retomada)

Esta pasta separa documentacao vigente, referencia do Vetus e historico. Uma afirmacao de funcionalidade so e considerada valida quando estiver sustentada por codigo executavel e teste comportamental.

## Comece aqui

- [2026-08-23-checkpoint-retomada-integral.md](2026-08-23-checkpoint-retomada-integral.md) - ponto de entrada mais recente, baseline executável, pesquisa oficial, Quality Bar e próximo passo.
1. [`2026-08-23-checkpoint-retomada-worker.md`](2026-08-23-checkpoint-retomada-worker.md) - ponto de entrada mais recente, estado publicado e próximo gate do worker.
2. [`2026-08-23-handoff-sessao-atual.md`](2026-08-23-handoff-sessao-atual.md) - handoff amplo da sessão, evidências, decisão independente e histórico.
3. [`2026-08-23-checkpoint-continuacao.md`](2026-08-23-checkpoint-continuacao.md) - histórico de continuidade, slices publicados, evidências e bloqueios.
4. [`2026-08-23-pesquisa-mercado-erp-veterinario.md`](2026-08-23-pesquisa-mercado-erp-veterinario.md) - sinais de produto em fontes oficiais e implicações para a barra de paridade.
5. [`2026-08-22-handoff-cvg-002b2.md`](2026-08-22-handoff-cvg-002b2.md) - histórico técnico detalhado, evidências verificadas e retomada de `CVG-002B2B`.
6. [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md) - auditoria consolidada, lacunas de código e pesquisa de PIMS oficiais.
7. [`2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md) - plano executivo vigente, marcos, gates, responsáveis e metas.
8. [`2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md) - backlog rastreável aos achados, dependências e critérios de aceite.
9. [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md) - baseline da auditoria técnica e funcional atual.
10. [`2026-08-10-primeiro-acesso-super-admin.md`](2026-08-10-primeiro-acesso-super-admin.md) - procedimento vigente de bootstrap seguro sem seed em staging/producao.
11. [`2026-07-11-relatorio-reauditoria-funcional-erp.md`](2026-07-11-relatorio-reauditoria-funcional-erp.md) - baseline anterior, notas e bloqueios reproduzidos.
12. [`2026-07-11-plano-produto-premium-erp-veterinario.md`](2026-07-11-plano-produto-premium-erp-veterinario.md) - visão funcional e arquitetura do ERP premium.
13. [`2026-07-11-roadmap-premium-58-a-90.md`](2026-07-11-roadmap-premium-58-a-90.md) - roadmap anterior, preservado como referência histórica.
14. [`2026-07-11-backlog-premium-executavel.md`](2026-07-11-backlog-premium-executavel.md) - backlog anterior, preservado como referência de IDs e execução.
15. [`2026-07-11-execucao-onda-1-paridade-vetus.md`](2026-07-11-execucao-onda-1-paridade-vetus.md) - diário de implementação e evidências anteriores.
16. [`2026-07-11-execucao-m0-sprint-1-fundacao-transacional.md`](2026-07-11-execucao-m0-sprint-1-fundacao-transacional.md) - evidências e bloqueios anteriores de PLAT-001/002.
17. [`2026-07-10-auditoria-paridade-funcional-vetus.md`](2026-07-10-auditoria-paridade-funcional-vetus.md) - contrato estrito de paridade e evidências faltantes.
18. [`430-fonte-de-verdade-documental.md`](430-fonte-de-verdade-documental.md) - regras de governança e precedência.
19. [`vetus/README.md`](vetus/README.md) - acervo factual capturado do Vetus.

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
