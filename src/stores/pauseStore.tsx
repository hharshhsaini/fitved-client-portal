import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { calculatePlanEndDate, calculatePlanRenewalDate, extendEndDateBySessions, countTrainingDaysInRange, isoDate } from "@/lib/sessionPlan";

// Today's date as a local YYYY-MM-DD string
function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayLocalISO(todayStr?: string): string {
  const d = todayStr ? new Date(todayStr) : new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function recalculatePlanDates(userId: string) {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError || !plan) return;

  const { data: pauses, error: pausesError } = await (supabase.from("pauses") as any)
    .select("*")
    .eq("client_id", userId);

  if (pausesError) return;

  const trainingDays = plan.training_days || [];

  // Base end date (if no pauses existed)
  let currentEndDate = calculatePlanEndDate(plan.start_date, plan.total_sessions, trainingDays);
  const baseEndISO = isoDate(currentEndDate);

  // Add extensions for pauses, each clamped to this plan's window so pauses
  // from a previous plan don't extend the current one.
  let totalSessionsToExtend = 0;
  if (pauses && pauses.length > 0) {
    for (const p of pauses) {
      const from = p.from_date > plan.start_date ? p.from_date : plan.start_date;
      const to = p.to_date < baseEndISO ? p.to_date : baseEndISO;
      if (from > to) continue; // pause doesn't overlap this plan
      totalSessionsToExtend += countTrainingDaysInRange(from, to, trainingDays);
    }
  }

  // Cap total carry forward to 1/3 of plan total sessions
  const maxCarryForward = Math.floor(plan.total_sessions / 3);
  const actualExtension = Math.min(totalSessionsToExtend, maxCarryForward);

  currentEndDate = extendEndDateBySessions(currentEndDate, actualExtension, trainingDays);

  const renewalDate = calculatePlanRenewalDate(currentEndDate, trainingDays);

  const { error: updateError } = await supabase
    .from("plans")
    .update({
      end_date: isoDate(currentEndDate),
      renewal_date: isoDate(renewalDate),
    })
    .eq("id", plan.id);
    
  if (updateError) {
    console.error("Failed to update plan dates:", updateError);
  }
}

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
      const { data, error } = await (supabase.from("pauses") as any)
        .select("*")
        .eq("client_id", user!.id)
        .order("from_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = todayLocalISO();

  const records: PauseRecord[] = (data ?? []).map((p) => ({
    id: p.id,
    from: p.from_date,
    to: p.to_date,
    status: p.status as "active" | "completed",
  }));

  // A pause whose end date has passed is treated as resumed automatically.
  const activePause =
    records.find((p) => p.status === "active" && p.to >= today) ?? null;
  const history = records.filter(
    (p) => p.status === "completed" || (p.status === "active" && p.to < today)
  );

  // Persist auto-resume: mark any expired "active" pauses as completed in the DB
  const autoCompleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) return;
      const { error } = await supabase
        .from("pauses")
        .update({ status: "completed" })
        .in("id", ids);
      if (error) throw error;
      await recalculatePlanDates(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pauses", user?.id] });
      qc.invalidateQueries({ queryKey: ["plan", user?.id] });
    },
  });

  useEffect(() => {
    const expiredIds = records
      .filter((p) => p.status === "active" && p.to < today)
      .map((p) => p.id);
    if (expiredIds.length > 0 && !autoCompleteMut.isPending) {
      autoCompleteMut.mutate(expiredIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const pauseMut = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await (supabase.from("pauses") as any).insert({
        user_id: user.id,
        client_id: user.id,
        from_date: from.slice(0, 10),
        to_date: to.slice(0, 10),
        status: "active",
      });
      if (error) throw error;
      await recalculatePlanDates(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pauses", user?.id] });
      qc.invalidateQueries({ queryKey: ["plan", user?.id] });
    },
  });

  const resumeMut = useMutation({
    mutationFn: async () => {
      if (!activePause || !user) return;
      const today = todayLocalISO();
      
      if (today <= activePause.from) {
        // Day-1 Resume: Cancel the accidental pause completely by deleting it
        const { error } = await supabase
          .from("pauses")
          .delete()
          .eq("id", activePause.id);
        if (error) throw error;
      } else {
        // Resume after start: block customer from resuming
        throw new Error("You cannot resume a pause after it has already started. Please contact your trainer or admin.");
      }
      await recalculatePlanDates(user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pauses", user?.id] });
      qc.invalidateQueries({ queryKey: ["plan", user?.id] });
    },
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
