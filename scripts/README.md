# Auth / Firebase maintenance scripts

FitVed uses **two separate systems** that don't know about each other:

- **Firebase Auth** — stores trainer *credentials* (password / Google login).
- **Supabase** — stores all *data* (the `trainers`, `profiles`, `plans` … rows).

There is no built-in link between them, which is why the questions below come up.

---

## 1. "I deleted a user in the Firebase console but the Supabase row is still there"

That's expected. Deleting a Firebase user only removes the **login credential** —
nothing tells Supabase to delete the matching `trainers` row, so it stays.

**Recommended: delete trainers from the admin panel, not the Firebase console.**
Admin → Trainers → 🗑 now does a full Supabase cleanup (the trainer row plus their
societies, slots, off-times, comp classes, adjustments, role, and unlinks their
customers). The leftover Firebase login is harmless: with no `trainers` row, sign-in
is refused ("No trainer account found"), so a dangling credential can't get in.

**If you specifically want *console deletion* to auto-remove the Supabase row**, that
needs a server-side Firebase Cloud Function (`auth.user().onDelete`) — which requires
the **Blaze (pay-as-you-go) plan** and a Supabase service-role key. Snippet at the
bottom of this file; ask and I'll wire it up if you enable Blaze.

---

## 2 & 3. "Add all existing trainers to Firebase" + "stop storing passwords in Supabase"

Run the one-time migration — it creates a Firebase account for every trainer
(keeping their current password), then wipes the plaintext password from Supabase:

```bash
# 1. Firebase console → Project settings → Service accounts → Generate new private key
#    Save it as: scripts/firebase-service-account.json   (already gitignored)
npm i -D firebase-admin
node scripts/migrate-trainers-to-firebase.mjs
```

After it runs, Firebase is the **only** place trainer passwords live. Going forward
the app never writes a plaintext password to Supabase — admin-created trainers get an
email only, and their password is set in Firebase on first sign-in (or via Google).

> Note: you don't *have* to run this for logins to work — trainers already get a
> Firebase account automatically the first time they sign in. The migration just
> pre-loads everyone now and moves the existing passwords over.

Customers are **not** affected — they authenticate with phone + date of birth and
were never in Firebase.

---

## Optional: Cloud Function for console-delete → Supabase cleanup (needs Blaze)

```js
// functions/index.js
const functions = require("firebase-functions");

exports.onTrainerDeleted = functions.auth.user().onDelete(async (user) => {
  const email = (user.email || "").toLowerCase();
  if (!email) return;
  const URL = "https://eoexvygolxoygoqfrjzc.supabase.co/rest/v1";
  const KEY = process.env.SUPABASE_SERVICE_KEY; // set via firebase functions:config / secrets
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const rows = await (await fetch(`${URL}/trainers?select=id,user_id&email=eq.${email}`, { headers: h })).json();
  for (const t of rows) {
    for (const tbl of ["trainer_societies", "trainer_slots", "trainer_off_times", "comp_classes", "trainer_session_adjustments"])
      await fetch(`${URL}/${tbl}?trainer_id=eq.${t.id}`, { method: "DELETE", headers: h });
    await fetch(`${URL}/user_roles?user_id=eq.${t.user_id}`, { method: "DELETE", headers: h });
    await fetch(`${URL}/trainers?id=eq.${t.id}`, { method: "DELETE", headers: h });
  }
});
```
