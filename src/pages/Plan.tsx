import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { mockPlan, formatDate, daysBetween } from "@/lib/mockData";
import { toast } from "sonner";

const billing = [
  { id: "b1", date: "2026-02-15", amount: 7499, method: "UPI" },
  { id: "b2", date: "2025-11-15", amount: 7499, method: "UPI" },
  { id: "b3", date: "2025-08-15", amount: 7499, method: "Card" },
];

export default function Plan() {
  const [autoRenew, setAutoRenew] = useState(mockPlan.autoRenew);
  const totalDays = daysBetween(mockPlan.startDate, mockPlan.nextPaymentDate);
  const elapsed = daysBetween(mockPlan.startDate, new Date().toISOString());
  const daysLeft = Math.max(0, totalDays - elapsed);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Your plan</h1>
        <p className="mt-1 text-muted-foreground">All the details about your current Fitved plan.</p>
      </header>

      <Card className="p-6 md:p-8 rounded-2xl shadow-card overflow-hidden relative">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-soft">
              <CreditCard className="h-6 w-6" />
            </span>
            <div>
              <Badge className="mb-2 bg-primary-soft text-primary hover:bg-primary-soft">{mockPlan.type} plan</Badge>
              <p className="font-display text-2xl">₹{mockPlan.amount.toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">per cycle</p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Active
          </Badge>
        </div>

        <Separator className="my-6" />

        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">Plan started</dt>
            <dd className="mt-1 font-medium">{formatDate(mockPlan.startDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Next payment due</dt>
            <dd className="mt-1 font-medium">{formatDate(mockPlan.nextPaymentDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Days remaining</dt>
            <dd className="mt-1 font-medium">{daysLeft} days</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Payment method</dt>
            <dd className="mt-1 font-medium">{mockPlan.paymentMethod}</dd>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="font-medium">Auto-renewal</p>
              <p className="text-xs text-muted-foreground">Renew automatically at the end of each cycle.</p>
            </div>
            <Switch
              checked={autoRenew}
              onCheckedChange={(v) => { setAutoRenew(v); toast.success(v ? "Auto-renew enabled" : "Auto-renew disabled"); }}
            />
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => toast.success("Renewal initiated (demo)")}>Renew now</Button>
          <Button variant="outline" onClick={() => toast("Plan change request sent (demo)")}>Change plan</Button>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl shadow-card">
        <h2 className="font-display text-xl">Billing history</h2>
        <ul className="mt-4 divide-y divide-border">
          {billing.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{formatDate(b.date)}</p>
                <p className="text-xs text-muted-foreground">{b.method}</p>
              </div>
              <p className="font-medium">₹{b.amount.toLocaleString("en-IN")}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
