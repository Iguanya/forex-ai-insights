-- Create bot_trades table to store all executed trades
CREATE TABLE IF NOT EXISTS bot_trades (
  id VARCHAR(36) PRIMARY KEY,
  trader_id VARCHAR(36) NOT NULL,
  pair VARCHAR(20) NOT NULL,
  type ENUM('BUY', 'SELL') NOT NULL,
  entry_price DECIMAL(15, 8) NOT NULL,
  exit_price DECIMAL(15, 8),
  stop_loss DECIMAL(15, 8) NOT NULL,
  take_profit DECIMAL(15, 8) NOT NULL,
  quantity DECIMAL(15, 8) NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  status ENUM('open', 'closed', 'expired') NOT NULL DEFAULT 'open',
  pnl DECIMAL(15, 2),
  pnl_percent DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trader_id) REFERENCES users(id),
  INDEX idx_trader_id (trader_id),
  INDEX idx_status (status),
  INDEX idx_pair (pair)
);

-- Create bot_sessions table to track bot runs
CREATE TABLE IF NOT EXISTS bot_sessions (
  id VARCHAR(36) PRIMARY KEY,
  trader_id VARCHAR(36) NOT NULL,
  status ENUM('running', 'paused', 'stopped') NOT NULL DEFAULT 'running',
  pairs JSON NOT NULL,
  trade_interval INT NOT NULL,
  initial_balance DECIMAL(15, 2) NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  total_trades INT DEFAULT 0,
  winning_trades INT DEFAULT 0,
  losing_trades INT DEFAULT 0,
  total_pnl DECIMAL(15, 2) DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trader_id) REFERENCES users(id),
  INDEX idx_trader_id (trader_id)
);

-- Create bot_logs table for activity tracking
CREATE TABLE IF NOT EXISTS bot_logs (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36),
  trader_id VARCHAR(36) NOT NULL,
  level ENUM('INFO', 'SIGNAL', 'TRADE', 'CLOSE', 'ERROR') NOT NULL,
  message TEXT NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES bot_sessions(id),
  FOREIGN KEY (trader_id) REFERENCES users(id),
  INDEX idx_trader_id (trader_id),
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);

-- Modify traders_profiles to track active session
ALTER TABLE traders_profiles ADD COLUMN IF NOT EXISTS active_bot_session_id VARCHAR(36);
