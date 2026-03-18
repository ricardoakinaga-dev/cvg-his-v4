do $$ begin
  create type encounter_financial_status as enum ('pending', 'partial', 'paid');
exception when duplicate_object then null;
end $$;

create table if not exists encounter_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  encounter_id uuid not null references encounters(id) on delete cascade,
  financial_status encounter_financial_status not null default 'pending',
  subtotal_snapshot numeric(12,2) not null default 0,
  discount_total_snapshot numeric(12,2) not null default 0,
  total_snapshot numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  closed_by_user_id uuid references users(id) on delete set null,
  closed_at timestamptz,
  notes text,
  snapshot_json text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uidx_efa_encounter on encounter_financial_accounts(encounter_id);
create index if not exists idx_efa_account_status on encounter_financial_accounts(account_id, financial_status);

do $$ begin
  create type encounter_receivable_status as enum ('open', 'settled');
exception when duplicate_object then null;
end $$;

create table if not exists encounter_receivables (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  encounter_id uuid not null references encounters(id) on delete cascade,
  financial_account_id uuid not null references encounter_financial_accounts(id) on delete cascade,
  status encounter_receivable_status not null default 'open',
  amount_original numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  amount_outstanding numeric(12,2) not null,
  issued_at timestamptz not null default now(),
  settled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uidx_er_encounter on encounter_receivables(encounter_id);
create index if not exists idx_er_account_status on encounter_receivables(account_id, status);
