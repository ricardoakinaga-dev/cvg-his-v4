# Handoff — exportação operacional do workbench de relatórios

**Data:** 2026-08-24
**Escopo:** CVG-002C6 / próximo P0 de cobertura Vetus
**Estado:** GREEN bounded; ERP, paridade global e release continuam `IN_PROGRESS/PARTIAL`

## Resultado

O workbench de relatórios agora exporta um CSV do recorte efetivamente carregado
para as trilhas com fonte operacional comprovada:

- auditoria de agendamentos;
- gaveta, fluxo de caixa, DRE, pacotes, contas a receber e contas recebidas;
- comandas/vendas, produtos/serviços produzidos, produção, agenda e atendimento por profissional.

A ação deixou de se chamar “Solicitar Excel” nessas trilhas e passou a se chamar
“Exportar CSV”. O arquivo usa UTF-8 com BOM, separador `;`, escape RFC 4180,
serialização determinística de objetos e prefixo contra injeção de fórmulas em
planilhas. O download é um snapshot client-side das linhas e colunas visíveis;
não é apresentado como exportação Excel legacy integral nem como artefato
server-side auditável.

As trilhas de contas a pagar, contas pagas, cheques, pagamento antecipado,
NFS-e, cadastros, exclusões e estoque continuam bloqueadas para exportação até
possuírem fonte analítica e contrato operacional suficientes. A limitação fica
visível no workbench e no contrato Vetus.

## TDD e implementação

1. RED: o teste novo não resolveu `@/utils/report-export` porque o utilitário
   ainda não existia.
2. GREEN: `apps/spa/src/utils/report-export.ts` implementou o builder puro de
   CSV e a proteção de valores formula-like.
3. O `ReportWorkbenchPage.vue` passou a usar `exportable`, criar `Blob`, iniciar
   download com nome sanitizado por relatório/data, revogar a URL e apresentar
   sucesso/erro ao operador.
4. A suíte do workbench foi ampliada para verificar o download real via `Blob`;
   o E2E usa o evento de download do navegador.

## Evidência fresca

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reports/__tests__/ReportWorkbenchPage.test.ts src/utils/report-export.test.ts --config vitest.config.ts` — 2 arquivos, 30/30.
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` — exit 0.
- `pnpm --filter @cvg-his-v2/spa build` — exit 0; 769 módulos transformados.
- `pnpm exec playwright test e2e/spa/enterprise-surfaces-gate.spec.ts --config playwright-spa.config.ts -g "exporta o recorte carregado"` — 1/1.
- `pnpm vetus:parity:test` — 4/4.
- `pnpm vetus:parity:audit` — 98/100, 4/11 áreas verificadas; relatórios com 100/100 de camadas estruturais, porém bloqueados pelos gaps funcionais remanescentes.
- `pnpm readiness:enterprise` — 95/100, 42 PASS, 3 WARN, 1 FAIL devido exclusivamente à paridade Vetus estrita.

## Riscos e próximo passo

O snapshot client-side não substitui um export server-side com trilha de
auditoria, autorização específica, paginação consistente e artefato persistido.
Também não fecha a paridade Vetus das trilhas ainda bloqueadas.

Próxima seleção P0: continuar a cobertura operacional do workbench restante ou
retomar a jornada clínica-financeira completa, mantendo o estado global
`IN_PROGRESS/PARTIAL` e sem promover paridade, produção ou release.
