-- Create roles enum
CREATE TYPE user_role AS ENUM ('admin', 'trader', 'support');

-- Update profiles table to use role enum
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role USING role::user_role,
  ALTER COLUMN role SET DEFAULT 'trader'::user_role;

-- Create traders_profiles table (extends profiles with trader-specific data)
CREATE TABLE traders_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  account_balance DECIMAL(15, 2) DEFAULT 0.00,
  total_deposits DECIMAL(15, 2) DEFAULT 0.00,
  account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'closed')),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  kyc_document_url TEXT,
  phone_number VARCHAR(20),
  country VARCHAR(2),
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Binance account configuration table
CREATE TABLE binance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  binance_account_name VARCHAR(255),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  network VARCHAR(50) DEFAULT 'BNB_CHAIN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposits table
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES traders_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  deposit_status VARCHAR(20) DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  transaction_hash VARCHAR(255),
  wallet_address VARCHAR(255) NOT NULL,
  reference_number VARCHAR(50) UNIQUE,
  proof_of_transfer_url TEXT,
  notes TEXT,
  confirmation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin permissions table
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_manage_traders BOOLEAN DEFAULT false,
  can_verify_deposits BOOLEAN DEFAULT false,
  can_manage_binance BOOLEAN DEFAULT false,
  can_withdraw BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_traders_profiles_account_status ON traders_profiles(account_status);
CREATE INDEX idx_traders_profiles_verification_status ON traders_profiles(verification_status);
CREATE INDEX idx_deposits_trader_id ON deposits(trader_id);
CREATE INDEX idx_deposits_deposit_status ON deposits(deposit_status);
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX idx_binance_accounts_broker_id ON binance_accounts(broker_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create RLS policies
ALTER TABLE traders_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE binance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for traders_profiles
CREATE POLICY "Traders can view their own profile"
  ON traders_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Traders can update their own profile"
  ON traders_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies for deposits
CREATE POLICY "Traders can view their own deposits"
  ON deposits FOR SELECT
  USING (
    trader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Traders can insert their own deposits"
  ON deposits FOR INSERT
  WITH CHECK (trader_id = auth.uid());

CREATE POLICY "Admins can update deposits"
  ON deposits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for binance_accounts (admin only)
CREATE POLICY "Only admins can manage Binance accounts"
  ON binance_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for admin_permissions (admin only)
CREATE POLICY "Only admins can manage permissions"
  ON admin_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Create function to automatically create trader profile
CREATE OR REPLACE FUNCTION create_trader_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'trader' THEN
    INSERT INTO traders_profiles (id, account_balance, total_deposits, account_status, verification_status)
    VALUES (NEW.id, 0.00, 0.00, 'active', 'pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER create_trader_profile_trigger
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_trader_profile();

-- Create function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_changes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_changes)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
