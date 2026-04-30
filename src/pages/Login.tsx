import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { FitvedLogo } from "@/components/FitvedLogo";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    signIn(email, password, "client");
    toast.success(mode === "signin" ? "Welcome back!" : "Account created — welcome to Fitved!");
    navigate("/");
  };

  const quickEnter = (role: "client" | "admin") => {
    signIn(role === "admin" ? "admin@fitved.com" : "priya@example.com", "demo", role);
    navigate(role === "admin" ? "/admin" : "/");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-soft overflow-hidden">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative">
          <FitvedLogo />
          <p className="mt-2 pl-1 text-xs uppercase tracking-[0.28em] text-primary/80">
            Fitness for grownups
          </p>
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
          <ul className="space-y-3 text-[15px] text-foreground/80">
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pause classes when life happens</li>
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Health reports always at hand</li>
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Know your trainer, slot and plan</li>
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} Fitved Wellness</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 shadow-elevated rounded-2xl border-border/60">
          <div className="lg:hidden mb-6 flex flex-col items-center gap-1">
            <FitvedLogo />
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Fitness for grownups
            </p>
          </div>
          <h2 className="font-display text-3xl text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue your wellness journey." : "A few details to get you started."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
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
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast("Password reset link sent (demo)")}>
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full h-11 text-base">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Fitved?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

        </Card>
      </div>
    </div>
  );
}
