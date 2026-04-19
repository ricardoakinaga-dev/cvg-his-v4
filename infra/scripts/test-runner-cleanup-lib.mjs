const TRACKED_COMMAND_PATTERNS = [
  /\bvitest\b/i,
  /test-critical-bootstrap\.mjs/i,
  /\bpnpm\b.*\btest:critical\b/i,
  /\bpnpm\b.*\btest:coverage\b/i
];

export function parseProcessTable(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
      if (!match) {
        return null;
      }

      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        elapsedSeconds: Number(match[3]),
        command: match[4]
      };
    })
    .filter(Boolean);
}

export function collectAncestorPids(processes, currentPid) {
  const byPid = new Map(processes.map((process) => [process.pid, process]));
  const ancestors = new Set([currentPid]);
  let cursor = byPid.get(currentPid)?.ppid;

  while (cursor && !ancestors.has(cursor)) {
    ancestors.add(cursor);
    cursor = byPid.get(cursor)?.ppid;
  }

  return ancestors;
}

export function isTrackedTestProcess(process, workspace) {
  const sameWorkspace =
    process.cwd === workspace ||
    process.cwd?.startsWith(`${workspace}/`) ||
    process.command.includes(workspace);

  if (!sameWorkspace) {
    return false;
  }

  return TRACKED_COMMAND_PATTERNS.some((pattern) => pattern.test(process.command));
}

export function selectOrphanTestProcesses(processes, currentPid, workspace) {
  const byPid = new Map(processes.map((process) => [process.pid, process]));
  const ancestors = collectAncestorPids(processes, currentPid);

  return processes.filter((process) => {
    if (ancestors.has(process.pid)) {
      return false;
    }

    if (!isTrackedTestProcess(process, workspace)) {
      return false;
    }

    return process.ppid === 1 || !byPid.has(process.ppid);
  });
}

export function selectStaleTestProcesses(processes, currentPid, workspace, staleAfterSeconds) {
  const ancestors = collectAncestorPids(processes, currentPid);

  return processes.filter((process) => {
    if (ancestors.has(process.pid)) {
      return false;
    }

    if (!isTrackedTestProcess(process, workspace)) {
      return false;
    }

    return process.elapsedSeconds >= staleAfterSeconds;
  });
}
