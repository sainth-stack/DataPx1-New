export interface AgentLog {
  ts: string;
  agent: string;
  level: "info" | "warn" | "error";
  asset: string;
  message: string;
}

export interface PerfRow {
  asset: string;
  shift: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  output: number;
}

export interface SensorRow {
  ts: string;
  asset: string;
  thermalC: number;
  vibrationG: number;
  status: "normal" | "watch" | "alert";
}

function formatTs(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value);
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    /* ignore */
  }
  return s.length > 16 ? s.slice(0, 16).replace("T", " ") : s;
}

function toNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toInt(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function mapLevel(value: unknown): AgentLog["level"] {
  const t = String(value ?? "info").toLowerCase();
  if (t === "error" || t === "critical") return "error";
  if (t === "warn" || t === "warning") return "warn";
  return "info";
}

function mapSensorStatus(value: unknown): SensorRow["status"] {
  const t = String(value ?? "normal").toLowerCase();
  if (t === "alert" || t === "critical") return "alert";
  if (t === "watch" || t === "warning") return "watch";
  return "normal";
}

export function mapAgentLog(row: Record<string, unknown>): AgentLog {
  return {
    ts: formatTs(row.timestamp ?? row.ts),
    agent: String(row.agent ?? row.agent_name ?? "—"),
    level: mapLevel(row.level ?? row.priority),
    asset: String(row.asset ?? row.asset_id ?? "—"),
    message: String(row.message ?? row.action_description ?? ""),
  };
}

export function mapPerfRow(row: Record<string, unknown>): PerfRow {
  return {
    asset: String(row.asset ?? row.asset_id ?? "—"),
    shift: String(row.shift ?? "A").replace(/^shift\s+/i, "").trim() || "A",
    oee: toNum(row.oee ?? row.oee_score),
    availability: toNum(row.availability),
    performance: toNum(row.performance),
    quality: toNum(row.quality),
    output: toInt(row.output ?? row.total_output),
  };
}

export function mapSensorRow(row: Record<string, unknown>): SensorRow {
  return {
    ts: formatTs(row.timestamp ?? row.ts),
    asset: String(row.asset ?? row.asset_id ?? "—"),
    thermalC: toNum(row.thermalC ?? row.temperature_c),
    vibrationG: toNum(row.vibrationG ?? row.vibration_g),
    status: mapSensorStatus(row.status ?? row.health_status),
  };
}

export function mapReportRows(
  source: "agents" | "perf" | "sensors",
  rows: Record<string, unknown>[],
): AgentLog[] | PerfRow[] | SensorRow[] {
  if (source === "agents") return rows.map(mapAgentLog);
  if (source === "perf") return rows.map(mapPerfRow);
  return rows.map(mapSensorRow);
}

export const REPORT_SOURCE_API: Record<"agents" | "perf" | "sensors", string> = {
  agents: "agent_intelligence",
  perf: "asset_performance",
  sensors: "sensor_diagnostics",
};

export const REPORT_SOURCE_UI: Record<string, "agents" | "perf" | "sensors"> = {
  agent_intelligence: "agents",
  asset_performance: "perf",
  sensor_diagnostics: "sensors",
};

export const COLUMN_API_MAP: Record<string, string> = { ts: "timestamp" };

export function toApiColumns(columns: string[]): string[] {
  return columns.map((c) => COLUMN_API_MAP[c] ?? c);
}
