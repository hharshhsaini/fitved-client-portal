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

type PlanStatus = "active" | "paused" | "cancelled";

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

  const [totalSessions, setTotalSessions] = useState<number>(36);
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [amount, setAmount] = useState<number>(7499);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [status, setStatus] = useState<PlanStatus>("active");

  useEffect(() => {
    if (plan) {
      setTotalSessions(plan.total_sessions);
      setTrainingDays(plan.training_days ?? []);
      setStartDate(plan.start_date);
      setEndDate(plan.end_date);
      setRenewalDate(plan.renewal_date);
      setAmount(Number(plan.amount));
      setPaymentMethod(plan.payment_method ?? "");
      setAutoRenew(plan.auto_renew);
      setStatus(plan.status as PlanStatus);
    } else {
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [plan]);

  // Auto-recompute end + renewal whenever start/sessions/days change
  useEffect(() => {
    if (!startDate || !trainingDays.length || !totalSessions) return;
    const end = calculatePlanEndDate(startDate, totalSessions, trainingDays);
    const renewal = calculatePlanRenewalDate(end, trainingDays);
    setEndDate(isoDate(end));
    setRenewalDate(isoDate(renewal));
  }, [startDate, totalSessions, trainingDays]);

  const toggleDay = (day: string, on: boolean) => {
    setTrainingDays((prev) =>
      on ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  // Count training days that fell inside any pause (after current end_date is computed)
  const lostFromPauses = useMemo(() => {
    if (!pauses.length || !trainingDays.length) return 0;
    return pauses.reduce(
      (sum, p) => sum + countTrainingDaysInRange(p.from_date, p.to_date, trainingDays),
      0,
    );
  }, [pauses, trainingDays]);

  const recalcWithPauses = () => {
    if (!endDate || !trainingDays.length) return;
    if (lostFromPauses === 0) {
      toast.info("No training days lost to pauses — nothing to extend.");
      return;
    }
    // Recompute base end (without extension) from start, then extend
    const baseEnd = calculatePlanEndDate(startDate, totalSessions, trainingDays);
    const extended = extendEndDateBySessions(baseEnd, lostFromPauses, trainingDays);
    const renewal = calculatePlanRenewalDate(extended, trainingDays);
    setEndDate(isoDate(extended));
    setRenewalDate(isoDate(renewal));
    toast.success(`Extended by ${lostFromPauses} training day(s) for pauses`);
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
        payment_method: paymentMethod || null,
        auto_renew: autoRenew,
        status,
      };
      if (plan) {
        const { error } = await supabase.from("plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(plan ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["customer-plan", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Number of sessions</Label>
          <Select value={String(totalSessions)} onValueChange={(v) => setTotalSessions(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} sessions
                  {n === 8 && " · trial / recovery"}
                  {n === 12 && " · 3-week intensive"}
                  {n === 36 && " · 3-month standard"}
                  {n === 72 && " · 6-month longevity"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Amount (₹)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
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
          {endDate && renewalDate ? (
            <>
              Plan ends <span className="font-medium text-foreground">{format(new Date(endDate), "EEE, MMM d, yyyy")}</span>
              {" · "}Next plan starts <span className="font-medium text-foreground">{format(new Date(renewalDate), "EEE, MMM d, yyyy")}</span>
            </>
          ) : "Pick start date and training days to compute."}
        </p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Pause days lost (training days falling inside a pause): <span className="font-medium text-foreground">{lostFromPauses}</span>
          </span>
          <Button size="sm" variant="outline" onClick={recalcWithPauses}>
            Recalculate with pauses
          </Button>
        </div>
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label>Auto-renew</Label>
        <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : plan ? "Update plan" : "Create plan"}
      </Button>
    </div>
  );
}
