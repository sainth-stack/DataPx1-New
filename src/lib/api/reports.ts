import { apiClient } from "./client";
import { extractApiMessage } from "./scope";

export const reportsApi = {
  extractMessage: extractApiMessage,

  async getAgentIntelligence(registryId: number | string, params: Record<string, unknown> = {}) {
    const { data } = await apiClient.get("/api/reports/agent-intelligence", {
      params: { registry_id: registryId, ...params },
    });
    if (!data.success) throw new Error(data.message ?? "Failed to load agent intelligence report");
    return data;
  },

  async getAssetPerformance(registryId: number | string, params: Record<string, unknown> = {}) {
    const { data } = await apiClient.get("/api/reports/asset-performance", {
      params: { registry_id: registryId, ...params },
    });
    if (!data.success) throw new Error(data.message ?? "Failed to load asset performance report");
    return data;
  },

  async getSensorDiagnostics(registryId: number | string, params: Record<string, unknown> = {}) {
    const { data } = await apiClient.get("/api/reports/sensor-diagnostics", {
      params: { registry_id: registryId, ...params },
    });
    if (!data.success) throw new Error(data.message ?? "Failed to load sensor diagnostics report");
    return data;
  },

  async listCustomReports() {
    const { data } = await apiClient.get("/api/reports/custom");
    if (!data.success) throw new Error(data.message ?? "Failed to list custom reports");
    return data.data?.reports ?? [];
  },

  async createCustomReport(body: {
    title: string;
    source: string;
    registry_id: number | string;
    prompt?: string;
    columns: string[];
    customColumns?: string[];
  }) {
    const { data } = await apiClient.post("/api/reports/custom", {
      title: body.title,
      source: body.source,
      registry_id: body.registry_id,
      prompt: body.prompt ?? "",
      columns: body.columns,
      customColumns: body.customColumns ?? [],
    });
    if (!data.success || !data.data) throw new Error(data.message ?? "Failed to create custom report");
    return data.data;
  },

  async deleteCustomReport(reportId: string) {
    const { data } = await apiClient.delete(`/api/reports/custom/${encodeURIComponent(reportId)}`);
    if (!data.success) throw new Error(data.message ?? "Failed to delete report");
  },

  async downloadCustomReportCsv(reportId: string, filename: string) {
    const res = await apiClient.get(`/api/reports/custom/${encodeURIComponent(reportId)}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async syncAnalytics(registryId: number | string, refresh = true) {
    const { data } = await apiClient.post("/api/analytics/sync", { registry_id: registryId, refresh });
    return data;
  },
};
