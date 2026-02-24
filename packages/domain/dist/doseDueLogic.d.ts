/**
 * Shared Dose Due/Overdue Logic
 *
 * This module provides a single source of truth for determining
 * whether a medication dose is due, overdue, or upcoming.
 * Used by both API and Worker to ensure consistent behavior.
 */
export type DoseStatus = 'administered' | 'due' | 'overdue' | 'upcoming' | 'delayed' | 'refused' | 'held';
export type AdministrationStatus = 'administered' | 'refused' | 'delayed' | 'held';
export type DoseDueInput = {
    now: Date;
    scheduledFor: Date;
    delayedUntil?: Date | null;
    administrationStatus?: AdministrationStatus | null;
    graceMinutes?: number;
};
export type DoseDueResult = {
    status: DoseStatus;
    delayMinutes: number;
    isWithinGrace: boolean;
    isOverdue: boolean;
    isDue: boolean;
    effectiveScheduledFor: Date;
};
/**
 * Default grace period in minutes before a dose is considered overdue
 */
export declare const DEFAULT_GRACE_MINUTES = 30;
/**
 * Calculate the status and timing of a medication dose
 *
 * This is the single shared function for determining dose status
 * across both API and Worker components.
 */
export declare function calculateDoseStatus(input: DoseDueInput): DoseDueResult;
/**
 * Calculate severity based on delay minutes
 */
export declare function calculateDelaySeverity(delayMinutes: number): 'low' | 'medium' | 'high';
/**
 * Check if a dose should trigger an alert
 */
export declare function shouldTriggerOverdueAlert(status: DoseStatus, delayMinutes: number, graceMinutes?: number): boolean;
/**
 * Get doses categorized by status
 */
export type CategorizedDoses<T> = {
    overdue: T[];
    due: T[];
    upcoming: T[];
    administered: T[];
    delayed: T[];
};
export declare function categorizeDoses<T extends {
    scheduledFor: Date;
    delayedUntil?: Date | null;
    administrationStatus?: AdministrationStatus | null;
}>(doses: T[], now: Date, graceMinutes?: number): CategorizedDoses<T>;
//# sourceMappingURL=doseDueLogic.d.ts.map