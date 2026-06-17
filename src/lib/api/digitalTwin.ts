import { apiClient } from "./client";

const DEFAULT_TELEMETRY_LIMIT = 20;

export interface FleetMachine {
  twin_id: string;
  machine_serial: string;
  machine_id?: string;
  simulation_enabled: boolean;
  operational_mode?: string;
  active_fault?: string;
  last_telemetry_at?: string;
}

export interface FleetRecord {
  fleet_id: string;
  registry_id?: string;
  fleet_name?: string;
  fleet_size: number;
  interval_seconds: number;
  scheduler_enabled: boolean;
  last_tick_at?: string;
  machines: FleetMachine[];
}

class DigitalTwinApi {
  async uploadCatalog(
    payload: { file?: File; description?: string; oem: string; model: string },
    onProgress?: (pct: number) => void,
  ) {
    const form = new FormData();
    if (payload.file) form.append("file", payload.file);
    if (payload.description) form.append("description", payload.description);
    form.append("oem", payload.oem);
    form.append("model", payload.model);
    const { data } = await apiClient.post("/api/digital-twin/upload-catalog", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  }

  async confirmTemplate(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/confirm-template", body, { timeout: 0 });
    return data;
  }

  async createFleet(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/create-fleet", body, { timeout: 0 });
    return data;
  }

  async runTick(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/run-tick", body);
    return data;
  }

  async startSimulation(body: { fleet_id?: string; registry_id?: string; enable_all_machines?: boolean }) {
    const { data } = await apiClient.post("/api/digital-twin/start-simulation", body);
    return data;
  }

  async stopSimulation(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/stop-simulation", body);
    return data;
  }

  async toggleSimulation(body: { fleet_id?: string; registry_id?: string; enabled: boolean }) {
    const { data } = await apiClient.post("/api/digital-twin/toggle-simulation", body);
    return data;
  }

  async startMachine(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/start-machine", body);
    return data;
  }

  async stopMachine(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/stop-machine", body);
    return data;
  }

  async toggleMachine(body: unknown) {
    const { data } = await apiClient.post("/api/digital-twin/toggle-machine", body);
    return data;
  }

  async listMachines(params: Record<string, unknown>) {
    const { data } = await apiClient.get("/api/digital-twin/machines", { params });
    return data;
  }

  async getLatestTelemetry(params: {
    fleet_id?: string;
    registry_id?: string;
    twin_id?: string;
    machine_serial?: string;
    limit?: number;
  }) {
    const { data } = await apiClient.get("/api/digital-twin/telemetry/latest", {
      params: {
        fleet_id: params.fleet_id,
        registry_id: params.registry_id,
        twin_id: params.twin_id,
        machine_serial: params.machine_serial,
        limit: params.limit ?? DEFAULT_TELEMETRY_LIMIT,
      },
    });
    return data;
  }

  async getFleetStatus(params: Record<string, unknown>) {
    const { data } = await apiClient.get("/api/digital-twin/fleet/status", { params });
    return data;
  }

  async listSyntheticDatasets() {
    const { data } = await apiClient.get("/api/digital-twin/datasets");
    return data;
  }

  async listFleets(params?: Record<string, unknown>) {
    const { data } = await apiClient.get("/api/digital-twin/fleets", { params });
    return data as { status?: boolean; fleets?: FleetRecord[] };
  }

  async deleteTwin(body: { twin_id?: string; fleet_id?: string; registry_id?: string }) {
    const { data } = await apiClient.post("/api/digital-twin/delete-twin", body);
    return data;
  }
}

export const digitalTwinApi = new DigitalTwinApi();
