-- Seed Script: CVG-HIS-V2
-- Popula banco com dados iniciais para desenvolvimento/demo
-- Executar APÓS migrations 001-016

-- === ROLES ===
INSERT INTO roles (id, name, description, created_at) VALUES
  ('role_admin', 'admin', 'Administrador do sistema', NOW()),
  ('role_reception', 'reception', 'Recepção e triagem', NOW()),
  ('role_veterinarian', 'veterinarian', 'Médico veterinário', NOW()),
  ('role_nurse', 'nurse', 'Enfermagem', NOW()),
  ('role_auditor', 'auditor', 'Auditoria e governança', NOW())
ON CONFLICT (id) DO NOTHING;

-- === PERMISSIONS (sample) ===
INSERT INTO permissions (id, key, description, created_at) VALUES
  ('perm_001', 'owners.read', 'Visualizar tutores', NOW()),
  ('perm_002', 'owners.manage', 'Criar/editar tutores', NOW()),
  ('perm_003', 'patients.read', 'Visualizar pacientes', NOW()),
  ('perm_004', 'patients.manage', 'Criar/editar pacientes', NOW()),
  ('perm_005', 'encounters.read', 'Visualizar atendimentos', NOW()),
  ('perm_006', 'encounters.manage', 'Criar/editar atendimentos', NOW()),
  ('perm_007', 'medical-records.read', 'Visualizar prontuário', NOW()),
  ('perm_008', 'medical-records.manage', 'Criar/editar prontuário', NOW()),
  ('perm_009', 'inpatient.read', 'Visualizar internações', NOW()),
  ('perm_010', 'inpatient.manage', 'Gerenciar internações', NOW()),
  ('perm_011', 'discharges.read', 'Visualizar altas', NOW()),
  ('perm_012', 'discharges.manage', 'Registrar altas', NOW()),
  ('perm_013', 'prescription-executions.read', 'Visualizar execuções de prescrição', NOW()),
  ('perm_014', 'prescription-executions.manage', 'Gerenciar execuções de prescrição', NOW()),
  ('perm_015', 'diagnostics.read', 'Visualizar exames', NOW()),
  ('perm_016', 'diagnostics.manage', 'Gerenciar exames', NOW()),
  ('perm_017', 'surgeries.read', 'Visualizar cirurgias', NOW()),
  ('perm_018', 'surgeries.manage', 'Gerenciar cirurgias', NOW()),
  ('perm_019', 'billing.read', 'Visualizar faturamento', NOW()),
  ('perm_020', 'billing.manage', 'Gerenciar faturamento', NOW()),
  ('perm_021', 'inventory.read', 'Visualizar estoque', NOW()),
  ('perm_022', 'inventory.manage', 'Gerenciar estoque', NOW()),
  ('perm_023', 'audit.read', 'Visualizar auditoria', NOW()),
  ('perm_024', 'users.read', 'Visualizar usuários', NOW()),
  ('perm_025', 'users.manage', 'Gerenciar usuários', NOW()),
  ('perm_026', 'access-control.read', 'Visualizar permissões', NOW()),
  ('perm_027', 'access-control.manage', 'Gerenciar permissões', NOW())
ON CONFLICT (id) DO NOTHING;

-- === ADMIN ROLE → ALL PERMISSIONS ===
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- === VETERINARIAN ROLE → clinical permissions ===
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('role_veterinarian', 'perm_001'), ('role_veterinarian', 'perm_003'),
  ('role_veterinarian', 'perm_005'), ('role_veterinarian', 'perm_006'),
  ('role_veterinarian', 'perm_007'), ('role_veterinarian', 'perm_008'),
  ('role_veterinarian', 'perm_009'), ('role_veterinarian', 'perm_010'),
  ('role_veterinarian', 'perm_011'), ('role_veterinarian', 'perm_012'),
  ('role_veterinarian', 'perm_013'), ('role_veterinarian', 'perm_014'),
  ('role_veterinarian', 'perm_015'), ('role_veterinarian', 'perm_016'),
  ('role_veterinarian', 'perm_017'), ('role_veterinarian', 'perm_018')
ON CONFLICT DO NOTHING;

-- === NURSE ROLE ===
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('role_nurse', 'perm_003'), ('role_nurse', 'perm_005'),
  ('role_nurse', 'perm_007'), ('role_nurse', 'perm_009'),
  ('role_nurse', 'perm_013'), ('role_nurse', 'perm_014'),
  ('role_nurse', 'perm_015')
ON CONFLICT DO NOTHING;

-- === SECTORS ===
INSERT INTO sectors (id, account_id, code, name, kind, active, created_at, updated_at) VALUES
  ('sector_clinic', 'acc_cvg_demo', 'CLI', 'Clinica Geral', 'clinic', true, NOW(), NOW()),
  ('sector_surgery', 'acc_cvg_demo', 'CIR', 'Centro Cirurgico', 'surgery', true, NOW(), NOW()),
  ('sector_icu', 'acc_cvg_demo', 'UTI', 'UTI Veterinaria', 'icu', true, NOW(), NOW()),
  ('sector_iso', 'acc_cvg_demo', 'ISO', 'Isolamento', 'isolation', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- === BEDS ===
INSERT INTO beds (id, account_id, sector_id, code, name, status, active, created_at, updated_at) VALUES
  ('bed_cli_01', 'acc_cvg_demo', 'sector_clinic', 'CLI-01', 'Leito Clinica 1', 'available', true, NOW(), NOW()),
  ('bed_cli_02', 'acc_cvg_demo', 'sector_clinic', 'CLI-02', 'Leito Clinica 2', 'available', true, NOW(), NOW()),
  ('bed_cir_01', 'acc_cvg_demo', 'sector_surgery', 'CIR-01', 'Mesa Cirurgica 1', 'available', true, NOW(), NOW()),
  ('bed_uti_01', 'acc_cvg_demo', 'sector_icu', 'UTI-01', 'Leito UTI 1', 'available', true, NOW(), NOW()),
  ('bed_uti_02', 'acc_cvg_demo', 'sector_icu', 'UTI-02', 'Leito UTI 2', 'available', true, NOW(), NOW()),
  ('bed_iso_01', 'acc_cvg_demo', 'sector_iso', 'ISO-01', 'Leito Isolamento 1', 'available', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- === SEED USERS ===
INSERT INTO users (id, account_id, email, password_hash, full_name, is_active, created_at, updated_at) VALUES
  ('user_admin', 'acc_cvg_demo', 'admin@cvg.dev', 'seed_placeholder_hash', 'Administrador CVG', true, NOW(), NOW()),
  ('user_vet', 'acc_cvg_demo', 'vet@cvg.dev', 'seed_placeholder_hash', 'Dr. Veterinario', true, NOW(), NOW()),
  ('user_nurse', 'acc_cvg_demo', 'enfermeiro@cvg.dev', 'seed_placeholder_hash', 'Enfermeiro CVG', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES
  ('user_admin', 'role_admin'),
  ('user_vet', 'role_veterinarian'),
  ('user_nurse', 'role_nurse')
ON CONFLICT DO NOTHING;

-- === SEED OWNERS ===
INSERT INTO owners (id, account_id, name, full_name, document_type, document_number, email, phone, status, created_at, updated_at) VALUES
  ('owner_maria', 'acc_cvg_demo', 'Maria Silva', 'Maria Silva', 'cpf', '111.111.111-11', 'maria@example.com', '+55 11 99999-1111', 'active', NOW(), NOW()),
  ('owner_joao', 'acc_cvg_demo', 'Joao Souza', 'Joao Souza', 'cpf', '222.222.222-22', 'joao@example.com', '+55 11 98888-2222', 'active', NOW(), NOW()),
  ('owner_ana', 'acc_cvg_demo', 'Ana Costa', 'Ana Costa', 'cpf', '333.333.333-33', 'ana@example.com', '+55 11 97777-3333', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- === SEED PATIENTS ===
INSERT INTO patients (id, account_id, owner_id, name, species, breed, sex, weight, status, created_at, updated_at) VALUES
  ('patient_luna', 'acc_cvg_demo', 'owner_maria', 'Luna', 'Cao', 'Golden Retriever', 'female', 28.5, 'active', NOW(), NOW()),
  ('patient_thor', 'acc_cvg_demo', 'owner_joao', 'Thor', 'Cao', 'Pastor Alemao', 'male', 35.0, 'active', NOW(), NOW()),
  ('patient_mimi', 'acc_cvg_demo', 'owner_ana', 'Mimi', 'Gato', 'Persa', 'female', 4.2, 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner-Patient links
INSERT INTO owner_patient_links (id, owner_id, patient_id, relationship, is_primary, created_at) VALUES
  ('link_01', 'owner_maria', 'patient_luna', 'tutor', true, NOW()),
  ('link_02', 'owner_joao', 'patient_thor', 'tutor', true, NOW()),
  ('link_03', 'owner_ana', 'patient_mimi', 'tutor', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- === SEED ENCOUNTER ===
INSERT INTO encounters (id, account_id, owner_id, patient_id, visit_type, status, priority, chief_complaint, created_at, updated_at) VALUES
  ('enc_luna_checkup', 'acc_cvg_demo', 'owner_maria', 'patient_luna', 'consultation', 'open', 'normal', 'Checkup de rotina', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- === SEED MEDICAL RECORD ===
INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, created_at, updated_at) VALUES
  ('mr_luna_01', 'acc_cvg_demo', 'enc_luna_checkup', 'patient_luna', 'open', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- === SEED INVENTORY ===
INSERT INTO inventory_items (id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount, created_at, updated_at) VALUES
  ('inv_dipyrone', 'acc_cvg_demo', 'MED-001', 'Dipirona Injetavel', 'ampola', 24, 5, 12.50, NOW(), NOW()),
  ('inv_gauze', 'acc_cvg_demo', 'MAT-014', 'Gaze Esteril', 'pacote', 60, 10, 4.20, NOW(), NOW()),
  ('inv_catheter', 'acc_cvg_demo', 'MAT-021', 'Cateter Intravenoso', 'unidade', 18, 4, 8.90, NOW(), NOW()),
  ('inv_amoxicillin', 'acc_cvg_demo', 'MED-002', 'Amoxicilina 500mg', 'comprimido', 100, 20, 1.80, NOW(), NOW()),
  ('inv_syringe', 'acc_cvg_demo', 'MAT-030', 'Seringa 10ml', 'unidade', 50, 10, 2.50, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Seed completed successfully!' as status;
