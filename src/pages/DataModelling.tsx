import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles, ArrowLeft, ArrowRight, Play, TrendingUp, TrendingDown, Minus,
  BarChart3, CheckCircle2, Lightbulb, Info, Send, ThumbsUp, ThumbsDown,
  Target, AlertTriangle, Bot, MessageSquareText, TableIcon, Clock, Gauge,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { ChartInfo } from "@/components/ChartInfo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { analyticsApi } from "@/lib/api/analytics";
import { genaiApi, type GenAiParsedReply } from "@/lib/api/genai";
import { useAnalyticsScope, type AnalyticsScopeValue } from "@/hooks/useAnalyticsScope";
import {
  mapGeneratedKpis, parseForecastChart, normalizeOutlierReport,
  FREQ_API, PERIOD_DAYS, machineLabel, type GeneratedKpi, type OutlierReport,
} from "@/lib/analyticsHelpers";
import { getCorrelationBadgeClasses } from "@/lib/colorThresholds";
import { useDataset } from "@/contexts/DatasetContext";
import { roleData, featureImportance, type BotResponse, type RoleKey } from "@/data/machineData";

const DEFAULT_KPI_PROMPT = "Generate top 5 KPIs based on the most important operational and sensor metrics in this dataset";
const KPI_LIMIT = 5;

const promptTypeIcon = {
  text: MessageSquareText,
  table: TableIcon,
  chart: BarChart3,
};

function resolveBotConfig(role: string | string[] | undefined) {
  const candidates = Array.isArray(role) ? role : role ? [role] : [];
  for (const r of candidates) {
    if (r in roleData) return roleData[r as RoleKey].botConfig;
  }
  return roleData.datapx_user.botConfig;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "chart" | "table";
  response?: BotResponse;
}

// ─── KPI Tab ────────────────────────────────────────────────────────────────
function KpiPanel({ scope }: { scope: AnalyticsScopeValue }) {
  const [machineScope, setMachineScope] = useState("all");
  const [selected, setSelected] = useState<GeneratedKpi | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_KPI_PROMPT);
  const [kpis, setKpis] = useState<GeneratedKpi[]>([]);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<Record<string, unknown> | null>(null);

  const scopeLabel =
    machineScope === "all"
      ? "All Machines (Fleet)"
      : machineLabel(scope.machines.find((m) => m.twin_id === machineScope) ?? { twin_id: machineScope, machine_serial: machineScope, simulation_enabled: false });

  const runGenerate = useCallback(
    async (text: string, opts?: { silent?: boolean }) => {
      if (!scope.registryId) {
        if (!opts?.silent) toast.error("No active dataset. Select a dataset in Data Ingestion first.");
        return;
      }
      setGenerating(true);
      setExecuteResult(null);
      try {
        const res = (await analyticsApi.generateKpis(text.trim(), scope.kpiScope(machineScope))) as { kpis?: unknown };
        const mapped = mapGeneratedKpis(res.kpis).slice(0, KPI_LIMIT);
        setKpis(mapped);
        if (!opts?.silent) {
          if (mapped.length) toast.success(`Generated ${mapped.length} KPI${mapped.length === 1 ? "" : "s"}`);
          else toast.message("No KPIs returned — try a different prompt");
        }
      } catch (err) {
        if (!opts?.silent) toast.error(err instanceof Error ? err.message : "KPI generation failed");
      } finally {
        setGenerating(false);
      }
    },
    [scope, machineScope],
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt to generate KPIs");
      return;
    }
    setKpis([]);
    await runGenerate(prompt.trim());
  };

  const handleExecute = async (kpi: GeneratedKpi) => {
    setSelected(kpi);
    setExecuteResult(null);
    setExecuting(true);
    try {
      const res = await analyticsApi.executeKpi(kpi.raw, scope.kpiScope(machineScope));
      setExecuteResult(res as Record<string, unknown>);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "KPI execution failed");
      setSelected(null);
    } finally {
      setExecuting(false);
    }
  };

  if (scope.loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading dataset scope…
      </div>
    );
  }

  if (scope.error) {
    return (
      <Card className="rounded-card p-6 border-destructive/30 bg-destructive/5">
        <p className="text-sm font-medium text-destructive">Could not load dataset</p>
        <p className="text-xs text-muted-foreground mt-1">{scope.error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void scope.refresh()}>Retry</Button>
      </Card>
    );
  }

  if (selected) {
    const chartPoints =
      (executeResult?.chart as { points?: { name: string; value: number }[] } | undefined)?.points ??
      (Array.isArray(executeResult?.plots) ? executeResult.plots : null);

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="rounded-button text-xs text-muted-foreground" onClick={() => { setSelected(null); setExecuteResult(null); }}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Back to KPIs
        </Button>

        <Card className="rounded-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">Column: <span className="font-mono text-foreground">{selected.column}</span></p>
            </div>
            <Badge variant="outline" className="text-xs">{scopeLabel}</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{selected.logic}</p>
        </Card>

        {executing ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Running KPI analysis…
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="rounded-card p-5 min-w-0 overflow-hidden">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-accent" /> KPI Chart
              </h3>
              {Array.isArray(chartPoints) && chartPoints.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No chart data returned from API.</p>
              )}
            </Card>
            <Card className="rounded-card p-5 space-y-3 min-w-0 overflow-hidden">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Generated Code & Output
              </h3>
              {executeResult?.code ? (
                <pre className="text-[11px] bg-muted/40 rounded-lg p-3 overflow-x-auto max-h-[480px] whitespace-pre-wrap">{String(executeResult.code)}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">No code or output returned from the API.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-center sm:text-left">KPI Generator</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Dataset: <span className="font-semibold text-foreground">{scope.displayName ?? "—"}</span>
            </p>
          </div>
          <Select value={machineScope} onValueChange={(v) => { setMachineScope(v); setKpis([]); }}>
            <SelectTrigger className="w-full sm:w-[280px] rounded-button"><SelectValue placeholder="Machine scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines (Fleet)</SelectItem>
              {scope.machines.map((m) => (
                <SelectItem key={m.twin_id} value={m.twin_id}>{machineLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 max-w-2xl mx-auto w-full">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt"
            className="rounded-input"
            onKeyDown={(e) => e.key === "Enter" && void handleGenerate()}
          />
          <Button className="rounded-button bg-primary hover:bg-primary/90 px-6 shrink-0" onClick={() => void handleGenerate()} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate KPIs"}
          </Button>
        </div>
        {(kpis.length > 0 || generating) && (
          <p className="text-sm text-muted-foreground">
            {generating
              ? "Loading suggested KPIs from your dataset…"
              : `Below are ${kpis.length} suggested KPI${kpis.length === 1 ? "" : "s"} from your dataset.`}
          </p>
        )}
      </Card>

      {generating && kpis.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: KPI_LIMIT }).map((_, i) => (
            <Card key={i} className="rounded-card p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="border-t pt-3 space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </Card>
          ))}
        </div>
      ) : kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <Card
              key={kpi.id}
              onClick={() => void handleExecute(kpi)}
              className="rounded-card p-5 space-y-3 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            >
              <h3 className="text-base font-semibold">{kpi.title}</h3>
              <div className="border-t pt-3 space-y-2">
                <div className="flex gap-3 text-xs">
                  <span className="text-muted-foreground w-16 shrink-0">Column:</span>
                  <span className="font-mono text-foreground">{kpi.column}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-muted-foreground w-16 shrink-0">Logic:</span>
                  <span className="text-muted-foreground leading-relaxed">{kpi.logic}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-card p-8 text-center border-dashed">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Enter a prompt and click Generate KPIs to load suggestions from your dataset.</p>
        </Card>
      )}
    </div>
  );
}

// ─── Modelling Tab ──────────────────────────────────────────────────────────
function ModellingPanel({ scope, activated }: { scope: AnalyticsScopeValue; activated: boolean }) {
  const [machineId, setMachineId] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresReady, setFeaturesReady] = useState(false);

  const [predTargetCol, setPredTargetCol] = useState("");
  const [predForm, setPredForm] = useState<Record<string, string>>({});
  const [rfCols, setRfCols] = useState<string[]>([]);
  const [predictionRun, setPredictionRun] = useState(false);
  const [training, setTraining] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{ result?: string; insights?: unknown } | null>(null);

  const [forecastTarget, setForecastTarget] = useState("");
  const [forecastFreq, setForecastFreq] = useState("Days");
  const [forecastPeriod, setForecastPeriod] = useState("5 days");
  const [forecastRun, setForecastRun] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastPoints, setForecastPoints] = useState<{ name: string; value: number }[]>([]);
  const [forecastTitle, setForecastTitle] = useState<string | null>(null);

  const [outlierTarget, setOutlierTarget] = useState("");
  const [outlierRun, setOutlierRun] = useState(false);
  const [outlierLoading, setOutlierLoading] = useState(false);
  const [outlierReport, setOutlierReport] = useState<OutlierReport | null>(null);

  useEffect(() => {
    if (scope.machines.length && !machineId) {
      setMachineId(scope.machines[0].twin_id);
    }
  }, [scope.machines, machineId]);

  const loadFeatures = useCallback(async (silent = false) => {
    const mlScope = scope.mlScope(machineId);
    if (!mlScope) return;
    setFeaturesLoading(true);
    setFeaturesReady(false);
    setFeatures([]);
    setPredTargetCol("");
    setForecastTarget("");
    setOutlierTarget("");
    try {
      const res = (await analyticsApi.getMlFeatures(mlScope)) as { features?: string[]; files?: Record<string, string[]> };
      const cols = res.features ?? (res.files ? Object.values(res.files)[0] : []) ?? [];
      setFeatures(cols);
      setFeaturesReady(true);
      if (cols.length) {
        setPredTargetCol(cols[0]);
        setForecastTarget(cols[0]);
        setOutlierTarget(cols[0]);
      }
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Failed to load columns");
    } finally {
      setFeaturesLoading(false);
    }
  }, [scope, machineId]);

  useEffect(() => {
    if (!activated) return;
    if (!scope.loading && !scope.error && machineId && scope.mlScope(machineId)) {
      void loadFeatures(true);
    }
  }, [activated, scope.loading, scope.error, scope.registryId, machineId, loadFeatures]);

  const runTrainRf = async () => {
    const mlScope = scope.mlScope(machineId);
    if (!mlScope || !predTargetCol) {
      toast.error("Select a machine and target column");
      return;
    }
    setTraining(true);
    setPredictionRun(false);
    setPredictionResult(null);
    try {
      const res = (await analyticsApi.trainRandomForest(predTargetCol, mlScope)) as {
        rf_cols?: string[];
        row_data?: Record<string, unknown>;
      };
      const cols = (res.rf_cols ?? []).filter((c) => c !== predTargetCol);
      setRfCols(cols);
      const defaults: Record<string, string> = {};
      for (const col of cols) {
        const v = res.row_data?.[col];
        defaults[col] = v != null ? String(v) : "";
      }
      setPredForm(defaults);
      setPredictionRun(true);
      toast.success("Random Forest model trained");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Training failed");
    } finally {
      setTraining(false);
    }
  };

  const runPredict = async () => {
    const mlScope = scope.mlScope(machineId);
    if (!mlScope?.file_name || !predTargetCol) return;
    setPredicting(true);
    try {
      const featuresPayload: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(predForm)) {
        const n = Number(v);
        featuresPayload[k] = Number.isNaN(n) ? v : n;
      }
      const res = (await analyticsApi.predictRandomForest(predTargetCol, featuresPayload, {
        ...mlScope,
        file_name: mlScope.file_name,
      })) as { rf_result?: string; insights?: unknown };
      setPredictionResult({ result: res.rf_result, insights: res.insights });
      toast.success("Prediction complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  };

  const runForecast = async () => {
    const mlScope = scope.mlScope(machineId);
    if (!mlScope || !forecastTarget) return;
    setForecastLoading(true);
    setForecastPoints([]);
    setForecastTitle(null);
    try {
      const res = await analyticsApi.trainArima(
        forecastTarget,
        FREQ_API[forecastFreq] ?? "days",
        PERIOD_DAYS[forecastPeriod] ?? 5,
        mlScope,
      );
      const { points, title } = parseForecastChart(res.path, res.data, forecastTarget);
      if (!points.length) {
        toast.error("Forecast completed but no chart data was returned");
        return;
      }
      setForecastPoints(points);
      setForecastTitle(title ?? null);
      setForecastRun(true);
      toast.success("Forecast generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Forecast failed");
    } finally {
      setForecastLoading(false);
    }
  };

  const runOutlier = async () => {
    const mlScope = scope.mlScope(machineId);
    if (!mlScope || !outlierTarget) return;
    setOutlierLoading(true);
    setOutlierReport(null);
    try {
      const res = await analyticsApi.detectOutliers(outlierTarget, mlScope);
      const report = normalizeOutlierReport(res);
      setOutlierReport(report);
      setOutlierRun(true);
      toast.success("Outlier analysis complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Outlier detection failed");
    } finally {
      setOutlierLoading(false);
    }
  };

  if (scope.loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading dataset…</div>;
  }
  if (scope.error) {
    return <p className="text-sm text-destructive">{scope.error}</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-card p-4 sm:p-5 space-y-3">
        <p className="text-xs text-muted-foreground">
          Active dataset: <span className="font-semibold text-foreground">{scope.displayName ?? scope.fileName}</span>
        </p>
        <div>
          <Label className="text-xs">Machine (required for ML)</Label>
          <Select
            value={machineId}
            onValueChange={(v) => {
              setMachineId(v);
              setPredictionRun(false);
              setForecastRun(false);
              setOutlierRun(false);
              setPredictionResult(null);
              setForecastPoints([]);
              setOutlierReport(null);
            }}
          >
            <SelectTrigger className="mt-1.5 w-full sm:max-w-md rounded-button"><SelectValue placeholder="Select machine" /></SelectTrigger>
            <SelectContent>
              {scope.machines.map((m) => (
                <SelectItem key={m.twin_id} value={m.twin_id}>{machineLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {featuresLoading ? (
          <Badge variant="outline" className="text-xs gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Loading target columns…</Badge>
        ) : featuresReady ? (
          <Badge variant="outline" className="text-xs">{features.length} numeric column{features.length === 1 ? "" : "s"} available</Badge>
        ) : null}
      </Card>

    <Tabs defaultValue="prediction" className="space-y-4">
      <TabsList className="rounded-button">
        <TabsTrigger value="prediction" className="rounded-button">Prediction</TabsTrigger>
        <TabsTrigger value="forecast" className="rounded-button">Forecast</TabsTrigger>
        <TabsTrigger value="outlier" className="rounded-button">Outlier Detection</TabsTrigger>
      </TabsList>

      {/* Prediction */}
      <TabsContent value="prediction" className="space-y-6">
        <Card className="rounded-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-2">Prediction Analysis</h2>
            <p className="text-sm text-muted-foreground">Categorize data into distinct groups using supervised learning</p>
          </div>

          <Card className="rounded-card border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">What are Target Columns?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Target columns are <strong>outcome variables</strong> you want to predict based on input features. The system automatically identifies columns suitable for prediction based on:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Numeric continuous values</strong> - Columns with measurable outcomes (e.g., failure probability, remaining useful life)</li>
                  <li><strong>Business relevance</strong> - Metrics that drive operational decisions and maintenance planning</li>
                  <li><strong>Data quality</strong> - Columns with sufficient historical data and minimal missing values</li>
                  <li><strong>Predictive power</strong> - Variables that show strong correlation with input features</li>
                </ul>
                <p className="text-xs text-accent mt-2">
                  <strong>Example:</strong> <span className="font-mono">failure_probability_14d</span> predicts machine failure risk within 14 days based on vibration, temperature, and maintenance history.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-medium">Target Column</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[320px]">
                      <p className="text-xs">
                        <strong>Available prediction targets:</strong><br />
                        • failure_probability_14d - Predict failure risk<br />
                        • remaining_useful_life_days - Asset lifespan<br />
                        • next_oee - Expected efficiency score
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={predTargetCol} onValueChange={setPredTargetCol} disabled={featuresLoading || !features.length}>
                <SelectTrigger className="mt-1.5 rounded-button"><SelectValue placeholder={featuresLoading ? "Loading columns…" : "Select target column"} /></SelectTrigger>
                <SelectContent>
                  {features.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Selected target: <span className="font-mono text-foreground">{predTargetCol}</span> - {predTargetCol === "failure_probability_14d" ? "Predicts machine failure probability within next 14 days" : predTargetCol === "remaining_useful_life_days" ? "Estimates remaining operational days before maintenance" : "Forecasts next Overall Equipment Effectiveness score"}
              </p>
            </div>
            <Button onClick={() => void runTrainRf()} disabled={training || featuresLoading || !featuresReady || !predTargetCol} className="w-full rounded-button bg-primary hover:bg-primary/90" size="lg">
              {training ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run Prediction Analysis
            </Button>
          </div>
        </Card>

        {predictionRun && (
          <Card className="rounded-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Prediction Analysis</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="h-4 w-4 text-success" /> Model Status: Successfully Trained
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-card border p-5 space-y-4">
                <h3 className="text-sm font-semibold">Enter Values for {predTargetCol} Prediction:</h3>
                {rfCols.map((field) => (
                  <div key={field}>
                    <Label className="text-xs font-medium capitalize">{field.replace(/_/g, " ")}</Label>
                    <Input
                      value={predForm[field] ?? ""}
                      onChange={(e) => setPredForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="mt-1 rounded-button"
                    />
                  </div>
                ))}
                <Button className="w-full rounded-button bg-primary hover:bg-primary/90" onClick={() => void runPredict()} disabled={predicting || !rfCols.length}>
                  {predicting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                  Get Prediction
                </Button>
              </Card>
              <div className="space-y-4">
                <Card className="rounded-card border-l-4 border-l-warning p-5 space-y-3">
                  <h3 className="text-sm font-semibold">Prediction Result</h3>
                  {predictionResult?.result ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-warning">{predictionResult.result}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Submit feature values to see the prediction.</p>
                  )}
                  {predictionResult?.insights && typeof predictionResult.insights === "object" && (
                    <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(predictionResult.insights, null, 2)}
                    </pre>
                  )}
                </Card>

                <Card className="rounded-card border p-5 space-y-3 bg-accent/5">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold">Why This Prediction? (Feature Contributions)</h3>
                      <p className="text-xs text-muted-foreground mt-2">
                        The 88% failure probability is driven by these key factors:
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs">
                        <li className="flex items-start gap-2">
                          <span className="text-destructive font-semibold min-w-[60px]">+34%</span>
                          <span className="text-muted-foreground"><strong>Vibration (6.8 mm/s)</strong> - 3.2x above normal baseline (2.1 mm/s). Indicates bearing wear or misalignment.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-warning font-semibold min-w-[60px]">+28%</span>
                          <span className="text-muted-foreground"><strong>Temperature (96°C)</strong> - Elevated thermal load suggests cooling system degradation.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-warning font-semibold min-w-[60px]">+18%</span>
                          <span className="text-muted-foreground"><strong>Operating Hours (822h)</strong> - Approaching scheduled maintenance interval (900h).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-accent font-semibold min-w-[60px]">+8%</span>
                          <span className="text-muted-foreground"><strong>Pressure Variance</strong> - Unstable hydraulic pressure pattern detected.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="rounded-card p-5">
              <TooltipProvider delayDuration={0}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    <h3 className="text-sm font-semibold">Correlation with Target ({predTargetCol})</h3>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="About correlation with target"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs z-[100]">
                      <p className="text-xs">
                        Feature importance indicates how much each variable contributes to the prediction. 
                        Pearson correlation shows the linear relationship strength between features and the target.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <DataTable
                  columns={[
                    { key: "feature", header: "Feature", render: (v) => <span className="font-medium font-mono text-xs">{String(v)}</span> },
                    { key: "importance", header: "Importance", align: "right", render: (v) => <span className="text-xs font-semibold">{(v as number).toFixed(2)}</span> },
                    { key: "correlation", header: "Pearson Correlation", align: "right", render: (v) => <span className="font-mono text-xs">{(v as number).toFixed(2)}</span> },
                    {
                      key: "_strength",
                      header: "Strength & Impact",
                      align: "right",
                      render: (_v, item) => {
                        const it = item as { feature: string; importance: number; correlation: number };
                        const absCorr = Math.abs(it.correlation);
                        const strengthLevel = absCorr >= 0.5 ? "Strong" : absCorr >= 0.3 ? "Moderate" : "Weak";
                        const strengthDesc = absCorr >= 0.5
                          ? "Strong correlation indicates this feature has significant predictive power for the target variable."
                          : absCorr >= 0.3
                          ? "Moderate correlation shows this feature has meaningful but not dominant influence on predictions."
                          : "Weak correlation suggests limited direct linear relationship with the target.";
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="inline-flex cursor-help rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                <Badge variant="outline" className={cn("text-[10px] font-semibold", getCorrelationBadgeClasses(it.correlation))}>
                                  {strengthLevel} ▼
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs z-[100]">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold">{strengthLevel} Correlation</p>
                                <p className="text-xs text-muted-foreground">{strengthDesc}</p>
                                <div className="pt-2 border-t space-y-1">
                                  <p className="text-xs"><strong>Importance:</strong> {(it.importance * 100).toFixed(0)}% contribution to model</p>
                                  <p className="text-xs"><strong>Correlation:</strong> {it.correlation > 0 ? "Positive" : "Negative"} ({it.correlation.toFixed(3)})</p>
                                  <p className="text-xs"><strong>Impact:</strong> {absCorr >= 0.5 ? "High" : absCorr >= 0.3 ? "Medium" : "Low"} predictive power</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      },
                    },
                  ] as ColumnDef[]}
                  rows={featureImportance}
                  getRowKey={(item) => (item as { feature: string }).feature}
                />
              </TooltipProvider>
            </Card>

            <Card className="rounded-card p-5 border-l-4 border-l-primary">
              <div className="flex items-start gap-3 mb-4">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Prescriptive Action Timeline</h3>
                  <p className="text-xs text-muted-foreground mt-1">Based on 88% failure probability, follow these time-bound actions to prevent unplanned downtime:</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-xs font-semibold text-destructive">Immediate (0-5 days)</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Critical:</strong> Inspect bearing assembly within 24 hours. Reduce operating load by 30%. Schedule emergency maintenance window. Order replacement bearings (lead time: 2-3 days).
                  </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-warning bg-warning/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <p className="text-xs font-semibold text-warning">5-10 Days</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Complete bearing replacement and alignment. Verify vibration levels return to &lt;2.5 mm/s. Test cooling system and replace thermal paste if needed. Run validation cycle.
                  </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-accent bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold text-accent">10-30 Days</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Monitor vibration and temperature trends closely. Update predictive maintenance model with post-repair data. Schedule follow-up inspection at 30-day mark to verify long-term stability.
                  </p>
                </Card>
                <Card className="p-4 border-l-4 border-l-success bg-success/5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-xs font-semibold text-success">30+ Days</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Return to standard preventive maintenance schedule. Document failure root cause analysis. Update asset reliability database. Estimated cost avoidance: €18,000-€24,000 in downtime.
                  </p>
                </Card>
              </div>
            </Card>
          </Card>
        )}
      </TabsContent>

      {/* Forecast */}
      <TabsContent value="forecast" className="space-y-6">
        <Card className="rounded-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-2">Forecast</h2>
            <p className="text-sm text-muted-foreground">Generate time-based forecasts to predict future trends</p>
          </div>

          <Card className="rounded-card border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">How Target Columns are Selected for Forecasting</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Forecast targets are <strong>time-series metrics</strong> with historical patterns. The system identifies columns suitable for forecasting based on:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Temporal continuity</strong> - Metrics recorded consistently over time with clear timestamps</li>
                  <li><strong>Trend patterns</strong> - Historical data showing growth, decline, or seasonal patterns</li>
                  <li><strong>Aggregatable metrics</strong> - Values that can be summed or averaged across time periods</li>
                  <li><strong>Operational KPIs</strong> - Business-critical metrics for capacity planning and resource allocation</li>
                </ul>
                <p className="text-xs text-accent mt-2">
                  <strong>Example:</strong> <span className="font-mono">cluster_output</span> forecasts production throughput to help plan capacity, schedule maintenance windows, and allocate resources.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-medium">Target Column</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">
                        <strong>Available forecast targets:</strong><br />
                        • cluster_output - Production throughput<br />
                        • avg_oee - Average efficiency<br />
                        • energy_kwh - Energy consumption
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={forecastTarget} onValueChange={setForecastTarget} disabled={featuresLoading || !features.length}>
                <SelectTrigger className="mt-1.5 rounded-button"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {features.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Forecasting: <span className="font-mono text-foreground">{forecastTarget}</span>
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Frequency</Label>
              <Select value={forecastFreq} onValueChange={setForecastFreq}>
                <SelectTrigger className="mt-1.5 rounded-button"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hours">Hours</SelectItem>
                  <SelectItem value="Days">Days</SelectItem>
                  <SelectItem value="Weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Forecast Period</Label>
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="mt-1.5 rounded-button w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1 day">1 day</SelectItem>
                <SelectItem value="5 days">5 days</SelectItem>
                <SelectItem value="2 weeks">2 weeks</SelectItem>
                <SelectItem value="1 month">1 month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void runForecast()} disabled={forecastLoading || featuresLoading || !featuresReady || !forecastTarget} className="w-full rounded-button bg-primary hover:bg-primary/90" size="lg">
            {forecastLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Run Forecast Analysis
          </Button>
        </Card>

        {forecastRun && (
          <Card className="rounded-card p-6 space-y-6">
            <h2 className="text-lg font-semibold">Time Series Forecast Results</h2>
            
            <Card className="rounded-card border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-primary">What is "Fleet Output"?</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    <strong>Fleet Output</strong> measures the total production throughput across all machines in units per hour. 
                    It aggregates individual machine outputs to show overall manufacturing capacity utilization. 
                    This metric helps predict production bottlenecks and capacity planning requirements.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Forecast uses ARIMA on the selected machine&apos;s historical {forecastTarget} series.
                  </p>
                </div>
              </div>
            </Card>
            
            <div>
              <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" /> Forecast Status: Successfully Generated
              </p>
              <Card className="rounded-card border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Forecasted {forecastTarget} Over Time</h3>
                  <ChartInfo
                    xAxis="Date (forecast period)"
                    yAxis="Fleet output in units per hour (total production throughput)"
                    note="Shows predicted production capacity based on historical patterns, seasonality, and trend analysis. Helps with capacity planning and resource allocation."
                  />
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastPoints}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }} 
                        stroke="hsl(var(--muted-foreground))" 
                        angle={-30} 
                        textAnchor="end" 
                        height={60}
                        label={{ value: "Date", position: "insideBottom", offset: -45, style: { fontSize: 11 } }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }} 
                        stroke="hsl(var(--muted-foreground))" 
                        domain={["dataMin - 1", "dataMax + 1"]}
                        label={{ value: "Units/Hour", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                      />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} name="Fleet Output (units/hr)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <p><strong>Interpretation:</strong> Chart shows time-series forecast with confidence intervals. Use this to plan production schedules, identify capacity constraints, and allocate resources efficiently.</p>
                </div>
              </Card>
            </div>
          </Card>
        )}
      </TabsContent>

      {/* Outlier Detection */}
      <TabsContent value="outlier" className="space-y-6">
        <Card className="rounded-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-2">Outlier Detection</h2>
            <p className="text-sm text-muted-foreground">
              Detect anomalies in your data using the Interquartile Range (IQR) method
            </p>
          </div>

          <Card className="rounded-card border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">Target Column Selection for Outlier Detection</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Outlier detection targets are <strong>numeric sensor readings</strong> and operational metrics. Columns are selected based on:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Numeric continuous data</strong> - Sensor readings, consumption metrics, or performance indicators</li>
                  <li><strong>Known normal ranges</strong> - Metrics with established operating parameters and thresholds</li>
                  <li><strong>Statistical distribution</strong> - Data suitable for IQR (Interquartile Range) analysis</li>
                  <li><strong>Anomaly significance</strong> - Deviations that indicate equipment issues or process problems</li>
                </ul>
                <p className="text-xs text-accent mt-2">
                  <strong>Example:</strong> <span className="font-mono">energy_consumption_kwh</span> detects machines consuming abnormally high energy, indicating potential motor degradation, misalignment, or inefficiency.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">Target Column</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[320px]">
                    <p className="text-xs">
                      <strong>Outlier detection targets:</strong><br />
                      • energy_consumption_kwh - Abnormal energy use<br />
                      • vibration_g - Excessive vibrations<br />
                      • system_temp_c - Temperature anomalies<br />
                      • speed_kmph - Unusual speed patterns
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={outlierTarget} onValueChange={setOutlierTarget} disabled={featuresLoading || !features.length}>
              <SelectTrigger className="mt-1.5 rounded-button"><SelectValue /></SelectTrigger>
              <SelectContent>
                {features.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              Analyzing: <span className="font-mono text-foreground">{outlierTarget}</span> - Detects statistically extreme values using IQR method
            </p>
          </div>
          <Button onClick={() => void runOutlier()} disabled={outlierLoading || featuresLoading || !featuresReady || !outlierTarget} className="w-full rounded-button bg-primary hover:bg-primary/90" size="lg">
            {outlierLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Run Outlier Detection
          </Button>
        </Card>

        {outlierLoading && (
          <Card className="rounded-card p-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Running outlier analysis…
          </Card>
        )}

        {outlierRun && outlierReport && !outlierLoading && (
          <Card className="rounded-card p-6 space-y-6">
            <h2 className="text-lg font-semibold">Anomaly Detection Results</h2>

            {outlierReport.summary.outlier_count === 0 ? (
              <Card className="rounded-card p-8 text-center border-dashed">
                <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-3" />
                <p className="text-sm font-medium">No outliers detected</p>
                <p className="text-xs text-muted-foreground mt-2">
                  All <span className="font-mono text-foreground">{outlierReport.summary.column}</span> values fall within{" "}
                  {outlierReport.summary.lower_bound} – {outlierReport.summary.upper_bound}.
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
                    <p className="text-xs text-muted-foreground">Outliers Detected</p>
                    <p className="text-3xl font-bold text-destructive mt-1">{outlierReport.summary.outlier_count.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-warning bg-warning/5">
                    <p className="text-xs text-muted-foreground">Normal Range</p>
                    <p className="text-xl font-bold text-warning mt-1">
                      {outlierReport.summary.lower_bound} – {outlierReport.summary.upper_bound}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{outlierReport.summary.method ?? "IQR"} method</p>
                  </Card>
                  <Card className="p-4 border-l-4 border-l-accent bg-accent/5">
                    <p className="text-xs text-muted-foreground">Preview Rows</p>
                    <p className="text-xl font-bold text-accent mt-1">{outlierReport.rows.length.toLocaleString()}</p>
                  </Card>
                </div>

                {outlierReport.rows.length > 0 && (
                  <DataTable
                    columns={Object.keys(outlierReport.rows[0]).map((col) => ({
                      key: col,
                      header: col.replace(/_/g, " "),
                      render: (v) => <span className="text-xs font-mono">{String(v ?? "")}</span>,
                    }) as ColumnDef)}
                    rows={outlierReport.rows.slice(0, 25)}
                    getRowKey={(_r, i) => i}
                  />
                )}
              </>
            )}
          </Card>
        )}
      </TabsContent>
    </Tabs>
    </div>
  );
}

// ─── AI Chatbot Tab ─────────────────────────────────────────────────────────
function AiPanel() {
  const { user } = useAuth();
  const { workspaceDatasets, activeDatasetId, setActiveDataset, loading: datasetLoading } = useDataset();
  const botConfig = resolveBotConfig(user?.role);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: "1", role: "assistant", content: botConfig.greeting, type: "text" }]);
  }, [user?.role, activeDatasetId, botConfig.greeting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const parsedToBotResponse = (parsed: GenAiParsedReply): BotResponse => {
    if (parsed.chartData?.length) {
      return {
        type: "chart",
        content: parsed.text,
        chartTitle: parsed.chartTitle ?? "Chart",
        chartData: parsed.chartData,
      };
    }
    if (parsed.tableRows?.length) {
      return {
        type: "table",
        content: parsed.text,
        tableHeaders: parsed.tableHeaders ?? [],
        tableRows: parsed.tableRows,
      };
    }
    return { type: "text", content: parsed.text };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, type: "text" };
    setMessages((prev) => [...prev, userMsg]);
    const queryText = input;
    setInput("");
    setTyping(true);
    try {
      const parsed = await genaiApi.chat(queryText);
      const response = parsedToBotResponse(parsed);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        type: response.type,
        response,
      }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Vector AI request failed";
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: message,
        type: "text",
      }]);
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startChatFromHistory = (title: string) => {
    setInput(title);
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] gap-4">
      <div className="flex w-[280px] shrink-0 flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested Prompts</p>
          <div className="flex flex-col gap-1.5">
            {botConfig.suggestedPrompts.map((p) => {
              const Icon = promptTypeIcon[p.type];
              return (
                <button
                  key={p.text}
                  onClick={() => setInput(p.text)}
                  className="flex items-center gap-2 rounded-button border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="truncate">{p.text}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Chat History</p>
          <div className="flex flex-col gap-1">
            {botConfig.chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => startChatFromHistory(chat.title)}
                className="flex items-center gap-2 rounded-button border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="truncate">{chat.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Dataset</p>
          {datasetLoading && !workspaceDatasets.length ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading datasets…
            </div>
          ) : workspaceDatasets.length ? (
            <Select
              value={activeDatasetId ?? undefined}
              onValueChange={(v) => void setActiveDataset(v)}
            >
              <SelectTrigger className="rounded-input"><SelectValue placeholder="Select dataset" /></SelectTrigger>
              <SelectContent>
                {workspaceDatasets.map((ds) => (
                  <SelectItem key={ds.dataset_id} value={ds.dataset_id}>{ds.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">No datasets selected. Choose datasets in Data Ingestion.</p>
          )}
        </div>
      </div>

      <Card className="flex flex-1 flex-col rounded-card overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-card px-4 py-3 text-sm bg-accent text-accent-foreground">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            }
            const resp = msg.response;
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] space-y-3">
                  <div className="rounded-card bg-card border px-4 py-3 text-sm leading-relaxed">{msg.content}</div>
                  {resp?.type === "table" && resp.tableHeaders && resp.tableRows && (
                    <DataTable
                      columns={resp.tableHeaders.map((h, j) => ({
                        key: String(j),
                        header: h,
                        render: (_v, row) => <span className="text-xs">{String((row as unknown[])[j] ?? "")}</span>,
                      }) as ColumnDef)}
                      rows={resp.tableRows.map((row) => Object.fromEntries(row.map((v, j) => [String(j), v])))}
                      getRowKey={(_r, i) => i}
                    />
                  )}
                  {resp?.type === "chart" && resp.chartData && (
                    <Card className="rounded-card border p-4">
                      <h4 className="text-sm font-semibold mb-3">{resp.chartTitle}</h4>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={resp.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6"><ThumbsUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><ThumbsDown className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-card border bg-card px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data… (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none rounded-input border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={handleSend} size="icon" className="rounded-button shrink-0" disabled={!input.trim() || typing}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function DataModelling() {
  const scope = useAnalyticsScope();
  const [activeTab, setActiveTab] = useState("kpi");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Modelling</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate KPIs, run predictive models, and chat with your fleet data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="rounded-button">
          <TabsTrigger value="kpi" className="rounded-button gap-1.5"><Target className="h-3.5 w-3.5" /> KPI</TabsTrigger>
          <TabsTrigger value="modelling" className="rounded-button gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Modelling</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-button gap-1.5"><Bot className="h-3.5 w-3.5" /> AI</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi"><KpiPanel scope={scope} /></TabsContent>
        <TabsContent value="modelling"><ModellingPanel scope={scope} activated={activeTab === "modelling"} /></TabsContent>
        <TabsContent value="ai"><AiPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
