import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate("/");
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-elevated">
        <h1 className="font-display text-2xl">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
