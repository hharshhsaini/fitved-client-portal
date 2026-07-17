import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode } from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isValidEmail } from "@/lib/phoneAuth";

// Trainer password reset, powered by Firebase.
// Two modes:
//  • Arrived from the reset email (?oobCode=...) → set a new password here.
//  • Arrived directly → request a reset email.
// Tip: set the action URL in Firebase console → Authentication → Templates to
// https://<your-domain>/reset-password so the email lands on this page.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const oobCode = params.get("oobCode");
  const isConfirmMode = params.get("mode") === "resetPassword" && !!oobCode;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeChecked, setCodeChecked] = useState(false);
  const [codeValid, setCodeValid] = useState(false);

  // Validate the emailed code up front so a stale link fails fast.
  useEffect(() => {
    if (!isConfirmMode) return;
    verifyPasswordResetCode(firebaseAuth, oobCode!)
      .then((accountEmail) => { setEmail(accountEmail); setCodeValid(true); })
      .catch(() => setCodeValid(false))
      .finally(() => setCodeChecked(true));
  }, [isConfirmMode, oobCode]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode!, password);
      toast.success("Password updated — sign in with your new password.");
      navigate("/login");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(
        code === "auth/invalid-action-code" || code === "auth/expired-action-code"
          ? "This reset link is invalid or has expired — request a new one."
          : (err as { message?: string })?.message ?? "Could not update the password."
      );
    } finally { setBusy(false); }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { toast.error("Enter a valid email address"); return; }
    setBusy(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
      toast.success("Reset email sent — check your inbox.");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast.error(
        code === "auth/user-not-found"
          ? "No login exists for this email yet. Use “Set your password” on the sign-in page instead."
          : (err as { message?: string })?.message ?? "Could not send the reset email."
      );
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-elevated">
        {isConfirmMode ? (
          !codeChecked ? (
            <p className="text-sm text-muted-foreground">Checking your reset link…</p>
          ) : codeValid ? (
            <>
              <h1 className="font-display text-2xl">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a strong password{email ? <> for <span className="font-medium text-foreground">{email}</span></> : null}.
              </p>
              <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  {busy ? "Saving…" : "Update password"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl">Link expired</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This reset link is invalid or has already been used. Request a fresh one below.
              </p>
              <form onSubmit={handleRequest} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  {busy ? "Sending…" : "Send reset email"}
                </Button>
              </form>
            </>
          )
        ) : (
          <>
            <h1 className="font-display text-2xl">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your trainer email and we'll send you a reset link.
            </p>
            <form onSubmit={handleRequest} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? "Sending…" : "Send reset email"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
