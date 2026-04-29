import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileHeart } from "lucide-react";
import { mockReports, formatDate } from "@/lib/mockData";
import { downloadMockReport } from "@/lib/pdf";
import { toast } from "sonner";

export default function Health() {
  const latest = mockReports[0];
  const past = mockReports.slice(1);

  const handleDownload = (title: string) => {
    downloadMockReport(title);
    toast.success("Report download started");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-foreground">Health reports</h1>
        <p className="mt-1 text-muted-foreground">Your monthly wellness check, always within reach.</p>
      </header>

      <Card className="p-6 md:p-8 rounded-2xl shadow-card bg-gradient-soft border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <FileHeart className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Latest report</p>
              <h2 className="font-display text-2xl">{latest.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Updated {formatDate(latest.date)}</p>
            </div>
          </div>
          <Button onClick={() => handleDownload(latest.title)} className="h-11">
            <Download className="mr-2 h-4 w-4" /> Download Latest Report (PDF)
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl shadow-card">
        <h2 className="font-display text-xl">Previous reports</h2>
        <ul className="mt-4 divide-y divide-border">
          {past.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(r.title)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
