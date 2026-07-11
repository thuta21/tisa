"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: Error | null;
  appPublicSettings: null;
  authChecked: boolean;
  logout: () => Promise<void>;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  const checkUserAuth = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getUser();
    setUser(data.user);
    setAuthError(error);
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const initialCheck = window.setTimeout(() => void checkUserAuth(), 0);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
      setAuthError(null);
    });

    return () => {
      window.clearTimeout(initialCheck);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      logout: async () => {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      navigateToLogin: () => {
        window.location.href = "/login";
      },
      checkUserAuth,
      checkAppState: async () => undefined,
    }),
    [authError, isLoadingAuth, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
