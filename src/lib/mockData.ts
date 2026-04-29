export type PlanType = "1-month" | "3-month" | "6-month";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "client" | "admin";
}

export interface PlanDetails {
  type: PlanType;
  startDate: string; // ISO
  nextPaymentDate: string;
  amount: number;
  paymentMethod: string;
  autoRenew: boolean;
}

export interface PauseRecord {
  id: string;
  from: string;
  to: string;
  status: "active" | "completed";
}

export interface HealthReport {
  id: string;
  title: string;
  date: string;
}

export interface ProfileInfo {
  society: string;
  timeSlot: string;
  trainerName: string;
  trainerSpecialty: string;
}

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  trainer: string;
  status: "active" | "paused";
}

export const mockClient: MockUser = {
  id: "u_1",
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "+91 98765 43210",
  role: "client",
};

export const mockAdmin: MockUser = {
  id: "u_admin",
  name: "Aditi Rao",
  email: "admin@fitved.com",
  phone: "+91 99000 11122",
  role: "admin",
};

export const mockPlan: PlanDetails = {
  type: "3-month",
  startDate: "2026-02-15",
  nextPaymentDate: "2026-05-15",
  amount: 7499,
  paymentMethod: "UPI • priya@okhdfc",
  autoRenew: true,
};

export const mockPauses: PauseRecord[] = [
  { id: "p_1", from: "2026-03-10", to: "2026-03-14", status: "completed" },
  { id: "p_2", from: "2026-01-22", to: "2026-01-25", status: "completed" },
];

export const mockReports: HealthReport[] = [
  { id: "r_3", title: "April Wellness Report", date: "2026-04-18" },
  { id: "r_2", title: "March Wellness Report", date: "2026-03-20" },
  { id: "r_1", title: "February Baseline Report", date: "2026-02-18" },
];

export const mockProfile: ProfileInfo = {
  society: "Prestige Lakeside Habitat, Tower 4",
  timeSlot: "7:30 – 8:30 AM",
  trainerName: "Arjun Mehta",
  trainerSpecialty: "Yoga & Mobility",
};

export const mockNotification = {
  message: "Your next session is tomorrow at 7:30 AM with Coach Arjun.",
};

export const mockClients: ClientRow[] = [
  { id: "c_1", name: "Priya Sharma", email: "priya@example.com", plan: "3-month", trainer: "Arjun Mehta", status: "active" },
  { id: "c_2", name: "Rajesh Iyer", email: "rajesh@example.com", plan: "6-month", trainer: "Neha Kapoor", status: "active" },
  { id: "c_3", name: "Sunita Menon", email: "sunita@example.com", plan: "1-month", trainer: "Arjun Mehta", status: "paused" },
  { id: "c_4", name: "Mohan Verma", email: "mohan@example.com", plan: "3-month", trainer: "Vikram Singh", status: "active" },
  { id: "c_5", name: "Lata Krishnan", email: "lata@example.com", plan: "6-month", trainer: "Neha Kapoor", status: "active" },
  { id: "c_6", name: "Ravi Pillai", email: "ravi@example.com", plan: "1-month", trainer: "Vikram Singh", status: "paused" },
];

export const trainers = ["Arjun Mehta", "Neha Kapoor", "Vikram Singh", "Sana Qureshi"];

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24))) + 1;
}
