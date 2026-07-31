import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BookTrialDialog from "@/components/trainer/BookTrialDialog";
import {
  BadgeCheck, MapPin, Clock, Users, Wifi, Home, Languages as LangIcon, Dumbbell,
  Award, Instagram, Linkedin, Youtube, Globe, Facebook, Star, Quote, ArrowRight,
  Loader2, ExternalLink,
} from "lucide-react";

const BUCKET = "trainer-assets";
const publicUrl = (p: string | null | undefined) => (p ? supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl : null);

type Trainer = any;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
      <p className="font-display text-2xl md:text-3xl text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl md:text-3xl text-fv-navy mb-5">{children}</h2>;
}

export default function TrainerPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const sb = supabase as any;
  const [trialOpen, setTrialOpen] = useState(false);

  const q = useQuery({
    queryKey: ["public-trainer", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: t } = await sb.from("trainers")
        .select("id, name, about, bio, education, years_experience, clients_trained, photo_path, city, service_areas, specializations, languages, availability_online, availability_offline, instagram, website, facebook, active")
        .eq("slug", slug).maybeSingle();
      if (!t || t.active === false) return null;
      const [media, tst, certs] = await Promise.all([
        sb.from("trainer_media").select("id, kind, file_path").eq("trainer_id", t.id).order("sort_order", { ascending: true }),
        sb.from("trainer_testimonials").select("*").eq("trainer_id", t.id).order("sort_order", { ascending: true }),
        sb.from("trainer_certificates").select("id, file_path, file_name").eq("trainer_id", t.id),
      ]);
      return { t: t as Trainer, media: media.data ?? [], testimonials: tst.data ?? [], certs: certs.data ?? [] };
    },
  });

  const t = q.data?.t;

  // SEO meta
  useEffect(() => {
    if (!t) return;
    document.title = `${t.name} — Certified Trainer | FitVed`;
    const setMeta = (n: string, c: string) => {
      let el = document.querySelector(`meta[name="${n}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", n); document.head.appendChild(el); }
      el.setAttribute("content", c);
    };
    setMeta("description", (t.bio || t.about || `${t.name} is a certified FitVed trainer.`).slice(0, 160));
    let c = document.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.setAttribute("rel", "canonical"); document.head.appendChild(c); }
    c.setAttribute("href", `${window.location.origin}/trainers/${slug}`);
  }, [t, slug]);

  if (q.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-fv-neutral">
        <Loader2 className="h-6 w-6 animate-spin text-fv-navy" />
      </div>
    );
  }
  if (!t) {
    return (
      <div className="min-h-screen grid place-items-center bg-fv-neutral px-4 text-center">
        <div>
          <p className="font-display text-3xl text-fv-navy">Trainer not found</p>
          <p className="mt-2 text-muted-foreground">This trainer profile isn't available.</p>
          <Link to="/trainers"><Button className="mt-5 bg-fv-orange text-white hover:bg-fv-orange/90">Browse trainers</Button></Link>
        </div>
      </div>
    );
  }

  const { media, testimonials, certs } = q.data!;
  const photo = publicUrl(t.photo_path);
  const initials = (t.name || "T").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const galleryImgs = media.filter((m: any) => m.kind === "workout_image");
  const transformations = media.filter((m: any) => m.kind === "transformation");
  const videos = media.filter((m: any) => m.kind === "workout_video" || m.kind === "reel");
  const areas: string[] = Array.isArray(t.service_areas) ? t.service_areas : [];
  const langs: string[] = Array.isArray(t.languages) ? t.languages : [];
  const specs: string[] = Array.isArray(t.specializations) ? t.specializations : [];
  const socials = [
    { icon: Instagram, url: t.instagram },
    { icon: Facebook, url: t.facebook }, { icon: Globe, url: t.website },
  ].filter((s) => s.url);

  return (
    <div className="bg-fv-neutral min-h-screen">
      {/* Hero */}
      <section className="bg-fv-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-16 grid md:grid-cols-[280px_1fr] gap-8 items-center">
          <div className="mx-auto md:mx-0 h-56 w-56 rounded-3xl overflow-hidden grid place-items-center bg-white/10 shrink-0 text-5xl font-display shadow-[0_0_50px_rgba(255,107,53,0.25)]">
            {photo ? <img src={photo} alt={t.name} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-fv-orange/15 border border-fv-orange/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fv-orange">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified FitVed Trainer
            </div>
            <h1 className="mt-3 font-display text-3xl md:text-5xl leading-tight">{t.name}</h1>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              <Stat label="Experience" value={`${t.years_experience ?? 0}+ yrs`} />
              <Stat label="Clients trained" value={`${t.clients_trained ?? 0}+`} />
              <Stat label="Availability" value={
                <span className="text-base">{[t.availability_online && "Online", t.availability_offline && "In-person"].filter(Boolean).join(" · ") || "—"}</span>
              } />
              <Stat label="Languages" value={<span className="text-sm">{langs.slice(0, 3).join(", ") || "—"}</span>} />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button onClick={() => setTrialOpen(true)} className="bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-7 font-bold uppercase tracking-wider rounded-full">
                Book Free Trial
              </Button>
              <a href="/#services"><Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 h-12 px-7 font-bold uppercase tracking-wider rounded-full w-full">
                View Programs
              </Button></a>
            </div>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-2 justify-center md:justify-start">
                {socials.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener" className="grid place-items-center h-10 w-10 rounded-full bg-white/10 hover:bg-fv-orange transition-colors">
                    <s.icon className="h-4.5 w-4.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 space-y-14">
        {/* About */}
        {(t.about || t.bio) && (
          <section><SectionTitle>About</SectionTitle>
            <p className="text-fv-text leading-relaxed max-w-3xl whitespace-pre-wrap">{t.about || t.bio}</p>
            {t.education && <p className="mt-4 text-sm text-muted-foreground"><span className="font-semibold text-fv-navy">Education:</span> {t.education}</p>}
          </section>
        )}

        {/* Specializations */}
        {specs.length > 0 && (
          <section><SectionTitle>Specializations</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {specs.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-white border border-fv-navy/10 text-fv-navy">
                  <Dumbbell className="h-4 w-4 text-fv-orange" /> {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Areas served (grouped by city) */}
        {(t.city || areas.length > 0) && (
          <section><SectionTitle>Areas served</SectionTitle>
            {t.city && <p className="font-semibold text-fv-navy flex items-center gap-1.5 mb-2"><MapPin className="h-4 w-4 text-fv-orange" /> {t.city}</p>}
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-fv-navy/5 text-fv-navy">
                  <MapPin className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Languages */}
        {langs.length > 0 && (
          <section><SectionTitle>Languages</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {langs.map((l) => (
                <span key={l} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold bg-white border border-fv-navy/10 text-fv-navy">
                  <LangIcon className="h-3.5 w-3.5 text-fv-orange" /> {l}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Transformation gallery */}
        {transformations.length > 0 && (
          <section><SectionTitle>Transformations</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {transformations.map((m: any) => (
                <img key={m.id} src={publicUrl(m.file_path)!} alt="Client transformation" loading="lazy"
                  className="aspect-square w-full rounded-2xl object-cover border" />
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {galleryImgs.length > 0 && (
          <section><SectionTitle>Gallery</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryImgs.map((m: any) => (
                <img key={m.id} src={publicUrl(m.file_path)!} alt="Workout" loading="lazy"
                  className="aspect-square w-full rounded-2xl object-cover border" />
              ))}
            </div>
          </section>
        )}

        {/* Workout videos */}
        {videos.length > 0 && (
          <section><SectionTitle>Workout videos</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videos.map((m: any) => (
                <video key={m.id} src={publicUrl(m.file_path)!} controls preload="metadata"
                  className="w-full rounded-2xl border bg-black aspect-video object-cover" />
              ))}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section><SectionTitle>Client testimonials</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((r: any) => (
                <div key={r.id} className="rounded-2xl border bg-white p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    {publicUrl(r.client_image) ? (
                      <img src={publicUrl(r.client_image)!} alt={r.client_name} className="h-11 w-11 rounded-full object-cover" />
                    ) : <span className="grid place-items-center h-11 w-11 rounded-full bg-fv-navy/5"><Quote className="h-4 w-4 text-fv-navy/40" /></span>}
                    <div>
                      <p className="font-semibold text-fv-navy">{r.client_name}</p>
                      {r.rating != null && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-fv-orange text-fv-orange" : "text-fv-navy/15"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {r.review && <p className="mt-3 text-sm text-fv-text leading-relaxed">{r.review}</p>}
                  {r.video_url && <a href={r.video_url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-fv-orange">Watch video <ExternalLink className="h-3 w-3" /></a>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certificates */}
        {certs.length > 0 && (
          <section><SectionTitle>Certifications</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {certs.map((c: any) => (
                <a key={c.id} href={publicUrl(c.file_path) ?? "#"} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-fv-navy hover:border-fv-orange/40">
                  <Award className="h-4 w-4 text-fv-orange" /> {c.file_name || "Certificate"} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="bg-fv-navy text-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center">
          <h2 className="font-display text-3xl md:text-4xl">Ready to start training?</h2>
          <p className="mt-3 text-white/70">Book your FREE trial with {t.name.split(" ")[0]} — no payment, no commitment.</p>
          <Button onClick={() => setTrialOpen(true)} className="mt-6 bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8 font-bold uppercase tracking-wider rounded-full">
            Book Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <BookTrialDialog open={trialOpen} onOpenChange={setTrialOpen} trainerName={t.name} />
    </div>
  );
}
