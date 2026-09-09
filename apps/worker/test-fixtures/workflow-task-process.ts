import { closeDatabaseClient, createDatabaseClient, getPool } from '@cvg-his-v2/shared-database';
import {
  DatabaseWorkflowTaskRepository,
  WorkflowTaskService
} from '@cvg-his-v2/module-workflows';

const databaseUrl = process.env.DATABASE_URL?.trim();
const accountId = process.env.WORKFLOW_PROCESS_ACCOUNT_ID?.trim();
const taskId = process.env.WORKFLOW_PROCESS_TASK_ID?.trim();
const workerId = process.env.WORKFLOW_PROCESS_WORKER_ID?.trim();
const mode = process.env.WORKFLOW_PROCESS_MODE?.trim();
const leaseMs = Number(process.env.WORKFLOW_PROCESS_LEASE_MS ?? '1_200');

function emit(event: string, payload: Record<string, unknown>): void {
  process.stdout.write(`${event} ${JSON.stringify(payload)}\n`);
}

function waitForResumeSignal(): Promise<void> {
  return new Promise((resolve) => {
    const resume = (): void => {
      process.off('SIGUSR2', resume);
      resolve();
    };
    process.on('SIGUSR2', resume);
  });
}

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV !== 'test' ||
    !databaseUrl ||
    !accountId ||
    !taskId ||
    !workerId ||
    !['claim-and-wait', 'claim-and-complete'].includes(mode ?? '')
  ) {
    throw new Error('Workflow process fixture has incomplete test configuration');
  }
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 60_000) {
    throw new Error('Workflow process lease must be between 1000 and 60000 milliseconds');
  }

  createDatabaseClient(databaseUrl);
  const currentUser = await getPool().query<{ readonly current_user: string }>('SELECT current_user');
  const repository = new DatabaseWorkflowTaskRepository();
  const service = new WorkflowTaskService({ repository });
  const now = new Date().toISOString();
  emit('WORKFLOW_READY', { databaseUser: currentUser.rows[0]?.current_user ?? null, workerId });

  const claims = await repository.claimDue({
    accountId: accountId as never,
    workerId,
    correlationId: `workflow-process-${process.pid}` as never,
    now,
    limit: 1,
    leaseMs
  });
  const claim = claims[0];
  if (!claim || claim.task.id !== taskId) {
    throw new Error(`Workflow process did not claim expected task ${taskId}`);
  }
  emit('WORKFLOW_CLAIMED', {
    taskId: claim.task.id,
    workerId,
    leaseVersion: claim.leaseVersion,
    attempts: claim.task.attempts
  });

  if (mode === 'claim-and-wait') await waitForResumeSignal();

  const completed = await service.completeClaim(claim);
  emit('WORKFLOW_RESULT', { taskId, workerId, completed });
  await closeDatabaseClient();
}

main().catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  await closeDatabaseClient().catch(() => undefined);
  process.exitCode = 1;
});
