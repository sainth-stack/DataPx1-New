import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { formatOneDecimal } from "../../../utils/reportCalculations";

/* Vibrant SaaS color palette — cohesive, professional, data-viz friendly */
const SAAS_PALETTE = [
  "#3B82F6", /* primary blue */
  "#8B5CF6", /* violet */
  "#06B6D4", /* cyan */
  "#10B981", /* emerald */
  "#F59E0B", /* amber */
  "#F97316", /* orange */
  "#EF4444", /* red */
  "#EC4899", /* pink */
  "#6366F1", /* indigo */
  "#14B8A6", /* teal */
];
const SAAS_STATUS = {
  good: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  healthy: "#10B981",
  passive: "#F59E0B",
  neutral: "#64748b",
};
const SAAS_RAG = { "On Track": "#10B981", Monitor: "#F59E0B", Overdue: "#F97316", Critical: "#EF4444" };
const SAAS_LINE = "#3B82F6";
const SAAS_LINE_ACTIVE = "#2563EB";

const statusColor = (s) => SAAS_STATUS[s] || SAAS_STATUS.neutral;

export const KpiCard = ({ label, value, sub, status, badge_color, className = "" }) => (
  <div
    className={`report-kpi-card ${className}`.trim()}
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "14px 18px",
      minWidth: 130,
    }}
  >
    <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", letterSpacing: "0.05em", marginBottom: 4 }}>
      {String(label).toUpperCase()}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: badge_color || statusColor(status) || "#f9fafb",
        fontFamily: "'DM Mono', monospace",
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{sub}</div>}
  </div>
);

const ChartCard = ({ title, children, className = "" }) => (
  <div
    className={`report-chart-card ${className}`.trim()}
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: 20,
    }}
  >
    {title && (
      <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", marginBottom: 14, letterSpacing: "0.04em" }}>
        {String(title).toUpperCase()}
      </div>
    )}
    {children}
  </div>
);

const COMMON_VALUE_KEYS = ["count", "value", "cost", "claims", "completion", "avg_nps", "score", "throughput", "quality", "oee", "hours", "utilization"];

function inferBarKeys(data, valueKeys = COMMON_VALUE_KEYS) {
  if (!data?.length) return { catKey: "name", valKey: "value" };
  const first = data[0];
  const catKey = Object.keys(first).find((k) => typeof first[k] === "string" || (k === "dimension")) || "name";
  const valKey = valueKeys.find((k) => k in first) || Object.keys(first).find((k) => typeof first[k] === "number") || "value";
  return { catKey: catKey || "name", valKey: valKey || "value" };
}

const CHART_HEIGHT = 280;
const TICK_STYLE = { fill: "#475569", fontSize: 12, fontWeight: 500 };
const TOOLTIP_STYLE = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
  labelStyle: { color: "#1e293b", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#475569", fontSize: 13 },
};
const GRID_STROKE = "#e2e8f0";

export function ChartFromConfig({ config }) {
  if (!config) return null;
  let { chart_type, title, data = [], reference_lines = [], x_axis, y_axis, x_axis_label, y_axis_label } = config;
  if (chart_type === "histogram") chart_type = "bar";
  if (chart_type === "donut") chart_type = "pie";
  const tickStyle = TICK_STYLE;
  const xAxisLabel = x_axis_label || config.xAxisLabel;
  const yAxisLabel = y_axis_label || config.yAxisLabel;
  const axisLabelStyle = { fontSize: 11, fill: "#64748b", fontWeight: 500 };

  if (chart_type === "pie") {
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={92}
              innerRadius={42}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              label={({ name, value, percent }) => `${name}: ${formatOneDecimal(value)} (${(percent * 100).toFixed(1)}%)`}
              labelLine={{ stroke: "#64748b", strokeWidth: 1 }}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color || SAAS_PALETTE[i % SAAS_PALETTE.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(val) => [typeof val === "number" ? formatOneDecimal(val) : val, ""]} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#334155" }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "bar") {
    const { catKey, valKey } = inferBarKeys(data);
    const yAxisWidth = yAxisLabel ? 54 : 36;
    const leftMargin = yAxisLabel ? 64 : 8;
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: leftMargin, bottom: xAxisLabel ? 28 : 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey={catKey} tick={tickStyle} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -20, style: axisLabelStyle } : undefined} />
            <YAxis tick={tickStyle} tickFormatter={(v) => (typeof v === "number" ? formatOneDecimal(v) : v)} axisLine={false} tickLine={{ stroke: "#e2e8f0" }} width={yAxisWidth} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", dx: -22, style: axisLabelStyle } : undefined} />
            <Tooltip cursor={{ fill: "rgba(226,232,240,0.4)" }} {...TOOLTIP_STYLE} formatter={(val) => [typeof val === "number" ? formatOneDecimal(val) : val, valKey.replace(/_/g, " ")]} />
            {reference_lines?.map((r, i) => (
              <ReferenceLine key={i} y={r.value} stroke={r.color} strokeDasharray="4 4" label={{ value: r.label, fill: r.color, fontSize: 10 }} />
            ))}
            <Bar dataKey={valKey} radius={[6, 6, 0, 0]} maxBarSize={56} barCategoryGap="20%">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color || SAAS_PALETTE[i % SAAS_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "horizontal_bar" || chart_type === "horizontal_bar_rag") {
    const keys = data[0] ? Object.keys(data[0]) : [];
    const catKey = keys.find((k) => ["vin", "series", "code", "mode", "component", "campaign", "severity", "country", "system"].includes(k)) || keys[0];
    const valKey = keys.find((k) => ["count", "days", "cost", "claims", "completion", "avg_nps", "utilization", "value"].includes(k)) || keys[keys.length - 1];
    const ragColors = SAAS_RAG;
    const h = Math.max(CHART_HEIGHT, data.length * 36);
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: yAxisLabel ? 120 : 8, bottom: xAxisLabel ? 28 : 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={tickStyle} tickFormatter={(v) => (typeof v === "number" ? formatOneDecimal(v) : v)} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} domain={[0, "auto"]} label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -20, style: axisLabelStyle } : undefined} />
            <YAxis dataKey={catKey} type="category" tick={tickStyle} width={100} axisLine={false} tickLine={false} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", dx: -8, style: axisLabelStyle } : undefined} />
            <Tooltip cursor={{ fill: "rgba(226,232,240,0.4)" }} {...TOOLTIP_STYLE} formatter={(val) => [typeof val === "number" ? formatOneDecimal(val) : val, valKey.replace(/_/g, " ")]} />
            {reference_lines?.map((r, i) => (
              <ReferenceLine key={i} x={r.value} stroke={r.color} strokeDasharray="4 4" />
            ))}
            <Bar dataKey={valKey} radius={[0, 6, 6, 0]} maxBarSize={28} barCategoryGap="12%">
              {data.map((d, i) => (
                <Cell key={i} fill={chart_type === "horizontal_bar_rag" && d.rag ? ragColors[d.rag] : d.color || SAAS_PALETTE[i % SAAS_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "line") {
    const keys = data[0] ? Object.keys(data[0]) : [];
    const xKey = x_axis || keys.find((k) => ["date", "quarter", "q", "month", "label"].includes(k)) || keys[0];
    const yKey = y_axis || keys.find((k) => ["score", "avg_nps", "nps", "oee", "hours", "pct", "spend_k", "value"].includes(k)) || keys[keys.length - 1];
    const lineData = data.length >= 2 ? data : data.length === 1 ? [{ ...data[0], [xKey]: "Start" }, { ...data[0], [xKey]: "End" }] : [];
    const hasNumbers = lineData.length > 0 && typeof lineData[0][yKey] === "number";
    const yDomain = hasNumbers ? [0, "auto"] : undefined;
    const yAxisWidth = yAxisLabel ? 54 : 36;
    const leftMargin = yAxisLabel ? 64 : 8;
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={lineData} margin={{ top: 16, right: 16, left: leftMargin, bottom: xAxisLabel ? 28 : 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -20, style: axisLabelStyle } : undefined} />
            <YAxis tick={tickStyle} tickFormatter={(v) => (typeof v === "number" ? formatOneDecimal(v) : v)} axisLine={false} tickLine={{ stroke: "#e2e8f0" }} width={yAxisWidth} domain={yDomain} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft", dx: -22, style: axisLabelStyle } : undefined} />
            <Tooltip cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} {...TOOLTIP_STYLE} formatter={(val) => [typeof val === "number" ? formatOneDecimal(val) : String(val), yKey.replace(/_/g, " ")]} />
            {reference_lines?.map((r, i) => (
              <ReferenceLine key={i} y={r.value} stroke={r.color} strokeDasharray="4 4" />
            ))}
            <Line type="monotone" dataKey={yKey} stroke={SAAS_LINE} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: SAAS_LINE_ACTIVE, stroke: "#fff", strokeWidth: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "stacked_bar") {
    const series = config.series || [];
    const colors = config.colors || {};
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="country" tick={tickStyle} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={{ stroke: "#e2e8f0" }} width={36} />
            <Tooltip cursor={{ fill: "rgba(226,232,240,0.4)" }} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#334155" }}>{v}</span>} />
            {series.map((s) => (
              <Bar key={s} dataKey={s} stackId="a" fill={colors[s] || SAAS_PALETTE[series.indexOf(s) % SAAS_PALETTE.length]} radius={[0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "grouped_bar") {
    const series = config.series || ["Dealer Score", "Machine Score"];
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="survey" tick={tickStyle} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={{ stroke: "#e2e8f0" }} width={36} />
            <Tooltip cursor={{ fill: "rgba(226,232,240,0.4)" }} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#334155" }}>{v}</span>} />
            <Bar dataKey={series[0]} fill={SAAS_PALETTE[0]} radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Bar dataKey={series[1]} fill={SAAS_PALETTE[1]} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "bar_with_line") {
    const first = data[0] || {};
    const barKey = Object.keys(first).find((k) => k === "cost") || "cost";
    const lineKey = Object.keys(first).find((k) => k === "cumulative") || "cumulative";
    const xKey = Object.keys(first).find((k) => !["cost", "cumulative"].includes(k) && typeof first[k] !== "number") || "event";
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey={xKey} tick={tickStyle} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={{ stroke: "#e2e8f0" }} width={36} />
            <Tooltip cursor={{ fill: "rgba(226,232,240,0.4)" }} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#334155" }}>{v}</span>} />
            <Bar dataKey={barKey} fill={SAAS_PALETTE[4]} radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Line type="monotone" dataKey={lineKey} stroke={SAAS_LINE} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  if (chart_type === "gantt_bar") {
    const total = Math.max(1, data.reduce((s, d) => s + (d.duration || 0), 0));
    return (
      <ChartCard title={title}>
        <div style={{ padding: "10px 0" }}>
          {data.map((d, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{d.stage}</div>
              <div style={{ position: "relative", height: 28, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                <div
                  style={{
                    position: "absolute",
                    left: `${((d.start || 0) / total) * 100}%`,
                    width: `${((d.duration || 0) / total) * 100}%`,
                    height: "100%",
                    background: d.color || SAAS_PALETTE[i % SAAS_PALETTE.length],
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {d.duration}d
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  if (chart_type === "scatter_timeline") {
    const severityOrder = config.severity_levels || ["Critical", "Warning", "Info"];
    const severityColor = { Critical: SAAS_STATUS.critical, Warning: SAAS_STATUS.warning, Info: SAAS_PALETTE[0] };
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    return (
      <ChartCard title={title}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <div style={{ padding: "8px 0", overflow: "auto", maxHeight: CHART_HEIGHT }}>
            {sorted.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  marginBottom: 6,
                  background: d.resolved ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  borderRadius: 8,
                  borderLeft: `4px solid ${severityColor[d.severity] || "#64748b"}`,
                }}
              >
                <span style={{ fontSize: 18, color: "#475569", minWidth: 24, textAlign: "center" }}>{d.resolved ? "●" : "×"}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", minWidth: 88 }}>{d.date}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: severityColor[d.severity] || "#64748b", minWidth: 64 }}>{d.severity}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569" }}>{d.code}</span>
                <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{d.description}</span>
                <span style={{ fontSize: 11, color: d.resolved ? SAAS_STATUS.good : SAAS_STATUS.critical, fontWeight: 600 }}>{d.resolved ? "Resolved" : "Open"}</span>
              </div>
            ))}
          </div>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>Unsupported chart type: {chart_type}</div>
    </ChartCard>
  );
}

export function renderSection(section) {
  if (!section) return null;
  const { title, description, kpi_cards = [], charts = [], table, risk_summary, survey_comments, actions } = section;

  return (
    <div>
      {description && (
        <p className="report-desc" style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{description}</p>
      )}
      {kpi_cards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {kpi_cards.map((k, i) => (
            <KpiCard key={i} label={k.label} value={k.value} sub={k.sub} status={k.status} badge_color={k.badge_color} />
          ))}
        </div>
      )}
      {risk_summary?.data?.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {risk_summary.data.map((r, i) => (
            <div
              key={i}
              className="report-risk-box"
              style={{
                flex: 1,
                minWidth: 100,
                background: r.color + "18",
                border: `2px solid ${r.color}44`,
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: r.color, fontFamily: "monospace" }}>{r.count}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{r.level} Risk</div>
            </div>
          ))}
        </div>
      )}
      {charts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>
          {charts.map((ch, i) => (
            <ChartFromConfig key={ch.chart_id || i} config={ch} />
          ))}
        </div>
      )}
      {table?.rows?.length > 0 && (
        <ChartCard title={table.title}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              {table.type !== "key_value" && table.headers?.length > 0 && (
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
                    {table.headers.map((h, i) => (
                      <th key={i} style={{ padding: "8px 10px", textAlign: "left", color: "#9ca3af", fontWeight: 600, fontSize: 10 }}>
                        {String(h).toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {table.type === "key_value" ? (
                      <>
                        <td style={{ padding: "10px", color: "#9ca3af", width: "40%" }}>{row.label}</td>
                        <td style={{ padding: "10px", color: "#d1d5db" }}>{row.value}</td>
                      </>
                    ) : (
                      (table.headers || []).map((h, ci) => {
                        const key = String(h).toLowerCase().replace(/\s+/g, "_");
                        const val = row[key] ?? row[h] ?? Object.values(row)[ci];
                        return (
                          <td key={ci} style={{ padding: "10px", color: "#d1d5db" }}>
                            {typeof val === "number" ? formatOneDecimal(val) : (val != null ? String(val) : "—")}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
      {survey_comments?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {survey_comments.map((c, i) => (
            <div key={i} style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{c.date} — Score {typeof c.score === "number" ? formatOneDecimal(c.score) : c.score}/10 ({c.category})</div>
              <p style={{ margin: 0, color: "#d1d5db", fontStyle: "italic", fontSize: 13 }}>"{c.comment}"</p>
            </div>
          ))}
        </div>
      )}
      {actions?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < actions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ background: (a.badge_color || "#6b7280") + "22", color: a.badge_color || "#9ca3af", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                {a.priority}
              </span>
              <span style={{ fontSize: 13, color: "#d1d5db" }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
