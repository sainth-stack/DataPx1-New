import { API_BASE_URL, apiClient } from "./client";

function unwrapData<T>(response: { data?: T; message?: string }): T {
  if (response.data != null) return response.data;
  throw new Error(response.message || "Invalid response");
}

export const dataPreparationApi = {
  async applyPrompt(body: Record<string, unknown>) {
    const { data } = await apiClient.post("/api/data-preparation/apply-prompt", body, { timeout: 0 });
    return unwrapData(data);
  },

  async estimateRows(body: Record<string, unknown>) {
    const { data } = await apiClient.post("/api/data-preparation/estimate-rows", body);
    return unwrapData(data) as { estimated_rows: number };
  },

  async generate(body: Record<string, unknown>) {
    const { data } = await apiClient.post("/api/data-preparation/generate", { register: true, ...body }, { timeout: 0 });
    return unwrapData(data);
  },

  async listDatasets() {
    const { data } = await apiClient.get("/api/data-preparation/datasets");
    return (data.datasets ?? []) as Array<Record<string, unknown>>;
  },

  async getDataset(id: string | number) {
    const { data } = await apiClient.get(`/api/data-preparation/datasets/${encodeURIComponent(String(id))}`);
    return unwrapData(data);
  },

  resolveDownloadUrl(id: string | number, format = "csv") {
    return `${API_BASE_URL}/api/data-preparation/datasets/${encodeURIComponent(String(id))}/download?format=${format}`;
  },

  async downloadDataset(id: string | number, format = "csv") {
    const res = await apiClient.get(`/api/data-preparation/datasets/${encodeURIComponent(String(id))}/download`, {
      params: { format },
      responseType: "blob",
      timeout: 0,
    });
    const disposition = res.headers["content-disposition"] as string | undefined;
    let filename = `dataset.${format === "xlsx" ? "xlsx" : format === "parquet" ? "parquet" : "csv"}`;
    if (disposition) {
      const match = /filename="?([^";\n]+)"?/i.exec(disposition);
      if (match?.[1]) filename = match[1];
    }
    return { blob: res.data as Blob, filename };
  },
};
