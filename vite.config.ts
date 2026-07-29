import { defineConfig, type Connect } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".txt": "text/plain",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".map": "application/json",
};

// Serve the embedded static "Society Poll" sub-site (a Next.js static export
// living in public/societies) for /societies/* — dev & preview servers apply an
// SPA history fallback that would otherwise swallow these routes. On Vercel the
// static files take priority via the vercel.json rewrite exclusion.
function serveSocieties(rootDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = decodeURIComponent((req.url || "").split("?")[0]);
    if (url !== "/societies" && !url.startsWith("/societies/")) return next();

    let rel = url.replace(/^\/societies/, "");
    let file = path.join(rootDir, rel);
    try {
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        file = path.join(file, "index.html");
      }
      if (!fs.existsSync(file)) return next();
      res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
      res.end(fs.readFileSync(file));
    } catch {
      next();
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "serve-societies-static",
      configureServer(server) {
        server.middlewares.use(serveSocieties(path.resolve(__dirname, "public/societies")));
      },
      configurePreviewServer(server) {
        server.middlewares.use(serveSocieties(path.resolve(__dirname, "dist/societies")));
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
