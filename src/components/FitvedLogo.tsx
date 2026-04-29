import { cn } from "@/lib/utils";
import logo from "@/assets/fitved-logo.png";

interface FitvedLogoProps {
  className?: string;
  showWord?: boolean;
  showTagline?: boolean;
}

export function FitvedLogo({ className, showWord = true, showTagline = false }: FitvedLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Fitved — fitness for grownups"
        className={cn("object-contain rounded-md", showWord ? "h-10" : "h-9 w-9")}
      />
      {showTagline && (
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-accent-foreground/80">
          Fitness for grownups
        </span>
      )}
    </div>
  );
}
