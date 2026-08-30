#!/usr/bin/env node

import {
  constants as fsConstants,
  chmodSync,
  closeSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve, win32 } from 'node:path';
import process from 'node:process';

export const DEFAULT_RUNNER_TIMEOUT_MS = 600_000;
export const MIN_RUNNER_TIMEOUT_MS = 1_000;
export const MAX_RUNNER_TIMEOUT_MS = 900_000;
export const TERMINATION_GRACE_MS = 10_000;
const DIAGNOSTIC_LIMIT = 4_000;
const DIAGNOSTIC_LOOKBEHIND = 4_096;
const GROUP_CLEANUP_POLL_MS = 25;
const GROUP_CLEANUP_HARD_GRACE_MS = 1_000;
const WINDOWS_TREE_COMMAND_TIMEOUT_MS = 5_000;
const WINDOWS_HELPER_CLOSE_GRACE_MS = 100;
const WINDOWS_FORCE_RESERVE_MS = WINDOWS_TREE_COMMAND_TIMEOUT_MS * 2;
const WINDOWS_TREE_CLEANUP_BUDGET_MS =
  TERMINATION_GRACE_MS + GROUP_CLEANUP_HARD_GRACE_MS + WINDOWS_FORCE_RESERVE_MS;
const MAX_WINDOWS_TREE_PIDS = 256;
const WINDOWS_OWNED_PROCESS_SUPERVISOR_PATH = resolve(
  process.cwd(),
  'infra/scripts/windows-owned-process-supervisor.ps1'
);
const WINDOWS_IDENTITY_TERMINATOR_PATH = resolve(
  process.cwd(),
  'infra/scripts/windows-terminate-owned-process.ps1'
);
const WINDOWS_POWERSHELL_PATH = (() => {
  if (process.platform !== 'win32') return 'powershell.exe';
  const configuredRoot = process.env.SystemRoot ?? process.env.WINDIR;
  const systemRoot =
    typeof configuredRoot === 'string' && /^[A-Za-z]:[\\/][^<>:\"|?*\r\n]+$/.test(configuredRoot)
      ? configuredRoot
      : 'C:\\Windows';
  return win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
})();
const WINDOWS_TREE_QUERY = [
  '$ErrorActionPreference = "Stop"',
  '$root = [int]$env:CVG_CRITICAL_ROOT_PID',
  '$processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate)',
  '$rootProcess = $processes | Where-Object { [int]$_.ProcessId -eq $root } | Select-Object -First 1',
  '$pending = New-Object System.Collections.Queue',
  '$pending.Enqueue($root)',
  '$found = New-Object System.Collections.ArrayList',
  '$foundIds = New-Object "System.Collections.Generic.HashSet[int]"',
  'while ($pending.Count -gt 0) {',
  '  $parent = $pending.Dequeue()',
  '  foreach ($process in $processes) {',
  '    $childId = [int]$process.ProcessId',
  '    if ([int]$process.ParentProcessId -eq [int]$parent -and $childId -ne $root -and $foundIds.Add($childId)) {',
  '      [void]$found.Add($process)',
  '      $pending.Enqueue($childId)',
  '    }',
  '  }',
  '}',
  '$rootIdentity = if ($null -eq $rootProcess) { "none" } else { "{0}@{1}" -f $rootProcess.ProcessId, $rootProcess.CreationDate.ToFileTimeUtc() }',
  '$descendantIdentities = ($found | ForEach-Object { "{0}@{1}" -f $_.ProcessId, $_.CreationDate.ToFileTimeUtc() }) -join ","',
  'Write-Output ("CVG_CRITICAL_TREE_OK:ROOT=" + $rootIdentity + "|DESC=" + $descendantIdentities)'
].join(';');
const WINDOWS_IDENTITY_QUERY = [
  '$ErrorActionPreference = "Stop"',
  '$expected = @{}',
  'foreach ($identity in ($env:CVG_CRITICAL_PROCESS_IDENTITIES -split ",")) {',
  '  if ($identity -notmatch "^(\\d+)@(\\d+)$") { exit 4 }',
  '  $expected[$Matches[1]] = [int64]$Matches[2]',
  '}',
  '$processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, CreationDate)',
  'foreach ($processId in $expected.Keys) {',
  '  $process = $processes | Where-Object { [string]$_.ProcessId -eq [string]$processId } | Select-Object -First 1',
  '  if ($null -eq $process -or [int64]$process.CreationDate.ToFileTimeUtc() -ne $expected[$processId]) { exit 5 }',
  '}',
  'Write-Output "CVG_CRITICAL_IDENTITY_OK"'
].join(';');
const MAX_SANITIZED_REPORT_BYTES = 1_000_000;
const MAX_REPORT_INPUT_BYTES = MAX_SANITIZED_REPORT_BYTES;
const MAX_REPORT_NODES = 10_000;
const SENSITIVE_KEY_PATTERN =
  /(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|encryption[_-]?key|database[_-]?url|redis[_-]?url|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential(?:s)?|connection(?:string)?|dsn|db[_-]?url|signing[_-]?key)/i;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|encryption[_-]?key|database[_-]?url|redis[_-]?url|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential(?:s)?|connection(?:string)?|dsn|db[_-]?url|signing[_-]?key)[A-Za-z0-9_-]*["']?\s*[=:]\s*/i;
const SENSITIVE_FLAG_PATTERN =
  /((?:^|[\s"'`])--?(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|encryption[_-]?key|database[_-]?url|redis[_-]?url|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential(?:s)?|connection(?:string)?|dsn|db[_-]?url|signing[_-]?key)(?:[A-Za-z0-9_-]*)?(?:\s+|=))(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s"'`-][^\s"'`]*)/gi;
const SENSITIVE_STREAM_PATTERN = new RegExp(
  `${SENSITIVE_ASSIGNMENT_PATTERN.source}|${SENSITIVE_FLAG_PATTERN.source}|Bearer\\s+|(?:rediss?|postgres(?:ql)?|mysql|mariadb|mongodb(?:\\+srv)?|amqps?|https?):\\/\\/[^\\s/:@]*:`,
  'i'
);

function errorCode(error) {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : error ? String(error) : null;
}

export function resolveRunnerTimeoutMs(rawValue = process.env.CRITICAL_PROCESS_TIMEOUT_MS) {
  const normalizedRawValue =
    rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
  if (normalizedRawValue === '') return DEFAULT_RUNNER_TIMEOUT_MS;
  const value = Number(normalizedRawValue);
  if (
    !Number.isSafeInteger(value) ||
    value < MIN_RUNNER_TIMEOUT_MS ||
    value > MAX_RUNNER_TIMEOUT_MS
  ) {
    throw new Error(
      `CRITICAL_PROCESS_TIMEOUT_MS must be an integer between ${MIN_RUNNER_TIMEOUT_MS} and ${MAX_RUNNER_TIMEOUT_MS}`
    );
  }
  return value;
}

export function sanitizeDiagnostic(value, limit = DIAGNOSTIC_LIMIT) {
  const normalizedLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : DIAGNOSTIC_LIMIT;
  const redacted = String(value ?? '')
    .replace(
      /((?:^|[\s{"'])(?=[A-Za-z0-9_-]*?(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|encryption[_-]?key|database[_-]?url|redis[_-]?url|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential(?:s)?|connection(?:string)?|dsn|db[_-]?url|signing[_-]?key)[A-Za-z0-9_-]*["']?\s*[=:]\s*["']?)[A-Za-z][A-Za-z0-9_-]*["']?\s*[=:]\s*["']?)(?:Bearer\s+)?[^"'\r\n,;}]+/gi,
      '$1[REDACTED]'
    )
    .replace(
      /([?&#][^&#=\s"'`]*?(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|encryption[_-]?key|database[_-]?url|redis[_-]?url|service[_-]?role(?:[_-]?key)?|access[_-]?token|refresh[_-]?token|client[_-]?secret|credential(?:s)?|connection(?:string)?|dsn|db[_-]?url|signing[_-]?key)[^&#=\s"'`]*(?:=|%3d))[^&#\s"'`]*/gi,
      '$1[REDACTED]'
    )
    .replace(
      /((?:rediss?|postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|amqps?|https?):\/\/[^\s/:@]*:)[^\s@]+(@)/gi,
      '$1[REDACTED]$2'
    )
    .replace(SENSITIVE_FLAG_PATTERN, '$1[REDACTED]')
    .replace(/(Bearer\s+)[^"'\r\n,;}]+/gi, '$1[REDACTED]');
  const structurallyRedacted = redacted
    .split('\n')
    .map((line) => {
      const match = SENSITIVE_ASSIGNMENT_PATTERN.exec(line);
      return match ? `${line.slice(0, match.index + match[0].length)}[REDACTED]` : line;
    })
    .join('\n');
  if (structurallyRedacted.length <= normalizedLimit) return structurallyRedacted;
  const suffix = '\n...[truncated]';
  return `${structurallyRedacted.slice(0, Math.max(0, normalizedLimit - suffix.length))}${suffix}`;
}

function isOwnedProcessGroupAlive(child) {
  if (process.platform === 'win32' || !child?.pid) return false;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    return errorCode(error) !== 'ESRCH';
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function remainingMilliseconds(deadline) {
  return Math.max(0, deadline - Date.now());
}

function runWindowsHelper(
  command,
  args,
  env,
  captureOutput = false,
  deadline = Date.now() + WINDOWS_TREE_COMMAND_TIMEOUT_MS
) {
  return new Promise((resolveHelper) => {
    const availableMs = Math.min(WINDOWS_TREE_COMMAND_TIMEOUT_MS, remainingMilliseconds(deadline));
    if (availableMs <= 0) {
      resolveHelper({ status: null, output: '', closed: false });
      return;
    }
    const timeoutMs = Math.max(
      1,
      availableMs - Math.min(WINDOWS_HELPER_CLOSE_GRACE_MS, availableMs - 1)
    );

    let settled = false;
    let output = '';
    let timeoutHandle;
    let killWaitHandle;
    let helperClosed = false;
    const settle = (status, closed = helperClosed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(killWaitHandle);
      resolveHelper({ status, output, closed });
    };

    let helper;
    try {
      helper = spawn(command, args, {
        env,
        shell: false,
        windowsHide: true,
        stdio: captureOutput ? ['ignore', 'pipe', 'ignore'] : 'ignore'
      });
    } catch {
      settle(null, false);
      return;
    }

    if (captureOutput) {
      helper.stdout?.setEncoding('utf8');
      helper.stdout?.on('data', (chunk) => {
        if (output.length < 8_192) output += String(chunk).slice(0, 8_192 - output.length);
      });
    }
    helper.once('error', () => {
      if (helperClosed) settle(null, true);
    });
    helper.once('close', (status) => {
      helperClosed = true;
      settle(status, true);
    });
    timeoutHandle = setTimeout(() => {
      try {
        helper.kill();
      } catch {
        // The helper may already have exited.
      }
      const closeWaitMs = Math.min(WINDOWS_HELPER_CLOSE_GRACE_MS, remainingMilliseconds(deadline));
      if (closeWaitMs <= 0) {
        settle(null, false);
        return;
      }
      killWaitHandle = setTimeout(() => settle(null, false), closeWaitMs);
    }, timeoutMs);
  });
}

function buildWindowsHelperEnvironment(overrides = {}) {
  const allowedKeys = new Set([
    'ComSpec',
    'PATH',
    'PATHEXT',
    'SystemRoot',
    'TEMP',
    'TMP',
    'WINDIR'
  ]);
  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => allowedKeys.has(key) && typeof value === 'string'
    )
  );
  return { ...inheritedEnvironment, ...overrides };
}

function parseWindowsProcessIdentity(value) {
  const match = /^(\d+)@(\d+)$/.exec(String(value).trim());
  if (!match) return null;
  const pid = Number(match[1]);
  const creationTime = match[2];
  if (!Number.isSafeInteger(pid) || pid <= 0 || creationTime === '0') return null;
  return { pid, creationTime };
}

async function collectWindowsDescendantPids(child, deadline) {
  if (process.platform !== 'win32' || !Number.isInteger(child?.pid)) return null;
  if (remainingMilliseconds(deadline) <= 0) return null;
  const result = await runWindowsHelper(
    WINDOWS_POWERSHELL_PATH,
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_TREE_QUERY],
    buildWindowsHelperEnvironment({ CVG_CRITICAL_ROOT_PID: String(child.pid) }),
    true,
    deadline
  );
  if (result.status !== 0 || result.closed !== true || result.output.length >= 8_192) return null;
  const lines = result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length !== 1 || !lines[0].startsWith('CVG_CRITICAL_TREE_OK:')) return null;
  const payload = lines[0].slice('CVG_CRITICAL_TREE_OK:'.length);
  const [rootPart, descendantsPart] = payload.split('|DESC=');
  if (!rootPart?.startsWith('ROOT=')) return null;
  const rootValue = rootPart.slice('ROOT='.length);
  const root = rootValue === 'none' ? null : parseWindowsProcessIdentity(rootValue);
  if (rootValue !== 'none' && !root) return null;
  if (typeof descendantsPart !== 'string') return null;
  if (descendantsPart === '') return { root, descendants: [] };
  const rawIdentities = descendantsPart.split(',');
  const descendants = rawIdentities.map(parseWindowsProcessIdentity);
  if (descendants.some((identity) => identity === null)) return null;
  if (descendants.length > MAX_WINDOWS_TREE_PIDS) return null;
  const uniqueDescendants = new Map(
    descendants.map((identity) => [`${identity.pid}@${identity.creationTime}`, identity])
  );
  return { root, descendants: [...uniqueDescendants.values()] };
}

async function captureWindowsRootIdentity(child, identityFilePath, deadline) {
  if (process.platform !== 'win32' || !Number.isInteger(child?.pid)) return null;
  if (typeof identityFilePath !== 'string' || remainingMilliseconds(deadline) <= 0) return null;

  while (remainingMilliseconds(deadline) > 0) {
    let descriptor;
    try {
      descriptor = openSync(identityFilePath, fsConstants.O_RDONLY);
      const stats = fstatSync(descriptor);
      if (!stats.isFile() || stats.size > 256) return null;
      if (stats.size === 0) {
        await delay(Math.min(GROUP_CLEANUP_POLL_MS, remainingMilliseconds(deadline)));
        continue;
      }
      const buffer = Buffer.alloc(stats.size);
      const bytesRead = readSync(descriptor, buffer, 0, stats.size, 0);
      const identity = parseWindowsProcessIdentity(buffer.subarray(0, bytesRead).toString('utf8'));
      if (identity?.pid === child.pid) return identity;
      if (identity) return null;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(errorCode(error))) return null;
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
    await delay(Math.min(GROUP_CLEANUP_POLL_MS, remainingMilliseconds(deadline)));
  }
  return null;
}

function sameWindowsProcessIdentity(left, right) {
  return Boolean(
    left && right && left.pid === right.pid && left.creationTime === right.creationTime
  );
}

export function isWindowsProcessTreeOwned(tree, expectedRootIdentity, childIsAlive) {
  if (!tree || !Array.isArray(tree.descendants)) return false;
  if (tree.root && !expectedRootIdentity) return false;
  if (
    tree.root &&
    expectedRootIdentity &&
    !sameWindowsProcessIdentity(tree.root, expectedRootIdentity)
  ) {
    return false;
  }
  if (childIsAlive) {
    if (tree.root) return sameWindowsProcessIdentity(tree.root, expectedRootIdentity);
    return Boolean(expectedRootIdentity);
  }
  if (tree.root) return true;
  return tree.descendants.length === 0 || Boolean(expectedRootIdentity);
}

function validateWindowsProcessIdentities(identities, deadline) {
  if (identities.length === 0) return Promise.resolve(true);
  const expectedIdentities = identities.map(
    (identity) => `${identity.pid}@${identity.creationTime}`
  );
  return runWindowsHelper(
    WINDOWS_POWERSHELL_PATH,
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_IDENTITY_QUERY],
    buildWindowsHelperEnvironment({
      CVG_CRITICAL_PROCESS_IDENTITIES: expectedIdentities.join(',')
    }),
    true,
    deadline
  ).then(
    ({ status, output, closed }) =>
      status === 0 && closed === true && output.trim() === 'CVG_CRITICAL_IDENTITY_OK'
  );
}

function runWindowsIdentityTermination(identity, deadline) {
  return validateWindowsProcessIdentities([identity], deadline).then((valid) => {
    if (!valid) return false;
    return runWindowsHelper(
      WINDOWS_POWERSHELL_PATH,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        WINDOWS_IDENTITY_TERMINATOR_PATH
      ],
      buildWindowsHelperEnvironment({
        CVG_CRITICAL_TERMINATE_PID: String(identity.pid),
        CVG_CRITICAL_TERMINATE_CREATION_TIME: identity.creationTime
      }),
      false,
      deadline
    ).then(({ status, closed }) => status === 0 && closed === true);
  });
}

async function terminateWindowsProcessTree(child, deadline, expectedRootIdentity) {
  const tree = await collectWindowsDescendantPids(child, deadline);
  if (tree === null) return false;

  const childIsAlive = child.exitCode === null && child.signalCode === null;
  if (!isWindowsProcessTreeOwned(tree, expectedRootIdentity, childIsAlive)) return false;
  const identities = tree.root && childIsAlive ? [tree.root] : tree.descendants;
  if (identities.length > 0) {
    if (!(await validateWindowsProcessIdentities(identities, deadline))) return false;

    let terminated = true;
    if (childIsAlive && tree.root) {
      terminated = await runWindowsIdentityTermination(tree.root, deadline);
    } else {
      for (const identity of [...tree.descendants].reverse()) {
        if (remainingMilliseconds(deadline) <= 0) return false;
        terminated = (await runWindowsIdentityTermination(identity, deadline)) && terminated;
      }
    }
    if (!terminated) return false;
  }

  if (childIsAlive) {
    while (
      child.exitCode === null &&
      child.signalCode === null &&
      remainingMilliseconds(deadline) > 0
    ) {
      await delay(Math.min(GROUP_CLEANUP_POLL_MS, remainingMilliseconds(deadline)));
    }
    if (child.exitCode === null && child.signalCode === null) return false;
  }

  if (remainingMilliseconds(deadline) <= 0) return false;
  const remainingTree = await collectWindowsDescendantPids(child, deadline);
  if (
    remainingTree === null ||
    !isWindowsProcessTreeOwned(remainingTree, expectedRootIdentity, false) ||
    remainingTree.descendants.length > 0
  ) {
    return false;
  }
  return !childIsAlive || child.exitCode !== null || child.signalCode !== null;
}

async function cleanupOwnedProcessGroup(child, signal = 'SIGTERM') {
  if (process.platform === 'win32') {
    const deadline = Date.now() + WINDOWS_TREE_CLEANUP_BUDGET_MS;
    const gracefulDeadline = deadline - WINDOWS_FORCE_RESERVE_MS;
    const expectedRootIdentity = await resolveOwnedWindowsRootIdentity(
      child,
      ownedWindowsIdentityFilePaths.get(child),
      deadline
    );
    const gracefulTreeTermination = await terminateWindowsProcessTree(
      child,
      gracefulDeadline,
      expectedRootIdentity
    );
    if (gracefulTreeTermination) return true;
    return terminateWindowsProcessTree(child, deadline, expectedRootIdentity);
  }

  if (!isOwnedProcessGroupAlive(child)) return true;

  try {
    terminateOwnedProcess(child, signal);
  } catch {
    // Continue to the bounded escalation check below.
  }

  const gracefulDeadline = Date.now() + TERMINATION_GRACE_MS;
  while (isOwnedProcessGroupAlive(child) && Date.now() < gracefulDeadline) {
    await delay(GROUP_CLEANUP_POLL_MS);
  }

  if (!isOwnedProcessGroupAlive(child)) return true;

  try {
    terminateOwnedProcess(child, 'SIGKILL');
  } catch {
    // The group may have disappeared between the check and escalation.
  }

  const hardDeadline = Date.now() + GROUP_CLEANUP_HARD_GRACE_MS;
  while (isOwnedProcessGroupAlive(child) && Date.now() < hardDeadline) {
    await delay(GROUP_CLEANUP_POLL_MS);
  }
  return !isOwnedProcessGroupAlive(child);
}

const ownedCleanupPromises = new WeakMap();
const ownedWindowsRootIdentityPromises = new WeakMap();
const ownedWindowsIdentityFilePaths = new WeakMap();

function resolveOwnedWindowsRootIdentity(child, identityFilePath, deadline) {
  if (process.platform !== 'win32' || !child?.pid || typeof identityFilePath !== 'string') {
    return Promise.resolve(null);
  }
  const existingPromise = ownedWindowsRootIdentityPromises.get(child);
  const identityPromise =
    existingPromise ??
    captureWindowsRootIdentity(child, identityFilePath, deadline).catch(() => null);
  if (!existingPromise) ownedWindowsRootIdentityPromises.set(child, identityPromise);
  const availableMs = remainingMilliseconds(deadline);
  if (availableMs <= 0) return Promise.resolve(null);
  let timeoutHandle;
  const timeoutPromise = new Promise((resolveTimeout) => {
    timeoutHandle = setTimeout(() => resolveTimeout(null), availableMs);
  });
  return Promise.race([identityPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export function cleanupOwnedProcess(child, signal = 'SIGTERM') {
  if (!child?.pid) return Promise.resolve(true);

  const existingCleanup = ownedCleanupPromises.get(child);
  if (existingCleanup) return existingCleanup;

  const cleanupPromise = cleanupOwnedProcessGroup(child, signal).finally(() => {
    ownedCleanupPromises.delete(child);
  });
  ownedCleanupPromises.set(child, cleanupPromise);
  return cleanupPromise;
}

function sanitizeReportValue(value, state, depth = 0) {
  if (state.nodes >= MAX_REPORT_NODES) {
    state.truncated = true;
    return '[report node limit reached]';
  }
  state.nodes += 1;
  if (depth > 12) return '[report depth limit reached]';
  if (typeof value === 'string') return sanitizeDiagnostic(value);
  if (Array.isArray(value)) {
    const sanitized = [];
    for (const item of value) {
      if (state.nodes >= MAX_REPORT_NODES) {
        state.truncated = true;
        sanitized.push('[report node limit reached]');
        break;
      }
      sanitized.push(sanitizeReportValue(item, state, depth + 1));
    }
    return sanitized;
  }
  if (value && typeof value === 'object') {
    const sanitized = Object.create(null);
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      if (state.nodes >= MAX_REPORT_NODES) {
        state.truncated = true;
        sanitized.__cvg_report_truncated__ = '[report node limit reached]';
        break;
      }
      sanitized[sanitizeDiagnostic(key, 300)] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : sanitizeReportValue(value[key], state, depth + 1);
    }
    return sanitized;
  }
  return value;
}

function isMissingPathError(error) {
  return errorCode(error) === 'ENOENT' || errorCode(error) === 'ENOTDIR';
}

function resolveReportLocation(reportPath, reportDirectory = null) {
  if (typeof reportPath !== 'string' || reportPath.length === 0 || reportPath.startsWith('<')) {
    return null;
  }

  const absoluteReportPath = resolve(reportPath);
  const absoluteReportDirectory = resolve(reportDirectory ?? dirname(absoluteReportPath));
  if (dirname(absoluteReportPath) !== absoluteReportDirectory) {
    throw new Error('report path must remain directly inside its private transient directory');
  }

  const directoryStat = lstatSync(absoluteReportDirectory);
  if (!directoryStat.isDirectory()) {
    throw new Error('transient report path is not inside a directory');
  }

  return {
    reportPath: absoluteReportPath,
    reportDirectory: absoluteReportDirectory
  };
}

function resolveExistingReport(reportPath, reportDirectory = null) {
  const location = resolveReportLocation(reportPath, reportDirectory);
  if (!location) return null;

  let reportStat;
  try {
    reportStat = lstatSync(location.reportPath);
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }

  if (reportStat.isSymbolicLink()) {
    throw new Error('refusing to read a symbolic-link report path');
  }
  if (!reportStat.isFile()) {
    throw new Error('transient report path is not a regular file');
  }
  if (reportStat.nlink !== 1) {
    throw new Error('refusing to rewrite a multiply-linked report file');
  }
  return { ...location, reportStat };
}

export function removeReportEntry(reportPath, reportDirectory = null) {
  const location = resolveReportLocation(reportPath, reportDirectory);
  if (!location) return false;

  let reportStat;
  try {
    reportStat = lstatSync(location.reportPath);
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
  if (reportStat.isDirectory()) {
    throw new Error('refusing to remove a directory as a transient report');
  }
  unlinkSync(location.reportPath);
  return true;
}

export function sanitizeReportArtifact({ reportPath, reportDirectory = null, artifactDirectory }) {
  const report = resolveExistingReport(reportPath, reportDirectory);
  if (!report) return null;

  const serializedReport = serializeSanitizedReport(report.reportPath, report.reportDirectory);

  writeSanitizedReport(report.reportPath, serializedReport, report.reportDirectory);

  mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  chmodSync(artifactDirectory, 0o700);
  const sanitizedPath = join(artifactDirectory, 'failure-report.json');
  writeFileSync(sanitizedPath, `${serializedReport}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  chmodSync(sanitizedPath, 0o600);

  removeReportEntry(report.reportPath, report.reportDirectory);
  return sanitizedPath;
}

function readBoundedReport(reportPath, reportDirectory = null) {
  const report = resolveExistingReport(reportPath, reportDirectory);
  if (!report) throw new Error('transient report does not exist');
  const fileSize = report.reportStat.size;
  const bytesToRead = Math.min(fileSize, MAX_REPORT_INPUT_BYTES);
  const noFollowFlag = fsConstants.O_NOFOLLOW ?? 0;
  const descriptor = openSync(report.reportPath, fsConstants.O_RDONLY | noFollowFlag);
  const buffer = Buffer.allocUnsafe(bytesToRead);
  let bytesRead = 0;
  try {
    const openedReport = fstatSync(descriptor);
    if (!openedReport.isFile() || openedReport.nlink !== 1) {
      throw new Error('opened transient report is not a single-link regular file');
    }
    const stableFileIdentity =
      Number.isInteger(openedReport.dev) &&
      Number.isInteger(openedReport.ino) &&
      Number.isInteger(report.reportStat.dev) &&
      Number.isInteger(report.reportStat.ino);
    if (process.platform === 'win32' && !stableFileIdentity) {
      throw new Error('could not verify the opened transient report identity');
    }
    if (
      stableFileIdentity &&
      (openedReport.dev !== report.reportStat.dev || openedReport.ino !== report.reportStat.ino)
    ) {
      throw new Error('transient report changed while it was being opened');
    }
    while (bytesRead < bytesToRead) {
      const count = readSync(descriptor, buffer, bytesRead, bytesToRead - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
  } finally {
    closeSync(descriptor);
  }
  return {
    content: buffer.toString('utf8', 0, bytesRead),
    truncated: fileSize > MAX_REPORT_INPUT_BYTES
  };
}

export function readBoundedReportText(reportPath, reportDirectory = null) {
  return readBoundedReport(reportPath, reportDirectory);
}

function serializeSanitizedReport(reportPath, reportDirectory = null) {
  const reportContent = readBoundedReport(reportPath, reportDirectory);
  let serializedReport;
  if (reportContent.truncated) {
    serializedReport = JSON.stringify(
      {
        format: 'input-truncated',
        content: sanitizeDiagnostic(reportContent.content, MAX_SANITIZED_REPORT_BYTES - 256)
      },
      null,
      2
    );
  } else {
    try {
      const report = JSON.parse(reportContent.content);
      serializedReport = JSON.stringify(
        sanitizeReportValue(report, { nodes: 0, truncated: false }),
        null,
        2
      );
    } catch {
      serializedReport = JSON.stringify(
        {
          format: 'unparsed',
          content: sanitizeDiagnostic(reportContent.content, MAX_SANITIZED_REPORT_BYTES - 256)
        },
        null,
        2
      );
    }
  }

  if (Buffer.byteLength(serializedReport, 'utf8') > MAX_SANITIZED_REPORT_BYTES) {
    serializedReport = JSON.stringify(
      {
        format: 'sanitized-truncated',
        content: sanitizeDiagnostic(serializedReport, MAX_SANITIZED_REPORT_BYTES - 256)
      },
      null,
      2
    );
  }
  if (Buffer.byteLength(serializedReport, 'utf8') > MAX_SANITIZED_REPORT_BYTES) {
    serializedReport = JSON.stringify(
      { format: 'sanitized-truncated', content: '[sanitized report omitted]' },
      null,
      2
    );
  }
  return serializedReport;
}

function writeSanitizedReport(reportPath, serializedReport, reportDirectory = null) {
  const report = resolveExistingReport(reportPath, reportDirectory);
  if (!report) throw new Error('transient report does not exist');
  const temporaryDirectory = mkdtempSync(join(report.reportDirectory, '.cvg-report-sanitize-'));
  const temporaryReportPath = join(temporaryDirectory, 'report.json');
  try {
    writeFileSync(temporaryReportPath, `${serializedReport}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600
    });
    chmodSync(temporaryReportPath, 0o600);
    try {
      renameSync(temporaryReportPath, report.reportPath);
    } catch (error) {
      if (process.platform !== 'win32') throw error;
      // Windows rename does not replace an existing file. Revalidate the
      // entry before unlinking it; unlinking a symlink removes only the link.
      resolveExistingReport(report.reportPath, report.reportDirectory);
      unlinkSync(report.reportPath);
      renameSync(temporaryReportPath, report.reportPath);
    }
    chmodSync(report.reportPath, 0o600);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

export function sanitizeReportInPlace(reportPath, reportDirectory = null) {
  const report = resolveExistingReport(reportPath, reportDirectory);
  if (!report) return null;
  const serializedReport = serializeSanitizedReport(report.reportPath, report.reportDirectory);
  writeSanitizedReport(report.reportPath, serializedReport, report.reportDirectory);
  return reportPath;
}

export function classifyProcessOutcome({
  status,
  signal,
  error,
  timedOut,
  interrupted,
  runnerError = null
}) {
  if (timedOut) {
    return {
      kind: 'timeout',
      status: status ?? null,
      signal: signal ?? null,
      errorCode: null,
      errorMessage: 'child exceeded its finite timeout'
    };
  }
  if (interrupted) {
    return {
      kind: 'interrupted',
      status: status ?? null,
      signal: signal ?? null,
      errorCode: null,
      errorMessage: 'runner interrupted the child'
    };
  }
  if (runnerError) {
    return {
      kind: 'runner_error',
      status: status ?? null,
      signal: signal ?? null,
      errorCode: errorCode(runnerError),
      errorMessage: errorMessage(runnerError)
    };
  }
  if (error) {
    return {
      kind: 'spawn_error',
      status: status ?? null,
      signal: signal ?? null,
      errorCode: errorCode(error),
      errorMessage: errorMessage(error)
    };
  }
  if (signal) {
    return {
      kind: 'signal',
      status: status ?? null,
      signal,
      errorCode: null,
      errorMessage: `child terminated by ${signal}`
    };
  }
  if (status !== 0) {
    return {
      kind: 'exit',
      status: status ?? null,
      signal: null,
      errorCode: null,
      errorMessage: `child exited with status ${status ?? 1}`
    };
  }
  return {
    kind: 'success',
    status: 0,
    signal: null,
    errorCode: null,
    errorMessage: null
  };
}

export function terminateOwnedProcess(child, signal = 'SIGTERM') {
  if (!child?.pid) return false;
  if (process.platform === 'win32' && (child.exitCode !== null || child.signalCode !== null)) {
    return false;
  }
  try {
    if (process.platform !== 'win32') {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
    return true;
  } catch (error) {
    if (errorCode(error) === 'ESRCH') return false;
    throw error;
  }
}

export function preserveFailureArtifact({
  artifactDirectory,
  label,
  command,
  args,
  outcome,
  elapsedMs,
  stdout = '',
  stderr = '',
  reportPath = null,
  reportDirectory = null
}) {
  const sanitizedReportPath = sanitizeReportArtifact({
    reportPath,
    reportDirectory,
    artifactDirectory
  });
  mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  chmodSync(artifactDirectory, 0o700);
  const artifactPath = join(artifactDirectory, 'failure.json');
  const artifact = {
    label: sanitizeDiagnostic(label, 300),
    command: sanitizeDiagnostic(command, 300),
    args: args.map((argument) => sanitizeDiagnostic(argument, 500)),
    outcome: {
      kind: outcome.kind,
      status: outcome.status ?? null,
      signal: outcome.signal ?? null,
      errorCode: outcome.errorCode ?? null,
      errorMessage: sanitizeDiagnostic(outcome.errorMessage ?? '', 1_000),
      cleanupComplete: outcome.cleanupComplete ?? null,
      cleanupError: sanitizeDiagnostic(outcome.cleanupError ?? '', 1_000)
    },
    elapsedMs,
    reportPath: sanitizedReportPath ? sanitizeDiagnostic(sanitizedReportPath, 500) : null,
    stdout: sanitizeDiagnostic(stdout),
    stderr: sanitizeDiagnostic(stderr)
  };
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  chmodSync(artifactPath, 0o600);
  return artifactPath;
}

function createDiagnosticChannel(writer) {
  let pending = '';
  let captured = '';
  let redactingSensitiveLine = false;

  const emit = (value) => {
    if (!value || captured.length >= DIAGNOSTIC_LIMIT) return;
    const remaining = DIAGNOSTIC_LIMIT - captured.length;
    const sanitized = sanitizeDiagnostic(value, remaining);
    if (!sanitized) return;
    captured += sanitized;
    writer(sanitized);
  };

  const processPending = (force = false) => {
    while (pending) {
      const newlineIndex = pending.indexOf('\n');
      if (newlineIndex >= 0) {
        const line = pending.slice(0, newlineIndex + 1);
        pending = pending.slice(newlineIndex + 1);
        emit(line);
        continue;
      }

      const sensitiveMatch = SENSITIVE_STREAM_PATTERN.exec(pending);
      if (sensitiveMatch) {
        const prefix = pending.slice(0, sensitiveMatch.index);
        if (prefix) emit(prefix);
        emit(pending.slice(sensitiveMatch.index));
        pending = '';
        if (!force) redactingSensitiveLine = true;
        return;
      }

      if (force) {
        emit(pending);
        pending = '';
        return;
      }

      if (pending.length <= DIAGNOSTIC_LOOKBEHIND) return;
      const safeLength = pending.length - DIAGNOSTIC_LOOKBEHIND;
      emit(pending.slice(0, safeLength));
      pending = pending.slice(safeLength);
    }
  };

  const append = (chunk) => {
    let remainder = String(chunk);
    if (redactingSensitiveLine) {
      const newlineIndex = remainder.indexOf('\n');
      if (newlineIndex < 0) return;
      redactingSensitiveLine = false;
      remainder = remainder.slice(newlineIndex + 1);
    }
    pending += remainder;
    processPending();
  };

  const flush = () => {
    processPending(true);
    return captured;
  };

  return { append, flush };
}

function spawnOwnedProcess({ command, args, cwd, env, identityFilePath }) {
  if (process.platform !== 'win32') {
    return spawn(command, args, {
      cwd,
      env,
      shell: false,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  const supervisorEnvironment = {
    ...buildWindowsHelperEnvironment(),
    ...env,
    CVG_CRITICAL_SUPERVISOR_TARGET_COMMAND: command,
    CVG_CRITICAL_SUPERVISOR_TARGET_ARGS_JSON: JSON.stringify(args),
    CVG_CRITICAL_SUPERVISOR_TARGET_CWD: cwd,
    CVG_CRITICAL_SUPERVISOR_TARGET_KEYS_JSON: JSON.stringify(Object.keys(env)),
    CVG_CRITICAL_SUPERVISOR_IDENTITY_FILE: identityFilePath
  };
  return spawn(
    WINDOWS_POWERSHELL_PATH,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      WINDOWS_OWNED_PROCESS_SUPERVISOR_PATH
    ],
    {
      cwd: process.cwd(),
      env: supervisorEnvironment,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
}

export function runOwnedProcess({
  command,
  args = [],
  cwd = process.cwd(),
  env = {},
  timeoutMs,
  artifactDirectory,
  label = command,
  reportPath = null,
  reportDirectory = null,
  abortSignal,
  onChildSpawn,
  onChildClose
}) {
  if (!command || typeof command !== 'string') {
    throw new Error('runOwnedProcess requires a command');
  }
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== 'string')) {
    throw new Error('runOwnedProcess requires an array of string arguments');
  }
  if (timeoutMs > MAX_RUNNER_TIMEOUT_MS) {
    throw new Error(`runOwnedProcess timeout cannot exceed ${MAX_RUNNER_TIMEOUT_MS}ms`);
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('runOwnedProcess requires a finite positive timeout');
  }
  if (!artifactDirectory || typeof artifactDirectory !== 'string') {
    throw new Error('runOwnedProcess requires an artifact directory');
  }

  const startedAt = Date.now();
  let child;
  const identityFilePath =
    process.platform === 'win32' ? join(artifactDirectory, 'windows-supervisor.identity') : null;
  try {
    child = spawnOwnedProcess({ command, args, cwd, env, identityFilePath });
  } catch (error) {
    const outcome = classifyProcessOutcome({
      status: null,
      signal: null,
      error,
      timedOut: false,
      interrupted: false
    });
    const elapsedMs = Date.now() - startedAt;
    const failureArtifactPath = preserveFailureArtifact({
      artifactDirectory,
      label,
      command,
      args,
      outcome,
      elapsedMs,
      reportPath,
      reportDirectory
    });
    return Promise.resolve({
      ...outcome,
      elapsedMs,
      stdout: '',
      stderr: '',
      reportPath,
      failureArtifactPath
    });
  }

  if (process.platform === 'win32') {
    ownedWindowsIdentityFilePaths.set(child, identityFilePath);
    ownedWindowsRootIdentityPromises.set(
      child,
      captureWindowsRootIdentity(
        child,
        identityFilePath,
        Date.now() + WINDOWS_TREE_COMMAND_TIMEOUT_MS
      ).catch(() => null)
    );
  }

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let interrupted = false;
  let settled = false;
  let finalizing = false;
  let timeoutHandle;
  let processError = null;
  let runnerError = null;
  let closeInfo = null;
  let cleanupPromise = null;
  let abortListener = null;
  let resolveProcess;

  const removeAbortListener = () => {
    if (!abortSignal || !abortListener) {
      return;
    }
    try {
      const removeEventListener = abortSignal.removeEventListener;
      if (typeof removeEventListener === 'function') {
        removeEventListener.call(abortSignal, 'abort', abortListener);
      }
    } catch {
      // Abort-signal cleanup must never replace the typed process outcome.
    }
    abortListener = null;
  };

  const promise = new Promise((resolvePromise) => {
    resolveProcess = resolvePromise;
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    const stdoutChannel = createDiagnosticChannel((chunk) => process.stdout.write(chunk));
    const stderrChannel = createDiagnosticChannel((chunk) => process.stderr.write(chunk));
    child.stdout?.on('data', (chunk) => stdoutChannel.append(chunk));
    child.stderr?.on('data', (chunk) => stderrChannel.append(chunk));
    child.once('error', (error) => {
      processError = error;
    });
    child.once('close', (status, signal) => {
      closeInfo = { status, signal };
      void finish(closeInfo, stdoutChannel, stderrChannel).catch((error) => {
        settleFinalizationFailure(error, status, signal, stdoutChannel, stderrChannel);
      });
    });

    const requestCleanup = (reason, fallbackSignal) => {
      if (settled || finalizing) return;
      if (reason === 'timeout') timedOut = true;
      if (reason === 'abort') interrupted = true;
      cleanupPromise ??= cleanupOwnedProcess(child, 'SIGTERM');
      void cleanupPromise
        .then(() => {
          if (!closeInfo && !settled && !finalizing) {
            closeInfo = { status: null, signal: fallbackSignal };
            void finish(closeInfo, stdoutChannel, stderrChannel).catch((error) => {
              settleFinalizationFailure(error, null, fallbackSignal, stdoutChannel, stderrChannel);
            });
          }
        })
        .catch((error) => {
          settleFinalizationFailure(
            error,
            closeInfo?.status ?? null,
            closeInfo?.signal ?? fallbackSignal,
            stdoutChannel,
            stderrChannel
          );
        });
    };

    timeoutHandle = setTimeout(() => requestCleanup('timeout', 'SIGKILL'), timeoutMs);

    try {
      onChildSpawn?.(child);
    } catch (error) {
      runnerError = new Error(
        `onChildSpawn hook failed: ${errorMessage(error) ?? 'unknown error'}`
      );
      requestCleanup('runner_error', 'SIGTERM');
    }

    if (abortSignal !== undefined && abortSignal !== null) {
      try {
        if (
          typeof abortSignal !== 'object' ||
          typeof abortSignal.addEventListener !== 'function' ||
          typeof abortSignal.aborted !== 'boolean'
        ) {
          throw new TypeError('runOwnedProcess received an invalid abort signal');
        }

        abortListener = () => requestCleanup('abort', 'SIGTERM');
        abortSignal.addEventListener('abort', abortListener, { once: true });
        if (abortSignal.aborted) abortListener();
      } catch (error) {
        runnerError = new Error(
          `abort signal setup failed: ${errorMessage(error) ?? 'unknown error'}`
        );
        requestCleanup('runner_error', 'SIGTERM');
      }
    }
  });

  function settleFinalizationFailure(error, status, signal, stdoutChannel, stderrChannel) {
    if (settled) return;

    clearTimeout(timeoutHandle);
    removeAbortListener();

    let capturedStdout = '';
    let capturedStderr = '';
    try {
      capturedStdout = stdoutChannel.flush();
    } catch {
      capturedStdout = '[stdout diagnostics unavailable]';
    }
    try {
      capturedStderr = stderrChannel.flush();
    } catch {
      capturedStderr = '[stderr diagnostics unavailable]';
    }

    const outcome = {
      kind: 'runner_error',
      status: status ?? null,
      signal: signal ?? null,
      errorCode: errorCode(error),
      errorMessage: `runner finalization failed: ${errorMessage(error) ?? 'unknown error'}`,
      cleanupComplete: false,
      cleanupError: 'runner finalization failed'
    };
    let failureArtifactPath;
    try {
      failureArtifactPath = preserveFailureArtifact({
        artifactDirectory,
        label,
        command,
        args,
        outcome,
        elapsedMs: Date.now() - startedAt,
        stdout: capturedStdout,
        stderr: capturedStderr,
        reportPath,
        reportDirectory
      });
    } catch {
      failureArtifactPath = undefined;
    }
    try {
      onChildClose?.(child, outcome.cleanupComplete === true);
    } catch {
      // The caller callback must not prevent the typed finalization result.
    }
    settled = true;
    resolveProcess({
      ...outcome,
      elapsedMs: Date.now() - startedAt,
      stdout: capturedStdout,
      stderr: capturedStderr,
      reportPath,
      failureArtifactPath
    });
  }

  async function finish({ status = null, signal = null }, stdoutChannel, stderrChannel) {
    if (settled || finalizing) return;
    finalizing = true;
    try {
      clearTimeout(timeoutHandle);
      cleanupPromise ??= cleanupOwnedProcess(child, 'SIGTERM');
      const cleanupComplete = await cleanupPromise;
      stdout = stdoutChannel.flush();
      stderr = stderrChannel.flush();
      const outcome = classifyProcessOutcome({
        status,
        signal,
        error: processError,
        timedOut,
        interrupted,
        runnerError
      });
      if (!cleanupComplete) {
        outcome.cleanupComplete = false;
        outcome.cleanupError = 'owned process group did not exit after bounded termination';
        if (outcome.kind === 'success') {
          outcome.kind = 'cleanup_error';
          outcome.errorMessage = outcome.cleanupError;
        } else {
          outcome.errorMessage = `${outcome.errorMessage}; ${outcome.cleanupError}`;
        }
      } else {
        outcome.cleanupComplete = true;
        outcome.cleanupError = null;
      }
      const elapsedMs = Date.now() - startedAt;
      let failureArtifactPath;
      if (outcome.kind !== 'success') {
        failureArtifactPath = preserveFailureArtifact({
          artifactDirectory,
          label,
          command,
          args,
          outcome,
          elapsedMs,
          stdout,
          stderr,
          reportPath,
          reportDirectory
        });
      }
      try {
        onChildClose?.(child, outcome.cleanupComplete === true);
      } catch {
        // The caller callback must not prevent the typed finalization result.
      }
      removeAbortListener();
      settled = true;
      resolveProcess({ ...outcome, elapsedMs, stdout, stderr, reportPath, failureArtifactPath });
    } catch (error) {
      settleFinalizationFailure(error, status, signal, stdoutChannel, stderrChannel);
    }
  }

  return promise;
}
