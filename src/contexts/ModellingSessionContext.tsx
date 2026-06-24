import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ModellingAiSessionContext } from "@/lib/api/modellingAi";
import type { GeneratedKpi, OutlierReport } from "@/lib/analyticsHelpers";

export interface ExecutedKpiRecord {
  name: string;
  chart?: Record<string, unknown>;
  ipr?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SessionForecast {
  column: string;
  frequency?: string;
  period?: number;
}

export interface SessionOutliers {
  column: string;
  count: number;
  lower_bound?: number | string;
  upper_bound?: number | string;
  ipr?: Record<string, unknown>;
}

export interface SessionPrediction {
  target: string;
  result?: string;
  at?: string;
}

interface ModellingSessionState {
  generatedKpis: GeneratedKpi[];
  executedKpis: ExecutedKpiRecord[];
  forecast: SessionForecast | null;
  outliers: SessionOutliers | null;
  prediction: SessionPrediction | null;
  predictionInsights: unknown | null;
}

interface ModellingSessionContextValue {
  toApiContext: () => ModellingAiSessionContext;
  sessionRevision: number;
  setGeneratedKpis: (kpis: GeneratedKpi[]) => void;
  addExecutedKpi: (record: ExecutedKpiRecord) => void;
  setForecast: (forecast: SessionForecast | null) => void;
  setOutliers: (outliers: SessionOutliers | null) => void;
  setPrediction: (prediction: SessionPrediction | null, insights?: unknown) => void;
}

const EMPTY_STATE: ModellingSessionState = {
  generatedKpis: [],
  executedKpis: [],
  forecast: null,
  outliers: null,
  prediction: null,
  predictionInsights: null,
};

const ModellingSessionContext = createContext<ModellingSessionContextValue | undefined>(undefined);

function buildApiContext(state: ModellingSessionState): ModellingAiSessionContext {
  const ctx: ModellingAiSessionContext = {};
  if (state.generatedKpis.length) {
    ctx.kpis = state.generatedKpis.map((k) => k.raw);
  }
  if (state.executedKpis.length) {
    ctx.executed_kpis = state.executedKpis;
  }
  if (state.forecast) ctx.forecast = state.forecast;
  if (state.outliers) ctx.outliers = state.outliers;
  if (state.prediction) ctx.prediction = state.prediction;
  if (state.predictionInsights) ctx.prediction_insights = state.predictionInsights;
  return ctx;
}

export function ModellingSessionProvider({
  children,
  scopeKey,
}: {
  children: ReactNode;
  scopeKey: string | null;
}) {
  const [state, setState] = useState<ModellingSessionState>(EMPTY_STATE);
  const [sessionRevision, setSessionRevision] = useState(0);
  const loadedScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedScopeKeyRef.current === scopeKey) return;
    loadedScopeKeyRef.current = scopeKey;
    setState(EMPTY_STATE);
    setSessionRevision(0);
  }, [scopeKey]);

  const bump = useCallback(() => setSessionRevision((n) => n + 1), []);

  const setGeneratedKpis = useCallback(
    (kpis: GeneratedKpi[]) => {
      setState((prev) => ({ ...prev, generatedKpis: kpis }));
      bump();
    },
    [bump],
  );

  const addExecutedKpi = useCallback(
    (record: ExecutedKpiRecord) => {
      setState((prev) => ({
        ...prev,
        executedKpis: [...prev.executedKpis.filter((e) => e.name !== record.name), record],
      }));
      bump();
    },
    [bump],
  );

  const setForecast = useCallback(
    (forecast: SessionForecast | null) => {
      setState((prev) => ({ ...prev, forecast }));
      bump();
    },
    [bump],
  );

  const setOutliers = useCallback(
    (outliers: SessionOutliers | null) => {
      setState((prev) => ({ ...prev, outliers }));
      bump();
    },
    [bump],
  );

  const setPrediction = useCallback(
    (prediction: SessionPrediction | null, insights?: unknown) => {
      setState((prev) => ({
        ...prev,
        prediction,
        predictionInsights: insights ?? null,
      }));
      bump();
    },
    [bump],
  );

  const toApiContext = useCallback(() => buildApiContext(state), [state]);

  const value = useMemo(
    (): ModellingSessionContextValue => ({
      toApiContext,
      sessionRevision,
      setGeneratedKpis,
      addExecutedKpi,
      setForecast,
      setOutliers,
      setPrediction,
    }),
    [toApiContext, sessionRevision, setGeneratedKpis, addExecutedKpi, setForecast, setOutliers, setPrediction],
  );

  return (
    <ModellingSessionContext.Provider value={value}>{children}</ModellingSessionContext.Provider>
  );
}

export function useModellingSession() {
  const ctx = useContext(ModellingSessionContext);
  if (!ctx) throw new Error("useModellingSession must be used within ModellingSessionProvider");
  return ctx;
}

export function outlierReportToSession(report: OutlierReport, raw?: Record<string, unknown>): SessionOutliers {
  const ipr = raw?.ipr;
  return {
    column: report.summary.column,
    count: report.summary.outlier_count,
    lower_bound: report.summary.lower_bound,
    upper_bound: report.summary.upper_bound,
    ...(ipr && typeof ipr === "object" ? { ipr: ipr as Record<string, unknown> } : {}),
  };
}

export function executeResultToSession(kpi: GeneratedKpi, result: Record<string, unknown>): ExecutedKpiRecord {
  const chart = (result.chart as Record<string, unknown> | undefined) ?? result;
  return {
    name: kpi.title,
    ...result,
    chart,
    ipr: (chart.ipr as Record<string, unknown> | undefined) ?? (result.ipr as Record<string, unknown> | undefined),
  };
}
