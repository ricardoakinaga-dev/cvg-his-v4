do $$ begin
  create type appointment_status as enum ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type appointment_type as enum ('consultation', 'vaccination', 'surgery', 'exam', 'return', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  professional_user_id uuid not null references users(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  type appointment_type not null default 'consultation',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_account_start on appointments(account_id, start_at);
create index if not exists idx_appointments_account_professional on appointments(account_id, professional_user_id, start_at);
create index if not exists idx_appointments_account_patient on appointments(account_id, patient_id);
create index if not exists idx_appointments_account_status on appointments(account_id, status);
