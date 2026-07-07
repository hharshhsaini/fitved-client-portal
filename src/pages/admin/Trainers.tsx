import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, CalendarOff, Clock } from "lucide-react";
import { toast } from "sonner";

interface Trainer {
  id: string;
  user_id: string | null;
  name: string;
  contact: string | null;
  specialization: string | null;
  active: boolean;
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

export default function Trainers() {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
  // Time slots this trainer runs, per society — customers pick from these.
  const [slotsBySociety, setSlotsBySociety] = useState<Record<string, string[]>>({});
  const [slotDraft, setSlotDraft] = useState<Record<string, { start: string; end: string }>>({});

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainers").select("*").order("name");
      if (error) throw error;
      return data as Trainer[];
    },
  });

  // Upcoming trainer off-times — the admin's heads-up for coverage planning
  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const { data: offTimes = [] } = useQuery({
    queryKey: ["admin-trainer-off-times"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trainer_off_times")
        .select("id, trainer_id, from_date, to_date, time_slot, reason")
        .gte("to_date", todayISO)
        .order("from_date");
      return (data ?? []) as {
        id: string; trainer_id: string; from_date: string; to_date: string;
        time_slot: string | null; reason: string | null;
      }[];
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

        // Staff login checks trainers.email + trainers.password directly, so a
        // plain insert is enough. user_id is the id the session will run under.
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

  const toggleSociety = (id: string, on: boolean) => {
    setSocietyIds((prev) => (on ? [...prev, id] : prev.filter((s) => s !== id)));
  };

  // Auto-fill default email when toggling create login
  useEffect(() => {
    if (createLogin && !loginEmail && name) {
      setLoginEmail(`${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@trainer.fitved.local`);
    }
  }, [createLogin, name, loginEmail]);

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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No trainers yet</TableCell></TableRow>
            ) : trainers.map((t) => {
              const count = links.filter((l) => l.trainer_id === t.id).length;
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

      {/* Upcoming trainer off-times — coverage heads-up */}
      {offTimes.length > 0 && (
        <Card className="rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning-foreground">
              <CalendarOff className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg">Upcoming trainer off-times</p>
              <p className="text-sm text-muted-foreground">
                {offTimes.length} scheduled — check batch coverage for these days
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {offTimes.map((o) => {
              const t = trainers.find((tr) => tr.id === o.trainer_id);
              const sameDay = o.from_date === o.to_date;
              const isNow = o.from_date <= todayISO;
              return (
                <li key={o.id} className="flex items-start justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{t?.name ?? "Unknown trainer"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sameDay
                        ? format(new Date(o.from_date + "T12:00:00"), "PPP")
                        : `${format(new Date(o.from_date + "T12:00:00"), "PP")} → ${format(new Date(o.to_date + "T12:00:00"), "PP")}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {o.time_slot
                        ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {o.time_slot}</span>
                        : <span>All slots</span>}
                      {o.reason && <span className="truncate">· {o.reason}</span>}
                    </div>
                  </div>
                  <Badge variant={isNow ? "default" : "secondary"} className="shrink-0">
                    {isNow ? "Off now" : "Upcoming"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

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
