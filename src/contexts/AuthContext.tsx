import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, dobToPassword, normalizePhone } from "@/lib/phoneAuth";
import { toast } from "sonner";

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
  signInAdmin: (phone: string, passwordText: string) => Promise<{ error: string | null }>;
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
    // Check for custom customer login session
    const checkCustomSession = async () => {
      const customUserId = localStorage.getItem("fitved_custom_user");
      const customRole = localStorage.getItem("fitved_custom_role");
      if (customUserId) {
        setUser({ id: customUserId } as User);
        setRole((customRole as AppRole) || "client");
        setRoleLoading(false);
        setLoading(false);
        return true;
      }
      return false;
    };

    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (await checkCustomSession()) return;
      
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

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (await checkCustomSession()) return;

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
      // Check if they are a pending trainer first
      const { data: pending } = await supabase
        .from("pending_trainers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (pending) {
        toast.error("Your trainer account is pending admin approval.");
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        return;
      }

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
    const { data, error } = await supabase
      .from("trainers")
      .select("id, user_id, active")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { error: "Invalid email or password." };
    }

    if (!data.active) {
      return { error: "Your trainer account is inactive. Please contact admin." };
    }

    // Use user_id for the user session so it maps correctly in TrainerDashboard
    localStorage.setItem("fitved_custom_user", data.user_id);
    localStorage.setItem("fitved_custom_role", "trainer");
    setUser({ id: data.user_id } as User);
    setRole("trainer");
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data: existingTrainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingTrainer) {
      return { error: "This email is already registered." };
    }

    const { data: existingPending } = await supabase
      .from("pending_trainers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingPending) {
      return { error: "An account with this email is already pending approval." };
    }

    const customUserId = crypto.randomUUID();
    const { error: pendingErr } = await supabase
      .from("pending_trainers")
      .insert({
        user_id: customUserId,
        name: name,
        email: email,
        password: password,
      });

    if (pendingErr) {
      return { error: pendingErr.message };
    }

    return { error: null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string, dob: Date) => {
    const normalized = normalizePhone(phone);
    const dobString = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .eq("dob", dobString)
      .maybeSingle();

    if (error || !data) {
      return { error: "Account not found or incorrect birthday. Please create an account." };
    }

    localStorage.setItem("fitved_custom_user", data.id);
    setUser({ id: data.id } as User);
    setRole("client");
    
    // Hard reload to flush React Query cache and sync state if needed
    // or just rely on state
    return { error: null };
  }, []);

  const signUpWithPhone = useCallback(async (name: string, phone: string, dob: Date) => {
    const normalized = normalizePhone(phone);
    const dobString = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    
    // Check if phone already registered
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();

    if (existing) {
      return { error: "You already have an account! Please sign in." };
    }

    const newId = crypto.randomUUID();

    // 1. Insert into profiles
    const { data, error } = await supabase.from("profiles").insert({
      id: newId,
      name: name,
      phone: normalized,
      dob: dobString,
    }).select("id").single();

    if (error || !data) {
      return { error: error?.message || "Failed to create account" };
    }

    // 2. CRITICAL: Insert into user_roles so admin dashboard can find them
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: data.id,
      role: "client",
    });
    if (roleError) {
      console.warn("user_roles insert failed:", roleError.message);
      // Don't block login — role can be re-linked later
    }

    localStorage.setItem("fitved_custom_user", data.id);
    localStorage.removeItem("fitved_custom_role"); // client is default
    setUser({ id: data.id } as User);
    setRole("client");
    
    return { error: null };
  }, []);

  const signInAdmin = useCallback(async (phone: string, passwordText: string) => {
    const normalized = normalizePhone(phone);

    const { data, error } = await supabase
      .from("admins")
      .select("id")
      .eq("phone", normalized)
      .eq("password", passwordText)
      .maybeSingle();

    if (error || !data) {
      return { error: "Invalid admin credentials." };
    }

    localStorage.setItem("fitved_custom_user", data.id);
    localStorage.setItem("fitved_custom_role", "admin");
    setUser({ id: data.id } as User);
    setRole("admin");
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem("fitved_custom_user");
    localStorage.removeItem("fitved_custom_role");
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({ user, session, role, loading, roleLoading, signIn, signUp, signInWithPhone, signUpWithPhone, signInAdmin, signOut }),
    [user, session, role, loading, roleLoading, signIn, signUp, signInWithPhone, signUpWithPhone, signInAdmin, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
