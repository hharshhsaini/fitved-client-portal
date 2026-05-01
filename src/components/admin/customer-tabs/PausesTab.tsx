import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";

export function PausesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: pauses = [] } = useQuery({
    queryKey: ["customer-pauses", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pauses").select("*").eq("user_id", userId)
        .order("from_date", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pauses").insert({
        user_id: userId, from_date: from, to_date: to, status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pause added");
      setFrom(""); setTo("");
      qc.invalidateQueries({ queryKey: ["customer-pauses", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pauses").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pause ended");
      qc.invalidateQueries({ queryKey: ["customer-pauses", userId] });
    },
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Add pause</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={!from || !to || create.isPending}>
          {create.isPending ? "Adding…" : "Add pause"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">History</h3>
        {pauses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pauses yet.</p>
        ) : pauses.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{formatDate(p.from_date)} → {formatDate(p.to_date)}</div>
              <Badge variant={p.status === "active" ? "secondary" : "outline"} className="mt-1">{p.status}</Badge>
            </div>
            {p.status === "active" && (
              <Button size="sm" variant="outline" onClick={() => cancel.mutate(p.id)}>End</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
