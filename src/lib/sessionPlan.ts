// Session-based plan helpers
// "Training days" use full English weekday names: "Monday", "Tuesday", ...

export const WEEKDAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;
export type Weekday = typeof WEEKDAYS[number];

export const SESSION_OPTIONS = [8, 12, 36, 72] as const;
export type SessionCount = typeof SESSION_OPTIONS[number];

export function formatPlanName(sessions: number | null | undefined): string {
  if (!sessions) return "Not assigned";
  if (sessions === 8) return "8 sessions · Trial / Recovery";
  if (sessions === 12) return "1 month · 12 sessions";
  if (sessions === 36) return "3 months · 36 sessions";
  if (sessions === 72) return "6 months · 72 sessions";
  return `${sessions} sessions`;
}

function weekdayName(d: Date): Weekday {
  return d.toLocaleDateString("en-US", { weekday: "long" }) as Weekday;
}

function toDate(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input + (input.length === 10 ? "T00:00:00" : "")) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Date of the LAST training session.
 */
export function calculatePlanEndDate(
  startDate: string | Date,
  totalSessions: number,
  trainingDays: string[],
): Date {
  if (!trainingDays.length || totalSessions <= 0) return toDate(startDate);
  const current = toDate(startDate);
  let sessionsCompleted = 0;
  // Hard guard against infinite loops
  for (let i = 0; i < 365 * 5; i++) {
    if (trainingDays.includes(weekdayName(current))) {
      sessionsCompleted++;
      if (sessionsCompleted >= totalSessions) return current;
    }
    current.setDate(current.getDate() + 1);
  }
  return current;
}

/**
 * Date of the FIRST training session of the NEXT plan.
 */
export function calculatePlanRenewalDate(
  planEndDate: string | Date,
  trainingDays: string[],
): Date {
  if (!trainingDays.length) return toDate(planEndDate);
  const renewal = toDate(planEndDate);
  renewal.setDate(renewal.getDate() + 1);
  for (let i = 0; i < 60; i++) {
    if (trainingDays.includes(weekdayName(renewal))) return renewal;
    renewal.setDate(renewal.getDate() + 1);
  }
  return renewal;
}

/**
 * Count training-day occurrences inside [from, to] inclusive.
 * Used to compute pause-extension (lost training days).
 */
export function countTrainingDaysInRange(
  from: string | Date,
  to: string | Date,
  trainingDays: string[],
): number {
  const start = toDate(from);
  const end = toDate(to);
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (trainingDays.includes(weekdayName(cursor))) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Push end date forward by N training days (preserving the weekly pattern).
 */
export function extendEndDateBySessions(
  endDate: string | Date,
  extraSessions: number,
  trainingDays: string[],
): Date {
  if (extraSessions <= 0 || !trainingDays.length) return toDate(endDate);
  const current = toDate(endDate);
  let added = 0;
  for (let i = 0; i < 365 * 5; i++) {
    current.setDate(current.getDate() + 1);
    if (trainingDays.includes(weekdayName(current))) {
      added++;
      if (added >= extraSessions) return current;
    }
  }
  return current;
}

/** First hour mentioned in a free-text slot ("6–7 AM", "7:00 AM – 8:00 AM") as 0–23, or null. */
export function slotStartHour(slot: string | null): number | null {
  if (!slot) return null;
  const m = slot.match(/(\d{1,2})(?::\d{2})?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  if (h > 23) return null;
  // Meridiem may only be written once at the end ("6–7 AM") — borrow it.
  const afterStart = slot.slice((m.index ?? 0) + m[0].length);
  const mer = afterStart.match(/AM|PM/i)?.[0]?.toUpperCase()
    ?? slot.match(/AM|PM/i)?.[0]?.toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h;
}

/**
 * Does a trainer off-time apply to this customer's batch?
 * Off-time slots are typed free-text, so compare parsed start hours instead of
 * raw strings. When either side can't be parsed, err on informing the customer.
 */
export function offTimeAffectsSlot(offSlot: string | null, customerSlot: string | null): boolean {
  if (!offSlot) return true; // whole day off
  const a = slotStartHour(offSlot);
  const b = slotStartHour(customerSlot);
  if (a == null || b == null) return true;
  return a === b;
}

export interface DateRangeLike { from: string; to: string }
export interface OffTimeLike { from_date: string; to_date: string; time_slot: string | null }

/**
 * Training days lost inside [start, end] to customer pauses and trainer
 * off-days, counted per-day so an overlapping pause + off-day is only counted
 * once (as paused). Pause carry-forward is capped elsewhere at 1/3 of the
 * plan; trainer off-days are the studio's fault, so they are never capped.
 */
export function countLostTrainingDays(
  start: string | Date,
  end: string | Date,
  trainingDays: string[],
  pauses: DateRangeLike[],
  offTimes: OffTimeLike[],
  customerSlot: string | null,
): { pausedLost: number; offLost: number } {
  const s = toDate(start);
  const e = toDate(end);
  let pausedLost = 0;
  let offLost = 0;
  if (e < s || !trainingDays.length) return { pausedLost, offLost };
  const cursor = new Date(s);
  while (cursor <= e) {
    if (trainingDays.includes(weekdayName(cursor))) {
      const iso = toIso(cursor);
      if (pauses.some((p) => iso >= p.from && iso <= p.to)) {
        pausedLost++;
      } else if (
        offTimes.some((o) => iso >= o.from_date && iso <= o.to_date && offTimeAffectsSlot(o.time_slot, customerSlot))
      ) {
        offLost++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { pausedLost, offLost };
}

export const isoDate = toIso;
export const parseIsoDate = toDate;
