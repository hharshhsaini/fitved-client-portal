import React from "react";
import { ContentBlock } from "@/lib/blog/types";
import { AlertCircle, CheckCircle2, HelpCircle, Info, Lightbulb, ShieldAlert, Sparkles, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Stable anchor id for a heading, shared by the Table of Contents. */
export function headingSlug(title?: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ContentRendererProps {
  content?: {
    blocks: ContentBlock[];
    keyTakeaways?: string[];
    medicalDisclaimer?: boolean;
    coachReviewBadge?: string;
  };
  blocks?: ContentBlock[];
  keyTakeaways?: string[];
  medicalDisclaimer?: boolean;
  coachReviewBadge?: string;
}

export function ContentRenderer(props: ContentRendererProps) {
  const blocks = props.content?.blocks ?? props.blocks ?? [];
  const keyTakeaways = props.content?.keyTakeaways ?? props.keyTakeaways;
  const medicalDisclaimer = props.content?.medicalDisclaimer ?? props.medicalDisclaimer;
  const coachReviewBadge = props.content?.coachReviewBadge ?? props.coachReviewBadge;
  return (
    <div className="space-y-8 text-foreground font-sans leading-relaxed">
      {/* Coach Review Badge */}
      {coachReviewBadge && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{coachReviewBadge}</span>
        </div>
      )}

      {/* Key Takeaways Box */}
      {keyTakeaways && keyTakeaways.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-fv-orange font-bold text-sm uppercase tracking-wider">
            <Sparkles className="h-4 w-4" /> Key Takeaways
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
            {keyTakeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0 mt-2" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Article Blocks */}
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const headingId = headingSlug(block.title);
            if (block.level === 3) {
              return (
                <h3 key={index} id={headingId} className="scroll-mt-24 text-xl font-bold text-foreground mt-8 mb-3">
                  {block.title}
                </h3>
              );
            }
            return (
              <h2 key={index} id={headingId} className="scroll-mt-24 text-2xl sm:text-3xl font-extrabold text-foreground mt-10 mb-4 border-b border-border pb-2">
                {block.title}
              </h2>
            );
          }

          case "paragraph": {
            return (
              <p key={index} className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {block.content}
              </p>
            );
          }

          case "callout": {
            return (
              <div key={index} className="p-4 sm:p-5 rounded-xl bg-blue-500/10 border-l-4 border-blue-500 text-foreground space-y-1 my-6">
                {block.title && (
                  <div className="font-bold text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Info className="h-4 w-4" /> {block.title}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">{block.content}</p>
              </div>
            );
          }

          case "tip": {
            return (
              <div key={index} className="p-4 sm:p-5 rounded-xl bg-orange-500/10 border-l-4 border-orange-500 text-foreground space-y-1 my-6">
                {block.title && (
                  <div className="font-bold text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Lightbulb className="h-4 w-4" /> {block.title}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">{block.content}</p>
              </div>
            );
          }

          case "warning": {
            return (
              <div key={index} className="p-4 sm:p-5 rounded-xl bg-red-500/10 border-l-4 border-red-500 text-foreground space-y-1 my-6">
                {block.title && (
                  <div className="font-bold text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" /> {block.title}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">{block.content}</p>
              </div>
            );
          }

          case "nutrition_table":
          case "workout_table": {
            if (!block.tableData || block.tableData.length === 0) return null;
            const headers = Object.keys(block.tableData[0]);
            return (
              <div key={index} className="my-6 space-y-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {block.title && (
                  <div className="p-3 bg-muted font-semibold text-xs sm:text-sm text-foreground border-b border-border">
                    {block.title}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[11px] font-bold">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="p-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {block.tableData.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          {headers.map((h) => (
                            <td key={h} className="p-3 font-medium text-foreground">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          case "quote": {
            return (
              <blockquote key={index} className="my-6 p-4 border-l-4 border-primary bg-muted/40 rounded-r-xl italic text-foreground font-medium text-sm sm:text-base">
                "{block.content}"
              </blockquote>
            );
          }

          case "youtube": {
            return (
              <div key={index} className="my-6 rounded-2xl overflow-hidden border border-border bg-slate-900 aspect-video shadow-md flex items-center justify-center text-white">
                <div className="text-center space-y-2">
                  <Youtube className="h-12 w-12 text-red-500 mx-auto" />
                  <p className="text-xs font-semibold">Video Tutorial: {block.title || "Watch Guide"}</p>
                </div>
              </div>
            );
          }

          default:
            return null;
        }
      })}

      {/* Medical Disclaimer */}
      {medicalDisclaimer && (
        <div className="mt-12 p-4 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-orange-500" /> Medical Disclaimer
          </div>
          <p>
            The content provided in this article is for informational and educational purposes only and should not be used as medical advice. Always consult a qualified physician or registered dietitian before starting any new diet or exercise regimen.
          </p>
        </div>
      )}
    </div>
  );
}
