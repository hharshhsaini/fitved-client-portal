import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Upload } from "lucide-react";
import { mockClients, trainers, type ClientRow, type PlanType } from "@/lib/mockData";
import { toast } from "sonner";

export default function Admin() {
  const [clients, setClients] = useState<ClientRow[]>(mockClients);
  const [selected, setSelected] = useState<ClientRow | null>(null);

  const updateSelected = (patch: Partial<ClientRow>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setSelected(next);
    setClients((list) => list.map((c) => (c.id === next.id ? next : c)));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Admin</h1>
        <p className="mt-1 text-muted-foreground">Manage clients, plans, trainers and reports.</p>
      </header>

      <Card className="flex items-start gap-3 p-4 rounded-2xl border-warning/30 bg-warning/10">
        <AlertCircle className="h-5 w-5 mt-0.5 text-warning-foreground" />
        <div className="text-sm">
          <p className="font-medium">Mock data</p>
          <p className="text-muted-foreground">Changes here update the UI for this session only and reset on refresh.</p>
        </div>
      </Card>

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
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Trainer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} onClick={() => setSelected(c)} className="cursor-pointer">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.plan}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.trainer}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "secondary" : "outline"}>
                      {c.status}
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
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={selected.plan} onValueChange={(v) => updateSelected({ plan: v as PlanType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-month">1-month</SelectItem>
                      <SelectItem value="3-month">3-month</SelectItem>
                      <SelectItem value="6-month">6-month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned trainer</Label>
                  <Select value={selected.trainer} onValueChange={(v) => updateSelected({ trainer: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {trainers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={(v) => updateSelected({ status: v as "active" | "paused" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report">Upload health report (visual only)</Label>
                  <div className="flex gap-2">
                    <Input id="report" type="file" accept="application/pdf" />
                    <Button variant="outline" onClick={() => toast.success("Report uploaded (demo)")}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <SheetFooter className="mt-8">
                <Button onClick={() => { toast.success("Client updated"); setSelected(null); }}>Done</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
