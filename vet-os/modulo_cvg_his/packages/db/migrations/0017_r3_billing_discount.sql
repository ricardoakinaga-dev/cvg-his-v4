alter table encounter_billing_items
  add column if not exists discount_amount numeric(12,2) not null default 0;

update encounter_billing_items
set discount_amount = 0
where discount_amount is null;

alter table encounter_billing_items
  drop constraint if exists chk_ebi_discount_nonnegative;

alter table encounter_billing_items
  add constraint chk_ebi_discount_nonnegative check (discount_amount >= 0);

alter table encounter_billing_items
  drop constraint if exists chk_ebi_discount_not_gt_gross;

alter table encounter_billing_items
  add constraint chk_ebi_discount_not_gt_gross check (discount_amount <= (unit_price * quantity));
