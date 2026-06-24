import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2, CalendarDays, Gift, ArrowRight } from "lucide-react";
import { formatDate, daysBetween } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { usePauseStore } from "@/stores/pauseStore";
import { calculatePlanEndDate, extendEndDateBySessions, countTrainingDaysInRange, isoDate } from "@/lib/sessionPlan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GOLD       = "#f0a720";
const NAVY       = "#1E3A5F";
const MUTED      = "#8a8f9e";
const BORDER     = "rgba(30,58,95,0.08)";
const GREEN      = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const GOLD_LIGHT = "#fef3d0";
const GOLD_TEXT  = "#7a5200";
const GOLD_SUB   = "#9a7423";
const GOLD_DEEP  = "#b07d10";
const WEEK_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Plan() {
  const { user } = useAuth();
  const { history, activePause } = usePauseStore();

  const { data: plan, refetch } = useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: billing = [] } = useQuery({
    queryKey: ["billing", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_history").select("*").eq("user_id", user!.id)
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  });

  // Local toggle state for optimistic update
  const [autoRenewLocal, setAutoRenewLocal] = useState<boolean | null>(null);
  const autoRenew = autoRenewLocal !== null ? autoRenewLocal : (plan?.auto_renew ?? false);

  const handleAutoRenew = async (v: boolean) => {
    setAutoRenewLocal(v);
    const { error } = await supabase.from("plans").update({ auto_renew: v }).eq("id", plan!.id);
    if (error) {
      toast.error(error.message);
      setAutoRenewLocal(null);
    } else {
      toast.success(v ? "Auto-renew enabled" : "Auto-renew disabled");
      refetch();
    }
  };

  if (!plan) {
    return (
      <>
        {/* Mobile empty state */}
        <div className="md:hidden" style={{ background: "#f4f2ee", minHeight: "100%" }}>
          <div style={{ padding: "8px 20px 16px" }}>
            <p style={{ color: MUTED, fontSize: 13 }}>Active subscription</p>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: NAVY }}>Your plan</h2>
          </div>
          <div className="mx-4 rounded-[20px] p-8 text-center"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p style={{ color: MUTED, fontSize: 14 }}>No plan assigned yet — your trainer will set this up.</p>
          </div>
        </div>
        {/* Desktop empty state */}
        <div className="hidden md:block space-y-6">
          <header>
            <h1 className="font-display text-3xl text-foreground">Your plan</h1>
            <p className="mt-1 text-muted-foreground">All the details about your current Fitved plan.</p>
          </header>
          <Card className="p-8 rounded-2xl shadow-card text-center">
            <p className="text-muted-foreground">No plan assigned yet — your trainer will set this up.</p>
          </Card>
        </div>
      </>
    );
  }

  const totalDays   = daysBetween(plan.start_date, plan.end_date);
  const elapsedDays = daysBetween(plan.start_date, new Date().toISOString());
  const progress    = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;
  const sessionsUsed  = Math.round((plan.total_sessions * progress) / 100);
  const sessionsLeft  = plan.total_sessions - sessionsUsed;
  const trainingDays: string[] = (plan.training_days ?? []).map((d: string) => d.slice(0, 3));

  // ── Carry-forward reward ─────────────────────────────────────────────
  // Classes carried forward = training days lost to pauses within the plan
  // period. The plan only stores the current end date, so we compute the
  // "original" (no-pause) end and compare it to the (extended) end.
  const planDaysFull: string[] = plan.training_days ?? [];
  const allPauses = [...history, ...(activePause ? [activePause] : [])];
  const carriedClasses = allPauses.reduce((sum, p) => {
    const from = p.from > plan.start_date ? p.from : plan.start_date;
    const to   = p.to   < plan.end_date   ? p.to   : plan.end_date;
    if (from > to) return sum;
    return sum + countTrainingDaysInRange(from, to, planDaysFull);
  }, 0);
  const baseEnd        = calculatePlanEndDate(plan.start_date, plan.total_sessions, planDaysFull);
  const originalEndISO = isoDate(baseEnd);
  const projectedEndISO = isoDate(extendEndDateBySessions(baseEnd, carriedClasses, planDaysFull));
  const newEndISO      = plan.end_date >= projectedEndISO ? plan.end_date : projectedEndISO;
  const showReward     = carriedClasses > 0;

  const dateCards = [
    { label: "Started", val: formatDate(plan.start_date).replace(/,?\s*\d{4}$/, ""), accent: false },
    { label: "Ends",    val: formatDate(newEndISO).replace(/,?\s*\d{4}$/, ""),       accent: showReward },
    { label: "Renews",  val: formatDate(plan.renewal_date).replace(/,?\s*\d{4}$/, ""), accent: false },
  ];

  return (
    <>
      {/* ── Mobile Layout ─────────────────────────────────────────── */}
      <div className="md:hidden" style={{ background: "#f4f2ee", minHeight: "100%" }}>

        {/* Page header */}
        <div style={{ padding: "8px 20px 16px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Active subscription</p>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: NAVY }}>
            Your plan
          </h2>
        </div>

        {/* Hero plan card */}
        <div className="mx-4 mb-3.5 rounded-3xl overflow-hidden relative"
          style={{ background: NAVY, padding: "22px 22px 20px" }}>
          <div className="pointer-events-none absolute rounded-full"
            style={{ top: -20, right: -20, width: 100, height: 100, background: "rgba(240,167,32,0.15)" }} />

          <div className="flex items-start justify-between relative">
            <div>
              <p className="font-display font-bold text-white" style={{ fontSize: 34, lineHeight: 1 }}>
                ₹{Number(plan.amount).toLocaleString("en-IN")}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                per cycle · {plan.total_sessions} sessions
              </p>
            </div>
            <span className="rounded-full font-bold" style={{ background: GREEN_LIGHT, color: GREEN, fontSize: 12, padding: "4px 12px" }}>
              Active
            </span>
          </div>

          <div className="mt-4 relative">
            <div className="flex justify-between mb-1.5">
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {sessionsUsed} of {plan.total_sessions} used
              </span>
              <span className="font-semibold" style={{ fontSize: 12, color: GOLD }}>{sessionsLeft} left</span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, #e8920a)` }} />
            </div>
          </div>
        </div>

        {/* Carry-forward reward */}
        {showReward && (
          <div className="mx-4 mb-3.5 rounded-3xl"
            style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD}`, padding: 16 }}>
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ width: 38, height: 38, background: GOLD }}>
                <Gift size={20} color="#fff" />
              </div>
              <div className="min-w-0">
                <p className="font-bold" style={{ fontSize: 15, color: GOLD_TEXT }}>
                  You earned {carriedClasses} bonus {carriedClasses === 1 ? "class" : "classes"}
                </p>
                <p style={{ fontSize: 12, color: GOLD_SUB, marginTop: 3, lineHeight: 1.45 }}>
                  because you missed these classes — FitVed added every one back to your plan.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl mt-3" style={{ background: "#fff", padding: "11px 14px" }}>
              <div>
                <p style={{ fontSize: 11, color: MUTED }}>Was ending</p>
                <p style={{ fontSize: 15, color: MUTED, textDecoration: "line-through", marginTop: 2 }}>
                  {formatDate(originalEndISO).replace(/,?\s*\d{4}$/, "")}
                </p>
              </div>
              <ArrowRight size={18} color={GOLD} />
              <div className="text-right">
                <p style={{ fontSize: 11, color: GOLD_DEEP }}>Now ends</p>
                <p className="font-bold" style={{ fontSize: 15, color: NAVY, marginTop: 2 }}>
                  {formatDate(newEndISO).replace(/,?\s*\d{4}$/, "")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Date trio */}
        <div className="flex gap-2.5 mx-4 mb-3.5">
          {dateCards.map(({ label, val, accent }) => (
            <div key={label} className="flex-1 rounded-[18px] text-center"
              style={{ background: "#fff", padding: "14px 12px", border: `1px solid ${accent ? GOLD : BORDER}`, boxShadow: "0 2px 8px rgba(30,58,95,0.05)" }}>
              <p className="font-bold" style={{ fontSize: 15, color: NAVY }}>{val}</p>
              <p style={{ fontSize: 11, color: accent ? GOLD_DEEP : MUTED, marginTop: 3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Training days */}
        <div className="mx-4 mb-3.5 rounded-[20px] p-4"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <p className="font-semibold uppercase mb-3" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
            Training days
          </p>
          <div className="flex gap-2">
            {WEEK_DAYS.map((d) => {
              const active = trainingDays.includes(d);
              return (
                <div key={d} className="flex-1 flex items-center justify-center rounded-xl"
                  style={{
                    height: 38,
                    background: active ? NAVY : "rgba(30,58,95,0.04)",
                    border: `1px solid ${active ? "transparent" : BORDER}`,
                  }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : MUTED }}>{d[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-renew */}
        <div className="mx-4 mb-4 rounded-[20px] p-4 flex items-center justify-between"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <div>
            <p className="font-bold" style={{ fontSize: 14, color: NAVY }}>Auto-renew</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Renews {formatDate(plan.renewal_date)}</p>
          </div>
          {/* Custom toggle */}
          <div
            onClick={() => handleAutoRenew(!autoRenew)}
            className="cursor-pointer relative flex-shrink-0"
            style={{
              width: 46, height: 26, borderRadius: 13,
              background: autoRenew ? NAVY : "rgba(30,58,95,0.15)",
              transition: "background 0.2s",
            }}
          >
            <div className="absolute rounded-full"
              style={{
                width: 20, height: 20, background: "#fff",
                top: 3, left: autoRenew ? 23 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }} />
          </div>
        </div>

        {/* Billing history on mobile */}
        {billing.length > 0 && (
          <div className="mx-4 mb-4 rounded-[20px] p-4"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p className="font-semibold uppercase mb-3" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
              Billing history
            </p>
            <ul className="divide-y" style={{ borderColor: BORDER }}>
              {billing.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium" style={{ fontSize: 14, color: NAVY }}>{formatDate(b.payment_date)}</p>
                    <p style={{ fontSize: 11, color: MUTED }}>{b.method ?? "—"}</p>
                  </div>
                  <p className="font-semibold" style={{ fontSize: 14, color: NAVY }}>
                    ₹{Number(b.amount).toLocaleString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Desktop Layout (original) ──────────────────────────────── */}
      <div className="hidden md:block space-y-6">
        <header>
          <h1 className="font-display text-3xl text-foreground">Your plan</h1>
          <p className="mt-1 text-muted-foreground">All the details about your current Fitved plan.</p>
        </header>

        <Card className="p-6 md:p-8 rounded-2xl shadow-card overflow-hidden relative">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-soft">
                <CreditCard className="h-6 w-6" />
              </span>
              <div>
                <Badge className="mb-2 bg-primary-soft text-primary hover:bg-primary-soft">
                  {plan.total_sessions} sessions
                </Badge>
                <p className="font-display text-2xl">₹{Number(plan.amount).toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground">per cycle</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {plan.status}
            </Badge>
          </div>

          <Separator className="my-6" />

          <dl className="grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Plan started</dt>
              <dd className="mt-1 font-medium">{formatDate(plan.start_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Plan ends (last session)</dt>
              <dd className="mt-1 font-medium">{formatDate(plan.end_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Next plan starts</dt>
              <dd className="mt-1 font-medium text-primary">{formatDate(plan.renewal_date)}</dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Training days
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {(plan.training_days ?? []).map((d: string) => (
                  <Badge key={d} variant="outline">{d.slice(0, 3)}</Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Payment method</dt>
              <dd className="mt-1 font-medium">{plan.payment_method ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="font-medium">Auto-renewal</p>
                <p className="text-xs text-muted-foreground">Renew automatically at the end of each cycle.</p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={handleAutoRenew} />
            </div>
          </dl>
        </Card>

        {showReward && (
          <Card className="p-6 rounded-2xl shadow-card" style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD}` }}>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl flex-shrink-0" style={{ background: GOLD }}>
                <Gift className="h-6 w-6 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl" style={{ color: GOLD_TEXT }}>
                  You earned {carriedClasses} bonus {carriedClasses === 1 ? "class" : "classes"}
                </p>
                <p className="text-sm mt-1" style={{ color: GOLD_SUB }}>
                  because you missed these classes — FitVed added every one back to your plan.
                </p>
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-xs" style={{ color: MUTED }}>Was ending</p>
                    <p className="font-medium line-through" style={{ color: MUTED }}>{formatDate(originalEndISO)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5" style={{ color: GOLD }} />
                  <div>
                    <p className="text-xs" style={{ color: GOLD_DEEP }}>Now ends</p>
                    <p className="font-medium" style={{ color: NAVY }}>{formatDate(newEndISO)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 rounded-2xl shadow-card">
          <h2 className="font-display text-xl">Billing history</h2>
          {billing.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {billing.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{formatDate(b.payment_date)}</p>
                    <p className="text-xs text-muted-foreground">{b.method ?? "—"}</p>
                  </div>
                  <p className="font-medium">₹{Number(b.amount).toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
