# 506 — Módulo Surgery

## Objetivo

Gerenciar casos cirúrgicos vinculados a encounters, com controle de transições de status e registro de equipe cirúrgica e notas operatórias.

## Superfície funcional real

- `requestCase(payload)` — cria caso cirúrgico com status `requested`. Valida existência do encounter. Registra `surgeonUserId`, `surgicalTeam` (array de strings), `preparationNotes`, `scheduledAt`.
- `list(encounterId?)` — lista casos cirúrgicos, com filtro opcional por encounter.
- `getOrThrow(caseId)` — busca por ID, lança `NotFoundError` se não existir.
- `updateStatus(caseId, payload)` — transiciona status com validação de transição válida. Atualiza `operativeNotes`, registra `startedAt` na transição para `in_progress`, registra `endedAt` nas transições para `recovery` ou `completed`.
- Exporta `DatabaseSurgeryCaseRepository` (Drizzle ORM).

## Principais dependências

- `@cvg-his-v2/module-encounters` — `EncountersService` (validação de existência do encounter, herança de `accountId`, `patientId`)
- `@cvg-his-v2/shared-errors` — `NotFoundError`
- `@cvg-his-v2/shared-validation` — `requireNonEmptyString`
- `@cvg-his-v2/shared-utils` — `createCorrelationId`, `nowIso`

## Regras de negócio relevantes

- **Máquina de estados** (`VALID_SURGERY_TRANSITIONS`):
  - `requested` → `pre_op`, `cancelled`
  - `pre_op` → `in_progress`, `cancelled`
  - `in_progress` → `recovery`, `cancelled`
  - `recovery` → `completed`
  - `completed` → (nenhuma)
  - `cancelled` → (nenhuma)
- Transições inválidas lançam `Error` com mensagem descritiva.
- `startedAt` é registrado automaticamente na primeira transição para `in_progress`.
- `endedAt` é registrado automaticamente na primeira transição para `recovery` ou `completed`.
- `operativeNotes` pode ser adicionado a qualquer momento via `updateStatus`.
- Persistência via repositório é tentada em fire-and-forget (`.catch(console.error)`).
- Usa `#pendingPersist` promise chain para serializar escritas ao repositório.

## Riscos atuais

- **Persistência fire-and-forget**: `persistCase().catch(console.error)` não propaga erros. O caso é criado em memória mesmo se o DB falhar.
- **Repositório não injetado no construtor padrão**: O serviço funciona sem repositório — persistência é opcional e silenciosamente ignorada se não configurada.
- **Sem validação de surgeonUserId**: Não há verificação de que o `surgeonUserId` existe no módulo users.
- **Sem validação de surgicalTeam**: Não há verificação de que os membros da equipe existem.
- **Sem cancelamento com motivo**: Transição para `cancelled` não registra motivo.
- **Sem agendamento real**: `scheduledAt` é um campo livre — não há validação de conflito com outras cirurgias.
- **Erro genérico em transição inválida**: Usa `Error` em vez de um erro tipado (ex: `ConflictError`).

## Situação de persistência

- **Padrão**: Map in-memory `#cases: Map<SurgeryCaseId, SurgeryCaseSummary>`.
- **Repositório**: `DatabaseSurgeryCaseRepository` usa Drizzle ORM com tabela `surgery_cases`. Suporta `create`, `update`, `findById`, `findByEncounterId`.
- Persistência é tentada mas erros são silenciosamente logados — inconsistência entre memória e DB é possível.

## Situação de testes

- Arquivo: `packages/modules/surgery/src/surgery.test.ts`
- 7 testes cobrindo: criação de caso, transição completa de status (requested → pre_op → in_progress → recovery → completed), getOrThrow com ID inexistente, filtragem por encounter, registro de equipe cirúrgica, bloqueio de transição inválida, cancelamento de estados iniciais.
- Testes usam `node:test` com `assert`.
- Nenhum teste cobre o repositório de banco de dados.
- Nenhum teste cobre persistência fire-and-forget.

## Gaps para nível enterprise

1. Usar erro tipado (ex: `ConflictError`) para transições inválidas em vez de `Error` genérico.
2. Adicionar campo `cancellationReason` ao cancelar.
3. Validar existência de `surgeonUserId` e membros da equipe.
4. Adicionar validação de conflito de agendamento cirúrgico.
5. Tratar erros de persistência de forma explícita (não silenciar).
6. Adicionar método para anexar documentos pré-operatórios.
7. Adicionar suporte a múltiplas cirurgias por encounter.
8. Adicionar checklist pré-operatório.
9. Adicionar relatório pós-operatório estruturado.
10. Adicionar testes para repositório DB.
