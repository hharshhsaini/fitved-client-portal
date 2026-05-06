// Session-based plan helpers
// "Training days" use full English weekday names: "Monday", "Tuesday", ...

export const WEEKDAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;
export type Weekday = typeof WEEKDAYS[number];

export const SESSION_OPTIONS = [8, 12, 36, 72] as const;
export type SessionCount = typeof SESSION_OPTIONS[number];

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

export const isoDate = toIso;
export const parseIsoDate = toDate;
