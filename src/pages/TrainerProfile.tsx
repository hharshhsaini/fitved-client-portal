import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Dumbbell, Building2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const GOLD   = "#f0a720";
const NAVY   = "#1E3A5F";
const MUTED  = "#8a8f9e";
const BORDER = "rgba(30,58,95,0.08)";

export default function TrainerProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: trainer } = useQuery({
    queryKey: ["my-trainer-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainers").select("id, name, contact, specialization, active")
        .or(`user_id.eq.${user!.id},id.eq.${user!.id}`).maybeSingle();
      return data;
    },
  });

  const { data: societies = [] } = useQuery({
    queryKey: ["my-trainer-societies", trainer?.id],
    enabled: !!trainer,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_societies")
        .select("societies(id, name)")
        .eq("trainer_id", trainer!.id);
      return (data ?? []).map((r: any) => r.societies).filter(Boolean) as { id: string; name: string }[];
    },
  });

  const displayName = trainer?.name ?? "Trainer";
  const initials = displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "T";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const infoRows = [
    { icon: Phone,    label: "Contact",        value: trainer?.contact        || "—" },
    { icon: Dumbbell, label: "Specialization", value: trainer?.specialization || "—" },
  ];

  return (
    <>
      {/* ── Mobile Layout ──────────────────────────────────────────── */}
      <div className="md:hidden" style={{ background: "#f4f2ee", minHeight: "100%" }}>
        <div style={{ padding: "8px 20px 20px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Your account</p>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: NAVY }}>
            Profile
          </h2>
        </div>

        {/* Avatar card */}
        <div className="mx-4 mb-4 rounded-3xl text-center"
          style={{ background: "#fff", padding: "28px 24px", border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(30,58,95,0.07)" }}>
          <div className="mx-auto mb-3 grid place-items-center rounded-full"
            style={{ width: 76, height: 76, background: GOLD, color: "#fff", fontSize: 26, fontWeight: 700 }}>
            {initials}
          </div>
          <p className="font-display" style={{ fontSize: 22, fontWeight: 600, color: NAVY }}>{displayName}</p>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Fitved Trainer</p>
        </div>

        {/* Info rows */}
        <div className="mx-4 mb-4 rounded-[20px] p-4"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          {infoRows.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className="flex items-center gap-3 py-3"
              style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
              <div className="grid place-items-center rounded-xl flex-shrink-0"
                style={{ width: 36, height: 36, background: "rgba(30,58,95,0.06)" }}>
                <Icon size={16} color={NAVY} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p className="font-medium truncate" style={{ fontSize: 14, color: NAVY }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Societies */}
        <div className="mx-4 mb-4 rounded-[20px] p-4"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <p className="font-semibold uppercase mb-3" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
            Assigned societies
          </p>
          {societies.length === 0 ? (
            <p style={{ fontSize: 13, color: MUTED }}>None assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {societies.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ background: "rgba(30,58,95,0.06)", fontSize: 12, fontWeight: 600, color: NAVY }}>
                  <Building2 size={12} /> {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="mx-4 mb-4 text-center" style={{ fontSize: 12, color: MUTED }}>
          To update your details, contact your admin.
        </p>

        <div className="mx-4 mb-6">
          <button onClick={handleSignOut}
            className="w-full rounded-2xl border-none cursor-pointer inline-flex items-center justify-center gap-2"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "13px", fontSize: 14, fontWeight: 700, color: "#ef4444" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      {/* ── Desktop Layout ─────────────────────────────────────────── */}
      <div className="hidden md:block space-y-6 max-w-2xl">
        <header>
          <h1 className="font-display text-3xl text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground">Your trainer account.</p>
        </header>

        <Card className="p-6 rounded-2xl shadow-card">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-2xl">{displayName}</p>
              <Badge variant="secondary" className="mt-1">Fitved Trainer</Badge>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border p-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-sm truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assigned societies</p>
            {societies.length === 0 ? (
              <p className="text-sm text-muted-foreground">None assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {societies.map((s) => (
                  <Badge key={s.id} variant="outline" className="gap-1.5">
                    <Building2 className="h-3 w-3" /> {s.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">To update your details, contact your admin.</p>

          <Button variant="outline" onClick={handleSignOut} className="mt-4 text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </Card>
      </div>
    </>
  );
}
