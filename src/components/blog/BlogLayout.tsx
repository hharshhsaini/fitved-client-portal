import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, Share2, MapPin, ChevronRight, Search, BookOpen, Clock, Heart, Scale, Utensils, Calculator,
} from "lucide-react";
import fitvedLogo from "@/assets/fitved-logo.png";
import { BookTrialModal } from "@/components/BookTrialModal";
import { CATEGORIES_DATA } from "@/data/blog/categories";
import { SEOFooter } from "@/components/blog/SEOFooter";
import { GeoSEOFooter } from "@/components/GeoSEOFooter";

interface BlogLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export function BlogLayout({ children, breadcrumbs }: BlogLayoutProps) {
  const [trialModalOpen, setTrialModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur print:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={fitvedLogo} alt="FitVed" className="h-8 w-auto" />
            </Link>
            <span className="hidden sm:inline-block text-xs font-bold text-orange-500 uppercase tracking-widest border-l border-border pl-3">
              Journal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold">
              <Link to="/trainers">Find Trainers</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex text-xs font-semibold">
              <Link to="/blog/calculators">Calculators</Link>
            </Button>
            <Button
              onClick={() => setTrialModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm px-4 shadow-sm"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Book FREE Trial
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-muted/40 border-b border-border py-2.5 px-4 text-xs">
          <div className="container mx-auto max-w-6xl flex flex-wrap items-center gap-1.5 text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-foreground truncate max-w-xs sm:max-w-sm">{b.name}</span>
                ) : (
                  <Link to={b.url} className="hover:text-foreground transition-colors">{b.name}</Link>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">{children}</div>

      {/* Comprehensive Footer SEO Discovery Links Grid (500+ Article Category Discovery) */}
      <footer className="bg-slate-950 text-slate-300 py-12 px-4 border-t border-slate-800 text-xs print:hidden">
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Fitness Categories</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Specialized Diets</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(6, 12).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Health Conditions</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(12, 18).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Workout Modes</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(18, 24).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Supplements & Guides</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(24, 30).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">City Guides & NRI</h4>
              <ul className="space-y-1 text-slate-400">
                {CATEGORIES_DATA.slice(30, 36).map((c) => (
                  <li key={c.slug}>
                    <Link to={`/blog/category/${c.slug}`} className="hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px]">
            <p>© {new Date().getFullYear()} FitVed Health Technologies. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="/sitemap.xml" target="_blank" className="hover:text-slate-300">Sitemap</a>
              <a href="/robots.txt" target="_blank" className="hover:text-slate-300">robots.txt</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Explore Everything SEO Footer */}
      <SEOFooter />
      <GeoSEOFooter />

      <BookTrialModal open={trialModalOpen} onOpenChange={setTrialModalOpen} />
    </div>
  );
}
