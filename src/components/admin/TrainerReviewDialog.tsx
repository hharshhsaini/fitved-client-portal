import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Clock, Users, Link2, MapPin, FileText, Award, ExternalLink,
  BadgeCheck, Trash2, Loader2, Mail, Phone,
} from "lucide-react";

const BUCKET = "trainer-assets";
const NAVY = "#1E3A5F";

function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

type PendingTrainer = { id: string; name: string; contact: string | null; email: string | null };

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground break-words">{value}</div>
    </div>
  );
}

export default function TrainerReviewDialog({
  trainer, onOpenChange, onApprove, onReject, approving,
}: {
  trainer: PendingTrainer | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
}) {
  const sb = supabase as any;
  const open = !!trainer;

  const details = useQuery({
    queryKey: ["review-trainer-details", trainer?.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await sb
        .from("trainers")
        .select("education, years_experience, clients_trained, social_link, service_areas, bio, cv_path, photo_path")
        .eq("id", trainer!.id)
        .maybeSingle();
      if (error) return { __notReady: true } as const;
      return data as any;
    },
  });

  const certs = useQuery({
    queryKey: ["review-trainer-certs", trainer?.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb
        .from("trainer_certificates").select("id, file_path, file_name")
        .eq("trainer_id", trainer!.id).order("created_at", { ascending: true });
      return (data ?? []) as { id: string; file_path: string; file_name: string | null }[];
    },
  });

  const d = details.data as any;
  const notReady = d?.__notReady === true;
  const areas: string[] = Array.isArray(d?.service_areas) ? d.service_areas : [];
  const photo = publicUrl(d?.photo_path);
  const cv = publicUrl(d?.cv_path);
  const certList = certs.data ?? [];

  const hasProfile = !notReady && !!d && (
    d.education || d.years_experience != null || d.clients_trained != null ||
    d.social_link || areas.length > 0 || d.bio || d.cv_path || certList.length > 0
  );

  const initials = (trainer?.name || "T").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review trainer</DialogTitle>
          <DialogDescription>Check the details before approving or rejecting.</DialogDescription>
        </DialogHeader>

        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden grid place-items-center shrink-0 text-white text-lg font-bold"
            style={{ background: photo ? "transparent" : NAVY }}>
            {photo ? <img src={photo} alt={trainer?.name} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg text-foreground truncate">{trainer?.name}</p>
            <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{trainer?.email ?? "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{trainer?.contact ?? "not provided"}</span>
            </div>
          </div>
        </div>

        {details.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
          </div>
        ) : !hasProfile ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            This trainer hasn't completed their profile yet. You can still approve, but consider asking them to fill it in first.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <Stat icon={GraduationCap} label="Education" value={d.education || "—"} />
              <Stat icon={Link2} label="Social" value={
                d.social_link ? (
                  <a href={d.social_link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:underline" style={{ color: NAVY }}>
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                ) : "—"
              } />
              <Stat icon={Clock} label="Experience" value={d.years_experience != null ? `${d.years_experience} yrs` : "—"} />
              <Stat icon={Users} label="Clients trained" value={d.clients_trained != null ? d.clients_trained : "—"} />
            </div>

            {/* Areas */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5" /> Areas they can serve
              </p>
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "rgba(30,58,95,0.08)", color: NAVY }}>
                      <MapPin className="h-3 w-3" /> {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bio */}
            {d.bio && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bio</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{d.bio}</p>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Documents</p>
              <div className="space-y-1.5">
                {cv && (
                  <a href={cv} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:underline">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" /> CV
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                )}
                {certList.map((c) => (
                  <a key={c.id} href={publicUrl(c.file_path) ?? "#"} target="_blank" rel="noopener"
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:underline">
                    <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{c.file_name || "Certificate"}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  </a>
                ))}
                {!cv && certList.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="text-destructive hover:text-destructive"
            onClick={() => { if (trainer && confirm(`Reject and delete ${trainer.name}'s request?`)) onReject(trainer.id); }}>
            <Trash2 className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button disabled={approving} onClick={() => trainer && onApprove(trainer.id)}>
            {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
