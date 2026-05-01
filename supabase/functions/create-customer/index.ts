import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin using their JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, name, phone, society, time_slot, trainer_id, send_invite } = body ?? {};

    if (!email || !name) {
      return new Response(JSON.stringify({ error: "email and name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a temp password
    const tempPassword = crypto.randomUUID() + "Aa1!";

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, phone },
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Create failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    // Update profile (it was auto-created by handle_new_user trigger)
    await admin.from("profiles").update({
      name,
      phone: phone ?? null,
      society: society ?? null,
      time_slot: time_slot ?? null,
      trainer_id: trainer_id ?? null,
    }).eq("id", newUserId);

    // Optionally send password setup email
    if (send_invite) {
      const redirectTo = `${req.headers.get("origin") ?? ""}/reset-password`;
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      // Use resetPasswordForEmail to actually send the email
      const userClient2 = createClient(SUPABASE_URL, ANON);
      await userClient2.auth.resetPasswordForEmail(email, { redirectTo });
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
