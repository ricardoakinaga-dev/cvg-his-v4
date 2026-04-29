/**
 * DatabaseFiscalRepository — GAP-08
 *
 * Repository that reads fiscal data (CFOP, ICMS, IPI, PIS, COFINS, PIS/COFINS, NFS-e)
 * from the database instead of in-memory arrays.
 *
 * Uses the Drizzle schemas created in packages/db/src/schema/:
 * - cfop_entries
 * - icms_tables
 * - ipi_tables
 * - pis_tables
 * - cofins_tables
 * - icms_rules
 * - ncm_entries
 * - pis_cofins_rules
 * - nfse_layouts
 */

import { getPool } from '@cvg-his-v2/shared-database';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type {
  FiscalCfopSummary,
  FiscalIcmsTableSummary,
  FiscalIpiTableSummary,
  FiscalPisTableSummary,
  FiscalCofinsTableSummary,
  FiscalIcmsRuleSummary,
  FiscalNcmEntrySummary,
  FiscalPisCofinsRuleSummary,
  FiscalNfseLayoutSummary,
  UpdateFiscalIcmsTableRequest,
  UpdateFiscalIpiTableRequest,
  UpdateFiscalPisTableRequest,
  UpdateFiscalCofinsTableRequest,
  UpdateFiscalNfseLayoutRequest
} from '@cvg-his-v2/shared-contracts';

// ============================================================================
// Types
// ============================================================================

export interface DbFiscalFilters {
  readonly accountId: AccountId;
}

export interface DbCfopFilters extends DbFiscalFilters {
  readonly search?: string;
  readonly section?: string;
  readonly documentType?: string;
}

export interface DbIcmsRuleFilters extends DbFiscalFilters {
  readonly ufOrigin?: string;
  readonly ufDestination?: string;
  readonly ncm?: string;
  readonly operationType?: string;
}

export interface DbIcmsTableFilters extends DbFiscalFilters {
  readonly search?: string;
}

export interface DbIpiTableFilters extends DbFiscalFilters {
  readonly search?: string;
}

export interface DbPisTableFilters extends DbFiscalFilters {
  readonly search?: string;
}

export interface DbCofinsTableFilters extends DbFiscalFilters {
  readonly search?: string;
}

export interface DbNcmEntryFilters extends DbFiscalFilters {
  readonly search?: string;
}

export interface DbPisCofinsRuleFilters extends DbFiscalFilters {
  readonly regime?: string;
  readonly appliesTo?: string;
}

export interface DbNfseLayoutFilters extends DbFiscalFilters {
  readonly search?: string;
  readonly state?: string;
  readonly active?: boolean;
}

function mapNfseLayoutRow(row: Record<string, unknown>): FiscalNfseLayoutSummary {
  return {
    id: row.id as string,
    city: row.city as string,
    state: row.state as string,
    municipalityCode: (row.municipality_code as string) ?? '',
    provider: row.provider as string,
    version: row.version as string,
    active: Boolean(row.active),
    environment: row.environment as 'producao' | 'homologacao',
    serviceCode: (row.service_code as string) ?? '',
    serviceFocus: (row.service_focus as string) ?? ''
  };
}

function mapCfopRow(row: Record<string, unknown>): FiscalCfopSummary {
  const rawApplicableTo = row.applicable_to;
  const applicableTo = (
    Array.isArray(rawApplicableTo)
      ? rawApplicableTo
      : JSON.parse(rawApplicableTo as string)
  ) as readonly ('nfe' | 'nfce' | 'nfse' | 'cte')[];

  return {
    code: row.code as string,
    description: row.description as string,
    section: row.section as 'entrada' | 'saida',
    category: row.category as string,
    applicableTo,
    icmsRelevant: Boolean(row.icms_relevant),
    pisCofinsRelevant: Boolean(row.pis_cofins_relevant),
    ipiRelevant: Boolean(row.ipi_relevant),
    documentTypesLabel: applicableTo.join(', ').toUpperCase()
  };
}

// ============================================================================
// Database Fiscal Repository
// ============================================================================

export class DatabaseFiscalRepository {
  private get pool() {
    return getPool();
  }

  // --------------------------------------------------------------------------
  // CFOP
  // --------------------------------------------------------------------------

  async listCfop(filters: DbCfopFilters): Promise<FiscalCfopSummary[]> {
    const pool = this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      conditions.push(`(
        code ILIKE $${params.length + 1} OR
        description ILIKE $${params.length + 1} OR
        category ILIKE $${params.length + 1}
      )`);
      params.push(`%${filters.search}%`);
    }

    if (filters.section) {
      conditions.push(`section = $${params.length + 1}`);
      params.push(filters.section);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM cfop_entries ${where} ORDER BY code`;
    const result = await pool.query(query, params);

    let items = result.rows.map((row) => mapCfopRow(row));

    if (filters.documentType) {
      items = items.filter((item) => item.applicableTo.includes(filters.documentType as 'nfe' | 'nfce' | 'nfse' | 'cte'));
    }

    return items;
  }

  async findCfopByCode(code: string): Promise<FiscalCfopSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      'SELECT * FROM cfop_entries WHERE code = $1 LIMIT 1',
      [code]
    );
    if (result.rows.length === 0) return null;
    return mapCfopRow(result.rows[0]);
  }

  async createCfop(
    _accountId: AccountId,
    cfop: FiscalCfopSummary
  ): Promise<FiscalCfopSummary> {
    const result = await this.pool.query(
      `INSERT INTO cfop_entries (
        code,
        description,
        section,
        category,
        applicable_to,
        icms_relevant,
        pis_cofins_relevant,
        ipi_relevant
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        cfop.code,
        cfop.description,
        cfop.section,
        cfop.category,
        JSON.stringify(cfop.applicableTo),
        cfop.icmsRelevant,
        cfop.pisCofinsRelevant,
        cfop.ipiRelevant
      ]
    );

    return mapCfopRow(result.rows[0]);
  }

  async updateCfop(
    _accountId: AccountId,
    code: string,
    payload: FiscalCfopSummary
  ): Promise<FiscalCfopSummary | null> {
    const result = await this.pool.query(
      `UPDATE cfop_entries
       SET
         code = $2,
         description = $3,
         section = $4,
         category = $5,
         applicable_to = $6,
         icms_relevant = $7,
         pis_cofins_relevant = $8,
         ipi_relevant = $9,
         updated_at = NOW()
       WHERE code = $1
       RETURNING *`,
      [
        code,
        payload.code,
        payload.description,
        payload.section,
        payload.category,
        JSON.stringify(payload.applicableTo),
        payload.icmsRelevant,
        payload.pisCofinsRelevant,
        payload.ipiRelevant
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapCfopRow(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // ICMS Tables
  // --------------------------------------------------------------------------

  async listIcmsTables(filters: DbIcmsTableFilters): Promise<FiscalIcmsTableSummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        code ILIKE $1 OR
        description ILIKE $1 OR
        CAST(percent AS TEXT) ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM icms_tables ${where} ORDER BY code`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    })) as FiscalIcmsTableSummary[];
  }

  async createIcmsTable(
    _accountId: AccountId,
    table: FiscalIcmsTableSummary
  ): Promise<FiscalIcmsTableSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO icms_tables (id, code, description, percent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [table.id, table.code, table.description, table.percent]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  async updateIcmsTable(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalIcmsTableRequest
  ): Promise<FiscalIcmsTableSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      `UPDATE icms_tables
       SET
         code = COALESCE($2, code),
         description = COALESCE($3, description),
         percent = COALESCE($4, percent),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.code, payload.description, payload.percent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  // --------------------------------------------------------------------------
  // IPI Tables
  // --------------------------------------------------------------------------

  async listIpiTables(filters: DbIpiTableFilters): Promise<FiscalIpiTableSummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        code ILIKE $1 OR
        description ILIKE $1 OR
        CAST(percent AS TEXT) ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM ipi_tables ${where} ORDER BY code`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    })) as FiscalIpiTableSummary[];
  }

  async createIpiTable(
    _accountId: AccountId,
    table: FiscalIpiTableSummary
  ): Promise<FiscalIpiTableSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO ipi_tables (id, code, description, percent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [table.id, table.code, table.description, table.percent]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  async updateIpiTable(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalIpiTableRequest
  ): Promise<FiscalIpiTableSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      `UPDATE ipi_tables
       SET
         code = COALESCE($2, code),
         description = COALESCE($3, description),
         percent = COALESCE($4, percent),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.code, payload.description, payload.percent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  // --------------------------------------------------------------------------
  // PIS Tables
  // --------------------------------------------------------------------------

  async listPisTables(filters: DbPisTableFilters): Promise<FiscalPisTableSummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        code ILIKE $1 OR
        description ILIKE $1 OR
        CAST(percent AS TEXT) ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM pis_tables ${where} ORDER BY code`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    })) as FiscalPisTableSummary[];
  }

  async createPisTable(
    _accountId: AccountId,
    table: FiscalPisTableSummary
  ): Promise<FiscalPisTableSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO pis_tables (id, code, description, percent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [table.id, table.code, table.description, table.percent]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  async updatePisTable(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalPisTableRequest
  ): Promise<FiscalPisTableSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      `UPDATE pis_tables
       SET
         code = COALESCE($2, code),
         description = COALESCE($3, description),
         percent = COALESCE($4, percent),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.code, payload.description, payload.percent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  // --------------------------------------------------------------------------
  // COFINS Tables
  // --------------------------------------------------------------------------

  async listCofinsTables(filters: DbCofinsTableFilters): Promise<FiscalCofinsTableSummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        code ILIKE $1 OR
        description ILIKE $1 OR
        CAST(percent AS TEXT) ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM cofins_tables ${where} ORDER BY code`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    })) as FiscalCofinsTableSummary[];
  }

  async createCofinsTable(
    _accountId: AccountId,
    table: FiscalCofinsTableSummary
  ): Promise<FiscalCofinsTableSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO cofins_tables (id, code, description, percent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [table.id, table.code, table.description, table.percent]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  async updateCofinsTable(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalCofinsTableRequest
  ): Promise<FiscalCofinsTableSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      `UPDATE cofins_tables
       SET
         code = COALESCE($2, code),
         description = COALESCE($3, description),
         percent = COALESCE($4, percent),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.code, payload.description, payload.percent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      percent: parseFloat(row.percent as string)
    };
  }

  // --------------------------------------------------------------------------
  // ICMS Rules
  // --------------------------------------------------------------------------

  async listIcmsRules(filters: DbIcmsRuleFilters): Promise<FiscalIcmsRuleSummary[]> {
    const pool = this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.ufOrigin) {
      conditions.push(`uf_origin = $${params.length + 1}`);
      params.push(filters.ufOrigin);
    }
    if (filters.ufDestination) {
      conditions.push(`uf_destination = $${params.length + 1}`);
      params.push(filters.ufDestination);
    }
    if (filters.ncm) {
      conditions.push(`ncm = $${params.length + 1}`);
      params.push(filters.ncm);
    }
    if (filters.operationType) {
      conditions.push(`operation_type = $${params.length + 1}`);
      params.push(filters.operationType);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM icms_rules ${where} ORDER BY uf_origin, uf_destination, ncm`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      ufOrigin: row.uf_origin as string,
      ufDestination: row.uf_destination as string,
      ncm: row.ncm as string,
      rate: parseFloat(row.rate as string),
      cst: row.cst as string,
      operationType: row.operation_type as 'interna' | 'interestadual'
    })) as FiscalIcmsRuleSummary[];
  }

  // --------------------------------------------------------------------------
  // NCM Entries
  // --------------------------------------------------------------------------

  async listNcmEntries(filters: DbNcmEntryFilters): Promise<FiscalNcmEntrySummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        ncm ILIKE $1 OR
        category ILIKE $1 OR
        notes ILIKE $1 OR
        source ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM ncm_entries ${where} ORDER BY ncm LIMIT 100`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      ncm: row.ncm as string,
      category: row.category as string,
      ipiRate: parseFloat(row.ipi_rate as string),
      source: row.source as string,
      notes: (row.notes as string) ?? ''
    })) as FiscalNcmEntrySummary[];
  }

  // --------------------------------------------------------------------------
  // PIS/COFINS Rules
  // --------------------------------------------------------------------------

  async listPisCofinsRules(filters: DbPisCofinsRuleFilters): Promise<FiscalPisCofinsRuleSummary[]> {
    const pool = this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.regime) {
      conditions.push(`regime = $${params.length + 1}`);
      params.push(filters.regime);
    }
    if (filters.appliesTo) {
      conditions.push(`applies_to = $${params.length + 1}`);
      params.push(filters.appliesTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM pis_cofins_rules ${where} ORDER BY regime, applies_to`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      regime: row.regime as 'simples_nacional' | 'lucro_presumido' | 'lucro_real',
      appliesTo: row.applies_to as 'mercadoria' | 'servico' | 'ambos',
      pisRate: parseFloat(row.pis_rate as string),
      cofinsRate: parseFloat(row.cofins_rate as string),
      notes: (row.notes as string) ?? ''
    })) as FiscalPisCofinsRuleSummary[];
  }

  // --------------------------------------------------------------------------
  // NFS-e Layouts
  // --------------------------------------------------------------------------

  async listNfseLayouts(filters: DbNfseLayoutFilters): Promise<FiscalNfseLayoutSummary[]> {
    const pool = this.pool;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.state) {
      conditions.push(`state = $${params.length + 1}`);
      params.push(filters.state);
    }
    if (filters.search) {
      conditions.push(`(
        LOWER(id) LIKE LOWER($${params.length + 1})
        OR LOWER(city) LIKE LOWER($${params.length + 1})
        OR LOWER(state) LIKE LOWER($${params.length + 1})
        OR LOWER(COALESCE(municipality_code, '')) LIKE LOWER($${params.length + 1})
        OR LOWER(provider) LIKE LOWER($${params.length + 1})
        OR LOWER(version) LIKE LOWER($${params.length + 1})
        OR LOWER(COALESCE(service_code, '')) LIKE LOWER($${params.length + 1})
        OR LOWER(COALESCE(service_focus, '')) LIKE LOWER($${params.length + 1})
      )`);
      params.push(`%${filters.search}%`);
    }
    if (filters.active !== undefined) {
      conditions.push(`active = $${params.length + 1}`);
      params.push(filters.active);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM nfse_layouts ${where} ORDER BY state, city`,
      params
    );

    return result.rows.map((row) => mapNfseLayoutRow(row as Record<string, unknown>));
  }

  async createNfseLayout(
    _accountId: AccountId,
    layout: FiscalNfseLayoutSummary
  ): Promise<FiscalNfseLayoutSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO nfse_layouts (
        id,
        city,
        state,
        municipality_code,
        provider,
        version,
        active,
        environment,
        service_code,
        service_focus,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
      RETURNING *`,
      [
        layout.id,
        layout.city,
        layout.state,
        layout.municipalityCode || null,
        layout.provider,
        layout.version,
        layout.active,
        layout.environment,
        layout.serviceCode || null,
        layout.serviceFocus || null
      ]
    );

    return mapNfseLayoutRow(result.rows[0] as Record<string, unknown>);
  }

  async updateNfseLayout(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalNfseLayoutRequest
  ): Promise<FiscalNfseLayoutSummary | null> {
    const current = await this.pool.query('SELECT * FROM nfse_layouts WHERE id = $1 LIMIT 1', [id]);
    if (current.rows.length === 0) {
      return null;
    }

    const row = current.rows[0] as Record<string, unknown>;
    const next: FiscalNfseLayoutSummary = {
      id,
      city: (payload.city ?? row.city) as string,
      state: (payload.state ?? row.state) as string,
      municipalityCode: (payload.municipalityCode ?? row.municipality_code ?? '') as string,
      provider: (payload.provider ?? row.provider) as string,
      version: (payload.version ?? row.version) as string,
      active: payload.active ?? Boolean(row.active),
      environment: (payload.environment ?? row.environment) as 'producao' | 'homologacao',
      serviceCode: (payload.serviceCode ?? row.service_code ?? '') as string,
      serviceFocus: (payload.serviceFocus ?? row.service_focus ?? '') as string
    };

    const result = await this.pool.query(
      `UPDATE nfse_layouts
      SET
        city = $2,
        state = $3,
        municipality_code = $4,
        provider = $5,
        version = $6,
        active = $7,
        environment = $8,
        service_code = $9,
        service_focus = $10,
        updated_at = CURRENT_TIMESTAMP::text
      WHERE id = $1
      RETURNING *`,
      [
        id,
        next.city,
        next.state,
        next.municipalityCode || null,
        next.provider,
        next.version,
        next.active,
        next.environment,
        next.serviceCode || null,
        next.serviceFocus || null
      ]
    );

    return mapNfseLayoutRow(result.rows[0] as Record<string, unknown>);
  }
}
