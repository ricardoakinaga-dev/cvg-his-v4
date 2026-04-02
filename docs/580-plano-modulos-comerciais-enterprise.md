# 580 - Plano dos Modulos Comerciais Enterprise

**Status:** vivo
**Data de validacao:** 2026-04-01
**Objetivo:** planejar a inclusao de 4 modulos comerciais integrados ao CVG-HIS V2 sem duplicar o que o sistema ja possui e elevando a trilha para um ERP veterinario enterprise

## 1. Escopo solicitado

Este plano cobre os seguintes modulos:

1. modulo de `Servicos`
2. modulo de `Venda de Balcao / Comanda`
3. modulo de `Produtos`
4. modulo de `Orcamentos`

Tambem cobre:

- integracao com pagamentos
- fechamento de comanda
- parcelamento
- controle de formas de pagamento
- dashboard administrativo comercial
- integracao total com o restante do sistema

## 2. Principio central

Se algo ja existe no sistema, nao deve ser recriado como um segundo sistema paralelo.

A implementacao deve reaproveitar ao maximo o que ja esta presente em:

- schema de banco
- contratos
- modulos de `billing`, `inventory`, `notifications`
- pagina administrativa de `billing`
- dashboard

## 3. O que ja existe hoje e deve ser reaproveitado

## 3.1 Catalogo e precificacao

Ja existem estruturas no repositorio para:

- `products`
  - contrato em `packages/contracts/src/products.ts`
  - schema em `packages/db/src/schema/products.ts`
- `services`
  - contrato em `packages/contracts/src/services.ts`
  - schema em `packages/db/src/schema/services.ts`

### Conclusao

Os modulos de `Produtos` e `Servicos` nao devem nascer do zero. Eles devem ser implementados como modulos canonicos em cima dessas estruturas ja previstas.

## 3.2 Pagamentos e caixa

Ja existem estruturas para:

- `payments`
  - contrato em `packages/contracts/src/payments.ts`
  - schema em `packages/db/src/schema/payments.ts`
- `cash`
  - contrato em `packages/contracts/src/cash.ts`
  - schema em `packages/db/src/schema/cash.ts`

### Conclusao

O fechamento da comanda de balcao deve reaproveitar essa base, em vez de criar um fluxo de pagamento paralelo.

## 3.3 Billing e financeiro

Ja existem estruturas para:

- itens faturaveis por atendimento
  - `packages/contracts/src/encounterBilling.ts`
  - `packages/db/src/schema/encounter_billing_items.ts`
- contas financeiras e recebiveis de atendimento
  - `packages/contracts/src/encounterFinancial.ts`
  - `packages/db/src/schema/encounter_financial_accounts.ts`

### Conclusao

O fluxo comercial de balcao deve compartilhar linguagem financeira com o modulo assistencial, mas nao deve forcar o uso de `encounter` quando a venda nao for clinica.

## 3.4 Estoque e consumo

Ja existe:

- `packages/modules/inventory`
- pagina `apps/web/src/pages/inventory.ts`

### Conclusao

Venda de produtos no balcao deve baixar estoque a partir do modulo de inventory, com evento e rastreabilidade.

## 4. Decisao de arquitetura

## 4.1 O que nao fazer

- nao transformar `billing de encounter` em substituto da venda de balcao
- nao criar uma segunda tabela de produtos se `products` ja existe
- nao criar uma segunda tabela de servicos se `services` ja existe
- nao criar um sistema proprio de pagamentos fora de `payments` e `cash`
- nao misturar fechamento clinico de encounter com fechamento comercial de comanda de balcao

## 4.2 O que fazer

Criar uma trilha comercial integrada composta por:

- `catalog-products`
- `catalog-services`
- `counter-sales`
- `quotes`

Esses modulos devem conversar com:

- `billing`
- `inventory`
- `notifications`
- `users`
- `access-control`
- `audit`
- `payments`
- `cash`

## 5. Desenho dos 4 modulos

## 5.1 Modulo de Servicos

### Objetivo

Permitir cadastro, consulta, ativacao/inativacao e precificacao de servicos administrativos e comerciais.

### Reuso obrigatorio

- `packages/contracts/src/services.ts`
- `packages/db/src/schema/services.ts`

### Capacidades

- cadastrar servico
- editar descricao, codigo e preco
- ativar/inativar servico
- pesquisar servico
- selecionar servico em:
  - comanda de balcao
  - orcamento
  - eventualmente billing clinico, quando aplicavel

### Entrega enterprise

- servico com codigo unico por conta
- historico de alteracao relevante via auditoria
- bloqueio de remocao fisica
- uso por snapshot em venda e orcamento

## 5.2 Modulo de Produtos

### Objetivo

Permitir cadastro administrativo de produtos vendaveis e integracao com estoque e balcao.

### Reuso obrigatorio

- `packages/contracts/src/products.ts`
- `packages/db/src/schema/products.ts`
- `packages/modules/inventory`

### Capacidades

- cadastrar produto
- editar descricao, codigo e preco
- ativar/inativar produto
- relacionar produto vendavel ao item de estoque quando aplicavel
- selecionar produto em:
  - comanda de balcao
  - orcamento

### Entrega enterprise

- codigo unico por conta
- preco base
- integracao com estoque
- snapshot de nome/codigo/preco no momento da venda

## 5.3 Modulo de Venda de Balcao / Comanda

### Objetivo

Permitir abrir uma comanda comercial para um cliente e conduzir o fluxo completo ate o fechamento financeiro.

### Entidades novas recomendadas

- `counter_sales`
- `counter_sale_items`
- `counter_sale_payments`

### Motivo

O repositorio ja tem financeiro por `encounter`, mas a venda de balcao precisa existir sem obrigar atendimento clinico.

### Capacidades

- abrir comanda
- vincular cliente conhecido ou venda avulsa
- adicionar servicos
- adicionar produtos
- editar quantidades, descontos e observacoes
- calcular subtotal, desconto, total
- registrar pagamentos multiplos
- aceitar:
  - cartao de credito
  - cartao de debito
  - pix
  - dinheiro
  - outros metodos suportados
- parcelar quando metodo permitir
- fechar comanda
- reabrir ou cancelar sob policy adequada

### Integracoes obrigatorias

- `services`
- `products`
- `inventory`
- `payments`
- `cash`
- `users`
- `access-control`
- `audit`

### Entrega enterprise

- fechamento transacional
- baixa de estoque para itens de produto
- snapshot dos itens vendidos
- rastreabilidade de operador
- status da comanda
- consistencia entre recebiveis e pagamentos

## 5.4 Modulo de Orcamentos

### Objetivo

Permitir simular uma venda de produtos e servicos antes da autorizacao do cliente.

### Entidades novas recomendadas

- `quotes`
- `quote_items`
- `quote_versions` ou versionamento equivalente

### Capacidades

- criar orcamento
- adicionar produtos e servicos
- recalcular totais
- salvar rascunho
- gerar documento imprimivel
- exportar PDF
- converter orcamento aprovado em comanda de balcao
- manter snapshot dos itens e precos da proposta

### Integracoes obrigatorias

- `products`
- `services`
- `counter-sales`
- `notifications` opcional para status e follow-up

### Entrega enterprise

- orcamento com numero rastreavel
- validade
- status
- PDF/print
- conversao segura em venda

## 6. Dashboard administrativo comercial

## Objetivo

Criar uma area administrativa no dashboard para acompanhar operacao comercial.

## KPIs minimos

- comandas abertas
- comandas fechadas no dia
- faturamento bruto do dia
- faturamento liquido do dia
- ticket medio
- vendas por forma de pagamento
- vendas por produto
- vendas por servico
- orcamentos emitidos
- orcamentos convertidos

## Fontes de dados

- `counter_sales`
- `counter_sale_items`
- `payments`
- `cash`
- `quotes`

## Entrega enterprise

- filtros por periodo
- cards executivos
- tabela resumida
- blocos de alerta comercial

## 7. Estrategia de integracao harmonica

## Regra 1 - Catalogo unico

Produtos e servicos devem ter catalogos canonicos unicos por conta.

## Regra 2 - Snapshot nos documentos comerciais

Venda e orcamento nao devem depender de leitura futura do catalogo para recompor valor historico.

## Regra 3 - Financeiro compartilhado, contexto separado

`encounterFinancial` continua no contexto clinico.

`counterSales` ganha contexto comercial proprio, mas:

- usa a mesma linguagem de pagamento
- usa os mesmos metodos
- conversa com caixa

## Regra 4 - Estoque integrado

Venda de produto deve refletir estoque. Venda de servico nao baixa estoque, salvo se houver consumo acoplado explicitamente modelado.

## Regra 5 - Conversao de orcamento em venda

Orcamento aprovado deve poder virar comanda sem redigitacao.

## 8. Modulos e arquivos esperados

## 8.1 Modulos canonicos novos ou expandidos

- `packages/modules/products`
- `packages/modules/services`
- `packages/modules/counter-sales`
- `packages/modules/quotes`

## 8.2 Paginas web novas ou expandidas

- `apps/web/src/pages/products.ts`
- `apps/web/src/pages/services.ts`
- `apps/web/src/pages/counter-sales.ts`
- `apps/web/src/pages/quotes.ts`
- expansao de `apps/web/src/pages/dashboard.ts`

## 8.3 API esperada

- `/products`
- `/services`
- `/counter-sales`
- `/counter-sales/:id/items`
- `/counter-sales/:id/payments`
- `/counter-sales/:id/close`
- `/quotes`
- `/quotes/:id/items`
- `/quotes/:id/print`
- `/quotes/:id/pdf`
- `/quotes/:id/convert-to-sale`
- `/admin/dashboard/commercial`

## 8.4 Banco esperado

### Reuso

- `products`
- `services`
- `payments`
- `cash_registers`
- `cash_movements`

### Novas tabelas recomendadas

- `counter_sales`
- `counter_sale_items`
- `counter_sale_payment_allocations` ou tabela equivalente
- `quotes`
- `quote_items`
- `quote_documents` ou estrategia equivalente de arquivo gerado

## 9. Roadmap de implementacao

## Fase C1 - Fundacao comercial ✅ CONCLUIDA

### Entregas

- ✅ fechar modelagem final
- ✅ definir contratos
- ✅ definir schema de venda e orcamento
- ✅ conectar `products` e `services` ao sistema real

### Criterio de pronto

- ✅ contratos definidos
- ✅ schema aprovado
- ✅ docs de arquitetura comercial publicadas

## Fase C2 - Catalogos administrativos ✅ CONCLUIDA

### Entregas

- ✅ modulo `products`
- ✅ modulo `services`
- ✅ telas administrativas
- ✅ API CRUD
- ✅ RBAC comercial (product.read/write, service.read/write)

### Criterio de pronto

- ✅ produto e servico cadastraveis
- ✅ ativacao/inativacao funcionando
- ✅ leitura no frontend funcionando

## Fase C3 - Comanda de balcao ✅ CONCLUIDA

### Entregas

- ✅ abrir comanda
- ✅ adicionar produtos e servicos
- ✅ calcular totais
- ✅ fechar comanda
- ✅ registrar pagamentos
- ✅ cancelar e reabrir comanda
- ✅ pagamentos multiplos
- ✅ parcelamento
- ✅ snapshot de itens
- ✅ tela web completa
- ✅ 18 testes unitarios

### Criterio de pronto

- ✅ venda ponta a ponta funcionando
- ✅ estoque baixando corretamente para produtos (via inventory.consume)
- ✅ pagamentos registrados
- ✅ RBAC atualizado

## Fase C4 - Orcamentos ✅ CONCLUIDA

### Entregas

- ✅ criar orcamento
- ✅ salvar
- ✅ imprimir/PDF (HTML + window.print)
- ✅ converter em comanda
- ✅ aprovar/rejeitar/cancelar
- ✅ tela web completa
- ✅ 17 testes unitarios

### Criterio de pronto

- ✅ orcamento completo
- ✅ documento imprimivel
- ✅ conversao validada

## Fase C5 - Dashboard e hardening ✅ CONCLUIDA

### Entregas

- ✅ baixa automatica de estoque no close da comanda
- ✅ integracao com cash_registers/cash_movements (politica por metodo)
- ✅ dashboard comercial com filtros por periodo
- ✅ graficos leves (barras CSS) por forma de pagamento
- ✅ top produtos e servicos por receita
- ✅ bloco de conversao de orcamentos
- ✅ alertas comerciais (estoque baixo, comandas pendentes, taxa de conversao)
- ✅ endpoint API de relatorios `/admin/commercial-reports/:type`
- ✅ 6 tipos de relatorio (summary, sales, payments, products, services, quotes)
- ✅ auditoria completa (cancel, reopen, approve, reject, cancel quote, convert)
- ✅ 5 novos testes de integracao estoque/caixa
- ✅ 23 testes no counter-sales (era 18)
- ✅ 72 testes no pacote comercial

### Criterio de pronto

- ✅ KPIs comerciais visiveis com filtros
- ✅ perfis de acesso aplicados
- ✅ trilha de auditoria ativa
- ✅ estoque e caixa integrados no close

## Ciclo Comercial Final — Caixa real, UI e PDF ✅ CONCLUIDO

### Entregas

- ✅ modulo `@cvg-his-v2/module-cash` com service + repository DB
- ✅ cashService real no runtime (sem stub)
- ✅ UI de caixa (`/cash-register`): abrir, movimentar, fechar
- ✅ 6 endpoints API de caixa
- ✅ PDF server-side para quotes (`/quotes/:id/pdf`)
- ✅ 15 testes unitarios para cash
- ✅ 87 testes no pacote comercial total
- ✅ Nota comercial: 90/100

### Criterio de pronto

- ✅ Caixa persiste em DB real
- ✅ UI administrativa completa
- ✅ PDF server-side operacional
- ✅ Integracao ponta a ponta: comanda → caixa → DB

## Ciclo Comercial Final — Caixa real, UI e PDF ✅ CONCLUIDO

### Entregas

- ✅ modulo `@cvg-his-v2/module-cash` com service + repository DB
- ✅ cashService real no runtime (sem stub)
- ✅ UI de caixa (`/cash-register`): abrir, movimentar, fechar
- ✅ 6 endpoints API de caixa
- ✅ PDF server-side para quotes (`/quotes/:id/pdf`)
- ✅ 15 testes unitarios para cash
- ✅ 87 testes no pacote comercial total
- ✅ Nota comercial: 90/100

### Criterio de pronto

- ✅ Caixa persiste em DB real
- ✅ UI administrativa completa
- ✅ PDF server-side operacional
- ✅ Integracao ponta a ponta: comanda → caixa → DB

## 10. Metricas de sucesso

| Eixo                                     | Meta                                                |
| ---------------------------------------- | --------------------------------------------------- |
| Reuso de estruturas existentes           | >= 70% do que ja existe em catalogo/financeiro      |
| Duplicidade de conceito                  | 0 conceitos comerciais duplicados sem justificativa |
| Fluxos comerciais ponta a ponta          | 4/4 modulos entregues                               |
| Formas de pagamento suportadas           | 100% das solicitadas                                |
| Conversao orcamento -> comanda           | sim                                                 |
| Baixa de estoque em venda de produto     | sim                                                 |
| Dashboard comercial administrativo       | sim                                                 |
| RBAC por perfil                          | sim                                                 |
| Auditoria de eventos comerciais criticos | sim                                                 |

## 11. Principais riscos

### R1. Misturar contexto clinico e comercial

Mitigacao:

- `encounter billing` continua clinico
- `counter sales` vira contexto comercial proprio

### R2. Criar segundo catalogo de produto/servico

Mitigacao:

- obrigar reuso das tabelas e contratos existentes

### R3. Fechamento financeiro sem consistencia

Mitigacao:

- pagamentos e caixa devem ser integrados desde a primeira versao util

### R4. Dashboard sem fonte de dados madura

Mitigacao:

- dashboard comercial entra depois das entidades principais estarem consolidadas

## 12. Veredito do planejamento

Os 4 modulos podem e devem ser incluidos no sistema sem romper a arquitetura atual.

O caminho enterprise correto nao e criar uma trilha paralela de vendas. O caminho enterprise correto e:

- elevar `products` e `services` de fundacao existente para modulos canonicos
- criar `counter-sales` e `quotes` como novos contextos comerciais
- integrar com `inventory`, `payments`, `cash`, `users`, `access-control`, `audit` e dashboard

Esse desenho entrega um produto mais harmonico, evita retrabalho e sustenta uma operacao comercial veterinaria de nivel enterprise.
