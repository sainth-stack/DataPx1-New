import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Database,
  Plug,
  Upload,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  Link2,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { connectorCatalog, type Connector } from "@/data/machineData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataset } from "@/contexts/DatasetContext";
import {
  datasetsApi,
  mapDisplayNamesToIds,
  mapIdsToDisplayNames,
  resolveSelectedDatasetIds,
  matchUploadedToDatasets,
  formatUploadSuccess,
  formatProcessSuccess,
  SELECTED_DATASETS_KEY,
  ACTIVE_DATASET_KEY,
  type DatasetRecord,
  type UploadResult,
} from "@/lib/api/datasets";

const UPLOAD_ACCEPT = ".csv,.xlsx,.xls,.xml,.json";
const PREPARED_DATASETS_KEY = "datapx1.preparedDatasets";

const categoryColor: Record<Connector["category"], string> = {
  "ERP": "bg-accent/10 text-accent border-accent/20",
  "MES": "bg-purple/10 text-purple border-purple/20",
  "SCADA": "bg-teal/10 text-teal border-teal/20",
  "IoT / Telemetry": "bg-success/10 text-success border-success/20",
  "Database": "bg-warning/10 text-warning border-warning/20",
  "Cloud Storage": "bg-muted text-foreground border-border",
};

type DialogTab = "datasets" | "connectors" | "upload";

interface RawPreviewData {
  datasetId: string;
  totalRows: number;
  columns: Record<string, string>;
  rows: unknown[][];
}

function apiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function mergePreparedDatasets(datasets: DatasetRecord[]): DatasetRecord[] {
  try {
    const prepared = JSON.parse(localStorage.getItem(PREPARED_DATASETS_KEY) || "[]");
    if (!Array.isArray(prepared) || prepared.length === 0) return datasets;
    const existing = new Set(datasets.map((d) => d.display_name.toLowerCase()));
    const extras: DatasetRecord[] = prepared
      .filter((p: { name?: string }) => p.name && !existing.has(p.name.toLowerCase()))
      .map((p: { id?: string; name: string; source?: string }) => ({
        dataset_id: p.id || `prepared-${p.name}`,
        display_name: p.name,
        table_name: p.name,
        source: p.source ?? "prepared",
      }));
    return extras.length ? [...extras, ...datasets] : datasets;
  } catch {
    return datasets;
  }
}

function filterDatasets(list: DatasetRecord[], query: string): DatasetRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (d) =>
      d.display_name.toLowerCase().includes(q) ||
      (d.description ?? "").toLowerCase().includes(q) ||
      (d.source ?? "").toLowerCase().includes(q),
  );
}

export default function DataIngestion() {
  const { refresh: refreshDatasetContext } = useDataset();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [connectors, setConnectors] = useState<Connector[]>(connectorCatalog);

  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [dialogDraftIds, setDialogDraftIds] = useState<string[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [bulkRemoveDialog, setBulkRemoveDialog] = useState<null | { kind: "sources"; ids: string[] }>(null);

  const [datasetSearch, setDatasetSearch] = useState("");
  const [selectedSearch, setSelectedSearch] = useState("");

  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState<DialogTab>("datasets");

  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult["uploaded"]>([]);
  const [needsProcess, setNeedsProcess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DatasetRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RawPreviewData | null>(null);

  const [showApiDialog, setShowApiDialog] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    name: "",
    apiType: "REST",
    endpoint: "",
    authType: "API Key",
    apiKey: "",
    description: "",
  });
  const [configDialogConnector, setConfigDialogConnector] = useState<Connector | null>(null);
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");

  const loadDatasets = useCallback(async () => {
    setLoadingDatasets(true);
    let loaded: DatasetRecord[] = [];
    try {
      const [listRes, selectedRes] = await Promise.all([
        datasetsApi.listDatasets(),
        datasetsApi.getUserSelectedFiles(),
      ]);

      if (listRes.status !== false && Array.isArray(listRes.datasets)) {
        loaded = mergePreparedDatasets(listRes.datasets);
        setDatasets(loaded);
      } else {
        toast.error(listRes.message || "Could not load your datasets");
      }

      const ids =
        selectedRes.status !== false
          ? resolveSelectedDatasetIds(loaded, selectedRes)
          : [];
      setSelectedDatasetIds(ids);
      localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(ids));
      if (ids.length) {
        localStorage.setItem(ACTIVE_DATASET_KEY, ids[ids.length - 1]);
      }
      return loaded;
    } catch (err) {
      toast.error(apiError(err, "Failed to load your datasets"));
      return loaded;
    } finally {
      setLoadingDatasets(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    const loadPrepared = () => {
      void loadDatasets();
    };
    window.addEventListener("storage", loadPrepared);
    return () => window.removeEventListener("storage", loadPrepared);
  }, [loadDatasets]);


  const removeFromSelection = useCallback(
    async (datasetId: string) => {
      const prev = selectedDatasetIds;
      const next = prev.filter((id) => id !== datasetId);
      setSelectedDatasetIds(next);
      localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(next));
      if (next.length) {
        localStorage.setItem(ACTIVE_DATASET_KEY, next[next.length - 1]);
      } else {
        localStorage.removeItem(ACTIVE_DATASET_KEY);
      }
      try {
        const names = mapIdsToDisplayNames(datasets, next);
        await datasetsApi.updateUserSelectedFiles(names);
        toast.success("Dataset removed from selection");
        await refreshDatasetContext();
      } catch (err) {
        toast.error(apiError(err, "Failed to remove dataset"));
        setSelectedDatasetIds(prev);
        localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(prev));
      }
    },
    [datasets, selectedDatasetIds, refreshDatasetContext],
  );

  const clearAllSelection = useCallback(async () => {
    try {
      await datasetsApi.updateUserSelectedFiles([]);
      setSelectedDatasetIds([]);
      localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify([]));
      localStorage.removeItem(ACTIVE_DATASET_KEY);
      toast.success("All selections cleared");
      await refreshDatasetContext();
    } catch (err) {
      toast.error(apiError(err, "Failed to clear selection"));
    }
  }, [refreshDatasetContext]);

  const finishUpload = useCallback(
    async (uploaded: UploadResult["uploaded"]) => {
      let processOk = false;
      try {
        const processRes = await datasetsApi.processFiles();
        if (processRes.processed.length) {
          toast.success(formatProcessSuccess(processRes.processed));
          processOk = true;
        }
        if (processRes.failed.length) {
          toast.error(processRes.failed.map((f) => `${f.file}: ${f.message}`).join("; "));
          setNeedsProcess(true);
        }
        if (processRes.infoMessage && !processRes.processed.length && !processRes.failed.length) {
          toast.info(processRes.infoMessage);
          setNeedsProcess(true);
        }
      } catch (err) {
        toast.error(apiError(err, "Processing failed — try Process again from Upload"));
        setNeedsProcess(true);
      }

      const refreshed = await loadDatasets();
      const matched = matchUploadedToDatasets(refreshed, uploaded);
      const newIds = matched.map((d) => d.dataset_id);

      if (newIds.length && processOk) {
        const merged = [...new Set([...selectedDatasetIds, ...newIds])];
        setDialogDraftIds(merged);
        setSelectedDatasetIds(merged);
        localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(merged));
        localStorage.setItem(ACTIVE_DATASET_KEY, newIds[newIds.length - 1]);
        try {
          const names = mapIdsToDisplayNames(refreshed, merged);
          await datasetsApi.updateUserSelectedFiles(names);
          await refreshDatasetContext();
        } catch {
          /* selection saved locally */
        }
        toast.success(
          matched.length === 1
            ? `${matched[0].display_name} is ready — confirm selection below.`
            : `${matched.length} datasets ready — confirm selection below.`,
        );
      } else if (newIds.length && !processOk) {
        setDialogDraftIds([...selectedDatasetIds, ...newIds]);
        toast.warning("Upload saved but PostgreSQL ingest did not complete — use Process before analytics.");
      } else {
        setDialogDraftIds([...selectedDatasetIds]);
        toast.info("Upload complete — select your dataset from the list.");
      }

      setUploadedFiles(uploaded);
      setNeedsProcess(!processOk);
      setAddDialogTab("datasets");
      setDatasetSearch("");
    },
    [loadDatasets, refreshDatasetContext, selectedDatasetIds],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      setUploading(true);
      setUploadedFiles([]);
      try {
        const result = await datasetsApi.uploadFiles(Array.from(fileList), uploadDescription);
        if (result.uploaded.length) {
          toast.success(formatUploadSuccess(result.uploaded));
          await finishUpload(result.uploaded);
        } else if (result.errors.length) {
          toast.error(result.errors.map((e) => `${e.file}: ${e.message}`).join("; "));
        } else {
          toast.error(result.message || "Upload failed");
        }
      } catch (err) {
        toast.error(apiError(err, "Upload failed"));
      } finally {
        setUploading(false);
      }
    },
    [uploadDescription, finishUpload],
  );

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    try {
      const res = await datasetsApi.processFiles();
      if (res.infoMessage && !res.processed.length && !res.failed.length) {
        toast.info(res.infoMessage);
        return;
      }
      if (res.processed.length) {
        toast.success(formatProcessSuccess(res.processed));
        setNeedsProcess(false);
        const refreshed = await loadDatasets();
        if (uploadedFiles.length) {
          const matched = matchUploadedToDatasets(refreshed, uploadedFiles);
          const newIds = matched.map((d) => d.dataset_id);
          if (newIds.length) {
            const merged = [...new Set([...selectedDatasetIds, ...newIds])];
            setDialogDraftIds(merged);
            setSelectedDatasetIds(merged);
            localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(merged));
          }
        }
        setAddDialogTab("datasets");
        await refreshDatasetContext();
      }
      if (res.failed.length) {
        toast.error(res.failed.map((f) => `${f.file}: ${f.message}`).join("; "));
      }
    } catch (err) {
      toast.error(apiError(err, "Processing failed"));
    } finally {
      setProcessing(false);
    }
  }, [loadDatasets, refreshDatasetContext, selectedDatasetIds, uploadedFiles]);

  const handleDeleteDataset = useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.dataset_id);
    try {
      const res = await datasetsApi.deleteDataset(target.dataset_id);
      if (res.status === false) {
        toast.error(res.message || "Failed to delete dataset");
        return;
      }

      const nextSelected = selectedDatasetIds.filter((id) => id !== target.dataset_id);
      const nextDraft = dialogDraftIds.filter((id) => id !== target.dataset_id);
      setSelectedDatasetIds(nextSelected);
      setDialogDraftIds(nextDraft);
      localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(nextSelected));
      if (nextSelected.length) {
        localStorage.setItem(ACTIVE_DATASET_KEY, nextSelected[nextSelected.length - 1]);
      } else {
        localStorage.removeItem(ACTIVE_DATASET_KEY);
      }

      const remaining = datasets.filter((d) => d.dataset_id !== target.dataset_id);
      const names = mapIdsToDisplayNames(remaining, nextSelected);
      await datasetsApi.updateUserSelectedFiles(names);
      toast.success(res.message || `Deleted ${target.display_name}`);
      await loadDatasets();
      await refreshDatasetContext();
    } catch (err) {
      toast.error(apiError(err, "Failed to delete dataset"));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }, [deleteTarget, datasets, selectedDatasetIds, dialogDraftIds, loadDatasets, refreshDatasetContext]);

  const handlePreview = useCallback(async (dataset: DatasetRecord) => {
    setPreviewTitle(dataset.display_name);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await datasetsApi.getRawPreview(dataset.dataset_id, { limit: 12 });
      if (res.status !== false && res.data) {
        setPreviewData(res.data as RawPreviewData);
      } else {
        toast.error(res.message || "Preview unavailable");
        setPreviewOpen(false);
      }
    } catch (err) {
      toast.error(apiError(err, "Preview failed"));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const openAddDialog = (tab: DialogTab) => {
    setAddDialogTab(tab);
    if (tab === "upload") {
      setUploadedFiles([]);
      setNeedsProcess(false);
    }
    if (tab === "datasets") {
      setDialogDraftIds([...selectedDatasetIds]);
      setDatasetSearch("");
      void loadDatasets();
    }
    setShowAddSourceDialog(true);
  };

  const submitDialogSelection = async () => {
    setSavingSelection(true);
    try {
      const names = mapIdsToDisplayNames(datasets, dialogDraftIds);
      const res = await datasetsApi.updateUserSelectedFiles(names);
      if (res.status === false) {
        toast.error(res.message || "Could not save selection");
        return;
      }
      setSelectedDatasetIds([...dialogDraftIds]);
      localStorage.setItem(SELECTED_DATASETS_KEY, JSON.stringify(dialogDraftIds));
      if (dialogDraftIds.length) {
        localStorage.setItem(ACTIVE_DATASET_KEY, dialogDraftIds[dialogDraftIds.length - 1]);
      }
      setShowAddSourceDialog(false);
      toast.success(`${dialogDraftIds.length} dataset${dialogDraftIds.length === 1 ? "" : "s"} selected`);
      await refreshDatasetContext();
    } catch (err) {
      toast.error(apiError(err, "Failed to save selection"));
    } finally {
      setSavingSelection(false);
    }
  };

  const connectedConnectors = connectors.filter((c) => c.status === "Connected");
  const selectedDatasets = datasets.filter((d) => selectedDatasetIds.includes(d.dataset_id));
  const filteredSelected = filterDatasets(selectedDatasets, selectedSearch);
  const filteredAllDatasets = filterDatasets(datasets, datasetSearch);

  const allSourcesSelected =
    connectedConnectors.length > 0 && selectedSourceIds.length === connectedConnectors.length;
  const someSourcesSelected = selectedSourceIds.length > 0 && !allSourcesSelected;

  const toggleSourceSelected = (id: string) => {
    setSelectedSourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllSources = () => setSelectedSourceIds(connectedConnectors.map((c) => c.id));
  const clearSourceSelection = () => setSelectedSourceIds([]);

  const toggleDraftDataset = (id: string) => {
    setDialogDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  useEffect(() => {
    const connectedIds = new Set(connectors.filter((c) => c.status === "Connected").map((c) => c.id));
    setSelectedSourceIds((prev) => prev.filter((id) => connectedIds.has(id)));
  }, [connectors]);

  useEffect(() => {
    const ids = new Set(datasets.map((d) => d.dataset_id));
    setSelectedDatasetIds((prev) => {
      const next = prev.filter((id) => ids.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [datasets]);

  useEffect(() => {
    if (showAddSourceDialog && addDialogTab === "datasets") {
      setDialogDraftIds([...selectedDatasetIds]);
    }
  }, [selectedDatasetIds, showAddSourceDialog, addDialogTab]);

  const categories = ["All", ...Array.from(new Set(connectorCatalog.map((c) => c.category)))];
  const filtered = connectors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "All" || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const stats = {
    datasets: datasets.length,
    selectedDatasets: selectedDatasetIds.length,
    connected: connectedConnectors.length,
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleConfigSave = () => {
    if (!configDialogConnector) return;
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === configDialogConnector.id
          ? { ...c, status: "Connected", lastSync: "Just now", records: "Initialising…" }
          : c,
      ),
    );
    toast.success(`${configDialogConnector.name} connected`);
    setConfigDialogConnector(null);
    setEndpoint("");
    setApiKey("");
  };

  const handleDisconnect = (c: Connector) => {
    setConnectors((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, status: "Available", lastSync: undefined, records: undefined } : x,
      ),
    );
    setSelectedSourceIds((prev) => prev.filter((id) => id !== c.id));
    toast.success(`${c.name} removed from workspace`);
  };

  const applyBulkSourceRemoval = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setConnectors((prev) =>
      prev.map((x) =>
        ids.includes(x.id) ? { ...x, status: "Available", lastSync: undefined, records: undefined } : x,
      ),
    );
    setSelectedSourceIds((prev) => prev.filter((id) => !ids.includes(id)));
    toast.success(
      ids.length === 1 ? "1 source removed from workspace" : `${ids.length} sources removed from workspace`,
    );
  }, []);

  const confirmBulkRemove = () => {
    if (!bulkRemoveDialog) return;
    applyBulkSourceRemoval(bulkRemoveDialog.ids);
    setBulkRemoveDialog(null);
  };

  const handleApiConfigSave = () => {
    if (!apiConfig.name || !apiConfig.endpoint) {
      toast.error("Please fill in required fields (Name and Endpoint)");
      return;
    }
    const newConnector: Connector = {
      id: `custom_api_${Date.now()}`,
      name: apiConfig.name,
      category: "Database",
      description: apiConfig.description || `Custom ${apiConfig.apiType} API connector`,
      status: "Connected",
      lastSync: "Just now",
      records: "Initializing…",
      icon: "API",
    };
    setConnectors((prev) => [newConnector, ...prev]);
    toast.success(`Custom API connector "${apiConfig.name}" created successfully`);
    setShowApiDialog(false);
    setApiConfig({
      name: "",
      apiType: "REST",
      endpoint: "",
      authType: "API Key",
      apiKey: "",
      description: "",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Ingestion</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect industrial systems and upload datasets — all sources in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Datasets in workspace", value: stats.datasets, icon: Database, color: "text-accent" },
          { label: "Selected for analytics", value: stats.selectedDatasets, icon: FileSpreadsheet, color: "text-purple" },
          { label: "Connected integrations", value: stats.connected, icon: Plug, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="rounded-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Selected data sources
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Only connections you have added appear here. Use <span className="font-medium text-foreground">Add data source</span> to connect more.
            </p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => openAddDialog("connectors")}>
            <Plus className="h-4 w-4" />
            Add data source
          </Button>
        </div>

        {connectedConnectors.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
            <Database className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground">No data sources yet</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => openAddDialog("connectors")}>
              <Plus className="h-4 w-4" />
              Add data source
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xs text-muted-foreground">
                  {selectedSourceIds.length === 0
                    ? "Select sources to remove in bulk"
                    : `${selectedSourceIds.length} selected`}
                </span>
                {selectedSourceIds.length > 0 && (
                  <>
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearSourceSelection}>
                      <X className="h-3.5 w-3.5" />
                      Clear selection
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setBulkRemoveDialog({ kind: "sources", ids: [...selectedSourceIds] })}
                    >
                      Remove from workspace
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3">
              <DataTable
                columns={[
                  {
                    key: "_sel",
                    header: (
                      <Checkbox
                        checked={allSourcesSelected ? true : someSourcesSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => { if (v === true) selectAllSources(); else clearSourceSelection(); }}
                        aria-label="Select all data sources"
                      />
                    ),
                    width: 48,
                    render: (_v, c) => (
                      <Checkbox
                        checked={selectedSourceIds.includes((c as Connector).id)}
                        onCheckedChange={() => toggleSourceSelected((c as Connector).id)}
                      />
                    ),
                  },
                  {
                    key: "name",
                    header: "Source",
                    render: (v, c) => (
                      <div className="flex items-center gap-2 font-medium">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-[10px] font-bold">{(c as Connector).icon}</span>
                        <span className="text-sm">{String(v)}</span>
                      </div>
                    ),
                  },
                  { key: "category", header: "Category", render: (v) => <Badge variant="outline" className={`text-[10px] ${categoryColor[v as string]}`}>{String(v)}</Badge> },
                  {
                    key: "_sync",
                    header: "Sync status",
                    render: (_v, c) => (
                      <span className="text-xs text-muted-foreground">
                        <span className="text-success font-medium">●</span> {(c as Connector).records ?? "—"} · {(c as Connector).lastSync ?? "—"}
                      </span>
                    ),
                  },
                  {
                    key: "_actions",
                    header: "",
                    align: "right",
                    render: (_v, c) => (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDisconnect(c as Connector)}>Remove</Button>
                    ),
                  },
                ] as ColumnDef[]}
                rows={connectedConnectors}
                getRowKey={(c) => (c as Connector).id}
                rowClassName={(_v, i) => selectedSourceIds.includes((connectedConnectors[i] as Connector)?.id) ? "bg-muted/40" : undefined}
              />
            </div>
          </>
        )}
      </Card>

      <Card className="rounded-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              Selected datasets
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Datasets selected for analytics, processing, and AI workflows.
              {savingSelection ? (
                <span className="ml-1.5 inline-flex items-center gap-1 text-accent">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled={loadingDatasets} onClick={() => void loadDatasets()}>
              {loadingDatasets ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => openAddDialog("datasets")}>
              <Plus className="h-4 w-4" />
              Add datasets
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openAddDialog("upload")}>
              <Upload className="h-4 w-4" />
              Upload files
            </Button>
          </div>
        </div>

        {selectedDatasets.length > 0 && (
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search selected datasets…"
              value={selectedSearch}
              onChange={(e) => setSelectedSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}

        {loadingDatasets ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading datasets…
          </div>
        ) : selectedDatasetIds.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
            <Database className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground">No datasets selected</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Add datasets to your workspace for analytics and processing, or upload new files.
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button className="gap-2" onClick={() => openAddDialog("datasets")}>
                <Plus className="h-4 w-4" />
                Add datasets
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => openAddDialog("upload")}>
                <Upload className="h-4 w-4" />
                Upload files
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xs text-muted-foreground">
                  {selectedDatasetIds.length} dataset{selectedDatasetIds.length === 1 ? "" : "s"} selected
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => void clearAllSelection()} disabled={savingSelection}>
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </Button>
                {filteredSelected[0] && (
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => void handlePreview(filteredSelected[0])}>
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <DataTable
                columns={[
                  {
                    key: "display_name",
                    header: "Name",
                    render: (v, d) => (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 font-medium">
                          {(d as DatasetRecord).is_synthetic
                            ? <Database className="h-4 w-4 text-teal shrink-0" />
                            : <FileSpreadsheet className="h-4 w-4 text-success shrink-0" />}
                          <span className="text-sm">{String(v)}</span>
                        </div>
                        {(d as DatasetRecord).description
                          ? <span className="text-[11px] text-muted-foreground pl-6 line-clamp-1">{(d as DatasetRecord).description}</span>
                          : null}
                      </div>
                    ),
                  },
                  {
                    key: "source",
                    header: "Source",
                    render: (v, d) => (
                      <Badge variant="outline" className={`text-[10px] ${(d as DatasetRecord).is_synthetic ? "bg-teal/10 text-teal border-teal/20" : "bg-success/10 text-success border-success/20"}`}>
                        {String(v ?? "upload")}
                      </Badge>
                    ),
                  },
                  { key: "total_rows", header: "Rows", render: (v) => <span className="text-xs tabular-nums">{((v as number) ?? 0).toLocaleString()}</span> },
                  { key: "column_count", header: "Columns", render: (v) => <span className="text-xs text-muted-foreground">{String(v ?? "—")}</span> },
                  { key: "created_at", header: "Created", render: (v) => <span className="text-muted-foreground text-xs">{formatDate(String(v))}</span> },
                  {
                    key: "_actions",
                    header: "",
                    align: "right",
                    render: (_v, d) => (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => void handlePreview(d as DatasetRecord)}><Eye className="h-3.5 w-3.5" /> Preview</Button>
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => void removeFromSelection((d as DatasetRecord).dataset_id)} disabled={savingSelection}><X className="h-3.5 w-3.5" /> Remove</Button>
                      </div>
                    ),
                  },
                ] as ColumnDef[]}
                rows={filteredSelected}
                getRowKey={(d) => (d as DatasetRecord).dataset_id}
                emptyMessage="No selected datasets match your search."
              />
            </div>
            {filteredSelected.length === 0 && selectedDatasets.length > 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No selected datasets match your search.</p>
            )}
          </>
        )}
      </Card>

      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent className="max-w-4xl max-h-[90dvh] flex flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>
              {addDialogTab === "datasets"
                ? "Add datasets"
                : addDialogTab === "upload"
                  ? "Upload files"
                  : "Connect a data source"}
            </DialogTitle>
            <DialogDescription>
              {addDialogTab === "datasets"
                ? "Select or deselect datasets for your workspace. Click Submit to save your changes."
                : addDialogTab === "upload"
                  ? "Upload new files, then process them to add datasets to your workspace."
                  : "Connect ERP, MES, SCADA, telemetry, databases, or cloud storage."}
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={addDialogTab}
            onValueChange={(v) => {
              const tab = v as DialogTab;
              setAddDialogTab(tab);
              if (tab === "upload") {
                setUploadedFiles([]);
                setNeedsProcess(false);
              }
              if (tab === "datasets") {
                setDialogDraftIds([...selectedDatasetIds]);
                setDatasetSearch("");
                void loadDatasets();
              }
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b px-6 pt-2">
              <TabsList className="h-9 w-full justify-start bg-transparent p-0 flex-wrap">
                <TabsTrigger value="datasets" className="gap-2 rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 data-[state=active]:border-accent data-[state=active]:bg-transparent">
                  <Database className="h-4 w-4" />
                  Datasets
                </TabsTrigger>
                <TabsTrigger value="connectors" className="gap-2 rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 data-[state=active]:border-accent data-[state=active]:bg-transparent">
                  <Plug className="h-4 w-4" />
                  Connectors
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2 rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 data-[state=active]:border-accent data-[state=active]:bg-transparent">
                  <Upload className="h-4 w-4" />
                  File upload
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connectors" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <Card className="rounded-card p-4 bg-accent/5 border-accent/20 mb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">Generic API</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        No pre-built connector? Configure REST, GraphQL, or SOAP with your own endpoint and credentials.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => setShowApiDialog(true)}>
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Configure API
                    </Button>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search connectors…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`rounded-button border px-3 py-1.5 text-xs font-medium transition-colors ${
                          categoryFilter === cat
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  {filtered.map((c) => (
                    <Card key={c.id} className="rounded-card p-4 flex flex-col">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-muted text-foreground">
                          {c.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                            {c.status === "Connected" && <span className="h-2 w-2 rounded-full bg-success shrink-0" title="Connected" />}
                          </div>
                          <Badge variant="outline" className={`mt-1 text-[10px] ${categoryColor[c.category]}`}>{c.category}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-3">{c.description}</p>
                      <div className="flex items-center justify-between gap-2 pt-3 border-t">
                        {c.status === "Connected" ? (
                          <>
                            <div className="text-[11px] text-muted-foreground truncate">
                              <span className="text-success font-medium">●</span> {c.records} · {c.lastSync}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDisconnect(c)}>
                              Remove from workspace
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] text-muted-foreground">Not connected</span>
                            <Button size="sm" onClick={() => setConfigDialogConnector(c)}>
                              Connect
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="datasets" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search datasets…"
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingDatasets && datasets.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading datasets…
                  </div>
                ) : datasets.length === 0 ? (
                  <Card className="rounded-card p-8 text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">No datasets yet</p>
                    <p className="text-xs">Upload and process files, or refresh after creating a digital twin fleet.</p>
                  </Card>
                ) : filteredAllDatasets.length === 0 ? (
                  <Card className="rounded-card p-8 text-center text-sm text-muted-foreground">No datasets match your search.</Card>
                ) : (
                  <DataTable
                    columns={[
                      {
                        key: "_sel",
                        header: (
                          <Checkbox
                            checked={
                              filteredAllDatasets.length > 0 && filteredAllDatasets.every((d) => dialogDraftIds.includes(d.dataset_id))
                                ? true
                                : filteredAllDatasets.some((d) => dialogDraftIds.includes(d.dataset_id)) ? "indeterminate" : false
                            }
                            onCheckedChange={(v) => {
                              if (v === true) { const vis = filteredAllDatasets.map((d) => d.dataset_id); setDialogDraftIds((prev) => [...new Set([...prev, ...vis])]); }
                              else { const vis = new Set(filteredAllDatasets.map((d) => d.dataset_id)); setDialogDraftIds((prev) => prev.filter((id) => !vis.has(id))); }
                            }}
                            aria-label="Select all visible datasets"
                          />
                        ),
                        width: 48,
                        render: (_v, d) => (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={dialogDraftIds.includes((d as DatasetRecord).dataset_id)} onCheckedChange={() => toggleDraftDataset((d as DatasetRecord).dataset_id)} />
                          </div>
                        ),
                      },
                      {
                        key: "display_name",
                        header: "Name",
                        render: (v, d) => (
                          <div className="font-medium text-sm">
                            <span>{String(v)}</span>
                            {(d as DatasetRecord).description ? <p className="text-[11px] text-muted-foreground font-normal line-clamp-1 mt-0.5">{(d as DatasetRecord).description}</p> : null}
                          </div>
                        ),
                      },
                      { key: "source", header: "Source", render: (v) => <Badge variant="outline" className="text-[10px] capitalize">{String(v ?? "upload")}</Badge> },
                      { key: "total_rows", header: "Rows", align: "right", render: (v) => <span className="text-xs tabular-nums">{((v as number) ?? 0).toLocaleString()}</span> },
                      {
                        key: "_del",
                        header: "",
                        width: 48,
                        align: "right",
                        render: (_v, d) => (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${(d as DatasetRecord).display_name}`} disabled={deletingId === (d as DatasetRecord).dataset_id} onClick={() => setDeleteTarget(d as DatasetRecord)}>
                              {deletingId === (d as DatasetRecord).dataset_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        ),
                      },
                    ] as ColumnDef[]}
                    rows={filteredAllDatasets}
                    getRowKey={(d) => (d as DatasetRecord).dataset_id}
                    onRowClick={(d) => toggleDraftDataset((d as DatasetRecord).dataset_id)}
                    maxHeight={420}
                    rowClassName={(_v, i) => `cursor-pointer ${dialogDraftIds.includes((filteredAllDatasets[i] as DatasetRecord)?.dataset_id) ? "bg-muted/40" : ""}`}
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {dialogDraftIds.length} of {datasets.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={savingSelection || datasets.length === 0} onClick={() => setDialogDraftIds(datasets.map((d) => d.dataset_id))}>
                      Select all
                    </Button>
                    <Button variant="outline" size="sm" disabled={savingSelection || dialogDraftIds.length === 0} onClick={() => setDialogDraftIds([])}>
                      Clear all
                    </Button>
                    <Button size="sm" disabled={savingSelection} onClick={() => void submitDialogSelection()}>
                      {savingSelection ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <Label htmlFor="upload-desc">Description (optional)</Label>
                  <Input
                    id="upload-desc"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Applied to all files in this batch"
                    className="mt-1.5"
                  />
                </div>
                <Card
                  className={`rounded-card border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver ? "border-accent bg-accent/5" : "border-border"
                  } ${uploading ? "pointer-events-none opacity-70" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 animate-spin" />
                      <h3 className="text-sm font-semibold mb-1">Uploading…</h3>
                      <p className="text-xs text-muted-foreground">Sending files to the server</p>
                    </>
                  ) : uploadedFiles.length > 0 ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-3" />
                      <h3 className="text-sm font-semibold mb-1">Upload complete</h3>
                      {uploadedFiles.map((f) => (
                        <p className="text-xs text-muted-foreground" key={f.name}>
                          {f.name}
                          {f.rows != null && f.columns != null
                            ? ` · ${f.rows.toLocaleString()} rows · ${f.columns} columns`
                            : ""}
                        </p>
                      ))}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setAddDialogTab("datasets")}>
                        View in Datasets
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-sm font-semibold mb-1">Drag and drop files here</h3>
                      <p className="text-xs text-muted-foreground mb-4">CSV, XLSX, XML, or JSON — up to 500 MB per file</p>
                      <label>
                        <input
                          type="file"
                          multiple
                          accept={UPLOAD_ACCEPT}
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => void handleFiles(e.target.files)}
                        />
                        <Button asChild disabled={uploading}>
                          <span className="cursor-pointer">Browse files</span>
                        </Button>
                      </label>
                    </>
                  )}
                </Card>

                {needsProcess && (
                  <Card className="rounded-card p-4 border-accent/30 bg-accent/5">
                    <p className="text-sm font-medium">Files ready to ingest</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Run process to load temp uploads into PostgreSQL and refresh the dataset registry.
                    </p>
                    <Button className="mt-3 gap-2" disabled={processing} onClick={() => void handleProcess()}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      Process into database
                    </Button>
                  </Card>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Registered datasets appear under <span className="font-medium text-foreground">Selected datasets</span> after processing.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.display_name ?? "dataset"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the dataset, its PostgreSQL table, and related exports.
              {deleteTarget?.is_synthetic
                ? " This is a synthetic dataset — linked Digital Twin simulation data will also be removed."
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId !== null}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteDataset();
              }}
            >
              {deletingId ? "Deleting…" : "Delete dataset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRemoveDialog !== null} onOpenChange={(open) => !open && setBulkRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkRemoveDialog
                ? `Remove ${bulkRemoveDialog.ids.length} data source${bulkRemoveDialog.ids.length === 1 ? "" : "s"} from workspace?`
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              These integrations will be disconnected and disappear from your selected list. They remain in the catalog so you can reconnect later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmBulkRemove}
            >
              Remove from workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85dvh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview — {previewTitle}</DialogTitle>
            <DialogDescription>Sample rows from this dataset.</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading preview…
            </div>
          ) : previewData ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <p className="text-xs text-muted-foreground mb-3">
                {previewData.totalRows.toLocaleString()} total rows · showing {previewData.rows.length} · id{" "}
                <span className="font-mono">{previewData.datasetId}</span>
              </p>
              <DataTable
                columns={Object.keys(previewData.columns).map((col, j) => ({
                  key: String(j),
                  header: (
                    <span className="whitespace-nowrap">
                      <span className="font-medium">{col}</span>
                      <span className="block text-[10px] font-normal text-muted-foreground">{previewData.columns[col]}</span>
                    </span>
                  ),
                  render: (_v, row) => {
                    const cell = (row as unknown[])[j];
                    return <span className="text-xs max-w-[200px] truncate block">{cell == null ? "—" : String(cell)}</span>;
                  },
                }) as ColumnDef)}
                rows={previewData.rows.map((row) => Object.fromEntries(row.map((v, j) => [String(j), v])))}
                emptyMessage="No rows in this page"
                getRowKey={(_r, i) => i}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!configDialogConnector} onOpenChange={(open) => !open && setConfigDialogConnector(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {configDialogConnector?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="endpoint">Endpoint URL</Label>
              <Input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key / Token</Label>
              <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••" className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogConnector(null)}>Cancel</Button>
            <Button onClick={handleConfigSave}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Configure Generic API Connector
            </DialogTitle>
            <DialogDescription>
              Create a custom API connector for systems without pre-built integrations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="api-name">Connector Name *</Label>
                <Input
                  id="api-name"
                  value={apiConfig.name}
                  onChange={(e) => setApiConfig({ ...apiConfig, name: e.target.value })}
                  placeholder="e.g., Infor ERP, Custom SCADA"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="api-type">API Type</Label>
                <select
                  id="api-type"
                  value={apiConfig.apiType}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiType: e.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="REST">REST API</option>
                  <option value="GraphQL">GraphQL</option>
                  <option value="SOAP">SOAP</option>
                  <option value="Webhook">Webhook</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="api-endpoint">Base Endpoint URL *</Label>
              <Input
                id="api-endpoint"
                value={apiConfig.endpoint}
                onChange={(e) => setApiConfig({ ...apiConfig, endpoint: e.target.value })}
                placeholder="https://api.yoursystem.com/v1"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auth-type">Authentication Type</Label>
                <select
                  id="auth-type"
                  value={apiConfig.authType}
                  onChange={(e) => setApiConfig({ ...apiConfig, authType: e.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="API Key">API Key</option>
                  <option value="OAuth 2.0">OAuth 2.0</option>
                  <option value="Basic Auth">Basic Auth</option>
                  <option value="Bearer Token">Bearer Token</option>
                  <option value="None">None</option>
                </select>
              </div>
              <div>
                <Label htmlFor="api-key-input">API Key / Token</Label>
                <Input
                  id="api-key-input"
                  type="password"
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="api-description">Description (Optional)</Label>
              <Textarea
                id="api-description"
                value={apiConfig.description}
                onChange={(e) => setApiConfig({ ...apiConfig, description: e.target.value })}
                placeholder="Brief description of what data this connector provides..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiDialog(false)}>Cancel</Button>
            <Button onClick={handleApiConfigSave} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Create Connector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
