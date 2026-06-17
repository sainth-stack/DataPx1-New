// Mock industrial machine & cluster data for Datapx1.
// All numbers are illustrative and meant for demo purposes.

export interface Machine {
  id: string;
  name: string;
  type: string;
  line: string;
  location: string;
  status: "Running" | "Idle" | "Maintenance" | "Fault";
  oee: number;            // % (0-100)
  availability: number;   // % (0-100)
  performance: number;    // % (0-100)
  quality: number;        // % (0-100)
  temperature: number;    // °C (Celsius)
  vibration: number;      // mm/s (millimeters per second)
  pressure: number;       // bar (pressure unit)
  uptimeHours: number;    // hours
  lastMaintenance: string;
  nextMaintenance: string;
  riskScore: number;      // score (0-100, higher = more at risk)
}

export const allMachines: Machine[] = [
  { id: "M-101", name: "CNC Mill Alpha", type: "CNC Milling", line: "Line A", location: "Plant 1 — Bay 2", status: "Running",     oee: 84, availability: 92, performance: 91, quality: 99, temperature: 62, vibration: 2.1, pressure: 5.4, uptimeHours: 412, lastMaintenance: "2026-03-22", nextMaintenance: "2026-05-22", riskScore: 18 },
  { id: "M-102", name: "Press Beta",     type: "Hydraulic Press", line: "Line A", location: "Plant 1 — Bay 3", status: "Running", oee: 78, availability: 88, performance: 89, quality: 99, temperature: 71, vibration: 3.4, pressure: 6.8, uptimeHours: 388, lastMaintenance: "2026-03-10", nextMaintenance: "2026-05-10", riskScore: 32 },
  { id: "M-103", name: "Robot Arm Gamma", type: "Pick & Place", line: "Line B", location: "Plant 1 — Bay 5", status: "Maintenance", oee: 0,  availability: 0,  performance: 0,  quality: 0,  temperature: 38, vibration: 0.0, pressure: 0.0, uptimeHours: 0,   lastMaintenance: "2026-04-15", nextMaintenance: "2026-04-18", riskScore: 65 },
  { id: "M-104", name: "Welder Delta",    type: "Robotic Welding", line: "Line B", location: "Plant 1 — Bay 6", status: "Running", oee: 82, availability: 90, performance: 92, quality: 99, temperature: 84, vibration: 2.7, pressure: 4.2, uptimeHours: 401, lastMaintenance: "2026-03-28", nextMaintenance: "2026-05-28", riskScore: 22 },
  { id: "M-105", name: "Conveyor Epsilon", type: "Conveyor System", line: "Line C", location: "Plant 1 — Floor", status: "Idle",   oee: 35, availability: 45, performance: 78, quality: 99, temperature: 41, vibration: 1.2, pressure: 2.1, uptimeHours: 180, lastMaintenance: "2026-02-20", nextMaintenance: "2026-04-25", riskScore: 48 },
  { id: "M-106", name: "Lathe Zeta",      type: "CNC Lathe", line: "Line C", location: "Plant 2 — Bay 1", status: "Fault",   oee: 12, availability: 18, performance: 65, quality: 98, temperature: 96, vibration: 6.8, pressure: 7.9, uptimeHours: 22,  lastMaintenance: "2026-01-15", nextMaintenance: "OVERDUE", riskScore: 88 },
  { id: "M-107", name: "Injection Eta",   type: "Injection Molding", line: "Line D", location: "Plant 2 — Bay 2", status: "Running", oee: 88, availability: 94, performance: 93, quality: 99, temperature: 195, vibration: 1.8, pressure: 12.4, uptimeHours: 432, lastMaintenance: "2026-04-01", nextMaintenance: "2026-06-01", riskScore: 14 },
  { id: "M-108", name: "Grinder Theta",   type: "Surface Grinder", line: "Line D", location: "Plant 2 — Bay 3", status: "Running", oee: 76, availability: 86, performance: 88, quality: 99, temperature: 68, vibration: 3.1, pressure: 5.0, uptimeHours: 372, lastMaintenance: "2026-03-15", nextMaintenance: "2026-05-15", riskScore: 28 },
];

// Backwards-compat alias (do not use in new code — prefer `allMachines`).
export const fleetMachines = allMachines;

// ─── Kalmar Industrial Equipment Data ──────────────────────────────────────
// Real-world Kalmar port and terminal equipment with accurate specifications
export interface KalmarMachine {
  id: string;
  name: string;
  model: string;
  type: "Reach Stacker" | "Forklift" | "Terminal Tractor" | "Empty Container Handler" | "Straddle Carrier";
  location: string;
  status: "Running" | "Idle" | "Maintenance" | "Fault";
  
  // Performance metrics
  oee: number;                    // % (0-100)
  availability: number;           // % (0-100)
  performance: number;            // % (0-100)
  quality: number;                // % (0-100)
  
  // Operational parameters with units
  engineTemp: number;             // °C (Celsius)
  hydraulicTemp: number;          // °C (Celsius)
  hydraulicPressure: number;      // bar
  engineRpm: number;              // RPM (revolutions per minute)
  fuelLevel: number;              // % (0-100)
  fuelConsumption: number;        // L/h (liters per hour)
  
  // Mechanical health
  vibration: number;              // mm/s (millimeters per second)
  tireWear: number;               // % (0-100, 100 = new)
  brakeWear: number;              // % (0-100, 100 = new)
  
  // Load handling
  currentLoad: number;            // tons (metric)
  maxCapacity: number;            // tons (metric)
  liftsCompleted: number;         // count
  totalOperatingHours: number;    // hours
  
  // Maintenance
  lastMaintenance: string;
  nextMaintenance: string;
  hoursUntilService: number;      // hours
  riskScore: number;              // score (0-100, higher = more at risk)
  
  // Environmental
  emissionsLevel: number;         // g/kWh (grams per kilowatt-hour)
  noiseLevel: number;             // dB (decibels)
}

export const kalmarFleet: KalmarMachine[] = [
  {
    id: "KLM-RS-001",
    name: "Reach Stacker Alpha",
    model: "Kalmar DRG450-65S5XS",
    type: "Reach Stacker",
    location: "Terminal A - Zone 1",
    status: "Running",
    oee: 87,
    availability: 94,
    performance: 91,
    quality: 98,
    engineTemp: 92,
    hydraulicTemp: 68,
    hydraulicPressure: 280,
    engineRpm: 1850,
    fuelLevel: 68,
    fuelConsumption: 24.5,
    vibration: 3.2,
    tireWear: 72,
    brakeWear: 65,
    currentLoad: 38,
    maxCapacity: 45,
    liftsCompleted: 2847,
    totalOperatingHours: 8420,
    lastMaintenance: "2026-04-10",
    nextMaintenance: "2026-06-10",
    hoursUntilService: 420,
    riskScore: 24,
    emissionsLevel: 245,
    noiseLevel: 98,
  },
  {
    id: "KLM-RS-002",
    name: "Reach Stacker Beta",
    model: "Kalmar DRG450-75S6X",
    type: "Reach Stacker",
    location: "Terminal A - Zone 2",
    status: "Running",
    oee: 82,
    availability: 89,
    performance: 93,
    quality: 99,
    engineTemp: 88,
    hydraulicTemp: 71,
    hydraulicPressure: 275,
    engineRpm: 1920,
    fuelLevel: 45,
    fuelConsumption: 26.2,
    vibration: 3.8,
    tireWear: 58,
    brakeWear: 52,
    currentLoad: 42,
    maxCapacity: 45,
    liftsCompleted: 3124,
    totalOperatingHours: 9240,
    lastMaintenance: "2026-03-22",
    nextMaintenance: "2026-05-22",
    hoursUntilService: 280,
    riskScore: 38,
    emissionsLevel: 252,
    noiseLevel: 101,
  },
  {
    id: "KLM-FL-001",
    name: "Forklift Gamma",
    model: "Kalmar DCG80-90",
    type: "Forklift",
    location: "Warehouse B",
    status: "Running",
    oee: 91,
    availability: 96,
    performance: 94,
    quality: 99,
    engineTemp: 76,
    hydraulicTemp: 58,
    hydraulicPressure: 210,
    engineRpm: 1650,
    fuelLevel: 82,
    fuelConsumption: 12.8,
    vibration: 2.1,
    tireWear: 84,
    brakeWear: 78,
    currentLoad: 6.5,
    maxCapacity: 9,
    liftsCompleted: 4521,
    totalOperatingHours: 6830,
    lastMaintenance: "2026-04-15",
    nextMaintenance: "2026-07-15",
    hoursUntilService: 720,
    riskScore: 12,
    emissionsLevel: 198,
    noiseLevel: 85,
  },
  {
    id: "KLM-TT-001",
    name: "Terminal Tractor Delta",
    model: "Kalmar TT612d",
    type: "Terminal Tractor",
    location: "Terminal C - Transfer Zone",
    status: "Running",
    oee: 85,
    availability: 91,
    performance: 92,
    quality: 98,
    engineTemp: 84,
    hydraulicTemp: 62,
    hydraulicPressure: 185,
    engineRpm: 1780,
    fuelLevel: 54,
    fuelConsumption: 18.4,
    vibration: 2.8,
    tireWear: 68,
    brakeWear: 71,
    currentLoad: 32,
    maxCapacity: 60,
    liftsCompleted: 1842,
    totalOperatingHours: 7520,
    lastMaintenance: "2026-04-02",
    nextMaintenance: "2026-06-02",
    hoursUntilService: 380,
    riskScore: 28,
    emissionsLevel: 212,
    noiseLevel: 92,
  },
  {
    id: "KLM-ECH-001",
    name: "Empty Handler Epsilon",
    model: "Kalmar DCE80-45E7",
    type: "Empty Container Handler",
    location: "Terminal B - Empty Stack",
    status: "Idle",
    oee: 45,
    availability: 52,
    performance: 86,
    quality: 99,
    engineTemp: 42,
    hydraulicTemp: 38,
    hydraulicPressure: 45,
    engineRpm: 850,
    fuelLevel: 91,
    fuelConsumption: 3.2,
    vibration: 0.8,
    tireWear: 92,
    brakeWear: 88,
    currentLoad: 0,
    maxCapacity: 10,
    liftsCompleted: 1624,
    totalOperatingHours: 4280,
    lastMaintenance: "2026-04-20",
    nextMaintenance: "2026-08-20",
    hoursUntilService: 920,
    riskScore: 8,
    emissionsLevel: 185,
    noiseLevel: 78,
  },
  {
    id: "KLM-SC-001",
    name: "Straddle Carrier Zeta",
    model: "Kalmar DRD450-70S5",
    type: "Straddle Carrier",
    location: "Terminal D - Stack Area",
    status: "Fault",
    oee: 18,
    availability: 22,
    performance: 81,
    quality: 95,
    engineTemp: 118,
    hydraulicTemp: 96,
    hydraulicPressure: 195,
    engineRpm: 2240,
    fuelLevel: 28,
    fuelConsumption: 32.8,
    vibration: 8.4,
    tireWear: 42,
    brakeWear: 38,
    currentLoad: 0,
    maxCapacity: 45,
    liftsCompleted: 2184,
    totalOperatingHours: 10840,
    lastMaintenance: "2025-12-15",
    nextMaintenance: "OVERDUE",
    hoursUntilService: -840,
    riskScore: 94,
    emissionsLevel: 312,
    noiseLevel: 108,
  },
  {
    id: "KLM-FL-002",
    name: "Forklift Eta",
    model: "Kalmar DCG90-100",
    type: "Forklift",
    location: "Warehouse A",
    status: "Running",
    oee: 89,
    availability: 93,
    performance: 96,
    quality: 99,
    engineTemp: 78,
    hydraulicTemp: 61,
    hydraulicPressure: 215,
    engineRpm: 1720,
    fuelLevel: 74,
    fuelConsumption: 14.2,
    vibration: 2.4,
    tireWear: 81,
    brakeWear: 75,
    currentLoad: 7.8,
    maxCapacity: 10,
    liftsCompleted: 5248,
    totalOperatingHours: 7120,
    lastMaintenance: "2026-04-18",
    nextMaintenance: "2026-07-18",
    hoursUntilService: 780,
    riskScore: 14,
    emissionsLevel: 202,
    noiseLevel: 87,
  },
  {
    id: "KLM-RS-003",
    name: "Reach Stacker Theta",
    model: "Kalmar DRG450-65S5XS",
    type: "Reach Stacker",
    location: "Terminal A - Zone 3",
    status: "Maintenance",
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0,
    engineTemp: 35,
    hydraulicTemp: 32,
    hydraulicPressure: 0,
    engineRpm: 0,
    fuelLevel: 88,
    fuelConsumption: 0,
    vibration: 0,
    tireWear: 45,
    brakeWear: 42,
    currentLoad: 0,
    maxCapacity: 45,
    liftsCompleted: 3842,
    totalOperatingHours: 11200,
    lastMaintenance: "2026-05-04",
    nextMaintenance: "2026-05-11",
    hoursUntilService: 0,
    riskScore: 72,
    emissionsLevel: 0,
    noiseLevel: 55,
  },
];

// Kalmar-specific telemetry units reference
export const kalmarUnits = {
  temperature: "°C",
  hydraulicPressure: "bar",
  engineRpm: "RPM",
  fuelLevel: "%",
  fuelConsumption: "L/h",
  vibration: "mm/s",
  load: "tons",
  operatingHours: "hours",
  emissions: "g/kWh",
  noiseLevel: "dB",
  percentage: "%",
  speed: "km/h",
  distance: "km",
  power: "kW",
  energy: "kWh",
};

// Helper function to format values with proper units
export function formatWithUnit(value: number, unitType: keyof typeof kalmarUnits, decimals = 1): string {
  return `${value.toFixed(decimals)} ${kalmarUnits[unitType]}`;
}

// Universal units reference for all machine types
export const machineUnits = {
  temperature: "°C",
  vibration: "mm/s",
  pressure: "bar",
  speed: "km/h",
  rpm: "RPM",
  energy: "kWh",
  power: "kW",
  percentage: "%",
  hours: "hours",
  distance: "km",
  weight: "tons",
  fuelRate: "L/h",
  emissions: "g/kWh",
  noise: "dB",
  current: "A",
  voltage: "V",
  frequency: "Hz",
};

// 24h telemetry sample for a machine
export const telemetry24h = Array.from({ length: 24 }, (_, h) => ({
  time: `${String(h).padStart(2, "0")}:00`,
  temperature: 55 + Math.sin(h / 3) * 8 + Math.random() * 3,
  vibration: 2 + Math.cos(h / 4) * 0.8 + Math.random() * 0.4,
  pressure: 5 + Math.sin(h / 5) * 1.2 + Math.random() * 0.3,
  output: 40 + Math.sin(h / 6) * 12 + Math.random() * 6,
}));

// Connectors catalog
export interface Connector {
  id: string;
  name: string;
  category: "ERP" | "MES" | "SCADA" | "IoT / Telemetry" | "Database" | "Cloud Storage";
  description: string;
  status: "Connected" | "Available";
  lastSync?: string;
  records?: string;
  icon: string; // initials for placeholder
}

export const connectorCatalog: Connector[] = [
  // ERP — machine-centric parameters only (asset master, PM schedules, maintenance costs, spare-parts stock, energy consumption). Financials / BOM / sales orders are intentionally excluded.
  { id: "sap_s4", name: "SAP S/4HANA (PM/EAM)", category: "ERP", description: "Plant Maintenance (PM) module: asset master, equipment hierarchy, PM work orders, maintenance costs and spare-parts stock — used for predictive maintenance and supply-chain (spares) planning.", status: "Available", icon: "SA" },
  { id: "oracle_erp", name: "Oracle EAM", category: "ERP", description: "Enterprise Asset Management: asset registry, PM schedules, meter readings, failure history and energy cost allocation per asset.", status: "Available", icon: "OR" },
  { id: "ms_dynamics", name: "Microsoft Dynamics 365 (Asset Mgmt)", category: "ERP", description: "Asset Management: equipment master, maintenance requests, PM plans and spare-parts reorder points — no financial or sales-order data ingested.", status: "Available", icon: "MS" },
  { id: "siemens_mes", name: "Siemens Opcenter MES", category: "MES", description: "Machine-level production events: cycle times, run/idle/downtime reasons, scrap counts and shift log — used for OEE and machine performance.", status: "Available", icon: "SI" },
  { id: "rockwell_mes", name: "Rockwell FactoryTalk", category: "MES", description: "Real-time OEE, availability & downtime codes per machine, plus changeover and micro-stop events.", status: "Available", icon: "RW" },
  { id: "ge_proficy", name: "GE Proficy SCADA", category: "SCADA", description: "Real-time PLC tags from each machine: temperature, vibration, pressure, current, speed — feeds predictive maintenance and energy optimisation.", status: "Available", icon: "GE" },
  { id: "wonderware", name: "AVEVA Wonderware", category: "SCADA", description: "Plant SCADA/HMI tag history: setpoints, alarms and analog sensor values per machine.", status: "Available", icon: "AV" },
  { id: "mqtt_broker", name: "MQTT Broker", category: "IoT / Telemetry", description: "Stream sensor data via MQTT topics.", status: "Available", icon: "MQ" },
  { id: "opc_ua", name: "OPC UA Server", category: "IoT / Telemetry", description: "Industrial machine telemetry standard.", status: "Available", icon: "OP" },
  { id: "azure_iot", name: "Azure IoT Hub", category: "IoT / Telemetry", description: "Cloud IoT device management & telemetry.", status: "Available", icon: "AZ" },
  { id: "aws_iot", name: "AWS IoT Core", category: "IoT / Telemetry", description: "Managed IoT message broker.", status: "Available", icon: "AW" },
  { id: "postgres", name: "PostgreSQL", category: "Database", description: "Relational data warehouse / OLTP.", status: "Available", icon: "PG" },
  { id: "snowflake", name: "Snowflake", category: "Database", description: "Cloud data warehouse.", status: "Available", icon: "SN" },
  { id: "minitab", name: "Minitab QC", category: "Database", description: "Statistical Process Control (SPC) database — stores quality control results per machine, feeds quality-loss component of OEE.", status: "Available", icon: "MT" },
  { id: "s3", name: "Amazon S3", category: "Cloud Storage", description: "Bulk file & log storage.", status: "Available", icon: "S3" },
  { id: "azure_blob", name: "Azure Blob Storage", category: "Cloud Storage", description: "Microsoft Azure object storage for bulk telemetry and log archives.", status: "Available", icon: "AZ" },
  { id: "gcs", name: "Google Cloud Storage", category: "Cloud Storage", description: "GCS buckets for cold/warm data lake storage.", status: "Available", icon: "GC" },
  { id: "navis_n4", name: "Navis N4 TOS", category: "MES", description: "Terminal Operating System — equipment events (cranes, RTGs, reach-stackers): moves, idle, fault codes. Machine events only; no commercial data.", status: "Available", icon: "NV" },
];

// Raw sample dataset for Data Processing page
export const rawDatasetColumns = [
  "timestamp", "machine_id", "temperature_c", "vibration_mms", "pressure_bar", "output_units", "scrap_count", "shift",
];

export const rawDatasetRows = Array.from({ length: 12 }, (_, i) => {
  const machines = ["M-101", "M-102", "M-104", "M-105", "M-107", "M-108"];
  const shifts = ["A", "B", "C"];
  return [
    `2026-04-17 ${String(8 + i).padStart(2, "0")}:00`,
    machines[i % machines.length],
    (55 + Math.random() * 40).toFixed(1),
    (1.5 + Math.random() * 4).toFixed(2),
    (3 + Math.random() * 10).toFixed(2),
    Math.round(35 + Math.random() * 25),
    Math.round(Math.random() * 4),
    shifts[i % 3],
  ];
});

// Statistical summary with units
export const statisticalSummary = [
  { feature: "temperature_c", mean: 71.4, median: 69.8, std: 12.6, min: 38.0, max: 195.0, missing: 0.4, unit: "°C" },
  { feature: "vibration_mms", mean: 2.94, median: 2.71, std: 1.42, min: 0.00, max: 6.80, missing: 0.0, unit: "mm/s" },
  { feature: "pressure_bar", mean: 5.48, median: 5.20, std: 2.81, min: 0.00, max: 12.40, missing: 1.2, unit: "bar" },
  { feature: "output_units", mean: 47.2, median: 48.0, std: 9.8, min: 0, max: 72, missing: 0.0, unit: "units/hr" },
  { feature: "scrap_count", mean: 1.32, median: 1.0, std: 1.18, min: 0, max: 6, missing: 0.0, unit: "count" },
];

// Feature correlation with target (output_units)
export const featureImportance = [
  { feature: "temperature_c", importance: 0.32, correlation: -0.41 },
  { feature: "vibration_mms", importance: 0.28, correlation: -0.58 },
  { feature: "pressure_bar", importance: 0.18, correlation: 0.22 },
  { feature: "shift_encoded", importance: 0.12, correlation: 0.14 },
  { feature: "machine_age_yrs", importance: 0.10, correlation: -0.31 },
];

// Distribution buckets for a feature
export const temperatureDistribution = [
  { bucket: "30-50", count: 12 },
  { bucket: "50-70", count: 48 },
  { bucket: "70-90", count: 64 },
  { bucket: "90-110", count: 22 },
  { bucket: "110-150", count: 8 },
  { bucket: "150+", count: 6 },
];

// ─── Data Quality Assessment ───────────────────────────────────────────────
// Raw vs synthetic (cleaned + enriched) dataset for the Data Quality page.

export const dataQualityColumns = [
  "timestamp", "machine_id", "temperature_c (°C)", "vibration_mms (mm/s)", "pressure_bar (bar)",
  "output_units", "scrap_count", "shift", "operator_id",
];

// Column display names with units for UI
export const dataQualityColumnLabels: Record<string, string> = {
  timestamp: "Timestamp",
  machine_id: "Machine ID",
  "temperature_c (°C)": "Temperature (°C)",
  "vibration_mms (mm/s)": "Vibration (mm/s)",
  "pressure_bar (bar)": "Pressure (bar)",
  output_units: "Output (units/hr)",
  scrap_count: "Scrap Count",
  shift: "Shift",
  operator_id: "Operator ID",
};

// Raw dataset — contains nulls, outliers, blanks (to be visually highlighted)
export const rawQualityRows: (string | number | null)[][] = [
  ["2026-04-17 08:00", "M-101", 62.4, 2.1, 5.4, 48, 1, "A", "OP-12"],
  ["2026-04-17 09:00", "M-102", null, 3.4, 6.8, 44, 2, "A", "OP-07"],
  ["2026-04-17 10:00", "M-104", 84.2, 2.7, null, 51, 0, "A", null],
  ["2026-04-17 11:00", "M-105", 41.0, 1.2, 2.1, null, 1, "A", "OP-19"],
  ["2026-04-17 12:00", "M-106", 246.5, 6.8, 7.9, 12, 6, "B", "OP-03"], // outlier temp
  ["2026-04-17 13:00", "M-107", 195.0, 1.8, 12.4, 58, 0, "B", "OP-22"],
  ["2026-04-17 14:00", "M-108", 68.1, null, 5.0, 47, 1, "B", "OP-11"],
  ["2026-04-17 15:00", "M-101", 63.2, 2.0, 5.5, 49, 0, "B", "OP-12"],
  ["2026-04-17 16:00", "M-102", 71.0, 3.2, 6.7, null, null, "C", "OP-07"],
  ["2026-04-17 17:00", "M-104", 83.6, 2.8, 4.4, 50, 1, "C", "OP-31"],
  ["2026-04-17 18:00", "M-105", null, 1.3, 2.0, 38, 0, "C", "OP-19"],
  ["2026-04-17 19:00", "M-107", 196.2, 1.9, 12.5, 60, 0, "C", "OP-22"],
];

// Synthetic dataset — cleaned (imputed) + enriched with derived columns
export const syntheticQualityColumns = [
  ...dataQualityColumns,
  "machine_age_yrs (years)", "energy_kwh (kWh)", "health_score (0-100)",
];

export const syntheticQualityRows: (string | number)[][] = [
  ["2026-04-17 08:00", "M-101", 62.4, 2.1, 5.4, 48, 1, "A", "OP-12", 4.2, 18.3, 92],
  ["2026-04-17 09:00", "M-102", 70.8, 3.4, 6.8, 44, 2, "A", "OP-07", 6.1, 22.7, 78],
  ["2026-04-17 10:00", "M-104", 84.2, 2.7, 5.5, 51, 0, "A", "OP-15", 3.8, 19.4, 88],
  ["2026-04-17 11:00", "M-105", 41.0, 1.2, 2.1, 41, 1, "A", "OP-19", 7.4, 12.1, 62],
  ["2026-04-17 12:00", "M-106", 96.0, 6.8, 7.9, 12, 6, "B", "OP-03", 9.2, 31.5, 28],
  ["2026-04-17 13:00", "M-107", 195.0, 1.8, 12.4, 58, 0, "B", "OP-22", 2.1, 28.9, 96],
  ["2026-04-17 14:00", "M-108", 68.1, 2.9, 5.0, 47, 1, "B", "OP-11", 5.0, 17.6, 84],
  ["2026-04-17 15:00", "M-101", 63.2, 2.0, 5.5, 49, 0, "B", "OP-12", 4.2, 18.5, 93],
  ["2026-04-17 16:00", "M-102", 71.0, 3.2, 6.7, 46, 1, "C", "OP-07", 6.1, 22.4, 79],
  ["2026-04-17 17:00", "M-104", 83.6, 2.8, 4.4, 50, 1, "C", "OP-31", 3.8, 19.2, 87],
  ["2026-04-17 18:00", "M-105", 42.1, 1.3, 2.0, 38, 0, "C", "OP-19", 7.4, 11.8, 60],
  ["2026-04-17 19:00", "M-107", 196.2, 1.9, 12.5, 60, 0, "C", "OP-22", 2.1, 29.2, 97],
];

// KPI summaries for both views
export const rawQualityKpis = {
  totalRows: 18420,
  completeRows: 16280,
  missingCells: 2148,
  missingPct: 2.7,
  outliers: 142,
  duplicates: 38,
  accuracy: 86.4,
  consistency: 81.2,
  validity: 88.7,
  qualityScore: 72,
};

export const syntheticQualityKpis = {
  totalRows: 18420,
  completeRows: 18420,
  missingCells: 0,
  missingPct: 0,
  outliers: 6,
  duplicates: 0,
  accuracy: 99.1,
  consistency: 98.4,
  validity: 99.6,
  qualityScore: 96,
  enrichedColumns: 3,
};

// Side-by-side comparison rows (metric, raw, synthetic, delta indicator)
export const qualityComparison = [
  { metric: "Quality Score",      raw: "72 / 100", synthetic: "96 / 100", deltaPct: 33.3,  better: true },
  { metric: "Data Accuracy",      raw: "86.4%",    synthetic: "99.1%",    deltaPct: 14.7,  better: true },
  { metric: "Completeness",       raw: "88.4%",    synthetic: "100%",     deltaPct: 13.1,  better: true },
  { metric: "Consistency",        raw: "81.2%",    synthetic: "98.4%",    deltaPct: 21.2,  better: true },
  { metric: "Validity",           raw: "88.7%",    synthetic: "99.6%",    deltaPct: 12.3,  better: true },
  { metric: "Missing Cells",      raw: "2,148",    synthetic: "0",        deltaPct: -100,  better: true },
  { metric: "Outliers",           raw: "142",      synthetic: "6",        deltaPct: -95.8, better: true },
  { metric: "Duplicate Records",  raw: "38",       synthetic: "0",        deltaPct: -100,  better: true },
  { metric: "Feature Columns",    raw: "9",        synthetic: "12",       deltaPct: 33.3,  better: true },
];

// Per-column missing % comparison for chart
export const qualityColumnComparison = [
  { column: "temperature_c", raw: 4.2, synthetic: 0 },
  { column: "vibration_mms", raw: 1.8, synthetic: 0 },
  { column: "pressure_bar",  raw: 3.1, synthetic: 0 },
  { column: "output_units",  raw: 2.4, synthetic: 0 },
  { column: "scrap_count",   raw: 1.2, synthetic: 0 },
  { column: "operator_id",   raw: 5.6, synthetic: 0 },
  { column: "machine_age_yrs ✦", raw: 100, synthetic: 0 },
  { column: "energy_kwh ✦", raw: 100, synthetic: 0 },
  { column: "health_score ✦", raw: 100, synthetic: 0 },
];

// Cleaning operations applied (for synthetic view + comparison)
export const cleaningOperations = [
  { op: "Mean imputation",     target: "temperature_c", count: 774,  description: "Replaced NaN with rolling 1-hr mean per machine" },
  { op: "Median imputation",   target: "vibration_mms", count: 332,  description: "Replaced NaN with 24-hr median per machine" },
  { op: "Forward-fill",        target: "pressure_bar",  count: 571,  description: "Forward-filled gaps ≤ 5 minutes" },
  { op: "Mode imputation",     target: "operator_id",   count: 1031, description: "Filled by most-frequent operator per shift+machine" },
  { op: "Outlier capping",     target: "temperature_c", count: 136,  description: "Capped values above P99.5 (e.g. 246°C → 96°C)" },
  { op: "Dedup (timestamp+id)", target: "all rows",     count: 38,   description: "Removed exact duplicate telemetry records" },
  { op: "Enrich: machine_age_yrs", target: "+1 column", count: 18420, description: "Joined from asset registry" },
  { op: "Enrich: energy_kwh",  target: "+1 column",     count: 18420, description: "Computed from current × voltage × runtime" },
  { op: "Enrich: health_score", target: "+1 column",    count: 18420, description: "Composite of vibration, temp, age & risk" },
];

// ─── Data Modelling — KPI catalog ──────────────────────────────────────────
export interface KpiCard {
  id: string;
  title: string;
  column: string;
  logic: string;
  value: string;
  trend: "up" | "down" | "flat";
  delta: string;
  description: string;
  unit: string;
  series: { label: string; value: number }[];
}

export const kpiCatalog: KpiCard[] = [
  {
    id: "avg_speed",
    title: "Average Speed",
    column: "speed_kmph",
    logic: "Calculate the mean of the 'speed_kmph' column.",
    value: "62.4",
    unit: "km/h",
    trend: "up",
    delta: "+3.2%",
    description: "Mean operating speed across all running machines in the current selection over the last 24 hours. Useful for benchmarking line throughput. Unit: kilometers per hour (km/h).",
    series: [
      { label: "Mon", value: 58 }, { label: "Tue", value: 60 }, { label: "Wed", value: 61 },
      { label: "Thu", value: 63 }, { label: "Fri", value: 65 }, { label: "Sat", value: 62 }, { label: "Sun", value: 64 },
    ],
  },
  {
    id: "energy_total",
    title: "Total Energy Consumption",
    column: "energy_consumption_kwh",
    logic: "Calculate the sum of the 'energy_consumption_kwh' column.",
    value: "284,120",
    unit: "kWh",
    trend: "up",
    delta: "+4.1%",
    description: "Aggregate energy usage across all selected machines. Spikes correlate with high-load injection molding cycles. Unit: kilowatt-hours (kWh) - standard measure of electrical energy consumption.",
    series: [
      { label: "W1", value: 64200 }, { label: "W2", value: 68100 }, { label: "W3", value: 71800 }, { label: "W4", value: 80020 },
    ],
  },
  {
    id: "anomaly_count",
    title: "Anomaly Score Count",
    column: "anomaly_score",
    logic: "Count records with 'anomaly_score' > 0.15 (threshold).",
    value: "1,229",
    unit: "records",
    trend: "down",
    delta: "-12.4%",
    description: "Number of telemetry records flagged as anomalous via IQR (Interquartile Range) method. Lower is better; trending down indicates improving asset health.",
    series: [
      { label: "Mon", value: 220 }, { label: "Tue", value: 198 }, { label: "Wed", value: 184 },
      { label: "Thu", value: 175 }, { label: "Fri", value: 162 }, { label: "Sat", value: 148 }, { label: "Sun", value: 142 },
    ],
  },
  {
    id: "maint_ratio",
    title: "Maintenance Flag Ratio",
    column: "maintenance_flag",
    logic: "Ratio of entries with 'maintenance_flag' = 1 to total entries.",
    value: "8.2",
    unit: "%",
    trend: "flat",
    delta: "+0.1%",
    description: "Share of telemetry rows where machines were flagged for maintenance. Stable indicates predictable PM (Preventive Maintenance) cadence. Unit: percentage (%) of total records.",
    series: [
      { label: "Jan", value: 7.8 }, { label: "Feb", value: 8.0 }, { label: "Mar", value: 8.1 }, { label: "Apr", value: 8.2 },
    ],
  },
  {
    id: "oee_avg",
    title: "Average Machine OEE",
    column: "oee_pct",
    logic: "Mean of 'oee_pct' across all active machines in the current selection (machine or cluster).",
    value: "76.1",
    unit: "%",
    trend: "up",
    delta: "+2.1%",
    description: "Overall Equipment Effectiveness (OEE) — composite metric of availability, performance, and quality. Unit: percentage (%) where 100% represents perfect performance.",
    series: [
      { label: "Jan", value: 72 }, { label: "Feb", value: 73 }, { label: "Mar", value: 74 }, { label: "Apr", value: 76 },
    ],
  },
  {
    id: "vibration_max",
    title: "Peak Vibration",
    column: "vibration_g",
    logic: "Maximum value of 'vibration_g' in last 24h per machine.",
    value: "6.8",
    unit: "mm/s",
    trend: "up",
    delta: "+18.2%",
    description: "Highest vibration reading observed in the last 24 hours. Spike on M-106 indicates bearing degradation. Unit: millimeters per second (mm/s) - RMS velocity measurement standard for rotating equipment.",
    series: [
      { label: "00h", value: 2.1 }, { label: "04h", value: 2.4 }, { label: "08h", value: 3.2 },
      { label: "12h", value: 4.8 }, { label: "16h", value: 5.9 }, { label: "20h", value: 6.8 },
    ],
  },
  {
    id: "temperature_avg",
    title: "Average Temperature",
    column: "temperature_c",
    logic: "Mean temperature reading across all active sensors.",
    value: "71.4",
    unit: "°C",
    trend: "up",
    delta: "+2.8%",
    description: "Average operating temperature across all monitored machines. Unit: degrees Celsius (°C) - standard temperature measurement for industrial equipment.",
    series: [
      { label: "00h", value: 68 }, { label: "04h", value: 69 }, { label: "08h", value: 72 },
      { label: "12h", value: 74 }, { label: "16h", value: 73 }, { label: "20h", value: 71 },
    ],
  },
  {
    id: "pressure_avg",
    title: "Average Hydraulic Pressure",
    column: "pressure_bar",
    logic: "Mean hydraulic pressure across all systems.",
    value: "5.48",
    unit: "bar",
    trend: "flat",
    delta: "+0.3%",
    description: "Average hydraulic system pressure. Unit: bar - metric unit of pressure (1 bar ≈ 100 kPa ≈ 14.5 psi).",
    series: [
      { label: "00h", value: 5.2 }, { label: "04h", value: 5.4 }, { label: "08h", value: 5.5 },
      { label: "12h", value: 5.6 }, { label: "16h", value: 5.5 }, { label: "20h", value: 5.4 },
    ],
  },
];

// ─── Outlier Detection (Modelling tab) ─────────────────────────────────────
export const outlierConfig = {
  targetColumns: ["energy_consumption_kwh", "vibration_g", "system_temp_c", "speed_kmph"],
  defaultTarget: "energy_consumption_kwh",
  method: "Interquartile Range (IQR)",
  lowerBound: 0.14,
  upperBound: 24.13,
  totalOutliers: 1229,
  insight:
    "This analysis identifies unusual patterns or anomalies in your energy_consumption_kwh data. Outliers can indicate data quality issues, fraud, exceptional performance, or opportunities for investigation.",
  rows: [
    { timestamp: "2026-03-01 00:06:00", mode: "idle",         speed: 0.0,    traction: 0.0,    energy: 0.0,   temp: 39.589, vibration: 0.357, wear: 16.581, health: 0.834 },
    { timestamp: "2026-03-01 00:12:00", mode: "acceleration", speed: 94.308, traction: 1463.4, energy: 24.39, temp: 68.675, vibration: 0.376, wear: 8.993,  health: 0.910 },
    { timestamp: "2026-03-01 00:18:00", mode: "cruise",       speed: 88.120, traction: 1240.1, energy: 25.62, temp: 71.200, vibration: 0.402, wear: 12.470, health: 0.886 },
    { timestamp: "2026-03-01 00:24:00", mode: "brake",        speed: 12.300, traction: 230.4,  energy: 0.05,  temp: 65.110, vibration: 0.288, wear: 14.220, health: 0.901 },
    { timestamp: "2026-03-01 00:30:00", mode: "acceleration", speed: 102.10, traction: 1580.2, energy: 26.18, temp: 73.420, vibration: 0.418, wear: 9.870,  health: 0.872 },
    { timestamp: "2026-03-01 00:36:00", mode: "idle",         speed: 0.0,    traction: 0.0,    energy: 0.0,   temp: 41.220, vibration: 0.341, wear: 17.110, health: 0.821 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  Context-Aware Adaptive Navigation System
//  Lifecycle-driven navigation from Raw Data → Peak Performance
// ─────────────────────────────────────────────────────────────────────────────
//
//  OVERVIEW:
//  This system provides intelligent, context-aware navigation that adapts based on
//  data maturity and asset connectivity state. Instead of a fixed menu, the navigation
//  reconfigures dynamically to guide users through the optimal workflow.
//
//  CORE DESIGN PRINCIPLE:
//  "Any machine — connected or not — from raw or missing data to autonomous performance"
//
//  FOUR NAVIGATION SCENARIOS:
//  
//  A) DATA AVAILABLE (Modern Deployment)
//     - Clean IoT data streams, established pipelines
//     - Auto-skip preparation/twin steps
//     - Direct path to insights and automation
//     - Value: "Accelerate directly to insights"
//
//  B) NO DATA (Greenfield / Legacy)
//     - Unmonitored assets, legacy equipment
//     - Digital Twin + Synthetic data generation
//     - Benchmark-based insights without sensors
//     - Value: "Create data foundation from machine intelligence"
//
//  C) POOR DATA (Connected but Problematic)
//     - Fragmented telemetry, bad I/O mapping
//     - Digital Twin as repair/alignment layer
//     - Protocol normalization across OEMs
//     - Value: "Fix how machines communicate"
//
//  D) DISCONNECTED (Offline Assets)
//     - Unconnected machinery, retrofit scenarios
//     - Virtual sensor layer + data abstraction
//     - Connection-ready infrastructure
//     - Value: "Make unconnected machines digitally operable"
//
//  QUICK START:
//  
//  1. Detect asset context:
//     const context: AssetContext = {
//       hasConnectedData: true,
//       dataQualityScore: 85,
//       isPhysicallyConnected: true,
//       hasTelemetryPipeline: true,
//       dataCompleteness: 90,
//     };
//  
//  2. Get scenario configuration:
//     const { scenario, navigation, valueMessage } = getScenarioConfiguration(context);
//  
//  3. Render adaptive navigation:
//     const navItems = formatNavigationForUI(scenario);
//  
//  4. Show smart messages:
//     const uiBehavior = uiBehaviorRules.find(r => r.scenario === scenario.id);
//  
//  DEMO PRESETS:
//  Use `demoPresets` array for quick scenario switching during presentations.
//  Each preset includes context, features to highlight, and demo script.
//
//  KEY DIFFERENTIATORS:
//  - Works across ALL data maturity levels (no data → full connectivity)
//  - Digital Twin as I/O alignment engine (not just visualization)
//  - Synthetic data + benchmarking (optimize without full sensors)
//  - Autonomous agents (dashboarding → decisioning → doing)
//  - Fleet-level intelligence (cross-OEM, multi-terminal optimization)
//
// ─────────────────────────────────────────────────────────────────────────────

export type DataMaturityLevel = "no_data" | "has_data" | "poor_data" | "disconnected";
export type NavigationScenario = "scenario_a" | "scenario_b" | "scenario_c" | "scenario_d";

export interface NavigationItem {
  id: string;
  label: string;
  journeyStage: string;
  path: string;
  enabled: boolean;
  highlighted: boolean;
  isPrimary: boolean;
  tooltip?: string;
  icon: string;
  description: string;
}

export interface ScenarioConfig {
  id: NavigationScenario;
  name: string;
  description: string;
  useCase: string;
  valueMessage: string;
  maturityLevel: DataMaturityLevel;
  navigation: NavigationItem[];
  guidedWorkflow?: string[];
  features: string[];
}

// Base navigation framework - master capability stack
export const navigationCapabilities = {
  dataIngestion: {
    id: "data-ingestion",
    label: "Connect",
    journeyStage: "Connect",
    path: "/data-sources",
    icon: "⚡",
    description: "Data Ingestion - Connect your data sources and establish data pipelines",
  },
  dataPreparation: {
    id: "data-preparation",
    label: "Define",
    journeyStage: "Define",
    path: "/data-processing",
    icon: "🔧",
    description: "Data Preparation - Transform and structure your raw data",
  },
  digitalTwin: {
    id: "digital-twin",
    label: "Model",
    journeyStage: "Model",
    path: "/digital-twin",
    icon: "🔷",
    description: "Digital Twin - Create virtual replicas of your physical assets",
  },
  dataQuality: {
    id: "data-quality",
    label: "Refine",
    journeyStage: "Refine",
    path: "/data-quality",
    icon: "✨",
    description: "Data Quality & Enrichment - Clean, validate, and enrich your datasets",
  },
  assetDashboard: {
    id: "asset-dashboard",
    label: "Observe",
    journeyStage: "Observe",
    path: "/dashboard",
    icon: "📊",
    description: "Asset Dashboard - Monitor real-time performance and health metrics",
  },
  aiModeling: {
    id: "ai-modeling",
    label: "Predict",
    journeyStage: "Predict",
    path: "/modelling",
    icon: "🤖",
    description: "AI Modeling - Build predictive models and forecasts",
  },
  vectorAI: {
    id: "vector-ai",
    label: "Act",
    journeyStage: "Act",
    path: "/vector-ai",
    icon: "🧠",
    description: "Vector AI & Agents - Autonomous decision-making and interventions",
  },
  reporting: {
    id: "reporting",
    label: "Report",
    journeyStage: "Report",
    path: "/reports",
    icon: "📈",
    description: "Reporting - Generate insights and share intelligence",
  },
};

// Scenario A: Data Available (Modern Deployment)
export const scenarioA: ScenarioConfig = {
  id: "scenario_a",
  name: "Data Available - Modern Deployment",
  description: "Standard deployment with clean IoT data streams",
  useCase: "Connected assets with quality telemetry and established data pipelines",
  valueMessage: "You already have data — we accelerate you directly to insights and automation",
  maturityLevel: "has_data",
  navigation: [
    { ...navigationCapabilities.dataIngestion, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.dataPreparation, enabled: false, highlighted: false, isPrimary: false, tooltip: "Not required - data is already structured" },
    { ...navigationCapabilities.digitalTwin, enabled: false, highlighted: false, isPrimary: false, tooltip: "Optional - use for advanced scenarios" },
    { ...navigationCapabilities.dataQuality, enabled: true, highlighted: false, isPrimary: false },
    { ...navigationCapabilities.assetDashboard, enabled: true, highlighted: true, isPrimary: true },
    { ...navigationCapabilities.aiModeling, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.vectorAI, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.reporting, enabled: true, highlighted: false, isPrimary: true },
  ],
  features: [
    "Auto-skip preparation/twin steps",
    "System infers structure from ingested data",
    "Direct path to insights and automation",
    "Optimized for speed-to-value",
  ],
};

// Scenario B: No Data Available (Greenfield)
export const scenarioB: ScenarioConfig = {
  id: "scenario_b",
  name: "No Data - Greenfield Deployment",
  description: "Legacy machinery or OEM onboarding without existing telemetry",
  useCase: "Unmonitored assets, legacy equipment, or new installations without data infrastructure",
  valueMessage: "No data? No problem — we create a data foundation from machine intelligence",
  maturityLevel: "no_data",
  navigation: [
    { ...navigationCapabilities.dataIngestion, enabled: false, highlighted: false, isPrimary: false, tooltip: "Optional - activate when ready to connect" },
    { ...navigationCapabilities.dataPreparation, enabled: true, highlighted: true, isPrimary: true },
    { ...navigationCapabilities.digitalTwin, enabled: true, highlighted: true, isPrimary: true },
    { ...navigationCapabilities.dataQuality, enabled: true, highlighted: false, isPrimary: true, tooltip: "Synthetic data & benchmarking enabled" },
    { ...navigationCapabilities.assetDashboard, enabled: true, highlighted: false, isPrimary: true, tooltip: "Simulated/benchmark view available" },
    { ...navigationCapabilities.aiModeling, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.vectorAI, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.reporting, enabled: true, highlighted: false, isPrimary: true },
  ],
  guidedWorkflow: [
    "Define machine specifications and components",
    "Generate synthetic dataset from machine profile",
    "Create baseline performance benchmarks",
    "Simulate operational behavior",
  ],
  features: [
    "Synthetic data generation from machine specs",
    "Industry benchmark comparisons",
    "Virtual sensor simulation",
    "Preparation for future connectivity",
  ],
};

// Scenario C: Poor Data Quality (Connected but Problematic)
export const scenarioC: ScenarioConfig = {
  id: "scenario_c",
  name: "Poor Data - Connected Assets with Quality Issues",
  description: "Fragmented telemetry, bad I/O mapping, or inconsistent data collection",
  useCase: "Connected equipment with sensor drift, mapping errors, or protocol issues",
  valueMessage: "We don't just ingest data — we fix how machines communicate",
  maturityLevel: "poor_data",
  navigation: [
    { ...navigationCapabilities.dataIngestion, enabled: true, highlighted: false, isPrimary: false, tooltip: "For fixing data pipelines" },
    { ...navigationCapabilities.dataPreparation, enabled: false, highlighted: false, isPrimary: false, tooltip: "Not needed - Twin handles alignment" },
    { ...navigationCapabilities.digitalTwin, enabled: true, highlighted: true, isPrimary: true, tooltip: "Primary repair layer for data alignment" },
    { ...navigationCapabilities.dataQuality, enabled: true, highlighted: true, isPrimary: true },
    { ...navigationCapabilities.assetDashboard, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.aiModeling, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.vectorAI, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.reporting, enabled: true, highlighted: false, isPrimary: true },
  ],
  guidedWorkflow: [
    "Analyze data quality issues and gaps",
    "Map I/O signals to standardized schema",
    "Normalize signals across OEMs",
    "Validate data integrity",
  ],
  features: [
    "I/O mapping and signal alignment",
    "Multi-OEM protocol normalization",
    "Sensor drift detection and correction",
    "Data integrity validation",
  ],
};

// Scenario D: Asset Not Connected (Offline/Retrofit)
export const scenarioD: ScenarioConfig = {
  id: "scenario_d",
  name: "Disconnected Assets - Offline Machinery",
  description: "Unconnected equipment requiring digital enablement",
  useCase: "Legacy equipment, offline machinery, or assets awaiting retrofit",
  valueMessage: "We make unconnected machines digitally operable",
  maturityLevel: "disconnected",
  navigation: [
    { ...navigationCapabilities.dataIngestion, enabled: false, highlighted: false, isPrimary: false, tooltip: "Inactive - no physical connection" },
    { ...navigationCapabilities.dataPreparation, enabled: true, highlighted: false, isPrimary: false },
    { ...navigationCapabilities.digitalTwin, enabled: true, highlighted: true, isPrimary: true, tooltip: "Virtual sensor layer & data abstraction" },
    { ...navigationCapabilities.dataQuality, enabled: true, highlighted: false, isPrimary: true, tooltip: "Synthetic + benchmark data" },
    { ...navigationCapabilities.assetDashboard, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.aiModeling, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.vectorAI, enabled: true, highlighted: false, isPrimary: true },
    { ...navigationCapabilities.reporting, enabled: true, highlighted: false, isPrimary: true },
  ],
  guidedWorkflow: [
    "Create digital representation of physical asset",
    "Establish virtual sensor framework",
    "Generate operational baseline",
    "Enable connection-ready infrastructure",
  ],
  features: [
    "Virtual sensor layer creation",
    "Data abstraction framework",
    "Future connection readiness",
    "Offline performance modeling",
  ],
};

// Master scenario registry
export const navigationScenarios: Record<NavigationScenario, ScenarioConfig> = {
  scenario_a: scenarioA,
  scenario_b: scenarioB,
  scenario_c: scenarioC,
  scenario_d: scenarioD,
};

// Context detection logic - determines which scenario applies
export interface AssetContext {
  hasConnectedData: boolean;
  dataQualityScore: number; // 0-100
  isPhysicallyConnected: boolean;
  hasTelemetryPipeline: boolean;
  dataCompleteness: number; // 0-100
}

export function detectNavigationScenario(context: AssetContext): ScenarioConfig {
  // Scenario A: Good quality data from connected assets
  if (
    context.hasConnectedData &&
    context.dataQualityScore >= 75 &&
    context.dataCompleteness >= 80 &&
    context.hasTelemetryPipeline
  ) {
    return scenarioA;
  }

  // Scenario C: Connected but poor data quality
  if (
    context.hasConnectedData &&
    context.isPhysicallyConnected &&
    (context.dataQualityScore < 75 || context.dataCompleteness < 80)
  ) {
    return scenarioC;
  }

  // Scenario D: Physically disconnected but some data exists
  if (!context.isPhysicallyConnected && context.hasConnectedData) {
    return scenarioD;
  }

  // Scenario B: No data (default fallback)
  return scenarioB;
}

// Progress calculation for maturity journey
export interface MaturityProgress {
  stage: string;
  percentage: number;
  completedSteps: string[];
  nextSteps: string[];
  overallMaturity: number; // 0-100
}

export function calculateMaturityProgress(scenario: ScenarioConfig, completedSteps: string[]): MaturityProgress {
  const totalSteps = scenario.navigation.filter(n => n.enabled).length;
  const completed = completedSteps.length;
  const percentage = Math.round((completed / totalSteps) * 100);

  const stages = ["Raw Data", "Structured", "Modeled", "Autonomous"];
  let currentStage = stages[0];
  
  if (percentage >= 75) currentStage = stages[3];
  else if (percentage >= 50) currentStage = stages[2];
  else if (percentage >= 25) currentStage = stages[1];

  const nextSteps = scenario.navigation
    .filter(n => n.enabled && !completedSteps.includes(n.id))
    .map(n => n.label);

  return {
    stage: currentStage,
    percentage,
    completedSteps,
    nextSteps,
    overallMaturity: percentage,
  };
}

// Strategic positioning messages for different scenarios
export const strategicPositioning = {
  multiMaturity: "Works across all data maturity levels - from no data to fully connected systems",
  digitalTwinTranslator: "Digital Twin as data translator, not just visualization - handles I/O alignment and protocol normalization",
  syntheticBenchmarking: "Enables performance baselining and cross-machine comparison without full data coverage",
  autonomousAgents: "Moves from dashboarding → decisioning → autonomous doing",
  fleetIntelligence: "Single machine → fleet-level intelligence with cross-OEM standardization",
};

// Industry-specific value propositions (e.g., Ports & Terminals)
export const industryValueProps = {
  portsTerminals: {
    industry: "Ports & Terminals",
    painPoints: [
      "Multi-OEM fleet complexity (Kalmar, Konecranes, Liebherr)",
      "Varying equipment age and data availability",
      "Fragmented telemetry across manufacturers",
      "Need for cross-terminal benchmarking",
    ],
    solutions: [
      "Standardized data layer across all OEMs",
      "Works with partial or no connectivity",
      "Fleet-level performance comparison",
      "Terminal-wide optimization intelligence",
    ],
    differentiators: [
      "Only platform handling mixed-maturity fleets",
      "Digital Twin as I/O alignment engine",
      "Synthetic data for unmonitored equipment",
      "Autonomous optimization agents",
    ],
  },
  heavyManufacturing: {
    industry: "Heavy Manufacturing",
    painPoints: [
      "Legacy equipment without IoT",
      "Inconsistent data collection",
      "Downtime unpredictability",
      "High maintenance costs",
    ],
    solutions: [
      "Retrofit-free digital enablement",
      "Predictive maintenance without full sensors",
      "Data quality repair and normalization",
      "Cost optimization through AI",
    ],
    differentiators: [
      "Works with zero connectivity",
      "Fixes bad data at ingestion",
      "Machine intelligence without hardware changes",
      "ROI without capital investment",
    ],
  },
};

// Demo presets for quick scenario switching
export interface DemoPreset {
  id: string;
  name: string;
  scenario: NavigationScenario;
  description: string;
  assetContext: AssetContext;
  highlightFeatures: string[];
  demoScript: string[];
}

export const demoPresets: DemoPreset[] = [
  {
    id: "modern_terminal",
    name: "Modern Terminal Operations",
    scenario: "scenario_a",
    description: "Connected Kalmar fleet with quality IoT telemetry",
    assetContext: {
      hasConnectedData: true,
      dataQualityScore: 92,
      isPhysicallyConnected: true,
      hasTelemetryPipeline: true,
      dataCompleteness: 95,
    },
    highlightFeatures: [
      "Real-time fleet monitoring",
      "Predictive maintenance",
      "Performance optimization",
      "Autonomous decision agents",
    ],
    demoScript: [
      "Show live dashboard with 8 connected Kalmar machines",
      "Highlight real-time OEE and health metrics",
      "Demo predictive failure detection on Straddle Carrier Zeta",
      "Show autonomous agent triggering maintenance alert",
      "Display fleet-wide optimization recommendations",
    ],
  },
  {
    id: "legacy_retrofit",
    name: "Legacy Equipment Retrofit",
    scenario: "scenario_b",
    description: "20-year-old machinery without any sensors",
    assetContext: {
      hasConnectedData: false,
      dataQualityScore: 0,
      isPhysicallyConnected: false,
      hasTelemetryPipeline: false,
      dataCompleteness: 0,
    },
    highlightFeatures: [
      "Synthetic data generation",
      "Digital Twin creation",
      "Benchmark-based insights",
      "Retrofit-free operation",
    ],
    demoScript: [
      "Start with machine specifications only (make, model, age)",
      "Generate Digital Twin from equipment profile",
      "Create synthetic operational dataset",
      "Show performance benchmarks vs industry standards",
      "Demonstrate predictive maintenance planning without sensors",
    ],
  },
  {
    id: "mixed_oem_fleet",
    name: "Multi-OEM Fleet Integration",
    scenario: "scenario_c",
    description: "Kalmar, Konecranes, and Liebherr with inconsistent data",
    assetContext: {
      hasConnectedData: true,
      dataQualityScore: 58,
      isPhysicallyConnected: true,
      hasTelemetryPipeline: true,
      dataCompleteness: 64,
    },
    highlightFeatures: [
      "I/O mapping across OEMs",
      "Protocol normalization",
      "Signal alignment",
      "Unified fleet view",
    ],
    demoScript: [
      "Show raw data from 3 different OEM protocols",
      "Demonstrate Digital Twin aligning all signals",
      "Map temperature_1, temp_hydraulic, and hyd_temp to unified schema",
      "Display normalized fleet dashboard",
      "Show cross-OEM performance comparison",
    ],
  },
  {
    id: "partial_connectivity",
    name: "Partially Connected Terminal",
    scenario: "scenario_d",
    description: "Mix of connected and offline equipment",
    assetContext: {
      hasConnectedData: false,
      dataQualityScore: 45,
      isPhysicallyConnected: false,
      hasTelemetryPipeline: false,
      dataCompleteness: 30,
    },
    highlightFeatures: [
      "Hybrid monitoring",
      "Virtual sensors for offline assets",
      "Fleet-level intelligence",
      "Connection readiness",
    ],
    demoScript: [
      "Show 5 connected machines + 3 offline machines",
      "Create Digital Twins for offline equipment",
      "Generate virtual sensor data",
      "Display unified fleet performance",
      "Demonstrate seamless integration when offline assets connect",
    ],
  },
];

// Visual cues and UI behavior rules
export interface UIBehaviorRules {
  scenario: NavigationScenario;
  rules: {
    disabledTabs: { id: string; reason: string }[];
    highlightedTabs: { id: string; reason: string }[];
    recommendedStartPoint: string;
    progressIndicator: string[];
    smartMessages: { context: string; message: string; action?: string }[];
  };
}

export const uiBehaviorRules: UIBehaviorRules[] = [
  {
    scenario: "scenario_a",
    rules: {
      disabledTabs: [
        { id: "data-preparation", reason: "Not required for your current setup - data is already structured" },
        { id: "digital-twin", reason: "Optional for advanced use cases only" },
      ],
      highlightedTabs: [
        { id: "asset-dashboard", reason: "Start here to view your connected assets" },
      ],
      recommendedStartPoint: "asset-dashboard",
      progressIndicator: ["Connected", "Structured", "Modeled", "Autonomous"],
      smartMessages: [
        { context: "on_login", message: "8 machines connected with quality data streams", action: "View Dashboard" },
        { context: "navigation_help", message: "Your data is ready - jump directly to insights" },
      ],
    },
  },
  {
    scenario: "scenario_b",
    rules: {
      disabledTabs: [
        { id: "data-ingestion", reason: "Optional - activate when ready to connect physical sensors" },
      ],
      highlightedTabs: [
        { id: "data-preparation", reason: "Start here to define your machine specifications" },
        { id: "digital-twin", reason: "Create virtual representation of your assets" },
      ],
      recommendedStartPoint: "data-preparation",
      progressIndicator: ["Define", "Model", "Synthesize", "Optimize"],
      smartMessages: [
        { context: "on_login", message: "No data detected - let's create a digital foundation", action: "Define Machine" },
        { context: "navigation_help", message: "We'll generate synthetic data from your machine specifications" },
        { context: "after_twin_creation", message: "Digital Twin created - now generating operational baseline" },
      ],
    },
  },
  {
    scenario: "scenario_c",
    rules: {
      disabledTabs: [
        { id: "data-preparation", reason: "Not needed - Digital Twin handles data alignment" },
      ],
      highlightedTabs: [
        { id: "digital-twin", reason: "Primary repair layer for data quality issues" },
        { id: "data-quality", reason: "View and fix data integrity problems" },
      ],
      recommendedStartPoint: "data-quality",
      progressIndicator: ["Connect", "Diagnose", "Repair", "Validate"],
      smartMessages: [
        { context: "on_login", message: "Data quality issues detected - 3 OEM protocols need alignment", action: "Review Issues" },
        { context: "navigation_help", message: "Digital Twin will standardize all signals into a unified schema" },
        { context: "after_alignment", message: "I/O mapping complete - all equipment now speaks the same language" },
      ],
    },
  },
  {
    scenario: "scenario_d",
    rules: {
      disabledTabs: [
        { id: "data-ingestion", reason: "Inactive - no physical connection available" },
      ],
      highlightedTabs: [
        { id: "digital-twin", reason: "Create virtual sensor layer for offline assets" },
      ],
      recommendedStartPoint: "digital-twin",
      progressIndicator: ["Offline", "Virtualized", "Simulated", "Ready to Connect"],
      smartMessages: [
        { context: "on_login", message: "Assets not connected - creating digital enablement layer", action: "Build Twin" },
        { context: "navigation_help", message: "Digital Twin acts as virtual sensor and data abstraction layer" },
        { context: "after_twin_creation", message: "Your equipment is now digitally operable and connection-ready" },
      ],
    },
  },
];

// One-line positioning statement
export const platformPositioning = "DataPX1 is the only platform that takes any machine — connected or not — from raw or missing data to autonomous performance optimization";

// Get appropriate scenario and UI behavior based on context
export function getScenarioConfiguration(context: AssetContext) {
  const scenario = detectNavigationScenario(context);
  const uiBehavior = uiBehaviorRules.find(rule => rule.scenario === scenario.id);
  
  return {
    scenario,
    uiBehavior,
    navigation: scenario.navigation,
    valueMessage: scenario.valueMessage,
  };
}

// Helper to format navigation for UI components
export function formatNavigationForUI(scenario: ScenarioConfig) {
  return scenario.navigation.map(item => ({
    ...item,
    isActive: item.enabled,
    isPrimary: item.isPrimary,
    badge: item.highlighted ? "Recommended" : undefined,
    disabledMessage: !item.enabled ? item.tooltip : undefined,
  }));
}

// Usage example: How to implement context-aware navigation in your components
export const navigationImplementationExample = {
  description: "Example implementation of adaptive navigation system",
  
  example1_BasicUsage: `
    // In your app's initialization or asset selection handler
    import { getScenarioConfiguration, AssetContext } from './data/machineData';
    
    // Detect current asset context (from your data layer)
    const currentContext: AssetContext = {
      hasConnectedData: true,
      dataQualityScore: 85,
      isPhysicallyConnected: true,
      hasTelemetryPipeline: true,
      dataCompleteness: 90,
    };
    
    // Get scenario configuration
    const { scenario, navigation, valueMessage, uiBehavior } = getScenarioConfiguration(currentContext);
    
    // Use in your navigation component
    console.log(scenario.name); // "Data Available - Modern Deployment"
    console.log(valueMessage); // "You already have data — we accelerate you directly to insights and automation"
  `,
  
  example2_NavigationComponent: `
    // In your LeftPanel/Navigation component
    import { formatNavigationForUI } from './data/machineData';
    
    const navItems = formatNavigationForUI(scenario);
    
    navItems.forEach(item => {
      if (item.isActive) {
        // Render enabled navigation item
        <NavLink to={item.path} badge={item.badge}>
          {item.icon} {item.label}
        </NavLink>
      } else {
        // Render disabled item with tooltip
        <NavLink disabled tooltip={item.disabledMessage}>
          {item.icon} {item.label} 🔒
        </NavLink>
      }
    });
  `,
  
  example3_ProgressIndicator: `
    // Show maturity progress
    import { calculateMaturityProgress } from './data/machineData';
    
    const completedSteps = ['data-ingestion', 'data-quality', 'asset-dashboard'];
    const progress = calculateMaturityProgress(scenario, completedSteps);
    
    console.log(progress.stage); // "Structured"
    console.log(progress.percentage); // 37
    console.log(progress.nextSteps); // ["Predict", "Act", "Report"]
  `,
  
  example4_SmartMessaging: `
    // Display context-aware messages
    const onLoginMessage = uiBehavior?.rules.smartMessages.find(
      msg => msg.context === 'on_login'
    );
    
    if (onLoginMessage) {
      showNotification({
        message: onLoginMessage.message,
        action: onLoginMessage.action,
      });
    }
  `,
  
  example5_DemoPresets: `
    // Quick scenario switching for demos
    import { demoPresets } from './data/machineData';
    
    // Demo preset selector
    <select onChange={(e) => loadDemoPreset(e.target.value)}>
      {demoPresets.map(preset => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
    
    function loadDemoPreset(presetId: string) {
      const preset = demoPresets.find(p => p.id === presetId);
      if (preset) {
        const config = getScenarioConfiguration(preset.assetContext);
        updateNavigation(config);
        showDemoScript(preset.demoScript);
      }
    }
  `,
};

// Key differentiation points for sales/demo presentations
export const keyDifferentiators = {
  title: "What Makes DataPX1 Unique",
  
  point1: {
    title: "Universal Data Maturity Support",
    problem: "Most platforms assume either perfect IoT data or nothing",
    solution: "DataPX1 handles: No data, Bad data, Partial data, Fully connected systems",
    demo: "Show side-by-side scenarios A, B, C, D",
  },
  
  point2: {
    title: "Digital Twin as Data Translator",
    problem: "Traditional twins are just 3D visualizations",
    solution: "Our Twin is an I/O alignment engine, machine decomposition layer, and protocol normalizer",
    demo: "Show multi-OEM signal mapping (Kalmar temp_hyd → Konecranes hydraulic_temp → unified schema)",
  },
  
  point3: {
    title: "Synthetic Data + Benchmarking",
    problem: "Can't optimize what you can't measure - but sensors are expensive",
    solution: "Generate operational baselines, cross-machine comparisons, and optimization scenarios without full telemetry",
    demo: "Create synthetic dataset for 20-year-old machine, show performance vs industry benchmark",
  },
  
  point4: {
    title: "Autonomous Decision Agents",
    problem: "Dashboards show problems but don't fix them",
    solution: "Move from Dashboarding → Decisioning → Autonomous Doing",
    demo: "Show agent detecting vibration spike, auto-triggering maintenance order, updating schedule",
  },
  
  point5: {
    title: "Fleet-Level Intelligence",
    problem: "Siloed machine monitoring doesn't reveal fleet optimization opportunities",
    solution: "Single machine → fleet view, cross-OEM standardization, terminal-wide benchmarking",
    demo: "Show 8-machine Kalmar fleet, identify load balancing opportunity, show projected savings",
  },
};

// Demo script templates for different audiences
export const demoScriptTemplates = {
  executiveDemo: {
    duration: "15 minutes",
    audience: "C-suite, Terminal Operators",
    flow: [
      "Problem: Show mixed-maturity fleet reality (some connected, some not, multiple OEMs)",
      "Magic: Load Scenario B preset → show instant digital enablement without hardware",
      "Value: Calculate ROI - $280k/year savings without capital investment",
      "Differentiator: 'Only platform that works with any machine, connected or not'",
      "Close: Show autonomous agent preventing $60k failure",
    ],
    keyMetrics: ["Time to value: 48 hours", "ROI: 4.2x in first year", "Zero CapEx required"],
  },
  
  technicalDemo: {
    duration: "30 minutes",
    audience: "Engineering, Maintenance, Operations",
    flow: [
      "Start: Data Sources page - show Siemens MES, SAP, AWS IoT connectors",
      "Challenge: Introduce poor data scenario (Scenario C)",
      "Solution: Digital Twin I/O mapping - normalize 3 OEM protocols",
      "Depth: Show data quality page - 72% → 96% quality score",
      "Intelligence: AI Modeling - predictive maintenance, 88% failure probability",
      "Automation: Vector AI agents - show autonomous workflow",
      "Proof: Reports - $112k predicted maintenance savings",
    ],
    keyMetrics: ["Data quality: 72% → 96%", "Prediction accuracy: 88%", "MTBF: +42%"],
  },
  
  salesDemo: {
    duration: "20 minutes",
    audience: "Procurement, Operations Managers",
    flow: [
      "Hook: 'What if I told you we can optimize machines you don't even have sensors on?'",
      "Demo: Scenario B (no data) - create Digital Twin from spec sheet",
      "Wow: Generate synthetic operational data in 30 seconds",
      "Value: Show benchmark comparison - 'Your machine is 18% below industry standard'",
      "Solution: 'Here's how to close that gap' - show recommendations",
      "Differentiation: 'We're the only platform that doesn't require IoT infrastructure'",
      "Close: Show fleet view - 'Imagine this across all 50 of your machines'",
    ],
    keyMetrics: ["Setup time: < 1 hour", "Works with 0 sensors", "18% efficiency gain potential"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Datapx1 — User accounts & all per-page mock content
//  Single industrial role. No industries / managers / hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

export type RoleKey = "datapx_user";

export interface UserAccount {
  email: string;
  password: string;
  role: RoleKey;
  name: string;
  title: string;
  initials: string;
}

export const userAccounts: UserAccount[] = [
  { email: "alex@datapx1.com",   password: "datapx2026", role: "datapx_user", name: "Alex Chen",       title: "Operations Lead",      initials: "AC" },
  { email: "priya@datapx1.com",  password: "datapx2026", role: "datapx_user", name: "Priya Sharma",    title: "Maintenance Engineer", initials: "PS" },
  { email: "sarah@datapx1.com",  password: "datapx2026", role: "datapx_user", name: "Sarah Okafor",    title: "Plant Supervisor",     initials: "SO" },
  { email: "david@datapx1.com",  password: "datapx2026", role: "datapx_user", name: "David Kim",       title: "Reliability Engineer", initials: "DK" },
  { email: "james@datapx1.com",  password: "datapx2026", role: "datapx_user", name: "James Whitfield", title: "Production Analyst",   initials: "JW" },
  { email: "sophie@datapx1.com", password: "datapx2026", role: "datapx_user", name: "Sophie Clark",    title: "Quality Inspector",    initials: "SC" },
];

// ─── Shared types ───────────────────────────────────────────────────────────
export interface BotResponse {
  type: "text" | "table" | "chart";
  content: string;
  chartData?: { name: string; value: number }[];
  chartTitle?: string;
  chartInfo?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
}

export interface SuggestedPrompt {
  text: string;
  type: "text" | "table" | "chart";
}

interface Inference {
  title: string; confidence: number; snippet: string; impact: "High" | "Med" | "Low";
  explanation: { summary: string; methodology: string; keyFindings: string[]; dataPoints: string; businessImplications: string[]; limitations: string };
}
interface InsightAction { id: string; title: string; status: "New" | "In Progress" | "Resolved"; assignee: string }
interface InsightRecommendation { priority: "High" | "Med" | "Low"; summary: string }
interface MissingValueRow { columns: Record<string, string | number>; highlightColumn?: string }
interface PredictionConfig {
  targetColumns: string[]; defaultTarget: string;
  inputFields: { key: string; defaultValue: string }[];
  predictedValue: number; predictedLabel: string;
  outputLevels: { level: string; range: string }[];
}
interface ForecastConfig {
  targetColumns: string[]; defaultTarget: string;
  chartData: { date: string; value: number }[]; insightText: string;
}

interface RoleDataShape {
  dashboard: {
    stats: { label: string; value: string; change: string; trend: "up" | "down" }[];
    chartTitle: string;
    chartKeys: [string, string];
    chartKeyLabels: [string, string];
    chartData: Record<string, string | number>[];
    risks: { severity: string; label: string }[];
    actions: { severity: string; label: string }[];
  };
  dataSources: {
    connected: { name: string; type: string; status: string; records: string; lastSync: string }[];
    datasets: { id: string; name: string; rows: number; columns: number; uploadDate: string; status: "Ready" | "Processing" | "Error" }[];
  };
  reports: {
    available: { name: string; category: string; lastRun: string; status: string }[];
    recentInsights: string[];
    reportContent: Record<string, { summary: string; keyMetrics: { label: string; value: string }[]; sections: string[] }>;
  };
  decisionIntelligence: {
    agents: { name: string; status: string; trigger: string; lastFired: string; confidence: number }[];
    decisions: { pillar: string; question: string; recommendation: string; confidence: number; urgency: string }[];
    inferences: Inference[];
    insightActions: InsightAction[];
    insightRecommendations: InsightRecommendation[];
    missingValues: { columns: string[]; rows: MissingValueRow[]; highlightColumn: string; totalMissing: number };
    prediction: PredictionConfig;
    forecast: ForecastConfig;
  };
  botConfig: {
    greeting: string;
    suggestedPrompts: SuggestedPrompt[];
    datasets: { value: string; label: string }[];
    chatHistory: { id: string; title: string; pinned: boolean }[];
    mockResponses: Record<string, BotResponse>;
  };
}

// ─── Datapx1 page content ───────────────────────────────────────────────────
export const roleData: Record<RoleKey, RoleDataShape> = {
  datapx_user: {
    dashboard: {
      stats: [
        { label: "Avg Machine OEE",          value: "76%",   change: "+2.1%", trend: "up" },
        { label: "Machines Running",   value: "6 / 8", change: "+1",    trend: "up" },
        { label: "At-Risk Machines",   value: "3",     change: "+1",    trend: "down" },
        { label: "Unplanned Downtime", value: "4.2h",  change: "-1.1h", trend: "up" },
      ],
      chartTitle: "Machines Output vs Capacity (12 months)",
      chartKeys: ["output", "capacity"],
      chartKeyLabels: ["Actual Output", "Capacity"],
      chartData: [
        { month: "May", output: 11200, capacity: 14000 },
        { month: "Jun", output: 11800, capacity: 14000 },
        { month: "Jul", output: 12400, capacity: 14000 },
        { month: "Aug", output: 11600, capacity: 14000 },
        { month: "Sep", output: 12800, capacity: 14000 },
        { month: "Oct", output: 13100, capacity: 14000 },
        { month: "Nov", output: 12600, capacity: 14000 },
        { month: "Dec", output: 13400, capacity: 14000 },
        { month: "Jan", output: 12900, capacity: 14000 },
        { month: "Feb", output: 13700, capacity: 14000 },
        { month: "Mar", output: 13200, capacity: 14000 },
        { month: "Apr", output: 13800, capacity: 14000 },
      ],
      risks: [
        { severity: "high",   label: "Lathe Zeta (M-106) — vibration 6.8 mm/s, fault state" },
        { severity: "high",   label: "Robot Arm Gamma (M-103) — maintenance overdue" },
        { severity: "medium", label: "Conveyor Epsilon (M-105) — availability dropped to 45%" },
        { severity: "low",    label: "Press Beta (M-102) — temperature trending up" },
      ],
      actions: [
        { severity: "high",   label: "Schedule emergency PM on Lathe Zeta within 24h" },
        { severity: "medium", label: "Rebalance load from Conveyor Epsilon to Line A" },
        { severity: "low",    label: "Order spare bearings for CNC Mill Alpha (90-day window)" },
      ],
    },

    dataSources: {
      connected: [
        { name: "SAP S/4HANA",          type: "ERP",         status: "Active",  records: "4.2M",  lastSync: "2m ago" },
        { name: "Siemens Opcenter MES", type: "MES",         status: "Active",  records: "1.8M",  lastSync: "5m ago" },
        { name: "AWS IoT Core",         type: "Telemetry",   status: "Active",  records: "12.4M", lastSync: "Live"   },
        { name: "Ignition SCADA",       type: "SCADA",       status: "Active",  records: "3.1M",  lastSync: "1m ago" },
        { name: "Snowflake DWH",        type: "Warehouse",   status: "Active",  records: "28M",   lastSync: "1h ago" },
        { name: "Maximo CMMS",          type: "Maintenance", status: "Warning", records: "210K",  lastSync: "3h ago" },
      ],
      datasets: [
        { id: "1", name: "machine_telemetry_q1.parquet", rows: 1240000, columns: 18, uploadDate: "2026-04-01", status: "Ready" },
        { id: "2", name: "maintenance_logs.csv",         rows: 8400,    columns: 12, uploadDate: "2026-03-28", status: "Ready" },
        { id: "3", name: "production_orders.json",       rows: 32100,   columns: 22, uploadDate: "2026-04-10", status: "Processing" },
        { id: "4", name: "quality_inspections.xlsx",     rows: 5600,    columns: 9,  uploadDate: "2026-03-25", status: "Ready" },
        { id: "5", name: "scrap_corrupt.csv",            rows: 0,       columns: 0,  uploadDate: "2026-04-12", status: "Error" },
      ],
    },

    reports: {
      available: [
        { name: "Machine OEE Performance",       category: "Operations",     lastRun: "2026-04-15", status: "Ready" },
        { name: "Predictive Maintenance Risk", category: "Reliability",    lastRun: "2026-04-14", status: "Ready" },
        { name: "Downtime Pareto Analysis",    category: "Operations",     lastRun: "2026-04-13", status: "Ready" },
        { name: "Energy Consumption Report",   category: "Sustainability", lastRun: "2026-04-10", status: "Ready" },
      ],
      recentInsights: [
        "Lathe Zeta accounts for 38% of unplanned downtime this month.",
        "Vibration anomalies detected on Press Beta correlate with afternoon shifts.",
        "Switching to predictive PM on Line A could save ~$28k/quarter.",
      ],
      reportContent: {
        "Machine OEE Performance": {
          summary: "Fleet-wide OEE landed at 76%, +2.1pp vs prior period. Line D leads at 82%; Line C is the laggard at 24% due to Lathe Zeta fault state.",
          keyMetrics: [
            { label: "Avg Machine OEE", value: "76%" },
            { label: "Best Line", value: "Line D — 82%" },
            { label: "Worst Line", value: "Line C — 24%" },
            { label: "MTBF", value: "112 hrs" },
          ],
          sections: ["Executive Summary", "Line-by-Line OEE", "Top Loss Drivers", "Recommendations"],
        },
        "Predictive Maintenance Risk": {
          summary: "3 machines flagged high-risk. Lathe Zeta (M-106) has 88% failure probability within 14 days based on vibration & temperature trend.",
          keyMetrics: [
            { label: "High Risk", value: "3" },
            { label: "Medium Risk", value: "2" },
            { label: "Avg Risk Score", value: "39 / 100" },
            { label: "Predicted Saves", value: "$112k" },
          ],
          sections: ["Risk Heatmap", "Per-Machine Forecast", "Recommended PM Schedule"],
        },
        "Downtime Pareto Analysis": {
          summary: "80% of downtime in the last 30 days came from 2 machines: Lathe Zeta and Robot Arm Gamma.",
          keyMetrics: [
            { label: "Total Downtime", value: "42.6 hrs" },
            { label: "Top Offender", value: "Lathe Zeta (16.2h)" },
            { label: "Cost Impact", value: "$84k" },
            { label: "Trend", value: "↑ vs last month" },
          ],
          sections: ["Pareto Chart", "Root Cause Breakdown", "Action Plan"],
        },
        "Energy Consumption Report": {
          summary: "Plant-wide kWh up 4% vs target. Injection Eta is the top consumer; opportunity to shift load off-peak.",
          keyMetrics: [
            { label: "Total kWh", value: "284k" },
            { label: "Cost", value: "$31.2k" },
            { label: "Top Consumer", value: "Injection Eta" },
            { label: "vs Target", value: "+4%" },
          ],
          sections: ["Consumption by Machine", "Time-of-Use Analysis", "Savings Opportunities"],
        },
      },
    },

    decisionIntelligence: {
      agents: [
        { name: "Vibration Anomaly Watch",   status: "Active", trigger: "RMS > 5 mm/s",         lastFired: "12m ago", confidence: 91 },
        { name: "Temperature Drift Monitor", status: "Active", trigger: "ΔT > 15°C / hour",     lastFired: "1h ago",  confidence: 84 },
        { name: "Production Lag Detector",   status: "Active", trigger: "Output < 70% of plan", lastFired: "3h ago",  confidence: 78 },
        { name: "Maintenance Overdue Monitor",   status: "Active", trigger: "PM date passed",       lastFired: "Today",   confidence: 100 },
      ],
      decisions: [
        { pillar: "Reliability", question: "Should we shutdown Lathe Zeta now?",          recommendation: "Yes — controlled shutdown saves ~$60k vs catastrophic failure", confidence: 88, urgency: "High" },
        { pillar: "Throughput",  question: "Re-route Line C work to Line A?",              recommendation: "Yes — Line A has 18% spare capacity",                            confidence: 82, urgency: "Med"  },
        { pillar: "Quality",     question: "Tighten quality gates on Press Beta?",         recommendation: "Yes — scrap rate drift suggests die wear",                       confidence: 74, urgency: "Med"  },
        { pillar: "Energy",      question: "Shift Injection Eta runs to off-peak hours?",  recommendation: "Yes — projected $4.2k/month savings",                            confidence: 79, urgency: "Low"  },
      ],
      inferences: [
        {
          title: "Lathe Zeta failure imminent",
          confidence: 88,
          snippet: "Vibration RMS climbed 3.1× in 48 hours; temperature 96°C above tolerance.",
          impact: "High",
          explanation: {
            summary: "Bearing degradation pattern matches historical pre-failure signatures.",
            methodology: "FFT vibration analysis + ML classifier trained on 2 years of fleet data.",
            keyFindings: ["Peak at 240 Hz (bearing race frequency)", "Temp delta +14°C vs baseline", "Lubricant due 6 days ago"],
            dataPoints: "12,400 sensor readings over the last 7 days",
            businessImplications: ["~$60k saved by controlled shutdown", "Avoid 18h unplanned downtime", "Protect Line C throughput"],
            limitations: "Model accuracy drops when ambient temp >35°C; ambient is currently 28°C.",
          },
        },
      ],
      insightActions: [
        { id: "A-1", title: "Shutdown Lathe Zeta and replace bearings", status: "New",         assignee: "Priya Sharma" },
        { id: "A-2", title: "Re-route Line C orders to Line A",         status: "In Progress", assignee: "Alex Chen"    },
        { id: "A-3", title: "Recalibrate Press Beta die-clearance",     status: "New",         assignee: "David Kim"    },
      ],
      insightRecommendations: [
        { priority: "High", summary: "Schedule emergency PM on M-106 within 24h." },
        { priority: "Med",  summary: "Increase vibration sampling frequency on Line A." },
        { priority: "Low",  summary: "Review lubricant supplier for Line C machines." },
      ],
      missingValues: {
        columns: ["machine_id", "timestamp", "vibration", "temperature", "pressure"],
        highlightColumn: "vibration",
        totalMissing: 142,
        rows: [
          { columns: { machine_id: "M-101", timestamp: "10:00", vibration: "—", temperature: 62, pressure: 5.4 }, highlightColumn: "vibration" },
          { columns: { machine_id: "M-102", timestamp: "10:05", vibration: 3.4, temperature: 71, pressure: 6.8 } },
          { columns: { machine_id: "M-103", timestamp: "10:10", vibration: "—", temperature: 38, pressure: 0.0 }, highlightColumn: "vibration" },
          { columns: { machine_id: "M-104", timestamp: "10:15", vibration: 2.7, temperature: 84, pressure: 4.2 } },
          { columns: { machine_id: "M-105", timestamp: "10:20", vibration: "—", temperature: 41, pressure: 2.1 }, highlightColumn: "vibration" },
        ],
      },
      prediction: {
        targetColumns: ["failure_probability_14d", "remaining_useful_life_days", "next_oee"],
        defaultTarget: "failure_probability_14d",
        inputFields: [
          { key: "vibration_mm_s", defaultValue: "6.8" },
          { key: "temperature_c",  defaultValue: "96"  },
          { key: "uptime_hours",   defaultValue: "22"  },
          { key: "days_since_pm",  defaultValue: "94"  },
        ],
        predictedValue: 88,
        predictedLabel: "Failure probability within 14 days",
        outputLevels: [
          { level: "Low",    range: "0 – 30"  },
          { level: "Medium", range: "31 – 60" },
          { level: "High",   range: "61 – 100" },
        ],
      },
      forecast: {
        targetColumns: ["cluster_output", "avg_oee", "energy_kwh"],
        defaultTarget: "cluster_output",
        chartData: [
          { date: "Apr 15", value: 13800 },
          { date: "Apr 16", value: 13900 },
          { date: "Apr 17", value: 14050 },
          { date: "Apr 18", value: 14100 },
          { date: "Apr 19", value: 14250 },
          { date: "Apr 20", value: 14300 },
        ],
        insightText: "Fleet output expected to climb 3.6% over next 5 days, assuming Lathe Zeta is restored by Apr 18.",
      },
    },

    botConfig: {
      greeting: "Hi! I'm Vector AI. Ask me about machine health, OEE, downtime, or maintenance — I'll dig through your machine data for you.",
      suggestedPrompts: [
        { text: "Which machine is most at risk right now?",                type: "text"  },
        { text: "Show me OEE by machine",                                  type: "chart" },
        { text: "List machines with maintenance due in the next 30 days",  type: "table" },
        { text: "What's driving downtime on Line C?",                      type: "text"  },
      ],
      datasets: [
        { value: "telemetry", label: "machine_telemetry_q1" },
        { value: "maint",     label: "maintenance_logs"     },
        { value: "orders",    label: "production_orders"    },
      ],
      chatHistory: [
        { id: "1", title: "Lathe Zeta failure analysis",   pinned: true  },
        { id: "2", title: "Line C downtime root cause",    pinned: false },
        { id: "3", title: "Energy savings opportunities",  pinned: false },
      ],
      mockResponses: {
        "Which machine is most at risk right now?": {
          type: "text",
          content: "Lathe Zeta (M-106) is the highest-risk asset right now with a risk score of 88/100. Vibration is at 6.8 mm/s (3.1× baseline) and temperature is 96°C. I recommend a controlled shutdown within 24h.",
        },
        "Show me OEE by machine": {
          type: "chart",
          content: "Here's OEE across all selected machines. Three machines are below the 80% target.",
          chartTitle: "OEE by Machine",
          chartInfo: "Target = 80%. Anything below 60% is critical.",
          chartData: [
            { name: "M-101", value: 84 },
            { name: "M-102", value: 78 },
            { name: "M-103", value: 0  },
            { name: "M-104", value: 82 },
            { name: "M-105", value: 35 },
            { name: "M-106", value: 12 },
            { name: "M-107", value: 88 },
            { name: "M-108", value: 76 },
          ],
        },
        "List machines with maintenance due in the next 30 days": {
          type: "table",
          content: "5 machines have planned maintenance in the next 30 days; 1 is overdue.",
          tableHeaders: ["Machine", "Type", "Next PM", "Status"],
          tableRows: [
            ["M-106 Lathe Zeta",       "CNC Lathe",       "OVERDUE",    "Critical"],
            ["M-103 Robot Arm Gamma",  "Pick & Place",    "2026-04-18", "Scheduled"],
            ["M-105 Conveyor Epsilon", "Conveyor",        "2026-04-25", "Scheduled"],
            ["M-102 Press Beta",       "Hydraulic Press", "2026-05-10", "Scheduled"],
            ["M-101 CNC Mill Alpha",   "CNC Milling",     "2026-05-22", "Scheduled"],
          ],
        },
      },
    },
  },
};
