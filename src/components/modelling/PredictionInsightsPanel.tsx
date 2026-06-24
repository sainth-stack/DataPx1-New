import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Clock,
  TrendingUp,
  Target,
  Wrench,
} from "lucide-react";

export interface PredictionInsightsData {
  predicted_output_level?: string;
  output_level_ranges?: Record<string, { min?: number; max?: number } | null> | null;
  input_analysis?: string | string[];
  prediction_interpretation?: string | string[];
  business_insights?: string | string[];
  recommended_actions?: string | string[];
  prescriptive_timeline?: Record<string, string | { label?: string; actions?: string[] }>;
}

const LEVEL_ORDER = ["Low", "Medium", "High", "Critical"] as const;

const LEVEL_STYLES: Record<string, string> = {
  low: "bg-accent/15 text-accent border-accent/40",
  medium: "bg-warning/15 text-warning border-warning/40",
  high: "bg-destructive/15 text-destructive border-destructive/40",
  critical: "bg-destructive/20 text-destructive border-destructive/50",
};

const TIMELINE_META: Record<
  string,
  { label: string; border: string; icon: typeof Clock }
> = {
  immediate: { label: "Immediate (0–5 days)", border: "border-l-destructive bg-destructive/5", icon: AlertTriangle },
  next_5_days: { label: "5–10 days", border: "border-l-warning bg-warning/5", icon: Clock },
  next_10_days: { label: "10–30 days", border: "border-l-accent bg-accent/5", icon: TrendingUp },
  next_30_days: { label: "30+ days", border: "border-l-success bg-success/5", icon: CheckCircle2 },
};

function toLines(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String).filter((s) => s.trim());
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const byNumber = trimmed.split(/\n(?=\d+\.\s)/).map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    if (byNumber.length > 1) return byNumber;
    const byNewline = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;
    return [trimmed];
  }
  return [];
}

export function parsePredictionInsights(raw: unknown): PredictionInsightsData | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as PredictionInsightsData;
}

function InsightBlock({
  title,
  items,
  icon: Icon,
  iconClass,
}: {
  title: string;
  items: string[];
  icon: typeof Lightbulb;
  iconClass: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
        {title}
      </div>
      <ul className="space-y-1.5 pl-5 list-disc text-xs text-muted-foreground leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function OutputLevelRanges({
  ranges,
  predictedLevel,
}: {
  ranges: PredictionInsightsData["output_level_ranges"];
  predictedLevel?: string;
}) {
  if (!ranges || typeof ranges !== "object") return null;
  const entries = LEVEL_ORDER.filter((k) => ranges[k] != null);
  if (!entries.length) return null;
  const predicted = predictedLevel?.toLowerCase();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Output level ranges</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {entries.map((level) => {
          const band = ranges[level];
          const isActive = predicted === level.toLowerCase();
          return (
            <div
              key={level}
              className={cn(
                "rounded-md border px-2.5 py-2 text-center transition-colors",
                isActive ? LEVEL_STYLES[level.toLowerCase()] ?? "bg-primary/10 border-primary/40" : "bg-muted/30 border-border",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide">{level}</p>
              {band && typeof band === "object" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {band.min != null && band.max != null ? `${band.min} – ${band.max}` : "—"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrescriptiveTimeline({ timeline }: { timeline: PredictionInsightsData["prescriptive_timeline"] }) {
  if (!timeline || typeof timeline !== "object") return null;
  const keys = ["immediate", "next_5_days", "next_10_days", "next_30_days"].filter((k) => timeline[k]);
  if (!keys.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Clock className="h-3.5 w-3.5 text-primary" />
        Prescriptive action timeline
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {keys.map((key) => {
          const raw = timeline[key];
          const meta = TIMELINE_META[key] ?? TIMELINE_META.immediate;
          const Icon = meta.icon;
          let text = "";
          if (typeof raw === "string") text = raw;
          else if (raw && typeof raw === "object") {
            const actions = raw.actions?.length ? raw.actions.join(" ") : "";
            text = actions || raw.label || "";
          }
          if (!text.trim()) return null;
          return (
            <Card key={key} className={cn("rounded-card border-l-4 p-3 space-y-1.5", meta.border)}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <p className="text-[10px] font-semibold">{meta.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function PredictionInsightsPanel({
  insights,
  resultLine,
  targetColumn,
}: {
  insights: PredictionInsightsData;
  resultLine?: string;
  targetColumn?: string;
}) {
  const level = insights.predicted_output_level;
  const levelStyle = level ? LEVEL_STYLES[level.toLowerCase()] : undefined;

  const inputLines = toLines(insights.input_analysis);
  const interpretationLines = toLines(insights.prediction_interpretation);
  const businessLines = toLines(insights.business_insights);
  const actionLines = toLines(insights.recommended_actions);

  const hasStructured =
    level ||
    inputLines.length ||
    interpretationLines.length ||
    businessLines.length ||
    actionLines.length ||
    insights.prescriptive_timeline;

  if (!hasStructured && !resultLine) return null;

  return (
    <div className="space-y-4">
      {(resultLine || level) && (
        <div className="space-y-2">
          {resultLine && (
            <p className="text-sm font-medium text-foreground leading-snug">{resultLine}</p>
          )}
          {level && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Predicted level</span>
              <Badge variant="outline" className={cn("text-xs font-semibold", levelStyle)}>
                {level}
              </Badge>
              {targetColumn && (
                <span className="text-[10px] text-muted-foreground">
                  for {targetColumn.replace(/_/g, " ")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <OutputLevelRanges ranges={insights.output_level_ranges} predictedLevel={level} />

      <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
        <InsightBlock title="Input analysis" items={inputLines} icon={Target} iconClass="text-primary" />
        <InsightBlock
          title="Prediction interpretation"
          items={interpretationLines}
          icon={TrendingUp}
          iconClass="text-warning"
        />
        <InsightBlock title="Business insights" items={businessLines} icon={Lightbulb} iconClass="text-accent" />
        <InsightBlock title="Recommended actions" items={actionLines} icon={Wrench} iconClass="text-success" />
      </div>

      <PrescriptiveTimeline timeline={insights.prescriptive_timeline} />
    </div>
  );
}
