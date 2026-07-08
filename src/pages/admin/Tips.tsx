import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lightbulb, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Tip {
  id: string;
  text: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export default function Tips() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ["daily-tips-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_tips").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as Tip[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["daily-tips-admin"] });
    qc.invalidateQueries({ queryKey: ["daily-tips"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.trim()) throw new Error("Write a tip first");
      const { error } = await supabase.from("daily_tips").insert({ text: draft.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tip added"); setDraft(""); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed — run the daily_tips migration in Supabase first"),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editText.trim()) throw new Error("Tip can't be empty");
      const { error } = await supabase.from("daily_tips").update({ text: editText.trim() }).eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tip updated"); setEditingId(null); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("daily_tips").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_tips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tip deleted"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const activeCount = tips.filter((t) => t.active).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl text-foreground">Daily tips</h1>
        <p className="mt-1 text-muted-foreground">
          Wellness tips shown on the customer Health page — one per day, rotating through your active tips.
          {activeCount > 0 && ` · ${activeCount} active`}
        </p>
      </header>

      {/* Add form */}
      <Card className="rounded-2xl shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-fv-orange" style={{ color: "#f0a720" }} />
          <p className="font-medium text-sm">New tip</p>
        </div>
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Start your day with a glass of warm water to kickstart digestion."
        />
        <Button onClick={() => add.mutate()} disabled={!draft.trim() || add.isPending} className="gap-2">
          <Plus className="h-4 w-4" /> {add.isPending ? "Adding…" : "Add tip"}
        </Button>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tips.length === 0 ? (
          <Card className="rounded-2xl shadow-card p-8 text-center">
            <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No tips yet — add your first one above.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Until you add any, customers see a built-in set of default tips.
            </p>
          </Card>
        ) : tips.map((t) => (
          <Card key={t.id} className={`rounded-xl p-4 flex items-start gap-3 ${t.active ? "" : "opacity-60"}`}>
            {editingId === t.id ? (
              <div className="flex-1 space-y-2">
                <Textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>
                    {saveEdit.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="flex-1 text-sm text-foreground">{t.text}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={t.active ? "secondary" : "outline"} className="mr-1">
                    {t.active ? "Live" : "Hidden"}
                  </Badge>
                  <Switch checked={t.active} onCheckedChange={(v) => toggle.mutate({ id: t.id, active: v })} />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => { setEditingId(t.id); setEditText(t.text); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => { if (confirm("Delete this tip?")) remove.mutate(t.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
