import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { formatOneDecimal } from "../../../utils/reportCalculations";

const BAR_COLORS = ["#2563eb", "#7c3aed", "#059669", "#0d9488", "#d97706", "#dc2626", "#6366f1", "#ea580c"];

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  reportTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 4 },
  reportSubtitle: { fontSize: 10, color: "#64748b" },
  reportMeta: { fontSize: 9, color: "#94a3b8", marginTop: 4 },
  sectionBlock: { marginBottom: 22, paddingBottom: 16, paddingTop: 2, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  sectionNumber: { fontSize: 9, fontWeight: "bold", color: "#2563eb", marginBottom: 4, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#0f172a", marginBottom: 8 },
  sectionDesc: { fontSize: 9, color: "#475569", marginBottom: 10, lineHeight: 1.45 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  kpiBox: { width: "30%", minWidth: 100, padding: 8, backgroundColor: "#f8fafc", borderRadius: 4 },
  kpiLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  kpiValue: { fontSize: 11, fontWeight: "bold", color: "#1e293b" },
  chartItemWrap: { marginBottom: 14 },
  chartBlock: { marginTop: 6, marginBottom: 6 },
  chartTitle: { fontSize: 10, fontWeight: "bold", color: "#1e293b", marginBottom: 6 },
  chartGraphWrap: { marginBottom: 6 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { fontSize: 8, color: "#334155", width: "28%", paddingRight: 8 },
  barTrack: { flex: 1, height: 14, backgroundColor: "#e2e8f0", borderRadius: 2, overflow: "hidden", flexDirection: "row" },
  barFill: { height: "100%", borderRadius: 2 },
  barValue: { fontSize: 8, fontWeight: "bold", color: "#1e293b", width: 48, textAlign: "right", paddingLeft: 8 },
  /* Pie chart: stacked strip + legend */
  pieStrip: { height: 24, flexDirection: "row", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  pieLegendRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 },
  pieLegendItem: { flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 },
  pieLegendColor: { width: 10, height: 10, borderRadius: 2, marginRight: 4 },
  pieLegendText: { fontSize: 8, color: "#334155" },
  /* Vertical bar chart */
  verticalBarWrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 96, marginBottom: 6, paddingHorizontal: 4 },
  verticalBarCol: { alignItems: "center", flex: 1, height: "100%" },
  verticalBarPlaceholder: { flex: 1, justifyContent: "flex-end", alignItems: "center", minHeight: 60 },
  verticalBar: { width: "70%", minWidth: 14, borderRadius: 2 },
  verticalBarLabel: { fontSize: 7, color: "#64748b", marginTop: 4, textAlign: "center" },
  verticalBarValue: { fontSize: 7, fontWeight: "bold", color: "#1e293b", marginTop: 2 },
  tableWrap: { marginTop: 12, marginBottom: 12, borderWidth: 0.5, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  tableTitle: { fontSize: 9, fontWeight: "bold", color: "#334155", marginBottom: 6, paddingHorizontal: 10, paddingTop: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 7, paddingHorizontal: 10, alignItems: "center", minHeight: 22 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#94a3b8", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#f1f5f9", alignItems: "center" },
  tableCell: { fontSize: 8, color: "#334155", flex: 1, paddingRight: 8, lineHeight: 1.35 },
  tableCellLabel: { fontSize: 8, color: "#64748b", width: "38%", paddingRight: 10, lineHeight: 1.35 },
  tableCellValue: { fontSize: 8, color: "#1e293b", width: "62%", lineHeight: 1.35 },
  riskGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, marginBottom: 4 },
  riskBox: { flex: 1, minWidth: 60, padding: 8, backgroundColor: "#f8fafc", borderRadius: 4 },
  riskCount: { fontSize: 14, fontWeight: "bold" },
  riskLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#94a3b8", textAlign: "center" },
  /* IPR Insights – aligned after overview */
  iprBlock: { marginTop: 14, marginBottom: 18, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  iprSectionTitle: { fontSize: 9, fontWeight: "bold", color: "#2563eb", marginBottom: 4, letterSpacing: 0.5 },
  iprSectionSubtitle: { fontSize: 10, fontWeight: "bold", color: "#0f172a", marginBottom: 12 },
  iprChartBlock: { marginBottom: 14, paddingLeft: 2 },
  iprChartTitle: { fontSize: 9, fontWeight: "bold", color: "#334155", marginBottom: 6 },
  iprLabel: { fontSize: 7, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: 2, marginTop: 6 },
  iprLabelIssues: { color: "#b45309" },
  iprLabelRec: { color: "#059669" },
  iprListItem: { fontSize: 8, color: "#475569", marginBottom: 3, lineHeight: 1.35, paddingLeft: 4 },
});

function KpiRows({ kpis }) {
  const cards = kpis || [];
  if (!cards.length) return null;
  return (
    <View style={styles.kpiGrid}>
      {cards.map((k, i) => (
        <View key={i} style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>{k.label}</Text>
          <Text style={styles.kpiValue}>{k.value}{k.sub ? ` (${k.sub})` : ""}</Text>
        </View>
      ))}
    </View>
  );
}

const CHART_TABLE_SKIP_KEYS = ["color", "severity_color", "badge_color"];
const LABEL_KEYS = ["label", "name", "stage", "type", "country", "series", "vin", "code", "system", "event", "month", "quarter", "dimension"];
const VALUE_KEYS = ["value", "count", "throughput", "oee", "hours", "utilization", "quality", "avg_nps", "score", "cost", "percentage", "pct", "spend_k"];

function getChartLabelAndValue(row, labelKey, valueKey) {
  const label = row[labelKey] != null ? String(row[labelKey]) : "";
  const num = valueKey && row[valueKey] != null && typeof row[valueKey] === "number" ? row[valueKey] : null;
  return { label, value: num };
}

function getChartKeys(data) {
  if (!data?.length) return { labelKey: null, valueKey: null };
  const first = data[0];
  const allKeys = Object.keys(first).filter(
    (k) => typeof first[k] !== "object" && first[k] !== null && !CHART_TABLE_SKIP_KEYS.includes(k)
  );
  const labelKey = allKeys.find((k) => LABEL_KEYS.includes(k)) || allKeys[0];
  const valueKey = allKeys.find((k) => VALUE_KEYS.includes(k)) || allKeys.find((k) => typeof first[k] === "number");
  return { labelKey, valueKey };
}

/** Pie chart in PDF: stacked coloured strip (proportional segments) + legend. */
function PieChartGraph({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data;
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 1;
  const segments = data.map((d, i) => ({
    label: d.label || d.name || `Item ${i + 1}`,
    value: Number(d.value) || 0,
    pct: ((Number(d.value) || 0) / total) * 100,
    color: d.color || BAR_COLORS[i % BAR_COLORS.length],
  }));
  return (
    <View style={styles.chartGraphWrap}>
      <Text style={styles.chartTitle}>{chart.title}</Text>
      <View style={styles.pieStrip}>
        {segments.map((s, i) => (
          <View
            key={i}
            style={{ flex: s.pct, backgroundColor: s.color, minWidth: 2 }}
          />
        ))}
      </View>
      <View style={styles.pieLegendRow}>
        {segments.map((s, i) => (
          <View key={i} style={styles.pieLegendItem}>
            <View style={[styles.pieLegendColor, { backgroundColor: s.color }]} />
            <Text style={styles.pieLegendText}>{s.label}: {formatOneDecimal(s.value)} ({formatOneDecimal(s.pct)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Vertical bar chart in PDF: bars with labels underneath. */
function VerticalBarChartGraph({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data.slice(0, 8);
  const { labelKey, valueKey } = getChartKeys(data);
  if (!valueKey) return null;
  const rows = data.map((row) => {
    const { label, value } = getChartLabelAndValue(row, labelKey, valueKey);
    return { label: (label || "").replace(/\n/g, " "), value: value != null ? value : 0 };
  });
  const maxVal = Math.max(...rows.map((r) => r.value), 1);
  const barMaxHeight = 72;
  return (
    <View style={styles.chartGraphWrap}>
      <Text style={styles.chartTitle}>{chart.title}</Text>
      <View style={styles.verticalBarWrap}>
        {rows.map((r, i) => (
          <View key={i} style={styles.verticalBarCol}>
            <View style={styles.verticalBarPlaceholder}>
              <View
                style={[
                  styles.verticalBar,
                  {
                    height: Math.max(6, (r.value / maxVal) * barMaxHeight),
                    backgroundColor: (chart.data[i] && chart.data[i].color) || BAR_COLORS[i % BAR_COLORS.length],
                  },
                ]}
              />
            </View>
            <Text style={styles.verticalBarValue}>{formatOneDecimal(r.value)}</Text>
            <Text style={styles.verticalBarLabel} numberOfLines={2}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal bar graph in PDF (for horizontal_bar, line, etc.). */
function HorizontalBarChartGraph({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data.slice(0, 10);
  const { labelKey, valueKey } = getChartKeys(data);
  if (!valueKey) return null;
  const rows = data.map((row) => {
    const { label, value } = getChartLabelAndValue(row, labelKey, valueKey);
    return { label: label.replace(/\n/g, " "), value };
  });
  const maxVal = Math.max(...rows.map((r) => r.value || 0), 1);
  return (
    <View style={styles.chartGraphWrap}>
      <Text style={styles.chartTitle}>{chart.title}</Text>
      {rows.map((r, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>{r.label}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.round((r.value / maxVal) * 100)}%`,
                  backgroundColor: (chart.data[i] && chart.data[i].color) || BAR_COLORS[i % BAR_COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{r.value != null ? formatOneDecimal(r.value) : "—"}</Text>
        </View>
      ))}
    </View>
  );
}

/** Pick graph type by chart_type: pie/donut → pie, bar → vertical bars, else → horizontal bars. */
function ChartGraph({ chart }) {
  if (!chart?.data?.length) return null;
  const type = (chart.chart_type || "").toLowerCase();
  if (type === "pie" || type === "donut") return <PieChartGraph chart={chart} />;
  if (type === "bar") return <VerticalBarChartGraph chart={chart} />;
  return <HorizontalBarChartGraph chart={chart} />;
}

function ChartAsTable({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data;
  const allKeys = Object.keys(data[0]).filter(
    (k) => typeof data[0][k] !== "object" && data[0][k] !== null && !CHART_TABLE_SKIP_KEYS.includes(k)
  );
  const labelKey = allKeys.find((k) => LABEL_KEYS.includes(k)) || allKeys[0];
  const valueKeys = allKeys.filter((k) => k !== labelKey && (typeof data[0][k] === "number" || typeof data[0][k] === "string"));
  const headers = [labelKey.replace(/_/g, " "), ...valueKeys.map((k) => k.replace(/_/g, " "))];
  return (
    <View style={styles.chartBlock}>
      <Text style={[styles.chartTitle, { fontSize: 9, color: "#64748b" }]}>{chart.title} — Data</Text>
      <View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableCell, { fontWeight: "bold", color: "#475569" }]}>{String(h).toUpperCase()}</Text>
        ))}
      </View>
      {data.slice(0, 12).map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]}>
          <Text style={[styles.tableCell, { flex: 1.2 }]}>{String(row[labelKey] ?? "")}</Text>
          {valueKeys.map((k, i) => (
            <Text key={i} style={styles.tableCell}>{row[k] != null ? (typeof row[k] === "number" ? formatOneDecimal(row[k]) : String(row[k])) : "—"}</Text>
          ))}
        </View>
      ))}
      {data.length > 12 && <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4, paddingHorizontal: 8 }}>… and {data.length - 12} more rows</Text>}
    </View>
  );
}

function SectionTable({ table }) {
  if (!table?.rows?.length) return null;
  const isKeyValue = table.type === "key_value";
  const headers = table.headers || [];
  return (
    <View style={styles.tableWrap}>
      {table.title ? <Text style={styles.tableTitle}>{table.title}</Text> : null}
      {table.description ? <Text style={styles.sectionDesc}>{table.description}</Text> : null}
      {isKeyValue ? (
        table.rows.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{row.label}</Text>
            <Text style={styles.tableCellValue}>{row.value}</Text>
          </View>
        ))
      ) : (
        <>
          {headers.length > 0 && (
            <View style={styles.tableHeader}>
              {headers.map((h, i) => (
                <Text key={i} style={[styles.tableCell, { fontWeight: "bold", color: "#64748b" }]}>{String(h).toUpperCase()}</Text>
              ))}
            </View>
          )}
          {table.rows.map((row, ri) => (
            <View key={ri} style={styles.tableRow}>
              {headers.length > 0
                ? headers.map((h, ci) => {
                    const key = String(h).toLowerCase().replace(/\s+/g, "_");
                    const val = row[key] ?? row[h] ?? Object.values(row)[ci];
                    return <Text key={ci} style={styles.tableCell}>{val != null ? (typeof val === "number" ? formatOneDecimal(val) : String(val)) : "—"}</Text>;
                  })
                : Object.values(row).map((val, ci) => <Text key={ci} style={styles.tableCell}>{val != null ? (typeof val === "number" ? formatOneDecimal(val) : String(val)) : "—"}</Text>)}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function sortSections(sections) {
  const list = [...(sections || [])];
  return list.sort((a, b) => (a.section_order ?? 999) - (b.section_order ?? 999));
}

function SectionContent({ section, idx, showOverallScore }) {
  return (
    <View key={section.section_id || idx} style={styles.sectionBlock}>
      <Text style={styles.sectionNumber}>{idx + 1}. {String(section.title || section.section_id).toUpperCase()}</Text>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.description ? <Text style={styles.sectionDesc}>{section.description}</Text> : null}
      <KpiRows kpis={section.kpi_cards} />
      {showOverallScore && (section.overall_score != null || section.overall_status || section.overall != null) && (
        <View style={{ marginTop: 10, marginBottom: 10, padding: 12, backgroundColor: "#f0fdf4", borderRadius: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: "#059669" }}>Overall Score: {section.overall_score ?? section.overall ?? "—"}/10</Text>
          {(section.overall_status || section.status) && <Text style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Status: {section.overall_status || section.status}</Text>}
        </View>
      )}
      {section.risk_summary?.data?.length > 0 && (
        <View style={styles.riskGrid}>
          {section.risk_summary.data.map((r, i) => (
            <View key={i} style={styles.riskBox}>
              <Text style={[styles.riskCount, { color: r.color || "#64748b" }]}>{typeof r.count === "number" ? formatOneDecimal(r.count) : r.count}</Text>
              <Text style={styles.riskLabel}>{r.level} Risk</Text>
            </View>
          ))}
        </View>
      )}
      {section.charts?.length > 0 && section.charts.map((ch, ci) => (
        <View key={ch.chart_id || ci} style={styles.chartItemWrap}>
          <ChartGraph chart={ch} />
          <ChartAsTable chart={ch} />
        </View>
      ))}
      {section.table ? <SectionTable table={section.table} /> : null}
    </View>
  );
}

/** IPR Insights block for PDF: Inferences, Issues, Recommendations from all charts. */
function IprBlock({ sections }) {
  const chartsWithIpr = (sections || []).flatMap((s) => (s.charts || []).filter((ch) => ch.iprInsights)).filter(
    (ch) => (ch.iprInsights.Inferences?.length || ch.iprInsights.Issues?.length || ch.iprInsights.Recommendations?.length)
  );
  if (!chartsWithIpr.length) return null;
  return (
    <View style={styles.iprBlock}>
      <Text style={styles.iprSectionTitle}>3. IPR INSIGHTS</Text>
      <Text style={styles.iprSectionSubtitle}>Insights, Issues &amp; Recommendations</Text>
      {chartsWithIpr.map((ch, i) => (
        <View key={ch.chart_id || i} style={styles.iprChartBlock}>
          <Text style={styles.iprChartTitle}>{ch.title}</Text>
          {(ch.iprInsights.Inferences || []).length > 0 && (
            <>
              <Text style={styles.iprLabel}>Inferences</Text>
              {(ch.iprInsights.Inferences || []).map((item, j) => (
                <Text key={j} style={styles.iprListItem}>• {item}</Text>
              ))}
            </>
          )}
          {(ch.iprInsights.Issues || []).length > 0 && (
            <>
              <Text style={[styles.iprLabel, styles.iprLabelIssues]}>Issues</Text>
              {(ch.iprInsights.Issues || []).map((item, j) => (
                <Text key={j} style={styles.iprListItem}>• {item}</Text>
              ))}
            </>
          )}
          {(ch.iprInsights.Recommendations || []).length > 0 && (
            <>
              <Text style={[styles.iprLabel, styles.iprLabelRec]}>Recommendations</Text>
              {(ch.iprInsights.Recommendations || []).map((item, j) => (
                <Text key={j} style={styles.iprListItem}>• {item}</Text>
              ))}
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const SECTIONS_PER_PAGE = 2;

function isOverviewSection(section) {
  if (!section || section.section_id === "summary" || section.type === "summary") return false;
  const title = String(section.title || section.section_id || "");
  return /overview/i.test(title);
}

/**
 * Machine 360 PDF — section-wise: summary KPIs, risk summary, graphs (bar visuals), tables, chart data, IPR after overview.
 * Payload = { meta, reports: { fleet_manager_360 } } — JSON format from backend unchanged.
 */
export function generateMachine360PDF(payload) {
  const dateStr = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
  const report = payload?.reports?.fleet_manager_360 || payload;
  const sections = sortSections(report?.sections || []);
  const pageChunks = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_PAGE) {
    pageChunks.push(sections.slice(i, i + SECTIONS_PER_PAGE));
  }
  if (pageChunks.length === 0) pageChunks.push([]);

  const Doc = () => (
    <Document>
      {pageChunks.map((chunk, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.reportTitle}>Machine 360 — Fleet Report</Text>
              <Text style={styles.reportSubtitle}>{report.fleet_name || report.report_title || "Fleet Overview"}</Text>
              <Text style={styles.reportMeta}>Report ID: {report.report_id || "—"} · Generated {dateStr}{pageChunks.length > 1 ? ` · Page ${pageIdx + 1}/${pageChunks.length}` : ""}</Text>
            </View>
          </View>

          {chunk.map((section, idx) => (
            <View key={section.section_id || pageIdx * SECTIONS_PER_PAGE + idx}>
              <SectionContent section={section} idx={pageIdx * SECTIONS_PER_PAGE + idx} showOverallScore={false} />
              {isOverviewSection(section) && <IprBlock sections={sections} />}
            </View>
          ))}

          <Text style={styles.footer}>Machine 360 Fleet Report · {report.report_id || "fleet"} · {dateStr}</Text>
        </Page>
      ))}
    </Document>
  );

  return pdf(<Doc />).toBlob().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `machine_360_report_${(report.report_id || "fleet").replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.error("Machine 360 PDF generation failed:", err);
    throw err;
  });
}

/**
 * Customer 360 PDF — section-wise: summary KPIs, overall score, graphs (bar visuals), tables, chart data.
 * Payload = { meta, reports: { customer_360 } } — JSON format from backend unchanged.
 */
export function generateCustomer360PDF(payload) {
  const dateStr = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
  const report = payload?.reports?.customer_360 || payload;
  const customer = report?.customer || {};
  const sections = sortSections(report?.sections || []);
  const subtitle = customer.name
    ? `${customer.name} · ${customer.farm_type || ""} · ${customer.farm_size_ha != null ? `${customer.farm_size_ha} ha` : ""} · ${customer.country || ""}`.replace(/\s·\s·/g, " · ").replace(/^\s·\s|\s·\s$/g, "").trim()
    : (report.report_title || "Customer 360 Overview");

  const pageChunks = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_PAGE) {
    pageChunks.push(sections.slice(i, i + SECTIONS_PER_PAGE));
  }
  if (pageChunks.length === 0) pageChunks.push([]);

  const Doc = () => (
    <Document>
      {pageChunks.map((chunk, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.reportTitle}>Customer 360 — Report</Text>
              <Text style={styles.reportSubtitle}>{subtitle}</Text>
              <Text style={styles.reportMeta}>Report ID: {report.report_id || "—"} · Generated {dateStr}{pageChunks.length > 1 ? ` · Page ${pageIdx + 1}/${pageChunks.length}` : ""}</Text>
            </View>
          </View>

          {chunk.map((section, idx) => (
            <SectionContent key={section.section_id || pageIdx * SECTIONS_PER_PAGE + idx} section={section} idx={pageIdx * SECTIONS_PER_PAGE + idx} showOverallScore />
          ))}

          <Text style={styles.footer}>Customer 360 Report · {report.report_id || "customer"} · {dateStr}</Text>
        </Page>
      ))}
    </Document>
  );

  return pdf(<Doc />).toBlob().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = report.report_id || (customer.name || "customer").replace(/\s+/g, "_");
    a.download = `customer_360_report_${baseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.error("Customer 360 PDF generation failed:", err);
    throw err;
  });
}
