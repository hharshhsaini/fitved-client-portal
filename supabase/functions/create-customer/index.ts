import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_EMAIL_DOMAIN = "phone.fitved.local";

function dobToPassword(iso: string): string {
  // iso = YYYY-MM-DD → DDMMYYYY
  const [y, m, d] = iso.split("-");
  return `${d}${m}${y}`;
}

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
    const { name, phone, dob, society, time_slot, trainer_id } = body ?? {};

    const phoneDigits = String(phone ?? "").replace(/\D/g, "");
    if (!name || phoneDigits.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(String(dob ?? ""))) {
      return new Response(JSON.stringify({ error: "name, 10-digit phone, and dob (YYYY-MM-DD) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = `${phoneDigits}@${PHONE_EMAIL_DOMAIN}`;
    const password = dobToPassword(dob);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone: phoneDigits, dob },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Create failed";
      return new Response(JSON.stringify({ error: msg.includes("registered") ? "This phone is already registered" : msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    await admin.from("profiles").update({
      name,
      phone: phoneDigits,
      dob,
      society: society ?? null,
      time_slot: time_slot ?? null,
      trainer_id: trainer_id ?? null,
    }).eq("id", newUserId);

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
