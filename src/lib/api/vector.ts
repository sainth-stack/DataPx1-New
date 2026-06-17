import { apiClient } from "./client";
import { registryParams, type RegistryScope } from "./scope";

function assertSuccess<T extends { success?: boolean; message?: string }>(data: T): T["data"] extends infer D ? D : unknown {
  if (!data.success) throw new Error(data.message || "Request failed");
  return (data as { data: unknown }).data;
}

export const vectorApi = {
  async listAgents(scope: RegistryScope) {
    const { data } = await apiClient.get("/api/vector/agents", { params: registryParams(scope) });
    return assertSuccess(data);
  },

  async toggleAgentStatus(agentId: string, status: string) {
    const { data } = await apiClient.patch(`/api/vector/agents/${agentId}/status`, { status });
    return assertSuccess(data);
  },

  async getAnomalies(scope: RegistryScope & { limit?: number; classification?: string; confidence?: number }) {
    const { data } = await apiClient.get("/api/vector/anomalies", {
      params: {
        ...registryParams(scope),
        limit: scope.limit ?? 20,
        ...(scope.classification ? { classification: scope.classification } : {}),
        ...(scope.confidence != null ? { confidence: scope.confidence } : {}),
      },
    });
    return assertSuccess(data);
  },

  async getAlerts(scope: RegistryScope & { limit?: number; severity?: string; status?: string; agent?: string }) {
    const { data } = await apiClient.get("/api/vector/alerts", {
      params: {
        ...registryParams(scope),
        limit: scope.limit ?? 50,
        ...(scope.severity ? { severity: scope.severity } : {}),
        ...(scope.status ? { status: scope.status } : {}),
        ...(scope.agent ? { agent: scope.agent } : {}),
      },
    });
    return assertSuccess(data);
  },

  async acknowledgeAlert(registryId: number | string, alertId: string, body: Record<string, unknown>) {
    const { data } = await apiClient.patch(`/api/vector/alerts/${encodeURIComponent(alertId)}/acknowledge`, body, {
      params: { registry_id: registryId },
    });
    if (!data.success) throw new Error(data.message || "Failed to acknowledge alert");
  },

  async listTriggers(scope: RegistryScope & { enabled?: boolean; agent?: string }) {
    const { data } = await apiClient.get("/api/vector/triggers", {
      params: {
        ...registryParams(scope),
        ...(scope.enabled != null ? { enabled: scope.enabled } : {}),
        ...(scope.agent != null ? { agent: scope.agent } : {}),
      },
    });
    return assertSuccess(data);
  },

  async toggleTrigger(registryId: number | string, triggerId: string, enabled: boolean) {
    const { data } = await apiClient.patch(`/api/vector/triggers/${encodeURIComponent(triggerId)}/toggle`, { enabled }, {
      params: { registry_id: registryId },
    });
    if (!data.success) throw new Error(data.message || "Failed to toggle trigger");
    return data.data;
  },

  async getPerformance(scope: RegistryScope & { interval?: string; startDate?: string; endDate?: string }) {
    const { data } = await apiClient.get("/api/vector/performance", {
      params: {
        ...registryParams(scope),
        interval: scope.interval ?? "hourly",
        ...(scope.startDate ? { startDate: scope.startDate } : {}),
        ...(scope.endDate ? { endDate: scope.endDate } : {}),
      },
    });
    return assertSuccess(data);
  },
};
