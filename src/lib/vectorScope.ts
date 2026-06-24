import type { RegistryScope } from "@/lib/api/scope";
import type { DatasetRecord } from "@/lib/api/datasets";
import { resolveRegistryId } from "@/lib/api/datasets";

export type VectorDatasetScope = "single" | "multi" | "all";

export interface VectorDatasetOption {
  registryId: number;
  displayName: string;
  datasetId: string;
}

const STORAGE_PREFIX = "datapx1.vectorAi.registryIds";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function workspaceToVectorOptions(datasets: DatasetRecord[]): VectorDatasetOption[] {
  return datasets
    .map((ds) => {
      const registryId = resolveRegistryId(ds);
      if (registryId == null) return null;
      return {
        registryId,
        displayName: ds.display_name,
        datasetId: ds.dataset_id,
      };
    })
    .filter((o): o is VectorDatasetOption => o != null);
}

export function readStoredRegistrySelection(userId: string | undefined): number[] | null {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(Number).filter((n) => Number.isFinite(n));
  } catch {
    return null;
  }
}

export function writeStoredRegistrySelection(userId: string | undefined, ids: number[]) {
  if (!userId) return;
  sessionStorage.setItem(storageKey(userId), JSON.stringify(ids));
}

export function buildVectorRegistryScope(
  selectedIds: number[],
  totalWorkspaceCount: number,
  refresh = false,
): RegistryScope {
  const base: RegistryScope = refresh ? { refresh: true } : {};
  if (!selectedIds.length || (totalWorkspaceCount > 0 && selectedIds.length >= totalWorkspaceCount)) {
    return { ...base, registry_id: "all" };
  }
  if (selectedIds.length === 1) {
    return { ...base, registry_id: selectedIds[0] };
  }
  return { ...base, registry_id: selectedIds.join(",") };
}

export function vectorSelectionLabel(
  selectedIds: number[],
  options: VectorDatasetOption[],
  aggregatedDisplayName?: string,
): string {
  if (aggregatedDisplayName?.trim()) return aggregatedDisplayName;
  if (!selectedIds.length) return "Select datasets";
  if (options.length && selectedIds.length >= options.length) {
    return `All datasets (${options.length})`;
  }
  if (selectedIds.length === 1) {
    const match = options.find((o) => o.registryId === selectedIds[0]);
    return match?.displayName ?? "1 dataset";
  }
  return `${selectedIds.length} datasets`;
}

export function parseVectorDatasetScope(raw: unknown): VectorDatasetScope {
  if (raw === "multi" || raw === "all" || raw === "single") return raw;
  return "single";
}
