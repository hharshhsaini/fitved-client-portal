import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";

export function TasksTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["customer-tasks", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks").select("*").eq("client_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("tasks").insert({
        client_id: userId, trainer_id: user.id, title, notes: notes || null,
        due_date: due || null, completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added");
      setTitle(""); setNotes(""); setDue("");
      qc.invalidateQueries({ queryKey: ["customer-tasks", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("tasks").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-tasks", userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["customer-tasks", userId] });
    },
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">Assign task</h3>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>
          {create.isPending ? "Adding…" : "Add task"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        ) : tasks.map((t) => (
          <div key={t.id} className="flex items-start justify-between rounded-lg border p-3 gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                checked={t.completed}
                onCheckedChange={(c) => toggle.mutate({ id: t.id, completed: !!c })}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </div>
                {t.notes && <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div>}
                {t.due_date && <div className="text-xs text-muted-foreground mt-1">Due {formatDate(t.due_date)}</div>}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>×</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
