/**
 * DatabaseFiscalRepository — GAP-08
 *
 * Repository that reads fiscal data (CFOP, ICMS, IPI, PIS, COFINS, IBS/CBS, PIS/COFINS, NFS-e)
 * from the database instead of in-memory arrays.
 *
 * Uses the Drizzle schemas created in packages/db/src/schema/:
 * - cfop_entries
 * - icms_tables
 * - ipi_tables
 * - pis_tables
 * - cofins_tables
 * - ibs_cbs_tables
 * - icms_rules
 * - ncm_entries
 * - pis_cofins_rules
 * - nfse_layouts
 * - fiscal_nfse_documents
 */

import { getPool } from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type {
  FiscalCfopSummary,
  FiscalIcmsTableSummary,
  FiscalIpiTableSummary,
  FiscalPisTableSummary,
  FiscalCofinsTableSummary,
  FiscalIbsCbsTableSummary,
  FiscalIcmsRuleSummary,
  FiscalNcmEntrySummary,
  FiscalPisCofinsRuleSummary,
  FiscalNfseLayoutSummary,
  UpdateFiscalIcmsTableRequest,
  UpdateFiscalIpiTableRequest,
  UpdateFiscalPisTableRequest,
  UpdateFiscalCofinsTableRequest,
  UpdateFiscalIbsCbsTableRequest,
  UpdateFiscalNfseLayoutRequest
} from '@cvg-his-v2/shared-contracts';
import type { NfseCustomer, NfseDocument, NfseIssuer, NfseServiceLine } from './nfse-emitter.js';

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

export interface DbCreateIcmsMatrixRule {
  readonly ufOrigin: string;
  readonly ufDestination: string;
  readonly rate: number;
  readonly cst: string;
  readonly operationType: 'interna' | 'interestadual';
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

export interface DbIbsCbsTableFilters extends DbFiscalFilters {
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

export interface PersistedNfseDocument extends NfseDocument {
  readonly municipalityCode: string;
  readonly apiUrl: string;
  readonly environment: 'producao' | 'homologacao';
}

export interface DbNfseDocumentFilters extends DbFiscalFilters {
  readonly status?: PersistedNfseDocument['status'];
  readonly customerSearch?: string;
  readonly search?: string;
  readonly competenciaFrom?: string;
  readonly competenciaTo?: string;
  readonly limit?: number;
}

const MAX_NFSE_DOCUMENT_READ_ROWS = 10_001;

export type NfseOperationKind = 'issue' | 'cancel';

export interface NfseOperationClaim {
  readonly state: 'claimed' | 'completed';
  readonly document: PersistedNfseDocument;
}

function parseJson<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toDateOnly(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
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

function mapNfseDocumentRow(row: Record<string, unknown>): PersistedNfseDocument {
  return {
    id: row.id as string,
    serie: row.serie as string,
    numero: Number(row.numero),
    competencia: toDateOnly(row.competencia),
    issuer: parseJson<NfseIssuer>(row.issuer),
    customer: parseJson<NfseCustomer>(row.customer),
    services: parseJson<readonly NfseServiceLine[]>(row.services),
    subtotal: Number(row.subtotal),
    totalIss: Number(row.total_iss),
    totalPis: Number(row.total_pis),
    totalCofins: Number(row.total_cofins),
    totalCsll: Number(row.total_csll),
    totalIrrf: Number(row.total_irrf),
    totalInss: Number(row.total_inss),
    totalDocument: Number(row.total_document),
    observations: (row.observations as string | null) ?? undefined,
    createdAt: toIsoString(row.created_at),
    status: row.status as PersistedNfseDocument['status'],
    provider: row.provider as PersistedNfseDocument['provider'],
    authorizationCode: (row.authorization_code as string | null) ?? undefined,
    verificationUrl: (row.verification_url as string | null) ?? undefined,
    municipalityCode: row.municipality_code as string,
    apiUrl: row.api_url as string,
    environment: row.environment as PersistedNfseDocument['environment']
  };
}

function mapCfopRow(row: Record<string, unknown>): FiscalCfopSummary {
  const rawApplicableTo = row.applicable_to;
  const applicableTo = (
    Array.isArray(rawApplicableTo) ? rawApplicableTo : JSON.parse(rawApplicableTo as string)
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
      items = items.filter((item) =>
        item.applicableTo.includes(filters.documentType as 'nfe' | 'nfce' | 'nfse' | 'cte')
      );
    }

    return items;
  }

  async findCfopByCode(code: string): Promise<FiscalCfopSummary | null> {
    const pool = this.pool;
    const result = await pool.query('SELECT * FROM cfop_entries WHERE code = $1 LIMIT 1', [code]);
    if (result.rows.length === 0) return null;
    return mapCfopRow(result.rows[0]);
  }

  async createCfop(_accountId: AccountId, cfop: FiscalCfopSummary): Promise<FiscalCfopSummary> {
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

    const result = await pool.query(`SELECT * FROM icms_tables ${where} ORDER BY code`, params);

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

    const result = await pool.query(`SELECT * FROM ipi_tables ${where} ORDER BY code`, params);

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

    const result = await pool.query(`SELECT * FROM pis_tables ${where} ORDER BY code`, params);

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

    const result = await pool.query(`SELECT * FROM cofins_tables ${where} ORDER BY code`, params);

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
  // IBS/CBS Tables
  // --------------------------------------------------------------------------

  async listIbsCbsTables(filters: DbIbsCbsTableFilters): Promise<FiscalIbsCbsTableSummary[]> {
    const pool = this.pool;
    const params: unknown[] = [];
    let where = '';

    if (filters.search) {
      where = `WHERE (
        code ILIKE $1 OR
        description ILIKE $1 OR
        CAST(ibs_percent AS TEXT) ILIKE $1 OR
        CAST(cbs_percent AS TEXT) ILIKE $1
      )`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(`SELECT * FROM ibs_cbs_tables ${where} ORDER BY code`, params);

    return result.rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      ibsPercent: parseFloat(row.ibs_percent as string),
      cbsPercent: parseFloat(row.cbs_percent as string)
    })) as FiscalIbsCbsTableSummary[];
  }

  async createIbsCbsTable(
    _accountId: AccountId,
    table: FiscalIbsCbsTableSummary
  ): Promise<FiscalIbsCbsTableSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO ibs_cbs_tables (id, code, description, ibs_percent, cbs_percent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [table.id, table.code, table.description, table.ibsPercent, table.cbsPercent]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      ibsPercent: parseFloat(row.ibs_percent as string),
      cbsPercent: parseFloat(row.cbs_percent as string)
    };
  }

  async updateIbsCbsTable(
    _accountId: AccountId,
    id: string,
    payload: UpdateFiscalIbsCbsTableRequest
  ): Promise<FiscalIbsCbsTableSummary | null> {
    const pool = this.pool;
    const result = await pool.query(
      `UPDATE ibs_cbs_tables
       SET
         code = COALESCE($2, code),
         description = COALESCE($3, description),
         ibs_percent = COALESCE($4, ibs_percent),
         cbs_percent = COALESCE($5, cbs_percent),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, payload.code, payload.description, payload.ibsPercent, payload.cbsPercent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? '',
      ibsPercent: parseFloat(row.ibs_percent as string),
      cbsPercent: parseFloat(row.cbs_percent as string)
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

  async createIcmsMatrixRule(
    _accountId: AccountId,
    payload: DbCreateIcmsMatrixRule
  ): Promise<FiscalIcmsRuleSummary> {
    const pool = this.pool;
    const result = await pool.query(
      `INSERT INTO icms_rules (uf_origin, uf_destination, ncm, rate, cst, operation_type)
       VALUES ($1, $2, NULL, $3, $4, $5)
       RETURNING *`,
      [payload.ufOrigin, payload.ufDestination, payload.rate, payload.cst, payload.operationType]
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      ufOrigin: row.uf_origin as string,
      ufDestination: row.uf_destination as string,
      ncm: (row.ncm as string | null) ?? '',
      rate: parseFloat(row.rate as string),
      cst: row.cst as string,
      operationType: row.operation_type as 'interna' | 'interestadual'
    };
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
    return withTenantQueryExplicit(this.pool, filters.accountId, async (client) => {
      const conditions: string[] = ['(account_id IS NULL OR account_id = $1)'];
      const params: unknown[] = [filters.accountId];

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

      const result = await client.query(
        `SELECT * FROM nfse_layouts WHERE ${conditions.join(' AND ')} ORDER BY state, city`,
        params
      );

      return result.rows.map((row) => mapNfseLayoutRow(row as Record<string, unknown>));
    });
  }

  async createNfseLayout(
    accountId: AccountId,
    layout: FiscalNfseLayoutSummary
  ): Promise<FiscalNfseLayoutSummary> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO nfse_layouts (
          id,
          account_id,
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          layout.id,
          accountId,
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
    });
  }

  async updateNfseLayout(
    accountId: AccountId,
    id: string,
    payload: UpdateFiscalNfseLayoutRequest
  ): Promise<FiscalNfseLayoutSummary | null> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const current = await client.query(
        'SELECT * FROM nfse_layouts WHERE id = $1 AND (account_id IS NULL OR account_id = $2) LIMIT 1',
        [id, accountId]
      );
      if (current.rows.length === 0) return null;

      const row = current.rows[0] as Record<string, unknown>;
      const next = {
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

      if (row.account_id === null || row.account_id === undefined) {
        const overrideId = `${id}-${String(accountId).slice(0, 8)}`.slice(0, 60);
        const result = await client.query(
          `INSERT INTO nfse_layouts (
            id, account_id, city, state, municipality_code, provider, version,
            active, environment, service_code, service_focus, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            municipality_code = EXCLUDED.municipality_code,
            provider = EXCLUDED.provider,
            version = EXCLUDED.version,
            active = EXCLUDED.active,
            environment = EXCLUDED.environment,
            service_code = EXCLUDED.service_code,
            service_focus = EXCLUDED.service_focus,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            overrideId,
            accountId,
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

      const result = await client.query(
        `UPDATE nfse_layouts
         SET city = $2, state = $3, municipality_code = $4, provider = $5,
             version = $6, active = $7, environment = $8, service_code = $9,
             service_focus = $10, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND account_id = $11
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
          next.serviceFocus || null,
          accountId
        ]
      );

      return result.rows.length === 0
        ? null
        : mapNfseLayoutRow(result.rows[0] as Record<string, unknown>);
    });
  }

  // --------------------------------------------------------------------------
  // NFS-e Documents
  // --------------------------------------------------------------------------

  async listNfseDocuments(filters: DbNfseDocumentFilters): Promise<PersistedNfseDocument[]> {
    return withTenantQueryExplicit(this.pool, filters.accountId, async (client) => {
      const conditions: string[] = ['account_id = $1'];
      const params: unknown[] = [filters.accountId];

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }
      if (filters.customerSearch?.trim()) {
        conditions.push(`(
          customer->>'name' ILIKE $${params.length + 1} ESCAPE E'\\\\'
          OR customer->>'document' ILIKE $${params.length + 1} ESCAPE E'\\\\'
        )`);
        params.push(`%${escapeIlikePattern(filters.customerSearch.trim())}%`);
      }

      if (filters.search?.trim()) {
        conditions.push(`(
          customer->>'name' ILIKE $${params.length + 1} ESCAPE E'\\\\'
          OR customer->>'document' ILIKE $${params.length + 1} ESCAPE E'\\\\'
          OR services::text ILIKE $${params.length + 1} ESCAPE E'\\\\'
        )`);
        params.push(`%${escapeIlikePattern(filters.search.trim())}%`);
      }
      if (filters.competenciaFrom) {
        conditions.push(`competencia >= $${params.length + 1}::date`);
        params.push(filters.competenciaFrom);
      }
      if (filters.competenciaTo) {
        conditions.push(`competencia <= $${params.length + 1}::date`);
        params.push(filters.competenciaTo);
      }

      let limitClause = '';
      if (filters.limit !== undefined) {
        if (
          !Number.isSafeInteger(filters.limit) ||
          filters.limit <= 0 ||
          filters.limit > MAX_NFSE_DOCUMENT_READ_ROWS
        ) {
          throw new ValidationError('NFS-e document read limit must be between 1 and 10001', {
            limit: filters.limit
          });
        }
        limitClause = ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }

      const result = await client.query(
        `SELECT * FROM fiscal_nfse_documents
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC, id DESC${limitClause}`,
        params
      );
      return result.rows.map((row) => mapNfseDocumentRow(row as Record<string, unknown>));
    });
  }

  async findNfseDocument(accountId: AccountId, id: string): Promise<PersistedNfseDocument | null> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM fiscal_nfse_documents WHERE account_id = $1 AND id = $2 LIMIT 1',
        [accountId, id]
      );
      return result.rows.length === 0
        ? null
        : mapNfseDocumentRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async claimNfseOperation(
    accountId: AccountId,
    id: string,
    operationKind: NfseOperationKind,
    operationKey: string,
    providerRequestKey: string,
    leaseMs = 120_000
  ): Promise<NfseOperationClaim | null> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM fiscal_nfse_documents
         WHERE account_id = $1 AND id = $2
         FOR UPDATE`,
        [accountId, id]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0] as Record<string, unknown>;
      const current = mapNfseDocumentRow(row);
      const status = String(row.status);
      const lastOperationKind = row.last_operation_kind as NfseOperationKind | null | undefined;

      if (
        (operationKind === 'issue' && status === 'issued') ||
        (operationKind === 'cancel' && status === 'cancelled')
      ) {
        return { state: 'completed', document: current };
      }

      const allowed =
        operationKind === 'issue'
          ? status === 'draft' || (status === 'error' && lastOperationKind === 'issue')
          : status === 'issued' || (status === 'error' && lastOperationKind === 'cancel');
      if (!allowed) {
        const verb = operationKind === 'issue' ? 'issue' : 'cancel';
        throw new Error(`Cannot ${verb} document in status: ${status}`);
      }

      const leaseUntil = row.operation_lease_until
        ? new Date(String(row.operation_lease_until)).getTime()
        : 0;
      if (leaseUntil > Date.now()) {
        throw new Error('NFS-e operation is already in progress');
      }

      const claimed = await client.query(
        `UPDATE fiscal_nfse_documents
            SET operation_key = $3,
                operation_kind = $4,
                operation_lease_until = CURRENT_TIMESTAMP + ($5 * INTERVAL '1 millisecond'),
                last_operation_kind = $4,
                last_provider_request_key = $6,
                updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1 AND id = $2
         RETURNING *`,
        [accountId, id, operationKey, operationKind, leaseMs, providerRequestKey]
      );
      return {
        state: 'claimed',
        document: mapNfseDocumentRow(claimed.rows[0] as Record<string, unknown>)
      };
    });
  }

  async createNfseDocument(
    accountId: AccountId,
    document: PersistedNfseDocument
  ): Promise<PersistedNfseDocument> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO fiscal_nfse_documents (
          id, account_id, serie, numero, competencia, provider, municipality_code,
          api_url, environment, issuer, customer, services, subtotal, total_iss,
          total_pis, total_cofins, total_csll, total_irrf, total_inss, total_document,
          observations, status, authorization_code, verification_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        ) RETURNING *`,
        this.documentParameters(accountId, document)
      );
      return mapNfseDocumentRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async updateNfseDocument(
    accountId: AccountId,
    document: PersistedNfseDocument
  ): Promise<PersistedNfseDocument | null> {
    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      // The update keeps created_at immutable and sets updated_at in SQL.
      // Reuse only the 24 document fields addressed by the UPDATE placeholders;
      // the INSERT-only timestamps are the final two values in this array.
      const parameters = this.documentParameters(accountId, document).slice(0, 24);
      const result = await client.query(
        `UPDATE fiscal_nfse_documents SET
          serie = $3, numero = $4, competencia = $5, provider = $6, municipality_code = $7,
          api_url = $8, environment = $9, issuer = $10, customer = $11, services = $12,
          subtotal = $13, total_iss = $14, total_pis = $15, total_cofins = $16,
          total_csll = $17, total_irrf = $18, total_inss = $19, total_document = $20,
          observations = $21, status = $22, authorization_code = $23,
          verification_url = $24, operation_key = NULL, operation_kind = NULL,
          operation_lease_until = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND account_id = $2
         RETURNING *`,
        parameters
      );
      return result.rows.length === 0
        ? null
        : mapNfseDocumentRow(result.rows[0] as Record<string, unknown>);
    });
  }

  private documentParameters(accountId: AccountId, document: PersistedNfseDocument): unknown[] {
    return [
      document.id,
      accountId,
      document.serie,
      document.numero,
      document.competencia,
      document.provider,
      document.municipalityCode,
      document.apiUrl,
      document.environment,
      JSON.stringify(document.issuer),
      JSON.stringify(document.customer),
      JSON.stringify(document.services),
      document.subtotal,
      document.totalIss,
      document.totalPis,
      document.totalCofins,
      document.totalCsll,
      document.totalIrrf ?? 0,
      document.totalInss ?? 0,
      document.totalDocument,
      document.observations ?? null,
      document.status,
      document.authorizationCode ?? null,
      document.verificationUrl ?? null,
      document.createdAt,
      new Date().toISOString()
    ];
  }
}
