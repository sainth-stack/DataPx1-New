import { Card } from "@/components/ui/card";
import { ChartInfo } from "@/components/ChartInfo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardHeatmapCell, DashboardHeatmapPlot, DashboardIpr } from "@/lib/dashboardIpr";
import { normalizeDashboardIpr, sanitizeIprText } from "@/lib/dashboardIpr";
import { friendlyColumnName } from "@/lib/friendlyLabels";
import { cn } from "@/lib/utils";

function heatmapCellStyle(value: number, min: number, max: number): React.CSSProperties {
  const clamped = Math.max(min, Math.min(max, value));
  if (clamped >= 0) {
    const t = max > 0 ? clamped / max : 0;
    return { backgroundColor: `hsl(var(--success) / ${0.12 + t * 0.78})` };
  }
  const t = min < 0 ? Math.abs(clamped / min) : 0;
  return { backgroundColor: `hsl(var(--destructive) / ${0.12 + t * 0.78})` };
}

type CellMeta = { description?: string; description_source?: string };

function cellLookupKey(row: string, col: string): string {
  return `${row}|${col}`;
}

function buildCellMetaMap(
  cells: DashboardHeatmapCell[] | undefined,
  labelKind: "sensor" | "machine",
): Map<string, CellMeta> {
  const map = new Map<string, CellMeta>();
  if (!cells?.length) return map;
  const rowKey = labelKind === "machine" ? "machine_a" : "sensor_a";
  const colKey = labelKind === "machine" ? "machine_b" : "sensor_b";
  for (const cell of cells) {
    const row = cell[rowKey];
    const col = cell[colKey];
    if (row == null || col == null) continue;
    map.set(cellLookupKey(String(row), String(col)), {
      description: cell.description,
      description_source: cell.description_source,
    });
  }
  return map;
}

function defaultCorrelationDescription(
  value: number,
  rowText: string,
  colText: string,
): string {
  if (rowText === colText) {
    return "Same metric — perfect positive correlation (r = 1.00).";
  }
  const abs = Math.abs(value);
  const strength =
    abs >= 0.7 ? "strong" : abs >= 0.4 ? "moderate" : abs >= 0.2 ? "weak" : "very weak";
  if (abs < 0.05) {
    return `Pearson r = ${value.toFixed(2)} indicates no meaningful linear relationship between ${rowText} and ${colText}.`;
  }
  if (value > 0) {
    return `Pearson r = ${value.toFixed(2)} indicates a ${strength} positive link — when ${rowText} rises, ${colText} tends to rise as well.`;
  }
  return `Pearson r = ${value.toFixed(2)} indicates a ${strength} inverse link — when ${rowText} rises, ${colText} tends to fall.`;
}

function resolveCellDescription(
  meta: CellMeta | undefined,
  value: number,
  rowText: string,
  colText: string,
): string {
  const fromApi = meta?.description?.trim();
  if (fromApi) return sanitizeIprText(fromApi);
  return defaultCorrelationDescription(value, rowText, colText);
}

function CorrelationColorLegend({ min, max }: { min: number; max: number }) {
  const sampleValues = [min, min * 0.5, 0, max * 0.5, max];
  return (
    <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
      <p className="text-[10px] font-medium text-muted-foreground">What the colors mean</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-6 shrink-0">{min.toFixed(1)}</span>
        <div className="flex flex-1 h-3 rounded-sm overflow-hidden border border-border/40">
          {sampleValues.map((v, i) => (
            <div
              key={i}
              className="flex-1"
              style={heatmapCellStyle(v, min, max)}
              title={`r = ${v.toFixed(1)}`}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground w-6 shrink-0 text-right">{max.toFixed(1)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-border/30"
            style={heatmapCellStyle(-0.85, min, max)}
          />
          Strong inverse (red)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-border/30"
            style={heatmapCellStyle(0, min, max)}
          />
          No / weak link (~0)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-border/30"
            style={heatmapCellStyle(0.85, min, max)}
          />
          Strong positive (green)
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Darker shades mean a stronger relationship; lighter shades mean weaker correlation. Values are Pearson r from{" "}
        {min.toFixed(1)} to {max.toFixed(1)}.
      </p>
    </div>
  );
}

function formatAxisLabel(
  label: string,
  labelKind: "sensor" | "machine",
  displayByMachineId?: Record<string, string>,
): string {
  const mapped = displayByMachineId?.[label];
  if (mapped) return mapped;
  if (labelKind === "machine" && label.includes("__")) {
    return label.split("__").pop() ?? label;
  }
  return friendlyColumnName(label);
}

interface CorrelationHeatmapCardProps {
  plot: DashboardHeatmapPlot;
  labelKind?: "sensor" | "machine";
  displayByMachineId?: Record<string, string>;
  subtitle?: string;
}

export function CorrelationHeatmapCard({
  plot,
  labelKind = "sensor",
  displayByMachineId,
  subtitle,
}: CorrelationHeatmapCardProps) {
  const xLabels = plot.x_labels ?? [];
  const yLabels = plot.y_labels ?? xLabels;
  const matrix = plot.values ?? [];
  const min = plot.color_scale?.min ?? -1;
  const max = plot.color_scale?.max ?? 1;
  const ipr = normalizeDashboardIpr(plot.ipr);
  const cellMeta = buildCellMetaMap(plot.cells, labelKind);

  if (!xLabels.length || !matrix.length) {
    return (
      <Card className="rounded-card p-5">
        <p className="text-sm text-muted-foreground text-center py-8">No correlation data available.</p>
      </Card>
    );
  }

  const colMinWidth = labelKind === "machine" ? 88 : 44;
  const rowHeaderWidth = labelKind === "machine" ? 132 : 156;
  const headerHeight = labelKind === "machine" ? 120 : 140;

  return (
    <Card className="rounded-card p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold">{plot.title ?? "Correlation matrix"}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <ChartInfo
          title="How to read this heatmap"
          xAxis={labelKind === "machine" ? "Each machine in the fleet" : "Sensor / metric"}
          yAxis={labelKind === "machine" ? "Each machine in the fleet" : "Sensor / metric"}
          note="Pearson correlation from −1 (inverse) to +1 (strong positive). Darker green = stronger positive link; darker red = stronger inverse link."
          ipr={ipr}
          thresholds={[
            { color: "hsl(var(--success))", label: "Positive correlation (metrics rise together)" },
            { color: "hsl(var(--destructive))", label: "Negative correlation (one rises as the other falls)" },
          ]}
        />
      </div>

      <div className="overflow-x-auto pb-1">
        <TooltipProvider delayDuration={80}>
          <table
            className="border-collapse text-[10px]"
            style={{ minWidth: rowHeaderWidth + xLabels.length * colMinWidth }}
          >
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-20 bg-card border-b border-border"
                  style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth }}
                />
                {xLabels.map((label) => {
                  const text = formatAxisLabel(label, labelKind, displayByMachineId);
                  return (
                    <th
                      key={`x-${label}`}
                      className="align-bottom border-b border-border p-0 font-medium text-muted-foreground"
                      style={{ minWidth: colMinWidth, width: colMinWidth, height: headerHeight }}
                      title={text}
                    >
                      <div
                        className="flex items-end justify-center px-0.5 pb-2 mx-auto"
                        style={{ height: headerHeight - 8 }}
                      >
                        <span className="whitespace-nowrap text-[10px] leading-none [writing-mode:vertical-rl] rotate-180">
                          {text}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {yLabels.map((rowLabel, rowIndex) => {
                const rowText = formatAxisLabel(rowLabel, labelKind, displayByMachineId);
                return (
                  <tr key={`row-${rowLabel}`}>
                    <th
                      className="sticky left-0 z-10 bg-card p-2 pr-3 text-left font-medium text-muted-foreground whitespace-nowrap border-r border-border/60"
                      style={{ width: rowHeaderWidth, minWidth: rowHeaderWidth, maxWidth: rowHeaderWidth }}
                      title={rowText}
                    >
                      {rowText}
                    </th>
                    {xLabels.map((colLabel, colIndex) => {
                      const value = matrix[rowIndex]?.[colIndex];
                      const colText = formatAxisLabel(colLabel, labelKind, displayByMachineId);
                      const display =
                        value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toFixed(2);
                      const numericValue = value == null || Number.isNaN(Number(value)) ? null : Number(value);
                      const meta = cellMeta.get(cellLookupKey(rowLabel, colLabel));
                      const description =
                        numericValue != null
                          ? resolveCellDescription(meta, numericValue, rowText, colText)
                          : undefined;
                      return (
                        <td key={`cell-${rowLabel}-${colLabel}`} className="p-0.5" style={{ minWidth: colMinWidth }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex h-9 items-center justify-center rounded-sm font-mono cursor-default text-[10px]",
                                  rowLabel === colLabel && "ring-1 ring-border",
                                )}
                                style={numericValue != null ? heatmapCellStyle(numericValue, min, max) : undefined}
                              >
                                {display}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-sm">
                              <p className="font-medium">
                                {rowText} × {colText}
                              </p>
                              <p className="text-muted-foreground mt-0.5">r = {display}</p>
                              {description && (
                                <p className="text-muted-foreground mt-1.5 leading-relaxed border-t border-border/50 pt-1.5">
                                  {description}
                                </p>
                              )}
                              {meta?.description_source && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1 capitalize">
                                  Source: {meta.description_source}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
      <CorrelationColorLegend min={min} max={max} />
    </Card>
  );
}

export function correlationPlotFromApi(
  raw: Record<string, unknown> | undefined,
  fallbackIpr?: DashboardIpr,
): DashboardHeatmapPlot | null {
  if (!raw || raw.type !== "heatmap") return null;
  const x_labels = (raw.x_labels as string[] | undefined) ?? [];
  const y_labels = (raw.y_labels as string[] | undefined) ?? x_labels;
  const values = (raw.values as number[][] | undefined) ?? [];
  if (!x_labels.length || !values.length) return null;
  const cells = raw.cells as DashboardHeatmapCell[] | undefined;
  return {
    type: "heatmap",
    title: raw.title as string | undefined,
    x_labels,
    y_labels,
    values,
    cells: cells?.length ? cells : undefined,
    color_scale: raw.color_scale as { min?: number; max?: number } | undefined,
    ipr: (raw.ipr as DashboardIpr | undefined) ?? fallbackIpr,
  };
}
