import { apiClient } from "./client";

export interface FleetDashboardParams {
  fleet_id: string;
  registry_id?: string | number;
  view?: "fleet" | "machine" | "correlation";
  use_gpt_ipr?: boolean;
}

export interface MachineDashboardParams {
  twin_id: string;
  registry_id?: string | number;
  fleet_id?: string;
  use_gpt_ipr?: boolean;
}

export const dashboardApi = {
  async getFleetDashboard(params: FleetDashboardParams) {
    const { data } = await apiClient.get("/api/dashboard/fleet", {
      params: { ...params, use_gpt_ipr: params.use_gpt_ipr !== false },
    });
    return data.data;
  },

  async getMachineView(params: Omit<FleetDashboardParams, "view">) {
    return this.getFleetDashboard({ ...params, view: "machine" });
  },

  async getFleetView(params: Omit<FleetDashboardParams, "view">) {
    return this.getFleetDashboard({ ...params, view: "fleet" });
  },

  async getMachineDashboard(params: MachineDashboardParams) {
    const { data } = await apiClient.get("/api/dashboard/machine", {
      params: { ...params, use_gpt_ipr: params.use_gpt_ipr !== false },
    });
    return data.data;
  },
};
