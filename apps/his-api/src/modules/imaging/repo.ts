import { and, count, eq, ilike, desc, asc, sql, isNull, gte, lte, between } from 'drizzle-orm';

import { db, 
  imagingModalities, imagingModalityTemplates,
  imagingOrders, imagingStudies, imagingStudyDocuments,
  imagingReports, imagingReportDocuments,
  imagingScheduleSlots, imagingSequences,
  patients, documents
} from '@cvg-his/db';

import type {
  ImagingModalityRecord,
  ImagingModalityCreateInput,
  ImagingModalityUpdateInput,
  ImagingTemplateRecord,
  ImagingTemplateCreateInput,
  ImagingTemplateUpdateInput,
  ImagingOrderRecord,
  ImagingOrderCreateInput,
  ImagingOrderUpdateInput,
  ImagingStudyRecord,
  ImagingStudyCreateInput,
  ImagingStudyUpdateInput,
  ImagingStudyDocumentRecord,
  ImagingReportRecord,
  ImagingReportCreateInput,
  ImagingReportUpdateInput,
  ImagingReportDocumentRecord,
  ImagingScheduleSlotRecord,
  ImagingScheduleSlotCreateInput,
  ImagingScheduleSlotUpdateInput
} from './types.js';

type DbClient = typeof db;

// ============================================
// IMAGING MODALITIES REPO
// ============================================

export function createImagingModalitiesRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      q?: string;
      category?: string;
      active?: boolean;
    }): Promise<{ items: ImagingModalityRecord[]; total: number }> {
      const conditions = [eq(imagingModalities.accountId, params.accountId)];

      if (params.q) {
        conditions.push(ilike(imagingModalities.name, `%${params.q}%`));
      }
      if (params.category) {
        conditions.push(eq(imagingModalities.category, params.category));
      }
      if (params.active !== undefined) {
        conditions.push(eq(imagingModalities.isActive, params.active));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(imagingModalities)
        .where(whereClause);

      const items = await db
        .select()
        .from(imagingModalities)
        .where(whereClause)
        .orderBy(asc(imagingModalities.name))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as ImagingModalityRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, modalityId: string): Promise<ImagingModalityRecord | null> {
      const [result] = await db
        .select()
        .from(imagingModalities)
        .where(and(eq(imagingModalities.accountId, accountId), eq(imagingModalities.id, modalityId)));

      return result as ImagingModalityRecord | null;
    },

    async findByCode(accountId: string, code: string): Promise<ImagingModalityRecord | null> {
      const [result] = await db
        .select()
        .from(imagingModalities)
        .where(and(eq(imagingModalities.accountId, accountId), eq(imagingModalities.code, code)));

      return result as ImagingModalityRecord | null;
    },

    async create(input: ImagingModalityCreateInput & { accountId: string }): Promise<ImagingModalityRecord> {
      const [result] = await db.insert(imagingModalities).values({
        accountId: input.accountId,
        code: input.code,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        preparationInstructions: input.preparationInstructions ?? null,
        contrastRequired: input.contrastRequired ?? false,
        contrastType: input.contrastType ?? null,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? 30,
        equipmentType: input.equipmentType ?? null,
        isActive: input.isActive ?? true
      }).returning();
      return result as ImagingModalityRecord;
    },

    async update(params: { accountId: string; modalityId: string; patch: ImagingModalityUpdateInput }): Promise<ImagingModalityRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.code !== undefined) updateData.code = params.patch.code;
      if (params.patch.name !== undefined) updateData.name = params.patch.name;
      if (params.patch.category !== undefined) updateData.category = params.patch.category;
      if (params.patch.description !== undefined) updateData.description = params.patch.description;
      if (params.patch.preparationInstructions !== undefined) updateData.preparationInstructions = params.patch.preparationInstructions;
      if (params.patch.contrastRequired !== undefined) updateData.contrastRequired = params.patch.contrastRequired;
      if (params.patch.contrastType !== undefined) updateData.contrastType = params.patch.contrastType;
      if (params.patch.estimatedDurationMinutes !== undefined) updateData.estimatedDurationMinutes = params.patch.estimatedDurationMinutes;
      if (params.patch.equipmentType !== undefined) updateData.equipmentType = params.patch.equipmentType;
      if (params.patch.isActive !== undefined) updateData.isActive = params.patch.isActive;

      const [result] = await db
        .update(imagingModalities)
        .set(updateData)
        .where(and(eq(imagingModalities.accountId, params.accountId), eq(imagingModalities.id, params.modalityId)))
        .returning();
      return result as ImagingModalityRecord | null;
    },

    async delete(accountId: string, modalityId: string): Promise<void> {
      await db
        .delete(imagingModalities)
        .where(and(eq(imagingModalities.accountId, accountId), eq(imagingModalities.id, modalityId)));
    }
  };
}

// ============================================
// IMAGING TEMPLATES REPO
// ============================================

export function createImagingTemplatesRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      modalityId?: string;
      q?: string;
    }): Promise<{ items: ImagingTemplateRecord[]; total: number }> {
      const conditions = [eq(imagingModalityTemplates.accountId, params.accountId)];

      if (params.modalityId) {
        conditions.push(eq(imagingModalityTemplates.modalityId, params.modalityId));
      }
      if (params.q) {
        conditions.push(ilike(imagingModalityTemplates.name, `%${params.q}%`));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(imagingModalityTemplates)
        .where(whereClause);

      const items = await db
        .select()
        .from(imagingModalityTemplates)
        .where(whereClause)
        .orderBy(asc(imagingModalityTemplates.name))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items as ImagingTemplateRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, templateId: string): Promise<ImagingTemplateRecord | null> {
      const [result] = await db
        .select()
        .from(imagingModalityTemplates)
        .where(and(eq(imagingModalityTemplates.accountId, accountId), eq(imagingModalityTemplates.id, templateId)));

      return result as ImagingTemplateRecord | null;
    },

    async create(input: ImagingTemplateCreateInput & { accountId: string }): Promise<ImagingTemplateRecord> {
      const [result] = await db.insert(imagingModalityTemplates).values({
        accountId: input.accountId,
        modalityId: input.modalityId,
        name: input.name,
        templateContent: input.templateContent,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true
      }).returning();
      return result as ImagingTemplateRecord;
    },

    async update(params: { accountId: string; templateId: string; patch: ImagingTemplateUpdateInput }): Promise<ImagingTemplateRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.modalityId !== undefined) updateData.modalityId = params.patch.modalityId;
      if (params.patch.name !== undefined) updateData.name = params.patch.name;
      if (params.patch.templateContent !== undefined) updateData.templateContent = params.patch.templateContent;
      if (params.patch.isDefault !== undefined) updateData.isDefault = params.patch.isDefault;
      if (params.patch.isActive !== undefined) updateData.isActive = params.patch.isActive;

      const [result] = await db
        .update(imagingModalityTemplates)
        .set(updateData)
        .where(and(eq(imagingModalityTemplates.accountId, params.accountId), eq(imagingModalityTemplates.id, params.templateId)))
        .returning();
      return result as ImagingTemplateRecord | null;
    },

    async delete(accountId: string, templateId: string): Promise<void> {
      await db
        .delete(imagingModalityTemplates)
        .where(and(eq(imagingModalityTemplates.accountId, accountId), eq(imagingModalityTemplates.id, templateId)));
    }
  };
}

// ============================================
// IMAGING ORDERS REPO
// ============================================

export function createImagingOrdersRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      patientId?: string;
      encounterId?: string;
      modalityId?: string;
      status?: string;
      priority?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<{ items: ImagingOrderRecord[]; total: number }> {
      const conditions = [eq(imagingOrders.accountId, params.accountId)];

      if (params.patientId) {
        conditions.push(eq(imagingOrders.patientId, params.patientId));
      }
      if (params.encounterId) {
        conditions.push(eq(imagingOrders.encounterId, params.encounterId));
      }
      if (params.modalityId) {
        conditions.push(eq(imagingOrders.modalityId, params.modalityId));
      }
      if (params.status) {
        conditions.push(sql`${imagingOrders.status} = ${params.status}`);
      }
      if (params.priority) {
        conditions.push(sql`${imagingOrders.priority} = ${params.priority}`);
      }
      if (params.fromDate) {
        conditions.push(gte(imagingOrders.createdAt, new Date(params.fromDate)));
      }
      if (params.toDate) {
        conditions.push(lte(imagingOrders.createdAt, new Date(params.toDate)));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(imagingOrders)
        .where(whereClause);

      const items = await db
        .select({
          order: imagingOrders,
          modality: imagingModalities,
          patient: {
            id: patients.id,
            name: patients.name,
            species: patients.species
          }
        })
        .from(imagingOrders)
        .leftJoin(imagingModalities, eq(imagingOrders.modalityId, imagingModalities.id))
        .leftJoin(patients, eq(imagingOrders.patientId, patients.id))
        .where(whereClause)
        .orderBy(desc(imagingOrders.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items.map(i => ({
          ...i.order,
          modality: i.modality as ImagingModalityRecord | undefined,
          patient: i.patient as { id: string; name: string; species: string } | undefined
        })) as ImagingOrderRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, orderId: string): Promise<ImagingOrderRecord | null> {
      const [result] = await db
        .select({
          order: imagingOrders,
          modality: imagingModalities,
          patient: {
            id: patients.id,
            name: patients.name,
            species: patients.species
          }
        })
        .from(imagingOrders)
        .leftJoin(imagingModalities, eq(imagingOrders.modalityId, imagingModalities.id))
        .leftJoin(patients, eq(imagingOrders.patientId, patients.id))
        .where(and(eq(imagingOrders.accountId, accountId), eq(imagingOrders.id, orderId)));

      if (!result) return null;
      return {
        ...result.order,
        modality: result.modality as ImagingModalityRecord | undefined,
        patient: result.patient as { id: string; name: string; species: string } | undefined
      } as ImagingOrderRecord;
    },

    async create(params: {
      accountId: string;
      orderNumber: string;
      input: ImagingOrderCreateInput;
      createdByUserId: string;
    }): Promise<ImagingOrderRecord> {
      const [result] = await db.insert(imagingOrders).values({
        accountId: params.accountId,
        orderNumber: params.orderNumber,
        patientId: params.input.patientId,
        encounterId: params.input.encounterId ?? null,
        modalityId: params.input.modalityId,
        priority: params.input.priority ?? 'routine',
        clinicalIndication: params.input.clinicalIndication,
        clinicalHistory: params.input.clinicalHistory ?? null,
        suspectedDiagnosis: params.input.suspectedDiagnosis ?? null,
        bodyRegion: params.input.bodyRegion ?? null,
        laterality: params.input.laterality ?? null,
        contrastRequested: params.input.contrastRequested ?? false,
        contrastType: params.input.contrastType ?? null,
        sedationRequired: params.input.sedationRequired ?? false,
        specialInstructions: params.input.specialInstructions ?? null,
        createdByUserId: params.createdByUserId
      }).returning();
      return result as ImagingOrderRecord;
    },

    async update(params: {
      accountId: string;
      orderId: string;
      patch: ImagingOrderUpdateInput;
    }): Promise<ImagingOrderRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.priority !== undefined) updateData.priority = params.patch.priority;
      if (params.patch.clinicalIndication !== undefined) updateData.clinicalIndication = params.patch.clinicalIndication;
      if (params.patch.clinicalHistory !== undefined) updateData.clinicalHistory = params.patch.clinicalHistory;
      if (params.patch.suspectedDiagnosis !== undefined) updateData.suspectedDiagnosis = params.patch.suspectedDiagnosis;
      if (params.patch.bodyRegion !== undefined) updateData.bodyRegion = params.patch.bodyRegion;
      if (params.patch.laterality !== undefined) updateData.laterality = params.patch.laterality;
      if (params.patch.contrastRequested !== undefined) updateData.contrastRequested = params.patch.contrastRequested;
      if (params.patch.contrastType !== undefined) updateData.contrastType = params.patch.contrastType;
      if (params.patch.sedationRequired !== undefined) updateData.sedationRequired = params.patch.sedationRequired;
      if (params.patch.specialInstructions !== undefined) updateData.specialInstructions = params.patch.specialInstructions;

      const [result] = await db
        .update(imagingOrders)
        .set(updateData)
        .where(and(eq(imagingOrders.accountId, params.accountId), eq(imagingOrders.id, params.orderId)))
        .returning();
      return result as ImagingOrderRecord | null;
    },

    async updateStatus(params: {
      accountId: string;
      orderId: string;
      status: string;
      scheduledAt?: Date | null;
      performedAt?: Date | null;
      completedAt?: Date | null;
      cancelledAt?: Date | null;
      cancelledReason?: string | null;
    }): Promise<ImagingOrderRecord | null> {
      const updateData: Record<string, unknown> = { status: params.status };
      if (params.scheduledAt !== undefined) updateData.scheduledAt = params.scheduledAt;
      if (params.performedAt !== undefined) updateData.performedAt = params.performedAt;
      if (params.completedAt !== undefined) updateData.completedAt = params.completedAt;
      if (params.cancelledAt !== undefined) updateData.cancelledAt = params.cancelledAt;
      if (params.cancelledReason !== undefined) updateData.cancelledReason = params.cancelledReason;

      const [result] = await db
        .update(imagingOrders)
        .set(updateData)
        .where(and(eq(imagingOrders.accountId, params.accountId), eq(imagingOrders.id, params.orderId)))
        .returning();
      return result as ImagingOrderRecord | null;
    }
  };
}

// ============================================
// IMAGING STUDIES REPO
// ============================================

export function createImagingStudiesRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      orderId?: string;
      patientId?: string;
      modalityId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<{ items: ImagingStudyRecord[]; total: number }> {
      const conditions = [eq(imagingStudies.accountId, params.accountId)];

      if (params.orderId) {
        conditions.push(eq(imagingStudies.orderId, params.orderId));
      }
      if (params.patientId) {
        conditions.push(eq(imagingStudies.patientId, params.patientId));
      }
      if (params.modalityId) {
        conditions.push(eq(imagingStudies.modalityId, params.modalityId));
      }
      if (params.status) {
        conditions.push(sql`${imagingStudies.status} = ${params.status}`);
      }
      if (params.fromDate) {
        conditions.push(gte(imagingStudies.studyDatetime, new Date(params.fromDate)));
      }
      if (params.toDate) {
        conditions.push(lte(imagingStudies.studyDatetime, new Date(params.toDate)));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(imagingStudies)
        .where(whereClause);

      const items = await db
        .select({
          study: imagingStudies,
          modality: imagingModalities
        })
        .from(imagingStudies)
        .leftJoin(imagingModalities, eq(imagingStudies.modalityId, imagingModalities.id))
        .where(whereClause)
        .orderBy(desc(imagingStudies.studyDatetime))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items.map(i => ({
          ...i.study,
          modality: i.modality as ImagingModalityRecord | undefined
        })) as ImagingStudyRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, studyId: string): Promise<ImagingStudyRecord | null> {
      const [result] = await db
        .select({
          study: imagingStudies,
          modality: imagingModalities
        })
        .from(imagingStudies)
        .leftJoin(imagingModalities, eq(imagingStudies.modalityId, imagingModalities.id))
        .where(and(eq(imagingStudies.accountId, accountId), eq(imagingStudies.id, studyId)));

      if (!result) return null;
      return {
        ...result.study,
        modality: result.modality as ImagingModalityRecord | undefined
      } as ImagingStudyRecord;
    },

    async findByIdWithDocuments(accountId: string, studyId: string): Promise<ImagingStudyRecord | null> {
      const study = await this.findById(accountId, studyId);
      if (!study) return null;

      const docs = await db
        .select({
          id: imagingStudyDocuments.id,
          accountId: imagingStudyDocuments.accountId,
          studyId: imagingStudyDocuments.studyId,
          documentId: imagingStudyDocuments.documentId,
          attachmentType: imagingStudyDocuments.attachmentType,
          displayOrder: imagingStudyDocuments.displayOrder,
          createdByUserId: imagingStudyDocuments.createdByUserId,
          createdAt: imagingStudyDocuments.createdAt,
          document: {
            id: documents.id,
            filename: documents.filename,
            mimeType: documents.mimeType,
            url: documents.storageKey
          }
        })
        .from(imagingStudyDocuments)
        .leftJoin(documents, eq(imagingStudyDocuments.documentId, documents.id))
        .where(eq(imagingStudyDocuments.studyId, studyId))
        .orderBy(asc(imagingStudyDocuments.displayOrder));

      return {
        ...study,
        documents: docs as ImagingStudyDocumentRecord[]
      };
    },

    async create(params: {
      accountId: string;
      studyNumber: string;
      input: ImagingStudyCreateInput;
      patientId: string;
      modalityId: string;
      performedByUserId?: string;
    }): Promise<ImagingStudyRecord> {
      const [result] = await db.insert(imagingStudies).values({
        accountId: params.accountId,
        studyNumber: params.studyNumber,
        orderId: params.input.orderId,
        patientId: params.patientId,
        modalityId: params.modalityId,
        studyDatetime: params.input.studyDatetime ? new Date(params.input.studyDatetime) : new Date(),
        bodyRegion: params.input.bodyRegion ?? null,
        laterality: params.input.laterality ?? null,
        contrastAdministered: params.input.contrastAdministered ?? false,
        contrastType: params.input.contrastType ?? null,
        contrastVolumeMl: params.input.contrastVolumeMl?.toString() ?? null,
        sedationAdministered: params.input.sedationAdministered ?? false,
        sedationDetails: params.input.sedationDetails ?? null,
        equipmentUsed: params.input.equipmentUsed ?? null,
        acquisitionParameters: params.input.acquisitionParameters ?? null,
        numberOfImages: params.input.numberOfImages ?? 0,
        studyNotes: params.input.studyNotes ?? null,
        technicianUserId: params.input.technicianUserId ?? null,
        performedByUserId: params.performedByUserId ?? null
      }).returning();
      return result as ImagingStudyRecord;
    },

    async update(params: {
      accountId: string;
      studyId: string;
      patch: ImagingStudyUpdateInput;
    }): Promise<ImagingStudyRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.studyDatetime !== undefined) updateData.studyDatetime = new Date(params.patch.studyDatetime);
      if (params.patch.bodyRegion !== undefined) updateData.bodyRegion = params.patch.bodyRegion;
      if (params.patch.laterality !== undefined) updateData.laterality = params.patch.laterality;
      if (params.patch.contrastAdministered !== undefined) updateData.contrastAdministered = params.patch.contrastAdministered;
      if (params.patch.contrastType !== undefined) updateData.contrastType = params.patch.contrastType;
      if (params.patch.contrastVolumeMl !== undefined) updateData.contrastVolumeMl = params.patch.contrastVolumeMl?.toString();
      if (params.patch.sedationAdministered !== undefined) updateData.sedationAdministered = params.patch.sedationAdministered;
      if (params.patch.sedationDetails !== undefined) updateData.sedationDetails = params.patch.sedationDetails;
      if (params.patch.equipmentUsed !== undefined) updateData.equipmentUsed = params.patch.equipmentUsed;
      if (params.patch.acquisitionParameters !== undefined) updateData.acquisitionParameters = params.patch.acquisitionParameters;
      if (params.patch.numberOfImages !== undefined) updateData.numberOfImages = params.patch.numberOfImages;
      if (params.patch.studyNotes !== undefined) updateData.studyNotes = params.patch.studyNotes;
      if (params.patch.technicianUserId !== undefined) updateData.technicianUserId = params.patch.technicianUserId;

      const [result] = await db
        .update(imagingStudies)
        .set(updateData)
        .where(and(eq(imagingStudies.accountId, params.accountId), eq(imagingStudies.id, params.studyId)))
        .returning();
      return result as ImagingStudyRecord | null;
    },

    async updateStatus(params: {
      accountId: string;
      studyId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    }): Promise<ImagingStudyRecord | null> {
      const [result] = await db
        .update(imagingStudies)
        .set({ status: params.status })
        .where(and(eq(imagingStudies.accountId, params.accountId), eq(imagingStudies.id, params.studyId)))
        .returning();
      return result as ImagingStudyRecord | null;
    },

    async attachDocument(params: {
      accountId: string;
      studyId: string;
      documentId: string;
      attachmentType: string;
      displayOrder: number;
      createdByUserId?: string;
    }): Promise<ImagingStudyDocumentRecord> {
      const [result] = await db.insert(imagingStudyDocuments).values({
        accountId: params.accountId,
        studyId: params.studyId,
        documentId: params.documentId,
        attachmentType: params.attachmentType,
        displayOrder: params.displayOrder,
        createdByUserId: params.createdByUserId ?? null
      }).returning();
      return result as ImagingStudyDocumentRecord;
    },

    async detachDocument(accountId: string, studyId: string, documentId: string): Promise<void> {
      await db
        .delete(imagingStudyDocuments)
        .where(and(
          eq(imagingStudyDocuments.accountId, accountId),
          eq(imagingStudyDocuments.studyId, studyId),
          eq(imagingStudyDocuments.documentId, documentId)
        ));
    }
  };
}

// ============================================
// IMAGING REPORTS REPO
// ============================================

export function createImagingReportsRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      page: number;
      pageSize: number;
      orderId?: string;
      studyId?: string;
      patientId?: string;
      modalityId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<{ items: ImagingReportRecord[]; total: number }> {
      const conditions = [eq(imagingReports.accountId, params.accountId)];

      if (params.orderId) {
        conditions.push(eq(imagingReports.orderId, params.orderId));
      }
      if (params.studyId) {
        conditions.push(eq(imagingReports.studyId, params.studyId));
      }
      if (params.patientId) {
        conditions.push(eq(imagingReports.patientId, params.patientId));
      }
      if (params.modalityId) {
        conditions.push(eq(imagingReports.modalityId, params.modalityId));
      }
      if (params.status) {
        conditions.push(sql`${imagingReports.status} = ${params.status}`);
      }
      if (params.fromDate) {
        conditions.push(gte(imagingReports.createdAt, new Date(params.fromDate)));
      }
      if (params.toDate) {
        conditions.push(lte(imagingReports.createdAt, new Date(params.toDate)));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: count() })
        .from(imagingReports)
        .where(whereClause);

      const items = await db
        .select({
          report: imagingReports,
          modality: imagingModalities
        })
        .from(imagingReports)
        .leftJoin(imagingModalities, eq(imagingReports.modalityId, imagingModalities.id))
        .where(whereClause)
        .orderBy(desc(imagingReports.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize);

      return {
        items: items.map(i => ({
          ...i.report,
          modality: i.modality as ImagingModalityRecord | undefined
        })) as ImagingReportRecord[],
        total: totalResult?.count ?? 0
      };
    },

    async findById(accountId: string, reportId: string): Promise<ImagingReportRecord | null> {
      const [result] = await db
        .select({
          report: imagingReports,
          modality: imagingModalities
        })
        .from(imagingReports)
        .leftJoin(imagingModalities, eq(imagingReports.modalityId, imagingModalities.id))
        .where(and(eq(imagingReports.accountId, accountId), eq(imagingReports.id, reportId)));

      if (!result) return null;
      return {
        ...result.report,
        modality: result.modality as ImagingModalityRecord | undefined
      } as ImagingReportRecord;
    },

    async findByIdWithDocuments(accountId: string, reportId: string): Promise<ImagingReportRecord | null> {
      const report = await this.findById(accountId, reportId);
      if (!report) return null;

      const docs = await db
        .select({
          id: imagingReportDocuments.id,
          accountId: imagingReportDocuments.accountId,
          reportId: imagingReportDocuments.reportId,
          documentId: imagingReportDocuments.documentId,
          attachmentType: imagingReportDocuments.attachmentType,
          displayOrder: imagingReportDocuments.displayOrder,
          createdByUserId: imagingReportDocuments.createdByUserId,
          createdAt: imagingReportDocuments.createdAt,
          document: {
            id: documents.id,
            filename: documents.filename,
            mimeType: documents.mimeType,
            url: documents.storageKey
          }
        })
        .from(imagingReportDocuments)
        .leftJoin(documents, eq(imagingReportDocuments.documentId, documents.id))
        .where(eq(imagingReportDocuments.reportId, reportId))
        .orderBy(asc(imagingReportDocuments.displayOrder));

      return {
        ...report,
        documents: docs as ImagingReportDocumentRecord[]
      };
    },

    async create(params: {
      accountId: string;
      reportNumber: string;
      input: ImagingReportCreateInput;
      patientId: string;
      draftedByUserId: string;
    }): Promise<ImagingReportRecord> {
      const [result] = await db.insert(imagingReports).values({
        accountId: params.accountId,
        reportNumber: params.reportNumber,
        orderId: params.input.orderId,
        studyId: params.input.studyId ?? null,
        patientId: params.patientId,
        modalityId: params.input.modalityId,
        technique: params.input.technique ?? null,
        findings: params.input.findings ?? null,
        impression: params.input.impression ?? null,
        conclusion: params.input.conclusion ?? null,
        recommendations: params.input.recommendations ?? null,
        limitations: params.input.limitations ?? null,
        comparison: params.input.comparison ?? null,
        templateId: params.input.templateId ?? null,
        notes: params.input.notes ?? null,
        draftedAt: new Date(),
        draftedByUserId: params.draftedByUserId
      }).returning();
      return result as ImagingReportRecord;
    },

    async update(params: {
      accountId: string;
      reportId: string;
      patch: ImagingReportUpdateInput;
    }): Promise<ImagingReportRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.studyId !== undefined) updateData.studyId = params.patch.studyId;
      if (params.patch.modalityId !== undefined) updateData.modalityId = params.patch.modalityId;
      if (params.patch.technique !== undefined) updateData.technique = params.patch.technique;
      if (params.patch.findings !== undefined) updateData.findings = params.patch.findings;
      if (params.patch.impression !== undefined) updateData.impression = params.patch.impression;
      if (params.patch.conclusion !== undefined) updateData.conclusion = params.patch.conclusion;
      if (params.patch.recommendations !== undefined) updateData.recommendations = params.patch.recommendations;
      if (params.patch.limitations !== undefined) updateData.limitations = params.patch.limitations;
      if (params.patch.comparison !== undefined) updateData.comparison = params.patch.comparison;
      if (params.patch.templateId !== undefined) updateData.templateId = params.patch.templateId;
      if (params.patch.notes !== undefined) updateData.notes = params.patch.notes;

      const [result] = await db
        .update(imagingReports)
        .set(updateData)
        .where(and(eq(imagingReports.accountId, params.accountId), eq(imagingReports.id, params.reportId)))
        .returning();
      return result as ImagingReportRecord | null;
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
    }): Promise<ImagingReportRecord | null> {
      const updateData: Record<string, unknown> = { status: params.status };
      if (params.reviewedAt !== undefined) updateData.reviewedAt = params.reviewedAt;
      if (params.reviewedByUserId !== undefined) updateData.reviewedByUserId = params.reviewedByUserId;
      if (params.finalizedAt !== undefined) updateData.finalizedAt = params.finalizedAt;
      if (params.finalizedByUserId !== undefined) updateData.finalizedByUserId = params.finalizedByUserId;
      if (params.signedAt !== undefined) updateData.signedAt = params.signedAt;
      if (params.signedByUserId !== undefined) updateData.signedByUserId = params.signedByUserId;
      if (params.signatureHash !== undefined) updateData.signatureHash = params.signatureHash;
      if (params.amendedAt !== undefined) updateData.amendedAt = params.amendedAt;
      if (params.amendedReason !== undefined) updateData.amendedReason = params.amendedReason;

      const [result] = await db
        .update(imagingReports)
        .set(updateData)
        .where(and(eq(imagingReports.accountId, params.accountId), eq(imagingReports.id, params.reportId)))
        .returning();
      return result as ImagingReportRecord | null;
    },

    async attachDocument(params: {
      accountId: string;
      reportId: string;
      documentId: string;
      attachmentType: string;
      displayOrder: number;
      createdByUserId?: string;
    }): Promise<ImagingReportDocumentRecord> {
      const [result] = await db.insert(imagingReportDocuments).values({
        accountId: params.accountId,
        reportId: params.reportId,
        documentId: params.documentId,
        attachmentType: params.attachmentType,
        displayOrder: params.displayOrder,
        createdByUserId: params.createdByUserId ?? null
      }).returning();
      return result as ImagingReportDocumentRecord;
    },

    async detachDocument(accountId: string, reportId: string, documentId: string): Promise<void> {
      await db
        .delete(imagingReportDocuments)
        .where(and(
          eq(imagingReportDocuments.accountId, accountId),
          eq(imagingReportDocuments.reportId, reportId),
          eq(imagingReportDocuments.documentId, documentId)
        ));
    }
  };
}

// ============================================
// IMAGING SCHEDULE REPO
// ============================================

export function createImagingScheduleRepo(db: DbClient) {
  return {
    async list(params: {
      accountId: string;
      fromDate?: string;
      toDate?: string;
      modalityId?: string;
    }): Promise<ImagingScheduleSlotRecord[]> {
      const conditions = [eq(imagingScheduleSlots.accountId, params.accountId)];

      if (params.modalityId) {
        conditions.push(eq(imagingScheduleSlots.modalityId, params.modalityId));
      }
      if (params.fromDate) {
        conditions.push(sql`${imagingScheduleSlots.slotDate} >= ${params.fromDate}`);
      }
      if (params.toDate) {
        conditions.push(sql`${imagingScheduleSlots.slotDate} <= ${params.toDate}`);
      }

      const whereClause = and(...conditions);

      const items = await db
        .select({
          slot: imagingScheduleSlots,
          order: imagingOrders,
          modality: imagingModalities
        })
        .from(imagingScheduleSlots)
        .leftJoin(imagingOrders, eq(imagingScheduleSlots.orderId, imagingOrders.id))
        .leftJoin(imagingModalities, eq(imagingScheduleSlots.modalityId, imagingModalities.id))
        .where(whereClause)
        .orderBy(asc(imagingScheduleSlots.slotDate), asc(imagingScheduleSlots.slotStartTime));

      return items.map(i => ({
        ...i.slot,
        order: i.order as ImagingOrderRecord | undefined,
        modality: i.modality as ImagingModalityRecord | undefined
      })) as ImagingScheduleSlotRecord[];
    },

    async findById(accountId: string, slotId: string): Promise<ImagingScheduleSlotRecord | null> {
      const [result] = await db
        .select()
        .from(imagingScheduleSlots)
        .where(and(eq(imagingScheduleSlots.accountId, accountId), eq(imagingScheduleSlots.id, slotId)));

      return result as ImagingScheduleSlotRecord | null;
    },

    async create(params: {
      accountId: string;
      input: ImagingScheduleSlotCreateInput;
    }): Promise<ImagingScheduleSlotRecord> {
      const [result] = await db.insert(imagingScheduleSlots).values({
        accountId: params.accountId,
        modalityId: params.input.modalityId ?? null,
        slotDate: params.input.slotDate,
        slotStartTime: params.input.slotStartTime,
        slotEndTime: params.input.slotEndTime,
        notes: params.input.notes ?? null
      }).returning();
      return result as ImagingScheduleSlotRecord;
    },

    async update(params: {
      accountId: string;
      slotId: string;
      patch: ImagingScheduleSlotUpdateInput;
    }): Promise<ImagingScheduleSlotRecord | null> {
      const updateData: Record<string, unknown> = {};
      if (params.patch.modalityId !== undefined) updateData.modalityId = params.patch.modalityId;
      if (params.patch.slotDate !== undefined) updateData.slotDate = new Date(params.patch.slotDate);
      if (params.patch.slotStartTime !== undefined) updateData.slotStartTime = params.patch.slotStartTime;
      if (params.patch.slotEndTime !== undefined) updateData.slotEndTime = params.patch.slotEndTime;
      if (params.patch.notes !== undefined) updateData.notes = params.patch.notes;

      const [result] = await db
        .update(imagingScheduleSlots)
        .set(updateData)
        .where(and(eq(imagingScheduleSlots.accountId, params.accountId), eq(imagingScheduleSlots.id, params.slotId)))
        .returning();
      return result as ImagingScheduleSlotRecord | null;
    },

    async bookSlot(params: {
      accountId: string;
      slotId: string;
      orderId: string;
    }): Promise<ImagingScheduleSlotRecord | null> {
      const [result] = await db
        .update(imagingScheduleSlots)
        .set({ isAvailable: false, orderId: params.orderId })
        .where(and(
          eq(imagingScheduleSlots.accountId, params.accountId),
          eq(imagingScheduleSlots.id, params.slotId),
          eq(imagingScheduleSlots.isAvailable, true)
        ))
        .returning();
      return result as ImagingScheduleSlotRecord | null;
    },

    async releaseSlot(accountId: string, slotId: string): Promise<ImagingScheduleSlotRecord | null> {
      const [result] = await db
        .update(imagingScheduleSlots)
        .set({ isAvailable: true, orderId: null })
        .where(and(
          eq(imagingScheduleSlots.accountId, accountId),
          eq(imagingScheduleSlots.id, slotId)
        ))
        .returning();
      return result as ImagingScheduleSlotRecord | null;
    },

    async delete(accountId: string, slotId: string): Promise<void> {
      await db
        .delete(imagingScheduleSlots)
        .where(and(eq(imagingScheduleSlots.accountId, accountId), eq(imagingScheduleSlots.id, slotId)));
    }
  };
}

// ============================================
// COMBINED REPO
// ============================================

export type ImagingRepo = {
  modalities: ReturnType<typeof createImagingModalitiesRepo>;
  templates: ReturnType<typeof createImagingTemplatesRepo>;
  orders: ReturnType<typeof createImagingOrdersRepo>;
  studies: ReturnType<typeof createImagingStudiesRepo>;
  reports: ReturnType<typeof createImagingReportsRepo>;
  schedule: ReturnType<typeof createImagingScheduleRepo>;
};

export function createImagingRepo(db: DbClient): ImagingRepo {
  return {
    modalities: createImagingModalitiesRepo(db),
    templates: createImagingTemplatesRepo(db),
    orders: createImagingOrdersRepo(db),
    studies: createImagingStudiesRepo(db),
    reports: createImagingReportsRepo(db),
    schedule: createImagingScheduleRepo(db)
  };
}
