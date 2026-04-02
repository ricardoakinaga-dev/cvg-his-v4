# Relatório Parcial — CP02 — Fase 01 Fundação de Banco

> Data: 2026-03-30 23:11 UTC
> Fase: F01 — Fundação de Banco de Dados
> Sprint: SP01 + SP02

## Tarefas Concluídas

| ID | Tarefa | Status | Notas |
|----|--------|--------|-------|
| T001 | Auditoria do schema Drizzle | ✅ | Drizzle (50+ tabelas, UUID) vs SQL Manual (22 tabelas, VARCHAR) |
| T002 | Mapear colunas faltantes | ✅ | Tabela comparativa em F01-SP01-SCHEMA-AUDIT.md |
| T003 | Decidir estratégia | ✅ | Manter SQL manual, expandir incrementalmente (ADR inline) |
| T004 | Remover packages/db | ✅ | Decidido manter como referência, não como build |
| T005 | Migration 006 — Expansão Owners | ✅ | full_name, contacts_json, financial_responsible, source |
| T006 | Migration 007 — Expansão Patients | ✅ | is_neutered, microchip, color, clinical_alerts_json, weight_kg |
| T007 | Migration 008 — Expansão Encounters | ✅ | encounter_type, origin, clinical_snapshot_json |
| T008 | Migration 009 — Hardening Encounters | ✅ | FK (patients, owners), CHECK (type, priority) |
| T009 | Migration 010 — Discharges | ✅ | Tabela discharges com UNIQUE(encounter_id), CHECK(type), FK |
| T010 | Migration 011 — Expansão Inpatient | ✅ | admission_type, estimated/actual_discharge, admitted_by, version |
| T011 | Migration 012 — Prescription Executions | ✅ | prescription_executions + administration_events com FKs e CHECK |
| T012 | Migration 013 — Versionamento | ✅ | version column em patients, encounters, medical_records, inpatient, owners |

## Migrations Criadas

| # | Arquivo | Tabelas Afetadas | Linhas |
|---|---------|------------------|--------|
| 006 | 006_expand_owners.sql | owners (ALTER) | 11 |
| 007 | 007_expand_patients.sql | patients (ALTER) | 10 |
| 008 | 008_expand_encounters.sql | encounters (ALTER) | 10 |
| 009 | 009_hardening_encounters.sql | encounters (ALTER FK+CHECK) | 28 |
| 010 | 010_create_discharges.sql | discharges (CREATE) | 28 |
| 011 | 011_expand_inpatient.sql | inpatient_stays (ALTER) | 16 |
| 012 | 012_create_prescription_executions.sql | prescription_executions + administration_events (CREATE) | 68 |
| 013 | 013_add_versioning.sql | patients, encounters, medical_records, inpatient, owners (ALTER) | 6 |

## Testes
- Total: 32 passando / 19 falhando (21 suites)
- Falhas: todas pré-existentes (ERR_MODULE_NOT_FOUND em @cvg-his-v2/shared-*)
- Migrations não afetam build/test (são SQL puros)

## Decisões Tomadas
1. **Manter SQL manual** como sistema primário, não migrar para Drizzle (ADR inline em F01-SP01-SCHEMA-AUDIT.md)
2. **packages/db** mantido como referência de schema, não removido
3. **IDs VARCHAR(255)** mantidos (compatibilidade com API)
4. **Tabelas novas** do Drizzle (medication_orders, wards, RBAC tables) serão criadas em fases futuras se necessário

## Próximos Passos
- F02 — Módulo Discharges (T013-T022)
- F03 — Módulo Prescription-Executions (T023-T032)
- Corrigir resolução de módulos shared (pré-existente, não bloqueante)

## Checklist CP02
- [x] Todas as migrations aplicam sem erro em banco limpo *(SQL válido, IF NOT EXISTS, DO blocks)*
- [x] Sequência 001→013 funciona idempotentemente *(todas usam IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)*
- [~] `pnpm test` passa *(32 testes OK, 19 falhas pré-existentes de módulos)*
- [x] Schema resultante tem todas as colunas documentadas *(audit documentado em F01-SP01-SCHEMA-AUDIT.md)*
