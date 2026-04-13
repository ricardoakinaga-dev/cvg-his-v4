/**
 * Attribute-Based Access Control (ABAC) Engine — CVG-HIS-V2
 *
 * Layered on top of the existing RBAC system (AccessControlService).
 * Evaluates fine-grained policies based on actor, resource, and environment attributes.
 *
 * Based on NIST SP 800-162 (ABAC Guide).
 */

import { ForbiddenError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
  OwnerId,
  PatientId,
  StaffId,
  UserId
} from '@cvg-his-v2/shared-types';

// ---------------------------------------------------------------------------
// Attribute sources
// ---------------------------------------------------------------------------

/** Actor attributes — who is requesting the action. */
export interface ActorAttributes {
  readonly userId: UserId;
  readonly accountId: AccountId;
  readonly roleCodes: readonly string[];
  readonly department?: string;
  readonly jobTitle?: string;
  readonly staffId?: StaffId;
  readonly teamIds: readonly string[];
  readonly sectorIds: readonly string[];
  readonly isActive: boolean;
}

/** Resource attributes — what is being accessed. */
export interface ResourceAttributes {
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly ownerId?: OwnerId;
  readonly patientId?: PatientId;
  readonly encounterId?: EncounterId;
  readonly accountId?: AccountId;
  readonly status?: string;
  readonly createdByUserId?: UserId;
  /** Sector where the resource was created (e.g., triage, reception). */
  readonly sectorCode?: string;
}

/** Environment/Context attributes — when/where the request occurs. */
export interface EnvironmentAttributes {
  readonly timestamp: string; // ISO 8601
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
  readonly hourOfDay: number; // 0-23
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export type ResourceType =
  | 'owner'
  | 'patient'
  | 'encounter'
  | 'billing_record'
  | 'billing_item'
  | 'inventory_item'
  | 'staff'
  | 'user'
  | 'appointment'
  | 'notification'
  | 'audit_entry'
  | 'api_key'
  | 'webhook';

// ---------------------------------------------------------------------------
// Policy definition
// ---------------------------------------------------------------------------

export type ConditionOperator =
  | 'eq'      // equals (strict, case-insensitive for strings)
  | 'neq'     // not equals
  | 'in'      // value is in list
  | 'nin'     // value is not in list
  | 'gt'      // greater than (numbers)
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'has'     // array/slice contains value
  | 'regex'   // matches regex
  | 'between' // numeric range [min, max] inclusive
  | 'startsWith'
  | 'endsWith';

export interface PolicyCondition {
  readonly attribute: string; // e.g. 'actor.roleCodes', 'resource.ownerId', 'environment.hourOfDay'
  readonly operator: ConditionOperator;
  readonly value: string | number | readonly string[] | [number, number];
}

/** A single rule within a policy. All conditions must match (AND logic). */
export interface PolicyRule {
  readonly description: string;
  readonly conditions: readonly PolicyCondition[];
  readonly effect: 'permit' | 'deny';
}

/** Policy effect when combined — first-deny wins by default. */
export type PolicyCombiningAlgorithm = 'first-deny' | 'first-permit' | 'deny-over-permit';

/**
 * ABAC Policy definition.
 * Policies are named, versioned rules grouped by resource type.
 */
export interface AbacPolicy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly resourceTypes: readonly ResourceType[];
  readonly actionCodes: readonly string[]; // e.g. 'read', 'write', 'delete', or permission codes
  readonly rules: readonly PolicyRule[];
  readonly combiningAlgorithm: PolicyCombiningAlgorithm;
  readonly enabled: boolean;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Evaluation result
// ---------------------------------------------------------------------------

export interface PolicyEvaluationResult {
  readonly permitted: boolean;
  readonly matchedPolicy?: string;
  readonly matchedRule?: string;
  readonly reason: string;
  readonly evaluatedPolicies: readonly string[];
}

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

function evaluateCondition(condition: PolicyCondition, attrValue: unknown): boolean {
  const { attribute: _attribute, operator, value } = condition;

  switch (operator) {
    case 'eq':
      if (typeof attrValue === 'string' && typeof value === 'string') {
        return attrValue.toLowerCase() === value.toLowerCase();
      }
      return attrValue === value;

    case 'neq':
      if (typeof attrValue === 'string' && typeof value === 'string') {
        return attrValue.toLowerCase() !== value.toLowerCase();
      }
      return attrValue !== value;

    case 'in':
      if (typeof value !== 'object' || !Array.isArray(value)) return false;
      const inList = value as unknown as readonly string[];
      if (Array.isArray(attrValue)) {
        const normalizedList = inList.map((v) => v.toLowerCase());
        return attrValue.some(
          (item) => typeof item === 'string' && normalizedList.includes(item.toLowerCase())
        );
      }
      if (typeof attrValue === 'string') {
        return inList.map((v) => v.toLowerCase()).includes(attrValue.toLowerCase());
      }
      return inList.includes(attrValue as string);

    case 'nin':
      if (typeof value !== 'object' || !Array.isArray(value)) return true;
      const ninList = value as unknown as readonly string[];
      if (Array.isArray(attrValue)) {
        const normalizedList = ninList.map((v) => v.toLowerCase());
        return attrValue.every(
          (item) => typeof item !== 'string' || !normalizedList.includes(item.toLowerCase())
        );
      }
      if (typeof attrValue === 'string') {
        return !ninList.map((v) => v.toLowerCase()).includes(attrValue.toLowerCase());
      }
      return !ninList.includes(attrValue as string);

    case 'gt':
      return typeof attrValue === 'number' && typeof value === 'number' && attrValue > value;

    case 'gte':
      return typeof attrValue === 'number' && typeof value === 'number' && attrValue >= value;

    case 'lt':
      return typeof attrValue === 'number' && typeof value === 'number' && attrValue < value;

    case 'lte':
      return typeof attrValue === 'number' && typeof value === 'number' && attrValue <= value;

    case 'between':
      if (typeof attrValue !== 'number' || !Array.isArray(value) || value.length !== 2) return false;
      return attrValue >= (value[0] as number) && attrValue <= (value[1] as number);

    case 'has':
      if (Array.isArray(attrValue)) return attrValue.includes(value);
      if (typeof attrValue === 'string' && typeof value === 'string') {
        return attrValue.includes(value);
      }
      return false;

    case 'regex': {
      if (typeof attrValue !== 'string' || typeof value !== 'string') return false;
      try {
        return new RegExp(value).test(attrValue);
      } catch {
        return false;
      }
    }

    case 'startsWith':
      return typeof attrValue === 'string' && typeof value === 'string' && attrValue.startsWith(value);

    case 'endsWith':
      return typeof attrValue === 'string' && typeof value === 'string' && attrValue.endsWith(value);

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Attribute resolution
// ---------------------------------------------------------------------------

/**
 * Resolve an attribute path like 'actor.userId' or 'resource.status' to a value.
 */
export function resolveAttribute(
  path: string,
  actor: ActorAttributes,
  resource: ResourceAttributes,
  environment: EnvironmentAttributes
): unknown {
  const [source, ...rest] = path.split('.');
  const key = rest.join('.');
  switch (source) {
    case 'actor':
      return (actor as unknown as Record<string, unknown>)[key];
    case 'resource':
      return (resource as unknown as Record<string, unknown>)[key];
    case 'environment':
      return (environment as unknown as Record<string, unknown>)[key];
    case 'meta':
      if (key === 'timestamp') return Date.now();
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Resolve a condition value that may contain an attribute reference.
 * If `value` is a string like '{{actor.sectorIds}}', resolves it from context.
 * Otherwise returns value as-is.
 */
function resolveConditionValue(
  value: string | number | readonly string[] | [number, number],
  actor: ActorAttributes,
  resource: ResourceAttributes,
  environment: EnvironmentAttributes
): unknown {
  if (typeof value !== 'string') return value;
  const match = value.match(/^\{\{(actor|resource|environment)\.(\w+)\}\}$/);
  if (!match) return value;
  const [, source, key] = match;
  return resolveAttribute(`${source}.${key}`, actor, resource, environment);
}

function evaluateRule(
  rule: PolicyRule,
  actor: ActorAttributes,
  resource: ResourceAttributes,
  environment: EnvironmentAttributes
): boolean {
  for (const condition of rule.conditions) {
    const attrValue = resolveAttribute(condition.attribute, actor, resource, environment);
    const resolvedValue = resolveConditionValue(condition.value, actor, resource, environment);
    if (!evaluateCondition({ ...condition, value: resolvedValue as string | number | readonly string[] | [number, number] }, attrValue)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Default policies (cvghis-clinic-v1)
// ---------------------------------------------------------------------------

export const DEFAULT_ABAC_POLICIES: readonly AbacPolicy[] = [
  // -------------------------------------------------------------------------
  // Owner's pets can only be accessed by staff in the same sector
  // -------------------------------------------------------------------------
  {
    id: 'abac-001',
    name: 'Owner Record Sector Isolation',
    description:
      'Owner records should only be accessible by staff assigned to the same operational sector.',
    version: 1,
    resourceTypes: ['owner'],
    actionCodes: ['owners.read', 'owners.manage'],
    enabled: true,
    tags: ['isolation', 'sector', 'owner'],
    combiningAlgorithm: 'first-deny',
    rules: [
      {
        description: 'Deny access to owner if actor is not in the resource sector',
        conditions: [
          {
            attribute: 'resource.sectorCode',
            operator: 'neq',
            value: '' as unknown as string
          },
          {
            attribute: 'actor.sectorIds',
            operator: 'has',
            value: '{{resource.sectorCode}}'
          }
        ],
        effect: 'deny'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Billing: only finance role or the encounter's responsible staff can write
  // -------------------------------------------------------------------------
  {
    id: 'abac-002',
    name: 'Billing Write Access Control',
    description: 'Only finance role or the staff who opened the encounter can modify billing.',
    version: 1,
    resourceTypes: ['billing_record', 'billing_item'],
    actionCodes: ['billing.manage'],
    enabled: true,
    tags: ['billing', 'financial'],
    combiningAlgorithm: 'deny-over-permit',
    rules: [
      {
        description: 'Deny non-finance roles from modifying billing after encounter is closed',
        conditions: [
          {
            attribute: 'resource.status',
            operator: 'in',
            value: ['settled', 'closed', 'cancelled'] as unknown as readonly string[]
          },
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['finance', 'admin'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Allow finance role to manage billing',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'has',
            value: 'finance'
          }
        ],
        effect: 'permit'
      },
      {
        description: 'Allow admin to manage billing',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'has',
            value: 'admin'
          }
        ],
        effect: 'permit'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Encounter: triage staff can read but only clinical staff can modify clinical status
  // -------------------------------------------------------------------------
  {
    id: 'abac-003',
    name: 'Encounter Clinical Status Isolation',
    description:
      'Clinical encounter status (in_care, observation) can only be modified by veterinarian role.',
    version: 1,
    resourceTypes: ['encounter'],
    actionCodes: ['encounters.manage'],
    enabled: true,
    tags: ['clinical', 'encounter'],
    combiningAlgorithm: 'deny-over-permit',
    rules: [
      {
        description: 'Deny non-clinical roles from transitioning to clinical statuses',
        conditions: [
          {
            attribute: 'resource.status',
            operator: 'in',
            value: ['in_care', 'observation', 'closed'] as unknown as readonly string[]
          },
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['veterinarian', 'admin'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Allow veterinarians to manage encounter clinical status',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'has',
            value: 'veterinarian'
          }
        ],
        effect: 'permit'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Inventory: stock adjustments only during business hours
  // -------------------------------------------------------------------------
  {
    id: 'abac-004',
    name: 'Inventory Business Hours Control',
    description:
      'Inventory write operations are only permitted during business hours (07:00–20:00), except for admins.',
    version: 1,
    resourceTypes: ['inventory_item'],
    actionCodes: ['inventory.manage'],
    enabled: true,
    tags: ['inventory', 'business-hours'],
    combiningAlgorithm: 'first-permit',
    rules: [
      {
        description: 'Deny inventory write outside business hours for non-admin',
        conditions: [
          {
            attribute: 'environment.hourOfDay',
            operator: 'between',
            value: [7, 20] as [number, number]
          },
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['admin', 'inventory'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Permit inventory role during business hours',
        conditions: [
          {
            attribute: 'environment.hourOfDay',
            operator: 'between',
            value: [7, 20] as [number, number]
          },
          {
            attribute: 'actor.roleCodes',
            operator: 'has',
            value: 'inventory'
          }
        ],
        effect: 'permit'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Medical records: only clinical staff can create entries; auditor can only read
  // -------------------------------------------------------------------------
  {
    id: 'abac-005',
    name: 'Medical Records Clinical Isolation',
    description:
      'Medical record entries can only be created by clinical staff (veterinarian, nurse). Auditors can only read.',
    version: 1,
    resourceTypes: ['patient'],
    actionCodes: ['medical-records.manage', 'medical-records.read'],
    enabled: true,
    tags: ['medical-records', 'clinical'],
    combiningAlgorithm: 'first-deny',
    rules: [
      {
        description: 'Deny non-clinical roles from writing medical records',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['veterinarian', 'nurse', 'admin'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Allow clinical roles to write medical records',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'in',
            value: ['veterinarian', 'nurse', 'admin'] as unknown as readonly string[]
          }
        ],
        effect: 'permit'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Audit: only auditor and admin roles can read audit trail
  // -------------------------------------------------------------------------
  {
    id: 'abac-006',
    name: 'Audit Trail Access Control',
    description: 'Audit trail can only be read by auditor and admin roles.',
    version: 1,
    resourceTypes: ['audit_entry'],
    actionCodes: ['audit.read'],
    enabled: true,
    tags: ['audit', 'compliance'],
    combiningAlgorithm: 'first-deny',
    rules: [
      {
        description: 'Deny non-auditor roles from reading audit trail',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['auditor', 'admin'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // API Keys: only admin can manage
  // -------------------------------------------------------------------------
  {
    id: 'abac-007',
    name: 'API Key Management Restriction',
    description: 'API keys are sensitive. Only admin role can create or revoke API keys.',
    version: 1,
    resourceTypes: ['api_key'],
    actionCodes: ['api_keys.manage', 'integrations.manage'],
    enabled: true,
    tags: ['api-keys', 'security'],
    combiningAlgorithm: 'first-deny',
    rules: [
      {
        description: 'Deny non-admin from managing API keys',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'nin',
            value: ['admin'] as unknown as readonly string[]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Allow admin to manage API keys',
        conditions: [
          {
            attribute: 'actor.roleCodes',
            operator: 'in',
            value: ['admin'] as unknown as readonly string[]
          }
        ],
        effect: 'permit'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // Counter Sales: POS terminals — deny if outside operating hours
  // -------------------------------------------------------------------------
  {
    id: 'abac-008',
    name: 'Counter Sale Operating Hours',
    description:
      'Counter sale write operations are restricted to operating hours (08:00–19:00) except for admin.',
    version: 1,
    resourceTypes: ['billing_record'],
    actionCodes: ['counter_sale.write'],
    enabled: true,
    tags: ['counter-sale', 'pos', 'business-hours'],
    combiningAlgorithm: 'first-permit',
    rules: [
      {
        description: 'Deny counter sale write outside operating hours for non-admin',
        conditions: [
          {
            attribute: 'environment.hourOfDay',
            operator: 'between',
            value: [8, 19] as [number, number]
          }
        ],
        effect: 'deny'
      },
      {
        description: 'Permit counter sale write during operating hours',
        conditions: [
          {
            attribute: 'environment.hourOfDay',
            operator: 'between',
            value: [8, 19] as [number, number]
          }
        ],
        effect: 'permit'
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// ABAC Engine
// ---------------------------------------------------------------------------

export interface AbacEngineOptions {
  readonly policies?: readonly AbacPolicy[];
  readonly enabled?: boolean;
}

export class AbacEngine {
  readonly #policies: readonly AbacPolicy[];
  readonly #enabled: boolean;

  public constructor(options: AbacEngineOptions = {}) {
    this.#policies = options.policies ?? DEFAULT_ABAC_POLICIES;
    this.#enabled = options.enabled ?? true;
  }

  /** Returns all registered policies. */
  public listPolicies(): readonly AbacPolicy[] {
    return this.#policies.filter((p) => p.enabled);
  }

  /**
   * Evaluate whether the given actor may perform `actionCode` on `resource`.
   *
   * @param actionCode  The permission/action being performed (e.g. 'billing.manage')
   * @param actor       Attributes of the requesting actor
   * @param resource    Attributes of the target resource
   * @param environment Attributes of the current environment
   */
  public evaluate(
    actionCode: string,
    actor: ActorAttributes,
    resource: ResourceAttributes,
    environment: EnvironmentAttributes
  ): PolicyEvaluationResult {
    if (!this.#enabled) {
      return {
        permitted: true,
        reason: 'ABAC engine is disabled — allowing by default',
        evaluatedPolicies: []
      };
    }

    // Inactive users are always denied
    if (!actor.isActive) {
      return {
        permitted: false,
        reason: 'Actor is inactive',
        evaluatedPolicies: []
      };
    }

    const candidatePolicies = this.#policies.filter(
      (p) =>
        p.enabled &&
        (p.resourceTypes.includes(resource.resourceType) || p.resourceTypes.length === 0) &&
        (p.actionCodes.includes(actionCode) || p.actionCodes.includes('*'))
    );

    if (candidatePolicies.length === 0) {
      return {
        permitted: true,
        reason: `No ABAC policies match (resource=${resource.resourceType}, action=${actionCode}) — default permit`,
        evaluatedPolicies: []
      };
    }

    for (const policy of candidatePolicies) {
      const ruleResults = policy.rules.map((rule) => ({
        rule,
        matched: evaluateRule(rule, actor, resource, environment)
      }));

      const matchedRule = ruleResults.find((r) => r.matched);

      if (!matchedRule) continue; // No rule matched — try next policy

      const { rule } = matchedRule;

      switch (policy.combiningAlgorithm) {
        case 'first-deny':
          if (rule.effect === 'deny') {
            return {
              permitted: false,
              matchedPolicy: policy.id,
              matchedRule: rule.description,
              reason: `Policy '${policy.name}' — ${rule.description}`,
              evaluatedPolicies: candidatePolicies.map((p) => p.id)
            };
          }
          return {
            permitted: true,
            matchedPolicy: policy.id,
            matchedRule: rule.description,
            reason: `Policy '${policy.name}' — ${rule.description}`,
            evaluatedPolicies: candidatePolicies.map((p) => p.id)
          };

        case 'first-permit':
          if (rule.effect === 'permit') {
            return {
              permitted: true,
              matchedPolicy: policy.id,
              matchedRule: rule.description,
              reason: `Policy '${policy.name}' — ${rule.description}`,
              evaluatedPolicies: candidatePolicies.map((p) => p.id)
            };
          }
          break;

        case 'deny-over-permit': {
          if (rule.effect === 'deny') {
            return {
              permitted: false,
              matchedPolicy: policy.id,
              matchedRule: rule.description,
              reason: `Policy '${policy.name}' — ${rule.description}`,
              evaluatedPolicies: candidatePolicies.map((p) => p.id)
            };
          }
          // Continue evaluating — deny takes precedence
          const anyDeny = ruleResults.some((r) => r.matched && r.rule.effect === 'deny');
          if (!anyDeny && ruleResults.some((r) => r.matched)) {
            return {
              permitted: true,
              matchedPolicy: policy.id,
              matchedRule: rule.description,
              reason: `Policy '${policy.name}' — ${rule.description} (deny-over-permit)`,
              evaluatedPolicies: candidatePolicies.map((p) => p.id)
            };
          }
          break;
        }
      }
    }

    // No policy explicitly permitted — default deny for policies that exist
    return {
      permitted: false,
      reason: `No ABAC policy explicitly permitted the action (resource=${resource.resourceType}, action=${actionCode})`,
      evaluatedPolicies: candidatePolicies.map((p) => p.id)
    };
  }

  /**
   * Convenience: deny if ABAC check fails.
   * Throws `ForbiddenError` from `@cvg-his-v2/shared-errors` if evaluation returns false.
   */
  public enforce(
    actionCode: string,
    actor: ActorAttributes,
    resource: ResourceAttributes,
    environment: EnvironmentAttributes
  ): void {
    const result = this.evaluate(actionCode, actor, resource, environment);
    if (!result.permitted) {
      throw new ForbiddenError(result.reason, {
        actionCode,
        matchedPolicy: result.matchedPolicy,
        matchedRule: result.matchedRule,
        evaluatedPolicies: result.evaluatedPolicies
      });
    }
  }
}
