import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BatchRow {
  society_id: string;
  society_name: string | null;
  trainer_id: string | null;
  trainer_name: string | null;
  time_slot: string | null;
  member_count: number;
}

export function SocietyBatches() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["society-batches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_society_batches", { _client_id: user!.id });
      if (error) throw error;
      return (data ?? []) as BatchRow[];
    },
  });

  const societyName = data?.[0]?.society_name;

  return (
    <Card className="p-6 rounded-2xl shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Batches in your society</p>
          <p className="font-display text-xl">{societyName ?? "Your society"}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading batches…</p>
      ) : !data || data.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No active batches found yet for your society.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {data.map((b, i) => (
            <li key={`${b.trainer_id}-${b.time_slot}-${i}`} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {b.trainer_name ?? "Trainer TBA"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {b.time_slot ?? "Time TBA"}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <Users className="mr-1 h-3 w-3" />
                {b.member_count}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
