import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileHeart } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    if (!filePath) {
      toast.error("No file attached to this report");
      return;
    }
    const { data, error } = await supabase.storage
      .from("health-reports")
      .createSignedUrl(filePath, 60);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const latest = reports[0];
  const past = reports.slice(1);

  return (
    <div className="space-y-6">
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
  );
}
