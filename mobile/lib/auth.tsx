/**
 * Auth context — provides login state and user info throughout the app.
 *
 * Uses expo-secure-store for token persistence and exposes a simple
 * { user, isLoading, signIn, signOut } interface to screens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login as apiLogin, logout as apiLogout, getAccessToken } from "./api";
import type { User } from "./types";
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

// ---------------------------------------------------------------------------
// Persistence keys
// ---------------------------------------------------------------------------

const USER_KEY = "poll_city_user";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const raw = await SecureStore.getItemAsync(USER_KEY);
          if (raw) {
            setUser(JSON.parse(raw) as User);
          }
        }
      } catch {
        // Invalid token or corrupt data — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
