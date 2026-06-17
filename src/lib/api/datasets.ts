import { apiClient } from "./client";

export interface DatasetRecord {
  dataset_id: string;
  display_name: string;
  table_name: string;
  registry_id?: number;
  is_synthetic?: boolean;
  description?: string;
  source?: string;
  total_rows?: number;
  column_count?: number;
  created_at?: string;
  simulation_status?: string;
}

export interface UploadResult {
  success: boolean;
  uploaded: Array<{ name: string; status: string; rows?: number; columns?: number }>;
  errors: Array<{ file: string; message: string }>;
  message?: string;
}

export interface ProcessFilesResult {
  processed: Array<{ file: string; message?: string }>;
  failed: Array<{ file: string; message: string }>;
  infoMessage?: string;
}

export interface SelectedFilesResponse {
  status?: boolean;
  selected_files?: string[];
  /** Display slug → registry id from backend */
  datasets?: Record<string, number>;
}

function normalizeUploadItem(raw: Record<string, unknown>): UploadResult["uploaded"][number] {
  return {
    name: String(raw.name ?? raw.fileId ?? ""),
    status: "uploaded",
    rows: typeof raw.rows === "number" ? raw.rows : undefined,
    columns: typeof raw.columns === "number" ? raw.columns : undefined,
  };
}

function normalizeUploadResponse(data: unknown): UploadResult {
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.data) || Array.isArray(d.errors)) {
    const items = Array.isArray(d.data)
      ? (d.data as Record<string, unknown>[]).map(normalizeUploadItem).filter((x) => x.name)
      : [];
    return {
      success: !!d.success || items.length > 0,
      uploaded: items,
      errors: (d.errors as UploadResult["errors"]) ?? [],
      message: d.message as string | undefined,
    };
  }
  const uploaded: UploadResult["uploaded"] = [];
  const errors: UploadResult["errors"] = [];
  for (const [name, status] of Object.entries((d.file_upload_status as Record<string, { status?: boolean; message?: string }>) ?? {})) {
    if (status.status) uploaded.push({ name, status: "uploaded" });
    else errors.push({ file: name, message: status.message || "Upload failed" });
  }
  for (const [file, message] of Object.entries((d.error_status as Record<string, string>) ?? {})) {
    errors.push({ file, message });
  }
  return { success: uploaded.length > 0 || !!d.success, uploaded, errors, message: d.message as string | undefined };
}

export const datasetsApi = {
  async listDatasets() {
    const { data } = await apiClient.get("/api/datasets");
    return data as { status?: boolean; datasets?: DatasetRecord[] };
  },

  async getRawPreview(datasetId: string, opts?: { limit?: number; offset?: number; machine_id?: string }) {
    const { data } = await apiClient.get(`/api/datasets/${encodeURIComponent(datasetId)}/raw`, {
      params: { limit: opts?.limit ?? 12, offset: opts?.offset ?? 0, machine_id: opts?.machine_id },
    });
    return data;
  },

  async uploadFiles(files: File[], description?: string): Promise<UploadResult> {
    const form = new FormData();
    files.forEach((f) => form.append("file", f));
    if (description?.trim()) {
      form.append("file_name_desc", description.trim());
      form.append("metadata", JSON.stringify({ description: description.trim() }));
    }
    const res = await apiClient.post("/api/file_upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0,
    });
    const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    return normalizeUploadResponse(parsed);
  },

  async processFiles(): Promise<ProcessFilesResult> {
    const { data } = await apiClient.post("/api/process_file/", {}, { timeout: 0 });
    return normalizeProcessResponse(data);
  },

  async getUserFiles() {
    const { data } = await apiClient.get("/api/get_user_files/");
    return data;
  },

  async getUserSelectedFiles() {
    const { data } = await apiClient.get("/api/get_user_selected_file_name");
    return data as SelectedFilesResponse;
  },

  async updateUserSelectedFiles(fileNames: string[]) {
    const { data } = await apiClient.post("/api/update_user_file_name", { file_name: fileNames });
    return data;
  },

  async deleteDataset(datasetId: string) {
    const { data } = await apiClient.delete(`/api/datasets/${encodeURIComponent(datasetId)}`);
    return data;
  },
};

export const SELECTED_DATASETS_KEY = "datapx1.selectedDatasetIds";
export const ACTIVE_DATASET_KEY = "datapx1.activeDatasetId";

export function resolveRegistryId(dataset: DatasetRecord | null): number | null {
  if (!dataset) return null;
  const id = dataset.registry_id ?? Number(dataset.dataset_id);
  return Number.isFinite(id) ? id : null;
}

export function mapDisplayNamesToIds(datasets: DatasetRecord[], names: string[]): string[] {
  const byName = new Map(datasets.map((d) => [d.display_name.toLowerCase(), d.dataset_id]));
  const byId = new Map(datasets.map((d) => [d.dataset_id, d.dataset_id]));
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const id = byName.get(name.toLowerCase()) ?? byId.get(name);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Resolve selection using backend registry map, then fall back to name matching. */
export function resolveSelectedDatasetIds(
  datasets: DatasetRecord[],
  selected: SelectedFilesResponse,
): string[] {
  const ids: string[] = [];
  const registryMap = selected.datasets ?? {};

  for (const name of selected.selected_files ?? []) {
    const slug = name.trim();
    if (!slug) continue;
    const regId = registryMap[slug];
    if (regId != null) {
      const match =
        datasets.find((d) => d.registry_id === regId) ??
        datasets.find((d) => d.dataset_id === String(regId));
      const id = match?.dataset_id ?? String(regId);
      if (!ids.includes(id)) ids.push(id);
    }
  }

  for (const id of mapDisplayNamesToIds(datasets, selected.selected_files ?? [])) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function normalizeProcessResponse(data: unknown): ProcessFilesResult {
  if (!data || typeof data !== "object") {
    return { processed: [], failed: [], infoMessage: "Invalid process response" };
  }

  const d = data as Record<string, unknown>;
  if (Array.isArray(d.processed) || Array.isArray(d.failed)) {
    return {
      processed: (d.processed as ProcessFilesResult["processed"]) ?? [],
      failed: (d.failed as ProcessFilesResult["failed"]) ?? [],
      infoMessage: typeof d.infoMessage === "string" ? d.infoMessage : undefined,
    };
  }

  if (d.status === false || d.success === false) {
    return {
      processed: [],
      failed: [{ file: "process", message: String(d.message ?? "Processing failed") }],
    };
  }

  if (typeof d.message === "string" && !Object.keys(d).some((k) => k.includes("."))) {
    if (d.message === "No files found") {
      return { processed: [], failed: [], infoMessage: d.message };
    }
  }

  const processed: ProcessFilesResult["processed"] = [];
  const failed: ProcessFilesResult["failed"] = [];

  for (const [file, val] of Object.entries(d)) {
    if (["status", "success", "message"].includes(file)) continue;
    if (typeof val !== "object" || val === null) continue;
    const entry = val as Record<string, unknown>;
    const ok = entry.status === true || entry.status === "true";
    if (ok) {
      processed.push({
        file,
        message: String(entry.message ?? "Ingested into PostgreSQL"),
      });
    } else {
      failed.push({
        file,
        message: String(entry.message ?? "Processing failed"),
      });
    }
  }

  if (!processed.length && !failed.length && typeof d.message === "string") {
    return { processed: [], failed: [], infoMessage: d.message };
  }

  return { processed, failed };
}

export function mapIdsToDisplayNames(datasets: DatasetRecord[], ids: string[]): string[] {
  const idSet = new Set(ids);
  return datasets.filter((d) => idSet.has(d.dataset_id)).map((d) => d.display_name);
}

function stripFileExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, "").trim();
}

export function matchUploadedToDatasets(
  datasets: DatasetRecord[],
  uploaded: Array<{ name: string }>,
): DatasetRecord[] {
  const stems = uploaded.map((u) => stripFileExtension(u.name).toLowerCase());
  if (!stems.length) return [];
  return datasets.filter((d) => {
    const display = d.display_name.toLowerCase();
    const table = d.table_name.toLowerCase();
    return stems.some(
      (stem) => display === stem || table.endsWith(`__${stem}`) || table.includes(`__${stem}`),
    );
  });
}

export function formatUploadSuccess(
  uploaded: Array<{ name: string; status?: string; rows?: number; columns?: number }>,
): string {
  if (!uploaded.length) return "Upload failed";
  const describe = (f: (typeof uploaded)[number]) => {
    const dims =
      f.rows != null && f.columns != null
        ? ` (${f.rows.toLocaleString()} rows, ${f.columns} columns)`
        : "";
    return `${f.name}${dims}`;
  };
  const suffix = " Ingesting into PostgreSQL…";
  if (uploaded.length === 1) {
    return `${describe(uploaded[0])} uploaded successfully.${suffix}`;
  }
  return `${uploaded.length} files uploaded: ${uploaded.map(describe).join("; ")}.${suffix}`;
}

export function formatProcessSuccess(
  processed: Array<{ file: string; message?: string }>,
): string {
  if (!processed.length) return "Processing complete";
  if (processed.length === 1) {
    const item = processed[0];
    return `${item.file} ingested — ${item.message ?? "Ingested into dataset registry"}`;
  }
  return `${processed.length} files ingested into the dataset registry`;
}

export function pickActiveDataset(
  workspace: DatasetRecord[],
  selectedIds: string[],
  preferredId: string | null,
): DatasetRecord | null {
  if (!workspace.length) return null;
  if (preferredId) {
    const match = workspace.find((d) => d.dataset_id === preferredId);
    if (match) return match;
  }
  if (selectedIds.length) {
    const last = selectedIds[selectedIds.length - 1];
    const match = workspace.find((d) => d.dataset_id === last);
    if (match) return match;
  }
  return workspace[0];
}
