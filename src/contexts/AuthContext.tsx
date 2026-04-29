import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { mockAdmin, mockClient, type MockUser } from "@/lib/mockData";

interface AuthContextValue {
  user: MockUser | null;
  signIn: (email: string, _password: string, role?: "client" | "admin") => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);

  const signIn = useCallback((email: string, _password: string, role: "client" | "admin" = "client") => {
    const base = role === "admin" ? mockAdmin : mockClient;
    setUser({ ...base, email: email || base.email });
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
