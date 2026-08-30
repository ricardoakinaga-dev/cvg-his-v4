# CVG-004 — persisted inventory-invoices status boundary

## Estado do contrato

- Status: `COMPLETE_BOUNDED`; estágio `CLOSE`; prioridade `P1`.
- Pai: `CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES`; owner: root integrator
  with TDD and security review.
- Autoridade: `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-IR-001`.
- Gate de implementação:
  `.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-invoices-persisted-status-boundary.json`.

## Gap confirmado

O resolver do worker usa `parseScheduledReportText` para o filtro `status`.
Essa função converte `null`, `''` e whitespace em `undefined`; em seguida o
resolver omite `status` do objeto encaminhado ao source. O source
`DatabaseInventoryInvoicesReportSource` rejeita esses valores quando recebe o
filtro diretamente, mas um filtro JSONB persistido em `report_schedules` só é
obrigado pelo banco a ser um objeto. Portanto, um schedule persistido com
status vazio pode executar sem filtro, contrariando a allowlist estrita e
silenciosamente ampliando o resultado.

## Contrato congelado

1. O corte cobre somente o parsing do filtro `status` do report agendado
   `inventory-invoices` no worker e seus testes.
2. `undefined` continua significando ausência do filtro; `null`, número,
   booleano, array, objeto, string vazia e whitespace devem falhar fechado
   antes de chamar `sources.inventoryInvoices.list`.
3. Strings válidas continuam normalizadas com trim/lowercase e limitadas à
   allowlist `draft`, `approved`, `partially_received`, `received` e
   `cancelled`.
4. Busca, datas, limite de 10.000 linhas, validação de rows, projeção de doze
   campos, schedule/audit/export e source PostgreSQL permanecem inalterados.
5. Não adicionar migração nem backfill: o worker deve rejeitar com segurança o
   estado legado malformado. Não alterar o parsing de status dos outros
   relatórios.

## TDD e evidência exigida

### RED

- Adicionar casos `null`, `''` e whitespace ao teste do resolver.
- O RED deve demonstrar que a implementação atual consulta o source ou
  executa sem o filtro, em vez de falhar fechado.

### GREEN

- Criar o menor parser específico de status de inventory-invoices, preservando
  a função compartilhada para os demais reports.
- Provar que valores inválidos não consultam o source e que valores válidos
  continuam sendo encaminhados normalizados.
- Rodar worker/source regressions, API/worker build/typecheck, segurança,
  lint/format e diff hygiene, com review independente tentado e limitações
  explícitas.

## Limitações e não-claims

Este slice não fecha a semântica fiscal/NF-e, backfill de schedules existentes,
outros reports, delivery providers, operações distribuídas, target, produção,
deployment, parity, release ou ERP global. O ERP permanece
`IN_PROGRESS/PARTIAL` e a promoção permanece `BLOCKED`.

## Decisão de parada

Se a correção exigir mudança de schema, migração/backfill, semântica fiscal,
outro report, worker distribuído, provider, target ou produção, parar e
revalidar a autoridade em vez de ampliar a fatia silenciosamente.

## Fechamento bounded — 2026-08-30

O slice foi fechado como `COMPLETE_BOUNDED` / `PASS_BOUNDED`. O RED reproduziu
`58/59` com `Missing expected rejection`; após a correção, o worker passou
`59/59`, `20/20`, `7/7`, `2/2`, `8/8`, `11/11` e `17/17` nas sete suítes, e o
módulo de inventário passou `51/51` com PostgreSQL efêmero limpo. Worker e
inventário typecheck/build, cobertura, segurança enterprise, secretlint,
OpenAPI, RLS, namespaces, Prettier e diff hygiene passaram.

A revisão adversarial local não encontrou defeito adicional, mas reviewer
independente não ficou disponível por incompatibilidade/limite da conta; isso
está registrado como `CONDITIONAL`, sem inferir `APPROVE_BOUNDED`. A dívida Low
de precisão de citação histórica do sidecar permanece separada. O ERP global
continua `IN_PROGRESS/PARTIAL` e a promoção continua `BLOCKED`.

## Evidência de fechamento

- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PERSISTED-STATUS-BOUNDARY-FINAL-001`
- `.agent/gates/verified-CVG-004-report-scheduled-inventory-invoices-persisted-status-boundary.json`
- `.agent/artifacts/CVG-004-report-scheduled-inventory-invoices-persisted-status-boundary-2026-08-30.md`
