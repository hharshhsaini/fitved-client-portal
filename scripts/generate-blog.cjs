#!/usr/bin/env node
/**
 * Blog static-site generator for FitVed.
 *
 * Reads article metadata from src/data/blog/articles.json,
 * categories from src/data/blog/categories.json,
 * hubs from src/data/blog/hubs.json,
 * and generates:
 *   - public/blog/<slug>.html        for each article
 *   - public/blog/index.html         listing page  (PRESERVED — not overwritten)
 *   - public/blog/category/<slug>.html  category pages
 *   - public/blog/hub/<slug>.html       topic hub pages
 *   - public/sitemap-blog.xml
 *   - public/robots.txt
 *
 * The existing public/blog/is-a-personal-trainer-worth-it-in-india.html is NEVER
 * overwritten — it's hand-crafted and stays untouched.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const BLOG_DIR = path.join(PUBLIC, "blog");
const DATA_DIR = path.join(ROOT, "src", "data", "blog");
const DOMAIN = "https://getfitved.com";
const GA_ID = "G-WE15154PM9";

// ── Load data ──────────────────────────────────────────────────
function loadJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

let articles, categories, hubs;
try {
  articles = loadJSON("articles.json");
  categories = loadJSON("categories.json");
  hubs = loadJSON("hubs.json");
} catch (e) {
  console.error("❌ Could not load blog data:", e.message);
  console.error("   Run: npx tsx scripts/export-blog-data.ts  first");
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────
const PROTECTED = new Set(["is-a-personal-trainer-worth-it-in-india"]);

function imgSrc(slug) {
  const webp = `/images/blog/${slug}.webp`;
  const jpg = `/images/blog/${slug}.jpg`;
  if (fs.existsSync(path.join(PUBLIC, webp.slice(1)))) return webp;
  if (fs.existsSync(path.join(PUBLIC, jpg.slice(1)))) return jpg;
  return "/images/blog/default.webp";
}

function imgAbsolute(slug) {
  return DOMAIN + imgSrc(slug);
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function formatDate(d) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dt = new Date(d + "T00:00:00");
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function shortDate(d) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.toLocaleString("en-US", { month: "short" })} ${dt.getFullYear()}`;
}

const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));
const catNameMap = Object.fromEntries(categories.map(c => [c.name.toLowerCase(), c]));
const hubMap = Object.fromEntries(hubs.map(h => [h.slug, h]));
const slugMap = Object.fromEntries(articles.map(a => [a.slug, a]));

// Extra display-name → slug aliases for categories articles may use
const CAT_ALIASES = {
  "home workout": "home-workout",
  "women's health": "women",
  "womens health": "women",
  "fatty liver": "fatty-liver",
  "food & fitness myths": "fitness",
  "food and fitness myths": "fitness",
  "gym & equipment": "gym",
  "gym and equipment": "gym",
  "healthy habits & lifestyle": "healthy-habits",
  "healthy habits and lifestyle": "healthy-habits",
  "indian superfoods": "nutrition",
  "meal plans": "meal-plans",
  "pregnancy & postpartum": "pregnancy",
  "pregnancy and postpartum": "pregnancy",
  "senior fitness": "fitness",
  "teen fitness": "fitness",
  "vitamins & minerals": "supplements",
  "vitamins and minerals": "supplements",
  "yoga": "yoga",
  "corporate wellness": "corporate-wellness",
  "heart health": "heart-health",
  "sleep & recovery": "sleep",
  "sleep and recovery": "sleep",
  "mental wellness": "mental-wellness",
  "gut health": "gut-health",
  "walking & running": "walking",
  "walking and running": "walking",
  "hiit & cardio": "fitness",
  "hiit and cardio": "fitness",
  "strength training": "strength",
  "indian diet": "indian-diet",
  "weight loss": "weight-loss",
  "muscle gain": "muscle-gain",
};

// Normalize article categories: articles may use display names ("Weight Loss")
// or slugs ("weight-loss"). Resolve to slug.
articles.forEach(a => {
  if (catMap[a.category]) return; // already a slug
  const lower = a.category.toLowerCase();
  const byName = catNameMap[lower];
  if (byName) { a.category = byName.slug; return; }
  const alias = CAT_ALIASES[lower];
  if (alias) { a.category = alias; return; }
  // Last resort: kebab-case the name
  a.category = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
});

function related(a) {
  return (a.relatedSlugs || []).map(s => slugMap[s]).filter(Boolean).slice(0, 4);
}

function articlesForCategory(catSlug) {
  return articles.filter(a => a.category === catSlug);
}

function articlesForHub(hubSlug) {
  return articles.filter(a => a.hub === hubSlug);
}

// ── Common HTML parts ──────────────────────────────────────────
const GA_SNIPPET = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>`;

const COMMON_CSS = `
:root{--navy:#1E3A5F;--orange:#FF6B35;--gold:#f0a720;--ink:#26303f;--muted:#6b7280;--line:#e7e9ee;--bg:#f7f8fa;--soft:#f6f8fb}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.65}
a{color:var(--navy);text-decoration:none}a:hover{color:var(--orange)}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.wrap-narrow{max-width:760px;margin:0 auto;padding:0 20px}
h1,h2,h3,h4{font-family:'Fraunces',serif;color:var(--navy);line-height:1.15}
header.site{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);z-index:20}
header.site .bar{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{font-family:'Fraunces',serif;font-weight:700;font-size:22px;color:var(--navy)}
.logo span{color:var(--orange)}
.cta-top{background:var(--orange);color:#fff;font-weight:600;font-size:14px;padding:9px 16px;border-radius:999px}
.cta-top:hover{background:#e55a28;color:#fff}
.crumbs{font-size:13px;color:var(--muted);margin:22px 0 6px}
.crumbs a{color:var(--muted)}
.crumbs a:hover{color:var(--orange)}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding:24px 0;color:var(--muted);font-size:13px}
footer.site a{color:var(--navy);margin-right:16px}
footer.site a:hover{color:var(--orange)}
`;

function header() {
  return `<header class="site"><div class="wrap bar"><a class="logo" href="/">Fit<span>Ved</span></a><div style="display:flex;align-items:center;gap:12px"><a href="/blog/" style="font-size:14px;font-weight:600;color:var(--navy)">Blog</a><a class="cta-top" href="/trainers">Find a Trainer</a></div></div></header>`;
}

function footer() {
  return `<footer class="site"><div class="wrap"><a href="/">FitVed home</a><a href="/blog/">Blog</a><a href="/trainers">Find a trainer</a><a href="tel:+919606047293">+91 9606047293</a><p style="margin-top:12px">© 2026 FitVed — Society-based yoga &amp; personal training in Bangalore.</p></div></footer>`;
}

function bookingScripts() {
  return `<script src="/booking-config.js"></script><script src="/booking-modal.js"></script>`;
}

// ── Article page ───────────────────────────────────────────────
function generateArticle(a) {
  const cat = catMap[a.category];
  const catName = cat ? cat.name : a.category;
  const rel = related(a);
  const img = imgSrc(a.slug);
  const imgAbs = imgAbsolute(a.slug);

  const faqSchema = a.faqs && a.faqs.length ? `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: a.faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  })}</script>` : "";

  const articleSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.metaDescription,
    image: imgAbs,
    datePublished: a.publishedDate,
    dateModified: a.updatedDate,
    author: { "@type": "Organization", name: "FitVed", url: DOMAIN + "/" },
    publisher: { "@type": "Organization", name: "FitVed", logo: { "@type": "ImageObject", url: DOMAIN + "/favicon.svg" } },
    mainEntityOfPage: DOMAIN + "/blog/" + a.slug,
  })}</script>`;

  const breadcrumbSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: DOMAIN + "/blog/" },
      ...(cat ? [{ "@type": "ListItem", position: 3, name: catName, item: DOMAIN + "/blog/category/" + a.category }] : []),
      { "@type": "ListItem", position: cat ? 4 : 3, name: a.title, item: DOMAIN + "/blog/" + a.slug },
    ],
  })}</script>`;

  const faqHtml = a.faqs && a.faqs.length ? `
    <section class="faq-section">
      <h2 id="faq">Frequently Asked Questions</h2>
      ${a.faqs.map(f => `<details class="faq-item"><summary>${escHtml(f.question)}</summary><p>${escHtml(f.answer)}</p></details>`).join("\n      ")}
    </section>` : "";

  const relHtml = rel.length ? `
    <section class="related">
      <h2>Related Reading</h2>
      <div class="related-grid">
        ${rel.map(r => `<a href="/blog/${r.slug}" class="related-card">
          <img src="${imgSrc(r.slug)}" alt="${escAttr(r.imageAlt)}" loading="lazy" width="300" height="200"/>
          <div class="related-body"><span class="tag">${escHtml(catMap[r.category]?.name || r.category)}</span><h3>${escHtml(r.title)}</h3><p>${escHtml(r.excerpt)}</p></div>
        </a>`).join("\n        ")}
      </div>
    </section>` : "";

  const idx = articles.indexOf(a);
  const prev = idx > 0 ? articles[idx - 1] : null;
  const next = idx < articles.length - 1 ? articles[idx + 1] : null;
  const navHtml = (prev || next) ? `
    <nav class="prev-next">
      ${prev ? `<a href="/blog/${prev.slug}" class="pn-link prev"><span class="pn-label">← Previous</span><span class="pn-title">${escHtml(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a href="/blog/${next.slug}" class="pn-link next"><span class="pn-label">Next →</span><span class="pn-title">${escHtml(next.title)}</span></a>` : '<span></span>'}
    </nav>` : "";

  const hubLink = a.hub && hubMap[a.hub] ? `<p class="hub-link">Part of the <a href="/blog/hub/${a.hub}">${escHtml(hubMap[a.hub].name)}</a></p>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${GA_SNIPPET}
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<title>${escHtml(a.metaTitle)}</title>
<meta name="description" content="${escAttr(a.metaDescription)}"/>
<meta name="keywords" content="${escAttr([a.primaryKeyword, ...a.secondaryKeywords].join(", "))}"/>
<meta name="author" content="${escAttr(a.author)}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="${DOMAIN}/blog/${a.slug}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${escAttr(a.metaTitle)}"/>
<meta property="og:description" content="${escAttr(a.metaDescription)}"/>
<meta property="og:url" content="${DOMAIN}/blog/${a.slug}"/>
<meta property="og:image" content="${imgAbs}"/>
<meta property="og:site_name" content="FitVed"/>
<meta property="article:published_time" content="${a.publishedDate}"/>
<meta property="article:modified_time" content="${a.updatedDate}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escAttr(a.metaTitle)}"/>
<meta name="twitter:description" content="${escAttr(a.metaDescription)}"/>
<meta name="twitter:image" content="${imgAbs}"/>
<meta name="theme-color" content="#1E3A5F"/>
${FONTS}
${articleSchema}
${breadcrumbSchema}
${faqSchema}
<style>${COMMON_CSS}
.hero-img{width:100%;max-height:420px;object-fit:cover;border-radius:16px;margin:18px 0}
.hero-img-caption{font-size:12px;color:var(--muted);margin:-10px 0 16px;text-align:center}
h1{font-size:clamp(26px,4vw,36px);margin:8px 0 10px}
.meta{font-size:13px;color:var(--muted);margin-bottom:16px;display:flex;flex-wrap:wrap;gap:8px 16px}
.content{font-size:16px;line-height:1.75}
.content h2{font-size:22px;margin:32px 0 10px}
.content h3{font-size:18px;margin:24px 0 8px}
.content p{margin:12px 0}
.content ul,.content ol{padding-left:20px;margin:12px 0}
.content li{margin:6px 0}
.content blockquote{border-left:3px solid var(--orange);padding:12px 16px;margin:16px 0;background:rgba(255,107,53,.04);border-radius:0 8px 8px 0}
.tag{display:inline-block;background:rgba(255,107,53,.1);color:var(--orange);padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
.hub-link{margin:16px 0;font-size:14px;color:var(--muted)}
.hub-link a{color:var(--orange);font-weight:600}
.faq-section{margin:36px 0}
.faq-item{border:1px solid var(--line);border-radius:10px;margin:8px 0;overflow:hidden}
.faq-item summary{padding:14px 16px;font-weight:600;cursor:pointer;font-size:15px;list-style:none}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::before{content:"＋";margin-right:10px;color:var(--orange);font-weight:700}
.faq-item[open] summary::before{content:"−"}
.faq-item p{padding:0 16px 14px;color:var(--muted);font-size:14px;line-height:1.6}
.related{margin:40px 0 20px}
.related h2{font-size:20px;margin-bottom:16px}
.related-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.related-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;transition:border-color .2s,transform .2s}
.related-card:hover{border-color:var(--orange);transform:translateY(-2px)}
.related-card img{width:100%;height:160px;object-fit:cover}
.related-body{padding:12px 14px}
.related-body h3{font-size:15px;margin:6px 0 4px;color:var(--navy);line-height:1.3}
.related-body p{font-size:13px;color:var(--muted);line-height:1.4}
.prev-next{display:flex;justify-content:space-between;gap:16px;margin:30px 0;flex-wrap:wrap}
.pn-link{flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:14px;transition:border-color .2s}
.pn-link:hover{border-color:var(--orange)}
.pn-label{font-size:12px;color:var(--muted);display:block;margin-bottom:4px}
.pn-title{font-size:14px;font-weight:600;color:var(--navy)}
.pn-link.next{text-align:right}
.cta-box{background:linear-gradient(135deg,var(--navy),#2d5a8e);color:#fff;border-radius:16px;padding:24px;margin:30px 0;text-align:center}
.cta-box h3{color:#fff;margin:0 0 6px;font-size:20px}
.cta-box p{color:rgba(255,255,255,.85);margin:0 0 14px;font-size:15px}
.btn{display:inline-block;background:var(--orange);color:#fff;font-weight:700;padding:12px 22px;border-radius:999px;font-size:14px}
.btn:hover{background:#e55a28;color:#fff}
</style>
${bookingScripts()}
</head>
<body>
${header()}
<main class="wrap-narrow">
  <nav class="crumbs"><a href="/">Home</a> › <a href="/blog/">Blog</a>${cat ? ` › <a href="/blog/category/${a.category}">${escHtml(catName)}</a>` : ""} › ${escHtml(a.title)}</nav>
  <h1>${escHtml(a.title)}</h1>
  <div class="meta">
    <span>${formatDate(a.updatedDate)}</span>
    <span>·</span>
    <span>${a.readTime} min read</span>
    <span>·</span>
    <span>By ${escHtml(a.author)}</span>
  </div>
  ${hubLink}
  <img class="hero-img" src="${img}" alt="${escAttr(a.imageAlt)}" width="760" height="420" loading="eager"/>
  ${a.imageCaption ? `<p class="hero-img-caption">${escHtml(a.imageCaption)}</p>` : ""}

  <div class="content">
    <p class="lead" style="font-size:18px;color:#374151">${escHtml(a.excerpt)}</p>

    <h2>Key Takeaways</h2>
    <ul>
      ${a.secondaryKeywords.slice(0, 4).map(k => `<li>${escHtml(k.charAt(0).toUpperCase() + k.slice(1))}: what you need to know</li>`).join("\n      ")}
    </ul>

    <h2>What You Need to Know About ${escHtml(a.title.replace(/[?—–:]/g, "").trim().split(" ").slice(0, 6).join(" "))}</h2>
    <p>This guide covers everything Indian readers need to know about ${escHtml(a.primaryKeyword)}. Whether you're a beginner or have been on your fitness journey for years, the information here is grounded in evidence and adapted for Indian diets, lifestyles, and budgets.</p>

    <blockquote>"The best fitness advice is the advice you'll actually follow. Everything here is designed to be practical, affordable, and sustainable for Indian households." — FitVed Team</blockquote>

    <h2>Why This Matters for Indians</h2>
    <p>India has unique nutritional challenges — from widespread protein deficiency to high carb-heavy diets, sedentary desk jobs, and specific health conditions like diabetes and thyroid disorders. Understanding ${escHtml(a.primaryKeyword)} in the Indian context makes all the difference between advice that works and advice that doesn't.</p>

    <h2>Practical Tips</h2>
    <ul>
      <li>Start with small, sustainable changes rather than drastic overhauls</li>
      <li>Use locally available Indian foods — imported superfoods aren't necessary</li>
      <li>Consult a certified trainer or nutritionist for personalized guidance</li>
      <li>Track your progress weekly, not daily</li>
    </ul>

    <div class="cta-box">
      <h3>Need Personalized Guidance?</h3>
      <p>FitVed's certified trainers in Bangalore can create a plan tailored to your goals, body, and schedule.</p>
      <a class="btn" href="/trainers">Find a Trainer</a>
    </div>

    <h2>The Bottom Line</h2>
    <p>Understanding ${escHtml(a.primaryKeyword)} is the first step. Taking action is what changes your health. Start with one thing from this guide today, and build from there.</p>
  </div>

  ${faqHtml}
  ${relHtml}
  ${navHtml}
</main>
${footer()}
</body>
</html>`;
}

// ── Listing page ───────────────────────────────────────────────
function generateListing() {
  const grouped = {};
  categories.forEach(c => { grouped[c.slug] = []; });
  articles.forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  });

  const catLinks = categories.map(c =>
    `<a href="/blog/category/${c.slug}" class="cat-chip">${escHtml(c.name)} <span class="cat-count">${(grouped[c.slug] || []).length}</span></a>`
  ).join("\n        ");

  const hubLinks = hubs.map(h =>
    `<a href="/blog/hub/${h.slug}" class="hub-chip">${escHtml(h.name)}</a>`
  ).join("\n        ");

  const featuredArticles = articles.slice(0, 6);
  const recentArticles = [...articles].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)).slice(0, 12);
  const popularArticles = articles.slice(0, 100);

  const cardHtml = (a) => `<a href="/blog/${a.slug}" class="card">
          <img src="${imgSrc(a.slug)}" alt="${escAttr(a.imageAlt)}" loading="lazy" width="400" height="240"/>
          <div class="card-body">
            <span class="tag">${escHtml(catMap[a.category]?.name || a.category)}</span>
            <h3>${escHtml(a.title)}</h3>
            <p>${escHtml(a.excerpt)}</p>
            <span class="card-meta">${shortDate(a.publishedDate)} · ${a.readTime} min</span>
          </div>
        </a>`;

  // SEO footer sections
  const seoFooterGroups = [
    { title: "Explore by Goal", links: categories.filter(c => c.group === "Goal").map(c => ({ name: c.name, href: `/blog/category/${c.slug}` })) },
    { title: "Explore by Health Condition", links: categories.filter(c => c.group === "Health Condition").map(c => ({ name: c.name, href: `/blog/category/${c.slug}` })) },
    { title: "Explore by Nutrition", links: categories.filter(c => c.group === "Nutrition").map(c => ({ name: c.name, href: `/blog/category/${c.slug}` })) },
    { title: "Explore by Workout", links: categories.filter(c => c.group === "Workout").map(c => ({ name: c.name, href: `/blog/category/${c.slug}` })) },
    { title: "Explore by Audience", links: categories.filter(c => c.group === "Audience").map(c => ({ name: c.name, href: `/blog/category/${c.slug}` })) },
    { title: "Topic Hubs", links: hubs.map(h => ({ name: h.name, href: `/blog/hub/${h.slug}` })) },
  ];

  const seoFooterHtml = seoFooterGroups.map(g => `
      <div class="seo-col">
        <h4>${escHtml(g.title)}</h4>
        <ul>${g.links.map(l => `<li><a href="${l.href}">${escHtml(l.name)}</a></li>`).join("")}</ul>
      </div>`).join("");

  const popularLinksHtml = popularArticles.map(a =>
    `<li><a href="/blog/${a.slug}">${escHtml(a.title)}</a></li>`
  ).join("\n            ");

  const archiveMonths = ["January","February","March","April","May","June","July","August"];
  const archiveHtml = archiveMonths.map(m => `<li><a href="/blog/">${m} 2026</a></li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${GA_SNIPPET}
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<title>FitVed Journal — Indian Health, Fitness & Nutrition Guides</title>
<meta name="description" content="500+ evidence-based guides on Indian nutrition, fitness, weight loss, yoga, PCOS, diabetes, and healthy living. Written by certified coaches in Bangalore."/>
<meta name="keywords" content="fitness blog India, Indian diet plan, weight loss India, protein guide, PCOS diet, diabetes exercise, healthy Indian recipes"/>
<meta name="author" content="FitVed"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="${DOMAIN}/blog/"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="FitVed Journal — Indian Health & Fitness Guides"/>
<meta property="og:description" content="500+ evidence-based guides on Indian nutrition, fitness, weight loss, and healthy living."/>
<meta property="og:url" content="${DOMAIN}/blog/"/>
<meta property="og:image" content="${DOMAIN}/images/blog/default.webp"/>
<meta property="og:site_name" content="FitVed"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#1E3A5F"/>
${FONTS}
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "FitVed Journal",
    url: DOMAIN + "/blog/",
    description: "Evidence-based Indian health, fitness, and nutrition guides.",
    publisher: { "@type": "Organization", name: "FitVed", url: DOMAIN + "/" },
  })}</script>
<style>${COMMON_CSS}
.hero{padding:48px 0 32px;text-align:center}
.hero h1{font-size:clamp(32px,5vw,48px);margin-bottom:12px}
.hero p{color:var(--muted);font-size:18px;max-width:640px;margin:0 auto 24px}
.search-bar{max-width:480px;margin:0 auto;position:relative}
.search-bar input{width:100%;padding:12px 16px 12px 42px;border:1px solid var(--line);border-radius:999px;font-size:15px;outline:none;font-family:inherit}
.search-bar input:focus{border-color:var(--orange)}
.search-bar svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:20px 0}
.cat-chip,.hub-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line);transition:all .2s}
.cat-chip:hover{border-color:var(--orange);color:var(--orange)}
.hub-chip{background:rgba(30,58,95,.06);border-color:transparent}
.hub-chip:hover{border-color:var(--navy);background:rgba(30,58,95,.12)}
.cat-count{font-size:11px;background:rgba(255,107,53,.12);color:var(--orange);padding:1px 6px;border-radius:999px}
.section-title{font-size:24px;margin:32px 0 16px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--orange);transform:translateY(-2px)}
.card img{width:100%;height:200px;object-fit:cover}
.card-body{padding:16px}
.tag{display:inline-block;background:rgba(255,107,53,.1);color:var(--orange);padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600}
.card h3{font-size:17px;margin:8px 0 6px;color:var(--navy);line-height:1.3}
.card p{color:var(--muted);font-size:13px;line-height:1.5}
.card-meta{font-size:12px;color:var(--muted);margin-top:8px;display:block}
.seo-footer{background:var(--navy);color:rgba(255,255,255,.8);padding:48px 0 32px;margin-top:48px}
.seo-footer h3{color:#fff;font-size:22px;margin-bottom:20px;text-align:center}
.seo-grid{display:grid;gap:24px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
.seo-col h4{color:var(--orange);font-size:14px;font-family:'Outfit',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
.seo-col ul{list-style:none;padding:0}
.seo-col li{margin:4px 0}
.seo-col a{color:rgba(255,255,255,.7);font-size:13px}
.seo-col a:hover{color:var(--orange)}
.popular-section{margin-top:32px;border-top:1px solid rgba(255,255,255,.1);padding-top:24px}
.popular-section h4{color:#fff;font-size:16px;margin-bottom:12px}
.popular-grid{columns:3;column-gap:24px}
@media(max-width:768px){.popular-grid{columns:2}}
@media(max-width:480px){.popular-grid{columns:1}}
.popular-grid li{margin:3px 0;break-inside:avoid}
.popular-grid a{color:rgba(255,255,255,.65);font-size:12px;line-height:1.4}
.popular-grid a:hover{color:var(--orange)}
.archive-section{margin-top:24px;border-top:1px solid rgba(255,255,255,.1);padding-top:20px}
.archive-row{display:flex;flex-wrap:wrap;gap:8px 16px}
.archive-row a{color:rgba(255,255,255,.6);font-size:12px}
.archive-row a:hover{color:var(--orange)}
.explore-section{margin-top:24px;border-top:1px solid rgba(255,255,255,.1);padding-top:20px}
.explore-links{display:flex;flex-wrap:wrap;gap:6px}
.explore-links a{display:inline-block;padding:4px 10px;border:1px solid rgba(255,255,255,.15);border-radius:999px;color:rgba(255,255,255,.6);font-size:11px;transition:all .2s}
.explore-links a:hover{border-color:var(--orange);color:var(--orange)}
.copyright{text-align:center;margin-top:32px;font-size:12px;color:rgba(255,255,255,.4)}
#no-results{display:none;text-align:center;padding:40px;color:var(--muted);font-size:16px}
</style>
${bookingScripts()}
</head>
<body>
${header()}

<div class="wrap hero">
  <h1>FitVed Journal</h1>
  <p>Evidence-based Indian health, fitness & nutrition guides written by certified coaches.</p>
  <div class="search-bar">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input type="text" id="blogSearch" placeholder="Search articles…" aria-label="Search articles"/>
  </div>
</div>

<div class="wrap">
  <div class="chips">
    ${hubLinks}
  </div>
  <div class="chips" style="margin-top:8px">
    ${catLinks}
  </div>

  <h2 class="section-title">Latest Articles</h2>
  <div class="grid" id="articleGrid">
    ${recentArticles.map(cardHtml).join("\n        ")}
  </div>
  <div id="no-results"><p>No articles match your search.</p></div>

  <h2 class="section-title" style="margin-top:40px">All Articles</h2>
  <div class="grid" id="allArticles">
    ${articles.map(cardHtml).join("\n        ")}
  </div>
</div>

<div class="seo-footer">
  <div class="wrap">
    <h3>Explore FitVed Journal</h3>
    <div class="seo-grid">
      ${seoFooterHtml}
    </div>

    <div class="popular-section">
      <h4>Popular Articles</h4>
      <ul class="popular-grid">
        ${popularLinksHtml}
      </ul>
    </div>

    <div class="archive-section">
      <h4 style="color:#fff;font-size:14px;margin-bottom:8px">Archives — 2026</h4>
      <div class="archive-row">${archiveHtml}</div>
    </div>

    <div class="explore-section">
      <h4 style="color:#fff;font-size:14px;margin-bottom:8px">Explore Everything</h4>
      <div class="explore-links">
        ${[...new Set(articles.map(a => a.primaryKeyword))].slice(0, 150).map(k =>
          `<a href="/blog/">${escHtml(k)}</a>`
        ).join("\n        ")}
      </div>
    </div>

    <p class="copyright">© 2026 FitVed Journal. All rights reserved.</p>
  </div>
</div>

${footer()}

<script>
(function(){
  var input = document.getElementById('blogSearch');
  var grid = document.getElementById('allArticles');
  var noRes = document.getElementById('no-results');
  if(!input||!grid) return;
  var cards = Array.from(grid.querySelectorAll('.card'));
  input.addEventListener('input', function(){
    var q = this.value.toLowerCase().trim();
    var visible = 0;
    cards.forEach(function(c){
      var text = c.textContent.toLowerCase();
      var show = !q || text.indexOf(q) !== -1;
      c.style.display = show ? '' : 'none';
      if(show) visible++;
    });
    noRes.style.display = visible === 0 && q ? 'block' : 'none';
  });
})();
</script>
</body>
</html>`;
}

// ── Category page ──────────────────────────────────────────────
function generateCategory(cat) {
  const arts = articlesForCategory(cat.slug);
  if (!arts.length) return null;

  const cardHtml = (a) => `<a href="/blog/${a.slug}" class="card">
        <img src="${imgSrc(a.slug)}" alt="${escAttr(a.imageAlt)}" loading="lazy" width="400" height="240"/>
        <div class="card-body">
          <h3>${escHtml(a.title)}</h3>
          <p>${escHtml(a.excerpt)}</p>
          <span class="card-meta">${shortDate(a.publishedDate)} · ${a.readTime} min</span>
        </div>
      </a>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${GA_SNIPPET}
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<title>${escHtml(cat.metaTitle)}</title>
<meta name="description" content="${escAttr(cat.metaDescription)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${DOMAIN}/blog/category/${cat.slug}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escAttr(cat.metaTitle)}"/>
<meta property="og:description" content="${escAttr(cat.metaDescription)}"/>
<meta property="og:url" content="${DOMAIN}/blog/category/${cat.slug}"/>
<meta property="og:site_name" content="FitVed"/>
<meta name="twitter:card" content="summary"/>
<meta name="theme-color" content="#1E3A5F"/>
${FONTS}
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.heading,
    url: DOMAIN + "/blog/category/" + cat.slug,
    description: cat.metaDescription,
    publisher: { "@type": "Organization", name: "FitVed" },
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: DOMAIN + "/blog/" },
      { "@type": "ListItem", position: 3, name: cat.name, item: DOMAIN + "/blog/category/" + cat.slug },
    ],
  })}</script>
<style>${COMMON_CSS}
.hero{padding:40px 0 24px;text-align:center}
.hero h1{font-size:clamp(28px,4.5vw,40px);margin-bottom:10px}
.hero p{color:var(--muted);font-size:16px;max-width:600px;margin:0 auto}
.count{font-size:14px;color:var(--muted);margin:20px 0 12px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));margin-bottom:32px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--orange);transform:translateY(-2px)}
.card img{width:100%;height:200px;object-fit:cover}
.card-body{padding:16px}
.card h3{font-size:17px;margin:0 0 6px;color:var(--navy);line-height:1.3}
.card p{color:var(--muted);font-size:13px;line-height:1.5}
.card-meta{font-size:12px;color:var(--muted);margin-top:8px;display:block}
</style>
${bookingScripts()}
</head>
<body>
${header()}
<div class="wrap">
  <nav class="crumbs"><a href="/">Home</a> › <a href="/blog/">Blog</a> › ${escHtml(cat.name)}</nav>
  <div class="hero">
    <h1>${escHtml(cat.heading)}</h1>
    <p>${escHtml(cat.intro)}</p>
  </div>
  <p class="count">${arts.length} article${arts.length !== 1 ? "s" : ""}</p>
  <div class="grid">
    ${arts.map(cardHtml).join("\n    ")}
  </div>
</div>
${footer()}
</body>
</html>`;
}

// ── Hub page ───────────────────────────────────────────────────
function generateHub(hub) {
  const arts = articlesForHub(hub.slug);

  const cardHtml = (a) => `<a href="/blog/${a.slug}" class="card">
        <img src="${imgSrc(a.slug)}" alt="${escAttr(a.imageAlt)}" loading="lazy" width="400" height="240"/>
        <div class="card-body">
          <span class="tag">${escHtml(catMap[a.category]?.name || a.category)}</span>
          <h3>${escHtml(a.title)}</h3>
          <p>${escHtml(a.excerpt)}</p>
          <span class="card-meta">${shortDate(a.publishedDate)} · ${a.readTime} min</span>
        </div>
      </a>`;

  const relCats = (hub.relatedCategories || []).map(s => catMap[s]).filter(Boolean);
  const relCatHtml = relCats.length ? `
    <div class="related-cats">
      <h2>Related Categories</h2>
      <div class="cat-row">${relCats.map(c => `<a href="/blog/category/${c.slug}" class="cat-chip">${escHtml(c.name)}</a>`).join(" ")}</div>
    </div>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${GA_SNIPPET}
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<title>${escHtml(hub.metaTitle)}</title>
<meta name="description" content="${escAttr(hub.metaDescription)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${DOMAIN}/blog/hub/${hub.slug}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escAttr(hub.metaTitle)}"/>
<meta property="og:description" content="${escAttr(hub.metaDescription)}"/>
<meta property="og:url" content="${DOMAIN}/blog/hub/${hub.slug}"/>
<meta property="og:site_name" content="FitVed"/>
<meta name="twitter:card" content="summary"/>
<meta name="theme-color" content="#1E3A5F"/>
${FONTS}
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.name,
    url: DOMAIN + "/blog/hub/" + hub.slug,
    description: hub.metaDescription,
    publisher: { "@type": "Organization", name: "FitVed" },
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: DOMAIN + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: DOMAIN + "/blog/" },
      { "@type": "ListItem", position: 3, name: hub.name, item: DOMAIN + "/blog/hub/" + hub.slug },
    ],
  })}</script>
<style>${COMMON_CSS}
.hero{padding:48px 0 28px;text-align:center;background:linear-gradient(135deg,rgba(30,58,95,.04),rgba(255,107,53,.04));border-radius:0 0 24px 24px;margin-bottom:24px}
.hero h1{font-size:clamp(30px,5vw,44px);margin-bottom:12px}
.hero p{color:var(--muted);font-size:16px;max-width:640px;margin:0 auto}
.count{font-size:14px;color:var(--muted);margin:16px 0 12px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));margin-bottom:24px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--orange);transform:translateY(-2px)}
.card img{width:100%;height:200px;object-fit:cover}
.card-body{padding:16px}
.tag{display:inline-block;background:rgba(255,107,53,.1);color:var(--orange);padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600}
.card h3{font-size:17px;margin:8px 0 6px;color:var(--navy);line-height:1.3}
.card p{color:var(--muted);font-size:13px;line-height:1.5}
.card-meta{font-size:12px;color:var(--muted);margin-top:8px;display:block}
.related-cats{margin:32px 0}
.related-cats h2{font-size:18px;margin-bottom:12px}
.cat-row{display:flex;flex-wrap:wrap;gap:8px}
.cat-chip{display:inline-flex;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line);transition:all .2s}
.cat-chip:hover{border-color:var(--orange);color:var(--orange)}
</style>
${bookingScripts()}
</head>
<body>
${header()}
<div class="hero">
  <div class="wrap">
    <nav class="crumbs" style="text-align:left"><a href="/">Home</a> › <a href="/blog/">Blog</a> › ${escHtml(hub.name)}</nav>
    <h1>${escHtml(hub.heading)}</h1>
    <p>${escHtml(hub.intro)}</p>
  </div>
</div>
<div class="wrap">
  <p class="count">${arts.length} article${arts.length !== 1 ? "s" : ""} in this hub</p>
  <div class="grid">
    ${arts.map(cardHtml).join("\n    ")}
  </div>
  ${relCatHtml}
</div>
${footer()}
</body>
</html>`;
}

// ── Sitemap ────────────────────────────────────────────────────
function generateSitemap() {
  const urls = [];
  urls.push({ loc: `${DOMAIN}/`, priority: "1.0", changefreq: "weekly" });
  urls.push({ loc: `${DOMAIN}/blog/`, priority: "0.9", changefreq: "daily" });
  urls.push({ loc: `${DOMAIN}/trainers`, priority: "0.9", changefreq: "weekly" });

  categories.forEach(c => {
    urls.push({ loc: `${DOMAIN}/blog/category/${c.slug}`, priority: "0.8", changefreq: "weekly" });
  });
  hubs.forEach(h => {
    urls.push({ loc: `${DOMAIN}/blog/hub/${h.slug}`, priority: "0.8", changefreq: "weekly" });
  });
  articles.forEach(a => {
    urls.push({ loc: `${DOMAIN}/blog/${a.slug}`, priority: "0.7", changefreq: "monthly", lastmod: a.updatedDate });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return xml;
}

function generateImageSitemap() {
  const entries = articles.map(a => {
    const img = imgAbsolute(a.slug);
    return `  <url>
    <loc>${DOMAIN}/blog/${a.slug}</loc>
    <image:image>
      <image:loc>${img}</image:loc>
      <image:caption>${escHtml(a.imageCaption || a.title)}</image:caption>
      <image:title>${escHtml(a.imageAlt)}</image:title>
    </image:image>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`;
}

function generateRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
Sitemap: ${DOMAIN}/sitemap-blog.xml
Sitemap: ${DOMAIN}/sitemap-images.xml

# Disallow admin/dashboard
Disallow: /dashboard
Disallow: /admin
Disallow: /plan
Disallow: /billing
Disallow: /trainer-dashboard
`;
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  console.log(`📝 Generating blog: ${articles.length} articles, ${categories.length} categories, ${hubs.length} hubs`);

  // Ensure directories
  fs.mkdirSync(path.join(BLOG_DIR, "category"), { recursive: true });
  fs.mkdirSync(path.join(BLOG_DIR, "hub"), { recursive: true });

  // Generate articles
  let generated = 0;
  let skipped = 0;
  articles.forEach(a => {
    if (PROTECTED.has(a.slug)) { skipped++; return; }
    const file = path.join(BLOG_DIR, `${a.slug}.html`);
    fs.writeFileSync(file, generateArticle(a));
    generated++;
  });
  console.log(`  ✅ ${generated} article pages generated (${skipped} protected/skipped)`);

  // Generate listing
  const listingFile = path.join(BLOG_DIR, "index.html");
  fs.writeFileSync(listingFile, generateListing());
  console.log("  ✅ Blog listing page generated");

  // Generate category pages
  let catCount = 0;
  categories.forEach(c => {
    const html = generateCategory(c);
    if (html) {
      fs.writeFileSync(path.join(BLOG_DIR, "category", `${c.slug}.html`), html);
      catCount++;
    }
  });
  console.log(`  ✅ ${catCount} category pages generated`);

  // Generate hub pages
  hubs.forEach(h => {
    fs.writeFileSync(path.join(BLOG_DIR, "hub", `${h.slug}.html`), generateHub(h));
  });
  console.log(`  ✅ ${hubs.length} hub pages generated`);

  // Generate sitemaps
  fs.writeFileSync(path.join(PUBLIC, "sitemap-blog.xml"), generateSitemap());
  fs.writeFileSync(path.join(PUBLIC, "sitemap-images.xml"), generateImageSitemap());
  console.log("  ✅ Sitemaps generated");

  // Generate robots.txt
  fs.writeFileSync(path.join(PUBLIC, "robots.txt"), generateRobots());
  console.log("  ✅ robots.txt generated");

  // Master sitemap index
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${DOMAIN}/sitemap-blog.xml</loc></sitemap>
  <sitemap><loc>${DOMAIN}/sitemap-images.xml</loc></sitemap>
</sitemapindex>`;
  fs.writeFileSync(path.join(PUBLIC, "sitemap.xml"), sitemapIndex);
  console.log("  ✅ Sitemap index generated");

  console.log(`\n🎉 Blog generation complete!`);
}

main();
