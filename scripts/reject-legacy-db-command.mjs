#!/usr/bin/env node

const command = process.argv[2] ?? 'database schema command';

console.error(
  `[migration-source] ${command} is disabled outside the canonical packages/db runner. ` +
    'Use @cvg-his/db db:migrate for migrations and packages/db/src/seed.ts for seed data.'
);
process.exitCode = 1;
