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

export default function Pause() {
  const { activePause, history, pause, resume } = usePauseStore();
  const [range, setRange] = useState<DateRange | undefined>();

  const days = range?.from && range?.to ? daysBetween(range.from.toISOString(), range.to.toISOString()) : 0;

  const handlePause = async () => {
    if (!range?.from || !range?.to) {
      toast.error("Please select a start and end date");
      return;
    }
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

  return (
    <div className="space-y-6">
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
                  className={cn(
                    "w-full sm:w-[320px] justify-start text-left font-normal h-11",
                    !range?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from ? (
                    range.to ? (
                      <>{format(range.from, "PP")} — {format(range.to, "PP")}</>
                    ) : (
                      format(range.from, "PP")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
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
  );
}
