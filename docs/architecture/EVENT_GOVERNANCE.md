# Governança de eventos clínicos e operacionais

**Status:** contrato canônico do barramento de outbox
**Owner:** Platform / Clinical Operations
**Contrato:** `@cvg-his-v2/module-event-bus`
**Versão atual do envelope:** `1`

O outbox continua sendo a garantia de entrega e os módulos soberanos continuam
sendo a fonte de verdade. A governança abaixo padroniza o evento que conecta
esses módulos e permite reconstruir uma timeline operacional sem duplicar o
registro clínico.

## Envelope obrigatório

Todo evento publicado pelo `EventBusService` recebe em `payload._meta`:

| Campo           | Regra                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| `eventId`       | coincide com o ID imutável do outbox; não pode ser forjado pelo produtor       |
| `eventType`     | minúsculo, segmentado por `.`, `_` ou `-`; ex.: `handover.ready`               |
| `schemaVersion` | inteiro positivo; eventos catalogados começam em `1`                           |
| `occurredAt`    | timestamp ISO-8601 do fato de domínio                                          |
| `accountId`     | tenant do evento e do contexto PostgreSQL                                      |
| `sourceModule`  | módulo que publicou o fato                                                     |
| `actor`         | `{ type: user\|service\|system, id }`; o padrão explícito é `system:event-bus` |
| `correlationId` | correlação ponta a ponta da operação                                           |
| `causationId`   | ID do evento/comando que causou o fato, ou `null`                              |

Os campos protegidos são validados no publish e novamente antes do consumo. Um
conflito falha fechado; o evento não é despachado como se fosse íntegro.
O migration `0170_outbox_event_envelope.sql` backfilla linhas legadas usando a
identidade da própria linha do outbox antes que o worker passe a exigir o
envelope completo.

## Catálogo e versionamento

Eventos públicos devem ser adicionados ao catálogo em
`packages/modules/event-bus/src/event-catalog.ts` e receber uma entrada no
registro `EVENT_SCHEMA_VERSIONS`. O nome é estável e a evolução incompatível
incrementa `schemaVersion`. Consumidores devem aceitar a versão anterior
durante a janela de depreciação registrada no ADR ou no contrato do módulo.

O ciclo de passagem de plantão usa:

`handover.created`, `handover.updated`, `handover.ready`,
`handover.acknowledged` e `handover.overdue`.

## Timeline, replay e ordenação

Uma projeção de timeline pode indexar `eventId`, `accountId`, referências de
paciente/encounter no payload mínimo e os campos do envelope. Ela não pode
substituir as tabelas soberanas. Consumidores devem ser idempotentes por
`eventId`; duplicatas são reconhecidas pelo inbox e não reaplicadas.

`occurredAt` representa o momento do fato e não a ordem de entrega. Projeções
ordenam por `occurredAt` e desempate por `eventId`, preservando eventos fora de
ordem. Replay usa o outbox/DLQ administrativo e mantém o mesmo `eventId` e
`causationId`.

## Dados clínicos e privacidade

Payloads carregam apenas referências e metadados operacionais necessários para
projeção. Narrativas, segredos, tokens e PHI desnecessária permanecem nas
fontes soberanas; respostas administrativas passam por redaction. Qualquer
exceção exige decisão de privacidade e teste de contrato.

## Evidência

O contrato é exercitado por `event-envelope.test.ts`, pelos testes do outbox e
pelos guards de tenant do repositório. Isso prova invariantes locais; não prova
por si só a operação do target, UAT clínico, recovery ou autoridade de release.
