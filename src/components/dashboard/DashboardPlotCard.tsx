import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartInfo } from "@/components/ChartInfo";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPlot } from "@/lib/dashboardIpr";
import {
  normalizeDashboardIpr,
  plotChartPoints,
  plotColorToken,
  plotHasData,
  plotSummaryNote,
} from "@/lib/dashboardIpr";

interface DashboardPlotCardProps {
  plot: DashboardPlot;
  targetBadge?: boolean;
}

export function DashboardPlotCard({ plot, targetBadge = false }: DashboardPlotCardProps) {
  const points = plotChartPoints(plot);
  const hasData = plotHasData(plot);
  const ipr = normalizeDashboardIpr(plot.ipr);
  const unit = plot.unit?.trim();

  const chart = (() => {
    if (!hasData) {
      return (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
          No recent readings in the last 24 hours. Insights below are still based on fleet status and faults.
        </div>
      );
    }

    if (plot.type === "area") {
      return (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (plot.type === "line") {
      return (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={plot.plot_id === "oee_by_machine" ? [0, 100] : undefined} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {points.map((point, index) => (
                <Cell
                  key={`${point.label}-${index}`}
                  fill={
                    plot.plot_id === "oee_by_machine"
                      ? plotColorToken(plot.colors?.[index] ?? (point.value >= (plot.target ?? 80) ? "green" : point.value >= 60 ? "yellow" : "red"))
                      : plotColorToken(plot.colors?.[index])
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  })();

  return (
    <Card className="rounded-card p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold">{plot.title ?? "Chart"}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {targetBadge && plot.target != null && (
            <Badge variant="outline" className="text-[10px]">Target: {plot.target}%</Badge>
          )}
          <ChartInfo
            title="What this chart tells you"
            xAxis={plot.type === "bar" && plot.plot_id === "oee_by_machine" ? "Each machine in the fleet" : "Time over the last 24 hours"}
            yAxis={plot.type === "bar" && plot.plot_id === "oee_by_machine" ? "Overall Equipment Effectiveness (%)" : `${plot.title ?? "Reading"}${unit ? ` (${unit})` : ""}`}
            note={plotSummaryNote(plot)}
            ipr={ipr}
          />
        </div>
      </div>
      {chart}
    </Card>
  );
}
