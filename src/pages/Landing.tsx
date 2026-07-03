import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  Menu,
  X,
  Building2,
  Users,
  Briefcase,
  Laptop,
  Wrench,
  Dumbbell,
  Trophy,
  Check,
  Star,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Stethoscope,
  Activity,
  HeartPulse,
  Utensils,
  BarChart2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import fitvedLogo from "@/assets/fitved-logo.png";
const heroHands = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80";
import monalisaFit from "@/assets/monalisa-fit.png";
import monalisaDoubtful from "@/assets/monalisa-doubtful.png";

const PHONE = "+919890471383";
const PHONE_DISPLAY = "+91 9890471383";
const WHATSAPP_TEXT = encodeURIComponent("Hi, I'm interested in Fitved training. Can you help me?");
const WHATSAPP_URL = `https://wa.me/${PHONE.replace(/\D/g, "")}?text=${WHATSAPP_TEXT}`;

const NAV = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "results", label: "Results" },
];

const leadSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  interest: z.string().min(1, "Please choose an option").max(60),
});

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const trackEvent = (name: string, params: Record<string, unknown> = {}) => {
  // analytics shim — wired to GA4/Meta later
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.gtag === "function") w.gtag("event", name, params);
  console.info("[track]", name, params);
};

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [showTimer, setShowTimer] = useState(false);
  const popupShown = useRef({ shown: false });

  // SEO meta
  useEffect(() => {
    document.title = "Fitved | Society-Based Personal Training in Bangalore | Longevity Fitness";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(
      "description",
      "Clinical-grade personal and group training at your doorstep. Serving 10+ Bangalore societies. Train for healthspan, not just aesthetics."
    );
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + "/");
  }, []);

  // Active section observer
  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // Single popup: trigger on 30s timer OR exit-intent (whichever first)
  // Re-reads localStorage at trigger time so post-submit it never shows
  useEffect(() => {
    const trigger = () => {
      if (popupShown.current.shown) return;
      if (localStorage.getItem("fitved_form_submitted")) return;
      popupShown.current.shown = true;
      setShowTimer(true);
    };
    const t = window.setTimeout(trigger, 30000);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };
    document.addEventListener("mouseleave", onLeave);

    // Also listen for the custom event fired after form submit
    const onFormDone = () => {
      popupShown.current.shown = true; // prevent popup from ever showing
      setShowTimer(false);             // close if already open
    };
    window.addEventListener("fitved_form_done", onFormDone);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("fitved_form_done", onFormDone);
    };
  }, []);

  return (
    <div className="min-h-screen bg-fv-neutral text-fv-text">
      <Nav active={active} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <main>
        <Hero />
        <ZeroExcuse />
        <TakeCare />
        <ProblemSolution />
        <Services />
        <Trainers />
        <Difference />
        <Results />
        <Testimonials />
        <Roadmap />
        <Locations />

        <FAQ />
        <EnquiryForm />
      </main>

      <Footer />
      <MobileBar />
      <WhatsAppFloat />
      <DesktopFloatingCta />

      <PopupModal
        open={showTimer}
        onOpenChange={setShowTimer}
        title="Wait — before you go!"
        body="Get a FREE Body Composition Analysis + 30-min Consultation when you book your first session this week."
        source="popup_exit"
      />
    </div>
  );
}

/* ---------- NAV ---------- */
function Nav({
  active,
  menuOpen,
  setMenuOpen,
}: {
  active: string;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-fv-navy/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#home" className="flex items-center gap-2" onClick={() => scrollTo("home")}>
          <img src={fitvedLogo} alt="Fitved" className="h-12 w-auto rounded" />
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => scrollTo(n.id)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active === n.id
                  ? "text-fv-orange"
                  : "text-fv-text/70 hover:text-fv-navy"
              )}
            >
              {n.label}
            </button>
          ))}
          <a
            href="/online-training.html"
            className="rounded-md px-3 py-2 text-sm font-medium text-fv-text/70 hover:text-fv-navy transition-colors"
          >
            Online Training
          </a>
          <Link
            to="/corporate"
            className="rounded-md px-3 py-2 text-sm font-medium text-fv-text/70 hover:text-fv-navy transition-colors"
          >
            For Business
          </Link>
          <Button
            onClick={() => scrollTo("contact")}
            className="ml-2 bg-fv-orange text-white hover:bg-fv-orange/90"
          >
            Speak to a Coach
          </Button>
          <Link
            to="/login"
            className="ml-1 text-sm font-medium text-fv-navy/70 hover:text-fv-navy px-2"
          >
            Log in
          </Link>
        </nav>
        <button
          aria-label="Open menu"
          className="md:hidden rounded-md p-2 text-fv-navy"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-fv-navy/10 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  scrollTo(n.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  "py-3 text-left text-base font-medium border-b border-fv-navy/5",
                  active === n.id ? "text-fv-orange" : "text-fv-navy"
                )}
              >
                {n.label}
              </button>
            ))}
            <a
              href="/online-training.html"
              className="py-3 text-left text-base font-medium text-fv-navy border-b border-fv-navy/5"
              onClick={() => setMenuOpen(false)}
            >
              Online Training
            </a>
            <Link
              to="/corporate"
              className="py-3 text-left text-base font-medium text-fv-navy border-b border-fv-navy/5"
              onClick={() => setMenuOpen(false)}
            >
              For Business
            </Link>
            <Link
              to="/login"
              className="py-3 text-left text-base font-medium text-fv-navy/70"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

const HERO_PHRASES = [
  "reduce weight",
  "build strength",
  "reduce pain",
  "build stamina",
  "feel energetic",
];

/* ---------- HERO ---------- */
function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % HERO_PHRASES.length);
    }, 2000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <section
      id="home"
      className="relative overflow-hidden text-white"
    >
      <img
        src={heroHands}
        alt="People doing yoga"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-fv-navy/90 via-fv-navy/80 to-fv-navy/60" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-5 gap-10 items-center">
        <div className="md:col-span-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" /> Your Society, Your Time, Our Trainer
          </span>
          <h1 className="mt-5 font-display md:text-6xl font-bold leading-[1.05] text-3xl overflow-hidden">
            Join us to{" "}
            <span
              key={phraseIndex}
              className="inline-block text-fv-orange animate-slide-in-right"
            >
              {HERO_PHRASES[phraseIndex]}
            </span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/70 max-w-xl">
            Fitness for the Busy Ones — Fitness at Your Doorstep
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => {
                trackEvent("hero_cta_clicked");
                scrollTo("contact");
              }}
              className="bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8 text-base font-semibold"
            >
              Speak to a Coach <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              onClick={() => trackEvent("whatsapp_clicked", { from: "hero" })}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-6 h-12 text-base font-semibold hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp Us
            </a>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { icon: Users, text: "110+ Professionals Trained" },
              { icon: Building2, text: "Active in 10+ Bangalore Societies" },
              { icon: Stethoscope, text: "Clinical Protocols, Expert Trainers" },
            ].map((t) => (
              <div key={t.text} className="flex items-center gap-2 text-white/90">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-fv-orange/20 text-fv-orange">
                  <t.icon className="h-4 w-4" />
                </span>
                {t.text}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-2xl bg-white/5 backdrop-blur p-6 border border-white/10 shadow-elevated">
            <p className="text-xs uppercase tracking-widest text-white/60">Body Age Reversal</p>
            <div className="mt-3 flex items-end gap-6">
              <div>
                <div className="text-5xl font-bold">42</div>
                <div className="text-xs text-white/60 mt-1">Before</div>
              </div>
              <ArrowRight className="h-8 w-8 text-fv-orange mb-2" />
              <div>
                <div className="text-5xl font-bold text-fv-orange">38</div>
                <div className="text-xs text-white/60 mt-1">After 12 weeks</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: "Visceral Fat", val: 50, trend: "down", display: null as string | null },
                { label: "Muscle Mass", val: 65, trend: "up", display: "+3.2 kg lean mass" },
                { label: "Mobility Score", val: 78, trend: "up", display: null as string | null },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>{b.label}</span>
                    <span>{b.display ?? `${b.trend === "down" ? "-" : "+"}${b.val}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full bg-gradient-to-r",
                        b.trend === "down"
                          ? "from-red-700 via-red-500 to-red-300"
                          : "from-fv-orange to-amber-300"
                      )}
                      style={{ width: `${b.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- PROBLEM / SOLUTION ---------- */
function ProblemSolution() {
  const problems = [
    {
      icon: Briefcase,
      title: "Corporate Professionals",
      points: [
        "Sitting 10 hours/day destroying posture",
        "No time for gym commute, need convenience",
        "Want long-term health, not just weight loss",
      ],
    },
    {
      icon: HeartPulse,
      title: "Seniors (55+)",
      points: [
        "Managing BP, diabetes, arthritis with medication",
        "Afraid of injury, need expert supervision",
        "Want independence at 70, not nursing home at 65",
      ],
    },
    {
      icon: Activity,
      title: "Recovery Clients",
      points: [
        "Cleared by doctor but don't know where to start",
        "Afraid of re-injury without proper guidance",
        "Generic gym programs ignore surgery history",
      ],
    },
  ];
  const solutions = [
    "Society-based convenience: Train in your building gym, zero commute",
    "Clinical precision: Breath-led movement, posture correction, medical-history-based programs",
    "Longevity-first: Train for healthspan (moving well at 80), not just aesthetics",
    "Expert trainers: Clinical fitness specialists, not generic gym instructors",
  ];
  return (
    <section id="about" className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Your Current Fitness Routine is Failing You
          </h2>
          <p className="mt-3 text-fv-text/70">
            Three groups we hear from every week — and what's quietly going wrong.
          </p>
          <Accordion type="single" collapsible className="mt-8 space-y-5">
            {problems.map((p, i) => (
              <AccordionItem
                key={p.title}
                value={`prob-${i}`}
                className="rounded-xl border border-fv-navy/10 bg-fv-neutral px-5"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-fv-navy text-white">
                      <p.icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold text-fv-navy text-lg text-left">{p.title}</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5 text-sm text-fv-text/80 list-disc pl-5">
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-orange">
            Fitved Brings the Clinic to Your Society
          </h2>
          <p className="mt-3 text-fv-text/70">
            A new operating system for fitness — built for people who can't afford to get it wrong.
          </p>
          <div className="mt-8 grid gap-4">
            {solutions.map((s) => (
              <div
                key={s}
                className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-fv-navy to-[#2A4A7A] p-5 text-white shadow-card"
              >
                <Check className="h-5 w-5 text-fv-orange shrink-0 mt-0.5" />
                <p className="text-sm md:text-base">{s}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={() => scrollTo("contact")}
            className="mt-8 bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8"
          >
            See How It Works
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- SERVICES ---------- */
function Services() {
  const cards = [
    {
      icon: Users,
      title: "1-on-1 Personal Training",
      desc: "Fully customized programs in your society gym. Medical history analysis, body composition tracking, weekly progress reviews.",
      ideal: "Corporate professionals, seniors, clinical recovery",
      cta: "Learn More",
    },
    {
      icon: Users,
      title: "Small Group Training (4–6)",
      desc: "Semi-private sessions with friends or neighbors. Personalized attention at affordable pricing. Build community while building strength.",
      ideal: "Society residents, couples, friend groups",
      cta: "Learn More",
    },
    {
      icon: Laptop,
      title: "Online Training",
      desc: "Live video sessions, personalized meal plans, weekly check-ins. For clients outside Bangalore or with unpredictable schedules.",
      ideal: "Remote professionals, frequent travelers",
      cta: "Learn More",
      href: "/online-training.html",
    },
    {
      icon: Building2,
      title: "Corporate Wellness",
      desc: "Bulk society bookings for apartment complexes. Monthly packages, flexible scheduling, dedicated trainers for your community.",
      ideal: "RWA committees, property managers",
      cta: "Learn More",
    },
  ];
  return (
    <section id="services" className="py-20 md:py-28 bg-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            How We Work With You
          </h2>
          <p className="mt-3 text-fv-text/70">
            Four ways to start training with Fitved — pick the one that fits your life.
          </p>
        </div>
        <Accordion type="single" collapsible className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c, i) => (
            <AccordionItem
              key={c.title}
              value={`svc-${i}`}
              className="rounded-2xl bg-white border border-fv-navy/10 px-6 shadow-card hover:shadow-elevated transition-shadow data-[state=open]:shadow-elevated"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fv-navy text-white">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-fv-navy text-base">{c.title}</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-fv-text/70">{c.desc}</p>
                <p className="mt-3 text-xs text-fv-text/60">
                  <span className="font-semibold text-fv-navy">Ideal for:</span> {c.ideal}
                </p>
                {(c as any).href ? (
                  <a
                    href={(c as any).href}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-fv-orange hover:underline"
                  >
                    {c.cta} <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => scrollTo("contact")}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-fv-orange hover:underline"
                  >
                    {c.cta} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------- ROADMAP ---------- */
function Roadmap() {
  const phases = [
    {
      icon: Wrench,
      tag: "Weeks 1–3",
      title: "Rebuild",
      tagline: "Assess. Reset. Move pain-free.",
      pill: "Foundation",
    },
    {
      icon: Dumbbell,
      tag: "Weeks 4–8",
      title: "Strengthen",
      tagline: "Build muscle. Burn visceral fat.",
      pill: "Progress",
    },
    {
      icon: Trophy,
      tag: "Weeks 9–12",
      title: "Perform",
      tagline: "Lock in habits for life.",
      pill: "Peak",
    },
  ];
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Your 12-Week Journey
          </h2>
          <p className="mt-2 text-fv-text/70 text-sm md:text-base">
            Three phases. One transformation.
          </p>
        </div>

        {/* Desktop: static 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mt-12">
          {phases.map((p) => (
            <div key={p.title} className="flex flex-col items-center text-center rounded-2xl bg-white border border-fv-navy/10 p-8 shadow-card">
              <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white border-4 border-fv-orange shadow-elevated">
                <p.icon className="h-10 w-10 text-fv-navy" />
                <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-fv-navy text-white text-[10px] font-bold uppercase tracking-wider">
                  {p.pill}
                </span>
              </div>
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-fv-orange">{p.tag}</p>
                <h3 className="mt-1 text-2xl font-display font-bold text-fv-navy">{p.title}</h3>
                <p className="mt-1 text-sm text-fv-text/70 max-w-[220px] mx-auto">{p.tagline}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="md:hidden mt-12 relative px-12">
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {phases.map((p) => (
                <CarouselItem key={p.title} className="basis-[85%]">
                  <div className="flex flex-col items-center text-center rounded-2xl bg-white border border-fv-navy/10 p-8 shadow-card h-full">
                    <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white border-4 border-fv-orange shadow-elevated">
                      <p.icon className="h-10 w-10 text-fv-navy" />
                      <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-fv-navy text-white text-[10px] font-bold uppercase tracking-wider">
                        {p.pill}
                      </span>
                    </div>
                    <div className="mt-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-fv-orange">{p.tag}</p>
                      <h3 className="mt-1 text-2xl font-display font-bold text-fv-navy">{p.title}</h3>
                      <p className="mt-1 text-sm text-fv-text/70 max-w-[220px] mx-auto">{p.tagline}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2" />
            <CarouselNext className="-right-2" />
          </Carousel>
        </div>

        <div className="mt-12 text-center">
          <Button
            onClick={() => scrollTo("contact")}
            className="bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8 font-semibold"
          >
            Start Your 12-Week Transformation
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- DIFFERENCE ---------- */
function Difference() {
  const rows = [
    ["Focus: Aesthetics (six-pack abs)", "Focus: Healthspan (move well at 80)"],
    ["Rep counting without context", "Posture correction + clinical cues"],
    ["One-size-fits-all programs", "Medical history-based customization"],
    ["Young trainers, basic certifications", "Clinical fitness specialists (longevity-trained)"],
    ["You commute to crowded gym", "We come to your society gym"],
    ["No nutrition guidance", "Metabolic meal plans included"],
    ["Cancel anytime, lose progress", "12-week commitment builds real habits"],
  ];
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Not Your Typical Gym Experience
          </h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl border border-fv-navy/10 shadow-card">
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 bg-fv-navy text-white">
            <div className="hidden md:block p-4 text-sm font-semibold opacity-80">Traditional Gym</div>
            <div className="p-4 text-sm font-semibold bg-fv-orange">Fitved Longevity Training</div>
          </div>
          {rows.map(([a, b], i) => (
            <div
              key={a}
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 text-sm",
                i % 2 === 0 ? "bg-white" : "bg-fv-neutral"
              )}
            >
              <div className="px-4 pt-3 pb-1 md:py-4 text-fv-text/50 text-xs md:text-sm line-through decoration-fv-text/30">{a}</div>
              <div className="px-4 pb-3 pt-0 md:py-4 text-fv-navy font-medium flex items-start gap-2">
                <Check className="h-4 w-4 text-fv-orange mt-0.5 shrink-0" /> {b}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-fv-text/70 max-w-3xl mx-auto">
          We use evidence-based protocols: breath-led movement, visceral fat targeting, 0.9–1.1g
          protein/kg optimization, anti-inflammatory nutrition, and Centenarian Decathlon training
          (inspired by Dr. Peter Attia's Outlive framework).
        </p>
      </div>
    </section>
  );
}

/* ---------- TAKE CARE ---------- */
function TakeCare() {
  const pillars = [
    {
      icon: Dumbbell,
      title: "We make you physically fit",
      desc: "Structured strength, mobility and cardio programs tailored to your body — delivered at your doorstep.",
      color: "from-fv-navy to-[#2A4A7A]",
    },
    {
      icon: Utensils,
      title: "We fix your diet",
      desc: "Personalised metabolic meal plans that fit your lifestyle — no crash diets, just sustainable nutrition.",
      color: "from-fv-orange to-amber-500",
    },
    {
      icon: BarChart2,
      title: "We track 10+ health metrics",
      desc: "Body age, visceral fat, muscle mass, bone density, BP, HbA1c and more — tracked and reviewed every week.",
      color: "from-fv-navy to-[#2A4A7A]",
    },
    {
      icon: Brain,
      title: "We make you calm",
      desc: "Breathwork, mindfulness and stress-reduction techniques woven into every session for a healthier mind.",
      color: "from-fv-orange to-amber-500",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-fv-navy">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
            We'll take care of you
          </h2>
          <p className="mt-3 text-white/60">
            Every dimension of your health — covered.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p) => (
            <div
              key={p.title}
              className={`rounded-2xl bg-gradient-to-br ${p.color} p-6 flex flex-col gap-4 shadow-elevated`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
                <p.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg leading-snug">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- ZERO EXCUSE ---------- */
function ZeroExcuse() {
  const [isFit, setIsFit] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setIsFit((v) => !v), 1800);
    return () => clearInterval(t);
  }, []);
  const excuses = [
    {
      problem: "Time and travel issue?",
      solution: "Fitved comes to your society — train inside your own building.",
    },
    {
      problem: "Workout feels monotonous?",
      solution: "A thoughtful mix of weights, yoga and pilates — every week different.",
    },
    {
      problem: "Working out alone is boring?",
      solution: "We make it a group activity with neighbours and friends.",
    },
    {
      problem: "I travel a lot for work?",
      solution: "Carry forward missed classes — never lose what you paid for.",
    },
    {
      problem: "My medical condition won't allow it?",
      solution: "Train with clinical specialists who understand your medical history.",
    },
    {
      problem: "Difficult to commit a fixed time?",
      solution: "Flexible scheduling that adapts to your day — not the other way around.",
    },
  ];
  return (
    <section className="py-20 md:py-28 bg-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid lg:grid-cols-[280px_1fr] gap-10 lg:gap-14 items-start">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl bg-fv-orange/15 -rotate-3" aria-hidden />
              <div className="relative w-44 md:w-52 rounded-2xl overflow-hidden shadow-elevated" style={{ aspectRatio: "4/5" }}>
                {/* Doubtful Mona Lisa */}
                <img
                  src={monalisaDoubtful}
                  alt="Mona Lisa looking doubtful"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
                  style={{ opacity: isFit ? 0 : 1 }}
                />
                {/* Fit Mona Lisa */}
                <img
                  src={monalisaFit}
                  alt="Mona Lisa in workout attire"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
                  style={{ opacity: isFit ? 1 : 0 }}
                />
                {/* Label badge */}
                <span
                  className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-700",
                    isFit
                      ? "bg-fv-orange text-white"
                      : "bg-fv-navy/70 text-white/80"
                  )}
                >
                  {isFit ? "After Fitved ✓" : "Before Fitved…"}
                </span>
              </div>
            </div>
            <h2 className="mt-6 font-display text-3xl md:text-4xl font-bold text-fv-navy leading-tight">
              Fitved is your <span className="text-fv-orange">zero-excuse</span> fit partner.
            </h2>
            <p className="mt-3 text-fv-text/70 text-sm md:text-base max-w-xs">
              Whatever's been stopping you — we've already solved for it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {excuses.map((e) => (
              <div
                key={e.problem}
                className="rounded-2xl bg-white border border-fv-navy/10 p-5 shadow-card"
              >
                <p className="text-sm font-semibold text-fv-navy">{e.problem}</p>
                <div className="mt-2 flex items-start gap-2">
                  <Check className="h-4 w-4 text-fv-orange shrink-0 mt-1" />
                  <p className="text-sm text-fv-text/75">{e.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- TRAINERS ---------- */
function Trainers() {
  const trainers = [
    {
      initials: "AS",
      name: "Arjun S.",
      experience: "6 years",
      specialization: "Clinical Rehab & Corrective Exercise",
      bio: "Helps clients recover from injuries and build resilience through evidence-based movement protocols.",
    },
    {
      initials: "PM",
      name: "Priya M.",
      experience: "5 years",
      specialization: "Yoga & Mobility Specialist",
      bio: "Combines functional yoga and breathwork to improve flexibility, posture, and long-term joint health.",
    },
    {
      initials: "RK",
      name: "Rohit K.",
      experience: "7 years",
      specialization: "Strength & Metabolic Conditioning",
      bio: "Specializes in body recomposition for busy professionals — lean muscle gain with sustainable fat loss.",
    },
  ];
  return (
    <section className="py-20 md:py-28 bg-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Meet Your Trainers
          </h2>
          <p className="mt-3 text-fv-text/70">
            Clinical fitness specialists — not generic gym instructors.
          </p>
        </div>
        {/* Desktop: grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {trainers.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-white border border-fv-navy/10 p-6 shadow-card flex flex-col items-center text-center"
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-fv-navy text-white text-2xl font-bold">
                {t.initials}
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-fv-navy">{t.name}</h3>
              <span className="mt-1 inline-flex items-center rounded-full bg-fv-orange/10 px-3 py-0.5 text-xs font-semibold text-fv-orange">
                {t.experience} experience
              </span>
              <p className="mt-2 text-sm font-semibold text-fv-navy/80">{t.specialization}</p>
              <p className="mt-2 text-sm text-fv-text/70">{t.bio}</p>
            </div>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="sm:hidden mt-12 relative px-12">
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {trainers.map((t) => (
                <CarouselItem key={t.name} className="basis-[85%]">
                  <div className="rounded-2xl bg-white border border-fv-navy/10 p-6 shadow-card flex flex-col items-center text-center h-full">
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-fv-navy text-white text-2xl font-bold">
                      {t.initials}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-bold text-fv-navy">{t.name}</h3>
                    <span className="mt-1 inline-flex items-center rounded-full bg-fv-orange/10 px-3 py-0.5 text-xs font-semibold text-fv-orange">
                      {t.experience} experience
                    </span>
                    <p className="mt-2 text-sm font-semibold text-fv-navy/80">{t.specialization}</p>
                    <p className="mt-2 text-sm text-fv-text/70">{t.bio}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2" />
            <CarouselNext className="-right-2" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

/* ---------- RESULTS ---------- */
function Results() {
  const cases = [
    {
      name: "Rajesh M.",
      sub: "42, IT Manager · 12 weeks",
      metrics: [
        { label: "Body Age", from: "46", to: "39", note: "-7 years" },
        { label: "Visceral Fat", from: "12.5", to: "8.0", note: "Safe zone" },
        { label: "Muscle Gain", from: "—", to: "+3.2 kg", note: "Lean mass" },
      ],
      quote:
        "I can sit through 8-hour meetings without lower-back pain now. Fitved's clinical approach fixed issues my gym never addressed.",
    },
    {
      name: "Lakshmi S.",
      sub: "68, Retired Teacher · 16 weeks",
      metrics: [
        { label: "Bone Density", from: "Low", to: "Improved", note: "DEXA verified" },
        { label: "Balance Test", from: "15s", to: "45s", note: "Fall prevention" },
        { label: "BP Meds", from: "Daily", to: "Reduced", note: "Doctor-approved" },
      ],
      quote:
        "At 68, I'm stronger than I was at 55. My grandkids can't believe I can do push-ups and carry groceries without help.",
    },
    {
      name: "Priya K.",
      sub: "48, Post-Hysterectomy · 12 weeks",
      metrics: [
        { label: "Core Strength", from: "Lost", to: "Pre-surgery", note: "Restored" },
        { label: "Abdominal Pain", from: "Daily", to: "None", note: "Eliminated" },
        { label: "Confidence", from: "Afraid", to: "4×/week", note: "Training" },
      ],
      quote:
        "Fitved's rebuild protocol got me back to strength training safely. No other trainer understood post-surgical needs like this.",
    },
  ];
  return (
    <section id="results" className="py-20 md:py-28 bg-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Real People, Real Transformations
          </h2>
          <p className="mt-3 text-fv-text/70">
            Numbers from actual clients. No filters, no edits.
          </p>
        </div>
        <Carousel opts={{ align: "start", loop: true }} className="mt-12">
          <CarouselContent className="-ml-4">
            {cases.map((c) => (
              <CarouselItem key={c.name} className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3">
                <div className="h-full rounded-2xl bg-white border border-fv-navy/10 p-6 shadow-card flex flex-col">
                  <div>
                    <h3 className="font-bold text-fv-navy text-lg">{c.name}</h3>
                    <p className="text-xs text-fv-text/60">{c.sub}</p>
                  </div>
                  <div className="mt-5 space-y-3">
                    {c.metrics.map((m) => (
                      <div key={m.label} className="rounded-lg bg-fv-neutral p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-fv-text/70">{m.label}</span>
                          <span className="text-[10px] uppercase tracking-wider text-fv-orange font-bold">
                            {m.note}
                          </span>
                        </div>
                        <div className="mt-1 flex items-end gap-2 text-fv-navy">
                          <span className="text-sm text-fv-text/40 line-through">{m.from}</span>
                          <ArrowRight className="h-3 w-3 mb-1 text-fv-text/40" />
                          <span className="text-lg font-bold text-fv-orange">{m.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm italic text-fv-text/80">"{c.quote}"</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-white border-fv-navy/20 text-fv-navy" />
          <CarouselNext className="hidden md:flex -right-4 bg-white border-fv-navy/20 text-fv-navy" />
        </Carousel>
        <p className="mt-3 text-center text-xs text-fv-text/50 md:hidden">← swipe to see more →</p>
        <div className="mt-12 text-center">
          <Button
            onClick={() => scrollTo("contact")}
            className="bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8 font-semibold"
          >
            See If Fitved is Right for You
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- TESTIMONIALS ---------- */
function Testimonials() {
  const items = [
    {
      name: "Amit Sharma",
      sub: "39, Corporate Executive · Prestige Lakeside Habitat, Varthur",
      quote:
        "Lost 8kg visceral fat in 12 weeks without feeling like I was on a diet. The trainer came to my society gym 3×/week, zero commute hassle.",
    },
    {
      name: "Meena Iyer",
      sub: "62, Homemaker · Sobha City, Sarjapur",
      quote:
        "I was managing cholesterol, BP, and thyroid with medications. After 16 weeks with Fitved, my doctor reduced my BP medication. I feel 10 years younger.",
    },
    {
      name: "Karthik R.",
      sub: "44, Founder · Adarsh Palm Retreat, Bellandur",
      quote:
        "I tried every trainer in Bangalore. Fitved is the first one that actually fixed my back instead of just making me sweat.",
    },
    {
      name: "Sunita V.",
      sub: "57, Diabetic · Salarpuria Senorita, HSR",
      quote:
        "My HbA1c dropped from 7.8 to 6.1 in 5 months. Strength training plus their nutrition plan changed everything.",
    },
    {
      name: "Vikram J.",
      sub: "36, Product Lead · Brigade Cosmopolis, Whitefield",
      quote:
        "45 minutes, three times a week, in my own building. No more excuses. I'm in the best shape of my life.",
    },
    {
      name: "Anjali P.",
      sub: "51, Post-knee surgery · Mantri Espana, Bellandur",
      quote:
        "They built me back up safely. I'm hiking again at 51 — something I thought was over for me.",
    },
  ];
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Trusted by Bangalore's Busiest Professionals & Active Seniors
          </h2>
        </div>
        <Carousel opts={{ align: "start", loop: true }} className="mt-12">
          <CarouselContent className="-ml-4">
            {items.map((t) => (
              <CarouselItem key={t.name} className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3">
                <div className="h-full rounded-2xl border border-fv-navy/10 p-6 bg-fv-neutral shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-fv-navy text-white font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-fv-navy">{t.name}</div>
                      <div className="text-[11px] text-fv-text/60">{t.sub}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-0.5 text-fv-orange">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-fv-orange" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-fv-text/80 italic">"{t.quote}"</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 bg-white border-fv-navy/20 text-fv-navy" />
          <CarouselNext className="hidden md:flex -right-4 bg-white border-fv-navy/20 text-fv-navy" />
        </Carousel>
        <p className="mt-3 text-center text-xs text-fv-text/50 md:hidden">← swipe to see more →</p>
      </div>
    </section>
  );
}

/* ---------- LOCATIONS ---------- */
function Locations() {
  const areas = [
    "Sarjapur Road",
    "HSR Layout",
    "Bellandur",
    "Marathahalli",
    "Whitefield",
    "Varthur",
    "Haralur",
    "Kadubeesanahalli",
    "Kaikondrahalli",
    "Outer Ring Road Corridor",
  ];
  return (
    <section className="py-20 md:py-28 bg-fv-neutral">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Serving 10+ Residential Societies Across Bangalore
          </h2>
        </div>
        <div className="mt-10 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 overflow-hidden rounded-2xl shadow-card border border-fv-navy/10 aspect-[4/3] bg-white">
            <iframe
              title="Fitved coverage in Bangalore"
              src="https://www.google.com/maps?q=Sarjapur+Road,+Bengaluru&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
          <div className="lg:col-span-2">
            <p className="text-fv-text/70">
              Can't see your society? We're expanding fast. Enquire below and we'll let you know
              when we reach your area.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {areas.map((a) => (
                <li
                  key={a}
                  className="flex items-center gap-2 text-sm text-fv-navy bg-white rounded-lg border border-fv-navy/10 px-3 py-2"
                >
                  <MapPin className="h-4 w-4 text-fv-orange" /> {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  const qa = [
    {
      q: "Do I need to buy equipment?",
      a: "No. We work with your society gym equipment. If your society doesn't have a gym, we bring portable equipment (resistance bands, dumbbells, mats).",
    },
    {
      q: "What if I have health conditions (diabetes, BP, arthritis, past surgery)?",
      a: "Perfect — Fitved specializes in medical-history-based training. We design programs around your conditions, not despite them. Many clients reduce medication under doctor supervision.",
    },
    {
      q: "How is this different from a regular gym membership?",
      a: "We come to your society (zero commute), provide 1-on-1 or small group attention, use clinical protocols (posture correction, breath-led movement), and include metabolic nutrition plans. You're training for healthspan, not just aesthetics.",
    },
    {
      q: "What's the time commitment?",
      a: "Minimum 2–3 sessions/week, 45–60 minutes each. Most clients train Mon/Wed/Fri or Tue/Thu/Sat.",
    },
    {
      q: "Do you provide meal plans?",
      a: "Yes — every client gets a personalized metabolic re-composition plan based on body composition analysis. We optimize protein, manage visceral fat, and address digestive issues.",
    },
    {
      q: "What if I'm a complete beginner?",
      a: "Most of our clients are exactly that. We start with mobility, breathing, and bodyweight movements. Progressive overload is gradual and safe.",
    },
    {
      q: "Can I train with my spouse or friend?",
      a: "Absolutely. Our small group training (4–6 people) is popular for couples and friend groups in the same society.",
    },
    {
      q: "How soon will I see results?",
      a: "Week 4: better sleep, less pain, more energy. Week 8: visible body composition changes. Week 12: sustainable habits, measurable improvements in BP, cholesterol, body age.",
    },
  ];
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-fv-navy">
            Common Questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {qa.map((item, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-fv-navy/10">
              <AccordionTrigger className="text-left text-fv-navy font-semibold hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-fv-text/80">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------- ENQUIRY FORM ---------- */
function EnquiryForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse({ name, phone, interest });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);

    const { error } = await supabase.from("leads").insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      interest: parsed.data.interest,
      source: "landing_form",
    });

    setBusy(false);

    if (error) {
      console.error("Lead insert error:", JSON.stringify(error));
      toast.error(`Submit failed: ${error.message}`);
      return;
    }

    trackEvent("enquiry_submitted", { interest: parsed.data.interest });
    localStorage.setItem("fitved_form_submitted", "true");
    window.dispatchEvent(new Event("fitved_form_done"));
    setDone(true);
  };

  return (
    <section
      id="contact"
      className="py-20 md:py-28 bg-gradient-to-br from-fv-navy via-fv-navy to-[#2A4A7A] text-white"
    >
      <div className="mx-auto max-w-2xl px-4">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Ready to Start Your Longevity Journey?
          </h2>
          <p className="mt-3 text-white/80">
            Fill the form below and our team will contact you within 24 hours to discuss your goals
            and schedule a free consultation call.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-white text-fv-text p-6 md:p-8 shadow-elevated">
          {done ? (
            <div className="text-center py-6">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-fv-success/15 text-fv-success">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-2xl font-display font-bold text-fv-navy">
                Thank you! We've received your enquiry.
              </h3>
              <p className="mt-2 text-fv-text/70">
                Our team will contact you within 24 hours. In the meantime, check WhatsApp for a
                message from us.
              </p>
              <Button
                onClick={() => scrollTo("home")}
                className="mt-6 bg-fv-navy text-white hover:bg-fv-navy/90"
              >
                Back to Home
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="lead-name" className="text-fv-navy">Full Name</Label>
                <Input
                  id="lead-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lead-phone" className="text-fv-navy">Phone Number</Label>
                <Input
                  id="lead-phone"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  className="h-12 mt-1.5"
                />
              </div>
              <div>
                <Label className="text-fv-navy">I'm interested in…</Label>
                <Select value={interest} onValueChange={setInterest}>
                  <SelectTrigger className="h-12 mt-1.5">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal Training">Personal Training (1-on-1)</SelectItem>
                    <SelectItem value="Group Training">Group Training (4–6 people)</SelectItem>
                    <SelectItem value="Corporate Wellness">Corporate Wellness (bulk booking)</SelectItem>
                    <SelectItem value="Online Coaching">Online Coaching (waitlist)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-12 bg-fv-orange text-white hover:bg-fv-orange/90 font-semibold text-base"
              >
                {busy ? "Sending…" : "Speak to a Coach"}
              </Button>
              <p className="text-center text-xs text-fv-text/50 flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Your data is safe with us.
              </p>
              <div className="pt-3 border-t border-fv-navy/10">
                <p className="text-xs font-semibold text-fv-navy/50 uppercase tracking-wider mb-2">What happens next?</p>
                {[
                  "We call you within 24 hours",
                  "Free trial session in your society",
                  "No commitment until you love it",
                ].map((step) => (
                  <p key={step} className="flex items-center gap-1.5 text-xs text-fv-text/60 mb-1">
                    <Check className="h-3.5 w-3.5 text-fv-orange shrink-0" /> {step}
                  </p>
                ))}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  return (
    <footer className="bg-fv-navy text-white/80 py-10 pb-28 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 w-fit">
            <img src={fitvedLogo} alt="Fitved" className="h-9 w-auto rounded" />
          </div>
          <p className="mt-3 text-sm text-white/60">
            Calm strength, every day. Society-based clinical fitness in Bangalore.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={`tel:${PHONE}`} className="hover:text-fv-orange">{PHONE_DISPLAY}</a>
            </li>
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="hover:text-fv-orange">
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/fitved.in"
                target="_blank"
                rel="noopener"
                className="hover:text-fv-orange inline-flex items-center gap-1.5"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.333-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.333-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login" className="hover:text-fv-orange">Client / Trainer Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 mt-8 pt-6 border-t border-white/10 text-xs text-white/40">
        © {new Date().getFullYear()} Fitved. All rights reserved.
      </div>
    </footer>
  );
}

/* ---------- MOBILE BAR / WHATSAPP / FLOATING CTA ---------- */
function MobileBar() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 bg-white border-t border-fv-navy/10 shadow-elevated">
      <a
        href={`tel:${PHONE}`}
        onClick={() => trackEvent("phone_clicked", { from: "mobile_bar" })}
        className="flex flex-col items-center justify-center py-2.5 text-fv-navy font-medium text-xs"
      >
        <Phone className="h-5 w-5 mb-0.5" /> Call
      </a>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener"
        onClick={() => trackEvent("whatsapp_clicked", { from: "mobile_bar" })}
        className="flex flex-col items-center justify-center py-2.5 bg-[#25D366] text-white font-medium text-xs"
      >
        <MessageCircle className="h-5 w-5 mb-0.5" /> WhatsApp
      </a>
      <button
        onClick={() => scrollTo("contact")}
        className="flex flex-col items-center justify-center py-2.5 bg-fv-orange text-white font-medium text-xs"
      >
        <ChevronDown className="h-5 w-5 mb-0.5 rotate-180" /> Enquire
      </button>
    </div>
  );
}

function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener"
      onClick={() => trackEvent("whatsapp_clicked", { from: "float" })}
      aria-label="Chat on WhatsApp"
      className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-elevated hover:scale-105 transition-transform"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

function DesktopFloatingCta() {
  return (
    <button
      onClick={() => scrollTo("contact")}
      className="hidden md:flex fixed bottom-6 right-24 z-40 items-center gap-2 rounded-full bg-fv-orange text-white px-5 h-14 font-semibold shadow-elevated hover:bg-fv-orange/90"
    >
      Enquire Now <ArrowRight className="h-4 w-4" />
    </button>
  );
}

/* ---------- POPUP ---------- */
function PopupModal({
  open,
  onOpenChange,
  title,
  body,
  source,
  nameOptional = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: string;
  source: string;
  nameOptional?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);

    const { error } = await supabase.from("leads").insert({
      name: name.trim() || "Anonymous",
      phone,
      interest: "Popup enquiry",
      source,
    });

    setBusy(false);

    if (error) {
      console.error("Popup lead insert error:", JSON.stringify(error));
      toast.error(`Could not submit: ${error.message}`);
      return;
    }

    trackEvent("enquiry_submitted", { source });
    localStorage.setItem("fitved_form_submitted", "true");
    window.dispatchEvent(new Event("fitved_form_done"));
    toast.success("Thanks! We'll be in touch shortly.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-fv-navy">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!nameOptional && (
            <Input
              required
              maxLength={100}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          )}
          <Input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="h-11"
          />
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-fv-orange text-white hover:bg-fv-orange/90"
          >
            {busy ? "Sending…" : "Send Me Details"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
