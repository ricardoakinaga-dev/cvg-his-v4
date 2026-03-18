type DbClient = { $client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> } };

type EncounterStatus = 'open' | 'closed';
type FinancialStatus = 'pending' | 'partial' | 'paid';
type ReceivableStatus = 'open' | 'settled';

export type EncounterReceivablePaymentRecord = {
  id: string;
  receivableId: string;
  financialAccountId: string;
  encounterId: string;
  amountPaid: number;
  paidAt: Date;
  paidByUserId: string | null;
  notes: string | null;
};

export type EncounterReceivableRecord = {
  id: string;
  encounterId: string;
  financialAccountId: string;
  installmentNumber: number;
  installmentLabel: string;
  dueAt: Date | null;
  status: ReceivableStatus;
  amountOriginal: number;
  amountPaid: number;
  amountOutstanding: number;
  issuedAt: Date;
  settledAt: Date | null;
  notes: string | null;
  payments: EncounterReceivablePaymentRecord[];
};

export type EncounterReceivableListItemRecord = EncounterReceivableRecord & {
  encounterStatus: EncounterStatus;
  patientId: string;
  patientName: string;
  patientSpecies: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhoneMain: string | null;
  financialStatus: FinancialStatus;
  totalAmount: number;
  lastClosedAt: Date | null;
};

export type EncounterReceivableListRecord = {
  data: EncounterReceivableListItemRecord[];
  page: number;
  pageSize: number;
  total: number;
  openCount: number;
  settledCount: number;
  totalOutstanding: number;
  totalSettled: number;
};

export type EncounterFinancialSummaryRecord = {
  encounterId: string;
  accountId: string;
  encounterStatus: EncounterStatus;
  financialStatus: FinancialStatus;
  financialClosed: boolean;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  closedAt: Date | null;
  closedByUserId: string | null;
  notes: string | null;
  receivable: EncounterReceivableRecord | null;
  receivables: EncounterReceivableRecord[];
  payments: EncounterReceivablePaymentRecord[];
};

type CloseFinancialInstallmentInput = {
  label?: string;
  amount: number;
  dueAt?: Date | null;
  notes?: string | null;
};

type CloseFinancialInput = {
  accountId: string;
  encounterId: string;
  closedByUserId: string;
  paidAmount: number;
  notes?: string | null;
  installments?: CloseFinancialInstallmentInput[];
};

type ListReceivablesInput = {
  accountId: string;
  status?: ReceivableStatus;
  search?: string;
  encounterId?: string;
  page: number;
  pageSize: number;
};

type SettleReceivableInput = {
  accountId: string;
  receivableId: string;
  amountPaid: number;
  paidByUserId: string;
  notes?: string | null;
};

function parseEncounterStatus(value: unknown): EncounterStatus {
  return String(value) === 'closed' ? 'closed' : 'open';
}

function parseFinancialStatus(value: unknown, balanceDue: number, paidAmount: number): FinancialStatus {
  if (String(value) === 'paid' || balanceDue <= 0) return 'paid';
  if (String(value) === 'partial' || paidAmount > 0) return 'partial';
  return 'pending';
}

function mapPayment(row: Record<string, unknown>): EncounterReceivablePaymentRecord {
  return {
    id: String(row.payment_id ?? row.id),
    receivableId: String(row.payment_receivable_id ?? row.receivable_id),
    financialAccountId: String(row.payment_financial_account_id ?? row.financial_account_id),
    encounterId: String(row.payment_encounter_id ?? row.encounter_id),
    amountPaid: Number(row.payment_amount_paid ?? row.amount_paid ?? 0),
    paidAt: new Date(String(row.payment_paid_at ?? row.paid_at)),
    paidByUserId: row.payment_paid_by_user_id ? String(row.payment_paid_by_user_id) : null,
    notes: row.payment_notes ? String(row.payment_notes) : null
  };
}

function mapReceivableBase(row: Record<string, unknown>): Omit<EncounterReceivableRecord, 'payments'> {
  return {
    id: String(row.receivable_id ?? row.id),
    encounterId: String(row.encounter_id),
    financialAccountId: String(row.financial_account_id),
    installmentNumber: Number(row.installment_number ?? 1),
    installmentLabel: String(row.installment_label ?? `Parcela ${Number(row.installment_number ?? 1)}`),
    dueAt: row.due_at ? new Date(String(row.due_at)) : null,
    status: String(row.receivable_status ?? row.status) === 'settled' ? 'settled' : 'open',
    amountOriginal: Number(row.amount_original ?? 0),
    amountPaid: Number(row.receivable_amount_paid ?? row.amount_paid ?? 0),
    amountOutstanding: Number(row.amount_outstanding ?? 0),
    issuedAt: new Date(String(row.issued_at)),
    settledAt: row.settled_at ? new Date(String(row.settled_at)) : null,
    notes: row.receivable_notes ? String(row.receivable_notes) : row.notes ? String(row.notes) : null
  };
}

function mapReceivable(row: Record<string, unknown> | undefined, payments: EncounterReceivablePaymentRecord[] = []): EncounterReceivableRecord | null {
  if (!row?.receivable_id && !row?.id) return null;
  return { ...mapReceivableBase(row), payments };
}

function mapReceivableListItem(row: Record<string, unknown>, payments: EncounterReceivablePaymentRecord[] = []): EncounterReceivableListItemRecord {
  return {
    ...mapReceivableBase(row),
    payments,
    encounterStatus: parseEncounterStatus(row.encounter_status),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name),
    patientSpecies: row.patient_species ? String(row.patient_species) : null,
    ownerId: String(row.owner_id),
    ownerName: String(row.owner_name),
    ownerPhoneMain: row.owner_phone_main ? String(row.owner_phone_main) : null,
    financialStatus: parseFinancialStatus(row.financial_status, Number(row.amount_outstanding ?? 0), Number(row.amount_paid ?? 0)),
    totalAmount: Number(row.total_amount ?? 0),
    lastClosedAt: row.closed_at ? new Date(String(row.closed_at)) : null
  };
}

function sumReceivables(receivables: EncounterReceivableRecord[]) {
  return receivables.reduce(
    (acc, current) => {
      acc.paidAmount += current.amountPaid;
      acc.balanceDue += current.amountOutstanding;
      return acc;
    },
    { paidAmount: 0, balanceDue: 0 }
  );
}

export function createEncounterFinancialRepo(db: DbClient) {
  async function listPaymentsByReceivableIds(accountId: string, receivableIds: string[]) {
    if (receivableIds.length === 0) return new Map<string, EncounterReceivablePaymentRecord[]>();
    const placeholders = receivableIds.map((_, index) => `$${index + 2}`).join(', ');
    const result = await db.$client.query(
      `select
         id as payment_id,
         receivable_id as payment_receivable_id,
         financial_account_id as payment_financial_account_id,
         encounter_id as payment_encounter_id,
         amount_paid as payment_amount_paid,
         paid_at as payment_paid_at,
         paid_by_user_id as payment_paid_by_user_id,
         notes as payment_notes
       from encounter_receivable_payments
       where account_id = $1
         and receivable_id in (${placeholders})
       order by paid_at desc, created_at desc`,
      [accountId, ...receivableIds]
    );

    const grouped = new Map<string, EncounterReceivablePaymentRecord[]>();
    for (const raw of result.rows as Record<string, unknown>[]) {
      const payment = mapPayment(raw);
      const current = grouped.get(payment.receivableId) ?? [];
      current.push(payment);
      grouped.set(payment.receivableId, current);
    }
    return grouped;
  }

  async function listPaymentsByFinancialAccountId(accountId: string, financialAccountId: string) {
    const result = await db.$client.query(
      `select
         id as payment_id,
         receivable_id as payment_receivable_id,
         financial_account_id as payment_financial_account_id,
         encounter_id as payment_encounter_id,
         amount_paid as payment_amount_paid,
         paid_at as payment_paid_at,
         paid_by_user_id as payment_paid_by_user_id,
         notes as payment_notes
       from encounter_receivable_payments
       where account_id = $1
         and financial_account_id = $2
       order by paid_at desc, created_at desc`,
      [accountId, financialAccountId]
    );
    return (result.rows as Record<string, unknown>[]).map(mapPayment);
  }

  async function listReceivablesByFinancialAccountId(accountId: string, financialAccountId: string) {
    const result = await db.$client.query(
      `select
         id as receivable_id,
         encounter_id,
         financial_account_id,
         installment_number,
         installment_label,
         due_at,
         status as receivable_status,
         amount_original,
         amount_paid as receivable_amount_paid,
         amount_outstanding,
         issued_at,
         settled_at,
         notes as receivable_notes
       from encounter_receivables
       where account_id = $1
         and financial_account_id = $2
       order by installment_number asc, issued_at asc`,
      [accountId, financialAccountId]
    );
    const rows = result.rows as Record<string, unknown>[];
    const paymentsByReceivable = await listPaymentsByReceivableIds(accountId, rows.map((row) => String(row.receivable_id)));
    return rows.map((row) => mapReceivable(row, paymentsByReceivable.get(String(row.receivable_id)) ?? [])!).filter(Boolean) as EncounterReceivableRecord[];
  }

  return {
    async getSummary(accountId: string, encounterId: string): Promise<EncounterFinancialSummaryRecord | null> {
      const result = await db.$client.query(
        `with billing as (
            select
              e.id as encounter_id,
              e.account_id,
              e.status as encounter_status,
              coalesce(sum(ebi.unit_price * ebi.quantity), 0)::numeric(12,2) as subtotal_amount,
              coalesce(sum(ebi.discount_amount), 0)::numeric(12,2) as discount_total,
              coalesce(sum(ebi.line_total), 0)::numeric(12,2) as total_amount
            from encounters e
            left join encounter_billing_items ebi
              on ebi.encounter_id = e.id
             and ebi.account_id = e.account_id
           where e.account_id = $1
             and e.id = $2
           group by e.id, e.account_id, e.status
         )
         select
           b.encounter_id,
           b.account_id,
           b.encounter_status,
           b.subtotal_amount,
           b.discount_total,
           b.total_amount,
           (efa.id is not null) as financial_closed,
           efa.id as financial_account_id,
           efa.financial_status,
           efa.paid_amount,
           coalesce(efa.balance_due, b.total_amount) as balance_due,
           efa.closed_at,
           efa.closed_by_user_id,
           efa.notes
         from billing b
         left join encounter_financial_accounts efa
           on efa.encounter_id = b.encounter_id
          and efa.account_id = b.account_id
         limit 1`,
        [accountId, encounterId]
      );

      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      const financialAccountId = row.financial_account_id ? String(row.financial_account_id) : null;
      const receivables = financialAccountId ? await listReceivablesByFinancialAccountId(accountId, financialAccountId) : [];
      const payments = financialAccountId ? await listPaymentsByFinancialAccountId(accountId, financialAccountId) : [];
      const totals = receivables.length > 0 ? sumReceivables(receivables) : {
        paidAmount: Number(row.paid_amount ?? 0),
        balanceDue: Number(row.balance_due ?? row.total_amount ?? 0)
      };

      return {
        encounterId: String(row.encounter_id),
        accountId: String(row.account_id),
        encounterStatus: parseEncounterStatus(row.encounter_status),
        financialStatus: parseFinancialStatus(row.financial_status, totals.balanceDue, totals.paidAmount),
        financialClosed: Boolean(row.financial_closed),
        subtotal: Number(row.subtotal_amount ?? 0),
        discountTotal: Number(row.discount_total ?? 0),
        total: Number(row.total_amount ?? 0),
        paidAmount: totals.paidAmount,
        balanceDue: totals.balanceDue,
        closedAt: row.closed_at ? new Date(String(row.closed_at)) : null,
        closedByUserId: row.closed_by_user_id ? String(row.closed_by_user_id) : null,
        notes: row.notes ? String(row.notes) : null,
        receivable: receivables[0] ?? null,
        receivables,
        payments
      };
    },

    async closeFinancial(input: CloseFinancialInput): Promise<EncounterFinancialSummaryRecord | null> {
      const summary = await this.getSummary(input.accountId, input.encounterId);
      if (!summary) return null;

      const paidAmount = Math.min(Math.max(input.paidAmount, 0), summary.total);
      const remaining = Math.max(summary.total - paidAmount, 0);
      const normalizedInstallments = remaining <= 0
        ? []
        : (input.installments?.length
          ? input.installments.map((item, index) => ({
              installmentNumber: index + 1,
              installmentLabel: item.label?.trim() || `Parcela ${index + 1}/${input.installments!.length}`,
              dueAt: item.dueAt ?? null,
              amountOriginal: Number(item.amount),
              notes: item.notes?.trim() || input.notes?.trim() || null
            }))
          : [{ installmentNumber: 1, installmentLabel: 'Parcela 1/1', dueAt: null, amountOriginal: remaining, notes: input.notes?.trim() || null }]);

      const installmentTotal = normalizedInstallments.reduce((sum, item) => sum + item.amountOriginal, 0);
      const targetOutstanding = remaining;
      const difference = Number((targetOutstanding - installmentTotal).toFixed(2));
      if (normalizedInstallments.length > 0 && difference !== 0) {
        normalizedInstallments[normalizedInstallments.length - 1]!.amountOriginal = Number((normalizedInstallments[normalizedInstallments.length - 1]!.amountOriginal + difference).toFixed(2));
      }

      const balanceDue = Math.max(targetOutstanding, 0);
      const financialStatus: FinancialStatus = balanceDue === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
      const snapshotJson = JSON.stringify({
        encounterId: summary.encounterId,
        encounterStatus: summary.encounterStatus,
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        total: summary.total,
        paidAmount,
        balanceDue,
        installments: normalizedInstallments,
        closedAt: new Date().toISOString()
      });

      await db.$client.query(
        `insert into encounter_financial_accounts (
           account_id, encounter_id, financial_status, subtotal_snapshot, discount_total_snapshot, total_snapshot,
           paid_amount, balance_due, closed_by_user_id, closed_at, notes, snapshot_json, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10,$11,now())
         on conflict (encounter_id) do update set
           financial_status = excluded.financial_status,
           subtotal_snapshot = excluded.subtotal_snapshot,
           discount_total_snapshot = excluded.discount_total_snapshot,
           total_snapshot = excluded.total_snapshot,
           paid_amount = excluded.paid_amount,
           balance_due = excluded.balance_due,
           closed_by_user_id = excluded.closed_by_user_id,
           closed_at = excluded.closed_at,
           notes = excluded.notes,
           snapshot_json = excluded.snapshot_json,
           updated_at = now()`,
        [input.accountId, input.encounterId, financialStatus, summary.subtotal, summary.discountTotal, summary.total, paidAmount, balanceDue, input.closedByUserId, input.notes ?? null, snapshotJson]
      );

      const financialAccountResult = await db.$client.query(
        `select id from encounter_financial_accounts where account_id = $1 and encounter_id = $2 limit 1`,
        [input.accountId, input.encounterId]
      );
      const financialAccountId = String((financialAccountResult.rows[0] as Record<string, unknown>).id);

      await db.$client.query(
        `delete from encounter_receivables where account_id = $1 and financial_account_id = $2`,
        [input.accountId, financialAccountId]
      );

      if (normalizedInstallments.length === 0) {
        await db.$client.query(
          `insert into encounter_receivables (
             account_id, encounter_id, financial_account_id, installment_number, installment_label, due_at,
             status, amount_original, amount_paid, amount_outstanding, issued_at, settled_at, notes, updated_at
           ) values ($1,$2,$3,1,'Quitado à vista',null,'settled',0,$4,0,now(),now(),$5,now())`,
          [input.accountId, input.encounterId, financialAccountId, paidAmount, input.notes ?? null]
        );
      } else {
        for (const installment of normalizedInstallments) {
          await db.$client.query(
            `insert into encounter_receivables (
               account_id, encounter_id, financial_account_id, installment_number, installment_label, due_at,
               status, amount_original, amount_paid, amount_outstanding, issued_at, settled_at, notes, updated_at
             ) values ($1,$2,$3,$4,$5,$6,'open',$7,0,$7,now(),null,$8,now())`,
            [
              input.accountId,
              input.encounterId,
              financialAccountId,
              installment.installmentNumber,
              installment.installmentLabel,
              installment.dueAt,
              installment.amountOriginal,
              installment.notes
            ]
          );
        }
      }

      if (paidAmount > 0) {
        const initialReceivableResult = await db.$client.query(
          `select id, installment_number
             from encounter_receivables
            where account_id = $1
              and financial_account_id = $2
            order by installment_number asc
            limit 1`,
          [input.accountId, financialAccountId]
        );
        const firstReceivable = initialReceivableResult.rows[0] as Record<string, unknown> | undefined;
        if (firstReceivable) {
          await db.$client.query(
            `insert into encounter_receivable_payments (
               account_id, encounter_id, financial_account_id, receivable_id, amount_paid, paid_by_user_id, notes
             ) values ($1,$2,$3,$4,$5,$6,$7)`,
            [input.accountId, input.encounterId, financialAccountId, String(firstReceivable.id), paidAmount, input.closedByUserId, input.notes ?? null]
          );
        }
      }

      return this.getSummary(input.accountId, input.encounterId);
    },

    async listReceivables(input: ListReceivablesInput): Promise<EncounterReceivableListRecord> {
      const search = input.search?.trim() ? `%${input.search.trim()}%` : null;
      const offset = (input.page - 1) * input.pageSize;

      const result = await db.$client.query(
        `with filtered as (
           select
             er.id as receivable_id,
             er.encounter_id,
             er.financial_account_id,
             er.installment_number,
             er.installment_label,
             er.due_at,
             er.status as receivable_status,
             er.amount_original,
             er.amount_paid,
             er.amount_outstanding,
             er.issued_at,
             er.settled_at,
             er.notes,
             e.status as encounter_status,
             e.patient_id,
             p.name as patient_name,
             p.species as patient_species,
             e.owner_id,
             o.full_name as owner_name,
             o.phone_main as owner_phone_main,
             efa.financial_status,
             efa.total_snapshot as total_amount,
             efa.closed_at
           from encounter_receivables er
           inner join encounters e on e.id = er.encounter_id and e.account_id = er.account_id
           inner join patients p on p.id = e.patient_id and p.account_id = e.account_id
           inner join owners o on o.id = e.owner_id and o.account_id = e.account_id
           inner join encounter_financial_accounts efa on efa.id = er.financial_account_id and efa.account_id = er.account_id
           where er.account_id = $1
             and ($2::text is null or er.status = $2::encounter_receivable_status)
             and ($3::uuid is null or er.encounter_id = $3)
             and (
               $4::text is null
               or p.name ilike $4
               or o.full_name ilike $4
               or coalesce(o.phone_main, '') ilike $4
               or er.installment_label ilike $4
             )
         ),
         totals as (
           select
             count(*)::int as total,
             count(*) filter (where receivable_status = 'open')::int as open_count,
             count(*) filter (where receivable_status = 'settled')::int as settled_count,
             coalesce(sum(amount_outstanding), 0)::numeric(12,2) as total_outstanding,
             coalesce(sum(amount_paid), 0)::numeric(12,2) as total_settled
           from filtered
         )
         select f.*, t.total, t.open_count, t.settled_count, t.total_outstanding, t.total_settled
         from filtered f
         cross join totals t
         order by case when f.receivable_status = 'open' then 0 else 1 end, coalesce(f.due_at, f.issued_at) asc, f.patient_name asc, f.installment_number asc
         offset $5 limit $6`,
        [input.accountId, input.status ?? null, input.encounterId ?? null, search, offset, input.pageSize]
      );

      const rows = result.rows as Record<string, unknown>[];
      const paymentsByReceivable = await listPaymentsByReceivableIds(input.accountId, rows.map((row) => String(row.receivable_id)));
      if (rows.length === 0) {
        const totalsResult = await db.$client.query(
          `select
             count(*)::int as total,
             count(*) filter (where status = 'open')::int as open_count,
             count(*) filter (where status = 'settled')::int as settled_count,
             coalesce(sum(amount_outstanding), 0)::numeric(12,2) as total_outstanding,
             coalesce(sum(amount_paid), 0)::numeric(12,2) as total_settled
           from encounter_receivables
           where account_id = $1
             and ($2::text is null or status = $2::encounter_receivable_status)
             and ($3::uuid is null or encounter_id = $3)`,
          [input.accountId, input.status ?? null, input.encounterId ?? null]
        );
        const totals = (totalsResult.rows[0] ?? {}) as Record<string, unknown>;
        return {
          data: [],
          page: input.page,
          pageSize: input.pageSize,
          total: Number(totals.total ?? 0),
          openCount: Number(totals.open_count ?? 0),
          settledCount: Number(totals.settled_count ?? 0),
          totalOutstanding: Number(totals.total_outstanding ?? 0),
          totalSettled: Number(totals.total_settled ?? 0)
        };
      }

      const first = rows[0];
      return {
        data: rows.map((row) => mapReceivableListItem(row, paymentsByReceivable.get(String(row.receivable_id)) ?? [])),
        page: input.page,
        pageSize: input.pageSize,
        total: Number(first.total ?? 0),
        openCount: Number(first.open_count ?? 0),
        settledCount: Number(first.settled_count ?? 0),
        totalOutstanding: Number(first.total_outstanding ?? 0),
        totalSettled: Number(first.total_settled ?? 0)
      };
    },

    async settleReceivable(input: SettleReceivableInput): Promise<EncounterReceivableRecord | null> {
      const lookup = await db.$client.query(
        `select er.*, efa.encounter_id
           from encounter_receivables er
           inner join encounter_financial_accounts efa
             on efa.id = er.financial_account_id
            and efa.account_id = er.account_id
          where er.account_id = $1
            and er.id = $2
          limit 1`,
        [input.accountId, input.receivableId]
      );
      const current = lookup.rows[0] as Record<string, unknown> | undefined;
      if (!current) return null;

      const currentAmountPaid = Number(current.amount_paid ?? 0);
      const currentOutstanding = Number(current.amount_outstanding ?? 0);
      const increment = Math.min(Math.max(input.amountPaid, 0), currentOutstanding);
      const nextPaid = currentAmountPaid + increment;
      const nextOutstanding = Math.max(currentOutstanding - increment, 0);
      const nextStatus: ReceivableStatus = nextOutstanding <= 0 ? 'settled' : 'open';
      const nextNotes = input.notes?.trim() || (current.notes ? String(current.notes) : null);
      const financialAccountId = String(current.financial_account_id);
      const encounterId = String(current.encounter_id);

      await db.$client.query(
        `update encounter_receivables
            set amount_paid = $3,
                amount_outstanding = $4,
                status = $5::encounter_receivable_status,
                settled_at = case when $5::encounter_receivable_status = 'settled' then now() else null end,
                notes = $6,
                updated_at = now()
          where account_id = $1
            and id = $2`,
        [input.accountId, input.receivableId, nextPaid, nextOutstanding, nextStatus, nextNotes]
      );

      await db.$client.query(
        `insert into encounter_receivable_payments (
           account_id, encounter_id, financial_account_id, receivable_id, amount_paid, paid_by_user_id, notes
         ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [input.accountId, encounterId, financialAccountId, input.receivableId, increment, input.paidByUserId, input.notes ?? null]
      );

      const accountTotalsResult = await db.$client.query(
        `select
           coalesce(sum(amount_paid), 0)::numeric(12,2) as paid_amount,
           coalesce(sum(amount_outstanding), 0)::numeric(12,2) as balance_due
         from encounter_receivables
         where account_id = $1
           and financial_account_id = $2`,
        [input.accountId, financialAccountId]
      );
      const totals = (accountTotalsResult.rows[0] ?? {}) as Record<string, unknown>;
      const totalPaid = Number(totals.paid_amount ?? 0);
      const totalBalanceDue = Number(totals.balance_due ?? 0);
      const financialStatus: FinancialStatus = totalBalanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

      await db.$client.query(
        `update encounter_financial_accounts
            set paid_amount = $3,
                balance_due = $4,
                financial_status = $5::encounter_financial_status,
                notes = coalesce($6, notes),
                updated_at = now()
          where account_id = $1
            and id = $2`,
        [input.accountId, financialAccountId, totalPaid, totalBalanceDue, financialStatus, nextNotes]
      );

      const refreshed = await db.$client.query(
        `select
            id as receivable_id,
            encounter_id,
            financial_account_id,
            installment_number,
            installment_label,
            due_at,
            status as receivable_status,
            amount_original,
            amount_paid as receivable_amount_paid,
            amount_outstanding,
            issued_at,
            settled_at,
            notes as receivable_notes
          from encounter_receivables
          where account_id = $1
            and id = $2
          limit 1`,
        [input.accountId, input.receivableId]
      );

      const paymentsByReceivable = await listPaymentsByReceivableIds(input.accountId, [input.receivableId]);
      return mapReceivable(refreshed.rows[0] as Record<string, unknown> | undefined, paymentsByReceivable.get(input.receivableId) ?? []);
    }
  };
}
