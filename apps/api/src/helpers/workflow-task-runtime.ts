import {
  checkWorkflowTaskSchemaReadiness,
  createDatabaseWorkflowTaskService,
  WorkflowTaskService
} from '@cvg-his-v2/module-workflows';
import { getPool } from '@cvg-his-v2/shared-database';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
import { AppError } from '@cvg-his-v2/shared-errors';

export function createApiWorkflowTaskService(environment: string): WorkflowTaskService {
  try {
    getPool();
    return createDatabaseWorkflowTaskService();
  } catch (error) {
    if (isProductionLikeEnvironment(environment)) {
      throw new AppError(
        'WORKFLOW_TASK_PERSISTENCE_REQUIRED',
        'Clinical workflow persistence is required in production-like environments',
        503,
        { cause: error instanceof Error ? error.message : String(error) }
      );
    }
    return new WorkflowTaskService();
  }
}

export function createWorkflowTaskSchemaReadinessGuard(environment: string): () => Promise<void> {
  const required =
    isProductionLikeEnvironment(environment) ||
    process.env.DATABASE_REQUIRE_SCHEMA === '1' ||
    process.env.DATABASE_REQUIRE_RLS_ROLE === '1';
  let readiness: Promise<boolean> | undefined;

  return async (): Promise<void> => {
    if (!required) return;
    readiness ??= checkWorkflowTaskSchemaReadiness().catch(() => false);
    if (await readiness) return;
    readiness = undefined;
    throw new AppError(
      'WORKFLOW_TASK_SCHEMA_NOT_READY',
      'Clinical workflow persistence schema is not ready',
      503
    );
  };
}
