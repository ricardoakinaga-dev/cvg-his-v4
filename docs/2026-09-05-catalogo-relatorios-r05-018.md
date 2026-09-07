---
document_status: review
document_kind: report-catalog-contract
effective_date: 2026-09-05
owner: Produto e Backend
source_ticket: R05-018
---

# Catálogo operacional de relatórios — R05-018

Este catálogo transforma o inventário Vetus em contratos verificáveis para os 19 IDs atualmente expostos por `ReportsService`. A definição de apresentação continua em [`packages/modules/reports/src/index.ts`](../packages/modules/reports/src/index.ts); os campos de fonte, temporalidade, volume, total e amostra ficam registrados em [`report-catalog-contract.ts`](../packages/modules/reports/src/report-catalog-contract.ts). A matriz não declara homologação externa.

A data de entrada é uma data civil `YYYY-MM-DD` interpretada em UTC e inclui o dia inteiro. Fontes com timestamp devem consultar o intervalo semiaberto `[00:00:00Z, dia seguinte 00:00:00Z)`. Relatórios de período usam interseção (`periodEnd >= dateFrom` e `periodStart <= dateTo`). O limite de exportação é 10.000 linhas; a fonte deve ler no máximo 10.001 para falhar explicitamente em excesso. Totais vêm da fonte persistida e valores monetários são arredondados a centavos no servidor. JSON e CSV são UTF-8; CSV recebe BOM e neutraliza valores que possam ser interpretados como fórmula.

| ID | Família Vetus | Campos publicados | Fonte autoritativa | Campo/data | Total e volume | Amostra esperada | Estado local |
|---|---|---|---|---|---|---|---|
| `administrative-executive` | executivo/financeiro | `domain`, `metric`, `value`, `status` | dashboard + caixa em `buildReportRows` | snapshot atual; sem período | 4 KPIs; 10.000 | 4 KPIs de conta semeada | **PARTIAL** — filtro temporal catalogado, mas projeção é snapshot |
| `commission-calculations` | equipe/comissões | `number`, `period`, `status`, `totalBaseAmount`, `totalCommissionAmount`, `lineCount` | `DatabaseCommissionCalculationsReportSource` compartilhada pela API persistente e pelo worker | `periodStart/periodEnd`, interseção inclusiva | totais persistidos; 10.000 | 1 cálculo com 1 linha | **PARTIAL** — paridade local de consulta/CSV/worker testada; reconciliação da amostra de negócio e aceite independente pendentes |
| `scheduling-appointments` | agenda | 13 campos, incluindo `appointmentId`, `scheduledAt`, status, paciente, tutor e profissional | `SchedulingService.listPersistedReportRows` | `scheduledAt`, dia UTC | 1 linha/agendamento; 10.000 | 1 agenda normal + 1 na meia-noite | **IMPLEMENTED** |
| `scheduling-professional-care` | atendimento por profissional | `professional`, `scheduled`, `completed`, `checkedIn`, `cancelled`, `services` | agregação persistida de agenda | `scheduledAt`, dia UTC | 1 agregado/profissional; 10.000 | 1 profissional com contagens conciliáveis | **PARTIAL** — aceite de negócio Vetus pendente |
| `financial-payables` | financeiro/contas pagas | fornecedor, descrição, categoria, emissão, vencimento, totais, status, método, reconciliação | `DatabaseFinancialPayablesRepository` | `dueAt`, dia UTC | totais por título; 10.000 | aberto, parcial e pago | **IMPLEMENTED** |
| `financial-receivables` | financeiro/contas recebidas | paciente, tutor, parcela, emissão, vencimento, liquidação, valores, status, pagamentos | `DatabaseFinancialReceivablesReportSource`/`EncounterFinancialService` | liquidação, vencimento ou emissão conforme status | valores por parcela; 10.000 | aberto + liquidado com `paymentCount` | **IMPLEMENTED** |
| `financial-cheques` | financeiro/meios | pagamento, comanda, status, referência, valor, parcelas, registro, notas | pagamentos persistidos de `CounterSalesService` | `recordedAt`, dia UTC | valor por pagamento; 10.000 | 1 cheque com referência | **IMPLEMENTED** |
| `fiscal-service-invoices` | personalizado/NFS-e | documento, competência, cliente, serviços, impostos, total, status | `DatabaseFiscalRepository`/`FiscalService` | `competencia`, dia UTC | totais fiscais persistidos; 10.000 | 1 documento + 1 serviço | **PARTIAL** — município/sandbox externo pendente |
| `financial-advance-payments` | financeiro/antecipados | pagamento, cliente, documento, emissão, original, compensado, saldo, origem, status | `DatabaseAdvancePaymentsReportSource` (`advance_payments` + allocations) | `issuedAt`, dia UTC | saldo derivado das alocações; 10.000 | disponível + compensado | **IMPLEMENTED** |
| `commercial-deleted-sales` | comercial/snapshot de cancelamento | número, status, tutor, abertura, atualização, total, desconto, pago, saldo, notas | `DatabaseCounterSalesRepository.listPersisted(status=cancelled)` | `createdAt` da abertura, dia UTC | snapshot atual da comanda; 10.000 | 1 venda cancelada | **IMPLEMENTED** |
| `commercial-cancellation-history` | comercial/auditoria | número, cancelamento, autor, motivo, totais, tutor, IDs de venda/evento/correlação | `audit_events.after_json` via `listCancellationReportRows` | `cancelledAt`/`occurred_at`, dia UTC | snapshot imutável; 10.000 | 1 evento com autor, motivo e snapshot | **IMPLEMENTED** |
| `inventory-products` | estoque/produtos | SKU, nome, unidade, saldo, mínimo, custo, cadastro/atualização | `InventoryService.listPersistedItems` | `createdAt`, dia UTC | 1 posição/produto; 10.000 | produto com saldo e mínimo | **IMPLEMENTED** |
| `inventory-invoices` | estoque/entradas | compra, NF informada, fornecedor, status, comprado, recebido, payable, usuários, datas | `ProcurementService.listPersistedPurchaseReportRows` | `createdAt`, dia UTC | valores de compra/recebimento; 10.000 | compra com referência de NF | **IMPLEMENTED** |
| `inventory-stock` | estoque/posição | SKU, saldo, mínimo, custo, `stockValue`, reposição, datas | `InventoryService.listPersistedItems` | posição atual; `createdAt` para filtro | `stockValue = saldo × custo`; 10.000 | produto com `stockValue` conciliado | **PARTIAL** — não representa estoque histórico na data |
| `inventory-movements` | estoque/movimentos | movimento, data, tipo, SKU, variação, saldos antes/depois, custo, motivo, referência, usuário | `InventoryService.listPersistedStockMovementReportRows` | `occurredAt`/`movement.createdAt`, dia UTC | ledger por movimento; 10.000 | entrada + saída com saldos contíguos | **IMPLEMENTED** |
| `registration-owners` | cadastros/clientes | documento, nome, contato, cidade, responsável financeiro, status, cadastro | `OwnersService.list` com conta | `createdAt`, dia UTC | 1 linha/cliente; 10.000 | cliente com contato primário | **IMPLEMENTED** |
| `registration-patients` | cadastros/animais | código, nome, espécie, raça, sexo, microchip, status, cadastro | `PatientsService.list` com conta | `createdAt`, dia UTC | 1 linha/animal; 10.000 | animal com espécie/status | **IMPLEMENTED** |
| `registration-services` | cadastros/serviços | código, nome, descrição, preço base, status, cadastro | `ServicesService.list` com banco | `createdAt`, dia UTC | 1 linha/serviço; 10.000 | serviço ativo com preço | **IMPLEMENTED** |
| `registration-suppliers` | cadastros/fornecedores | código, nome, tipo, categoria, centro de custo, descrição, datas | `FinanceCatalogReportSource` | `createdAt`, dia UTC | 1 linha/item de catálogo; 10.000 | fornecedor + item de despesa | **PARTIAL** — paridade do mestre de fornecedores está em R05-026 |

## Subtarefas novas antes de R05-020

O guia Vetus também exige datasets que não são IDs expostos hoje. Eles ficam separados do catálogo executável para que uma fonte parcial não pareça uma implementação pronta. Produto deve aprovar o escopo e o exemplo antes de cada subtarefa:

| Chave proposta | Família | Fonte a confirmar | Aceite mínimo para abrir implementação |
|---|---|---|---|
| `commercial-sales-history` | vendas | vendas, itens, pagamentos e cancelamentos persistidos | linhas, descontos, impostos, formas de pagamento e total reconciliados com uma venda Vetus |
| `commercial-production` | produção | itens/ordens de produção; fonte atual ainda não identificada | fluxo e unidade de produção definidos, com amostra de entrada/saída |
| `financial-cash-flow` | fluxo de caixa | caixa, razão, recebíveis e pagamentos | saldo inicial, entradas, saídas e saldo final fecham em centavos |
| `financial-banks-payment-methods` | bancos/meios/máquinas | liquidações, adquirência e split; fonte de settlement a confirmar | cada recebimento liga método, conta, taxa, parcela e liquidação |
| `financial-custom-report` | personalizado | consulta limitada a fontes autorizadas | campos, filtros, total, limite, permissão e amostra aprovados por Produto/FIN |

Essas chaves são backlog de descoberta; não são rotas nem definições disponíveis até passarem pela revisão de fonte e amostra. A implementação de R05-020 deve criar uma tarefa por chave, reutilizar as fontes aprovadas e registrar o resultado de reconciliação no mesmo ambiente e SHA.

## Verificação do contrato

O teste [`report-catalog-contract.test.ts`](../packages/modules/reports/src/report-catalog-contract.test.ts) exige exatamente um contrato para cada definição exposta, limite e campos de evidência preenchidos, e verifica que estados `PARTIAL` têm uma lacuna explícita. O inventário estruturado gerado a partir do mesmo módulo fica em `r05-018-catalog.json` (histórico arquivado: `legado/artifacts/consolidacao-2026-09-05/r05-reports-finance/r05-018-catalog.json`).
