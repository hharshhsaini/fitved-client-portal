import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, dobToPassword, normalizePhone } from "@/lib/phoneAuth";

type AppRole = "client" | "trainer" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string, dob: Date) => Promise<{ error: string | null }>;
  signUpWithPhone: (name: string, phone: string, dob: Date) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setRoleLoading(true);
        // Defer role fetch to avoid recursive calls inside the callback
        setTimeout(() => fetchRole(newSession.user.id), 0);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id);
      } else {
        setRoleLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (data ?? []).map((r) => r.role as AppRole);
      const best: AppRole = roles.includes("admin")
        ? "admin"
        : roles.includes("trainer")
        ? "trainer"
        : "client";
      setRole(best);
    } finally {
      setRoleLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string, dob: Date) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password: dobToPassword(dob),
    });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithPhone = useCallback(async (name: string, phone: string, dob: Date) => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password: dobToPassword(dob),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name,
          phone: normalized,
          dob: `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`,
        },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, session, role, loading, roleLoading, signIn, signUp, signInWithPhone, signUpWithPhone, signOut }),
    [user, session, role, loading, roleLoading, signIn, signUp, signInWithPhone, signUpWithPhone, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
