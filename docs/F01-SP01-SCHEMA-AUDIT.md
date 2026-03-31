# T001/T002 — Auditoria de Schema — Drizzle vs SQL Manual

> Data: 2026-03-30
> Fase: F01 — Fundação de Banco de Dados
> Sprint: SP01

## 1. Tabelas em Comum (comparação de colunas)

### owners
| Coluna | SQL Manual (001) | Drizzle (0000) | Gap |
|--------|------------------|----------------|-----|
| id | VARCHAR(255) PK | UUID PK gen_random_uuid() | ⚠️ Tipo diferente |
| account_id | VARCHAR(255) | UUID FK | ⚠️ Tipo |
| name | VARCHAR(255) NOT NULL | — | ❌ Drizzle não tem `name` |
| full_name | — | TEXT NOT NULL | ❌ Manual não tem `full_name` |
| document_type | VARCHAR(20) | — | ❌ Manual-only |
| document_number | VARCHAR(50) | — | ❌ Manual-only |
| document | — | TEXT | ❌ Drizzle-only |
| email | VARCHAR(255) | TEXT | Diferente tipo |
| phone | VARCHAR(50) | — | ❌ Manual-only |
| phone_main | — | TEXT | ❌ Drizzle-only |
| phone_alt | — | TEXT | ❌ Drizzle-only |
| address | JSONB | — | ❌ Manual-only |
| address_json | — | JSONB | ❌ Drizzle-only |
| status | VARCHAR(20) DEFAULT 'active' | — | ❌ Manual-only |
| unit_id | — | UUID FK | ❌ Drizzle-only |

**Resumo:** Drizzle é mais limpo (full_name, phone_main/alt, address_json). Manual tem status e document_type/document_number.

### patients
| Coluna | SQL Manual | Drizzle | Gap |
|--------|-----------|---------|-----|
| id | VARCHAR(255) | UUID | ⚠️ |
| weight | NUMERIC(10,2) | — | ❌ Manual-only |
| weight_kg | — | NUMERIC(10,3) | ❌ Drizzle-only (mais preciso) |
| microchip | — | TEXT | ❌ Drizzle-only |
| alerts_json | — | JSONB DEFAULT '{}' | ❌ Drizzle-only |
| status | VARCHAR(20) DEFAULT 'active' | — | ❌ Manual-only |
| birth_date | DATE | DATE | ✅ |
| species | VARCHAR(50) | TEXT NOT NULL | ⚠️ Drizzle é NOT NULL |
| sex | VARCHAR(20) | TEXT | ⚠️ |

### encounters
| Coluna | SQL Manual | Drizzle | Gap |
|--------|-----------|---------|-----|
| visit_type | VARCHAR(50) NOT NULL | — | ❌ Manual-only |
| owner_id | VARCHAR(255) NOT NULL | UUID FK | ✅ |
| appointment_id | VARCHAR(255) | — | ❌ Manual-only |
| priority | VARCHAR(20) | — | ❌ Manual-only |
| assigned_to_user_id | VARCHAR(255) | — | ❌ Manual-only |
| chief_complaint | VARCHAR(1000) | — | ❌ Manual-only |
| queued_at/triaged_at/in_care_at | TIMESTAMP | — | ❌ Manual-only |
| reason | — | TEXT | ❌ Drizzle-only |
| opened_by_user_id | — | UUID FK NOT NULL | ❌ Drizzle-only |
| closed_by_user_id | — | UUID FK | ❌ Drizzle-only |
| opened_at | — | TIMESTAMPTZ | ❌ Drizzle-only |
| status | VARCHAR(50) | encounter_status ENUM (open/closed) | ⚠️ Drizzle é ENUM |

### inpatient_stays
| Coluna | SQL Manual | Drizzle | Gap |
|--------|-----------|---------|-----|
| unit | VARCHAR(100) | — | ❌ Manual-only |
| ward | VARCHAR(100) | — | ❌ Manual-only |
| bed | VARCHAR(50) | — | ❌ Manual-only |
| ward_id | — | UUID FK | ❌ Drizzle-only |
| bed_id | — | UUID FK | ❌ Drizzle-only |
| owner_id | — | UUID FK | ❌ Drizzle-only |
| encounter_id | VARCHAR(255) | UUID FK | ⚠️ |
| chief_complaint/reason/plan_summary | — | TEXT | ❌ Drizzle-only |
| admitted_by_user_id | — | UUID FK | ❌ Drizzle-only |
| discharged_by_user_id | — | UUID FK | ❌ Drizzle-only |
| discharged_at | — | TIMESTAMPTZ | ❌ Drizzle-only |

## 2. Tabelas Apenas no Drizzle (Novas)

| Tabela | Descrição | Prioridade |
|--------|-----------|------------|
| `accounts` | Multi-tenant account | 🔴 Crítica |
| `users` | Usuários com password_hash | 🔴 Crítica |
| `roles` | Perfis RBAC | 🔴 Crítica |
| `permissions` | Permissões | 🔴 Crítica |
| `user_roles` | M:N users↔roles | 🔴 Crítica |
| `role_permissions` | M:N roles↔permissions | 🔴 Crítica |
| `units` | Unidades/locais | 🟡 Média |
| `wards` | Alas/setores | 🟡 Média |
| `beds` | Leitos (com ward_id FK) | 🟡 Média |
| `medication_orders` | Prescrições de medicamentos | 🔴 Crítica |
| `medication_order_schedules` | Agendamento de medicação | 🔴 Crítica |
| `medication_administrations` | Administração (com CHECK constraint) | 🔴 Crítica |
| `alerts` | Alertas clínicos | 🟡 Média |
| `clinical_notes` | Notas clínicas (SOAP, versionamento) | 🟡 Média |
| `clinical_note_versions` | Versões de notas | 🟡 Média |
| `documents` | Metadados de documentos | 🟡 Média |
| `encounter_documents` | Vínculo encounter↔documents | 🟡 Média |
| `encounter_billing_items` | Itens de faturamento | 🟡 Média |
| `encounter_financial_accounts` | Conta financeira do atendimento | 🟡 Média |
| `encounter_receivables` | Contas a receber | 🟡 Média |
| `encounter_receivable_payments` | Pagamentos | 🟡 Média |
| `payments` | Pagamentos formais | 🟡 Média |
| `cash_registers` | Caixas | 🟡 Média |
| `cash_movements` | Movimentações de caixa | 🟡 Média |
| `products` | Produtos/serviços | 🟡 Média |
| `services` | Serviços | 🟡 Média |
| `stock_items` | Estoque | 🟡 Média |
| `stock_lots` | Lotes | 🟡 Média |
| `stock_movements` | Movimentações de estoque | 🟡 Média |
| `protocols` | Protocolos clínicos | 🟢 Baixa |
| `protocol_versions` | Versões de protocolos | 🟢 Baixa |
| `protocol_references` | Referências | 🟢 Baixa |
| `protocol_snapshots` | Snapshots | 🟢 Baixa |
| `shift_handovers` | Passagem de plantão | 🟢 Baixa |
| `shift_handover_items` | Itens de passagem | 🟢 Baixa |
| `professional_availability` | Disponibilidade profissional | 🟢 Baixa |
| `appointment_type_configs` | Configuração de tipos de agendamento | 🟢 Baixa |

## 3. Tabelas Apenas no SQL Manual

| Tabela | Descrição | Status |
|--------|-----------|--------|
| `encounter_timeline` | Timeline de eventos do atendimento | ✅ Manter |
| `clinical_entries` | Entradas clínicas (schema mais simples) | ✅ Manter |
| `clinical_timeline` | Timeline clínica | ✅ Manter |
| `medical_records` | Prontuário médico | ✅ Manter |
| `diagnostic_orders` | Pedidos de exame (nome diferente do Drizzle) | ✅ Manter |
| `surgery_cases` | Casos cirúrgicos | ✅ Manter |
| `attachments` | Anexos (schema mais completo) | ✅ Manter |
| `notifications` / `notification_jobs` | Sistema de notificações | ✅ Manter |

## 4. Decisão Estratégica (T003)

**Decisão:** Manter SQL manual como sistema primário (conforme ADR-005) e expandir incrementalmente via migrations. **NÃO migrar para Drizzle.**

**Rationale:**
1. A API já usa `packages/shared/database` com repositories funcionais
2. Drizzle schema tem incompatibilidades de ID type (UUID vs VARCHAR) que quebrariam a API
3. Migration incremental é mais segura que reescrever tudo
4. Features valiosas do Drizzle (medication_orders, RBAC tables, wards/beds) serão adotadas via migrations incrementais

**Plano:**
- Migrations 006-013: expandir schema existente + criar tabelas novas prioritárias
- Adotar estruturas do Drizzle onde fazem sentido (medication_*, RBAC, wards/beds)
- Manter VARCHAR IDs (compatibilidade com API atual)

## 5. Ação — Remoção de packages/db (T004)

**Status:** Decidido manter `packages/db` como referência, mas remover do workspace build.
- Não deve estar em `pnpm-workspace.yaml` para build/test
- Pode ser mantido como documentação de referência do schema Drizzle
