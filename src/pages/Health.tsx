import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileHeart, Lightbulb, ClipboardList, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAVY    = "#1E3A5F";
const MUTED   = "#8a8f9e";
const BORDER  = "rgba(30,58,95,0.08)";
const GREEN   = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";
const GOLD       = "#f0a720";
const GOLD_LIGHT = "#fef3d0";
const GOLD_DEEP  = "#b07d10";

// Diet behaviour questionnaire (Google Form)
const DIET_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSehQwl6IAFkeWIRfFux5CzR3vgvAH6mozius4IHcaMv6TQcZQ/viewform";

// Rotating daily wellness tips — same tip for everyone on a given day,
// changes automatically the next day. Admin-managed tips (daily_tips table)
// take priority; these are the built-in fallback when none are set up.
const DAILY_TIPS = [
  "Start your day with a glass of warm water — it kickstarts digestion and hydration.",
  "Aim for a fistful of protein at every meal to stay full and protect muscle.",
  "Take a 10-minute walk after lunch to steady your blood sugar.",
  "Fill half your plate with vegetables before adding anything else.",
  "Chew slowly — it takes ~20 minutes for your brain to register fullness.",
  "Swap one sugary drink today for water, buttermilk, or unsweetened tea.",
  "Stand up and stretch for 2 minutes every hour you sit.",
  "Eat your last meal 2–3 hours before bed for better sleep and digestion.",
  "Add a source of fibre — dal, oats, fruit, or salad — to keep you regular.",
  "Get 10 minutes of morning sunlight to support your sleep rhythm.",
  "Prep tomorrow's snacks tonight so you're not caught hungry and unprepared.",
  "Breathe deeply for 5 slow breaths before eating — it lowers stress-eating.",
  "Include a handful of nuts or seeds for healthy fats and steady energy.",
  "Track your water: aim for 6–8 glasses spread through the day.",
  "Choose whole fruit over juice — you keep the fibre and skip the sugar spike.",
  "Do 10 bodyweight squats while your tea or coffee brews.",
  "Season with herbs and spices instead of extra salt or sugar.",
  "Aim for 7–8 hours of sleep — recovery is where progress happens.",
  "Eat mindfully: no screens for one meal today, just your food.",
  "Add curd or a probiotic food to support gut health.",
];

export default function Health() {
  const { user } = useAuth();

  // Query to get the Gemini API Key from the daily_tips table
  const { data: geminiApiKey = "" } = useQuery({
    queryKey: ["daily-tip-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_tips")
        .select("text");
      if (error) return "";
      const row = (data ?? []).find((t) => t.text.startsWith("gemini_api_key:"));
      return row ? row.text.replace("gemini_api_key:", "") : "";
    },
  });

  // Query to get the daily wellness tip (either cached, generated from Gemini, or fallback)
  const { data: tip = "" } = useQuery({
    queryKey: ["daily-wellness-tip", geminiApiKey],
    queryFn: async () => {
      const now = Date.now();
      const cachedTip = localStorage.getItem("fitved_daily_tip");
      const cachedTime = localStorage.getItem("fitved_daily_tip_time");

      // Check if the cached tip is less than 24 hours old
      if (cachedTip && cachedTime) {
        const diff = now - parseInt(cachedTime, 10);
        if (diff < 24 * 60 * 60 * 1000) {
          return cachedTip;
        }
      }

      // If we have an API key, try to generate a new tip via Gemini
      if (geminiApiKey) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: "Generate a single, short, actionable health, fitness, or wellness tip for a client. Keep it under 20 words, inspiring, and direct. Do not include quotes, headers, bullets, or any markdown formatting. Just output the clean tip."
                  }]
                }]
              })
            }
          );
          if (!response.ok) throw new Error("Gemini API call failed");
          const resData = await response.json();
          const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            // Clean up any enclosing quotes
            const cleanTip = generatedText.replace(/^["']|["']$/g, "").trim();
            localStorage.setItem("fitved_daily_tip", cleanTip);
            localStorage.setItem("fitved_daily_tip_time", now.toString());
            return cleanTip;
          }
        } catch (err) {
          console.warn("Failed to generate tip from Gemini, using fallback:", err);
        }
      }

      // Fallback: pick a rotating tip from the daily list
      const dayIndex = Math.floor(now / 86_400_000);
      const fallbackTip = DAILY_TIPS[dayIndex % DAILY_TIPS.length];
      localStorage.setItem("fitved_daily_tip", fallbackTip);
      localStorage.setItem("fitved_daily_tip_time", now.toString());
      return fallbackTip;
    },
    staleTime: Infinity,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_reports").select("*").eq("client_id", user!.id)
        .order("report_date", { ascending: false });
      return data ?? [];
    },
  });

  const handleDownload = async (filePath: string | null) => {
    if (!filePath) { toast.error("No file attached to this report"); return; }
    const { data, error } = await supabase.storage
      .from("health-reports").createSignedUrl(filePath, 60);
    if (error || !data) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const latest = reports[0];
  const past   = reports.slice(1);

  return (
    <>
      {/* ── Mobile Layout ──────────────────────────────────────────── */}
      <div className="md:hidden" style={{ background: "#f4f2ee", minHeight: "100%" }}>

        {/* Page header */}
        <div style={{ padding: "8px 20px 16px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>From your trainer</p>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: NAVY }}>
            Health &amp; wellness
          </h2>
        </div>

        {/* Daily tip */}
        <div className="mx-4 mb-3.5 rounded-[22px] p-5"
          style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD}` }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb size={16} color={GOLD_DEEP} />
            <p className="font-semibold uppercase" style={{ fontSize: 11, color: GOLD_DEEP, letterSpacing: "0.08em" }}>
              Tip of the day
            </p>
          </div>
          <p style={{ fontSize: 14, color: NAVY, lineHeight: 1.5 }}>{tip}</p>
        </div>

        {/* Diet behaviour questionnaire */}
        <a href={DIET_FORM_URL} target="_blank" rel="noopener noreferrer"
          className="mx-4 mb-4 rounded-[22px] p-5 flex items-center gap-3.5 cursor-pointer"
          style={{ background: "#fff", border: `1px solid ${BORDER}`, textDecoration: "none", boxShadow: "0 2px 12px rgba(30,58,95,0.05)" }}>
          <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
            style={{ width: 44, height: 44, background: GREEN_LIGHT }}>
            <ClipboardList size={20} color={GREEN} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold" style={{ fontSize: 15, color: NAVY }}>Diet behaviour questionnaire</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>
              A few quick questions to help your trainer personalise your nutrition.
            </p>
          </div>
          <ArrowRight size={18} color={GOLD} className="flex-shrink-0" />
        </a>

        {/* Reports sub-heading */}
        <div style={{ padding: "0 20px 12px" }}>
          <p className="font-semibold uppercase" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
            Your reports
          </p>
        </div>

        {latest ? (
          <div className="mx-4 mb-3.5 rounded-[22px] p-5"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 4px 16px rgba(30,58,95,0.08)" }}>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                style={{ width: 48, height: 48, background: "#eef2ff" }}>
                <FileHeart size={22} color="#5b6cf8" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ fontSize: 16, color: NAVY }}>{latest.title}</p>
                <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{formatDate(latest.report_date)}</p>
              </div>
              <span className="rounded-full font-bold flex-shrink-0"
                style={{ fontSize: 11, color: GREEN, background: GREEN_LIGHT, padding: "3px 10px" }}>
                New
              </span>
            </div>
            <button
              onClick={() => handleDownload(latest.file_path)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-none cursor-pointer"
              style={{ background: NAVY, padding: "13px", fontSize: 14, fontWeight: 700, color: "#fff" }}
            >
              <Download size={16} color="#fff" /> Download PDF
            </button>
          </div>
        ) : (
          <div className="mx-4 mb-3.5 rounded-[20px] p-8 text-center"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <p style={{ color: MUTED, fontSize: 14 }}>Your trainer will share your first report soon.</p>
          </div>
        )}

        {/* Previous reports */}
        {past.length > 0 && (
          <div className="mx-4 mb-4">
            <p className="font-semibold uppercase mb-3 px-1" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
              Previous reports
            </p>
            {past.map((r) => (
              <div key={r.id} className="flex items-center justify-between mb-2.5 rounded-[18px]"
                style={{ background: "#fff", padding: "14px 18px", border: `1px solid ${BORDER}` }}>
                <div>
                  <p className="font-semibold" style={{ fontSize: 14, color: NAVY }}>{r.title}</p>
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{formatDate(r.report_date)}</p>
                </div>
                <button
                  onClick={() => handleDownload(r.file_path)}
                  className="flex items-center justify-center rounded-xl border-none cursor-pointer"
                  style={{ width: 32, height: 32, background: "#f4f2ee" }}
                >
                  <Download size={14} color={MUTED} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop Layout (original) ──────────────────────────────── */}
      <div className="hidden md:block space-y-6">
        <header>
          <h1 className="font-display text-3xl text-foreground">Health &amp; wellness</h1>
          <p className="mt-1 text-muted-foreground">Your monthly wellness check, always within reach.</p>
        </header>

        {/* Daily tip + questionnaire */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-6 rounded-2xl shadow-card" style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5" style={{ color: GOLD_DEEP }} />
              <p className="font-semibold uppercase text-xs tracking-wider" style={{ color: GOLD_DEEP }}>Tip of the day</p>
            </div>
            <p className="text-base" style={{ color: NAVY, lineHeight: 1.5 }}>{tip}</p>
          </Card>

          <a href={DIET_FORM_URL} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="p-6 rounded-2xl shadow-card hover:shadow-elevated transition-shadow h-full flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: GREEN_LIGHT }}>
                <ClipboardList className="h-6 w-6" style={{ color: GREEN }} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg" style={{ color: NAVY }}>Diet behaviour questionnaire</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  A few quick questions to help your trainer personalise your nutrition.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
            </Card>
          </a>
        </div>

        {latest ? (
          <Card className="p-6 md:p-8 rounded-2xl shadow-card bg-gradient-soft border-primary/15">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                  <FileHeart className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Latest report</p>
                  <h2 className="font-display text-2xl">{latest.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Updated {formatDate(latest.report_date)}</p>
                </div>
              </div>
              <Button onClick={() => handleDownload(latest.file_path)} className="h-11">
                <Download className="mr-2 h-4 w-4" /> Download Latest Report (PDF)
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 rounded-2xl shadow-card text-center">
            <p className="text-muted-foreground">No reports yet — your trainer will share your first one soon.</p>
          </Card>
        )}

        {past.length > 0 && (
          <Card className="p-6 rounded-2xl shadow-card">
            <h2 className="font-display text-xl">Previous reports</h2>
            <ul className="mt-4 divide-y divide-border">
              {past.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.report_date)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(r.file_path)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
