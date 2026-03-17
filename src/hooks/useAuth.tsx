import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export type UserRole = "admin" | "trader" | "support";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  kyc_status: string;
  avatar_url?: string;
}

export interface TraderProfile extends UserProfile {
  account_balance: number;
  total_deposits: number;
  total_confirmed: number;
  account_status: string;
  verification_status: string;
}

interface AuthContextType {
  user: User | null;
  session: User | null;
  profile: UserProfile | null;
  traderProfile: TraderProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => void;
  isAdmin: () => boolean;
  isTrader: () => boolean;
  hasPermission: (permission: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  traderProfile: null,
  role: null,
  loading: true,
  error: null,
  login: async () => {},
  signup: async () => {},
  signOut: () => {},
  isAdmin: () => false,
  isTrader: () => false,
  hasPermission: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Fetch full user profile from API
  const fetchUserProfile = async (userId: string) => {
    try {
      const [profileRes, traderRes] = await Promise.all([
        fetch(`${API_BASE_URL}/profile`, { headers: getHeaders() }),
        fetch(`${API_BASE_URL}/profile/trader`, { headers: getHeaders() }),
      ]);

      if (!profileRes.ok) throw new Error("Failed to fetch profile");

      const profileData = await profileRes.json();
      setProfile(profileData);

      if (profileData.role === "trader" && traderRes.ok) {
        const traderData = await traderRes.json();
        setTraderProfile(traderData);
      }

      return profileData;
    } catch (err) {
      console.error("Error fetching profile:", err);
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth_token");

      if (token) {
        try {
          // Verify token is still valid
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: getHeaders(),
          });

          if (response.ok) {
            const result = await response.json();
            setUser({
              id: result.user.id,
              email: result.user.email,
              role: result.user.role,
            });

            // Fetch full profile
            await fetchUserProfile(result.user.id);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem("auth_token");
          }
        } catch (err) {
          console.error("Error verifying token:", err);
          localStorage.removeItem("auth_token");
          setError("Session expired");
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("auth_token", data.token);

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });

      await fetchUserProfile(data.user.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
      throw err;
    }
  };

  const signup = async (email: string, password: string, role: UserRole) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Signup failed");
      }

      const data = await response.json();
      localStorage.setItem("auth_token", data.token);

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });

      await fetchUserProfile(data.user.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Signup failed";
      setError(errorMsg);
      throw err;
    }
  };

  const signOut = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    setProfile(null);
    setTraderProfile(null);
    setError(null);
  };

  const isAdmin = () => profile?.role === "admin";
  const isTrader = () => profile?.role === "trader";

  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!user) return false;
    return isAdmin();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user,
        profile,
        traderProfile,
        role: (profile?.role || user?.role) as UserRole | null,
        loading,
        error,
        login,
        signup,
        signOut,
        isAdmin,
        isTrader,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
