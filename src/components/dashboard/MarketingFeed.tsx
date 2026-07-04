import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { marketingMediaUrl } from "@/pages/admin/Marketing";

const NAVY   = "#1E3A5F";
const MUTED  = "#8a8f9e";
const BORDER = "rgba(30,58,95,0.08)";
const GOLD_DEEP = "#b07d10";

interface Post {
  id: string;
  caption: string | null;
  media_path: string;
  media_type: string;
  cta_label: string | null;
  cta_url: string | null;
}

/** Instagram-style promo cards, shown on customer and trainer dashboards. */
export function MarketingFeed({ className = "" }: { className?: string }) {
  const { data: posts = [] } = useQuery({
    queryKey: ["marketing-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketing_posts")
        .select("id, caption, media_path, media_type, cta_label, cta_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as Post[];
    },
  });

  if (posts.length === 0) return null;

  return (
    <div className={className}>
      <p className="font-semibold uppercase mb-3 px-1" style={{ fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>
        What's new at FitVed
      </p>
      <div className="flex flex-col gap-4">
        {posts.map((p) => (
          <div key={p.id} className="rounded-[20px] overflow-hidden"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(30,58,95,0.06)" }}>
            {p.media_type === "video" ? (
              <video src={marketingMediaUrl(p.media_path)} controls playsInline
                className="w-full object-cover" style={{ aspectRatio: "1 / 1", background: "#000" }} />
            ) : (
              <img src={marketingMediaUrl(p.media_path)} alt={p.caption ?? "FitVed"} loading="lazy"
                className="w-full object-cover" style={{ aspectRatio: "1 / 1" }} />
            )}
            {(p.caption || (p.cta_label && p.cta_url)) && (
              <div className="p-4">
                {p.caption && (
                  <p className="whitespace-pre-wrap" style={{ fontSize: 14, color: NAVY, lineHeight: 1.5 }}>
                    {p.caption}
                  </p>
                )}
                {p.cta_label && p.cta_url && (
                  <a href={p.cta_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-2xl font-bold"
                    style={{ background: "rgba(240,167,32,0.16)", color: GOLD_DEEP, fontSize: 14, padding: "11px", textDecoration: "none" }}>
                    {p.cta_label} <ExternalLink size={15} />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
