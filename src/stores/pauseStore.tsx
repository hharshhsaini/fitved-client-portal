import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PauseRecord {
  id: string;
  from: string;
  to: string;
  status: "active" | "completed";
}

interface PauseContextValue {
  activePause: PauseRecord | null;
  history: PauseRecord[];
  loading: boolean;
  pause: (from: string, to: string) => Promise<void>;
  resume: () => Promise<void>;
}

const PauseContext = createContext<PauseContextValue | undefined>(undefined);

export function PauseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pauses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pauses")
        .select("*")
        .eq("user_id", user!.id)
        .order("from_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const records: PauseRecord[] = (data ?? []).map((p) => ({
    id: p.id,
    from: p.from_date,
    to: p.to_date,
    status: p.status as "active" | "completed",
  }));
  const activePause = records.find((p) => p.status === "active") ?? null;
  const history = records.filter((p) => p.status === "completed");

  const pauseMut = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("pauses").insert({
        user_id: user.id,
        from_date: from.slice(0, 10),
        to_date: to.slice(0, 10),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pauses", user?.id] }),
  });

  const resumeMut = useMutation({
    mutationFn: async () => {
      if (!activePause) return;
      const { error } = await supabase
        .from("pauses")
        .update({ status: "completed" })
        .eq("id", activePause.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pauses", user?.id] }),
  });

  const pause = useCallback(async (from: string, to: string) => {
    await pauseMut.mutateAsync({ from, to });
  }, [pauseMut]);

  const resume = useCallback(async () => {
    await resumeMut.mutateAsync();
  }, [resumeMut]);

  const value = useMemo(
    () => ({ activePause, history, loading: isLoading, pause, resume }),
    [activePause, history, isLoading, pause, resume]
  );
  return <PauseContext.Provider value={value}>{children}</PauseContext.Provider>;
}

export function usePauseStore() {
  const ctx = useContext(PauseContext);
  if (!ctx) throw new Error("usePauseStore must be used inside PauseProvider");
  return ctx;
}
