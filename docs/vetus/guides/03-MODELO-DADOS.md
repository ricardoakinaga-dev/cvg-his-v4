# 🗄️ MODELO DE DADOS — ERP ENTERPRISE

> **Baseado na análise do Vetus ERP**  
> **Data:** 02/04/2026
>
> **Nota de governança:** este documento representa um modelo exploratório e não deve ser tratado como esquema físico final de implementação. O modelo lógico consolidado do programa está em `docs2/14-modelo-dados-logico-vetus-like.md`.

---

## 1. VISÃO GERAL

O modelo de dados é projetado para suportar **multi-tenancy** com isolamento lógico via `tenant_id` em todas as tabelas. Estimativa: **200+ tabelas**.

---

## 2. CORE (Núcleo do Sistema)

### 2.1 Tenants

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'standard',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    max_users INT DEFAULT 10,
    max_branches INT DEFAULT 1,
    max_storage_mb INT DEFAULT 1024,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Companies

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    ie VARCHAR(20),
    im VARCHAR(20),
    logo_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Branches

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    cnpj VARCHAR(18),
    is_main BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 Settings

```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    branch_id UUID REFERENCES branches(id),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    UNIQUE(tenant_id, branch_id, category, key)
);
```

---

## 3. USUÁRIOS E ACESSO

### 3.1 Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    vetus_id VARCHAR(50),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    cpf VARCHAR(14),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, username)
);
```

### 3.2 Access Groups

```sql
CREATE TABLE access_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);
```

### 3.3 Group Permissions

```sql
CREATE TABLE group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES routines(id),
    can_consult BOOLEAN DEFAULT false,
    can_insert BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(group_id, routine_id)
);
```

### 3.4 Routines

```sql
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 User Sessions

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 Audit Logs

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## 4. CLIENTES E ANIMAIS

### 4.1 Clients

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    people_type VARCHAR(20) NOT NULL, -- PHYSICAL_PERSON, LEGAL_PERSON
    cpf_cnpj VARCHAR(18),
    rg VARCHAR(20),
    ie VARCHAR(20),
    birthday DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    cell_phone VARCHAR(20),
    email VARCHAR(255),
    group_id UUID REFERENCES client_groups(id),
    status VARCHAR(20) DEFAULT 'active',
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Client Addresses

```sql
CREATE TABLE client_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    zip_code VARCHAR(10),
    address VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    city_code INT,
    is_primary BOOLEAN DEFAULT false
);
```

### 4.3 Client Groups

```sql
CREATE TABLE client_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    description VARCHAR(100) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Client Details

```sql
CREATE TABLE client_details (
    client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
    accept_sms BOOLEAN DEFAULT false,
    active_live_lab BOOLEAN DEFAULT false,
    active_live_pet BOOLEAN DEFAULT false,
    debit_balance_limit DECIMAL(10,2) DEFAULT 0,
    credit_balance DECIMAL(10,2) DEFAULT 0,
    blocked_points INT DEFAULT 0,
    available_points INT DEFAULT 0
);
```

### 4.5 Animals

```sql
CREATE TABLE animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    name VARCHAR(100) NOT NULL,
    specie_id UUID REFERENCES species(id),
    breed_id UUID REFERENCES breeds(id),
    color_id UUID REFERENCES colors(id),
    gender VARCHAR(20),
    birth_date DATE,
    weight DECIMAL(5,2),
    microchip_number VARCHAR(50),
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 Species, Breeds, Colors

```sql
CREATE TABLE species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, name)
);

CREATE TABLE breeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    specie_id UUID REFERENCES species(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, name)
);

CREATE TABLE colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, name)
);
```

### 4.7 Medical Records

```sql
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    animal_id UUID NOT NULL REFERENCES animals(id),
    professional_id UUID REFERENCES professionals(id),
    type VARCHAR(50) NOT NULL, -- CONSULTATION, SURGERY, EXAM, VACCINE
    description TEXT,
    diagnosis TEXT,
    prescription TEXT,
    date DATE NOT NULL,
    command_id UUID REFERENCES commands(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.8 Vaccines

```sql
CREATE TABLE vaccines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    animal_id UUID NOT NULL REFERENCES animals(id),
    product_id UUID REFERENCES products(id),
    professional_id UUID REFERENCES professionals(id),
    application_date DATE NOT NULL,
    next_application_date DATE,
    batch_number VARCHAR(50),
    laboratory VARCHAR(100),
    observation TEXT,
    status VARCHAR(20) DEFAULT 'applied',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. ATENDIMENTO

### 5.1 Schedules

```sql
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    calendar_id VARCHAR(50),
    client_id UUID REFERENCES clients(id),
    animal_id UUID REFERENCES animals(id),
    professional_id UUID REFERENCES professionals(id),
    description TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    marker_id UUID REFERENCES schedule_markers(id),
    observation TEXT,
    origin VARCHAR(50) DEFAULT 'VETUS',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Schedule Items

```sql
CREATE TABLE schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    professional_id UUID REFERENCES professionals(id),
    animal_id UUID REFERENCES animals(id),
    description VARCHAR(255)
);
```

### 5.3 Schedule Markers

```sql
CREATE TABLE schedule_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Commands

```sql
CREATE TABLE commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    command_number BIGSERIAL,
    client_id UUID NOT NULL REFERENCES clients(id),
    animal_id UUID REFERENCES animals(id),
    opening_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closing_date TIMESTAMPTZ,
    state VARCHAR(20) DEFAULT 'open', -- open, closed, cancelled
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    debit_balance DECIMAL(10,2) DEFAULT 0,
    has_health_plan BOOLEAN DEFAULT false,
    has_subscription BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 Command Items

```sql
CREATE TABLE command_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    service_id UUID REFERENCES services(id),
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    professional_id UUID REFERENCES professionals(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 Command Payments

```sql
CREATE TABLE command_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id UUID NOT NULL REFERENCES commands(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    installments INT DEFAULT 1,
    card_transaction_id UUID REFERENCES card_transactions(id),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.7 Sales

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    sale_number BIGSERIAL,
    client_id UUID REFERENCES clients(id),
    branch_id UUID REFERENCES branches(id),
    pos_id UUID REFERENCES points_of_sale(id),
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    state VARCHAR(20) DEFAULT 'completed',
    nfce_key VARCHAR(44),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    stock_transaction_id UUID REFERENCES stock_transactions(id)
);

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    card_transaction_id UUID REFERENCES card_transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.8 Packages

```sql
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    animal_id UUID REFERENCES animals(id),
    name VARCHAR(255) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    interval_days INT NOT NULL,
    total_sessions INT NOT NULL,
    used_sessions INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    product_id UUID REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_value DECIMAL(10,2) NOT NULL
);

CREATE TABLE package_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id),
    session_number INT NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    command_id UUID REFERENCES commands(id)
);
```

### 5.9 Quotes

```sql
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    quote_number BIGSERIAL,
    client_id UUID NOT NULL REFERENCES clients(id),
    animal_id UUID REFERENCES animals(id),
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, converted
    converted_to_sale_id UUID REFERENCES sales(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    service_id UUID REFERENCES services(id),
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL
);
```

### 5.10 Hospitalization

```sql
CREATE TABLE hospitalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    animal_id UUID NOT NULL REFERENCES animals(id),
    box_id UUID REFERENCES hospitalization_boxes(id),
    professional_id UUID REFERENCES professionals(id),
    reason TEXT NOT NULL,
    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_discharge_date TIMESTAMPTZ,
    discharge_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- active, discharged
    command_id UUID REFERENCES commands(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hospitalization_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available', -- available, occupied, maintenance
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hospitalization_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- medication, feeding, dressing, observation
    description TEXT,
    scheduled_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    professional_id UUID REFERENCES professionals(id),
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE hospitalization_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES hospitalizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    stock_transaction_id UUID REFERENCES stock_transactions(id)
);
```

---

## 6. ESTOQUE

### 6.1 Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) UNIQUE,
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_id UUID REFERENCES product_groups(id),
    manufacturer_id UUID REFERENCES manufacturers(id),
    measurement_unit_id UUID REFERENCES measurement_units(id),
    cost_price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    min_stock DECIMAL(10,3),
    max_stock DECIMAL(10,3),
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    ncm VARCHAR(10),
    cest VARCHAR(10),
    cfop_id UUID REFERENCES tax_cfop(id),
    icms_id UUID REFERENCES tax_icms(id),
    ipi_id UUID REFERENCES tax_ipi(id),
    pis_id UUID REFERENCES tax_pis(id),
    cofins_id UUID REFERENCES tax_cofins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Product Stocks

```sql
CREATE TABLE product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    stock_id UUID NOT NULL REFERENCES stocks(id),
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,3) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, stock_id)
);
```

### 6.3 Product Batches

```sql
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_number VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    manufacturing_date DATE,
    expiration_date DATE NOT NULL,
    stock_id UUID REFERENCES stocks(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 Product Prices

```sql
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    price_table_id UUID REFERENCES price_tables(id),
    price DECIMAL(10,2) NOT NULL,
    start_date DATE,
    end_date DATE,
    UNIQUE(product_id, price_table_id)
);
```

### 6.5 Stocks

```sql
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.6 Stock Transactions

```sql
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    stock_id UUID NOT NULL REFERENCES stocks(id),
    type VARCHAR(50) NOT NULL, -- entry, exit, adjustment, transfer, sale, consumption
    reference_type VARCHAR(50),
    reference_id UUID,
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES stock_transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2),
    batch_id UUID REFERENCES product_batches(id)
);
```

### 6.7 Invoice Entries

```sql
CREATE TABLE invoice_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nf_number VARCHAR(20) NOT NULL,
    nf_series VARCHAR(10),
    nf_key VARCHAR(44),
    supplier_id UUID REFERENCES suppliers(id),
    issue_date DATE NOT NULL,
    entry_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_total DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoice_entries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description VARCHAR(255) NOT NULL,
    ncm VARCHAR(10),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    batch_number VARCHAR(50),
    expiration_date DATE
);
```

### 6.8 Purchase Orders

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    po_number BIGSERIAL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    expected_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, received, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,3) DEFAULT 0
);
```

### 6.9 Stock Transfers

```sql
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    transfer_number BIGSERIAL,
    origin_stock_id UUID NOT NULL REFERENCES stocks(id),
    destination_stock_id UUID NOT NULL REFERENCES stocks(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_transit, completed, cancelled
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL
);
```

### 6.10 Stock Audits

```sql
CREATE TABLE stock_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    stock_id UUID NOT NULL REFERENCES stocks(id),
    audit_number BIGSERIAL,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE stock_audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    system_quantity DECIMAL(10,3) NOT NULL,
    counted_quantity DECIMAL(10,3),
    difference DECIMAL(10,3),
    observation TEXT
);
```

### 6.11 Auxiliary Tables

```sql
CREATE TABLE product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES product_groups(id),
    UNIQUE(tenant_id, name)
);

CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    UNIQUE(tenant_id, name)
);

CREATE TABLE measurement_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    UNIQUE(tenant_id, abbreviation)
);

CREATE TABLE price_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

CREATE TABLE points_of_sale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    people_type VARCHAR(20) NOT NULL,
    cpf_cnpj VARCHAR(18),
    phone VARCHAR(20),
    cell_phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, name)
);
```

---

## 7. FINANCEIRO

### 7.1 Accounts Receivable

```sql
CREATE TABLE accounts_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_number BIGSERIAL,
    client_id UUID NOT NULL REFERENCES clients(id),
    description TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    original_value DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    interest DECIMAL(10,2) DEFAULT 0,
    fine DECIMAL(10,2) DEFAULT 0,
    paid_value DECIMAL(10,2),
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
    cost_center_id UUID REFERENCES cost_centers(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts_receivable_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts_receivable(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    card_transaction_id UUID REFERENCES card_transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Accounts Payable

```sql
CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_number BIGSERIAL,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    original_value DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    interest DECIMAL(10,2) DEFAULT 0,
    fine DECIMAL(10,2) DEFAULT 0,
    paid_value DECIMAL(10,2),
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    cost_center_id UUID REFERENCES cost_centers(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts_payable_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts_payable(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Cash Registers

```sql
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    branch_id UUID REFERENCES branches(id),
    opened_by UUID REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    opening_date TIMESTAMPTZ NOT NULL,
    closing_date TIMESTAMPTZ,
    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    expected_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    difference DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'open',
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
    type VARCHAR(50) NOT NULL, -- revenue, expense, withdrawal, deposit
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Card Transactions

```sql
CREATE TABLE card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_id VARCHAR(100),
    card_machine_id UUID REFERENCES card_machines(id),
    card_id UUID REFERENCES cards(id),
    amount DECIMAL(10,2) NOT NULL,
    installments INT DEFAULT 1,
    type VARCHAR(20) NOT NULL, -- debit, credit
    status VARCHAR(20) DEFAULT 'pending',
    authorization_code VARCHAR(50),
    nsu VARCHAR(50),
    transaction_date TIMESTAMPTZ,
    settlement_date DATE,
    fee_percent DECIMAL(5,2),
    fee_amount DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.5 Split Configurations

```sql
CREATE TABLE split_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE split_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_config_id UUID NOT NULL REFERENCES split_configs(id) ON DELETE CASCADE,
    participant_type VARCHAR(50) NOT NULL, -- professional, company
    participant_id UUID NOT NULL,
    percent DECIMAL(5,2) NOT NULL,
    fixed_amount DECIMAL(10,2) DEFAULT 0
);
```

### 7.6 Payment Methods

```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- cash, debit, credit, pix, boleto
    fee_percent DECIMAL(5,2) DEFAULT 0,
    settlement_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, name)
);
```

### 7.7 Cost Centers

```sql
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    parent_id UUID REFERENCES cost_centers(id),
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(tenant_id, code)
);
```

### 7.8 Banks and Bank Accounts

```sql
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    bank_id UUID NOT NULL REFERENCES banks(id),
    agency VARCHAR(10),
    account_number VARCHAR(20),
    account_type VARCHAR(20),
    holder_name VARCHAR(255),
    holder_document VARCHAR(18),
    status VARCHAR(20) DEFAULT 'active'
);
```

### 7.9 Checks

```sql
CREATE TABLE checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    check_number VARCHAR(20) NOT NULL,
    bank_id UUID REFERENCES banks(id),
    client_id UUID REFERENCES clients(id),
    supplier_id UUID REFERENCES suppliers(id),
    type VARCHAR(20) NOT NULL, -- received, issued
    value DECIMAL(10,2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, cashed, returned, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.10 Cards

```sql
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- debit, credit
    debit_fee_percent DECIMAL(5,2),
    credit_fee_percent DECIMAL(5,2),
    debit_settlement_days INT DEFAULT 1,
    credit_settlement_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT true
);
```

### 7.11 Card Machines

```sql
CREATE TABLE card_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    branch_id UUID REFERENCES branches(id),
    status VARCHAR(20) DEFAULT 'active'
);
```

---

## 8. LABORATÓRIO

### 8.1 Exam Types

```sql
CREATE TABLE exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),
    category VARCHAR(50),
    duration_minutes INT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Exams

```sql
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    animal_id UUID NOT NULL REFERENCES animals(id),
    exam_type_id UUID NOT NULL REFERENCES exam_types(id),
    professional_id UUID REFERENCES professionals(id),
    requesting_professional_id UUID REFERENCES professionals(id),
    status VARCHAR(20) DEFAULT 'requested', -- requested, collected, analyzing, completed, delivered
    request_date TIMESTAMPTZ DEFAULT NOW(),
    collection_date TIMESTAMPTZ,
    completion_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 Exam Results

```sql
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    result_value VARCHAR(100),
    unit VARCHAR(20),
    reference_min VARCHAR(20),
    reference_max VARCHAR(20),
    is_out_of_range BOOLEAN DEFAULT false,
    observation TEXT
);
```

### 8.4 Exam Reference Values

```sql
CREATE TABLE exam_reference_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type_id UUID NOT NULL REFERENCES exam_types(id),
    specie_id UUID REFERENCES species(id),
    parameter_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    age_min_months INT,
    age_max_months INT,
    UNIQUE(exam_type_id, specie_id, parameter_name)
);
```

### 8.5 Reports

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID REFERENCES exams(id),
    report_type_id UUID REFERENCES report_types(id),
    professional_id UUID REFERENCES professionals(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    conclusion TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- draft, finalized, delivered
    finalized_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    result_value VARCHAR(100),
    unit VARCHAR(20),
    observation TEXT
);

CREATE TABLE report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    template TEXT,
    UNIQUE(tenant_id, name)
);
```

### 8.6 Lab Equipment

```sql
CREATE TABLE lab_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    serial_number VARCHAR(100),
    acquisition_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. RH (PROFISSIONAIS)

### 9.1 Professionals

```sql
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    profession_id UUID REFERENCES professions(id),
    phone VARCHAR(20),
    email VARCHAR(255),
    cpf VARCHAR(14),
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.2 Professional Schedules

```sql
CREATE TABLE professional_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(professional_id, day_of_week, start_time)
);
```

### 9.3 Time Off

```sql
CREATE TABLE time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.4 Commissions

```sql
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    reference_type VARCHAR(50) NOT NULL, -- sale, service, command
    reference_id UUID NOT NULL,
    base_value DECIMAL(10,2) NOT NULL,
    percent DECIMAL(5,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending'
);
```

### 9.5 Commission Rules

```sql
CREATE TABLE commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    rule_type VARCHAR(50) NOT NULL, -- by_service, by_product_group, general
    percent DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commission_rule_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES commission_rules(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id)
);

CREATE TABLE commission_rule_product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES commission_rules(id) ON DELETE CASCADE,
    product_group_id UUID NOT NULL REFERENCES product_groups(id)
);
```

### 9.6 Professions

```sql
CREATE TABLE professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, name)
);
```

---

## 10. FISCAL

### 10.1 Tax Tables

```sql
CREATE TABLE tax_icms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    percent DECIMAL(5,2),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_ipi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    percent DECIMAL(5,2),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_pis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    percent DECIMAL(5,2),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_cofins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    percent DECIMAL(5,2),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_cfop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    operation_type VARCHAR(50),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_nfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_ibs_cbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(10) NOT NULL,
    description TEXT,
    ibs_percent DECIMAL(5,2),
    cbs_percent DECIMAL(5,2),
    UNIQUE(tenant_id, code)
);

CREATE TABLE tax_icms_state_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    origin_state VARCHAR(2) NOT NULL,
    destination_state VARCHAR(2) NOT NULL,
    internal_percent DECIMAL(5,2),
    interstate_percent DECIMAL(5,2),
    UNIQUE(tenant_id, origin_state, destination_state)
);
```

---

## 11. MARKETING

### 11.1 SMS

```sql
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID REFERENCES clients(id),
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_filter JSONB,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE sms_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    provider VARCHAR(50) NOT NULL,
    api_key VARCHAR(255),
    sender_id VARCHAR(50),
    credits_remaining INT,
    is_active BOOLEAN DEFAULT true
);
```

### 11.2 Email Templates

```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type VARCHAR(50) NOT NULL, -- vaccine_reminder, appointment_reminder
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. FIDELIDADE

### 12.1 Loyalty

```sql
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    points_per_real DECIMAL(5,2) DEFAULT 1,
    redemption_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    points INT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- purchase, bonus, adjustment
    source_id UUID,
    expires_at TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    points_used INT NOT NULL,
    reward_description TEXT,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 13. INTEGRAÇÕES

### 13.1 Webhooks

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    url TEXT NOT NULL,
    events JSONB NOT NULL,
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_events (
    id BIGSERIAL PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES webhooks(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    response_status INT,
    response_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 14. ÍNDICES RECOMENDADOS

```sql
-- Multi-tenant indexes
CREATE INDEX idx_tenant ON clients(tenant_id);
CREATE INDEX idx_tenant ON animals(tenant_id);
CREATE INDEX idx_tenant ON products(tenant_id);
CREATE INDEX idx_tenant ON commands(tenant_id);
CREATE INDEX idx_tenant ON sales(tenant_id);

-- Search indexes
CREATE INDEX idx_clients_name ON clients USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_animals_name ON animals USING gin(to_tsvector('portuguese', name));

-- Date indexes
CREATE INDEX idx_schedules_date ON schedules(start_datetime, end_datetime);
CREATE INDEX idx_accounts_receivable_due ON accounts_receivable(due_date, status);
CREATE INDEX idx_accounts_payable_due ON accounts_payable(due_date, status);

-- Status indexes
CREATE INDEX idx_commands_state ON commands(state);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_products_status ON products(status);

-- Composite indexes
CREATE INDEX idx_commands_client ON commands(client_id, state);
CREATE INDEX idx_animals_client ON animals(client_id, status);
CREATE INDEX idx_stock_product ON product_stocks(product_id, stock_id);
```

---

_Documento gerado em 02/04/2026 — Modelo de dados completo para ERP Enterprise_
