import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TrainerProfileForm from "@/components/trainer/TrainerProfileForm";
import { Loader2 } from "lucide-react";

export default function TrainerProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: trainer, isLoading } = useQuery({
    queryKey: ["my-trainer-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainers").select("id, name, contact, active")
        .or(`user_id.eq.${user!.id},id.eq.${user!.id}`).maybeSingle();
      return data;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 md:px-0 pb-10">
      <header className="mb-5 pt-1">
        <h1 className="font-display text-3xl text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">Your trainer account.</p>
      </header>

      {isLoading || !trainer?.id ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <TrainerProfileForm
          trainerId={trainer.id}
          contact={trainer.contact ?? null}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
