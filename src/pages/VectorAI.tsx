import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDataset } from "@/contexts/DatasetContext";
import { vectorApi } from "@/lib/api/vector";
import type { RegistryScope } from "@/lib/api/scope";
import { VectorDatasetMultiSelect } from "@/components/vector/VectorDatasetMultiSelect";
import {
  buildVectorRegistryScope,
  parseVectorDatasetScope,
  readStoredRegistrySelection,
  workspaceToVectorOptions,
  writeStoredRegistrySelection,
  type VectorDatasetScope,
} from "@/lib/vectorScope";
import {
  type Agent, type Alert, type Anomaly, type Trigger, type LoopAction,
  type HeaderKpis, type AgentSummary, type TriggerHeaderKpis, type Interval,
  mapAgent, mapAnomaly, mapAlert, mapTrigger, buildLoopsFromAlerts, mapPerformance, getErrorMessage,
} from "@/lib/vectorMappers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChartInfo } from "@/components/ChartInfo";
import {
  Activity, AlertTriangle, Bot, CheckCircle2, Clock, Cpu, GitBranch,
  PlayCircle, RefreshCw, Shield, Wrench, Zap, TrendingUp, Radar,
  Workflow, Sparkles, ArrowUpRight, ArrowDownRight, Gauge, Eye,
  Bell, Radio, ShieldCheck, Layers, Mail, MessageSquare, Smartphone,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, Legend,
} from "recharts";

type Severity = Alert["severity"];
type AgentStatus = Agent["status"];
type DomainRow = { domain: string; decisions: number; savings: number };

type VectorTab = "agents" | "anomalies" | "alerts" | "triggers" | "performance";

function throughputXAxisExplanation(i: Interval): string {
  switch (i) {
    case "hourly":
      return "Time of day in 2-hour buckets (labels 00–22)";
    case "daily":
      return "Day of week for the current reporting window";
    case "monthly":
      return "Calendar month (rolling window)";
    default:
      return "";
  }
}

function VectorDomainTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DomainRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      <p className="font-semibold text-foreground">{row.domain}</p>
      <p className="mt-1 text-muted-foreground">
        Decisions: <span className="font-medium text-foreground">{row.decisions}</span>
      </p>
      <p className="text-muted-foreground">
        Modeled savings: <span className="font-medium text-foreground">€{row.savings}k</span>
      </p>
      {row.domain === "Performance" && (
        <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground leading-snug">
          Performance = OEE, line balance, micro-stops, and cycle-time actions (e.g. OEE Guardian).
        </p>
      )}
    </div>
  );
}

// ============================================================================
// STYLE MAPS
// ============================================================================
const severityStyles: Record<Severity, { bg: string; text: string; dot: string; ring: string }> = {
  critical: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive", ring: "ring-destructive/30" },
  warning: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", ring: "ring-warning/30" },
  info: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent", ring: "ring-accent/30" },
};

const statusBadge: Record<AgentStatus, string> = {
  active: "bg-success/15 text-success border-success/30",
  paused: "bg-muted text-muted-foreground border-border",
  learning: "bg-accent/15 text-accent border-accent/30",
};

const classificationBadge: Record<Anomaly["classification"], string> = {
  drift: "bg-warning/10 text-warning border-warning/30",
  spike: "bg-destructive/10 text-destructive border-destructive/30",
  pattern: "bg-accent/10 text-accent border-accent/30",
  outlier: "bg-purple/10 text-purple border-purple/30",
};

// ============================================================================
// COMPONENTS
// ============================================================================
function Kpi({ label, value, sub, icon: Icon, accent, trend, onClick }: { label: string; value: string; sub: string; icon: typeof Bot; accent: string; trend?: { value: string; positive: boolean }; onClick?: () => void }) {
  return (
    <Card 
      className="p-4 rounded-card relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tracking-tight">{value}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${trend.positive ? "text-success" : "text-destructive"}`}>
                {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: { icon: typeof Bot; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function NotifPill({
  channel,
  state,
}: {
  channel: "email" | "sms" | "inApp";
  state: "sent" | "pending" | "failed" | "off";
}) {
  const Icon = channel === "email" ? Mail : channel === "sms" ? Smartphone : MessageSquare;
  const label = channel === "email" ? "Email" : channel === "sms" ? "SMS" : "In-app";
  const styles: Record<typeof state, string> = {
    sent: "bg-success/10 text-success border-success/30",
    pending: "bg-warning/10 text-warning border-warning/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
    off: "bg-muted text-muted-foreground border-border",
  };
  const stateLabel: Record<typeof state, string> = {
    sent: "sent",
    pending: "pending",
    failed: "failed",
    off: "off",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles[state]}`}
      title={`${label} · ${stateLabel[state]}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
      <span className="opacity-70">· {stateLabel[state]}</span>
    </span>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function VectorAI() {
  const { user } = useAuth();
  const { workspaceDatasets, activeRegistryId, loading: datasetLoading } = useDataset();
  const historyUserId = user?.userId;

  const workspaceOptions = useMemo(
    () => workspaceToVectorOptions(workspaceDatasets),
    [workspaceDatasets],
  );

  const [selectedRegistryIds, setSelectedRegistryIds] = useState<number[]>([]);
  const [selectionReady, setSelectionReady] = useState(false);
  const [datasetScope, setDatasetScope] = useState<VectorDatasetScope>("single");

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [datasetLabel, setDatasetLabel] = useState("");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [anomalies24h, setAnomalies24h] = useState(0);
  const [headerKpis, setHeaderKpis] = useState<HeaderKpis | null>(null);
  const [agentSummary, setAgentSummary] = useState<AgentSummary | null>(null);
  const [triggerHeaderKpis, setTriggerHeaderKpis] = useState<TriggerHeaderKpis | null>(null);
  const [perfPoints, setPerfPoints] = useState<{ label: string; detected: number; resolved: number; auto: number }[]>([]);
  const [perfUplift, setPerfUplift] = useState<{ metric: string; value: string; delta: string; positive: boolean }[]>([]);
  const [domainBreakdown, setDomainBreakdown] = useState<DomainRow[]>([]);

  const [activeTab, setActiveTab] = useState<VectorTab>("agents");
  const [loadedTabs, setLoadedTabs] = useState<Set<VectorTab>>(new Set());
  const [tabLoading, setTabLoading] = useState<VectorTab | null>(null);

  const [interval, setInterval] = useState<Interval>("hourly");
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    document.title = "Vector AI | Datapx1";
    return () => {
      document.title = "Datapx1 — Industrial Decision Intelligence";
    };
  }, []);

  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [showKpiDialog, setShowKpiDialog] = useState(false);

  const scopeParams = useCallback(
    (refresh = false): RegistryScope =>
      buildVectorRegistryScope(selectedRegistryIds, workspaceOptions.length, refresh),
    [selectedRegistryIds, workspaceOptions.length],
  );

  const isMultiDataset = datasetScope !== "single";

  const applyResponseMeta = useCallback((res: Record<string, unknown>) => {
    setDatasetScope(parseVectorDatasetScope(res.datasetScope));
    const name = res.display_name;
    if (name != null && String(name).trim()) {
      setDatasetLabel(String(name));
    }
  }, []);

  const resolveRowRegistryId = useCallback(
    (rowRegistryId?: number) =>
      rowRegistryId ?? (selectedRegistryIds.length === 1 ? selectedRegistryIds[0] : undefined),
    [selectedRegistryIds],
  );

  const rowKey = (registryId: number | undefined, id: string) =>
    `${registryId ?? "na"}-${id}`;

  const loadTabData = useCallback(
    async (tab: VectorTab, scope: RegistryScope, refresh = false) => {
      setTabLoading(tab);
      setTabError(null);
      try {
        const params = { ...scope, refresh };
        switch (tab) {
          case "agents": {
            const res = (await vectorApi.listAgents(params)) as Record<string, unknown>;
            setAgents(((res.agents as Record<string, unknown>[]) ?? []).map(mapAgent));
            setAgentSummary((res.summary as AgentSummary) ?? null);
            applyResponseMeta(res);
            break;
          }
          case "anomalies": {
            const res = (await vectorApi.getAnomalies({ ...params, limit: 50 })) as Record<string, unknown>;
            setAnomalies(((res.anomalies as Record<string, unknown>[]) ?? []).map(mapAnomaly));
            const summary = res.summary as { last24h?: number } | undefined;
            setAnomalies24h(summary?.last24h ?? 0);
            applyResponseMeta(res);
            break;
          }
          case "alerts": {
            const res = (await vectorApi.getAlerts({ ...params, limit: 50 })) as Record<string, unknown>;
            setAlerts(((res.alerts as Record<string, unknown>[]) ?? []).map(mapAlert));
            setHeaderKpis((res.headerKpis as HeaderKpis) ?? null);
            applyResponseMeta(res);
            break;
          }
          case "triggers": {
            const res = (await vectorApi.listTriggers(params)) as Record<string, unknown>;
            setTriggers(((res.triggers as Record<string, unknown>[]) ?? []).map(mapTrigger));
            const hk = res.headerKpis as TriggerHeaderKpis | undefined;
            setTriggerHeaderKpis(hk ?? null);
            applyResponseMeta(res);
            break;
          }
          case "performance": {
            const res = (await vectorApi.getPerformance({ ...params, interval })) as Record<string, unknown>;
            const perf = mapPerformance(res);
            setPerfPoints(perf.points);
            setPerfUplift(perf.uplift);
            setDomainBreakdown(perf.domainBreakdown);
            applyResponseMeta(res);
            break;
          }
        }
        setLoadedTabs((prev) => new Set(prev).add(tab));
      } catch (err) {
        setTabError(getErrorMessage(err));
      } finally {
        setTabLoading(null);
      }
    },
    [applyResponseMeta, interval],
  );

  const reloadVectorData = useCallback(
    async (tab: VectorTab, refresh = false) => {
      if (!selectedRegistryIds.length) return;
      const scope = buildVectorRegistryScope(selectedRegistryIds, workspaceOptions.length, refresh);
      await loadTabData(tab, scope, refresh);
    },
    [selectedRegistryIds, workspaceOptions.length, loadTabData],
  );

  const initPage = useCallback(
    async (tab: VectorTab = "agents", silent = false) => {
      if (!selectedRegistryIds.length) return;
      if (!silent) setPageLoading(true);
      setPageError(null);
      setLoadedTabs(new Set());
      const scope = buildVectorRegistryScope(selectedRegistryIds, workspaceOptions.length);
      try {
        await loadTabData(tab, scope, false);
      } catch (err) {
        setPageError(getErrorMessage(err));
      } finally {
        if (!silent) setPageLoading(false);
      }
    },
    [selectedRegistryIds, workspaceOptions.length, loadTabData],
  );

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (datasetLoading) return;
    if (!workspaceOptions.length) {
      setSelectionReady(false);
      setPageLoading(false);
      setPageError("No datasets in workspace. Select datasets in Data Ingestion first.");
      return;
    }
    const stored = readStoredRegistrySelection(historyUserId);
    const validStored = (stored ?? []).filter((id) =>
      workspaceOptions.some((o) => o.registryId === id),
    );
    let ids: number[];
    if (validStored.length) {
      ids = validStored;
    } else if (activeRegistryId != null && workspaceOptions.some((o) => o.registryId === activeRegistryId)) {
      ids = [activeRegistryId];
    } else {
      ids = workspaceOptions.map((o) => o.registryId);
    }
    setSelectedRegistryIds(ids);
    setSelectionReady(true);
  }, [datasetLoading, workspaceOptions, historyUserId, activeRegistryId]);

  useEffect(() => {
    if (!selectionReady || !selectedRegistryIds.length) return;
    const silent = hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    void initPage(activeTab, silent);
  }, [selectionReady, selectedRegistryIds, initPage]);

  const handleSelectionChange = (ids: number[]) => {
    if (!ids.length) return;
    setSelectedRegistryIds(ids);
    writeStoredRegistrySelection(historyUserId, ids);
    setLoadedTabs(new Set());
  };

  const handleTabChange = (tab: string) => {
    const t = tab as VectorTab;
    setActiveTab(t);
    if (selectedRegistryIds.length && !loadedTabs.has(t)) {
      void reloadVectorData(t, false);
    }
  };

  useEffect(() => {
    if (selectedRegistryIds.length && loadedTabs.has("performance") && activeTab === "performance") {
      void reloadVectorData("performance", false);
    }
  }, [interval]);

  useEffect(() => {
    const timer = window.setInterval(() => setPulse((p) => (p + 1) % 60), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    if (!selectedRegistryIds.length) return;
    setRefreshing(true);
    try {
      await reloadVectorData(activeTab, true);
      toast.success("Vector AI data refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAgent = async (agent: Agent) => {
    const nextStatus = agent.status === "active" ? "paused" : "active";
    try {
      setTabError(null);
      await vectorApi.toggleAgentStatus(agent.id, nextStatus);
      await reloadVectorData("agents", false);
    } catch (err) {
      setTabError(getErrorMessage(err));
    }
  };

  const toggleTrigger = async (trigger: Trigger) => {
    const registryId = resolveRowRegistryId(trigger.registryId);
    if (registryId == null) return;
    try {
      setTabError(null);
      await vectorApi.toggleTrigger(registryId, trigger.id, !trigger.enabled);
      await reloadVectorData("triggers", false);
    } catch (err) {
      setTabError(getErrorMessage(err));
    }
  };

  const ackAlert = async (alert: Alert) => {
    const registryId = resolveRowRegistryId(alert.registryId);
    if (registryId == null) return;
    if (alert.acknowledgeable === false && alert.status !== "open") return;
    try {
      setTabError(null);
      await vectorApi.acknowledgeAlert(registryId, alert.id, {
        acknowledgedBy: user?.userId ?? user?.backendUserId ?? user?.email ?? "dashboard-user",
        note: "Acknowledged from Vector AI dashboard",
      });
      await reloadVectorData("alerts", false);
    } catch (err) {
      setTabError(getErrorMessage(err));
    }
  };

  const handleTriggerClick = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setShowTriggerDialog(true);
  };

  const handleKpiClick = (kpiType: string) => {
    setSelectedKpi(kpiType);
    setShowKpiDialog(true);
  };

  const loops = useMemo(() => buildLoopsFromAlerts(alerts), [alerts]);

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const domainCount = useMemo(() => new Set(agents.map((a) => a.domain)).size, [agents]);
  const openAlerts = loadedTabs.has("alerts")
    ? headerKpis?.openAlerts ?? alerts.filter((a) => a.status === "open").length
    : null;
  const autoResolvedNote = loadedTabs.has("alerts")
    ? headerKpis?.openAlertsNote ?? `${alerts.filter((a) => a.status === "auto-resolved").length} auto-resolved`
    : "Open alerts tab to load";
  const autoResolvedPct = useMemo(() => {
    if (!loadedTabs.has("alerts")) return null;
    if (headerKpis?.autoResolvedPct != null) return headerKpis.autoResolvedPct;
    if (!alerts.length) return null;
    const resolved = alerts.filter((a) => a.status === "auto-resolved").length;
    return Math.round((resolved / alerts.length) * 1000) / 10;
  }, [alerts, headerKpis, loadedTabs]);
  const totalDecisions = loadedTabs.has("agents")
    ? agentSummary?.decisionsToday ?? agentSummary?.decisionsLast24h ?? agents.reduce((s, a) => s + a.decisionsToday, 0)
    : null;
  const anomaliesCount = loadedTabs.has("anomalies")
    ? anomalies24h
    : loadedTabs.has("alerts")
      ? headerKpis?.anomalies24h ?? null
      : null;
  const enabledTriggers = triggers.filter((t) => t.enabled).length;
  const anomalyColumns = useMemo((): ColumnDef<Anomaly>[] => {
    const cols: ColumnDef<Anomaly>[] = [];
    if (isMultiDataset) {
      cols.push({
        key: "datasetName",
        header: "Dataset",
        render: (v) => <span className="text-xs text-muted-foreground truncate max-w-[140px] block">{String(v ?? "—")}</span>,
      });
    }
    cols.push(
      { key: "ts", header: "Detected", render: (v) => <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap"><Clock className="h-3 w-3" />{String(v)}</span> },
      { key: "signal", header: "Signal", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
      { key: "asset", header: "Asset", render: (v) => <span className="text-xs">{String(v)}</span> },
      { key: "classification", header: "Type", render: (v) => <Badge variant="outline" className={`text-[10px] capitalize ${classificationBadge[v as string]}`}>{String(v)}</Badge> },
      {
        key: "_baseline",
        header: "Baseline → Observed",
        render: (_v, an) => (
          <span className="text-xs whitespace-nowrap">
            <span className="text-muted-foreground">{(an as Anomaly).baseline}</span>
            <span className="mx-1.5 text-muted-foreground">→</span>
            <span className="font-semibold text-foreground">{(an as Anomaly).observed}</span>
          </span>
        ),
      },
      { key: "zScore", header: "Z-score", render: (v) => <span className="text-xs font-mono font-semibold">{(v as number).toFixed(1)}σ</span> },
      {
        key: "confidence",
        header: "Confidence",
        minWidth: 120,
        render: (v) => (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={(v as number) * 100} className="h-1.5 flex-1" />
            <span className="text-[11px] font-semibold tabular-nums">{Math.round((v as number) * 100)}%</span>
          </div>
        ),
      },
      { key: "detectedBy", header: "Agent", render: (v) => <span className="text-xs text-muted-foreground">{String(v)}</span> },
    );
    return cols;
  }, [isMultiDataset]);

  const intervalData = useMemo(
    () => ({ points: perfPoints, uplift: perfUplift }),
    [perfPoints, perfUplift],
  );

  if (pageLoading || datasetLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-sm text-muted-foreground">Loading Vector AI...</p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Error Loading Vector AI</h3>
              <p className="text-sm text-muted-foreground">{pageError}</p>
              {selectionReady && selectedRegistryIds.length > 0 && (
                <Button className="mt-4" size="sm" onClick={() => void initPage(activeTab)}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <Card className="p-5 rounded-card border-0 bg-gradient-to-br from-primary via-primary to-sidebar-deep text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--accent)) 0%, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--teal)) 0%, transparent 40%)" }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center ring-1 ring-primary-foreground/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Vector AI</h1>
                <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 text-[10px]">
                  Autonomous Intelligence Layer
                </Badge>
              </div>
              <p className="text-sm opacity-80 mt-0.5">
                {datasetLabel ? `Viewing: ${datasetLabel}` : "Select datasets"} · Continuous monitoring · Anomaly detection · Real-time triggers · Closed-loop execution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <VectorDatasetMultiSelect
              options={workspaceOptions}
              selectedIds={selectedRegistryIds}
              onChange={handleSelectionChange}
              aggregatedLabel={datasetLabel}
              variant="hero"
              disabled={refreshing || pageLoading}
            />
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur ring-1 ring-primary-foreground/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="font-medium">Live</span>
              <span className="opacity-70">· synced {pulse}s ago</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
              className="gap-2 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* TOP KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Active Agents" value={loadedTabs.has("agents") ? `${activeAgents}/${agents.length || "—"}` : "—"} sub={loadedTabs.has("agents") ? `${domainCount} domain${domainCount === 1 ? "" : "s"}` : "Open Agents tab"} icon={Bot} accent="bg-primary/10 text-primary" />
        <Kpi label="Anomalies (24h)" value={anomaliesCount != null ? String(anomaliesCount) : "—"} sub={loadedTabs.has("anomalies") ? `${anomalies.length} shown in feed` : "Open Anomalies tab"} icon={Radar} accent="bg-purple/10 text-purple" />
        <Kpi label="Open Alerts" value={openAlerts != null ? String(openAlerts) : "—"} sub={autoResolvedNote} icon={AlertTriangle} accent="bg-destructive/10 text-destructive" />
        <Kpi label="Decisions Today" value={totalDecisions != null ? String(totalDecisions) : "—"} sub="Last 24 hours" icon={Activity} accent="bg-accent/10 text-accent" />
        <Kpi label="Auto-Resolved" value={autoResolvedPct != null ? `${autoResolvedPct}%` : "—"} sub="Closed-loop success" icon={CheckCircle2} accent="bg-success/10 text-success" />
      </div>

      {isMultiDataset && (
        <Card className="p-3 rounded-card border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Aggregated view</span>
              <span className="text-muted-foreground"> — KPIs and lists combine data from {datasetLabel || `${selectedRegistryIds.length} datasets`}.</span>
            </p>
          </div>
        </Card>
      )}

      {tabError && (
        <Card className="p-3 rounded-card border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive">{tabError}</p>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="agents" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> Agents</TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1.5"><Radar className="h-3.5 w-3.5" /> Anomalies</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Alerts</TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1.5"><Workflow className="h-3.5 w-3.5" /> Triggers</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> Performance</TabsTrigger>
        </TabsList>

        {/* ================= AGENTS ================= */}
        <TabsContent value="agents" className="mt-4 space-y-4">
          {tabLoading === "agents" && !loadedTabs.has("agents") ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading agents…
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const Icon = agent.icon;
              return (
                <Card key={rowKey(agent.registryId, agent.id)} className="p-4 rounded-card hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{agent.name}</h3>
                          <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge[agent.status]}`}>
                            {agent.status}
                          </Badge>
                          {isMultiDataset && agent.datasetName && (
                            <Badge variant="secondary" className="text-[10px] font-normal">{agent.datasetName}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{agent.domain} · {agent.scope}</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{agent.description}</p>
                      </div>
                    </div>
                    <Switch checked={agent.status === "active"} onCheckedChange={() => void toggleAgent(agent)} />
                  </div>
                  <div className="mt-4 pt-3 border-t grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Decisions</p>
                      <p className="font-bold text-base mt-0.5">{agent.decisionsToday}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Success</p>
                      <p className="font-bold text-base mt-0.5">{agent.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTTD</p>
                      <p className="font-bold text-base mt-0.5">{agent.mttdSec}s</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MTTR</p>
                      <p className="font-bold text-base mt-0.5">{agent.mttrMin}m</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Confidence</span>
                      <span>{agent.successRate}%</span>
                    </div>
                    <Progress value={agent.successRate} className="h-1.5" />
                  </div>
                </Card>
              );
            })}
          </div>
          )}
        </TabsContent>

        {/* ================= ANOMALIES ================= */}
        <TabsContent value="anomalies" className="mt-4 space-y-4">
          {tabLoading === "anomalies" && !loadedTabs.has("anomalies") ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading anomalies…
            </div>
          ) : (
          <>
          <Card className="p-4 rounded-card">
            <SectionHeader
              icon={Radar}
              title="Event Detection & Anomaly Identification"
              subtitle="Statistical & ML-based deviation detection across all instrumented signals"
              action={<Badge variant="outline" className="text-[10px] bg-purple/10 text-purple border-purple/30"><Radio className="h-3 w-3 mr-1" /> Streaming</Badge>}
            />
          </Card>

          <DataTable<Anomaly>
            columns={anomalyColumns}
            rows={anomalies}
            getRowKey={(an) => rowKey(an.registryId, an.id)}
            emptyMessage="No anomalies detected."
          />
          </>
          )}
        </TabsContent>

        {/* ================= ALERTS ================= */}
        <TabsContent value="alerts" className="mt-4 space-y-4">
          {tabLoading === "alerts" && !loadedTabs.has("alerts") ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading alerts…
            </div>
          ) : (
          <>
          <Card className="p-4 rounded-card">
            <SectionHeader icon={Bell} title="Real-time Alerts Feed" subtitle="Severity-classified, deduplicated, with recommended actions" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(["critical", "warning", "info"] as Severity[]).map((sev) => {
                const count = alerts.filter((a) => a.severity === sev).length;
                const s = severityStyles[sev];
                let meaning = "";
                if (sev === "critical") meaning = "Immediate action required - high probability of downtime or safety risk";
                if (sev === "warning") meaning = "Attention needed - degrading conditions that may escalate";
                if (sev === "info") meaning = "Informational - notable events for awareness and logging";
                return (
                  <TooltipProvider key={sev}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`p-3 rounded-lg ring-1 ${s.ring} ${s.bg} cursor-help`}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                            <span className={`text-[10px] uppercase tracking-wide font-semibold ${s.text}`}>{sev}</span>
                          </div>
                          <p className="text-2xl font-bold mt-1">{count}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs font-semibold capitalize">{sev} Severity</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{meaning}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Live alerts feed</h3>
              <Badge variant="secondary" className="text-[10px]">{openAlerts ?? 0} open</Badge>
            </div>
            <div className="divide-y">
              {alerts.map((al) => {
                const s = severityStyles[al.severity];
                return (
                  <div key={rowKey(al.registryId, al.id)} className="p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors">
                    <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] uppercase ${s.bg} ${s.text} border-transparent`}>{al.severity}</Badge>
                        {isMultiDataset && al.datasetName && (
                          <Badge variant="secondary" className="text-[10px] font-normal">{al.datasetName}</Badge>
                        )}
                        <span className="text-xs font-medium">{al.agent}</span>
                        <span className="text-xs text-muted-foreground">· {al.asset}</span>
                        <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1"><Clock className="h-3 w-3" />{al.ts}</span>
                      </div>
                      <p className="text-sm mt-1">{al.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">Recommended:</span> {al.recommended}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Notified:</span>
                        <NotifPill channel="email" state={al.notifications.email} />
                        <NotifPill channel="sms" state={al.notifications.sms} />
                        <NotifPill channel="inApp" state={al.notifications.inApp} />
                        {al.recipients !== undefined && (
                          <span className="text-[10px] text-muted-foreground">· {al.recipients} recipient{al.recipients === 1 ? "" : "s"}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {al.status === "open" && al.acknowledgeable !== false && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void ackAlert(al)}>Acknowledge</Button>
                      )}
                      {al.status === "acknowledged" && (
                        <Badge variant="outline" className="text-[10px]">Acknowledged</Badge>
                      )}
                      {al.status === "auto-resolved" && (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Auto-resolved</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ================= TRIGGERS / CLOSED-LOOP ================= */}
        <TabsContent value="triggers" className="mt-4 space-y-4">
          {tabLoading === "triggers" && !loadedTabs.has("triggers") ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading triggers…
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Kpi label="Active Triggers" value={String(enabledTriggers)} sub={`${triggers.length - enabledTriggers} disabled`} icon={Workflow} accent="bg-accent/10 text-accent" onClick={() => handleKpiClick('active-triggers')} />
            <Kpi label="Fired Today" value={String(triggers.reduce((s, t) => s + t.firedToday, 0))} sub="Across all rules" icon={PlayCircle} accent="bg-success/10 text-success" onClick={() => handleKpiClick('fired-today')} />
            <Kpi label="Successful Loops" value={String(triggerHeaderKpis?.successfulLoops ?? loops.filter((l) => l.outcome === "success").length)} sub="Auto-executed end-to-end" icon={CheckCircle2} accent="bg-success/10 text-success" onClick={() => handleKpiClick('successful-loops')} />
            <Kpi label="Awaiting Approval" value={String(triggerHeaderKpis?.awaitingApproval ?? loops.filter((l) => l.outcome === "pending").length)} sub="Human-in-the-loop" icon={Wrench} accent="bg-warning/10 text-warning" onClick={() => handleKpiClick('awaiting-approval')} />
          </div>

          {/* Triggers (Automated rules) */}
          <Card className="rounded-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <SectionHeader icon={Workflow} title="Automated Triggers" subtitle="If-this-then-that rules executed by Vector AI agents" />
            </div>
            <div className="divide-y">
              {triggers.map((t) => (
                <div 
                  key={rowKey(t.registryId, t.id)} 
                  className="p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[role="switch"]')) return;
                    handleTriggerClick(t);
                  }}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${t.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold">{t.name}</h4>
                      <Badge variant="outline" className="text-[10px]">{t.agent}</Badge>
                      {isMultiDataset && t.datasetName && (
                        <Badge variant="secondary" className="text-[10px] font-normal">{t.datasetName}</Badge>
                      )}
                      {t.enabled ? (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">disabled</Badge>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-md bg-muted/40 border">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">When</p>
                        <p className="mt-0.5 font-mono text-[11px]">{t.condition}</p>
                      </div>
                      <div className="p-2 rounded-md bg-accent/5 border border-accent/20">
                        <p className="text-[10px] uppercase tracking-wide text-accent">Then</p>
                        <p className="mt-0.5 text-[11px]">{t.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span>Fired today: <span className="text-foreground font-semibold">{t.firedToday}</span></span>
                      <span>Last fired: <span className="text-foreground">{t.lastFired}</span></span>
                    </div>
                  </div>
                  <Switch 
                    checked={t.enabled} 
                    onCheckedChange={() => void toggleTrigger(t)} 
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Closed-Loop Visual Flow */}
          <Card className="rounded-card p-5 border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-start gap-3 mb-4">
              <Layers className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Closed-Loop Autonomous Operations</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Vector AI agents operate in a fully autonomous closed-loop cycle, executing from detection through resolution without human intervention (except for approval-required actions).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { stage: "Detection", icon: Radar, desc: "AI continuously monitors telemetry, detects anomalies using ML models", color: "text-purple" },
                { stage: "Action", icon: PlayCircle, desc: "Automated trigger executes predefined response (e.g., adjust settings, create PO)", color: "text-accent" },
                { stage: "Resolution", icon: CheckCircle2, desc: "System verifies action succeeded, conditions normalized", color: "text-success" },
                { stage: "Logged", icon: Layers, desc: "Event, action, and outcome recorded for audit and learning", color: "text-primary" },
              ].map((step, i) => (
                <div key={step.stage} className="flex items-start gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${step.color.replace('text-', 'bg-')}/10 ${step.color}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{i + 1}. {step.stage}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                  {i < 3 && <span className="text-muted-foreground mx-1">→</span>}
                </div>
              ))}
            </div>
          </Card>

          {/* Closed-loop log */}
          <Card className="rounded-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Closed-loop execution log</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time audit trail showing Detection → Action → Resolution → Logged</p>
            </div>
            <DataTable<LoopAction>
              columns={[
                { key: "ts", header: "Time", render: (v) => <span className="text-xs text-muted-foreground whitespace-nowrap">{String(v)}</span> },
                { key: "agent", header: "Agent", render: (v) => <span className="text-xs font-medium">{String(v)}</span> },
                { key: "trigger", header: "Trigger", render: (v) => <span className="text-xs">{String(v)}</span> },
                { key: "action", header: "Action", render: (v) => <span className="text-xs">{String(v)}</span> },
                { key: "asset", header: "Asset", render: (v) => <span className="text-xs">{String(v)}</span> },
                { key: "stage", header: "Stage", render: (v) => <Badge variant="outline" className="text-[10px] capitalize bg-accent/10 text-accent border-accent/30">{String(v)}</Badge> },
                {
                  key: "outcome",
                  header: "Outcome",
                  render: (v) => {
                    if (v === "success") return <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">success</Badge>;
                    if (v === "pending") return <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">pending</Badge>;
                    return <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">failed</Badge>;
                  },
                },
                { key: "impact", header: "Impact", render: (v) => <span className="text-xs text-muted-foreground">{String(v)}</span> },
              ] as ColumnDef<LoopAction>[]}
              rows={loops}
              getRowKey={(l) => l.id}
              emptyMessage="No execution log entries."
            />
          </Card>
          </>
          )}
        </TabsContent>

        {/* ================= PERFORMANCE TRACKING ================= */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          {tabLoading === "performance" && !loadedTabs.has("performance") ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading performance…
            </div>
          ) : (
          <>
          <Card className="p-4 rounded-card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <SectionHeader icon={Gauge} title="Performance Tracking" subtitle="Detection, resolution and impact across configurable intervals" />
              <Select value={interval} onValueChange={(v) => setInterval(v as Interval)}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {intervalData.uplift.map((u) => (
                <div key={u.metric} className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{u.metric}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-bold tracking-tight">{u.value}</p>
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${u.positive ? "text-success" : "text-destructive"}`}>
                      {u.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {u.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 rounded-card lg:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-sm capitalize truncate">
                    {interval} throughput · detected vs resolved
                  </h3>
                  <ChartInfo
                    title="Throughput chart"
                    xAxis={throughputXAxisExplanation(interval)}
                    yAxis="Count of events in each bucket — how many issues were detected vs resolved"
                    thresholds={[
                      { color: "hsl(var(--accent))", label: "Detected — signals or anomalies Vector AI flagged" },
                      { color: "hsl(var(--success))", label: "Resolved — cases closed or remediated in the same window" },
                      { color: "hsl(var(--purple))", label: "Auto-resolved — closed by agents without a human ticket" },
                    ]}
                    note="When resolved tracks detected, the loop is healthy. Auto-resolved shows how much work agents complete end-to-end."
                  />
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Auto-refreshing</Badge>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intervalData.points}>
                    <defs>
                      <linearGradient id="vDet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="vRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="detected" name="Detected" stroke="hsl(var(--accent))" fill="url(#vDet)" strokeWidth={2} />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(var(--success))" fill="url(#vRes)" strokeWidth={2} />
                    <Line type="monotone" dataKey="auto" name="Auto-resolved" stroke="hsl(var(--purple))" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 rounded-card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-sm truncate">By domain</h3>
                  <ChartInfo
                    title="By domain"
                    xAxis="Bar length → number of Vector AI decisions in that domain (current period)"
                    yAxis="Domain: where the agent acted (Maintenance, Energy, Supply, Performance, Compliance)"
                    thresholds={[
                      { color: "hsl(var(--accent))", label: "Bar — decision volume; hover a bar for modeled €k savings" },
                    ]}
                    note="Performance covers throughput and OEE-style actions (micro-stops, line balance, cycle time). Supply = inventory and replenishment. Compliance = safety and policy guardrails."
                  />
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Decisions / savings</Badge>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainBreakdown} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="domain" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={90} />
                    <RechartsTooltip content={<VectorDomainTooltip />} />
                    <Bar dataKey="decisions" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4 rounded-card bg-muted/20 border-dashed">
            <h4 className="text-xs font-semibold text-foreground mb-2">Reading these charts</h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
              <li>
                <span className="font-medium text-foreground">Throughput:</span> compares how many issues were{" "}
                <span className="text-foreground">detected</span> versus <span className="text-foreground">resolved</span> per time bucket; the purple line is the subset resolved fully by agents.
              </li>
              <li>
                <span className="font-medium text-foreground">By domain:</span> bar length is decision count; use the chart ℹ️ or hover a bar for{" "}
                <span className="text-foreground">modeled savings (€k)</span>. <span className="text-foreground">Performance</span> groups OEE and line-throughput optimizations.
              </li>
            </ul>
          </Card>

          <Card className="p-4 rounded-card">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold">Governance & audit</h4>
                <p className="text-xs text-muted-foreground mt-0.5">All Vector AI decisions are logged with full traceability — input signals, model version, confidence, action taken, and verification outcome. SOC 2 Type II ready.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2"><Eye className="h-3.5 w-3.5" /> Audit log</Button>
            </div>
          </Card>
          </>
          )}
        </TabsContent>
      </Tabs>

      {/* Trigger Details Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-accent" />
              Trigger Details: {selectedTrigger?.name}
            </DialogTitle>
            <DialogDescription>
              Automated rule executed by {selectedTrigger?.agent}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrigger && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {selectedTrigger.enabled ? (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">{selectedTrigger.agent}</Badge>
              </div>

              {/* Condition & Action */}
              <div className="grid grid-cols-1 gap-3">
                <Card className="p-4 bg-muted/40">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Condition (When)</p>
                      <p className="text-sm font-mono">{selectedTrigger.condition}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-accent/5 border-accent/20">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">Action (Then)</p>
                      <p className="text-sm">{selectedTrigger.action}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fired Today</p>
                  </div>
                  <p className="text-2xl font-bold">{selectedTrigger.firedToday}</p>
                  <p className="text-xs text-muted-foreground mt-1">Times this trigger executed today</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Fired</p>
                  </div>
                  <p className="text-2xl font-bold">{selectedTrigger.lastFired}</p>
                  <p className="text-xs text-muted-foreground mt-1">Most recent execution</p>
                </Card>
              </div>

              {/* Additional Info */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold mb-1">Autonomous Execution</p>
                    <p className="text-xs text-muted-foreground">
                      This trigger runs automatically when the condition is met. All actions are logged for full audit traceability and can be reviewed in the governance dashboard.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>Close</Button>
                <Button 
                  onClick={() => {
                    void toggleTrigger(selectedTrigger.id);
                    setShowTriggerDialog(false);
                  }}
                >
                  {selectedTrigger.enabled ? "Disable Trigger" : "Enable Trigger"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KPI Details Dialog */}
      <Dialog open={showKpiDialog} onOpenChange={setShowKpiDialog}>
        <DialogContent className="max-w-3xl">
          {selectedKpi === 'active-triggers' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-accent" />
                  Active Triggers Overview
                </DialogTitle>
                <DialogDescription>
                  {enabledTriggers} triggers currently enabled and monitoring your systems
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-accent/5 border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Triggers</p>
                    <p className="text-3xl font-bold text-accent">{triggers.length}</p>
                  </Card>
                  <Card className="p-4 bg-success/5 border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">Enabled</p>
                    <p className="text-3xl font-bold text-success">{enabledTriggers}</p>
                  </Card>
                  <Card className="p-4 bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Disabled</p>
                    <p className="text-3xl font-bold">{triggers.length - enabledTriggers}</p>
                  </Card>
                </div>

                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Active Triggers List</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {triggers.filter(t => t.enabled).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.agent}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          Fired {t.firedToday}x today
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setShowKpiDialog(false)}>Close</Button>
                </div>
              </div>
            </>
          )}

          {selectedKpi === 'fired-today' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-success" />
                  Triggers Fired Today
                </DialogTitle>
                <DialogDescription>
                  {triggers.reduce((s, t) => s + t.firedToday, 0)} trigger executions across all rules
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Card className="p-4 bg-success/5 border-success/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Executions Today</p>
                      <p className="text-4xl font-bold text-success">{triggers.reduce((s, t) => s + t.firedToday, 0)}</p>
                    </div>
                    <Zap className="h-12 w-12 text-success/30" />
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Breakdown by Trigger</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {triggers
                      .filter(t => t.firedToday > 0)
                      .sort((a, b) => b.firedToday - a.firedToday)
                      .map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.agent} • Last: {t.lastFired}</p>
                          </div>
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            {t.firedToday}x
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setShowKpiDialog(false)}>Close</Button>
                </div>
              </div>
            </>
          )}

          {selectedKpi === 'successful-loops' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Successful Closed Loops
                </DialogTitle>
                <DialogDescription>
                  {loops.filter((l) => l.outcome === "success").length} autonomous actions completed end-to-end
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-success/5 border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">Successful</p>
                    <p className="text-3xl font-bold text-success">{loops.filter((l) => l.outcome === "success").length}</p>
                  </Card>
                  <Card className="p-4 bg-warning/5 border-warning/20">
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-3xl font-bold text-warning">{loops.filter((l) => l.outcome === "pending").length}</p>
                  </Card>
                  <Card className="p-4 bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Total Loops</p>
                    <p className="text-3xl font-bold">{loops.length}</p>
                  </Card>
                </div>

                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Recent Successful Actions</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {loops.filter(l => l.outcome === "success").map(l => (
                      <div key={l.id} className="p-3 bg-muted/40 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{l.agent}</Badge>
                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                              {l.outcome}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{l.ts}</span>
                        </div>
                        <p className="text-sm font-semibold">{l.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{l.asset}</p>
                        <p className="text-xs text-success mt-2">✓ {l.impact}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setShowKpiDialog(false)}>Close</Button>
                </div>
              </div>
            </>
          )}

          {selectedKpi === 'awaiting-approval' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-warning" />
                  Awaiting Human Approval
                </DialogTitle>
                <DialogDescription>
                  {loops.filter((l) => l.outcome === "pending").length} actions require manual approval before execution
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Card className="p-4 bg-warning/5 border-warning/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pending Approvals</p>
                      <p className="text-4xl font-bold text-warning">{loops.filter((l) => l.outcome === "pending").length}</p>
                    </div>
                    <Clock className="h-12 w-12 text-warning/30" />
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Actions Awaiting Approval</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {loops.filter(l => l.outcome === "pending").map(l => (
                      <div key={l.id} className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{l.agent}</Badge>
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                              {l.outcome}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{l.ts}</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Trigger:</p>
                            <p className="text-sm font-mono">{l.trigger}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Proposed Action:</p>
                            <p className="text-sm font-semibold">{l.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Asset:</p>
                            <p className="text-sm">{l.asset}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Expected Impact:</p>
                            <p className="text-sm text-accent">{l.impact}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setShowKpiDialog(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
