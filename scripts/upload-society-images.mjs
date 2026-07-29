// Uploads the society poll photos (public/societies/*.jpg) to the MAIN FitVed
// Supabase Storage bucket `society-images`, then prints the public base URL.
//
// Prereq: run supabase/migrations/20260728140000_society_images_bucket.sql in
// the MAIN FitVed Supabase SQL editor first (creates the public bucket).
//
//   node scripts/upload-society-images.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env"), "utf8");
const pick = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = pick("VITE_SUPABASE_URL");
const key = pick("VITE_SUPABASE_PUBLISHABLE_KEY");
if (!url || !key) { console.error("Missing VITE_SUPABASE_* in .env"); process.exit(1); }

const sb = createClient(url, key);
const BUCKET = "society-images";
const dir = join(root, "public", "societies");
const files = readdirSync(dir).filter((f) => f.endsWith(".jpg"));
if (files.length === 0) { console.error("No .jpg files in public/societies/"); process.exit(1); }

let ok = 0;
for (const f of files) {
  const buf = readFileSync(join(dir, f));
  const { error } = await sb.storage.from(BUCKET).upload(f, buf, { contentType: "image/jpeg", upsert: true });
  if (error) { console.error(`✗ ${f}: ${error.message}`); continue; }
  ok++;
  console.log(`✓ ${f}`);
}
console.log(`\nUploaded ${ok}/${files.length}. Public base URL:`);
console.log(`${url}/storage/v1/object/public/${BUCKET}/`);
