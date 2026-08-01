import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TrainerProfileForm from "@/components/trainer/TrainerProfileForm";
import TrainerMediaSection from "@/components/trainer/TrainerMediaSection";
import TrainerTestimonialsSection from "@/components/trainer/TrainerTestimonialsSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Images, MessageSquareQuote } from "lucide-react";

const NAVY = "#1E3A5F";

function SectionHeader({ icon: Icon, title, note }: { icon: any; title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="grid place-items-center h-8 w-8 rounded-lg shrink-0" style={{ background: "rgba(30,58,95,0.07)" }}>
        <Icon className="h-4 w-4" style={{ color: NAVY }} />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

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
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="media">Media &amp; Testimonials</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <TrainerProfileForm
              trainerId={trainer.id}
              contact={trainer.contact ?? null}
              onSignOut={handleSignOut}
            />
          </TabsContent>

          <TabsContent value="media">
            <div className="rounded-2xl border bg-card shadow-sm p-5 md:p-6 space-y-9">
              <section>
                <SectionHeader icon={Images} title="Media" note="· transformations, workout photos & videos" />
                <TrainerMediaSection trainerId={trainer.id} />
              </section>
              <section>
                <SectionHeader icon={MessageSquareQuote} title="Testimonials" note="· optional" />
                <TrainerTestimonialsSection trainerId={trainer.id} />
              </section>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
