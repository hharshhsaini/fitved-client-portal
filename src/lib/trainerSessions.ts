/**
 * Trainer monthly session counting.
 *
 * A trainer "takes a session" when a batch (society + time slot) has at least
 * one client scheduled that day — the client's plan covers the date, the date
 * is one of their training days, and they aren't paused — and the trainer
 * isn't off for that slot. Extra (make-up) classes add on top, and the admin
 * can apply a manual +/- correction per month.
 *
 *   total = scheduled batch-sessions − nothing (offs already excluded)
 *         + extra classes taken
 *         + admin adjustment
 *
 * Only days up to "today" count — future scheduled classes aren't "taken" yet.
 */

import { offTimeAffectsSlot } from "@/lib/sessionPlan";

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export interface TrainerClientRow {
  id: string;
  society_id: string | null;
  time_slot: string | null;
}
export interface PlanWindowRow {
  user_id: string;
  start_date: string;
  end_date: string;
  training_days: string[] | null;
}
export interface PauseRangeRow {
  client_id: string;
  from_date: string;
  to_date: string;
}
export interface OffTimeRangeRow {
  from_date: string;
  to_date: string;
  time_slot: string | null;
}
export interface CompClassRow {
  client_id: string;
  class_date: string;
}

export interface MonthlySessionBreakdown {
  monthKey: string;   // "YYYY-MM"
  scheduled: number;  // batch-sessions actually held per the schedule
  missedToOffDays: number; // batch-sessions that would have run but the trainer was off
  extra: number;      // make-up classes taken
  adjustment: number; // admin correction
  total: number;      // scheduled + extra + adjustment
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/** Compute one trainer's session count for a given "YYYY-MM" month. */
export function trainerSessionsForMonth(
  monthKey: string,
  todayISO: string,
  clients: TrainerClientRow[],
  plansByUser: Map<string, PlanWindowRow[]>,
  pauses: PauseRangeRow[],
  offs: OffTimeRangeRow[],
  comps: CompClassRow[],
  adjustment = 0,
): MonthlySessionBreakdown {
  const [y, m] = [Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))];
  const daysInMonth = new Date(y, m, 0).getDate();

  const pausesByClient = new Map<string, PauseRangeRow[]>();
  for (const p of pauses) {
    const list = pausesByClient.get(p.client_id) ?? [];
    list.push(p);
    pausesByClient.set(p.client_id, list);
  }

  let scheduled = 0;
  let missedToOffDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    if (iso > todayISO) break; // future classes aren't "taken" yet
    const weekday = WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];

    // Batches (society|slot) with at least one client scheduled today
    const taught = new Set<string>();
    const blockedByOff = new Set<string>();

    for (const c of clients) {
      const plans = plansByUser.get(c.id) ?? [];
      const scheduledToday = plans.some(
        (p) =>
          iso >= p.start_date &&
          iso <= p.end_date &&
          (p.training_days ?? []).includes(weekday),
      );
      if (!scheduledToday) continue;

      const paused = (pausesByClient.get(c.id) ?? []).some(
        (p) => iso >= p.from_date && iso <= p.to_date,
      );
      if (paused) continue;

      const batchKey = `${c.society_id ?? "?"}|${c.time_slot ?? "?"}`;
      const trainerOff = offs.some(
        (o) => iso >= o.from_date && iso <= o.to_date && offTimeAffectsSlot(o.time_slot, c.time_slot),
      );
      if (trainerOff) blockedByOff.add(batchKey);
      else taught.add(batchKey);
    }

    scheduled += taught.size;
    missedToOffDays += blockedByOff.size;
  }

  // Extra classes: one session per distinct (date, batch) — a make-up recorded
  // for a whole batch creates one row per client, which collapses back here.
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const extraKeys = new Set<string>();
  for (const cc of comps) {
    if (!cc.class_date.startsWith(monthKey) || cc.class_date > todayISO) continue;
    const c = clientById.get(cc.client_id);
    extraKeys.add(`${cc.class_date}|${c?.society_id ?? "?"}|${c?.time_slot ?? "?"}`);
  }
  const extra = extraKeys.size;

  return {
    monthKey,
    scheduled,
    missedToOffDays,
    extra,
    adjustment,
    total: scheduled + extra + adjustment,
  };
}

/** Per-day activity for the calendar view: what happened (or will) each day. */
export interface DayActivity {
  date: string;       // "YYYY-MM-DD"
  held: number;       // batch classes taken (past/today only)
  missedOff: number;  // batch classes lost to the trainer's off-time
  extra: number;      // make-up classes recorded that day
  upcoming: number;   // batch classes scheduled after today
  presentIds: string[]; // clients who attended (or will — for future days)
  absentIds: string[];  // clients scheduled that day but paused (absent)
  offIds: string[];     // clients whose class was lost to the trainer's off-time
}

export function trainerMonthActivity(
  monthKey: string,
  todayISO: string,
  clients: TrainerClientRow[],
  plansByUser: Map<string, PlanWindowRow[]>,
  pauses: PauseRangeRow[],
  offs: OffTimeRangeRow[],
  comps: CompClassRow[],
): DayActivity[] {
  const [y, m] = [Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))];
  const daysInMonth = new Date(y, m, 0).getDate();

  const pausesByClient = new Map<string, PauseRangeRow[]>();
  for (const p of pauses) {
    const list = pausesByClient.get(p.client_id) ?? [];
    list.push(p);
    pausesByClient.set(p.client_id, list);
  }
  const clientById = new Map(clients.map((c) => [c.id, c]));
  // Distinct (date|batch) extra classes, bucketed per day
  const extraByDay = new Map<string, Set<string>>();
  for (const cc of comps) {
    if (!cc.class_date.startsWith(monthKey)) continue;
    const c = clientById.get(cc.client_id);
    const set = extraByDay.get(cc.class_date) ?? new Set<string>();
    set.add(`${c?.society_id ?? "?"}|${c?.time_slot ?? "?"}`);
    extraByDay.set(cc.class_date, set);
  }

  const out: DayActivity[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    const weekday = WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
    const taught = new Set<string>();
    const blockedByOff = new Set<string>();
    for (const c of clients) {
      const plans = plansByUser.get(c.id) ?? [];
      const scheduledToday = plans.some(
        (p) => iso >= p.start_date && iso <= p.end_date && (p.training_days ?? []).includes(weekday),
      );
      if (!scheduledToday) continue;
      const paused = (pausesByClient.get(c.id) ?? []).some(
        (p) => iso >= p.from_date && iso <= p.to_date,
      );
      if (paused) continue;
      const batchKey = `${c.society_id ?? "?"}|${c.time_slot ?? "?"}`;
      const trainerOff = offs.some(
        (o) => iso >= o.from_date && iso <= o.to_date && offTimeAffectsSlot(o.time_slot, c.time_slot),
      );
      if (trainerOff) blockedByOff.add(batchKey);
      else taught.add(batchKey);
    }
    const future = iso > todayISO;
    out.push({
      date: iso,
      held: future ? 0 : taught.size,
      missedOff: blockedByOff.size,
      extra: future ? 0 : (extraByDay.get(iso)?.size ?? 0),
      upcoming: future ? taught.size : 0,
    });
  }
  return out;
}

/** "YYYY-MM" keys for the current month and the previous `count-1` months. */
export function recentMonthKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return keys;
}

export function monthLabel(key: string): string {
  return new Date(key + "-02T12:00:00").toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
