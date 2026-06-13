import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { homeForRole } from "@/lib/routes";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { FitvedLogo } from "@/components/FitvedLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isValidPhone, isValidDob, normalizePhone } from "@/lib/phoneAuth";

export default function Login() {
  const navigate = useNavigate();
  const { user, role, loading, roleLoading, signIn, signUp, signInWithPhone, signUpWithPhone } = useAuth();

  // Already signed in? Send them to their home instead of showing a dead-end login form.
  if (!loading && !roleLoading && user) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  // Customer state
  const [custMode, setCustMode] = useState<"signin" | "signup">("signin");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custDob, setCustDob] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);

  // Staff state
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [busy, setBusy] = useState(false);

  const handleCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(custPhone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!isValidDob(custDob)) {
      toast.error("Please pick a valid date of birth");
      return;
    }
    if (custMode === "signup" && !custName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setBusy(true);
    try {
      if (custMode === "signin") {
        const { error } = await signInWithPhone(custPhone, custDob!);
        if (error) {
          toast.error(error.includes("Invalid") ? "Phone or birthday doesn't match" : error);
          return;
        }
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await signUpWithPhone(custName.trim(), custPhone, custDob!);
        if (error) {
          toast.error(error.includes("registered") ? "This phone is already registered" : error);
          return;
        }
        toast.success("Account created — signing you in…");
        const { error: signInErr } = await signInWithPhone(custPhone, custDob!);
        if (!signInErr) navigate("/dashboard");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) { toast.error(error); return; }
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await signUp(email, password, name);
        if (error) { toast.error(error); return; }
        toast.success("Account created — check your email to confirm.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-soft overflow-hidden">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative">
          <FitvedLogo />
          <p className="mt-2 pl-1 text-xs uppercase tracking-[0.28em] text-primary/80">Fitness for grownups</p>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-5xl leading-tight text-foreground">
            Strong at every age.<br />
            <span className="text-primary">Calm in every move.</span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            A simpler way to manage your fitness program. Pause classes, track your plan,
            and stay close to your trainer — all in one calm place.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} Fitved Wellness</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 shadow-elevated rounded-2xl border-border/60">
          <div className="lg:hidden mb-6 flex flex-col items-center gap-1">
            <FitvedLogo />
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Fitness for grownups</p>
          </div>

          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="mt-5">
              <h2 className="font-display text-2xl text-foreground">
                {custMode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {custMode === "signin"
                  ? "Sign in with your phone and birthday."
                  : "Just a few details to get started."}
              </p>

              <form onSubmit={handleCustomer} className="mt-5 space-y-4">
                {custMode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="cname">Full name</Label>
                    <Input id="cname" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Your name" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="cphone">Phone number</Label>
                  <Input
                    id="cphone"
                    type="tel"
                    inputMode="numeric"
                    value={custPhone}
                    onChange={(e) => setCustPhone(normalizePhone(e.target.value).slice(0, 10))}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Popover open={dobOpen} onOpenChange={setDobOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !custDob && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {custDob ? format(custDob, "PPP") : <span>Pick your birthday</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={custDob}
                        onSelect={(d) => { setCustDob(d); setDobOpen(false); }}
                        captionLayout="dropdown"
                        fromYear={1925}
                        toYear={new Date().getFullYear()}
                        defaultMonth={custDob ?? new Date(1990, 0, 1)}
                        disabled={(d) => d > new Date() || d < new Date("1925-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Your birthday is your password — keep it private.</p>
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={busy}>
                  {busy ? "Please wait…" : custMode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {custMode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => setCustMode(custMode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                  {custMode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </TabsContent>

            <TabsContent value="staff" className="mt-5">
              <h2 className="font-display text-2xl text-foreground">
                {mode === "signin" ? "Staff sign in" : "Create staff account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">For trainers and admins.</p>

              <form onSubmit={handleStaff} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button type="button" className="text-xs text-primary hover:underline" onClick={handleForgot}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={busy}>
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "Need a staff account?" : "Already have an account?"}{" "}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
