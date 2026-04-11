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

export interface CommissionJobContext {
  readonly correlationId: string;
  readonly environment: string;
  readonly accountId: string;
}

export interface CommissionResult {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalCalculated: number;
  readonly staffCommissions: Array<{
    staffId: string;
    staffName: string;
    commissionAmount: number;
    servicesCount: number;
  }>;
  readonly errors: string[];
}

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

/**
 * Billing item categories for commission calculation.
 */
export const BILLING_CATEGORY_MAP: Record<string, keyof typeof COMMISSION_RATES.veterinarian> = {
  consultation: 'consultation',
  procedure: 'procedure',
  surgery: 'surgery',
  exam: 'exam',
  medication: 'default',
  supply: 'default',
  other: 'default'
};
