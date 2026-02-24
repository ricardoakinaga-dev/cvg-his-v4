import { and, eq, ilike, or, desc, sql } from 'drizzle-orm';

import {
  ownerContacts,
  ownerAddresses,
  ownerDocuments,
  ownerAlerts,
  patientAlerts,
  patientVaccines,
  patientAllergies,
  tags,
  ownerTags,
  patientTags,
  owners,
  patients,
  type OwnerDocumentType,
  type OwnerAlertSeverity,
  type PatientAlertSeverity,
  type AllergySeverity
} from '@cvg-his/db';

type DbClient = typeof import('@cvg-his/db').db;

// Type aliases for contact types
type OwnerContactType = 'phone' | 'email' | 'whatsapp';

// ============================================
// OWNER CONTACTS REPO
// ============================================

export function createOwnerContactsRepo(db: DbClient) {
  return {
    async create(accountId: string, ownerId: string, data: {
      type: OwnerContactType;
      label?: string;
      value: string;
      isPrimary: boolean;
    }) {
      const [created] = await db.insert(ownerContacts)
        .values({
          accountId,
          ownerId,
          type: data.type,
          label: data.label ?? null,
          value: data.value,
          isPrimary: data.isPrimary
        })
        .returning();
      return created;
    },

    async findByOwner(accountId: string, ownerId: string) {
      return db.select()
        .from(ownerContacts)
        .where(and(
          eq(ownerContacts.accountId, accountId),
          eq(ownerContacts.ownerId, ownerId)
        ))
        .orderBy(desc(ownerContacts.isPrimary));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(ownerContacts)
        .where(and(
          eq(ownerContacts.accountId, accountId),
          eq(ownerContacts.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      type: OwnerContactType;
      label: string;
      value: string;
      isPrimary: boolean;
    }>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.label !== undefined) updateData.label = data.label;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;
      
      const [updated] = await db.update(ownerContacts)
        .set(updateData)
        .where(and(
          eq(ownerContacts.accountId, accountId),
          eq(ownerContacts.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(ownerContacts)
        .where(and(
          eq(ownerContacts.accountId, accountId),
          eq(ownerContacts.id, id)
        ))
        .returning();
      return deleted ?? null;
    }
  };
}

// ============================================
// OWNER ADDRESSES REPO
// ============================================

export function createOwnerAddressesRepo(db: DbClient) {
  return {
    async create(accountId: string, ownerId: string, data: {
      label?: string;
      street: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
      isPrimary: boolean;
    }) {
      const [created] = await db.insert(ownerAddresses)
        .values({
          accountId,
          ownerId,
          label: data.label ?? null,
          street: data.street,
          number: data.number ?? null,
          complement: data.complement ?? null,
          neighborhood: data.neighborhood ?? null,
          city: data.city,
          state: data.state ?? null,
          postalCode: data.postalCode ?? null,
          country: data.country,
          isPrimary: data.isPrimary
        })
        .returning();
      return created;
    },

    async findByOwner(accountId: string, ownerId: string) {
      return db.select()
        .from(ownerAddresses)
        .where(and(
          eq(ownerAddresses.accountId, accountId),
          eq(ownerAddresses.ownerId, ownerId)
        ))
        .orderBy(desc(ownerAddresses.isPrimary));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(ownerAddresses)
        .where(and(
          eq(ownerAddresses.accountId, accountId),
          eq(ownerAddresses.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      label: string;
      street: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isPrimary: boolean;
    }>) {
      const [updated] = await db.update(ownerAddresses)
        .set(data)
        .where(and(
          eq(ownerAddresses.accountId, accountId),
          eq(ownerAddresses.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(ownerAddresses)
        .where(and(
          eq(ownerAddresses.accountId, accountId),
          eq(ownerAddresses.id, id)
        ))
        .returning();
      return deleted ?? null;
    }
  };
}

// ============================================
// OWNER DOCUMENTS REPO
// ============================================

export function createOwnerDocumentsRepo(db: DbClient) {
  return {
    async create(accountId: string, ownerId: string, data: {
      type: OwnerDocumentType;
      value: string;
      issuer?: string;
      issueDate?: Date;
      expiryDate?: Date;
      notes?: string;
    }) {
      const [created] = await db.insert(ownerDocuments)
        .values({
          accountId,
          ownerId,
          type: data.type,
          value: data.value,
          issuer: data.issuer ?? null,
          issueDate: data.issueDate ?? null,
          expiryDate: data.expiryDate ?? null,
          notes: data.notes ?? null
        })
        .returning();
      return created;
    },

    async findByOwner(accountId: string, ownerId: string) {
      return db.select()
        .from(ownerDocuments)
        .where(and(
          eq(ownerDocuments.accountId, accountId),
          eq(ownerDocuments.ownerId, ownerId)
        ));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(ownerDocuments)
        .where(and(
          eq(ownerDocuments.accountId, accountId),
          eq(ownerDocuments.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      type: OwnerDocumentType;
      value: string;
      issuer: string;
      issueDate: Date;
      expiryDate: Date;
      notes: string;
    }>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.issuer !== undefined) updateData.issuer = data.issuer;
      if (data.issueDate !== undefined) updateData.issueDate = data.issueDate;
      if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      const [updated] = await db.update(ownerDocuments)
        .set(updateData)
        .where(and(
          eq(ownerDocuments.accountId, accountId),
          eq(ownerDocuments.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(ownerDocuments)
        .where(and(
          eq(ownerDocuments.accountId, accountId),
          eq(ownerDocuments.id, id)
        ))
        .returning();
      return deleted ?? null;
    }
  };
}

// ============================================
// OWNER ALERTS REPO
// ============================================

export function createOwnerAlertsRepo(db: DbClient) {
  return {
    async create(accountId: string, ownerId: string, data: {
      severity: OwnerAlertSeverity;
      title: string;
      message?: string;
      createdByUserId?: string;
    }) {
      const [created] = await db.insert(ownerAlerts)
        .values({
          accountId,
          ownerId,
          severity: data.severity,
          title: data.title,
          message: data.message ?? null,
          createdByUserId: data.createdByUserId ?? null
        })
        .returning();
      return created;
    },

    async findByOwner(accountId: string, ownerId: string, activeOnly = false) {
      const conditions = [
        eq(ownerAlerts.accountId, accountId),
        eq(ownerAlerts.ownerId, ownerId)
      ];
      
      if (activeOnly) {
        conditions.push(eq(ownerAlerts.isActive, true));
      }
      
      return db.select()
        .from(ownerAlerts)
        .where(and(...conditions))
        .orderBy(desc(ownerAlerts.createdAt));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(ownerAlerts)
        .where(and(
          eq(ownerAlerts.accountId, accountId),
          eq(ownerAlerts.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      severity: OwnerAlertSeverity;
      title: string;
      message: string;
      isActive: boolean;
      resolvedAt: Date;
      resolvedByUserId: string;
    }>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (data.severity !== undefined) updateData.severity = data.severity;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.message !== undefined) updateData.message = data.message;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.resolvedAt !== undefined) updateData.resolvedAt = data.resolvedAt;
      if (data.resolvedByUserId !== undefined) updateData.resolvedByUserId = data.resolvedByUserId;
      
      const [updated] = await db.update(ownerAlerts)
        .set(updateData)
        .where(and(
          eq(ownerAlerts.accountId, accountId),
          eq(ownerAlerts.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(ownerAlerts)
        .where(and(
          eq(ownerAlerts.accountId, accountId),
          eq(ownerAlerts.id, id)
        ))
        .returning();
      return deleted ?? null;
    },

    async resolve(accountId: string, id: string, resolvedByUserId: string) {
      const [updated] = await db.update(ownerAlerts)
        .set({
          isActive: false,
          resolvedAt: new Date(),
          resolvedByUserId
        })
        .where(and(
          eq(ownerAlerts.accountId, accountId),
          eq(ownerAlerts.id, id)
        ))
        .returning();
      return updated ?? null;
    }
  };
}

// ============================================
// PATIENT ALERTS REPO
// ============================================

export function createPatientAlertsRepo(db: DbClient) {
  return {
    async create(accountId: string, patientId: string, data: {
      severity: PatientAlertSeverity;
      title: string;
      message?: string;
      createdByUserId?: string;
    }) {
      const [created] = await db.insert(patientAlerts)
        .values({
          accountId,
          patientId,
          severity: data.severity,
          title: data.title,
          message: data.message ?? null,
          createdByUserId: data.createdByUserId ?? null
        })
        .returning();
      return created;
    },

    async findByPatient(accountId: string, patientId: string, activeOnly = false) {
      const conditions = [
        eq(patientAlerts.accountId, accountId),
        eq(patientAlerts.patientId, patientId)
      ];
      
      if (activeOnly) {
        conditions.push(eq(patientAlerts.isActive, true));
      }
      
      return db.select()
        .from(patientAlerts)
        .where(and(...conditions))
        .orderBy(desc(patientAlerts.createdAt));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(patientAlerts)
        .where(and(
          eq(patientAlerts.accountId, accountId),
          eq(patientAlerts.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      severity: PatientAlertSeverity;
      title: string;
      message: string;
      isActive: boolean;
      resolvedAt: Date;
      resolvedByUserId: string;
    }>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (data.severity !== undefined) updateData.severity = data.severity;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.message !== undefined) updateData.message = data.message;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.resolvedAt !== undefined) updateData.resolvedAt = data.resolvedAt;
      if (data.resolvedByUserId !== undefined) updateData.resolvedByUserId = data.resolvedByUserId;
      
      const [updated] = await db.update(patientAlerts)
        .set(updateData)
        .where(and(
          eq(patientAlerts.accountId, accountId),
          eq(patientAlerts.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(patientAlerts)
        .where(and(
          eq(patientAlerts.accountId, accountId),
          eq(patientAlerts.id, id)
        ))
        .returning();
      return deleted ?? null;
    },

    async resolve(accountId: string, id: string, resolvedByUserId: string) {
      const [updated] = await db.update(patientAlerts)
        .set({
          isActive: false,
          resolvedAt: new Date(),
          resolvedByUserId
        })
        .where(and(
          eq(patientAlerts.accountId, accountId),
          eq(patientAlerts.id, id)
        ))
        .returning();
      return updated ?? null;
    }
  };
}

// ============================================
// PATIENT VACCINES REPO
// ============================================

export function createPatientVaccinesRepo(db: DbClient) {
  return {
    async create(accountId: string, patientId: string, data: {
      vaccineName: string;
      manufacturer?: string;
      batchNumber?: string;
      administrationDate: Date;
      nextDoseDate?: Date;
      veterinarianName?: string;
      notes?: string;
    }) {
      const [created] = await db.insert(patientVaccines)
        .values({
          accountId,
          patientId,
          vaccineName: data.vaccineName,
          manufacturer: data.manufacturer ?? null,
          batchNumber: data.batchNumber ?? null,
          administrationDate: data.administrationDate,
          nextDoseDate: data.nextDoseDate ?? null,
          veterinarianName: data.veterinarianName ?? null,
          notes: data.notes ?? null
        })
        .returning();
      return created;
    },

    async findByPatient(accountId: string, patientId: string) {
      return db.select()
        .from(patientVaccines)
        .where(and(
          eq(patientVaccines.accountId, accountId),
          eq(patientVaccines.patientId, patientId)
        ))
        .orderBy(desc(patientVaccines.administrationDate));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(patientVaccines)
        .where(and(
          eq(patientVaccines.accountId, accountId),
          eq(patientVaccines.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      vaccineName: string;
      manufacturer: string;
      batchNumber: string;
      administrationDate: Date;
      nextDoseDate: Date;
      veterinarianName: string;
      notes: string;
    }>) {
      const [updated] = await db.update(patientVaccines)
        .set(data)
        .where(and(
          eq(patientVaccines.accountId, accountId),
          eq(patientVaccines.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(patientVaccines)
        .where(and(
          eq(patientVaccines.accountId, accountId),
          eq(patientVaccines.id, id)
        ))
        .returning();
      return deleted ?? null;
    },

    async findUpcoming(accountId: string, days = 30) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      
      return db.select()
        .from(patientVaccines)
        .where(and(
          eq(patientVaccines.accountId, accountId),
          sql`${patientVaccines.nextDoseDate} <= ${futureDate}`,
          sql`${patientVaccines.nextDoseDate} >= ${new Date()}`
        ))
        .orderBy(patientVaccines.nextDoseDate);
    }
  };
}

// ============================================
// PATIENT ALLERGIES REPO
// ============================================

export function createPatientAllergiesRepo(db: DbClient) {
  return {
    async create(accountId: string, patientId: string, data: {
      allergen: string;
      reaction?: string;
      severity?: AllergySeverity;
      diagnosedDate?: Date;
      notes?: string;
      isActive: boolean;
    }) {
      const [created] = await db.insert(patientAllergies)
        .values({
          accountId,
          patientId,
          allergen: data.allergen,
          reaction: data.reaction ?? null,
          severity: data.severity ?? null,
          diagnosedDate: data.diagnosedDate ?? null,
          notes: data.notes ?? null,
          isActive: data.isActive
        })
        .returning();
      return created;
    },

    async findByPatient(accountId: string, patientId: string, activeOnly = false) {
      const conditions = [
        eq(patientAllergies.accountId, accountId),
        eq(patientAllergies.patientId, patientId)
      ];
      
      if (activeOnly) {
        conditions.push(eq(patientAllergies.isActive, true));
      }
      
      return db.select()
        .from(patientAllergies)
        .where(and(...conditions));
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(patientAllergies)
        .where(and(
          eq(patientAllergies.accountId, accountId),
          eq(patientAllergies.id, id)
        ));
      return result ?? null;
    },

    async update(accountId: string, id: string, data: Partial<{
      allergen: string;
      reaction: string;
      severity: AllergySeverity;
      diagnosedDate: Date;
      notes: string;
      isActive: boolean;
    }>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (data.allergen !== undefined) updateData.allergen = data.allergen;
      if (data.reaction !== undefined) updateData.reaction = data.reaction;
      if (data.severity !== undefined) updateData.severity = data.severity;
      if (data.diagnosedDate !== undefined) updateData.diagnosedDate = data.diagnosedDate;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      
      const [updated] = await db.update(patientAllergies)
        .set(updateData)
        .where(and(
          eq(patientAllergies.accountId, accountId),
          eq(patientAllergies.id, id)
        ))
        .returning();
      return updated ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(patientAllergies)
        .where(and(
          eq(patientAllergies.accountId, accountId),
          eq(patientAllergies.id, id)
        ))
        .returning();
      return deleted ?? null;
    }
  };
}

// ============================================
// TAGS REPO
// ============================================

export function createTagsRepo(db: DbClient) {
  return {
    async create(accountId: string, data: { name: string; color: string }) {
      const [created] = await db.insert(tags)
        .values({
          accountId,
          name: data.name,
          color: data.color
        })
        .returning();
      return created;
    },

    async findByAccount(accountId: string) {
      return db.select()
        .from(tags)
        .where(eq(tags.accountId, accountId))
        .orderBy(tags.name);
    },

    async findById(accountId: string, id: string) {
      const [result] = await db.select()
        .from(tags)
        .where(and(
          eq(tags.accountId, accountId),
          eq(tags.id, id)
        ));
      return result ?? null;
    },

    async delete(accountId: string, id: string) {
      const [deleted] = await db.delete(tags)
        .where(and(
          eq(tags.accountId, accountId),
          eq(tags.id, id)
        ))
        .returning();
      return deleted ?? null;
    },

    async addToOwner(ownerId: string, tagId: string) {
      const [created] = await db.insert(ownerTags)
        .values({ ownerId, tagId })
        .returning();
      return created;
    },

    async removeFromOwner(ownerId: string, tagId: string) {
      const [deleted] = await db.delete(ownerTags)
        .where(and(
          eq(ownerTags.ownerId, ownerId),
          eq(ownerTags.tagId, tagId)
        ))
        .returning();
      return deleted ?? null;
    },

    async addToPatient(patientId: string, tagId: string) {
      const [created] = await db.insert(patientTags)
        .values({ patientId, tagId })
        .returning();
      return created;
    },

    async removeFromPatient(patientId: string, tagId: string) {
      const [deleted] = await db.delete(patientTags)
        .where(and(
          eq(patientTags.patientId, patientId),
          eq(patientTags.tagId, tagId)
        ))
        .returning();
      return deleted ?? null;
    },

    async findOwnerTags(accountId: string, ownerId: string) {
      return db.select({ tag: tags })
        .from(ownerTags)
        .innerJoin(tags, eq(ownerTags.tagId, tags.id))
        .where(and(
          eq(tags.accountId, accountId),
          eq(ownerTags.ownerId, ownerId)
        ));
    },

    async findPatientTags(accountId: string, patientId: string) {
      return db.select({ tag: tags })
        .from(patientTags)
        .innerJoin(tags, eq(patientTags.tagId, tags.id))
        .where(and(
          eq(tags.accountId, accountId),
          eq(patientTags.patientId, patientId)
        ));
    }
  };
}

// ============================================
// SEARCH REPO
// ============================================

export function createSearchRepo(db: DbClient) {
  return {
    async search(accountId: string, query: string, limit: number) {
      const searchPattern = `%${query}%`;
      
      const [ownerResults, patientResults] = await Promise.all([
        db.select({
          id: owners.id,
          fullName: owners.fullName,
          document: owners.document,
          phoneMain: owners.phoneMain,
          email: owners.email
        })
        .from(owners)
        .where(and(
          eq(owners.accountId, accountId),
          or(
            ilike(owners.fullName, searchPattern),
            ilike(owners.document, searchPattern),
            ilike(owners.phoneMain, searchPattern),
            ilike(owners.email, searchPattern)
          )
        ))
        .limit(limit),
        
        db.select({
          id: patients.id,
          name: patients.name,
          species: patients.species,
          breed: patients.breed,
          ownerId: patients.ownerId,
          ownerName: owners.fullName
        })
        .from(patients)
        .innerJoin(owners, eq(patients.ownerId, owners.id))
        .where(and(
          eq(patients.accountId, accountId),
          or(
            ilike(patients.name, searchPattern),
            ilike(patients.microchip, searchPattern),
            ilike(patients.registrationNumber, searchPattern)
          )
        ))
        .limit(limit)
      ]);

      return {
        owners: ownerResults.map(o => ({ ...o, type: 'owner' as const })),
        patients: patientResults.map(p => ({ ...p, type: 'patient' as const }))
      };
    }
  };
}
