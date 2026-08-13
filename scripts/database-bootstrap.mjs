import { pathToFileURL } from 'node:url';

import {
  parseRuntimeRoleProvisioningConfig,
  provisionRuntimeRole
} from './provision-database-runtime-role.mjs';

export async function runDatabaseBootstrap({
  environment,
  migrate,
  parseConfig = parseRuntimeRoleProvisioningConfig,
  provisionRole = provisionRuntimeRole
}) {
  const runtimeUrl = environment.DATABASE_RUNTIME_URL?.trim();
  if (!runtimeUrl) {
    throw new Error('DATABASE_RUNTIME_URL is required');
  }

  await migrate();
  const runtimeEnvironment = Object.freeze({
    ...environment,
    DATABASE_URL: runtimeUrl
  });
  const config = parseConfig(runtimeEnvironment);
  return provisionRole(config);
}

async function main() {
  const { runMigrations } = await import('@cvg-his/db/dist/migrate.js');
  const inspection = await runDatabaseBootstrap({
    environment: process.env,
    migrate: runMigrations
  });
  console.log(
    `Database migrations and runtime role bootstrap completed for ${inspection.roleName}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
