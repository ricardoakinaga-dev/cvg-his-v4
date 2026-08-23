# CVG-002B2B — PIX settlement DLQ operator slice

**Data:** 23 de agosto de 2026
**Estado:** implementado e verificado localmente; aguardando publicação do
commit antes de qualquer promoção de gate
**Escopo:** somente a fila terminal `pix_provider_event_deliveries` em
`reconciliation_required`

## Contrato entregue

- `GET /internal/pix-settlement/deliveries?state=reconciliation_required&limit=N`
  exige `audit.read`, limita `N` a 1–100, aplica o `account_id` do principal e
  retorna apenas campos operacionais allowlisted.
- `POST /internal/pix-settlement/deliveries/:deliveryId/redrive` exige
  `audit.write`, valida UUID/eventId/razão, e retorna `202` somente quando a
  função durável aceitou a transição. Ausência, cross-tenant, `eventId`
  divergente ou estado não terminal retornam `404` opaco com o mesmo
  `correlationId` da requisição; indisponibilidade durável retorna `503` com o
  envelope de erro OpenAPI completo.
- Sem repositório PostgreSQL pronto, a superfície retorna `503`; não há
  fallback em memória.

## Persistência e segurança

- Migration `0114_pix_settlement_dlq_operator.sql` cria a capability
  `cvg_pix_dlq_operator` (`NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS`) e a função
  `app.redrive_pix_provider_event_delivery(uuid,uuid,uuid,text,text)`.
- A função é `SECURITY DEFINER`, usa `search_path` fixo, verifica actor ativo no
  tenant corrente, atualiza somente a delivery terminal, reseta tentativas/
  lease/erro e grava `pix_settlement_redrive` na auditoria na mesma transação.
- A API não recebe `UPDATE` direto da tabela; reconciler, bootstrap shell e
  Helm preservam `SELECT/INSERT` API, `SELECT/UPDATE` worker e `EXECUTE` da
  função somente para a API.
- Recibos, attempts, recebíveis, diário e outbox não são alterados pelo
  redrive.

## Observabilidade e operação

- Alerta `CVG_HIS_PIX_Settlement_ReconciliationRequired` usa o gauge agregado
  atual `worker_pix_provider_settlement_reconciliation_required`, preenchido
  por contagens PostgreSQL tenant-scoped a cada 15s. O contador
  `worker_pix_provider_settlement_reconciliation_required_total` fica como
  sinal histórico de novas promoções, não como fonte do alerta.
- Painel Grafana **PIX Settlement DLQ (current)** foi adicionado ao dashboard
  API.
- Procedimento operacional: [`docs/runbooks/pix-settlement-dlq.md`](../../docs/runbooks/pix-settlement-dlq.md).

## Evidência executada

| Verificação | Resultado |
| --- | ---: |
| Route unit (authz, sanitização, validação, 404 opaco, fail-closed) | 4/4 |
| PostgreSQL DLQ repository/function/atomic audit/cross-tenant/ACL | 3/3 |
| Runtime role grant contract | 9/9 |
| Worker current-backlog gauge + durable count 1→0 after redrive | PASS |
| API build | PASS |
| DB build | PASS |
| OpenAPI | 337 paths / 390 schemas |
| Helm static validation | PASS |
| Prometheus/OpenAPI YAML + Grafana JSON parse | PASS |
| Shell syntax + `git diff --check` | PASS |

## Limitações mantidas

- O gauge é atualizado pelo worker em intervalo de 15s; uma falha de refresh
  é registrada e conserva o último valor conhecido até a próxima tentativa.
- A prova de backlog é agregada entre as contas conhecidas pelo worker e não
  expõe labels de tenant; a lista operacional continua tenant-scoped.
- Não prova provedor PIX real, SIGKILL/restart de processo, política de
  rate-limit multi-réplica, SPA, paridade Vetus, WCAG, deploy/restore ou
  release.
- `CVG-002B2B`, `CVG-002` e o ERP geral continuam `IN_PROGRESS/PARTIAL`.
