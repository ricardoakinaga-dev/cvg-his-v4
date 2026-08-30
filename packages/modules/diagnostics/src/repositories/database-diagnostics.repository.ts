import { and, eq, sql } from 'drizzle-orm';
import { withTenantTransaction, type DatabaseClient } from '@cvg-his-v2/shared-database';
import { diagnosticOrders } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireAccountId } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  PatientId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  EncounterId
} from '@cvg-his-v2/shared-types';
import type {
  LaboratoryWorkflowEvent,
  LaboratoryWorkflowPersistenceResult,
  LaboratoryWorkflowState
} from '../laboratory-workflow.js';
import { normalizeLaboratoryResultValues } from '../laboratory-result-values.js';
import { createLaboratoryWorkflowEventId as buildLaboratoryWorkflowEventId } from '../laboratory-workflow.js';

export interface LaboratoryTransitionPersistenceInput {
  readonly accountId: AccountId;
  readonly expectedOrder: DiagnosticOrderSummary;
  readonly order: DiagnosticOrderSummary;
  readonly expectedWorkflow: LaboratoryWorkflowState;
  readonly workflow: LaboratoryWorkflowState;
  readonly eventType: LaboratoryWorkflowEvent['eventType'];
  readonly idempotencyKey?: string;
  readonly requestFingerprint: string;
}

export interface LaboratoryTransitionReplayInput {
  readonly accountId: AccountId;
  readonly orderId: DiagnosticOrderId;
  readonly eventType: LaboratoryWorkflowEvent['eventType'];
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
}

export interface DiagnosticOrderRepository {
  create(order: DiagnosticOrderSummary): Promise<void>;
  update(order: DiagnosticOrderSummary): Promise<void>;
  findById(id: DiagnosticOrderId): Promise<DiagnosticOrderSummary | null>;
  findAll(accountId: AccountId): Promise<readonly DiagnosticOrderSummary[]>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly DiagnosticOrderSummary[]>;
  findLaboratoryWorkflows?(accountId: AccountId): Promise<readonly LaboratoryWorkflowState[]>;
  upsertLaboratoryWorkflow?(workflow: LaboratoryWorkflowState): Promise<void>;
  isEnabledLaboratorySigner?(accountId: AccountId, userId: string): Promise<boolean>;
  findLaboratoryTransitionReplay?(
    input: LaboratoryTransitionReplayInput
  ): Promise<LaboratoryWorkflowPersistenceResult | null>;
  persistLaboratoryTransition?(
    input: LaboratoryTransitionPersistenceInput
  ): Promise<LaboratoryWorkflowPersistenceResult>;
}

export class DatabaseDiagnosticOrderRepository implements DiagnosticOrderRepository {
  public constructor(_db: DatabaseClient) {}

  public async create(order: DiagnosticOrderSummary): Promise<void> {
    const accountId = requireAccountId();
    if (accountId !== order.accountId) {
      throw new Error('Diagnostic order account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.insert(diagnosticOrders).values({
        id: order.id,
        accountId: order.accountId,
        encounterId: order.encounterId,
        patientId: order.patientId,
        examType: order.examType,
        examCatalogId: order.examCatalogId ?? null,
        reason: order.reason,
        status: order.status,
        collectedAt: order.collectedAt ? new Date(order.collectedAt) : null,
        collectedByUserId: order.collectedByUserId ?? null,
        resultSummary: order.resultSummary ?? null,
        resultValues: order.resultValues ?? null,
        resultAttachmentId: order.resultAttachmentId ?? null,
        resultedAt: order.resultedAt ? new Date(order.resultedAt) : null,
        releasedByUserId: order.releasedByUserId ?? null,
        signedByUserId: order.signedByUserId ?? null,
        signatureHash: order.signatureHash ?? null,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt)
      });
    });
  }

  public async update(order: DiagnosticOrderSummary): Promise<void> {
    const accountId = requireAccountId();
    if (accountId !== order.accountId) {
      throw new Error('Diagnostic order account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database
        .update(diagnosticOrders)
        .set({
          status: order.status,
          collectedAt: order.collectedAt ? new Date(order.collectedAt) : null,
          collectedByUserId: order.collectedByUserId ?? null,
          resultSummary: order.resultSummary ?? null,
          resultValues: order.resultValues ?? null,
          resultAttachmentId: order.resultAttachmentId ?? null,
          resultedAt: order.resultedAt ? new Date(order.resultedAt) : null,
          releasedByUserId: order.releasedByUserId ?? null,
          signedByUserId: order.signedByUserId ?? null,
          signatureHash: order.signatureHash ?? null,
          updatedAt: new Date(order.updatedAt)
        })
        .where(eq(diagnosticOrders.id, order.id));
    });
  }

  public async findById(id: DiagnosticOrderId): Promise<DiagnosticOrderSummary | null> {
    const accountId = requireAccountId();
    const result = await withTenantTransaction(accountId, async (database) =>
      database
        .select()
        .from(diagnosticOrders)
        .where(and(eq(diagnosticOrders.id, id), eq(diagnosticOrders.accountId, accountId)))
        .limit(1)
    );

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToDiagnosticOrder(result[0]);
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly DiagnosticOrderSummary[]> {
    const accountId = requireAccountId();
    const result = await withTenantTransaction(accountId, async (database) =>
      database
        .select()
        .from(diagnosticOrders)
        .where(
          and(
            eq(diagnosticOrders.encounterId, encounterId),
            eq(diagnosticOrders.accountId, accountId)
          )
        )
    );

    return result.map((row) => this.mapRowToDiagnosticOrder(row));
  }

  public async findAll(accountId: AccountId): Promise<readonly DiagnosticOrderSummary[]> {
    const contextAccountId = requireAccountId();
    if (contextAccountId !== accountId) {
      throw new Error('Diagnostic order account does not match tenant context');
    }
    const result = await withTenantTransaction(accountId, async (database) =>
      database.select().from(diagnosticOrders).where(eq(diagnosticOrders.accountId, accountId))
    );

    return result.map((row) => this.mapRowToDiagnosticOrder(row));
  }

  public async isEnabledLaboratorySigner(accountId: AccountId, userId: string): Promise<boolean> {
    return withTenantTransaction(accountId, async (database) => {
      const result = await database.execute(sql`
        SELECT 1
          FROM users AS u
          JOIN staff AS s
            ON s.account_id = u.account_id
           AND s.user_id = u.id
          JOIN professions AS p
            ON p.account_id = s.account_id
           AND p.id = s.profession_id
         WHERE u.account_id = ${accountId}
           AND u.id = ${userId}
           AND u.is_active = TRUE
           AND u.principal_kind = 'human'
           AND s.is_active = TRUE
           AND p.is_active = TRUE
         LIMIT 1
      `);
      return result.rows.length === 1;
    });
  }

  public async findLaboratoryTransitionReplay(
    input: LaboratoryTransitionReplayInput
  ): Promise<LaboratoryWorkflowPersistenceResult | null> {
    const eventId = buildLaboratoryWorkflowEventId(
      input.accountId,
      input.orderId,
      input.eventType,
      input.idempotencyKey,
      input.requestFingerprint
    );
    return withTenantTransaction(input.accountId, async (database) => {
      const current = await this.lockLaboratoryState(database, input.accountId, input.orderId);
      if (!current) return null;
      const event = await database.execute(sql`
        SELECT id
          FROM diagnostic_order_workflow_events
         WHERE account_id = ${input.accountId}
           AND order_id = ${input.orderId}
           AND id = ${eventId}
         LIMIT 1
      `);
      if (event.rows.length !== 1) return null;
      return {
        order: current.order,
        workflow: current.workflow,
        replayed: true
      };
    });
  }

  public async persistLaboratoryTransition(
    input: LaboratoryTransitionPersistenceInput
  ): Promise<LaboratoryWorkflowPersistenceResult> {
    return withTenantTransaction(input.accountId, async (database) => {
      const current = await this.lockLaboratoryState(database, input.accountId, input.order.id);
      if (!current) {
        throw new NotFoundError('Laboratory order not found', { orderId: input.order.id });
      }

      const event = input.workflow.history.at(-1);
      if (!event) {
        throw new ConflictError('Laboratory transition must append a workflow event');
      }

      if (input.idempotencyKey) {
        const eventId = buildLaboratoryWorkflowEventId(
          input.accountId,
          input.order.id,
          input.eventType,
          input.idempotencyKey,
          input.requestFingerprint
        );
        const existingEvent = await database.execute(sql`
          SELECT id
            FROM diagnostic_order_workflow_events
           WHERE account_id = ${input.accountId}
             AND order_id = ${input.order.id}
             AND id = ${eventId}
           LIMIT 1
        `);
        if (existingEvent.rows.length === 1) {
          return {
            order: current.order,
            workflow: current.workflow,
            replayed: true
          };
        }
      }

      if (
        !this.sameInstant(current.order.updatedAt, input.expectedOrder.updatedAt) ||
        !this.sameInstant(current.workflow.updatedAt, input.expectedWorkflow.updatedAt)
      ) {
        throw new ConflictError('Laboratory order changed; retry the transition');
      }

      const updatedOrder = await database.execute(sql`
        UPDATE diagnostic_orders
           SET status = ${input.order.status},
               collected_at = ${this.dateOrNull(input.order.collectedAt)},
               collected_by_user_id = ${input.order.collectedByUserId ?? null},
               result_summary = ${input.order.resultSummary ?? null},
               result_values = ${this.jsonbValue(input.order.resultValues)}::jsonb,
               result_attachment_id = ${input.order.resultAttachmentId ?? null},
               resulted_at = ${this.dateOrNull(input.order.resultedAt)},
               released_by_user_id = ${input.order.releasedByUserId ?? null},
               signed_by_user_id = ${input.order.signedByUserId ?? null},
               signature_hash = ${input.order.signatureHash ?? null},
               updated_at = ${new Date(input.order.updatedAt)}
         WHERE account_id = ${input.accountId}
           AND id = ${input.order.id}
           AND updated_at = ${new Date(input.expectedOrder.updatedAt)}
      `);
      if (updatedOrder.rowCount !== 1) {
        throw new ConflictError('Laboratory order changed; retry the transition');
      }

      const updatedWorkflow = await database.execute(sql`
        UPDATE diagnostic_order_workflows
           SET account_id = ${input.workflow.accountId},
               status = ${input.workflow.status},
               legacy_status = ${input.workflow.legacyStatus ?? null},
               collection_attempt = ${input.workflow.collectionAttempt},
               collected_at = ${this.dateOrNull(input.workflow.collectedAt)},
               collected_by_user_id = ${input.workflow.collectedByUserId ?? null},
               analysis_started_at = ${this.dateOrNull(input.workflow.analysisStartedAt)},
               analysis_started_by_user_id = ${input.workflow.analysisStartedByUserId ?? null},
               reported_at = ${this.dateOrNull(input.workflow.reportedAt)},
               reported_by_user_id = ${input.workflow.reportedByUserId ?? null},
               delivered_at = ${this.dateOrNull(input.workflow.deliveredAt)},
               delivered_by_user_id = ${input.workflow.deliveredByUserId ?? null},
               delivery_channel = ${input.workflow.deliveryChannel ?? null},
               result_summary = ${input.workflow.resultSummary ?? null},
               result_values = ${this.jsonbValue(input.workflow.resultValues)}::jsonb,
               result_attachment_id = ${input.workflow.resultAttachmentId ?? null},
               signed_by_user_id = ${input.workflow.signedByUserId ?? null},
               signature_hash = ${input.workflow.signatureHash ?? null},
               recollection_reason = ${input.workflow.recollectionReason ?? null},
               cancellation_reason = ${input.workflow.cancellationReason ?? null},
               updated_at = ${new Date(input.workflow.updatedAt)}
         WHERE account_id = ${input.accountId}
           AND order_id = ${input.workflow.orderId}
           AND updated_at = ${new Date(input.expectedWorkflow.updatedAt)}
      `);
      if (updatedWorkflow.rowCount !== 1) {
        throw new ConflictError('Laboratory workflow changed; retry the transition');
      }

      const eventId = input.idempotencyKey
        ? buildLaboratoryWorkflowEventId(
            input.accountId,
            input.order.id,
            input.eventType,
            input.idempotencyKey,
            input.requestFingerprint
          )
        : event.id;
      await database.execute(sql`
        INSERT INTO diagnostic_order_workflow_events (
          id, account_id, order_id, event_type, status, attempt, reason,
          actor_user_id, occurred_at
        ) VALUES (
          ${eventId}, ${input.accountId}, ${input.order.id}, ${event.eventType},
          ${event.status}, ${event.attempt}, ${event.reason ?? null},
          ${event.actorUserId ?? null}, ${new Date(event.occurredAt)}
        )
        ON CONFLICT (id) DO NOTHING
      `);

      return {
        order: input.order,
        workflow: input.workflow,
        replayed: false
      };
    });
  }

  public async findLaboratoryWorkflows(
    accountId: AccountId
  ): Promise<readonly LaboratoryWorkflowState[]> {
    const contextAccountId = requireAccountId();
    if (contextAccountId !== accountId) {
      throw new Error('Laboratory workflow account does not match tenant context');
    }
    return withTenantTransaction(accountId, async (database) => {
      const workflows = await database.execute(sql`
        SELECT order_id, account_id, status, legacy_status, collection_attempt,
               collected_at, collected_by_user_id, analysis_started_at,
               analysis_started_by_user_id, reported_at, reported_by_user_id,
               delivered_at, delivered_by_user_id, delivery_channel, result_summary,
               result_values, result_attachment_id, signed_by_user_id, signature_hash,
               recollection_reason, cancellation_reason, created_at, updated_at
          FROM diagnostic_order_workflows
         WHERE account_id = ${accountId}
         ORDER BY updated_at DESC
      `);
      const events = await database.execute(sql`
        SELECT id, order_id, event_type, status, attempt, reason, actor_user_id, occurred_at
          FROM diagnostic_order_workflow_events
         WHERE account_id = ${accountId}
         ORDER BY occurred_at ASC, id ASC
      `);
      const eventsByOrder = new Map<string, LaboratoryWorkflowEvent[]>();
      for (const row of events.rows as Record<string, unknown>[]) {
        const orderId = String(row.order_id);
        const current = eventsByOrder.get(orderId) ?? [];
        current.push(this.mapWorkflowEvent(row));
        eventsByOrder.set(orderId, current);
      }

      return (workflows.rows as Record<string, unknown>[]).map((row) =>
        this.mapWorkflow(row, eventsByOrder.get(String(row.order_id)) ?? [])
      );
    });
  }

  public async upsertLaboratoryWorkflow(workflow: LaboratoryWorkflowState): Promise<void> {
    const accountId = requireAccountId();
    if (accountId !== workflow.accountId) {
      throw new Error('Laboratory workflow account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.execute(sql`
      INSERT INTO diagnostic_order_workflows (
        order_id, account_id, status, legacy_status, collection_attempt,
        collected_at, collected_by_user_id, analysis_started_at,
        analysis_started_by_user_id, reported_at, reported_by_user_id,
        delivered_at, delivered_by_user_id, delivery_channel, result_summary,
        result_values, result_attachment_id, signed_by_user_id, signature_hash,
        recollection_reason, cancellation_reason, created_at, updated_at
      ) VALUES (
        ${workflow.orderId}, ${workflow.accountId}, ${workflow.status},
        ${workflow.legacyStatus ?? null}, ${workflow.collectionAttempt},
        ${workflow.collectedAt ? new Date(workflow.collectedAt) : null},
        ${workflow.collectedByUserId ?? null},
        ${workflow.analysisStartedAt ? new Date(workflow.analysisStartedAt) : null},
        ${workflow.analysisStartedByUserId ?? null},
        ${workflow.reportedAt ? new Date(workflow.reportedAt) : null},
        ${workflow.reportedByUserId ?? null},
        ${workflow.deliveredAt ? new Date(workflow.deliveredAt) : null},
        ${workflow.deliveredByUserId ?? null}, ${workflow.deliveryChannel ?? null},
        ${workflow.resultSummary ?? null}, ${this.jsonbValue(workflow.resultValues)}::jsonb,
        ${workflow.resultAttachmentId ?? null},
        ${workflow.signedByUserId ?? null}, ${workflow.signatureHash ?? null},
        ${workflow.recollectionReason ?? null}, ${workflow.cancellationReason ?? null},
        ${new Date(workflow.createdAt)}, ${new Date(workflow.updatedAt)}
      )
      ON CONFLICT (order_id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        status = EXCLUDED.status,
        legacy_status = EXCLUDED.legacy_status,
        collection_attempt = EXCLUDED.collection_attempt,
        collected_at = EXCLUDED.collected_at,
        collected_by_user_id = EXCLUDED.collected_by_user_id,
        analysis_started_at = EXCLUDED.analysis_started_at,
        analysis_started_by_user_id = EXCLUDED.analysis_started_by_user_id,
        reported_at = EXCLUDED.reported_at,
        reported_by_user_id = EXCLUDED.reported_by_user_id,
        delivered_at = EXCLUDED.delivered_at,
        delivered_by_user_id = EXCLUDED.delivered_by_user_id,
        delivery_channel = EXCLUDED.delivery_channel,
        result_summary = EXCLUDED.result_summary,
        result_values = EXCLUDED.result_values,
        result_attachment_id = EXCLUDED.result_attachment_id,
        signed_by_user_id = EXCLUDED.signed_by_user_id,
        signature_hash = EXCLUDED.signature_hash,
        recollection_reason = EXCLUDED.recollection_reason,
        cancellation_reason = EXCLUDED.cancellation_reason,
        updated_at = EXCLUDED.updated_at
      `);

      for (const event of workflow.history) {
        await database.execute(sql`
        INSERT INTO diagnostic_order_workflow_events (
          id, account_id, order_id, event_type, status, attempt, reason,
          actor_user_id, occurred_at
        ) VALUES (
          ${event.id}, ${workflow.accountId}, ${workflow.orderId}, ${event.eventType},
          ${event.status}, ${event.attempt}, ${event.reason ?? null},
          ${event.actorUserId ?? null}, ${new Date(event.occurredAt)}
        )
        ON CONFLICT (id) DO NOTHING
        `);
      }
    });
  }

  private async lockLaboratoryState(
    database: DatabaseClient,
    accountId: AccountId,
    orderId: DiagnosticOrderId
  ): Promise<{
    readonly order: DiagnosticOrderSummary;
    readonly workflow: LaboratoryWorkflowState;
  } | null> {
    const orderResult = await database.execute(sql`
      SELECT id, account_id, encounter_id, patient_id, exam_type, exam_catalog_id,
             reason, status, collected_at, collected_by_user_id, result_summary,
             result_values, result_attachment_id, resulted_at, released_by_user_id, signed_by_user_id,
             signature_hash, created_at, updated_at
        FROM diagnostic_orders
       WHERE account_id = ${accountId}
         AND id = ${orderId}
       FOR UPDATE
    `);
    const orderRow = orderResult.rows[0] as Record<string, unknown> | undefined;
    if (!orderRow) return null;

    const workflowResult = await database.execute(sql`
      SELECT order_id, account_id, status, legacy_status, collection_attempt,
             collected_at, collected_by_user_id, analysis_started_at,
             analysis_started_by_user_id, reported_at, reported_by_user_id,
             delivered_at, delivered_by_user_id, delivery_channel, result_summary,
             result_values, result_attachment_id, signed_by_user_id, signature_hash,
             recollection_reason, cancellation_reason, created_at, updated_at
        FROM diagnostic_order_workflows
       WHERE account_id = ${accountId}
         AND order_id = ${orderId}
       FOR UPDATE
    `);
    const workflowRow = workflowResult.rows[0] as Record<string, unknown> | undefined;
    if (!workflowRow) return null;

    const eventsResult = await database.execute(sql`
      SELECT id, order_id, event_type, status, attempt, reason, actor_user_id, occurred_at
        FROM diagnostic_order_workflow_events
       WHERE account_id = ${accountId}
         AND order_id = ${orderId}
       ORDER BY occurred_at ASC, id ASC
    `);

    return {
      order: this.mapRawRowToDiagnosticOrder(orderRow),
      workflow: this.mapWorkflow(
        workflowRow,
        (eventsResult.rows as Record<string, unknown>[]).map((row) => this.mapWorkflowEvent(row))
      )
    };
  }

  private mapRowToDiagnosticOrder(
    row: typeof diagnosticOrders.$inferSelect
  ): DiagnosticOrderSummary {
    return {
      id: row.id as DiagnosticOrderId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      examType: row.examType,
      examCatalogId: row.examCatalogId ?? undefined,
      reason: row.reason,
      status: row.status as DiagnosticOrderSummary['status'],
      collectedAt: row.collectedAt?.toISOString(),
      collectedByUserId: row.collectedByUserId ?? undefined,
      resultSummary: row.resultSummary ?? undefined,
      resultValues: this.parseResultValues(row.resultValues),
      resultAttachmentId: row.resultAttachmentId ?? undefined,
      resultedAt: row.resultedAt?.toISOString(),
      releasedByUserId: row.releasedByUserId ?? undefined,
      signedByUserId: row.signedByUserId ?? undefined,
      signatureHash: row.signatureHash ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private mapRawRowToDiagnosticOrder(row: Record<string, unknown>): DiagnosticOrderSummary {
    return {
      id: String(row.id) as DiagnosticOrderId,
      accountId: String(row.account_id) as AccountId,
      encounterId: String(row.encounter_id) as EncounterId,
      patientId: String(row.patient_id) as PatientId,
      examType: String(row.exam_type),
      examCatalogId: this.optionalString(row.exam_catalog_id),
      reason: String(row.reason),
      status: String(row.status) as DiagnosticOrderSummary['status'],
      collectedAt: this.optionalIso(row.collected_at),
      collectedByUserId: this.optionalString(row.collected_by_user_id),
      resultSummary: this.optionalString(row.result_summary),
      resultValues: this.parseResultValues(row.result_values),
      resultAttachmentId: this.optionalString(row.result_attachment_id),
      resultedAt: this.optionalIso(row.resulted_at),
      releasedByUserId: this.optionalString(row.released_by_user_id),
      signedByUserId: this.optionalString(row.signed_by_user_id),
      signatureHash: this.optionalString(row.signature_hash),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at)
    };
  }

  private mapWorkflowEvent(row: Record<string, unknown>): LaboratoryWorkflowEvent {
    return {
      id: String(row.id),
      eventType: String(row.event_type) as LaboratoryWorkflowEvent['eventType'],
      status: String(row.status) as LaboratoryWorkflowEvent['status'],
      attempt: Number(row.attempt),
      reason: typeof row.reason === 'string' ? row.reason : undefined,
      actorUserId: typeof row.actor_user_id === 'string' ? row.actor_user_id : undefined,
      occurredAt: this.toIso(row.occurred_at)
    };
  }

  private mapWorkflow(
    row: Record<string, unknown>,
    history: readonly LaboratoryWorkflowEvent[]
  ): LaboratoryWorkflowState {
    return {
      orderId: String(row.order_id) as DiagnosticOrderId,
      accountId: String(row.account_id) as AccountId,
      status: String(row.status) as LaboratoryWorkflowState['status'],
      legacyStatus: row.legacy_status === 'resulted' ? 'resulted' : undefined,
      collectionAttempt: Number(row.collection_attempt),
      collectedAt: this.optionalIso(row.collected_at),
      collectedByUserId: this.optionalString(row.collected_by_user_id),
      analysisStartedAt: this.optionalIso(row.analysis_started_at),
      analysisStartedByUserId: this.optionalString(row.analysis_started_by_user_id),
      reportedAt: this.optionalIso(row.reported_at),
      reportedByUserId: this.optionalString(row.reported_by_user_id),
      deliveredAt: this.optionalIso(row.delivered_at),
      deliveredByUserId: this.optionalString(row.delivered_by_user_id),
      deliveryChannel: this.optionalString(row.delivery_channel),
      resultSummary: this.optionalString(row.result_summary),
      resultValues: this.parseResultValues(row.result_values),
      resultAttachmentId: this.optionalString(row.result_attachment_id),
      signedByUserId: this.optionalString(row.signed_by_user_id),
      signatureHash: this.optionalString(row.signature_hash),
      recollectionReason: this.optionalString(row.recollection_reason),
      cancellationReason: this.optionalString(row.cancellation_reason),
      history,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at)
    };
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private parseResultValues(value: unknown): ReturnType<typeof normalizeLaboratoryResultValues> {
    if (value === null || value === undefined) return undefined;
    let decoded: unknown = value;
    if (typeof value === 'string') {
      try {
        decoded = JSON.parse(value) as unknown;
      } catch (error) {
        throw new Error('Persisted laboratory result values are not valid JSON', { cause: error });
      }
    }
    return normalizeLaboratoryResultValues(decoded);
  }

  private jsonbValue(value: unknown): string | null {
    return value === undefined ? null : JSON.stringify(value);
  }

  private optionalIso(value: unknown): string | undefined {
    return value === null || value === undefined ? undefined : this.toIso(value);
  }

  private dateOrNull(value: string | undefined): Date | null {
    return value ? new Date(value) : null;
  }

  private sameInstant(left: string, right: string): boolean {
    return new Date(left).getTime() === new Date(right).getTime();
  }

  private toIso(value: unknown): string {
    return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
  }
}
