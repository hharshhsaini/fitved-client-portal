import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, MapPin, Phone, Clock, UserRound, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [society, setSociety] = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  const { data: trainer } = useQuery({
    queryKey: ["trainer", profile?.trainer_id],
    enabled: !!profile?.trainer_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name").eq("id", profile!.trainer_id!).maybeSingle();
      return data;
    },
  });

  const openDialog = () => {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setSociety(profile?.society ?? "");
    setTimeSlot(profile?.time_slot ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name, phone, society, time_slot: timeSlot })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    setOpen(false);
  };

  const displayName = profile?.name ?? user?.email?.split("@")[0] ?? "";
  const initials = displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";
  const trainerInitials = (trainer?.name ?? "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Your profile</h1>
          <p className="mt-1 text-muted-foreground">The details we use to deliver your fitness program.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={openDialog}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>Update your contact details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="society">Society</Label>
                <Input id="society" value={society} onChange={(e) => setSociety(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time slot</Label>
                <Input id="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} placeholder="e.g. 7:30 – 8:30 AM" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="p-6 md:p-8 rounded-2xl shadow-card">
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary-soft text-primary text-xl font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-2xl">{displayName || (isLoading ? "Loading…" : "Add your name")}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={user?.email ?? ""} />
          <InfoRow icon={Phone} label="Phone" value={profile?.phone || "—"} />
          <InfoRow icon={MapPin} label="Society" value={profile?.society || "—"} />
          <InfoRow icon={Clock} label="Time slot" value={profile?.time_slot || "—"} />
        </div>
      </Card>

      <Card className="p-6 rounded-2xl shadow-card">
        <h2 className="font-display text-xl">Your trainer</h2>
        {trainer?.name ? (
          <div className="mt-4 flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-accent text-accent-foreground font-medium">{trainerInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">{trainer.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" /> Your assigned trainer
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No trainer assigned yet.</p>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
