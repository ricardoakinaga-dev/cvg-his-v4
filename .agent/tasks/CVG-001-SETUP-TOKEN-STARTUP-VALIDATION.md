# CVG-001 — fail-fast validation of the explicit setup token

**Status:** `COMPLETE_BOUNDED` — parent CVG-001 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Priority:** `P0`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-001 secure installation-to-session lifecycle  
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-IR-001`

## Residual problem

The first-run setup barrier requires an explicit high-entropy
`SETUP_BOOTSTRAP_TOKEN`. `apps/api/src/setup-token.ts` validates the value only
when the API runtime later resolves it, while shared configuration accepts the
optional string and `apps/api/src/startup-secrets.ts` can inject a Vault value
before calling `loadApiConfig`. A weak managed-secret value can therefore pass
startup resolution and fail later, after more of the API has been constructed.
The current distinct-character rule also accepts an obvious short-period
repetition such as `01234567` repeated six times.

## Frozen bounded contract

1. Every configured setup token, whether supplied directly by environment or
   resolved from the managed-secret provider, is validated before the API
   startup config is returned.
2. A configured token must retain the existing minimum length and whitespace
   rules, meet the existing distinct-character floor and reject an obviously
   short-period repeating pattern. Validation errors are generic and never
   contain the candidate secret.
3. An absent or blank token keeps setup mutation disabled; the change does not
   generate, log, return or persist a replacement secret.
4. Exact constant-time token comparison and existing setup HTTP response,
   sentinel, audit and provisioning semantics remain unchanged.
5. No migration, sentinel/schema change, token rotation, MFA, Redis,
   distributed state, provider, target, deployment, production, release or
   global ERP scope is authorized.

## TDD and quality bar

### RED

- Add a startup-secrets test proving a weak Vault-resolved token fails before
  `loadApiConfig` is called and the error does not echo it.
- Add setup-token coverage proving a long periodic token is rejected.
- Add shared-config coverage proving direct environment values are rejected at
  `loadApiConfig` time.
- Record the intentional RED before changing production code.

### GREEN

- Introduce one reusable, secret-redacting setup-token validator at the shared
  config boundary and invoke it after managed-secret resolution.
- Keep the local setup-token helper behavior and public constants compatible.
- Run focused config/startup/token tests, API regression, typecheck/build,
  security/static checks and official coverage.
- Obtain a fresh independent read-only review before bounded closure.

## Explicit non-claims

This slice proves only fail-fast strength validation at local config/startup
boundaries. It does not certify the durable installation sentinel, the setup
transaction, authentication, refresh/revocation, MFA/WebAuthn/FIDO2, Redis,
providers, target operations, production, deployment, release, accessibility,
Vetus parity or global ERP readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-001`
- `packages/shared/config/src/index.ts`
- `apps/api/src/startup-secrets.ts`
- `apps/api/src/setup-token.ts`
- `packages/shared/config/src/config.test.ts`
- `tests/unit/api/startup-secrets-runtime.test.ts`
- `apps/api/src/setup-token.test.ts`

## Decision boundary

Only setup-token strength validation and its direct configuration/startup
tests are authorized. Stop and request fresh authority before changing the
installation sentinel, setup schema/transaction, token rotation, authentication
policy, MFA, Redis/distributed state, providers, target operations or any
production/deployment/release/global ERP behavior.

## Bounded closure — 2026-08-30

The implementation and verification contract is complete within the frozen
scope. Shared config validates direct values, startup-secrets validates
managed/Vault-resolved values before returning startup state, and the setup
helper reuses the same secret-redacting validator. Missing/blank values remain
disabled; comparison, setup responses and sentinel/provisioning behavior remain
unchanged.

Evidence:

- `.agent/artifacts/CVG-001-setup-token-startup-validation-2026-08-30.md`
- `.agent/gates/verified-CVG-001-setup-token-startup-validation.json`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-RED-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-001-SETUP-TOKEN-STARTUP-VALIDATION-CONTROL-PLANE-001`

Independent review returned `APPROVE_BOUNDED`. Residual risk remains `HIGH`:
this task does not certify production, target, provider homologation, parity,
or global ERP readiness. Next activity is fresh residual scouting under a new
authority.
