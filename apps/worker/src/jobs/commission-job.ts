/**
 * Commission Calculator Job
 *
 * Calculates and distributes commissions for staff members based on:
 * - Services rendered (encounter-based)
 * - Products sold (billing-based)
 * - Staff type (veterinarian, assistant, admin)
 *
 * Commission rates are configurable per staff type and service category.
 * Results are stored in the billing module for reporting.
 */

import type { Logger } from '@cvg-his-v2/shared-logging';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { StaffService } from '@cvg-his-v2/module-staff';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  BillingRecordSummary,
  BillingItemSummary,
  StaffSummary
} from '@cvg-his-v2/shared-types';

export interface CommissionJobContext {
  readonly correlationId: string;
  readonly environment: string;
  readonly accountId: string;
  readonly logger?: Logger;
}

export interface CommissionResult {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalCalculated: number;
  readonly staffCommissions: Array<{
    staffId: string;
    staffName: string;
    staffType: StaffType;
    commissionAmount: number;
    servicesCount: number;
    itemsCount: number;
  }>;
  readonly errors: string[];
}

export type StaffType = 'veterinarian' | 'assistant' | 'admin' | 'other';

/**
 * Commission rate configuration by staff type.
 * Rates are percentages (0-100).
 */
export const COMMISSION_RATES = {
  veterinarian: {
    consultation: 15,
    procedure: 20,
    surgery: 25,
    exam: 10,
    default: 10
  },
  assistant: {
    consultation: 5,
    procedure: 8,
    surgery: 10,
    exam: 5,
    default: 5
  },
  admin: {
    default: 0 // Admins typically don't receive commission
  }
} as const;

type CommissionRateKey = keyof typeof COMMISSION_RATES.veterinarian;

/**
 * Billing item categories for commission calculation.
 */
export const BILLING_CATEGORY_MAP: Record<string, CommissionRateKey> = {
  consultation: 'consultation',
  procedure: 'procedure',
  surgery: 'surgery',
  exam: 'exam',
  medication: 'default',
  supply: 'default',
  other: 'default',
  daily_rate: 'default'
} as const;

/**
 * Determine staff type from job title or department.
 */
export function classifyStaffType(staff: StaffSummary): StaffType {
  const title = (staff.jobTitle ?? '').toLowerCase();
  const dept = (staff.department ?? '').toLowerCase();

  if (
    title.includes('veterin') ||
    title.includes('vet_') ||
    dept.includes('clinica') ||
    dept.includes('veterina')
  ) {
    return 'veterinarian';
  }
  if (
    title.includes('assistente') ||
    title.includes('auxiliar') ||
    title.includes('tecnico') ||
    title.includes('enfermeir') ||
    dept.includes('enfermagem') ||
    dept.includes('triagem') ||
    dept.includes('atendimento')
  ) {
    return 'assistant';
  }
  if (
    title.includes('admin') ||
    title.includes('diretor') ||
    title.includes('gerente') ||
    dept.includes('governanca') ||
    dept.includes('financeiro') ||
    dept.includes('administr')
  ) {
    return 'admin';
  }
  return 'other';
}

/**
 * Get commission rate for a staff type and billing category.
 */
export function getCommissionRate(staffType: StaffType, billingCategory: string): number {
  const category = BILLING_CATEGORY_MAP[billingCategory] ?? 'default';
  if (staffType === 'admin' || staffType === 'other') {
    return 0;
  }
  const rates = COMMISSION_RATES[staffType];
  return rates[category] ?? rates.default;
}

/**
 * Calculate commission for a single billing item.
 */
export function calculateItemCommission(item: BillingItemSummary, staffType: StaffType): number {
  const rate = getCommissionRate(staffType, item.itemType);
  return Number(((item.totalAmount * rate) / 100).toFixed(2));
}

/**
 * Run the commission calculation job for a given period.
 *
 * @param billingService - Billing service instance with access to billing records and items
 * @param staffService - Staff service instance for staff classification
 * @param encountersService - Encounters service for encounter context
 * @param periodStart - ISO date string for period start (inclusive)
 * @param periodEnd - ISO date string for period end (inclusive)
 * @param context - Job execution context
 */
export async function runCommissionJob(
  billingService: BillingService,
  staffService: StaffService,
  encountersService: EncountersService,
  periodStart: string,
  periodEnd: string,
  context: CommissionJobContext
): Promise<CommissionResult> {
  const { logger } = context;
  const errors: string[] = [];
  const staffAccumulator = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      staffType: StaffType;
      commissionAmount: number;
      servicesCount: number;
      itemsCount: number;
    }
  >();

  let totalCalculated = 0;

  try {
    // Get all encounters in the period
    const encounters = encountersService
      .listAll()
      .filter((enc: { openedAt?: string; status: string }) => {
        const encDate = enc.openedAt ?? '';
        return encDate >= periodStart && encDate <= periodEnd && enc.status !== 'reception';
      });

    if (encounters.length === 0) {
      logger?.info('Commission job: no encounters in period', { periodStart, periodEnd });
      return {
        periodStart,
        periodEnd,
        totalCalculated: 0,
        staffCommissions: [],
        errors: []
      };
    }

    // Process each encounter's billing records
    for (const encounter of encounters) {
      const billingRecords = billingService.list(encounter.accountId, encounter.id);
      const settledRecords = billingRecords.filter(
        (r: { status: string }) => r.status === 'settled' || r.status === 'estimated'
      );

      for (const record of settledRecords) {
        const items = await billingService.listItems(encounter.accountId, encounter.id);

        for (const item of items) {
          if (item.totalAmount <= 0) continue;

          // Find the staff member responsible for this item
          const staff = staffService.findByUserId(item.createdByUserId);
          if (!staff) {
            errors.push(`Staff not found for userId: ${item.createdByUserId}, item: ${item.id}`);
            continue;
          }

          const staffType = classifyStaffType(staff);
          if (staffType === 'admin' || staffType === 'other') {
            continue; // No commission for admin/other
          }

          const commission = calculateItemCommission(item, staffType);
          if (commission <= 0) continue;

          const existing = staffAccumulator.get(staff.id);
          if (existing) {
            existing.commissionAmount += commission;
            existing.servicesCount += 1;
            existing.itemsCount += 1;
          } else {
            staffAccumulator.set(staff.id, {
              staffId: staff.id,
              staffName: staff.fullName,
              staffType,
              commissionAmount: commission,
              servicesCount: 1,
              itemsCount: 1
            });
          }
          totalCalculated += commission;
        }
      }
    }

    logger?.info('Commission job completed', {
      periodStart,
      periodEnd,
      totalCalculated,
      staffCount: staffAccumulator.size
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Job error: ${message}`);
    logger?.error('Commission job failed', { periodStart, periodEnd, error: message });
  }

  const staffCommissions = Array.from(staffAccumulator.values()).sort(
    (a, b) => b.commissionAmount - a.commissionAmount
  );

  return {
    periodStart,
    periodEnd,
    totalCalculated: Number(totalCalculated.toFixed(2)),
    staffCommissions,
    errors: []
  };
}
