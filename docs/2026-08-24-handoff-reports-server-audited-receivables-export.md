# Handoff — export server-side auditável de contas a receber e recebidas

**Data:** 2026-08-24<br>
**Escopo:** CVG-002C6 / Quality Bar `QB-RECEIVABLES-*`<br>
**Estado:** GREEN bounded; veredito local `CONDITIONAL_PASS`

## Decisão

O segundo slice P0 do workbench financeiro foi fechado sobre a fonte
tenant-scoped já existente em `EncounterFinancialService.listReceivables`.
`Contas a Receber` usa `status=open` e filtra o período pela data de vencimento;
`Contas Recebidas` usa `status=settled` e filtra o período pela data de
liquidação. Quando a data semântica não existe, o contrato usa `issuedAt` como
fallback explícito.

Cheques, adiantamentos, saldos de tutor e qualquer relatório cadastral ou
customizado continuam fora. Não há lifecycle contábil autoritativo suficiente
nesta fatia para inventar essas linhas.

## Implementação

- `packages/modules/reports/src/index.ts` adiciona o catálogo
  `financial-receivables`, com status/busca/período, colunas de paciente,
  tutor, parcela, emissão, vencimento, liquidação, valores e pagamentos.
- `apps/api/src/routes/reports-routes.ts` valida status (`open|settled`),
  busca, datas e ordem do período; deriva a conta exclusivamente do principal;
  drena todas as páginas de `EncounterFinancialService.listReceivables`; aplica
  a data semântica e materializa somente o subledger recebido.
- A execução e a exportação continuam passando pelo `ReportsService`, que
  persiste o execution/artifact no repository configurado; a rota registra
  `execute_report` e `export_report` no audit service. O conteúdo exportado não
  é aceito do navegador.
- `ReportWorkbenchPage.vue` drena todas as páginas para o recorte exibido e
  usa o artefato server-side para `Contas a Receber` e `Contas Recebidas`.
  Nenhuma ação de baixa, conciliação ou alteração de recebível foi adicionada.
- O gate Chromium agora cobre o download real das seis superfícies Enterprise,
  incluindo `financial-receivables-rep_exec_*.csv` para Contas Recebidas.

## TDD e evidência reproduzível

- RED da API: os três testes de recebíveis falharam antes da implementação
  porque o catálogo ainda não conhecia `financial-receivables`; o RED do
  workbench falhou porque não havia chamada ao motor server-side.
- API route compilada: `10/10`, incluindo execução/exportação persistida,
  filtros inválidos, busca/status/data, paginação completa, conta do principal
  e auditoria.
- módulo de reports: `12/12`, incluindo neutralização de fórmula CSV.
- `ReportWorkbenchPage`: `30/30`; build da SPA passou com `769` módulos
  transformados.
- Chromium: `11/11` no comando Enterprise completo; o subconjunto Enterprise
  passou `6/6` e os fluxos Busca Mestre passaram `5/5`. Agenda, estoque, Contas
  a Pagar e Contas Recebidas baixaram arquivos reais e exibiram a mensagem de
  exportação server-side auditada.
- PostgreSQL HTTP clínico-financeiro: `7/7` em banco efêmero novo, incluindo
  replay, corrida, isolamento entre tenants, fechamento/recebimento e rollback.
- Typecheck monorepo: `70/70` projetos. `security:enterprise`: Secretlint e
  auditoria de dependências sem advisories critical/high/moderate conhecidos.
  `vetus:parity:test`: `4/4`.
- `git diff --check` e os parsers dos ledgers permanecem gates obrigatórios
  deste handoff. O formato legado de `packages/modules/reports/src/reports.test.ts`
  mantém diferenças históricas do Prettier; não foi reformatado para evitar
  ruído fora do slice. O Vue foi formatado e recompilado.

## Revisão e limites honestos

A revisão temporal local confirmou `billing.read`, conta derivada do principal,
validação de filtros, paginação, persistência, auditoria, isolamento, data
semântica e download do artefato. O papel de revisor independente não pôde ser
iniciado nesta conta; portanto não há aprovação independente declarada.

O E2E usa banco descartável saudável, mas configuração controlada com
repositories de runtime em memória; isso não prova persistência de produção.
O pacote completo da API ainda conserva a falha preexistente fora desta fatia
na expectativa de laboratório (`202` observado versus `201` esperado).
Produção, providers, Redis, RLS/FORCE RLS global, DR/RPO, paridade Vetus
completa, WCAG, cobertura, operações, cluster/Secrets e release continuam
`IN_PROGRESS/PARTIAL`.

## Controle documental

O corpus documental foi recontado depois da criação deste handoff, excluindo
este próprio arquivo do manifesto para evitar auto-referência. A leitura
encontrou `1.471` arquivos (`1.215` textuais e `256` binários), `54.083.646`
bytes e `363.690` linhas lógicas textuais. O manifesto ordenado por caminho,
formado por `caminho\tSHA-256-do-arquivo`, tem SHA-256
`7d592891f7f9d83c8df57feecb0b4b55a498f226599686d2729ad9659d916c6e`.
Incluindo este próprio handoff, o inventário físico passa a `1.472` arquivos.

## Próximo passo

Manter `CVG-002C6` e o ERP global ativos. Selecionar a próxima fatia P0 entre a
jornada clínico-financeira completa e outra fonte autoritativa Vetus; não
promover nenhum gate global com base neste resultado bounded.
