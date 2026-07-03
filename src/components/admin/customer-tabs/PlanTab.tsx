import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  WEEKDAYS, SESSION_OPTIONS,
  calculatePlanEndDate, calculatePlanRenewalDate,
  countTrainingDaysInRange, extendEndDateBySessions, isoDate,
} from "@/lib/sessionPlan";
import { CustomPlanPrices } from "./CustomPlanPrices";

// Two statuses only: a plan is either running or it has ended. Pauses are
// tracked in the pauses table and never change the plan status; legacy
// "paused"/"cancelled" rows are shown as completed.
type PlanStatus = "active" | "completed";

const normalizeStatus = (s: string | null | undefined): PlanStatus =>
  s === "active" ? "active" : "completed";

const isValidDate = (dStr: string) => {
  if (!dStr) return false;
  const d = new Date(dStr);
  return !isNaN(d.getTime());
};

export function PlanTab({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: plan } = useQuery({
    queryKey: ["customer-plan", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: pauses = [] } = useQuery({
    queryKey: ["customer-pauses-for-plan", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pauses").select("from_date,to_date,status").eq("user_id", userId);
      return data ?? [];
    },
  });

  const [totalSessions, setTotalSessions] = useState<number>(12);
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [amount, setAmount] = useState<number>(3499);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [status, setStatus] = useState<PlanStatus>("active");
  useEffect(() => {
    if (plan && plan.status === "active") {
      setTotalSessions(plan.total_sessions);
      setTrainingDays(plan.training_days ?? []);
      setStartDate(plan.start_date);
      setEndDate(plan.end_date);
      setRenewalDate(plan.renewal_date);
      setAmount(Number(plan.amount));
      setDiscount(Number(plan.discount ?? 0));
      setPaymentMethod(plan.payment_method ?? "");
      setAutoRenew(plan.auto_renew);
      setStatus(normalizeStatus(plan.status));
    } else {
      // Clear inputs for new plan creation if no plan exists or latest plan has ended
      setTotalSessions(12);
      setTrainingDays([]);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setRenewalDate("");
      setAmount(3499);
      setDiscount(0);
      setPaymentMethod("");
      setAutoRenew(true);
      setStatus("active");
    }
  }, [plan]);

  // Count training days that fell inside any pause, clamped to this plan's
  // window (start → base end) so pauses from a previous plan don't inflate it.
  const lostFromPauses = useMemo(() => {
    if (!pauses.length || !trainingDays.length || !startDate || !totalSessions) return 0;
    const baseEnd = isoDate(calculatePlanEndDate(startDate, totalSessions, trainingDays));
    return pauses.reduce((sum, p) => {
      const from = p.from_date > startDate ? p.from_date : startDate;
      const to = p.to_date < baseEnd ? p.to_date : baseEnd;
      if (from > to) return sum; // pause doesn't overlap this plan
      return sum + countTrainingDaysInRange(from, to, trainingDays);
    }, 0);
  }, [pauses, trainingDays, startDate, totalSessions]);

  // Capped pause extension (max 1/3 of plan total sessions)
  const allowedPauseExtension = useMemo(() => {
    if (!totalSessions) return 0;
    const maxCarryForward = Math.floor(totalSessions / 3);
    return Math.min(lostFromPauses, maxCarryForward);
  }, [lostFromPauses, totalSessions]);

  // Auto-recompute end + renewal whenever start/sessions/days/pause-extension change
  useEffect(() => {
    if (!startDate || !trainingDays.length || !totalSessions) return;
    const base = calculatePlanEndDate(startDate, totalSessions, trainingDays);
    const end = allowedPauseExtension > 0 ? extendEndDateBySessions(base, allowedPauseExtension, trainingDays) : base;
    const renewal = calculatePlanRenewalDate(end, trainingDays);
    setEndDate(isoDate(end));
    setRenewalDate(isoDate(renewal));
  }, [startDate, totalSessions, trainingDays, allowedPauseExtension]);

  const toggleDay = (day: string, on: boolean) => {
    setTrainingDays((prev) =>
      on ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!trainingDays.length) throw new Error("Select at least one training day");
      const payload = {
        user_id: userId,
        total_sessions: totalSessions,
        training_days: trainingDays,
        start_date: startDate,
        end_date: endDate,
        renewal_date: renewalDate,
        amount,
        discount,
        payment_method: paymentMethod || null,
        auto_renew: autoRenew,
        status,
      };
      if (plan && plan.status === "active") {
        const { data, error } = await supabase.from("plans").update(payload).eq("id", plan.id).select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Nothing was updated — the plan row wasn't found or you don't have permission to change it.");
        }
        return data[0];
      } else {
        const { data, error } = await supabase.from("plans").insert(payload).select();
        if (error) throw error;
        return data?.[0] ?? null;
      }
    },
    onSuccess: async (saved) => {
      toast.success(plan ? "Plan updated" : "Plan created");
      // Write the saved row straight into the cache so the Plan tab shows the
      // new values immediately on remount — invalidate alone left it stale.
      if (saved) qc.setQueryData(["customer-plan", userId], saved);

      // Auto-record/sync billing entry when plan is created or updated
      if (saved && amount > 0) {
        const desc = `Plan: ${totalSessions} sessions (starts ${startDate})`;

        if (status === "active") {
          const netAmt = amount - discount;
          if (netAmt > 0) {
            // Check if billing record with this description already exists for this user
            const { data: existing } = await supabase
              .from("billing_history")
              .select("id")
              .eq("user_id", userId)
              .eq("notes", desc)
              .limit(1)
              .maybeSingle();

            const billingPayload: any = {
              user_id: userId,
              payment_date: startDate || new Date().toISOString().slice(0, 10),
              amount: netAmt,
              method: paymentMethod || null,
              type: "payment",
              notes: desc,
            };

            if (existing?.id) {
              // Update existing transaction
              const { error: updateErr } = await supabase
                .from("billing_history")
                .update(billingPayload)
                .eq("id", existing.id);
              if (updateErr) {
                console.warn("Auto-billing update failed:", updateErr);
              } else {
                toast.info(`Billing record updated: ₹${netAmt.toLocaleString("en-IN")}`);
              }
            } else {
              // Insert new transaction
              const { error: insertErr } = await supabase
                .from("billing_history")
                .insert(billingPayload);
              if (insertErr) {
                console.warn("Auto-billing insert failed:", insertErr);
              } else {
                toast.success(`₹${netAmt.toLocaleString("en-IN")} payment auto-recorded in billing`);
              }
            }
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["customer-plan", userId] });
      qc.invalidateQueries({ queryKey: ["customer-billing", userId] });
      qc.invalidateQueries({ queryKey: ["billing", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => {
      console.error("Plan save error:", e);
      toast.error(e instanceof Error ? e.message : (e as any)?.message || JSON.stringify(e) || "Save failed");
    },
  });

  // ── Manual renewal / extension ──────────────────────────────────────
  // Nothing renews automatically. The admin picks what the next cycle is —
  // the same plan again (renew) or any package from the catalog (extend) —
  // and it starts on the current plan's renewal date (already pushed forward
  // by any pause extensions), or the next training day from today if that
  // date has passed. The old cycle is closed as "completed" and the payment
  // is recorded in billing automatically.
  const { data: planOptions = [] } = useQuery({
    queryKey: ["plan-options-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_options").select("*").eq("active", true)
        .order("sort_order").order("duration_months");
      return data ?? [];
    },
  });

  const { data: priceOverrides = [] } = useQuery({
    queryKey: ["plan-price-overrides-admin", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_price_overrides").select("plan_option_id,price").eq("user_id", userId);
      return data ?? [];
    },
  });

  const overrideMap = useMemo(
    () => new Map(priceOverrides.map((o) => [o.plan_option_id, Number(o.price)])),
    [priceOverrides],
  );

  // "same" = renew the current plan as-is; otherwise a plan_options id.
  const [nextCyclePkg, setNextCyclePkg] = useState("same");

  const nextCycle = useMemo(() => {
    if (!plan) return null;
    if (nextCyclePkg !== "same") {
      const opt = planOptions.find((o) => o.id === nextCyclePkg && o.total_sessions != null);
      if (opt) {
        return {
          label: opt.name,
          sessions: opt.total_sessions as number,
          amount: overrideMap.get(opt.id) ?? Number(opt.price),
          discount: 0,
        };
      }
    }
    return {
      label: "Same plan again",
      sessions: plan.total_sessions,
      amount: Number(plan.amount),
      discount: Number(plan.discount ?? 0),
    };
  }, [plan, nextCyclePkg, planOptions, overrideMap]);
  const renewStartISO = useMemo(() => {
    if (!plan) return "";
    const days: string[] = plan.training_days ?? [];
    const todayISO = new Date().toISOString().slice(0, 10);
    let start = plan.renewal_date
      ?? isoDate(calculatePlanRenewalDate(plan.end_date, days));
    if (start < todayISO) {
      // renewal date already passed — resume from the next training day
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      start = isoDate(calculatePlanRenewalDate(yesterday, days));
    }
    return start;
  }, [plan]);

  const renew = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("No plan to renew");
      const days: string[] = plan.training_days ?? [];
      if (!days.length) throw new Error("The current plan has no training days set");
      const newEnd = calculatePlanEndDate(renewStartISO, plan.total_sessions, days);
      const newRenewal = calculatePlanRenewalDate(newEnd, days);

      // Close the old cycle
      const { error: closeErr } = await supabase
        .from("plans").update({ status: "completed" }).eq("id", plan.id);
      if (closeErr) throw closeErr;

      // Start the new cycle
      const { data: created, error } = await supabase.from("plans").insert({
        user_id: userId,
        total_sessions: plan.total_sessions,
        training_days: days,
        start_date: renewStartISO,
        end_date: isoDate(newEnd),
        renewal_date: isoDate(newRenewal),
        amount: plan.amount,
        discount: plan.discount ?? 0,
        payment_method: plan.payment_method,
        auto_renew: plan.auto_renew,
        status: "active",
      }).select().single();
      if (error) throw error;

      // Record the renewal payment
      const netAmt = Number(plan.amount) - Number(plan.discount ?? 0);
      if (netAmt > 0) {
        const { error: billErr } = await supabase.from("billing_history").insert({
          user_id: userId,
          payment_date: renewStartISO,
          amount: netAmt,
          method: plan.payment_method ?? null,
          type: "payment",
          notes: `Plan: ${plan.total_sessions} sessions (starts ${renewStartISO})`,
        });
        if (billErr) console.warn("Renewal billing insert failed:", billErr);
      }
      return created;
    },
    onSuccess: (created) => {
      toast.success(`Plan renewed — next cycle starts ${format(new Date(renewStartISO), "EEE, MMM d")}`);
      if (created) qc.setQueryData(["customer-plan", userId], created);
      qc.invalidateQueries({ queryKey: ["customer-plan", userId] });
      qc.invalidateQueries({ queryKey: ["customer-billing", userId] });
      qc.invalidateQueries({ queryKey: ["billing", userId] });
      qc.invalidateQueries({ queryKey: ["plan", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Renewal failed"),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Number of sessions</Label>
          <Select value={String(totalSessions)} onValueChange={(v) => {
            const val = Number(v);
            setTotalSessions(val);
            if (val === 8) setAmount(0);
            if (val === 12) setAmount(3499);
            if (val === 36) setAmount(9897);
            if (val === 72) setAmount(17994);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} sessions
                  {n === 8 && " · trial / recovery"}
                  {n === 12 && " · 1 month"}
                  {n === 36 && " · 3 months"}
                  {n === 72 && " · 6 months"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Pricing (₹)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Base amount"
              />
              <span className="text-[11px] text-muted-foreground">Base amount</span>
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="Discount"
              />
              <span className="text-[11px] text-muted-foreground">Discount</span>
            </div>
          </div>
          {discount > 0 && (
            <p className="text-xs text-muted-foreground">
              Net payable:{" "}
              <span className="font-medium text-foreground">
                ₹{Math.max(0, amount - discount).toLocaleString("en-IN")}
              </span>
              {discount > amount && <span className="text-destructive"> (discount exceeds amount)</span>}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Training days (weekly pattern)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent">
              <Checkbox
                checked={trainingDays.includes(day)}
                onCheckedChange={(c) => toggleDay(day, !!c)}
              />
              <span className="text-sm">{day.slice(0, 3)}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {trainingDays.length} day(s)/week selected. Sessions repeat this pattern weekly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Plan end (last session)</Label>
          <Input type="date" value={endDate} readOnly className="bg-muted/40" />
        </div>
        <div className="space-y-1.5">
          <Label>Next plan starts (renewal)</Label>
          <Input type="date" value={renewalDate} readOnly className="bg-muted/40" />
        </div>
      </div>

      <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
        <p className="font-medium">Schedule summary</p>
        <p className="text-muted-foreground">
          {isValidDate(endDate) && isValidDate(renewalDate) ? (
            <>
              Plan ends <span className="font-medium text-foreground">{format(new Date(endDate), "EEE, MMM d, yyyy")}</span>
              {" · "}Next plan starts <span className="font-medium text-foreground">{format(new Date(renewalDate), "EEE, MMM d, yyyy")}</span>
            </>
          ) : "Pick start date and training days to compute."}
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          Pause days lost (training days falling inside a pause):{" "}
          <span className="font-medium text-foreground">{lostFromPauses}</span>
          {allowedPauseExtension > 0 && (
            <> · extended automatically by <span className="font-medium text-foreground">{allowedPauseExtension}</span> day(s), capped at 1/3 of the plan</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="UPI / Card / Cash" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PlanStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active — plan is running</SelectItem>
              <SelectItem value="completed">Completed — plan has ended</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pauses don't change this — manage breaks in the Pauses tab. Expired plans complete automatically.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
        <div>
          <Label>Expected to renew</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Just a marker for the renewals list — nothing renews on its own. Use "Renew plan" below when payment is collected.
          </p>
        </div>
        <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : (plan && plan.status === "active") ? "Update plan" : "Create plan"}
      </Button>

      {/* Manual renewal — the only way a plan rolls into its next cycle */}
      {plan && plan.status === "active" && (
        <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "rgba(240,167,32,0.5)", background: "rgba(240,167,32,0.06)" }}>
          <p className="font-medium text-sm">Renew plan (next cycle)</p>
          <p className="text-xs text-muted-foreground">
            Starts <span className="font-medium text-foreground">{renewStartISO && isValidDate(renewStartISO) ? format(new Date(renewStartISO), "EEE, MMM d, yyyy") : "—"}</span>
            {" "}(right after the current plan, including pause extensions) · {plan.total_sessions} sessions ·{" "}
            <span className="font-medium text-foreground">₹{Math.max(0, Number(plan.amount) - Number(plan.discount ?? 0)).toLocaleString("en-IN")}</span>.
            The current cycle is marked completed and the payment is recorded in Billing automatically.
          </p>
          <Button
            size="sm"
            disabled={renew.isPending}
            onClick={() => {
              if (confirm(`Renew now? New cycle: ${plan.total_sessions} sessions starting ${renewStartISO}. A ₹${Math.max(0, Number(plan.amount) - Number(plan.discount ?? 0)).toLocaleString("en-IN")} payment will be recorded.`)) {
                renew.mutate();
              }
            }}
          >
            {renew.isPending ? "Renewing…" : "Renew plan now"}
          </Button>
        </div>
      )}

      <CustomPlanPrices userId={userId} />
    </div>
  );
}
