import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, areasForCity } from "@/lib/cities";
import { SPECIALIZATIONS } from "@/lib/specializations";
import {
  Search, BadgeCheck, MapPin, Clock, Users, Wifi, Home, X, ArrowRight, SlidersHorizontal,
} from "lucide-react";

const BUCKET = "trainer-assets";
const PAGE = 9;
const LANGUAGES = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu"];
const EXPERIENCE = [
  { label: "0–2 Years", min: 0, max: 2 },
  { label: "2–5 Years", min: 2, max: 5 },
  { label: "5–10 Years", min: 5, max: 10 },
  { label: "10+ Years", min: 10, max: 999 },
];

const publicUrl = (p: string | null | undefined) => (p ? supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl : null);

/** "Harsh Saini" → "H Saini" (first name shortened to its initial for cards). */
const cardName = (name: string) => {
  const w = (name || "").trim().split(/\s+/);
  return w.length >= 2 ? `${w[0][0].toUpperCase()} ${w.slice(1).join(" ")}` : name;
};

type T = any;

const isComplete = (t: T) =>
  t.active !== false && !!t.photo_path && t.years_experience != null &&
  Array.isArray(t.specializations) && t.specializations.length > 0;

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden animate-pulse">
      <div className="h-44 bg-fv-navy/10" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-fv-navy/10 rounded" />
        <div className="h-3 w-full bg-fv-navy/10 rounded" />
        <div className="h-3 w-1/2 bg-fv-navy/10 rounded" />
      </div>
    </div>
  );
}

export default function TrainerListing() {
  const sb = supabase as any;
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [online, setOnline] = useState(false);
  const [offline, setOffline] = useState(false);
  const [exp, setExp] = useState("");
  const [gender, setGender] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [sort, setSort] = useState("experienced");
  const [visible, setVisible] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    document.title = "Find Certified Personal Trainers & Yoga Coaches | FitVed";
  }, []);

  const q = useQuery({
    queryKey: ["public-trainers"],
    queryFn: async () => {
      const { data, error } = await sb.from("trainers")
        .select("id, slug, name, headline, bio, photo_path, years_experience, clients_trained, city, service_areas, specializations, languages, availability_online, availability_offline, gender, active, created_at");
      if (error) return { __notReady: true } as const;
      return ((data ?? []) as T[]).filter(isComplete);
    },
  });

  const notReady = (q.data as any)?.__notReady === true;
  const all: T[] = Array.isArray(q.data) ? q.data : [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = all.filter((t) => {
      if (s) {
        const hay = [t.name, t.city, t.headline, ...(t.service_areas ?? []), ...(t.specializations ?? [])].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (city && t.city !== city) return false;
      if (area && !(t.service_areas ?? []).includes(area)) return false;
      if (online && !t.availability_online) return false;
      if (offline && !t.availability_offline) return false;
      if (gender && t.gender !== gender) return false;
      if (exp) {
        const b = EXPERIENCE.find((e) => e.label === exp);
        const y = t.years_experience ?? 0;
        if (b && !(y >= b.min && y < b.max)) return false;
      }
      if (languages.length && !languages.some((l) => (t.languages ?? []).includes(l))) return false;
      if (specs.length && !specs.some((sp) => (t.specializations ?? []).includes(sp))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "experienced") return (b.years_experience ?? 0) - (a.years_experience ?? 0);
      if (sort === "popular") return (b.clients_trained ?? 0) - (a.clients_trained ?? 0);
      if (sort === "newest") return String(b.created_at).localeCompare(String(a.created_at));
      return String(a.name).localeCompare(String(b.name));
    });
    return list;
  }, [all, search, city, area, online, offline, gender, exp, languages, specs, sort]);

  useEffect(() => { setVisible(PAGE); }, [search, city, area, online, offline, gender, exp, languages, specs, sort]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeFilterCount = [city, area, gender, exp].filter(Boolean).length + (online ? 1 : 0) + (offline ? 1 : 0) + languages.length + specs.length;
  const clearAll = () => { setCity(""); setArea(""); setOnline(false); setOffline(false); setGender(""); setExp(""); setLanguages([]); setSpecs([]); };

  return (
    <div className="bg-fv-neutral min-h-screen">
      {/* Hero */}
      <section className="bg-fv-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <h1 className="font-display text-3xl md:text-5xl leading-tight">Find Certified Personal Trainers &amp; Yoga Coaches</h1>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
            Discover verified trainers near you for home training, yoga, strength, weight loss, rehabilitation and online coaching.
          </p>
          <div className="mt-7 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-fv-navy/40" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, area, city or specialization…"
              className="h-12 pl-12 rounded-full bg-white text-fv-navy border-0 shadow-lg" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="rounded-2xl border bg-white p-5 space-y-5 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fv-navy">Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-xs font-semibold text-fv-orange hover:underline">Clear all</button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</label>
              <Select value={city} onValueChange={(v) => { setCity(v); setArea(""); }}>
                <SelectTrigger><SelectValue placeholder="All cities" /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {city && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area</label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
                  <SelectContent>{areasForCity(city).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={online} onCheckedChange={(c) => setOnline(!!c)} /> <Wifi className="h-3.5 w-3.5" /> Online</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={offline} onCheckedChange={(c) => setOffline(!!c)} /> <Home className="h-3.5 w-3.5" /> Offline / Home Visit</label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience</label>
              <Select value={exp} onValueChange={setExp}>
                <SelectTrigger><SelectValue placeholder="Any experience" /></SelectTrigger>
                <SelectContent>{EXPERIENCE.map((e) => <SelectItem key={e.label} value={e.label}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Languages</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button key={l} onClick={() => toggle(languages, setLanguages, l)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${languages.includes(l) ? "bg-fv-orange text-white border-fv-orange" : "bg-white text-fv-navy border-fv-navy/15"}`}>{l}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Specializations</label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {SPECIALIZATIONS.map((sp) => (
                  <button key={sp} onClick={() => toggle(specs, setSpecs, sp)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${specs.includes(sp) ? "bg-fv-navy text-white border-fv-navy" : "bg-white text-fv-navy border-fv-navy/15"}`}>{sp}</button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-muted-foreground">
              {q.isLoading ? "Loading…" : `${filtered.length} trainer${filtered.length === 1 ? "" : "s"}`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="lg:hidden gap-1.5" onClick={() => setShowFilters((s) => !s)}>
                <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </Button>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="experienced">Most Experienced</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {notReady ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
              Trainer directory isn't enabled yet — run the latest migration.
            </div>
          ) : q.isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
              <p className="font-display text-xl text-fv-navy">No trainers match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try clearing some filters or searching a different area.</p>
              {activeFilterCount > 0 && <Button onClick={clearAll} className="mt-4 bg-fv-orange text-white hover:bg-fv-orange/90">Clear filters</Button>}
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.slice(0, visible).map((t) => {
                  const photo = publicUrl(t.photo_path);
                  const initials = (t.name || "T").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
                  const langs: string[] = t.languages ?? [];
                  return (
                    <Link key={t.id} to={`/trainers/${t.slug}`}
                      className="group rounded-2xl border bg-white overflow-hidden shadow-card hover:-translate-y-1 hover:border-fv-orange/40 transition-all">
                      <div className="relative h-44 bg-fv-navy grid place-items-center text-white text-3xl font-display overflow-hidden">
                        {photo ? <img src={photo} alt={t.name} loading="lazy" className="h-full w-full object-cover" /> : initials}
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fv-navy">
                          <BadgeCheck className="h-3 w-3 text-fv-orange" /> Verified
                        </span>
                        {(t.availability_online || t.availability_offline) && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-fv-navy/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {[t.availability_online && "Online", t.availability_offline && "In-person"].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-lg text-fv-navy leading-tight group-hover:text-fv-orange transition-colors">{cardName(t.name)}</h3>
                        {t.headline && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.headline}</p>}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fv-text">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-fv-orange" /> {t.years_experience ?? 0}+ yrs</span>
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 text-fv-orange" /> {t.clients_trained ?? 0}+ clients</span>
                          {t.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-fv-orange" /> {t.city}</span>}
                        </div>
                        {langs.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{langs.slice(0, 3).join(" · ")}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(t.specializations ?? []).slice(0, 3).map((sp: string) => (
                            <span key={sp} className="rounded-full bg-fv-navy/5 px-2 py-0.5 text-[10px] font-semibold text-fv-navy">{sp}</span>
                          ))}
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-fv-orange">
                          View Profile <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {visible < filtered.length && (
                <div className="mt-8 text-center">
                  <Button variant="outline" onClick={() => setVisible((v) => v + PAGE)}
                    className="rounded-full border-fv-orange/40 text-fv-navy hover:bg-fv-orange hover:text-white hover:border-fv-orange font-bold uppercase tracking-wider text-xs h-11 px-8">
                    Load more trainers
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
