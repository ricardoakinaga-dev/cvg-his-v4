import { and, count, eq, ilike, desc, asc, sql, isNull } from 'drizzle-orm';

import { db, labTests, labTestCategories, labTestPanels, labTestPanelItems, labOrders, labOrderItems, labSamples, labResults, labReports, labReportResults, labReferenceRanges } from '@cvg-his/db';

import type {
  LabTestRecord,
  LabOrderRecord,
  LabOrderItemRecord,
  LabSampleRecord,
  LabResultRecord,
  LabReportRecord,
  LabReferenceRangeRecord,
  LabTestCreateInput,
  LabTestUpdateInput,
  LabOrderCreateInput,
  LabOrderUpdateInput,
  LabSampleCreateInput,
  LabResultCreateInput,
  LabResultUpdateInput,
  LabReportCreateInput,
  LabReportUpdateInput,
  LabReferenceRangeCreateInput,
  LabReferenceRangeUpdateInput
} from './types.js';

type DbClient = typeof db;

// ============================================
// LAB TESTS REPO
// ============================================

export function createLabTestsRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      q?: string;
      categoryId?: string;
      specimenType?: string;
      active?: boolean;
    }): Promise<{ items: LabTestRecord[]; total: number }> {
      const conditions = [eq(labTests.accountId, params.accountId)];

      if (params.q) {
        conditions.push(ilike(labTests.name, `%${params.q}%`));
      }
      if (params.categoryId) {
        conditions.push(eq(labTests.categoryId, params.categoryId));
      }
      if (params.specimenType) {
        conditions.push(sql`${labTests.specimenType} = ${params.specimenType}`);
      }
      if (params.active !== undefined) {
        conditions.push(eq(labTests.isActive, params.active));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labTests)
        .where(whereClause);

      const items = await db
        .select()
        .from(labTests)
        .where(whereClause)
        .orderBy(asc(labTests.name))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabTestRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, testId: string): Promise<LabTestRecord | null> {
      const [result] = await db
        .select()
        .from(labTests)
        .where(and(eq(labTests.accountId, accountId), eq(labTests.id, testId)));

      return result as LabTestRecord | null;
    },

    async findByCode(accountId: string, code: string): Promise<LabTestRecord | null> {
      const [result] = await db
        .select()
        .from(labTests)
        .where(and(eq(labTests.accountId, accountId), eq(labTests.code, code)));

      return result as LabTestRecord | null;
    },

    async create(input: LabTestCreateInput & { accountId: string }): Promise<LabTestRecord> {
      const [result] = await db.insert(labTests).values(input).returning();
      return result as LabTestRecord;
    },

    async update(params: {
      accountId: string;
      testId: string;
      patch: LabTestUpdateInput;
    }): Promise<LabTestRecord | null> {
      const [result] = await db
        .update(labTests)
        .set({ ...params.patch, updatedAt: new Date() })
        .where(and(eq(labTests.accountId, params.accountId), eq(labTests.id, params.testId)))
        .returning();

      return result as LabTestRecord | null;
    },

    async delete(accountId: string, testId: string): Promise<void> {
      await db.delete(labTests).where(and(eq(labTests.accountId, accountId), eq(labTests.id, testId)));
    }
  };
}

// ============================================
// LAB ORDERS REPO
// ============================================

export function createLabOrdersRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      patientId?: string;
      encounterId?: string;
      status?: string;
      priority?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<{ items: LabOrderRecord[]; total: number }> {
      const conditions = [eq(labOrders.accountId, params.accountId)];

      if (params.patientId) {
        conditions.push(eq(labOrders.patientId, params.patientId));
      }
      if (params.encounterId) {
        conditions.push(eq(labOrders.encounterId, params.encounterId));
      }
      if (params.status) {
        conditions.push(sql`${labOrders.status} = ${params.status}`);
      }
      if (params.priority) {
        conditions.push(sql`${labOrders.priority} = ${params.priority}`);
      }
      if (params.fromDate) {
        conditions.push(sql`${labOrders.orderedAt} >= ${params.fromDate}::timestamptz`);
      }
      if (params.toDate) {
        conditions.push(sql`${labOrders.orderedAt} <= ${params.toDate}::timestamptz`);
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labOrders)
        .where(whereClause);

      const items = await db
        .select()
        .from(labOrders)
        .where(whereClause)
        .orderBy(desc(labOrders.orderedAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabOrderRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, orderId: string): Promise<LabOrderRecord | null> {
      const [result] = await db
        .select()
        .from(labOrders)
        .where(and(eq(labOrders.accountId, accountId), eq(labOrders.id, orderId)));

      return result as LabOrderRecord | null;
    },

    async findByOrderNumber(accountId: string, orderNumber: string): Promise<LabOrderRecord | null> {
      const [result] = await db
        .select()
        .from(labOrders)
        .where(and(eq(labOrders.accountId, accountId), eq(labOrders.orderNumber, orderNumber)));

      return result as LabOrderRecord | null;
    },

    async create(params: {
      accountId: string;
      orderNumber: string;
      input: LabOrderCreateInput;
      createdByUserId?: string;
    }): Promise<LabOrderRecord> {
      const [result] = await db
        .insert(labOrders)
        .values({
          accountId: params.accountId,
          orderNumber: params.orderNumber,
          patientId: params.input.patientId,
          encounterId: params.input.encounterId ?? null,
          priority: params.input.priority,
          clinicalNotes: params.input.clinicalNotes ?? null,
          diagnosis: params.input.diagnosis ?? null,
          fastingStatus: params.input.fastingStatus ?? null,
          createdByUserId: params.createdByUserId ?? null,
          status: 'pending'
        })
        .returning();

      return result as LabOrderRecord;
    },

    async update(params: {
      accountId: string;
      orderId: string;
      patch: LabOrderUpdateInput;
    }): Promise<LabOrderRecord | null> {
      const [result] = await db
        .update(labOrders)
        .set({ ...params.patch, updatedAt: new Date() })
        .where(and(eq(labOrders.accountId, params.accountId), eq(labOrders.id, params.orderId)))
        .returning();

      return result as LabOrderRecord | null;
    },

    async updateStatus(params: {
      accountId: string;
      orderId: string;
      status: string;
      collectedAt?: Date;
      completedAt?: Date;
      cancelledAt?: Date;
      cancelledReason?: string;
    }): Promise<LabOrderRecord | null> {
      const updateData: Record<string, unknown> = {
        status: sql`${params.status}`,
        updatedAt: new Date()
      };

      if (params.collectedAt) updateData.collectedAt = params.collectedAt;
      if (params.completedAt) updateData.completedAt = params.completedAt;
      if (params.cancelledAt) updateData.cancelledAt = params.cancelledAt;
      if (params.cancelledReason) updateData.cancelledReason = params.cancelledReason;

      const [result] = await db
        .update(labOrders)
        .set(updateData)
        .where(and(eq(labOrders.accountId, params.accountId), eq(labOrders.id, params.orderId)))
        .returning();

      return result as LabOrderRecord | null;
    },

    async delete(accountId: string, orderId: string): Promise<void> {
      await db.delete(labOrders).where(and(eq(labOrders.accountId, accountId), eq(labOrders.id, orderId)));
    }
  };
}

// ============================================
// LAB ORDER ITEMS REPO
// ============================================

export function createLabOrderItemsRepo(db: DbClient) {
  return {
    async findByOrderId(orderId: string): Promise<LabOrderItemRecord[]> {
      const items = await db
        .select()
        .from(labOrderItems)
        .where(eq(labOrderItems.orderId, orderId));

      return items as LabOrderItemRecord[];
    },

    async create(params: {
      accountId: string;
      orderId: string;
      testId: string;
      panelId?: string;
    }): Promise<LabOrderItemRecord> {
      const [result] = await db
        .insert(labOrderItems)
        .values({
          accountId: params.accountId,
          orderId: params.orderId,
          testId: params.testId,
          panelId: params.panelId ?? null,
          status: 'pending'
        })
        .returning();

      return result as LabOrderItemRecord;
    },

    async createBatch(params: {
      accountId: string;
      orderId: string;
      testIds: string[];
      panelIds?: string[];
    }): Promise<LabOrderItemRecord[]> {
      const values = params.testIds.map((testId) => ({
        accountId: params.accountId,
        orderId: params.orderId,
        testId,
        panelId: null as string | null,
        status: 'pending' as const
      }));

      const results = await db.insert(labOrderItems).values(values).returning();
      return results as LabOrderItemRecord[];
    },

    async updateStatus(params: {
      orderId: string;
      orderItemId: string;
      status: string;
    }): Promise<LabOrderItemRecord | null> {
      const [result] = await db
        .update(labOrderItems)
        .set({ status: sql`${params.status}`, updatedAt: new Date() })
        .where(eq(labOrderItems.id, params.orderItemId))
        .returning();

      return result as LabOrderItemRecord | null;
    },

    async deleteByOrderId(orderId: string): Promise<void> {
      await db.delete(labOrderItems).where(eq(labOrderItems.orderId, orderId));
    }
  };
}

// ============================================
// LAB SAMPLES REPO
// ============================================

export function createLabSamplesRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      orderId?: string;
      patientId?: string;
      status?: string;
      sampleType?: string;
    }): Promise<{ items: LabSampleRecord[]; total: number }> {
      const conditions = [eq(labSamples.accountId, params.accountId)];

      if (params.orderId) {
        conditions.push(eq(labSamples.orderId, params.orderId));
      }
      if (params.patientId) {
        conditions.push(eq(labSamples.patientId, params.patientId));
      }
      if (params.status) {
        conditions.push(sql`${labSamples.status} = ${params.status}`);
      }
      if (params.sampleType) {
        conditions.push(sql`${labSamples.sampleType} = ${params.sampleType}`);
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labSamples)
        .where(whereClause);

      const items = await db
        .select()
        .from(labSamples)
        .where(whereClause)
        .orderBy(desc(labSamples.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabSampleRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, sampleId: string): Promise<LabSampleRecord | null> {
      const [result] = await db
        .select()
        .from(labSamples)
        .where(and(eq(labSamples.accountId, accountId), eq(labSamples.id, sampleId)));

      return result as LabSampleRecord | null;
    },

    async create(params: {
      accountId: string;
      sampleNumber: string;
      input: LabSampleCreateInput;
      patientId: string;
    }): Promise<LabSampleRecord> {
      const [result] = await db
        .insert(labSamples)
        .values({
          accountId: params.accountId,
          sampleNumber: params.sampleNumber,
          orderId: params.input.orderId,
          orderItemId: params.input.orderItemId ?? null,
          patientId: params.patientId,
          sampleType: params.input.sampleType,
          specimenSource: params.input.specimenSource ?? null,
          volumeCollected: params.input.volumeCollected ?? null,
          collectionMethod: params.input.collectionMethod ?? null,
          notes: params.input.notes ?? null,
          status: 'pending'
        })
        .returning();

      return result as LabSampleRecord;
    },

    async updateStatus(params: {
      accountId: string;
      sampleId: string;
      status: string;
      collectedAt?: Date;
      collectedByUserId?: string;
      receivedAt?: Date;
      receivedByUserId?: string;
      processedAt?: Date;
      rejectedAt?: Date;
      rejectionReason?: string;
    }): Promise<LabSampleRecord | null> {
      const updateData: Record<string, unknown> = {
        status: sql`${params.status}`,
        updatedAt: new Date()
      };

      if (params.collectedAt) updateData.collectedAt = params.collectedAt;
      if (params.collectedByUserId) updateData.collectedByUserId = params.collectedByUserId;
      if (params.receivedAt) updateData.receivedAt = params.receivedAt;
      if (params.receivedByUserId) updateData.receivedByUserId = params.receivedByUserId;
      if (params.processedAt) updateData.processedAt = params.processedAt;
      if (params.rejectedAt) updateData.rejectedAt = params.rejectedAt;
      if (params.rejectionReason) updateData.rejectionReason = params.rejectionReason;

      const [result] = await db
        .update(labSamples)
        .set(updateData)
        .where(and(eq(labSamples.accountId, params.accountId), eq(labSamples.id, params.sampleId)))
        .returning();

      return result as LabSampleRecord | null;
    }
  };
}

// ============================================
// LAB RESULTS REPO
// ============================================

export function createLabResultsRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      orderItemId?: string;
      orderId?: string;
      patientId?: string;
      status?: string;
      flag?: string;
    }): Promise<{ items: LabResultRecord[]; total: number }> {
      const conditions = [eq(labResults.accountId, params.accountId)];

      if (params.orderItemId) {
        conditions.push(eq(labResults.orderItemId, params.orderItemId));
      }
      if (params.patientId) {
        conditions.push(eq(labResults.patientId, params.patientId));
      }
      if (params.status) {
        conditions.push(sql`${labResults.status} = ${params.status}`);
      }
      if (params.flag) {
        conditions.push(sql`${labResults.flag} = ${params.flag}`);
      }

      if (params.orderId) {
        const items = await db
          .select({
            result: labResults
          })
          .from(labResults)
          .innerJoin(labOrderItems, eq(labResults.orderItemId, labOrderItems.id))
          .where(and(eq(labOrderItems.orderId, params.orderId), ...conditions));

        return {
          items: items.map(i => i.result) as LabResultRecord[],
          total: items.length
        };
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labResults)
        .where(whereClause);

      const items = await db
        .select()
        .from(labResults)
        .where(whereClause)
        .orderBy(desc(labResults.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabResultRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, resultId: string): Promise<LabResultRecord | null> {
      const [result] = await db
        .select()
        .from(labResults)
        .where(and(eq(labResults.accountId, accountId), eq(labResults.id, resultId)));

      return result as LabResultRecord | null;
    },

    async create(params: {
      accountId: string;
      input: LabResultCreateInput;
      testId: string;
      patientId: string;
    }): Promise<LabResultRecord> {
      const [result] = await db
        .insert(labResults)
        .values({
          accountId: params.accountId,
          orderItemId: params.input.orderItemId,
          sampleId: params.input.sampleId ?? null,
          testId: params.testId,
          patientId: params.patientId,
          resultValue: params.input.resultValue ?? null,
          resultNumeric: params.input.resultNumeric?.toString() ?? null,
          unit: params.input.unit ?? null,
          referenceRange: params.input.referenceRange ?? null,
          referenceRangeId: params.input.referenceRangeId ?? null,
          flag: params.input.flag ?? null,
          notes: params.input.notes ?? null,
          interpretation: params.input.interpretation ?? null,
          status: 'pending'
        })
        .returning();

      return result as LabResultRecord;
    },

    async update(params: {
      accountId: string;
      resultId: string;
      patch: LabResultUpdateInput;
    }): Promise<LabResultRecord | null> {
      const updateData: Record<string, unknown> = {
        ...params.patch,
        updatedAt: new Date()
      };

      if (params.patch.resultNumeric !== undefined) {
        updateData.resultNumeric = params.patch.resultNumeric?.toString() ?? null;
      }

      const [result] = await db
        .update(labResults)
        .set(updateData)
        .where(and(eq(labResults.accountId, params.accountId), eq(labResults.id, params.resultId)))
        .returning();

      return result as LabResultRecord | null;
    },

    async updateStatus(params: {
      accountId: string;
      resultId: string;
      status: string;
      performedAt?: Date;
      performedByUserId?: string;
      verifiedAt?: Date;
      verifiedByUserId?: string;
    }): Promise<LabResultRecord | null> {
      const updateData: Record<string, unknown> = {
        status: sql`${params.status}`,
        updatedAt: new Date()
      };

      if (params.performedAt) updateData.performedAt = params.performedAt;
      if (params.performedByUserId) updateData.performedByUserId = params.performedByUserId;
      if (params.verifiedAt) updateData.verifiedAt = params.verifiedAt;
      if (params.verifiedByUserId) updateData.verifiedByUserId = params.verifiedByUserId;

      const [result] = await db
        .update(labResults)
        .set(updateData)
        .where(and(eq(labResults.accountId, params.accountId), eq(labResults.id, params.resultId)))
        .returning();

      return result as LabResultRecord | null;
    }
  };
}

// ============================================
// LAB REPORTS REPO
// ============================================

export function createLabReportsRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      orderId?: string;
      patientId?: string;
      status?: string;
    }): Promise<{ items: LabReportRecord[]; total: number }> {
      const conditions = [eq(labReports.accountId, params.accountId)];

      if (params.orderId) {
        conditions.push(eq(labReports.orderId, params.orderId));
      }
      if (params.patientId) {
        conditions.push(eq(labReports.patientId, params.patientId));
      }
      if (params.status) {
        conditions.push(sql`${labReports.status} = ${params.status}`);
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labReports)
        .where(whereClause);

      const items = await db
        .select()
        .from(labReports)
        .where(whereClause)
        .orderBy(desc(labReports.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabReportRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, reportId: string): Promise<LabReportRecord | null> {
      const [result] = await db
        .select()
        .from(labReports)
        .where(and(eq(labReports.accountId, accountId), eq(labReports.id, reportId)));

      return result as LabReportRecord | null;
    },

    async create(params: {
      accountId: string;
      reportNumber: string;
      input: LabReportCreateInput;
      patientId: string;
      draftedByUserId?: string;
    }): Promise<LabReportRecord> {
      const [result] = await db
        .insert(labReports)
        .values({
          accountId: params.accountId,
          reportNumber: params.reportNumber,
          orderId: params.input.orderId,
          patientId: params.patientId,
          conclusion: params.input.conclusion ?? null,
          methodology: params.input.methodology ?? null,
          limitations: params.input.limitations ?? null,
          notes: params.input.notes ?? null,
          status: 'draft',
          draftedAt: new Date(),
          draftedByUserId: params.draftedByUserId ?? null
        })
        .returning();

      return result as LabReportRecord;
    },

    async update(params: {
      accountId: string;
      reportId: string;
      patch: LabReportUpdateInput;
    }): Promise<LabReportRecord | null> {
      const [result] = await db
        .update(labReports)
        .set({ ...params.patch, updatedAt: new Date() })
        .where(and(eq(labReports.accountId, params.accountId), eq(labReports.id, params.reportId)))
        .returning();

      return result as LabReportRecord | null;
    },

    async updateStatus(params: {
      accountId: string;
      reportId: string;
      status: string;
      reviewedAt?: Date;
      reviewedByUserId?: string;
      finalizedAt?: Date;
      finalizedByUserId?: string;
      signedAt?: Date;
      signedByUserId?: string;
      signatureHash?: string;
      amendedAt?: Date;
      amendedReason?: string;
    }): Promise<LabReportRecord | null> {
      const updateData: Record<string, unknown> = {
        status: sql`${params.status}`,
        updatedAt: new Date()
      };

      if (params.reviewedAt) updateData.reviewedAt = params.reviewedAt;
      if (params.reviewedByUserId) updateData.reviewedByUserId = params.reviewedByUserId;
      if (params.finalizedAt) updateData.finalizedAt = params.finalizedAt;
      if (params.finalizedByUserId) updateData.finalizedByUserId = params.finalizedByUserId;
      if (params.signedAt) updateData.signedAt = params.signedAt;
      if (params.signedByUserId) updateData.signedByUserId = params.signedByUserId;
      if (params.signatureHash) updateData.signatureHash = params.signatureHash;
      if (params.amendedAt) updateData.amendedAt = params.amendedAt;
      if (params.amendedReason) updateData.amendedReason = params.amendedReason;

      const [result] = await db
        .update(labReports)
        .set(updateData)
        .where(and(eq(labReports.accountId, params.accountId), eq(labReports.id, params.reportId)))
        .returning();

      return result as LabReportRecord | null;
    },

    async addResults(reportId: string, resultIds: string[]): Promise<void> {
      const values = resultIds.map(resultId => ({
        reportId,
        resultId
      }));

      await db.insert(labReportResults).values(values);
    },

    async getReportResults(reportId: string): Promise<LabResultRecord[]> {
      const results = await db
        .select({ result: labResults })
        .from(labReportResults)
        .innerJoin(labResults, eq(labReportResults.resultId, labResults.id))
        .where(eq(labReportResults.reportId, reportId));

      return results.map(r => r.result) as LabResultRecord[];
    }
  };
}

// ============================================
// LAB REFERENCE RANGES REPO
// ============================================

export function createLabReferenceRangesRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      testId?: string;
      species?: string;
      active?: boolean;
    }): Promise<{ items: LabReferenceRangeRecord[]; total: number }> {
      const conditions = [eq(labReferenceRanges.accountId, params.accountId)];

      if (params.testId) {
        conditions.push(eq(labReferenceRanges.testId, params.testId));
      }
      if (params.species) {
        conditions.push(eq(labReferenceRanges.species, params.species));
      }
      if (params.active !== undefined) {
        conditions.push(eq(labReferenceRanges.isActive, params.active));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(labReferenceRanges)
        .where(whereClause);

      const items = await db
        .select()
        .from(labReferenceRanges)
        .where(whereClause)
        .orderBy(asc(labReferenceRanges.species), asc(labReferenceRanges.testId))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as LabReferenceRangeRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, rangeId: string): Promise<LabReferenceRangeRecord | null> {
      const [result] = await db
        .select()
        .from(labReferenceRanges)
        .where(and(eq(labReferenceRanges.accountId, accountId), eq(labReferenceRanges.id, rangeId)));

      return result as LabReferenceRangeRecord | null;
    },

    async findApplicable(params: {
      testId: string;
      species?: string;
      gender?: string;
      ageInDays?: number;
    }): Promise<LabReferenceRangeRecord | null> {
      const conditions = [eq(labReferenceRanges.testId, params.testId), eq(labReferenceRanges.isActive, true)];

      if (params.species) {
        const [speciesResult] = await db
          .select()
          .from(labReferenceRanges)
          .where(and(...conditions, eq(labReferenceRanges.species, params.species)))
          .limit(1);

        if (speciesResult) {
          return speciesResult as LabReferenceRangeRecord;
        }
      }

      const [genericResult] = await db
        .select()
        .from(labReferenceRanges)
        .where(and(...conditions, isNull(labReferenceRanges.species)))
        .limit(1);

      return genericResult as LabReferenceRangeRecord | null;
    },

    async create(params: {
      accountId: string;
      input: LabReferenceRangeCreateInput;
    }): Promise<LabReferenceRangeRecord> {
      const [result] = await db
        .insert(labReferenceRanges)
        .values({
          accountId: params.accountId,
          testId: params.input.testId,
          species: params.input.species ?? null,
          gender: params.input.gender ?? null,
          ageMinDays: params.input.ageMinDays?.toString() ?? null,
          ageMaxDays: params.input.ageMaxDays?.toString() ?? null,
          lowValue: params.input.lowValue?.toString() ?? null,
          highValue: params.input.highValue?.toString() ?? null,
          lowCritical: params.input.lowCritical?.toString() ?? null,
          highCritical: params.input.highCritical?.toString() ?? null,
          unit: params.input.unit ?? null,
          interpretationNotes: params.input.interpretationNotes ?? null,
          isActive: params.input.isActive ?? true
        })
        .returning();

      return result as LabReferenceRangeRecord;
    },

    async update(params: {
      accountId: string;
      rangeId: string;
      patch: LabReferenceRangeUpdateInput;
    }): Promise<LabReferenceRangeRecord | null> {
      const updateData: Record<string, unknown> = {
        ...params.patch,
        updatedAt: new Date()
      };

      if (params.patch.ageMinDays !== undefined) {
        updateData.ageMinDays = params.patch.ageMinDays?.toString() ?? null;
      }
      if (params.patch.ageMaxDays !== undefined) {
        updateData.ageMaxDays = params.patch.ageMaxDays?.toString() ?? null;
      }
      if (params.patch.lowValue !== undefined) {
        updateData.lowValue = params.patch.lowValue?.toString() ?? null;
      }
      if (params.patch.highValue !== undefined) {
        updateData.highValue = params.patch.highValue?.toString() ?? null;
      }
      if (params.patch.lowCritical !== undefined) {
        updateData.lowCritical = params.patch.lowCritical?.toString() ?? null;
      }
      if (params.patch.highCritical !== undefined) {
        updateData.highCritical = params.patch.highCritical?.toString() ?? null;
      }

      const [result] = await db
        .update(labReferenceRanges)
        .set(updateData)
        .where(and(eq(labReferenceRanges.accountId, params.accountId), eq(labReferenceRanges.id, params.rangeId)))
        .returning();

      return result as LabReferenceRangeRecord | null;
    },

    async delete(accountId: string, rangeId: string): Promise<void> {
      await db.delete(labReferenceRanges).where(and(eq(labReferenceRanges.accountId, accountId), eq(labReferenceRanges.id, rangeId)));
    }
  };
}

// Combined repo type
export type LabRepo = {
  tests: ReturnType<typeof createLabTestsRepo>;
  orders: ReturnType<typeof createLabOrdersRepo>;
  orderItems: ReturnType<typeof createLabOrderItemsRepo>;
  samples: ReturnType<typeof createLabSamplesRepo>;
  results: ReturnType<typeof createLabResultsRepo>;
  reports: ReturnType<typeof createLabReportsRepo>;
  referenceRanges: ReturnType<typeof createLabReferenceRangesRepo>;
};

export function createLabRepo(db: DbClient): LabRepo {
  return {
    tests: createLabTestsRepo(db),
    orders: createLabOrdersRepo(db),
    orderItems: createLabOrderItemsRepo(db),
    samples: createLabSamplesRepo(db),
    results: createLabResultsRepo(db),
    reports: createLabReportsRepo(db),
    referenceRanges: createLabReferenceRangesRepo(db)
  };
}
