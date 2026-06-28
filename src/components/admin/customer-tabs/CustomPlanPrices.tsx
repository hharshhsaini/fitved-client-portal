import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Option {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  total_sessions: number | null;
}

export function CustomPlanPrices({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: options = [] } = useQuery({
    queryKey: ["plan-options-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_options").select("*").eq("active", true)
        .order("sort_order").order("duration_months");
      return (data ?? []) as Option[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["plan-price-overrides-admin", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_price_overrides").select("plan_option_id,price").eq("user_id", userId);
      return data ?? [];
    },
  });

  // Seed the inputs from existing overrides whenever they load.
  useEffect(() => {
    const seed: Record<string, string> = {};
    for (const o of overrides) seed[o.plan_option_id] = String(Number(o.price));
    setValues(seed);
  }, [overrides]);

  const overrideMap = new Map(overrides.map((o) => [o.plan_option_id, Number(o.price)]));

  const save = useMutation({
    mutationFn: async () => {
      for (const opt of options) {
        const raw = (values[opt.id] ?? "").trim();
        const hadOverride = overrideMap.has(opt.id);
        if (raw === "") {
          if (hadOverride) {
            const { error } = await supabase.from("plan_price_overrides")
              .delete().eq("user_id", userId).eq("plan_option_id", opt.id);
            if (error) throw error;
          }
          continue;
        }
        const price = Number(raw);
        if (!(price > 0)) throw new Error(`Invalid price for ${opt.name}`);
        if (hadOverride && overrideMap.get(opt.id) === price) continue;
        const { error } = await supabase.from("plan_price_overrides")
          .upsert({ user_id: userId, plan_option_id: opt.id, price }, { onConflict: "user_id,plan_option_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Custom prices saved");
      qc.invalidateQueries({ queryKey: ["plan-price-overrides-admin", userId] });
      qc.invalidateQueries({ queryKey: ["plan-price-overrides", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (options.length === 0) return null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <p className="font-medium text-sm">Custom plan prices</p>
        <p className="text-xs text-muted-foreground">
          Leave blank to use the default. A value overrides it for this customer only.
        </p>
      </div>
      <div className="space-y-2.5">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{opt.name}</p>
              <p className="text-xs text-muted-foreground">
                Default ₹{Number(opt.price).toLocaleString("en-IN")}
                {opt.total_sessions != null ? ` · ${opt.total_sessions} sessions` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                inputMode="numeric"
                className="w-28"
                placeholder={String(Number(opt.price))}
                value={values[opt.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [opt.id]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save prices"}
      </Button>
    </div>
  );
}
