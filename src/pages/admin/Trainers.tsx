import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { recalculatePlanDates } from "@/stores/pauseStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/dates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Eye, CalendarOff, Clock, Info, AlertTriangle, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

interface Trainer {
  id: string;
  user_id: string | null;
  name: string;
  contact: string | null;
  specialization: string | null;
  active: boolean;
}

interface OffTimeRow {
  id: string;
  trainer_id: string;
  from_date: string;
  to_date: string;
  time_slot: string | null;
  reason: string | null;
}

// Native <input type="time"> gives 24h "HH:MM"; slots are stored as friendly
// "7:00 AM – 8:00 AM" strings (same format the customer profile uses).
function to12h(hhmm: string): string {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${(mStr ?? "00").padStart(2, "0")} ${ampm}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDate(d: string): string {
  // Display a YYYY-MM-DD date string in a friendly format without timezone shift
  return format(parseISO(d + "T12:00:00"), "PP");
}

export default function Trainers() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = todayISO();

  // ── Trainer add/edit dialog ────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [active, setActive] = useState(true);
  const [societyIds, setSocietyIds] = useState<string[]>([]);
  const [createLogin, setCreateLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [slotsBySociety, setSlotsBySociety] = useState<Record<string, string[]>>({});
  const [slotDraft, setSlotDraft] = useState<Record<string, { start: string; end: string }>>({});

  // ── Off-time management dialog ─────────────────────────────────────────────
  const [offDialog, setOffDialog] = useState<{ open: boolean; trainer: Trainer | null }>({
    open: false,
    trainer: null,
  });
  // Add off-time form state inside dialog
  const [offMode, setOffMode] = useState<"days" | "slot">("days");
  const [offFromDate, setOffFromDate] = useState("");
  const [offToDate, setOffToDate] = useState("");
  const [offSingleDate, setOffSingleDate] = useState("");
  const [offTimeSlot, setOffTimeSlot] = useState("");
  const [offReason, setOffReason] = useState("");

  const resetOffForm = () => {
    setOffMode("days");
    setOffFromDate("");
    setOffToDate("");
    setOffSingleDate("");
    setOffTimeSlot("");
    setOffReason("");
  };

  // Make-up (extra) class form state inside the dialog
  const [mkDate, setMkDate] = useState("");
  const [mkSociety, setMkSociety] = useState("");
  const [mkSlot, setMkSlot] = useState("");
  const [mkNotes, setMkNotes] = useState("");
  const resetMkForm = () => { setMkDate(""); setMkSociety(""); setMkSlot(""); setMkNotes(""); };

  // ── Data queries ───────────────────────────────────────────────────────────
  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainers").select("*").order("name");
      if (error) throw error;
      return data as Trainer[];
    },
  });

  // ALL upcoming off-times — used for coverage widget + off-time dialog
  const { data: allOffTimes = [] } = useQuery({
    queryKey: ["admin-trainer-off-times"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trainer_off_times")
        .select("id, trainer_id, from_date, to_date, time_slot, reason")
        .gte("to_date", today)
        .order("from_date");
      return (data ?? []) as OffTimeRow[];
    },
  });

  // All off-times for the selected trainer (both past + upcoming) for the dialog
  const { data: trainerOffTimes = [], isFetching: offLoading } = useQuery({
    queryKey: ["admin-trainer-off-times-detail", offDialog.trainer?.id],
    enabled: !!offDialog.trainer,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trainer_off_times")
        .select("id, trainer_id, from_date, to_date, time_slot, reason")
        .eq("trainer_id", offDialog.trainer!.id)
        .order("from_date");
      return (data ?? []) as OffTimeRow[];
    },
  });

  // Trainer's known slots (for slot picker autocomplete)
  const { data: trainerSlots = [] } = useQuery({
    queryKey: ["admin-trainer-slots-for-off", offDialog.trainer?.id],
    enabled: !!offDialog.trainer,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_slots")
        .select("time_slot")
        .eq("trainer_id", offDialog.trainer!.id);
      return [...new Set((data ?? []).map((r) => r.time_slot))].sort();
    },
  });

  // The selected trainer's customers (for make-up class targeting)
  const { data: trainerClients = [] } = useQuery({
    queryKey: ["admin-trainer-clients-for-makeup", offDialog.trainer?.id],
    enabled: !!offDialog.trainer,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, society_id, time_slot")
        .eq("trainer_id", offDialog.trainer!.id);
      return (data ?? []) as { id: string; name: string | null; society_id: string | null; time_slot: string | null }[];
    },
  });

  const { data: societies = [] } = useQuery({
    queryKey: ["societies"],
    queryFn: async () => {
      const { data } = await supabase.from("societies").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["trainer_societies"],
    queryFn: async () => {
      const { data } = await supabase.from("trainer_societies").select("trainer_id, society_id");
      return data ?? [];
    },
  });

  const { data: allSlots = [] } = useQuery({
    queryKey: ["trainer-slots-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_slots").select("trainer_id, society_id, time_slot").order("time_slot");
      return data ?? [];
    },
  });

  // Upcoming off-times count per trainer (for badge)
  const offCountByTrainer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of allOffTimes) {
      map[o.trainer_id] = (map[o.trainer_id] ?? 0) + 1;
    }
    return map;
  }, [allOffTimes]);

  // ── Trainer add/edit helpers ───────────────────────────────────────────────
  const startNew = () => {
    setEditing(null); setName(""); setContact(""); setSpecialization("");
    setActive(true); setSocietyIds([]); setCreateLogin(false);
    setLoginEmail(""); setLoginPassword("");
    setSlotsBySociety({}); setSlotDraft({});
    setOpen(true);
  };

  const startEdit = (t: Trainer) => {
    setEditing(t);
    setName(t.name); setContact(t.contact ?? ""); setSpecialization(t.specialization ?? "");
    setActive(t.active);
    setSocietyIds(links.filter((l) => l.trainer_id === t.id).map((l) => l.society_id));
    setCreateLogin(false); setLoginEmail(""); setLoginPassword("");
    const seeded: Record<string, string[]> = {};
    for (const s of allSlots.filter((s) => s.trainer_id === t.id)) {
      (seeded[s.society_id] ??= []).push(s.time_slot);
    }
    setSlotsBySociety(seeded); setSlotDraft({});
    setOpen(true);
  };

  const addSlot = (sid: string) => {
    const d = slotDraft[sid];
    if (!d?.start || !d?.end) return;
    const slot = `${to12h(d.start)} – ${to12h(d.end)}`;
    setSlotsBySociety((prev) => {
      const cur = prev[sid] ?? [];
      if (cur.includes(slot)) return prev;
      return { ...prev, [sid]: [...cur, slot] };
    });
    setSlotDraft((prev) => ({ ...prev, [sid]: { start: "", end: "" } }));
  };

  const removeSlot = (sid: string, slot: string) => {
    setSlotsBySociety((prev) => ({ ...prev, [sid]: (prev[sid] ?? []).filter((s) => s !== slot) }));
  };

  // ── Off-time management helpers ────────────────────────────────────────────
  const openOffDialog = (t: Trainer) => {
    resetOffForm();
    setOffDialog({ open: true, trainer: t });
  };

  // Recalculate plan dates for ALL clients of this trainer
  const recalcClientsForTrainer = async (trainerId: string) => {
    const { data: clients } = await supabase
      .from("profiles").select("id").eq("trainer_id", trainerId);
    await Promise.all((clients ?? []).map((c) => recalculatePlanDates(c.id)));
    qc.invalidateQueries({ queryKey: ["trainer-clients"] });
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      let trainerId = editing?.id;
      let userId = editing?.user_id ?? null;

      if (createLogin && !editing) {
        if (!loginEmail || loginPassword.length < 6) throw new Error("Email and password (6+ chars) required");

        const { data: existing } = await supabase
          .from("trainers").select("id").eq("email", loginEmail).maybeSingle();
        if (existing) throw new Error("A trainer with this email already exists.");

        const newUserId = crypto.randomUUID();
        const { data: created, error } = await supabase.from("trainers").insert({
          user_id: newUserId,
          name, contact: contact || null, specialization: specialization || null, active,
          email: loginEmail, password: loginPassword,
        } as any).select("id").single();
        if (error) throw error;

        const { error: roleErr } = await supabase
          .from("user_roles").insert({ user_id: newUserId, role: "trainer" });
        if (roleErr) console.warn("user_roles insert failed:", roleErr.message);

        trainerId = created?.id;
      } else if (editing) {
        const { error } = await supabase.from("trainers").update({
          name, contact: contact || null, specialization: specialization || null, active,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("trainers").insert({
          name, contact: contact || null, specialization: specialization || null, active,
        }).select("id").single();
        if (error) throw error;
        trainerId = data.id;
      }

      // sync trainer_societies
      if (trainerId) {
        await supabase.from("trainer_societies").delete().eq("trainer_id", trainerId);
        if (societyIds.length) {
          const rows = societyIds.map((sid) => ({ trainer_id: trainerId!, society_id: sid }));
          const { error } = await supabase.from("trainer_societies").insert(rows);
          if (error) throw error;
        }

        // sync trainer_slots (only for societies still assigned)
        const { error: delErr } = await supabase.from("trainer_slots").delete().eq("trainer_id", trainerId);
        const slotRows = societyIds.flatMap((sid) =>
          (slotsBySociety[sid] ?? []).map((slot) => ({
            trainer_id: trainerId!, society_id: sid, time_slot: slot,
          }))
        );
        const { error: slotErr } = slotRows.length
          ? await supabase.from("trainer_slots").insert(slotRows)
          : { error: null as any };
        if (delErr || slotErr) {
          console.warn("trainer_slots sync failed:", delErr ?? slotErr);
          toast.info("Trainer saved, but time slots weren't stored — run the trainer_slots migration in Supabase first.");
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Trainer updated" : "Trainer created");
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["trainer_societies"] });
      qc.invalidateQueries({ queryKey: ["trainer-slots-all"] });
      qc.invalidateQueries({ queryKey: ["trainer-slots"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["trainers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  // Add off-time (admin)
  const addOffTime = useMutation({
    mutationFn: async () => {
      if (!offDialog.trainer) throw new Error("No trainer selected");
      if (offMode === "days") {
        if (!offFromDate || !offToDate) throw new Error("Select a date range");
        if (offToDate < offFromDate) throw new Error("End date must be on or after start date");
        const { error } = await (supabase as any).from("trainer_off_times").insert({
          trainer_id: offDialog.trainer.id,
          from_date: offFromDate,
          to_date: offToDate,
          time_slot: null,
          reason: offReason.trim() || null,
        });
        if (error) throw new Error(error.message);
      } else {
        if (!offSingleDate) throw new Error("Pick a date");
        const slot = offTimeSlot.trim();
        const { error } = await (supabase as any).from("trainer_off_times").insert({
          trainer_id: offDialog.trainer.id,
          from_date: offSingleDate,
          to_date: offSingleDate,
          time_slot: slot || null,
          reason: offReason.trim() || null,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      toast.success("Off-time added — affected clients' plan dates recalculated");
      resetOffForm();
      qc.invalidateQueries({ queryKey: ["admin-trainer-off-times"] });
      qc.invalidateQueries({ queryKey: ["admin-trainer-off-times-detail", offDialog.trainer?.id] });
      if (offDialog.trainer) await recalcClientsForTrainer(offDialog.trainer.id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add off-time"),
  });

  // Delete off-time (admin — no midnight restriction)
  const deleteOffTime = useMutation({
    mutationFn: async ({ id, trainerId }: { id: string; trainerId: string }) => {
      const { error } = await (supabase as any).from("trainer_off_times").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return trainerId;
    },
    onSuccess: async (trainerId) => {
      toast.success("Off-time removed — affected clients' plan dates recalculated");
      qc.invalidateQueries({ queryKey: ["admin-trainer-off-times"] });
      qc.invalidateQueries({ queryKey: ["admin-trainer-off-times-detail", offDialog.trainer?.id] });
      await recalcClientsForTrainer(trainerId);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove off-time"),
  });

  // Societies this trainer is assigned to (for the make-up society picker)
  const trainerSocieties = useMemo(() => {
    if (!offDialog.trainer) return [] as { id: string; name: string }[];
    const ids = new Set(links.filter((l) => l.trainer_id === offDialog.trainer!.id).map((l) => l.society_id));
    return societies.filter((s) => ids.has(s.id));
  }, [offDialog.trainer, links, societies]);

  // Slots to offer for the chosen society: the trainer's defined slots there,
  // plus any slot their customers in that society actually use.
  const makeupSlotOptions = useMemo(() => {
    if (!mkSociety) return [] as string[];
    const set = new Set<string>();
    for (const s of allSlots) if (s.trainer_id === offDialog.trainer?.id && s.society_id === mkSociety) set.add(s.time_slot);
    for (const c of trainerClients) if (c.society_id === mkSociety && c.time_slot) set.add(c.time_slot);
    return [...set].sort();
  }, [mkSociety, allSlots, trainerClients, offDialog.trainer]);

  // Which customers a trainer's make-up class applies to: everyone in the
  // chosen society, optionally narrowed to the chosen slot.
  const makeupTargets = useMemo(() => {
    if (!offDialog.trainer || !mkSociety) return [] as { id: string; name: string | null }[];
    return trainerClients.filter(
      (c) => c.society_id === mkSociety && (!mkSlot || c.time_slot === mkSlot)
    );
  }, [offDialog.trainer, mkSociety, mkSlot, trainerClients]);

  const makeupName = (clientId: string) =>
    trainerClients.find((c) => c.id === clientId)?.name ?? "Client";

  // Record an extra class the trainer took to compensate an off-day — consumes
  // one off-day bonus from every customer in that batch.
  const addMakeup = useMutation({
    mutationFn: async () => {
      if (!offDialog.trainer) throw new Error("No trainer selected");
      if (!mkDate) throw new Error("Pick the class date");
      if (!mkSociety) throw new Error("Pick the society");
      if (makeupTargets.length === 0) throw new Error("No customers in this batch to credit");
      const rows = makeupTargets.map((c) => ({
        client_id: c.id,
        trainer_id: offDialog.trainer!.id,
        class_date: mkDate,
        notes: mkNotes.trim() || null,
      }));
      const { error } = await (supabase as any).from("comp_classes").insert(rows);
      if (error) throw new Error(error.message);
      await Promise.all(makeupTargets.map((c) => recalculatePlanDates(c.id)));
    },
    onSuccess: () => {
      toast.success(`Extra class recorded for ${makeupTargets.length} customer(s) — one bonus consumed each`);
      resetMkForm();
      qc.invalidateQueries({ queryKey: ["admin-trainer-makeups", offDialog.trainer?.id] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(/comp_classes|schema cache|does not exist|Could not find|relation/i.test(msg)
        ? "Extra-classes table isn't set up — run the comp_classes migration in Supabase."
        : msg);
    },
  });

  // Make-up classes already recorded for the selected trainer
  const { data: trainerMakeups = [] } = useQuery({
    queryKey: ["admin-trainer-makeups", offDialog.trainer?.id],
    enabled: !!offDialog.trainer,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("comp_classes")
        .select("id, client_id, class_date, notes")
        .eq("trainer_id", offDialog.trainer!.id)
        .order("class_date", { ascending: false });
      return (data ?? []) as { id: string; client_id: string; class_date: string; notes: string | null }[];
    },
  });

  const deleteMakeup = useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await (supabase as any).from("comp_classes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await recalculatePlanDates(clientId);
    },
    onSuccess: () => {
      toast.success("Extra class removed — bonus restored");
      qc.invalidateQueries({ queryKey: ["admin-trainer-makeups", offDialog.trainer?.id] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const toggleSociety = (id: string, on: boolean) => {
    setSocietyIds((prev) => (on ? [...prev, id] : prev.filter((s) => s !== id)));
  };

  // Auto-fill default email when toggling create login
  useEffect(() => {
    if (createLogin && !loginEmail && name) {
      setLoginEmail(`${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@trainer.fitved.local`);
    }
  }, [createLogin, name, loginEmail]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Trainers</h1>
          <p className="mt-1 text-muted-foreground">{trainers.length} trainer(s)</p>
        </div>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Add trainer</Button>
      </header>

      <Card className="rounded-2xl shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Specialization</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead>Societies</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Off-Days</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No trainers yet</TableCell></TableRow>
            ) : trainers.map((t) => {
              const count = links.filter((l) => l.trainer_id === t.id).length;
              const offCount = offCountByTrainer[t.id] ?? 0;
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.name}
                    {t.user_id && <Badge variant="outline" className="ml-2 text-[10px]">login</Badge>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{t.specialization ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{t.contact ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{count}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{(t as any).password ?? "—"}</TableCell>
                  <TableCell><Badge variant={t.active ? "secondary" : "outline"}>{t.active ? "active" : "inactive"}</Badge></TableCell>
                  <TableCell>
                    <button
                      onClick={() => openOffDialog(t)}
                      title="Manage off-days for this trainer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />
                      {offCount > 0
                        ? <span className="inline-flex items-center justify-center rounded-full bg-warning/20 text-warning-foreground px-1.5 py-0.5 text-[10px] font-semibold">{offCount}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" title="View as this trainer"
                      onClick={() => navigate(`/trainer?as=${t.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Delete ${t.name}?`)) remove.mutate(t.id);
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* ── Off-time Management Dialog ──────────────────────────────────────── */}
      <Dialog open={offDialog.open} onOpenChange={(v) => setOffDialog((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-warning-foreground" />
              Off-Days — {offDialog.trainer?.name}
            </DialogTitle>
            <DialogDescription>
              Add or remove off-times for this trainer. Affected clients' plan end dates are automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          {/* Midnight lock info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-3 flex gap-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
            <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
              <strong>Midnight lock:</strong> Once an off-time's start date has passed, trainers can no longer delete it. Only admins (you) can remove past or in-progress off-times.
            </p>
          </div>

          {/* Existing off-times list */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Scheduled off-times</p>
            {offLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : trainerOffTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No off-times scheduled.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border overflow-hidden">
                {trainerOffTimes.map((o) => {
                  const sameDay = o.from_date === o.to_date;
                  const isPast = o.to_date < today;
                  const isActive = o.from_date <= today && o.to_date >= today;
                  return (
                    <li key={o.id} className={`flex items-start justify-between gap-3 px-4 py-3 ${isPast ? "bg-muted/30" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {sameDay
                              ? localDate(o.from_date)
                              : `${localDate(o.from_date)} → ${localDate(o.to_date)}`}
                          </p>
                          {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
                          {isActive && <Badge className="text-[10px] bg-orange-500 hover:bg-orange-500">Active now</Badge>}
                          {!isPast && !isActive && <Badge variant="secondary" className="text-[10px]">Upcoming</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {o.time_slot
                            ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {o.time_slot}</span>
                            : <span>All slots</span>}
                          {o.reason && <span className="truncate">· {o.reason}</span>}
                        </div>
                        {(isPast || isActive) && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {isPast ? "Past — only admin can delete" : "In-progress — only admin can delete"}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteOffTime.isPending}
                        onClick={() => {
                          if (confirm("Remove this off-time? Affected clients' plan dates will be recalculated.")) {
                            deleteOffTime.mutate({ id: o.id, trainerId: offDialog.trainer!.id });
                          }
                        }}
                      >
                        {deleteOffTime.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Add new off-time form */}
          <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Off-Time</p>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOffMode("days")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${offMode === "days" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
              >
                Full day(s) off
              </button>
              <button
                type="button"
                onClick={() => setOffMode("slot")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${offMode === "slot" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
              >
                Specific slot only
              </button>
            </div>

            {offMode === "days" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From date</Label>
                  <Input
                    type="date"
                    value={offFromDate}
                    min={today}
                    onChange={(e) => {
                      setOffFromDate(e.target.value);
                      if (!offToDate || e.target.value > offToDate) setOffToDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To date</Label>
                  <Input
                    type="date"
                    value={offToDate}
                    min={offFromDate || today}
                    onChange={(e) => setOffToDate(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={offSingleDate}
                    min={today}
                    onChange={(e) => setOffSingleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Time slot <span className="text-muted-foreground font-normal">(optional — leave blank = all slots)</span></Label>
                  {trainerSlots.length > 0 ? (
                    <Select value={offTimeSlot || "all"} onValueChange={(v) => setOffTimeSlot(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time slot…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All slots</SelectItem>
                        {trainerSlots.filter(Boolean).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="e.g. 7:00 AM – 8:00 AM"
                      value={offTimeSlot}
                      onChange={(e) => setOffTimeSlot(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Personal leave, medical appointment…"
                value={offReason}
                onChange={(e) => setOffReason(e.target.value)}
              />
            </div>

            <Button
              className="w-full gap-2"
              disabled={addOffTime.isPending || (offMode === "days" ? !offFromDate || !offToDate : !offSingleDate)}
              onClick={() => addOffTime.mutate()}
            >
              {addOffTime.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
                : <><Plus className="h-4 w-4" /> Add Off-Time</>}
            </Button>
          </div>

          {/* ── Extra / make-up classes ─────────────────────────────── */}
          <div className="mt-6 border-t pt-5 space-y-3">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Dumbbell className="h-4 w-4" /> Extra classes taken (make-up for off-days)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Record an extra class this trainer took to make up an off-day. It credits every
                customer in that batch — one off-day bonus consumed each, pulling their plan dates back in.
              </p>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Class date</Label>
                  {/* Admin can backdate — only trainers are limited to today onward */}
                  <Input type="date" value={mkDate} onChange={(e) => setMkDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Society</Label>
                  <Select value={mkSociety || undefined} onValueChange={(v) => { setMkSociety(v); setMkSlot(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {trainerSocieties.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Slot <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select value={mkSlot || "all"} onValueChange={(v) => setMkSlot(v === "all" ? "" : v)} disabled={!mkSociety}>
                    <SelectTrigger><SelectValue placeholder="All slots" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All slots in society</SelectItem>
                      {makeupSlotOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="e.g. Make-up for 12 Jul off-day" value={mkNotes} onChange={(e) => setMkNotes(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {mkSociety
                    ? <>Will credit <span className="font-semibold text-foreground">{makeupTargets.length}</span> customer(s){mkSlot ? ` in ${mkSlot}` : ""}.</>
                    : "Pick a society to see who gets credited."}
                </p>
                <Button size="sm" className="gap-2 shrink-0"
                  disabled={addMakeup.isPending || !mkDate || !mkSociety || makeupTargets.length === 0}
                  onClick={() => addMakeup.mutate()}>
                  {addMakeup.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Plus className="h-4 w-4" /> Record</>}
                </Button>
              </div>
            </div>

            {trainerMakeups.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recorded ({trainerMakeups.length})</p>
                {trainerMakeups.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border p-2.5 group">
                    <div className="text-sm">
                      <span className="font-medium">{formatDate(m.class_date)}</span>
                      <span className="text-muted-foreground"> · {makeupName(m.client_id)}{m.notes ? ` · ${m.notes}` : ""}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { if (confirm("Delete this extra class? The customer's bonus will be restored.")) deleteMakeup.mutate({ id: m.id, clientId: m.client_id }); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOffDialog({ open: false, trainer: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Trainer Add/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit trainer" : "Add trainer"}</DialogTitle>
            <DialogDescription>
              Trainers can be assigned to one or many societies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Senior Longevity, Post-Surgical, Strength Training…" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Active</Label>
              <Checkbox checked={active} onCheckedChange={(c) => setActive(!!c)} />
            </div>

            <div className="space-y-2">
              <Label>Assigned societies</Label>
              {societies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No societies yet — create one first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {societies.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent">
                      <Checkbox
                        checked={societyIds.includes(s.id)}
                        onCheckedChange={(c) => toggleSociety(s.id, !!c)}
                      />
                      <span className="text-sm truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Time slots per society — the batches this trainer runs there */}
            {societyIds.length > 0 && (
              <div className="space-y-2">
                <Label>Time slots per society</Label>
                <p className="text-xs text-muted-foreground">
                  Add the slot timings this trainer takes in each society — customers are assigned one of these on their profile.
                </p>
                <div className="space-y-2.5">
                  {societyIds.map((sid) => {
                    const soc = societies.find((s) => s.id === sid);
                    const slots = slotsBySociety[sid] ?? [];
                    const draft = slotDraft[sid] ?? { start: "", end: "" };
                    return (
                      <div key={sid} className="rounded-lg border p-3 space-y-2">
                        <p className="text-sm font-medium">{soc?.name ?? "Society"}</p>
                        {slots.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {slots.map((slot) => (
                              <span key={slot}
                                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                {slot}
                                <button
                                  type="button"
                                  onClick={() => removeSlot(sid, slot)}
                                  className="text-muted-foreground hover:text-destructive leading-none"
                                  aria-label={`Remove ${slot}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="time"
                            className="w-auto"
                            value={draft.start}
                            onChange={(e) => setSlotDraft((p) => ({ ...p, [sid]: { ...draft, start: e.target.value } }))}
                            aria-label="Slot start time"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            className="w-auto"
                            value={draft.end}
                            onChange={(e) => setSlotDraft((p) => ({ ...p, [sid]: { ...draft, end: e.target.value } }))}
                            aria-label="Slot end time"
                          />
                          <Button type="button" size="sm" variant="outline"
                            onClick={() => addSlot(sid)} disabled={!draft.start || !draft.end}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add slot
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!editing && (
              <div className="rounded-lg border p-3 space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox checked={createLogin} onCheckedChange={(c) => setCreateLogin(!!c)} />
                  <span className="text-sm font-medium">Create a login account for this trainer</span>
                </label>
                {createLogin && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Temporary password (6+ chars)</Label>
                      <Input type="text" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Share with trainer; they sign in via the Staff tab.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
