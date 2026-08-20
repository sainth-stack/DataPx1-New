export interface DashboardIpr {
  inferences?: string[];
  problems?: string[];
  recommendations?: string[];
}

export interface DashboardPlot {
  plot_id?: string;
  type?: "bar" | "line" | "area";
  title?: string;
  unit?: string;
  target?: number;
  labels?: string[];
  x_labels?: string[];
  values?: number[];
  colors?: string[];
  description?: string;
  ipr?: DashboardIpr;
}

/** Clean GPT/heuristic IPR text for business readers. */
export function sanitizeIprText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD⁠]/g, "")
    .replace(/`/g, "")
    .replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi, (match) =>
      match.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeDashboardIpr(raw?: DashboardIpr | null): DashboardIpr | null {
  if (!raw) return null;
  const mapList = (items?: string[]) => (items ?? []).map(sanitizeIprText).filter(Boolean);
  const normalized = {
    inferences: mapList(raw.inferences),
    problems: mapList(raw.problems),
    recommendations: mapList(raw.recommendations),
  };
  if (!normalized.inferences.length && !normalized.problems.length && !normalized.recommendations.length) {
    return null;
  }
  return normalized;
}

export function plotChartPoints(plot: DashboardPlot): { label: string; value: number }[] {
  const labels = plot.x_labels?.length ? plot.x_labels : plot.labels ?? [];
  const values = plot.values ?? [];
  return labels.map((label, index) => ({
    label: String(label),
    value: Number(values[index] ?? 0),
  }));
}

export function plotHasData(plot: DashboardPlot): boolean {
  return plotChartPoints(plot).length > 0;
}

export function plotColorToken(color?: string): string {
  switch ((color ?? "").toLowerCase()) {
    case "green":
      return "hsl(var(--success))";
    case "yellow":
    case "orange":
      return "hsl(var(--warning))";
    case "red":
      return "hsl(var(--destructive))";
    default:
      return "hsl(var(--accent))";
  }
}

export function plotSummaryNote(plot: DashboardPlot): string | undefined {
  const desc = plot.description?.trim();
  if (desc && desc !== "NA") return sanitizeIprText(desc);
  const ipr = normalizeDashboardIpr(plot.ipr);
  return ipr?.inferences?.[0];
}
