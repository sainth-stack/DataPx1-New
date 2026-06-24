import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataset } from "@/contexts/DatasetContext";
import { digitalTwinApi, type FleetMachine } from "@/lib/api/digitalTwin";
import type { DatasetScope } from "@/lib/api/scope";

export interface AnalyticsScopeValue {
  registryId: number | null;
  fileName: string | null;
  displayName: string | null;
  machines: FleetMachine[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  kpiScope: (machineTwinId: string) => DatasetScope;
  mlScope: (machineTwinId: string) => DatasetScope | null;
}

export function useAnalyticsScope(): AnalyticsScopeValue {
  const { activeRegistryId, activeDataset, loading: datasetInitialLoading } = useDataset();
  const [machines, setMachines] = useState<FleetMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const loadedScopeKeyRef = useRef<string | null>(null);

  const fileName =
    activeDataset?.display_name ??
    activeDataset?.table_name?.replace(/^user_\d+__/, "") ??
    null;
  const displayName = activeDataset?.display_name ?? fileName;

  const activeDatasetId = activeDataset?.dataset_id ?? null;
  const scopeKey =
    !datasetInitialLoading && activeRegistryId != null && activeDatasetId
      ? `${activeRegistryId}:${activeDatasetId}`
      : null;

  const refresh = useCallback(async () => {
    if (datasetInitialLoading) return;
    if (!activeRegistryId || !activeDatasetId) {
      setMachines([]);
      setLoading(false);
      setError("No active dataset. Select a dataset in Data Ingestion first.");
      hasLoadedOnce.current = false;
      loadedScopeKeyRef.current = null;
      return;
    }

    if (inflightRef.current) return inflightRef.current;

    const isInitial = !hasLoadedOnce.current;
    if (isInitial) setLoading(true);
    setError(null);

    const task = (async () => {
      try {
        const res = await digitalTwinApi.listFleets();
        const registryMachines =
          res.fleets?.flatMap((f) =>
            f.registry_id === String(activeRegistryId) || Number(f.registry_id) === activeRegistryId
              ? f.machines
              : [],
          ) ?? [];
        setMachines(registryMachines.length ? registryMachines : res.fleets?.flatMap((f) => f.machines) ?? []);
        hasLoadedOnce.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dataset scope");
        setMachines([]);
        hasLoadedOnce.current = false;
        loadedScopeKeyRef.current = null;
      } finally {
        if (isInitial) setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = task;
    return task;
  }, [activeRegistryId, activeDatasetId, datasetInitialLoading]);

  useEffect(() => {
    if (datasetInitialLoading) return;

    if (!scopeKey) {
      setMachines([]);
      setLoading(false);
      setError("No active dataset. Select a dataset in Data Ingestion first.");
      hasLoadedOnce.current = false;
      loadedScopeKeyRef.current = null;
      return;
    }

    if (loadedScopeKeyRef.current === scopeKey && hasLoadedOnce.current) {
      return;
    }

    loadedScopeKeyRef.current = scopeKey;
    void refresh();
  }, [scopeKey, datasetInitialLoading, refresh]);

  const kpiScope = useCallback(
    (machineTwinId: string): DatasetScope => {
      const base: DatasetScope = {
        registry_id: activeRegistryId ?? undefined,
        file_name: fileName ?? undefined,
      };
      if (machineTwinId === "all") {
        return { ...base, all_machines: true, scope: "fleet" };
      }
      return { ...base, machine_id: machineTwinId, twin_id: machineTwinId, scope: "machine" };
    },
    [activeRegistryId, fileName],
  );

  const mlScope = useCallback(
    (machineTwinId: string): DatasetScope | null => {
      if (!activeRegistryId || !fileName || !machineTwinId) return null;
      return {
        registry_id: activeRegistryId,
        file_name: fileName,
        machine_id: machineTwinId,
        twin_id: machineTwinId,
        scope: "machine",
      };
    },
    [activeRegistryId, fileName],
  );

  return useMemo(
    () => ({
      registryId: activeRegistryId,
      fileName,
      displayName,
      machines,
      loading: loading || datasetInitialLoading,
      error:
        error ??
        (activeRegistryId == null && !datasetInitialLoading
          ? "No active dataset. Select a dataset in Data Ingestion first."
          : null),
      refresh,
      kpiScope,
      mlScope,
    }),
    [
      activeRegistryId,
      fileName,
      displayName,
      machines,
      loading,
      datasetInitialLoading,
      error,
      refresh,
      kpiScope,
      mlScope,
    ],
  );
}
