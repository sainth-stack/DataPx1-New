export interface RegistryScope {
  registry_id?: number | string;
  refresh?: boolean;
  twin_id?: string;
  machine_id?: string;
  machine_serial?: string;
  all_machines?: boolean;
}

export interface DatasetScope extends RegistryScope {
  dataset_id?: string | number;
  file_name?: string;
  scope?: string;
}

export function registryParams(scope: RegistryScope): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (scope.registry_id != null) params.registry_id = scope.registry_id;
  if (scope.refresh) params.refresh = true;
  if (scope.twin_id) params.twin_id = scope.twin_id;
  if (scope.machine_id) params.machine_id = scope.machine_id;
  if (scope.machine_serial) params.machine_serial = scope.machine_serial;
  if (scope.all_machines) params.all_machines = true;
  return params;
}

export function datasetScopeParams(scope: DatasetScope): Record<string, unknown> {
  const params = registryParams(scope);
  if (scope.dataset_id != null) params.dataset_id = scope.dataset_id;
  if (scope.file_name) params.file_name = scope.file_name;
  if (scope.all_machines != null) params.all_machines = scope.all_machines;
  if (scope.scope) params.scope = scope.scope;
  return params;
}

export function assertApiSuccess<T>(data: T & { success?: boolean; message?: string; msg?: string }, fallback = "Request failed"): T {
  if (data.success === false) {
    throw new Error(data.message || data.msg || fallback);
  }
  return data;
}

export function extractApiMessage(error: unknown, fallback = "Request failed"): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { message?: string; msg?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.msg) return data.msg;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
