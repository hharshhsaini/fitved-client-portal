import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/dates";

interface PauseRow {
  pause_id: string;
  client_id: string;
  client_name: string | null;
  society: string | null;
  time_slot: string | null;
  from_date: string;
  to_date: string;
  status: "active" | "completed";
}

export function TrainerPauses() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["trainer-pauses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_trainer_client_pauses");
      if (error) throw error;
      return (data ?? []) as PauseRow[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const active = (data ?? []).filter(
    (p) => p.status === "active" && p.from_date <= today && p.to_date >= today
  );
  const upcoming = (data ?? []).filter(
    (p) => p.status === "active" && p.from_date > today
  );

  return (
    <Card className="p-6 rounded-2xl shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning-foreground">
          <CalendarOff className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Client pauses</p>
          <p className="font-display text-xl">
            {active.length} active · {upcoming.length} upcoming
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
      ) : (active.length === 0 && upcoming.length === 0) ? (
        <p className="mt-5 text-sm text-muted-foreground">
          None of your clients have paused their classes.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {[...active, ...upcoming].map((p) => {
            const isActive = p.from_date <= today && p.to_date >= today;
            return (
              <li key={p.pause_id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.client_name ?? "Client"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(p.from_date)} — {formatDate(p.to_date)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {p.society && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.society}
                        </span>
                      )}
                      {p.time_slot && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.time_slot}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"} className="shrink-0">
                    {isActive ? "Paused now" : "Upcoming"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
