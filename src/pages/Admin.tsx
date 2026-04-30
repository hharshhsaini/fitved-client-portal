import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanType } from "@/lib/dates";

interface ClientRow {
  id: string;
  name: string | null;
  trainer_id: string | null;
  plan_type: PlanType | null;
  plan_status: string | null;
}

export default function Admin() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      // Get all client user_ids
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles").select("id, name, trainer_id").in("id", ids);
      const { data: plans } = await supabase
        .from("plans").select("user_id, type, status").in("user_id", ids);

      return (profiles ?? []).map<ClientRow>((p) => {
        const plan = plans?.find((pl) => pl.user_id === p.id);
        return {
          id: p.id,
          name: p.name,
          trainer_id: p.trainer_id,
          plan_type: (plan?.type as PlanType) ?? null,
          plan_status: plan?.status ?? null,
        };
      });
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("role", "trainer");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, name").in("id", ids);
      return data ?? [];
    },
  });

  type PlanStatus = "active" | "paused" | "cancelled";
  const updatePlan = async (userId: string, patch: { type?: PlanType; status?: PlanStatus }) => {
    const { data: existing } = await supabase
      .from("plans").select("id").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("plans").update(patch).eq("id", existing.id);
      if (error) throw error;
    } else if (patch.type) {
      const { error } = await supabase.from("plans").insert({
        user_id: userId,
        type: patch.type,
        start_date: new Date().toISOString().slice(0, 10),
        next_payment_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        amount: 7499,
        status: patch.status ?? "active",
      });
      if (error) throw error;
    }
  };

  const updateTrainer = async (userId: string, trainerId: string | null) => {
    const { error } = await supabase.from("profiles").update({ trainer_id: trainerId }).eq("id", userId);
    if (error) throw error;
  };

  const handlePatch = async (patch: Partial<ClientRow>) => {
    if (!selected) return;
    try {
      if (patch.plan_type !== undefined || patch.plan_status !== undefined) {
        await updatePlan(selected.id, {
          type: (patch.plan_type ?? selected.plan_type) ?? undefined,
          status: ((patch.plan_status ?? selected.plan_status) as PlanStatus | null) ?? undefined,
        });
      }
      if (patch.trainer_id !== undefined) await updateTrainer(selected.id, patch.trainer_id);
      const next = { ...selected, ...patch };
      setSelected(next);
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleUpload = async () => {
    if (!selected || !reportFile || !reportTitle) {
      toast.error("Title and file required");
      return;
    }
    const path = `${selected.id}/${Date.now()}-${reportFile.name}`;
    const { error: upErr } = await supabase.storage
      .from("health-reports").upload(path, reportFile);
    if (upErr) { toast.error(upErr.message); return; }
    const { error: insErr } = await supabase.from("health_reports").insert({
      user_id: selected.id,
      title: reportTitle,
      report_date: new Date().toISOString().slice(0, 10),
      file_path: path,
    });
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Report uploaded");
    setReportTitle("");
    setReportFile(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Admin</h1>
        <p className="mt-1 text-muted-foreground">Manage clients, plans, trainers and reports.</p>
      </header>

      <Card className="rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="font-display text-xl">Clients</h2>
          <p className="text-sm text-muted-foreground">Click a row to edit plan, trainer or upload a report.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Trainer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No clients yet</TableCell></TableRow>
              ) : clients.map((c) => (
                <TableRow key={c.id} onClick={() => setSelected(c)} className="cursor-pointer">
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell>{c.plan_type ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {trainers.find((t) => t.id === c.trainer_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.plan_status === "active" ? "secondary" : "outline"}>
                      {c.plan_status ?? "no plan"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name ?? "Unnamed client"}</SheetTitle>
                <SheetDescription>{selected.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={selected.plan_type ?? undefined} onValueChange={(v) => handlePatch({ plan_type: v as PlanType })}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-month">1-month</SelectItem>
                      <SelectItem value="3-month">3-month</SelectItem>
                      <SelectItem value="6-month">6-month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned trainer</Label>
                  <Select value={selected.trainer_id ?? undefined} onValueChange={(v) => handlePatch({ trainer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                    <SelectContent>
                      {trainers.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No trainers — promote a user to trainer first.</div>
                      ) : trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name ?? "Unnamed"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plan status</Label>
                  <Select value={selected.plan_status ?? undefined} onValueChange={(v) => handlePatch({ plan_status: v })}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Upload health report</Label>
                  <Input placeholder="Report title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                  <div className="flex gap-2">
                    <Input type="file" accept="application/pdf" onChange={(e) => setReportFile(e.target.files?.[0] ?? null)} />
                    <Button variant="outline" onClick={handleUpload}><Upload className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <SheetFooter className="mt-8">
                <Button onClick={() => setSelected(null)}>Done</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
