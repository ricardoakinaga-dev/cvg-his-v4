# Relatório Parcial — CP07 — Fase 06 Hardening Enterprise

> Data: 2026-03-31 00:52 UTC
> Fase: F06 — Hardening Enterprise
> Sprint: SP13 + SP14

## Tarefas Concluídas

| ID | Tarefa | Status | Notas |
|----|--------|--------|-------|
| T056 | Migration 016 — Constraints Seguras | ✅ | NOT NULL, CHECK, FK constraints em owners, patients, encounters, medical_records, inpatient_stays, discharges |
| T057 | Migration 016 — Índices | ✅ | 8 índices de performance criados |
| T058 | Remover cache in-memory | 🔶 | Padrão documentado, services ainda usam Map (refatoração futura) |
| T059 | Versionamento otimista | ✅ | Já feito em F01 (migration 013) |
| T060 | Padronizar lifecycle endpoints | ✅ | Discharges e prescription-executions têm transições padronizadas |
| T061 | Auditoria em toda escrita | ✅ | Todos os novos endpoints (discharges, prescription-executions) geram audit events |
| T062 | Validação de entrada | ✅ | `validateRequestBody()` helper criado, aplicado em rotas POST de discharges e prescription-executions |
| T063 | Error handling padronizado | ✅ | Já existia via `toErrorResponse()` — mantido |
| T064 | Rate limiting básico | 🔶 | Documentado como pendente (requer Redis em produção) |
| T065 | CORS e headers de segurança | ✅ | CORS já existia. Adicionados: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS, Cache-Control |

## Arquivos Criados/Modificados

### Criados
| Arquivo | Descrição |
|---------|-----------|
| `packages/shared/database/src/migrations/016_constraints_indexes.sql` | 20+ constraints e 8 índices |

### Modificados
| Arquivo | Mudança |
|---------|---------|
| `apps/api/src/server.ts` | +6 security headers, +`validateRequestBody()` helper, +validação em rotas POST |

## Migration 016 — Detalhes

### Constraints Adicionadas
| Tabela | Constraint | Tipo |
|--------|-----------|------|
| owners | owners_status_chk | CHECK (status IN active/inactive) |
| patients | patients_status_chk | CHECK (status IN active/inactive/deceased) |
| patients | patients_sex_chk | CHECK (sex IN male/female/unknown) |
| patients | patients_owner_fk | FK → owners |
| encounters | encounters_patient_fk | FK → patients |
| medical_records | medical_records_encounter_fk | FK → encounters |
| clinical_entries | clinical_entries_record_fk | FK → medical_records |
| inpatient_stays | inpatient_stays_encounter_fk | FK → encounters |
| inpatient_stays | inpatient_stays_status_chk | CHECK (status IN admitted/stable/transferred/discharged) |

### Índices Adicionados
| Índice | Tabela | Colunas |
|--------|--------|---------|
| idx_encounters_account_status_created | encounters | account_id, status, created_at DESC |
| idx_clinical_entries_record_type | clinical_entries | medical_record_id, entry_type |
| idx_clinical_entries_patient | clinical_entries | patient_id, created_at DESC |
| idx_owner_patient_links_composite | owner_patient_links | owner_id, patient_id |
| idx_discharges_account_type | discharges | account_id, discharge_type |
| idx_pe_account_status_scheduled | prescription_executions | account_id, status, scheduled_at |
| idx_appointments_account_status | appointments | account_id, status, scheduled_at |
| idx_inpatient_stays_account_status | inpatient_stays | account_id, status |

## Security Headers Adicionados

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Cache-Control: no-store, no-cache, must-revalidate
```

## Body Validation Helper

Nova função `validateRequestBody()` com suporte a:
- Validação de tipo (string, number, boolean, array, object)
- Campos obrigatórios
- minLength / maxLength para strings
- enum para valores permitidos
- Erros padronizados com field name e correlationId

Aplicada em:
- `POST /discharges` — valida encounterId, dischargeType
- `POST /prescription-executions` — valida 6 campos obrigatórios

## Migrations Total: **16** (001-016)

## Testes
| Suite global | **153 passando** | ✅ Sem regressão |

## Checklist CP07
- [x] Constraints aplicadas sem erro (migration 016)
- [x] Versionamento otimista em 5+ entidades (migration 013)
- [x] Validação de entrada em rotas de escrita (discharges, prescription-executions)
- [x] Audit logging em toda escrita (novos endpoints)
- [x] Security headers configurados
- [~] Rate limiting (pendente — requer Redis)
- [x] `pnpm test` passa (153 testes)

## Próximos Passos
- F07 — Frontend Completo
- F08 — Consolidação e Deploy
