-- Minimal test migration
-- Test if MySQL connection works

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'trader', 'support') NOT NULL DEFAULT 'trader',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(36) PRIMARY KEY,
  display_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  country VARCHAR(2),
  avatar_url VARCHAR(500),
  kyc_status ENUM('not_started', 'pending', 'verified', 'rejected') DEFAULT 'not_started',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_kyc_status (kyc_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS traders_profiles (
  id VARCHAR(36) PRIMARY KEY,
  account_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_deposits DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_confirmed DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  account_status ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active',
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_account_status (account_status),
  INDEX idx_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deposits (
  id VARCHAR(36) PRIMARY KEY,
  trader_id VARCHAR(36) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL DEFAULT 'USDT',
  reference_number VARCHAR(50) NOT NULL UNIQUE,
  transaction_hash VARCHAR(255),
  proof_file_url VARCHAR(500),
  status ENUM('pending', 'confirmed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  confirmed_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trader_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_trader_id (trader_id),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS binance_accounts (
  id VARCHAR(36) PRIMARY KEY,
  admin_id VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
