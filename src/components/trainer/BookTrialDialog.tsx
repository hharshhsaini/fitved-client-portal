import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Rocket } from "lucide-react";

const INTERESTS = [
  "Personal Training", "Yoga", "Weight Loss", "Strength Training",
  "Rehabilitation", "Online Coaching", "Other",
];

/**
 * FitVed "Book a free trial" dialog. Reused on public trainer profiles; the
 * captured lead records `preferred_trainer` so admin knows who drove it.
 * Writes to the `leads` table via the anon-writable insert policy.
 */
export default function BookTrialDialog({
  open, onOpenChange, trainerName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trainerName?: string | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Please enter your name");
      if (!/^[6-9]\d{9}$/.test(phone.trim())) throw new Error("Enter a valid 10-digit mobile number");
      const { error } = await (supabase as any).from("leads").insert({
        name: name.trim(),
        phone: phone.trim(),
        interest: interest || "Free trial",
        source: "trainer_profile",
        preferred_trainer: trainerName || null,
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: any) => toast.error(e.message || "Could not submit — please try again"),
  });

  const reset = () => { setName(""); setPhone(""); setInterest(""); setDone(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-fv-success" />
            <h3 className="mt-3 font-display text-xl text-fv-navy">You're all set! 🎉</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks{name ? `, ${name.split(" ")[0]}` : ""}! Our team will call you shortly to schedule your
              free trial{trainerName ? ` with ${trainerName}` : ""}.
            </p>
            <Button className="mt-5 w-full bg-fv-orange text-white hover:bg-fv-orange/90" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">Start risk-free</span>
              <DialogTitle className="font-display text-2xl">Book your FREE trial</DialogTitle>
              <DialogDescription>
                {trainerName ? `Train with ${trainerName} — n` : "N"}o payment, no card, zero commitment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Mobile number</Label>
                <Input inputMode="numeric" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">I'm interested in…</Label>
                <Select value={interest} onValueChange={setInterest}>
                  <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                  <SelectContent>
                    {INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-fv-orange text-white hover:bg-fv-orange/90 h-11 font-bold uppercase tracking-wider"
                disabled={submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Confirm free trial
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                🔒 100% Free · No Payment Required · Certified Trainers
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
