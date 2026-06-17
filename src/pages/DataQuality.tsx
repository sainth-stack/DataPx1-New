import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Database, Sparkles, GitCompare, Download, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Sigma, Wand2, ShieldCheck, ArrowRight, MessageSquare, Bot, Loader2,
  TableIcon, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import { ChartInfo } from "@/components/ChartInfo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AIQualityChat } from "@/components/AIQualityChat";
import { useDataset } from "@/contexts/DatasetContext";
import { dataProcessingApi } from "@/lib/api/dataProcessing";

const QUALITY_THRESHOLD = 85;
const PREVIEW_ROW_LIMIT = 12;

interface QualityKpi {
  totalRows: number;
  qualityScore: number;
  missingCells: number;
  missingPct: number;
  outliers: number;
  duplicates: number;
  accuracy: number;
  consistency: number;
  validity: number;
  enrichedColumns?: number;
}

interface CleaningOperation {
  id?: string;
  op: string;
  target: string;
  count: number;
  description: string;
}

interface ComparisonRow {
  metric: string;
  raw: string;
  synthetic: string;
  deltaPct: number;
  better: boolean;
}

interface ChartDataPoint {
  column: string;
  raw: number;
  synthetic: number;
}

interface EnrichmentPlan {
  operations: { id: string; name: string; target: string; records_affected?: number; description?: string }[];
  dataset_already_clean?: boolean;
  message?: string;
}

interface JourneyData {
  rawRows: number;
  qualityBefore: number;
  qualityAfter: number;
}

function mapKpiMetrics(metrics: Record<string, unknown>, enrichedColumns = 0): QualityKpi {
  return {
    totalRows: (metrics.total_rows as number) ?? 0,
    qualityScore: Math.round((metrics.quality_score as number) ?? 0),
    missingCells: (metrics.missing_cells as number) ?? 0,
    missingPct: (metrics.missing_pct as number) ?? 0,
    outliers: (metrics.outliers as number) ?? 0,
    duplicates: (metrics.duplicate_records as number) ?? 0,
    accuracy: (metrics.data_accuracy as number) ?? 0,
    consistency: (metrics.consistency as number) ?? 0,
    validity: (metrics.validity as number) ?? 0,
    enrichedColumns,
  };
}

function mapPreviewRows(preview: { columns?: string[]; rows?: Record<string, unknown>[] }) {
  const columns = preview.columns ?? [];
  const rows = (preview.rows ?? []).map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val == null) return null;
      if (typeof val === "number" || typeof val === "string") return val;
      return String(val);
    }),
  );
  return { columns, rows };
}

function mapOperations(ops: { id?: string; name: string; target: string; records_affected?: number; description?: string }[]): CleaningOperation[] {
  return ops.map((op) => ({
    id: op.id,
    op: op.name,
    target: op.target,
    count: op.records_affected ?? 0,
    description: op.description ?? "",
  }));
}

function formatMetricValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  }
  return String(value);
}

function mapComparisonRows(rows: { metric: string; raw: unknown; synthetic: unknown; delta?: number; outcome?: string }[]): ComparisonRow[] {
  return rows.map((row) => {
    const delta = typeof row.delta === "number" ? row.delta : 0;
    const rawNum = typeof row.raw === "number" ? row.raw : parseFloat(String(row.raw));
    const deltaPct = Number.isFinite(rawNum) && rawNum !== 0
      ? Math.round((delta / rawNum) * 1000) / 10
      : delta !== 0 ? 100 : 0;
    return {
      metric: row.metric,
      raw: formatMetricValue(row.raw),
      synthetic: formatMetricValue(row.synthetic),
      deltaPct,
      better: row.outcome === "improved" || row.outcome === "same",
    };
  });
}

function mapChartData(chart: { x_labels?: string[]; series?: { name: string; values: number[] }[] }): ChartDataPoint[] {
  const labels = chart.x_labels ?? [];
  const rawSeries = chart.series?.find((s) => s.name.toLowerCase().includes("raw"));
  const synthSeries = chart.series?.find((s) => s.name.toLowerCase().includes("synth"));
  const rawValues = rawSeries?.values ?? [];
  const synthValues = synthSeries?.values ?? [];
  return labels.map((column, i) => ({
    column,
    raw: rawValues[i] ?? 0,
    synthetic: synthValues[i] ?? 0,
  }));
}

function applyEnrichmentResult(
  result: Record<string, unknown>,
  rawKpi: QualityKpi,
  rawColumns: string[],
) {
  const newColCount =
    (result.new_columns as unknown[] | undefined)?.length ??
    ((result.cards as Record<string, unknown> | undefined)?.enriched_columns_count as number) ??
    0;
  const syntheticKpi = mapKpiMetrics(result.synthetic as Record<string, unknown>, newColCount);
  const rawPreview = result.raw_preview ? mapPreviewRows(result.raw_preview as { columns?: string[]; rows?: Record<string, unknown>[] }) : { columns: [], rows: [] };
  const syntheticPreview = result.synthetic_preview
    ? mapPreviewRows(result.synthetic_preview as { columns?: string[]; rows?: Record<string, unknown>[] })
    : { columns: [], rows: [] };
  const rawColSet = new Set(rawColumns.length ? rawColumns : rawPreview.columns);
  const newColumnNames = syntheticPreview.columns.filter((c) => !rawColSet.has(c));
  const comparison = result.comparison as Record<string, unknown> | undefined;
  const journey = result.data_flow_journey as Record<string, number> | undefined;

  return {
    syntheticKpi,
    uplift: (result.quality_uplift as number) ?? syntheticKpi.qualityScore - rawKpi.qualityScore,
    journey: journey
      ? { rawRows: journey.raw_rows, qualityBefore: journey.quality_before, qualityAfter: journey.quality_after }
      : null,
    operations: mapOperations((result.operations_applied as EnrichmentPlan["operations"]) ?? []),
    comparison: comparison ? mapComparisonRows((comparison.side_by_side_metrics as Parameters<typeof mapComparisonRows>[0]) ?? []) : [],
    chartData: comparison ? mapChartData(comparison.missing_values_chart as Parameters<typeof mapChartData>[0]) : [],
    keyImprovements: (comparison?.key_improvements as string[]) ?? [],
    syntheticColumns: syntheticPreview.columns,
    syntheticRows: syntheticPreview.rows,
    newColumnNames,
  };
}

function KpiCard({
  label, value, icon: Icon, color, sub, tooltip,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
  tooltip?: { title: string; description: string; details: string[] };
}) {
  const content = (
    <Card className="rounded-card p-5 cursor-help">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[340px] p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold">{tooltip.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{tooltip.description}</p>
            {tooltip.details.length > 0 && (
              <div className="pt-2 border-t">
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {tooltip.details.map((detail, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-accent">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

function downloadCsv(filename: string, columns: string[], rows: (string | number | null)[][]) {
  const csv = [
    columns.join(","),
    ...rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c))).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} downloaded`);
}

function getQualityLevel(score: number): { level: string; color: string; description: string; recommendations: string[] } {
  if (score >= 85) {
    return {
      level: "Excellent",
      color: "text-success",
      description: "Production-ready data quality. Dataset meets all acceptance criteria for ML models and analytics.",
      recommendations: [
        "Data is ready for production use",
        "Continue monitoring for any degradation",
        "Maintain current data collection practices",
      ],
    };
  }
  if (score >= 70) {
    return {
      level: "Moderate",
      color: "text-warning",
      description: "Acceptable quality but with room for improvement. Some missing values, outliers, or inconsistencies detected that may impact model accuracy.",
      recommendations: [
        "Apply data cleaning operations to improve completeness",
        "Review and handle outliers in sensor readings",
        "Consider feature engineering to enrich dataset",
        "Implement automated quality checks",
      ],
    };
  }
  return {
    level: "Weak",
    color: "text-destructive",
    description: "Below acceptable threshold. Significant data quality issues including missing values, outliers, and inconsistencies that will negatively impact analytics and ML model performance.",
    recommendations: [
      "Immediate action required - data needs cleaning",
      "Use AI-powered enrichment to fill missing values",
      "Remove or cap extreme outliers",
      "Validate data sources and collection methods",
      "Consider re-collecting problematic data",
    ],
  };
}

export default function DataQuality() {
  const { activeDatasetId, activeDataset, loading: datasetLoading } = useDataset();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetLabel, setDatasetLabel] = useState("");
  const [rawKpi, setRawKpi] = useState<QualityKpi | null>(null);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<(string | number | null)[][]>([]);
  const [syntheticKpi, setSyntheticKpi] = useState<QualityKpi | null>(null);
  const [syntheticColumns, setSyntheticColumns] = useState<string[]>([]);
  const [syntheticRows, setSyntheticRows] = useState<(string | number | null)[][]>([]);
  const [newColumnNames, setNewColumnNames] = useState<string[]>([]);
  const [operations, setOperations] = useState<CleaningOperation[]>([]);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [keyImprovements, setKeyImprovements] = useState<string[]>([]);
  const [qualityUplift, setQualityUplift] = useState(0);
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [enrichmentReady, setEnrichmentReady] = useState(false);
  const [activeTab, setActiveTab] = useState("raw");
  const [tabLoading, setTabLoading] = useState(false);

  const [showAiChat, setShowAiChat] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plan, setPlan] = useState<EnrichmentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedOpIds, setSelectedOpIds] = useState<Set<string>>(new Set());
  const [enrichRunning, setEnrichRunning] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichStep, setEnrichStep] = useState("");

  const syntheticLoaded = useRef(false);
  const comparisonLoaded = useRef(false);

  const loadInitialData = useCallback(async () => {
    if (!activeDatasetId || !activeDataset) return;

    setLoading(true);
    setError(null);
    syntheticLoaded.current = false;
    comparisonLoaded.current = false;
    setEnrichmentReady(false);
    setSyntheticKpi(null);
    setComparisonRows([]);
    setChartData([]);
    setKeyImprovements([]);
    setOperations([]);
    setJourney(null);

    try {
      setDatasetLabel(activeDataset.display_name || activeDatasetId);
      try {
        await dataProcessingApi.refreshDataset(activeDatasetId);
      } catch {
        /* non-fatal */
      }

      const rawQuality = await dataProcessingApi.getRawQuality(activeDatasetId);
      const kpi = mapKpiMetrics(rawQuality.metrics);
      const preview = mapPreviewRows(rawQuality.preview);
      setRawKpi(kpi);
      setRawColumns(preview.columns);
      setRawRows(preview.rows.slice(0, PREVIEW_ROW_LIMIT));

      try {
        const status = await dataProcessingApi.getEnrichmentStatus(activeDatasetId);
        if (status.state === "completed") {
          setEnrichmentReady(true);
        }
      } catch {
        /* enrichment may not have run yet */
      }
    } catch (err) {
      setError(dataProcessingApi.extractMessage(err, "Failed to load quality data"));
    } finally {
      setLoading(false);
    }
  }, [activeDatasetId, activeDataset]);

  useEffect(() => {
    if (datasetLoading) return;
    if (!activeDatasetId) {
      setLoading(false);
      setError("No datasets available. Please select a dataset in Data Ingestion first.");
      return;
    }
    void loadInitialData();
  }, [activeDatasetId, datasetLoading, loadInitialData]);

  const loadSyntheticTab = useCallback(async () => {
    if (!activeDatasetId || syntheticLoaded.current) return;
    setTabLoading(true);
    try {
      const data = await dataProcessingApi.getSyntheticQuality(activeDatasetId);
      const preview = mapPreviewRows(data.preview);
      const baseCols = new Set(rawColumns.length ? rawColumns : preview.columns);
      setSyntheticKpi(mapKpiMetrics(data.metrics, data.new_columns?.length ?? 0));
      setSyntheticColumns(preview.columns);
      setSyntheticRows(preview.rows.slice(0, PREVIEW_ROW_LIMIT));
      setNewColumnNames(preview.columns.filter((c) => !baseCols.has(c)));
      if (data.new_columns?.length) {
        setOperations(
          data.new_columns.map((col: { name: string; description?: string; source?: string }) => ({
            id: col.name,
            op: `Enrich: ${col.name}`,
            target: col.name,
            count: data.metrics?.total_rows ?? 0,
            description: col.description ?? col.source ?? "",
          })),
        );
      }
      syntheticLoaded.current = true;
    } catch (err) {
      toast.error(dataProcessingApi.extractMessage(err, "Failed to load synthetic quality"));
    } finally {
      setTabLoading(false);
    }
  }, [activeDatasetId, rawColumns]);

  const loadComparisonTab = useCallback(async () => {
    if (!activeDatasetId || !rawKpi || comparisonLoaded.current) return;
    setTabLoading(true);
    try {
      const data = await dataProcessingApi.getQualityComparison(activeDatasetId);
      const enrichedCount = data.cards?.enriched_columns_count ?? 0;
      const synthKpi = mapKpiMetrics(data.synthetic, enrichedCount);
      setSyntheticKpi(synthKpi);
      setQualityUplift(data.quality_uplift ?? synthKpi.qualityScore - rawKpi.qualityScore);
      setComparisonRows(mapComparisonRows(data.side_by_side_metrics ?? []));
      setChartData(mapChartData(data.missing_values_chart ?? {}));
      setKeyImprovements(data.key_improvements ?? []);
      comparisonLoaded.current = true;
    } catch (err) {
      toast.error(dataProcessingApi.extractMessage(err, "Failed to load quality comparison"));
    } finally {
      setTabLoading(false);
    }
  }, [activeDatasetId, rawKpi]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      if (!enrichmentReady) return;
      if (tab === "synthetic") void loadSyntheticTab();
      if (tab === "compare" && comparisonRows.length === 0) void loadComparisonTab();
    },
    [enrichmentReady, loadSyntheticTab, loadComparisonTab, comparisonRows.length],
  );

  const openEnrichmentDialog = useCallback(async () => {
    if (!activeDatasetId) return;
    setDialogOpen(true);
    setPlan(null);
    setEnrichProgress(0);
    setEnrichStep("");
    setPlanLoading(true);
    try {
      const planData = await dataProcessingApi.getEnrichmentPlan(activeDatasetId, true);
      setPlan(planData);
      setSelectedOpIds(new Set(planData.operations.map((op) => op.id)));
    } catch (err) {
      toast.error(dataProcessingApi.extractMessage(err, "Failed to load enrichment plan"));
      setDialogOpen(false);
    } finally {
      setPlanLoading(false);
    }
  }, [activeDatasetId]);

  const toggleOp = useCallback((opId: string) => {
    setSelectedOpIds((prev) => {
      const next = new Set(prev);
      if (next.has(opId)) next.delete(opId);
      else next.add(opId);
      return next;
    });
  }, []);

  const handleEnrichmentResult = useCallback(
    (result: Record<string, unknown>) => {
      if (!rawKpi) return;
      const applied = applyEnrichmentResult(result, rawKpi, rawColumns);
      setSyntheticKpi(applied.syntheticKpi);
      setQualityUplift(applied.uplift);
      setJourney(applied.journey);
      setOperations(applied.operations);
      if (applied.comparison.length) {
        setComparisonRows(applied.comparison);
        setChartData(applied.chartData);
        setKeyImprovements(applied.keyImprovements);
        comparisonLoaded.current = true;
      }
      if (applied.syntheticRows.length) {
        setSyntheticColumns(applied.syntheticColumns);
        setSyntheticRows(applied.syntheticRows.slice(0, PREVIEW_ROW_LIMIT));
        setNewColumnNames(applied.newColumnNames);
        syntheticLoaded.current = true;
      }
      setEnrichmentReady(true);
    },
    [rawKpi, rawColumns],
  );

  const runEnrichment = useCallback(async () => {
    if (!activeDatasetId || !plan || plan.dataset_already_clean || !rawKpi) return;
    const opIds = Array.from(selectedOpIds);
    if (!opIds.length) {
      toast.error("Select at least one operation");
      return;
    }
    setEnrichRunning(true);
    setEnrichProgress(5);
    setEnrichStep("Starting enrichment…");
    try {
      const result = await dataProcessingApi.runEnrichment(activeDatasetId, {
        operation_ids: opIds,
        use_gpt: true,
      });
      setEnrichProgress(100);
      setEnrichStep("Completed");
      handleEnrichmentResult(result);
      toast.success("Dataset enriched successfully");
      setDialogOpen(false);
    } catch (err) {
      toast.error(dataProcessingApi.extractMessage(err, "Enrichment failed"));
      setEnrichProgress(0);
      setEnrichStep("");
    } finally {
      setEnrichRunning(false);
    }
  }, [activeDatasetId, plan, rawKpi, selectedOpIds, handleEnrichmentResult]);

  const planOperations = plan ? mapOperations(plan.operations) : operations;
  const needsImprovement = (rawKpi?.qualityScore ?? 0) < QUALITY_THRESHOLD;
  const rawQualityInfo = rawKpi ? getQualityLevel(rawKpi.qualityScore) : null;
  const syntheticQualityInfo = syntheticKpi ? getQualityLevel(syntheticKpi.qualityScore) : null;
  const uplift = qualityUplift || (syntheticKpi && rawKpi ? syntheticKpi.qualityScore - rawKpi.qualityScore : 0);
  const journeyRawRows = journey?.rawRows ?? rawKpi?.totalRows ?? 0;
  const journeyQualityBefore = journey?.qualityBefore ?? rawKpi?.qualityScore ?? 0;
  const journeyQualityAfter = journey?.qualityAfter ?? syntheticKpi?.qualityScore ?? 0;

  useEffect(() => {
    if (!needsImprovement || !rawKpi || loading) return;
    const timer = setTimeout(() => {
      toast.info("Data Quality Alert", {
        description: `Quality score (${rawKpi.qualityScore}%) is below production threshold (${QUALITY_THRESHOLD}%). Consider using AI-assisted data enrichment.`,
        duration: 10000,
        action: {
          label: "Enrich data",
          onClick: () => void openEnrichmentDialog(),
        },
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [needsImprovement, rawKpi, loading, openEnrichmentDialog]);

  if (loading || datasetLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !rawKpi) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Data Quality Assessment</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load quality data</AlertTitle>
          <AlertDescription>{error ?? "No dataset metrics available."}</AlertDescription>
        </Alert>
        <Button onClick={() => void loadInitialData()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Quality Assessment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {datasetLabel
            ? `Dataset: ${datasetLabel} — compare raw vs enriched synthetic quality.`
            : "Compare raw telemetry against the cleaned & enriched synthetic dataset to quantify data quality uplift."}
        </p>
      </div>

      {needsImprovement && (
        <Alert className="border-warning/50 bg-warning/5">
          <Bot className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Data Quality Below Threshold</AlertTitle>
          <AlertDescription className="text-sm">
            <p>Current quality score: <strong>{rawKpi.qualityScore}%</strong> | Production threshold: <strong>{QUALITY_THRESHOLD}%</strong></p>
            <p className="mt-2 text-muted-foreground">
              Your data has {rawKpi.missingCells.toLocaleString()} missing values and {rawKpi.outliers} outliers.
              AI-powered data enrichment can automatically clean, impute, and enhance your dataset to production-ready quality.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setShowAiChat(true)}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Improve Quality with AI Chat
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Data Flow Journey
          </h2>
          {syntheticKpi && uplift > 0 && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 cursor-help">
                    +{uplift} pts uplift
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">
                    <strong>Quality Score Improvement</strong><br />
                    From {journeyQualityBefore}% to {journeyQualityAfter}% (+{uplift} points)
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-stretch">
          <div className="md:col-span-2 rounded-lg border-2 border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wide text-warning">Raw</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{journeyRawRows.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">rows ingested</p>
            <p className="mt-2 text-[11px] text-warning">
              {rawKpi.missingCells.toLocaleString()} missing · {rawKpi.outliers} outliers
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="md:col-span-1 rounded-lg border bg-card p-4 text-center flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Quality</p>
            {rawQualityInfo && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className={`mt-1 text-3xl font-bold ${rawQualityInfo.color}`}>{rawKpi.qualityScore}%</p>
                      <p className={`text-[10px] font-medium ${rawQualityInfo.color}`}>{rawQualityInfo.level}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[320px] p-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">{rawQualityInfo.level} Quality</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{rawQualityInfo.description}</p>
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold mb-1.5">Recommendations:</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {rawQualityInfo.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-accent">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>

          <button
            type="button"
            onClick={() => void openEnrichmentDialog()}
            className="md:col-span-1 rounded-lg border-2 border-accent/40 bg-accent/5 p-4 text-center flex flex-col items-center justify-center hover:bg-accent/10 hover:border-accent/60 transition-all cursor-pointer"
          >
            <Wand2 className="h-5 w-5 text-accent" />
            <p className="mt-1.5 text-xs font-semibold text-accent">Cleanse &amp; Enrich</p>
            <p className="text-[10px] text-muted-foreground">
              {planOperations.length > 0 ? `${planOperations.length} ops` : "Plan on open"}
            </p>
            <p className="text-[9px] text-accent mt-1">Click to run</p>
          </button>

          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="md:col-span-1 rounded-lg border-2 border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="text-xs font-semibold uppercase tracking-wide text-success">Synthetic</span>
            </div>
            {syntheticKpi && syntheticQualityInfo ? (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="mt-2 text-2xl font-bold text-success">{syntheticKpi.qualityScore}%</p>
                      <p className="text-[11px] text-success font-medium">{syntheticQualityInfo.level}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[320px] p-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">{syntheticQualityInfo.level} Quality</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{syntheticQualityInfo.description}</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Run enrichment</p>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="raw" className="gap-2"><Database className="h-4 w-4" /> Raw Data View</TabsTrigger>
          <TabsTrigger value="synthetic" className="gap-2" disabled={!enrichmentReady}>
            <Sparkles className="h-4 w-4" /> Synthetic Data View
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2" disabled={!enrichmentReady}>
            <GitCompare className="h-4 w-4" /> Comparison View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raw" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Quality Score"
              value={`${rawKpi.qualityScore}/100`}
              icon={ShieldCheck}
              color="text-warning"
              sub={`${rawQualityInfo?.level} - Below threshold (85)`}
              tooltip={{
                title: `${rawQualityInfo?.level} Quality Score`,
                description: rawQualityInfo?.description ?? "",
                details: rawQualityInfo?.recommendations ?? [],
              }}
            />
            <KpiCard
              label="Data Accuracy"
              value={`${rawKpi.accuracy}%`}
              icon={CheckCircle2}
              color="text-warning"
              sub={`Validity ${rawKpi.validity}%`}
              tooltip={{
                title: "Data Accuracy Metrics",
                description: "Measures how accurately the data represents real-world values. Includes validity checks against expected ranges and data type constraints.",
                details: [
                  "Accuracy: Percentage of values within expected ranges",
                  "Validity: Percentage of values meeting type/format requirements",
                  "Consistency: Cross-field validation success rate",
                ],
              }}
            />
            <KpiCard
              label="Missing Cells"
              value={rawKpi.missingCells.toLocaleString()}
              icon={AlertTriangle}
              color="text-destructive"
              sub={`${rawKpi.missingPct}% of dataset`}
              tooltip={{
                title: "Missing Data Analysis",
                description: "Critical sensor readings and metadata fields with null or empty values. Missing data impacts ML model training and analytics reliability.",
                details: [
                  `Total missing: ${rawKpi.missingCells.toLocaleString()} cells`,
                  `Completeness: ${(100 - rawKpi.missingPct).toFixed(1)}%`,
                  "Recommended action: Apply intelligent imputation",
                ],
              }}
            />
            <KpiCard
              label="Outliers / Duplicates"
              value={`${rawKpi.outliers} / ${rawKpi.duplicates}`}
              icon={Sigma}
              color="text-destructive"
              sub="Detected by IQR + key match"
              tooltip={{
                title: "Anomalies Detected",
                description: "Statistical outliers (using IQR method) and exact duplicate records that can skew analytics and degrade model performance.",
                details: [
                  `Outliers: ${rawKpi.outliers} records with extreme values`,
                  `Duplicates: ${rawKpi.duplicates} identical timestamp+machine pairs`,
                  "Recommended: Cap outliers to P99.5 and remove duplicates",
                ],
              }}
            />
          </div>

          <Card className="rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">Raw Telemetry — first {PREVIEW_ROW_LIMIT} rows</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Empty cells = missing values · highlighted = outliers</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{rawKpi.totalRows.toLocaleString()} total rows</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {rawColumns.map((c) => (
                      <TableHead key={c} className="text-[11px] uppercase tracking-wide">{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawRows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => {
                        const missing = cell === null || cell === undefined || cell === "";
                        const outlier = rawColumns[j]?.includes("temperature") && typeof cell === "number" && cell > 200;
                        return (
                          <TableCell
                            key={j}
                            className={`text-xs font-mono ${
                              missing ? "bg-destructive/10 text-destructive" : outlier ? "bg-warning/15 text-warning font-semibold" : ""
                            }`}
                          >
                            {missing ? "— null —" : String(cell)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="synthetic" className="space-y-4 mt-4">
          {tabLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!tabLoading && !syntheticKpi && (
            <Card className="rounded-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Run cleanse & enrich to generate the synthetic dataset view.</p>
              <Button className="mt-4" onClick={() => void openEnrichmentDialog()}>
                <Wand2 className="h-4 w-4 mr-2" /> Start enrichment
              </Button>
            </Card>
          )}
          {!tabLoading && syntheticKpi && syntheticQualityInfo && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Quality Score"
                  value={`${syntheticKpi.qualityScore}/100`}
                  icon={ShieldCheck}
                  color="text-success"
                  sub={`${syntheticQualityInfo.level} - Production-ready`}
                  tooltip={{
                    title: `${syntheticQualityInfo.level} Quality Achieved`,
                    description: syntheticQualityInfo.description,
                    details: [
                      `+${syntheticKpi.qualityScore - rawKpi.qualityScore} point improvement from raw data`,
                      "All missing values imputed using intelligent methods",
                      "Outliers capped to realistic physical limits",
                      "Dataset validated for ML model training",
                    ],
                  }}
                />
                <KpiCard
                  label="Data Accuracy"
                  value={`${syntheticKpi.accuracy}%`}
                  icon={CheckCircle2}
                  color="text-success"
                  sub={`Validity ${syntheticKpi.validity}%`}
                  tooltip={{
                    title: "Enhanced Accuracy Metrics",
                    description: "Near-perfect data accuracy achieved through automated cleaning, validation, and enrichment processes.",
                    details: [
                      `Accuracy: ${syntheticKpi.accuracy}% (+${(syntheticKpi.accuracy - rawKpi.accuracy).toFixed(1)}% improvement)`,
                      `Validity: ${syntheticKpi.validity}% (+${(syntheticKpi.validity - rawKpi.validity).toFixed(1)}% improvement)`,
                      `Consistency: ${syntheticKpi.consistency}% (+${(syntheticKpi.consistency - rawKpi.consistency).toFixed(1)}% improvement)`,
                      "Ready for production analytics and ML models",
                    ],
                  }}
                />
                <KpiCard
                  label="Missing Cells"
                  value={String(syntheticKpi.missingCells)}
                  icon={CheckCircle2}
                  color="text-success"
                  sub={syntheticKpi.missingCells === 0 ? "100% complete" : `${syntheticKpi.missingPct}% remaining`}
                  tooltip={{
                    title: "Complete Data Coverage",
                    description: "Missing values corrected using intelligent imputation techniques.",
                    details: [`Imputed: ${rawKpi.missingCells.toLocaleString()} previously missing cells`],
                  }}
                />
                <KpiCard
                  label="Enriched Cols"
                  value={`+${syntheticKpi.enrichedColumns ?? newColumnNames.length}`}
                  icon={Wand2}
                  color="text-accent"
                  sub={newColumnNames.join(", ")}
                  tooltip={{
                    title: "Feature Engineering Applied",
                    description: "Additional calculated features that enhance model predictive power and provide deeper operational insights.",
                    details: newColumnNames.length
                      ? newColumnNames.map((col) => `${col}: derived feature for enhanced analytics`)
                      : ["No enriched columns detected"],
                  }}
                />
              </div>

              {planOperations.length > 0 && (
                <Card className="rounded-card p-5 border-l-4 border-l-success">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Cleaning & Enrichment Operations Applied</h2>
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                      {planOperations.length} operations completed
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Operation</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead className="text-right">Records Affected</TableHead>
                        <TableHead>Description & Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planOperations.map((o, i) => (
                        <TableRow key={o.id ?? i}>
                          <TableCell className="font-medium text-xs">
                            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">{o.op}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{o.target}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{o.count.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {syntheticColumns.length > 0 && (
                <Card className="rounded-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-semibold">Synthetic Dataset — first {PREVIEW_ROW_LIMIT} rows</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cleaned values · <span className="text-accent font-medium">highlighted columns</span> are newly engineered features
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => downloadCsv("synthetic_dataset.csv", syntheticColumns, syntheticRows)}
                    >
                      <Download className="h-4 w-4" /> Download CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {syntheticColumns.map((c) => (
                            <TableHead
                              key={c}
                              className={`text-[11px] uppercase tracking-wide ${newColumnNames.includes(c) ? "text-accent" : ""}`}
                            >
                              {c}{newColumnNames.includes(c) && " ✦"}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syntheticRows.map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell
                                key={j}
                                className={`text-xs font-mono ${newColumnNames.includes(syntheticColumns[j]) ? "bg-accent/5 text-accent" : ""}`}
                              >
                                {String(cell ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="compare" className="space-y-4 mt-4">
          {tabLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!tabLoading && !syntheticKpi && (
            <Card className="rounded-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Complete enrichment to compare raw vs synthetic metrics.</p>
            </Card>
          )}
          {!tabLoading && syntheticKpi && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-card p-5 border-l-4 border-l-warning">
                  <p className="text-xs font-medium text-muted-foreground">Raw Quality Score</p>
                  <p className="mt-2 text-3xl font-semibold text-warning">
                    {rawKpi.qualityScore}<span className="text-base text-muted-foreground">/100</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Pre-cleaning baseline</p>
                </Card>
                <Card className="rounded-card p-5 border-l-4 border-l-success">
                  <p className="text-xs font-medium text-muted-foreground">Synthetic Quality Score</p>
                  <p className="mt-2 text-3xl font-semibold text-success">
                    {syntheticKpi.qualityScore}<span className="text-base text-muted-foreground">/100</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Post cleaning + enrichment</p>
                </Card>
                <Card className="rounded-card p-5 border-l-4 border-l-accent">
                  <p className="text-xs font-medium text-muted-foreground">Net Improvement</p>
                  <p className="mt-2 text-3xl font-semibold text-accent flex items-center gap-2">
                    +{uplift}<TrendingUp className="h-6 w-6" />
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {rawKpi.qualityScore > 0
                      ? `+${((uplift / rawKpi.qualityScore) * 100).toFixed(1)}% relative gain`
                      : "Quality uplift"}
                  </p>
                </Card>
              </div>

              {comparisonRows.length > 0 && (
                <Card className="rounded-card p-5">
                  <h2 className="text-sm font-semibold mb-3">Side-by-Side Metric Comparison</h2>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Raw</TableHead>
                        <TableHead className="text-right">Synthetic</TableHead>
                        <TableHead className="text-right">Δ Change</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonRows.map((c) => (
                        <TableRow key={c.metric}>
                          <TableCell className="font-medium text-xs">{c.metric}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{c.raw}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{c.synthetic}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            <span className="text-success">
                              {c.deltaPct > 0 ? "+" : ""}{c.deltaPct}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                              {c.deltaPct > 0 ? <TrendingUp className="h-3 w-3 mr-1 inline" /> : <TrendingDown className="h-3 w-3 mr-1 inline" />}
                              Improved
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {chartData.length > 0 && (
                <Card className="rounded-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Missing Values per Column — Raw vs Synthetic</h3>
                    <ChartInfo
                      xAxis="Dataset column name"
                      yAxis="Percentage of missing values in that column (%)"
                      thresholds={[
                        { color: "hsl(var(--destructive))", label: "Raw — before cleaning" },
                        { color: "hsl(var(--success))", label: "Synthetic — after enrichment (0%)" },
                      ]}
                      note="Lower is better. Synthetic bars at 0% indicate complete data coverage."
                    />
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="column" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, "auto"]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, _name: string, item: { dataKey?: string }) => {
                            const isRaw = item?.dataKey === "raw";
                            return [`${Number(value).toFixed(1)}%`, isRaw ? "Raw (before)" : "Synthetic (after)"];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                        <Bar dataKey="raw" name="Raw" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} minPointSize={2} />
                        <Bar dataKey="synthetic" name="Synthetic" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} minPointSize={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <Card className="rounded-card p-5">
                <h3 className="text-sm font-semibold mb-3">Key Improvements Driving the Uplift</h3>
                <ul className="space-y-2 text-sm">
                  {(keyImprovements.length
                    ? keyImprovements
                    : [`Quality score improved from ${rawKpi.qualityScore}% to ${syntheticKpi.qualityScore}% (+${uplift} points).`]
                  ).map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {newColumnNames.length > 0 && (
                <Card className="rounded-card p-5 border-l-4 border-l-accent">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        New Enriched Columns Added
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {syntheticKpi.enrichedColumns ?? newColumnNames.length} additional features engineered to enhance model performance
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                      +{syntheticKpi.enrichedColumns ?? newColumnNames.length} columns
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {newColumnNames.map((col) => (
                      <Card key={col} className="p-4 bg-accent/5 border-accent/20">
                        <Badge variant="outline" className="text-[9px] bg-accent/10 text-accent border-accent/30 mb-2">NEW</Badge>
                        <p className="text-xs font-mono font-semibold text-accent mb-1">{col}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Derived feature for enhanced analytics</p>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90dvh] flex flex-col gap-4 overflow-hidden p-6">
          <DialogHeader className="shrink-0 pr-10 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent" />
              Data Cleansing & Enrichment
            </DialogTitle>
            <DialogDescription>
              Select operations from the server-generated plan, then run enrichment once.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1">
            {planLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : plan?.dataset_already_clean ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Dataset already clean</AlertTitle>
                <AlertDescription>{plan.message ?? "No enrichment required."}</AlertDescription>
              </Alert>
            ) : (
              <>
                {enrichRunning && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{enrichStep || "Running…"}</span>
                      <span className="text-muted-foreground">{enrichProgress}%</span>
                    </div>
                    <Progress value={enrichProgress} className="h-2" />
                  </div>
                )}
                <div className="space-y-2">
                  {planOperations.map((op) => {
                    const selected = op.id ? selectedOpIds.has(op.id) : false;
                    return (
                      <Card
                        key={op.id ?? op.op}
                        className={`p-4 cursor-pointer transition-all ${
                          selected ? "border-accent/40 bg-accent/5" : "bg-muted/20 opacity-70"
                        }`}
                        onClick={() => !enrichRunning && op.id && toggleOp(op.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {selected ? (
                              <CheckCircle2 className="h-5 w-5 text-accent" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">{op.op}</Badge>
                              <span className="text-xs font-mono text-muted-foreground">{op.count.toLocaleString()} records</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{op.description}</p>
                            <p className="text-xs font-medium mt-1">
                              Target: <span className="font-mono">{op.target}</span>
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={enrichRunning}>
              Cancel
            </Button>
            <Button
              onClick={() => void runEnrichment()}
              disabled={planLoading || enrichRunning || plan?.dataset_already_clean || !plan}
              className="gap-2"
            >
              {enrichRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enriching…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Run selected operations
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAiChat} onOpenChange={setShowAiChat}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Data Quality Assistant
            </DialogTitle>
            <DialogDescription>
              Get AI-powered recommendations to improve your data quality, handle missing values, and optimize your dataset for production use.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <AIQualityChat />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
