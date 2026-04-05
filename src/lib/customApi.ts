// Custom MySQL API client for RBAC and Deposits system
// Uses fetch to call backend endpoints

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://144.172.112.31:3000/api';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'trader' | 'support';
  };
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'trader' | 'support';
  avatar_url?: string;
  kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected';
}

export interface TraderProfile extends UserProfile {
  account_balance: number;
  total_deposits: number;
  total_confirmed: number;
  account_status: 'active' | 'suspended' | 'closed';
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
}

export interface Deposit {
  id: string;
  trader_id: string;
  reference_number: string;
  amount: number;
  currency: 'USDT' | 'USDC' | 'BNB' | 'ETH';
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  transaction_hash?: string;
  proof_file_url?: string;
  notes?: string;
  submitted_at: string;
  confirmed_at?: string;
  trader_email?: string;
  trader_name?: string;
  admin_email?: string;
  admin_name?: string;
}

export interface BinanceAccount {
  id: string;
  admin_id: string;
  wallet_address: string;
  currency: 'USDT' | 'USDC' | 'BNB' | 'ETH';
  is_active: boolean;
}

class MySQLAPIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
      }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ====== AUTH ENDPOINTS ======

  async signup(
    email: string,
    password: string,
    role: 'trader' | 'admin' = 'trader'
  ): Promise<AuthResponse> {
    return this.request('POST', '/auth/signup', { email, password, role });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request('POST', '/auth/login', { email, password });
  }

  async verifyToken(): Promise<{ valid: boolean; user: UserProfile }> {
    return this.request('GET', '/auth/verify');
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // ====== USER PROFILE ENDPOINTS ======

  async getProfile(): Promise<UserProfile> {
    return this.request('GET', '/profile');
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request('PATCH', '/profile', data);
  }

  async getTraderProfile(): Promise<TraderProfile> {
    return this.request('GET', '/profile/trader');
  }

  // ====== DEPOSITS ENDPOINTS ======

  async submitDeposit(data: {
    amount: number;
    currency: 'USDT' | 'USDC' | 'BNB' | 'ETH';
    transaction_hash: string;
    notes?: string;
    proof_file?: File;
  }): Promise<Deposit> {
    const formData = new FormData();
    formData.append('amount', data.amount.toString());
    formData.append('currency', data.currency);
    formData.append('transaction_hash', data.transaction_hash);
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    if (data.proof_file) {
      formData.append('proof_file', data.proof_file);
    }

    const response = await fetch(`${API_BASE_URL}/deposits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Failed to submit deposit',
      }));
      throw new Error(error.error || error.message || 'Failed to submit deposit');
    }

    return response.json();
  }

  async getTraderDeposits(
    limit = 50,
    offset = 0
  ): Promise<{ deposits: Deposit[]; total: number }> {
    return this.request('GET', `/deposits?limit=${limit}&offset=${offset}`);
  }

  async getAdminDeposits(
    status?: 'pending' | 'confirmed' | 'failed',
    limit = 50,
    offset = 0
  ): Promise<{ deposits: Deposit[]; total: number }> {
    let endpoint = `/admin/deposits?limit=${limit}&offset=${offset}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    return this.request('GET', endpoint);
  }

  async searchDeposits(
    query: string,
    limit = 50,
    offset = 0
  ): Promise<{ deposits: Deposit[]; total: number }> {
    return this.request('GET', `/admin/deposits/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
  }

  async confirmDeposit(depositId: string, notes?: string): Promise<Deposit> {
    return this.request('POST', `/admin/deposits/${depositId}/confirm`, { notes });
  }

  async rejectDeposit(depositId: string, reason: string): Promise<Deposit> {
    return this.request('POST', `/admin/deposits/${depositId}/reject`, { reason });
  }

  // ====== ADMIN ENDPOINTS ======

  async getDepositStats(): Promise<{
    total_deposits: number;
    pending_count: number;
    pending_amount: number;
    confirmed_count: number;
    confirmed_amount: number;
    failed_count: number;
  }> {
    return this.request('GET', '/admin/deposits/stats');
  }

  async getBinanceAccounts(): Promise<BinanceAccount[]> {
    return this.request('GET', '/admin/binance-accounts');
  }

  async addBinanceAccount(
    wallet_address: string,
    currency: 'USDT' | 'USDC' | 'BNB' | 'ETH'
  ): Promise<BinanceAccount> {
    return this.request('POST', '/admin/binance-accounts', {
      wallet_address,
      currency,
    });
  }

  async getAuditLogs(
    limit = 100,
    offset = 0
  ): Promise<{ logs: any[]; total: number }> {
    return this.request('GET', `/admin/audit-logs?limit=${limit}&offset=${offset}`);
  }
}

// Export singleton instance
export const mysqlApi = new MySQLAPIClient();

// Export class for testing
export default MySQLAPIClient;
