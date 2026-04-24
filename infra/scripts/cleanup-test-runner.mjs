#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';
import process from 'node:process';
import { Client } from 'pg';
import {
  parseProcessTable,
  selectOrphanTestProcesses,
  selectStaleTestProcesses
} from './test-runner-cleanup-lib.mjs';

const DEFAULT_TEST_DB_URL = (() => {
  const url = new URL('postgres://localhost:5433/cvg_his_v2_test');
  url.username = 'postgres';
  url.password = 'postgres';
  return url.toString();
})();
const DEFAULT_STALE_AFTER_SECONDS = 15 * 60;

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function log(message) {
  if (!hasFlag('--quiet')) {
    console.log(`[test-runner-cleanup] ${message}`);
  }
}

function getWorkspace() {
  return process.cwd();
}

function resolveAdminDbUrl() {
  const raw = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? DEFAULT_TEST_DB_URL;
  const url = new URL(raw);
  url.pathname = '/postgres';
  return url.toString();
}

function resolveProtectedDbNames() {
  const protectedNames = new Set();
  const candidates = [process.env.DATABASE_URL_TEST, process.env.DATABASE_URL].filter(Boolean);

  for (const candidate of candidates) {
    try {
      protectedNames.add(new URL(candidate).pathname.replace(/^\//, ''));
    } catch {
      // Ignore invalid URLs provided by outer environment.
    }
  }

  return protectedNames;
}

function inspectProcesses() {
  const output = execFileSync('ps', ['-eo', 'pid=,ppid=,etimes=,command='], {
    encoding: 'utf8'
  });
  return parseProcessTable(output).map((processInfo) => {
    try {
      return {
        ...processInfo,
        cwd: readlinkSync(`/proc/${processInfo.pid}/cwd`)
      };
    } catch {
      return processInfo;
    }
  });
}

function trySignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

async function killOrphans() {
  const processes = inspectProcesses();
  const workspace = getWorkspace();
  const orphans = selectOrphanTestProcesses(processes, process.pid, workspace);
  const stale = selectStaleTestProcesses(
    processes,
    process.pid,
    workspace,
    Number(process.env.TEST_RUNNER_STALE_SECONDS ?? DEFAULT_STALE_AFTER_SECONDS)
  );
  const selected = new Map();

  for (const orphan of orphans) {
    selected.set(orphan.pid, orphan);
  }

  for (const staleProcess of stale) {
    selected.set(staleProcess.pid, staleProcess);
  }

  const targets = Array.from(selected.values());

  if (targets.length === 0) {
    log('No orphan or stale test processes found.');
    return [];
  }

  log(`Found ${targets.length} orphan/stale test process(es). Sending SIGTERM...`);
  for (const target of targets) {
    trySignal(target.pid, 'SIGTERM');
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const remainingPids = new Set(inspectProcesses().map((processInfo) => processInfo.pid));
  const survivors = targets.filter((target) => remainingPids.has(target.pid));
  if (survivors.length > 0) {
    log(`Escalating ${survivors.length} orphan/stale test process(es) to SIGKILL...`);
    for (const target of survivors) {
      trySignal(target.pid, 'SIGKILL');
    }
  }

  return targets;
}

async function dropStaleDatabases() {
  const client = new Client({ connectionString: resolveAdminDbUrl() });
  const protectedNames = resolveProtectedDbNames();

  try {
    await client.connect();
  } catch (error) {
    log(`Skipping database cleanup: admin connection unavailable (${error instanceof Error ? error.message : 'unknown error'}).`);
    return [];
  }

  try {
    const result = await client.query(`
      SELECT datname
      FROM pg_database
      WHERE datname LIKE 'cvg_his_v2_test_%'
      ORDER BY datname
    `);

    const dropped = [];
    for (const row of result.rows) {
      const databaseName = row.datname;
      if (!databaseName || protectedNames.has(databaseName)) {
        continue;
      }

      const activeConnections = await client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM pg_stat_activity
          WHERE datname = $1
        `,
        [databaseName]
      );

      if (activeConnections.rows[0]?.count > 0) {
        continue;
      }

      await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      dropped.push(databaseName);
    }

    if (dropped.length === 0) {
      log('No stale ephemeral databases found.');
    } else {
      log(`Dropped ${dropped.length} stale ephemeral database(s): ${dropped.join(', ')}`);
    }

    return dropped;
  } finally {
    await client.end();
  }
}

async function main() {
  const killRequested = hasFlag('--kill-orphans');
  const dropRequested = hasFlag('--drop-stale-dbs');
  let killed = [];
  let dropped = [];

  if (killRequested) {
    killed = await killOrphans();
  }

  if (dropRequested) {
    dropped = await dropStaleDatabases();
  }

  if (hasFlag('--json')) {
    process.stdout.write(
      JSON.stringify(
        {
          killedProcesses: killed.map(({ pid, ppid, elapsedSeconds, command }) => ({
            pid,
            ppid,
            elapsedSeconds,
            command
          })),
          droppedDatabases: dropped
        },
        null,
        2
      )
    );
    process.stdout.write('\n');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
