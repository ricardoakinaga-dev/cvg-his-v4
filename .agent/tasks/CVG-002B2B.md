# CVG-002B2B — Inbound PIX sintético e aplicação durável no núcleo B1

## Estado do contrato

- Status: `IN_PROGRESS`; contrato consolidado e gate de implementação operacional.
- Estágio/atividade: `BUILD` / `TEST`.
- Pai: `CVG-002`; depende de `CVG-002B2A` `DONE/VERIFIED` e do núcleo `CVG-002B1` verificado.
- Tier/risco/raio: `T4_CRITICAL` / risco residual esperado `HIGH` / `CROSS_SYSTEM`.
- Próximo gate: `VERIFIED` específico para `CVG-002B2B`.
- Gate atual: `.agent/gates/implementation-ready-CVG-002B2B.json#GATE-CVG-002B2B-IR-001` (`PASS`, readiness only).
- Autoridade vigente: código reversível no repositório, PostgreSQL descartável e provider sintético local. Provider real, credenciais, mutação externa, produção, deploy e release continuam proibidos.

Este arquivo consolida o mapeamento do código e as revisões independentes de arquitetura, segurança e TDD executadas em 22 de agosto de 2026. Ele continua sendo o contrato técnico, não evidência de que o B2b inteiro foi entregue. O gate de prontidão passou após duas rejeições corrigidas; cada RED/GREEN posterior ainda exige evidência própria.

## Checkpoint implementado — EVT-0050 / VFY-CVG-002B2B-PARSER-INGRESS-001

O primeiro sub-slice inbound foi implementado e revisado independentemente:

- `apps/api/src/pix-provider-webhook-payload.ts` fecha UTF-8/BOM, JSON estrito, chaves duplicadas, allowlist, UUID/valor/moeda/timestamp e binding de conta;
- `apps/api/src/pix-provider-event-fingerprints.ts` calcula os dois SHA-256 domain-separated usando o corpo bruto e claims canonicalizadas na ordem congelada;
- `packages/db/migrations/0111_pix_provider_event_ingress.sql` e `packages/db/src/schema/pix_provider_event_ingress.ts` criam receipt append-only e delivery operacional com FK composta, RLS/FORCE, checks de estado/lease/agendamento e ACL condicional sem fallback de role obsoleta;
- `apps/api/src/pix-provider-event-ingress-repository.ts` calcula fingerprints internamente, confirma que claims vieram do mesmo raw body, persiste receipt+delivery na mesma transação, faz replay/conflict opaco, traduz target incompatível e protege corridas com savepoints;
- `packages/db/src/reconcile-runtime-roles.ts`, `infra/postgres/init-runtime-role.sh` e o ConfigMap Helm reaplicam a matriz least-privilege depois do CRUD amplo; a suíte cria roles descartáveis, executa duas reconciliações e limpa `DROP OWNED`;
- evidência fresca: unit-focused `77/77`, ingress PostgreSQL `11/11`, regressão B1 `18/18`, regressão B2a `33/33`, lint/build/Prettier/shell/diff e crítica independente `APPROVE` — ver `.agent/verification.jsonl#VFY-CVG-002B2B-PARSER-INGRESS-001`;
- limite explícito: isso não implementa nem prova socket HTTP/ACK/rate-limit, principal de serviço, primitive shared sem idempotência, worker/consumer fenced, fronteira legada `410`, SPA, provider real ou produção.

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
- `Content-Type` deve ser exatamente `application/json` sem parâmetros; JSON com chaves duplicadas, objeto não fechado, valores desconhecidos ou campos ausentes é rejeitado depois da autenticação.

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

Após autenticar, `accountId` do corpo deve coincidir com a conta ligada à chave. Os dois UUIDs devem estar no formato canônico minúsculo RFC 4122; `providerTransactionId` deve casar `[A-Za-z0-9][A-Za-z0-9._:-]{0,254}`; `amountCents` deve ser inteiro seguro entre `1` e `999999999999`; `confirmedAt` deve ser exatamente RFC3339 UTC com milissegundos (`YYYY-MM-DDTHH:mm:ss.SSSZ`) e permanecer dentro do limite temporal do protocolo. `billingRecordId`, transaction local, valor autoritativo e vínculos são sempre recarregados do PostgreSQL sob RLS.

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

Na entrada, `attemptId` deve referenciar uma tentativa B2a já commitada, ativa e pertencente à conta autenticada; a FK composta é imediata. Ausência, tenant diferente, estado incompatível ou divergência do attempt resulta em `404/409` opaco e não cria receipt. O callback pode anteceder somente o commit local da correlação/linha `pix_transactions`, nunca a criação do attempt que foi commitada antes da rede.

Não existe unicidade “first event wins” por attempt. Eventos autenticados com IDs distintos permanecem como receipts forenses separados. Sob lock do attempt, o B1 aplica o primeiro evento semanticamente válido; evento posterior equivalente termina `applied` com código sanitizado de duplicata canônica e zero novo efeito, enquanto divergência vai a `reconciliation_required`. Assim um evento autenticado porém semanticamente inválido não bloqueia uma correção posterior.

### `pix_provider_event_deliveries`

Fila operacional separada, relação 1:1 com o receipt:

- estados `pending | processing | applied | reconciliation_required`;
- `attempts`, `max_attempts`, `next_attempt_at`;
- `lease_owner`, `lease_token`, `lease_version`, `lease_expires_at` com invariantes all-or-none;
- código de erro sanitizado, sem mensagem externa bruta;
- `ENABLE/FORCE RLS`, grants mínimos explícitos e claim por `FOR UPDATE SKIP LOCKED` com fencing.

ACL da migration (validada por roles descartáveis, não pelo papel de harness amplo): a identidade da API pode `INSERT/SELECT` receipts e deliveries, mas não `UPDATE/DELETE/TRUNCATE` receipts; a identidade do worker pode `SELECT` receipts/principals e `SELECT/UPDATE` deliveries, sem `UPDATE/DELETE` receipts; nenhum papel de runtime pode apagar ou truncar receipts.

Essa ACL deve sobreviver ao reconciliador e ao bootstrap: `packages/db/src/reconcile-runtime-roles.ts`, `infra/postgres/init-runtime-role.sh` e o job Helm de manutenção devem revogar novamente as mutações proibidas depois de qualquer concessão ampla de tabelas RLS. A migration e os reconciliadores precisam ser idempotentes e a matriz deve ser testada com roles descartáveis que executem a reconciliação, não somente contra o papel de harness.

Receipt e delivery são criados na mesma transação. Replay idêntico retorna o receipt existente e não cria trabalho; mesmo ID com fingerprint divergente retorna conflito sem mutação.

`body_fingerprint` é `SHA256(UTF8("cvg.pix.raw-body.v1") || 0x00 || rawBodyBuffer)`. `claims_fingerprint` é `SHA256(UTF8("cvg.pix.claims.v1") || 0x00 || canonicalClaimsJson)`, onde `canonicalClaimsJson` é JSON UTF-8 sem espaços, com chaves nesta ordem exata: `type,accountId,attemptId,providerTransactionId,amountCents,currency,confirmedAt`; todos os valores já estão canonicalizados pelas regras do protocolo. Dois event IDs distintos no mesmo attempt são equivalentes somente quando `claims_fingerprint` coincide byte a byte; qualquer divergência é `reconciliation_required`. O event ID não participa da equivalência semântica.

### Identidade de serviço

- adicionar a `users` `principal_kind` (`human` default, `service`) e `interactive_login_enabled` (`true` default);
- constraint exige que `service` tenha `interactive_login_enabled=false`;
- toda resolução de login por username/email/caches deve aceitar apenas principal humano, ativo e interativo;
- criar `account_service_principals(account_id, purpose, user_id, is_active, ...)` com `purpose='pix-settlement'`, FK composta para `users(account_id,id)`, unicidade de mapping ativo e FORCE RLS;
- resolver e revalidar mapping, usuário ativo, tipo `service`, login desabilitado e mesmo tenant dentro da UoW;
- migration não cria usuário/mapping e não escolhe requester, primeiro usuário ativo, account UUID ou variável de ambiente como fallback.

Os filtros são obrigatórios em toda entrada interativa: username, email, hidratação inicial, lookup em cache frio/quente, atualização de cache, refresh/session e MFA só resolvem `principal_kind='human' AND interactive_login_enabled=true AND is_active=true`. Um principal `service` não pode autenticar mesmo que tenha username/email, sessão prévia ou cache existente; revogar a flag invalida a resolução seguinte e não fabrica sessão nova.

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
- O attempt ausente, cross-tenant ou incompatível nunca é retryable: a FK/checagem de entrada rejeita o callback opacamente antes de criar receipt. Somente a ausência temporária de `pix_transactions`/correlação local, depois de um attempt válido, é retryable porque o callback pode chegar antes do segundo commit local do outbound.
- Os estados de attempt aceitos na entrada são exatamente `pending_dispatch`, `awaiting_confirmation` e `confirmed_pending_apply`. `pending_dispatch` representa a janela em que o attempt já foi commitado antes da rede e o PIX/correlação ainda pode não existir; o worker aguarda somente a correlação. `settled` só é aceito no consumidor quando a prova financeira existente tem o mesmo `claims_fingerprint`; `dispatch_failed`, `expired`, `cancelled` e `reconciliation_required` são conflitos terminais e não criam receipt.
- O mapping/usuário de serviço é revalidado sob a UoW e protegido contra revogação concorrente antes dos locks financeiros; principal ausente/revogado/inválido falha fechado e permanece observável/retryable.
- Dois workers não duplicam efeito: claim/fence protege a delivery e inbox/idempotência do B1 protege o settlement.
- Ordem de locks: service-principal mapping/user -> inbox/idempotência -> billing -> encounter/contas/recebíveis -> PIX -> attempt -> inserts -> fenced delivery CAS.
- O ingresso/replay HTTP nunca toca PIX ou attempt. No caminho financeiro, nenhum código anterior ao B1 pode bloquear PIX/attempt e a ordem efetiva permanece `billing -> PIX -> attempt`.
- Crash antes do commit deixa delivery recuperável; crash após commit já observa `applied` e o replay B1 canônico.

### Máquina determinística de delivery, retry e fencing

- Toda delivery nasce `pending`, `attempts=0`, `max_attempts=8`, `next_attempt_at=received_at`, sem lease. Cada claim elegível (`pending` com `next_attempt_at <= now`, ou `processing` com lease expirada) executa uma única transação `FOR UPDATE SKIP LOCKED`, incrementa `attempts` e `lease_version`, grava `state='processing'`, `lease_owner`, token aleatório e `lease_expires_at=now()+60s`, e comita antes da UoW financeira.
- Todo write posterior da delivery exige o predicado completo `(account_id,id,state='processing',lease_owner,lease_token,lease_version)`; CAS com zero linhas é `STALE_FENCE`, lança e reverte a UoW financeira. Worker sem lease válido não toca receipt, principal, PIX, attempt ou billing.
- Falha retryable é somente: `PIX_NOT_CORRELATED` (attempt válido sem linha PIX/correlação), indisponibilidade/revogação transitória do principal antes do limite ou erro PostgreSQL/transporte explicitamente classificado transitório. O consumer faz CAS `processing -> pending`, limpa lease, grava código sanitizado e agenda `next_attempt_at = now() + min(5 * 2^(attempts-1), 900) seconds`.
- Falha semântica, divergência de claims, provider/tenant/valor/estado incompatível, JSON já autenticado porém inválido, ou tentativa cancelada/expirada é terminal: CAS `processing -> reconciliation_required`, limpa lease e grava apenas código allowlisted. Não há retry infinito nem exposição de mensagem externa.
- Quando `attempts >= max_attempts`, qualquer nova falha retryable termina em `reconciliation_required`. Um principal reativado recupera uma delivery ainda `pending` antes do teto; uma delivery já terminal exige redrive operacional explícito, auditado e separado, que apenas a devolve a `pending` sem alterar receipt ou efeitos financeiros.
- Sucesso financeiro faz CAS `processing -> applied` na mesma UoW do B1; replay equivalente de inbox também é `applied` com efeito financeiro zero. Crash antes de qualquer CAS deixa `processing` para takeover após 60s; crash depois do CAS observa `applied`.

O worker não usa `createTenantUnitOfWork`/`idempotency_requests` para esta UoW: esse wrapper grava idempotência e pode devolver `completed` antes da resolução do principal, do inbox e do fenced CAS, além de impedir redrive controlado. Deve existir um primitive explícito, por exemplo `runPixProviderSettlementTransaction`, que abre uma transação tenant-scoped sem replay de resposta, cria `TenantTransactionContext` com actor service, e executa nesta ordem: lock/revalidação do mapping e usuário -> claim/read do receipt e inbox -> B1 -> CAS final da delivery. O `delivery.id + lease_version` é o fence, não uma chave de resposta genérica; qualquer erro faz rollback integral e o retry é decidido somente pela máquina acima. Esse seam compartilhado deve ter RED próprio e não pode ser contornado pelo worker.

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
2. Extração B1: os testes legados e B1/B2 permanecem verdes através de `@cvg-his-v2/module-pix`; a suíte focada atual é 18/18 e os shims da API só reexportam.
3. HMAC/raw body: vetor conhecido, whitespace/ordem/Unicode, bordas `±300/301`, digest malformado, headers duplicados, limite 65.536/65.537, chunked, length falso, encoding, UTF-8, BOM e abort.
4. Ingress DB: receipt+delivery atômicos, failpoint entre inserts, replay/divergência, 20 callbacks concorrentes, dois IDs para o mesmo attempt sem first-event-wins, evento inválido A seguido de correção válida B, equivalência por `claims_fingerprint` canônico, callback antes do PIX/correlação local, attempt inexistente/cross-tenant sem receipt, FK/estados do attempt, RLS, append-only, catálogo e grants.
5. HTTP real: socket/chunks reais, rate limit, status/envelope, zero contexto tenant antes de HMAC, zero settlement no callback e respostas/logs sanitizados.
6. Principal: ausente, humano, interativo, inativo, revogado durante consumo e cross-tenant falham fechado; ativação posterior recupera retry. REDs separados devem cobrir username, email, hidratação, cache frio/quente, refresh/session e MFA para provar que `service` nunca entra no login.
7. Worker: consumer não faz staging fora do B1; dois pools/workers, lease expiry/takeover, stale fence, dois eventos distintos equivalentes/divergentes, restart após receipt commit e crash após B1 antes do retorno produzem um settlement e uma completion canônica.
8. Rollback: failpoint após cada escrita do B1 e antes/depois do fenced delivery CAS deixa somente receipt+delivery retryable e nenhum efeito financeiro parcial.
9. Shared-UoW/ACL: primitive sem `idempotency_requests` devolve sempre o controle ao consumer, o fence `delivery.id + lease_version` é obrigatório, redrive não herda resposta cacheada, e migration + reconciler + init + Helm preservam a matriz API/worker least-privilege após reruns.
10. Legacy/boundaries: B2 não liquida por `/confirm`, event bus genérico, consumer legado ou import cross-app.
11. Regressão/qualidade: B1, B2a, cash, outbox, API, worker, RLS, OpenAPI, typecheck, lint, coverage global >=80%, coverage dedicada dos seams críticos (incluindo `apps/worker`, rotas API e `packages/modules/pix`), secret/dependency scans e crítica independente.

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
- `tests/unit/auth/service-principal-interactive-login.test.ts`
- `tests/integration/rls/pix-provider-runtime-grants.test.ts`
- `tests/integration/database/pix-provider-shared-uow.test.ts`

## Ordem de implementação após o gate

1. Baseline B1/B2a e primeiro RED de tentativa reservada — concluído (`EVT-0038`).
2. GREEN mínimo no B1 atual, incluindo integridade de timestamp/provider/reserva/replay e rollback — concluído (`EVT-0041`, 18/18).
3. Extração para `packages/modules/pix`, exports/dependências e shims da API — implementado; aguarda revisão independente específica da extração.
4. Escrever/rodar REDs de verifier/raw body, incluindo dummy-key/comparação 32/32 instrumentável e clock injetado — concluído com `EVT-0043`/`EVT-0044`; o leitor/verificador está verde em 24/24, mas ainda não há rota HTTP.
5. Escrever/rodar REDs de migration/RLS/ACL/receipt/delivery/principal, reconciler/init/Helm reruns e implementar `0111` — o receipt/delivery/parser/fingerprint sub-slice está GREEN em `EVT-0047`/`EVT-0048`, com review APPROVE em `EVT-0049`.
6. Implementar ingresso/rota/composição/OpenAPI somente após seus REDs; migration, repository e ACL já têm evidência própria. HTTP ainda deve usar socket bruto (`node:net`) para framing/abort/headers duplicados, e produção deve falhar fechado no bootstrap API/worker.
7. Implementar o primitive shared `runPixProviderSettlementTransaction` e seus REDs; só depois escrever/rodar REDs do consumer e implementar claim, principal, chamada única ao B1 estendido e fenced completion na mesma UoW; o consumer não possui staging financeiro.
8. Rodar restart/concurrency multi-pool, revogação com barreiras determinísticas e harness de known-bad.
9. Rodar uma configuração de cobertura dedicada que inclua explicitamente B1 extraído, `apps/worker`, rotas API e todos os seams críticos, com thresholds por seam além do global >=80%.
10. Executar regressões, cobertura, segurança e crítica independente; somente então produzir `VERIFIED`.

## Ownership previsto

- Extração/extensão B1: `packages/modules/pix/src/confirmed-settlement/*`, package exports/dependencies, shims da API e regressão B1. Um único writer possui esta etapa.
- Dados: `packages/db/migrations/0111_*`, schemas/exports, runtime grants, `packages/db/src/reconcile-runtime-roles.ts`, `infra/postgres/init-runtime-role.sh`, Helm maintenance reruns e testes PostgreSQL/RLS/ACL.
- Inbound API: raw reader, keyring/verifier, repository/command de receipt, rota, composition root, rate limit, OpenAPI e bloqueio legado.
- Shared/worker: primitive `runPixProviderSettlementTransaction` sem idempotência de resposta, repository de delivery, claim/fence/backoff, consumer B1, bootstrap/runner/health/metrics e testes.
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

## Critérios do gate e revalidação

- `IR-001`: limites B2b/B2c/provider real/produção, owners e dependências são explícitos.
- `IR-002`: protocolo/canonicalização, autoridade tenant, schemas/ACL/RLS, principal interativo, estados, atomicidade, locks, retries/fencing determinísticos, migration, rollback e fronteira legada estão congelados.
- `IR-003`: REDs executáveis cobrem raw bytes via socket, dummy HMAC, JSON duplicado, replay divergente, attempt inexistente/cross-tenant, dois tenants, callback antes do PIX (não antes do attempt), dois callbacks/workers, ambos os limites de restart, rollback por escrita, principal revogado e cada caminho de login/cache/MFA, produção fail-closed, ACL/RLS least-privilege, regressões, cobertura dedicada e revisão independente.

Decisão atual: `GO` apenas para a sequência reversível autorizada pelo gate `GATE-CVG-002B2B-IR-001`; `VERIFIED` continua pendente. Nenhum comportamento de callback, migration 0111, principal ou worker deve ser inferido da aprovação de prontidão ou da suíte 18/18.
