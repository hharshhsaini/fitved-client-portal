#!/usr/bin/env npx tsx
/**
 * Exports blog data from TypeScript modules to JSON files
 * consumed by the static HTML generator (scripts/generate-blog.js).
 *
 * Run from project root: npx tsx scripts/export-blog-data.ts
 */
import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, "../src/data/blog");

const b1path = resolve(DATA_DIR, "articles-batch1.ts");
const b2path = resolve(DATA_DIR, "articles-batch2.ts");
const b3path = resolve(DATA_DIR, "articles-batch3.ts");

const b1 = existsSync(b1path) ? (await import(b1path)).ARTICLES_BATCH1 : [];
const b2 = existsSync(b2path) ? (await import(b2path)).ARTICLES_BATCH2 : [];
const b3 = existsSync(b3path) ? (await import(b3path)).ARTICLES_BATCH3 : [];

if (!b2.length) console.warn("⚠ articles-batch2 empty or missing — skipping");

const cats = (await import(resolve(DATA_DIR, "categories.ts"))).CATEGORIES;
const hubsList = (await import(resolve(DATA_DIR, "hubs.ts"))).HUBS;

const all = [...b1, ...b2, ...b3];
const seen = new Set<string>();
const articles = all.filter((a: any) => {
  if (seen.has(a.slug)) return false;
  seen.add(a.slug);
  return true;
});
articles.sort((a: any, b: any) => b.publishedDate.localeCompare(a.publishedDate));

writeFileSync(resolve(DATA_DIR, "articles.json"), JSON.stringify(articles, null, 2));
writeFileSync(resolve(DATA_DIR, "categories.json"), JSON.stringify(cats, null, 2));
writeFileSync(resolve(DATA_DIR, "hubs.json"), JSON.stringify(hubsList, null, 2));

console.log(`Exported ${articles.length} articles, ${cats.length} categories, ${hubsList.length} hubs`);
