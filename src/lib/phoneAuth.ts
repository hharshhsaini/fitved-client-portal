// Helpers to map phone+DOB onto Supabase email/password auth.
// Customers don't have real emails — we synthesize one from their phone.

export const PHONE_EMAIL_DOMAIN = "phone.fitved.com";

export function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidPhone(input: string): boolean {
  const p = normalizePhone(input);
  return p.length === 10;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input || "").trim());
}

export function phoneToEmail(input: string): string {
  return `${normalizePhone(input)}@${PHONE_EMAIL_DOMAIN}`;
}

export function emailLooksLikePhone(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

// DOB → password. We store as DDMMYYYY (8 digits).
export function dobToPassword(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

export function isValidDob(date: Date | null | undefined): boolean {
  if (!date || isNaN(date.getTime())) return false;
  const now = new Date();
  if (date > now) return false;
  const ageMs = now.getTime() - date.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears >= 13 && ageYears <= 120;
}

// Parse DDMMYYYY string into a Date.
export function parseDobInput(ddmmyyyy: string): Date | null {
  const s = (ddmmyyyy || "").replace(/\D/g, "");
  if (s.length !== 8) return null;
  const dd = parseInt(s.slice(0, 2), 10);
  const mm = parseInt(s.slice(2, 4), 10);
  const yyyy = parseInt(s.slice(4, 8), 10);
  const d = new Date(yyyy, mm - 1, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return d;
}
