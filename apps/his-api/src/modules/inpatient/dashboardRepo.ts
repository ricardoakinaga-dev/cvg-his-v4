type DbClient = typeof import('@cvg-his/db').db;

export type DashboardWard = {
  id: string;
  name: string;
  code: string | null;
  totalBeds: number;
  occupiedBeds: number;
};

export type DashboardPatient = {
  stayId: string;
  patientId: string;
  patientName: string | null;
  species: string | null;
  breed: string | null;
  ownerId: string;
  ownerName: string | null;
};

export type DashboardBed = {
  bedId: string;
  bedName: string;
  bedCode: string | null;
  wardId: string;
  status: 'free' | 'occupied';
  patient: DashboardPatient | null;
  admittedAt: string | null;
  chiefComplaint: string | null;
};

export type DashboardStats = {
  totalWards: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  activeStays: number;
};

export type DashboardResponse = {
  stats: DashboardStats;
  wards: DashboardWard[];
  beds: DashboardBed[];
};

export type DashboardRepo = {
  getDashboard: (accountId: string, wardId?: string) => Promise<DashboardResponse>;
};

export function createDashboardRepo(db: DbClient): DashboardRepo {
  return {
    async getDashboard(accountId: string, wardId?: string): Promise<DashboardResponse> {
      // Build ward filter
      const wardFilter = wardId ? `and w.id = '${wardId}'` : '';

      // Get wards with bed counts
      const wardsQuery = `
        SELECT 
          w.id,
          w.name,
          w.code,
          COUNT(b.id) as total_beds,
          COUNT(CASE WHEN ips.id IS NOT NULL AND ips.status = 'active' THEN 1 END) as occupied_beds
        FROM wards w
        LEFT JOIN beds b ON b.ward_id = w.id AND b.is_active = true
        LEFT JOIN inpatient_stays ips ON ips.bed_id = b.id AND ips.status = 'active'
        WHERE w.account_id = $1 AND w.is_active = true ${wardFilter}
        GROUP BY w.id, w.name, w.code
        ORDER BY w.name
      `;

      const wardsResult = await db.$client.query(wardsQuery, [accountId]);

      const wards: DashboardWard[] = wardsResult.rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        name: String(row.name),
        code: row.code ? String(row.code) : null,
        totalBeds: Number(row.total_beds) || 0,
        occupiedBeds: Number(row.occupied_beds) || 0
      }));

      // Get beds with patient info
      const bedsQuery = `
        SELECT 
          b.id as bed_id,
          b.name as bed_name,
          b.code as bed_code,
          b.ward_id,
          CASE WHEN ips.id IS NOT NULL AND ips.status = 'active' THEN 'occupied' ELSE 'free' END as status,
          ips.id as stay_id,
          ips.patient_id,
          p.name as patient_name,
          p.species,
          p.breed,
          p.owner_id,
          o.full_name as owner_name,
          ips.admitted_at,
          ips.chief_complaint
        FROM beds b
        INNER JOIN wards w ON w.id = b.ward_id AND w.account_id = $1 AND w.is_active = true ${wardFilter}
        LEFT JOIN inpatient_stays ips ON ips.bed_id = b.id AND ips.status = 'active'
        LEFT JOIN patients p ON p.id = ips.patient_id
        LEFT JOIN owners o ON o.id = p.owner_id
        WHERE b.is_active = true
        ORDER BY w.name, b.name
      `;

      const bedsResult = await db.$client.query(bedsQuery, [accountId]);

      const beds: DashboardBed[] = bedsResult.rows.map((row: Record<string, unknown>) => {
        const patient: DashboardPatient | null = row.stay_id ? {
          stayId: String(row.stay_id),
          patientId: String(row.patient_id),
          patientName: row.patient_name ? String(row.patient_name) : null,
          species: row.species ? String(row.species) : null,
          breed: row.breed ? String(row.breed) : null,
          ownerId: String(row.owner_id),
          ownerName: row.owner_name ? String(row.owner_name) : null
        } : null;

        return {
          bedId: String(row.bed_id),
          bedName: String(row.bed_name),
          bedCode: row.bed_code ? String(row.bed_code) : null,
          wardId: String(row.ward_id),
          status: row.status === 'occupied' ? 'occupied' : 'free',
          patient,
          admittedAt: row.admitted_at ? new Date(String(row.admitted_at)).toISOString() : null,
          chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null
        };
      });

      // Calculate stats
      const totalBeds = wards.reduce((sum, w) => sum + w.totalBeds, 0);
      const occupiedBeds = wards.reduce((sum, w) => sum + w.occupiedBeds, 0);

      const stats: DashboardStats = {
        totalWards: wards.length,
        totalBeds,
        occupiedBeds,
        freeBeds: totalBeds - occupiedBeds,
        activeStays: occupiedBeds
      };

      return { stats, wards, beds };
    }
  };
}
