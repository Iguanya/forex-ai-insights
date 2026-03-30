-- Add wallet_address column to deposits table
ALTER TABLE deposits ADD COLUMN wallet_address VARCHAR(255) DEFAULT NULL AFTER amount;
ALTER TABLE deposits ADD COLUMN submitted_at_updated TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp();

-- Create a table to store Binance wallet addresses for deposits
CREATE TABLE IF NOT EXISTS deposit_wallets (
  id VARCHAR(36) PRIMARY KEY,
  currency ENUM('USDT', 'USDC', 'BNB', 'ETH') NOT NULL,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  network_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp()
);

-- Insert default Binance wallets for each currency
INSERT INTO deposit_wallets (id, currency, wallet_address, network_name, is_active)
VALUES 
  ('wallet_1', 'USDT', '0x1234567890abcdef1234567890abcdef12345678', 'BNB Smart Chain', true),
  ('wallet_2', 'USDC', '0x9876543210fedcba9876543210fedcba98765432', 'BNB Smart Chain', true),
  ('wallet_3', 'BNB', '0xbnb1234567890abcdef1234567890abcdef1234567', 'BNB Chain', true),
  ('wallet_4', 'ETH', '0xeth1234567890abcdef1234567890abcdef1234567', 'Ethereum', true)
ON DUPLICATE KEY UPDATE is_active = true;

-- Add index for wallet lookup
CREATE INDEX idx_deposit_wallets_currency ON deposit_wallets(currency);
