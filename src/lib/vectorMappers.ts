import {
  Activity, Bot, Cpu, GitBranch, Shield, TrendingUp, Zap, type LucideIcon,
} from "lucide-react";

export type Severity = "critical" | "warning" | "info";
export type AgentStatus = "active" | "paused" | "learning";
export type Interval = "hourly" | "daily" | "monthly";

export interface Agent {
  id: string;
  name: string;
  domain: string;
  status: AgentStatus;
  scope: string;
  decisionsToday: number;
  successRate: number;
  mttdSec: number;
  mttrMin: number;
  description: string;
  icon: LucideIcon;
}

export interface Anomaly {
  id: string;
  ts: string;
  signal: string;
  asset: string;
  detectedBy: string;
  zScore: number;
  baseline: string;
  observed: string;
  confidence: number;
  classification: "drift" | "spike" | "pattern" | "outlier";
}

export interface Alert {
  id: string;
  ts: string;
  severity: Severity;
  agent: string;
  asset: string;
  message: string;
  recommended: string;
  status: "open" | "acknowledged" | "auto-resolved";
  acknowledgeable?: boolean;
  notifications: {
    email: "sent" | "pending" | "failed" | "off";
    sms: "sent" | "pending" | "failed" | "off";
    inApp: "sent" | "pending" | "failed" | "off";
  };
  recipients?: number;
}

export interface Trigger {
  id: string;
  name: string;
  condition: string;
  action: string;
  agent: string;
  enabled: boolean;
  firedToday: number;
  lastFired: string;
}

export interface LoopAction {
  id: string;
  ts: string;
  agent: string;
  trigger: string;
  action: string;
  asset: string;
  outcome: "success" | "pending" | "failed";
  impact: string;
  stage: "sense" | "decide" | "act" | "verify";
}

export interface HeaderKpis {
  openAlerts?: number;
  openAlertsNote?: string;
  autoResolvedPct?: number;
  anomalies24h?: number;
  decisionsLast24h?: number;
  activeAgents?: string;
}

export interface AgentSummary {
  decisionsToday?: number;
  decisionsLast24h?: number;
}

export interface TriggerHeaderKpis {
  successfulLoops?: number;
  awaitingApproval?: number;
}

const agentIconMap: Record<string, LucideIcon> = {
  "Vibration Sentinel": Activity,
  "Energy Optimizer": Zap,
  "Spare Parts Planner": GitBranch,
  "OEE Guardian": TrendingUp,
  "Safety Compliance Monitor": Shield,
  "Safety Compliance Bot": Shield,
  "Thermal Watchdog": Cpu,
};

function agentIcon(name: string): LucideIcon {
  return agentIconMap[name] ?? Bot;
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function notifState(v: unknown): "sent" | "pending" | "failed" | "off" {
  if (v === "sent" || v === "pending" || v === "failed") return v;
  return "off";
}

function displayAgentName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;
}

export function mapAgent(raw: Record<string, unknown>): Agent {
  const rawName = String(raw.name ?? "");
  const name = displayAgentName(rawName);
  return {
    id: String(raw.id ?? ""),
    name,
    domain: String(raw.domain ?? ""),
    status: (raw.status as AgentStatus) ?? "paused",
    scope: String(raw.scope ?? "Fleet"),
    decisionsToday: Number(raw.decisionsToday ?? 0),
    successRate: Number(raw.successRate ?? 0),
    mttdSec: Number(raw.mttdSeconds ?? raw.mttdSec ?? 0),
    mttrMin: Number(raw.mttrMinutes ?? raw.mttrMin ?? 0),
    description: String(raw.description ?? ""),
    icon: agentIcon(name),
  };
}

export function mapAnomaly(raw: Record<string, unknown>): Anomaly {
  return {
    id: String(raw.id ?? ""),
    ts: String(raw.timestamp ?? raw.ts ?? ""),
    signal: String(raw.signal ?? raw.fault ?? "—"),
    asset: String(raw.asset ?? ""),
    detectedBy: displayAgentName(String(raw.detectedBy ?? "")),
    zScore: Number(raw.zScore ?? 0),
    baseline: formatValue(raw.baseline),
    observed: formatValue(raw.observed),
    confidence: Number(raw.confidence ?? 0),
    classification: (raw.classification as Anomaly["classification"]) ?? "outlier",
  };
}

export function mapAlert(raw: Record<string, unknown>): Alert {
  const notifications = (raw.notifications as Record<string, unknown>) ?? {};
  return {
    id: String(raw.id ?? ""),
    ts: String(raw.timestamp ?? raw.ts ?? ""),
    severity: (raw.severity as Severity) ?? "info",
    agent: displayAgentName(String(raw.agent ?? "")),
    asset: String(raw.asset ?? ""),
    message: String(raw.message ?? raw.headline ?? ""),
    recommended: String(raw.recommended ?? ""),
    status: (raw.status as Alert["status"]) ?? "open",
    acknowledgeable: raw.acknowledgeable != null ? Boolean(raw.acknowledgeable) : raw.status === "open",
    notifications: {
      email: notifState(notifications.email),
      sms: notifState(notifications.sms),
      inApp: notifState(notifications.inApp ?? "sent"),
    },
    recipients: raw.recipients != null ? Number(raw.recipients) : undefined,
  };
}

export function mapTrigger(raw: Record<string, unknown>): Trigger {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    condition: String(raw.when ?? raw.condition ?? ""),
    action: String(raw.then ?? raw.action ?? ""),
    agent: displayAgentName(String(raw.agent ?? "—")),
    enabled: Boolean(raw.enabled),
    firedToday: Number(raw.firedToday ?? 0),
    lastFired: String(raw.lastFired ?? "—"),
  };
}

export function buildLoopsFromAlerts(alerts: Alert[]): LoopAction[] {
  return alerts
    .filter((a) => a.status === "auto-resolved" || a.status === "open")
    .slice(0, 12)
    .map((a, i) => ({
      id: `loop_${a.id}_${i}`,
      ts: a.ts,
      agent: a.agent,
      trigger: a.message.slice(0, 48),
      action: a.recommended,
      asset: a.asset,
      outcome: a.status === "auto-resolved" ? "success" : a.status === "open" ? "pending" : "success",
      impact: a.status === "auto-resolved" ? "Auto-resolved by Vector AI" : "Awaiting operator approval",
      stage: a.status === "auto-resolved" ? "verify" : a.status === "open" ? "act" : "verify",
    }));
}

export function mapPerformance(data: Record<string, unknown>) {
  const metrics = (data.metrics as Record<string, unknown>) ?? {};
  const uplift = [
    { metric: "Avg MTTD", value: String(metrics.avgMTTD ?? "—"), delta: "", positive: true },
    { metric: "Avg MTTR", value: String(metrics.avgMTTR ?? "—"), delta: "", positive: true },
    {
      metric: "Auto-resolution",
      value: `${metrics.autoResolutionRate ?? 0}%`,
      delta: "",
      positive: true,
    },
    {
      metric: "False positives",
      value: `${metrics.falsePositiveRate ?? 0}%`,
      delta: "",
      positive: Number(metrics.falsePositiveRate ?? 0) < 5,
    },
  ];
  const points = ((data.throughput as Record<string, unknown>[]) ?? []).map((p) => ({
    label: String(p.label ?? ""),
    detected: Number(p.detected ?? 0),
    resolved: Number(p.resolved ?? 0),
    auto: Number(p.autoResolved ?? p.auto ?? 0),
  }));
  const domainBreakdown = ((data.domainBreakdown as Record<string, unknown>[]) ?? []).map((d) => ({
    domain: String(d.domain ?? ""),
    decisions: Number(d.decisions ?? 0),
    savings: Math.round(Number(d.savingsEur ?? d.savings ?? 0) / 1000),
  }));
  return { points, uplift, domainBreakdown };
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}
