import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePauseStore } from "@/stores/pauseStore";
import { formatDate, daysBetween } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Count how many of the client's training days fall within [from, to] inclusive
function countSessionsInRange(from: Date, to: Date, trainingDays: string[]): number {
  const DAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const trainingNums = trainingDays
    .map((d) => DAY_MAP[d.slice(0, 3)])
    .filter((n) => n !== undefined);

  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    if (trainingNums.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const NAVY   = "#1E3A5F";
const MUTED  = "#8a8f9e";
const BORDER = "rgba(30,58,95,0.08)";
const GREEN  = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const RED    = "#ef4444";
const RED_LIGHT  = "#fee2e2";

// Format a Date as a local YYYY-MM-DD string (avoids UTC shift from toISOString)
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Pause() {
  const { user } = useAuth();
  const { activePause, history, pause, resume } = usePauseStore();
  const [range, setRange] = useState<DateRange | undefined>();
  const [calOpen, setCalOpen] = useState(false);
  const [calOpenDesktop, setCalOpenDesktop] = useState(false);

  // Update the range and auto-close the picker once a full range is chosen
  const handleRangeSelect = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      setCalOpen(false);
      setCalOpenDesktop(false);
    }
  };

  const days = range?.from && range?.to
    ? daysBetween(range.from.toISOString(), range.to.toISOString()) : 0;

  // Fetch training days from the user's active plan
  const { data: trainingDays = [] } = useQuery({
    queryKey: ["pause-plan-training-days", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("training_days").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return (data?.training_days ?? []) as string[];
    },
  });

  // Sessions that actually fall in the selected range
  const sessionCount = range?.from && range?.to
    ? countSessionsInRange(range.from, range.to, trainingDays)
    : 0;

  const tooFewSessions = range?.from && range?.to && sessionCount < 2;

  const handlePause = async () => {
    if (!range?.from || !range?.to) { toast.error("Please select a start and end date"); return; }
    if (sessionCount < 2) {
      toast.error("Class pauses apply only when you'll miss 2 or more sessions.");
      return;
    }
    try {
      await pause(toLocalISODate(range.from), toLocalISODate(range.to));
      toast.success(`Classes paused for ${days} days (${sessionCount} sessions)`);
      setRange(undefined);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not pause");
    }
  };

  const handleResume = async () => {
    try {
      await resume();
      toast.success("Classes resumed — see you soon!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not resume");
    }
  };

  const isPaused = !!activePause;

  return (
    <>
      {/* ── Mobile Layout ──────────────────────────────────────────── */}
      <div className="md:hidden" style={{ background: "#f4f2ee", minHeight: "100%" }}>

        {/* Page header */}
        <div style={{ padding: "8px 20px 20px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Take a break</p>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: NAVY }}>
            Pause classes
          </h2>
        </div>

        {/* Schedule a pause — shown first when not paused */}
        {!isPaused && (
          <div className="mx-4 mb-4 rounded-[20px] p-4"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p className="font-bold mb-1" style={{ fontSize: 14, color: NAVY }}>Schedule a pause</p>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Pick the start and end date for your break.</p>

            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal h-11")}
                  style={{
                    border: `2px solid ${range?.from ? NAVY : "#c8d4e3"}`,
                    color: range?.from ? NAVY : MUTED,
                    background: "#f8fafd",
                    fontWeight: range?.from ? 600 : 400,
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" style={{ color: NAVY, opacity: 0.7 }} />
                  {range?.from ? (
                    range.to ? <>{format(range.from, "PP")} — {format(range.to, "PP")}</> : format(range.from, "PP")
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range" selected={range} onSelect={handleRangeSelect} numberOfMonths={1}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {tooFewSessions && (
              <p className="text-sm mt-2" style={{ color: RED }}>
                Class pauses apply only when you'll miss 2 or more sessions.
              </p>
            )}
            {range?.from && range?.to && !tooFewSessions && sessionCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Pausing <span className="font-medium text-foreground">{sessionCount} sessions</span> ({days} days).
              </p>
            )}

            <button
              onClick={handlePause}
              disabled={!range?.from || !range?.to || !!tooFewSessions}
              className="mt-3 w-full rounded-2xl border-none cursor-pointer disabled:opacity-50"
              style={{ background: RED, padding: "13px", fontSize: 14, fontWeight: 700, color: "#fff" }}
            >
              Pause My Classes
            </button>
          </div>
        )}

        {/* Status card — below schedule section */}
        <div className="mx-4 mb-4 rounded-3xl text-center"
          style={{
            background: "#fff", padding: "30px 24px",
            border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(30,58,95,0.07)",
          }}>
          <div className="flex items-center justify-center rounded-full mx-auto mb-4"
            style={{ width: 80, height: 80, background: isPaused ? RED_LIGHT : GREEN_LIGHT }}>
            {isPaused
              ? <PauseCircle size={34} color={RED} />
              : <CheckCircle2 size={34} color={GREEN} />}
          </div>
          <p className="font-display" style={{ fontSize: 24, fontWeight: 600, color: NAVY }}>
            {isPaused ? "Classes Paused" : "Classes Running"}
          </p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
            {isPaused
              ? `Paused from ${formatDate(activePause!.from)} to ${formatDate(activePause!.to)}.`
              : "All sessions are scheduled as planned."}
          </p>
          {isPaused ? (
            <button
              onClick={handleResume}
              className="mt-5 w-full rounded-2xl border-none cursor-pointer"
              style={{ background: GREEN, padding: "14px", fontSize: 15, fontWeight: 700, color: "#fff" }}
            >
              Resume Classes
            </button>
          ) : null}
        </div>

        {/* Past pauses */}
        {history.length > 0 && (
          <div className="mx-4 mb-4 rounded-[20px] p-4"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p className="font-semibold uppercase mb-3" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
              Past pauses
            </p>
            <ul>
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5"
                  style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div>
                    <p className="font-medium" style={{ fontSize: 13, color: NAVY }}>
                      {formatDate(p.from)} — {formatDate(p.to)}
                    </p>
                    <p style={{ fontSize: 11, color: MUTED }}>{daysBetween(p.from, p.to)} days</p>
                  </div>
                  <span className="rounded-full font-semibold" style={{ fontSize: 11, color: GREEN, background: GREEN_LIGHT, padding: "3px 10px" }}>
                    Done
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Desktop Layout (original) ──────────────────────────────── */}
      <div className="hidden md:block space-y-6">
        <header>
          <h1 className="font-display text-3xl text-foreground">Pause classes</h1>
          <p className="mt-1 text-muted-foreground">Need a break? Pause your sessions for any date range.</p>
        </header>

        <Card className={cn(
          "p-6 rounded-2xl shadow-card border-l-4",
          activePause ? "border-l-warning bg-warning/5" : "border-l-success bg-success/5"
        )}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={cn(
                "grid h-11 w-11 place-items-center rounded-full",
                activePause ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success"
              )}>
                {activePause ? <PauseCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </span>
              <div>
                <p className="font-display text-lg">{activePause ? "Currently paused" : "All classes active"}</p>
                <p className="text-sm text-muted-foreground">
                  {activePause
                    ? `From ${formatDate(activePause.from)} to ${formatDate(activePause.to)}`
                    : "You have no active pause."}
                </p>
              </div>
            </div>
            {activePause && (
              <Button onClick={handleResume} variant="outline">
                <PlayCircle className="mr-2 h-4 w-4" /> Resume now
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-card">
          <h2 className="font-display text-xl">Schedule a pause</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick the start and end date for your break.</p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Date range</p>
              <Popover open={calOpenDesktop} onOpenChange={setCalOpenDesktop}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full sm:w-[320px] justify-start text-left font-normal h-11", !range?.from && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {range?.from ? (
                      range.to ? <>{format(range.from, "PP")} — {format(range.to, "PP")}</> : format(range.from, "PP")
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range" selected={range} onSelect={handleRangeSelect} numberOfMonths={2}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              {tooFewSessions && (
                <p className="text-sm text-destructive">
                  Class pauses apply only when you'll miss 2 or more sessions.
                </p>
              )}
              {range?.from && range?.to && !tooFewSessions && sessionCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Pausing <span className="font-medium text-foreground">{sessionCount} sessions</span> ({days} days).
                </p>
              )}
            </div>
            <Button onClick={handlePause} disabled={!range?.from || !range?.to || !!tooFewSessions || !!activePause} className="h-11">
              <PauseCircle className="mr-2 h-4 w-4" /> Pause my classes
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-card">
          <h2 className="font-display text-xl">Past pauses</h2>
          <ul className="mt-4 divide-y divide-border">
            {history.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">No past pauses yet.</li>
            ) : (
              history.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{formatDate(p.from)} — {formatDate(p.to)}</p>
                    <p className="text-xs text-muted-foreground">{daysBetween(p.from, p.to)} days</p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
