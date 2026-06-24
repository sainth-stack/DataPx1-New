import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Lightbulb, Clock } from "lucide-react";
import type { ModellingAiInsight } from "@/lib/api/modellingAi";
import { ACTION_LABELS } from "@/lib/api/modellingAi";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-accent/10 text-accent border-accent/30",
};

const TIMELINE_KEYS = ["immediate", "next_5_days", "next_10_days", "next_30_days"] as const;

function IprList({
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        {title}
      </div>
      <ul className="space-y-1 pl-5 list-disc text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PrescriptiveInsightBubble({ insight }: { insight: ModellingAiInsight }) {
  const actionLabel = insight.action ? ACTION_LABELS[insight.action] : null;
  const ipr = insight.ipr;
  const timeline = insight.prescriptive_timeline;

  return (
    <div className="space-y-3">
      {actionLabel && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {actionLabel}
        </Badge>
      )}

      {insight.report_meta?.title && (
        <h4 className="text-sm font-semibold">{insight.report_meta.title}</h4>
      )}

      {insight.summary && (
        <p className="text-sm leading-relaxed">{insight.summary}</p>
      )}

      {ipr && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <IprList title="Inferences" items={ipr.inferences ?? []} icon={Lightbulb} iconClass="text-primary" />
          <IprList title="Problems" items={ipr.problems ?? []} icon={AlertTriangle} iconClass="text-destructive" />
          <IprList title="Recommendations" items={ipr.recommendations ?? []} icon={CheckCircle2} iconClass="text-success" />
        </div>
      )}

      {insight.sections?.map((section, si) => (
        <Card key={section.id ?? section.sectionId ?? si} className="rounded-card border p-3 space-y-2">
          <h4 className="text-xs font-semibold">{section.title}</h4>
          {section.content && <p className="text-xs text-muted-foreground">{section.content}</p>}
          {section.items?.map((item, ii) => (
            <div key={ii} className="rounded-md border bg-card p-2.5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {item.severity && (
                  <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLES[item.severity.toLowerCase()] ?? ""}`}>
                    {item.severity}
                  </Badge>
                )}
                {item.title && <span className="text-xs font-medium">{item.title}</span>}
              </div>
              {item.impact && <p className="text-xs text-muted-foreground">{item.impact}</p>}
              {item.evidence && (
                <p className="text-[10px] text-muted-foreground/80">Evidence: {item.evidence}</p>
              )}
              {item.content && <p className="text-xs text-muted-foreground">{item.content}</p>}
            </div>
          ))}
        </Card>
      ))}

      {timeline && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Prescriptive Timeline
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIMELINE_KEYS.map((key) => {
              const bucket = timeline[key];
              if (!bucket?.actions?.length) return null;
              return (
                <Card key={key} className="rounded-card border p-2.5 space-y-1">
                  <p className="text-[10px] font-semibold text-primary">{bucket.label}</p>
                  <ul className="space-y-0.5 pl-3 list-disc text-[11px] text-muted-foreground">
                    {bucket.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {insight.sources && insight.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {insight.sources.map((src) => (
            <Badge key={src} variant="secondary" className="text-[10px] font-normal">
              {src}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
