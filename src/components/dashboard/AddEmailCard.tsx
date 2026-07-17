import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isSignInWithEmailLink } from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { isValidEmail } from "@/lib/phoneAuth";

// Existing customers signed up before email was part of the flow, so their
// profile has none. This card lets them add + verify one after login using
// the same Firebase email-link used at signup. Entirely optional — customer
// login stays phone + DOB either way.

const ADD_EMAIL_KEY = "fitved_add_email"; // email awaiting verification
const DISMISS_KEY = "fitved_add_email_later"; // sessionStorage: hidden until next visit

// The emailed link reloads the page; guard so the one-time code is only
// consumed once even if React re-mounts the card.
let linkHandled = false;

export function AddEmailCard({
  profileId,
  profileEmail,
}: {
  profileId: string | undefined;
  profileEmail: string | null | undefined;
}) {
  const qc = useQueryClient();
  const { sendVerificationEmail, completeEmailVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  // Complete verification when the customer returns via the emailed link.
  useEffect(() => {
    if (!profileId || linkHandled) return;
    const href = window.location.href;
    if (!isSignInWithEmailLink(firebaseAuth, href)) return;
    const pendingEmail = localStorage.getItem(ADD_EMAIL_KEY);
    if (!pendingEmail) return; // a signup link is handled on /signup, not here
    linkHandled = true;
    (async () => {
      setBusy(true);
      const { error } = await completeEmailVerification(pendingEmail, href);
      window.history.replaceState({}, "", window.location.pathname);
      if (error) {
        toast.error(error);
        setSentTo(pendingEmail); // let them resend from the card
      } else {
        const { error: saveErr } = await supabase
          .from("profiles")
          .update({ email: pendingEmail })
          .eq("id", profileId);
        if (saveErr) {
          toast.error("Verified, but saving to your profile failed — please try again.");
        } else {
          localStorage.removeItem(ADD_EMAIL_KEY);
          toast.success("Email verified and added to your account ✓");
          qc.invalidateQueries({ queryKey: ["profile"] });
        }
      }
      setBusy(false);
    })();
  }, [profileId, completeEmailVerification, qc]);

  // Restore "link sent" state across the round-trip / reloads
  useEffect(() => {
    const pending = localStorage.getItem(ADD_EMAIL_KEY);
    if (pending) setSentTo(pending);
  }, []);

  if (!profileId || profileEmail || dismissed) return null;

  const send = async () => {
    if (!isValidEmail(email)) { toast.error("Enter a valid email address"); return; }
    setBusy(true);
    try {
      const { error } = await sendVerificationEmail(email, "/dashboard");
      if (error) { toast.error(error); return; }
      const clean = email.trim().toLowerCase();
      localStorage.setItem(ADD_EMAIL_KEY, clean);
      setSentTo(clean);
      toast.success(`Verification link sent to ${clean}`);
    } finally { setBusy(false); }
  };

  const later = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mx-4 md:mx-0 mb-4 rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: "rgba(240,167,32,0.45)" }}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "#fef3d0" }}>
          <Mail className="h-4.5 w-4.5" style={{ color: "#b07d10", height: 18, width: 18 }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#1E3A5F" }}>Add your email</p>
          {sentTo ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                We sent a verification link to <span className="font-medium text-foreground">{sentTo}</span>.
                Open it on this device to finish — you'll land right back here.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <button onClick={() => { setSentTo(null); localStorage.removeItem(ADD_EMAIL_KEY); }} className="text-muted-foreground hover:underline">
                  Change email
                </button>
                <button onClick={send} disabled={busy} className="font-medium text-primary hover:underline disabled:opacity-50">
                  {busy ? "Sending…" : "Resend link"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Get your health reports and account recovery on email. We'll send a one-time verification link.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-9 text-sm"
                />
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="h-9" onClick={send} disabled={busy}>
                    {busy ? "Sending…" : "Verify email"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-muted-foreground" onClick={later}>
                    Later
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
