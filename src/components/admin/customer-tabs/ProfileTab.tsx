import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AppRole = "client" | "trainer" | "admin";

export function ProfileTab({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["customer-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ["all-trainers"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "trainer");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [] as { id: string; name: string | null }[];
      const { data } = await supabase.from("profiles").select("id, name").in("id", ids);
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["customer-roles", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [society, setSociety] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [trainerId, setTrainerId] = useState<string>("");
  const [newDob, setNewDob] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setSociety(profile.society ?? "");
      setTimeSlot(profile.time_slot ?? "");
      setTrainerId(profile.trainer_id ?? "");
    }
  }, [profile]);

  const resetDob = useMutation({
    mutationFn: async (date: Date) => {
      const iso = date.toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke("reset-customer-dob", {
        body: { user_id: userId, dob: iso },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Birthday reset — customer's password is now their new birthday");
      setNewDob(undefined);
      qc.invalidateQueries({ queryKey: ["customer-profile", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reset failed"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        name: name || null,
        phone: phone || null,
        society: society || null,
        time_slot: timeSlot || null,
        trainer_id: trainerId || null,
      }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["customer-profile", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const toggleRole = useMutation({
    mutationFn: async ({ role, add }: { role: AppRole; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries({ queryKey: ["customer-roles", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Role change failed"),
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Society</Label>
          <Input value={society} onChange={(e) => setSociety(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Time slot</Label>
          <Input value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Assigned trainer</Label>
        <Select value={trainerId || "none"} onValueChange={(v) => setTrainerId(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No trainer</SelectItem>
            {trainers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name ?? "Unnamed"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save profile"}
      </Button>

      <div className="border-t pt-5 space-y-3">
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-2">
          {(["client", "trainer", "admin"] as AppRole[]).map((r) => {
            const has = roles.includes(r);
            return (
              <Button
                key={r}
                size="sm"
                variant={has ? "default" : "outline"}
                onClick={() => toggleRole.mutate({ role: r, add: !has })}
                disabled={toggleRole.isPending}
              >
                {has ? `✓ ${r}` : `+ ${r}`}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Click to toggle. A user can have multiple roles.</p>
      </div>
    </div>
  );
}
