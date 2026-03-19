-- Professional availability: recurring weekly schedule
create table if not exists professional_availability (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  professional_user_id uuid not null references users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30,
  notes text,
  constraint chk_prof_avail_time_range check (end_time > start_time)
);

create unique index if not exists uq_prof_avail_account_prof_day
  on professional_availability(account_id, professional_user_id, day_of_week);
create index if not exists idx_prof_avail_account_prof
  on professional_availability(account_id, professional_user_id);

-- Appointment type configs: custom types per account
create table if not exists appointment_type_configs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  default_duration_minutes integer not null default 30,
  color text,
  active boolean not null default true
);

create unique index if not exists uq_appt_type_config_account_code
  on appointment_type_configs(account_id, code);
create index if not exists idx_appt_type_config_account_name
  on appointment_type_configs(account_id, name);
create index if not exists idx_appt_type_config_account_active
  on appointment_type_configs(account_id, active);
