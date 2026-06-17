import { apiClient, toFormBody } from "./client";
import { extractApiMessage } from "./scope";

export interface Pagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_records: number;
}

export interface TenantRecord {
  id: number;
  name: string;
  type: string;
  timeout: number | null;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  parentId: string | null;
  logoName: string | null;
  logoData: string | null;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: "Active" | "Inactive";
  organizationId?: string;
  organizationName?: string;
  tenantName?: string;
}

export interface RoleRecord {
  id: number;
  name: string;
  permissions: string[];
  organizationId: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  orgName: string;
  ipAddress: string;
  deviceInfo: string;
  loginTime: string;
  logoutTime: string | null;
  durationMinutes: number | null;
  status: string;
}

function normalizePagination(raw: Record<string, unknown> = {}): Pagination {
  return {
    page: Number(raw.page ?? 1),
    page_size: Number(raw.page_size ?? 10),
    total_pages: Number(raw.total_pages ?? 1),
    total_records: Number(raw.total_records ?? 0),
  };
}

function mapTenant(raw: Record<string, unknown>): TenantRecord {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    type: String(raw.type ?? ""),
    timeout: raw.timeout != null ? Number(raw.timeout) : null,
  };
}

function mapOrganization(raw: Record<string, unknown>): OrganizationRecord {
  const tenant = (raw.tenant ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    tenantId: String(tenant["Tenant Id"] ?? tenant.tenant_id ?? ""),
    tenantName: String(tenant["Tenant Name"] ?? tenant.tenant_name ?? ""),
    parentId: raw.parent != null ? String(raw.parent) : null,
    logoName: raw.logo_name != null ? String(raw.logo_name) : null,
    logoData: raw.logo_data != null ? String(raw.logo_data) : null,
  };
}

function formatLastActive(value: unknown): string {
  if (!value) return "—";
  const str = String(value);
  try {
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return str;
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "Yesterday" : `${days}d ago`;
  } catch {
    return str;
  }
}

function mapUser(raw: Record<string, unknown>): UserRecord {
  const org = (raw.organization ?? {}) as Record<string, unknown>;
  const tenant = (raw.tenant ?? {}) as Record<string, unknown>;
  const role = raw.role;
  const roleStr = Array.isArray(role) ? role.join(", ") : String(role ?? "—");
  const active = raw.is_active !== false && raw.is_active !== "False";
  return {
    id: String(raw.id ?? ""),
    name: String(raw.username ?? raw.name ?? ""),
    email: String(raw.email ?? ""),
    role: roleStr,
    lastActive: formatLastActive(raw.last_login),
    status: active ? "Active" : "Inactive",
    organizationId: org.organization_id != null ? String(org.organization_id) : undefined,
    organizationName: org.organization_name != null ? String(org.organization_name) : undefined,
    tenantName: tenant.tenant_name != null ? String(tenant.tenant_name) : undefined,
  };
}

function mapRole(raw: Record<string, unknown>): RoleRecord {
  const perms = raw.permissions;
  return {
    id: Number(raw.id),
    name: String(raw.role ?? ""),
    permissions: Array.isArray(perms) ? perms.map(String) : [],
    organizationId: String(raw.organization ?? ""),
  };
}

function mapSession(raw: Record<string, unknown>): SessionRecord {
  return {
    id: String(raw.id ?? raw.session_id ?? ""),
    userId: String(raw.userId ?? ""),
    userName: String(raw.userName ?? ""),
    userEmail: String(raw.userEmail ?? ""),
    orgName: String(raw.orgName ?? "—"),
    ipAddress: String(raw.ipAddress ?? "—"),
    deviceInfo: String(raw.deviceInfo ?? "—"),
    loginTime: String(raw.loginTime ?? "—"),
    logoutTime: raw.logoutTime != null ? String(raw.logoutTime) : null,
    durationMinutes: raw.durationMinutes != null ? Number(raw.durationMinutes) : null,
    status: String(raw.status ?? "unknown").toLowerCase(),
  };
}

async function formPost(url: string, body: Record<string, unknown>) {
  const params = toFormBody(
    Object.fromEntries(
      Object.entries(body).flatMap(([k, v]) => {
        if (v == null || v === "") return [];
        if (Array.isArray(v)) return v.map((item) => [k, String(item)]);
        return [[k, String(v)]];
      }),
    ) as Record<string, string>,
  );
  const { data } = await apiClient.post(url, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export const adminApi = {
  extractMessage: extractApiMessage,

  async listTenants(opts: { page?: number; page_size?: number; sort?: string; direction?: string } = {}) {
    const { data } = await apiClient.get("/api/tenants", {
      params: {
        page: opts.page ?? 1,
        page_size: opts.page_size ?? 50,
        sort: opts.sort ?? "name",
        direction: opts.direction ?? "asc",
      },
    });
    return { items: (data.tenants ?? []).map(mapTenant), pagination: normalizePagination(data.pagination) };
  },

  async createTenant(body: { name: string; type: string; timeout?: string }) {
    const data = await formPost("/api/create_tenants", {
      tenant_name: body.name,
      tenant_type: body.type,
      timeout: body.timeout ?? "30",
    });
    if (data.status === "duplicate") throw new Error(data.message ?? "Tenant already exists");
    if (data.status === "error") throw new Error(data.message ?? "Create failed");
  },

  async updateTenant(id: number, body: { name: string; type: string; timeout?: string }) {
    await formPost(`/api/tenants/${id}`, {
      tenant_name: body.name,
      tenant_type: body.type,
      tenant_timeout: body.timeout,
    });
  },

  async deleteTenant(id: number) {
    const { data } = await apiClient.delete(`/api/tenants/${id}`);
    if (data.status === "error") throw new Error(data.message ?? "Delete failed");
  },

  async listOrganizations(opts: { page?: number; page_size?: number; sort?: string; direction?: string; tenant_id?: number } = {}) {
    const { data } = await apiClient.get("/api/organizations", {
      params: {
        page: opts.page ?? 1,
        page_size: opts.page_size ?? 50,
        sort: opts.sort ?? "name",
        direction: opts.direction ?? "asc",
        tenant_id: opts.tenant_id,
      },
    });
    return { items: (data.organizations ?? []).map(mapOrganization), pagination: normalizePagination(data.pagination) };
  },

  async createOrganization(body: { tenant_id: number; name: string; parent_organization_id?: string; logo?: File }) {
    const form = new FormData();
    form.append("tenant_id", String(body.tenant_id));
    form.append("organization_name", body.name);
    if (body.parent_organization_id) form.append("parent_organization_id", body.parent_organization_id);
    if (body.logo) form.append("logo", body.logo);
    const { data } = await apiClient.post("/api/create_organizations", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (data.status === "error") throw new Error(data.message ?? "Create failed");
  },

  async updateOrganization(
    id: string,
    body: { tenant_id?: number; name?: string; parent?: string; logo?: File },
  ) {
    if (body.logo) {
      const form = new FormData();
      if (body.tenant_id != null) form.append("tenant", String(body.tenant_id));
      if (body.name) form.append("name", body.name);
      if (body.parent) form.append("parent", body.parent);
      form.append("logo", body.logo);
      await apiClient.post(`/api/organizations/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
    } else {
      await formPost(`/api/organizations/${id}`, {
        tenant: body.tenant_id != null ? String(body.tenant_id) : undefined,
        name: body.name,
        parent: body.parent,
      });
    }
  },

  async deleteOrganization(id: string) {
    const { data } = await apiClient.delete(`/api/organizations/${id}`);
    if (data.status === "error") throw new Error(data.message ?? "Delete failed");
  },

  async listUsers(opts: {
    page?: number;
    page_size?: number;
    sort?: string;
    direction?: string;
    organization_id?: string;
    user_role?: string;
  } = {}) {
    const { data } = await apiClient.get("/api/users/", {
      params: {
        page: opts.page ?? 1,
        page_size: opts.page_size ?? 50,
        sort: opts.sort,
        direction: opts.direction,
        organization_id: opts.organization_id,
        user_role: opts.user_role,
      },
    });
    return { items: (data.users ?? []).map(mapUser), pagination: normalizePagination(data.pagination) };
  },

  async createUser(body: { username: string; email: string; password: string; organization: string; roles: string }) {
    const data = await formPost("/api/create_user", body);
    if (data.status === "error") throw new Error(data.message ?? "Create failed");
  },

  async updateUser(
    id: string,
    body: { username?: string; email?: string; password?: string; status?: boolean; organization?: string; role?: string },
  ) {
    await formPost(`/api/users/${id}`, {
      username: body.username,
      email: body.email,
      password: body.password,
      status: body.status === undefined ? undefined : body.status ? "True" : "False",
      organization: body.organization,
      user_role: body.role ? [body.role] : undefined,
    });
  },

  async deleteUser(id: string) {
    const { data } = await apiClient.delete(`/api/users/${id}`);
    if (data.status === "error") throw new Error(data.message ?? "Delete failed");
  },

  async listRoles(opts: { page?: number; page_size?: number; sort?: string; direction?: string; o_id?: string } = {}) {
    const { data } = await apiClient.get("/api/roles", {
      params: {
        page: opts.page ?? 1,
        page_size: opts.page_size ?? 50,
        sort: opts.sort ?? "id",
        direction: opts.direction ?? "asc",
        o_id: opts.o_id,
      },
    });
    if (data.status === "error") throw new Error(data.message ?? "Failed to load roles");
    return { items: (data.roles ?? []).map(mapRole), pagination: normalizePagination(data.pagination) };
  },

  async createRole(body: { name: string; permissions: string; organization: string }) {
    await formPost("/api/roles", { roles: body.name, permissions: body.permissions, organization: body.organization });
  },

  async updateRole(id: number, body: { permissions?: string; organization_id?: string }) {
    await formPost(`/api/modify_role/${id}`, body);
  },

  async deleteRole(id: number) {
    const { data } = await apiClient.delete(`/api/modify_role/${id}`);
    if (data.status === "error") throw new Error(data.msg ?? data.message ?? "Delete failed");
  },

  async listSessions(opts: { page?: number; page_size?: number; sort?: string; direction?: string } = {}) {
    const { data } = await apiClient.get("/api/sessions", {
      params: {
        page: opts.page ?? 1,
        page_size: opts.page_size ?? 50,
        sort: opts.sort ?? "id",
        direction: opts.direction ?? "desc",
      },
    });
    if (data.status === "error") throw new Error(data.message ?? "Failed to load sessions");
    return {
      items: (data.sessions ?? []).map(mapSession),
      pagination: normalizePagination(data.pagination),
      activeCount: data.activeSessions as number | undefined,
    };
  },

  async terminateSession(id: string) {
    await formPost(`/api/sessions/${id}`, {
      logoutTime: new Date().toISOString(),
      status: "terminated",
    });
  },
};
