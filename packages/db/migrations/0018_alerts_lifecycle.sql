do $$ begin
  create type alert_status as enum ('active', 'acknowledged', 'resolved');
exception
  when duplicate_object then null;
end $$;

alter table alerts
  add column if not exists status alert_status not null default 'active';

alter table alerts
  add column if not exists updated_at timestamptz not null default now();

alter table alerts
  add column if not exists acknowledged_at timestamptz;

alter table alerts
  add column if not exists acknowledged_by_user_id uuid references users(id) on delete set null;

alter table alerts
  add column if not exists resolved_at timestamptz;

alter table alerts
  add column if not exists resolved_by_user_id uuid references users(id) on delete set null;

drop index if exists uq_alerts_order_slot_type;
create unique index if not exists uq_alerts_order_slot_type_active on alerts(order_id, scheduled_for, type) where status != 'resolved';

create index if not exists idx_alerts_account_status_created on alerts(account_id, status, created_at);
