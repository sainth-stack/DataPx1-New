import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_URL, USE_API_URL } from "../../../const";
import { formatOneDecimal } from "../../../utils/reportCalculations";

export const reportQueryKeys = {
  machine360: ["machine360-report"],
  customer360: ["customer360-report"],
};

const BAR_COLORS = ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#F97316", "#EF4444", "#EC4899", "#6366F1", "#14B8A6"];

/** Normalize API response to payload shape (reports.fleet_manager_360). */
export function normalizeMachineReport(data) {
  if (!data) return null;
  if (data.reports?.fleet_manager_360) return data;

  const payload = data.data && (data.status === "success" || data.data.reportMeta) ? data.data : data;
  const reportMeta = payload.reportMeta || {};
  const summary = payload.summary || [];
  const rawSections = payload.sections || [];

  const summarySection = {
    section_id: "summary",
    section_order: 0,
    type: "summary",
    title: "Summary",
    description: reportMeta.title ? `${reportMeta.title} — ${reportMeta.entityName || reportMeta.entityId || ""}` : "Key metrics at a glance.",
    kpi_cards: summary
      .filter((k) => k.type === "kpi")
      .map((k) => ({
        label: k.title ?? k.label,
        value: k.unit != null && k.unit !== "" ? `${formatOneDecimal(k.value)} ${k.unit}`.trim() : (k.value != null ? formatOneDecimal(k.value) : ""),
        status: k.status,
        badge_color: k.badge_color,
        highlight: k.highlight,
      })),
    charts: [],
  };

  const normalizedSections = rawSections.map((s, i) => {
    const table = s.table
      ? {
          type: "key_value",
          title: s.table.title || s.title,
          rows: (s.table.rows || []).map((r) => ({
            label: r.attribute ?? r.label ?? "—",
            value: r.value != null ? formatOneDecimal(r.value) : "—",
          })),
        }
      : s.table;

    const charts = (s.charts || []).map((c) => {
      let chartType = (c.chartType ?? c.chart_type ?? "bar").toLowerCase();
      if (chartType === "histogram") chartType = "bar";
      if (chartType === "donut") chartType = "pie";
      const rawData = c.data || [];
      const data = rawData.map((d, idx) => {
        const label = d.label ?? d.x ?? d.name ?? String(idx);
        const value = d.value ?? d.y ?? 0;
        return { label: String(label), value: typeof value === "number" ? value : Number(value) || 0, color: d.color ?? BAR_COLORS[idx % BAR_COLORS.length] };
      });
      return {
        chart_id: c.chartId ?? c.chart_id,
        chart_type: chartType,
        title: c.title,
        x_axis: "label",
        y_axis: "value",
        x_axis_label: c.xAxis ?? c.x_axis_label,
        y_axis_label: c.yAxis ?? c.y_axis_label,
        data,
        iprInsights: c.iprInsights || undefined,
      };
    });

    return {
      section_id: s.sectionId ?? s.section_id,
      section_order: s.section_order ?? i + 1,
      type: s.type ?? "mixed",
      title: s.title,
      description: s.description,
      kpi_cards: (s.kpis || s.kpi_cards || []).map((k) => ({
        label: k.title ?? k.label,
        value: k.unit != null && k.unit !== "" ? `${formatOneDecimal(k.value)} ${k.unit}`.trim() : (k.value != null ? formatOneDecimal(k.value) : ""),
        sub: k.sub,
        status: k.status,
        badge_color: k.badge_color,
        highlight: k.highlight,
      })),
      charts,
      table,
      risk_summary: s.risk_summary,
    };
  });

  const sections = summary.length > 0 ? [summarySection, ...normalizedSections] : normalizedSections;

  return {
    meta: {
      api_version: "1.0",
      generated_at: reportMeta.generatedAt || new Date().toISOString().slice(0, 10),
      report_period: payload.reportingPeriod ? { from: "", to: payload.reportingPeriod } : {},
    },
    reports: {
      fleet_manager_360: {
        report_id: reportMeta.entityId ?? reportMeta.report_id ?? "api-report",
        report_title: reportMeta.title ?? "Machine 360 Report",
        fleet_name: reportMeta.entityName ?? reportMeta.fleet_name ?? reportMeta.title ?? "Fleet Overview",
        reporting_period: reportMeta.reportingPeriod ? { from: "", to: reportMeta.reportingPeriod } : {},
        sections,
      },
    },
  };
}

async function fetchMachineReportFromApi() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.id;
  const { data } = await axios.post(`${API_URL}/genai_report`, { report_type: "Machine 360" }, {
    headers: userId ? { "X-User-ID": userId } : {},
  });
  return normalizeMachineReport(data);
}

async function fetchMachineReportStatic() {
  const mod = await import("../data/machine_report.json");
  const data = mod.default || mod;
  return normalizeMachineReport(data) || data;
}

/** Machine 360 report: from API when USE_API_URL, else static JSON. Fetches only on mount (when no cache) or when reportId/filename changes; no refetch on tab/window focus. */
export function useMachine360Report(options = {}) {
  const { reportId, filename, ...rest } = options;
  const enabled = options.enabled !== false;
  const cacheKey = reportId ?? filename ?? null;
  return useQuery({
    queryKey: [...reportQueryKeys.machine360, USE_API_URL, cacheKey],
    queryFn: USE_API_URL ? fetchMachineReportFromApi : fetchMachineReportStatic,
    staleTime: USE_API_URL ? 2 * 60 * 1000 : 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled,
    ...rest,
  });
}

/** Normalize customer report (legacy or API shape) to payload. */
export function normalizeCustomerReport(raw) {
  if (!raw) return null;
  if (raw.reports?.customer_360) return raw;
  const sections = (raw.sections || []).map((s) => {
    const section = {
      section_id: s.id,
      section_order: s.id === "overview" ? 1 : s.id === "nps" ? 2 : s.id === "dtc" ? 3 : s.id === "service" ? 4 : 5,
      type: "mixed",
      title: s.label,
      kpi_cards: s.kpis || [],
    };
    const charts = [];
    if (s.deliveryChart?.length) {
      charts.push({
        chart_id: "delivery_timeline",
        chart_type: "gantt_bar",
        title: "Order-to-Delivery Timeline",
        data: s.deliveryChart.map((d) => ({ stage: d.stage?.replace(/\n/g, " "), start: d.start, duration: d.duration, color: "#2563eb" })),
      });
    }
    if (s.npsData?.length) {
      charts.push({ chart_id: "nps_over_time", chart_type: "line", title: "NPS Score Over Time", x_axis: "date", y_axis: "score", data: s.npsData });
    }
    if (s.satisfactionData?.length) {
      charts.push({ chart_id: "dealer_vs_machine", chart_type: "grouped_bar", title: "Dealer vs Machine Satisfaction", series: ["Dealer", "Machine"], data: s.satisfactionData });
    }
    if (s.systemData?.length) {
      charts.push({ chart_id: "dtc_by_system", chart_type: "horizontal_bar", title: "DTC Events by System", data: s.systemData });
    }
    if (s.serviceCosts?.length) {
      charts.push({ chart_id: "service_costs", chart_type: "bar_with_line", title: "Service Costs & Cumulative", data: s.serviceCosts.map((d) => ({ ...d, event: d.event })) });
    }
    if (s.scheduleData?.length) {
      charts.push({
        chart_id: "schedule_pie",
        chart_type: "pie",
        title: "Services On Schedule",
        data: s.scheduleData.map((d) => ({ ...d, color: d.label === "On Schedule" ? "#059669" : "#dc2626" })),
      });
    }
    if (charts.length) section.charts = charts;
    if (s.specs?.length) {
      section.table = { type: "key_value", title: "Specifications", rows: s.specs.map(([label, value]) => ({ label, value })) };
    }
    if (s.openFaults?.length) {
      section.table = { type: "data_table", title: "Open Fault Codes", headers: ["Date", "Code", "Description", "Severity", "System"], rows: s.openFaults.map((f) => ({ date: f.date, code: f.code, description: f.desc, severity: f.severity, system: f.system })) };
    }
    if (s.overall != null) {
      section.overall_score = s.overall;
      section.overall_status = s.status;
    }
    return section;
  });
  return {
    meta: raw.meta || {},
    reports: {
      customer_360: {
        report_id: raw.report_id,
        report_title: "Customer 360 — Machine Journey Report",
        customer: raw.customer || {},
        sections,
      },
    },
  };
}

async function fetchCustomer360Report() {
  const mod = await import("../data/customer_report.json");
  const data = mod.default || mod;
  return data?.reports?.customer_360 ? data : normalizeCustomerReport(data) || { reports: { customer_360: data } };
}

/** Customer 360 report: static JSON. Fetches only on mount (when no cache) or when reportId/filename changes; no refetch on tab/window focus. */
export function useCustomer360Report(options = {}) {
  const { reportId, filename, ...rest } = options;
  const cacheKey = reportId ?? filename ?? null;
  return useQuery({
    queryKey: [...reportQueryKeys.customer360, cacheKey],
    queryFn: fetchCustomer360Report,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: options.enabled !== false,
    ...rest,
  });
}
