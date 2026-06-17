import { apiClient } from "./client";
import { assertApiSuccess, datasetScopeParams, type DatasetScope } from "./scope";

export const analyticsApi = {
  async generateKpis(prompt: string, scope: DatasetScope) {
    const { data } = await apiClient.post("/api/analytics/kpi/generate", { prompt, ...scope }, { params: datasetScopeParams(scope) });
    return assertApiSuccess(data, "KPI generation failed");
  },

  async executeKpi(kpiData: unknown, scope: DatasetScope) {
    const { data } = await apiClient.post("/api/analytics/kpi/execute", { kpi_data: kpiData, ...scope }, { params: datasetScopeParams(scope) });
    return assertApiSuccess(data, "KPI execution failed");
  },

  async getMlFeatures(scope: DatasetScope, model?: string) {
    const { data } = await apiClient.get("/api/analytics/ml/features", {
      params: { ...datasetScopeParams(scope), ...(model ? { model } : {}) },
    });
    return assertApiSuccess(data, "Failed to load features");
  },

  async trainRandomForest(column: string, scope: DatasetScope) {
    const { data } = await apiClient.post("/api/analytics/ml/random-forest", { column, ...scope }, { params: datasetScopeParams(scope) });
    return assertApiSuccess(data, "Random Forest training failed");
  },

  async trainArima(column: string, frequency: string, tenure: number, scope: DatasetScope) {
    const { data } = await apiClient.post(
      "/api/analytics/ml/arima",
      { column, frequency, tenure, ...scope },
      { params: datasetScopeParams(scope) },
    );
    if (data.success === false || data.status === false) {
      throw new Error(typeof data.data === "string" ? data.data : data.message || data.msg || "ARIMA training failed");
    }
    return data;
  },

  async detectOutliers(column: string, scope: DatasetScope) {
    const { data } = await apiClient.post("/api/analytics/ml/outlier", { column, ...scope }, { params: datasetScopeParams(scope) });
    return assertApiSuccess(data, "Outlier detection failed");
  },

  async predictRandomForest(
    targetColumn: string,
    features: string[],
    scope: DatasetScope & { file_name?: string; machine_id?: string; twin_id?: string },
  ) {
    const { data } = await apiClient.post(
      "/api/analytics/ml/predict",
      {
        file_name: scope.file_name,
        machine_id: scope.machine_id || scope.twin_id,
        targetColumn,
        features,
      },
      { params: datasetScopeParams(scope) },
    );
    if (data.status === false || (data.success === false && data.message)) {
      throw new Error(data.message || "Prediction failed");
    }
    return data;
  },

  async sync(registryId: number | string, refresh = true) {
    const { data } = await apiClient.post("/api/analytics/sync", { registry_id: registryId, refresh });
    return data;
  },
};
