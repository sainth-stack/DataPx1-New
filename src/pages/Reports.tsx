import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Download, FileText, Activity, Thermometer, Waves, Search, FileSpreadsheet,
  Plus, Sparkles, Trash2, Wand2, X, BarChart3, TrendingUp, AlertCircle, CheckCircle2,
  Brain, Cpu, MessageSquare, Zap, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDataset } from "@/contexts/DatasetContext";
import { reportsApi } from "@/lib/api/reports";
import {
  type AgentLog, type PerfRow, type SensorRow,
  mapReportRows, REPORT_SOURCE_API, REPORT_SOURCE_UI, toApiColumns,
} from "@/lib/reportsMappers";

// -------- Types & catalog (columns only; rows from API) --------

// -------- CSV helpers --------
function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
}
function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Report exported successfully: ${filename}`);
}

const levelBadge: Record<AgentLog["level"], string> = {
  info:  "bg-accent/10 text-accent border-accent/30",
  warn:  "bg-warning/10 text-warning border-warning/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};
const statusBadge: Record<SensorRow["status"], string> = {
  normal: "bg-success/10 text-success border-success/30",
  watch:  "bg-warning/10 text-warning border-warning/30",
  alert:  "bg-destructive/10 text-destructive border-destructive/30",
};

// -------- Report builder catalog --------
type SourceKey = "agents" | "perf" | "sensors";

const sourceCatalog: Record<SourceKey, {
  label: string;
  description: string;
  columns: { key: string; label: string }[];
}> = {
  agents: {
    label: "Agent Intelligence Logs",
    description: "Autonomous decision-making, predictive alerts, and automated actions from AI agents",
    columns: [
      { key: "ts", label: "Timestamp" },
      { key: "agent", label: "Agent Name" },
      { key: "level", label: "Priority Level" },
      { key: "asset", label: "Asset ID" },
      { key: "message", label: "Action Description" },
    ],
  },
  perf: {
    label: "Asset Performance Metrics",
    description: "Overall Equipment Effectiveness (OEE), availability, performance efficiency, quality scores, and production output",
    columns: [
      { key: "asset", label: "Asset ID" },
      { key: "shift", label: "Shift" },
      { key: "oee", label: "OEE Score (%)" },
      { key: "availability", label: "Availability (%)" },
      { key: "performance", label: "Performance (%)" },
      { key: "quality", label: "Quality (%)" },
      { key: "output", label: "Total Output (units)" },
    ],
  },
  sensors: {
    label: "Sensor Diagnostics Data",
    description: "Real-time temperature and vibration telemetry with health status indicators",
    columns: [
      { key: "ts", label: "Timestamp" },
      { key: "asset", label: "Asset ID" },
      { key: "thermalC", label: "Temperature (°C)" },
      { key: "vibrationG", label: "Vibration (g)" },
      { key: "status", label: "Health Status" },
    ],
  },
};

interface TabMeta {
  title: string;
  subtitle: string;
  count: number;
}

interface TabState {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  meta: TabMeta;
}

const defaultTabMeta: Record<SourceKey, TabMeta> = {
  agents: { title: "Autonomous Agent Actions", subtitle: "Last 7 days", count: 0 },
  perf: { title: "Asset Performance Metrics", subtitle: "Current dataset", count: 0 },
  sensors: { title: "Sensor Diagnostic Readings", subtitle: "Latest events", count: 0 },
};

interface GeneratedReport {
  id: string;
  title: string;
  source: string;
  prompt: string;
  columns: string[];
  rows: Record<string, unknown>[];
  recordCount: number;
  createdAt: string;
}

const ROW_PREVIEW_LIMIT = 100;

export default function Reports() {
  const { activeRegistryId, activeDataset, loading: datasetLoading, error: datasetError } = useDataset();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<GeneratedReport[]>([]);
  const [activeTab, setActiveTab] = useState("agents");
  const [refreshing, setRefreshing] = useState(false);

  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [performanceRows, setPerformanceRows] = useState<PerfRow[]>([]);
  const [sensorRows, setSensorRows] = useState<SensorRow[]>([]);

  const [tabState, setTabState] = useState<Record<SourceKey, TabState>>({
    agents: { loaded: false, loading: false, error: null, meta: defaultTabMeta.agents },
    perf: { loaded: false, loading: false, error: null, meta: defaultTabMeta.perf },
    sensors: { loaded: false, loading: false, error: null, meta: defaultTabMeta.sensors },
  });

  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customLoaded, setCustomLoaded] = useState(false);

  // Builder form state
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<SourceKey>("perf");
  const [prompt, setPrompt] = useState("");
  const [selectedCols, setSelectedCols] = useState<string[]>(
    sourceCatalog.perf.columns.map(c => c.key)
  );
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [customColumnInput, setCustomColumnInput] = useState("");
  const [generating, setGenerating] = useState(false);

  const currentCatalog = sourceCatalog[source];
  const displayName = activeDataset?.display_name ?? null;

  const patchTab = useCallback((key: SourceKey, patch: Partial<TabState>) => {
    setTabState(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const loadAgents = useCallback(async (force = false) => {
    if (tabState.agents.loading || (tabState.agents.loaded && !force)) return;
    patchTab("agents", { loading: true, error: null });
    try {
      const res = await reportsApi.getAgentIntelligence({});
      const records = (res.data?.records ?? []) as Record<string, unknown>[];
      const mapped = mapReportRows("agents", records) as AgentLog[];
      setAgentLogs(mapped);
      const range = res.data?.dateRange as { start?: string; end?: string } | undefined;
      const subtitle = range?.start && range?.end ? `${range.start} → ${range.end}` : "Last 7 days";
      patchTab("agents", {
        loaded: true,
        loading: false,
        meta: {
          title: "Autonomous Agent Actions",
          subtitle,
          count: res.data?.total ?? mapped.length,
        },
      });
    } catch (err) {
      patchTab("agents", { loading: false, error: reportsApi.extractMessage(err) });
    }
  }, [patchTab, tabState.agents.loading, tabState.agents.loaded]);

  const loadPerf = useCallback(async (force = false) => {
    if (!activeRegistryId) {
      patchTab("perf", { loaded: true, loading: false, error: null });
      return;
    }
    if (tabState.perf.loading || (tabState.perf.loaded && !force)) return;
    patchTab("perf", { loading: true, error: null });
    try {
      const res = await reportsApi.getAssetPerformance(activeRegistryId);
      const records = (res.data?.records ?? []) as Record<string, unknown>[];
      const mapped = mapReportRows("perf", records) as PerfRow[];
      setPerformanceRows(mapped);
      const summary = res.data?.summary as { avgOEE?: number } | undefined;
      patchTab("perf", {
        loaded: true,
        loading: false,
        meta: {
          title: "Asset Performance Metrics",
          subtitle: summary?.avgOEE != null ? `Avg OEE ${summary.avgOEE}%` : displayName ?? "Active dataset",
          count: res.data?.total ?? mapped.length,
        },
      });
    } catch (err) {
      patchTab("perf", { loading: false, error: reportsApi.extractMessage(err) });
    }
  }, [activeRegistryId, displayName, patchTab, tabState.perf.loading, tabState.perf.loaded]);

  const loadSensors = useCallback(async (force = false) => {
    if (!activeRegistryId) {
      patchTab("sensors", { loaded: true, loading: false, error: null });
      return;
    }
    if (tabState.sensors.loading || (tabState.sensors.loaded && !force)) return;
    patchTab("sensors", { loading: true, error: null });
    try {
      const res = await reportsApi.getSensorDiagnostics(activeRegistryId);
      const records = (res.data?.records ?? []) as Record<string, unknown>[];
      const mapped = mapReportRows("sensors", records) as SensorRow[];
      setSensorRows(mapped);
      const summary = res.data?.summary as { alerts?: number; watches?: number } | undefined;
      const parts: string[] = [];
      if (summary?.alerts) parts.push(`${summary.alerts} alerts`);
      if (summary?.watches) parts.push(`${summary.watches} watch`);
      patchTab("sensors", {
        loaded: true,
        loading: false,
        meta: {
          title: "Sensor Diagnostic Readings",
          subtitle: parts.length ? parts.join(", ") : "Latest events",
          count: res.data?.total ?? mapped.length,
        },
      });
    } catch (err) {
      patchTab("sensors", { loading: false, error: reportsApi.extractMessage(err) });
    }
  }, [activeRegistryId, patchTab, tabState.sensors.loading, tabState.sensors.loaded]);

  const loadCustomReports = useCallback(async (force = false) => {
    if (customLoading && !force) return;
    setCustomLoading(true);
    setCustomError(null);
    try {
      const list = await reportsApi.listCustomReports();
      setGenerated(prev => {
        const cached = new Map(prev.filter(r => r.rows.length).map(r => [r.id, r]));
        return (list as Record<string, unknown>[]).map(item => ({
          id: String(item.id),
          title: String(item.title),
          source: String(item.source),
          prompt: String(item.prompt ?? ""),
          recordCount: Number(item.recordCount ?? 0),
          createdAt: String(item.createdAt ?? new Date().toISOString()),
          rows: (cached.get(String(item.id))?.rows ?? (item.records as Record<string, unknown>[] | undefined) ?? []) as Record<string, unknown>[],
          columns: cached.get(String(item.id))?.columns ?? selectedCols,
        }));
      });
      setCustomLoaded(true);
    } catch (err) {
      setCustomError(reportsApi.extractMessage(err));
    } finally {
      setCustomLoading(false);
    }
  }, [customLoading, selectedCols]);

  const prevRegistryRef = useRef<number | null>(null);
  useEffect(() => {
    if (datasetLoading) return;
    if (activeTab === "agents") void loadAgents();
    else if (activeTab === "perf") void loadPerf();
    else if (activeTab === "sensors") void loadSensors();
    else if (activeTab === "custom") void loadCustomReports();
  }, [activeTab, datasetLoading, activeRegistryId, loadAgents, loadPerf, loadSensors, loadCustomReports]);

  useEffect(() => {
    if (datasetLoading) return;
    if (prevRegistryRef.current !== activeRegistryId) {
      prevRegistryRef.current = activeRegistryId;
      setTabState({
        agents: { loaded: false, loading: false, error: null, meta: defaultTabMeta.agents },
        perf: { loaded: false, loading: false, error: null, meta: defaultTabMeta.perf },
        sensors: { loaded: false, loading: false, error: null, meta: defaultTabMeta.sensors },
      });
      if (activeTab === "perf" && activeRegistryId) void loadPerf(true);
      if (activeTab === "sensors" && activeRegistryId) void loadSensors(true);
    }
  }, [activeRegistryId, datasetLoading, activeTab, loadPerf, loadSensors]);

  const handleRefreshAll = async () => {
    if (!activeRegistryId) {
      toast.error("Select a dataset before refreshing reports");
      return;
    }
    setRefreshing(true);
    try {
      await reportsApi.syncAnalytics(activeRegistryId, true);
      setTabState({
        agents: { loaded: false, loading: false, error: null, meta: defaultTabMeta.agents },
        perf: { loaded: false, loading: false, error: null, meta: defaultTabMeta.perf },
        sensors: { loaded: false, loading: false, error: null, meta: defaultTabMeta.sensors },
      });
      setCustomLoaded(false);
      toast.success("Analytics snapshot refreshed");
      if (activeTab === "agents") await loadAgents(true);
      else if (activeTab === "perf") await loadPerf(true);
      else if (activeTab === "sensors") await loadSensors(true);
      else if (activeTab === "custom") await loadCustomReports(true);
    } catch (err) {
      toast.error(reportsApi.extractMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPrompt("");
    setSource("perf");
    setSelectedCols(sourceCatalog.perf.columns.map(c => c.key));
    setCustomColumns([]);
    setCustomColumnInput("");
  };

  const handleCustomColumnInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = customColumnInput.trim();
      if (value && !customColumns.includes(value)) {
        setCustomColumns([...customColumns, value]);
        setCustomColumnInput("");
      }
    }
  };

  const removeCustomColumn = (col: string) => {
    setCustomColumns(customColumns.filter(c => c !== col));
  };

  const handleCustomColumnBlur = () => {
    const value = customColumnInput.trim();
    if (value && !customColumns.includes(value)) {
      setCustomColumns([...customColumns, value]);
      setCustomColumnInput("");
    }
  };

  const onSourceChange = (val: SourceKey) => {
    setSource(val);
    setSelectedCols(sourceCatalog[val].columns.map(c => c.key));
  };

  const toggleCol = (key: string) => {
    setSelectedCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    const t = title.trim();
    if (!t) return toast.error("Please enter a report title");
    if (t.length > 80) return toast.error("Title must be under 80 characters");
    if (!selectedCols.length) return toast.error("Please select at least one column");
    if (prompt.length > 500) return toast.error("Prompt must be under 500 characters");
    if (!activeRegistryId) return toast.error("Select an active dataset before creating a custom report");

    setGenerating(true);
    try {
      const created = await reportsApi.createCustomReport({
        title: t,
        source: REPORT_SOURCE_API[source],
        registry_id: activeRegistryId,
        prompt: prompt.trim(),
        columns: toApiColumns(selectedCols),
        customColumns: customColumns,
      });
      const report: GeneratedReport = {
        id: String(created.reportId),
        title: t,
        source: REPORT_SOURCE_API[source],
        prompt: prompt.trim(),
        columns: selectedCols,
        rows: (created.records ?? []) as Record<string, unknown>[],
        recordCount: Number(created.recordCount ?? created.records?.length ?? 0),
        createdAt: String(created.generatedAt ?? new Date().toISOString()),
      };
      setGenerated(prev => [report, ...prev.filter(r => r.id !== report.id)]);
      setOpen(false);
      resetForm();
      setActiveTab("custom");
      toast.success(`Custom report "${t}" created with ${report.recordCount} record(s)`);
    } catch (err) {
      toast.error(reportsApi.extractMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await reportsApi.deleteCustomReport(id);
      setGenerated(prev => prev.filter(r => r.id !== id));
      toast.success("Report deleted successfully");
    } catch (err) {
      toast.error(reportsApi.extractMessage(err));
    }
  };

  const downloadCustomReport = async (report: GeneratedReport) => {
    try {
      await reportsApi.downloadCustomReportCsv(report.id, `${report.title.replace(/\s+/g, "-").toLowerCase()}.csv`);
      toast.success("Download started");
    } catch (err) {
      toast.error(reportsApi.extractMessage(err));
    }
  };

  const logs = useMemo(
    () => agentLogs.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())),
    [agentLogs, q]
  );
  const perf = useMemo(
    () => performanceRows.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())),
    [performanceRows, q]
  );
  const sensors = useMemo(
    () => sensorRows.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())),
    [sensorRows, q]
  );

  const logsPreview = useMemo(() => logs.slice(0, ROW_PREVIEW_LIMIT), [logs]);
  const perfPreview = useMemo(() => perf.slice(0, ROW_PREVIEW_LIMIT), [perf]);
  const sensorsPreview = useMemo(() => sensors.slice(0, ROW_PREVIEW_LIMIT), [sensors]);

  const renderTabLoader = (label: string) => (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Loading {label}…</p>
    </div>
  );

  const renderTabError = (message: string, onRetry: () => void) => (
    <Alert variant="destructive" className="rounded-xl">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Could not load report</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{message}</span>
        <Button variant="outline" size="sm" className="w-fit rounded-lg" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  const renderDatasetRequired = () => (
    <Alert className="rounded-xl border-amber-500/30 bg-amber-500/5">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle>Dataset required</AlertTitle>
      <AlertDescription>
        Select an active dataset in Data Ingestion or Data Processing{displayName ? ` (current: ${displayName})` : ""} before loading this report.
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Live operational reports from your active dataset and agent activity. Generate custom insights and export data seamlessly.
            </p>
          </div>
        </div>
          <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search across loaded reports..." 
              className="pl-9 h-11 rounded-xl border-muted-foreground/20" 
              value={q} 
              onChange={e => setQ(e.target.value)} 
            />
          </div>
          <Button
            variant="outline"
            size="default"
            className="rounded-xl gap-2 h-11"
            disabled={refreshing || datasetLoading || !activeRegistryId}
            onClick={() => void handleRefreshAll()}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button size="default" className="rounded-xl gap-2 px-5 shadow-lg shadow-primary/20 h-11" onClick={() => setOpen(true)}>
            <Zap className="h-4 w-4" /> Create Custom Report
          </Button>
        </div>
      </div>

      {datasetLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Resolving active dataset…
        </div>
      ) : datasetError ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dataset scope error</AlertTitle>
          <AlertDescription>{datasetError}</AlertDescription>
        </Alert>
      ) : activeRegistryId ? (
        <div className="text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2 w-fit">
          Active dataset: <span className="font-semibold text-foreground">{displayName ?? activeRegistryId}</span>
          <span className="text-muted-foreground/60"> (registry #{activeRegistryId})</span>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full lg:w-auto h-12">
          <TabsTrigger value="agents" className="gap-2 data-[state=active]:shadow-sm">
            <Brain className="h-4 w-4" /> 
            <span className="hidden sm:inline">Agent Intelligence</span>
            <span className="sm:hidden">Agents</span>
          </TabsTrigger>
          <TabsTrigger value="perf" className="gap-2 data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" /> 
            <span className="hidden sm:inline">Asset Performance</span>
            <span className="sm:hidden">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="sensors" className="gap-2 data-[state=active]:shadow-sm">
            <Cpu className="h-4 w-4" /> 
            <span className="hidden sm:inline">Sensor Diagnostics</span>
            <span className="sm:hidden">Sensors</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2 data-[state=active]:shadow-sm">
            <Zap className="h-4 w-4" /> 
            <span className="hidden sm:inline">Custom Reports</span>
            <span className="sm:hidden">Custom</span>
            {generated.length > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-xs font-semibold ml-1">{generated.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agent Intelligence */}
        <TabsContent value="agents" className="mt-5 space-y-4">
          {tabState.agents.loading && renderTabLoader("agent intelligence")}
          {tabState.agents.error && renderTabError(tabState.agents.error, () => void loadAgents(true))}
          {!tabState.agents.loading && !tabState.agents.error && (
          <>
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">{tabState.agents.meta.count} {tabState.agents.meta.title}</p>
                <p className="text-xs text-muted-foreground">{tabState.agents.meta.subtitle}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg shadow-sm gap-2" disabled={!logs.length} onClick={() => downloadCsv("agent-intelligence-report.csv", logs)}>
              <Download className="h-4 w-4" /> Export to CSV
            </Button>
          </div>
          {logs.length > ROW_PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground">Showing first {ROW_PREVIEW_LIMIT} of {logs.length} rows. Export CSV for the full dataset.</p>
          )}
          <DataTable
            columns={[
              { key: "ts", header: "Timestamp", render: (v) => <span className="text-xs font-mono text-muted-foreground">{String(v)}</span> },
              { key: "agent", header: "Agent Name", render: (v) => <span className="font-semibold">{String(v)}</span> },
              {
                key: "level",
                header: "Priority",
                render: (v) => (
                  <Badge variant="outline" className={`capitalize font-medium ${levelBadge[v as string]}`}>
                    {v === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {v === "info" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {String(v)}
                  </Badge>
                ),
              },
              { key: "asset", header: "Asset ID", render: (v) => <span className="text-muted-foreground font-medium">{String(v)}</span> },
              { key: "message", header: "Action Description" },
            ] as ColumnDef[]}
            rows={logsPreview}
            emptyMessage="No agent actions in this period."
            getRowKey={(_r, i) => i}
          />
          </>
          )}
        </TabsContent>

        {/* Asset Performance */}
        <TabsContent value="perf" className="mt-5 space-y-4">
          {!activeRegistryId && !datasetLoading ? renderDatasetRequired() : tabState.perf.loading ? renderTabLoader("asset performance") : tabState.perf.error ? renderTabError(tabState.perf.error, () => void loadPerf(true)) : (
          <>
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold">{tabState.perf.meta.count} {tabState.perf.meta.title}</p>
                <p className="text-xs text-muted-foreground">{tabState.perf.meta.subtitle}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg shadow-sm gap-2" disabled={!perf.length} onClick={() => downloadCsv("asset-performance-report.csv", perf)}>
              <Download className="h-4 w-4" /> Export to CSV
            </Button>
          </div>
          {perf.length > ROW_PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground">Showing first {ROW_PREVIEW_LIMIT} of {perf.length} rows.</p>
          )}
          <DataTable
            columns={[
              { key: "asset", header: "Asset ID", render: (v) => <span className="font-bold">{String(v)}</span> },
              { key: "shift", header: "Shift", render: (v) => <Badge variant="outline" className="font-medium">Shift {String(v)}</Badge> },
              { key: "oee", header: "OEE Score", render: (v) => <span className={`font-mono font-semibold ${(v as number) >= 85 ? "text-green-600" : (v as number) >= 75 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(1)}%</span> },
              { key: "availability", header: "Availability", render: (v) => <span className="font-mono text-muted-foreground">{(v as number).toFixed(1)}%</span> },
              { key: "performance", header: "Performance", render: (v) => <span className="font-mono text-muted-foreground">{(v as number).toFixed(1)}%</span> },
              { key: "quality", header: "Quality", render: (v) => <span className="font-mono text-muted-foreground">{(v as number).toFixed(1)}%</span> },
              { key: "output", header: "Total Output", align: "right", render: (v) => <span className="font-mono font-semibold">{(v as number).toLocaleString()} units</span> },
            ] as ColumnDef[]}
            rows={perfPreview}
            emptyMessage="No performance records for this dataset."
            getRowKey={(_r, i) => i}
          />
          </>
          )}
        </TabsContent>

        {/* Sensor Diagnostics */}
        <TabsContent value="sensors" className="mt-5 space-y-4">
          {!activeRegistryId && !datasetLoading ? renderDatasetRequired() : tabState.sensors.loading ? renderTabLoader("sensor diagnostics") : tabState.sensors.error ? renderTabError(tabState.sensors.error, () => void loadSensors(true)) : (
          <>
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold">{tabState.sensors.meta.count} {tabState.sensors.meta.title}</p>
                <p className="text-xs text-muted-foreground">{tabState.sensors.meta.subtitle}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg shadow-sm gap-2" disabled={!sensors.length} onClick={() => downloadCsv("sensor-diagnostics-report.csv", sensors)}>
              <Download className="h-4 w-4" /> Export to CSV
            </Button>
          </div>
          {sensors.length > ROW_PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground">Showing first {ROW_PREVIEW_LIMIT} of {sensors.length} rows.</p>
          )}
          <DataTable
            columns={[
              { key: "ts", header: "Timestamp", render: (v) => <span className="text-xs font-mono text-muted-foreground">{String(v)}</span> },
              { key: "asset", header: "Asset ID", render: (v) => <span className="font-bold">{String(v)}</span> },
              {
                key: "thermalC",
                header: <span className="inline-flex items-center gap-1.5"><Thermometer className="h-4 w-4" /> Temperature (°C)</span>,
                render: (v) => <span className={`font-mono font-semibold ${(v as number) >= 85 ? "text-red-600" : (v as number) >= 70 ? "text-amber-600" : "text-green-600"}`}>{(v as number).toFixed(1)}°C</span>,
              },
              {
                key: "vibrationG",
                header: <span className="inline-flex items-center gap-1.5"><Waves className="h-4 w-4" /> Vibration (g)</span>,
                render: (v) => <span className={`font-mono font-semibold ${(v as number) >= 6 ? "text-red-600" : (v as number) >= 4 ? "text-amber-600" : "text-green-600"}`}>{(v as number).toFixed(1)}g</span>,
              },
              {
                key: "status",
                header: "Health Status",
                render: (v) => (
                  <Badge variant="outline" className={`capitalize font-medium ${statusBadge[v as string]}`}>
                    {v === "alert" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {v === "normal" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {String(v)}
                  </Badge>
                ),
              },
            ] as ColumnDef[]}
            rows={sensorsPreview}
            emptyMessage="No sensor diagnostic events found."
            getRowKey={(_r, i) => i}
          />
          </>
          )}
        </TabsContent>

        {/* Custom Reports */}
        <TabsContent value="custom" className="mt-5 space-y-4">
          {customLoading && renderTabLoader("custom reports")}
          {customError && renderTabError(customError, () => void loadCustomReports(true))}
          {!customLoading && !customError && generated.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2 p-14 text-center bg-gradient-to-br from-primary/5 via-muted/30 to-blue-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
              <div className="relative">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white flex items-center justify-center mb-5 shadow-xl shadow-primary/20">
                  <Zap className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold mb-3">Create Your First Custom Report</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
                  Unlock the power of AI-driven analytics. Describe your requirements in natural language, and our intelligent system will generate comprehensive, actionable reports tailored to your needs.
                </p>
                <Button size="lg" className="rounded-xl gap-2 shadow-lg shadow-primary/20 px-8 h-12" onClick={() => setOpen(true)}>
                  <Zap className="h-5 w-5" /> Generate Custom Report
                </Button>
              </div>
            </Card>
          ) : !customLoading && !customError ? (
            <div className="space-y-5">
              {generated.map(rpt => {
                const uiSource = REPORT_SOURCE_UI[rpt.source] ?? "perf";
                const meta = sourceCatalog[uiSource];
                const colLabel = (k: string) => meta.columns.find(c => c.key === k)?.label ?? k;
                const displayCols = rpt.columns.length ? rpt.columns : meta.columns.map(c => c.key);
                return (
                  <Card key={rpt.id} className="rounded-2xl overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-4 p-6 bg-gradient-to-r from-primary/5 via-muted/20 to-blue-500/5 border-b-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-bold truncate">{rpt.title}</h3>
                          <Badge variant="outline" className="text-xs font-semibold border-2">{meta.label}</Badge>
                          <Badge variant="secondary" className="text-xs font-bold">
                            {rpt.recordCount} {rpt.recordCount === 1 ? 'Record' : 'Records'}
                          </Badge>
                        </div>
                        {rpt.prompt && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex items-start gap-2 bg-white/50 p-2 rounded-lg">
                            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <span className="italic">"{rpt.prompt}"</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                          <span className="text-muted-foreground/60">Generated:</span>
                          {new Date(rpt.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline" size="sm" className="rounded-xl shadow-sm gap-2 border-2"
                          onClick={() => void downloadCustomReport(rpt)}
                        >
                          <Download className="h-4 w-4" /> Download CSV
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={() => void deleteReport(rpt.id)}
                          aria-label="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {rpt.rows.length === 0 ? (
                      <div className="p-10 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Download CSV for full dataset ({rpt.recordCount} rows).
                        </p>
                      </div>
                    ) : (
                      <>
                        <DataTable
                          columns={displayCols.map((c) => ({
                            key: c,
                            header: colLabel(c),
                            render: (v, row) => {
                              const apiKey = c === "ts" ? "timestamp" : c;
                              const val = v ?? (row as Record<string, unknown>)[apiKey];
                              return typeof val === "number"
                                ? <span className="font-mono font-medium">{val}</span>
                                : String(val ?? "");
                            },
                          }) as ColumnDef)}
                          rows={rpt.rows.slice(0, 50)}
                          getRowKey={(_r, i) => i}
                          maxHeight={384}
                        />
                        {rpt.recordCount > 50 && (
                          <div className="p-3 text-center text-xs font-medium text-muted-foreground bg-muted/30 border-t">
                            Displaying first 50 of {rpt.recordCount.toLocaleString()} records · Download CSV for complete dataset
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Create Custom Report Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-2">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  Generate Custom Report
                  <Badge variant="secondary" className="text-xs font-semibold">AI-Powered</Badge>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-sm pt-1 leading-relaxed">
              Define your reporting requirements below. Our intelligent analytics engine will extract, analyze, and format your data with precision and speed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="rpt-title" className="text-sm font-semibold">
                Report Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rpt-title"
                placeholder="e.g., Low Performing Assets - Shift A Analysis"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={80}
                className="h-11 rounded-xl border-muted-foreground/20"
              />
              <p className="text-xs text-muted-foreground text-right">{title.length} / 80 characters</p>
            </div>

            {/* Data source */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Data Source <span className="text-destructive">*</span>
              </Label>
              <Select value={source} onValueChange={(v) => onSourceChange(v as SourceKey)}>
                <SelectTrigger className="h-11 rounded-xl border-muted-foreground/20"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(Object.keys(sourceCatalog) as SourceKey[]).map(k => (
                    <SelectItem key={k} value={k} className="rounded-lg">
                      <div className="flex flex-col py-1">
                        <span className="font-semibold">{sourceCatalog[k].label}</span>
                        <span className="text-xs text-muted-foreground">{sourceCatalog[k].description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select the primary data source for your report</p>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="rpt-prompt" className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> AI Query Prompt
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="rpt-prompt"
                placeholder="Describe your requirements in natural language, e.g., 'Show me assets with OEE below 80% sorted by performance' or 'List all critical alerts from the last 24 hours'"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                maxLength={500}
                className="rounded-xl resize-none border-muted-foreground/20"
              />
              <p className="text-xs text-muted-foreground text-right">{prompt.length} / 500 characters</p>
            </div>

            {/* Columns */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Report Columns <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setSelectedCols(currentCatalog.columns.map(c => c.key))}
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:underline font-medium"
                    onClick={() => setSelectedCols([])}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-xl bg-muted/10">
                {currentCatalog.columns.map(col => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-primary transition-colors group"
                  >
                    <Checkbox
                      checked={selectedCols.includes(col.key)}
                      onCheckedChange={() => toggleCol(col.key)}
                      className="group-hover:border-primary"
                    />
                    <span className="truncate font-medium">{col.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedCols.length}</span> of {currentCatalog.columns.length} columns selected
              </p>
            </div>

            {/* Custom Columns */}
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label htmlFor="custom-cols" className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> 
                  Custom Columns
                  <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add additional custom column names. Type and press Enter or comma to add.
                </p>
              </div>
              <Input
                id="custom-cols"
                placeholder="Type column name and press Enter or comma..."
                value={customColumnInput}
                onChange={(e) => setCustomColumnInput(e.target.value)}
                onKeyDown={handleCustomColumnInput}
                onBlur={handleCustomColumnBlur}
                className="h-11 rounded-xl border-muted-foreground/20"
              />
              {customColumns.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 border rounded-xl bg-gradient-to-br from-primary/5 to-muted/10">
                  {customColumns.map((col, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="pl-3 pr-2 py-2 text-sm font-medium gap-2 hover:bg-secondary/80 transition-colors rounded-lg"
                    >
                      {col}
                      <button
                        type="button"
                        onClick={() => removeCustomColumn(col)}
                        className="hover:text-destructive transition-colors"
                        aria-label="Remove column"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={generating}
              className="rounded-xl px-6 h-11"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => void handleGenerate()} 
              disabled={generating || !activeRegistryId} 
              className="gap-2 rounded-xl px-8 shadow-lg shadow-primary/20 h-11"
            >
              {generating ? (
                <>
                  <Zap className="h-5 w-5 animate-pulse" /> 
                  Generating Report...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" /> 
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}