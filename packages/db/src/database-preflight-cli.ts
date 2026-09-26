import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DatabasePreflightError,
  runDatabasePreflight
} from './database-preflight.js';

interface CliOptions {
  readonly environmentVariable: 'DATABASE_URL' | 'DATABASE_URL_TEST';
  readonly loadEnvFiles: boolean;
  readonly help: boolean;
}

function parseArguments(args: readonly string[]): CliOptions {
  let environmentVariable: CliOptions['environmentVariable'] = 'DATABASE_URL';
  let loadEnvFiles = true;
  let help = false;

  for (const argument of args) {
    if (argument === '--no-env-file') {
      loadEnvFiles = false;
    } else if (argument === '--help' || argument === '-h') {
      help = true;
    } else if (argument === '--url-env=DATABASE_URL') {
      environmentVariable = 'DATABASE_URL';
    } else if (argument === '--url-env=DATABASE_URL_TEST') {
      environmentVariable = 'DATABASE_URL_TEST';
    } else {
      throw new DatabasePreflightError('Unsupported database preflight argument.');
    }
  }

  return { environmentVariable, loadEnvFiles, help };
}

function loadLocalEnvironment(): void {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(currentDirectory, '../../../.env') });
}

async function main(): Promise<void> {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(
        'Usage: db:preflight [--url-env=DATABASE_URL|DATABASE_URL_TEST] [--no-env-file]'
      );
      return;
    }

    if (options.loadEnvFiles) loadLocalEnvironment();
    const connectionString = process.env[options.environmentVariable];
    if (!connectionString) {
      throw new DatabasePreflightError(
        `${options.environmentVariable} is required; no database was contacted.`
      );
    }

    const result = await runDatabasePreflight(connectionString);
    console.log(
      `Local database preflight passed: PostgreSQL ${result.postgresVersion}, `
      + `${result.migrationCount} migrations current, `
      + `${result.schemaTableCount} Drizzle tables present.`
    );
  } catch (error) {
    const message = error instanceof DatabasePreflightError
      ? error.message
      : 'Database preflight failed; credential and connection details were omitted.';
    console.error(message);
    process.exitCode = 1;
  }
}

void main();
