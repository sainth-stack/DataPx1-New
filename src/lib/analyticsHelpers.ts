export interface GeneratedKpi {
  id: string;
  raw: Record<string, unknown>;
  title: string;
  column: string;
  logic: string;
  fileName: string;
}

export function mapGeneratedKpis(kpis: unknown): GeneratedKpi[] {
  if (!kpis || typeof kpis !== "object") return [];
  return Object.entries(kpis as Record<string, Record<string, unknown>>).map(([id, n]) => ({
    id,
    raw: n,
    title: String(n["KPI Name"] ?? id),
    column: String(n["Columns used"] ?? "—"),
    logic: String(n.Logic ?? "—"),
    fileName: String(n["File Name"] ?? "—"),
  }));
}

function decodePlotlyBinary(data: unknown): number[] | null {
  if (!Array.isArray(data)) {
    if (!data || typeof data !== "object") return null;
    const obj = data as { bdata?: string; dtype?: string };
    if (!obj.bdata || !obj.dtype) return null;
    try {
      const binary = atob(obj.bdata);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const dtype = obj.dtype.toLowerCase();
      if (dtype === "f8") return Array.from(new Float64Array(buffer));
      if (dtype === "f4") return Array.from(new Float32Array(buffer));
      if (dtype === "i4") return Array.from(new Int32Array(buffer));
      return Array.from(new Float64Array(buffer));
    } catch {
      return null;
    }
  }
  return data as number[];
}

export function parseForecastChart(path: unknown, tableData: unknown, column: string) {
  let plot: unknown = path;
  if (typeof path === "string") {
    try {
      plot = JSON.parse(path);
    } catch {
      plot = null;
    }
  }
  if (plot && typeof plot === "object") {
    const p = plot as { data?: Array<{ x?: unknown; y?: unknown; type?: string }>; layout?: { title?: { text?: string } } };
    const trace = p.data?.[0];
    if (trace) {
      const xs = decodePlotlyBinary(trace.x) ?? (Array.isArray(trace.x) ? trace.x : null);
      const ys = decodePlotlyBinary(trace.y) ?? (Array.isArray(trace.y) ? trace.y : null);
      if (xs && ys) {
        const points = [];
        for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
          const y = ys[i];
          if (y != null && !Number.isNaN(Number(y))) {
            points.push({ name: String(xs[i] ?? i), value: Number(y) });
          }
        }
        if (points.length) {
          return {
            points,
            title: typeof p.layout?.title?.text === "string" ? p.layout.title.text : undefined,
          };
        }
      }
    }
  }

  let rows: Record<string, unknown>[] = [];
  if (typeof tableData === "string") {
    try {
      rows = JSON.parse(tableData);
    } catch {
      rows = [];
    }
  } else if (Array.isArray(tableData)) {
    rows = tableData.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  } else if (tableData && typeof tableData === "object") {
    rows = [tableData as Record<string, unknown>];
  }

  if (!rows.length) return { points: [], title: undefined };
  const keys = Object.keys(rows[0]);
  const valueKey =
    keys.find((k) => /forecast|predicted|value/i.test(k)) ??
    keys.find((k) => typeof rows[0][k] === "number") ??
    keys[keys.length - 1];
  const nameKey = keys.find((k) => /date|time|timestamp|period|index/i.test(k)) ?? keys[0];
  const points = rows
    .map((row, i) => ({
      name: String(row[nameKey] ?? i),
      value: Number(row[valueKey]),
    }))
    .filter((p) => !Number.isNaN(p.value));

  return { points, title: `Forecasted ${column} values over time` };
}

export const FREQ_API: Record<string, string> = {
  Hours: "hours",
  Days: "days",
  Weeks: "weeks",
  Months: "months",
};

export const PERIOD_DAYS: Record<string, number> = {
  "1 day": 1,
  "5 days": 5,
  "2 weeks": 14,
  "1 month": 30,
};

export interface OutlierReport {
  summary: {
    column: string;
    outlier_count: number;
    lower_bound: number | string;
    upper_bound: number | string;
    method?: string;
    q1?: number | string;
    q3?: number | string;
    iqr?: number | string;
  };
  rows: Record<string, unknown>[];
}

export function normalizeOutlierReport(data: unknown): OutlierReport | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const summary = (d.summary as Record<string, unknown>) ?? d;
  return {
    summary: {
      column: String(summary.column ?? ""),
      outlier_count: Number(summary.outlier_count ?? summary.total_outliers ?? 0),
      lower_bound: summary.lower_bound ?? summary.lowerBound ?? "—",
      upper_bound: summary.upper_bound ?? summary.upperBound ?? "—",
      method: String(summary.method ?? "IQR"),
      q1: summary.q1 as number | string | undefined,
      q3: summary.q3 as number | string | undefined,
      iqr: summary.iqr as number | string | undefined,
    },
    rows: (d.rows as Record<string, unknown>[]) ?? (d.outliers as Record<string, unknown>[]) ?? [],
  };
}

export function machineLabel(m: { machine_serial?: string; twin_id: string; machine_id?: string }) {
  return `${m.machine_serial || m.twin_id} · ${m.machine_id || m.twin_id}`;
}

export interface KpiChartPoint {
  name: string;
  value: number;
}

/** Normalize KPI execute API chart payload into Recharts-friendly points. */
export function parseKpiExecuteChart(result: Record<string, unknown> | null | undefined): KpiChartPoint[] {
  if (!result) return [];

  const chart = result.chart as Record<string, unknown> | undefined;
  if (!chart) {
    if (Array.isArray(result.plots)) {
      return (result.plots as KpiChartPoint[]).filter((p) => !Number.isNaN(Number(p.value)));
    }
    return [];
  }

  const legacyPoints = chart.points;
  if (Array.isArray(legacyPoints) && legacyPoints.length) {
    return legacyPoints
      .map((p) => {
        const pt = p as { name?: string; label?: string; value?: number };
        return {
          name: String(pt.name ?? pt.label ?? ""),
          value: Number(pt.value),
        };
      })
      .filter((p) => !Number.isNaN(p.value));
  }

  const labels =
    (chart.x_labels as string[] | undefined) ??
    (chart.labels as string[] | undefined) ??
    [];
  let values = chart.values as number[] | undefined;
  if (!values?.length && Array.isArray(chart.series)) {
    values = (chart.series as { values?: number[] }[])[0]?.values;
  }

  if (!labels.length || !values?.length) return [];

  return labels
    .map((label, i) => ({
      name: String(label),
      value: Number(values![i]),
    }))
    .filter((p) => !Number.isNaN(p.value));
}

export interface ForecastChartMeta {
  title?: string;
  x_axis_label?: string;
  y_axis_label?: string;
  unit?: string;
  description?: string;
  ipr?: {
    inferences?: string[];
    problems?: string[];
    recommendations?: string[];
  };
}

export interface ParsedForecastResult {
  points: KpiChartPoint[];
  title?: string;
  chartMeta?: ForecastChartMeta;
  trendNote?: string | null;
}

/** Normalize ARIMA forecast API payload (chart + Plotly fallback) for the Modelling UI. */
export function parseForecastResponse(
  res: Record<string, unknown>,
  fallbackColumn: string,
): ParsedForecastResult {
  const chart = res.chart as Record<string, unknown> | undefined;
  const plotlyParsed = parseForecastChart(res.path, res.data, fallbackColumn);

  let points = parseKpiExecuteChart(res);
  if (!points.length) {
    points = plotlyParsed.points;
  }

  const timestamps = chart?.x_timestamps as string[] | undefined;
  const values = chart?.values as number[] | undefined;
  if (timestamps?.length && values?.length && timestamps.length === values.length) {
    points = timestamps
      .map((name, i) => ({
        name: String(name),
        value: Number(values[i]),
      }))
      .filter((p) => !Number.isNaN(p.value));
  }

  const chartMeta: ForecastChartMeta | undefined = chart
    ? {
        title: chart.title as string | undefined,
        x_axis_label: chart.x_axis_label as string | undefined,
        y_axis_label: chart.y_axis_label as string | undefined,
        unit: chart.unit as string | undefined,
        description: chart.description as string | undefined,
        ipr: chart.ipr as ForecastChartMeta["ipr"],
      }
    : undefined;

  const trendNote =
    (typeof chart?.description === "string" ? chart.description : null) ??
    (typeof res.trend_interpretation === "string" ? res.trend_interpretation : null);

  return {
    points,
    title: chartMeta?.title ?? plotlyParsed.title,
    chartMeta,
    trendNote,
  };
}

export interface ParsedKpiCodeOutput {
  title: string | null;
  code: string;
  output: string | null;
}

/** Split KPI execute API `code` field (HTML-wrapped) into title, Python code, and stdout. */
export function parseKpiGeneratedCode(raw: string): ParsedKpiCodeOutput {
  let text = raw.trim().replace(/\s*<hr\s*\/?>\s*$/i, "");

  let title: string | null = null;
  const titleMatch = text.match(/^<b>(.*?)<\/b>\s*/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    text = text.slice(titleMatch[0].length);
  }

  let output: string | null = null;
  const outputMatch = text.match(/\s*<b>Output:\s*([\s\S]*?)<\/b>\s*$/i);
  if (outputMatch) {
    output = outputMatch[1].trim();
    text = text.slice(0, outputMatch.index);
  }

  return { title, code: text.trim(), output };
}
