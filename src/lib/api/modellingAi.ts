import { apiClient } from "./client";
import { assertApiSuccess, datasetScopeParams, type DatasetScope } from "./scope";

export type ModellingAiAction =
  | "executive_summary"
  | "risk_analysis"
  | "maintenance_recommendations"
  | "performance_optimization"
  | "ai_report";

export const ACTION_LABELS: Record<ModellingAiAction, string> = {
  executive_summary: "Executive summary for this dataset",
  risk_analysis: "Which machines are most at risk?",
  maintenance_recommendations: "What maintenance should we schedule?",
  performance_optimization: "How can we improve OEE / performance?",
  ai_report: "Generate full AI report",
};

export interface ModellingAiIpr {
  inferences: string[];
  problems: string[];
  recommendations: string[];
}

export interface ModellingAiSectionItem {
  severity?: string;
  title?: string;
  impact?: string;
  evidence?: string;
  content?: string;
}

export interface ModellingAiSection {
  id?: string;
  sectionId?: string;
  title: string;
  content?: string;
  items?: ModellingAiSectionItem[];
}

export interface ModellingAiTimelineBucket {
  label: string;
  actions: string[];
}

export interface ModellingAiInsight {
  success?: boolean;
  action?: ModellingAiAction;
  session_id?: string;
  summary?: string;
  ipr?: ModellingAiIpr;
  sections?: ModellingAiSection[];
  prescriptive_timeline?: Record<string, ModellingAiTimelineBucket>;
  sources?: string[];
  generated_at?: string;
  report_meta?: { title?: string; version?: string };
  dataset?: {
    registry_id?: number;
    display_name?: string;
    file_name?: string;
    machine_id?: string;
    scope?: string;
  };
}

export interface ModellingAiContext {
  success?: boolean;
  dataset?: ModellingAiInsight["dataset"];
  machines?: Array<{ twin_id: string; machine_id?: string; machine_serial?: string | null }>;
  artifacts?: {
    kpis_generated?: boolean;
    kpis_count?: number;
    kpis_source?: string;
    kpis?: unknown[];
    last_forecast?: { column?: string; frequency?: string; period?: number } | null;
    last_outlier?: { column?: string; count?: number } | null;
    last_prediction?: { target?: string; result?: string; at?: string } | null;
  };
  snapshot_summary?: {
    row_count?: number;
    date_range?: (string | null)[];
    top_sensors?: string[];
  };
  available_actions?: ModellingAiAction[];
}

export interface ModellingAiSessionContext {
  kpis?: unknown[];
  executed_kpis?: unknown[];
  forecast?: unknown;
  outliers?: unknown;
  prediction?: unknown;
  prediction_insights?: unknown;
}

function scopeBody(scope: DatasetScope) {
  return {
    registry_id: scope.registry_id,
    file_name: scope.file_name,
    machine_id: scope.machine_id ?? scope.twin_id,
    scope: scope.scope,
    all_machines: scope.all_machines,
  };
}

export const modellingAiApi = {
  async getContext(scope: DatasetScope, context?: ModellingAiSessionContext): Promise<ModellingAiContext> {
    const params: Record<string, unknown> = { ...datasetScopeParams(scope) };
    const hasContext = context && Object.values(context).some((v) => v != null && (!(Array.isArray(v)) || v.length > 0));
    if (hasContext) {
      params.context = JSON.stringify(context);
    }
    const { data } = await apiClient.get("/api/analytics/ai/context", { params });
    return assertApiSuccess(data, "Failed to load AI context");
  },

  async runAction(
    action: ModellingAiAction,
    scope: DatasetScope,
    context?: ModellingAiSessionContext,
  ): Promise<ModellingAiInsight> {
    const { data } = await apiClient.post(
      "/api/analytics/ai/insights",
      { action, ...scopeBody(scope), ...(context ? { context } : {}) },
      { params: datasetScopeParams(scope), timeout: 0 },
    );
    return assertApiSuccess(data, "AI insight request failed");
  },

  async chat(
    prompt: string,
    scope: DatasetScope,
    options?: {
      sessionId?: string | null;
      parentAction?: ModellingAiAction | null;
      context?: ModellingAiSessionContext;
    },
  ): Promise<ModellingAiInsight> {
    const { data } = await apiClient.post(
      "/api/analytics/ai/chat",
      {
        prompt,
        ...scopeBody(scope),
        session_id: options?.sessionId ?? null,
        parent_action: options?.parentAction ?? null,
        ...(options?.context ? { context: options.context } : {}),
      },
      { params: datasetScopeParams(scope), timeout: 0 },
    );
    return assertApiSuccess(data, "AI chat request failed");
  },
};
