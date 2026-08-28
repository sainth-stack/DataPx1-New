import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  Info,
  Layers,
  Network,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { digitalTwinApi, type FleetRecord } from "@/lib/api/digitalTwin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TELEMETRY_LIMIT = 20;
const PREFERRED_COLUMNS = [
  "timestamp",
  "machine_id",
  "engine_temperature",
  "hydraulic_pressure",
  "engine_rpm",
  "fuel_level",
  "vibration",
  "operating_hours",
  "status",
  "oee",
];

const WIZARD_STEPS = [
  { num: 1, label: "Create Twin" },
  { num: 2, label: "AI Generation" },
  { num: 3, label: "Validate" },
  { num: 4, label: "Configure" },
  { num: 5, label: "Activate" },
] as const;

type ItemStatus = "Generated" | "Validated" | "Modified" | "Mapped" | "Pending" | "Error" | "Active" | "Inactive";

interface CatalogueItem {
  id: string;
  name: string;
  type: string;
  status: ItemStatus;
  description: string;
}

interface MetadataItem {
  id: string;
  name: string;
  dataType: string;
  unit: string;
  mandatory: boolean;
  sampleValue: string;
  status: ItemStatus;
}

interface KpiItem {
  id: string;
  name: string;
  formula: string;
  unit: string;
  target: string;
  dependencies: string[];
  level: number;
}

interface SensorItem {
  id: string;
  sensorName: string;
  protocol: string;
  address: string;
  attribute: string;
  samplingRate: string;
  status: ItemStatus;
}

interface BrokerItem {
  id: string;
  type: string;
  endpoint: string;
  status: ItemStatus;
  topics: string[];
}

interface SyntheticConfig {
  numRecords: number;
  loadPattern: "light" | "medium" | "heavy" | "mixed";
  includeFailures: boolean;
  failureRate: number;
  operatingConditions: {
    temperature: "normal" | "hot" | "cold";
    humidity: "low" | "medium" | "high";
    workload: "continuous" | "intermittent" | "peak-hours";
  };
}

interface TelemetryMeta {
  registry_id?: string;
  table_name?: string;
  interval_seconds?: number;
  simulation_started_at?: string;
}

interface TelemetryCache {
  rows: Record<string, unknown>[];
  columns: string[];
  meta: TelemetryMeta;
}

interface DeleteTarget {
  type: "machine" | "fleet";
  twin_id?: string;
  fleet_id: string;
  registry_id?: string;
  name: string;
}

const DEFAULT_CATALOGUE: CatalogueItem[] = [
  { id: "1", name: "Kalmar DRG450-65S5XS", type: "Asset", status: "Generated", description: "Reach Stacker - Main Asset" },
  { id: "2", name: "Engine System", type: "System", status: "Generated", description: "Diesel engine and cooling system" },
  { id: "3", name: "Hydraulic System", type: "System", status: "Generated", description: "Hydraulic pumps and actuators" },
  { id: "4", name: "Engine Block", type: "Component", status: "Generated", description: "Primary power unit" },
  { id: "5", name: "Hydraulic Pump", type: "Component", status: "Generated", description: "Main hydraulic pressure source" },
];

const DEFAULT_METADATA: MetadataItem[] = [
  { id: "1", name: "engine_temperature", dataType: "float", unit: "°C", mandatory: true, sampleValue: "92", status: "Generated" },
  { id: "2", name: "hydraulic_pressure", dataType: "float", unit: "bar", mandatory: true, sampleValue: "280", status: "Generated" },
  { id: "3", name: "engine_rpm", dataType: "integer", unit: "RPM", mandatory: true, sampleValue: "1850", status: "Generated" },
  { id: "4", name: "fuel_level", dataType: "float", unit: "%", mandatory: false, sampleValue: "68", status: "Generated" },
  { id: "5", name: "vibration", dataType: "float", unit: "mm/s", mandatory: true, sampleValue: "3.2", status: "Generated" },
];

const DEFAULT_KPI: KpiItem[] = [
  { id: "1", name: "Overall Equipment Effectiveness (OEE)", formula: "Availability × Performance × Quality", unit: "%", target: ">80%", dependencies: ["2", "3", "4"], level: 1 },
  { id: "2", name: "Availability", formula: "(Operating Time / Planned Production Time) × 100", unit: "%", target: ">90%", dependencies: [], level: 2 },
  { id: "3", name: "Performance", formula: "(Actual Cycles / Ideal Cycles) × 100", unit: "%", target: ">95%", dependencies: [], level: 2 },
  { id: "4", name: "Quality", formula: "(Good Units / Total Units) × 100", unit: "%", target: ">99%", dependencies: [], level: 2 },
  { id: "5", name: "Mean Time Between Failures (MTBF)", formula: "Total Operating Time / Number of Failures", unit: "hours", target: ">500h", dependencies: [], level: 1 },
];

const DEFAULT_SENSORS: SensorItem[] = [
  { id: "1", sensorName: "Engine Temp Sensor", protocol: "OPC UA", address: "ns=2;s=ENG.Temp", attribute: "engine_temperature", samplingRate: "1s", status: "Mapped" },
  { id: "2", sensorName: "Hydraulic Pressure", protocol: "OPC UA", address: "ns=2;s=HYD.Press", attribute: "hydraulic_pressure", samplingRate: "1s", status: "Mapped" },
  { id: "3", sensorName: "Engine RPM Counter", protocol: "Modbus", address: "40001", attribute: "engine_rpm", samplingRate: "500ms", status: "Mapped" },
  { id: "4", sensorName: "Fuel Level Sensor", protocol: "OPC UA", address: "ns=2;s=FUEL.Level", attribute: "fuel_level", samplingRate: "5s", status: "Pending" },
  { id: "5", sensorName: "Vibration Monitor", protocol: "MQTT", address: "kalmar/rs001/vibration", attribute: "vibration", samplingRate: "100ms", status: "Mapped" },
];

const DEFAULT_BROKERS: BrokerItem[] = [
  { id: "1", type: "MQTT", endpoint: "mqtt://broker.datapx1.ai:1883", status: "Inactive", topics: ["kalmar/+/telemetry", "kalmar/+/events"] },
  { id: "2", type: "OPC UA", endpoint: "opc.tcp://192.168.1.100:4840", status: "Inactive", topics: ["ns=2;s=ENG.*", "ns=2;s=HYD.*"] },
  { id: "3", type: "Modbus", endpoint: "tcp://192.168.1.101:502", status: "Inactive", topics: ["40001-40100"] },
];

const DEFAULT_SYNTHETIC: SyntheticConfig = {
  numRecords: 1000,
  loadPattern: "mixed",
  includeFailures: true,
  failureRate: 5,
  operatingConditions: { temperature: "normal", humidity: "medium", workload: "continuous" },
};

function parseFleetSize(value: string): number {
  const n = parseInt(value.trim(), 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(100, Math.max(1, n));
}

function parseIntervalSeconds(value: string): number {
  const n = parseInt(value.trim(), 10);
  if (Number.isNaN(n)) return 10;
  return Math.min(100, Math.max(1, n));
}

function apiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

function statusClass(status: string): string {
  switch (status) {
    case "Generated": return "bg-blue-100 text-blue-800 border-blue-200";
    case "Validated": return "bg-green-100 text-green-800 border-green-200";
    case "Modified": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Mapped": return "bg-success/10 text-success border-success/20";
    case "Pending": return "bg-warning/10 text-warning border-warning/20";
    case "Error": return "bg-destructive/10 text-destructive border-destructive/20";
    case "Active": return "bg-success/10 text-success border-success/20";
    case "Inactive": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function formatDataType(type: string): string {
  switch (type.toLowerCase()) {
    case "int":
    case "integer": return "Number";
    case "float":
    case "double":
    case "decimal": return "Decimal";
    case "string":
    case "text":
    case "varchar": return "Text";
    case "boolean":
    case "bool": return "Yes/No";
    case "categorical":
    case "category":
    case "enum": return "Category";
    case "date": return "Date";
    case "datetime":
    case "timestamp": return "Date & Time";
    case "json":
    case "object": return "Object";
    case "array":
    case "list": return "List";
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function inferColumns(rows: Record<string, unknown>[]): string[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const preferred = PREFERRED_COLUMNS.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !PREFERRED_COLUMNS.includes(k)).sort();
  return [...preferred, ...rest];
}

function formatCell(value: unknown, compact?: boolean): string {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") return value.toFixed(2);
  return String(value);
}

function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  helperText,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const hasValue = value.length > 0;
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          required={required}
          className={cn(hasValue && "pr-9")}
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

function FileDropZone({
  inputRef,
  selectedFileName,
  disabled,
  onFileSelect,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  selectedFileName?: string;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };
  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Click or drag a file here to upload"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) pick(e.dataTransfer.files);
        }}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          dragging && "border-primary bg-primary/5",
          !dragging && "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "pointer-events-none opacity-50 cursor-not-allowed",
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Click or drag a file here to upload</p>
        <p className="text-xs text-muted-foreground mt-1">catalog, manual, or specification document</p>
        <p className="text-xs text-muted-foreground mt-1">Supported: PDF, DOCX, DOC, TXT, Images</p>
        {selectedFileName && (
          <p className="text-sm font-medium text-foreground mt-3 truncate px-4">Selected: {selectedFileName}</p>
        )}
      </div>
    </>
  );
}

function TelemetryTable({
  columns,
  rows,
  compact,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  compact?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <DataTable
      columns={columns.map((col) => ({
        key: col,
        header: <span className="whitespace-nowrap text-xs">{col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>,
        render: (v) => <span className={cn("whitespace-nowrap", compact && "text-xs")}>{formatCell(v, compact) as React.ReactNode}</span>,
      }) as ColumnDef)}
      rows={rows}
      getRowKey={(_r, i) => i}
    />
  );
}

export default function DigitalTwin() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [sensors, setSensors] = useState<SensorItem[]>([]);
  const [brokers, setBrokers] = useState<BrokerItem[]>(DEFAULT_BROKERS);
  const [activationStatus, setActivationStatus] = useState<"inactive" | "generating" | "active">("inactive");
  const [syntheticOpen, setSyntheticOpen] = useState(false);
  const [syntheticConfig, setSyntheticConfig] = useState<SyntheticConfig>(DEFAULT_SYNTHETIC);
  const [step, setStep] = useState(1);
  const [oem, setOem] = useState("");
  const [model, setModel] = useState("");
  const [fleetSize, setFleetSize] = useState("1");
  const [intervalSeconds, setIntervalSeconds] = useState("10");
  const [inputMethod, setInputMethod] = useState<"file" | "text">("file");
  const [textDescription, setTextDescription] = useState("");
  const [inWizard, setInWizard] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [suggestedFleetName, setSuggestedFleetName] = useState<string | null>(null);
  const [fleetId, setFleetId] = useState<string | null>(null);
  const [registryId, setRegistryId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fleets, setFleets] = useState<FleetRecord[]>([]);
  const [expandedFleets, setExpandedFleets] = useState<Set<string>>(new Set());
  const [loadingFleets, setLoadingFleets] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [telemetryRows, setTelemetryRows] = useState<Record<string, unknown>[]>([]);
  const [telemetryColumns, setTelemetryColumns] = useState<string[]>([]);
  const [telemetryMeta, setTelemetryMeta] = useState<TelemetryMeta | null>(null);
  const [telemetryFleet, setTelemetryFleet] = useState<FleetRecord | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryCache, setTelemetryCache] = useState<Record<string, TelemetryCache | null>>({});
  const [telemetryRefreshing, setTelemetryRefreshing] = useState<Record<string, boolean>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState("");
  const [newAttrUnit, setNewAttrUnit] = useState("");

  const loadFleets = useCallback(async () => {
    try {
      setLoadingFleets(true);
      const res = await digitalTwinApi.listFleets({ running_only: false });
      if (res.status && res.fleets) {
        setFleets(res.fleets);
        if (res.fleets.length > 0) {
          setExpandedFleets(new Set([res.fleets[0].fleet_id]));
        }
      }
    } catch (err) {
      console.error("Failed to load fleets:", err);
      toast.error("Failed to Load Fleets", { description: apiError(err) || "Could not fetch fleet data" });
    } finally {
      setLoadingFleets(false);
    }
  }, []);

  useEffect(() => {
    loadFleets();
  }, [loadFleets]);

  useEffect(() => {
    if (activationStatus === "active" || step === 5) loadFleets();
  }, [activationStatus, step, loadFleets]);

  const applyUploadResponse = (data: Record<string, unknown>) => {
    const cat = ((data.digital_catalogue as Record<string, unknown>[]) || []).map((item, i) => ({
      id: String(i + 1),
      name: String(item.name || item.component_name || "Component"),
      type: String(item.type || "Component"),
      status: "Generated" as ItemStatus,
      description: String(item.description || item.summary || ""),
    }));
    const meta = ((data.metadata_structure as Record<string, unknown>[]) || []).map((item, i) => ({
      id: String(i + 1),
      name: String(item.name || item.attribute_name || ""),
      dataType: String(item.datatype || item.data_type || "float"),
      unit: String(item.unit || ""),
      mandatory: item.mandatory !== false,
      sampleValue: String(item.sample_value || item.initial || ""),
      status: "Generated" as ItemStatus,
    }));
    const kpiList = ((data.kpi_hierarchy as Record<string, unknown>[]) || DEFAULT_KPI).map((item, i) => ({
      id: String(i + 1),
      name: String(item.name || item.kpi_name || ""),
      formula: String(item.formula || item.calculation || ""),
      unit: String(item.unit || ""),
      target: String(item.target || item.target_value || ""),
      dependencies: (item.dependencies as string[]) || [],
      level: Number(item.level || 1),
    }));
    const sensorList = ((data.sensor_mappings as Record<string, unknown>[]) || []).slice(0, 20).map((item, i) => ({
      id: String(i + 1),
      sensorName: String(item.sensor_name || item.name || ""),
      protocol: String(item.protocol || "OPC UA"),
      address: String(item.address || item.tag || ""),
      attribute: String(item.attribute || item.parameter || ""),
      samplingRate: String(item.sampling_rate || "1s"),
      status: "Mapped" as ItemStatus,
    }));
    setCatalogue(cat.length ? cat : DEFAULT_CATALOGUE);
    setMetadata(meta.length ? meta : DEFAULT_METADATA);
    setKpis(kpiList.length ? kpiList : DEFAULT_KPI);
    setSensors(sensorList.length ? sensorList : DEFAULT_SENSORS);
  };

  const validateItem = (id: string, kind: "catalogue" | "metadata") => {
    if (kind === "catalogue") {
      setCatalogue((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Validated" } : item)));
    } else {
      setMetadata((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Validated" } : item)));
    }
    toast.success("Item Validated", { description: "Item has been validated successfully" });
  };

  const rejectItem = (id: string, kind: "catalogue" | "metadata") => {
    if (kind === "catalogue") setCatalogue((prev) => prev.filter((item) => item.id !== id));
    else setMetadata((prev) => prev.filter((item) => item.id !== id));
    toast.error("Item Rejected", { description: "Item has been removed" });
  };

  const addAttribute = () => {
    if (!newAttrName || !newAttrType || !newAttrUnit) {
      toast.error("Missing Fields", { description: "Please fill in all fields" });
      return;
    }
    setMetadata((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        name: newAttrName,
        dataType: newAttrType,
        unit: newAttrUnit,
        mandatory: false,
        sampleValue: "",
        status: "Modified",
      },
    ]);
    setNewAttrName("");
    setNewAttrType("");
    setNewAttrUnit("");
    toast.success("Attribute Added", { description: "New attribute has been added to metadata structure" });
  };

  const runUpload = async (file?: File | null) => {
    const uploadFile = file ?? selectedFile ?? undefined;
    if (inputMethod === "file" && !uploadFile) return;
    if (inputMethod === "text" && !textDescription.trim()) {
      toast.error("Missing Description", { description: "Please enter a machine description" });
      return;
    }
    try {
      setBusy(true);
      setGenerating(true);
      setStep(2);
      if (uploadFile) setSelectedFile(uploadFile);
      toast.success(
        inputMethod === "file" ? "Uploading Catalog" : "Processing Description",
        {
          description:
            inputMethod === "file"
              ? `Uploading and analyzing ${uploadFile?.name}...`
              : "Analyzing machine description with AI...",
        },
      );
      const result = await digitalTwinApi.uploadCatalog(
        {
          file: uploadFile,
          description: inputMethod === "text" ? textDescription : undefined,
          oem,
          model,
        },
        (pct) => {
          if (inputMethod === "file") setUploadProgress(pct);
        },
      );
      if (result.status) {
        setTemplateId(result.template_id);
        setSuggestedFleetName(result.suggested_fleet_name || null);
        applyUploadResponse(result);
        toast.success("Configuration Generated Successfully", {
          description: `Created digital twin configuration for ${result.oem} ${result.model}`,
        });
        setGenerating(false);
        setStep(3);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Generation Failed", { description: apiError(err) || "Failed to generate configuration" });
      setGenerating(false);
      setStep(1);
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateClick = () => {
    if (!oem || !model) {
      toast.error("Missing Information", { description: "Please enter OEM and model" });
      return;
    }
    if (inputMethod === "file") {
      if (selectedFile) runUpload(selectedFile);
      else fileInputRef.current?.click();
    } else {
      runUpload();
    }
  };

  const handleValidationContinue = async () => {
    if ([...catalogue, ...metadata].filter((i) => i.status === "Validated").length === 0) {
      setCatalogue((prev) => prev.map((i) => ({ ...i, status: "Validated" })));
      setMetadata((prev) => prev.map((i) => ({ ...i, status: "Validated" })));
    }
    if (!templateId) {
      toast.error("Error", { description: "No template found. Please upload a catalog first." });
      return;
    }
    try {
      setBusy(true);
      const fleetName = suggestedFleetName || `${oem}_${model}`.toLowerCase().replace(/\s+/g, "_");
      const confirm = await digitalTwinApi.confirmTemplate({
        template_id: templateId,
        fleet_name: fleetName,
        description: `Digital twin for ${oem} ${model}`,
      });
      if (!confirm.status) throw new Error(confirm.message || "Failed to confirm template");
      setRegistryId(confirm.registry_id);
      const fleet = await digitalTwinApi.createFleet({
        template_id: templateId,
        fleet_size: parseFleetSize(fleetSize),
        interval_seconds: parseIntervalSeconds(intervalSeconds),
        fleet_name: fleetName,
      });
      if (!fleet.status) throw new Error(fleet.message || "Failed to create fleet");
      setFleetId(fleet.fleet_id);
      setStep(4);
      const size = parseFleetSize(fleetSize);
      const interval = parseIntervalSeconds(intervalSeconds);
      toast.success("Validation Complete", {
        description: `Template confirmed and fleet created with ${size} machine${size > 1 ? "s" : ""} (${interval}s data interval)`,
      });
    } catch (err) {
      console.error("Validation failed:", err);
      toast.error("Validation Failed", { description: apiError(err) || "Failed to complete validation" });
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!fleetId && !registryId) {
      toast.error("Error", { description: "No fleet found. Please complete validation first." });
      return;
    }
    try {
      setActivationStatus("generating");
      setBusy(true);
      toast.success("Activating Digital Twin", { description: "Initializing virtual replica..." });
      const result = await digitalTwinApi.startSimulation({
        fleet_id: fleetId || undefined,
        registry_id: registryId || undefined,
        enable_all_machines: true,
      });
      if (result.status) {
        setActivationStatus("active");
        setStep(5);
        setInWizard(false);
        toast.success("Digital Twin Active!", {
          description: "Your machine is now live. View and control it in the Fleet Management section below.",
          duration: 8000,
        });
        await loadFleets();
      }
    } catch (err) {
      console.error("Activation failed:", err);
      setActivationStatus("inactive");
      toast.error("Activation Failed", { description: apiError(err) || "Failed to activate digital twin" });
    } finally {
      setBusy(false);
    }
  };

  const handleEnableIO = async () => {
    try {
      if (fleetId) {
        await digitalTwinApi.toggleSimulation({ fleet_id: fleetId, enabled: true });
      } else if (registryId) {
        await digitalTwinApi.toggleSimulation({ registry_id: registryId, enabled: true });
      } else if (fleets.length > 0) {
        const f = fleets[0];
        await digitalTwinApi.toggleSimulation({ fleet_id: f.fleet_id, enabled: true });
        toast.success("I/O Enabled", {
          description: `MQTT brokers enabled for fleet: ${f.fleet_name || f.fleet_id.slice(0, 8)}`,
        });
        await loadFleets();
        return;
      } else {
        toast.error("No Fleet Available", { description: "Please create a fleet first before enabling I/O" });
        return;
      }
      setBrokers((prev) => prev.map((b) => ({ ...b, status: "Active" })));
      toast.success("I/O Enabled", { description: "MQTT brokers and sensor connections have been enabled successfully" });
      if (!inWizard) await loadFleets();
    } catch (err) {
      console.error("Error enabling I/O:", err);
      toast.error("Failed to Enable I/O", { description: apiError(err) || "Unable to enable MQTT brokers" });
    }
  };

  const downloadSyntheticCsv = () => {
    const W = syntheticConfig.numRecords;
    const loadFactors = { light: 0.3, medium: 0.6, heavy: 0.9, mixed: Math.random() };
    const headers = PREFERRED_COLUMNS;
    const rows: string[][] = [];
    const start = new Date();
    for (let i = 0; i < W; i++) {
      const ts = new Date(start.getTime() + i * 60000).toISOString();
      const machineId = oem && model ? `${oem}-${model}-001` : "MACHINE-001";
      const load = syntheticConfig.loadPattern === "mixed" ? Math.random() : loadFactors[syntheticConfig.loadPattern];
      const fault = syntheticConfig.includeFailures && Math.random() * 100 < syntheticConfig.failureRate;
      const status = fault ? "FAULT" : load > 0.8 ? "RUNNING_HIGH" : load > 0.4 ? "RUNNING" : "IDLE";
      rows.push([
        ts, machineId,
        (60 + load * 40 + (Math.random() * 10 - 5)).toFixed(2),
        (200 + load * 100 + (Math.random() * 20 - 10)).toFixed(2),
        (1000 + load * 1000 + (Math.random() * 100 - 50)).toFixed(0),
        (100 - (i / W) * 50 + (Math.random() * 5 - 2.5)).toFixed(2),
        (1 + load * 5 + (Math.random() * 2 - 1)).toFixed(2),
        (1000 + i / 60).toFixed(2),
        status,
        (fault ? 0 : 50 + load * 40 + (Math.random() * 10 - 5)).toFixed(2),
      ]);
    }
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `synthetic_telemetry_${model || "machine"}_${W}records_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSyntheticGenerate = () => {
    setSyntheticOpen(false);
    toast.success("Generating Synthetic Data", {
      description: `Creating ${syntheticConfig.numRecords} synthetic records with ${syntheticConfig.loadPattern} load pattern...`,
    });
    setTimeout(() => {
      downloadSyntheticCsv();
      toast.success("Synthetic Data Ready", {
        description: `${syntheticConfig.numRecords} rows downloaded as CSV file`,
      });
    }, 2000);
  };

  const resetWizardState = () => {
    setOem("");
    setModel("");
    setFleetSize("1");
    setIntervalSeconds("10");
    setCatalogue([]);
    setMetadata([]);
    setKpis([]);
    setSensors([]);
    setTemplateId(null);
    setSuggestedFleetName(null);
    setFleetId(null);
    setRegistryId(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setBusy(false);
    setGenerating(false);
    setActivationStatus("inactive");
    setTextDescription("");
    setBrokers(DEFAULT_BROKERS);
  };

  const startWizard = () => {
    resetWizardState();
    setInWizard(true);
    setStep(1);
  };

  const cancelWizard = () => {
    setInWizard(false);
    setStep(1);
    loadFleets();
  };

  const restartWorkflow = () => {
    resetWizardState();
    setStep(1);
    toast.success("Workflow Restarted", { description: "Starting fresh. Enter your machine details." });
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setBusy(false);
      setGenerating(false);
    }
  };

  const toggleBroker = (id: string) => {
    setBrokers((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = b.status === "Active" ? "Inactive" : "Active";
        toast.success(next === "Active" ? "Broker Connected" : "Broker Disconnected", {
          description: `${b.type} broker at ${b.endpoint} is now ${next.toLowerCase()}`,
        });
        return { ...b, status: next };
      }),
    );
  };

  const fetchTelemetry = useCallback(async (fleetIdKey: string) => {
    setTelemetryRefreshing((prev) => ({ ...prev, [fleetIdKey]: true }));
    try {
      const res = await digitalTwinApi.getLatestTelemetry({ fleet_id: fleetIdKey, limit: TELEMETRY_LIMIT });
      if (!res.status) throw new Error(res.message || "Failed to load telemetry");
      const rows = (res.telemetry ?? []) as Record<string, unknown>[];
      const cached: TelemetryCache = {
        rows,
        columns: inferColumns(rows),
        meta: {
          registry_id: res.registry_id,
          table_name: res.table_name,
          interval_seconds: res.interval_seconds,
          simulation_started_at: res.simulation_started_at,
        },
      };
      setTelemetryCache((prev) => ({ ...prev, [fleetIdKey]: cached }));
      return cached;
    } catch (err) {
      setTelemetryCache((prev) => ({ ...prev, [fleetIdKey]: null }));
      throw err;
    } finally {
      setTelemetryRefreshing((prev) => ({ ...prev, [fleetIdKey]: false }));
    }
  }, []);

  const toggleFleetExpand = (id: string) => {
    const next = new Set(expandedFleets);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      fetchTelemetry(id).catch((err) => console.error("Failed to load fleet telemetry:", err));
    }
    setExpandedFleets(next);
  };

  const openTelemetryDialog = async (fleet: FleetRecord) => {
    setTelemetryFleet(fleet);
    setTelemetryOpen(true);
    setTelemetryLoading(true);
    const cached = telemetryCache[fleet.fleet_id];
    if (cached) {
      setTelemetryRows(cached.rows);
      setTelemetryColumns(cached.columns);
      setTelemetryMeta(cached.meta);
      setTelemetryLoading(false);
      if (cached.rows.length === 0) {
        toast.info("No Data Available", {
          description: "No telemetry rows yet. Start the fleet simulation to generate data.",
        });
      }
      return;
    }
    try {
      const data = await fetchTelemetry(fleet.fleet_id);
      setTelemetryRows(data.rows);
      setTelemetryColumns(data.columns);
      setTelemetryMeta(data.meta);
      if (data.rows.length === 0) {
        toast.info("No Data Available", {
          description: "No telemetry rows yet. Start the fleet simulation to generate data.",
        });
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
      setTelemetryRows([]);
      setTelemetryColumns([]);
      setTelemetryMeta(null);
      toast.error("Failed to Load Data", { description: apiError(err) || "Could not fetch telemetry data" });
    } finally {
      setTelemetryLoading(false);
    }
  };

  const refreshTelemetryDialog = async () => {
    if (!telemetryFleet) return;
    setTelemetryLoading(true);
    try {
      const data = await fetchTelemetry(telemetryFleet.fleet_id);
      setTelemetryRows(data.rows);
      setTelemetryColumns(data.columns);
      setTelemetryMeta(data.meta);
      toast.success("Telemetry refreshed", { description: `${data.rows.length} rows loaded` });
    } catch (err) {
      toast.error("Refresh failed", { description: apiError(err) || "Could not refresh" });
    } finally {
      setTelemetryLoading(false);
    }
  };

  const closeTelemetryDialog = () => {
    setTelemetryOpen(false);
    setTelemetryRows([]);
    setTelemetryColumns([]);
    setTelemetryMeta(null);
    setTelemetryFleet(null);
  };

  const toggleFleetSimulation = async (id: string, running: boolean) => {
    try {
      const res = await digitalTwinApi.toggleSimulation({ fleet_id: id, enabled: !running });
      if (res.status) {
        toast.success(running ? "Fleet Stopped" : "Fleet Started", {
          description: running ? "Fleet simulation has been stopped" : "Fleet simulation has been started",
        });
        await loadFleets();
      }
    } catch (err) {
      console.error("Fleet toggle failed:", err);
      toast.error("Operation Failed", { description: apiError(err) || "Failed to toggle fleet" });
    }
  };

  const toggleMachineSimulation = async (twinId: string, fleetIdKey: string, running: boolean) => {
    try {
      const res = await digitalTwinApi.toggleMachine({ twin_id: twinId, fleet_id: fleetIdKey, enabled: !running });
      if (res.status) {
        toast.success(running ? "Machine Stopped" : "Machine Started", {
          description: `Machine ${twinId} ${running ? "stopped" : "started"} successfully`,
        });
        await loadFleets();
      }
    } catch (err) {
      console.error("Machine toggle failed:", err);
      toast.error("Operation Failed", { description: apiError(err) || "Failed to toggle machine" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      if (deleteTarget.type === "machine") {
        const res = await digitalTwinApi.deleteTwin({
          twin_id: deleteTarget.twin_id,
          fleet_id: deleteTarget.fleet_id,
        });
        if (res.status) {
          toast.success("Machine Deleted", {
            description: `${deleteTarget.name} has been removed. ${res.machines_remaining || 0} machine(s) remaining.`,
          });
          await loadFleets();
        }
      } else {
        const res = await digitalTwinApi.deleteTwin({
          registry_id: deleteTarget.registry_id,
          fleet_id: deleteTarget.fleet_id,
        });
        if (res.status) {
          toast.success("Fleet Deleted", {
            description: `${deleteTarget.name} and all associated data have been removed. ${res.machines_removed || 0} machine(s) deleted.`,
          });
          await loadFleets();
        }
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Delete Failed", { description: apiError(err) || "Failed to delete" });
    } finally {
      setDeleting(false);
    }
  };

  const validatedCount = [...catalogue, ...metadata].filter((i) => i.status === "Validated").length;
  const totalValidateItems = catalogue.length + metadata.length;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Digital Twin Interface</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {inWizard
              ? "Create and configure your machine's digital representation"
              : "Manage your digital twin fleets and machines"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {!inWizard && (
            <Button onClick={startWizard} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Create Digital Twin
            </Button>
          )}
          {inWizard && step < 5 && step > 1 && (
            <Button variant="ghost" size="sm" onClick={restartWorkflow} disabled={busy || generating}>
              Restart Workflow
            </Button>
          )}
          {inWizard && step < 5 && (
            <Button variant="ghost" size="sm" onClick={cancelWizard}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {inWizard && step < 5 && (
        <Card className="rounded-card p-6">
          <div className="mb-6 overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex items-center justify-between min-w-[520px]">
              {WIZARD_STEPS.map((s, idx) => (
                <div className="flex items-center flex-1" key={s.num}>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                        step > s.num && "bg-success text-white",
                        step === s.num && "bg-primary text-primary-foreground",
                        step < s.num && "bg-muted text-muted-foreground",
                      )}
                    >
                      {step > s.num ? <CheckCircle2 className="h-5 w-5" /> : s.num}
                    </div>
                    <span className={cn("text-xs mt-2 font-medium", step >= s.num ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 4 && (
                    <div className={cn("h-1 flex-1 mx-2 rounded", step > s.num ? "bg-success" : "bg-muted")} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Create New Digital Twin</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your machine details and provide either a catalog file or description
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField id="oem" label="OEM / Manufacturer" placeholder="e.g., Kalmar, Konecranes" value={oem} onChange={setOem} required />
                <FormField id="model" label="Model" placeholder="e.g., DRU450, RTG-014" value={model} onChange={setModel} required />
                <FormField
                  id="fleetSize"
                  label="Number of Machines"
                  placeholder="1"
                  value={fleetSize}
                  onChange={(v) => setFleetSize(v.replace(/\D/g, ""))}
                  inputMode="numeric"
                  helperText="How many machines (1–100)"
                />
                <FormField
                  id="intervalSeconds"
                  label="Data Generation Interval (seconds)"
                  placeholder="10"
                  value={intervalSeconds}
                  onChange={(v) => setIntervalSeconds(v.replace(/\D/g, ""))}
                  inputMode="numeric"
                  helperText="Telemetry frequency per machine (1–100 seconds)"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Input Method *</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="file-input" name="inputMethod" checked={inputMethod === "file"} onChange={() => setInputMethod("file")} className="h-4 w-4" />
                    <Label htmlFor="file-input" className="font-normal cursor-pointer">Upload Catalog/Manual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="text-input" name="inputMethod" checked={inputMethod === "text"} onChange={() => setInputMethod("text")} className="h-4 w-4" />
                    <Label htmlFor="text-input" className="font-normal cursor-pointer">Provide Text Description</Label>
                  </div>
                </div>
              </div>
              {inputMethod === "text" && (
                <div className="space-y-2">
                  <Label htmlFor="textDescription">Machine Description *</Label>
                  <textarea
                    id="textDescription"
                    placeholder="Describe your machine... e.g., 'This is a Kalmar reach stacker model DRU450 used for container handling. It has hydraulic systems, diesel engine, and automated controls for lifting operations.'"
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-y"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide details about the machine type, key components, and operational characteristics
                  </p>
                </div>
              )}
              {inputMethod === "file" && (
                <FileDropZone
                  inputRef={fileInputRef}
                  selectedFileName={selectedFile?.name}
                  disabled={busy || generating}
                  onFileSelect={setSelectedFile}
                />
              )}
              <div className="flex justify-between gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={goBack} disabled={busy || generating}>← Back</Button>
                )}
                <div className="flex-1" />
                <Button
                  onClick={handleGenerateClick}
                  className="gap-2"
                  disabled={busy || generating || !oem || !model || (inputMethod === "text" && !textDescription.trim())}
                >
                  {inputMethod === "file" ? (
                    <><Upload className="h-4 w-4" />Upload & Generate</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />Generate from Description</>
                  )}
                </Button>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center py-8">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Cpu className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">AI is Generating Your Digital Twin</h3>
                <p className="text-sm text-muted-foreground">
                  Creating catalogue, metadata structure, KPI mappings, and I/O topology for {oem} {model}...
                </p>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                {["Digital catalogue generated", "Metadata structure created", "KPI hierarchy mapped", "Sensor I/O topology configured"].map((t) => (
                  <div className="flex items-center gap-2" key={t}>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Review & Validate Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Review the AI-generated configuration in the tabs below. Click &quot;Validate All&quot; in each tab to approve the configuration.
                </p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Quick Start:</strong> Click the &quot;Validate All&quot; button in Digital Catalogue and Metadata Structure tabs below, or click &quot;Continue&quot; to auto-validate everything.
                </AlertDescription>
              </Alert>
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={goBack} disabled={busy}>← Back</Button>
                <div className="text-sm text-muted-foreground">
                  {validatedCount} / {totalValidateItems} items validated
                </div>
                <Button onClick={handleValidationContinue} size="lg" className="gap-2" disabled={busy}>
                  {busy ? "Processing..." : "Continue to Configuration"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Configure Connectivity & Data</h3>
                <p className="text-sm text-muted-foreground">
                  Enable MQTT connectivity for real-time data streaming, or generate synthetic data for testing.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button onClick={handleEnableIO} variant="outline" className="flex items-center gap-2 h-auto py-4 flex-col">
                  <Sparkles className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Enable I/O</div>
                    <div className="text-xs text-muted-foreground mt-1">Connect sensors and brokers</div>
                  </div>
                </Button>
                <Button onClick={() => setSyntheticOpen(true)} variant="outline" className="flex items-center gap-2 h-auto py-4 flex-col">
                  <Database className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">Generate Data</div>
                    <div className="text-xs text-muted-foreground mt-1">Create synthetic telemetry</div>
                  </div>
                </Button>
                <Button
                  onClick={handleActivate}
                  className="flex items-center gap-2 h-auto py-4 flex-col bg-success hover:bg-success/90"
                  disabled={busy || activationStatus === "generating"}
                >
                  <Play className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold">{activationStatus === "generating" ? "Activating..." : "Activate Twin"}</div>
                    <div className="text-xs mt-1">Start digital replica</div>
                  </div>
                </Button>
              </div>
              <div className="flex justify-start">
                <Button variant="outline" onClick={goBack} disabled={busy || activationStatus === "generating"}>
                  ← Back to Validation
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!inWizard && (
        <>
          <Card className="rounded-card p-5">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Button onClick={handleEnableIO} variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <Sparkles className="h-4 w-4" />
                Enable I/O
              </Button>
              <Button onClick={() => setSyntheticOpen(true)} variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <Database className="h-4 w-4" />
                Generate Synthetic Data
              </Button>
            </div>
          </Card>

          {fleets.length > 0 ? (
            <Card className="rounded-card p-4 sm:p-6 overflow-hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Network className="h-5 w-5 text-accent shrink-0" />
                    Fleet Management
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control your digital twin fleets and individual machines
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadFleets} disabled={loadingFleets} className="gap-2 w-full sm:w-auto shrink-0">
                  <RefreshCw className={cn("h-4 w-4", loadingFleets && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              <div className="space-y-4">
                {fleets.map((fleet) => {
                  const expanded = expandedFleets.has(fleet.fleet_id);
                  const activeCount = fleet.machines.filter((m) => m.simulation_enabled).length;
                  const cached = telemetryCache[fleet.fleet_id];
                  return (
                    <Card className="border-l-4 border-l-accent overflow-hidden" key={fleet.fleet_id}>
                      <div className="p-3 sm:p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                            <Button variant="ghost" size="sm" onClick={() => toggleFleetExpand(fleet.fleet_id)} className="h-8 w-8 p-0 shrink-0">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm sm:text-base truncate max-w-full">
                                  {fleet.fleet_name || `Fleet ${fleet.fleet_id.slice(0, 8)}`}
                                </h3>
                                <Badge variant="outline" className={statusClass(fleet.scheduler_enabled ? "Active" : "Inactive")}>
                                  {fleet.scheduler_enabled ? "Running" : "Stopped"}
                                </Badge>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  <Cpu className="h-3 w-3 mr-1" />
                                  {activeCount}/{fleet.fleet_size} active
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="truncate max-w-full">Fleet ID: {fleet.fleet_id.slice(0, 13)}...</span>
                                <span>Interval: {fleet.interval_seconds}s</span>
                                {fleet.last_tick_at && <span>Last Tick: {new Date(fleet.last_tick_at).toLocaleTimeString()}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
                            <Button size="sm" variant="outline" onClick={() => openTelemetryDialog(fleet)} className="gap-2 flex-1 sm:flex-none">
                              <Database className="h-4 w-4" />
                              Show Data
                            </Button>
                            {fleet.scheduler_enabled ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleFleetSimulation(fleet.fleet_id, fleet.scheduler_enabled)}
                                className="gap-2 flex-1 sm:flex-none border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Square className="h-4 w-4" />
                                Stop
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleFleetSimulation(fleet.fleet_id, fleet.scheduler_enabled)}
                                className="gap-2 flex-1 sm:flex-none border-success/50 hover:bg-success/10 hover:text-success"
                              >
                                <Play className="h-4 w-4" />
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDeleteTarget({
                                  type: "fleet",
                                  fleet_id: fleet.fleet_id,
                                  registry_id: fleet.registry_id,
                                  name: fleet.fleet_name || `Fleet ${fleet.fleet_id.slice(0, 8)}`,
                                });
                                setDeleteOpen(true);
                              }}
                              className="gap-2 flex-1 sm:flex-none border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                      {expanded && fleet.machines.length > 0 && (
                        <div className="border-t">
                          <div className="p-3 sm:p-4 bg-muted/30 min-w-0">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Layers className="h-4 w-4 text-accent shrink-0" />
                              Machines ({fleet.machines.length})
                            </h4>
                            <div className="space-y-2">
                              {fleet.machines.map((machine) => (
                                <div
                                  className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-3 bg-background rounded-lg border min-w-0 overflow-hidden"
                                  key={machine.twin_id}
                                >
                                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn("h-2 w-2 rounded-full shrink-0", machine.simulation_enabled ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                                      <div className="font-medium text-sm truncate">Machine {machine.machine_serial}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono truncate">{machine.twin_id}</div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge variant="outline" className={cn("text-xs", statusClass(machine.simulation_enabled ? "Active" : "Inactive"))}>
                                        {machine.simulation_enabled ? "Active" : "Inactive"}
                                      </Badge>
                                      {machine.operational_mode && <Badge variant="outline" className="text-xs">{machine.operational_mode}</Badge>}
                                      {machine.active_fault && (
                                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 max-w-full truncate">
                                          {machine.active_fault}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto sm:justify-end">
                                    {machine.last_telemetry_at && (
                                      <span className="text-xs text-muted-foreground">
                                        Last: {new Date(machine.last_telemetry_at).toLocaleTimeString()}
                                      </span>
                                    )}
                                    {machine.simulation_enabled ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggleMachineSimulation(machine.twin_id, fleet.fleet_id, machine.simulation_enabled)}
                                        className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Square className="h-3 w-3" />
                                        Stop
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggleMachineSimulation(machine.twin_id, fleet.fleet_id, machine.simulation_enabled)}
                                        className="h-8 gap-1 text-success hover:text-success hover:bg-success/10"
                                      >
                                        <Play className="h-3 w-3" />
                                        Start
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setDeleteTarget({
                                          type: "machine",
                                          twin_id: machine.twin_id,
                                          fleet_id: fleet.fleet_id,
                                          name: machine.machine_id || machine.twin_id,
                                        });
                                        setDeleteOpen(true);
                                      }}
                                      className="h-8 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t min-w-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                                <h4 className="text-sm font-semibold flex flex-wrap items-center gap-2 min-w-0">
                                  <Activity className="h-4 w-4 text-accent shrink-0" />
                                  Latest telemetry
                                  <span className="text-xs font-normal text-muted-foreground">(limit {TELEMETRY_LIMIT})</span>
                                </h4>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs"
                                  disabled={telemetryRefreshing[fleet.fleet_id]}
                                  onClick={() => void fetchTelemetry(fleet.fleet_id)}
                                >
                                  <RefreshCw className={cn("h-3 w-3", telemetryRefreshing[fleet.fleet_id] && "animate-spin")} />
                                  Refresh
                                </Button>
                              </div>
                              {telemetryRefreshing[fleet.fleet_id] ? (
                                <div className="flex justify-center py-6">
                                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : cached && cached.rows.length ? (
                                <div className="overflow-x-auto rounded-md border max-h-48">
                                  <TelemetryTable columns={cached.columns} rows={cached.rows.slice(0, 8)} compact />
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground py-2">
                                  No telemetry rows yet. Start the fleet to generate data.
                                </p>
                              )}
                              {cached && cached.rows.length > 0 && (
                                <Button size="sm" variant="link" className="h-7 px-0 mt-1 text-xs" onClick={() => openTelemetryDialog(fleet)}>
                                  View all in dialog →
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Card>
          ) : loadingFleets ? (
            <Card className="rounded-card p-12">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading fleets...</p>
              </div>
            </Card>
          ) : (
            <Card className="rounded-card p-12">
              <div className="text-center">
                <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Digital Twins Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first digital twin to start simulating and monitoring your machines
                </p>
                <Button onClick={startWizard} className="gap-2" size="lg">
                  <Plus className="h-5 w-5" />
                  Create Your First Digital Twin
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {inWizard && step >= 3 && step === 3 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Human-in-the-Loop Validation:</strong> Review the generated machine topology and metadata below. Confirm accuracy, modify KPI mappings, or add custom attributes before activating the digital twin.
          </AlertDescription>
        </Alert>
      )}

      {inWizard && step >= 3 && step < 5 && (
        <Tabs defaultValue="catalogue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="catalogue">Digital Catalogue</TabsTrigger>
            <TabsTrigger value="metadata">Metadata Structure</TabsTrigger>
            <TabsTrigger value="kpi">KPI Hierarchy</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Mappings</TabsTrigger>
            <TabsTrigger value="brokers">Broker Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogue" className="space-y-4">
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" />
                  Digital Catalogue
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCatalogue((prev) => prev.map((i) => ({ ...i, status: "Validated" })));
                      toast.success("All Items Validated", { description: "Digital catalogue validated successfully" });
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Validate All
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        The digital catalogue represents the hierarchical structure of your asset, breaking it down into systems and components.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: "name", header: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
                  { key: "type", header: "Type", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
                  { key: "description", header: "Description", render: (v) => <span className="text-sm text-muted-foreground">{String(v)}</span> },
                  { key: "status", header: "Status", render: (v) => <Badge variant="outline" className={cn("text-xs", statusClass(String(v)))}>{String(v)}</Badge> },
                  {
                    key: "_actions",
                    header: "",
                    align: "right",
                    render: (_v, item) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => validateItem((item as CatalogueItem).id, "catalogue")} disabled={(item as CatalogueItem).status === "Validated"}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => rejectItem((item as CatalogueItem).id, "catalogue")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ),
                  },
                ] as ColumnDef<CatalogueItem>[]}
                rows={catalogue}
                getRowKey={(item) => item.id}
              />
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-accent" />
                  Metadata Structure
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMetadata((prev) => prev.map((i) => ({ ...i, status: "Validated" })));
                      toast.success("All Attributes Validated", { description: "Metadata structure validated successfully" });
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Validate All
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Define the attributes and data points that will be collected from your machine. Add custom attributes or modify existing ones.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: "name", header: "Attribute Name", render: (v) => <span className="font-medium">{String(v)}</span> },
                  { key: "dataType", header: "Data Type", render: (v) => <Badge variant="outline" className="text-xs">{formatDataType(String(v))}</Badge> },
                  { key: "unit", header: "Unit" },
                  { key: "mandatory", header: "Mandatory", render: (v) => <Badge variant={v ? "default" : "outline"} className="text-xs">{v ? "Yes" : "No"}</Badge> },
                  { key: "sampleValue", header: "Sample Value", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
                  { key: "status", header: "Status", render: (v) => <Badge variant="outline" className={cn("text-xs", statusClass(String(v)))}>{String(v)}</Badge> },
                  {
                    key: "_actions",
                    header: "",
                    align: "right",
                    render: (_v, item) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => validateItem((item as MetadataItem).id, "metadata")} disabled={(item as MetadataItem).status === "Validated"}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => rejectItem((item as MetadataItem).id, "metadata")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ),
                  },
                ] as ColumnDef<MetadataItem>[]}
                rows={metadata}
                getRowKey={(item) => item.id}
              />
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Attribute
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="attr-name">Attribute Name</Label>
                    <Input id="attr-name" placeholder="e.g., tire_pressure" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="attr-type">Data Type</Label>
                    <Input id="attr-type" placeholder="e.g., float" value={newAttrType} onChange={(e) => setNewAttrType(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="attr-unit">Unit</Label>
                    <Input id="attr-unit" placeholder="e.g., bar" value={newAttrUnit} onChange={(e) => setNewAttrUnit(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addAttribute} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Attribute
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="kpi" className="space-y-4">
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  KPI Hierarchy
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      KPI hierarchy shows how top-level metrics are calculated from lower-level data points. Dependencies indicate which KPIs feed into others.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-4">
                {kpis.map((kpi) => (
                  <Card
                    className="p-4 border-l-4"
                    style={{ borderLeftColor: kpi.level === 1 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}
                    key={kpi.id}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">{kpi.name}</h4>
                          <Badge variant="outline" className="text-xs">Level {kpi.level}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><strong>Formula:</strong> {kpi.formula}</p>
                          <p><strong>Unit:</strong> {kpi.unit}</p>
                          <p><strong>Target:</strong> {kpi.target}</p>
                          {kpi.dependencies.length > 0 && (
                            <p>
                              <strong>Dependencies:</strong>{" "}
                              {kpi.dependencies.map((dep) => kpis.find((k) => k.id === dep)?.name).filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-4">
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent" />
                  Sensor Mappings
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Sensor mappings link physical sensors to metadata attributes. Each sensor has a protocol, address, and sampling rate configuration.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <DataTable
                columns={[
                  { key: "sensorName", header: "Sensor Name", render: (v) => <span className="font-medium">{String(v)}</span> },
                  { key: "protocol", header: "Protocol", render: (v) => <Badge variant="outline" className="text-xs">{String(v)}</Badge> },
                  { key: "address", header: "Address", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
                  { key: "attribute", header: "Mapped Attribute" },
                  { key: "samplingRate", header: "Sampling Rate" },
                  { key: "status", header: "Status", render: (v) => <Badge variant="outline" className={cn("text-xs", statusClass(String(v)))}>{String(v)}</Badge> },
                  {
                    key: "_actions",
                    header: "",
                    align: "right",
                    render: () => (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ),
                  },
                ] as ColumnDef<SensorItem>[]}
                rows={sensors}
                getRowKey={(s) => s.id}
              />
            </Card>
          </TabsContent>

          <TabsContent value="brokers" className="space-y-4">
            <Card className="rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent" />
                  Broker Configuration
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Brokers manage the communication between your sensors and the platform. Configure endpoints, protocols, and topics for data ingestion.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-4">
                {brokers.map((broker) => (
                  <Card className="p-4" key={broker.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">{broker.type}</h4>
                          <Badge variant="outline" className={cn("text-xs", statusClass(broker.status))}>{broker.status}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><strong>Endpoint:</strong> <span className="font-mono">{broker.endpoint}</span></p>
                          <p><strong>Topics/Addresses:</strong></p>
                          <ul className="list-disc list-inside pl-2">
                            {broker.topics.map((topic, i) => (
                              <li className="font-mono" key={i}>{topic}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                        <Button
                          size="sm"
                          variant={broker.status === "Active" ? "destructive" : "default"}
                          onClick={() => toggleBroker(broker.id)}
                        >
                          {broker.status === "Active" ? "Disconnect" : "Connect"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={syntheticOpen} onOpenChange={setSyntheticOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              Configure Synthetic Data Generation
            </DialogTitle>
            <DialogDescription>
              Customize the synthetic operational dataset to match your testing and simulation needs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="numRecords">Number of Records</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="numRecords"
                  min={100}
                  max={10000}
                  step={100}
                  value={[syntheticConfig.numRecords]}
                  onValueChange={([v]) => setSyntheticConfig({ ...syntheticConfig, numRecords: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={syntheticConfig.numRecords}
                  onChange={(e) => setSyntheticConfig({ ...syntheticConfig, numRecords: parseInt(e.target.value) || 1000 })}
                  className="w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground">Generate between 100 and 10,000 synthetic telemetry records</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loadPattern">Operational Load Pattern</Label>
              <Select
                value={syntheticConfig.loadPattern}
                onValueChange={(v) => setSyntheticConfig({ ...syntheticConfig, loadPattern: v as SyntheticConfig["loadPattern"] })}
              >
                <SelectTrigger id="loadPattern"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Load (20-40% capacity)</SelectItem>
                  <SelectItem value="medium">Medium Load (40-70% capacity)</SelectItem>
                  <SelectItem value="heavy">Heavy Load (70-95% capacity)</SelectItem>
                  <SelectItem value="mixed">Mixed Load (realistic variations)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Simulate different operational intensity levels for your equipment</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFailures"
                  checked={syntheticConfig.includeFailures}
                  onCheckedChange={(v) => setSyntheticConfig({ ...syntheticConfig, includeFailures: !!v })}
                />
                <Label htmlFor="includeFailures" className="font-medium">Include Failure Conditions</Label>
              </div>
              {syntheticConfig.includeFailures && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="failureRate" className="text-sm">Failure Rate (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="failureRate"
                      min={1}
                      max={20}
                      step={1}
                      value={[syntheticConfig.failureRate]}
                      onValueChange={([v]) => setSyntheticConfig({ ...syntheticConfig, failureRate: v })}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm font-mono">{syntheticConfig.failureRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentage of records representing fault or degraded conditions</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label className="font-medium">Operating Conditions</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm text-muted-foreground">Temperature</Label>
                  <Select
                    value={syntheticConfig.operatingConditions.temperature}
                    onValueChange={(v) =>
                      setSyntheticConfig({
                        ...syntheticConfig,
                        operatingConditions: { ...syntheticConfig.operatingConditions, temperature: v as "normal" | "hot" | "cold" },
                      })
                    }
                  >
                    <SelectTrigger id="temperature"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (15-25°C)</SelectItem>
                      <SelectItem value="hot">Hot (25-40°C)</SelectItem>
                      <SelectItem value="cold">Cold (-10-15°C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="humidity" className="text-sm text-muted-foreground">Humidity</Label>
                  <Select
                    value={syntheticConfig.operatingConditions.humidity}
                    onValueChange={(v) =>
                      setSyntheticConfig({
                        ...syntheticConfig,
                        operatingConditions: { ...syntheticConfig.operatingConditions, humidity: v as "low" | "medium" | "high" },
                      })
                    }
                  >
                    <SelectTrigger id="humidity"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (&lt;40%)</SelectItem>
                      <SelectItem value="medium">Medium (40-70%)</SelectItem>
                      <SelectItem value="high">High (&gt;70%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workload" className="text-sm text-muted-foreground">Workload Pattern</Label>
                  <Select
                    value={syntheticConfig.operatingConditions.workload}
                    onValueChange={(v) =>
                      setSyntheticConfig({
                        ...syntheticConfig,
                        operatingConditions: { ...syntheticConfig.operatingConditions, workload: v as "continuous" | "intermittent" | "peak-hours" },
                      })
                    }
                  >
                    <SelectTrigger id="workload"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous (24/7)</SelectItem>
                      <SelectItem value="intermittent">Intermittent (on/off)</SelectItem>
                      <SelectItem value="peak-hours">Peak Hours (8am-6pm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Card className="p-4 bg-accent/5 border-accent/20">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-accent" />
                Generation Summary
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Generating <strong>{syntheticConfig.numRecords.toLocaleString()}</strong> synthetic records</li>
                <li>• Load pattern: <strong>{syntheticConfig.loadPattern}</strong></li>
                <li>• Failure conditions: <strong>{syntheticConfig.includeFailures ? `Included (${syntheticConfig.failureRate}%)` : "Not included"}</strong></li>
                <li>• Environmental conditions: <strong>{syntheticConfig.operatingConditions.temperature}</strong> temperature, <strong>{syntheticConfig.operatingConditions.humidity}</strong> humidity</li>
                <li>• Workload: <strong>{syntheticConfig.operatingConditions.workload}</strong> operation pattern</li>
              </ul>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyntheticOpen(false)}>Cancel</Button>
            <Button onClick={handleSyntheticGenerate} className="gap-2">
              <Database className="h-4 w-4" />
              Generate Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={telemetryOpen} onOpenChange={(open) => !open && closeTelemetryDialog()}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Fleet Telemetry Data
              {telemetryFleet && (
                <Badge variant="outline" className="ml-2">
                  {telemetryFleet.fleet_name || `Fleet ${telemetryFleet.fleet_id.slice(0, 8)}`}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {telemetryLoading
                ? "Loading telemetry data..."
                : telemetryRows.length > 0
                  ? `Latest ${telemetryRows.length} rows from ${telemetryMeta?.table_name ?? "fleet table"} (limit ${TELEMETRY_LIMIT})`
                  : "No telemetry data available. Start the simulation to generate data."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg">
            {telemetryLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            ) : telemetryRows.length > 0 ? (
              <TelemetryTable columns={telemetryColumns} rows={telemetryRows} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <Database className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Telemetry Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This fleet hasn&apos;t generated any data yet. Start the simulation to see telemetry data.
                </p>
                {telemetryFleet && !telemetryFleet.scheduler_enabled && (
                  <Button
                    onClick={() => {
                      closeTelemetryDialog();
                      toggleFleetSimulation(telemetryFleet.fleet_id, false);
                    }}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Fleet Now
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {telemetryFleet && (
                <>
                  Fleet: <span className="font-mono text-xs">{telemetryFleet.fleet_id}</span>
                  {telemetryMeta?.table_name && (
                    <> • Table: <span className="font-mono">{telemetryMeta.table_name}</span></>
                  )}
                  {telemetryMeta?.interval_seconds != null && (
                    <> • Interval: {telemetryMeta.interval_seconds}s</>
                  )}
                  {telemetryMeta?.simulation_started_at && (
                    <> • Started: {new Date(telemetryMeta.simulation_started_at).toLocaleString()}</>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" disabled={telemetryLoading || !telemetryFleet} onClick={() => void refreshTelemetryDialog()}>
                <RefreshCw className={cn("h-4 w-4", telemetryLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={closeTelemetryDialog}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget?.type === "machine" ? "Delete Machine" : "Delete Fleet"}</DialogTitle>
            <DialogDescription asChild>
              <div>
                {deleteTarget?.type === "machine" ? (
                  <>
                    Are you sure you want to delete machine <strong>{deleteTarget.name}</strong>?
                    <br /><br />
                    This will:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Remove the machine instance</li>
                      <li>Delete all telemetry data for this machine</li>
                      <li>Keep other machines in the fleet running</li>
                    </ul>
                  </>
                ) : (
                  <>
                    Are you sure you want to delete fleet <strong>{deleteTarget?.name}</strong>?
                    <br /><br />
                    <span className="text-destructive font-semibold">This action cannot be undone!</span>
                    <br /><br />
                    This will permanently remove:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All machines in this fleet</li>
                      <li>All telemetry data (PostgreSQL table)</li>
                      <li>Fleet scheduler and configuration</li>
                      <li>Machine templates</li>
                      <li>Registry entries</li>
                    </ul>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2">
              {deleting ? (
                <><RefreshCw className="h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4" />{deleteTarget?.type === "machine" ? "Delete Machine" : "Delete Fleet"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
