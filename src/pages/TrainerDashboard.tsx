import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2, Users, Clock, ChevronRight, ArrowLeft,
  CalendarOff, Plus, Trash2, UserCircle2, MapPin, X,
  Phone as PhoneIcon, Eye, ShieldAlert, LogOut,
} from "lucide-react";
import { TrainerPauses } from "@/components/dashboard/TrainerPauses";
import { TrainerClientPauseModal } from "@/components/dashboard/TrainerClientPauseModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY        = "#1E3A5F";
const NAVY_LIGHT  = "#2d5a8e";
const GOLD        = "#f0a720";
const MUTED       = "#8a8f9e";
const BORDER      = "rgba(30,58,95,0.08)";
const GREEN       = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const RED         = "#ef4444";
const RED_LIGHT   = "#fee2e2";
const BG          = "#f4f2ee";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrainerRow { id: string; name: string; specialization: string | null; active: boolean; }
interface SocietyRow { id: string; name: string; address: string | null; }
interface BatchRow   { time_slot: string | null; client_count: number; }
interface ClientRow  { 
  id: string; 
  name: string | null; 
  phone: string | null; 
  society_id: string | null; 
  time_slot: string | null; 
  end_date: string | null;
  training_days: string[] | null;
  is_paused_today: boolean | null;
}

/** Build tel: / wa.me links from a stored phone number */
function phoneLinks(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return { tel: `tel:+${intl}`, wa: `https://wa.me/${intl}` };
}
interface OffTimeRow {
  id: string; from_date: string; to_date: string;
  time_slot: string | null; reason: string | null;
}

type MobileTab = "societies" | "offtime";
type OffMode   = "days" | "slot";

export default function TrainerDashboard() {
  const { user, role, signOut } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  // Admin "view as trainer": /trainer?as=<trainer_id>. Read-only.
  const viewAsId = role === "admin" ? searchParams.get("as") : null;
  const isViewAs = !!viewAsId;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [tab, setTab]                         = useState<MobileTab>("societies");
  const [selectedSociety, setSelectedSociety] = useState<SocietyRow | null>(null);
  const [offMode, setOffMode]                 = useState<OffMode>("days");
  const [dateRange, setDateRange]             = useState<DateRange | undefined>();
  const [singleDate, setSingleDate]           = useState<Date | undefined>();
  const [slotInput, setSlotInput]             = useState("");
  const [reason, setReason]                   = useState("");
  const [calOpen, setCalOpen]                 = useState(false);
  const [singleCalOpen, setSingleCalOpen]     = useState(false);
  const [pauseClient, setPauseClient]         = useState<{ id: string; name: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: trainer, isLoading: trainerLoading } = useQuery<TrainerRow | null>({
    queryKey: ["my-trainer", user?.id, viewAsId],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase.from("trainers").select("id, name, specialization, active");
      const { data } = viewAsId
        ? await q.eq("id", viewAsId).maybeSingle()
        : await q.or(`user_id.eq.${user!.id},id.eq.${user!.id}`).maybeSingle();
      return (data as TrainerRow | null) ?? null;
    },
  });

  const { data: societies = [] } = useQuery<SocietyRow[]>({
    queryKey: ["trainer-societies", trainer?.id],
    enabled: !!trainer,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_societies")
        .select("societies(id, name, address)")
        .eq("trainer_id", trainer!.id);
      return (data ?? []).map((r: any) => r.societies).filter(Boolean) as SocietyRow[];
    },
  });

  // Roster via column-safe RPC — trainers can never read client DOB or plan data.
  const { data: allClients = [], isLoading: clientsLoading } = useQuery<ClientRow[]>({
    queryKey: ["trainer-clients", trainer?.id],
    enabled: !!trainer,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_trainer_clients",
        { _trainer_id: viewAsId || trainer!.id }
      );
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  // Batches per society, derived client-side from the roster
  const batchMap = useMemo<Record<string, BatchRow[]>>(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const c of allClients) {
      if (!c.society_id) continue;
      const slot = c.time_slot ?? "Unassigned";
      if (!map[c.society_id]) map[c.society_id] = {};
      map[c.society_id][slot] = (map[c.society_id][slot] ?? 0) + 1;
    }
    const result: Record<string, BatchRow[]> = {};
    for (const [sid, slots] of Object.entries(map)) {
      result[sid] = Object.entries(slots).map(([time_slot, client_count]) => ({ time_slot, client_count }));
    }
    return result;
  }, [allClients]);

  const clients = useMemo(
    () =>
      selectedSociety
        ? allClients
            .filter((c) => c.society_id === selectedSociety.id)
            .sort((a, b) => (a.time_slot ?? "").localeCompare(b.time_slot ?? "") || (a.name ?? "").localeCompare(b.name ?? ""))
        : [],
    [allClients, selectedSociety]
  );

  const today = new Date().toISOString().slice(0, 10);
  const { data: offTimes = [] } = useQuery<OffTimeRow[]>({
    queryKey: ["trainer-off-times", trainer?.id],
    enabled: !!trainer,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trainer_off_times")
        .select("*")
        .eq("trainer_id", trainer!.id)
        .gte("to_date", today)
        .order("from_date");
      return (data ?? []) as OffTimeRow[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addOff = useMutation({
    mutationFn: async () => {
      if (!trainer) throw new Error("Trainer not found");
      const localDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (offMode === "days") {
        if (!dateRange?.from || !dateRange?.to) throw new Error("Pick a date range");
        const { error } = await (supabase as any).from("trainer_off_times").insert({
          trainer_id: trainer.id,
          from_date:  localDate(dateRange.from),
          to_date:    localDate(dateRange.to),
          time_slot:  null,
          reason:     reason.trim() || null,
        });
        if (error) throw new Error(error.message);
      } else {
        if (!singleDate) throw new Error("Pick a date");
        if (!slotInput.trim()) throw new Error("Enter the time slot");
        const { error } = await (supabase as any).from("trainer_off_times").insert({
          trainer_id: trainer.id,
          from_date:  localDate(singleDate),
          to_date:    localDate(singleDate),
          time_slot:  slotInput.trim(),
          reason:     reason.trim() || null,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Off time saved");
      setDateRange(undefined); setSingleDate(undefined);
      setSlotInput(""); setReason("");
      qc.invalidateQueries({ queryKey: ["trainer-off-times"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const removeOff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("trainer_off_times").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["trainer-off-times"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove"),
  });

  // ── Account states (orphan role / deactivated) ───────────────────────────
  if (trainerLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white p-8 text-center"
          style={{ border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(30,58,95,0.07)" }}>
          <div className="mx-auto mb-4 grid place-items-center rounded-full"
            style={{ width: 64, height: 64, background: "rgba(240,167,32,0.15)" }}>
            <ShieldAlert size={28} color={GOLD} />
          </div>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 600, color: NAVY }}>
            {isViewAs ? "Trainer not found" : role === "admin" ? "Pick a trainer to view" : "Account setup pending"}
          </p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
            {isViewAs
              ? "No trainer profile exists for this ID."
              : role === "admin"
              ? "Use the eye icon in Admin → Trainers to view the app as a specific trainer."
              : "Your trainer profile hasn't been set up yet. Please contact your admin to complete the setup."}
          </p>
        </div>
      </div>
    );
  }

  if (!trainer.active && !isViewAs) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white p-8 text-center"
          style={{ border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(30,58,95,0.07)" }}>
          <div className="mx-auto mb-4 grid place-items-center rounded-full"
            style={{ width: 64, height: 64, background: RED_LIGHT }}>
            <ShieldAlert size={28} color={RED} />
          </div>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 600, color: NAVY }}>
            Account inactive
          </p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
            Your trainer account has been deactivated. If you believe this is a mistake, please contact your admin.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-6 w-full rounded-2xl border-none cursor-pointer inline-flex items-center justify-center gap-2"
            style={{ background: NAVY, padding: "12px", fontSize: 14, fontWeight: 700, color: "#fff" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (trainer?.name ?? "Trainer").split(" ")[0];

  // Group clients by time_slot for the drill-down view
  const clientsBySlot = clients.reduce<Record<string, ClientRow[]>>((acc, c) => {
    const key = c.time_slot ?? "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────────────
  // Shared sub-components
  // ─────────────────────────────────────────────────────────────────────────

  const SocietiesList = () => (
    <div>
      {societies.length === 0 ? (
        <div className="mx-4 rounded-[20px] p-5 text-center"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <Building2 size={32} color={MUTED} className="mx-auto mb-2" />
          <p style={{ color: MUTED, fontSize: 13 }}>No societies assigned yet.</p>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
            Ask your admin to link you to a society.
          </p>
        </div>
      ) : (
        <div className="mx-4 space-y-3">
          {societies.map((s) => {
            const batches = batchMap[s.id] ?? [];
            const totalClients = batches.reduce((sum, b) => sum + b.client_count, 0);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSociety(s)}
                className="w-full text-left rounded-[20px] p-4 cursor-pointer"
                style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(30,58,95,0.05)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="rounded-xl flex items-center justify-center"
                        style={{ width: 36, height: 36, background: "rgba(30,58,95,0.06)", flexShrink: 0 }}>
                        <Building2 size={18} color={NAVY} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ fontSize: 15, color: NAVY }}>{s.name}</p>
                        {s.address && <p style={{ fontSize: 11, color: MUTED }}>{s.address}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-11">
                      {batches.length === 0
                        ? <span style={{ fontSize: 12, color: MUTED }}>No batches yet</span>
                        : batches.map((b) => (
                          <span key={b.time_slot}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                            style={{ background: "rgba(240,167,32,0.12)", fontSize: 11, color: "#a07010" }}>
                            <Clock size={10} /> {b.time_slot} · {b.client_count} clients
                          </span>
                        ))
                      }
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                    <span className="rounded-full font-bold"
                      style={{ fontSize: 11, background: GREEN_LIGHT, color: GREEN, padding: "3px 10px" }}>
                      {totalClients} clients
                    </span>
                    <ChevronRight size={16} color={MUTED} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const ClientList = ({ society }: { society: SocietyRow }) => (
    <div>
      <button
        onClick={() => setSelectedSociety(null)}
        className="flex items-center gap-2 mx-4 mb-4 cursor-pointer border-none bg-transparent"
        style={{ color: NAVY, fontSize: 14, fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to societies
      </button>

      <div className="mx-4 rounded-[20px] overflow-hidden"
        style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
        <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Building2 size={18} color={NAVY} />
            <p className="font-bold" style={{ fontSize: 15, color: NAVY }}>{society.name}</p>
          </div>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            {clients.length} clients · {Object.keys(clientsBySlot).length} slots
          </p>
        </div>

        {clientsLoading ? (
          <div className="p-6 text-center" style={{ color: MUTED, fontSize: 13 }}>Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="p-6 text-center" style={{ color: MUTED, fontSize: 13 }}>No clients in this society yet.</div>
        ) : (
          Object.entries(clientsBySlot).map(([slot, slotClients]) => (
            <div key={slot}>
              <div className="px-4 py-2 flex items-center gap-2"
                style={{ background: "rgba(30,58,95,0.03)", borderBottom: `1px solid ${BORDER}` }}>
                <Clock size={12} color={MUTED} />
                <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {slot}
                </span>
                <span className="ml-auto rounded-full"
                  style={{ fontSize: 10, background: GREEN_LIGHT, color: GREEN, padding: "2px 8px", fontWeight: 600 }}>
                  {slotClients.length}
                </span>
              </div>
              {slotClients.map((c, i) => (
                <div key={c.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < slotClients.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: "rgba(30,58,95,0.07)" }}>
                    <UserCircle2 size={18} color={NAVY} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate" style={{ fontSize: 14, color: NAVY }}>
                        {c.name ?? "Unnamed"}
                      </p>
                      {c.is_paused_today && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">
                          Paused Today
                        </span>
                      )}
                    </div>
                    {c.phone && (
                      <p style={{ fontSize: 12, color: MUTED }}>{c.phone}</p>
                    )}
                    {(c.training_days?.length || c.end_date) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {c.training_days && c.training_days.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            <CalendarOff className="h-3 w-3 opacity-0 hidden" /> {/* spacer hack if needed, or just text */}
                            {c.training_days.join(" - ")}
                          </span>
                        )}
                        {c.end_date && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            Ends: {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPauseClient({ id: c.id, name: c.name ?? "Client" })}
                      className="grid place-items-center rounded-full border-none cursor-pointer"
                      style={{ width: 32, height: 32, background: "rgba(240, 167, 32, 0.15)", color: "#f0a720" }}
                      title="Pause Classes"
                    >
                      <CalendarOff size={14} />
                    </button>
                    {c.phone && (
                      <>
                        <a href={phoneLinks(c.phone).tel}
                          className="grid place-items-center rounded-full"
                          style={{ width: 32, height: 32, background: "rgba(30,58,95,0.07)" }}>
                          <PhoneIcon size={14} color={NAVY} />
                        </a>
                        <a href={phoneLinks(c.phone).wa} target="_blank" rel="noopener noreferrer"
                          className="grid place-items-center rounded-full"
                          style={{ width: 32, height: 32, background: GREEN_LIGHT }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={GREEN}>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const OffTimeForm = () => (
    <div className="mx-4 space-y-3">
      {/* Mode toggle */}
      <div className="rounded-[20px] p-4"
        style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
        <p className="font-bold mb-3" style={{ fontSize: 14, color: NAVY }}>Mark unavailability</p>

        <div className="flex rounded-xl overflow-hidden mb-4"
          style={{ border: `1px solid ${BORDER}`, background: "rgba(30,58,95,0.03)" }}>
          {([["days", "Full day(s)"], ["slot", "Single slot"]] as [OffMode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setOffMode(m)}
              className="flex-1 py-2 text-sm font-semibold transition-all border-none cursor-pointer"
              style={{
                background: offMode === m ? NAVY : "transparent",
                color: offMode === m ? "#fff" : MUTED,
                borderRadius: 10,
              }}>
              {label}
            </button>
          ))}
        </div>

        {offMode === "days" ? (
          <>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
              All your slots will be marked off for this date range.
            </p>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border-none cursor-pointer"
                  style={{
                    background: "#f8fafd",
                    border: `2px solid ${dateRange?.from ? NAVY : "#c8d4e3"}`,
                    fontSize: 13,
                    color: dateRange?.from ? NAVY : MUTED,
                    fontWeight: dateRange?.from ? 600 : 400,
                  }}>
                  <CalendarIcon size={15} color={NAVY} style={{ opacity: 0.7, flexShrink: 0 }} />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "PP")} → ${format(dateRange.to, "PP")}`
                      : format(dateRange.from, "PP")
                    : "Select date range"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange}
                  numberOfMonths={1} initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
              Only the specific slot on this date will be marked off.
            </p>
            <Popover open={singleCalOpen} onOpenChange={setSingleCalOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border-none cursor-pointer mb-3"
                  style={{
                    background: "#f8fafd",
                    border: `2px solid ${singleDate ? NAVY : "#c8d4e3"}`,
                    fontSize: 13,
                    color: singleDate ? NAVY : MUTED,
                    fontWeight: singleDate ? 600 : 400,
                  }}>
                  <CalendarIcon size={15} color={NAVY} style={{ opacity: 0.7, flexShrink: 0 }} />
                  {singleDate ? format(singleDate, "PPP") : "Select date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={singleDate}
                  onSelect={(d) => { setSingleDate(d); setSingleCalOpen(false); }}
                  initialFocus captionLayout="dropdown" fromYear={2024} toYear={2030}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <input
              value={slotInput}
              onChange={(e) => setSlotInput(e.target.value)}
              placeholder="Time slot e.g. 6–7 AM"
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{
                border: `2px solid ${slotInput ? NAVY : "#c8d4e3"}`,
                background: "#f8fafd",
                outline: "none",
                color: NAVY,
              }}
            />
          </>
        )}

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-xl px-3 py-2.5 text-sm mt-3"
          style={{
            border: "2px solid #c8d4e3",
            background: "#f8fafd",
            outline: "none",
            color: NAVY,
          }}
        />

        <button
          onClick={() => addOff.mutate()}
          disabled={addOff.isPending || isViewAs}
          className="mt-3 w-full rounded-2xl border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: NAVY, padding: "13px", fontSize: 14, fontWeight: 700, color: "#fff" }}>
          <Plus size={16} /> {addOff.isPending ? "Saving…" : isViewAs ? "Read only" : "Save off time"}
        </button>
      </div>

      {/* Upcoming off times list */}
      {offTimes.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <p className="font-semibold mb-3" style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Upcoming off times
          </p>
          <ul className="space-y-0">
            {offTimes.map((o, i) => {
              const isSameDay = o.from_date === o.to_date;
              return (
                <li key={o.id}
                  className="flex items-start justify-between py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ fontSize: 13, color: NAVY }}>
                      {isSameDay
                        ? format(new Date(o.from_date + "T12:00:00"), "PP")
                        : `${format(new Date(o.from_date + "T12:00:00"), "PP")} → ${format(new Date(o.to_date + "T12:00:00"), "PP")}`
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {o.time_slot
                        ? <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#a07010" }}>
                            <Clock size={10} /> {o.time_slot}
                          </span>
                        : <span className="text-xs" style={{ color: MUTED }}>All slots</span>
                      }
                      {o.reason && (
                        <span className="text-xs truncate" style={{ color: MUTED }}>· {o.reason}</span>
                      )}
                    </div>
                  </div>
                  {!isViewAs && (
                    <button
                      onClick={() => removeOff.mutate(o.id)}
                      className="ml-2 flex-shrink-0 border-none bg-transparent cursor-pointer p-1 rounded-lg"
                      style={{ color: RED }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Admin view-as banner */}
      {isViewAs && (
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "rgba(240,167,32,0.15)", borderBottom: "1px solid rgba(240,167,32,0.3)" }}>
          <Eye size={15} color="#a07010" />
          <p style={{ fontSize: 13, color: "#a07010", fontWeight: 600 }}>
            Viewing as {trainer.name} — read only
          </p>
        </div>
      )}

      {/* ── Mobile Layout ──────────────────────────────────────────── */}
      <div className="md:hidden" style={{ background: BG, minHeight: "100%" }}>

        {/* Hero */}
        <div style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
          padding: "16px 20px 24px",
        }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{greeting} ✨</p>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
            {firstName}
          </h2>
          {trainer?.specialization && (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>
              {trainer.specialization}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <div className="rounded-2xl px-3 py-2 text-center flex-1"
              style={{ background: "rgba(255,255,255,0.10)" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>
                {societies.reduce((sum, s) => sum + (batchMap[s.id]?.reduce((a, b) => a + b.client_count, 0) ?? 0), 0)}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Total clients</p>
            </div>
            <div className="rounded-2xl px-3 py-2 text-center flex-1"
              style={{ background: "rgba(255,255,255,0.10)" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{societies.length}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Societies</p>
            </div>
            <div className="rounded-2xl px-3 py-2 text-center flex-1"
              style={{ background: "rgba(255,255,255,0.10)" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{offTimes.length}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>Off times</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-4 mt-4 mb-4 rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
          {([["societies", "My Societies", Building2], ["offtime", "Off Time", CalendarOff]] as any[]).map(
            ([t, label, Icon]) => (
              <button key={t} onClick={() => { setTab(t); setSelectedSociety(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-none cursor-pointer transition-all"
                style={{
                  background: tab === t ? NAVY : "transparent",
                  color: tab === t ? "#fff" : MUTED,
                  fontSize: 13,
                  fontWeight: tab === t ? 700 : 500,
                  borderRadius: 12,
                }}>
                <Icon size={15} />
                {label}
              </button>
            )
          )}
        </div>

        {/* Tab content */}
        {tab === "societies" && (
          selectedSociety
            ? <ClientList society={selectedSociety} />
            : (
              <>
                <SocietiesList />
                {!isViewAs && (
                  <div className="mx-4 mt-4">
                    <TrainerPauses />
                  </div>
                )}
              </>
            )
        )}
        {tab === "offtime" && <OffTimeForm />}

        {/* bottom padding for nav */}
        <div style={{ height: 24 }} />
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────── */}
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <header>
          <h1 className="font-display text-3xl text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          {trainer?.specialization && (
            <p className="mt-1 text-muted-foreground">{trainer.specialization}</p>
          )}
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total clients", value: societies.reduce((sum, s) => sum + (batchMap[s.id]?.reduce((a, b) => a + b.client_count, 0) ?? 0), 0) },
            { label: "Societies", value: societies.length },
            { label: "Upcoming off times", value: offTimes.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 shadow-sm"
              style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              <p className="text-3xl font-display font-bold" style={{ color: NAVY }}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Societies */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">My Societies</h2>
              {selectedSociety && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedSociety(null)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> All societies
                </Button>
              )}
            </div>

            {!selectedSociety ? (
              societies.length === 0 ? (
                <div className="rounded-2xl p-6 text-center"
                  style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <Building2 size={32} color={MUTED} className="mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No societies assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {societies.map((s) => {
                    const batches = batchMap[s.id] ?? [];
                    const totalClients = batches.reduce((sum, b) => sum + b.client_count, 0);
                    return (
                      <button key={s.id} onClick={() => setSelectedSociety(s)}
                        className="w-full text-left rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-md"
                        style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold" style={{ color: NAVY }}>{s.name}</p>
                            {s.address && <p className="text-xs text-muted-foreground mt-0.5">{s.address}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {batches.map((b) => (
                                <span key={b.time_slot}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                                  style={{ background: "rgba(240,167,32,0.12)", color: "#a07010" }}>
                                  <Clock size={10} /> {b.time_slot} · {b.client_count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{totalClients} clients</Badge>
                            <ChevronRight size={16} color={MUTED} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={18} color={NAVY} />
                    <p className="font-semibold" style={{ color: NAVY }}>{selectedSociety.name}</p>
                    <Badge variant="secondary" className="ml-auto">{clients.length} clients</Badge>
                  </div>
                </div>
                {clientsLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : clients.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No clients in this society.</div>
                ) : (
                  Object.entries(clientsBySlot).map(([slot, slotClients]) => (
                    <div key={slot}>
                      <div className="px-4 py-2 flex items-center gap-2"
                        style={{ background: "rgba(30,58,95,0.03)", borderBottom: `1px solid ${BORDER}` }}>
                        <Clock size={12} color={MUTED} />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{slot}</span>
                        <span className="ml-auto text-xs font-semibold"
                          style={{ background: GREEN_LIGHT, color: GREEN, padding: "2px 8px", borderRadius: 99 }}>
                          {slotClients.length}
                        </span>
                      </div>
                      {slotClients.map((c, i) => (
                        <div key={c.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{ borderBottom: i < slotClients.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                          <UserCircle2 size={20} color={MUTED} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.name ?? "Unnamed"}</p>
                            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                          </div>
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <a href={phoneLinks(c.phone).tel} title="Call"
                                className="grid place-items-center rounded-full hover:opacity-80"
                                style={{ width: 28, height: 28, background: "rgba(30,58,95,0.07)" }}>
                                <PhoneIcon size={13} color={NAVY} />
                              </a>
                              <a href={phoneLinks(c.phone).wa} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                                className="grid place-items-center rounded-full hover:opacity-80"
                                style={{ width: 28, height: 28, background: GREEN_LIGHT }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill={GREEN}>
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Off Time */}
          <div className="space-y-4">
            <h2 className="font-display text-xl">Off Time</h2>

            {/* Form card */}
            <div className="rounded-2xl p-5"
              style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-medium mb-4">Mark unavailability</p>

              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden mb-4"
                style={{ border: `1px solid ${BORDER}` }}>
                {([["days", "Full day(s)"], ["slot", "Single slot"]] as [OffMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setOffMode(m)}
                    className="flex-1 py-2 text-sm font-medium border-none cursor-pointer"
                    style={{ background: offMode === m ? NAVY : "transparent", color: offMode === m ? "#fff" : MUTED }}>
                    {label}
                  </button>
                ))}
              </div>

              {offMode === "days" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">All slots will be off for this date range.</p>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline"
                        className={cn("w-full justify-start text-left font-normal h-10", !dateRange?.from && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from
                          ? dateRange.to ? `${format(dateRange.from, "PP")} → ${format(dateRange.to, "PP")}` : format(dateRange.from, "PP")
                          : "Select date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="range" selected={dateRange} onSelect={setDateRange}
                        numberOfMonths={2} initialFocus
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Only this specific slot on this date will be off.</p>
                  <Popover open={singleCalOpen} onOpenChange={setSingleCalOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline"
                        className={cn("w-full justify-start text-left font-normal h-10", !singleDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {singleDate ? format(singleDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={singleDate}
                        onSelect={(d) => { setSingleDate(d); setSingleCalOpen(false); }}
                        initialFocus captionLayout="dropdown" fromYear={2024} toYear={2030}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <input value={slotInput} onChange={(e) => setSlotInput(e.target.value)}
                    placeholder="Time slot e.g. 6–7 AM"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              )}

              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary mt-3" />

              <Button onClick={() => addOff.mutate()} disabled={addOff.isPending || isViewAs} className="w-full mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {addOff.isPending ? "Saving…" : isViewAs ? "Read only" : "Save off time"}
              </Button>
            </div>

            {/* Upcoming list */}
            {offTimes.length > 0 && (
              <div className="rounded-2xl p-5"
                style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Upcoming off times
                </p>
                <ul className="divide-y divide-border">
                  {offTimes.map((o) => {
                    const isSameDay = o.from_date === o.to_date;
                    return (
                      <li key={o.id} className="flex items-start justify-between py-3">
                        <div>
                          <p className="font-medium text-sm">
                            {isSameDay
                              ? format(new Date(o.from_date + "T12:00:00"), "PPP")
                              : `${format(new Date(o.from_date + "T12:00:00"), "PP")} → ${format(new Date(o.to_date + "T12:00:00"), "PP")}`
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {o.time_slot
                              ? <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock size={10} /> {o.time_slot}
                                </span>
                              : <span className="text-xs text-muted-foreground">All slots</span>
                            }
                            {o.reason && <span className="text-xs text-muted-foreground">· {o.reason}</span>}
                          </div>
                        </div>
                        {!isViewAs && (
                          <Button variant="ghost" size="sm"
                            onClick={() => removeOff.mutate(o.id)}
                            className="text-destructive hover:text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Client pauses */}
        {!isViewAs && <TrainerPauses />}
      </div>

      <TrainerClientPauseModal
        open={!!pauseClient}
        onOpenChange={(open) => !open && setPauseClient(null)}
        clientId={pauseClient?.id ?? ""}
        clientName={pauseClient?.name ?? ""}
      />
    </>
  );
}
