import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PlanOption {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  total_sessions: number | null;
  badge: string | null;
  active: boolean;
  sort_order: number;
}

const blankForm = {
  name: "", duration_months: "1", price: "", total_sessions: "", badge: "", active: true, sort_order: "0",
};

export default function Plans() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanOption | null>(null);
  const [form, setForm] = useState({ ...blankForm });

  const { data: plans = [] } = useQuery({
    queryKey: ["plan-options-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_options").select("*").order("sort_order").order("duration_months");
      if (error) throw error;
      return data as PlanOption[];
    },
  });

  const startNew = () => { setEditing(null); setForm({ ...blankForm }); setOpen(true); };
  const startEdit = (p: PlanOption) => {
    setEditing(p);
    setForm({
      name: p.name,
      duration_months: String(p.duration_months),
      price: String(p.price),
      total_sessions: p.total_sessions != null ? String(p.total_sessions) : "",
      badge: p.badge ?? "",
      active: p.active,
      sort_order: String(p.sort_order),
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      const price = Number(form.price);
      if (!(price > 0)) throw new Error("Enter a valid price");
      const payload = {
        name: form.name.trim(),
        duration_months: Number(form.duration_months) || 1,
        price,
        total_sessions: form.total_sessions ? Number(form.total_sessions) : null,
        badge: form.badge.trim() || null,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { error } = await supabase.from("plan_options").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plan_options").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Plan updated" : "Plan created");
      qc.invalidateQueries({ queryKey: ["plan-options-admin"] });
      qc.invalidateQueries({ queryKey: ["plan-options"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["plan-options-admin"] });
      qc.invalidateQueries({ queryKey: ["plan-options"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Plans</h1>
          <p className="mt-1 text-muted-foreground">
            {plans.length} plan(s) — the durations customers see under "Explore other plans"
          </p>
        </div>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Add plan</Button>
      </header>

      <Card className="rounded-2xl shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden md:table-cell">Months</TableHead>
              <TableHead className="hidden md:table-cell">Sessions</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No plans yet — add your 1 / 3 / 6 month plans</TableCell></TableRow>
            ) : plans.map((p) => (
              <TableRow key={p.id} className={p.active ? "" : "opacity-50"}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>₹{Number(p.price).toLocaleString("en-IN")}</TableCell>
                <TableCell className="hidden md:table-cell">{p.duration_months}</TableCell>
                <TableCell className="hidden md:table-cell">{p.total_sessions ?? "—"}</TableCell>
                <TableCell>{p.badge ? <Badge variant="secondary">{p.badge}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant={p.active ? "secondary" : "outline"}>{p.active ? "Active" : "Hidden"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${p.name}?`)) remove.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit plan" : "Add plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 3-Month plan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration (months) *</Label>
                <Input type="number" inputMode="numeric" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input type="number" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Total sessions</Label>
                <Input type="number" inputMode="numeric" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: e.target.value })} placeholder="optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder='e.g. "Best value" or "Save 15%"' />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Visible to customers under "Explore other plans"</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
              {save.isPending ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
