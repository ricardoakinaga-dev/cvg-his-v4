# CVG-002B2B — semantic PIX replay convergence

## Estado do contrato

- Status: `COMPLETE_BOUNDED`; estágio `CLOSE` / `PASS_BOUNDED`.
- Pai: `CVG-002B2B`; prioridade `P0`; tier `T4_CRITICAL`; risco `CRITICAL`; blast radius `CROSS_SYSTEM`.
- Owner: root integrator; TDD, segurança e revisão independente obrigatórios para maior confiança.
- Autoridade: `.agent/authority.jsonl#AUTH-CVG-002B2B-SEMANTIC-PIX-REPLAY-IR-001`.
- Gate de implementação: `.agent/gates/implementation-ready-CVG-002B2B-semantic-pix-replay.json`.

## Gap confirmado

O ingresso autenticado persiste `claims_fingerprint`, mas o worker seleciona
somente as alegações operacionais do evento e o B1 calcula sua chave de inbox
com `provider + provider_event_id`. O replay canônico existente também procura
apenas a prova do mesmo `provider_event_id`.

Consequentemente, duas entregas autenticadas para o mesmo attempt, transação,
billing, valor, moeda, horário e claims semânticas, mas com IDs de evento
distintos, não convergem. Depois que a primeira liquida, a segunda pode ler o
attempt terminal e mover sua delivery para `reconciliation_required`, apesar de
ser uma confirmação semanticamente equivalente. Isso viola o contrato já
publicado em `CVG-002B2B.md`: eventos equivalentes devem permanecer forenses em
receipts separados, mas a confirmação posterior deve terminar `applied` com
efeito financeiro zero.

## Contrato congelado

1. O caminho dedicado `pix.payment.confirmed.v1` deve transportar o
   `claims_fingerprint` persistido no receipt até o B1 compartilhado.
2. Sob a mesma ordem de locks financeira já vigente, um receipt posterior para
   a mesma conta, attempt, billing, transação, valor, moeda, horário e
   `claims_fingerprint`, com `provider_event_id` diferente, deve retornar a
   prova canônica existente, executar zero escrita financeira nova e concluir a
   delivery como `applied` com o código sanitizado
   `PIX_SETTLEMENT_CANONICAL_REPLAY`.
3. O primeiro evento válido continua sendo o único dono de PIX, attempt,
   billing, receivable, journal, audit e outbox. Receipts e deliveries dos
   eventos equivalentes continuam append-only e individualmente observáveis.
4. Um evento com claims divergentes, attempt/billing/transação/valor/moeda ou
   horário incompatível continua terminal, observável como
   `PIX_SETTLEMENT_CLAIMS_DIVERGENT`/código equivalente já allowlisted, sem
   qualquer efeito financeiro adicional.
5. A consulta de convergência deve serializar depois do billing lock, evitando
   a inversão `PIX -> billing` e tornando determinístico o caso de dois workers
   vivos. A delivery duplicada ainda pode registrar seu inbox claim, mas não
   pode criar prova, pagamento, journal, auditoria financeira ou outbox novo.
6. Callers diretos legados sem fingerprint permanecem compatíveis e não ganham
   uma nova semântica implícita; o worker do protocolo dedicado é obrigado a
   fornecer o fingerprint. Nenhuma alteração de provider real, credencial,
   target, produção, deploy, schema obrigatório, migração de dados, release ou
   promoção global é autorizada.

## TDD e evidência exigida

### RED

- Inserir duas receipts/deliveries do mesmo attempt antes do processamento,
  com IDs distintos e o mesmo `claims_fingerprint`.
- Processar a primeira e depois a segunda contra PostgreSQL descartável.
- O teste deve falhar no baseline porque a segunda delivery termina terminal
  (`PIX_SETTLEMENT_ATTEMPT_TERMINAL`) em vez de `applied`, demonstrando o gap
  sem alterar implementação para fabricar o RED.

### GREEN

- Carregar o fingerprint do receipt no worker e encaminhá-lo ao B1.
- Fazer o B1 detectar a prova canônica equivalente depois do lock de billing,
  retornar a prova existente e informar ao worker que a delivery é replay
  canônico.
- Persistir somente a transição operacional da delivery para `applied` com
  código sanitizado; manter exatamente uma prova/pagamento/receivable,
  journal, audit financeira e outbox.
- Cobrir claims divergentes, IDs distintos, dois workers vivos e a regressão de
  replay do mesmo ID.

## Limites e qualidade

Inclui somente `module-pix`, o repositório/consumer de delivery no worker e
testes unitários/integrados do fluxo dedicado. Não reabre a barreira legada,
não altera o protocolo HTTP de assinatura, não muda a migração 0111, não
provisiona principal, não troca provider, não opera target e não declara
paridade, produção ou release.

Quality bar: RED/GREEN, regressão do módulo/worker/API, PostgreSQL descartável
com isolamento tenant e concorrência, typecheck/build, cobertura oficial >=80%,
secret/OpenAPI/RLS/migration/namespace/static/diff checks, tentativa de revisão
independente compatível, reconciliação explícita de não promoção e controle do
plano/ledgers. Ausência de revisão é limitação, nunca aprovação inferida.

## Próxima ação

Após o commit desta fatia, retornar a um novo scouting de resíduos sob nova
autoridade. O ERP global continua `IN_PROGRESS/PARTIAL` e a promoção continua
`BLOCKED`.

## RED confirmado — 2026-08-30

A prova `tests/integration/database/pix-provider-settlement-consumer.test.ts`
foi executada contra PostgreSQL descartável com as migrations `0000`–`0157`.
Os cenários existentes passaram, mas o novo caso criou duas receipts/deliveries
para o mesmo attempt com `claims_fingerprint` igual e IDs distintos; a primeira
delivery terminou `applied` e a segunda terminou `reconciliation_required`.
O teste falhou na expectativa `replay.status === 'applied'`, reproduzindo o
gap sem mudança de implementação. O resultado confirma que o baseline trata
somente o `provider_event_id` como idempotência efetiva.

## GREEN confirmado — 2026-08-30

O worker agora seleciona `claims_fingerprint` do receipt imutável e o entrega
ao B1. O B1 mantém a chave de inbox por evento, bloqueia primeiro o billing e
procura a prova canônica sem inverter a ordem de locks. Para um evento distinto
com as mesmas claims, retorna a prova existente; o consumer apenas finaliza a
delivery como `applied` com `PIX_SETTLEMENT_CANONICAL_REPLAY`. Claims
divergentes falham como `PIX_SETTLEMENT_CLAIMS_DIVERGENT`, e o replay do mesmo
ID continua sem efeitos adicionais.

As provas PostgreSQL passaram: equivalência sequencial, divergência produzida
pelo `DatabasePixProviderEventIngressRepository`, dois consumers concorrentes
com matriz financeira completa e replay do mesmo `provider_event_id`. O fluxo
produz uma prova/pagamento/receivable/journal/audit/outbox e duas deliveries
aplicadas, preservando receipts e inboxes individuais.

## Regressão, qualidade e revisão — 2026-08-30

- Consumer PostgreSQL dedicado: `11/11` contra banco descartável com as
  migrations `0000`–`0157`.
- Comando transacional: `19/19`; módulo PIX: `9/9`; worker: `17/17`.
- Typecheck do workspace concluído; builds de `module-pix` e `worker` concluídos.
- OpenAPI (`354` paths), RLS (`165/166` tabelas tenant), namespaces, secret
  scan, ESLint direcionado e `git diff --check`: pass.
- O lint global continua com apenas os dois achados preexistentes de
  `no-control-regex` em `packages/contracts/src/counterSales.ts:38,77`;
  nenhum arquivo dessa fatia foi alterado por esse baseline.
- A revisão independente compatível confirmou que os três achados anteriores
  foram resolvidos e não encontrou achados materiais remanescentes.

## Fechamento limitado

Esta fatia está fechada localmente como `COMPLETE_BOUNDED/PASS_BOUNDED`, com
confiança `HIGH` no comportamento coberto e risco residual `HIGH` no contexto
global. Não é uma certificação de provider real, target, produção, deploy,
release, paridade Vetus/clínica, backup/restore ou promoção ERP. O contrato
global permanece `IN_PROGRESS/PARTIAL`; a promoção permanece `BLOCKED`.
