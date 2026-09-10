/**
 * Pure SLO comparison helpers shared by the k6 benchmark and Node contracts.
 *
 * Missing or non-finite measurements fail closed. Most SLOs are upper bounds;
 * availability is a lower bound and must opt into `gte` explicitly.
 */
export function evaluateThreshold(actual, target, direction = 'lt') {
  if (!Number.isFinite(actual) || !Number.isFinite(target)) return false;

  switch (direction) {
    case 'gte':
      return actual >= target;
    case 'gt':
      return actual > target;
    case 'lte':
      return actual <= target;
    case 'lt':
      return actual < target;
    default:
      throw new Error(`Unsupported SLO comparison direction: ${direction}`);
  }
}
