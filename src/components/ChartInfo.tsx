import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ChartInfoProps {
  /** What the X axis represents */
  xAxis?: string;
  /** What the Y axis represents */
  yAxis?: string;
  /** Colour / threshold legend explained in plain English */
  thresholds?: { color: string; label: string }[];
  /** Free-form extra note */
  note?: string;
  /** GPT / heuristic IPR from dashboard APIs */
  ipr?: {
    inferences?: string[];
    problems?: string[];
    recommendations?: string[];
  } | null;
  /** Short title in the tooltip header */
  title?: string;
  className?: string;
}

/**
 * Consistent ℹ️ affordance for every chart / KPI in the app.
 * Renders a muted info icon that, on hover/focus, explains:
 *   - what the X axis is
 *   - what the Y axis / value represents
 *   - what each colour or threshold band means
 */
export function ChartInfo({
  xAxis,
  yAxis,
  thresholds,
  note,
  ipr,
  title = "How to read this chart",
  className,
}: ChartInfoProps) {
  const hasIpr =
    (ipr?.inferences?.length ?? 0) > 0 ||
    (ipr?.problems?.length ?? 0) > 0 ||
    (ipr?.recommendations?.length ?? 0) > 0;

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Chart information"
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors",
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="max-w-xs p-3 space-y-2">
          <p className="text-xs font-semibold">{title}</p>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {xAxis && (
              <p>
                <span className="font-medium text-foreground">X axis:</span> {xAxis}
              </p>
            )}
            {yAxis && (
              <p>
                <span className="font-medium text-foreground">Y axis:</span> {yAxis}
              </p>
            )}
            {note && <p>{note}</p>}
            {hasIpr && (
              <div className="space-y-2 pt-1">
                {(ipr?.inferences?.length ?? 0) > 0 && (
                  <div>
                    <p className="font-medium text-foreground">What we see</p>
                    <ul className="mt-1 space-y-0.5 list-disc pl-4">
                      {ipr!.inferences!.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(ipr?.problems?.length ?? 0) > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Issues to watch</p>
                    <ul className="mt-1 space-y-0.5 list-disc pl-4">
                      {ipr!.problems!.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(ipr?.recommendations?.length ?? 0) > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Recommended actions</p>
                    <ul className="mt-1 space-y-0.5 list-disc pl-4">
                      {ipr!.recommendations!.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          {thresholds && thresholds.length > 0 && (
            <div className="pt-1 border-t border-border/60 space-y-1">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                Legend
              </p>
              {thresholds.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ background: t.color }}
                  />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ChartInfo;