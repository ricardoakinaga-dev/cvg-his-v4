import { eq } from 'drizzle-orm';
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
  findById(id: DiagnosticOrderId): Promise<DiagnosticOrderSummary | null>;
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
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt)
    });
  }

  public async update(order: DiagnosticOrderSummary): Promise<void> {
    await this.#db
      .update(diagnosticOrders)
      .set({
        status: order.status,
        collectedAt: order.collectedAt ? new Date(order.collectedAt) : null,
        collectedByUserId: order.collectedByUserId ?? null,
        resultSummary: order.resultSummary ?? null,
        resultAttachmentId: order.resultAttachmentId ?? null,
        updatedAt: new Date(order.updatedAt)
      })
      .where(eq(diagnosticOrders.id, order.id));
  }

  public async findById(id: DiagnosticOrderId): Promise<DiagnosticOrderSummary | null> {
    const result = await this.#db
      .select()
      .from(diagnosticOrders)
      .where(eq(diagnosticOrders.id, id))
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
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
