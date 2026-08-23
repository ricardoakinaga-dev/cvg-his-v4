# Runbook — PIX settlement DLQ

## Objetivo

Fechar operacionalmente o estado `reconciliation_required` da entrega PIX sem
alterar diretamente recibos, recebíveis, lançamentos contábeis ou outros
artefatos financeiros. A fila é tenant-scoped e só pode ser operada por um
principal autenticado com `audit.read`/`audit.write`.

## Sinal de acionamento

- Alerta Prometheus: `CVG_HIS_PIX_Settlement_ReconciliationRequired`
- Métrica de estado atual: `worker_pix_provider_settlement_reconciliation_required`
- Métrica de promoções: `worker_pix_provider_settlement_reconciliation_required_total{failure_class="terminal"}`
- Dashboard: painel **PIX Settlement DLQ (current)** em
  `infra/observability/grafana/cvg-his-v2-api-dashboard.json`

O gauge representa o backlog durável atual agregado pelo worker, sem labels de
tenant. O contador é monotônico por processo e serve apenas para investigar
novas promoções; não use esse contador sozinho para decidir que a fila está
vazia.

## Procedimento seguro

1. Confirme o tenant e o `x-correlation-id` da ocorrência. Não copie payloads
   brutos, fingerprints ou credenciais para tickets.
2. Liste somente a fila terminal:

   ```bash
   curl -sS -H "Authorization: Bearer $TOKEN" \
     "$API/internal/pix-settlement/deliveries?state=reconciliation_required&limit=100"
   ```

3. Verifique no backoffice/relatório financeiro se o pagamento já foi
   aplicado. Uma entrega `applied` ou `pending` não deve ser redrivenada.
4. Para uma entrega terminal cuja causa foi corrigida, envie apenas o
   `eventId` correspondente e uma justificativa curta:

   ```bash
   curl -sS -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     "$API/internal/pix-settlement/deliveries/$DELIVERY_ID/redrive" \
     -d '{"eventId":"'$EVENT_ID'","reason":"causa corrigida e conferida no financeiro"}'
   ```

   O retorno `202` apenas agenda a entrega. A transição reseta tentativas,
   limpa lease/erro e grava `pix_settlement_redrive` na auditoria na mesma
   transação. O retorno `404` é intencionalmente opaco para ausência,
   cross-tenant, `eventId` divergente ou estado não terminal.
5. Aguarde o worker e confirme que a entrega saiu da lista terminal. Se ela
   voltar a `reconciliation_required`, pare os redrives e abra a investigação
   do adaptador/provedor; redrive repetitivo não é mecanismo de correção.

## Contenção e recuperação

- **Nunca** conceda `UPDATE` direto da tabela ao usuário da API. A ACL permite
  apenas `SELECT/INSERT` para a API e uma função PostgreSQL de capacidade para
  a transição auditada.
- Se houver suspeita de aplicação financeira duplicada, suspenda novos
  redrives, preserve o `eventId`/correlation ID e compare recibo, pagamento e
  diário antes de qualquer correção.
- Se a superfície retornar `503`, trate como indisponibilidade do runtime
  durável; não faça fallback para estado em memória nem execute SQL manual.

## Evidência esperada

- Resposta sanitizada do `GET` e o `202` do redrive.
- Evento de auditoria `pix_settlement_redrive` com justificativa e correlation
  ID.
- Métrica/alerta resolvidos após o processamento do worker.
- Regressão PostgreSQL em
  `tests/integration/database/pix-provider-settlement-dlq-operator.test.ts`.
