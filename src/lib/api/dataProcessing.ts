import { apiClient } from "./client";
import { extractApiMessage } from "./scope";

export const dataProcessingApi = {
  extractMessage: extractApiMessage,

  async getOverview(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/overview`);
    return data.data;
  },

  async getStatisticalSummary(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/statistical-summary`);
    return data.data;
  },

  async getFeatures(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/features`);
    return data.data;
  },

  async getDistribution(datasetId: string, feature: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/distribution`, {
      params: { feature },
    });
    return data.data;
  },

  async getFeatureAnalysis(datasetId: string, targetColumn?: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/feature-analysis`, {
      params: targetColumn ? { target_column: targetColumn } : {},
    });
    return data.data;
  },

  async getFleetCorrelation(datasetId: string, feature?: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/fleet-correlation`, {
      params: feature ? { feature } : {},
    });
    return data.data;
  },

  async getRawDataPreview(datasetId: string, limit = 50, offset = 0, machineId?: string) {
    const params: Record<string, unknown> = { limit, offset };
    if (machineId) params.machine_id = machineId;
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/raw`, { params });
    return data.data;
  },

  async refreshDataset(datasetId: string) {
    await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/refresh`);
  },

  async getRawQuality(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/raw-quality`);
    return data.data;
  },

  async getEnrichmentPlan(datasetId: string, useGpt = true) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/enrichment-plan`, {
      params: { use_gpt: useGpt },
    });
    return data.data;
  },

  async runEnrichment(datasetId: string, options: Record<string, unknown> = {}) {
    const { data } = await apiClient.post(
      `/api/datasets/${encodeURIComponent(datasetId)}/processing/enrichment-run`,
      { use_gpt: true, ...options },
      { timeout: 0 },
    );
    return data.data;
  },

  async getEnrichmentStatus(datasetId: string, runId?: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/enrichment-status`, {
      params: runId ? { run_id: runId } : {},
    });
    return data.data;
  },

  async getSyntheticQuality(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/synthetic-quality`);
    return data.data;
  },

  async getQualityComparison(datasetId: string) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/processing/quality-comparison`);
    return data.data;
  },
};
