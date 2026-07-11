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
  Check,
  Star,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Stethoscope,
  Activity,
  HeartPulse,
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
import monalisaFit from "@/assets/monalisa-fit.png";
import monalisaDoubtful from "@/assets/monalisa-doubtful.png";
import razorpayRizeLogo from "@/assets/razorpay-rize.svg";
const heroHands = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80";

const PHONE = "+919890471383";
const PHONE_DISPLAY = "+91 9890471383";
const WHATSAPP_TEXT = encodeURIComponent("Hi, I'm interested in Fitved training. Can you help me?");
const WHATSAPP_URL = `https://wa.me/${PHONE.replace(/\D/g, "")}?text=${WHATSAPP_TEXT}`;

const NAV = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "trainers", label: "Trainers" },
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

/* ────────────────────────────────────────────────────────────────
   Scroll-reveal hook — triggers once per element as it enters view
──────────────────────────────────────────────────────────────────*/
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return ref;
}

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
    <div className="min-h-screen bg-fv-navy text-white overflow-x-hidden">
      <Nav active={active} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <main>
        <Hero />
        <ZeroExcuse />
        <ProblemSolution />
        <Services />
        <Gallery />
        <Trainers />
        <Testimonials />
        <EnquiryFormAndFAQ />
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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-fv-navy/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#home" className="flex items-center gap-2" onClick={() => scrollTo("home")}>
          <img src={fitvedLogo} alt="Fitved" className="h-10 w-auto rounded bg-white/10 p-1" />
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => scrollTo(n.id)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors",
                active === n.id
                  ? "text-fv-orange font-bold"
                  : "text-white/70 hover:text-white"
              )}
            >
              {n.label}
            </button>
          ))}
          <a
            href="/online-training.html"
            className="rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider text-white/70 hover:text-white transition-colors"
          >
            Online Training
          </a>
          <Link
            to="/corporate"
            className="rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider text-white/70 hover:text-white transition-colors"
          >
            For Business
          </Link>
          <Button
            onClick={() => scrollTo("contact")}
            className="ml-2 bg-fv-orange text-white hover:bg-fv-orange/90 transition-all uppercase tracking-wider text-xs font-bold px-4"
          >
            Speak to a Coach
          </Button>
          <Link
            to="/login"
            className="ml-2 text-sm font-medium uppercase tracking-wider text-white/70 hover:text-white px-2 transition-colors"
          >
            Log in
          </Link>
        </nav>
        <button
          aria-label="Open menu"
          className="md:hidden rounded-md p-2 text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-fv-navy">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  scrollTo(n.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  "py-3 text-left text-base font-semibold uppercase tracking-wider border-b border-white/5",
                  active === n.id ? "text-fv-orange" : "text-white"
                )}
              >
                {n.label}
              </button>
            ))}
            <a
              href="/online-training.html"
              className="py-3 text-left text-base font-semibold uppercase tracking-wider text-white border-b border-white/5"
              onClick={() => setMenuOpen(false)}
            >
              Online Training
            </a>
            <Link
              to="/corporate"
              className="py-3 text-left text-base font-semibold uppercase tracking-wider text-white border-b border-white/5"
              onClick={() => setMenuOpen(false)}
            >
              For Business
            </Link>
            <Link
              to="/login"
              className="py-3 text-left text-base font-semibold uppercase tracking-wider text-white/70"
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
  "REDUCE WEIGHT",
  "BUILD STRENGTH",
  "REDUCE PAIN",
  "BUILD STAMINA",
  "FEEL ENERGETIC",
];

const HERO_IMAGES = [
  "/gallery/class-1.jpg",
  "/gallery/class-2.jpg",
  "/gallery/class-3.jpg",
  "/gallery/class-4.jpg",
  "/gallery/class-5.jpg",
];

/* ---------- HERO ---------- */
function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const cycleText = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % HERO_PHRASES.length);
    }, 2000);
    return () => clearInterval(cycleText);
  }, []);

  useEffect(() => {
    const cycleImage = setInterval(() => {
      setImageIndex((prev) => {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * HERO_IMAGES.length);
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(cycleImage);
  }, []);

  return (
    <section
      id="home"
      className="relative overflow-hidden text-white bg-fv-navy py-10 md:py-14 flex items-center"
    >
      <img
        src={heroHands}
        alt="People doing yoga"
        className="absolute inset-0 h-full w-full object-cover object-center hero-bg-zoom opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-fv-navy via-fv-navy/95 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-4 grid md:grid-cols-12 gap-6 items-center w-full z-10">
        {/* Left Column: Bold Typography & CTAs */}
        <div className="md:col-span-7 animate-fade-in text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-white/15 mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-fv-orange" /> Your Society, Your Time, Our Trainer
          </span>
          
          <h1 className="font-sans font-black uppercase text-5xl md:text-7xl leading-[0.95] tracking-tighter mt-2">
            Join us to <br />
            <span
              key={phraseIndex}
              className="text-fv-orange animate-slide-in-right block"
            >
              {HERO_PHRASES[phraseIndex]}
            </span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-white/75 max-w-lg leading-relaxed">
            Fitness for the Busy Ones — Fitness at Your Doorstep
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => {
                trackEvent("hero_cta_clicked");
                scrollTo("contact");
              }}
              className="bg-fv-orange text-white hover:bg-fv-orange/90 h-12 px-8 text-sm font-black uppercase tracking-wider transition-all hover:scale-[1.03] hover:shadow-lg"
            >
              Start Today
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo("services")}
              className="border border-white/20 bg-transparent text-white hover:bg-white/10 h-12 px-8 text-sm font-black uppercase tracking-wider transition-all"
            >
              Explore Programs
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-white/70">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-fv-orange"></span>
              110+ Trained
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-fv-orange"></span>
              10+ Societies
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-fv-orange"></span>
              Expert Clinical Protocols
            </div>
          </div>
        </div>

        {/* Right Column: Hero Accent Image/Overlay */}
        <div className="md:col-span-5 animate-fade-in md:block hidden" style={{ animationDelay: "0.15s" }}>
          <div className="relative p-2">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-fv-orange to-amber-500 opacity-20 blur-lg"></div>
            <div className="relative rounded-2xl border border-white/10 overflow-hidden aspect-[4/5] bg-fv-navy">
              {HERO_IMAGES.map((imgUrl, idx) => (
                <img
                  key={imgUrl}
                  src={imgUrl}
                  alt="Fitved Training Session"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover grayscale contrast-125 transition-opacity duration-1000 ease-in-out",
                    idx === imageIndex ? "opacity-80 z-0" : "opacity-0 pointer-events-none"
                  )}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-fv-navy via-transparent to-transparent z-10"></div>
              
              {/* Overlay Stat badge */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-fv-navy/80 backdrop-blur border border-white/10 z-20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-fv-orange">Body Age Reversal</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black">42</span>
                  <span className="text-xs text-white/50">to</span>
                  <span className="text-3xl font-black text-fv-orange">38</span>
                  <span className="text-xs text-white/60 ml-2">in 12 weeks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer md:flex hidden" onClick={() => scrollTo("about")}>
        <span className="text-[10px] font-bold uppercase tracking-widest">Scroll</span>
        <span className="h-8 w-px bg-white/50 animate-pulse"></span>
      </div>
    </section>
  );
}

/* ---------- ZERO EXCUSE (USP) ---------- */
function ZeroExcuse() {
  const [isFit, setIsFit] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setIsFit((v) => !v), 1800);
    return () => clearInterval(t);
  }, []);

  const ref = useReveal();

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
    <section id="usp" className="py-8 md:py-12 bg-fv-navy border-t border-white/10">
      <div ref={ref} className="reveal mx-auto max-w-6xl px-4 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Mona Lisa Portrait & Text */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="relative p-1">
            {/* Orange border offset */}
            <div className="absolute -bottom-3 -left-3 w-full h-full rounded-2xl border-2 border-fv-orange translate-x-1.5 translate-y-1.5 -z-10" />
            <div className="relative w-44 md:w-52 rounded-2xl overflow-hidden shadow-elevated bg-[#13243a]" style={{ aspectRatio: "4/5" }}>
              {/* Doubtful Mona Lisa */}
              <img
                src={monalisaDoubtful}
                alt="Mona Lisa looking doubtful"
                className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 grayscale contrast-110"
                style={{ opacity: isFit ? 0 : 1 }}
              />
              {/* Fit Mona Lisa */}
              <img
                src={monalisaFit}
                alt="Mona Lisa in workout attire"
                className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 grayscale group-hover:grayscale-0"
                style={{ opacity: isFit ? 1 : 0 }}
              />
              {/* Label badge */}
              <span
                className={cn(
                  "absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-700",
                  isFit
                    ? "bg-fv-orange text-white"
                    : "bg-fv-navy/80 text-white/80 border border-white/10"
                )}
              >
                {isFit ? "After Fitved ✓" : "Before Fitved…"}
              </span>
            </div>
          </div>
          
          <h2 className="mt-6 font-sans font-black uppercase text-3xl md:text-4xl tracking-tighter leading-none text-white">
            Fitved is your <br />
            <span className="text-fv-orange">zero-excuse</span> fit partner.
          </h2>
          <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-sm">
            Whatever's been stopping you — we've already solved for it.
          </p>
        </div>

        {/* Right Side: 6 USP Cards */}
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
          {excuses.map((e, idx) => (
            <div
              key={idx}
              className="bg-white/5 border border-white/10 p-4 rounded-xl transition-all duration-300 hover:border-fv-orange/30 hover:bg-white/[0.07] text-left"
            >
              <h3 className="font-sans font-black uppercase text-sm text-white tracking-wider">
                {e.problem}
              </h3>
              <div className="mt-2 flex items-start gap-2">
                <Check className="h-4 w-4 text-fv-orange shrink-0 mt-0.5" />
                <p className="text-xs text-white/70 leading-relaxed">
                  {e.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PROBLEM / SOLUTION (About Us) ---------- */
function ProblemSolution() {
  const ref = useReveal();
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

  const stats = [
    { val: "110+", label: "Transformations" },
    { val: "12 Weeks", label: "Avg Programme" },
    { val: "100%", label: "Personalised Plans" },
    { val: "5.0 ★", label: "Trainer Rating" },
  ];

  return (
    <section id="about" className="py-8 md:py-12 bg-fv-navy border-t border-white/10">
      <div ref={ref} className="reveal mx-auto max-w-6xl px-4 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Photo with offset frame */}
        <div className="lg:col-span-5 relative">
          <div className="absolute -bottom-4 -left-4 w-full h-full rounded-2xl border-2 border-fv-orange translate-x-2 translate-y-2 -z-10" />
          <div className="relative overflow-hidden rounded-2xl aspect-[4/5] shadow-2xl bg-[#13243a]">
            <img
              src="/gallery/class-5.jpg"
              alt="Transformation and Fitness Roster"
              className="w-full h-full object-cover grayscale contrast-110"
            />
            {/* Absolute badge */}
            <div className="absolute bottom-4 right-4 bg-fv-orange text-white font-bold text-xs uppercase tracking-widest px-4 py-2 rounded shadow-lg">
              100+ Happy Members
            </div>
          </div>
        </div>

        {/* Right Side: Text + Stats Grid */}
        <div className="lg:col-span-7 text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-fv-orange"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">
              ABOUT US
            </span>
          </div>

          <h2 className="font-sans font-black uppercase text-4xl md:text-5xl leading-none tracking-tighter">
            TRANSFORM <span className="text-fv-orange">YOUR LIFE</span>
          </h2>
          
          <p className="mt-4 text-white/70 leading-relaxed text-sm md:text-base">
            At Fitved, we're dedicated to helping you embrace a healthier lifestyle — making physical fitness and a balanced diet your priority. We bring the clinical support you need to enhance your quality of life, wherever you are.
          </p>

          <p className="mt-3 text-sm italic text-white/50 border-l-2 border-fv-orange pl-4">
            "A good workout doesn't just strengthen your body — it strengthens your mindset too."
          </p>

          {/* Grid of stats */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {stats.map((s, idx) => (
              <div 
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl p-3 transition-all duration-300 hover:border-fv-orange/30 hover:bg-white/[0.07]"
              >
                <div className="text-3xl font-black text-fv-orange leading-none">{s.val}</div>
                <div className="text-xs uppercase tracking-wider text-white/60 mt-2 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          <a
            href={`tel:${PHONE}`}
            onClick={() => trackEvent("phone_clicked", { from: "about_call_now" })}
            className="inline-block mt-5"
          >
            <Button
              className="bg-fv-orange text-white hover:bg-fv-orange/90 px-8 py-3 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
            >
              Call Now
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- SERVICES (What We Do Best) ---------- */
function Services() {
  const ref = useReveal();
  const cards = [
    {
      num: "01",
      title: "1-on-1 Personal Training",
      desc: "Fully customized programs in your society gym. Medical history analysis, body composition tracking, weekly progress reviews.",
      ideal: "Corporate professionals, seniors, clinical recovery",
      img: "/gallery/class-4.jpg",
    },
    {
      num: "02",
      title: "Small Group Training (4–6)",
      desc: "Semi-private sessions with friends or neighbors. Personalized attention at affordable pricing. Build community while building strength.",
      ideal: "Society residents, couples, friend groups",
      img: "/gallery/class-2.jpg",
    },
    {
      num: "03",
      title: "Tailored Diet Plans",
      desc: "Custom metabolic nutrition program designed by experts. Weekly dietary updates, optimal macro breakdown, and gut health support.",
      ideal: "Weight loss, muscle gain, chronic issue management",
      img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    },
    {
      num: "04",
      title: "Yoga & Wellness Sessions",
      desc: "Society-based classes blending strength conditioning with yoga. Breathwork, posture correction, and full-body mobility exercises.",
      ideal: "Apartment communities, RWAs, corporate offices",
      img: "/gallery/class-1.jpg",
    },
  ];

  return (
    <section id="services" className="py-8 md:py-12 bg-fv-navy border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-px w-8 bg-fv-orange"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">
                OUR OFFERINGS
              </span>
            </div>
            <h2 className="font-sans font-black uppercase text-4xl md:text-5xl tracking-tighter leading-none">
              WHAT WE <span className="text-fv-orange">DO BEST</span>
            </h2>
          </div>
          <p className="text-white/60 text-sm max-w-sm text-left leading-relaxed">
            Fitness tailored to your life, not the other way around. Select the custom path that matches your health goals.
          </p>
        </div>

        {/* 4-Column Card Grid styled like Fittians */}
        <div ref={ref} className="reveal mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.num}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] border border-white/10 cursor-pointer bg-fv-navy"
            >
              {/* Card BG Image with Grayscale default */}
              <img
                src={c.img}
                alt={c.title}
                loading="lazy"
                className="w-full h-full object-cover transition-all duration-700 sm:group-hover:scale-110 grayscale-0 sm:grayscale sm:group-hover:grayscale-0 sm:group-hover:contrast-100 contrast-125 opacity-55 sm:opacity-40 sm:group-hover:opacity-75"
              />
              
              {/* Bottom Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-fv-navy/95 via-fv-navy/60 to-transparent sm:from-fv-navy sm:via-fv-navy/60 sm:to-transparent transition-all duration-300 sm:group-hover:from-fv-navy/95"></div>
              
              {/* Card Contents */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
                <span className="text-xs font-black text-fv-orange tracking-widest block mb-1">
                  {c.num}
                </span>
                
                <h3 className="font-sans font-black uppercase text-xl leading-tight text-white mb-2 sm:group-hover:text-fv-orange transition-colors">
                  {c.title}
                </h3>
                
                {/* Hover Reveal Details - Always visible on mobile, reveal on hover on desktop */}
                <div className="max-h-48 opacity-100 overflow-hidden sm:max-h-0 sm:opacity-0 sm:group-hover:max-h-48 sm:group-hover:opacity-100 transition-all duration-500 ease-in-out">
                  <p className="text-xs text-white/80 leading-relaxed mb-4">
                    {c.desc}
                  </p>
                  <Button
                    onClick={() => scrollTo("contact")}
                    className="w-full bg-fv-orange text-white hover:bg-fv-orange/90 text-[10px] font-black uppercase tracking-wider h-9"
                  >
                    Enquire Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- GALLERY ---------- */
const GALLERY = [
  { src: "/gallery/class-4.jpg", alt: "Trainer guiding students through seated stretch" },
  { src: "/gallery/class-3.jpg", alt: "Outdoor group yoga session in a society compound" },
  { src: "/gallery/class-2.jpg", alt: "Pranayama breathing session with trainer" },
  { src: "/gallery/class-1.jpg", alt: "Partner yoga mobility drill in society gym" },
  { src: "/gallery/class-5.jpg", alt: "Indoor strength and flexibility class" },
  { src: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80", alt: "Breathwork and meditation" },
];

function Gallery() {
  const ref = useReveal(0.1);
  return (
    <section className="py-8 md:py-12 bg-fv-navy border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">INSIDE A FITVED SESSION</span>
          <h2 className="mt-3 font-sans font-black uppercase text-3xl md:text-5xl tracking-tighter leading-none">
            REAL CLASSES, RIGHT IN <span className="text-fv-orange">YOUR SOCIETY</span>
          </h2>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Small groups, expert trainers, and a room full of neighbours showing up for themselves.
          </p>
        </div>
        
        <div ref={ref} className="reveal mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto">
          {GALLERY.map((g, i) => (
            <div
              key={g.src}
              className="overflow-hidden rounded-xl bg-[#13243a] group cursor-pointer border border-white/10 aspect-video relative"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <img
                src={g.src}
                alt={g.alt}
                loading="lazy"
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0 opacity-75 group-hover:opacity-100"
              />
              {/* Sleek bottom overlay on hover */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fv-navy/95 to-transparent pt-8 pb-3 px-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white line-clamp-1 leading-none">
                  {g.alt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- TRAINERS (Team) ---------- */
interface TrainerData {
  name: string;
  experience: string;
  rating: number;
  reviews: number;
  specialization: string;
  bio: string;
  photo?: string;
}

function Trainers() {
  const trainers: TrainerData[] = [
    {
      name: "Suma",
      experience: "10+ years",
      rating: 5.0,
      reviews: 128,
      specialization: "Senior Longevity & Therapeutic Yoga",
      bio: "A senior specialist who helps older adults rebuild strength, balance, and confidence through gentle, medically-informed movement.",
    },
    {
      name: "Dhruvi Patel",
      experience: "6 years",
      rating: 4.9,
      reviews: 94,
      specialization: "Yoga Therapist",
      bio: "Blends functional yoga and breathwork to ease back pain, improve posture, and restore long-term joint mobility.",
    },
    {
      name: "Pramod Palve",
      experience: "7 years",
      rating: 4.9,
      reviews: 112,
      specialization: "Yoga & Fitness Coach",
      bio: "Fuses strength conditioning with yoga for busy professionals — lean muscle, better stamina, sustainable fat loss.",
    },
    {
      name: "Shubham Sahane",
      experience: "5 years",
      rating: 4.8,
      reviews: 76,
      specialization: "Yoga & Mobility Trainer",
      bio: "Makes every session a group activity — high-energy mobility and strength work that neighbours actually look forward to.",
    },
    {
      name: "Saurabh",
      experience: "5 years",
      rating: 4.8,
      reviews: 68,
      specialization: "Yoga & Functional Training",
      bio: "Guides beginners from their very first stretch to confident, pain-free movement with patient, step-by-step coaching.",
    },
  ];

  const card = (t: TrainerData, delay = 0) => (
    <div
      className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 shadow-card hover:shadow-elevated hover:border-fv-orange/30 transition-all duration-300 hover:-translate-y-1 flex flex-col text-left"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        {t.photo ? (
          <img
            src={t.photo}
            alt={`Trainer ${t.name}`}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/10 text-white text-xl font-bold border border-white/10">
            {t.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-sans font-black uppercase text-lg text-white truncate leading-none">{t.name}</h3>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="flex text-fv-orange">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("h-3.5 w-3.5", i < Math.round(t.rating) && "fill-fv-orange")} />
              ))}
            </span>
            <span className="text-xs font-semibold text-white/90">{t.rating.toFixed(1)}</span>
            <span className="text-xs text-white/40">({t.reviews})</span>
          </div>
        </div>
      </div>
      <span className="mt-4 inline-flex w-fit items-center rounded-full bg-fv-orange/10 px-3 py-0.5 text-xs font-semibold text-fv-orange">
        {t.specialization} · {t.experience}
      </span>
      <p className="mt-3 text-sm text-white/70 leading-relaxed">{t.bio}</p>
    </div>
  );

  const ref = useReveal(0.1);

  return (
    <section id="trainers" className="py-8 md:py-12 bg-fv-navy border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">THE TEAM</span>
          <h2 className="mt-3 font-sans font-black uppercase text-3xl md:text-5xl tracking-tighter leading-none">
            MEET YOUR <span className="text-fv-orange">TRAINERS</span>
          </h2>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Certified yoga and fitness specialists who train you inside your own society.
          </p>
        </div>

        {/* Desktop: horizontal infinite marquee */}
        <div ref={ref} className="reveal hidden sm:block mt-6 relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-fv-navy to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-fv-navy to-transparent z-10" />
          <div className="marquee-track py-3">
            {[...trainers, ...trainers].map((t, i) => (
              <div key={`${t.name}-${i}`} className="w-[300px] shrink-0 mx-2">
                {card(t)}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: carousel */}
        <div className="sm:hidden mt-8 relative px-12">
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {trainers.map((t) => (
                <CarouselItem key={t.name} className="basis-[85%]">{card(t)}</CarouselItem>
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



/* ---------- TESTIMONIALS (Marquee) ---------- */
function Testimonials() {
  const items = [
    {
      name: "Amit Sharma",
      sub: "39, Corporate Executive · Lakeside Habitat, Varthur",
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

  const TestiCard = ({ t }: { t: typeof items[number] }) => (
    <div className="w-[320px] shrink-0 rounded-2xl border border-white/10 p-6 bg-white/5 shadow-card hover:shadow-elevated hover:border-fv-orange/30 transition-all duration-300 mx-3 text-left">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white font-bold shrink-0 border border-white/10">
          {t.name[0]}
        </div>
        <div>
          <div className="font-sans font-black uppercase text-sm text-white tracking-wider leading-none">{t.name}</div>
          <div className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">{t.sub}</div>
        </div>
      </div>
      <div className="mt-4 flex gap-0.5 text-fv-orange">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-fv-orange" />
        ))}
      </div>
      <p className="mt-3 text-sm text-white/70 italic leading-relaxed">"{t.quote}"</p>
    </div>
  );

  const doubled = [...items, ...items];

  return (
    <section id="testimonials" className="py-8 md:py-12 bg-fv-navy border-t border-white/10 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">TESTIMONIALS</span>
          <h2 className="mt-3 font-sans font-black uppercase text-3xl md:text-5xl tracking-tighter leading-none">
            WHAT OUR <span className="text-fv-orange">MEMBERS SAY</span>
          </h2>
        </div>
      </div>

      {/* Desktop marquee */}
      <div className="hidden md:block mt-6 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-fv-navy to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-fv-navy to-transparent z-10" />
        <div className="marquee-track py-4">
          {doubled.map((t, i) => (
            <TestiCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="md:hidden mt-8">
        <Carousel opts={{ align: "start", loop: true }}>
          <CarouselContent className="-ml-4">
            {items.map((t) => (
              <CarouselItem key={t.name} className="pl-4 basis-[85%]">
                <TestiCard t={t} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <p className="mt-3 text-center text-xs text-white/40">← swipe to see more →</p>
      </div>
    </section>
  );
}

/* ---------- FAQ & ENQUIRY FORM ---------- */
function EnquiryFormAndFAQ() {
  const ref = useReveal();
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
      className="py-12 md:py-16 bg-gradient-to-br from-fv-navy via-fv-navy to-[#182e49] text-white border-t border-white/10"
    >
      <div ref={ref} className="reveal mx-auto max-w-6xl px-4">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: FAQ Accordion */}
          <div className="lg:col-span-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-px w-8 bg-fv-orange"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">FAQ</span>
            </div>
            <h2 className="font-sans font-black uppercase text-3xl md:text-5xl tracking-tighter leading-none">
              COMMON <span className="text-fv-orange">QUESTIONS</span>
            </h2>
            
            <Accordion type="single" collapsible className="mt-6">
              {qa.map((item, i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left text-white hover:text-fv-orange font-semibold hover:no-underline transition-colors uppercase tracking-wider text-xs md:text-sm py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 leading-relaxed text-xs md:text-sm pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right Column: Enquiry Form Card */}
          <div className="lg:col-span-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-px w-8 bg-fv-orange"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-fv-orange">GET STARTED</span>
            </div>
            <h2 className="font-sans font-black uppercase text-3xl md:text-5xl tracking-tighter leading-none mb-4">
              START YOUR <span className="text-fv-orange">JOURNEY</span>
            </h2>
            
            <div className="rounded-2xl bg-white text-fv-text p-4 md:p-6 shadow-elevated">
              {done ? (
                <div className="text-center py-6">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-fv-success/15 text-fv-success">
                    <Check className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-2xl font-sans font-black uppercase text-fv-navy tracking-tight">
                    Thank you!
                  </h3>
                  <p className="mt-2 text-fv-text/70 text-sm">
                    Our team will contact you within 24 hours. In the meantime, check WhatsApp for a message from us.
                  </p>
                  <Button
                    onClick={() => scrollTo("home")}
                    className="mt-6 bg-fv-navy text-white hover:bg-fv-navy/90 px-6 py-2 text-xs font-black uppercase tracking-wider"
                  >
                    Back to Home
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label htmlFor="lead-name" className="text-fv-navy text-xs font-bold uppercase tracking-wider">Full Name</Label>
                    <Input
                      id="lead-name"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-12 mt-1.5 border-fv-navy/20 focus:border-fv-orange focus:ring-fv-orange/25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-phone" className="text-fv-navy text-xs font-bold uppercase tracking-wider">Phone Number</Label>
                    <Input
                      id="lead-phone"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="h-12 mt-1.5 border-fv-navy/20 focus:border-fv-orange focus:ring-fv-orange/25"
                    />
                  </div>
                  <div>
                    <Label className="text-fv-navy text-xs font-bold uppercase tracking-wider">I'm interested in…</Label>
                    <Select value={interest} onValueChange={setInterest}>
                      <SelectTrigger className="h-12 mt-1.5 border-fv-navy/20">
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
                    className="w-full h-12 bg-fv-orange text-white hover:bg-fv-orange/90 font-black uppercase tracking-wider text-sm transition-all hover:scale-[1.02] shadow"
                  >
                    {busy ? "Sending…" : "Speak to a Coach"}
                  </Button>
                  
                  <p className="text-center text-[10px] text-fv-text/50 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Your data is safe with us.
                  </p>
                  
                  <div className="pt-3 border-t border-fv-navy/10">
                    <p className="text-[10px] font-bold text-fv-navy/60 uppercase tracking-widest mb-2">What happens next?</p>
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
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function Footer() {
  return (
    <footer className="bg-fv-navy text-white/80 py-10 pb-28 md:pb-10 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-8">
        <div className="text-left">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 w-fit border border-white/10">
            <img src={fitvedLogo} alt="Fitved" className="h-8 w-auto" />
          </div>
          <p className="mt-4 text-xs text-white/50 uppercase tracking-wider leading-relaxed">
            Calm strength, every day. <br />
            Society-based clinical fitness in Bangalore.
          </p>
        </div>
        <div className="text-left">
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-3">Contact</h4>
          <ul className="space-y-2 text-xs uppercase tracking-wider font-semibold">
            <li>
              <a href={`tel:${PHONE}`} className="hover:text-fv-orange transition-colors">{PHONE_DISPLAY}</a>
            </li>
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="hover:text-fv-orange transition-colors">
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/fitved.h/"
                target="_blank"
                rel="noopener"
                className="hover:text-fv-orange inline-flex items-center gap-1.5 transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.333-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.333-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038C23.986 15.668 24 15.259 24 12s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <div className="text-left">
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-3">Account</h4>
          <ul className="space-y-2 text-xs uppercase tracking-wider font-semibold">
            <li><Link to="/login" className="hover:text-fv-orange transition-colors">Client / Trainer Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 mt-10 flex flex-col items-center gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Backed by</p>
        <img src={razorpayRizeLogo} alt="Razorpay Rize" className="h-8 md:h-10 w-auto opacity-90" />
      </div>
      <div className="mx-auto max-w-6xl px-4 mt-8 pt-6 border-t border-white/10 text-xs text-white/40 text-left">
        © {new Date().getFullYear()} Fitved. All rights reserved.
      </div>
    </footer>
  );
}

/* ---------- MOBILE BAR / WHATSAPP / FLOATING CTA ---------- */
function MobileBar() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 bg-fv-navy border-t border-white/10 shadow-elevated">
      <a
        href={`tel:${PHONE}`}
        onClick={() => trackEvent("phone_clicked", { from: "mobile_bar" })}
        className="flex flex-col items-center justify-center py-2.5 text-white font-black uppercase tracking-wider text-[10px]"
      >
        <Phone className="h-5 w-5 mb-0.5 text-fv-orange" /> Call
      </a>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener"
        onClick={() => trackEvent("whatsapp_clicked", { from: "mobile_bar" })}
        className="flex flex-col items-center justify-center py-2.5 bg-[#25D366] text-white font-black uppercase tracking-wider text-[10px]"
      >
        <MessageCircle className="h-5 w-5 mb-0.5" /> WhatsApp
      </a>
      <button
        onClick={() => scrollTo("contact")}
        className="flex flex-col items-center justify-center py-2.5 bg-fv-orange text-white font-black uppercase tracking-wider text-[10px]"
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
      className="hidden md:flex fixed bottom-6 right-24 z-40 items-center gap-2 rounded-full bg-fv-orange text-white px-5 h-14 font-black uppercase tracking-wider text-xs shadow-elevated hover:bg-fv-orange/90 transition-all hover:scale-[1.03]"
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
      <DialogContent className="sm:max-w-md bg-fv-navy text-white border border-white/10">
        <DialogHeader>
          <DialogTitle className="font-sans font-black uppercase text-2xl text-fv-orange tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-white/70">{body}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {!nameOptional && (
            <Input
              required
              maxLength={100}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          )}
          <Input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-fv-orange text-white hover:bg-fv-orange/90 font-black uppercase tracking-wider text-xs transition-colors"
          >
            {busy ? "Sending…" : "Send Me Details"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
