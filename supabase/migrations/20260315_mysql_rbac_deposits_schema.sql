-- MySQL Schema for RBAC and Deposit Management System
-- Run this migration on your MySQL database
-- Date: 2026-03-15

SET FOREIGN_KEY_CHECKS=0;

-- 1. USERS TABLE - Core authentication
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE COMMENT 'User email',
  password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bcrypt hashed password',
  role ENUM('admin', 'trader', 'support') NOT NULL DEFAULT 'trader' COMMENT 'User role',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' COMMENT 'Account status',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL COMMENT 'Last login timestamp',
  KEY idx_email (email),
  KEY idx_role (role),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Core user accounts';

-- 2. USER PROFILES TABLE - User personal information
CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'Foreign key to users.id',
  display_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'User display name',
  first_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  last_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  phone_number VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  country VARCHAR(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'ISO country code',
  avatar_url VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Profile picture URL',
  kyc_status ENUM('not_started', 'pending', 'verified', 'rejected') DEFAULT 'not_started',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_kyc_status (kyc_status),
  CONSTRAINT fk_user_profiles_users FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User profile details';

-- 3. TRADERS PROFILES TABLE - Trader-specific data
CREATE TABLE IF NOT EXISTS traders_profiles (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'Foreign key to users.id',
  account_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Current account balance in USD',
  total_deposits DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total deposits ever made',
  total_confirmed DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total confirmed deposits',
  account_status ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active',
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL COMMENT 'When trader was verified',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_account_status (account_status),
  KEY idx_verification_status (verification_status),
  CONSTRAINT fk_traders_profiles_users FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trader-specific account data';

-- 4. BINANCE ACCOUNTS TABLE - Wallet configuration for deposits
CREATE TABLE IF NOT EXISTS binance_accounts (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  admin_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Foreign key to admin user',
  wallet_address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Binance wallet address',
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_admin_id (admin_id),
  KEY idx_is_active (is_active),
  CONSTRAINT fk_binance_accounts_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Binance wallet addresses for receiving deposits';

-- 5. DEPOSITS TABLE - Deposit tracking
CREATE TABLE IF NOT EXISTS deposits (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  trader_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Foreign key to trader user',
  amount DECIMAL(15, 2) NOT NULL COMMENT 'Deposit amount in USD',
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL DEFAULT 'USDT',
  reference_number VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE COMMENT 'Unique reference ID (DEP-timestamp-userid)',
  transaction_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Blockchain transaction hash',
  proof_file_url VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'URL to proof of transfer document',
  status ENUM('pending', 'confirmed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Trader notes or admin notes',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL COMMENT 'When admin confirmed',
  confirmed_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Admin ID who confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trader_id (trader_id),
  KEY idx_status (status),
  KEY idx_submitted_at (submitted_at),
  KEY idx_confirmed_at (confirmed_at),
  CONSTRAINT fk_deposits_trader FOREIGN KEY (trader_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deposits_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deposit records from traders';

-- 6. ADMIN PERMISSIONS TABLE - Granular admin permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  admin_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Foreign key to admin user',
  permission VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Permission name (e.g., approve_deposits, manage_users)',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_permission (permission),
  UNIQUE KEY unique_admin_permission (admin_id, permission),
  CONSTRAINT fk_admin_permissions_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Granular permissions for admin users';

-- 7. AUDIT LOGS TABLE - Compliance and audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User who performed action',
  action VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action type (e.g., approve_deposit, reject_deposit)',
  resource_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Type of resource affected (e.g., deposit, user)',
  resource_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'ID of resource affected',
  details JSON COMMENT 'Additional details about the action',
  ip_address VARCHAR(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'IPv4 or IPv6 address',
  user_agent VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Browser user agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_action (action),
  KEY idx_resource_type (resource_type),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for compliance';

-- 8. JWT SESSIONS TABLE - Track active sessions (optional - for token management)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY COMMENT 'UUID',
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Foreign key to users.id',
  token_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE COMMENT 'Hash of JWT token',
  expires_at TIMESTAMP NOT NULL COMMENT 'Token expiration time',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_expires_at (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Active JWT sessions';

SET FOREIGN_KEY_CHECKS=1;

-- ====================================================
-- DEFAULT DATA SETUP
-- ====================================================

-- Insert default admin user (password: admin123 - CHANGE THIS IN PRODUCTION!)
-- bcrypt hash of "admin123"
INSERT IGNORE INTO users (id, email, password_hash, role, status) 
VALUES (
  'admin-default-001',
  'admin@example.com',
  '$2b$10$YIjlrHKHqIhRDRuR8pLVSemR7z7hkG4Z6Jz4RcLc2RwQ0P5h8pZkK',
  'admin',
  'active'
);

-- Insert default trader user (password: trader123 - CHANGE THIS IN PRODUCTION!)
INSERT IGNORE INTO users (id, email, password_hash, role, status) 
VALUES (
  'trader-default-001',
  'trader@example.com',
  '$2b$10$X8QHr3Z6FwKp9mL2vN5U9OdC4sJ1aB7tQxY2p0kR3mN8qL5vW6sH4',
  'trader',
  'active'
);

-- Create user profiles for default users
INSERT IGNORE INTO user_profiles (id, display_name, first_name, last_name)
VALUES 
  ('admin-default-001', 'Admin User', 'Admin', 'User'),
  ('trader-default-001', 'Trader User', 'Trader', 'User');

-- Create trader profile for default trader
INSERT IGNORE INTO traders_profiles (id, account_balance, verification_status)
VALUES ('trader-default-001', 0.00, 'pending');
