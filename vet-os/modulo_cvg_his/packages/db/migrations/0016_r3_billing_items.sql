do $$ begin
  create type billing_item_type as enum ('service', 'product');
exception
  when duplicate_object then null;
end $$;

create table if not exists encounter_billing_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  encounter_id uuid not null references encounters(id) on delete cascade,
  item_type billing_item_type not null,
  catalog_item_id uuid,
  name_snapshot text not null,
  code_snapshot text,
  unit_price numeric(12,2) not null,
  quantity integer not null default 1,
  line_total numeric(12,2) not null,
  notes text,
  created_by_user_id uuid not null references users(id),
  updated_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ebi_account_encounter on encounter_billing_items(account_id, encounter_id);
create index if not exists idx_ebi_account_type on encounter_billing_items(account_id, item_type);
