import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Trainer {
  id: string;
  user_id: string | null;
  name: string;
  contact: string | null;
  specialization: string | null;
  active: boolean;
}

export default function Trainers() {
  const qc = useQueryClient();
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

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainers").select("*").order("name");
      if (error) throw error;
      return data as Trainer[];
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

  const startNew = () => {
    setEditing(null); setName(""); setContact(""); setSpecialization("");
    setActive(true); setSocietyIds([]); setCreateLogin(false);
    setLoginEmail(""); setLoginPassword(""); setOpen(true);
  };
  const startEdit = (t: Trainer) => {
    setEditing(t);
    setName(t.name); setContact(t.contact ?? ""); setSpecialization(t.specialization ?? "");
    setActive(t.active);
    setSocietyIds(links.filter((l) => l.trainer_id === t.id).map((l) => l.society_id));
    setCreateLogin(false); setLoginEmail(""); setLoginPassword("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      let trainerId = editing?.id;
      let userId = editing?.user_id ?? null;

      if (createLogin && !editing) {
        if (!loginEmail || loginPassword.length < 6) throw new Error("Email and password (6+ chars) required");
        const { data, error } = await supabase.functions.invoke("create-trainer", {
          body: {
            name, contact, specialization, active,
            email: loginEmail, password: loginPassword,
            society_ids: societyIds,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return;
      }

      if (editing) {
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
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Trainer updated" : "Trainer created");
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["trainer_societies"] });
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No trainers yet</TableCell></TableRow>
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
                  <TableCell><Badge variant={t.active ? "secondary" : "outline"}>{t.active ? "active" : "inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
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
