import { useState } from "react";
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
import { toast } from "sonner";

const NAVY   = "#1E3A5F";
const MUTED  = "#8a8f9e";
const BORDER = "rgba(30,58,95,0.08)";
const GREEN  = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const RED    = "#ef4444";
const RED_LIGHT  = "#fee2e2";

export default function Pause() {
  const { activePause, history, pause, resume } = usePauseStore();
  const [range, setRange] = useState<DateRange | undefined>();

  const days = range?.from && range?.to
    ? daysBetween(range.from.toISOString(), range.to.toISOString()) : 0;

  const handlePause = async () => {
    if (!range?.from || !range?.to) { toast.error("Please select a start and end date"); return; }
    try {
      await pause(range.from.toISOString(), range.to.toISOString());
      toast.success(`Classes paused for ${days} day${days === 1 ? "" : "s"}`);
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

        {/* Status card */}
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

        {/* Schedule a pause */}
        {!isPaused && (
          <div className="mx-4 mb-4 rounded-[20px] p-4"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p className="font-bold mb-1" style={{ fontSize: 14, color: NAVY }}>Schedule a pause</p>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Pick the start and end date for your break.</p>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal h-11", !range?.from && "text-muted-foreground")}
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
                  mode="range" selected={range} onSelect={setRange} numberOfMonths={1}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {days > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Pausing for <span className="font-medium text-foreground">{days} day{days === 1 ? "" : "s"}</span>.
              </p>
            )}

            <button
              onClick={handlePause}
              disabled={!range?.from || !range?.to}
              className="mt-3 w-full rounded-2xl border-none cursor-pointer disabled:opacity-50"
              style={{ background: RED, padding: "13px", fontSize: 14, fontWeight: 700, color: "#fff" }}
            >
              Pause My Classes
            </button>
          </div>
        )}

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
              <Popover>
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
                    mode="range" selected={range} onSelect={setRange} numberOfMonths={2}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              {days > 0 && (
                <p className="text-sm text-muted-foreground">
                  You're pausing <span className="font-medium text-foreground">{days} day{days === 1 ? "" : "s"}</span>.
                </p>
              )}
            </div>
            <Button onClick={handlePause} disabled={!range?.from || !range?.to || !!activePause} className="h-11">
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
