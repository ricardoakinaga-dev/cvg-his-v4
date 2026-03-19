# CVG-HIS — R3.2 Billing shape

Data: 2026-03-17

## Objetivo
Definir o shape mínimo do domínio de billing clínico vinculado ao encounter.

## Decisão
O R3.2 não vai começar por fatura, caixa ou contas a receber completas.
Vai começar por um objeto central: **billing item do encounter**.

## Entidade principal
`encounter_billing_items`

Cada registro representa um item faturável lançado dentro de um atendimento.

## Campos mínimos
- `id`
- `accountId`
- `encounterId`
- `itemType` → `service | product`
- `catalogItemId` → id do serviço ou produto
- `nameSnapshot` → nome no momento do lançamento
- `codeSnapshot` → código no momento do lançamento
- `unitPrice`
- `quantity`
- `lineTotal`
- `notes`
- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

## Regras mínimas
- item sempre pertence a um `encounter`
- item sempre pertence a um `accountId`
- `lineTotal = unitPrice * quantity`
- snapshot de nome/código evita perda histórica se catálogo mudar depois
- `catalogItemId` referencia o item original quando existir
- itens podem ser listados por encounter
- itens podem ser criados, editados e removidos

## Fora de escopo neste passo
- contas a receber completas
- fechamento financeiro do encounter
- caixa/gaveta
- desconto avançado
- imposto/fiscal
- pacote comercial
- vínculo automático com estoque

## Impacto no frontend
A tela de `encounter/[id]` vai ganhar um bloco de cobrança com:
- lista de itens lançados
- adicionar serviço/produto
- editar quantidade/preço/nota
- remover item
- visualizar subtotal

## Próximo passo técnico
1. schema + migration
2. contract
3. repo/service/routes
4. testes backend
5. encaixe no frontend do encounter
