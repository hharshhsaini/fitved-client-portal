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
      return json({ error: "Missing authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const {
      name, contact, specialization, active = true,
      email, password, society_ids = [],
    } = body ?? {};

    if (!name || !email || !password || password.length < 6) {
      return json({ error: "name, email and password (6+ chars) required" }, 400);
    }

    // 1. Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Create failed";
      return json({ error: msg.includes("registered") ? "This email is already registered" : msg }, 400);
    }
    const newUserId = created.user.id;

    // 2. Update profile name
    await admin.from("profiles").update({ name }).eq("id", newUserId);

    // 3. Replace default 'client' role with 'trainer'
    await admin.from("user_roles").delete().eq("user_id", newUserId).eq("role", "client");
    await admin.from("user_roles").insert({ user_id: newUserId, role: "trainer" });

    // 4. Create trainer record linked to this auth user
    const { data: trainer, error: trErr } = await admin.from("trainers").insert({
      user_id: newUserId,
      name,
      contact: contact ?? null,
      specialization: specialization ?? null,
      active,
    }).select("id").single();
    if (trErr) return json({ error: trErr.message }, 400);

    // 5. Link to societies
    if (Array.isArray(society_ids) && society_ids.length) {
      const rows = society_ids.map((sid: string) => ({ trainer_id: trainer.id, society_id: sid }));
      await admin.from("trainer_societies").insert(rows);
    }

    return json({ ok: true, trainer_id: trainer.id, user_id: newUserId }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
