import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarOff, CreditCard, Download, FileHeart, MapPin, Clock, UserRound, ArrowRight, Bell } from "lucide-react";
import { mockPlan, mockProfile, mockReports, mockNotification, formatDate, daysBetween } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { downloadMockReport } from "@/lib/pdf";
import { toast } from "sonner";
import { usePauseStore } from "@/stores/pauseStore";

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name.split(" ")[0] ?? "there";
  const { activePause } = usePauseStore();

  const totalDays = daysBetween(mockPlan.startDate, mockPlan.nextPaymentDate);
  const elapsedDays = daysBetween(mockPlan.startDate, new Date().toISOString());
  const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const daysLeft = Math.max(0, totalDays - elapsedDays);
  const latest = mockReports[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl md:text-4xl text-foreground">Hi {firstName}, here's your overview</h1>
        <p className="mt-1 text-muted-foreground">A calm look at your fitness program today.</p>
      </header>

      {/* Notification banner */}
      <Card className="flex items-start gap-4 p-5 rounded-2xl border-primary/20 bg-primary-soft/60 shadow-card">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Bell className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-medium text-foreground">Upcoming session</p>
          <p className="text-sm text-muted-foreground">{mockNotification.message}</p>
        </div>
      </Card>

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
                <p className="font-display text-xl">{mockPlan.type}</p>
              </div>
            </div>
            <Badge variant="secondary">{daysLeft} days left</Badge>
          </div>
          <div className="mt-5 space-y-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{formatDate(mockPlan.startDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Next payment</p>
                <p className="font-medium">{formatDate(mockPlan.nextPaymentDate)}</p>
              </div>
            </div>
          </div>
          <Button asChild variant="ghost" className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent">
            <Link to="/plan">View plan details <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>

        {/* Pause card */}
        <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <CalendarOff className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Pause status</p>
              <p className="font-display text-xl">
                {activePause ? "Paused" : "Active"}
              </p>
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
              <p className="font-display text-xl">{latest.title}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Updated {formatDate(latest.date)}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => { downloadMockReport(latest.title); toast.success("Report download started"); }}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button asChild variant="outline">
              <Link to="/health">View all</Link>
            </Button>
          </div>
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
              <span>{mockProfile.society}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{mockProfile.timeSlot}</span>
            </li>
            <li className="flex items-start gap-3">
              <UserRound className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>Trainer: <span className="font-medium">{mockProfile.trainerName}</span></span>
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
