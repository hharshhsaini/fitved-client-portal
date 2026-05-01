import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";

export function BillingTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["customer-billing", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_history").select("*").eq("user_id", userId)
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("billing_history").insert({
        user_id: userId, payment_date: date, amount: Number(amount), method: method || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setAmount(""); setMethod("");
      qc.invalidateQueries({ queryKey: ["customer-billing", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Record payment</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="UPI" />
          </div>
        </div>
        <Button onClick={() => add.mutate()} disabled={!amount || add.isPending}>
          {add.isPending ? "Saving…" : "Add payment"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">History</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : items.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{formatDate(b.payment_date)}</div>
              <div className="text-xs text-muted-foreground">{b.method ?? "—"}</div>
            </div>
            <div className="font-medium">₹{Number(b.amount).toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
