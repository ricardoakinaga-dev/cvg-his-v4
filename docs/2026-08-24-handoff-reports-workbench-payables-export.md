# Handoff — exportação operacional do workbench de contas a pagar

**Data:** 2026-08-24
**Escopo:** CVG-002C6 / continuação do P0 de relatórios Vetus
**Estado:** GREEN bounded; ERP, paridade global e release continuam `IN_PROGRESS/PARTIAL`

## Resultado

As telas de **Contas a Pagar** e **Contas Pagas** passaram a consumir o
subledger persistido existente em `/financial/payables`, respeitando o filtro
de status `paid` para a segunda tela. O workbench agora exporta o recorte
carregado em CSV protegido, sem criar linhas sintéticas:

- fornecedor, descrição, categoria e datas de emissão/vencimento;
- total, pago, saldo a pagar, status e método de pagamento;
- estado de reconciliação do título.

A tela continua somente leitura. Baixa, cancelamento, conciliação e criação de
conta permanecem nas telas financeiras próprias, sob as permissões existentes.
O caminho Vetus `Financeiro/ContasAPagar.htm` continua rastreável na mensagem
da tela; o CSV não é um Excel legacy integral nem um artefato server-side
persistido.

## Evidência fresca

- `ReportWorkbenchPage` + `report-export`: 2 arquivos, 30/30 testes.
- `pnpm --filter @cvg-his-v2/spa build`: exit 0; 769 módulos transformados.
- Playwright direcionado de agenda, estoque e contas a pagar: 3/3 downloads
  reais, com nomes `agenda-YYYY-MM-DD.csv`, `estoque-YYYY-MM-DD.csv` e
  `contas-a-pagar-YYYY-MM-DD.csv`.
- `pnpm vetus:parity:test`: 4/4.
- Auditoria Vetus: 98/100, 4/11 áreas verificadas; estoque permanece
  `verified` e relatórios seguem bloqueados somente pelas famílias ainda sem
  fonte/exportação completa e pelo contrato server-side auditável.
- Readiness enterprise: 95/100, 42 PASS, 3 WARN e 1 FAIL pelo gate estrito de
  paridade.

## Limites e próximo passo

O export é um snapshot client-side de dados já autorizados e carregados pelo
subledger. Cheques, pagamento antecipado, cadastros com PII e relatórios
personalizados continuam sem botão ativo por falta de fonte operacional
equivalente ou contrato de autorização/auditoria específico. O próximo P0 é
selecionar uma dessas fontes autoritativas ou retomar a jornada
clínico-financeira completa; nenhum gate global foi promovido.
