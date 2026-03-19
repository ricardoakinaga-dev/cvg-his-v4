create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  code text,
  description text,
  base_price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_account_name on services(account_id, name);
create index if not exists idx_services_account_active on services(account_id, active);
create unique index if not exists uq_services_account_code on services(account_id, code) where code is not null;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  code text,
  description text,
  base_price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_account_name on products(account_id, name);
create index if not exists idx_products_account_active on products(account_id, active);
create unique index if not exists uq_products_account_code on products(account_id, code) where code is not null;
