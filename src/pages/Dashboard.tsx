import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarOff, CreditCard, Download, FileHeart, MapPin, Clock, UserRound, ArrowRight, Bell } from "lucide-react";
import { formatDate, daysBetween } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { usePauseStore } from "@/stores/pauseStore";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { activePause } = usePauseStore();
  const firstName = (profile?.name ?? user?.email?.split("@")[0] ?? "there").split(" ")[0];

  const { data: plan } = useQuery({
    queryKey: ["plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("plans").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: latestReport } = useQuery({
    queryKey: ["latest-report", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_reports").select("*").eq("user_id", user!.id)
        .order("report_date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: trainerName } = useQuery({
    queryKey: ["trainer-name", profile?.trainer_id],
    enabled: !!profile?.trainer_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("name").eq("id", profile!.trainer_id!).maybeSingle();
      return data?.name ?? null;
    },
  });

  const totalDays = plan ? daysBetween(plan.start_date, plan.end_date) : 0;
  const elapsedDays = plan ? daysBetween(plan.start_date, new Date().toISOString()) : 0;
  const progress = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;
  const daysLeft = Math.max(0, totalDays - elapsedDays);

  const handleDownload = async () => {
    if (!latestReport?.file_path) {
      toast.error("No file attached to this report");
      return;
    }
    const { data, error } = await supabase.storage
      .from("health-reports")
      .createSignedUrl(latestReport.file_path, 60);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl md:text-4xl text-foreground">Hi {firstName}, here's your overview</h1>
        <p className="mt-1 text-muted-foreground">A calm look at your fitness program today.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Plan card */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Your plan</p>
                <p className="font-display text-xl">{plan ? `${plan.total_sessions} sessions` : "Not assigned"}</p>
              </div>
            </div>
            {plan && <Badge variant="secondary">{daysLeft} days left</Badge>}
          </div>
          {plan ? (
            <>
              <div className="mt-5 space-y-3">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">{formatDate(plan.start_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Next plan starts</p>
                    <p className="font-medium">{formatDate(plan.renewal_date)}</p>
                  </div>
                </div>
              </div>
              <Button asChild variant="ghost" className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent">
                <Link to="/plan">View plan details <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">No plan assigned yet — your trainer will set this up.</p>
          )}
        </Card>

        {/* Pause card */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <CalendarOff className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Pause status</p>
              <p className="font-display text-xl">{activePause ? "Paused" : "Active"}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {activePause
              ? `Your classes are paused from ${formatDate(activePause.from)} to ${formatDate(activePause.to)}.`
              : "Your classes are running as scheduled. Need a break? Pause anytime."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/pause">Manage pause <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>

        {/* Health report */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileHeart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Latest health report</p>
              <p className="font-display text-xl">{latestReport?.title ?? "No reports yet"}</p>
            </div>
          </div>
          {latestReport ? (
            <>
              <p className="mt-5 text-sm text-muted-foreground">Updated {formatDate(latestReport.report_date)}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button asChild variant="outline">
                  <Link to="/health">View all</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Your trainer will share your first report soon.</p>
          )}
        </Card>

        {/* Profile snapshot */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Your details</p>
              <p className="font-display text-xl">Profile snapshot</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{profile?.society || "Add your society in Profile"}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{profile?.time_slot || "No time slot set"}</span>
            </li>
            <li className="flex items-start gap-3">
              <UserRound className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>Trainer: <span className="font-medium">{trainerName ?? "Not assigned"}</span></span>
            </li>
          </ul>
          <Button asChild variant="ghost" className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent">
            <Link to="/profile">Manage profile <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
