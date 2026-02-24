import { and, count, eq, ilike, desc, asc, sql, isNull } from 'drizzle-orm';
import { labTests, labOrders, labOrderItems, labSamples, labResults, labReports, labReportResults, labReferenceRanges } from '@cvg-his/db';
// ============================================
// LAB TESTS REPO
// ============================================
export function createLabTestsRepo(db) {
    return {
        async list(params) {
            const conditions = [eq(labTests.accountId, params.accountId)];
            if (params.q) {
                conditions.push(ilike(labTests.name, `%${params.q}%`));
            }
            if (params.categoryId) {
                conditions.push(eq(labTests.categoryId, params.categoryId));
            }
            if (params.specimenType) {
                conditions.push(sql `${labTests.specimenType} = ${params.specimenType}`);
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, testId) {
            const [result] = await db
                .select()
                .from(labTests)
                .where(and(eq(labTests.accountId, accountId), eq(labTests.id, testId)));
            return result;
        },
        async findByCode(accountId, code) {
            const [result] = await db
                .select()
                .from(labTests)
                .where(and(eq(labTests.accountId, accountId), eq(labTests.code, code)));
            return result;
        },
        async create(input) {
            const [result] = await db.insert(labTests).values(input).returning();
            return result;
        },
        async update(params) {
            const [result] = await db
                .update(labTests)
                .set({ ...params.patch, updatedAt: new Date() })
                .where(and(eq(labTests.accountId, params.accountId), eq(labTests.id, params.testId)))
                .returning();
            return result;
        },
        async delete(accountId, testId) {
            await db.delete(labTests).where(and(eq(labTests.accountId, accountId), eq(labTests.id, testId)));
        }
    };
}
// ============================================
// LAB ORDERS REPO
// ============================================
export function createLabOrdersRepo(db) {
    return {
        async list(params) {
            const conditions = [eq(labOrders.accountId, params.accountId)];
            if (params.patientId) {
                conditions.push(eq(labOrders.patientId, params.patientId));
            }
            if (params.encounterId) {
                conditions.push(eq(labOrders.encounterId, params.encounterId));
            }
            if (params.status) {
                conditions.push(sql `${labOrders.status} = ${params.status}`);
            }
            if (params.priority) {
                conditions.push(sql `${labOrders.priority} = ${params.priority}`);
            }
            if (params.fromDate) {
                conditions.push(sql `${labOrders.orderedAt} >= ${params.fromDate}::timestamptz`);
            }
            if (params.toDate) {
                conditions.push(sql `${labOrders.orderedAt} <= ${params.toDate}::timestamptz`);
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, orderId) {
            const [result] = await db
                .select()
                .from(labOrders)
                .where(and(eq(labOrders.accountId, accountId), eq(labOrders.id, orderId)));
            return result;
        },
        async findByOrderNumber(accountId, orderNumber) {
            const [result] = await db
                .select()
                .from(labOrders)
                .where(and(eq(labOrders.accountId, accountId), eq(labOrders.orderNumber, orderNumber)));
            return result;
        },
        async create(params) {
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
            return result;
        },
        async update(params) {
            const [result] = await db
                .update(labOrders)
                .set({ ...params.patch, updatedAt: new Date() })
                .where(and(eq(labOrders.accountId, params.accountId), eq(labOrders.id, params.orderId)))
                .returning();
            return result;
        },
        async updateStatus(params) {
            const updateData = {
                status: sql `${params.status}`,
                updatedAt: new Date()
            };
            if (params.collectedAt)
                updateData.collectedAt = params.collectedAt;
            if (params.completedAt)
                updateData.completedAt = params.completedAt;
            if (params.cancelledAt)
                updateData.cancelledAt = params.cancelledAt;
            if (params.cancelledReason)
                updateData.cancelledReason = params.cancelledReason;
            const [result] = await db
                .update(labOrders)
                .set(updateData)
                .where(and(eq(labOrders.accountId, params.accountId), eq(labOrders.id, params.orderId)))
                .returning();
            return result;
        },
        async delete(accountId, orderId) {
            await db.delete(labOrders).where(and(eq(labOrders.accountId, accountId), eq(labOrders.id, orderId)));
        }
    };
}
// ============================================
// LAB ORDER ITEMS REPO
// ============================================
export function createLabOrderItemsRepo(db) {
    return {
        async findByOrderId(orderId) {
            const items = await db
                .select()
                .from(labOrderItems)
                .where(eq(labOrderItems.orderId, orderId));
            return items;
        },
        async create(params) {
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
            return result;
        },
        async createBatch(params) {
            const values = params.testIds.map((testId) => ({
                accountId: params.accountId,
                orderId: params.orderId,
                testId,
                panelId: null,
                status: 'pending'
            }));
            const results = await db.insert(labOrderItems).values(values).returning();
            return results;
        },
        async updateStatus(params) {
            const [result] = await db
                .update(labOrderItems)
                .set({ status: sql `${params.status}`, updatedAt: new Date() })
                .where(eq(labOrderItems.id, params.orderItemId))
                .returning();
            return result;
        },
        async deleteByOrderId(orderId) {
            await db.delete(labOrderItems).where(eq(labOrderItems.orderId, orderId));
        }
    };
}
// ============================================
// LAB SAMPLES REPO
// ============================================
export function createLabSamplesRepo(db) {
    return {
        async list(params) {
            const conditions = [eq(labSamples.accountId, params.accountId)];
            if (params.orderId) {
                conditions.push(eq(labSamples.orderId, params.orderId));
            }
            if (params.patientId) {
                conditions.push(eq(labSamples.patientId, params.patientId));
            }
            if (params.status) {
                conditions.push(sql `${labSamples.status} = ${params.status}`);
            }
            if (params.sampleType) {
                conditions.push(sql `${labSamples.sampleType} = ${params.sampleType}`);
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, sampleId) {
            const [result] = await db
                .select()
                .from(labSamples)
                .where(and(eq(labSamples.accountId, accountId), eq(labSamples.id, sampleId)));
            return result;
        },
        async create(params) {
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
            return result;
        },
        async updateStatus(params) {
            const updateData = {
                status: sql `${params.status}`,
                updatedAt: new Date()
            };
            if (params.collectedAt)
                updateData.collectedAt = params.collectedAt;
            if (params.collectedByUserId)
                updateData.collectedByUserId = params.collectedByUserId;
            if (params.receivedAt)
                updateData.receivedAt = params.receivedAt;
            if (params.receivedByUserId)
                updateData.receivedByUserId = params.receivedByUserId;
            if (params.processedAt)
                updateData.processedAt = params.processedAt;
            if (params.rejectedAt)
                updateData.rejectedAt = params.rejectedAt;
            if (params.rejectionReason)
                updateData.rejectionReason = params.rejectionReason;
            const [result] = await db
                .update(labSamples)
                .set(updateData)
                .where(and(eq(labSamples.accountId, params.accountId), eq(labSamples.id, params.sampleId)))
                .returning();
            return result;
        }
    };
}
// ============================================
// LAB RESULTS REPO
// ============================================
export function createLabResultsRepo(db) {
    return {
        async list(params) {
            const conditions = [eq(labResults.accountId, params.accountId)];
            if (params.orderItemId) {
                conditions.push(eq(labResults.orderItemId, params.orderItemId));
            }
            if (params.patientId) {
                conditions.push(eq(labResults.patientId, params.patientId));
            }
            if (params.status) {
                conditions.push(sql `${labResults.status} = ${params.status}`);
            }
            if (params.flag) {
                conditions.push(sql `${labResults.flag} = ${params.flag}`);
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
                    items: items.map(i => i.result),
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, resultId) {
            const [result] = await db
                .select()
                .from(labResults)
                .where(and(eq(labResults.accountId, accountId), eq(labResults.id, resultId)));
            return result;
        },
        async create(params) {
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
            return result;
        },
        async update(params) {
            const updateData = {
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
            return result;
        },
        async updateStatus(params) {
            const updateData = {
                status: sql `${params.status}`,
                updatedAt: new Date()
            };
            if (params.performedAt)
                updateData.performedAt = params.performedAt;
            if (params.performedByUserId)
                updateData.performedByUserId = params.performedByUserId;
            if (params.verifiedAt)
                updateData.verifiedAt = params.verifiedAt;
            if (params.verifiedByUserId)
                updateData.verifiedByUserId = params.verifiedByUserId;
            const [result] = await db
                .update(labResults)
                .set(updateData)
                .where(and(eq(labResults.accountId, params.accountId), eq(labResults.id, params.resultId)))
                .returning();
            return result;
        }
    };
}
// ============================================
// LAB REPORTS REPO
// ============================================
export function createLabReportsRepo(db) {
    return {
        async list(params) {
            const conditions = [eq(labReports.accountId, params.accountId)];
            if (params.orderId) {
                conditions.push(eq(labReports.orderId, params.orderId));
            }
            if (params.patientId) {
                conditions.push(eq(labReports.patientId, params.patientId));
            }
            if (params.status) {
                conditions.push(sql `${labReports.status} = ${params.status}`);
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, reportId) {
            const [result] = await db
                .select()
                .from(labReports)
                .where(and(eq(labReports.accountId, accountId), eq(labReports.id, reportId)));
            return result;
        },
        async create(params) {
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
            return result;
        },
        async update(params) {
            const [result] = await db
                .update(labReports)
                .set({ ...params.patch, updatedAt: new Date() })
                .where(and(eq(labReports.accountId, params.accountId), eq(labReports.id, params.reportId)))
                .returning();
            return result;
        },
        async updateStatus(params) {
            const updateData = {
                status: sql `${params.status}`,
                updatedAt: new Date()
            };
            if (params.reviewedAt)
                updateData.reviewedAt = params.reviewedAt;
            if (params.reviewedByUserId)
                updateData.reviewedByUserId = params.reviewedByUserId;
            if (params.finalizedAt)
                updateData.finalizedAt = params.finalizedAt;
            if (params.finalizedByUserId)
                updateData.finalizedByUserId = params.finalizedByUserId;
            if (params.signedAt)
                updateData.signedAt = params.signedAt;
            if (params.signedByUserId)
                updateData.signedByUserId = params.signedByUserId;
            if (params.signatureHash)
                updateData.signatureHash = params.signatureHash;
            if (params.amendedAt)
                updateData.amendedAt = params.amendedAt;
            if (params.amendedReason)
                updateData.amendedReason = params.amendedReason;
            const [result] = await db
                .update(labReports)
                .set(updateData)
                .where(and(eq(labReports.accountId, params.accountId), eq(labReports.id, params.reportId)))
                .returning();
            return result;
        },
        async addResults(reportId, resultIds) {
            const values = resultIds.map(resultId => ({
                reportId,
                resultId
            }));
            await db.insert(labReportResults).values(values);
        },
        async getReportResults(reportId) {
            const results = await db
                .select({ result: labResults })
                .from(labReportResults)
                .innerJoin(labResults, eq(labReportResults.resultId, labResults.id))
                .where(eq(labReportResults.reportId, reportId));
            return results.map(r => r.result);
        }
    };
}
// ============================================
// LAB REFERENCE RANGES REPO
// ============================================
export function createLabReferenceRangesRepo(db) {
    return {
        async list(params) {
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
                items: items,
                total: totalResult?.count ?? 0
            };
        },
        async findById(accountId, rangeId) {
            const [result] = await db
                .select()
                .from(labReferenceRanges)
                .where(and(eq(labReferenceRanges.accountId, accountId), eq(labReferenceRanges.id, rangeId)));
            return result;
        },
        async findApplicable(params) {
            const conditions = [eq(labReferenceRanges.testId, params.testId), eq(labReferenceRanges.isActive, true)];
            if (params.species) {
                const [speciesResult] = await db
                    .select()
                    .from(labReferenceRanges)
                    .where(and(...conditions, eq(labReferenceRanges.species, params.species)))
                    .limit(1);
                if (speciesResult) {
                    return speciesResult;
                }
            }
            const [genericResult] = await db
                .select()
                .from(labReferenceRanges)
                .where(and(...conditions, isNull(labReferenceRanges.species)))
                .limit(1);
            return genericResult;
        },
        async create(params) {
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
            return result;
        },
        async update(params) {
            const updateData = {
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
            return result;
        },
        async delete(accountId, rangeId) {
            await db.delete(labReferenceRanges).where(and(eq(labReferenceRanges.accountId, accountId), eq(labReferenceRanges.id, rangeId)));
        }
    };
}
export function createLabRepo(db) {
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
//# sourceMappingURL=repo.js.map