/**
 * ONE-TIME MIGRATION — move trainer credentials from Supabase into Firebase.
 *
 * For every trainer row in Supabase it will:
 *   1. create (or update) a Firebase Auth user with their email + current
 *      password, so their existing password keeps working;
 *   2. align the Firebase uid with our session key (trainers.user_id);
 *   3. wipe the plaintext password out of Supabase (trainers.password = "")
 *      so Firebase becomes the ONLY place a credential is stored.
 *
 * Safe to re-run: existing Firebase users are updated, never duplicated.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 *   1. Firebase console → Project settings → Service accounts →
 *      "Generate new private key". Save the downloaded JSON as:
 *          scripts/firebase-service-account.json          (already gitignored)
 *   2. From the project root:
 *          npm i -D firebase-admin
 *          node scripts/migrate-trainers-to-firebase.mjs
 */

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Public Supabase config (the publishable key is public by design; RLS is open).
const SUPABASE_URL = "https://eoexvygolxoygoqfrjzc.supabase.co";
const SUPABASE_KEY = "sb_publishable_I4EvxoI8Ysv9CxN_i9vL2Q_kZ8S-9iW";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./firebase-service-account.json", import.meta.url), "utf8"),
);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const trainers = await sb("trainers?select=id,user_id,name,email,password");
let created = 0, updated = 0, skipped = 0;

for (const t of trainers) {
  const email = (t.email || "").trim().toLowerCase();
  if (!email) { console.log(`• skip "${t.name}" — no email`); skipped++; continue; }
  const password = t.password && t.password.length >= 6 ? t.password : undefined;

  try {
    let fbUser = null;
    try { fbUser = await auth.getUserByEmail(email); } catch { /* not found */ }

    if (fbUser) {
      if (password) await auth.updateUser(fbUser.uid, { password });
      updated++;
      console.log(`• updated ${email}${password ? " (password set)" : ""}`);
    } else {
      await auth.createUser({
        uid: t.user_id,           // keep Firebase uid == our session key
        email,
        emailVerified: true,
        ...(password ? { password } : {}),
        ...(t.name ? { displayName: t.name } : {}),
      });
      created++;
      console.log(`• created ${email}${password ? " (password preserved)" : " — will need a password reset"}`);
    }

    // Firebase is now the credential store → remove the plaintext copy.
    await sb(`trainers?id=eq.${t.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ password: "" }),
    });
  } catch (e) {
    console.error(`✗ FAILED ${email}: ${e.message}`);
    skipped++;
  }
}

console.log(`\nDone — created ${created}, updated ${updated}, skipped ${skipped}.`);
console.log("Plaintext passwords cleared from Supabase (trainers.password).");
