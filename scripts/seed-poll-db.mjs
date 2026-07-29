// One-off: fully populate the consolidated poll tables in the MAIN FitVed
// project — seed the 7 bundled societies into poll_societies, seed poll_slots,
// and migrate any data:-URL society images into the society-images bucket.
//
//   node scripts/seed-poll-db.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const FITVED = "/Users/harshsaini/Desktop/fitved-client-portal";
const POLLS = "/Users/harshsaini/Desktop/New project/Society Poles";
const BUCKET = "society-images";

const env = readFileSync(FITVED + "/.env", "utf8");
const pick = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const sb = createClient(pick("VITE_SUPABASE_URL"), pick("VITE_SUPABASE_PUBLISHABLE_KEY"));

// 1. Seed the 7 bundled societies -----------------------------------------
const seeds = JSON.parse(readFileSync(POLLS + "/src/data/societies.json", "utf8"));
const seedRows = seeds.map((s) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  location: s.location,
  units_count: s.unitsCount,
  image_url: s.image,
  description: s.description ?? "",
  badge: s.badge ?? null,
}));
const r1 = await sb.from("poll_societies").upsert(seedRows, { onConflict: "id" });
console.log("seed poll_societies:", r1.error ? "ERR " + r1.error.message : "OK " + seedRows.length);

// 2. Seed poll_slots ------------------------------------------------------
const slots = [
  ["morning-6-7", "morning", "6:00 AM – 7:00 AM", 1],
  ["morning-7-8", "morning", "7:00 AM – 8:00 AM", 2],
  ["morning-8-9", "morning", "8:00 AM – 9:00 AM", 3],
  ["morning-9-10", "morning", "9:00 AM – 10:00 AM", 4],
  ["evening-6-7", "evening", "6:00 PM – 7:00 PM", 5],
  ["evening-7-8", "evening", "7:00 PM – 8:00 PM", 6],
  ["evening-8-9", "evening", "8:00 PM – 9:00 PM", 7],
].map(([id, category, label, display_order]) => ({ id, category, label, display_order }));
const r2 = await sb.from("poll_slots").upsert(slots, { onConflict: "id" });
console.log("seed poll_slots:", r2.error ? "ERR " + r2.error.message : "OK " + slots.length);

// 3. Migrate data:-URL images (admin-added rows) into the bucket ----------
const { data: rows, error } = await sb.from("poll_societies").select("id, slug, image_url");
if (error) { console.log("read rows:", "ERR " + error.message); process.exit(1); }
let migrated = 0;
for (const row of rows) {
  if (!row.image_url?.startsWith("data:")) continue;
  const m = row.image_url.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!m) { console.log(`skip ${row.slug}: unrecognised data URL`); continue; }
  const [, mime, b64] = m;
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buf = Buffer.from(b64, "base64");
  const path = `${row.slug}.${ext}`;
  const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: true });
  if (up.error) { console.log(`✗ ${row.slug}: ${up.error.message}`); continue; }
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const upd = await sb.from("poll_societies").update({ image_url: url }).eq("id", row.id);
  if (upd.error) { console.log(`✗ ${row.slug} update: ${upd.error.message}`); continue; }
  migrated++;
  console.log(`✓ migrated image → bucket: ${row.slug}`);
}
console.log(`\nDone. Data-URL images migrated: ${migrated}`);
const { count } = await sb.from("poll_societies").select("*", { count: "exact", head: true });
console.log("poll_societies total rows now:", count);
