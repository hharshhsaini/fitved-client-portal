import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, IndianRupee, Wallet, AlertTriangle, UserCog,
  CalendarOff, CalendarX, Clock, Phone, CheckCircle2, ChevronRight,
} from "lucide-react";

const RENEWAL_WINDOW = 14; // days ahead to surface expiring plans

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => new Date(iso + "T12:00:00");
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(n));

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
  </svg>
);

function phoneLinks(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return { tel: `tel:${digits}`, wa: `https://wa.me/${intl}` };
}

type RenewalRow = { userId: string; name: string; phone: string | null; society: string; endDate: string; amount: number; autoRenew: boolean; renewalDate: string };
type GapRow = { userId: string; name: string; phone: string | null; missing: string[] };
type PausedRow = { userId: string; name: string; society: string; timeSlot: string | null; from: string; to: string };
type OffRow = { id: string; trainer: string; from: string; to: string; slot: string | null; reason: string | null };
type LapsedRow = { userId: string; name: string; phone: string | null; society: string; endDate: string; amount: number };

export default function AdminDashboard() {
  const navigate = useNavigate();

  const today = new Date();
  const todayISO = toISO(today);
  const windowEndISO = (() => { const d = new Date(); d.setDate(d.getDate() + RENEWAL_WINDOW); return toISO(d); })();
  const monthStartISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const daysUntil = (iso: string) => Math.round((parseISO(iso).getTime() - parseISO(todayISO).getTime()) / 86400000);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r) => r.user_id);

      const [profilesRes, plansRes, pausesRes, billingRes, societiesRes, trainersRes, offRes] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, name, phone, society_id, trainer_id, time_slot").in("id", ids) : Promise.resolve({ data: [] as any[] }),
        ids.length ? supabase.from("plans").select("user_id, amount, status, start_date, end_date, auto_renew, renewal_date").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
        ids.length ? supabase.from("pauses").select("user_id, from_date, to_date, status").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
        supabase.from("billing_history").select("amount, payment_date").gte("payment_date", monthStartISO),
        supabase.from("societies").select("id, name"),
        supabase.from("trainers").select("id, name"),
        (supabase as any).from("trainer_off_times").select("id, trainer_id, from_date, to_date, time_slot, reason").gte("to_date", todayISO).order("from_date"),
      ]);

      const profiles = (profilesRes.data ?? []) as any[];
      const plans = (plansRes.data ?? []) as any[];
      const pauses = (pausesRes.data ?? []) as any[];
      const billing = (billingRes.data ?? []) as any[];
      const societies = (societiesRes.data ?? []) as any[];
      const trainers = (trainersRes.data ?? []) as any[];
      const offRaw = (offRes.data ?? []) as any[];

      const socName = new Map(societies.map((s) => [s.id, s.name]));
      const trName = new Map(trainers.map((t) => [t.id, t.name]));
      const profName = new Map(profiles.map((p) => [p.id, p.name ?? "—"]));
      const profPhone = new Map(profiles.map((p) => [p.id, p.phone ?? null]));
      const profSlot = new Map(profiles.map((p) => [p.id, p.time_slot ?? null]));
      const profSoc = new Map(profiles.map((p) => [p.id, p.society_id ? (socName.get(p.society_id) ?? "—") : "—"]));

      // ── Headline numbers ───────────────────────────────────────────
      const activeUsers = new Set(
        plans.filter((p) => (p.status === "active" || p.status === "paused") && p.end_date >= todayISO).map((p) => p.user_id)
      );
      const activeClients = activeUsers.size;

      let mrr = 0;
      for (const p of plans) {
        if (p.status === "active" && p.end_date >= todayISO) {
          const months = Math.max(1, Math.round((parseISO(p.end_date).getTime() - parseISO(p.start_date).getTime()) / 86400000 / 30));
          mrr += Number(p.amount) / months;
        }
      }

      const collectedThisMonth = billing.reduce((s, b) => s + Number(b.amount), 0);

      // ── Attention queue ────────────────────────────────────────────
      const renewals: RenewalRow[] = plans
        .filter((p) => p.status === "active" && p.end_date >= todayISO && p.end_date <= windowEndISO)
        .map((p) => ({
          userId: p.user_id,
          name: profName.get(p.user_id) ?? "—",
          phone: profPhone.get(p.user_id) ?? null,
          society: profSoc.get(p.user_id) ?? "—",
          endDate: p.end_date,
          amount: Number(p.amount),
          autoRenew: !!p.auto_renew,
          renewalDate: p.renewal_date,
        }))
        .sort((a, b) => a.endDate.localeCompare(b.endDate));

      // Not renewed = each client's most recent plan has already ended,
      // so they have no current coverage and haven't been renewed.
      const latestPlan = new Map<string, any>();
      for (const p of plans) {
        const cur = latestPlan.get(p.user_id);
        if (!cur || p.end_date > cur.end_date) latestPlan.set(p.user_id, p);
      }
      const notRenewed: LapsedRow[] = [...latestPlan.values()]
        .filter((p) => p.end_date < todayISO && p.status !== "paused")
        .map((p) => ({
          userId: p.user_id,
          name: profName.get(p.user_id) ?? "—",
          phone: profPhone.get(p.user_id) ?? null,
          society: profSoc.get(p.user_id) ?? "—",
          endDate: p.end_date,
          amount: Number(p.amount),
        }))
        .sort((a, b) => b.endDate.localeCompare(a.endDate)); // most recently lapsed first

      const usersWithPlan = new Set(plans.map((p) => p.user_id));
      const gaps: GapRow[] = profiles
        .map((p) => {
          const missing: string[] = [];
          if (!usersWithPlan.has(p.id)) missing.push("No plan");
          if (!p.trainer_id) missing.push("No trainer");
          if (!p.society_id) missing.push("No society");
          return { userId: p.id, name: p.name ?? "—", phone: p.phone ?? null, missing };
        })
        .filter((g) => g.missing.length > 0)
        .sort((a, b) => b.missing.length - a.missing.length);

      const paused: PausedRow[] = pauses
        .filter((p) => p.status === "active" && p.to_date >= todayISO)
        .map((p) => ({
          userId: p.user_id,
          name: profName.get(p.user_id) ?? "—",
          society: profSoc.get(p.user_id) ?? "—",
          timeSlot: profSlot.get(p.user_id) ?? null,
          from: p.from_date,
          to: p.to_date,
        }))
        .sort((a, b) => a.to.localeCompare(b.to));

      const offTimes: OffRow[] = offRaw.map((o) => ({
        id: o.id,
        trainer: trName.get(o.trainer_id) ?? "Unknown trainer",
        from: o.from_date,
        to: o.to_date,
        slot: o.time_slot ?? null,
        reason: o.reason ?? null,
      }));

      return { activeClients, mrr, collectedThisMonth, renewals, notRenewed, gaps, paused, offTimes };
    },
  });

  const stats = [
    { label: "Active clients", value: data ? String(data.activeClients) : "—", icon: Users, hint: "in a running program" },
    { label: "MRR", value: data ? inr(data.mrr) : "—", icon: IndianRupee, hint: "normalized monthly" },
    { label: "Collected this month", value: data ? inr(data.collectedThisMonth) : "—", icon: Wallet, hint: format(today, "MMMM yyyy") },
  ];

  const lapsing = data?.renewals.filter((r) => !r.autoRenew) ?? [];
  const autoRenewing = data?.renewals.filter((r) => r.autoRenew) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Overview</h1>
        <p className="mt-1 text-muted-foreground">What needs your attention today.</p>
      </header>

      {/* ── Headline numbers ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="font-display text-2xl leading-tight">{isLoading ? "…" : s.value}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <h2 className="font-display text-xl">Attention queue</h2>
      </div>

      {/* ── Renewals due ─────────────────────────────────────────────── */}
      <Section
        icon={AlertTriangle}
        title="Renewals due"
        subtitle={`Plans ending in the next ${RENEWAL_WINDOW} days`}
        count={data?.renewals.length ?? 0}
        accent="warning"
        loading={isLoading}
      >
        {lapsing.length > 0 && (
          <>
            <GroupLabel>Will lapse — needs a call ({lapsing.length})</GroupLabel>
            {lapsing.map((r) => (
              <RenewalLine key={`l-${r.userId}`} r={r} days={daysUntil(r.endDate)} onOpen={() => navigate(`/admin/customers/${r.userId}`)} danger />
            ))}
          </>
        )}
        {autoRenewing.length > 0 && (
          <>
            <GroupLabel>Auto-renews — confirm payment ({autoRenewing.length})</GroupLabel>
            {autoRenewing.map((r) => (
              <RenewalLine key={`a-${r.userId}`} r={r} days={daysUntil(r.endDate)} onOpen={() => navigate(`/admin/customers/${r.userId}`)} />
            ))}
          </>
        )}
      </Section>

      {/* ── Not renewed ──────────────────────────────────────────────── */}
      <Section
        icon={CalendarX}
        title="Not renewed"
        subtitle="Plans that have ended without a renewal"
        count={data?.notRenewed.length ?? 0}
        accent="warning"
        loading={isLoading}
      >
        {data?.notRenewed.map((r) => {
          const links = phoneLinks(r.phone);
          const ago = Math.round((parseISO(todayISO).getTime() - parseISO(r.endDate).getTime()) / 86400000);
          return (
            <button
              key={r.userId}
              onClick={() => navigate(`/admin/customers/${r.userId}`)}
              className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {r.society} · {inr(r.amount)} · ended {format(parseISO(r.endDate), "d MMM")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="destructive" className="whitespace-nowrap">{ago}d ago</Badge>
                {links && <ContactButtons links={links} />}
              </div>
            </button>
          );
        })}
      </Section>

      {/* ── Onboarding gaps ──────────────────────────────────────────── */}
      <Section
        icon={UserCog}
        title="Onboarding gaps"
        subtitle="Clients missing a plan, trainer, or society"
        count={data?.gaps.length ?? 0}
        accent="muted"
        loading={isLoading}
      >
        {data?.gaps.map((g) => {
          const links = phoneLinks(g.phone);
          return (
            <button
              key={g.userId}
              onClick={() => navigate(`/admin/customers/${g.userId}`)}
              className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{g.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {g.missing.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {links && <ContactButtons links={links} />}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </Section>

      {/* ── Currently paused ─────────────────────────────────────────── */}
      <Section
        icon={CalendarOff}
        title="Currently paused"
        subtitle="Clients on an active pause"
        count={data?.paused.length ?? 0}
        accent="muted"
        loading={isLoading}
      >
        {data?.paused.map((p) => (
          <button
            key={`${p.userId}-${p.from}`}
            onClick={() => navigate(`/admin/customers/${p.userId}`)}
            className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.society}{p.timeSlot ? ` · ${p.timeSlot}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                {format(parseISO(p.from), "d MMM")} → {format(parseISO(p.to), "d MMM")}
              </p>
              <p className="text-xs font-medium">Back {format(parseISO(p.to), "d MMM")}</p>
            </div>
          </button>
        ))}
      </Section>

      {/* ── Trainer off-times ────────────────────────────────────────── */}
      <Section
        icon={Clock}
        title="Trainer off-times"
        subtitle="Upcoming trainer unavailability"
        count={data?.offTimes.length ?? 0}
        accent="muted"
        loading={isLoading}
      >
        {data?.offTimes.map((o) => {
          const sameDay = o.from === o.to;
          const isNow = o.from <= todayISO;
          return (
            <div key={o.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{o.trainer}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sameDay ? format(parseISO(o.from), "PPP") : `${format(parseISO(o.from), "PP")} → ${format(parseISO(o.to), "PP")}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {o.slot ? o.slot : "All slots"}{o.reason ? ` · ${o.reason}` : ""}
                </p>
              </div>
              <Badge variant={isNow ? "default" : "secondary"} className="shrink-0">
                {isNow ? "Off now" : "Upcoming"}
              </Badge>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

/* ── Building blocks ──────────────────────────────────────────────── */

function Section({
  icon: Icon, title, subtitle, count, accent, loading, children,
}: {
  icon: React.ElementType; title: string; subtitle: string; count: number;
  accent: "warning" | "muted"; loading?: boolean; children: React.ReactNode;
}) {
  const accentCls = accent === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground";
  return (
    <Card className="rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accentCls}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg">{title}</p>
            {count > 0 && <Badge variant={accent === "warning" ? "default" : "secondary"}>{count}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-2">Loading…</p>
      ) : count === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> All clear
        </p>
      ) : (
        <div className="divide-y divide-border">{children}</div>
      )}
    </Card>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">{children}</p>;
}

function ContactButtons({ links }: { links: { tel: string; wa: string } }) {
  return (
    <>
      <a
        href={links.tel}
        onClick={(e) => e.stopPropagation()}
        className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Call"
      >
        <Phone className="h-4 w-4" />
      </a>
      <a
        href={links.wa}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366]/15 text-[#1da851] hover:bg-[#25D366]/25 transition-colors"
        title="WhatsApp"
      >
        <WhatsAppIcon size={16} />
      </a>
    </>
  );
}

function RenewalLine({
  r, days, onOpen, danger,
}: {
  r: RenewalRow; days: number; onOpen: () => void; danger?: boolean;
}) {
  const links = phoneLinks(r.phone);
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{r.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {r.society} · {inr(r.amount)}
          {r.autoRenew ? ` · renews ${format(parseISO(r.renewalDate), "d MMM")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant={danger ? "destructive" : "outline"} className="whitespace-nowrap">
          {days <= 0 ? "ends today" : `${days}d left`}
        </Badge>
        {links && <ContactButtons links={links} />}
      </div>
    </button>
  );
}
