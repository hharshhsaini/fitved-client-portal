import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileHeart } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAVY    = "#1E3A5F";
const MUTED   = "#8a8f9e";
const BORDER  = "rgba(30,58,95,0.08)";
const GREEN   = "#2e9e5b";
const GREEN_LIGHT = "#e6f7ed";

export default function Health() {
  const { user } = useAuth();

  const { data: reports = [] } = useQuery({
    queryKey: ["reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("health_reports").select("*").eq("user_id", user!.id)
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
            Health reports
          </h2>
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
          <h1 className="font-display text-3xl text-foreground">Health reports</h1>
          <p className="mt-1 text-muted-foreground">Your monthly wellness check, always within reach.</p>
        </header>

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
