/**
 * Odoo Field Mapping
 * 
 * Maps CVG-HIS UI fields to Odoo model concepts for future integration.
 * This file documents the mapping between our UI and Odoo's data models.
 * 
 * @see https://www.odoo.com/documentation/16.0/developer/reference.html
 */

/**
 * Partner (res.partner) Mapping
 * 
 * In Odoo, res.partner is used for:
 * - Customers (Clientes)
 * - Vendors
 * - Contacts
 * - Addresses
 */
export const PARTNER_FIELD_MAPPING = {
  // CVG-HIS Field -> Odoo Field
  id: 'id',
  name: 'name',
  fantasyName: 'x_fantasy_name', // Custom field or use commercial_name
  documentType: 'company_type', // 'person' or 'company'
  document: 'vat', // CPF/CNPJ
  email: 'email',
  phone: 'phone',
  mobile: 'mobile',
  website: 'website',
  
  // Address fields
  street: 'street',
  streetNumber: 'x_street_number', // Custom field
  street2: 'street2',
  district: 'x_district', // Custom field or use street2
  city: 'city',
  state: 'state_id', // Many2one to res.country.state
  zipCode: 'zip',
  country: 'country_id', // Many2one to res.country
  
  // Additional fields
  notes: 'comment',
  tags: 'category_id', // Many2many to res.partner.category
  status: 'active', // Boolean in Odoo
  
  // Integration fields
  externalId: 'id', // Odoo ID
  syncStatus: 'x_sync_status', // Custom field
  lastSyncAt: 'x_last_sync_at', // Custom field
} as const;

/**
 * Partner type options
 */
export const PARTNER_TYPES = [
  { value: 'person', label: 'Pessoa Física' },
  { value: 'company', label: 'Pessoa Jurídica' },
] as const;

/**
 * Product (product.template/product.product) Mapping
 * 
 * In Odoo, services are stored as products with type='service'.
 * Used for:
 * - Medical services (Serviços)
 * - Products for sale
 */
export const PRODUCT_FIELD_MAPPING = {
  // CVG-HIS Field -> Odoo Field
  id: 'id',
  name: 'name',
  code: 'default_code', // Internal reference
  description: 'description',
  type: 'detailed_type', // 'service', 'consu', 'product'
  category: 'categ_id', // Many2one to product.category
  listPrice: 'list_price', // Sale price
  costPrice: 'standard_price', // Cost price
  uom: 'uom_id', // Unit of measure
  active: 'active',
  
  // Service-specific
  duration: 'x_duration', // Custom field for service duration
  specialty: 'x_specialty', // Custom field
  
  // Integration fields
  externalId: 'id',
  syncStatus: 'x_sync_status',
  lastSyncAt: 'x_last_sync_at',
} as const;

/**
 * Product type options
 */
export const PRODUCT_TYPES = [
  { value: 'service', label: 'Serviço' },
  { value: 'consu', label: 'Consumível' },
  { value: 'product', label: 'Produto' },
] as const;

/**
 * User (res.users) Mapping
 * 
 * In Odoo, res.users is used for system users.
 * Extends res.partner for contact information.
 */
export const USER_FIELD_MAPPING = {
  // CVG-HIS Field -> Odoo Field
  id: 'id',
  name: 'name', // From res.partner
  login: 'login',
  email: 'email', // From res.partner
  phone: 'phone', // From res.partner
  active: 'active',
  
  // Access rights
  groups: 'groups_id', // Many2many to res.groups
  company: 'company_id', // Many2one to res.company
  companies: 'company_ids', // Many2many to res.company
  
  // Integration fields
  externalId: 'id',
  syncStatus: 'x_sync_status',
  lastSyncAt: 'x_last_sync_at',
} as const;

/**
 * Account (account.account) Mapping
 * 
 * For financial integration with Odoo Accounting.
 */
export const ACCOUNT_FIELD_MAPPING = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'account_type', // 'asset_receivable', 'asset_cash', 'liability_payable', etc.
  reconcile: 'reconcile',
  
  // Integration fields
  externalId: 'id',
  syncStatus: 'x_sync_status',
  lastSyncAt: 'x_last_sync_at',
} as const;

/**
 * Invoice (account.move) Mapping
 * 
 * For billing integration with Odoo Accounting.
 */
export const INVOICE_FIELD_MAPPING = {
  id: 'id',
  name: 'name', // Invoice number
  partner: 'partner_id', // Many2one to res.partner
  date: 'invoice_date',
  dueDate: 'invoice_date_due',
  lines: 'invoice_line_ids', // One2many to account.move.line
  amountTotal: 'amount_total',
  amountTax: 'amount_tax',
  state: 'state', // 'draft', 'posted', 'cancel'
  paymentState: 'payment_state', // 'not_paid', 'in_payment', 'paid', 'partial', 'reversed'
  
  // Integration fields
  externalId: 'id',
  syncStatus: 'x_sync_status',
  lastSyncAt: 'x_last_sync_at',
} as const;

/**
 * Invoice States
 */
export const INVOICE_STATES = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'posted', label: 'Publicado' },
  { value: 'cancel', label: 'Cancelado' },
] as const;

/**
 * Payment States
 */
export const PAYMENT_STATES = [
  { value: 'not_paid', label: 'Não Pago' },
  { value: 'in_payment', label: 'Em Pagamento' },
  { value: 'paid', label: 'Pago' },
  { value: 'partial', label: 'Parcial' },
  { value: 'reversed', label: 'Estornado' },
] as const;

/**
 * Sync Status Options
 */
export const SYNC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'synced', label: 'Sincronizado' },
  { value: 'error', label: 'Erro' },
  { value: 'conflict', label: 'Conflito' },
] as const;

/**
 * Map CVG-HIS partner data to Odoo format
 */
export function mapPartnerToOdoo(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  
  for (const [cvgField, odooField] of Object.entries(PARTNER_FIELD_MAPPING)) {
    if (data[cvgField] !== undefined) {
      mapped[odooField] = data[cvgField];
    }
  }
  
  // Handle special cases
  if (data.status !== undefined) {
    mapped.active = data.status === 'active';
  }
  
  return mapped;
}

/**
 * Map Odoo partner data to CVG-HIS format
 */
export function mapPartnerFromOdoo(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  
  for (const [cvgField, odooField] of Object.entries(PARTNER_FIELD_MAPPING)) {
    if (data[odooField] !== undefined) {
      mapped[cvgField] = data[odooField];
    }
  }
  
  // Handle special cases
  if (data.active !== undefined) {
    mapped.status = data.active ? 'active' : 'archived';
  }
  
  return mapped;
}

/**
 * Map CVG-HIS product/service data to Odoo format
 */
export function mapProductToOdoo(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  
  for (const [cvgField, odooField] of Object.entries(PRODUCT_FIELD_MAPPING)) {
    if (data[cvgField] !== undefined) {
      mapped[odooField] = data[cvgField];
    }
  }
  
  // Services are always type='service' in Odoo
  mapped.detailed_type = 'service';
  
  return mapped;
}

/**
 * Map Odoo product data to CVG-HIS format
 */
export function mapProductFromOdoo(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  
  for (const [cvgField, odooField] of Object.entries(PRODUCT_FIELD_MAPPING)) {
    if (data[odooField] !== undefined) {
      mapped[cvgField] = data[odooField];
    }
  }
  
  return mapped;
}

/**
 * Integration field configuration for forms
 */
export const INTEGRATION_FIELDS = {
  externalId: {
    label: 'ID Externo (Odoo)',
    helpText: 'Identificador único no sistema Odoo',
    readonly: true,
  },
  syncStatus: {
    label: 'Status de Sincronização',
    helpText: 'Status da última sincronização com Odoo',
    readonly: true,
    options: SYNC_STATUS_OPTIONS,
  },
  lastSyncAt: {
    label: 'Última Sincronização',
    helpText: 'Data e hora da última sincronização',
    readonly: true,
  },
} as const;

export default {
  PARTNER_FIELD_MAPPING,
  PRODUCT_FIELD_MAPPING,
  USER_FIELD_MAPPING,
  ACCOUNT_FIELD_MAPPING,
  INVOICE_FIELD_MAPPING,
  mapPartnerToOdoo,
  mapPartnerFromOdoo,
  mapProductToOdoo,
  mapProductFromOdoo,
  INTEGRATION_FIELDS,
};