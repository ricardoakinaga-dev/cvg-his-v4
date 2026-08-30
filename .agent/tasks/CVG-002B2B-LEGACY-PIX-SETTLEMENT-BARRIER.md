# CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER — Bloqueio do settlement PIX legado

## Estado do contrato

- Status: `PASS_BOUNDED`; estágio `VERIFY` / atividade `RECONCILE`.
- Pai: `CVG-002B2B`; prioridade `P0`; tier `T4_CRITICAL`; risco `CRITICAL`; blast radius `CROSS_SYSTEM`.
- Owner: root integrator; revisão independente obrigatória antes da reconciliação.
- Autoridade: `.agent/authority.jsonl#AUTH-CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER-IR-001`.
- Implementation-ready gate: `.agent/gates/implementation-ready-CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER.json`.

## Gap confirmado

O consumidor compartilhado `PaymentsEventHandlers` tratava
`payment.pix.confirmed` como uma confirmação legada reconstruível. Quando a
intenção não existe, ele cria uma transação PIX com `amount = 0`; quando a
transação está ligada a `paymentAttemptId`, ele pode marcar a transação como
completa e alcançar settlement fora do núcleo B1. A validação de conta,
billing, moeda e valor acontece depois de `updateStatus`, permitindo uma
mutação parcial antes de um evento malformado falhar.

O endpoint legado já retorna `410` para uma intenção ligada a tentativa, mas o
worker ainda registra o consumidor de eventos legado. Uma mensagem persistida,
replayada ou produzida por outro caminho não pode contornar a fronteira HTTP.

## Contrato congelado

1. `payment.pix.confirmed` só pode operar sobre uma transação PIX autoritativa
   já persistida. Intenção ausente deve falhar antes de `create`, `updateStatus`
   ou qualquer settlement; nenhum placeholder de valor zero pode ser criado.
2. Uma transação autoritativa com `paymentAttemptId` deve ser rejeitada antes de
   qualquer escrita. Tentativas B2 só podem ser liquidadas pelo consumidor
   dedicado `pix.payment.confirmed.v1` e pelo núcleo B1 compartilhado.
3. Antes de qualquer mutação, validar a coerência entre `event.accountId`,
   `payload.accountId`, a conta da transação e, quando presente, o
   `billingRecordId`. Billing, moeda e valor devem ser conferidos contra a
   transação autoritativa antes de alterar status ou liquidar.
4. A confirmação legada sem `paymentAttemptId` continua suportada somente para
   uma intenção autoritativa e coerente. A variante sem billing mantém o
   comportamento operacional existente, sem settlement financeiro.
5. Falhas de autoridade, schema, vínculo, conta, valor, billing ou banco devem
   ser propagadas ao event bus para retry/DLQ. Não transformar evento inválido
   em sucesso, no-op silencioso ou escrita financeira parcial.
6. O slice não altera o protocolo, a persistência ou o worker do fluxo
   `pix.payment.confirmed.v1`; apenas impede que o caminho legado alcance
   tentativas B2 ou reconstrua estado inexistente.

## Quality bar e evidência exigida

- RED intencional em testes do consumidor para intenção ausente, tentativa B2,
  divergência de conta e divergência de valor, demonstrando que a
  implementação atual permite ou muta antes de falhar.
- GREEN com testes unitários de criação/settlement legado autorizado,
  rejeição fail-closed sem writes e propagação pelo adapter `handlers`.
- Regressão do consumidor no pacote API e do pacote compartilhado usado pelo
  worker; quando a fixture descartável estiver disponível, prova PostgreSQL
  do evento legado e da ausência de settlement/registro parcial.
- Typecheck, build, cobertura oficial, segurança, lint, diff hygiene e revisão
  independente read-only antes de `PASS_BOUNDED`.

## Exclusões

Não estão autorizados neste slice: provider real, credenciais, target,
staging/produção, deploy, mutação externa, mudança de schema, alteração do
núcleo B1 ou do protocolo dedicado, migração de dados, remoção global do
consumer legado, auditoria de parity/Vetus ou aprovação de release.

## RED confirmado — 2026-08-27

O build da API passou e a suíte focalizada executou 13 testes: 9 passaram e
4 falharam nos contratos novos. A implementação atual cria o placeholder
desconhecido, aceita a confirmação de uma tentativa B2, ignora a conta do
envelope e atualiza o status antes de detectar o valor divergente. Nenhuma
alteração de implementação foi usada para mascarar o RED.

## GREEN local — 2026-08-27

O consumidor compartilhado passou no build e na suíte focalizada com `14/14`;
o pacote `event-consumers` passou `2/2`, a regressão completa da API passou
`428/428` após o teste focalizado ser incluído no script oficial, e a composição
PostgreSQL do worker passou `6/6`. A prova de worker moveu o evento desconhecido
e o attempt-linked para DLQ sem inbox nem efeitos financeiros, e a barreira
também rejeita retorno nulo de `updateStatus` antes de settlement.

## VERIFY bounded — 2026-08-27

A revisão independente read-only não encontrou achados funcionais Critical,
High ou Medium. A condição de baixo nível sobre o harness foi corrigida e
revalidada pela API `428/428`. A qualidade global passou com coverage acima de
80%, typecheck/build/lint/security/static rails verdes e os audits globais
foram reexecutados sem promoção: parity `98/100`, clínica `100/100` e
readiness `95/100`, todos ainda abaixo do aceite final.

Evidence final: `.agent/gates/verified-CVG-002B2B-legacy-pix-settlement-barrier.json`,
`.agent/artifacts/CVG-002B2B-legacy-pix-settlement-barrier-2026-08-27.md` e
`.agent/verification.jsonl#VFY-CVG-002B2B-LEGACY-PIX-SETTLEMENT-BARRIER-FINAL-001`.

## Próxima ação

Manter `CVG-002B2B`, `CVG-002` e o programa ERP `IN_PROGRESS/PARTIAL`. O
próximo slice só deve ser escolhido com scouting e nova autoridade; failpoints
completos, dois workers vivos, providers, target e gates globais continuam
necessários antes de qualquer promoção.
