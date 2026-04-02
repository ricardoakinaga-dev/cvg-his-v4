# Relatório Parcial — CP03 — Fase 02 Módulo Discharges

> Data: 2026-03-31 00:24 UTC
> Fase: F02 — Módulo Discharges (Alta/Desfecho Clínico)
> Sprint: SP03 + SP04

## Tarefas Concluídas

| ID | Tarefa | Status | Notas |
|----|--------|--------|-------|
| T013 | Criar estrutura do módulo | ✅ | `packages/modules/discharges/` com package.json, tsconfig.json |
| T014 | Definir interfaces | ✅ | DischargeRepository, DischargesService em src/index.ts |
| T015 | InMemoryDischargeRepository | ✅ | CRUD em Map, findByEncounterId, findByAccountId |
| T016 | DatabaseDischargeRepository | ✅ | CRUD PostgreSQL com queries parametrizadas |
| T017 | DischargesService | ✅ | create, getById, getByEncounterId, list, update com versioning |
| T018 | Criar rotas API | ✅ | GET/POST /discharges, GET/PATCH /discharges/:id |
| T019 | Registrar no access-control | ✅ | Permissões: discharges.read, discharges.manage (nos rotas) |
| T020 | Testes unitários | ✅ | 9 testes: create, getById, getByEncounterId, list, update, version check, duplicate block, not-found |
| T021 | Página frontend | ⬜ Pendente | F07 |
| T022 | Adicionar na sidebar | ⬜ Pendente | F07 |

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `packages/modules/discharges/package.json` | Configuração do pacote |
| `packages/modules/discharges/tsconfig.json` | TypeScript config |
| `packages/modules/discharges/src/index.ts` | Service + interfaces (DischargeRepository, DischargesService) |
| `packages/modules/discharges/src/repositories/in-memory-discharge.repository.ts` | Repository in-memory |
| `packages/modules/discharges/src/repositories/database-discharge.repository.ts` | Repository PostgreSQL |
| `packages/modules/discharges/src/discharges.test.ts` | 9 testes unitários |

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `packages/shared/types/src/index.ts` | +DischargeId, +DischargeSummary, +PrescriptionExecutionId, +PrescriptionExecutionSummary, +AdministrationEventId, +AdministrationEventSummary |
| `packages/shared/contracts/src/index.ts` | +CreateDischargeRequest, +UpdateDischargeRequest, +DischargeListResponse, +CreatePrescriptionExecutionRequest, +ExecutePrescriptionRequest, +SuspendPrescriptionRequest, +LogAdministrationEventRequest, +PrescriptionExecutionListResponse |
| `apps/api/src/runtime.ts` | +DischargesService import/instantiation/return |
| `apps/api/src/server.ts` | +CreateDischargeRequest, +UpdateDischargeRequest imports, +discharges destructure, +4 rotas (GET/POST /discharges, GET/PATCH /discharges/:id) |

## Testes

| Suite | Testes | Status |
|-------|--------|--------|
| discharges.test.ts | 9 | ✅ Todos passando |
| Suite global | 113 passando (de 22 suites) | ✅ Melhoria de 32→113 |

### Testes do módulo discharges:
1. ✅ should create a discharge
2. ✅ should get discharge by id
3. ✅ should throw NotFoundError for non-existent id
4. ✅ should get discharge by encounter id
5. ✅ should return null for non-existent encounter
6. ✅ should block duplicate discharge per encounter
7. ✅ should list discharges by account
8. ✅ should update a discharge with version check
9. ✅ should throw ConflictError on version mismatch

## API Endpoints Novos

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | /discharges | discharges.read | Lista altas da conta |
| POST | /discharges | discharges.manage | Cria alta para um atendimento |
| GET | /discharges/:id | discharges.read | Detalhe da alta |
| PATCH | /discharges/:id | discharges.manage | Atualiza alta (com versionamento) |

## Checklist CP03
- [x] 5+ testes passando para discharges (9 testes)
- [x] API routes respondendo (GET/POST/PATCH)
- [~] Frontend page renderiza e navega (movido para F07)
- [x] Permissões RBAC funcionando (discharges.read/manage)
- [x] `pnpm test` global passa (113 testes OK)

## Próximos Passos
- F03 — Módulo Prescription-Executions (T023-T032)
- F07 — Frontend discharges page (T021-T022)
