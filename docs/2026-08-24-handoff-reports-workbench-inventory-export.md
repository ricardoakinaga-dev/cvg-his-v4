# Handoff — exportação operacional do workbench de estoque

**Data:** 2026-08-24
**Escopo:** CVG-002C6 / continuação do P0 de relatórios Vetus
**Estado:** GREEN bounded; ERP, paridade global e release continuam `IN_PROGRESS/PARTIAL`

## Resultado

As quatro telas de relatório de estoque que já carregavam dados operacionais
reais agora usam o mesmo contrato de `Exportar CSV` do workbench:

- posição de estoque;
- movimentações de estoque;
- entrada de NF derivada dos lotes;
- relatório de produtos.

O export é habilitado somente depois que as fontes de itens, lotes e, quando
aplicável, consumos retornam ao workbench. O arquivo é um snapshot client-side
das linhas carregadas, com UTF-8/BOM, separador `;`, escape, tratamento de
objetos/nulos e proteção contra fórmulas de planilha.

As limitações de fonte continuam explícitas: transferências/ajustes dependem
de fonte analítica própria e o número de NF é derivado do lote enquanto não
existir fonte fiscal documental. Não há promessa de Excel legacy integral,
artefato persistido ou trilha server-side de auditoria.

## Evidência fresca

- Suíte direcionada `ReportWorkbenchPage` + `report-export`: 2 arquivos,
  30/30 testes.
- `pnpm --filter @cvg-his-v2/spa build`: exit 0; 769 módulos transformados.
- Playwright direcionado de agenda e estoque: 2/2; os downloads observaram os
  nomes `agenda-YYYY-MM-DD.csv` e `estoque-YYYY-MM-DD.csv`.
- `pnpm vetus:parity:test`: 4/4.
- O contrato Vetus agora descreve relatórios de auditoria, financeiro,
  atendimento e estoque com exportação CSV bounded; o bloqueio restante cita
  contas a pagar, cheques, pagamento antecipado, cadastros e personalizados.

## Riscos e próximo passo

Estoque ainda não tem exportação server-side auditável, fonte específica para
transferências/ajustes ou garantia de equivalência com o Excel legacy. Cadastros
com PII permanecem sem botão ativo até haver contrato de autorização/auditoria
adequado.

Próxima seleção P0: fechar uma fonte analítica segura para uma família financeira
ou retomar a jornada clínica-financeira completa. Os gates globais continuam
sem promoção.
