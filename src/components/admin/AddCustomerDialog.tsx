import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [society, setSociety] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [sendInvite, setSendInvite] = useState(true);

  const reset = () => {
    setEmail(""); setName(""); setPhone(""); setSociety(""); setTimeSlot(""); setSendInvite(true);
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-customer", {
        body: {
          email,
          name,
          phone: phone || null,
          society: society || null,
          time_slot: timeSlot || null,
          send_invite: sendInvite,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(sendInvite ? "Customer added — password setup email sent" : "Customer added");
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
      onCreated?.();
      reset();
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to create customer"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Create a new client account. They'll get an email to set their password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot">Time slot</Label>
              <Input id="slot" placeholder="6–7 AM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="society">Society</Label>
            <Input id="society" value={society} onChange={(e) => setSociety(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="invite" className="text-sm">Send password setup email</Label>
              <p className="text-xs text-muted-foreground">Customer sets their own password via email link</p>
            </div>
            <Switch id="invite" checked={sendInvite} onCheckedChange={setSendInvite} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!email || !name || create.isPending}>
            {create.isPending ? "Creating…" : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
