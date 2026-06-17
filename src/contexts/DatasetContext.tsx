import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACTIVE_DATASET_KEY,
  SELECTED_DATASETS_KEY,
  datasetsApi,
  mapDisplayNamesToIds,
  pickActiveDataset,
  resolveRegistryId,
  resolveSelectedDatasetIds,
  type DatasetRecord,
} from "@/lib/api/datasets";

interface DatasetContextValue {
  allDatasets: DatasetRecord[];
  selectedDatasetIds: string[];
  workspaceDatasets: DatasetRecord[];
  activeDataset: DatasetRecord | null;
  activeDatasetId: string | null;
  activeRegistryId: number | null;
  /** True only until the first successful dataset fetch completes. */
  loading: boolean;
  /** True while a background refresh is in progress (after initial load). */
  refreshing: boolean;
  switching: boolean;
  error: string | null;
  setActiveDataset: (datasetId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

function readActiveId(): string | null {
  try {
    const v = localStorage.getItem(ACTIVE_DATASET_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allDatasets, setAllDatasets] = useState<DatasetRecord[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [activeDataset, setActiveDatasetState] = useState<DatasetRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const workspaceDatasets = useMemo(
    () => allDatasets.filter((d) => selectedDatasetIds.includes(d.dataset_id)),
    [allDatasets, selectedDatasetIds],
  );

  const refresh = useCallback(async () => {
    const isInitial = !hasLoadedOnce.current;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [listRes, selectedRes] = await Promise.all([
        datasetsApi.listDatasets(),
        datasetsApi.getUserSelectedFiles().catch(() => ({ status: false, selected_files: [] as string[] })),
      ]);
      const datasets =
        listRes.status !== false && Array.isArray(listRes.datasets) ? listRes.datasets : [];
      setAllDatasets(datasets);

      let ids: string[] = [];
      if (selectedRes.status !== false) {
        ids = resolveSelectedDatasetIds(datasets, selectedRes);
      }

      if (!ids.length) {
        try {
          const stored = localStorage.getItem(SELECTED_DATASETS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === "string");
          }
        } catch {
          /* ignore */
        }
      }

      setSelectedDatasetIds(ids);
      if (ids.length) localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(ids));

      const workspace = datasets.filter((d) => ids.includes(d.dataset_id));
      const active = pickActiveDataset(workspace, ids, readActiveId());
      setActiveDatasetState(active);
      if (active) localStorage.setItem(ACTIVE_DATASET_KEY, active.dataset_id);
      hasLoadedOnce.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load datasets");
      if (isInitial) {
        setAllDatasets([]);
        setSelectedDatasetIds([]);
        setActiveDatasetState(null);
      }
    } finally {
      if (isInitial) setInitialLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else {
      setAllDatasets([]);
      setSelectedDatasetIds([]);
      setActiveDatasetState(null);
      hasLoadedOnce.current = false;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [user, refresh]);

  const setActiveDataset = useCallback(
    async (datasetId: string) => {
      const target = workspaceDatasets.find((d) => d.dataset_id === datasetId);
      if (!target || target.dataset_id === activeDataset?.dataset_id) return;
      setSwitching(true);
      setError(null);
      try {
        localStorage.setItem(ACTIVE_DATASET_KEY, datasetId);
        setActiveDatasetState(target);
        const names = allDatasets
          .filter((d) => selectedDatasetIds.includes(d.dataset_id))
          .map((d) => d.display_name);
        const reordered = [...names.filter((n) => n !== target.display_name), target.display_name];
        await datasetsApi.updateUserSelectedFiles(reordered);
        const ids = mapDisplayNamesToIds(allDatasets, reordered);
        setSelectedDatasetIds(ids);
        localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(ids));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to switch dataset");
      } finally {
        setSwitching(false);
      }
    },
    [activeDataset?.dataset_id, allDatasets, selectedDatasetIds, workspaceDatasets],
  );

  const value = useMemo(
    (): DatasetContextValue => ({
      allDatasets,
      selectedDatasetIds,
      workspaceDatasets,
      activeDataset,
      activeDatasetId: activeDataset?.dataset_id ?? null,
      activeRegistryId: resolveRegistryId(activeDataset),
      loading: initialLoading,
      refreshing,
      switching,
      error,
      setActiveDataset,
      refresh,
    }),
    [allDatasets, selectedDatasetIds, workspaceDatasets, activeDataset, initialLoading, refreshing, switching, error, setActiveDataset, refresh],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
  return ctx;
}

export const DATASET_SCOPED_ROUTES = [
  "/data-processing",
  "/data-quality",
  "/dashboard",
  "/data-modelling",
  "/vector-ai",
  "/bot",
  "/reports",
];

export function isDatasetScopedRoute(pathname: string) {
  return DATASET_SCOPED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
