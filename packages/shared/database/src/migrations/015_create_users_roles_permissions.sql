-- Migration 015: Create users, roles, permissions tables for RBAC

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT users_account_email_unique UNIQUE (account_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(account_id, email);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);
