# Handoff — export server-side auditável de contas a pagar

**Data:** 2026-08-24<br>
**Escopo:** CVG-002C6 / Quality Bar `QB-REPORT-SERVER-*`<br>
**Estado:** GREEN bounded; ERP, paridade global, produção e release continuam `IN_PROGRESS/PARTIAL`

## Decisão

O próximo P0 local foi fechado sobre a fonte que já era transacional e
autoritativa: o subledger tenant-scoped de `financial_payables`. A fatia cobre
`Contas a Pagar` e `Contas Pagas`; não cria um relatório falso para cheques,
adiantamentos, cadastros ou NFS-e sem lifecycle e fonte analítica próprios.

Essa escolha segue os sinais pesquisados nas fontes oficiais registradas em
`docs/2026-08-23-pesquisa-mercado-erp-veterinario.md`: ERPs/PIMS modernos
conectam atendimento, cobrança, estoque e reporting; expõem charge capture,
inventário e relatórios operacionais; e preservam auditoria/proveniência. O
contrato também é coerente com os recursos FHIR `AuditEvent`/`Provenance`, mas
não transforma compatibilidade conceitual em certificação FHIR.

## Implementação

- `packages/modules/reports/src/index.ts` adiciona o catálogo
  `financial-payables`, com colunas financeiras, status/busca/período e os
  formatos já suportados pelo motor.
- `apps/api/src/routes/reports-routes.ts` valida filtros na fronteira, percorre
  todas as páginas do `FinancialPayablesService`, filtra por vencimento e
  normaliza somente os campos do subledger. A rota continua exigindo
  `billing.read` e usa a conta do principal, nunca uma conta enviada pelo
  cliente.
- O `ReportsService` persiste execução e export pelo repository configurado;
  a rota registra `execute_report` e `export_report` no audit service. O CSV
  server-side adiciona BOM, escapa células e neutraliza strings que poderiam
  ser interpretadas como fórmulas por planilhas.
- `ReportWorkbenchPage.vue` busca todas as páginas do subledger para manter o
  recorte exibido consistente e, para esses dois relatórios, executa/exporta
  pelo motor server-side. O navegador baixa o filename e o content do artefato
  persistido; as ações de baixa, cancelamento e conciliação continuam nas
  páginas financeiras próprias.

## Evidência reproduzível

- API route: `7/7` testes direcionados, incluindo persistência observada,
  auditoria, filtros inválidos, paginação completa e isolamento entre contas.
- módulo de reports: `12/12` testes, incluindo neutralização de fórmula CSV.
- SPA `ReportWorkbenchPage`: `29/29` testes direcionados; `vue-tsc` e build
  de produção passam com 769 módulos transformados.
- Chromium: o gate Enterprise completo passou `5/5` — Dashboard, motor de
  reports, agenda, inventário e Contas a Pagar — incluindo o download real de
  Contas a Pagar `1/1`; o filename vem do artefato
  `financial-payables-rep_exec_*.csv` e a UI mostra exportação server-side
  auditada.
- Typecheck monorepo passou em `70/70` projetos; security:enterprise passou
  com Secretlint e auditoria de dependências high/critical sem vulnerabilidades
  conhecidas, e resumo moderate em zero. O contrato vetus:parity:test passou
  `4/4`.
- O vertical HTTP/PostgreSQL clínico-financeiro previamente revalidado segue
  `5/5` verde; esta fatia não altera seu domínio.
- O teste completo da API continua com uma falha preexistente fora deste
  escopo na importação laboratorial (`202` observado onde o teste esperava
  `201`); por isso o gate desta fatia usa os testes direcionados e os gates de
  build/typecheck, não mascara esse sinal global.
- A revisão temporal local confirmou permissionamento, conta derivada do
  principal, paginação, filtros, persistência, auditoria, isolamento entre
  contas e download do artefato. O revisor independente não pôde iniciar nesta
  conta; portanto o veredito é `CONDITIONAL_PASS`, não aprovação independente.

## Limites honestos

O resultado é uma exportação server-side auditável bounded, não é ainda o
Excel legacy completo nem uma prova de produção. Persistência efetiva depende
do repository PostgreSQL configurado no runtime; a execução browser desta
onda usa o ambiente E2E controlado. Provider externo, Redis distribuído,
RLS/FORCE RLS global, backup/restore, cluster/Secrets, paridade Vetus 11/11,
WCAG, performance, observabilidade alvo e release continuam abertos.

Cheques, pagamento antecipado, cadastros e relatórios personalizados seguem
`blocked` ou `partial` até que cada um tenha fonte autoritativa, permissão,
auditoria e teste de comportamento próprios. Não usar `OwnerSummary.creditBalance`
como subledger de adiantamento.

## Controle documental

A auditoria determinística do corpus atual, excluindo este próprio handoff
para evitar auto-referência, leu `1.470` arquivos (`1.214` textos e
`256` binários), `54.077.965` bytes e `363.591` linhas, com manifesto
SHA-256 `d024c6c2577c97471eab19f81621470d421a869769d0d760ddf433fc808e7a5f`.
A validação pós-criação também leu o handoff; o inventário físico total passou
a `1.471` arquivos. Contagens anteriores dos handoffs são históricas e não
substituem este inventário.

## Próximo passo

Manter `CVG-002C6` e o ERP global ativos. Depois desta revisão temporal,
selecionar a próxima fatia P0 entre a jornada clínico-financeira completa e
uma fonte autoritativa restante; não promover nenhum gate global apenas por
este resultado bounded.
