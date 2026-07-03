import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProfile() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      if (role === "admin") {
        const { data, error } = await supabase
          .from("admins")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle();
        if (error) throw error;
        // Shape the admin row like a profiles row so every consumer
        // (Dashboard, Profile, TopBar) can read the same fields.
        return data
          ? {
              id: data.id,
              name: data.name,
              phone: data.phone,
              dob: null,
              email: "admin@fitved.com",
              society: "Admin Office",
              society_id: null,
              trainer_id: null,
              time_slot: "All day",
              avatar_url: null,
              full_name: data.name,
              created_at: data.created_at,
              updated_at: data.created_at,
            }
          : null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
