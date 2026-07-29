import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import fitvedLogo from "@/assets/fitved-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col justify-between bg-fv-navy text-white">
      <header className="border-b border-white/10 bg-fv-navy/95 py-4 px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={fitvedLogo} alt="FitVed" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="rounded-full bg-fv-orange px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-fv-orange/90 transition-colors shadow-md"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-elevated">
          <span className="inline-flex items-center gap-2 rounded-full bg-fv-orange/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider border border-fv-orange/30 text-fv-orange mb-4">
            <ShieldCheck className="h-4 w-4" /> FitVed Bangalore
          </span>
          <h1 className="text-6xl font-sans font-black text-fv-orange tracking-tighter mb-2">404</h1>
          <h2 className="text-xl font-sans font-bold uppercase text-white mb-3">Page Requested Not Found</h2>
          <p className="text-xs text-white/70 leading-relaxed mb-6">
            The page <code className="text-fv-orange font-mono bg-fv-navy px-2 py-0.5 rounded">{location.pathname}</code> could not be located. Explore our personal training and yoga programs on the home page.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-fv-orange px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-fv-orange/90 transition-all shadow-md"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Home Page
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © 2026 FitVed. All rights reserved. Society personal training &amp; yoga in Bangalore.
      </footer>
    </div>
  );
};

export default NotFound;
