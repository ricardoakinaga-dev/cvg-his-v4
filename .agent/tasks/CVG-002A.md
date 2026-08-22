# CVG-002A — Recebimento em caixa atômico por atendimento

## Contrato

- Status: `COMPLETED` para esta subfatia; `CVG-002` permanece `IN_PROGRESS`
- Estágio/atividade: `BUILD` / `VERIFY`
- Responsável: root integrator, com implementação de schema e revisões independentes
- Origem: `PLAT-001`, `BILL-001/002`, `CASH-001` e `QB-CORE-01`, `QB-SEC-02`, `QB-DATA-01`, `QB-REL-01`
- Base do checkpoint: `30be6b3c8bec7bdc59246e62e0eda0c7ba1721c2`
- Tier/risco/raio: `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`

## Objetivo e resultado

Registrar o recebimento integral em dinheiro de uma cobrança aberta e de um atendimento concluído em uma única transação PostgreSQL. O commit deve criar ou atualizar, de modo consistente e tenant-safe, conta financeira, recebível, pagamento, caixa, movimento, lançamento contábil, recibo append-only, auditoria e outbox. Repetição, corrida, falha, reabertura ou exclusão do atendimento não podem criar caixa fantasma nem apagar prova financeira.

## Invariantes implementadas

- `POST /encounters/:id/cash-receipts` exige `Idempotency-Key`, UUID válido, valor BRL positivo em centavos exatos e corpo estrito.
- A cobrança deve estar exatamente `open`, o atendimento deve estar concluído, o caixa deve estar aberto e o valor deve quitar exatamente o saldo.
- Um recibo append-only referencia somente o pagamento canônico do recebível; não há vínculo com a tabela legada `payments`.
- Débito integral em `1.1.01-caixa` e crédito integral em `3.1.01-receita-clinica` são validados por triggers deferidos.
- FKs compostas, `ENABLE/FORCE RLS` e políticas tenant-safe impedem vazamento e vínculos cross-tenant.
- Fechamento de caixa deriva o saldo sob lock; recebimento, fechamento, reabertura e exclusão usam ordem de locks consistente.
- Reabrir ou excluir atendimento com recibo retorna conflito estável e exige reversão explícita; a rota DELETE aguarda persistência antes do `204`.
- Rotas públicas de liquidação manual e `paidAmount` foram fechadas com `409/MANUAL_SETTLEMENT_DISABLED`.
- A SPA preserva a chave idempotente em retry após perda de resposta e recupera o recibo pela coleção auditada.

## Superfície entregue

- Migration/schema: `0108_encounter_cash_receipts.sql`, recibos, journal, billing, financeiro, caixa e índices/RLS.
- Aplicação: unidade de trabalho tenant-scoped, comando/repositório/rotas de recibo, wiring/readiness, bloqueios de bypass e leitura autoritativa de billing.
- Contratos: schemas Zod, metadata de endpoints, OpenAPI e testes de paridade frontend/backend.
- SPA: drawer de recebimento no atendimento e remoção das ações de liquidação direta nas telas de cobrança.
- Testes: unidade, módulos, rotas, contratos, PostgreSQL/RLS, rollback, replay e corridas recibo×caixa/reopen/delete.

## Verificação executada

| Gate | Resultado |
| --- | --- |
| Revisão independente final | `APPROVE`; zero finding CRITICAL/HIGH/MEDIUM |
| Vertical PostgreSQL/RLS | 35/35 PASS |
| API completa | 304/304 PASS |
| SPA completa | 170 arquivos, 1.001/1.001 PASS |
| Contratos, billing e cash focados | 47/47, 15/15 e 18/18 PASS |
| Typecheck e lint do workspace | 68/68 projetos PASS em ambos |
| Cobertura | 1.519/1.519 PASS; 86,27% linhas, 80,17% branches, 90,31% funções |
| OpenAPI | válido; 331 paths |
| Segurança | `pnpm audit --audit-level high` e `pnpm security:secrets` PASS |

## Limitações honestas e próxima ação

- Esta subfatia prova dinheiro integral no atendimento; não encerra o journey completo agendado/walk-in com estoque, PIX/cartão, todos os modos de falha e E2E de navegador.
- Rotas e integração PostgreSQL real cobrem o comando, mas ainda é desejável um E2E dedicado que atravesse HTTP → UoW → PostgreSQL no mesmo teste.
- `QB-CORE-01` e `QB-REL-01` ficam `PARTIAL`, não `PASS`, até os gates restantes do programa e o journey completo serem executados.
- Próxima ação: completar `CVG-002B` com inventário e métodos não-caixa e acrescentar o E2E HTTP/SPA dedicado.
