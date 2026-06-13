/**
 * Auth context: stores the session token (SecureStore), loads the current user
 * from /api/auth/me, and exposes sign in / sign up / sign out.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, setToken } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

type AuthState = {
  user: CurrentUser | null;
  /** True until the initial token check + /me fetch completes. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

export type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  location?: string;
  phone?: string;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchMe(): Promise<CurrentUser | null> {
  const data = await apiFetch<{ user: CurrentUser | null }>("/api/auth/me");
  return data?.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ ok: boolean; token?: string }>("/api/auth/login", {
      method: "POST",
      json: { email, password },
      noAuth: true,
    });
    if (!data?.token) {
      throw new Error("Login did not return a session. Please try again.");
    }
    await setToken(data.token);
    await refresh();
  }, [refresh]);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        json: input,
        noAuth: true,
      });
      // Signup does not log in automatically — sign in with the new credentials.
      await signIn(input.email, input.password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
