/**
 * generate-booking-config.js
 * --------------------------
 * Generates /public/booking-config.js from .env at build/dev time.
 * booking-config.js is gitignored — keys never get committed.
 *
 * Runs automatically via "npm run dev" and "npm run build".
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseEnv(filePath) {
  try {
    const text = readFileSync(filePath, "utf8");
    const env = {};
    text.split("\n").forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    });
    return env;
  } catch {
    return {};
  }
}

const env = {
  ...parseEnv(resolve(root, ".env")),
  ...parseEnv(resolve(root, ".env.local")),
};

const SB_URL = env.VITE_SUPABASE_URL;
const SB_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error("[generate-booking-config] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const output = `/* Auto-generated — DO NOT COMMIT — gitignored */
window.FVConfig = { url: "${SB_URL}", key: "${SB_KEY}" };
`;

writeFileSync(resolve(root, "public/booking-config.js"), output, "utf8");
console.log("[generate-booking-config] public/booking-config.js created");
