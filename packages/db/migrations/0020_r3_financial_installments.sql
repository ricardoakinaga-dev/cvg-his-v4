alter table encounter_receivables drop constraint if exists uidx_er_encounter;
drop index if exists uidx_er_encounter;

alter table encounter_receivables
  add column if not exists installment_number integer not null default 1,
  add column if not exists installment_label text not null default 'Parcela 1/1',
  add column if not exists due_at timestamptz null;

create unique index if not exists uidx_er_financial_installment
  on encounter_receivables(financial_account_id, installment_number);
create index if not exists idx_er_account_encounter_status
  on encounter_receivables(account_id, encounter_id, status);
create index if not exists idx_er_account_due_at
  on encounter_receivables(account_id, due_at);

create table if not exists encounter_receivable_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  encounter_id uuid not null references encounters(id) on delete cascade,
  financial_account_id uuid not null references encounter_financial_accounts(id) on delete cascade,
  receivable_id uuid not null references encounter_receivables(id) on delete cascade,
  amount_paid numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  paid_by_user_id uuid null references users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_account_receivable_paid_at
  on encounter_receivable_payments(account_id, receivable_id, paid_at desc);
create index if not exists idx_erp_account_financial_paid_at
  on encounter_receivable_payments(account_id, financial_account_id, paid_at desc);
