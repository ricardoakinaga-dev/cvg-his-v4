/**
 * First-run provisioning for a freshly migrated installation.
 *
 * Creates the tenant, account (clinic), unit, role catalog and the initial
 * super administrator in a single transaction. This is the supported
 * replacement for well-known seed credentials: the installation starts with no
 * usable account until an operator completes the setup wizard.
 */
import type { Pool, PoolClient } from 'pg';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { hashPassword } from '@cvg-his-v2/module-users';

const DEFAULT_UNIT_CODE = 'hq';
const MAX_SLUG_LENGTH = 64;

/**
 * Setup derives its catalog from the same service that enforces access at
 * runtime. This prevents a migration-only database from bootstrapping an admin
 * with the older, incomplete seed catalog.
 */
const canonicalAccessControl = new AccessControlService();
const canonicalRoles = canonicalAccessControl.listRoles();

export const INITIAL_ROLE_SEEDS: readonly {
  readonly name: string;
  readonly description: string | null;
}[] = canonicalRoles.map((role) => ({
  name: role.code,
  description: role.description ?? null
}));

export const INITIAL_PERMISSION_SEEDS: readonly {
  readonly key: string;
  readonly description: string | null;
}[] = canonicalAccessControl.listPermissions().map((permission) => ({
  key: permission.code,
  description: permission.description ?? null
}));

export const INITIAL_ROLE_PERMISSION_MAP: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(canonicalRoles.map((role) => [role.code, [...role.permissionCodes]]));

const INSTALLER_CAPABILITY_ROLE = 'cvg_installer';

async function withInstallerCapability<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Runtime login roles remain NOINHERIT. Elevate only this connection and
    // only for the atomic capability transaction; the capability role has no
    // direct table grants and cannot be used to create an interactive session.
    await client.query(`SET LOCAL ROLE ${INSTALLER_CAPABILITY_ROLE}`);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export interface InitialProvisioningInput {
  readonly clinicName: string;
  readonly adminUsername: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly adminFullName?: string;
  readonly correlationId: string;
}

export interface InitialProvisioningResult {
  readonly accountId: string;
  readonly userId: string;
  readonly clinicSlug: string;
}

export class InstallationAlreadyProvisionedError extends Error {
  public constructor() {
    super('Installation has already been provisioned');
    this.name = 'InstallationAlreadyProvisionedError';
  }
}

/**
 * Builds a URL-safe account slug from a free-text clinic name.
 *
 * Falls back to a stable default when the name carries no usable characters
 * (for example, a name written entirely in a non-latin script).
 */
export function toAccountSlug(clinicName: string): string {
  const slug = clinicName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return slug.length > 0 ? slug : 'default';
}

/**
 * Reports the durable global installation state through the least-privilege
 * database capability. Tenant-scoped tables cannot answer this before a tenant
 * context exists and deleting the last user must never reopen setup.
 */
export async function isSetupRequired(pool: Pool): Promise<boolean> {
  const result = await withInstallerCapability(pool, (client) =>
    client.query<{ setup_required: boolean }>(
      'SELECT app.is_initial_setup_required() AS setup_required'
    )
  );
  return result.rows[0]?.setup_required === true;
}

/**
 * Creates the tenant, account, unit, roles and super administrator.
 *
 * The database function owns one transaction, singleton claim, catalog
 * validation, RLS context and durable audit so a caller cannot observe or
 * create a partial installation.
 */
export async function provisionInitialInstallation(
  pool: Pool,
  input: InitialProvisioningInput
): Promise<InitialProvisioningResult> {
  const passwordHash = await hashPassword(input.adminPassword);
  const clinicSlug = toAccountSlug(input.clinicName);

  try {
    const result = await withInstallerCapability(pool, (client) =>
      client.query<{
        account_id: string;
        user_id: string;
        clinic_slug: string;
      }>(
        `SELECT account_id, user_id, clinic_slug
         FROM app.provision_initial_installation(
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13
         )`,
        [
          input.clinicName,
          clinicSlug,
          input.clinicName,
          DEFAULT_UNIT_CODE,
          'Unidade Central',
          input.adminUsername,
          input.adminEmail,
          passwordHash,
          input.adminFullName?.trim() || input.adminUsername,
          JSON.stringify(INITIAL_ROLE_SEEDS),
          JSON.stringify(INITIAL_PERMISSION_SEEDS),
          JSON.stringify(INITIAL_ROLE_PERMISSION_MAP),
          input.correlationId
        ]
      )
    );

    const provisioned = result.rows[0];
    if (!provisioned) {
      throw new Error('Installation capability returned no result');
    }

    return {
      accountId: provisioned.account_id,
      userId: provisioned.user_id,
      clinicSlug: provisioned.clinic_slug
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'CVG01'
    ) {
      throw new InstallationAlreadyProvisionedError();
    }
    throw error;
  }
}
