do $$ begin
  create type exam_order_status as enum ('requested', 'collected', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type exam_order_priority as enum ('routine', 'urgent', 'stat');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type exam_category as enum ('laboratory', 'imaging', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type exam_result_status as enum ('draft', 'review_required', 'approved', 'released', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists exam_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  encounter_id uuid references encounters(id) on delete set null,
  requested_by_user_id uuid not null references users(id) on delete restrict,
  category exam_category not null default 'laboratory',
  exam_name text not null,
  exam_code text,
  priority exam_order_priority not null default 'routine',
  status exam_order_status not null default 'requested',
  notes text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_orders_account_patient on exam_orders(account_id, patient_id);
create index if not exists idx_exam_orders_account_encounter on exam_orders(account_id, encounter_id);
create index if not exists idx_exam_orders_account_status on exam_orders(account_id, status);
create index if not exists idx_exam_orders_account_category on exam_orders(account_id, category);

create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  exam_order_id uuid not null references exam_orders(id) on delete cascade,
  category text not null,
  exam_name text not null,
  exam_code text,
  requested_at timestamptz not null,
  status exam_result_status not null default 'draft',
  findings text,
  interpretation text,
  result_values text,
  normal_range text,
  performed_by_user_id uuid references users(id) on delete set null,
  performed_at timestamptz,
  reviewed_by_user_id uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_results_account_patient on exam_results(account_id, patient_id);
create index if not exists idx_exam_results_account_exam_order on exam_results(account_id, exam_order_id);
create index if not exists idx_exam_results_account_category on exam_results(account_id, category);
create index if not exists idx_exam_results_account_status on exam_results(account_id, status);
