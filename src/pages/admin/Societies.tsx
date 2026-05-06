import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Society {
  id: string;
  name: string;
  address: string | null;
}

export default function Societies() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Society | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const { data: societies = [] } = useQuery({
    queryKey: ["societies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("societies").select("*").order("name");
      if (error) throw error;
      return data as Society[];
    },
  });

  const { data: trainerLinks = [] } = useQuery({
    queryKey: ["society-trainer-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("trainer_societies").select("society_id, trainer_id");
      return data ?? [];
    },
  });

  const startNew = () => { setEditing(null); setName(""); setAddress(""); setOpen(true); };
  const startEdit = (s: Society) => { setEditing(s); setName(s.name); setAddress(s.address ?? ""); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      if (editing) {
        const { error } = await supabase.from("societies")
          .update({ name, address: address || null }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("societies").insert({ name, address: address || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Society updated" : "Society created");
      qc.invalidateQueries({ queryKey: ["societies"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("societies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["societies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Societies</h1>
          <p className="mt-1 text-muted-foreground">{societies.length} location(s)</p>
        </div>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Add society</Button>
      </header>

      <Card className="rounded-2xl shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead>Trainers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {societies.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No societies yet</TableCell></TableRow>
            ) : societies.map((s) => {
              const count = trainerLinks.filter((l) => l.society_id === s.id).length;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.address ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{count}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Delete ${s.name}?`)) remove.mutate(s.id);
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit society" : "Add society"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
            </div>
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
