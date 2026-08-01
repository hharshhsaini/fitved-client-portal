import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Whether the current client should see the "Plan" tab.
 *
 * Resolution order:
 *  1. Admin override — profiles.plans_tab_visible (true/false) wins.
 *  2. Otherwise (NULL): default ON once the customer has any plan in history,
 *     OFF for brand-new sign-ups.
 *
 * Non-client roles always get `visible: true` (they have no Plan nav item).
 * The column is feature-detected — if the migration hasn't run yet, a failed
 * select just falls through to the automatic default.
 */
export function usePlansTabVisible(): { visible: boolean; isLoading: boolean } {
  const { user, role } = useAuth();
  const q = useQuery({
    queryKey: ["plans-tab-visible", user?.id],
    enabled: !!user && role === "client",
    queryFn: async () => {
      const sb = supabase as any;
      let override: boolean | null | undefined;
      const profRes = await sb.from("profiles").select("plans_tab_visible").eq("id", user!.id).maybeSingle();
      if (!profRes.error) override = profRes.data?.plans_tab_visible;
      if (override === true || override === false) return override as boolean;
      const { count } = await sb.from("plans").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return (count ?? 0) > 0;
    },
  });
  if (role !== "client") return { visible: true, isLoading: false };
  // Default hidden until resolved so a new user never sees the tab flash in.
  return { visible: q.data === true, isLoading: q.isLoading };
}
