import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function FitvedLogo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-soft">
        <Leaf className="h-5 w-5" strokeWidth={2.2} />
      </span>
      {showWord && (
        <span className="font-display text-2xl tracking-tight text-foreground">
          Fitved
        </span>
      )}
    </div>
  );
}
