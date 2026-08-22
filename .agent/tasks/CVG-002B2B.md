# CVG-002B2B — Inbound PIX sintético e aplicação durável no núcleo B1

## Estado do contrato

- Status: `TODO`; contrato pré-gate consolidado, sem autorização de implementação.
- Estágio/atividade: `BUILD` / `PLAN`.
- Pai: `CVG-002`; depende de `CVG-002B2A` `DONE/VERIFIED` e do núcleo `CVG-002B1` verificado.
- Tier/risco/raio: `T4_CRITICAL` / risco residual esperado `HIGH` / `CROSS_SYSTEM`.
- Próximo gate: `IMPLEMENTATION_READY` específico para `CVG-002B2B`.
- Autoridade pretendida: código reversível no repositório, PostgreSQL descartável e provider sintético local. Provider real, credenciais, mutação externa, produção, deploy e release continuam proibidos.

Este arquivo consolida o mapeamento do código e as revisões independentes de arquitetura, segurança e TDD executadas em 22 de agosto de 2026. Ele é uma especificação pré-gate, não evidência de comportamento entregue.

## Problema e dependências bloqueantes identificadas

1. O B1 está em `apps/api`, portanto o worker não pode importá-lo sem violar a fronteira entre aplicações. O mesmo núcleo deve ser extraído para `packages/modules/pix`, mantendo reexports de compatibilidade na API.
2. A migration `0110` impede alterar `billing_records.status` enquanto `active_payment_attempt_id` estiver preenchido. O B1 compartilhado precisa possuir o staging, tornar a tentativa B2a terminal e liberar a reserva dentro da mesma tenant UoW, depois de bloquear billing e antes de alterar seu status.
3. O event bus genérico não é uma fila segura para este recorte: o worker não registra os consumers do manifesto, a entrega não é roteada por tipo antes do claim e o guard usa o ator textual `system:event-bus`, incompatível com o UUID/FK exigido pelo B1.
4. `users` não distingue identidade humana de serviço e usuários ativos podem entrar por username. O settlement assíncrono precisa de principal não interativo, tenant-scoped e purpose-scoped.
5. O callback pode chegar depois do sucesso externo e antes da persistência local do PIX/correlação do dispatch. O attempt B2a já foi commitado antes da rede e pode ser referenciado por FK composta; o ingresso não pode depender da existência imediata do PIX.
6. A confirmação manual e `PaymentsEventHandlers` legados liquidam fora do B1 e podem fabricar PIX de valor zero. Tentativas B2 não podem alcançar esse caminho.
7. O helper HTTP atual decodifica/parsa JSON e aceita 1 MiB. Ele não preserva os bytes assinados nem satisfaz o limite de 64 KiB.

## Fronteira de protocolo sintético

Endpoint local proposto:

```text
POST /webhooks/pix/synthetic/v1
Content-Type: application/json
x-cvg-pix-key-id: <ASCII opaco allowlisted>
x-cvg-pix-timestamp: <Unix seconds decimal>
x-cvg-pix-event-id: <ASCII opaco allowlisted>
x-cvg-pix-signature: v1=<64 lowercase hex>
```

Mensagem assinada, sem reserialização:

```text
ASCII("v1.<timestamp>.<eventId>.") || rawBodyBuffer
```

- HMAC-SHA-256 com digest fixo de 32 bytes.
- Comparação constante com `timingSafeEqual`; material malformado usa um digest sentinela do mesmo tamanho e ainda percorre uma comparação.
- `keyId` aceita apenas ASCII `[A-Za-z0-9_-]{8,128}`; `eventId` aceita `[A-Za-z0-9][A-Za-z0-9._:-]{0,254}`.
- `timestamp` usa exatamente 10 dígitos decimais Unix em segundos, sem sinal/espaço; janela inclusiva `now - 300 <= timestamp <= now + 300`; `±301s` e milissegundos falham.
- Key ID ausente, malformado ou desconhecido usa uma credencial sentinela de 32 bytes, executa o mesmo HMAC e uma comparação 32/32 e retorna o mesmo `401`, sem lookup tenant/DB.
- O corpo real é limitado durante streaming a 65.536 bytes inclusive, mesmo sem `Content-Length` ou com valor enganoso.
- Rejeitar headers críticos duplicados/arrays, `Content-Encoding` diferente de `identity`, stream abortado, BOM e UTF-8 inválido.
- Autenticar HMAC e freshness antes de decodificar, parsear, consultar deduplicação, abrir contexto tenant ou escrever.
- `keyId` resolve por uma keyring injetada exatamente `{ accountId, secret }`; somente HMAC válido torna `accountId` autoridade. Query, path, bearer, `x-account-id` e corpo não escolhem tenant.
- Capability sintética explícita; segredo com pelo menos 32 bytes; rota não montada e bootstrap fail-closed em `NODE_ENV=production`.
- Nenhum raw body, assinatura, segredo, QR ou payload completo é persistido ou logado.

Corpo JSON autenticado, fechado e allowlisted:

```json
{
  "type": "pix.payment.confirmed.v1",
  "accountId": "uuid",
  "attemptId": "uuid",
  "providerTransactionId": "string",
  "amountCents": 12345,
  "currency": "BRL",
  "confirmedAt": "2026-08-22T12:34:56.789Z"
}
```

Após autenticar, `accountId` do corpo deve coincidir com a conta ligada à chave. `billingRecordId`, transaction local, valor autoritativo e vínculos são sempre recarregados do PostgreSQL sob RLS.

Respostas externas:

- `202` para primeiro ingresso persistido e replay byte-idêntico autenticado;
- `401` uniforme para autenticação/freshness inválida;
- `400` para JSON/schema inválido depois da autenticação;
- `413` para excesso real de bytes;
- `429` para rate limit pré-autenticação;
- `404/409` opaco para alvo/conflito, sem revelar existência cross-tenant.

## Persistência expand-only proposta para `0111`

### `pix_provider_events`

Receipt append-only com:

- IDs `id`, `account_id`, `provider='local-pix'`, `provider_event_id` e `event_type`;
- alegações normalizadas `payment_attempt_id`, `provider_transaction_id`, `amount_cents`, `currency`, `confirmed_at`;
- `body_fingerprint` SHA-256 domain-separated do raw body autenticado, `received_at` e `correlation_id`;
- unicidade `(account_id, provider, provider_event_id)`;
- FK composta `(account_id, payment_attempt_id)` para o attempt já commitado antes da rede;
- `ENABLE/FORCE RLS`, grants mínimos e trigger que rejeita `UPDATE`/`DELETE`;
- nenhuma FK imediata para PIX, porque o callback pode anteceder o commit da correlação externa;
- nenhuma coluna para raw body, assinatura, headers, secret, QR, payload completo ou erro bruto.

Não existe unicidade “first event wins” por attempt. Eventos autenticados com IDs distintos permanecem como receipts forenses separados. Sob lock do attempt, o B1 aplica o primeiro evento semanticamente válido; evento posterior equivalente termina `applied` com código sanitizado de duplicata canônica e zero novo efeito, enquanto divergência vai a `reconciliation_required`. Assim um evento autenticado porém semanticamente inválido não bloqueia uma correção posterior.

### `pix_provider_event_deliveries`

Fila operacional separada, relação 1:1 com o receipt:

- estados `pending | processing | applied | reconciliation_required`;
- `attempts`, `max_attempts`, `next_attempt_at`;
- `lease_owner`, `lease_token`, `lease_version`, `lease_expires_at` com invariantes all-or-none;
- código de erro sanitizado, sem mensagem externa bruta;
- `ENABLE/FORCE RLS` e claim por `FOR UPDATE SKIP LOCKED` com fencing.

Receipt e delivery são criados na mesma transação. Replay idêntico retorna o receipt existente e não cria trabalho; mesmo ID com fingerprint divergente retorna conflito sem mutação.

### Identidade de serviço

- adicionar a `users` `principal_kind` (`human` default, `service`) e `interactive_login_enabled` (`true` default);
- constraint exige que `service` tenha `interactive_login_enabled=false`;
- toda resolução de login por username/email/caches deve aceitar apenas principal humano, ativo e interativo;
- criar `account_service_principals(account_id, purpose, user_id, is_active, ...)` com `purpose='pix-settlement'`, FK composta para `users(account_id,id)`, unicidade de mapping ativo e FORCE RLS;
- resolver e revalidar mapping, usuário ativo, tipo `service`, login desabilitado e mesmo tenant dentro da UoW;
- migration não cria usuário/mapping e não escolhe requester, primeiro usuário ativo, account UUID ou variável de ambiente como fallback.

## Fluxo durável e transação financeira

```text
HTTP autenticado
  -> transação curta: receipt append-only + delivery pending
  -> ACK 202 somente após commit
  -> worker claim curto com lease/fence e commit
  -> TenantUnitOfWork da conta autenticada
       -> lê receipt e fence sem lock financeiro; resolve/revalida service principal
       -> chama exclusivamente o B1 compartilhado estendido com as claims do receipt
       -> B1 reivindica inbox/idempotência
       -> B1 identifica billing por relações imutáveis e bloqueia billing
       -> B1 bloqueia PIX e depois attempt; revalida tenant/provider/valor/estado
       -> B1: PIX pending -> completed
       -> B1: attempt awaiting_confirmation -> confirmed_pending_apply -> settled
       -> trigger limpa active_payment_attempt_id enquanto billing já está bloqueado
       -> B1 atualiza billing e grava settlement/prova/journal/payment/audit/outbox
       -> consumer faz CAS delivery processing -> applied sob o mesmo fence
       -> CAS zero lança e reverte toda a UoW
  -> commit único
```

- O consumer não atualiza PIX, attempt ou billing antes de chamar B1. O B1 compartilhado é o único dono do staging, da terminalização da tentativa e dos efeitos financeiros.
- Não existe estado financeiro intermediário visível: staging B1, terminalização da tentativa, settlement e `delivery=applied` commitam ou revertem juntos.
- O callback nunca liquida e nunca bloqueia billing; ele apenas persiste receipt+delivery.
- Ausência temporária de attempt/PIX é retry com backoff, pois o callback pode chegar antes do outbound local.
- O mapping/usuário de serviço é revalidado sob a UoW e protegido contra revogação concorrente antes dos locks financeiros; principal ausente/revogado/inválido falha fechado e permanece observável/retryable.
- Dois workers não duplicam efeito: claim/fence protege a delivery e inbox/idempotência do B1 protege o settlement.
- Ordem de locks: service-principal mapping/user -> inbox/idempotência -> billing -> encounter/contas/recebíveis -> PIX -> attempt -> inserts -> fenced delivery CAS.
- O ingresso/replay HTTP nunca toca PIX ou attempt. No caminho financeiro, nenhum código anterior ao B1 pode bloquear PIX/attempt e a ordem efetiva permanece `billing -> PIX -> attempt`.
- Crash antes do commit deixa delivery recuperável; crash após commit já observa `applied` e o replay B1 canônico.

## Fronteira legada

- Para qualquer PIX ligado a `encounter_payment_attempts`, `/payments/pix/intents/:id/confirm` autentica a API key e retorna `410 LEGACY_PIX_CONFIRMATION_DISABLED` sem chamar gateway nem publicar `payment.pix.confirmed`.
- O consumer B2b não importa nem chama `PaymentsEventHandlers`, `BillingService.settleByRecordId`, adapters de settlement legado ou código dentro de `apps/api`.
- PIX legado sem `payment_attempt_id` permanece compatível e coberto por regressão B1.

## Estratégia de migration e rollout

- `0111` é atômica e expand-only; não remove nem reinterpreta dados existentes.
- Código antigo ignora novas tabelas/colunas. API nova antes do worker apenas acumula receipts; worker novo antes da API fica idle.
- A capability de callback e o job permanecem desabilitados por padrão.
- Depois do primeiro receipt, rollback operacional desabilita capability/worker e preserva receipt/fila; correção é roll-forward, não drop.
- Produção exige gate separado para volume/locks, mixed-version, provisionamento de principals, secret manager, provider real, observabilidade e rollback.

## Contrato RED obrigatório

1. Extensão B1: observação de locks prova `billing -> PIX -> attempt`; o próprio B1 faz PIX `completed`, attempt `confirmed_pending_apply -> settled`, limpa marker antes de atualizar billing e reverte tudo em failpoint posterior; PIX legado continua verde.
2. Extração B1: testes 14/14 permanecem verdes através de `@cvg-his-v2/module-pix`; shims da API só reexportam.
3. HMAC/raw body: vetor conhecido, whitespace/ordem/Unicode, bordas `±300/301`, digest malformado, headers duplicados, limite 65.536/65.537, chunked, length falso, encoding, UTF-8, BOM e abort.
4. Ingress DB: receipt+delivery atômicos, failpoint entre inserts, replay/divergência, 20 callbacks concorrentes, dois IDs para o mesmo attempt sem first-event-wins, callback antes do PIX/correlação local, FK do attempt, RLS, append-only, catálogo e grants.
5. HTTP real: socket/chunks reais, rate limit, status/envelope, zero contexto tenant antes de HMAC, zero settlement no callback e respostas/logs sanitizados.
6. Principal: ausente, humano, interativo, inativo, revogado durante consumo e cross-tenant falham fechado; ativação posterior recupera retry.
7. Worker: consumer não faz staging fora do B1; dois pools/workers, lease expiry/takeover, stale fence, dois eventos distintos equivalentes/divergentes, restart após receipt commit e crash após B1 antes do retorno produzem um settlement e uma completion canônica.
8. Rollback: failpoint após cada escrita do B1 e antes/depois do fenced delivery CAS deixa somente receipt+delivery retryable e nenhum efeito financeiro parcial.
9. Legacy/boundaries: B2 não liquida por `/confirm`, event bus genérico, consumer legado ou import cross-app.
10. Regressão/qualidade: B1, B2a, cash, outbox, API, worker, RLS, OpenAPI, typecheck, lint, coverage global >=80%, coverage dos seams críticos, secret/dependency scans e crítica independente.

Arquivos RED previstos:

- `tests/unit/api/pix-provider-webhook-verifier.test.ts`
- `tests/unit/api/raw-request-body.test.ts`
- `apps/api/src/routes/pix-provider-webhook-routes.test.ts`
- `tests/integration/pix-provider-webhook-http.test.ts`
- `tests/integration/database/pix-provider-event-ingress.test.ts`
- `tests/integration/database/confirmed-pix-settlement-command.test.ts` (extensão)
- `tests/unit/worker/pix-provider-settlement-consumer.test.ts`
- `tests/integration/database/pix-provider-settlement-consumer.test.ts`
- `tests/integration/pix-provider-webhook-settlement-e2e.test.ts`
- `tests/unit/architecture/pix-b2b-boundaries.test.ts`

## Ordem de implementação após o gate

1. Executar baseline B1/B2a e registrar o primeiro RED de tentativa reservada.
2. Extrair o mesmo B1 para `packages/modules/pix`, com shims e regressão verde.
3. Escrever/rodar REDs de verifier/raw body.
4. Escrever/rodar REDs de migration/RLS/receipt/delivery/principal e implementar `0111`.
5. Implementar ingresso/rota/composição/OpenAPI somente após seus REDs.
6. Escrever/rodar REDs do consumer e implementar claim, principal, chamada única ao B1 estendido e fenced completion na mesma UoW; o consumer não possui staging financeiro.
7. Rodar restart/concurrency multi-pool e harness de known-bad.
8. Executar regressões, cobertura, segurança e crítica independente; somente então produzir `VERIFIED`.

## Ownership previsto

- Extração/extensão B1: `packages/modules/pix/src/confirmed-settlement/*`, package exports/dependencies, shims da API e regressão B1. Um único writer possui esta etapa.
- Dados: `packages/db/migrations/0111_*`, schemas/exports, runtime grants e testes PostgreSQL/RLS.
- Inbound API: raw reader, keyring/verifier, repository/command de receipt, rota, composition root, rate limit, OpenAPI e bloqueio legado.
- Worker: repository de delivery, claim/fence/backoff, consumer B1, bootstrap/runner/health/metrics e testes.
- Integração: HTTP real, restart/concurrency multi-pool, boundary harness, cobertura, segurança e crítica independente.

O worker depende da extração B1 integrada; inbound puro e migration RED podem avançar em paralelo somente com ownership de arquivos disjunto.

## Fontes oficiais que sustentam o desenho

- Stripe, raw body e assinatura: <https://docs.stripe.com/webhooks/signature?lang=node>
- Stripe, replay/duplicatas/ordem/async: <https://docs.stripe.com/webhooks?lang=node>
- Adyen, persistir antes do ACK: <https://docs.adyen.com/development-resources/webhooks/handle-webhook-events/>
- Node.js `timingSafeEqual`: <https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b>
- PostgreSQL unique constraints: <https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS>
- PostgreSQL `ON CONFLICT`: <https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT>
- PostgreSQL `SKIP LOCKED`: <https://www.postgresql.org/docs/current/sql-select.html>
- PostgreSQL RLS: <https://www.postgresql.org/docs/17/ddl-rowsecurity.html>
- Pagar.me, visão atual de webhooks: <https://docs.pagar.me/reference/vis%C3%A3o-geral-sobre-webhooks>

A documentação atual da Pagar.me consultada não congela um contrato V5 completo de assinatura/freshness. As páginas HMAC-SHA1 encontradas são legadas V2/V4. Portanto `local-pix` continua estritamente sintético e nenhum mecanismo de assinatura real Pagar.me é inferido neste recorte.

## Critérios do gate pendente

- `IR-001`: limites B2b/B2c/provider real/produção, owners e dependências são explícitos.
- `IR-002`: protocolo, autoridade tenant, schemas, principal, estados, atomicidade, locks, retries, migration, rollback e fronteira legada estão congelados.
- `IR-003`: REDs executáveis cobrem raw bytes, replay divergente, dois tenants, callback antes do outbound, dois callbacks/workers, ambos os limites de restart, rollback por escrita, principal revogado, produção fail-closed, RLS, regressões, cobertura e revisão independente.

Decisão atual: `NO-GO` para implementação até existir `.agent/gates/implementation-ready-CVG-002B2b.json` revisado de forma independente e, por risco `HIGH`, uma autoridade explícita limitada ao recorte sintético/reversível.
