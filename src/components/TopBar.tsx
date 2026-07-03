import { LogOut, Bell, Check, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function TopBar() {
  const { user, role, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [bellOpen, setBellOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const displayName = profile?.name || user?.email?.split("@")[0] || "there";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { data: pendingTrainers = [] } = useQuery({
    queryKey: ["pending-trainers"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_trainers")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleApprove = async (userId: string, name: string, email: string, passwordText: string, contact?: string | null) => {
    setBusyId(userId);
    try {
      const { error } = await supabase.rpc("approve_trainer", {
        p_user_id: userId,
        p_name: name,
        p_email: email,
        p_password: passwordText,
        p_contact: contact || null,
      });
      if (error) {
        toast.error("Approval failed: " + error.message);
      } else {
        toast.success(`Approved trainer "${name}"!`);
        qc.invalidateQueries({ queryKey: ["pending-trainers"] });
        qc.invalidateQueries({ queryKey: ["trainers"] });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setBusyId(userId);
    try {
      const { error } = await supabase.rpc("reject_trainer", {
        p_user_id: userId,
      });
      if (error) {
        toast.error("Rejection failed: " + error.message);
      } else {
        toast.success("Trainer account rejected and deleted.");
        qc.invalidateQueries({ queryKey: ["pending-trainers"] });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="text-foreground" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground hidden sm:block">
          Hi <span className="font-medium text-foreground">{firstName}</span> 👋 — here's your fitness overview
        </p>
        <p className="text-sm text-muted-foreground sm:hidden">Hi {firstName} 👋</p>
      </div>
      {role === "admin" && (
        <Badge variant="secondary" className="hidden sm:inline-flex">Admin</Badge>
      )}

      {role === "admin" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 text-muted-foreground hover:text-foreground"
            onClick={() => setBellOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {pendingTrainers.length > 0 && (
              <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>

          <Dialog open={bellOpen} onOpenChange={setBellOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Pending Trainer Signups</DialogTitle>
                <DialogDescription>
                  Review and approve new trainers before they can access the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {pendingTrainers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending approvals.</p>
                ) : (
                  pendingTrainers.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium truncate text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                        {t.contact && <p className="text-xs text-muted-foreground truncate">Phone: {t.contact}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">Pwd: <span className="font-mono bg-muted px-1 py-0.5 rounded">{t.password}</span></p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          disabled={busyId === t.user_id}
                          onClick={() => handleApprove(t.user_id, t.name, t.email, t.password, t.contact)}
                        >
                          <Check className="h-4.5 w-4.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          disabled={busyId === t.user_id}
                          onClick={() => handleReject(t.user_id)}
                        >
                          <X className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary-soft text-primary font-medium">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await signOut(); navigate("/login"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
