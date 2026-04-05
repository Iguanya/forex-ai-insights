import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { logger } from "../lib/logger";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://144.172.112.31:3000/api";

// Log configuration on load
logger.info("AUTH_CONFIG", "API_BASE_URL configured", {
  value: API_BASE_URL,
  source: import.meta.env.VITE_API_BASE_URL ? "VITE_API_BASE_URL" : "default",
});

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
    logger.debug("PROFILE", "Fetching user profile", { userId });
    try {
      const profileUrl = `${API_BASE_URL}/profile`;
      const traderUrl = `${API_BASE_URL}/profile/trader`;

      logger.logApiCall("GET", profileUrl);
      logger.logApiCall("GET", traderUrl);

      const [profileRes, traderRes] = await Promise.all([
        fetch(profileUrl, { headers: getHeaders() }),
        fetch(traderUrl, { headers: getHeaders() }),
      ]);

      logger.logApiResponse("GET", profileUrl, profileRes.status, 0);
      logger.logApiResponse("GET", traderUrl, traderRes.status, 0);

      if (!profileRes.ok) {
        logger.warn("PROFILE", "Profile fetch failed", {
          status: profileRes.status,
          statusText: profileRes.statusText,
        });
        throw new Error("Failed to fetch profile");
      }

      const profileData = await profileRes.json();
      logger.debug("PROFILE", "Profile data received", { email: profileData.email });
      setProfile(profileData);

      if (profileData.role === "trader" && traderRes.ok) {
        const traderData = await traderRes.json();
        logger.debug("PROFILE", "Trader profile data received", {
          balance: traderData.account_balance,
        });
        setTraderProfile(traderData);
      }

      return profileData;
    } catch (err) {
      logger.error(
        "PROFILE",
        "Error fetching profile",
        err as Error,
        { userId }
      );
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      logger.info("INIT", "Initializing auth session");
      const token = localStorage.getItem("auth_token");

      if (token) {
        logger.debug("INIT", "Found existing token, verifying...");
        try {
          const verifyUrl = `${API_BASE_URL}/auth/verify`;
          logger.logApiCall("GET", verifyUrl);

          // Verify token is still valid
          const response = await fetch(verifyUrl, {
            headers: getHeaders(),
          });

          logger.logApiResponse("GET", verifyUrl, response.status, 0);

          if (response.ok) {
            const result = await response.json();
            logger.logAuthEvent("TOKEN_VERIFIED", result.user.email);

            setUser({
              id: result.user.id,
              email: result.user.email,
              role: result.user.role,
            });

            // Fetch full profile
            await fetchUserProfile(result.user.id);
          } else {
            // Token invalid, clear storage
            logger.logAuthEvent("TOKEN_INVALID", undefined, {
              status: response.status,
            });
            localStorage.removeItem("auth_token");
          }
        } catch (err) {
          logger.error(
            "INIT",
            "Error verifying token",
            err as Error,
            { possibleCauses: ["Backend server not running", "Network error"] }
          );
          localStorage.removeItem("auth_token");
          setError("Session expired");
        }
      } else {
        logger.debug("INIT", "No existing token found, session is fresh");
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const startTime = performance.now();
    logger.logAuthEvent("LOGIN_START", email);
    logger.debug("LOGIN", "Starting login request", {
      url: `${API_BASE_URL}/auth/login`,
      email,
    });

    try {
      setError(null);

      // Log the request being made
      const requestUrl = `${API_BASE_URL}/auth/login`;
      logger.logApiCall("POST", requestUrl, {
        headers: { "Content-Type": "application/json" },
        body: { email, password: "***" },
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const duration = performance.now() - startTime;
      logger.logApiResponse("POST", requestUrl, response.status, duration);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          // Response body wasn't JSON
          errorData = { error: response.statusText || "HTTP Error" };
        }

        const errorMsg = errorData.error || `HTTP ${response.status}`;
        logger.warn("LOGIN", "Login response error", {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          duration,
        });

        throw new Error(errorMsg);
      }

      const data = await response.json();
      logger.logAuthEvent("LOGIN_SUCCESS", email, { userId: data.user.id, duration });

      localStorage.setItem("auth_token", data.token);
      logger.debug("LOGIN", "Token stored in localStorage");

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });

      logger.debug("LOGIN", "Fetching user profile");
      await fetchUserProfile(data.user.id);

      logger.info("LOGIN", "Login completed successfully", {
        email,
        duration,
      });
    } catch (err) {
      const duration = performance.now() - startTime;

      if (err instanceof TypeError && err.message === "Failed to fetch") {
        // Network error - server not reachable
        logger.error(
          "LOGIN",
          "Network error - failed to reach backend server",
          err as Error,
          {
            url: `${API_BASE_URL}/auth/login`,
            duration,
            possibleCauses: [
              "Backend server is not running",
              "API_BASE_URL is incorrect",
              "Network connectivity issue",
              "CORS issue (if cross-origin)",
              "Firewall blocking connection",
            ],
          }
        );
      } else if (err instanceof Error) {
        logger.logAuthEvent("LOGIN_FAILED", email, {
          error: err.message,
          duration,
        });
      }

      const errorMsg = err instanceof Error ? err.message : "Login failed";
      logger.error("LOGIN", `Login failed after ${duration}ms`, err as Error);
      setError(errorMsg);
      throw err;
    }
  };

  const signup = async (email: string, password: string, role: UserRole) => {
    const startTime = performance.now();
    logger.logAuthEvent("SIGNUP_START", email, { role });
    logger.debug("SIGNUP", "Starting signup request", {
      url: `${API_BASE_URL}/auth/signup`,
      email,
      role,
    });

    try {
      setError(null);

      const requestUrl = `${API_BASE_URL}/auth/signup`;
      logger.logApiCall("POST", requestUrl, {
        headers: { "Content-Type": "application/json" },
        body: { email, password: "***", role },
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const duration = performance.now() - startTime;
      logger.logApiResponse("POST", requestUrl, response.status, duration);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText || "HTTP Error" };
        }

        const errorMsg = errorData.error || `HTTP ${response.status}`;
        logger.warn("SIGNUP", "Signup response error", {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          duration,
        });

        throw new Error(errorMsg);
      }

      const data = await response.json();
      logger.logAuthEvent("SIGNUP_SUCCESS", email, { userId: data.user.id, duration });

      localStorage.setItem("auth_token", data.token);
      logger.debug("SIGNUP", "Token stored in localStorage");

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      });

      logger.debug("SIGNUP", "Fetching user profile");
      await fetchUserProfile(data.user.id);

      logger.info("SIGNUP", "Signup completed successfully", {
        email,
        role,
        duration,
      });
    } catch (err) {
      const duration = performance.now() - startTime;

      if (err instanceof TypeError && err.message === "Failed to fetch") {
        logger.error(
          "SIGNUP",
          "Network error - failed to reach backend server",
          err as Error,
          {
            url: `${API_BASE_URL}/auth/signup`,
            duration,
            possibleCauses: [
              "Backend server is not running",
              "API_BASE_URL is incorrect",
              "Network connectivity issue",
              "CORS issue (if cross-origin)",
              "Firewall blocking connection",
            ],
          }
        );
      } else if (err instanceof Error) {
        logger.logAuthEvent("SIGNUP_FAILED", email, {
          error: err.message,
          duration,
        });
      }

      const errorMsg = err instanceof Error ? err.message : "Signup failed";
      logger.error("SIGNUP", `Signup failed after ${duration}ms`, err as Error);
      setError(errorMsg);
      throw err;
    }
  };

  const signOut = () => {
    logger.logAuthEvent("LOGOUT", user?.email);
    localStorage.removeItem("auth_token");
    setUser(null);
    setProfile(null);
    setTraderProfile(null);
    setError(null);
    logger.info("LOGOUT", "User signed out successfully");
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
