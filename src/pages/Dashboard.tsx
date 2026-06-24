import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, Check,
  FileHeart, CalendarOff, UserCircle2,
  CalendarOff as CalendarOffIcon, CreditCard, Download, MapPin, Clock, UserRound, ArrowRight,
} from "lucide-react";
import { formatDate, daysBetween } from "@/lib/dates";
import { countTrainingDaysInRange } from "@/lib/sessionPlan";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { usePauseStore } from "@/stores/pauseStore";
import { toast } from "sonner";
import { SocietyBatches } from "@/components/dashboard/SocietyBatches";
import { TrainerPauses } from "@/components/dashboard/TrainerPauses";
import { ProgressRing } from "@/components/ui/progress-ring";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD       = "#f0a720";
const GOLD_LIGHT = "#fef3d0";
const NAVY       = "#1E3A5F";
const NAVY_LIGHT = "#2d5a8e";
const MUTED      = "#8a8f9e";
const BORDER     = "rgba(30,58,95,0.08)";
const GREEN      = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const BLUE_SOFT  = "#4d9dff";  // base classes (sessions left)
const ORANGE     = "#ff8a3d";  // carried-forward classes

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Returns 0=Mon … 6=Sun */
function getTodayIdx() {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const { data: profile } = useProfile();
  const { activePause, history } = usePauseStore();
  const navigate = useNavigate();

  const firstName = (profile?.name ?? user?.email?.split("@")[0] ?? "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning ✨" : hour < 17 ? "Good afternoon ✨" : "Good evening ✨";

  // ── Data queries (unchanged from original) ──────────────────────────────────
  const { data: plan } = useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: latestReport } = useQuery({
    queryKey: ["latest-report", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_reports").select("*").eq("user_id", user!.id)
        .order("report_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: trainerName } = useQuery({
    queryKey: ["trainer-name", profile?.trainer_id],
    enabled: !!profile?.trainer_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("name").eq("id", profile!.trainer_id!).maybeSingle();
      return data?.name ?? null;
    },
  });

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalDays   = plan ? daysBetween(plan.start_date, plan.end_date) : 0;
  const elapsedDays = plan ? daysBetween(plan.start_date, new Date().toISOString()) : 0;
  const progress    = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;
  const sessionsUsed  = plan ? Math.round((plan.total_sessions * progress) / 100) : 0;
  const sessionsLeft  = plan ? Math.max(0, plan.total_sessions - sessionsUsed) : 0;

  // Carry-forward = training days lost to pauses DURING the current plan period
  // (each pause range clamped to the plan's start/end). These are missed sessions
  // pushed to the end of the plan — shown separately, not folded into "sessions left".
  const allPauses = [...history, ...(activePause ? [activePause] : [])];
  const carryForward = plan
    ? allPauses.reduce((sum, p) => {
        const from = p.from > plan.start_date ? p.from : plan.start_date;
        const to   = p.to   < plan.end_date   ? p.to   : plan.end_date;
        if (from > to) return sum; // pause doesn't overlap the current plan window
        return sum + countTrainingDaysInRange(from, to, plan.training_days ?? []);
      }, 0)
    : 0;
  const baseTotal  = plan?.total_sessions ?? 0;
  const capacity   = baseTotal + carryForward;            // all classes incl. carried
  // Bar segment widths (track scaled to full capacity; attended portion stays empty)
  const blueW   = capacity > 0 ? (sessionsLeft / capacity) * 100 : 0;
  const orangeW = capacity > 0 ? (carryForward / capacity) * 100 : 0;

  const trainingDays: string[] = (plan?.training_days ?? []).map((d: string) => d.slice(0, 3));
  const todayIdx     = getTodayIdx();
  const nextTrainingDay = WEEK_DAYS.find((d, i) => i >= todayIdx && trainingDays.includes(d))
    ?? trainingDays[0]
    ?? null;

  const handleDownload = async () => {
    if (!latestReport?.file_path) { toast.error("No file attached"); return; }
    const { data, error } = await supabase.storage
      .from("health-reports").createSignedUrl(latestReport.file_path, 60);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  // ── Mobile layout ───────────────────────────────────────────────────────────
  const MobileLayout = () => (
    <div style={{ background: "#f4f2ee", minHeight: "100%" }}>

      {/* Hero gradient card */}
      <div
        className="mx-4 mt-3 rounded-[28px] overflow-hidden relative"
        style={{
          background: `linear-gradient(145deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
          padding: "22px 24px 28px",
        }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute rounded-full"
          style={{ top: -40, right: -40, width: 140, height: 140, background: "rgba(240,167,32,0.15)" }} />
        <div className="pointer-events-none absolute rounded-full"
          style={{ bottom: -20, right: 60, width: 80, height: 80, background: "rgba(255,255,255,0.05)" }} />

        {/* Greeting row */}
        <div className="mb-5 relative">
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{greeting}</p>
          <h1 className="font-display text-white mt-0.5" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {firstName}
          </h1>
        </div>

        {/* Sessions + progress ring */}
        <div className="flex items-center justify-between relative">
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-white" style={{ fontSize: 52, lineHeight: 1 }}>
              {plan ? capacity : "—"}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>total sessions</span>
            <div className="flex flex-col items-start gap-1 mt-2.5">
              <span className="rounded-full font-semibold"
                style={{ fontSize: 12, color: BLUE_SOFT, background: "rgba(77,157,255,0.18)", padding: "3px 10px" }}>
                {plan ? sessionsLeft : 0} sessions left
              </span>
              {carryForward > 0 && (
                <span className="font-semibold" style={{ fontSize: 11, color: ORANGE, paddingLeft: 2 }}>
                  +{carryForward} carried forward
                </span>
              )}
            </div>
          </div>
          <ProgressRing progress={progress} size={110} strokeWidth={9} color={GOLD} trackColor="rgba(255,255,255,0.12)">
            <span className="font-bold text-white" style={{ fontSize: 18 }}>{progress}%</span>
          </ProgressRing>
        </div>

        {/* Sessions bar — blue = base classes left, orange = carried forward */}
        <div className="mt-5 relative">
          <div className="flex rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.12)" }}>
            <div className="h-full" style={{ width: `${blueW}%`, background: BLUE_SOFT, transition: "width 1s ease" }} />
            <div className="h-full" style={{ width: `${orangeW}%`, background: ORANGE, transition: "width 1s ease" }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{sessionsUsed} used</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{capacity} total</span>
          </div>
        </div>
      </div>

      {/* This week */}
      <div className="px-5 pt-5 pb-1">
        <p className="font-semibold uppercase mb-3"
          style={{ fontSize: 13, color: MUTED, letterSpacing: "0.08em" }}>
          This week
        </p>
        <div className="flex gap-2">
          {WEEK_DAYS.map((d, i) => {
            const isTraining = trainingDays.length > 0 && trainingDays.includes(d);
            const isPast     = i < todayIdx;
            const isToday    = i === todayIdx;
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-2.5"
                style={{
                  background: isTraining ? (isPast ? GOLD_LIGHT : NAVY) : "#fff",
                  border: isToday
                    ? `2px solid ${GOLD}`
                    : `1px solid ${isTraining ? (isPast ? GOLD : "transparent") : BORDER}`,
                }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: isTraining ? (isPast ? GOLD : "rgba(255,255,255,0.7)") : MUTED,
                }}>
                  {d[0]}
                </span>
                {isTraining && (
                  <div className="flex items-center justify-center rounded-full"
                    style={{ width: 20, height: 20, background: isPast ? GOLD : "rgba(255,255,255,0.15)" }}>
                    {isPast
                      ? <Check size={11} color="#fff" strokeWidth={3} />
                      : <div className="rounded-full" style={{ width: 5, height: 5, background: "rgba(255,255,255,0.6)" }} />
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next session banner */}
      <div className="mx-4 my-3 rounded-[20px] flex items-center justify-between"
        style={{
          background: "#fff", border: `1px solid ${BORDER}`,
          padding: "16px 18px", boxShadow: "0 2px 12px rgba(30,58,95,0.06)",
        }}>
        <div>
          <p className="uppercase font-semibold"
            style={{ fontSize: 11, color: MUTED, letterSpacing: "0.08em" }}>
            Next session
          </p>
          <p className="font-bold mt-1" style={{ fontSize: 17, color: NAVY }}>
            {nextTrainingDay
              ? `${nextTrainingDay} · ${profile?.time_slot ?? "—"}`
              : "No sessions scheduled"}
          </p>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            {trainerName ?? "Your trainer"} · {profile?.society ?? "Your society"}
          </p>
        </div>
        <Link to="/plan">
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: GOLD_LIGHT, flexShrink: 0 }}>
            <ChevronRight size={18} color={GOLD} />
          </div>
        </Link>
      </div>

      {/* Quick cards */}
      <div className="flex gap-2.5 px-4 pb-4 pt-1">
        <button onClick={() => navigate("/health")} className="flex-1 rounded-[20px] p-4 text-left border-none cursor-pointer"
          style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(30,58,95,0.05)" }}>
          <div className="flex items-center justify-center rounded-xl mb-2.5"
            style={{ width: 36, height: 36, background: "#eef2ff" }}>
            <FileHeart size={18} color="#5b6cf8" />
          </div>
          <p className="font-bold" style={{ fontSize: 13, color: NAVY }}>Health</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {latestReport ? "Latest report" : "No reports yet"}
          </p>
        </button>

        <button onClick={() => navigate("/pause")} className="flex-1 rounded-[20px] p-4 text-left border-none cursor-pointer"
          style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(30,58,95,0.05)" }}>
          <div className="flex items-center justify-center rounded-xl mb-2.5"
            style={{ width: 36, height: 36, background: activePause ? "#fee2e2" : GREEN_LIGHT }}>
            <CalendarOff size={18} color={activePause ? "#ef4444" : GREEN} />
          </div>
          <p className="font-bold" style={{ fontSize: 13, color: NAVY }}>Pause</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{activePause ? "Paused" : "Running"}</p>
        </button>

        <button onClick={() => navigate("/profile")} className="flex-1 rounded-[20px] p-4 text-left border-none cursor-pointer"
          style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(30,58,95,0.05)" }}>
          <div className="flex items-center justify-center rounded-xl mb-2.5"
            style={{ width: 36, height: 36, background: "#fdf4dc" }}>
            <UserCircle2 size={18} color={GOLD} />
          </div>
          <p className="font-bold" style={{ fontSize: 13, color: NAVY }}>Profile</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{profile?.society ?? "My profile"}</p>
        </button>
      </div>

      {/* Trainer / Society sections */}
      <div className="px-4 pb-4 space-y-4">
        {role === "trainer" && <TrainerPauses />}
        {role !== "trainer" && <SocietyBatches />}
      </div>
    </div>
  );

  // ── Desktop layout (original) ───────────────────────────────────────────────
  const DesktopLayout = () => (
    <div className="space-y-6 py-0">
      <header>
        <h1 className="font-display text-3xl md:text-4xl text-foreground">Hi {firstName}, here's your overview</h1>
        <p className="mt-1 text-muted-foreground">A calm look at your fitness program today.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Plan card */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Your plan</p>
                <p className="font-display text-xl">{plan ? `${plan.total_sessions} sessions` : "Not assigned"}</p>
              </div>
            </div>
            {plan && (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary">{sessionsLeft} sessions left</Badge>
                {carryForward > 0 && (
                  <span className="text-xs font-medium" style={{ color: ORANGE }}>+{carryForward} carried forward</span>
                )}
              </div>
            )}
          </div>
          {plan ? (
            <>
              <div className="mt-5 space-y-3">
                <div className="flex rounded-full overflow-hidden h-2 bg-muted">
                  <div className="h-full" style={{ width: `${blueW}%`, background: BLUE_SOFT }} />
                  <div className="h-full" style={{ width: `${orangeW}%`, background: ORANGE }} />
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">{formatDate(plan.start_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Next plan starts</p>
                    <p className="font-medium">{formatDate(plan.renewal_date)}</p>
                  </div>
                </div>
              </div>
              <Button asChild variant="ghost" className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent">
                <Link to="/plan">View plan details <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No plan assigned yet — your trainer will set this up.</p>
          )}
        </Card>

        {/* Pause card */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <CalendarOffIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Pause status</p>
              <p className="font-display text-xl">{activePause ? "Paused" : "Active"}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {activePause
              ? `Your classes are paused from ${formatDate(activePause.from)} to ${formatDate(activePause.to)}.`
              : "Your classes are running as scheduled. Need a break? Pause anytime."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/pause">Manage pause <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>

        {/* Health report */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileHeart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Latest health report</p>
              <p className="font-display text-xl">{latestReport?.title ?? "No reports yet"}</p>
            </div>
          </div>
          {latestReport ? (
            <>
              <p className="mt-5 text-sm text-muted-foreground">Updated {formatDate(latestReport.report_date)}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button asChild variant="outline">
                  <Link to="/health">View all</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Your trainer will share your first report soon.</p>
          )}
        </Card>

        {/* Profile snapshot */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Your details</p>
              <p className="font-display text-xl">Profile snapshot</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{profile?.society || "Add your society in Profile"}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{profile?.time_slot || "No time slot set"}</span>
            </li>
            <li className="flex items-start gap-3">
              <UserRound className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>Trainer: <span className="font-medium">{trainerName ?? "Not assigned"}</span></span>
            </li>
          </ul>
          <Button asChild variant="ghost" className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent">
            <Link to="/profile">Manage profile <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>

        {role === "trainer" && (
          <div className="md:col-span-2"><TrainerPauses /></div>
        )}
        {role !== "trainer" && (
          <div className="md:col-span-2"><SocietyBatches /></div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden"><MobileLayout /></div>
      <div className="hidden md:block"><DesktopLayout /></div>
    </>
  );
}
