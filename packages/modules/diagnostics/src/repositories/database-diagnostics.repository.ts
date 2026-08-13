import { and, eq } from 'drizzle-orm';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { diagnosticOrders } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  PatientId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  EncounterId
} from '@cvg-his-v2/shared-types';

export interface DiagnosticOrderRepository {
  create(order: DiagnosticOrderSummary): Promise<void>;
  update(order: DiagnosticOrderSummary): Promise<void>;
  findById(
    accountId: AccountId,
    id: DiagnosticOrderId
  ): Promise<DiagnosticOrderSummary | null>;
  findAll(accountId: AccountId): Promise<readonly DiagnosticOrderSummary[]>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly DiagnosticOrderSummary[]>;
}

export class DatabaseDiagnosticOrderRepository implements DiagnosticOrderRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(order: DiagnosticOrderSummary): Promise<void> {
    await this.#db.insert(diagnosticOrders).values({
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
      resultAttachmentId: order.resultAttachmentId ?? null,
      resultedAt: order.resultedAt ? new Date(order.resultedAt) : null,
      releasedByUserId: order.releasedByUserId ?? null,
      signedByUserId: order.signedByUserId ?? null,
      signatureHash: order.signatureHash ?? null,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt)
    });
  }

  public async update(order: DiagnosticOrderSummary): Promise<void> {
    const updated = await this.#db
      .update(diagnosticOrders)
      .set({
        status: order.status,
        collectedAt: order.collectedAt ? new Date(order.collectedAt) : null,
        collectedByUserId: order.collectedByUserId ?? null,
        resultSummary: order.resultSummary ?? null,
        resultAttachmentId: order.resultAttachmentId ?? null,
        resultedAt: order.resultedAt ? new Date(order.resultedAt) : null,
        releasedByUserId: order.releasedByUserId ?? null,
        signedByUserId: order.signedByUserId ?? null,
        signatureHash: order.signatureHash ?? null,
        updatedAt: new Date(order.updatedAt)
      })
      .where(
        and(
          eq(diagnosticOrders.accountId, order.accountId),
          eq(diagnosticOrders.id, order.id)
        )
      )
      .returning({ id: diagnosticOrders.id });

    if (updated.length === 0) {
      throw new NotFoundError('Diagnostic order not found for account', {
        accountId: order.accountId,
        orderId: order.id
      });
    }
  }

  public async findById(
    accountId: AccountId,
    id: DiagnosticOrderId
  ): Promise<DiagnosticOrderSummary | null> {
    const result = await this.#db
      .select()
      .from(diagnosticOrders)
      .where(
        and(
          eq(diagnosticOrders.accountId, accountId),
          eq(diagnosticOrders.id, id)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToDiagnosticOrder(result[0]);
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly DiagnosticOrderSummary[]> {
    const result = await this.#db
      .select()
      .from(diagnosticOrders)
      .where(eq(diagnosticOrders.encounterId, encounterId));

    return result.map((row) => this.mapRowToDiagnosticOrder(row));
  }

  public async findAll(accountId: AccountId): Promise<readonly DiagnosticOrderSummary[]> {
    const result = await this.#db
      .select()
      .from(diagnosticOrders)
      .where(eq(diagnosticOrders.accountId, accountId));

    return result.map((row) => this.mapRowToDiagnosticOrder(row));
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
      resultAttachmentId: row.resultAttachmentId ?? undefined,
      resultedAt: row.resultedAt?.toISOString(),
      releasedByUserId: row.releasedByUserId ?? undefined,
      signedByUserId: row.signedByUserId ?? undefined,
      signatureHash: row.signatureHash ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
