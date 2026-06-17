export { API_BASE_URL, authClient, apiClient, toFormBody } from "./client";
export { authApi } from "./auth";
export {
  datasetsApi,
  resolveRegistryId,
  mapDisplayNamesToIds,
  mapIdsToDisplayNames,
  resolveSelectedDatasetIds,
  normalizeProcessResponse,
  matchUploadedToDatasets,
  formatUploadSuccess,
  formatProcessSuccess,
  pickActiveDataset,
  SELECTED_DATASETS_KEY,
  ACTIVE_DATASET_KEY,
} from "./datasets";
export type { DatasetRecord, UploadResult, ProcessFilesResult, SelectedFilesResponse } from "./datasets";
export { genaiApi, parseGenAiResponse } from "./genai";
export type { GenAiParsedReply } from "./genai";
export { digitalTwinApi } from "./digitalTwin";
export type { FleetRecord, FleetMachine } from "./digitalTwin";
export { dataPreparationApi } from "./dataPreparation";
export { dataProcessingApi } from "./dataProcessing";
export { dashboardApi } from "./dashboard";
export type { FleetDashboardParams, MachineDashboardParams } from "./dashboard";
export { vectorApi } from "./vector";
export { analyticsApi } from "./analytics";
export { reportsApi } from "./reports";
export { adminApi } from "./admin";
export type { TenantRecord, OrganizationRecord, UserRecord, RoleRecord, SessionRecord, Pagination } from "./admin";
export { registryParams, datasetScopeParams, assertApiSuccess, extractApiMessage } from "./scope";
export type { RegistryScope, DatasetScope } from "./scope";
