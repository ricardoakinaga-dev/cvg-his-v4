/**
 * Shared Dose Due/Overdue Logic
 *
 * This module provides a single source of truth for determining
 * whether a medication dose is due, overdue, or upcoming.
 * Used by both API and Worker to ensure consistent behavior.
 */
/**
 * Default grace period in minutes before a dose is considered overdue
 */
export const DEFAULT_GRACE_MINUTES = 30;
/**
 * Calculate the status and timing of a medication dose
 *
 * This is the single shared function for determining dose status
 * across both API and Worker components.
 */
export function calculateDoseStatus(input) {
    const { now, scheduledFor, delayedUntil, administrationStatus, graceMinutes = DEFAULT_GRACE_MINUTES } = input;
    // If already administered, return administered status
    if (administrationStatus === 'administered') {
        return {
            status: 'administered',
            delayMinutes: 0,
            isWithinGrace: false,
            isOverdue: false,
            isDue: false,
            effectiveScheduledFor: scheduledFor
        };
    }
    // If refused or held, return that status
    if (administrationStatus === 'refused') {
        return {
            status: 'refused',
            delayMinutes: 0,
            isWithinGrace: false,
            isOverdue: false,
            isDue: false,
            effectiveScheduledFor: scheduledFor
        };
    }
    if (administrationStatus === 'held') {
        return {
            status: 'held',
            delayMinutes: 0,
            isWithinGrace: false,
            isOverdue: false,
            isDue: false,
            effectiveScheduledFor: scheduledFor
        };
    }
    // Handle delayed doses
    if (administrationStatus === 'delayed' && delayedUntil) {
        // If delayed until is in the future, the dose is still delayed
        if (delayedUntil.getTime() > now.getTime()) {
            return {
                status: 'delayed',
                delayMinutes: 0,
                isWithinGrace: false,
                isOverdue: false,
                isDue: false,
                effectiveScheduledFor: delayedUntil
            };
        }
        // If delayed until has passed, check if it's overdue based on delayed time
        const effectiveScheduledFor = delayedUntil;
        const delayMinutes = Math.floor((now.getTime() - effectiveScheduledFor.getTime()) / 60_000);
        const isWithinGrace = delayMinutes <= graceMinutes;
        const isOverdue = delayMinutes > graceMinutes;
        const isDue = delayMinutes >= 0 && isWithinGrace;
        return {
            status: isOverdue ? 'overdue' : (isDue ? 'due' : 'upcoming'),
            delayMinutes: Math.max(0, delayMinutes),
            isWithinGrace,
            isOverdue,
            isDue,
            effectiveScheduledFor
        };
    }
    // Calculate delay for normal scheduled doses
    const delayMinutes = Math.floor((now.getTime() - scheduledFor.getTime()) / 60_000);
    const isWithinGrace = delayMinutes <= graceMinutes;
    const isOverdue = delayMinutes > graceMinutes;
    const isDue = delayMinutes >= 0 && isWithinGrace;
    // Determine status based on timing
    let status;
    if (delayMinutes < 0) {
        status = 'upcoming';
    }
    else if (isOverdue) {
        status = 'overdue';
    }
    else {
        status = 'due';
    }
    return {
        status,
        delayMinutes: Math.max(0, delayMinutes),
        isWithinGrace,
        isOverdue,
        isDue,
        effectiveScheduledFor: scheduledFor
    };
}
/**
 * Calculate severity based on delay minutes
 */
export function calculateDelaySeverity(delayMinutes) {
    if (delayMinutes >= 120) {
        return 'high';
    }
    if (delayMinutes >= 60) {
        return 'medium';
    }
    return 'low';
}
/**
 * Check if a dose should trigger an alert
 */
export function shouldTriggerOverdueAlert(status, delayMinutes, graceMinutes = DEFAULT_GRACE_MINUTES) {
    return status === 'overdue' && delayMinutes > graceMinutes;
}
export function categorizeDoses(doses, now, graceMinutes = DEFAULT_GRACE_MINUTES) {
    const result = {
        overdue: [],
        due: [],
        upcoming: [],
        administered: [],
        delayed: []
    };
    for (const dose of doses) {
        const doseStatus = calculateDoseStatus({
            now,
            scheduledFor: dose.scheduledFor,
            delayedUntil: dose.delayedUntil,
            administrationStatus: dose.administrationStatus,
            graceMinutes
        });
        switch (doseStatus.status) {
            case 'overdue':
                result.overdue.push(dose);
                break;
            case 'due':
                result.due.push(dose);
                break;
            case 'upcoming':
                result.upcoming.push(dose);
                break;
            case 'administered':
                result.administered.push(dose);
                break;
            case 'delayed':
                result.delayed.push(dose);
                break;
            default:
                // refused and held are not included in categorization
                break;
        }
    }
    return result;
}
//# sourceMappingURL=doseDueLogic.js.map