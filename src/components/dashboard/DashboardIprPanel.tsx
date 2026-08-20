import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardIpr } from "@/lib/dashboardIpr";
import { normalizeDashboardIpr } from "@/lib/dashboardIpr";

function IprSection({
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
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
        {title}
      </div>
      <ul className="space-y-1.5 pl-1 text-sm text-muted-foreground leading-relaxed">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-muted-foreground/50 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DashboardIprPanelProps {
  ipr?: DashboardIpr | null;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function DashboardIprPanel({
  ipr,
  title = "What this means for your operation",
  subtitle = "Plain-language insights from your live fleet data",
  compact = false,
}: DashboardIprPanelProps) {
  const normalized = normalizeDashboardIpr(ipr);
  if (!normalized) return null;

  return (
    <Card className={`rounded-card border border-primary/20 bg-primary/5 ${compact ? "p-4" : "p-5"}`}>
      {!compact && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      )}
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "md:grid-cols-3"}`}>
        <IprSection
          title="What we see"
          items={normalized.inferences ?? []}
          icon={Lightbulb}
          iconClass="text-primary"
        />
        <IprSection
          title="Issues to watch"
          items={normalized.problems ?? []}
          icon={AlertTriangle}
          iconClass="text-destructive"
        />
        <IprSection
          title="Recommended actions"
          items={normalized.recommendations ?? []}
          icon={CheckCircle2}
          iconClass="text-success"
        />
      </div>
    </Card>
  );
}
