import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  FlaskConical, Download, Database, FileSpreadsheet, RefreshCw, Send,
  Sparkles, Settings2, Wand2, CheckCircle2, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import { dataPreparationApi } from "@/lib/api/dataPreparation";
import { datasetsApi } from "@/lib/api/datasets";
import { extractApiMessage } from "@/lib/api/scope";
import { useDataset } from "@/contexts/DatasetContext";

type ScenarioPreset = "normal" | "wear" | "overheat" | "vibration" | "energy_spike" | "mixed";

const scenarioPresets: { id: ScenarioPreset; label: string; description: string }[] = [
  { id: "normal", label: "Normal Operations", description: "Healthy baseline telemetry with light noise." },
  { id: "wear", label: "Progressive Wear", description: "Slow degradation across the time window." },
  { id: "overheat", label: "Overheating Event", description: "Temperature spikes during peak shifts." },
  { id: "vibration", label: "Vibration Anomaly", description: "Bearing-style vibration anomalies." },
  { id: "energy_spike", label: "Energy Consumption Spike", description: "Unexpected energy draw bursts." },
  { id: "mixed", label: "Mixed Faults", description: "Random combination of fault patterns." },
];

const API_SCENARIOS: Record<ScenarioPreset, string> = {
  normal: "normal",
  wear: "progressive_wear",
  overheat: "overheating",
  vibration: "heavy_vibration",
  energy_spike: "energy_spikes",
  mixed: "normal",
};

interface GenConfig {
  days: number;
  hoursPerDay: number;
  intervalMin: number;
  scenario: ScenarioPreset;
  anomalyRate: number;
  noise: number;
  startDate: string;
  prompt: string;
}

interface FleetParams {
  machine_name: string;
  machine_model: string;
  number_of_machines: number;
}

interface GenerateResult {
  job_id?: string;
  dataset_name?: string;
  file_name?: string;
  display_name?: string;
  row_count: number;
  feature_columns?: number;
  machine_count?: number;
  scenario?: string;
  columns?: string[];
  ingestion_ready?: boolean;
  registered?: boolean;
  registry_id?: number;
  dataset_id?: string;
}

interface ServerDataset {
  registry_id: number;
  display_name: string;
  row_count: number;
  dataset_id?: string;
  table_name?: string;
  column_count?: number;
  scenario?: string;
  created_at?: string;
}

function parseFleetSize(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(100, Math.max(1, n));
}

function defaultPrompt(fleet: FleetParams, scenario: ScenarioPreset): string {
  const label = `${fleet.machine_name} ${fleet.machine_model}`.trim();
  return `Generate operational telemetry for ${fleet.number_of_machines} ${label} machine(s). Include engine, hydraulics, temperature, vibration, energy, and load sensors. Scenario: ${scenario.replace("_", " ")}.`;
}

function effectiveAnomalyRate(scenario: ScenarioPreset, rate: number): number {
  return scenario === "mixed" ? Math.max(rate, 28) : rate;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PrepField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helperText,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helperText?: string;
  inputMode?: "numeric" | "text";
}) {
  const hasValue = value.length > 0;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={hasValue ? "pr-9" : undefined}
        />
        {hasValue && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
    </div>
  );
}

export default function DataPreparation() {
  const navigate = useNavigate();
  const { refresh: refreshDatasets } = useDataset();
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<"select" | "configure" | "generate">("select");
  const [oem, setOem] = useState("");
  const [model, setModel] = useState("");
  const [fleetSize, setFleetSize] = useState("1");

  const [cfg, setCfg] = useState<GenConfig>({
    days: 2,
    hoursPerDay: 24,
    intervalMin: 60,
    scenario: "normal",
    anomalyRate: 12,
    noise: 25,
    startDate: today,
    prompt: "",
  });

  const [format, setFormat] = useState<"csv" | "xlsx" | "parquet">("csv");
  const [machineSchema, setMachineSchema] = useState<Record<string, unknown> | null>(null);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);

  const [estimatedRows, setEstimatedRows] = useState<number | null>(null);
  const [estimatingRows, setEstimatingRows] = useState(false);
  const [applyingPrompt, setApplyingPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [previousExports, setPreviousExports] = useState<ServerDataset[]>([]);
  const [loadingExports, setLoadingExports] = useState(false);
  const exportsLoadedRef = useRef(false);
  const lastEstimateKeyRef = useRef<string | null>(null);

  const fleet = useMemo((): FleetParams | null => {
    const name = oem.trim();
    const machineModel = model.trim();
    if (!name || !machineModel) return null;
    return {
      machine_name: name,
      machine_model: machineModel,
      number_of_machines: parseFleetSize(fleetSize),
    };
  }, [oem, model, fleetSize]);

  const fleetDefined = !!fleet;
  const machineCount =
    fleet?.number_of_machines ??
    (typeof machineSchema?.number_of_machines === "number"
      ? (machineSchema.number_of_machines as number)
      : parseFleetSize(fleetSize) || (cfg.prompt.trim() ? 1 : 0));

  const canGenerate = !!(cfg.prompt.trim() || fleetDefined || machineSchema);

  const estimateKey = useMemo(
    () => JSON.stringify({
      oem: oem.trim(),
      model: model.trim(),
      fleetSize,
      prompt: cfg.prompt.trim(),
      hasSchema: !!machineSchema,
      days: cfg.days,
      hoursPerDay: cfg.hoursPerDay,
      intervalMin: cfg.intervalMin,
    }),
    [oem, model, fleetSize, cfg.prompt, machineSchema, cfg.days, cfg.hoursPerDay, cfg.intervalMin],
  );

  const fallbackEstimate = machineCount > 0
    ? Math.round(machineCount * cfg.days * cfg.hoursPerDay * (60 / cfg.intervalMin))
    : 0;
  const displayEstimate = estimatedRows ?? fallbackEstimate;
  const displayColumns = columnNames.length || previewColumns.length || generateResult?.columns?.length || 0;

  const fetchEstimate = useCallback(async () => {
    if (!fleet && !machineSchema && !cfg.prompt.trim()) {
      setEstimatedRows(0);
      lastEstimateKeyRef.current = estimateKey;
      return;
    }
    setEstimatingRows(true);
    try {
      const body: Record<string, unknown> = {
        days: cfg.days,
        hours_per_day: cfg.hoursPerDay,
        interval_minutes: cfg.intervalMin,
      };
      if (fleet) {
        Object.assign(body, fleet);
      } else if (machineSchema) {
        body.machine_schema = machineSchema;
        if (typeof machineSchema.number_of_machines === "number") {
          body.number_of_machines = machineSchema.number_of_machines;
        }
      } else if (cfg.prompt.trim()) {
        body.prompt = cfg.prompt.trim();
      }
      const res = await dataPreparationApi.estimateRows(body);
      setEstimatedRows(res.estimated_rows);
      lastEstimateKeyRef.current = estimateKey;
    } catch {
      setEstimatedRows(null);
    } finally {
      setEstimatingRows(false);
    }
  }, [fleet, machineSchema, cfg.days, cfg.hoursPerDay, cfg.intervalMin, cfg.prompt, estimateKey]);

  useEffect(() => {
    if (step !== "configure" || lastEstimateKeyRef.current === estimateKey) return;
    const timer = window.setTimeout(() => void fetchEstimate(), 400);
    return () => window.clearTimeout(timer);
  }, [step, estimateKey, fetchEstimate]);

  useEffect(() => {
    setMachineSchema(null);
    setColumnNames([]);
    lastEstimateKeyRef.current = null;
    setEstimatedRows(null);
  }, [oem, model, fleetSize]);

  const loadPreview = useCallback(async (datasetId: string) => {
    setLoadingPreview(true);
    try {
      const res = await datasetsApi.getRawPreview(datasetId, { limit: 10, offset: 0 }) as {
        data?: { columns?: Record<string, unknown>; rows?: unknown[][] };
        columns?: Record<string, unknown>;
        rows?: unknown[][];
      };
      const payload = res.data ?? res;
      setPreviewColumns(Object.keys(payload.columns ?? {}));
      setPreviewRows(payload.rows ?? []);
    } catch (err) {
      setPreviewRows([]);
      toast.error(extractApiMessage(err, "Failed to load preview"));
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const refreshExports = useCallback(async () => {
    setLoadingExports(true);
    try {
      const list = await dataPreparationApi.listDatasets();
      setPreviousExports(list as unknown as ServerDataset[]);
      exportsLoadedRef.current = true;
    } catch (err) {
      toast.error(extractApiMessage(err, "Failed to load exports"));
    } finally {
      setLoadingExports(false);
    }
  }, []);

  useEffect(() => {
    if (step === "generate" && !exportsLoadedRef.current) {
      void refreshExports();
    }
  }, [step, refreshExports]);

  const applyPromptBody = (promptText: string) => ({
    prompt: promptText.trim(),
    scenario: API_SCENARIOS[cfg.scenario],
    ...(fleet ?? {}),
  });

  const resolveSchema = async (promptText: string) => {
    if (machineSchema) return machineSchema;
    const prompt = promptText.trim();
    if (!prompt && !fleet) throw new Error("Enter a prompt or define OEM and model first");
    const res = await dataPreparationApi.applyPrompt(
      applyPromptBody(prompt || defaultPrompt(fleet!, cfg.scenario)),
    ) as { machine_schema: Record<string, unknown>; columns: Array<{ name: string }> };
    setMachineSchema(res.machine_schema);
    setColumnNames(res.columns.map((c) => c.name));
    return res.machine_schema;
  };

  const handleApplyPrompt = async () => {
    if (!cfg.prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }
    setApplyingPrompt(true);
    try {
      const res = await dataPreparationApi.applyPrompt(applyPromptBody(cfg.prompt)) as {
        machine_schema: Record<string, unknown>;
        columns: Array<{ name: string }>;
        column_count?: number;
        machine_count?: number;
      };
      setMachineSchema(res.machine_schema);
      setColumnNames(res.columns.map((c) => c.name));
      const count = res.machine_count ?? (res.machine_schema.number_of_machines as number | undefined) ?? machineCount;
      toast.success(`Schema ready — ${res.column_count ?? res.columns.length} columns for ${count} machine(s)`);
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setApplyingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error("Enter a prompt or define OEM and model first");
      return;
    }
    if (displayEstimate === 0) {
      toast.error("Estimated row count is zero — adjust time window or apply prompt first");
      return;
    }
    setGenerating(true);
    try {
      const schema = await resolveSchema(cfg.prompt || (fleet ? defaultPrompt(fleet, cfg.scenario) : ""));
      const generateBody: Record<string, unknown> = {
        machine_schema: schema,
        prompt: cfg.prompt.trim() || undefined,
        start_date: cfg.startDate,
        days: cfg.days,
        hours_per_day: cfg.hoursPerDay,
        interval_minutes: cfg.intervalMin,
        scenario: API_SCENARIOS[cfg.scenario],
        anomaly_rate_pct: effectiveAnomalyRate(cfg.scenario, cfg.anomalyRate),
        sensor_noise_pct: cfg.noise,
      };
      if (fleet) Object.assign(generateBody, fleet);
      const result = await dataPreparationApi.generate(generateBody) as GenerateResult;

      setGenerateResult(result);
      setGeneratedAt(new Date().toLocaleString());
      setStep("generate");
      exportsLoadedRef.current = false;
      void refreshExports();

      const datasetId = result.dataset_id ?? String(result.registry_id ?? "");
      if (datasetId) await loadPreview(datasetId);

      toast.success(`Generated ${result.row_count.toLocaleString()} rows on server`);
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    const id = generateResult?.dataset_id ?? generateResult?.registry_id;
    if (!id) {
      toast.error("Generate data first");
      return;
    }
    setExporting(true);
    try {
      const fmt = format === "parquet" ? "parquet" : format === "xlsx" ? "xlsx" : "csv";
      const { blob, filename } = await dataPreparationApi.downloadDataset(id, fmt);
      downloadBlob(filename, blob);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleUseInIngestion = async () => {
    const displayName = generateResult?.display_name ?? generateResult?.dataset_name;
    if (!displayName) {
      toast.error("Generate data first");
      return;
    }
    setRegistering(true);
    try {
      await datasetsApi.updateUserSelectedFiles([displayName]);
      await refreshDatasets({ force: true });
      toast.success("Dataset registered for Data Ingestion", {
        description: `${generateResult?.row_count?.toLocaleString() ?? 0} rows • ${displayName}`,
        action: {
          label: "Open",
          onClick: () => navigate("/data-ingestion"),
        },
      });
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenExport = async (item: ServerDataset) => {
    setLoadingPreview(true);
    try {
      const detail = await dataPreparationApi.getDataset(item.registry_id) as ServerDataset & {
        table_name?: string;
        column_count?: number;
      };
      const result: GenerateResult = {
        dataset_name: detail.table_name,
        file_name: detail.display_name,
        display_name: detail.display_name,
        row_count: detail.row_count,
        feature_columns: detail.column_count,
        scenario: detail.scenario ?? cfg.scenario,
        registry_id: detail.registry_id,
        dataset_id: detail.dataset_id,
        ingestion_ready: true,
        registered: true,
        columns: [],
      };
      setGenerateResult(result);
      setGeneratedAt(detail.created_at ? new Date(detail.created_at).toLocaleString() : new Date().toLocaleString());
      const datasetId = detail.dataset_id ?? String(detail.registry_id);
      if (datasetId) await loadPreview(datasetId);
      setStep("generate");
    } catch (err) {
      toast.error(extractApiMessage(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const tableColumns = previewColumns.length
    ? previewColumns
    : columnNames.length
      ? columnNames
      : generateResult?.columns ?? [];

  const busy = applyingPrompt || generating || exporting || registering || loadingPreview;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-accent shrink-0" />
            Data Preparation
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Define your fleet and generate synthetic telemetry via the server simulator.
            Apply a prompt for GPT schema, then export or use the dataset in Data Ingestion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" /> {displayColumns || "—"} columns
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" /> API-backed
          </Badge>
          {machineSchema && (
            <Badge variant="outline" className="gap-1 bg-accent/10 text-accent border-accent/30">
              Schema ready
            </Badge>
          )}
        </div>
      </div>

      <Card className="rounded-card p-3 sm:p-4 overflow-hidden relative">
        {generating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px] rounded-card">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span>Generating dataset on server…</span>
            </div>
          </div>
        )}

        <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto gap-1.5 p-1">
            <TabsTrigger value="select" className="gap-2 h-auto py-2.5 px-3 whitespace-normal text-left sm:text-center justify-start sm:justify-center">
              <Database className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">1. Define Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="configure" className="gap-2 h-auto py-2.5 px-3 whitespace-normal text-left sm:text-center justify-start sm:justify-center">
              <Settings2 className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">2. Configure & Prompt</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2 h-auto py-2.5 px-3 whitespace-normal text-left sm:text-center justify-start sm:justify-center">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">3. Generate & Export</span>
            </TabsTrigger>
          </TabsList>

          {/* STEP 1 — DEFINE FLEET */}
          <TabsContent value="select" className="mt-4 sm:mt-5 space-y-4 min-w-0">
            <div>
              <h3 className="text-lg font-semibold mb-1">Define your fleet</h3>
              <p className="text-sm text-muted-foreground">
                Enter machine details — same as Digital Twin onboarding. The server builds twin IDs
                from OEM, model, and fleet size. All fields are optional; skip this step to configure via prompt only.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PrepField
                id="prep-oem"
                label="OEM / Manufacturer"
                placeholder="e.g., Kalmar, Konecranes"
                value={oem}
                onChange={setOem}
                helperText="Optional"
              />
              <PrepField
                id="prep-model"
                label="Model"
                placeholder="e.g., DRU450, RTG-014"
                value={model}
                onChange={setModel}
                helperText="Optional"
              />
              <PrepField
                id="prep-fleet-size"
                label="Number of Machines"
                placeholder="1"
                value={fleetSize}
                onChange={(v) => setFleetSize(v.replace(/\D/g, ""))}
                inputMode="numeric"
                helperText="Optional — how many machines (1–100)"
              />
            </div>

            {fleet && (
              <Card className="rounded-card p-4 bg-muted/30 border-dashed">
                <p className="text-xs text-muted-foreground mb-1">Fleet preview</p>
                <p className="text-sm font-medium">
                  {fleet.number_of_machines} × {fleet.machine_name} {fleet.machine_model}
                </p>
              </Card>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("configure")} className="w-full sm:w-auto">
                Skip
              </Button>
              <Button onClick={() => setStep("configure")} className="gap-2 w-full sm:w-auto">
                Continue <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* STEP 2 — CONFIGURE */}
          <TabsContent value="configure" className="mt-5">
            {!fleetDefined && (
              <div className="mb-4 rounded-md border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Fleet details were skipped. Describe your dataset in the prompt below — OEM and model are optional.
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="rounded-card p-4 sm:p-5 lg:col-span-2 space-y-3 border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold">Describe the dataset (GPT schema)</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Natural-language brief sent to the API. Required before generate unless you use the default schema.
                </p>
                <Textarea
                  value={cfg.prompt}
                  onChange={(e) => setCfg({ ...cfg, prompt: e.target.value })}
                  placeholder="e.g. Hourly reach stacker telemetry with hydraulics, fuel, and vibration sensors."
                  className="min-h-[110px] bg-background"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Heavy vibration anomalies over 3 days",
                    "Mild overheating during peak shifts",
                    "Progressive wear over a week",
                    "Energy spikes, clean baseline",
                  ].map((s) => (
                    <Button key={s} size="sm" variant="outline" className="h-7 text-[11px]"
                      onClick={() => setCfg({ ...cfg, prompt: s })}>
                      {s}
                    </Button>
                  ))}
                </div>
                <Button size="sm" onClick={() => void handleApplyPrompt()} className="gap-2"
                  disabled={!cfg.prompt.trim() || applyingPrompt}>
                  {applyingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Apply prompt (API)
                </Button>
              </Card>

              <Card className="rounded-card p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-semibold">Selection Summary</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">OEM</span>
                    <span className="font-semibold truncate">{oem.trim() || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-semibold truncate">{model.trim() || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Machines</span>
                    <span className="font-semibold">{machineCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days</span>
                    <span className="font-semibold">{cfg.days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours/day</span>
                    <span className="font-semibold">{cfg.hoursPerDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span className="font-semibold">{cfg.intervalMin} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scenario</span>
                    <span className="font-semibold capitalize">{cfg.scenario.replace("_", " ")}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estimated rows</span>
                    <span className="font-semibold text-accent flex items-center gap-1">
                      {estimatingRows && <Loader2 className="h-3 w-3 animate-spin" />}
                      {displayEstimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Columns</span>
                    <span className="font-semibold">{displayColumns || "—"}</span>
                  </div>
                </div>
                <Button onClick={() => void handleGenerate()} className="w-full gap-2 mt-2"
                  disabled={generating || !canGenerate}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Generate on server
                </Button>
              </Card>

              <Card className="rounded-card p-4 sm:p-5 space-y-4 lg:col-span-2">
                <h3 className="text-sm font-semibold">Time Window</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Start date</Label>
                    <Input type="date" value={cfg.startDate} onChange={(e) => setCfg({ ...cfg, startDate: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Days</Label>
                    <Input type="number" min={1} max={30} value={cfg.days}
                      onChange={(e) => setCfg({ ...cfg, days: Math.max(1, Math.min(30, +e.target.value || 1)) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Hours per day</Label>
                    <Input type="number" min={1} max={24} value={cfg.hoursPerDay}
                      onChange={(e) => setCfg({ ...cfg, hoursPerDay: Math.max(1, Math.min(24, +e.target.value || 1)) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Sampling interval</Label>
                    <Select value={String(cfg.intervalMin)} onValueChange={(v) => setCfg({ ...cfg, intervalMin: +v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card className="rounded-card p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold">Scenario & Anomalies</h3>
                <div>
                  <Label className="text-xs">Scenario preset</Label>
                  <Select value={cfg.scenario} onValueChange={(v) => {
                    setCfg({ ...cfg, scenario: v as ScenarioPreset });
                    setMachineSchema(null);
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {scenarioPresets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {scenarioPresets.find((s) => s.id === cfg.scenario)?.description}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <Label>Anomaly rate</Label>
                    <span className="font-semibold">{cfg.anomalyRate}%</span>
                  </div>
                  <Slider value={[cfg.anomalyRate]} min={0} max={60} step={1}
                    onValueChange={(v) => setCfg({ ...cfg, anomalyRate: v[0] })} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <Label>Sensor noise</Label>
                    <span className="font-semibold">{cfg.noise}%</span>
                  </div>
                  <Slider value={[cfg.noise]} min={0} max={100} step={1}
                    onValueChange={(v) => setCfg({ ...cfg, noise: v[0] })} className="mt-2" />
                </div>
              </Card>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep("select")} className="w-full sm:w-auto">← Back</Button>
              <Button onClick={() => void handleGenerate()} className="gap-2 w-full sm:w-auto"
                disabled={generating || busy || !canGenerate}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate on server
              </Button>
            </div>
          </TabsContent>

          {/* STEP 3 — GENERATE */}
          <TabsContent value="generate" className="mt-5 space-y-4">
            {generateResult ? (
              <Card className="rounded-card p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-success" /> Dataset Preview
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {generateResult.row_count.toLocaleString()} rows • {tableColumns.length} columns • {machineCount} machines • {generatedAt}
                      {generateResult.registry_id != null && <> • registry #{generateResult.registry_id}</>}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                    <Select value={format} onValueChange={(v) => setFormat(v as typeof format)} disabled={busy}>
                      <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="parquet">Parquet</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => void handleExport()} className="gap-2 flex-1 sm:flex-none" disabled={busy}>
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Export
                    </Button>
                    <Button size="sm" onClick={() => void handleUseInIngestion()} className="gap-2 flex-1 sm:flex-none" disabled={busy}>
                      {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Use in Ingestion
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total rows</p>
                    <p className="text-lg font-semibold mt-0.5">{generateResult.row_count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dataset</p>
                    <p className="text-sm font-semibold mt-0.5 truncate">
                      {generateResult.display_name ?? generateResult.dataset_name ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Scenario</p>
                    <p className="text-sm font-semibold mt-0.5 capitalize">
                      {(generateResult.scenario ?? cfg.scenario).replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ingestion</p>
                    <p className="text-sm font-semibold mt-0.5 text-success">
                      {generateResult.ingestion_ready !== false ? "Ready" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="relative min-h-[120px]">
                  {loadingPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-md">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <DataTable
                    columns={tableColumns.map((c, j) => ({
                      key: String(j),
                      header: <span className="text-[10px] whitespace-nowrap">{c}</span>,
                      render: (v) => (
                        <span className="text-[11px] whitespace-nowrap font-mono">{v == null ? "" : String(v)}</span>
                      ),
                    }) as ColumnDef)}
                    rows={previewRows.map((row) => Array.isArray(row) ? Object.fromEntries(row.map((v, j) => [String(j), v])) : {})}
                    emptyMessage="Preview unavailable — use Export to download full file."
                    getRowKey={(_r, i) => i}
                    maxHeight={384}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Showing up to 10 rows from server registry.</p>
              </Card>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No dataset generated yet.</p>
                <Button onClick={() => setStep("configure")} className="mt-4 gap-2">
                  <Settings2 className="h-4 w-4" /> Configure generation
                </Button>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("configure")} className="w-full sm:w-auto">← Back to settings</Button>
              {generateResult && (
                <Button variant="outline" onClick={() => void handleGenerate()} className="gap-2 w-full sm:w-auto" disabled={busy}>
                  <RefreshCw className="h-4 w-4" /> Regenerate
                </Button>
              )}
            </div>

            <Card className="rounded-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold">Previous exports</h3>
                <Button variant="outline" size="sm" onClick={() => void refreshExports()} disabled={loadingExports} className="gap-1.5">
                  {loadingExports ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
              </div>
              {loadingExports && previousExports.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : previousExports.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No server exports yet.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: "display_name", header: "Dataset", render: (v) => <span className="text-xs font-mono">{String(v)}</span> },
                    { key: "row_count", header: "Rows", align: "right", render: (v) => <span className="text-xs">{(v as number).toLocaleString()}</span> },
                    {
                      key: "_action",
                      header: "",
                      align: "right",
                      render: (_v, item) => (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void handleOpenExport(item as ServerDataset)}>Open</Button>
                      ),
                    },
                  ] as ColumnDef[]}
                  rows={previousExports}
                  getRowKey={(item) => (item as ServerDataset).registry_id}
                  maxHeight={192}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
