-- Add wallet support to deposits system
-- Adds wallet_address column to deposits and creates deposit_wallets table

-- Add wallet_address column to deposits table if it doesn't exist
ALTER TABLE deposits ADD COLUMN wallet_address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER amount;

-- Create table to store Binance wallet addresses for deposits
CREATE TABLE IF NOT EXISTS deposit_wallets (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL,
  wallet_address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  network_name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_currency (currency),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Binance wallets for each currency
INSERT IGNORE INTO deposit_wallets (id, currency, wallet_address, network_name, is_active)
VALUES 
  ('wallet-usdt-001', 'USDT', '0x1234567890abcdef1234567890abcdef12345678', 'BNB Smart Chain', true),
  ('wallet-usdc-001', 'USDC', '0x9876543210fedcba9876543210fedcba98765432', 'BNB Smart Chain', true),
  ('wallet-bnb-001', 'BNB', '0xbnb1234567890abcdef1234567890abcdef1234567', 'BNB Chain', true),
  ('wallet-eth-001', 'ETH', '0xeth1234567890abcdef1234567890abcdef1234567', 'Ethereum', true)
ON DUPLICATE KEY UPDATE is_active = true;
