/**
 * Calculate age in months from birth date
 */
function calculateAgeMonths(birthDate) {
    if (!birthDate)
        return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12;
    const monthDiff = now.getMonth() - birth.getMonth();
    return months + monthDiff;
}
/**
 * Build highlighted alerts from patient alerts
 */
function buildHighlightedAlerts(alerts) {
    return {
        aggressive: alerts.aggressive ?? false,
        allergiesCount: alerts.allergies?.length ?? 0,
        anesthesiaRisk: alerts.anesthesia_risk ?? null,
        chronicConditionsCount: alerts.chronic_conditions?.length ?? 0,
        hasNotes: !!alerts.notes,
    };
}
/**
 * Map patient row to PatientContextInfo
 */
function mapPatientContextInfo(row) {
    const alertsJson = row.alerts_json;
    const alerts = typeof alertsJson === 'object' && alertsJson !== null
        ? alertsJson
        : {};
    return {
        id: String(row.id),
        ownerId: String(row.owner_id),
        ownerName: row.owner_name ? String(row.owner_name) : undefined,
        name: String(row.name),
        species: String(row.species),
        breed: row.breed ? String(row.breed) : null,
        sex: row.sex ? String(row.sex) : null,
        birthDate: row.birth_date ? String(row.birth_date) : null,
        ageMonths: calculateAgeMonths(row.birth_date ? String(row.birth_date) : null),
        weightKg: row.weight_kg ? String(row.weight_kg) : null,
        microchip: row.microchip ? String(row.microchip) : null,
        alerts,
        highlightedAlerts: buildHighlightedAlerts(alerts),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
}
/**
 * Map stay row to StayContextInfo
 */
function mapStayContextInfo(row) {
    return {
        id: String(row.id),
        patientId: String(row.patient_id),
        wardId: String(row.ward_id),
        wardName: String(row.ward_name),
        bedId: String(row.bed_id),
        bedName: String(row.bed_name),
        status: String(row.status),
        admittedAt: String(row.admitted_at),
        dischargedAt: row.discharged_at ? String(row.discharged_at) : null,
        chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
        reason: row.reason ? String(row.reason) : null,
        planSummary: row.plan_summary ? String(row.plan_summary) : null,
    };
}
/**
 * Map encounter row to EncounterContextInfo
 */
function mapEncounterContextInfo(row) {
    return {
        id: String(row.id),
        patientId: String(row.patient_id),
        status: String(row.status),
        openedAt: String(row.opened_at),
        closedAt: row.closed_at ? String(row.closed_at) : null,
        reason: row.reason ? String(row.reason) : null,
    };
}
export function createPatientContextRepo(db) {
    return {
        /**
         * Get patient context by patient ID
         */
        async getPatientContext(accountId, patientId) {
            const queryResult = await db.$client.query(`
        SELECT 
          p.*,
          o.full_name as owner_name
        FROM patients p
        LEFT JOIN owners o ON o.id = p.owner_id
        WHERE p.id = $1 AND p.account_id = $2
        `, [patientId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapPatientContextInfo(queryResult.rows[0]);
        },
        /**
         * Get active stay for a patient
         */
        async getActiveStayForPatient(accountId, patientId) {
            const queryResult = await db.$client.query(`
        SELECT 
          s.*,
          w.name as ward_name,
          b.name as bed_name
        FROM inpatient_stays s
        JOIN wards w ON w.id = s.ward_id AND w.account_id = s.account_id
        JOIN beds b ON b.id = s.bed_id AND b.account_id = s.account_id
        WHERE s.patient_id = $1 AND s.account_id = $2 AND s.status = 'active'
        ORDER BY s.admitted_at DESC
        LIMIT 1
        `, [patientId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapStayContextInfo(queryResult.rows[0]);
        },
        /**
         * Get stay context by stay ID
         */
        async getStayContext(accountId, stayId) {
            const queryResult = await db.$client.query(`
        SELECT 
          s.*,
          w.name as ward_name,
          b.name as bed_name
        FROM inpatient_stays s
        JOIN wards w ON w.id = s.ward_id AND w.account_id = s.account_id
        JOIN beds b ON b.id = s.bed_id AND b.account_id = s.account_id
        WHERE s.id = $1 AND s.account_id = $2
        `, [stayId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapStayContextInfo(queryResult.rows[0]);
        },
        /**
         * Get open encounter for a patient
         */
        async getOpenEncounterForPatient(accountId, patientId) {
            const queryResult = await db.$client.query(`
        SELECT *
        FROM encounters
        WHERE patient_id = $1 AND account_id = $2 AND status = 'open'
        ORDER BY opened_at DESC
        LIMIT 1
        `, [patientId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapEncounterContextInfo(queryResult.rows[0]);
        },
        /**
         * Get patient context by stay ID (includes patient info)
         */
        async getPatientContextByStay(accountId, stayId) {
            const queryResult = await db.$client.query(`
        SELECT 
          p.*,
          o.full_name as owner_name,
          s.id as stay_id,
          s.ward_id,
          w.name as ward_name,
          s.bed_id,
          b.name as bed_name,
          s.status as stay_status,
          s.admitted_at,
          s.discharged_at,
          s.chief_complaint,
          s.reason as stay_reason,
          s.plan_summary
        FROM inpatient_stays s
        JOIN patients p ON p.id = s.patient_id
        JOIN owners o ON o.id = p.owner_id
        JOIN wards w ON w.id = s.ward_id
        JOIN beds b ON b.id = s.bed_id
        WHERE s.id = $1 AND p.account_id = $2
        `, [stayId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            const row = queryResult.rows[0];
            const patient = mapPatientContextInfo(row);
            const stay = {
                id: String(row.stay_id),
                patientId: patient.id,
                wardId: String(row.ward_id),
                wardName: String(row.ward_name),
                bedId: String(row.bed_id),
                bedName: String(row.bed_name),
                status: String(row.stay_status),
                admittedAt: String(row.admitted_at),
                dischargedAt: row.discharged_at ? String(row.discharged_at) : null,
                chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
                reason: row.stay_reason ? String(row.stay_reason) : null,
                planSummary: row.plan_summary ? String(row.plan_summary) : null,
            };
            return { patient, stay };
        },
        /**
         * Get counts for navigation badges
         */
        async getNavigationCounts(accountId, patientId, stayId) {
            // Get active medication orders count
            const ordersResult = await db.$client.query(`
        SELECT COUNT(*)::int as count
        FROM medication_orders
        WHERE patient_id = $1 AND account_id = $2 AND status = 'active'
        `, [patientId, accountId]);
            // Get pending administrations count (if stay provided)
            let pendingAdminCount = 0;
            if (stayId) {
                const adminResult = await db.$client.query(`
          SELECT COUNT(*)::int as count
          FROM medication_administrations
          WHERE stay_id = $1 AND account_id = $2 AND status IN ('scheduled', 'delayed')
          `, [stayId, accountId]);
                pendingAdminCount = Number(adminResult.rows[0]?.count ?? 0);
            }
            // Get unsigned notes count
            const notesResult = await db.$client.query(`
        SELECT COUNT(*)::int as count
        FROM clinical_notes cn
        JOIN encounters e ON e.id = cn.encounter_id AND e.account_id = $2
        WHERE e.patient_id = $1 AND cn.status = 'draft'
        `, [patientId, accountId]);
            return {
                activeOrders: Number(ordersResult.rows[0]?.count ?? 0),
                pendingAdministrations: pendingAdminCount,
                unsignedNotes: Number(notesResult.rows[0]?.count ?? 0),
            };
        },
    };
}
//# sourceMappingURL=repo.js.map