import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Cpu, Cog, Search, Activity, Thermometer, Gauge, Wrench, AlertTriangle, Zap, Clock, Info, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMachineScope } from "@/contexts/MachineScopeContext";
import { useDataset } from "@/contexts/DatasetContext";
import { ChartInfo } from "@/components/ChartInfo";
import { DashboardIprPanel } from "@/components/dashboard/DashboardIprPanel";
import { DashboardPlotCard } from "@/components/dashboard/DashboardPlotCard";
import { CorrelationHeatmapCard, correlationPlotFromApi } from "@/components/dashboard/CorrelationHeatmapCard";
import { digitalTwinApi } from "@/lib/api/digitalTwin";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardIpr, DashboardPlot } from "@/lib/dashboardIpr";
import { normalizeDashboardIpr } from "@/lib/dashboardIpr";
import {
  getRiskLevel,
  getRiskExplanation,
  calculateRemainingUsefulTime,
  riskThresholds,
} from "@/lib/colorThresholds";

type MachineStatus = "Running" | "Idle" | "Maintenance" | "Fault";

interface FleetRosterItem {
  equipment_name: string;
  display_id: string;
  machine_id: string;
  twin_id: string;
  status: MachineStatus;
  type: string;
  model: string;
  location?: string;
  oee: number;
  risk: number;
  riskScore?: number;
  next_pm: string;
  ipr?: DashboardIpr;
}

interface FleetCorrelationBlock {
  method?: string;
  row_count?: number;
  machine_count?: number;
  plot?: Record<string, unknown>;
  ipr?: DashboardIpr;
}

interface FleetDashboardData {
  fleet_name?: string;
  roster: FleetRosterItem[];
  kpis: {
    total_machines: number;
    running_now: number;
    avg_fleet_oee: number;
    at_risk_machines: number;
  };
  ipr?: DashboardIpr;
  plots?: DashboardPlot[];
  oee_by_machine: DashboardPlot & {
    labels: string[];
    values: number[];
    target: number;
  };
  correlation?: {
    sensor_correlation?: FleetCorrelationBlock;
    machine_correlation?: FleetCorrelationBlock;
    plot?: Record<string, unknown>;
    ipr?: DashboardIpr;
  };
}

interface MachineDashboardData {
  selected_machine_id: string;
  selected_display_id: string;
  selected_twin_id: string;
  ipr?: DashboardIpr;
  plots?: DashboardPlot[];
  machine: {
    equipment_name?: string;
    model?: string;
    type?: string;
    location?: string;
    status?: MachineStatus;
    engine_temp?: number;
    temperature?: number;
    vibration?: number;
    fuel_consumption?: number;
  };
  kpis: {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  };
  risk: {
    score?: number;
  };
  maintenance: {
    last_maintenance: string;
    next_maintenance: string;
    total_operating_hours?: number | string;
    hours_until_service?: number | string;
  };
  telemetry?: Array<{
    time?: string;
    temperature?: number;
    vibration?: number;
    output?: number;
  }>;
}

interface MachineViewModel {
  id: string;
  name: string;
  type: string;
  location: string;
  line: string;
  status: MachineStatus;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  riskScore: number;
  lastMaintenance: string;
  nextMaintenance: string;
  uptimeHours: number;
}

interface TelemetryPoint {
  time: string;
  temperature: number;
  vibration: number;
  output: number;
}

const statusColor: Record<MachineStatus, string> = {
  Running: "bg-success/10 text-success border-success/20",
  Idle: "bg-warning/10 text-warning border-warning/20",
  Maintenance: "bg-accent/10 text-accent border-accent/20",
  Fault: "bg-destructive/10 text-destructive border-destructive/20",
};

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (err instanceof Error) return err.message;
  return "Failed to load dashboard";
}

function buildTelemetry24h(base: { temperature: number; vibration: number; output: number; riskScore: number }): TelemetryPoint[] {
  return Array.from({ length: 24 }, (_, h) => ({
    time: `${String(h).padStart(2, "0")}:00`,
    temperature: base.temperature + Math.sin(h / 3) * 8 + Math.random() * 3 - base.riskScore / 10,
    vibration: base.vibration + Math.cos(h / 4) * 0.8 + Math.random() * 0.4,
    output: base.output + Math.sin(h / 6) * 12 + Math.random() * 6,
  }));
}

function mapMachineViewModel(
  rosterItem: FleetRosterItem,
  machineData?: MachineDashboardData | null,
): MachineViewModel {
  const hasApiData = machineData && machineData.selected_machine_id === rosterItem.machine_id;

  if (hasApiData) {
    const hoursUntilService = machineData.maintenance.hours_until_service;
    const parsedHours =
      hoursUntilService !== undefined && hoursUntilService !== "NA"
        ? parseInt(String(hoursUntilService).replace(/[^\d]/g, ""), 10)
        : 0;

    return {
      id: machineData.selected_display_id || rosterItem.display_id,
      name: machineData.machine.equipment_name || rosterItem.equipment_name,
      type: machineData.machine.type || rosterItem.type,
      location: machineData.machine.location || rosterItem.location || "—",
      line: rosterItem.model || "—",
      status: machineData.machine.status || rosterItem.status,
      oee: machineData.kpis.oee,
      availability: machineData.kpis.availability,
      performance: machineData.kpis.performance,
      quality: machineData.kpis.quality,
      riskScore: machineData.risk.score ?? rosterItem.risk ?? rosterItem.riskScore ?? 0,
      lastMaintenance: machineData.maintenance.last_maintenance,
      nextMaintenance: machineData.maintenance.next_maintenance,
      uptimeHours: parsedHours || 0,
    };
  }

  return {
    id: rosterItem.display_id,
    name: rosterItem.equipment_name,
    type: rosterItem.type,
    location: rosterItem.location || "—",
    line: rosterItem.model || "—",
    status: rosterItem.status,
    oee: rosterItem.oee,
    availability: Math.min(100, Math.round(rosterItem.oee * 1.08)),
    performance: Math.min(100, Math.round(rosterItem.oee * 1.05)),
    quality: Math.min(100, rosterItem.oee > 0 ? 99 : 0),
    riskScore: rosterItem.risk ?? rosterItem.riskScore ?? 0,
    lastMaintenance: "—",
    nextMaintenance: rosterItem.next_pm,
    uptimeHours: 0,
  };
}

function resolveTelemetry(
  rosterItem: FleetRosterItem,
  machineData?: MachineDashboardData | null,
): TelemetryPoint[] {
  if (machineData?.telemetry?.length) {
    return machineData.telemetry.map((point, index) => ({
      time: point.time || `${String(index).padStart(2, "0")}:00`,
      temperature: point.temperature ?? 0,
      vibration: point.vibration ?? 0,
      output: point.output ?? 0,
    }));
  }

  const hasApiData = machineData && machineData.selected_machine_id === rosterItem.machine_id;
  const temperature = hasApiData
    ? (machineData.machine.engine_temp ?? machineData.machine.temperature ?? 55)
    : (rosterItem.status === "Running" ? 55 + (rosterItem.risk ?? 0) * 0.3 : 40);
  const vibration = hasApiData
    ? (machineData.machine.vibration ?? 2.5)
    : (rosterItem.status === "Running" ? 2 + (rosterItem.risk ?? 0) * 0.05 : 0.5);
  const output = hasApiData
    ? (machineData.kpis.performance || machineData.machine.fuel_consumption || 40)
    : (rosterItem.status === "Running" ? Math.max(20, rosterItem.oee / 2) : 0);

  return buildTelemetry24h({
    temperature,
    vibration,
    output,
    riskScore: hasApiData ? (machineData.risk.score ?? rosterItem.risk ?? 0) : (rosterItem.risk ?? 0),
  });
}

function FleetView({
  fleetData,
  onSelect,
}: {
  fleetData: FleetDashboardData;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const roster = fleetData.roster || [];
  const filtered = roster.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.equipment_name.toLowerCase().includes(q) ||
      m.display_id.toLowerCase().includes(q) ||
      m.machine_id.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fleetStats = {
    total: fleetData.kpis.total_machines,
    running: fleetData.kpis.running_now,
    avgOEE: Math.round(fleetData.kpis.avg_fleet_oee),
    atRisk: fleetData.kpis.at_risk_machines,
  };

  const oeePlot: DashboardPlot = {
    plot_id: "oee_by_machine",
    type: "bar",
    title: fleetData.oee_by_machine?.title ?? "OEE by Machine",
    target: fleetData.oee_by_machine?.target ?? 80,
    labels: fleetData.oee_by_machine?.labels ?? [],
    values: fleetData.oee_by_machine?.values ?? [],
    colors: fleetData.oee_by_machine?.colors,
    description: fleetData.oee_by_machine?.description,
    ipr: fleetData.oee_by_machine?.ipr ?? fleetData.ipr,
  };

  const sensorPlots = (fleetData.plots ?? []).filter((plot) => plot.plot_id !== "oee_by_machine");

  const machineLabelMap = Object.fromEntries(
    roster.map((m) => [m.machine_id, m.display_id]),
  );
  for (const m of roster) {
    if (m.twin_id) machineLabelMap[m.twin_id] = m.display_id;
  }

  const sensorCorrelationPlot =
    correlationPlotFromApi(
      fleetData.correlation?.sensor_correlation?.plot ??
        fleetData.correlation?.plot,
      fleetData.correlation?.sensor_correlation?.ipr ?? fleetData.correlation?.ipr,
    );
  const machineCorrelationPlot = correlationPlotFromApi(
    fleetData.correlation?.machine_correlation?.plot,
    fleetData.correlation?.machine_correlation?.ipr,
  );

  const sensorRows = fleetData.correlation?.sensor_correlation?.row_count;
  const machineCount =
    fleetData.correlation?.machine_correlation?.machine_count ?? roster.length;

  return (
    <div className="space-y-6">
      <DashboardIprPanel ipr={fleetData.ipr} />

      {/* Fleet KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Machines", value: fleetStats.total, icon: Cpu, color: "text-accent" },
          { label: "Running Now", value: fleetStats.running, icon: Activity, color: "text-success" },
          { label: "Avg Fleet OEE", value: `${fleetStats.avgOEE}%`, icon: Gauge, color: "text-purple" },
          { label: "At-Risk Machines", value: fleetStats.atRisk, icon: AlertTriangle, color: "text-destructive" },
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

      {/* OEE per Machine */}
      <DashboardPlotCard plot={oeePlot} targetBadge />

      {(sensorCorrelationPlot || machineCorrelationPlot) && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Multi-Machine Correlation</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cross-sensor and cross-machine relationships pooled across the fleet
              {sensorRows ? ` (${sensorRows.toLocaleString()} readings)` : ""}.
            </p>
          </div>
          <div className="grid xl:grid-cols-2 gap-6">
            {sensorCorrelationPlot && (
              <CorrelationHeatmapCard
                plot={sensorCorrelationPlot}
                labelKind="sensor"
                subtitle={
                  fleetData.correlation?.sensor_correlation?.method
                    ? `Method: ${fleetData.correlation.sensor_correlation.method.replace(/_/g, " ")}`
                    : "All sensors · all machines"
                }
              />
            )}
            {machineCorrelationPlot && (
              <CorrelationHeatmapCard
                plot={machineCorrelationPlot}
                labelKind="machine"
                displayByMachineId={machineLabelMap}
                subtitle={`${machineCount} machines · profile means across all sensors`}
              />
            )}
          </div>
        </div>
      )}

      {sensorPlots.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {sensorPlots.map((plot) => (
            <DashboardPlotCard key={plot.plot_id ?? plot.title} plot={plot} />
          ))}
        </div>
      )}

      {/* Filters + Table */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search machines…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["All", "Running", "Idle", "Maintenance", "Fault"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-button border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card className="rounded-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Cog className="h-4 w-4 text-accent" /> Fleet Roster ({filtered.length})
        </h3>
        <DataTable
          columns={[
            {
              key: "equipment_name",
              header: "Machine",
              render: (_v, m) => (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{(m as FleetRosterItem).equipment_name}</span>
                  <span className="text-[10px] text-muted-foreground">{(m as FleetRosterItem).display_id} • {(m as FleetRosterItem).location || "—"}</span>
                </div>
              ),
            },
            { key: "type", header: "Type", render: (v) => <span className="text-muted-foreground text-xs">{String(v)}</span> },
            {
              key: "status",
              header: "Status",
              render: (v) => <Badge variant="outline" className={`text-[10px] ${statusColor[v as FleetRosterItem["status"]]}`}>{String(v)}</Badge>,
            },
            { key: "oee", header: "OEE", align: "right", render: (v) => <span className="font-mono text-xs">{String(v)}%</span> },
            {
              key: "risk",
              header: "Risk",
              align: "right",
              render: (_v, m) => {
                const riskScore = (m as FleetRosterItem).risk ?? (m as FleetRosterItem).riskScore ?? 0;
                return (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-[10px] cursor-help ${
                          riskScore >= 60 ? "bg-destructive/10 text-destructive border-destructive/20" :
                          riskScore >= 30 ? "bg-warning/10 text-warning border-warning/20" :
                          "bg-success/10 text-success border-success/20"
                        }`}>
                          {riskScore}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs font-semibold">{getRiskLevel(riskScore)} Risk</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{getRiskExplanation(riskScore)}</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                );
              },
            },
            { key: "next_pm", header: "Next PM", render: (v) => <span className="text-xs text-muted-foreground">{String(v ?? "—")}</span> },
            {
              key: "_actions",
              header: "",
              align: "right",
              render: (_v, m) => (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelect((m as FleetRosterItem).machine_id); }}>
                  Inspect →
                </Button>
              ),
            },
          ] as ColumnDef<FleetRosterItem>[]}
          rows={filtered}
          getRowKey={(m) => m.machine_id}
          onRowClick={(m) => onSelect(m.machine_id)}
          emptyMessage="No machines in fleet."
        />
      </Card>
    </div>
  );
}

function SingleMachineView({
  machineId,
  fleetData,
  machineData,
}: {
  machineId: string;
  fleetData: FleetDashboardData;
  machineData: MachineDashboardData | null;
}) {
  const rosterItem = fleetData.roster.find((m) => m.machine_id === machineId) ?? fleetData.roster[0];

  if (!rosterItem) {
    return (
      <Card className="rounded-card p-6">
        <p className="text-sm text-muted-foreground">Machine not found in fleet roster.</p>
      </Card>
    );
  }

  const machine = mapMachineViewModel(rosterItem, machineData);
  const telemetry = useMemo(
    () => resolveTelemetry(rosterItem, machineData),
    [rosterItem, machineData],
  );

  const oeeBreakdown = [
    { name: "Availability", value: machine.availability },
    { name: "Performance", value: machine.performance },
    { name: "Quality", value: machine.quality },
  ];

  const remainingTime = calculateRemainingUsefulTime(machine.riskScore, machine.uptimeHours, machine.lastMaintenance);
  const machineIpr = machineData?.ipr ?? rosterItem.ipr;
  const apiPlots = machineData?.plots ?? [];
  const useApiPlots = apiPlots.length > 0;

  return (
    <div className="space-y-6">
      <DashboardIprPanel
        ipr={machineIpr}
        title="Machine insights"
        subtitle="What your equipment data means right now"
      />

      {/* Machine header */}
      <Card className="rounded-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Cog className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{machine.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {machine.id} • {machine.type} • {machine.location} • {machine.line}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs ${statusColor[machine.status]}`}>{machine.status}</Badge>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "OEE", value: `${machine.oee}%`, icon: Gauge, color: "text-accent" },
          { label: "Availability", value: `${machine.availability}%`, icon: Activity, color: "text-success" },
          { label: "Performance", value: `${machine.performance}%`, icon: Zap, color: "text-purple" },
          { label: "Quality", value: `${machine.quality}%`, icon: Cpu, color: "text-teal" },
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

      {/* Remaining Useful Time Section */}
      <Card className="rounded-card p-5 border-l-4" style={{ borderLeftColor: remainingTime.urgency === "urgent" ? "hsl(var(--destructive))" : remainingTime.urgency === "monitor" ? "hsl(var(--warning))" : "hsl(var(--success))" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`h-5 w-5 ${remainingTime.urgency === "urgent" ? "text-destructive" : remainingTime.urgency === "monitor" ? "text-warning" : "text-success"}`} />
              <h3 className="text-sm font-semibold">Remaining Useful Time Before Maintenance</h3>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-bold">{remainingTime.days}</span>
              <span className="text-lg text-muted-foreground">days ({remainingTime.hours} hours)</span>
            </div>
            <p className="text-sm text-muted-foreground">{remainingTime.message}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${
            remainingTime.urgency === "urgent" ? "bg-destructive/10 text-destructive border-destructive/20" :
            remainingTime.urgency === "monitor" ? "bg-warning/10 text-warning border-warning/20" :
            "bg-success/10 text-success border-success/20"
          }`}>
            {remainingTime.urgency.toUpperCase()}
          </Badge>
        </div>
        <div className="mt-4 pt-4 border-t space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prescriptive Action Timeline</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-semibold mb-1">Immediate</p>
              <p className="text-[11px] text-muted-foreground">{remainingTime.recommendations.immediate}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold mb-1">Next 5 Days</p>
              <p className="text-[11px] text-muted-foreground">{remainingTime.recommendations.fiveDays}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold mb-1">Next 10 Days</p>
              <p className="text-[11px] text-muted-foreground">{remainingTime.recommendations.tenDays}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold mb-1">Next 30 Days</p>
              <p className="text-[11px] text-muted-foreground">{remainingTime.recommendations.thirtyDays}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Telemetry charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {useApiPlots ? (
          apiPlots.map((plot) => (
            <DashboardPlotCard key={plot.plot_id ?? plot.title} plot={plot} />
          ))
        ) : (
          <>
        <Card className="rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-destructive" /> Temperature (24h)
            </h3>
            <ChartInfo
              xAxis="Time (last 24 hours)"
              yAxis="Temperature in degrees Celsius (°C)"
              ipr={normalizeDashboardIpr(machineIpr)}
              note="Shows bearing/motor temperature trends. Sustained high temps indicate cooling issues or bearing wear."
            />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Time", position: "insideBottom", offset: -5, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "°C", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="temperature" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#tempGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" /> Vibration (24h)
            </h3>
            <ChartInfo
              xAxis="Time (last 24 hours)"
              yAxis="Vibration amplitude in mm/s (RMS)"
              ipr={normalizeDashboardIpr(machineIpr)}
              note="Tracks mechanical vibration levels. Increasing trends indicate bearing wear, misalignment, or imbalance."
            />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Time", position: "insideBottom", offset: -5, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "mm/s", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="vibration" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple" /> Output (units / hr, 24h)
            </h3>
            <ChartInfo
              xAxis="Time (last 24 hours)"
              yAxis="Production output in units per hour"
              ipr={normalizeDashboardIpr(machineIpr)}
              note="Measures actual production throughput. Drops indicate performance issues, stoppages, or quality problems."
            />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Time", position: "insideBottom", offset: -5, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: "units/hr", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="output" fill="hsl(var(--purple))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
          </>
        )}

        <Card className="rounded-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-success" /> OEE Breakdown
          </h3>
          <div className="space-y-3 mt-4">
            {oeeBreakdown.map((b) => (
              <div key={b.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{b.name}</span>
                  <span className="text-xs font-mono">{b.value}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${b.value}%`,
                      background: b.value >= 90 ? "hsl(var(--success))" : b.value >= 70 ? "hsl(var(--accent))" : "hsl(var(--warning))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Risk Score</span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs font-semibold">{getRiskLevel(machine.riskScore)} Risk Level</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{getRiskExplanation(machine.riskScore)}</p>
                      <div className="mt-2 space-y-1">
                        {riskThresholds.map((t) => (
                          <div key={t.label} className="flex items-start gap-2 text-[10px]">
                            <span className="h-2 w-2 rounded-sm shrink-0 mt-0.5" style={{ background: t.color }} />
                            <span><strong>{t.range}:</strong> {t.label}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                machine.riskScore >= 60 ? "bg-destructive/10 text-destructive border-destructive/20" :
                machine.riskScore >= 30 ? "bg-warning/10 text-warning border-warning/20" :
                "bg-success/10 text-success border-success/20"
              }`}>
                {machine.riskScore} / 100
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{getRiskLevel(machine.riskScore)} - {getRiskExplanation(machine.riskScore).split('.')[0]}.</p>
          </div>
        </Card>
      </div>

      {/* Maintenance */}
      <Card className="rounded-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-accent" /> Maintenance Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Last Maintenance</p>
            <p className="mt-1 font-medium">{machine.lastMaintenance}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Next Maintenance</p>
            <p className={`mt-1 font-medium ${machine.nextMaintenance === "OVERDUE" ? "text-destructive" : ""}`}>
              {machine.nextMaintenance}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Uptime (current run)</p>
            <p className="mt-1 font-medium">{machine.uptimeHours} hrs</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { scope, setScope, selectedMachineId, setSelectedMachineId } = useMachineScope();
  const { activeRegistryId, loading: datasetLoading } = useDataset();
  const [fleetData, setFleetData] = useState<FleetDashboardData | null>(null);
  const [machineData, setMachineData] = useState<MachineDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (datasetLoading) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (activeRegistryId == null) {
          setError("No active dataset. Select a dataset in Data Ingestion first.");
          setFleetData(null);
          setMachineData(null);
          setLoading(false);
          return;
        }

        const fleetsRes = await digitalTwinApi.listFleets();
        if (!fleetsRes.fleets || fleetsRes.fleets.length === 0) {
          setError("No fleets available. Please create a Digital Twin fleet first.");
          setFleetData(null);
          setMachineData(null);
          setLoading(false);
          return;
        }

        const fleet =
          fleetsRes.fleets.find((f) => Number(f.registry_id) === activeRegistryId) ??
          fleetsRes.fleets[0];

        if (scope === "fleet") {
          const data = await dashboardApi.getFleetDashboard({
            fleet_id: fleet.fleet_id,
            registry_id: fleet.registry_id ?? activeRegistryId,
            view: "correlation",
            use_gpt_ipr: true,
          });
          if (cancelled) return;
          setFleetData(data as FleetDashboardData);
          setMachineData(null);
          if (!selectedMachineId && data.roster?.length > 0) {
            setSelectedMachineId(data.roster[0].machine_id);
          }
        } else {
          const data = await dashboardApi.getFleetDashboard({
            fleet_id: fleet.fleet_id,
            registry_id: fleet.registry_id ?? activeRegistryId,
            view: "machine",
            use_gpt_ipr: true,
          });
          if (cancelled) return;
          setFleetData(data as FleetDashboardData);

          let machineId = selectedMachineId;
          if (!machineId && data.roster?.length > 0) {
            machineId = data.roster[0].machine_id;
            setSelectedMachineId(machineId);
          }

          if (machineId) {
            const rosterItem = data.roster?.find((m: FleetRosterItem) => m.machine_id === machineId);
            if (rosterItem) {
              const machineDashboard = await dashboardApi.getMachineDashboard({
                twin_id: rosterItem.twin_id,
                registry_id: fleet.registry_id ?? activeRegistryId,
                fleet_id: fleet.fleet_id,
                use_gpt_ipr: true,
              });
              if (cancelled) return;
              setMachineData(machineDashboard as MachineDashboardData);
            } else {
              setMachineData(null);
            }
          } else {
            setMachineData(null);
          }
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        if (!cancelled) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, selectedMachineId, activeRegistryId, datasetLoading, setSelectedMachineId]);

  if (loading || datasetLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Error Loading Dashboard</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!fleetData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-muted-foreground">No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{scope === "fleet" ? "Fleet View" : "Machine View"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {scope === "fleet"
              ? `Aggregated health and performance across ${fleetData.fleet_name || "all machines"}`
              : "Deep telemetry and KPIs for a single machine"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scope === "single" && (
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fleetData.roster.map((m) => (
                  <SelectItem key={m.machine_id} value={m.machine_id}>
                    {m.display_id} — {m.equipment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-button border bg-card p-0.5">
            <button
              onClick={() => setScope("single")}
              className={`flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "single" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cog className="h-3.5 w-3.5" /> Machine View
            </button>
            <button
              onClick={() => setScope("fleet")}
              className={`flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "fleet" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Fleet View
            </button>
          </div>
        </div>
      </div>

      {scope === "fleet" ? (
        <FleetView
          fleetData={fleetData}
          onSelect={(id) => {
            setSelectedMachineId(id);
            setScope("single");
          }}
        />
      ) : (
        <SingleMachineView
          machineId={selectedMachineId}
          fleetData={fleetData}
          machineData={machineData}
        />
      )}
    </div>
  );
}
